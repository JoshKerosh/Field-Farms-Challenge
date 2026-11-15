/**
 * Types of the real datasets extracted from the v10 prototype (see
 * scripts/extract-v10-datasets.mjs and context/DATA_SOURCES.md).
 * "Local" coordinates (x, y) are 100 m units in the prototype's
 * projection; they are converted from lat/lon with `llToLocal`.
 */

/** Flat polygon: [x0, y0, x1, y1, …]. */
export type Ring = number[];

/** Reference climate zone (one NASA POWER point per zone). */
export type RegionCode = 'N' | 'C' | 'S' | 'M' | 'U' | 'V';

export interface Cuenca {
  n: string;
  r: Ring[];
}

export interface Subcuenca {
  n: string;
  /** Slope: Caribbean or Pacific. */
  v: 'C' | 'P';
  ha: number;
  c: [number, number];
  r: Ring[];
  /** ASADA sources inside the subwatershed. */
  nf: number;
  /** Water connections served by those sources. */
  serv: number;
  cu?: number;
}

/** [watershed, subwatershed, land use capacity, flood-prone (0|1), canton, zone]. */
export type GridCell = [number, number, string, 0 | 1, number, RegionCode];

export interface Canton {
  n: string;
  /** Rainfall anomaly (%) [October 2026, January–October 2026]. */
  a: [number | null, number | null] | null;
}

/** [district ('' = whole canton), canton, province, x, y]. */
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

/** [x, y, operator, isSpring (0|1), name]. */
export type Fuente = [number, number, number, 0 | 1, string];
/** [operator name, connections]. */
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
  /** 2026 greenness (NDVI) by day of year (key '001'…'289'). */
  y26: Record<string, number>;
  /** 2012–2025 historical average for the last three dates. */
  clim: Record<string, { m: number; sd: number; n: number }>;
}

export interface Climate {
  NASA: NasaData;
  MODIS: Record<RegionCode, RegionModis>;
}

export interface FlucEntry {
  /** Type as text: Federación, Liga, Unión, Confederación. */
  k: string;
  n: string;
  /** AyA region or 'Nacional'. */
  r: string;
  a: number;
  u: string;
  st: string;
  kc: 'fed' | 'uni' | 'lig' | 'con' | 'tra';
  sc: string;
}

export interface FlucData {
  f: FlucEntry[];
  /** Normalized canton → AyA region. */
  c: Record<string, string>;
}

/** [x, y, type ('c' community | 'i' infrastructure), place, district, note]. */
export type HistoryEntry = [number, number, 'c' | 'i', string, string, string];

/** 1.5 km cell decoded from the IGN 1:5 000 layer + MODIS 1 km. */
export interface RipCell {
  key: string;
  /** Monthly NDVI greenness (Nov 2025–Oct 2026), null = no data (water/cloud). */
  ndvi: number | null;
  /** 0 no river · 1 with forest · 2 partial · 3 without forest. */
  bank: 0 | 1 | 2 | 3;
  /** NDVI change against 2016–2020. */
  d: number;
  /** Forest / pasture fraction on the riverbank (0–1) or null. */
  rF: number | null;
  rP: number | null;
  /** Kilometers of river in the cell. */
  km: number;
}

export interface Dataset {
  territory: Territory;
  sources: Sources;
  climate: Climate;
  fluc: FlucData;
  history: HistoryEntry[];
  /** Riparian grid: key "ci,cj" (3 km cells) → 8 encoded characters. */
  rip: Record<string, string>;
}
