import type {
  BasinShare,
  CadastralParcel,
  NearbyStream,
  NearbyWater,
  SubbasinShare,
} from '@field-farms/domain';
import type { FeatureCollection } from 'geojson';
import type { ParcelFeature } from '../../../platform/siri/parcel';
import type { BasinProperties, SubbasinProperties } from '../analysis/parcel-analysis';

/** Above this GPS accuracy (m) the result may be wrong near a boundary. */
export const LOW_ACCURACY_M = 500;

export type Async<T> = { state: 'idle' | 'loading' | 'error' } | { state: 'done'; value: T };

/** What "Mi finca" knows about the chosen point, filled in as each query answers. */
export interface FarmResult {
  lng: number;
  lat: number;
  accuracyM: number | null;
  parcel: Async<{ info: CadastralParcel; feature: ParcelFeature } | null>;
  streams: Async<{ list: NearbyStream[]; parts: FeatureCollection }>;
  water: Async<NearbyWater>;
}

/** Water registered inside the farm's basins (SAGA). */
export interface BasinWater {
  operators: number;
  sources: number;
  springs: number;
}

/** What "Mi cuenca" shows for the farm: the basins and sub-basins it belongs to. */
export interface BasinResult {
  pointBasin: BasinProperties | null;
  basinShares: BasinShare[];
  pointSubbasin: SubbasinProperties | null;
  subbasinShares: SubbasinShare[];
  water: Async<BasinWater>;
}
