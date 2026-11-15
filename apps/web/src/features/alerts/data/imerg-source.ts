import { booleanPointInPolygon, point } from '@turf/turf';
import type { Polygon, MultiPolygon } from 'geojson';
import { validObservationDate, type AlertEvidence } from '@field-farms/domain';

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
type ImergSubbasin = {
  basinFile: string;
  featureIndex: number;
  layerSha256: string;
  bounds: number[];
  rain1d: AlertEvidence;
  rain7d: AlertEvidence;
};
export interface ImergSource {
  observedEnd: string;
  subbasins: ImergSubbasin[];
}

export function parseImergSource(value: unknown): ImergSource | null {
  if (
    !object(value) ||
    value.schemaVersion !== 'imerg-subbasins-v1' ||
    value.origin !== 'estimated' ||
    value.dataMode !== 'real' ||
    !object(value.source) ||
    value.source.product !== 'GPM_3IMERGDL' ||
    value.source.version !== '07' ||
    value.source.run !== 'Late' ||
    !object(value.method) ||
    value.method.id !== 'imerg-area-5367-v1' ||
    value.method.areaCrs !== 'EPSG:5367' ||
    !Array.isArray(value.subbasins) ||
    !validObservationDate(typeof value.observedEnd === 'string' ? value.observedEnd : null)
  )
    return null;
  const subbasins: ImergSubbasin[] = [];
  for (const item of value.subbasins) {
    if (
      !object(item) ||
      typeof item.basinFile !== 'string' ||
      !/^\d+\.geojson$/.test(item.basinFile) ||
      !Number.isSafeInteger(item.featureIndex) ||
      Number(item.featureIndex) < 0 ||
      !hash(item.layerSha256) ||
      !Array.isArray(item.bounds) ||
      item.bounds.length !== 4 ||
      !item.bounds.every(finite)
    )
      return null;
    const records: Record<string, AlertEvidence> = {};
    for (const [key, days] of [
      ['rain1d', 1],
      ['rain7d', 7],
    ] as const) {
      const indicator = item[key];
      if (
        !object(indicator) ||
        indicator.unit !== 'mm' ||
        !validObservationDate(
          typeof indicator.observedStart === 'string' ? indicator.observedStart : null,
        ) ||
        !validObservationDate(
          typeof indicator.observedEnd === 'string' ? indicator.observedEnd : null,
        ) ||
        indicator.observedEnd !== value.observedEnd ||
        (Date.parse(String(indicator.observedEnd)) - Date.parse(String(indicator.observedStart))) /
          86400000 +
          1 !==
          days ||
        !['available', 'unavailable'].includes(String(indicator.status))
      )
        return null;
      if (
        indicator.status === 'available' &&
        (!finite(indicator.value) ||
          indicator.value < 0 ||
          !finite(indicator.validAreaFraction) ||
          Math.abs(indicator.validAreaFraction - 1) > 1e-6)
      )
        return null;
      if (indicator.status === 'unavailable' && indicator.value !== null) return null;
      records[key] = {
        id: key,
        value: indicator.value as number | null,
        unit: 'mm',
        productId: 'GPM_3IMERGDL.07',
        status: indicator.status as 'available' | 'unavailable',
        expectedSource: 'NASA IMERG Late',
        provenance: {
          origin: 'estimated',
          source: 'NASA GES DISC · IMERG Late V07',
          asOf: String(indicator.observedEnd),
        },
        observedStart: String(indicator.observedStart),
        observedEnd: String(indicator.observedEnd),
      };
    }
    subbasins.push({
      basinFile: item.basinFile,
      featureIndex: Number(item.featureIndex),
      layerSha256: item.layerSha256,
      bounds: item.bounds as number[],
      rain1d: records.rain1d,
      rain7d: records.rain7d,
    });
  }
  return { observedEnd: String(value.observedEnd), subbasins };
}

/** Join by checked layer bytes + feature index + polygon containment, never by a basin name. */
export async function imergEvidenceForPoint(
  source: ImergSource | null,
  lon: number,
  lat: number,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, AlertEvidence>> {
  if (!source) return {};
  const candidates = source.subbasins.filter(
    (b) => b.bounds[0] <= lon && b.bounds[2] >= lon && b.bounds[1] <= lat && b.bounds[3] >= lat,
  );
  const matches: ImergSubbasin[] = [];
  const layers = new Map<string, { digest: string; features: unknown[] }>();
  try {
    for (const candidate of candidates) {
      let layer = layers.get(candidate.basinFile);
      if (!layer) {
        const response = await fetcher(`/data/geo/subcuencas/${candidate.basinFile}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return {};
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 2 * 1024 * 1024) return {};
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('');
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (
          !object(parsed) ||
          parsed.type !== 'FeatureCollection' ||
          !Array.isArray(parsed.features)
        )
          return {};
        layer = { digest, features: parsed.features };
        layers.set(candidate.basinFile, layer);
      }
      if (layer.digest !== candidate.layerSha256) return {};
      const feature = layer.features[candidate.featureIndex];
      if (
        !object(feature) ||
        !object(feature.geometry) ||
        !['Polygon', 'MultiPolygon'].includes(String(feature.geometry.type))
      )
        return {};
      if (
        booleanPointInPolygon(
          point([lon, lat]),
          feature.geometry as unknown as Polygon | MultiPolygon,
        )
      )
        matches.push(candidate);
    }
  } catch {
    return {};
  }
  // Points on boundaries can belong to multiple polygons; do not choose one arbitrarily.
  if (matches.length !== 1) return {};
  return { rain1d: matches[0].rain1d, rain7d: matches[0].rain7d };
}
