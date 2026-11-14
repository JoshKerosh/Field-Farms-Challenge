import type { SourcedEntity } from '../common';

export interface FieldAlert extends SourcedEntity {
  watershedId: string;
  title: string;
  description: string;
  nextStep: string;
}

export interface FieldIncident extends SourcedEntity {
  farmId: string;
  sourceId: string;
  recordedAt: string;
  title: string;
  note: string;
}
