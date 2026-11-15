import type { SourcedEntity } from '../common';

/** Cadastral parcel under a point, as published by SIRI (Registro Nacional). */
export interface CadastralParcel extends SourcedEntity {
  /** Province digit plus farm number, e.g. 1-0096714. */
  farmNumber: string;
  plan: string;
  identifier: string;
  areaM2: number;
  /** SIRI stores public roads as one parcel whose number starts with "V". */
  isPublicRoad: boolean;
}

/** Part of a parcel's area that falls in a basin or sub-basin. */
export interface AreaShare {
  name: string;
  areaM2: number;
  percent: number;
}

export interface BasinShare extends AreaShare {
  basinNumber: number;
}

export interface SubbasinShare extends AreaShare {
  mainBasin: string;
  slope: string;
  hectares: number;
}

export interface NearbyStream extends SourcedEntity {
  name: string | null;
  kind: string;
  intermittent: boolean;
  /** 0 when the stream crosses the parcel. */
  distanceM: number;
  insideM: number;
}

export type WaterSourceKind = 'naciente' | 'pozo' | 'superficial' | 'sin clasificar';

export interface NearbyWaterSource extends SourcedEntity {
  name: string;
  kind: WaterSourceKind;
  operatorId: string;
  operatorName: string;
  altitudeM: number | null;
  /** SAGA does not state the unit of the last recorded flow. */
  lastFlow: number | null;
  coordinates: [number, number];
  distanceM: number;
}

export interface NearbyOperator extends SourcedEntity {
  name: string;
  /** Sources of this operator within the search radius. */
  sources: number;
  distanceM: number;
  office?: {
    coordinates: [number, number];
    distanceM: number;
    kind: string;
    services: number | null;
  };
}

/** Water sources and operators around a parcel. Proximity does not prove recharge or supply. */
export interface NearbyWater {
  radiusM: number;
  sources: NearbyWaterSource[];
  operators: NearbyOperator[];
  /** True when nothing was within the radius and `sources` holds only the nearest one. */
  nearestOutsideRadius: boolean;
}

export function isPublicRoad(farmNumber: string): boolean {
  return /^V/i.test(farmNumber);
}
