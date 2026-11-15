import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { geometryContains } from '../../shared/geo/geometry';

/**
 * Cadastral parcel under a point, from SIRI (Registro Nacional) WMS GetFeatureInfo.
 * SIRI sends no CORS headers, so browsers reach it through /api/parcela: a Cloudflare Pages
 * Function in production (functions/api/parcela.ts) and a Vite middleware locally.
 */
export const SIRI_WMS = 'https://siri.snitcr.go.cr/Geoservicios/wms';
/** Query window around the point (~20 m); the center pixel is the exact point. */
const HALF_DEG = 0.0002;
/** Rough Costa Rica bounds; anything outside is rejected without calling SIRI. */
const CR_BOUNDS = { west: -87.2, south: 5.4, east: -82.5, north: 11.3 };
/** SIRI returns ~50 internal attributes per parcel; only these reach the browser. */
const FIELDS = [
  'provincia',
  'canton',
  'distrito',
  'finca',
  'identifica',
  'plano',
  'shape_area',
] as const;
/** Cadastre changes rarely; let browsers and Cloudflare reuse answers for a day. */
const CACHE_SECONDS = 86400;

export interface ParcelProperties {
  provincia: string;
  canton: string;
  distrito: string;
  finca: string;
  identifica: string;
  plano: string;
  shape_area: number;
}

export type ParcelFeature = Feature<Polygon | MultiPolygon, ParcelProperties>;

export function parcelQueryUrl(lng: number, lat: number): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: 'catastro',
    QUERY_LAYERS: 'catastro',
    STYLES: '',
    SRS: 'EPSG:4326',
    BBOX: [lng - HALF_DEG, lat - HALF_DEG, lng + HALF_DEG, lat + HALF_DEG].join(','),
    WIDTH: '101',
    HEIGHT: '101',
    X: '50',
    Y: '50',
    INFO_FORMAT: 'application/json',
    // SIRI also returns neighbors within a few pixels, in no useful order.
    FEATURE_COUNT: '10',
  });
  return `${SIRI_WMS}?${params}`;
}

/** The parcel that contains the point, or the first one if the point sits on a boundary. */
export function pickParcel(
  data: FeatureCollection,
  lng: number,
  lat: number,
): ParcelFeature | null {
  const parcels = data.features.filter(
    (f): f is Feature<Polygon | MultiPolygon> =>
      f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
  );
  const chosen = parcels.find((f) => geometryContains(f.geometry, lng, lat)) ?? parcels[0];
  if (!chosen) return null;
  const properties = Object.fromEntries(
    FIELDS.map((key) => [key, chosen.properties?.[key] ?? null]),
  ) as unknown as ParcelProperties;
  return { type: 'Feature', geometry: chosen.geometry, properties };
}

export async function handleParcelRequest(
  request: Request,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const lng = Number(url.searchParams.get('lon'));
  const lat = Number(url.searchParams.get('lat'));
  const valid =
    url.searchParams.has('lon') &&
    url.searchParams.has('lat') &&
    lng >= CR_BOUNDS.west &&
    lng <= CR_BOUNDS.east &&
    lat >= CR_BOUNDS.south &&
    lat <= CR_BOUNDS.north;
  if (!valid) return json({ error: 'Coordenadas fuera de Costa Rica' }, 400);
  try {
    const response = await fetcher(parcelQueryUrl(lng, lat));
    if (!response.ok) throw new Error(`SIRI ${response.status}`);
    const parcel = pickParcel((await response.json()) as FeatureCollection, lng, lat);
    return json({ type: 'FeatureCollection', features: parcel ? [parcel] : [] }, 200, {
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    });
  } catch (error) {
    return json({ error: `SIRI no respondió: ${(error as Error).message}` }, 502);
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
