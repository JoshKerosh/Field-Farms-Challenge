import type { SourcedEntity } from '../common';

export interface RestorationAction extends SourcedEntity {
  farmId: string;
  title: string;
  description: string;
  status: 'planned' | 'done';
  benefit: string;
}
