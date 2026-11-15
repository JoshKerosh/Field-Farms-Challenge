/**
 * Contrato de los archivos de datos publicados en `apps/web/public/data/`.
 *
 * Todo dato que la app muestra sale de un archivo con este formato. Lo escriben los
 * procesos de `jobs/data-pipeline` (Python) y lo leen las pantallas. Formato completo en
 * `docs/datos.md`; esquema JSON en `apps/web/public/data/esquemas/archivo-indicadores.schema.json`.
 */

/** Capa NASA (global, se replica en otro país sin cambios) o capa local (Costa Rica). N-10. */
export type CapaDato = 'nasa' | 'local';

/**
 * Estado de un indicador para el semáforo. Los conectores publican `sin_evaluar`: los umbrales
 * (con fuente citada) los aplican las alertas y Estado finca, no el conector.
 */
export type EstadoIndicador = 'bien' | 'atencion' | 'urgente' | 'sin_evaluar' | 'sin_dato';

export const ESTADOS_INDICADOR: readonly EstadoIndicador[] = [
  'bien',
  'atencion',
  'urgente',
  'sin_evaluar',
  'sin_dato',
];

/** Encabezado obligatorio de todo archivo JSON de datos (N-06, X-03, X-04). */
export interface MetaArchivo {
  /** Identificador de la fuente en `fuentes.json`. */
  fuente: string;
  /** Dirección exacta de la que se obtuvo el dato (API, archivo o servicio). */
  url: string;
  capa: CapaDato;
  /** `true` solo en archivos de ejemplo o capas de demostración. */
  simulado: boolean;
  /** Fecha del dato más reciente (AAAA-MM-DD), no la de la descarga. */
  fecha_dato: string;
  /** Momento de la descarga o del cálculo (ISO 8601, UTC). */
  fecha_carga: string;
  /** Versión del formato del archivo. Sube cuando cambia la forma de `datos`. */
  version: number;
  /** Nota opcional: método, limitaciones o por qué es simulado. */
  nota?: string;
}

export interface ArchivoDatos<T> {
  meta: MetaArchivo;
  datos: T;
}

/** Un número que se muestra en la app, siempre con su fuente y su fecha. */
export interface Indicador {
  /** Identificador estable, p. ej. `lluvia_30d`. */
  id: string;
  nombre: string;
  /** `null` cuando la fuente no tiene dato para esa fecha. */
  valor: number | null;
  unidad: string;
  estado: EstadoIndicador;
  /** Identificador en `fuentes.json`. */
  fuente: string;
  /** Fecha del dato (AAAA-MM-DD). */
  fecha: string;
  simulado: boolean;
  capa: CapaDato;
}

/** Punto de una serie de tiempo: fecha y valores por parámetro. */
export interface PuntoSerie {
  fecha: string;
  valores: Record<string, number | null>;
}

/** Zona de referencia, subcuenca, cuadro o el país completo. */
export type TipoUnidad = 'zona' | 'subcuenca' | 'cuadro' | 'pais';

export interface UnidadIndicadores {
  id: string;
  nombre: string;
  lat?: number;
  lon?: number;
  indicadores: Indicador[];
  serie?: PuntoSerie[];
}

/** Forma de `datos` en todos los archivos de indicadores (NASA, NOAA, subcuencas). */
export interface DatosIndicadores {
  unidad: TipoUnidad;
  items: UnidadIndicadores[];
}

export type ArchivoIndicadores = ArchivoDatos<DatosIndicadores>;

/** Estado de una fuente en el catálogo. `estatico`: archivo entregado una vez, sin conector. */
export type EstadoFuente = 'ok' | 'falla' | 'estatico' | 'simulado';

/** Entrada de `fuentes.json` (reemplaza la tabla `fuentes_datos`). */
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
  /** Fecha del último dato bueno (AAAA-MM-DD) o `null` si nunca hubo uno. */
  ultima_carga_buena: string | null;
  /** Último error del conector; se borra cuando vuelve a funcionar. */
  ultimo_error?: string | null;
  /** Archivos de `public/data/` que publica esta fuente (rutas relativas, admite `*`). */
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

/** Devuelve los errores del encabezado; lista vacía si es válido. */
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

/** Valida un archivo de indicadores completo, incluida la coherencia con su encabezado. */
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
      // Un indicador no puede decir que es real si el archivo es simulado, ni al revés.
      if (esObjeto(ind) && ind.simulado !== meta.simulado)
        errores.push(`${donde}.simulado no coincide con meta.simulado`);
    });
  });
  return errores;
}
