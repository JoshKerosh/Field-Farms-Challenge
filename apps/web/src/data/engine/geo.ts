import type { Cuenca, Dataset, Fuente, GridCell, RegionCode, RipCell, Subcuenca, Canton } from '../real/types';

export interface Loc {
  x: number;
  y: number;
}

export interface SubGeo {
  box: { vx: number; vy: number; w: number; h: number; BW: number; BH: number };
  /** Path SVG del contorno. */
  d: string;
  /** viewBox SVG ('x y w h'). */
  vb: string;
  toPx: (x: number, y: number) => { x: number; y: number };
  /** Índices en `sources.fuentes` dentro de la subcuenca. */
  srcs: number[];
  /** 40 fincas de ejemplo (semilla fija) — SIMULADAS. */
  farms: { x: number; y: number; dkm: number }[];
  pxPerUnit: number;
}

export interface SatTile {
  x: number;
  y: number;
  lx: number;
  ly: number;
  /** Clase de capacidad de uso (I…VIII, AP). */
  cl: string;
  flR: boolean;
  adj: number;
  /** Patrón ilustrativo (no es un dato medido). */
  n: number;
  fl: boolean;
}

export type SourceKind = 'n' | 'p' | 's' | 'o';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function ringPath(flat: number[]): string {
  let s = '';
  for (let i = 0; i < flat.length; i += 2) s += `${i ? 'L' : 'M'}${flat[i]},${flat[i + 1]}`;
  return `${s}Z`;
}

