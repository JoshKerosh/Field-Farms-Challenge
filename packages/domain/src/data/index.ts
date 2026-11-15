/**
 * Contract of the data files published in `apps/web/public/data/`.
 *
 * Every piece of data the app shows comes from a file in this format. The jobs in
 * `jobs/data-pipeline` (Python) write it and the screens read it. Full format in
 * `docs/data.md`; JSON schema in `apps/web/public/data/esquemas/archivo-indicadores.schema.json`.
 */

/** NASA layer (global, replicable in another country unchanged) or local layer (Costa Rica). N-10. */
export type CapaDato = 'nasa' | 'local';

/**
 * Traffic-light status of an indicator. Connectors publish `sin_evaluar` (not evaluated): the
 * thresholds (with a cited source) are applied by alerts and Farm status, not by the connector.
 */
export type EstadoIndicador = 'bien' | 'atencion' | 'urgente' | 'sin_evaluar' | 'sin_dato';

export const ESTADOS_INDICADOR: readonly EstadoIndicador[] = [
  'bien',
  'atencion',
  'urgente',
  'sin_evaluar',
  'sin_dato',
];

/** Required header of every JSON data file (N-06, X-03, X-04). */
export interface MetaArchivo {
  /** Source identifier in `fuentes.json`. */
  fuente: string;
  /** Exact address the data came from (API, file or service). */
  url: string;
  capa: CapaDato;
  /** `true` only in example files or demo layers. */
  simulado: boolean;
  /** Date of the most recent data (YYYY-MM-DD), not of the download. */
  fecha_dato: string;
  /** Time of the download or calculation (ISO 8601, UTC). */
  fecha_carga: string;
  /** File format version. Bumped when the shape of `datos` changes. */
  version: number;
  /** Optional note: method, limitations or why it is simulated. */
  nota?: string;
}

export interface ArchivoDatos<T> {
  meta: MetaArchivo;
  datos: T;
}

/** A number shown in the app, always with its source and date. */
export interface Indicador {
  /** Stable identifier, e.g. `lluvia_30d`. */
  id: string;
  nombre: string;
  /** `null` when the source has no data for that date. */
  valor: number | null;
  unidad: string;
  estado: EstadoIndicador;
  /** Identifier in `fuentes.json`. */
  fuente: string;
  /** Date of the data (YYYY-MM-DD). */
  fecha: string;
  simulado: boolean;
  capa: CapaDato;
}

/** Point of a time series: date and values per parameter. */
export interface PuntoSerie {
  fecha: string;
  valores: Record<string, number | null>;
}

/** Reference zone, subwatershed, grid cell or the whole country. */
export type TipoUnidad = 'zona' | 'subcuenca' | 'cuadro' | 'pais';

export interface UnidadIndicadores {
  id: string;
  nombre: string;
  lat?: number;
  lon?: number;
  indicadores: Indicador[];
  serie?: PuntoSerie[];
}

/** Shape of `datos` in every indicator file (NASA, NOAA, subwatersheds). */
export interface DatosIndicadores {
  unidad: TipoUnidad;
  items: UnidadIndicadores[];
}

export type ArchivoIndicadores = ArchivoDatos<DatosIndicadores>;

/** Status of a source in the catalog. `estatico`: file delivered once, with no connector. */
export type EstadoFuente = 'ok' | 'falla' | 'estatico' | 'simulado';

/** Entry of `fuentes.json` (replaces the `fuentes_datos` table). */
export interface Fuente {
  id: string;
  titulo: string;
  institucion: string;
  tipo_servicio: 'api' | 'archivo' | 'wms' | 'wfs' | 'metodo';
  url: string;
  licencia: string;
  frecuencia: 'diaria' | 'quincenal' | 'mensual' | 'estatica';
  capa: CapaDato;
  simulado: boolean;
  estado: EstadoFuente;
  /** Date of the last good data (YYYY-MM-DD), or `null` if there never was one. */
  ultima_carga_buena: string | null;
  /** Last connector error; cleared when it works again. */
  ultimo_error?: string | null;
  /** Files in `public/data/` published by this source (relative paths, `*` allowed). */
  archivos: string[];
  nota?: string;
}

