import { describe, expect, it } from 'vitest';
import { parseCneSource } from './cne-source';

const fixture = (value: true | null) => ({
  schemaVersion: 'alert-cne-v1',
  dataMode: 'real',
  location: { longitude: -85.08, latitude: 10.8 },
  indicators: [
    {
      id: 'floodZone',
      source: 'CNE',
      status: 'unverified',
      observedStart: null,
      observedEnd: null,
      value,
      productId: 'cne:inundaciones',
      evidence: {
        url: 'http://mapas.cne.go.cr/servicios/cne/wfs?synthetic=true',
        sha256: 'a'.repeat(64),
      },
    },
  ],
});

describe('CNE source adapter', () => {
  it('preserves actual intersections without inventing map observation dates', () => {
    const result = parseCneSource(fixture(true));
    expect(result?.evidence.floodZone).toMatchObject({
      value: true,
      observedEnd: null,
      status: 'unverified',
    });
  });
  it('keeps empty coverage as missing rather than declaring safety', () => {
    expect(parseCneSource(fixture(null))?.evidence.floodZone.value).toBeNull();
    const wrong = fixture(null);
    expect(
      parseCneSource({ ...wrong, indicators: [{ ...wrong.indicators[0], value: false }] }),
    ).toBeNull();
  });
  it('rejects unsubstantiated current-status claims and duplicate indicators', () => {
    const document = fixture(true);
    expect(
      parseCneSource({
        ...document,
        indicators: [{ ...document.indicators[0], status: 'available' }],
      }),
    ).toBeNull();
    expect(
      parseCneSource({ ...document, indicators: [...document.indicators, ...document.indicators] }),
    ).toBeNull();
  });
});
