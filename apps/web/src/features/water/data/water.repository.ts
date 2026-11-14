import type { WaterSource, WaterReading } from '@field-farms/domain';
export interface WaterRepository {
  listSources(): Promise<WaterSource[]>;
  listReadings(): Promise<WaterReading[]>;
}
