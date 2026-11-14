import type { Watershed, WatershedMapData } from '@field-farms/domain';
export interface WatershedRepository {
  getWatershed(): Promise<Watershed>;
  getMapData(): Promise<WatershedMapData>;
}
