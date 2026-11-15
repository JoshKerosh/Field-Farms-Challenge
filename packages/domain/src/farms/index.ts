import type { SourcedEntity } from '../common';

export interface Farm extends SourcedEntity {
  name: string;
  district: string;
  activity: string;
  areaHa: number;
  animals: number;
  paddocks: number;
  watershedId: string;
  organizationId: string;
  coordinates: [number, number];
}
