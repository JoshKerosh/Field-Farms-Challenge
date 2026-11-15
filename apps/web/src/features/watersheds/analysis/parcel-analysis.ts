import type {
  BasinShare,
  CadastralParcel,
  NearbyOperator,
  NearbyStream,
  NearbyWater,
  NearbyWaterSource,
  Provenance,
  SubbasinShare,
  WaterSourceKind,
} from '@field-farms/domain';
import { isPublicRoad } from '@field-farms/domain';
import {
  along,
  area,
  booleanIntersects,
  booleanPointInPolygon,
  buffer,
  featureCollection,
  intersect,
  length,
  lineSplit,
  lineString,
  pointToLineDistance,
  pointToPolygonDistance,
} from '@turf/turf';
import type {
  Feature,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Position,
} from 'geojson';
import { message } from '../../../i18n/messages';
import type { ParcelFeature } from '../../../platform/siri/parcel';
/** Streams within this distance of the parcel are listed and drawn. */
export const STREAMS_RADIUS_M = 200;
/** Water sources and operator offices within this distance of the parcel. */
export const WATER_RADIUS_M = 300;
/** A basin counts only if it covers at least this share of the parcel (avoids slivers between sources). */
export const MIN_SHARE = 0.01;
export type Area = Feature<Polygon | MultiPolygon>;
export interface BasinProperties {
  cuenca_no: number;
  nombre: string;
  area_ha: number;
  color: string;
}
export interface SubbasinProperties {
  nombre: string;
  gran_cuenca: string;
  vertiente: string;
  hectareas: number;
}
export interface WaterSourceProperties {
  nombre: string;
  tipo: WaterSourceKind;
  ideo: string;
  operador: string;
  altitud: number | null;
  caudal: number | null;
}
export interface OperatorProperties {
  cuenca_no: number;
  ideo: string;
  nombre: string;
  tipo: string;
  zona: string;
  servicios: number | null;
  fuentes: number;
  nacientes: number;
}
/** IGN 1:25 000 stream attributes (caucedrenaje_25k). */
export interface StreamProperties {
  nombre?: string | null;
  nom_objeto?: string | null;
  gmlid?: string;
}
export type StreamFeature = Feature<LineString | MultiLineString, StreamProperties>;
const today = () => new Date().toISOString().slice(0, 10);
export const provenance = {
  siri: (): Provenance => ({
    origin: 'observed',
    source: 'SIRI · Registro Nacional',
    asOf: today(),
  }),
  ign: (): Provenance => ({ origin: 'observed', source: 'IGN 1:25 000 · SNIT', asOf: today() }),
  saga: (): Provenance => ({ origin: 'observed', source: 'SAGA · AyA', asOf: '2026-11-11' }),
};
export function toParcel(feature: ParcelFeature): CadastralParcel {
  const p = feature.properties;
  return {
    id: `siri-${p.identifica}`,
    farmNumber: `${p.provincia}-${p.finca}`,
    plan: p.plano,
    identifier: p.identifica,
    areaM2: p.shape_area,
    isPublicRoad: isPublicRoad(p.finca),
    provenance: provenance.siri(),
  };
}
/** Area of the parcel in each polygon, largest first, ignoring shares below MIN_SHARE. */
export function areaShares<P>(parcel: Area, polygons: Feature<Polygon | MultiPolygon, P>[]) {
  const total = area(parcel);
  if (!total) return [];
  return polygons
    .map((polygon) => {
      const overlap = intersect(
        featureCollection<Polygon | MultiPolygon>([parcel, polygon as Area]),
      );
      const areaM2 = overlap ? area(overlap) : 0;
      return { properties: polygon.properties, areaM2, share: areaM2 / total };
    })
    .filter((s) => s.share >= MIN_SHARE)
    .sort((a, b) => b.areaM2 - a.areaM2);
}
export function basinShares(
  parcel: Area,
  basins: Feature<Polygon | MultiPolygon, BasinProperties>[],
): BasinShare[] {
  return areaShares(parcel, basins).map((s) => ({
    basinNumber: s.properties.cuenca_no,
    name: s.properties.nombre,
    areaM2: Math.round(s.areaM2),
    percent: round1(s.share * 100),
  }));
}
export function subbasinShares(
  parcel: Area,
  subbasins: Feature<Polygon | MultiPolygon, SubbasinProperties>[],
): SubbasinShare[] {
  return areaShares(parcel, subbasins).map((s) => ({
    name: s.properties.nombre,
    mainBasin: s.properties.gran_cuenca,
    slope: s.properties.vertiente,
    hectares: s.properties.hectareas,
    areaM2: Math.round(s.areaM2),
    percent: round1(s.share * 100),
  }));
}
/** Parcel grown by `radiusM`, used both to search and to draw the search outline. */
export function searchZone(parcel: Area, radiusM: number): Area {
  return buffer(parcel, radiusM, { units: 'meters' }) as Area;
}
/** Same naming as the IGN layer, cleaned: "QUEBRADA ALUMBRE" → "Quebrada Alumbre", "RIO" → "Río". */
export function streamLabel(p: StreamProperties): {
  name: string | null;
  kind: string;
} {
  const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const kind = p.nom_objeto
    ? p.nom_objeto.charAt(0) + p.nom_objeto.slice(1).toLowerCase()
    : message('m9456d510515b');
  return {
    name: p.nombre ? title(p.nombre).replace(/^Rio\b/, 'Río') : null,
    kind: kind.replace(/^Rio\b/, 'Río'),
  };
}
/** Streams near the parcel with their distance and length inside it, plus the parts to draw. */
export function nearbyStreams(parcel: Area, streams: StreamFeature[], radiusM = STREAMS_RADIUS_M) {
  const zone = searchZone(parcel, radiusM);
  const result: {
    stream: NearbyStream;
    parts: Feature<LineString>[];
  }[] = [];
  streams.forEach((feature, index) => {
    const lines = toLines(feature);
    const parts = lines.flatMap((line) => clipLine(line, zone));
    if (!parts.length) return;
    const { name, kind } = streamLabel(feature.properties);
    const distanceM = Math.min(...lines.map((line) => lineDistance(line, parcel)));
    const insideM = lines
      .flatMap((line) => clipLine(line, parcel))
      .reduce((sum, part) => sum + length(part, { units: 'meters' }), 0);
    result.push({
      stream: {
        id: feature.properties.gmlid ?? `ign-${index}`,
        name,
        kind,
        intermittent: kind.toLowerCase().includes('intermitente'),
        distanceM: Math.round(distanceM),
        insideM: Math.round(insideM),
        provenance: provenance.ign(),
      },
      parts,
    });
  });
  return result.sort(
    (a, b) => a.stream.distanceM - b.stream.distanceM || b.stream.insideM - a.stream.insideM,
  );
}
/**
 * Water sources and operator offices within `radiusM` of the parcel. When none is within the radius,
 * the nearest source among `sources` is returned instead. Proximity does not prove recharge or supply.
 */
