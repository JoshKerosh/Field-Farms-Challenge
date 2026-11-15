import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { handleParcelRequest, parcelQueryUrl, pickParcel } from './parcel';

const square = (x: number, y: number, size: number, finca: string) => ({
  type: 'Feature' as const,
  properties: { finca, provincia: '3', plano: 'P', interno: 'no debe salir' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      [
        [x, y],
        [x + size, y],
        [x + size, y + size],
        [x, y + size],
        [x, y],
      ],
    ],
  },
});

describe('SIRI parcel', () => {
  it('queries the exact point at the center pixel', () => {
    const url = new URL(parcelQueryUrl(-83.9, 9.85));
    expect(url.searchParams.get('X')).toBe('50');
    expect(url.searchParams.get('WIDTH')).toBe('101');
    expect(url.searchParams.get('BBOX')).toBe(
      [-83.9 - 0.0002, 9.85 - 0.0002, -83.9 + 0.0002, 9.85 + 0.0002].join(','),
    );
  });

  it('keeps the parcel that contains the point, not the first neighbor', () => {
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: [square(0, 0, 1, 'vecina'), square(1, 0, 1, 'correcta')],
    };
    const parcel = pickParcel(data, 1.5, 0.5);
    expect(parcel?.properties.finca).toBe('correcta');
    expect(parcel?.properties).not.toHaveProperty('interno');
  });

  it('rejects points outside Costa Rica without calling SIRI', async () => {
    let called = false;
    const response = await handleParcelRequest(
      new Request('http://x/api/parcela?lat=40&lon=3'),
      async () => {
        called = true;
        return new Response('{}');
      },
    );
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it('returns the chosen parcel with cache headers', async () => {
    const siri: FeatureCollection = {
      type: 'FeatureCollection',
      features: [square(-83.91, 9.85, 0.01, '0255499')],
    };
    const response = await handleParcelRequest(
      new Request('http://x/api/parcela?lat=9.855&lon=-83.905'),
      async () => new Response(JSON.stringify(siri)),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('max-age');
    const body = (await response.json()) as FeatureCollection;
    expect(body.features[0].properties?.finca).toBe('0255499');
  });

  it('reports SIRI failures as 502', async () => {
    const response = await handleParcelRequest(
      new Request('http://x/api/parcela?lat=9.855&lon=-83.905'),
      async () => new Response('caído', { status: 503 }),
    );
    expect(response.status).toBe(502);
  });
});
