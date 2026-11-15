import type { Geometry } from 'geojson';

export type HazardLayerId = 'floodZone' | 'landslideZone';
export interface HazardFeature {
  id: string;
  name: string;
  geometry: Geometry;
}
export interface HazardMapData {
  location: { longitude: number; latitude: number };
  bounds: [number, number, number, number];
  retrievedAt: string;
  source: string;
  subbasin: { name: string; geometry: Geometry };
  layers: {
    id: HazardLayerId;
    matchedCount: number;
    downloadedCount: number;
    completeQuery: boolean;
    features: HazardFeature[];
  }[];
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

export function validMapGeometry(
  value: unknown,
  budget: { left: number },
  nesting = 0,
): value is Geometry {
  if (!object(value) || typeof value.type !== 'string' || nesting > 8) return false;
  if (value.type === 'GeometryCollection')
    return (
      Array.isArray(value.geometries) &&
      value.geometries.every((g) => validMapGeometry(g, budget, nesting + 1))
    );
  const depths: Record<string, number> = {
    Point: 0,
    MultiPoint: 1,
    LineString: 1,
    MultiLineString: 2,
    Polygon: 2,
    MultiPolygon: 3,
  };
  if (!Object.hasOwn(depths, value.type)) return false;
  const valid = (coordinates: unknown, depth: number): boolean => {
    if (!Array.isArray(coordinates) || !coordinates.length) return false;
    if (depth) return coordinates.every((child) => valid(child, depth - 1));
    budget.left--;
    return (
      budget.left >= 0 &&
      coordinates.length >= 2 &&
      coordinates.every(finite) &&
      Math.abs(coordinates[0]) <= 180 &&
      Math.abs(coordinates[1]) <= 90
    );
  };
  return valid(value.coordinates, depths[value.type]);
}

export function parseHazardMap(value: unknown): HazardMapData | null {
  const budget = { left: 100_000 }; // Display complexity limit, not a hazard threshold.
  if (
    !object(value) ||
    value.schemaVersion !== 'alert-cne-map-v1' ||
    value.dataMode !== 'real' ||
    value.observedEnd !== null ||
    !object(value.location) ||
    !finite(value.location.longitude) ||
    !finite(value.location.latitude) ||
    !Array.isArray(value.bounds) ||
    value.bounds.length !== 4 ||
    !value.bounds.every(finite) ||
    value.bounds[0] < -180 ||
    value.bounds[2] > 180 ||
    value.bounds[1] < -90 ||
    value.bounds[3] > 90 ||
    value.bounds[0] >= value.bounds[2] ||
    value.bounds[1] >= value.bounds[3] ||
    value.location.longitude < value.bounds[0] ||
    value.location.longitude > value.bounds[2] ||
    value.location.latitude < value.bounds[1] ||
    value.location.latitude > value.bounds[3] ||
    typeof value.retrievedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.retrievedAt)) ||
    value.source !== 'http://mapas.cne.go.cr/servicios/cne/wfs' ||
    !object(value.subbasin) ||
    typeof value.subbasin.name !== 'string' ||
    !validMapGeometry(value.subbasin.geometry, budget) ||
    !Array.isArray(value.layers)
  )
    return null;
  const layers: HazardMapData['layers'] = [];
  for (const layer of value.layers) {
    if (
      !object(layer) ||
      !['floodZone', 'landslideZone'].includes(String(layer.id)) ||
      layers.some((l) => l.id === layer.id) ||
      !count(layer.matchedCount) ||
      !count(layer.downloadedCount) ||
      layer.downloadedCount > layer.matchedCount ||
      layer.completeQuery !== (layer.downloadedCount === layer.matchedCount) ||
      !object(layer.data) ||
      layer.data.type !== 'FeatureCollection' ||
      !Array.isArray(layer.data.features) ||
      layer.data.features.length > layer.downloadedCount
    )
      return null;
    const features: HazardFeature[] = [];
    for (const feature of layer.data.features) {
      if (
        !object(feature) ||
        feature.type !== 'Feature' ||
        !object(feature.properties) ||
        typeof feature.properties.id !== 'string' ||
        typeof feature.properties.name !== 'string' ||
        !validMapGeometry(feature.geometry, budget)
      )
        return null;
      const id = feature.properties.id;
      if (features.some((f) => f.id === id)) return null;
      features.push({
        id: feature.properties.id,
        name: feature.properties.name,
        geometry: feature.geometry,
      });
    }
    layers.push({
      id: layer.id as HazardLayerId,
      matchedCount: layer.matchedCount,
      downloadedCount: layer.downloadedCount,
      completeQuery: layer.completeQuery as boolean,
      features,
    });
  }
  return {
    location: { longitude: value.location.longitude, latitude: value.location.latitude },
    bounds: value.bounds as HazardMapData['bounds'],
    retrievedAt: value.retrievedAt,
    source: value.source,
    subbasin: { name: value.subbasin.name, geometry: value.subbasin.geometry },
    layers,
  };
}

export async function loadHazardMap(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<HazardMapData | null> {
  try {
    const response = await fetcher('/data/alerts/cne/map.json', {
      cache: 'no-cache',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const raw = await response.text();
    if (raw.length > 4 * 1024 * 1024) return null;
    return parseHazardMap(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Same lightweight SVG approach as BasinMinimap; no external tiles or WebGL required. */
export function geometryDrawing(
  g: Geometry,
  project: (lon: number, lat: number) => [number, number],
): { paths: string[]; points: [number, number][] } {
  const result: { paths: string[]; points: [number, number][] } = { paths: [], points: [] };
  const line = (positions: number[][], close = false) =>
    `M${positions
      .map(([x, y]) =>
        project(x, y)
          .map((v) => v.toFixed(2))
          .join(','),
      )
      .join('L')}${close ? 'Z' : ''}`;
  if (g.type === 'Point') result.points.push(project(g.coordinates[0], g.coordinates[1]));
  if (g.type === 'MultiPoint') result.points.push(...g.coordinates.map(([x, y]) => project(x, y)));
  if (g.type === 'LineString') result.paths.push(line(g.coordinates));
  if (g.type === 'MultiLineString') result.paths.push(...g.coordinates.map((ring) => line(ring)));
  if (g.type === 'Polygon')
    result.paths.push(g.coordinates.map((ring) => line(ring, true)).join(''));
  if (g.type === 'MultiPolygon')
    result.paths.push(
      ...g.coordinates.map((polygon) => polygon.map((ring) => line(ring, true)).join('')),
    );
  if (g.type === 'GeometryCollection')
    for (const child of g.geometries) {
      const nested = geometryDrawing(child, project);
      result.paths.push(...nested.paths);
      result.points.push(...nested.points);
    }
  return result;
}
