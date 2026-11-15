import type { Geometry, Position } from 'geojson';

/** Ray casting on one ring of [lng, lat] positions. */
export function ringContains(ring: Position[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon for Polygon and MultiPolygon, honoring holes. Other types never contain. */
export function geometryContains(geometry: Geometry, x: number, y: number): boolean {
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  return polygons.some(
    ([outer, ...holes]) =>
      ringContains(outer, x, y) && !holes.some((hole) => ringContains(hole, x, y)),
  );
}