export interface CatalogoFuentes {
  actualizado: string;
  fuentes: Fuente[];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Returns the header errors; an empty list if it is valid. */
export function validarMeta(meta: unknown): string[] {
  if (!esObjeto(meta)) return ['falta "meta"'];
  const errores: string[] = [];
  const texto = (k: string) => {
    if (typeof meta[k] !== 'string' || meta[k] === '') errores.push(`meta.${k} debe ser texto`);
  };
  texto('fuente');
  texto('url');
  if (typeof meta.url === 'string' && !/^https?:\/\//.test(meta.url))
    errores.push('meta.url debe empezar con http(s)://');
  if (meta.capa !== 'nasa' && meta.capa !== 'local')
    errores.push('meta.capa debe ser nasa o local');
  if (typeof meta.simulado !== 'boolean') errores.push('meta.simulado debe ser true o false');
  if (typeof meta.fecha_dato !== 'string' || !FECHA.test(meta.fecha_dato))
    errores.push('meta.fecha_dato debe ser AAAA-MM-DD');
  if (typeof meta.fecha_carga !== 'string' || Number.isNaN(Date.parse(meta.fecha_carga)))
    errores.push('meta.fecha_carga debe ser una fecha ISO');
  if (!Number.isInteger(meta.version)) errores.push('meta.version debe ser un entero');
  return errores;
}

export function validarIndicador(ind: unknown, donde = 'indicador'): string[] {
  if (!esObjeto(ind)) return [`${donde} no es un objeto`];
  const errores: string[] = [];
  for (const k of ['id', 'nombre', 'unidad', 'fuente'])
    if (typeof ind[k] !== 'string') errores.push(`${donde}.${k} debe ser texto`);
  if (ind.valor !== null && (typeof ind.valor !== 'number' || !Number.isFinite(ind.valor)))
    errores.push(`${donde}.valor debe ser número o null`);
  if (!ESTADOS_INDICADOR.includes(ind.estado as EstadoIndicador))
    errores.push(`${donde}.estado no es válido`);
  if (typeof ind.fecha !== 'string' || !FECHA.test(ind.fecha))
    errores.push(`${donde}.fecha debe ser AAAA-MM-DD`);
  if (typeof ind.simulado !== 'boolean') errores.push(`${donde}.simulado debe ser true o false`);
  if (ind.capa !== 'nasa' && ind.capa !== 'local') errores.push(`${donde}.capa no es válida`);
  if (ind.valor === null && ind.estado !== 'sin_dato')
    errores.push(`${donde}: sin valor el estado debe ser sin_dato`);
  return errores;
}

/** Validates a whole indicator file, including consistency with its header. */
export function validarArchivoIndicadores(archivo: unknown): string[] {
  if (!esObjeto(archivo)) return ['el archivo no es un objeto'];
  const errores = validarMeta(archivo.meta);
  const datos = archivo.datos;
  if (!esObjeto(datos) || !Array.isArray(datos.items)) return [...errores, 'falta datos.items'];
  if (!['zona', 'subcuenca', 'cuadro', 'pais'].includes(datos.unidad as string))
    errores.push('datos.unidad no es válida');
  const meta = esObjeto(archivo.meta) ? archivo.meta : {};
  datos.items.forEach((item: unknown, i) => {
    if (!esObjeto(item) || typeof item.id !== 'string' || !Array.isArray(item.indicadores)) {
      errores.push(`items[${i}] necesita id e indicadores`);
      return;
    }
    item.indicadores.forEach((ind: unknown, j) => {
      const donde = `items[${i}].indicadores[${j}]`;
      errores.push(...validarIndicador(ind, donde));
      // An indicator can't claim to be real if the file is simulated, or the other way around.
      if (esObjeto(ind) && ind.simulado !== meta.simulado)
        errores.push(`${donde}.simulado no coincide con meta.simulado`);
    });
  });
  return errores;
}
