import { booleanIntersects, booleanPointInPolygon, distance, point } from '@turf/turf';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { validarMeta, type ArchivoDatos, type UnidadIndicadores } from '@field-farms/domain';
import type { FarmSite } from '../../../app/context/FieldContext';
import { basinExplorer } from '../../../platform/geo/basin-explorer.adapter';
import { cargarIndicadores } from '../../../platform/data/data-files';
import { basinShares, areaShares } from '../../watersheds/analysis/parcel-analysis';

export interface HistoryRow {
  month: string;
  ndvi: number | null;
  rain: number | null;
  coverage: number;
  change: number | null;
}
export interface HistoryData {
  months: string[];
  basins: { id: string; rows: HistoryRow[] }[];
  tiles: { path: string; bounds: number[] }[];
}
interface Pixel {
  area?: number;
  lat: number;
  lon: number;
  ndvi: (number | null)[];
  rain: (number | null)[];
}
export interface RecoveryEnvironment {
  basins: { id: string; name: string }[];
  subbasins: { id: string; name: string }[];
  power: UnidadIndicadores | null;
  rainfall: UnidadIndicadores | null;
  history: ArchivoDatos<HistoryData> | null;
  surroundings: HistoryRow[];
  flood: boolean;
  protected: boolean;
}
async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
export function summarizePixels(pixels: Pixel[], months: string[]): HistoryRow[] {
  const weight = (p: Pixel) => p.area ?? 1;
  const total = pixels.reduce((sum, p) => sum + weight(p), 0);
  return months.map((month, i) => {
    const good = pixels.filter((p) => p.ndvi[i] !== null && Number.isFinite(p.ndvi[i]));
    const rain = pixels
      .map((p) => p.rain[i])
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const previous = months.indexOf(`${Number(month.slice(0, 4)) - 1}${month.slice(4)}`);
    const common =
      previous < 0
        ? []
        : good.filter((p) => p.ndvi[previous] !== null && Number.isFinite(p.ndvi[previous]));
    const validArea = good.reduce((sum, p) => sum + weight(p), 0);
    const commonArea = common.reduce((sum, p) => sum + weight(p), 0);
    const coverage = total ? validArea / total : 0;
    return {
      month,
      ndvi: validArea ? good.reduce((s, p) => s + p.ndvi[i]! * weight(p), 0) / validArea : null,
      rain:
        rain.length === pixels.length && rain.length
          ? rain.reduce((s, v) => s + v, 0) / rain.length
          : null,
      coverage,
      change:
        commonArea && commonArea / total >= 0.8
          ? common.reduce((s, p) => s + (p.ndvi[i]! - p.ndvi[previous]!) * weight(p), 0) /
            commonArea
          : null,
    };
  });
}
export async function recoveryEnvironment(site: FarmSite): Promise<RecoveryEnvironment> {
  const [basinResult, powerResult, historyResult, floodResult, protectedResult, rainfallResult] =
    await Promise.allSettled([
      basinExplorer.listBasins(),
      cargarIndicadores('power'),
      json<ArchivoDatos<HistoryData>>('/data/recovery/history.json'),
      json<FeatureCollection<Polygon | MultiPolygon>>('/data/geo/cne/inundacion.geojson'),
      json<FeatureCollection<Polygon | MultiPolygon>>('/data/geo/sinac/areas_protegidas.geojson'),
      cargarIndicadores('powerHistory'),
    ]);
  const basins =
    basinResult.status === 'fulfilled'
      ? site.parcel
        ? basinShares(site.parcel, basinResult.value.features).map((b) => ({
            id: String(b.basinNumber),
            name: b.name,
          }))
        : basinResult.value.features
            .filter((b) => booleanPointInPolygon([site.lng, site.lat], b))
            .map((b) => ({ id: String(b.properties.cuenca_no), name: b.properties.nombre }))
      : [];
  const power =
    powerResult.status === 'fulfilled' && !powerResult.value.meta.simulado
      ? ([...powerResult.value.datos.items]
          .filter((p) => p.lat !== undefined && p.lon !== undefined)
          .sort(
            (a, b) =>
              distance([site.lng, site.lat], [a.lon!, a.lat!]) -
              distance([site.lng, site.lat], [b.lon!, b.lat!]),
          )[0] ?? null)
      : null;
  const candidate = historyResult.status === 'fulfilled' ? historyResult.value : null;
  const history =
    candidate &&
    !validarMeta(candidate.meta).length &&
    !candidate.meta.simulado &&
    candidate.datos?.months?.length &&
    Array.isArray(candidate.datos.basins) &&
    Array.isArray(candidate.datos.tiles)
      ? candidate
      : null;
  let surroundings: HistoryRow[] = [];
  if (history) {
    const tiles = history.datos.tiles.filter(
      (t) =>
        site.lng >= t.bounds[0] - 0.06 &&
        site.lng <= t.bounds[2] + 0.06 &&
        site.lat >= t.bounds[1] - 0.05 &&
        site.lat <= t.bounds[3] + 0.05,
    );
    try {
      const files = await Promise.all(
        tiles.map((t) => json<ArchivoDatos<{ pixels: Pixel[] }>>(`/data/${t.path}`)),
      );
      if (files.some((f) => validarMeta(f.meta).length || f.meta.simulado))
        throw new Error('Invalid history');
      const pixels = files
        .flatMap((f) => f.datos.pixels)
        .filter((p) => distance([site.lng, site.lat], [p.lon, p.lat]) <= 5);
      surroundings = summarizePixels(pixels, history.datos.months);
    } catch {
      surroundings = [];
    }
  }
  const overlaps = (result: typeof floodResult) =>
    result.status === 'fulfilled' &&
    result.value.features.some((f) =>
      site.parcel
        ? booleanIntersects(site.parcel, f)
        : booleanPointInPolygon(point([site.lng, site.lat]), f),
    );
  const rainfall =
    rainfallResult.status === 'fulfilled' && !rainfallResult.value.meta.simulado
      ? ([...rainfallResult.value.datos.items]
          .filter((p) => p.lat !== undefined && p.lon !== undefined)
          .sort(
            (a, b) =>
              distance([site.lng, site.lat], [a.lon!, a.lat!]) -
              distance([site.lng, site.lat], [b.lon!, b.lat!]),
          )[0] ?? null)
      : null;
  const subFiles = await Promise.allSettled(
    basins.map((b) => basinExplorer.listSubbasins(Number(b.id))),
  );
  const subbasins = subFiles.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    const matches = site.parcel
      ? areaShares(site.parcel, result.value.features).map((s) => s.properties)
      : result.value.features
          .filter((f) => booleanPointInPolygon([site.lng, site.lat], f))
          .map((f) => f.properties);
    return matches.map((p) => ({
      id: String((p as typeof p & { id?: string }).id ?? basins[index].id + ':' + p.nombre),
      name: p.nombre,
    }));
  });
  return {
    basins,
    subbasins,
    power,
    rainfall,
    history,
    surroundings,
    flood: overlaps(floodResult),
    protected: overlaps(protectedResult),
  };
}
