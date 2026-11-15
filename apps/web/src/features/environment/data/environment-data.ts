import type { ArchivoIndicadores, Indicador, UnidadIndicadores } from '@field-farms/domain';
import { cargarIndicadores } from '../../../platform/data/data-files';
import type { RegionCode } from '../../../data/real/types';

export const ENVIRONMENT_SOURCES = {
  power: { id: 'nasa-power', name: 'NASA POWER', host: 'nasa.gov' },
  modis: { id: 'nasa-modis', name: 'NASA MODIS / ORNL', host: 'ornl.gov' },
  roni: { id: 'noaa-roni', name: 'NOAA RONI', host: 'noaa.gov' },
} as const;

export type EnvironmentSource = keyof typeof ENVIRONMENT_SOURCES;
export type SourceResult =
  { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; file: ArchivoIndicadores };

export function validObservationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateRealSource(file: ArchivoIndicadores, source: EnvironmentSource): void {
  const expected = ENVIRONMENT_SOURCES[source];
  const hostname = new URL(file.meta.url).hostname;
  if (
    file.meta.simulado ||
    file.meta.capa !== 'nasa' ||
    file.meta.fuente !== expected.id ||
    file.meta.version !== 1 ||
    !validObservationDate(file.meta.fecha_dato) ||
    !/^\d{4}-\d{2}-\d{2}T/.test(file.meta.fecha_carga) ||
    !validObservationDate(file.meta.fecha_carga.slice(0, 10)) ||
    file.meta.fecha_dato > file.meta.fecha_carga.slice(0, 10) ||
    !(hostname === expected.host || hostname.endsWith(`.${expected.host}`)) ||
    file.datos.unidad !== (source === 'roni' ? 'pais' : 'zona')
  )
    throw new Error('Invalid real environmental source');
  const ids = new Set<string>();
  for (const item of file.datos.items) {
    if (ids.has(item.id) || typeof item.nombre !== 'string') throw new Error('Invalid data unit');
    ids.add(item.id);
    if (
      source !== 'roni' &&
      (!Number.isFinite(item.lat) ||
        !Number.isFinite(item.lon) ||
        Math.abs(item.lat!) > 90 ||
        Math.abs(item.lon!) > 180)
    )
      throw new Error('Missing reference coordinates');
    const indicatorIds = new Set<string>();
    for (const indicator of item.indicadores) {
      if (
        indicator.simulado ||
        indicator.fuente !== expected.id ||
        indicator.capa !== 'nasa' ||
        !validObservationDate(indicator.fecha) ||
        indicator.fecha > file.meta.fecha_dato ||
        indicatorIds.has(indicator.id)
      )
        throw new Error('Invalid real indicator');
      indicatorIds.add(indicator.id);
    }
    if (item.serie !== undefined && !Array.isArray(item.serie)) throw new Error('Invalid series');
    const dates = new Set<string>();
    for (const point of item.serie ?? []) {
      if (
        !point ||
        !validObservationDate(point.fecha) ||
        dates.has(point.fecha) ||
        point.fecha > file.meta.fecha_dato ||
        !point.valores ||
        typeof point.valores !== 'object' ||
        Array.isArray(point.valores) ||
        Object.values(point.valores).some(
          (value) => value !== null && (typeof value !== 'number' || !Number.isFinite(value)),
        )
      )
        throw new Error('Invalid observation series');
      dates.add(point.fecha);
    }
  }
}

export async function loadEnvironmentSource(source: EnvironmentSource, refresh = false) {
  const file = await cargarIndicadores(source, refresh);
  validateRealSource(file, source);
  return file;
}

export function referenceUnit(file: ArchivoIndicadores, region: RegionCode | null) {
  return file.datos.items.find(
    (item) => item.id === (file.meta.fuente === 'noaa-roni' ? 'nino34' : region),
  );
}

export function observation(
  unit: UnidadIndicadores | undefined,
  id: string,
): Indicador | undefined {
  return unit?.indicadores.find((indicator) => indicator.id === id);
}

export function referenceDistance(
  farm: { lat: number; lng: number },
  unit: UnidadIndicadores | undefined,
): number | null {
  if (unit?.lat === undefined || unit.lon === undefined) return null;
  const radians = Math.PI / 180;
  const deltaLat = (unit.lat - farm.lat) * radians;
  const deltaLon = (unit.lon - farm.lng) * radians;
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(farm.lat * radians) * Math.cos(unit.lat * radians) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function observationAge(value: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(`${value}T00:00:00Z`)) / 86400000));
}
