"""Conectores NASA y NOAA: descargan el dato real y lo publican en `apps/web/public/data/`.

Ejecutar desde jobs/data-pipeline (lo corre la Action `datos-nasa.yml` todos los días):
    python -m field_farms_data.publish.nasa [--solo power,roni,modis] [--out <carpeta>]

Si una fuente falla, su archivo anterior no se toca (queda el último dato bueno con su fecha) y
`fuentes.json` la marca como `falla` con el error (D-03, D-06). El proceso sale con código 1 para
que la Action avise, después de publicar las fuentes que sí funcionaron.
"""

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from pathlib import Path

from field_farms_data.providers import modis, noaa, power
from field_farms_data.providers.zonas import ZONAS
from field_farms_data.publish.archivos import DATA_DIR, actualizar_fuente, escribir_json, meta
from field_farms_data.transforms import indicadores as ind

# Primer año completo de MODIS Terra en la serie de referencia del prototipo (2012–2025).
MODIS_DESDE = 2012


def hoy_utc() -> date:
    return datetime.now(timezone.utc).date()


def publicar_power(out: Path) -> date:
    items = []
    for zona in ZONAS:
        rows, clim = power.fetch(zona.lat, zona.lon, hoy_utc())
        items.append(ind.power_zona(zona, rows, clim))
    fecha = min(date.fromisoformat(i['indicadores'][0]['fecha']) for i in items)
    escribir_json(out / 'nasa' / 'power' / 'latest.json', {
        'meta': meta('nasa-power', power.BASE + '/daily/point', fecha, nota=(
            'Seis puntos de referencia, uno por zona. Normal 1991–2020 de la API de climatología. '
            'POWER publica con unos 3 días de rezago.')),
        'datos': {'unidad': 'zona', 'items': items}})
    return fecha


def publicar_roni(out: Path) -> date:
    item = ind.roni_item(noaa.fetch())
    fecha = date.fromisoformat(item['indicadores'][0]['fecha'])
    escribir_json(out / 'noaa' / 'roni' / 'latest.json', {
        'meta': meta('noaa-roni', noaa.RONI_URL, fecha, nota=(
            'Trimestre móvil más reciente; los últimos valores son provisionales. '
            'Fase según el umbral oficial de NOAA (±0,5).')),
        'datos': {'unidad': 'pais', 'items': [item]}})
    return fecha


def _referencia_previa(out: Path) -> dict[str, dict]:
    """Promedios históricos ya descargados, por zona: no cambian para una misma fecha del año."""
    path = out / 'nasa' / 'modis' / 'latest.json'
    if not path.exists():
        return {}
    previo = json.loads(path.read_text(encoding='utf-8'))
    return {i['id']: i['referencia'] for i in previo['datos']['items'] if 'referencia' in i}


def _anio_historico(zona, anio: int, doy: str) -> float | None:
    """Un año que ORNL no entrega (503) queda sin dato; la normal exige al menos 5 años válidos."""
    try:
        fila = modis.fetch_range(zona.lat, zona.lon, f'A{anio}{doy}', f'A{anio}{doy}')
    except Exception:  # noqa: BLE001
        return None
    return fila[0][2] if fila else None


def _modis_zona(zona, previa: dict[str, dict]):
    fechas = modis.list_dates(zona.lat, zona.lon)
    recientes = modis.fetch_range(zona.lat, zona.lon, fechas[-10][0], fechas[-1][0])
    ultima = next((r for r in reversed(recientes) if r[2] is not None), None)
    if ultima is None:
        raise ValueError(f'{zona.id}: sin imágenes MODIS válidas recientes')
    doy, anio = ultima[0][5:], int(ultima[0][1:5])
    ref = previa.get(zona.id)
    if ref and ref['dia_del_anio'] == doy and ref['hasta'] == anio - 1:
        historicos = ref['valores']
    else:
        # Cada consulta al servicio de ORNL tarda ~40 s: los años van en paralelo.
        with ThreadPoolExecutor(max_workers=5) as pool:
            filas = pool.map(lambda y: _anio_historico(zona, y, doy), range(MODIS_DESDE, anio))
            historicos = list(filas)
    item = ind.modis_zona(zona, recientes, historicos)
    item['referencia'] = {'dia_del_anio': doy, 'desde': MODIS_DESDE, 'hasta': anio - 1,
                          'valores': historicos}
    return item


def publicar_modis(out: Path) -> date:
    previa = _referencia_previa(out)
    with ThreadPoolExecutor(max_workers=6) as pool:
        items = list(pool.map(lambda z: _modis_zona(z, previa), ZONAS))
    fecha = min(date.fromisoformat(i['indicadores'][0]['fecha']) for i in items)
    escribir_json(out / 'nasa' / 'modis' / 'latest.json', {
        'meta': meta('nasa-modis', modis.BASE + '/subset', fecha, nota=(
            'MOD13Q1 v061, promedio de 9 × 9 píxeles (≈2 km) alrededor de cada punto, sin agua '
            f'ni nubes. Normal: misma fecha de {MODIS_DESDE} al año anterior.')),
        'datos': {'unidad': 'zona', 'items': items}})
    return fecha


CONECTORES = {'power': ('nasa-power', publicar_power), 'roni': ('noaa-roni', publicar_roni),
              'modis': ('nasa-modis', publicar_modis)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--solo', default=','.join(CONECTORES),
                        help='conectores separados por coma: ' + ', '.join(CONECTORES))
    parser.add_argument('--out', type=Path, default=DATA_DIR)
    args = parser.parse_args(argv)

    fallas = 0
    for nombre in args.solo.split(','):
        fuente, publicar = CONECTORES[nombre.strip()]
        try:
            fecha = publicar(args.out)
            actualizar_fuente(args.out, fuente, fecha_dato=fecha)
            print(f'{fuente}: ok, dato al {fecha}')
        except Exception as error:  # noqa: BLE001 — cualquier falla de la fuente se registra igual.
            fallas += 1
            actualizar_fuente(args.out, fuente, error=f'{type(error).__name__}: {error}')
            print(f'{fuente}: FALLA, se conserva el último dato bueno. {error}', file=sys.stderr)
    return 1 if fallas else 0


if __name__ == '__main__':
    sys.exit(main())
