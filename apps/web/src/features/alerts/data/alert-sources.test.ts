import { describe, expect, it } from 'vitest';
import power from '../../../../public/data/nasa/power/latest.json';
import roni from '../../../../public/data/nasa/roni/latest.json';
import {
  emptyAlertSources,
  evidenceForLocation,
  loadAlertSources,
  parseAlertSource,
} from './alert-sources';

const copy = <T>(value: T): T => structuredClone(value);
const responder =
  (documents: Record<string, unknown>): typeof fetch =>
  async (input) => {
    const path = String(input);
    return Object.hasOwn(documents, path)
      ? new Response(JSON.stringify(documents[path]), { status: 200 })
      : new Response('', { status: 404 });
  };
const documents = {
  '/data/nasa/power/latest.json': power,
  '/data/nasa/roni/latest.json': roni,
  '/data/alerts/rules.json': { schemaVersion: 'alert-risk-policies-v1', policies: [] },
};
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe('real static alert sources', () => {
  it('reads the downloaded NOAA and POWER snapshots with their actual sources and periods', () => {
    expect(parseAlertSource(roni, 'roni')).toMatchObject({
      value: 2,
      observedStart: '2026-08-01',
      observedEnd: '2026-10-31',
      status: 'available',
    });
    expect(parseAlertSource(power, 'power')).toMatchObject({
      longitude: -85.08,
      latitude: 10.8,
      anomaly: {
        unit: '%',
        observedEnd: '2026-11-13',
        value: power.sample.precipitationAnomaly30d.value,
      },
    });
  });

  it('rejects simulations, ONI substitutes, incompatible units, source URLs and inconsistent calculations', () => {
    expect(parseAlertSource({ ...roni, dataMode: 'demo' }, 'roni')).toBeNull();
    expect(
      parseAlertSource({ ...roni, sample: { ...roni.sample, origin: 'demo' } }, 'roni'),
    ).toBeNull();
    expect(
      parseAlertSource({ ...roni, sample: { ...roni.sample, index: 'ONI' } }, 'roni'),
    ).toBeNull();
    const invalidUnit = copy(power);
    invalidUnit.sample.precipitationAnomaly30d.unit = 'mm';
    expect(parseAlertSource(invalidUnit, 'power')).toBeNull();
    const inconsistent = copy(power);
    inconsistent.sample.precipitationAnomaly30d.value = -999;
    expect(parseAlertSource(inconsistent, 'power')).toBeNull();
    const wrongSource = copy(power);
    wrongSource.sample.evidence.url = 'https://www.cpc.ncep.noaa.gov/not-power';
    expect(parseAlertSource(wrongSource, 'power')).toBeNull();
  });

  it('uses a point observation only at that exact serialized point and keeps RONI global', async () => {
    const sources = await loadAlertSources(responder(documents));
    expect(evidenceForLocation(sources, -85.08, 10.8).rain30anomaly).toBeDefined();
    expect(evidenceForLocation(sources, -84, 9).rain30anomaly).toBeUndefined();
    expect(evidenceForLocation(sources, -84, 9).roni).toBeDefined();
  });

  it('keeps cached observations and original dates on network failure, without caching approvals', async () => {
    const storage = memoryStorage();
    await loadAlertSources(responder(documents), storage);
    const unavailable: typeof fetch = async () => {
      throw new Error('offline fixture');
    };
    const cached = await loadAlertSources(unavailable, storage);
    expect(cached.roni?.observedEnd).toBe('2026-10-31');
    expect(cached.power?.anomaly.observedEnd).toBe('2026-11-13');
    expect(cached.warnings).toContain('alerts.cachedSource');
    expect(cached.policies).toEqual({});
  });

  it('rejects corrupt files without interpreting them as zero and reports provider update failures', async () => {
    const sources = await loadAlertSources(
      responder({
        ...documents,
        '/data/nasa/power/latest.json': { unexpected: true },
        '/data/nasa/roni/status.json': { status: 'failed' },
      }),
    );
    expect(sources.power).toBeNull();
    expect(sources.warnings).toContain('alerts.updateFailed');
    expect(sources.roni?.value).toBe(2);
  });

  it('preserves a newer cached RONI when a deployment supplies an older snapshot', async () => {
    const storage = memoryStorage();
    await loadAlertSources(responder(documents), storage);
    const older = copy(roni);
    older.sample.observedEnd = '2026-09-30';
    older.sample.observedStart = '2026-07-01';
    older.sample.season = 'JAS';
    older.sample.value = 1.7;
    const result = await loadAlertSources(
      responder({ ...documents, '/data/nasa/roni/latest.json': older }),
      storage,
    );
    expect(result.roni?.observedEnd).toBe('2026-10-31');
    expect(result.roni?.value).toBe(2);
  });

  it('has no data or approvals before sources have loaded', () => {
    expect(emptyAlertSources()).toEqual({
      power: null,
      roni: null,
      imerg: null,
      cne: null,
      spatial: null,
      policies: {},
      warnings: [],
    });
  });
});
