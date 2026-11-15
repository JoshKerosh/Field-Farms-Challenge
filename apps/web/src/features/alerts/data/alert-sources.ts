import {
  parseRiskPolicies,
  validObservationDate,
  type AlertEvidence,
  type RiskPolicies,
} from '@field-farms/domain';
import { parseImergSource, type ImergSource } from './imerg-source';
import { parseCneSource, type CneSource } from './cne-source';
import { parseClimateHistory, type ClimateHistory } from './climate-history';

type JsonObject = Record<string, unknown>;
type SourceKind = 'power' | 'roni';
export interface AlertSources {
  power: {
    longitude: number;
    latitude: number;
    anomaly: AlertEvidence;
    history: ClimateHistory | null;
  } | null;
  roni: AlertEvidence | null;
  imerg: ImergSource | null;
  cne: CneSource | null;
  spatial: { longitude: number; latitude: number; evidence: Record<string, AlertEvidence> } | null;
  policies: RiskPolicies;
  warnings: ('alerts.cachedSource' | 'alerts.updateFailed')[];
}
export const emptyAlertSources = (): AlertSources => ({
  power: null,
  roni: null,
  imerg: null,
  cne: null,
  spatial: null,
  policies: {},
  warnings: [],
});
const object = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const numeric = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function period(
  sample: JsonObject,
): sample is JsonObject & { observedStart: string; observedEnd: string } {
  return (
    validObservationDate(typeof sample.observedStart === 'string' ? sample.observedStart : null) &&
    validObservationDate(typeof sample.observedEnd === 'string' ? sample.observedEnd : null) &&
    String(sample.observedStart) <= String(sample.observedEnd)
  );
}

function evidence(sample: JsonObject, kind: SourceKind): boolean {
  if (
    !object(sample.evidence) ||
    typeof sample.evidence.url !== 'string' ||
    typeof sample.evidence.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(sample.evidence.sha256)
  )
    return false;
  try {
    const url = new URL(sample.evidence.url);
    return (
      url.protocol === 'https:' &&
      url.hostname === (kind === 'power' ? 'power.larc.nasa.gov' : 'www.cpc.ncep.noaa.gov')
    );
  } catch {
    return false;
  }
}

