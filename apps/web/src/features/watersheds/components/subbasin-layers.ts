import { bbox, circle } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import type { FarmSite } from '../../../app/context/FieldContext';
import { getGeo, inRing, type Geo, type PlaceContext } from '../../../data/engine/geo';
import type { Dataset } from '../../../data/real/types';
import { geometryContains } from '../../../shared/geo/geometry';
import { MIN_SHARE } from '../analysis/parcel-analysis';
import { RISK_LABEL, RISK_STYLE, type WatershedPlan } from '../../../data/engine/watershed';

/** Side of a plan tile in SVG pixels of the sub-basin box (see `Geo.satBase`). */
const TILE_PX = 9;
/** Recharge halo around each spring, as in the plan. */
const HALO_M = 1000;

export interface SubbasinLayers {
  outline: FeatureCollection<Polygon>;
  /** Properties: `color`. */
  restore: FeatureCollection<Polygon>;
  /** Properties: `color`. */
  banks: FeatureCollection<Polygon>;
  /** Properties: `color`. */
  halos: FeatureCollection<Polygon>;
  /** Properties: `i` (source index), `color`, `tooltip`. */
  sources: FeatureCollection<Point>;
  farm: FeatureCollection<Polygon | MultiPolygon | Point>;
}

const collection = <G extends Polygon | MultiPolygon | Point>(
  features: Feature<G>[],
): FeatureCollection<G> => ({
  type: 'FeatureCollection',
  features,
});

/**
 * The sub-basin plan, computed in the app's local grid, as GeoJSON for MapLibre.
 * Positions go through `Geo.localToLngLat`, accurate to about 50 m.
 */
export function subbasinLayers(
  geo: Geo,
  ctx: PlaceContext,
  plan: WatershedPlan,
  farm: FarmSite | null,
): SubbasinLayers {
  const ll = (x: number, y: number) => geo.localToLngLat({ x, y });
  const ring = ctx.sub.r[0];
  const outline: [number, number][] = [];
  for (let i = 0; i < ring.length; i += 2) outline.push(ll(ring[i], ring[i + 1]));
  outline.push(outline[0]);

  const half = ((TILE_PX / 2) * ctx.geo.box.w) / ctx.geo.box.BW;
  const tiles = (list: WatershedPlan['tilesRestaurar']) =>
    collection(
      list.map(({ lx, ly, col }) => {
        const corners = [
          ll(lx - half, ly - half),
          ll(lx + half, ly - half),
          ll(lx + half, ly + half),
          ll(lx - half, ly + half),
        ];
        return {
          type: 'Feature' as const,
          properties: { color: col },
          geometry: { type: 'Polygon' as const, coordinates: [[...corners, corners[0]]] },
        };
      }),
    );

  const located = plan.sources.map((s) => ({ s, at: ll(s.q[0], s.q[1]) }));
  return {
    outline: collection([
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [outline] },
      },
    ]),
    restore: tiles(plan.tilesRestaurar),
    banks: tiles(plan.tilesOrillas),
    halos: collection(
      located
        .filter(({ s }) => s.nac)
        .map(({ s, at }) =>
          circle(at, HALO_M, {
            units: 'meters',
            steps: 32,
            properties: { color: RISK_STYLE[s.risk][1] },
          }),
        ),
    ),
    sources: collection(
      located.map(({ s, at }) => ({
        type: 'Feature' as const,
        properties: {
          i: s.i,
          color: RISK_STYLE[s.risk][1],
          tooltip: [s.q[4], `${s.kind} · ${RISK_LABEL[s.risk]}`, s.op[0]].join('\n'),
        },
        geometry: { type: 'Point' as const, coordinates: at },
      })),
    ),
    // The farm from "Mi finca", or else the app's location.
    farm: collection<Polygon | MultiPolygon | Point>([
      farm?.parcel ?? {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: farm ? [farm.lng, farm.lat] : ll(ctx.loc.x, ctx.loc.y),
        },
      },
    ]),
  };
}

/** Points per side of the grid sampled inside the parcel. */
const SAMPLES = 24;

export interface FarmSubbasin {
  /** Index in `territory.subs`, as `PlaceContext.subId`. */
  id: number;
  name: string;
  /** Share of the parcel in the sub-basin, 0–1. */
  share: number;
}

/**
 * Sub-basins of the app's territory that the farm falls in, largest share first.
 * Shares come from a grid of points inside the parcel; a farm without parcel gets the
 * sub-basin under its point.
 */
export function farmSubbasins(ds: Dataset, farm: FarmSite): FarmSubbasin[] {
  const geo = getGeo(ds);
  const points: [number, number][] = [];
  if (farm.parcel) {
    const [w, s, e, n] = bbox(farm.parcel);
    for (let i = 0; i < SAMPLES; i++) {
      for (let j = 0; j < SAMPLES; j++) {
        const lng = w + ((i + 0.5) / SAMPLES) * (e - w);
        const lat = s + ((j + 0.5) / SAMPLES) * (n - s);
        if (geometryContains(farm.parcel.geometry, lng, lat)) points.push([lng, lat]);
      }
    }
  }
  if (!points.length) points.push([farm.lng, farm.lat]);

  const subs = ds.territory.subs;
  const boxes = subs.map(({ r }) => {
    const ring = r[0];
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < ring.length; i += 2) {
      x0 = Math.min(x0, ring[i]);
      x1 = Math.max(x1, ring[i]);
      y0 = Math.min(y0, ring[i + 1]);
      y1 = Math.max(y1, ring[i + 1]);
    }
    return [x0, y0, x1, y1];
  });
  const counts = new Map<number, number>();
  for (const [lng, lat] of points) {
    const { x, y } = geo.llToLocal(lat, lng);
    const id = subs.findIndex(
      (sub, k) =>
        x >= boxes[k][0] &&
        x <= boxes[k][2] &&
        y >= boxes[k][1] &&
        y <= boxes[k][3] &&
        inRing(x, y, sub.r[0]),
    );
    if (id >= 0) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, count]) => ({ id, name: subs[id].n, share: count / points.length }))
    .filter((sub) => sub.share >= MIN_SHARE)
    .sort((a, b) => b.share - a.share);
}
