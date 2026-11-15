"""Local layers from FFC_datos.zip that were not yet in `public/data/`: CNE, SINAC and the riverbank grid.

Run from jobs/data-pipeline, with the unzipped folder of the team's package:
    python -m field_farms_data.publish.local --ffc <FFC_datos folder> [--out <folder>]

Watersheds, subwatersheds, sources and ASADAS are published by `publish.basins`. FLUC, the 2014–15
drought and the 3 km grid are still bundled in `apps/web/src/data/real/` because the app already uses them.
"""

import argparse
import csv
import json
from datetime import date
from pathlib import Path

from field_farms_data.publish.archivos import DATA_DIR, actualizar_fuente, escribir_json, meta

SNIT = '04_snit_huetar_norte'
ORILLAS = '03_v10_orillas_y_verdor/orillas_y_verdor_1.5km.csv'
# Package dates according to LEEME.md.
FECHA_SNIT = date(2026, 11, 14)
FECHA_ORILLAS = date(2026, 10, 31)  # MODIS greenness up to Oct 2026
ORILLA_CODIGO = {'sin río': 0, 'con bosque': 1, 'a medias': 2, 'sin bosque': 3}
# SNIT OGC service catalog where the CNE layers were published (downloaded Nov 14, 2026).
SNIT_OGC = 'https://www.snitcr.go.cr/ico_servicios_ogc'


def leer_geojson(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def con_meta(coleccion: dict, m: dict, propiedades: list[str]) -> dict:
    """GeoJSON with a `meta` header (a valid extra member in RFC 7946) and only the useful properties."""
    features = [{'type': 'Feature', 'geometry': f['geometry'],
                 'properties': {k: f['properties'][k] for k in propiedades if k in f['properties']}}
                for f in coleccion['features']]
    return {'type': 'FeatureCollection', 'meta': m, 'features': features}


def publicar_cne(ffc: Path, out: Path) -> dict[str, int]:
    capas = {
        'inundacion': ('CNE_zonas_potencial_inundacion.geojson', 'Zonas con potencial de inundación'),
        'deslizamientos': ('CNE_deslizamientos_centroides.geojson', 'Deslizamientos registrados'),
        'coronas': ('CNE_coronas_deslizamiento_centroides.geojson', 'Coronas de deslizamiento'),
    }
    conteos = {}
    for nombre, (archivo, titulo) in capas.items():
        fuente = 'cne-inundacion' if nombre == 'inundacion' else 'cne-deslizamientos'
        coleccion = leer_geojson(ffc / SNIT / archivo)
        props = coleccion['features'][0]['properties']
        m = meta(fuente, SNIT_OGC, FECHA_SNIT, capa='local',
                 nota=f'{titulo} ({props.get("capa", "")}), {props.get("nota", "")}. Huetar Norte.')
        escribir_json(out / 'geo' / 'cne' / f'{nombre}.geojson', con_meta(coleccion, m, []), compacto=True)
        conteos[nombre] = len(coleccion['features'])
    actualizar_fuente(out, 'cne-inundacion', fecha_dato=FECHA_SNIT)
    actualizar_fuente(out, 'cne-deslizamientos', fecha_dato=FECHA_SNIT)
    return conteos


def publicar_areas_protegidas(ffc: Path, out: Path) -> int:
    with (ffc / SNIT / 'ACAHN_areas_protegidas_fichas_SINAC.csv').open(encoding='utf-8') as f:
        fichas = {r['nombre']: r for r in csv.DictReader(f)}
    coleccion = leer_geojson(ffc / SNIT / 'ACAHN_areas_protegidas_contornos.geojson')
    for feature in coleccion['features']:
        ficha = fichas.get(feature['properties']['nombre'], {})
        feature['properties'].update({
            'categoria': ficha.get('categoria'), 'norma': ficha.get('norma'),
            'anio_creacion': int(ficha['anio_creacion']) if ficha.get('anio_creacion') else None,
            'area_km2': float(ficha['area_km2']) if ficha.get('area_km2') else None})
    m = meta('sinac-areas-protegidas', SNIT_OGC, FECHA_SNIT, capa='local',
             nota=f'{len(coleccion["features"])} de las {len(fichas)} áreas del ACAHN tienen contorno '
                  '(mapa MINAET, versión anterior).')
    escribir_json(out / 'geo' / 'sinac' / 'areas_protegidas.geojson',
                  con_meta(coleccion, m, ['nombre', 'categoria', 'norma', 'anio_creacion', 'area_km2']),
                  compacto=True)
    actualizar_fuente(out, 'sinac-areas-protegidas', fecha_dato=FECHA_SNIT)
    return len(coleccion['features'])


def _num(texto: str) -> float | None:
    return float(texto) if texto not in ('', None) else None


def publicar_orillas(ffc: Path, out: Path) -> int:
    """1.5 km grid in columns (one array per field): half the size of rows with keys."""
    columnas: dict[str, list] = {k: [] for k in (
        'celda_3km', 'lat', 'lon', 'verdor', 'orilla', 'verdor_cambio_celda',
        'orilla_bosque_frac_celda', 'orilla_potrero_frac_celda', 'km_rio_celda')}
    with (ffc / ORILLAS).open(encoding='utf-8') as f:
        for r in csv.DictReader(f):
            columnas['celda_3km'].append(r['celda_3km'])
            columnas['lat'].append(float(r['lat']))
            columnas['lon'].append(float(r['lon']))
            columnas['verdor'].append(_num(r['ndvi_nov2025_oct2026']))
            columnas['orilla'].append(ORILLA_CODIGO[r['orilla_15m']])
            columnas['verdor_cambio_celda'].append(_num(r['cambio_ndvi_vs_2016_2020_celda']))
            columnas['orilla_bosque_frac_celda'].append(_num(r['orilla_con_bosque_frac_celda']))
            columnas['orilla_potrero_frac_celda'].append(_num(r['orilla_en_potrero_frac_celda']))
            columnas['km_rio_celda'].append(_num(r['km_rio_celda']))
    total = len(columnas['lat'])
    escribir_json(out / 'local' / 'orillas_verdor_1.5km.json', {
        'meta': meta('ign-orillas', 'https://geos.snitcr.go.cr/be/IGN_5/wms', FECHA_ORILLAS,
                     capa='local', nota=(
                         'Cuadros de 1,5 km. orilla: 0 sin río, 1 con bosque, 2 a medias, 3 sin bosque '
                         '(IGN 1:5 000, 2017). verdor: NASA MODIS MOD13A3 nov 2025–oct 2026. Los campos '
                         '_celda valen para la celda de 3 km.')),
        'datos': {'formato': 'columnas', 'total': total, 'columnas': columnas}}, compacto=True)
    actualizar_fuente(out, 'ign-orillas', fecha_dato=FECHA_ORILLAS)
    return total


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--ffc', type=Path, required=True, help='carpeta FFC_datos descomprimida')
    parser.add_argument('--out', type=Path, default=DATA_DIR)
    args = parser.parse_args(argv)
    print('CNE:', publicar_cne(args.ffc, args.out))
    print('Áreas protegidas ACAHN:', publicar_areas_protegidas(args.ffc, args.out))
    print('Grilla de orillas y verdor:', publicar_orillas(args.ffc, args.out), 'cuadros')


if __name__ == '__main__':
    main()
