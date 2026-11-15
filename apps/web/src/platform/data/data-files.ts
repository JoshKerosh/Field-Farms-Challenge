import {
  validarArchivoIndicadores,
  type ArchivoIndicadores,
  type CatalogoFuentes,
  type Fuente,
  type Indicador,
  type UnidadIndicadores,
} from '@field-farms/domain';

/**
 * Reading of the files in `public/data/` (see docs/data.md). Each file is downloaded once
 * per session; the service worker stores it for offline use.
 */
const DATA = '/data';

/** Paths of the indicator files. The `ejemplos/` files are simulated until the connector exists. */
export const ARCHIVOS = {
  power: 'nasa/power/latest.json',
  powerHistory: 'recovery/rainfall.json',
  modis: 'nasa/modis/latest.json',
  roni: 'noaa/roni/latest.json',
  imerg: 'ejemplos/imerg.json',
  smap: 'ejemplos/smap.json',
  indicadoresSubcuenca: 'ejemplos/indicadores-subcuenca.json',
} as const;

export type ArchivoConocido = keyof typeof ARCHIVOS;

const cache = new Map<string, Promise<unknown>>();

async function getJson<T>(path: string, refresh = false): Promise<T> {
  if (refresh) cache.delete(path);
  if (!cache.has(path)) {
    const promise = fetch(`${DATA}/${path}`, { cache: 'no-cache' }).then(async (response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return (await response.json()) as T;
    });
    // A failed download is retried next time.
    promise.catch(() => cache.delete(path));
    cache.set(path, promise);
  }
  return cache.get(path) as Promise<T>;
}

/** Downloads and validates an indicator file. A malformed file fails with its errors. */
export async function cargarIndicadores(
  archivo: ArchivoConocido,
  refresh = false,
): Promise<ArchivoIndicadores> {
  const path = ARCHIVOS[archivo];
  const json = await getJson<unknown>(path, refresh);
  const errores = validarArchivoIndicadores(json);
  if (errores.length) throw new Error(`${path}: ${errores.slice(0, 3).join('; ')}`);
  return json as ArchivoIndicadores;
}

export const cargarFuentes = (refresh = false): Promise<CatalogoFuentes> =>
  getJson<CatalogoFuentes>('fuentes.json', refresh);

export async function fuente(id: string): Promise<Fuente | undefined> {
  return (await cargarFuentes()).fuentes.find((f) => f.id === id);
}

/** Finds the unit (zone, subwatershed…) by id. */
export function unidad(archivo: ArchivoIndicadores, id: string): UnidadIndicadores | undefined {
  return archivo.datos.items.find((item) => item.id === id);
}

/** Finds an indicator by id inside a unit. */
export function indicador(item: UnidadIndicadores | undefined, id: string): Indicador | undefined {
  return item?.indicadores.find((i) => i.id === id);
}
