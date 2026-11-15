import type { SourcedEntity } from '../common';

export interface Organization extends SourcedEntity {
  name: string;
  kind: 'asada' | 'fluc';
  description: string;
}
