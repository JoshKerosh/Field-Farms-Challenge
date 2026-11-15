/**
 * Tipos de los datasets reales extraídos del prototipo v10 (ver
 * scripts/extract-v10-datasets.mjs y context/FUENTES_DE_DATOS.md).
 * Las coordenadas "locales" (x, y) son unidades de 100 m en la proyección
 * del prototipo; se convierten desde lat/lon con `llToLocal`.
 */

/** Polígono plano: [x0, y0, x1, y1, …]. */
export type Ring = number[];

/** Zona climática de referencia (un punto NASA POWER por zona). */
export type RegionCode = 'N' | 'C' | 'S' | 'M' | 'U' | 'V';

export interface Cuenca {
  n: string;
  r: Ring[];
}

export interface Subcuenca {
  n: string;
  /** Vertiente: Caribe o Pacífico. */
  v: 'C' | 'P';
  ha: number;
  c: [number, number];
  r: Ring[];
  /** Fuentes de ASADAS dentro de la subcuenca. */
  nf: number;
  /** Conexiones de agua servidas por esas fuentes. */
  serv: number;
  cu?: number;
}

/** [cuenca, subcuenca, capacidad de uso, inundable (0|1), cantón, zona]. */
export type GridCell = [number, number, string, 0 | 1, number, RegionCode];

export interface Canton {
  n: string;
  /** Anomalía de lluvia (%) [octubre 2026, enero–octubre 2026]. */
  a: [number | null, number | null] | null;
}

/** [distrito ('' = cantón completo), cantón, provincia, x, y]. */
export type PlaceEntry = [string, string, string, number, number];

export interface Territory {
  W: number;
  H: number;
  step: number;
  bx: number[];
  by: number[];
  cuNames: string[];
  cuencas: Cuenca[];
  subs: Subcuenca[];
  cantons: Canton[];
  places: PlaceEntry[];
  grid: Record<string, GridCell>;
}

/** [x, y, operador, esNaciente (0|1), nombre]. */
export type Fuente = [number, number, number, 0 | 1, string];
/** [nombre del ente operador, conexiones]. */
export type Operator = [string, number];

export interface Sources {
  fuentes: Fuente[];
  ops: Operator[];
}

export type YearKey = 'y9798' | 'y1516' | 'y2324' | 'y1011';

export interface RegionClimate {
  clim: { rain: number[]; et: number[]; tmax: number[]; gw: number[] };
  yrs: Record<YearKey, { f: number[]; e: number[] }>;
  y2026: {
    last: string;
    monthAnom: (number | null)[];
    ytdAnom: number;
    rain30: number;
    rain30Anom: number;
    tmax30: number;
    tmax30Anom: number;
    hotDays30: number;
    gw30: number;
    gw30Anom: number;
  };
}

export interface OniData {
  indice: string;
  actual: number;
  temporada: string;
  serie2026: [string, number][];
  picos: Record<YearKey, number>;
}

export type NasaData = Record<RegionCode, RegionClimate> & {
  ONI: OniData;
  puntos: Record<RegionCode, [number, number]>;
  fuente: string;
};

export interface RegionModis {
  /** Verdor (NDVI) 2026 por día del año (clave '001'…'289'). */
  y26: Record<string, number>;
  /** Promedio histórico 2012–2025 para las tres últimas fechas. */
  clim: Record<string, { m: number; sd: number; n: number }>;
}

export interface Climate {
  NASA: NasaData;
  MODIS: Record<RegionCode, RegionModis>;
}

export interface FlucEntry {
  /** Tipo en texto: Federación, Liga, Unión, Confederación. */
  k: string;
  n: string;
  /** Región AyA o 'Nacional'. */
  r: string;
  a: number;
  u: string;
  st: string;
  kc: 'fed' | 'uni' | 'lig' | 'con' | 'tra';
  sc: string;
}

export interface FlucData {
  f: FlucEntry[];
  /** Cantón normalizado → región AyA. */
  c: Record<string, string>;
}

/** [x, y, tipo ('c' comunidad | 'i' infraestructura), lugar, distrito, nota]. */
export type HistoryEntry = [number, number, 'c' | 'i', string, string, string];

/** Celda de 1,5 km decodificada de la capa IGN 1:5 000 + MODIS 1 km. */
export interface RipCell {
  key: string;
  /** Verdor NDVI mensual (nov 2025–oct 2026), null = sin dato (agua/nube). */
  ndvi: number | null;
  /** 0 sin río · 1 con bosque · 2 a medias · 3 sin bosque. */
  bank: 0 | 1 | 2 | 3;
  /** Cambio de NDVI frente a 2016–2020. */
  d: number;
  /** Fracción de bosque / potrero en la orilla (0–1) o null. */
  rF: number | null;
  rP: number | null;
  /** Kilómetros de río en la celda. */
  km: number;
}

export interface Dataset {
  territory: Territory;
  sources: Sources;
  climate: Climate;
  fluc: FlucData;
  history: HistoryEntry[];
  /** Cuadrícula riparia: clave "ci,cj" (celdas de 3 km) → 8 caracteres codificados. */
  rip: Record<string, string>;
}
