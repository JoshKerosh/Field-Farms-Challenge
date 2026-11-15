import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import type { ParcelFeature } from '../../../platform/siri/parcel';
import type {
  BasinProperties,
  OperatorProperties,
  StreamFeature,
  SubbasinProperties,
  WaterSourceProperties,
} from '../analysis/parcel-analysis';

export type Bounds = [west: number, south: number, east: number, north: number];

/** Real territorial layers for "Mi cuenca": PNUD basins, SAGA operators and sources, SIRI, IGN. */
export interface BasinExplorerRepository {
  listBasins(): Promise<FeatureCollection<Polygon | MultiPolygon, BasinProperties>>;
  listSubbasins(
    basinNumber: number,
  ): Promise<FeatureCollection<Polygon | MultiPolygon, SubbasinProperties>>;
  listWaterSources(basinNumber: number): Promise<FeatureCollection<Point, WaterSourceProperties>>;
  listOperators(): Promise<FeatureCollection<Point, OperatorProperties>>;
  /** Cadastral parcel under the point, or null when there is none (sea, outside Costa Rica). */
  findParcel(lng: number, lat: number): Promise<ParcelFeature | null>;
  listStreams(bounds: Bounds, signal?: AbortSignal): Promise<StreamFeature[]>;
}
