import {
  validObservationDate,
  type RegionalWeather,
  type RegionalTerrain,
} from '@field-farms/domain';
import type { Polygon, MultiPolygon } from 'geojson';
import { validMapGeometry } from './hazard-map';

export interface NasaRegion {
  id: string;
  name: string;
  geometry: Polygon | MultiPolygon;
  weather: RegionalWeather;
  terrain: RegionalTerrain;
}
export interface NasaRegionalData {
  regions: NasaRegion[];
  observedEnd: string;
  generatedAt: string;
  powerSources: string[];
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, min: number, max = Infinity): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const nullable = (v: unknown, min: number, max = Infinity) => v === null || finite(v, min, max);
const integer = (v: unknown, max: number): v is number => finite(v, 0, max) && Number.isInteger(v);
const date = (v: unknown): v is string => typeof v === 'string' && validObservationDate(v);

export function parseNasaRegions(raw: unknown): NasaRegionalData | null {
  if (
    !object(raw) ||
    raw.schemaVersion !== 'alert-nasa-regions-v1' ||
    raw.dataMode !== 'real' ||
    raw.type !== 'FeatureCollection' ||
    raw.method !== 'nasa-regional-power-area-srtm-samples-v1' ||
    !date(raw.observedEnd) ||
    typeof raw.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(raw.generatedAt)) ||
    Date.parse(raw.generatedAt) < Date.parse(raw.observedEnd) ||
    !object(raw.spatial) ||
    raw.spatial.demResolutionM !== 90 ||
    raw.spatial.terrainSampleLimitPerBasin !== 9 ||
    raw.spatial.slopeStencilMetres !== 90 ||
    !Array.isArray(raw.spatial.powerResolutionDegrees) ||
    raw.spatial.powerResolutionDegrees.length !== 2 ||
    raw.spatial.powerResolutionDegrees[0] !== 0.625 ||
    raw.spatial.powerResolutionDegrees[1] !== 0.5 ||
    !Array.isArray(raw.sources) ||
    raw.sources.length < 3 ||
    !Array.isArray(raw.features) ||
    raw.features.length === 0 ||
    raw.features.length > 100
  )
    return null;
  const powerSources: string[] = [];
  let hasTerrain = false;
  for (const source of raw.sources) {
    if (
      !object(source) ||
      typeof source.url !== 'string' ||
      typeof source.resolvedUrl !== 'string' ||
      typeof source.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(source.sha256)
    )
      return null;
    try {
      const url = new URL(source.url),
        resolved = new URL(source.resolvedUrl);
      if (url.protocol !== 'https:' || resolved.protocol !== 'https:' || resolved.host !== url.host)
        return null;
      if (url.host === 'power.larc.nasa.gov' && url.pathname === '/api/temporal/daily/regional')
        powerSources.push(source.url);
      else if (url.host === 'api.opentopodata.org' && url.pathname === '/v1/srtm90m')
        hasTerrain = true;
      else return null;
    } catch {
      return null;
    }
  }
  if (powerSources.length !== 2 || !hasTerrain) return null;
  const parameters = powerSources.map((s) => new URL(s).searchParams.get('parameters')).sort();
  if (parameters.join(',') !== 'GWETROOT,PRECTOTCORR') return null;
  const regions: NasaRegion[] = [];
  const budget = { left: 100_000 };
  for (const feature of raw.features) {
    if (
      !object(feature) ||
      feature.type !== 'Feature' ||
      !object(feature.properties) ||
      !validMapGeometry(feature.geometry, budget) ||
      !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)
    )
      return null;
    const p = feature.properties,
      w = p.weather,
      t = p.terrain;
    if (
      typeof p.id !== 'string' ||
      !p.id.trim() ||
      regions.some((r) => r.id === p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      !object(w) ||
      !object(t) ||
      !nullable(w.wetness3d, 0, 1) ||
      !nullable(w.rain7dMm, 0) ||
      !finite(w.coverageFraction, 0, 1) ||
      !integer(w.powerCellCount, 100) ||
      !date(w.observedStart) ||
      !date(w.wetnessStart) ||
      w.observedEnd !== raw.observedEnd ||
      Date.parse(raw.observedEnd) - Date.parse(w.observedStart) !== 6 * 86400000 ||
      Date.parse(raw.observedEnd) - Date.parse(w.wetnessStart) !== 2 * 86400000 ||
      !integer(t.plannedSampleCount, 9) ||
      t.plannedSampleCount === 0 ||
      !integer(t.sampleCount, 9) ||
      t.sampleCount > t.plannedSampleCount ||
      !Array.isArray(t.samples) ||
      t.samples.length !== t.sampleCount ||
      !nullable(t.slopeDegreesMax, 0, 90) ||
      !nullable(t.flatSampleFraction, 0, 1) ||
      !nullable(t.elevationMinM, -500, 9000) ||
      !nullable(t.elevationMaxM, -500, 9000)
    )
      return null;
    for (const s of t.samples) {
      if (
        !object(s) ||
        !finite(s.longitude, -180, 180) ||
        !finite(s.latitude, -90, 90) ||
        !finite(s.elevationM, -500, 9000) ||
        !finite(s.slopeDegrees, 0, 90)
      )
        return null;
    }
    const samples = t.samples as RegionalTerrain['samples'];
    if (t.sampleCount === t.plannedSampleCount) {
      const max = Math.max(...samples.map((s) => s.slopeDegrees));
      const flat = samples.filter((s) => s.slopeDegrees <= 2).length / samples.length;
      if (
        typeof t.slopeDegreesMax !== 'number' ||
        Math.abs(t.slopeDegreesMax - max) > 1e-6 ||
        typeof t.flatSampleFraction !== 'number' ||
        Math.abs(t.flatSampleFraction - flat) > 1e-6
      )
        return null;
    } else if (t.slopeDegreesMax !== null || t.flatSampleFraction !== null) return null;
    regions.push({
      id: p.id,
      name: p.name,
      geometry: feature.geometry as Polygon | MultiPolygon,
      weather: w as unknown as RegionalWeather,
      terrain: t as unknown as RegionalTerrain,
    });
  }
  return { regions, observedEnd: raw.observedEnd, generatedAt: raw.generatedAt, powerSources };
}

export async function loadNasaRegions(signal?: AbortSignal): Promise<NasaRegionalData | null> {
  try {
    const response = await fetch('/data/alerts/nasa-regions.geojson', {
      cache: 'no-cache',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length <= 4 * 1024 * 1024 ? parseNasaRegions(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}
