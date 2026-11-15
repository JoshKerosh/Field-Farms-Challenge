import type { SourcedEntity } from '../common';

export interface EnvironmentalIndicator extends SourcedEntity {
  title: string;
  value: string;
  description: string;
  provider: string;
}
