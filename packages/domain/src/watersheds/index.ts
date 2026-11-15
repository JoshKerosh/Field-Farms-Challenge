import type { SourcedEntity } from '../common';

export interface Watershed extends SourcedEntity {
  name: string;
  basin: string;
  region: string;
  description: string;
}
