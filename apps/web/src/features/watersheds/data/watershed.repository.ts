import type { Watershed } from '@field-farms/domain';
export interface WatershedRepository {
  getWatershed(): Promise<Watershed>;
}