export function nearbyWater(
  parcel: Area,
  sources: Feature<Point, WaterSourceProperties>[],
  operators: Feature<Point, OperatorProperties>[],
  radiusM = WATER_RADIUS_M,
): NearbyWater {
  const distance = (point: Feature<Point>) =>
    Math.max(0, Math.round(pointToPolygonDistance(point, parcel, { units: 'meters' })));
  const measured = sources.map((feature) => ({ feature, distanceM: distance(feature) }));
  let within = measured
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
  const nearestOutsideRadius = !within.length && measured.length > 0;
  if (nearestOutsideRadius)
    within = [measured.reduce((best, s) => (s.distanceM < best.distanceM ? s : best))];
  const nearbySources: NearbyWaterSource[] = within.map(({ feature, distanceM }) => {
    const p = feature.properties;
    return {
      id: `${p.ideo}-${p.nombre}-${feature.geometry.coordinates.join(',')}`,
      name: p.nombre,
      kind: p.tipo,
      operatorId: p.ideo,
      operatorName: p.operador,
      altitudeM: p.altitud,
      lastFlow: p.caudal,
      coordinates: feature.geometry.coordinates as [number, number],
      distanceM,
      provenance: provenance.saga(),
    };
  });
  const byOperator = new Map<string, NearbyOperator>();
  for (const source of nearbySources) {
    const entry = byOperator.get(source.operatorId) ?? {
      id: source.operatorId,
      name: source.operatorName,
      sources: 0,
      distanceM: source.distanceM,
      provenance: provenance.saga(),
    };
    entry.sources += 1;
    byOperator.set(source.operatorId, entry);
  }
  for (const office of operators) {
    const distanceM = distance(office);
    if (distanceM > radiusM) continue;
    const p = office.properties;
    const entry = byOperator.get(p.ideo) ?? {
      id: p.ideo,
      name: p.nombre,
      sources: 0,
      distanceM,
      provenance: provenance.saga(),
    };
    entry.distanceM = Math.min(entry.distanceM, distanceM);
    entry.office = {
      coordinates: office.geometry.coordinates as [number, number],
      distanceM,
      kind: p.tipo,
      services: p.servicios,
    };
    byOperator.set(p.ideo, entry);
  }
  return {
    radiusM,
    sources: nearbySources,
    operators: [...byOperator.values()].sort((a, b) => a.distanceM - b.distanceM),
    nearestOutsideRadius,
  };
}
/**
 * A stream belongs to the selected basins when most of its points fall inside them, so streams that
 * only start on the divide and run through the neighbor basin are left out.
 */
export function mostlyInside(stream: StreamFeature, basins: Area[]): boolean {
  const points = toLines(stream).flatMap((line) => line.geometry.coordinates);
  const inside = points.filter((p) =>
    basins.some((basin) => booleanPointInPolygon(p, basin)),
  ).length;
  return inside >= points.length / 2;
}
function toLines(feature: StreamFeature): Feature<LineString>[] {
  const g = feature.geometry;
  const coords: Position[][] = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
  return coords.filter((c) => c.length > 1).map((c) => lineString(c));
}
/** Parts of a line inside a polygon (split at the boundary, keep parts whose middle is inside). */
function clipLine(line: Feature<LineString>, polygon: Area): Feature<LineString>[] {
  if (!booleanIntersects(line, polygon)) return [];
  const pieces = lineSplit(line, polygon).features;
  const candidates = pieces.length ? pieces : [line];
  return candidates.filter((piece) => {
    const middle = along(piece, length(piece, { units: 'meters' }) / 2, { units: 'meters' });
    return booleanPointInPolygon(middle, polygon);
  });
}
/** 0 when the line touches the polygon; otherwise the shortest vertex-to-edge distance either way. */
function lineDistance(line: Feature<LineString>, polygon: Area): number {
  if (booleanIntersects(line, polygon)) return 0;
  const fromLine = line.geometry.coordinates.map((p) =>
    pointToPolygonDistance(p, polygon, { units: 'meters' }),
  );
  const rings =
    polygon.geometry.type === 'Polygon'
      ? [polygon.geometry.coordinates]
      : polygon.geometry.coordinates;
  const fromPolygon = rings
    .flat(2)
    .map((p) => pointToLineDistance(p as Position, line, { units: 'meters' }));
  return Math.max(0, Math.min(...fromLine, ...fromPolygon));
}
const round1 = (value: number) => Math.round(value * 10) / 10;
