"""Example files in the final format, marked as simulated (SPA-7).

They let people work without waiting for someone else's real connector. Once the connector exists,
it writes to its own path (e.g. `nasa/imerg/latest.json`) and the example is no longer read.
    python -m field_farms_data.publish.ejemplos [--out <folder>]
"""

import argparse
from datetime import date, timedelta
from pathlib import Path

from field_farms_data.publish.archivos import DATA_DIR, escribir_json, meta
from field_farms_data.transforms.indicadores import indicador

# Four real subwatersheds of the San Carlos river watershed (ids from geo/subcuencas/14.geojson).
SUBCUENCAS = (('14-123', 'Río San Carlos'), ('14-103', 'Río Arenal'),
              ('14-86', 'Río Peñas Blancas'), ('14-130', 'Río Tres Amigos'))
NOTA = 'SIMULADO: valores inventados con el formato final. No usar como dato real.'


def _archivo(fuente: str, url: str, capa: str, fecha: date, filas) -> dict:
    items = [{'id': sid, 'nombre': nombre, 'indicadores': [
        indicador(i, n, v, u, fuente, fecha, capa=capa, simulado=True) for i, n, v, u in inds]}
        for (sid, nombre), inds in zip(SUBCUENCAS, filas)]
    return {'meta': meta(fuente, url, fecha, capa=capa, simulado=True, nota=NOTA),
            'datos': {'unidad': 'subcuenca', 'items': items}}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--out', type=Path, default=DATA_DIR)
    out = parser.parse_args(argv).out
    ayer = date.today() - timedelta(days=1)

    imerg = [(('lluvia_1d', 'Lluvia del último día', v1, 'mm'), ('lluvia_7d', 'Lluvia de 7 días', v7, 'mm'))
             for v1, v7 in ((38.2, 121.5), (12.0, 64.3), (55.7, 160.1), (4.1, 30.8))]
    escribir_json(out / 'ejemplos' / 'imerg.json', _archivo(
        'nasa-imerg', 'https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary', 'nasa', ayer, imerg))

    smap = [(('humedad_superficie', 'Humedad del suelo superficial', s, 'm3/m3'),
             ('humedad_raiz', 'Humedad del suelo en raíces', r, 'm3/m3'))
            for s, r in ((0.41, 0.38), (0.33, 0.35), (0.47, 0.44), (0.22, 0.27))]
    escribir_json(out / 'ejemplos' / 'smap.json', _archivo(
        'nasa-smap', 'https://nsidc.org/data/spl4smgp', 'nasa', ayer - timedelta(days=2), smap))

    sub = [(('km_orillas_sin_bosque', 'Orillas de río sin bosque', km, 'km'),
            ('ha_restaurar', 'Hectáreas a restaurar primero', ha, 'ha'),
            ('verdor', 'Verdor promedio (NDVI)', nd, 'NDVI'),
            ('nacientes_en_riesgo', 'Nacientes en riesgo', nr, 'nacientes'),
            ('conexiones', 'Conexiones de agua abastecidas', cx, 'conexiones'),
            ('lluvia_30d_anomalia', 'Lluvia frente a lo normal (30 días)', la, '%'))
           for km, ha, nd, nr, cx, la in ((182.4, 950, 0.71, 12, 8400, 64), (61.0, 310, 0.78, 4, 2100, 41),
                                          (88.3, 420, 0.74, 9, 3900, 70), (40.2, 150, 0.69, 2, 900, 55))]
    escribir_json(out / 'ejemplos' / 'indicadores-subcuenca.json', _archivo(
        'indicadores-subcuenca', 'https://github.com/JoshKerosh/Field-Farms-Challenge', 'local', ayer, sub))
    print('ejemplos: imerg.json, smap.json, indicadores-subcuenca.json')


if __name__ == '__main__':
    main()
