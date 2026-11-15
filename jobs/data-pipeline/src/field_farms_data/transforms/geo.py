"""Transformaciones geográficas reproducibles, sin lectura ni escritura de archivos."""

import re

import shapely
from pyproj import Transformer
from shapely.geometry import mapping

# Paleta categórica; cuencas vecinas nunca comparten color.
PALETTE = ['#2E7D9A', '#E08A2E', '#5B9E4D', '#C8506A', '#8A6BBE', '#C9A227', '#3FA7A0', '#A0603A']
DECIMALS = 5  # ~1 m
# Límites aproximados de Costa Rica en CRTM05 para descartar coordenadas vacías o erróneas.
NORTE = (880000, 1250000)
ESTE = (280000, 670000)


def project(geom: shapely.Geometry, transformer: Transformer) -> shapely.Geometry:
    def apply(xy):
        x, y = transformer.transform(xy[:, 0], xy[:, 1])
        xy[:, 0], xy[:, 1] = x, y
        return xy

    return shapely.transform(geom, apply)


def to_web_polygon(geom: shapely.Geometry, tolerance_m: float, to_wgs84: Transformer) -> dict | None:
    """Simplifica en metros, proyecta a WGS84 y redondea; None si no queda un polígono."""
    geom = project(geom.simplify(tolerance_m, preserve_topology=True), to_wgs84)
    geom = shapely.set_precision(geom, 10 ** -DECIMALS)
    polygons = [g for g in getattr(geom, 'geoms', [geom])
                if g.geom_type in ('Polygon', 'MultiPolygon') and not g.is_empty]
    return mapping(shapely.union_all(polygons)) if polygons else None


def color_neighbors(geoms: list[shapely.Geometry], touch_m: float = 100) -> list[str]:
    """Coloreo voraz que reparte la paleta: polígonos que se tocan reciben colores distintos."""
    tree = shapely.STRtree(geoms)
    neighbors = {i: {int(j) for j in tree.query(g.buffer(touch_m), predicate='intersects') if j != i}
                 for i, g in enumerate(geoms)}
    colors: dict[int, int] = {}
    count = [0] * len(PALETTE)
    for i in sorted(neighbors, key=lambda k: -len(neighbors[k])):
        used = {colors[j] for j in neighbors[i] if j in colors}
        colors[i] = min((c for c in range(len(PALETTE)) if c not in used), key=lambda c: count[c])
        count[colors[i]] += 1
    return [PALETTE[colors[i]] for i in range(len(geoms))]


def basin_locator(basins: list[tuple[dict, shapely.Geometry]]):
    """Función que devuelve el número de cuenca que contiene un punto (CRTM05), o 0."""
    tree = shapely.STRtree([geom for _, geom in basins])

    def locate(geom: shapely.Geometry) -> int:
        hits = tree.query(geom, predicate='within')
        return int(basins[hits[0]][0]['cuenca_no']) if len(hits) else 0

    return locate


def source_kind(name: str | None) -> str:
    """El SAGA no trae el tipo de fuente; se deduce del nombre. "F-1" (fuente) queda sin clasificar."""
    n = (name or '').upper()
    if re.search(r'NAC|MANANTIAL|OJO DE AGUA|^N[\s.º°#-]*\d', n):
        return 'naciente'
    if re.search(r'POZO|^P[\s.º°#-]*\d|_P\d', n):
        return 'pozo'
    if re.search(r'QUEBRADA|\bR[IÍ]O\b|TOMA|^Q[\s.º°#-]*\d', n):
        return 'superficial'
    return 'sin clasificar'


def crtm05_point(norte, este) -> tuple[float, float] | None:
    """(este, norte) válido dentro de Costa Rica, o None."""
    if not (isinstance(norte, (int, float)) and isinstance(este, (int, float))):
        return None
    if not (NORTE[0] < norte < NORTE[1] and ESTE[0] < este < ESTE[1]):
        return None
    return este, norte


def rounded(value) -> float | None:
    return round(value, 2) if isinstance(value, (int, float)) else None
