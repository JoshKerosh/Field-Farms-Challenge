import type { FeatureCollection } from 'geojson';
import type { BasinExplorerRepository } from '../../features/watersheds';
import type { StreamFeature } from '../../features/watersheds/analysis/parcel-analysis';
import type { ParcelFeature } from '../siri/parcel';

/** Files published by jobs/data-pipeline (field_farms_data.publish.basins). */
const GEO_DATA = '/data/geo';
/** IGN WFS allows CORS, so the browser queries it directly. */
const IGN_WFS = 'https://geos.snitcr.go.cr/be/IGN_25/wfs';
const IGN_STREAMS = 'IGN_25:caucedrenaje_25k';

const empty = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });

/** Each file is downloaded once per session; a failed download is retried next time. */
function cachedJson<T>() {
  const cache = new Map<string, Promise<T>>();
  return (path: string, missingIsEmpty = false): Promise<T> => {
    if (!cache.has(path)) {
      const promise = fetch(path).then(async (response) => {
        if (missingIsEmpty && response.status === 404) return empty() as T;
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return (await response.json()) as T;
      });
      promise.catch(() => cache.delete(path));
      cache.set(path, promise);
    }
    return cache.get(path)!;
  };
}

export function createBasinExplorerAdapter(): BasinExplorerRepository {
  const load = cachedJson<never>();
  return {
    listBasins: () => load(`${GEO_DATA}/cuencas.geojson`),
    // 404: a basin with no sub-basins or sources published.
    listSubbasins: (basin) => load(`${GEO_DATA}/subcuencas/${basin}.geojson`, true),
    listWaterSources: (basin) => load(`${GEO_DATA}/fuentes/${basin}.geojson`, true),
    listOperators: () => load(`${GEO_DATA}/asadas.geojson`),

    async findParcel(lng, lat) {
      const response = await fetch(`/api/parcela?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`);
      if (response.status === 400) return null;
      if (!response.ok) throw new Error(`parcela: ${response.status}`);
      const data = (await response.json()) as FeatureCollection;
      return (data.features[0] as ParcelFeature | undefined) ?? null;
    },

    async listStreams([west, south, east, north], signal) {
      const params = new URLSearchParams({
        SERVICE: 'WFS',
        VERSION: '1.0.0',
        REQUEST: 'GetFeature',
        TYPENAME: IGN_STREAMS,
        BBOX: `${west},${south},${east},${north},EPSG:4326`,
        SRSNAME: 'EPSG:4326',
        OUTPUTFORMAT: 'application/json',
        MAXFEATURES: '3000',
      });
      const response = await fetch(`${IGN_WFS}?${params}`, { signal });
      if (!response.ok) throw new Error(`IGN: ${response.status}`);
      return ((await response.json()) as FeatureCollection).features as StreamFeature[];
    },
  };
}

export const basinExplorer = createBasinExplorerAdapter();
