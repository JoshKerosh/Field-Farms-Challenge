"""Publica cuencas, subcuencas, ASADAS y fuentes del SAGA como GeoJSON livianos para la web.

Ejecutar desde jobs/data-pipeline:
    python -m field_farms_data.publish.basins --datasets <carpeta PNUD> [--out <carpeta>]
"""

import argparse
import json
from collections import Counter
from pathlib import Path

from shapely.geometry import Point

from field_farms_data.providers import pnud
from field_farms_data.transforms import geo

DEFAULT_OUT = Path(__file__).resolve().parents[5] / 'apps' / 'web' / 'public' / 'data' / 'geo'
# Tolerancia de simplificación (m). Las subcuencas se usan para cruzarlas con fincas: más detalle.
TOL_CUENCAS = 10
TOL_SUBCUENCAS = 5


def write(path: Path, features: list[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'type': 'FeatureCollection', 'features': features},
                               ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return path.stat().st_size


def publish_basins(datasets: Path, out: Path) -> pnud.Layer:
    cuencas = pnud.read_cuencas(datasets)
    colors = geo.color_neighbors([g for _, g in cuencas.features])
    features = []
    for (record, geom), color in zip(cuencas.features, colors):
        geometry = geo.to_web_polygon(geom, TOL_CUENCAS, cuencas.to_wgs84)
        if geometry:
            features.append({'type': 'Feature', 'geometry': geometry, 'properties': {
                'cuenca_no': int(record['cuenca_no']), 'nombre': record['nombre'],
                'area_ha': round(record['area_ha']), 'color': color}})
    size = write(out / 'cuencas.geojson', features)
    print(f'cuencas.geojson: {len(features)} cuencas, {size // 1024} KB')

    locate = geo.basin_locator(cuencas.features)
    subcuencas = pnud.read_subcuencas(datasets)
    by_basin: dict[int, list[dict]] = {}
    for record, geom in subcuencas.features:
        geometry = geo.to_web_polygon(geom, TOL_SUBCUENCAS, subcuencas.to_wgs84)
        if geometry:
            # 0 agrupa islas y franjas costeras que no pertenecen a ninguna de las 34 cuencas.
            by_basin.setdefault(locate(geom.representative_point()), []).append({
                'type': 'Feature', 'geometry': geometry, 'properties': {
                    'nombre': record['N_SUBCUENC'].title(), 'gran_cuenca': record['GRAN_CUENC'].title(),
                    'vertiente': record['VERTIENTE'].title(), 'hectareas': round(record['HECTARES'], 1)}})
    # El nombre se repite (una subcuenca con varias partes), así que cada parte lleva un id estable
    # "<cuenca>-<orden>": es la llave que usan los archivos de indicadores por subcuenca.
    for no, items in by_basin.items():
        for i, item in enumerate(items):
            item['properties'] = {'id': f'{no}-{i}', **item['properties']}
    sizes = [write(out / 'subcuencas' / f'{no}.geojson', items) for no, items in sorted(by_basin.items())]
    print(f'subcuencas/: {sum(map(len, by_basin.values()))} subcuencas en {len(sizes)} archivos, '
          f'{max(sizes) // 1024} KB máx.')
    return cuencas


def publish_water(datasets: Path, out: Path, cuencas: pnud.Layer) -> None:
    operadores, fuentes = pnud.read_saga(datasets)
    locate = geo.basin_locator(cuencas.features)
    to_wgs84 = cuencas.to_wgs84

    def lonlat(xy):
        lon, lat = to_wgs84.transform(*xy)
        return [round(lon, 6), round(lat, 6)]

    by_basin: dict[int, list[dict]] = {}
    per_operator, springs_per_operator, skipped = Counter(), Counter(), 0
    for row in fuentes:
        xy = geo.crtm05_point(row['Norte CRTM05'], row['Este CRTM05'])
        if not xy:
            skipped += 1
            continue
        kind = geo.source_kind(row['Nombre de la fuente'])
        per_operator[row['IDEO']] += 1
        springs_per_operator[row['IDEO']] += kind == 'naciente'
        by_basin.setdefault(locate(Point(xy)), []).append({
            'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': lonlat(xy)},
            'properties': {
                'nombre': (row['Nombre de la fuente'] or 'Sin nombre').strip().title(), 'tipo': kind,
                'ideo': row['IDEO'], 'operador': (row['Nombre del operador'] or '').title(),
                'altitud': geo.rounded(row['Altitud (msnm)']), 'caudal': geo.rounded(row['Último caudal registrado'])}})
    sizes = [write(out / 'fuentes' / f'{no}.geojson', items) for no, items in sorted(by_basin.items())]
    kinds = Counter(f['properties']['tipo'] for items in by_basin.values() for f in items)
    print(f'fuentes/: {sum(map(len, by_basin.values()))} fuentes en {len(sizes)} archivos, '
          f'{skipped} sin coordenadas · {dict(kinds)}')

    features, skipped = [], 0
    for row in operadores:
        xy = geo.crtm05_point(row['Norte CRTM05'], row['Este CRTM05'])
        if not xy:
            skipped += 1
            continue
        features.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': lonlat(xy)},
                         'properties': {
                             'cuenca_no': locate(Point(xy)), 'ideo': row['IDEO'],
                             'nombre': (row['Nombre del operador'] or '').title(),
                             'tipo': row['Tipo de administración'], 'zona': (row['Ubicación geográfica'] or '').title(),
                             'servicios': row['Servicios abastecidos'], 'fuentes': per_operator[row['IDEO']],
                             'nacientes': springs_per_operator[row['IDEO']]}})
    size = write(out / 'asadas.geojson', features)
    print(f'asadas.geojson: {len(features)} operadores, {size // 1024} KB, {skipped} sin coordenadas')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--datasets', type=Path, required=True,
                        help='Carpeta con cuencas_hidrograficas.shp, Subcuencas_CRTM05.zip y la hoja del SAGA')
    parser.add_argument('--out', type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    cuencas = publish_basins(args.datasets, args.out)
    publish_water(args.datasets, args.out, cuencas)


if __name__ == '__main__':
    main()