export function inRing(x: number, y: number, f: number[]): boolean {
  let ins = false;
  for (let i = 0, j = f.length - 2; i < f.length; j = i, i += 2) {
    const xi = f[i];
    const yi = f[i + 1];
    const xj = f[j];
    const yj = f[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

/** Clase de uso del suelo sin sufijo de limitaciones ('VIIs13c12' → 'VII'). */
export function classOf(cls: string | undefined): string {
  const m = String(cls || '').match(/^(AP|VIII|VII|VI|V|IV|III|II|I)/);
  return m ? m[1] : '';
}

export class Geo {
  private cache = new Map<string, unknown>();
  constructor(readonly ds: Dataset) {}

  private memo<T>(key: string, make: () => T): T {
    if (!this.cache.has(key)) this.cache.set(key, make());
    return this.cache.get(key) as T;
  }

  /** Latitud/longitud → coordenadas locales (polinomio de segundo grado del prototipo). */
  llToLocal(lat: number, lon: number): Loc {
    const { bx, by } = this.ds.territory;
    const t = [1, lon, lat, lon * lon, lat * lat, lon * lat];
    return {
      x: t.reduce((a, v, i) => a + v * bx[i], 0),
      y: t.reduce((a, v, i) => a + v * by[i], 0),
    };
  }

  /** Celda de 3 km más cercana (busca hasta 3 celdas alrededor). */
  cellAt(loc: Loc): GridCell | null {
    const { grid, step } = this.ds.territory;
    const ix = Math.floor(loc.x / step);
    const iy = Math.floor(loc.y / step);
    for (let r = 0; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const c = grid[`${ix + dx},${iy + dy}`];
          if (c) return c;
        }
      }
    }
    return null;
  }

  /** Orillas (IGN 1:5 000) y verdor (MODIS 1 km) en la celda de 1,5 km. */
  ripAt(x: number, y: number): RipCell | null {
    const ci = Math.floor(x / 30);
    const cj = Math.floor(y / 30);
    const s = this.ds.rip[`${ci},${cj}`];
    if (!s) return null;
    const sx = Math.min(1, Math.max(0, Math.floor((x - ci * 30) / 15)));
    const sy = Math.min(1, Math.max(0, Math.floor((y - cj * 30) / 15)));
    const dec = (ch: string) => {
      if (ch === '~') return { n: null as number | null, b: 0 };
      const v = A.indexOf(ch);
      return { n: v >> 2 ? (v >> 2) / 15 : null, b: v & 3 };
    };
    const subs = [0, 1, 2, 3].map((k) => dec(s[k]));
    const me = subs[sy * 2 + sx];
    const nb = subs.filter((o) => o.b > 0).length;
    const ix = (c: string) => A.indexOf(c);
    return {
      key: `${ci},${cj},${sx},${sy}`,
      ndvi: me.n,
      bank: me.b as RipCell['bank'],
      d: (ix(s[4]) - 32) / 100,
      rF: s[5] === '-' ? null : ix(s[5]) / 63,
      rP: s[6] === '-' ? null : ix(s[6]) / 63,
      km: nb ? ix(s[7]) / nb : 0,
    };
  }

  /** Paths SVG de todas las cuencas del país. */
  allPath(): string {
    return this.memo('all', () =>
      this.ds.territory.cuencas.map((c) => c.r.map(ringPath).join('')).join(''),
    );
  }

  allSubsPath(): string {
    return this.memo('subsAll', () =>
      this.ds.territory.subs.map((s) => ringPath(s.r[0])).join(''),
    );
  }

  cuencaPath(cu: Cuenca | undefined): string {
    return cu ? cu.r.map(ringPath).join('') : '';
  }

  /** Geometría de la subcuenca ajustada a un lienzo de 326×230. */
  subGeo(id: number): SubGeo {
    return this.memo(`sub${id}`, () => {
      const { subs } = this.ds.territory;
      const { fuentes } = this.ds.sources;
      const sb = subs[id];
      const f = sb.r[0];
      let x0 = 1e9;
      let y0 = 1e9;
      let x1 = -1e9;
      let y1 = -1e9;
      for (let i = 0; i < f.length; i += 2) {
        x0 = Math.min(x0, f[i]);
        x1 = Math.max(x1, f[i]);
        y0 = Math.min(y0, f[i + 1]);
        y1 = Math.max(y1, f[i + 1]);
      }
      const BW = 326;
      const BH = 230;
      const pad = 0.06;
      let w = (x1 - x0) * (1 + 2 * pad);
      let h = (y1 - y0) * (1 + 2 * pad);
      if (w / h > BW / BH) h = (w * BH) / BW;
      else w = (h * BW) / BH;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const vx = cx - w / 2;
      const vy = cy - h / 2;
      const toPx = (x: number, y: number) => ({
        x: Math.round(((x - vx) / w) * BW * 10) / 10,
        y: Math.round(((y - vy) / h) * BH * 10) / 10,
      });
      const srcs: number[] = [];
      fuentes.forEach((fu, i) => {
        if (fu[0] < x0 || fu[0] > x1 || fu[1] < y0 || fu[1] > y1) return;
        if (inRing(fu[0], fu[1], f)) srcs.push(i);
      });
      // 40 fincas de ejemplo dentro de la subcuenca (semilla fija) — SIMULADAS.
      let seed = id * 9301 + 49297;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const farms: SubGeo['farms'] = [];
      let tries = 0;
      while (farms.length < 40 && tries < 6000) {
        tries++;
        const x = x0 + rnd() * (x1 - x0);
        const y = y0 + rnd() * (y1 - y0);
        if (!inRing(x, y, f)) continue;
        let dmin = 1e9;
        srcs.forEach((i) => {
          dmin = Math.min(dmin, Math.hypot(fuentes[i][0] - x, fuentes[i][1] - y));
        });
        farms.push({ x, y, dkm: dmin / 10 });
      }
      return {
        box: { vx, vy, w, h, BW, BH },
        d: ringPath(f),
        vb: `${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`,
        toPx,
        srcs,
        farms,
        pxPerUnit: BW / w,
      };
    });
  }

  /** Cuadrícula de 9 px dentro de la subcuenca con clase de suelo e inundación. */
  satBase(id: number): SatTile[] {
    return this.memo(`sat${id}`, () => {
      const sb = this.ds.territory.subs[id];
      const f = sb.r[0];
      const b = this.subGeo(id).box;
      const T = 9;
      const out: SatTile[] = [];
      const ph = ((id * 37) % 100) / 15;
      for (let py = T / 2; py < b.BH; py += T) {
        for (let px = T / 2; px < b.BW; px += T) {
          const x = b.vx + (px / b.BW) * b.w;
          const y = b.vy + (py / b.BH) * b.h;
          if (!inRing(x, y, f)) continue;
          const c = this.cellAt({ x, y });
          const rm = classOf(c ? String(c[2]) : '');
          const adj =
            rm === 'AP' || rm === 'VII' || rm === 'VIII'
              ? 0.07
              : rm === 'I' || rm === 'II' || rm === 'III'
                ? -0.05
                : 0;
          const n =
            0.5 * Math.sin(px / 23 + ph) * Math.cos(py / 19 - ph) +
            0.3 * Math.sin((px + py) / 11 + ph * 2) +
            0.2 * Math.sin(px * 0.9 + py * 1.3);
          out.push({
            x: px - T / 2,
            y: py - T / 2,
            lx: x,
            ly: y,
            cl: rm,
            flR: !!(c && c[3] === 1),
            adj,
            n,
            fl: !!(c && c[3] === 1) || n < -0.55,
          });
        }
      }
      return out;
    });
  }

  nearestFuente(loc: Loc): { i: number; km: number } {
    let best = -1;
    let bd = 1e9;
    this.ds.sources.fuentes.forEach((fu, i) => {
      const d = Math.hypot(fu[0] - loc.x, fu[1] - loc.y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return { i: best, km: bd / 10 };
  }

  /** Clasifica cada fuente: naciente, pozo, superficial u otra. */
  sourceKinds(): { kinds: SourceKind[]; pctSub: number } {
    return this.memo('kinds', () => {
      const kind = (q: Fuente): SourceKind => {
        const nm = String(q[4] || '').toUpperCase();
        if (q[3] || /NACIENTE|^N[-°º ]?\s?\d/.test(nm)) return 'n';
        if (/POZO|^P[-_ ]?\d|_P\d/.test(nm)) return 'p';
        if (/QUEBRADA|R[IÍ]O|TOMA|SUPERF|EMBALSE|LAGO|CAPTACI/.test(nm)) return 's';
        return 'o';
      };
      const kinds = this.ds.sources.fuentes.map(kind);
      const sub = kinds.filter((k) => k === 'n' || k === 'p').length;
      return { kinds, pctSub: Math.round((100 * sub) / Math.max(1, kinds.length)) };
    });
  }

  /** Conexiones y ASADAS por cuenca; reportes de sequía 2014–15 por cuenca. */
  cuencaConnections(): {
    byCuenca: Record<number, Record<number, number>>;
    hist: Record<number, number[]>;
  } {
    return this.memo('cuConn', () => {
      const { subs } = this.ds.territory;
      const { fuentes, ops } = this.ds.sources;
      const cuOf = (cl: GridCell) =>
        subs[cl[1]] && subs[cl[1]].cu !== undefined ? (subs[cl[1]].cu as number) : cl[0];
      const byCuenca: Record<number, Record<number, number>> = {};
      fuentes.forEach((q) => {
        const cl = this.cellAt({ x: q[0], y: q[1] });
        if (!cl) return;
        const k = cuOf(cl);
        (byCuenca[k] ??= {})[q[2]] = (ops[q[2]] || ['', 0])[1];
      });
      const hist: Record<number, number[]> = {};
      this.ds.history.forEach((h, i) => {
        const cl = this.cellAt({ x: h[0], y: h[1] });
        if (cl) (hist[cuOf(cl)] ??= []).push(i);
      });
      return { byCuenca, hist };
    });
  }
}

const instances = new WeakMap<Dataset, Geo>();
export function getGeo(ds: Dataset): Geo {
  let g = instances.get(ds);
  if (!g) {
    g = new Geo(ds);
    instances.set(ds, g);
  }
  return g;
}

/** Contexto del lugar seleccionado. */
export interface PlaceContext {
  loc: Loc;
  cell: GridCell;
  /** Cuenca de la celda (la que se muestra). */
  cuenca: Cuenca | undefined;
  /** Índice de la cuenca a la que pertenece la subcuenca elegida. */
  cuIdx: number;
  subId: number;
  sub: Subcuenca;
  canton: Canton;
  reg: RegionCode;
  clsRaw: string;
  clase: string;
  flood: boolean;
  caribe: boolean;
  geo: SubGeo;
}

export function placeAt(ds: Dataset, loc: Loc, subId: number | null): PlaceContext | null {
  const g = getGeo(ds);
  const cell = g.cellAt(loc);
  if (!cell) return null;
  const id = subId === null ? cell[1] : subId;
  const sub = ds.territory.subs[id];
  if (!sub) return null;
  return {
    loc,
    cell,
    cuenca: ds.territory.cuencas[cell[0]],
    cuIdx: sub.cu !== undefined ? sub.cu : cell[0],
    subId: id,
    sub,
    canton: ds.territory.cantons[cell[4]] ?? { n: 'sin dato', a: null },
    reg: cell[5],
    clsRaw: String(cell[2]),
    clase: classOf(cell[2]),
    flood: cell[3] === 1,
    caribe: sub.v === 'C',
    geo: g.subGeo(id),
  };
}
