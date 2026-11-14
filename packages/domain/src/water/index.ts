import type { SourcedEntity } from '../common';

export interface WaterSource extends SourcedEntity {
  name: string;
  kind: 'spring' | 'well';
  watershedId: string;
  organizationId: string;
  coordinates: [number, number];
}

export interface WaterReading extends SourcedEntity {
  sourceId: string;
  farmId: string;
  recordedAt: string;
  kind: 'flow' | 'rain';
  value: number;
  unit: 'L/s' | 'mm';
}
