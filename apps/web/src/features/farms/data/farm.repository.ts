import type { Farm } from '@field-farms/domain';
export interface FarmRepository {
  getFarm(): Promise<Farm>;
}
