export type DataOrigin = 'demo' | 'observed' | 'estimated';

export interface Provenance {
  origin: DataOrigin;
  source: string;
  asOf: string;
}

export interface SourcedEntity {
  id: string;
  provenance: Provenance;
}

export type DemoRole = 'farmer' | 'asada' | 'institution';
