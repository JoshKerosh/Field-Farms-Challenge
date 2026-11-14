import type { EnvironmentalIndicator } from '@field-farms/domain';
export interface EnvironmentRepository {
  listIndicators(): Promise<EnvironmentalIndicator[]>;
}