export function parseAlertSource(
  value: unknown,
  kind: SourceKind,
): AlertSources['power'] | AlertEvidence | null {
  if (
    !object(value) ||
    value.schemaVersion !== 'alert-source-v1' ||
    value.kind !== kind ||
    value.dataMode !== 'real' ||
    !object(value.sample) ||
    value.sample.origin !== 'provider-data' ||
    !period(value.sample) ||
    !evidence(value.sample, kind)
  )
    return null;
  const s = value.sample;
  if (kind === 'roni') {
    if (
      s.source !== 'NOAA CPC' ||
      s.index !== 'RONI' ||
      s.sstVersion !== 'ERSSTv6' ||
      s.unit !== 'degC' ||
      !numeric(s.value)
    )
      return null;
    const seasons = [
      'DJF',
      'JFM',
      'FMA',
      'MAM',
      'AMJ',
      'MJJ',
      'JJA',
      'JAS',
      'ASO',
      'SON',
      'OND',
      'NDJ',
    ];
    const seasonIndex = seasons.indexOf(String(s.season));
    if (
      seasonIndex < 0 ||
      typeof s.year !== 'number' ||
      !Number.isSafeInteger(s.year) ||
      s.year < 1000 ||
      s.year > 9999 ||
      new Date(Date.UTC(s.year, seasonIndex - 1, 1)).toISOString().slice(0, 10) !==
        s.observedStart ||
      new Date(Date.UTC(s.year, seasonIndex + 2, 0)).toISOString().slice(0, 10) !== s.observedEnd
    )
      return null;
    return {
      id: 'roni',
      value: s.value,
      unit: '°C',
      productId: 'NOAA-RONI-ERSSTv6',
      status: 'available',
      expectedSource: 'NOAA CPC',
      provenance: { origin: 'estimated', source: 'NOAA CPC · RONI ERSSTv6', asOf: s.observedEnd },
      observedStart: s.observedStart,
      observedEnd: s.observedEnd,
    };
  }
  const anomaly = s.precipitationAnomaly30d;
  if (
    s.source !== 'NASA POWER' ||
    s.timeStandard !== 'UTC' ||
    !object(s.location) ||
    !numeric(s.location.longitude) ||
    !numeric(s.location.latitude) ||
    s.location.longitude < -180 ||
    s.location.longitude > 180 ||
    s.location.latitude < -90 ||
    s.location.latitude > 90 ||
    !object(anomaly) ||
    anomaly.status !== 'available' ||
    !numeric(anomaly.value) ||
    anomaly.unit !== '%' ||
    anomaly.method !== 'power-point-30d-calendar-reference-1991-2020-v1' ||
    !Array.isArray(anomaly.referenceYears) ||
    anomaly.referenceYears.join(',') !== '1991,2020' ||
    anomaly.referenceWindowCount !== 30 ||
    !numeric(anomaly.referenceMeanMm) ||
    anomaly.referenceMeanMm <= 0 ||
    !object(s.precipitation30d) ||
    s.precipitation30d.unit !== 'mm' ||
    !numeric(s.precipitation30d.value) ||
    s.precipitation30d.value < 0 ||
    Math.abs(anomaly.value - (s.precipitation30d.value / anomaly.referenceMeanMm - 1) * 100) >
      1e-7 ||
    (Date.parse(s.observedEnd) - Date.parse(s.observedStart)) / 86400000 !== 29
  )
    return null;
  if (!evidence({ evidence: s.baselineEvidence }, 'power')) return null;
  for (const rawEvidence of [s.evidence, s.baselineEvidence]) {
    if (!object(rawEvidence) || typeof rawEvidence.url !== 'string') return null;
    const url = new URL(rawEvidence.url);
    const lon = Number(url.searchParams.get('longitude'));
    const lat = Number(url.searchParams.get('latitude'));
    if (
      !url.searchParams.has('longitude') ||
      !url.searchParams.has('latitude') ||
      !Number.isFinite(lon) ||
      !Number.isFinite(lat) ||
      lon.toFixed(6) !== s.location.longitude.toFixed(6) ||
      lat.toFixed(6) !== s.location.latitude.toFixed(6) ||
      url.searchParams.get('time-standard') !== 'UTC'
    )
      return null;
  }
  if (!Array.isArray(s.daily) || s.daily.length !== 30) return null;
  let totalRain = 0;
  for (const [index, day] of s.daily.entries()) {
    if (
      !object(day) ||
      !numeric(day.precipitationMm) ||
      day.precipitationMm < 0 ||
      day.date !==
        new Date(Date.parse(s.observedStart) + index * 86400000).toISOString().slice(0, 10)
    )
      return null;
    totalRain += day.precipitationMm;
  }
  if (Math.abs(totalRain - s.precipitation30d.value) > 1e-7) return null;
  return {
    longitude: s.location.longitude,
    latitude: s.location.latitude,
    history: parseClimateHistory(s),
    anomaly: {
      id: 'rain30anomaly',
      value: anomaly.value,
      unit: '%',
      productId: 'POWER-PRECTOTCORR-30D-1991-2020',
      status: 'available',
      expectedSource: 'NASA POWER',
      provenance: {
        origin: 'estimated',
        source: `NASA POWER (${s.location.latitude}, ${s.location.longitude}) · 1991–2020`,
        asOf: s.observedEnd,
      },
      observedStart: s.observedStart,
      observedEnd: s.observedEnd,
    },
  };
}

