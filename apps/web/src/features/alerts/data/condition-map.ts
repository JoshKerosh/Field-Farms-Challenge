import type { Polygon, MultiPolygon } from 'geojson';
import type { ConditionReading, ZoneConditions } from '@field-farms/domain';
import { validMapGeometry } from './hazard-map';

export interface ConditionZone {
  id: string;
  name: string;
  geometry: Polygon | MultiPolygon;
  conditions: ZoneConditions;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const fields = [
  'saturation',
  'slope',
  'heightAboveDrainage',
  'susceptibleSoil',
  'poorDrainage',
] as const;
const units = ['fraction-of-pore-space', 'degree', 'm', 'boolean', 'boolean'];

/** Each polygon carries its own observations; point readings cannot fill the basin. */
export function parseConditionMap(raw: unknown): ConditionZone[] | null {
  if (
    !object(raw) ||
    raw.schemaVersion !== 'alert-condition-map-v1' ||
    raw.dataMode !== 'real' ||
    raw.type !== 'FeatureCollection' ||
    !Array.isArray(raw.features) ||
    raw.features.length > 5000
  )
    return null;
  const budget = { left: 100_000 };
  const zones: ConditionZone[] = [];
  for (const feature of raw.features) {
    if (
      !object(feature) ||
      feature.type !== 'Feature' ||
      !object(feature.properties) ||
      typeof feature.properties.id !== 'string' ||
      !feature.properties.id.trim() ||
      typeof feature.properties.name !== 'string' ||
      !object(feature.properties.conditions) ||
      !validMapGeometry(feature.geometry, budget) ||
      !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)
    )
      return null;
    const zoneId = feature.properties.id;
    if (zones.some((z) => z.id === zoneId)) return null;
    const conditions = {} as ZoneConditions;
    for (const [index, field] of fields.entries()) {
      const r = feature.properties.conditions[field];
      if (r === null || r === undefined) {
        conditions[field] = null;
        continue;
      }
      if (
        !object(r) ||
        r.unit !== units[index] ||
        !['available', 'outdated', 'unverified'].includes(String(r.status)) ||
        typeof r.source !== 'string' ||
        typeof r.observedAt !== 'string' ||
        typeof r.validUntil !== 'string' ||
        !(
          r.value === null ||
          (index < 3
            ? typeof r.value === 'number' && Number.isFinite(r.value)
            : typeof r.value === 'boolean')
        )
      )
        return null;
      conditions[field] = r as unknown as ConditionReading;
    }
    zones.push({
      id: feature.properties.id,
      name: feature.properties.name,
      geometry: feature.geometry as Polygon | MultiPolygon,
      conditions,
    });
  }
  return zones;
}

export async function loadConditionMap(signal?: AbortSignal): Promise<ConditionZone[] | null> {
  try {
    const response = await fetch('/data/alerts/conditions.geojson', {
      cache: 'no-cache',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.length <= 4 * 1024 * 1024 ? parseConditionMap(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}
