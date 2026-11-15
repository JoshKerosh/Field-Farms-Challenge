import {
  validarArchivoIndicadores,
  type ArchivoIndicadores,
  type CatalogoFuentes,
  type Fuente,
  type Indicador,
  type UnidadIndicadores,
} from '@field-farms/domain';

/**
 * Lectura de los archivos de `public/data/` (ver docs/datos.md). Cada archivo se descarga una vez
 * por sesión; el service worker lo guarda para usarlo sin conexión.
 */
const DATA = '/data';

/** Rutas de los archivos de indicadores. Los `ejemplos/` son simulados hasta tener el conector. */
export const ARCHIVOS = {
  power: 'nasa/power/latest.json',
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
    // Una descarga fallida se reintenta la próxima vez.
    promise.catch(() => cache.delete(path));
    cache.set(path, promise);
  }
  return cache.get(path) as Promise<T>;
}

/** Descarga y valida un archivo de indicadores. Un archivo mal formado falla con sus errores. */
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

/** Busca la unidad (zona, subcuenca…) por id. */
export function unidad(archivo: ArchivoIndicadores, id: string): UnidadIndicadores | undefined {
  return archivo.datos.items.find((item) => item.id === id);
}

/** Busca un indicador por id dentro de una unidad. */
export function indicador(item: UnidadIndicadores | undefined, id: string): Indicador | undefined {
  return item?.indicadores.find((i) => i.id === id);
}