/** Static files only. No NASA request or credential ever reaches the browser. */
export async function loadAlertSources(
  fetcher: typeof fetch = fetch,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): Promise<AlertSources> {
  const result = emptyAlertSources();
  const read = async (path: string): Promise<unknown> => {
    const response = await fetcher(path, { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Source unavailable');
    const raw = await response.text();
    if (raw.length > 4 * 1024 * 1024) throw new Error('Source too large');
    return JSON.parse(raw);
  };
  await Promise.all(
    (['power', 'roni'] as const).map(async (kind) => {
      const key = `ffc.alert-source.v1.${kind}`;
      let document: unknown;
      let parsed: ReturnType<typeof parseAlertSource>;
      let cachedDocument: unknown;
      let cachedSource: ReturnType<typeof parseAlertSource> = null;
      try {
        const cached = storage?.getItem(key);
        if (cached) {
          cachedDocument = JSON.parse(cached);
          cachedSource = parseAlertSource(cachedDocument, kind);
        }
      } catch {
        /* Corrupt cache is ignored. */
      }
      try {
        document = await read(`/data/nasa/${kind}/latest.json`);
        parsed = parseAlertSource(document, kind);
        if (!parsed) throw new Error('Invalid source');
        if (cachedSource) {
          const sameLocation =
            ('id' in parsed && 'id' in cachedSource) ||
            ('anomaly' in parsed &&
              'anomaly' in cachedSource &&
              parsed.longitude === cachedSource.longitude &&
              parsed.latitude === cachedSource.latitude);
          const end = 'id' in parsed ? parsed.observedEnd : parsed.anomaly.observedEnd;
          const cachedEnd =
            'id' in cachedSource ? cachedSource.observedEnd : cachedSource.anomaly.observedEnd;
          if (sameLocation && end && cachedEnd && cachedEnd > end) {
            parsed = cachedSource;
            document = cachedDocument;
            result.warnings.push('alerts.cachedSource');
          }
        }
        try {
          storage?.setItem(key, JSON.stringify(document));
        } catch {
          /* Restricted storage. */
        }
      } catch {
        parsed = cachedSource;
        if (parsed) result.warnings.push('alerts.cachedSource');
      }
      if (kind === 'power' && parsed && 'anomaly' in parsed) result.power = parsed;
      if (kind === 'roni' && parsed && 'id' in parsed) result.roni = parsed;
      try {
        const status = await read(`/data/nasa/${kind}/status.json`);
        if (object(status) && status.status === 'failed')
          result.warnings.push('alerts.updateFailed');
      } catch {
        /* Missing status does not fabricate a successful update. */
      }
    }),
  );
  try {
    result.policies = parseRiskPolicies(await read('/data/alerts/rules.json'));
  } catch {
    /* No cached approval: unavailable rules must not enable a stale policy. */
  }
  try {
    result.imerg = parseImergSource(await read('/data/nasa/imerg/latest.json'));
  } catch {
    /* Missing Earthdata ingestion must remain unavailable. */
  }
  try {
    result.cne = parseCneSource(await read('/data/alerts/cne/latest.json'));
  } catch {
    /* No mapped observation is never proof of no hazard. */
  }
  result.warnings = [...new Set(result.warnings)];
  return result;
}

export function evidenceForLocation(
  sources: AlertSources,
  longitude: number,
  latitude: number,
): Record<string, AlertEvidence> {
  const result: Record<string, AlertEvidence> = {};
  if (sources.roni) result.roni = sources.roni;
  // Coordinate identity at serialization precision, NOT a scientific radius of representativeness.
  if (
    sources.power &&
    sources.power.longitude.toFixed(6) === longitude.toFixed(6) &&
    sources.power.latitude.toFixed(6) === latitude.toFixed(6)
  )
    result.rain30anomaly = sources.power.anomaly;
  if (
    sources.spatial &&
    sources.spatial.longitude.toFixed(6) === longitude.toFixed(6) &&
    sources.spatial.latitude.toFixed(6) === latitude.toFixed(6)
  )
    Object.assign(result, sources.spatial.evidence);
  if (
    sources.cne &&
    sources.cne.longitude.toFixed(6) === longitude.toFixed(6) &&
    sources.cne.latitude.toFixed(6) === latitude.toFixed(6)
  )
    Object.assign(result, sources.cne.evidence);
  return result;
}
