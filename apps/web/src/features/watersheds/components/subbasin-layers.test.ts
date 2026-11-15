import { describe, expect, it } from 'vitest';
import { getGeo } from '../../../data/engine/geo';
import { loadDataset } from '../../../data/real/load';
import type { ParcelFeature } from '../../../platform/siri/parcel';
import { farmSubbasins } from './subbasin-layers';

/** Square parcel of about 2 × 2 km centered on a point. */
function square(lng: number, lat: number): ParcelFeature {
  const d = 0.009;
  return {
    type: 'Feature',
    properties: {} as ParcelFeature['properties'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lng - d, lat - d],
          [lng + d, lat - d],
          [lng + d, lat + d],
          [lng - d, lat + d],
          [lng - d, lat - d],
        ],
      ],
    },
  };
}

describe('farmSubbasins', () => {
  it('splits a farm on a divide between sub-basins, largest first', async () => {
    const ds = await loadDataset();
    const geo = getGeo(ds);
    // A vertex shared by two neighboring sub-basins of the app's territory.
    const ring = ds.territory.subs[0].r[0];
    const middle = Math.floor(ring.length / 4) * 2;
    const [lng, lat] = geo.localToLngLat({ x: ring[middle], y: ring[middle + 1] });
    const subs = farmSubbasins(ds, { lng, lat, accuracyM: null, parcel: square(lng, lat) });

    expect(subs.length).toBeGreaterThanOrEqual(2);
    expect(subs.map((s) => s.id)).toContain(0);
    expect(subs[0].share).toBeGreaterThanOrEqual(subs[1].share);
    expect(subs.reduce((sum, s) => sum + s.share, 0)).toBeLessThanOrEqual(1);
  });

  it('uses the point when there is no parcel', async () => {
    const ds = await loadDataset();
    const subs = farmSubbasins(ds, { lng: -83.9126, lat: 9.8556, accuracyM: null, parcel: null });
    expect(subs).toHaveLength(1);
    expect(subs[0].share).toBe(1);
  });
});
