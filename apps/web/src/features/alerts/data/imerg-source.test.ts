import { describe, expect, it } from 'vitest';
import { imergEvidenceForPoint, parseImergSource } from './imerg-source';

async function fixture() {
  const layer = JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-86, 10],
              [-85, 10],
              [-85, 11],
              [-86, 11],
              [-86, 10],
            ],
          ],
        },
      },
    ],
  });
  const digest = [
    ...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(layer))),
  ]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  const indicator = (days: number) => ({
    unit: 'mm',
    value: days * 5,
    status: 'available',
    validAreaFraction: 1,
    observedStart: days === 1 ? '2026-11-13' : '2026-11-07',
    observedEnd: '2026-11-13',
  });
  const document = {
    schemaVersion: 'imerg-subbasins-v1',
    origin: 'estimated',
    dataMode: 'real',
    source: { product: 'GPM_3IMERGDL', version: '07', run: 'Late' },
    method: { id: 'imerg-area-5367-v1', areaCrs: 'EPSG:5367' },
    observedEnd: '2026-11-13',
    subbasins: [
      {
        basinFile: '1.geojson',
        featureIndex: 0,
        layerSha256: digest,
        bounds: [-86, 10, -85, 11],
        rain1d: indicator(1),
        rain7d: indicator(7),
      },
    ],
  };
  const fetcher: typeof fetch = async () => new Response(layer);
  return { document, fetcher };
}

describe('IMERG spatial source adapter (synthetic fixtures only)', () => {
  it('associates rainfall using a verified layer and polygon containment', async () => {
    const { document, fetcher } = await fixture();
    const parsed = parseImergSource(document);
    expect(parsed).not.toBeNull();
    const result = await imergEvidenceForPoint(parsed, -85.5, 10.5, fetcher);
    expect(result.rain1d.value).toBe(5);
    expect(result.rain7d.value).toBe(35);
    expect(await imergEvidenceForPoint(parsed, -84, 10.5, fetcher)).toEqual({});
  });

  it('rejects different layers rather than matching by name or stale feature indices', async () => {
    const { document, fetcher } = await fixture();
    document.subbasins[0].layerSha256 = '0'.repeat(64);
    expect(await imergEvidenceForPoint(parseImergSource(document), -85.5, 10.5, fetcher)).toEqual(
      {},
    );
  });

  it('rejects incompatible units, partial means, simulations and malformed periods', async () => {
    const { document } = await fixture();
    for (const modify of [
      (v: typeof document) => {
        v.dataMode = 'demo';
      },
      (v: typeof document) => {
        v.subbasins[0].rain1d.unit = 'mm/hr';
      },
      (v: typeof document) => {
        v.subbasins[0].rain1d.validAreaFraction = 0.5;
      },
      (v: typeof document) => {
        v.subbasins[0].rain7d.observedStart = '2026-11-08';
      },
      (v: typeof document) => {
        v.subbasins[0].basinFile = '../outside.geojson';
      },
    ]) {
      const clone = structuredClone(document);
      modify(clone);
      expect(parseImergSource(clone)).toBeNull();
    }
  });

  it('does not choose arbitrarily when multiple subbasins contain the point', async () => {
    const { document, fetcher } = await fixture();
    document.subbasins.push(document.subbasins[0]);
    expect(await imergEvidenceForPoint(parseImergSource(document), -85.5, 10.5, fetcher)).toEqual(
      {},
    );
  });
});
