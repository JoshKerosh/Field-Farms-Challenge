import type { SourcedEntity } from '../common';

export interface WatershedMapData {
  outline: [number, number][];
  river: [number, number][];
}

export interface Watershed extends SourcedEntity {
  name: string;
  basin: string;
  region: string;
  description: string;
}
