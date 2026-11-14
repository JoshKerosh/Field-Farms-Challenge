import type { RestorationAction } from '@field-farms/domain';
export interface RestorationRepository {
  listActions(): Promise<RestorationAction[]>;
}
