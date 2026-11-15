import type { Dataset } from '../real/types';
import { comma, MONTHS } from './format';
import type { PlaceContext } from './geo';
import type { WatershedPlan } from './watershed';

export type RecordType = 'caudal' | 'accion' | 'evento' | 'lluvia';

/** Registro de campo guardado en el dispositivo del usuario. */
export interface FieldRecord {
  id: string;
  t: RecordType;
  /** L/s (caudal), mm (lluvia) o texto (acción/evento). */
  v: number | string;
  /** Índice de la fuente en `sources.fuentes`. */
  src?: number;
  note?: string;
  /** Fecha AAAA-MM-DD. */
  d: string;
  /** El usuario decide si lo comparte con su ASADA. */
  share: boolean;
  /** Registro de ejemplo (SIMULADO). */
  demo?: boolean;
}

export const EVENT_TYPES = [
  'Naciente seca',
  'Bajó el caudal',
  'Agua turbia o contaminada',
  'Deslizamiento',
  'Inundación',
  'Incendio',
] as const;

export const RECORD_TYPES: { id: RecordType; ic: string; n: string; d: string }[] = [
  { id: 'caudal', ic: '💧', n: 'Caudal', d: 'Cuánta agua da la naciente' },
  { id: 'accion', ic: '🌳', n: 'Acción', d: 'Lo que hiciste en la finca' },
  { id: 'evento', ic: '⚠️', n: 'Evento', d: 'Sequía, contaminación…' },
  { id: 'lluvia', ic: '🌧', n: 'Lluvia', d: 'Lo que marcó tu pluviómetro' },
];

export type ViewRole = 'finquero' | 'asada' | 'inst';
export const VIEW_ROLES: { id: ViewRole; n: string }[] = [
  { id: 'finquero', n: '👩‍🌾 Finquero' },
  { id: 'asada', n: '🏠 ASADA' },
  { id: 'inst', n: '🏛 Institución' },
];

/** Caudal con balde y cronómetro: litros ÷ segundos. */
export function flowFromBucket(liters: string, seconds: string) {
  const l = Number(String(liters || '20').replace(',', '.'));
  const s = Number(String(seconds || '').replace(',', '.'));
  const lps = l > 0 && s > 0 ? l / s : 0;
  return {
    lps,
    valid: lps > 0,
    lpsText: lps ? lps.toFixed(2).replace('.', ',') : '—',
    lpdText: lps ? Math.round(lps * 86400).toLocaleString('es-CR') : '—',
  };
}

/** Registros de ejemplo (SIMULADOS) para ver cómo funciona la pantalla. */
export function demoRecords(srcIndex: number): FieldRecord[] {
  const V = [14, 20, 11, 9, 8];
  const rows: FieldRecord[] = V.map((q, k) => ({
    id: `demo-${k}`,
    t: 'caudal',
    v: q,
    src: srcIndex,
    d: `2026-${String(6 + k).padStart(2, '0')}-15`,
    share: true,
    demo: true,
  }));
  rows.push({ id: 'demo-a', t: 'accion', v: 'Corredor ribereño', d: '2026-09-02', share: true, demo: true });
  rows.push({ id: 'demo-e', t: 'evento', v: 'Bajó el caudal', src: srcIndex, d: '2026-10-20', share: true, demo: true });
  return rows.reverse();
}

const monthOf = (d: string) => Number(d.slice(5, 7)) - 1;

export function recordTitle(ds: Dataset, r: FieldRecord): string {
  const nm = (i: number | undefined) => (i === undefined ? '—' : (ds.sources.fuentes[i] || [0, 0, 0, 0, '—'])[4]);
  if (r.t === 'caudal') return `${comma(r.v)} L/s · ${nm(r.src)}`;
  if (r.t === 'lluvia') return `${comma(r.v)} mm de lluvia`;
  if (r.t === 'evento') return `${r.v} · ${nm(r.src)}`;
  return String(r.v);
}

export function recordDateText(r: FieldRecord): string {
  return `${r.d.slice(8, 10)} ${MONTHS[monthOf(r.d)]} ${r.d.slice(0, 4)}${r.share ? ' · compartido' : ' · solo en tu celular'}${r.demo ? ' · ejemplo' : ''}`;
}

/** Gráfico: barras de lluvia jun–nov 2026 (NASA POWER) y línea del caudal registrado. */
export function flowChart(ds: Dataset, ctx: PlaceContext, records: FieldRecord[]) {
  const TC = ds.climate.NASA[ctx.reg].clim;
  const y26 = ds.climate.NASA[ctx.reg].y2026.monthAnom;
  const rainM = [5, 6, 7, 8, 9, 10].map((m) => ({
    m,
    r: Math.round(TC.rain[m] * (1 + (y26[m] === null ? 0 : (y26[m] as number)) / 100)),
  }));
  const cRecs = records.filter((r) => r.t === 'caudal').sort((a, b) => (a.d < b.d ? -1 : 1));
  const rMax = Math.max(50, ...rainM.map((o) => o.r));
  const qMax = Math.max(0.5, ...cRecs.map((r) => r.v as number));
  const bars = rainM.map((o) => {
    const q = cRecs.filter((r) => monthOf(r.d) === o.m).slice(-1)[0];
    return {
      m: MONTHS[o.m],
      rain: o.r,
      h: Math.round((60 * o.r) / rMax),
      qy: q ? Math.round(64 - (60 * (q.v as number)) / qMax) : -20,
      hasQ: !!q,
      qv: q ? comma(q.v) : '',
    };
  });
  const pts = bars
    .map((b, k) => (b.hasQ ? [Math.round(k * 50 + 25), b.qy] : null))
    .filter((p): p is number[] => !!p);
  const qLine = pts.length >= 2 ? pts.map((p, k) => `${k ? 'L' : 'M'}${p[0]},${p[1]}`).join('') : '';
  let text = '';
  if (cRecs.length >= 2) {
    const qMin = cRecs.reduce((a, r) => ((r.v as number) < (a.v as number) ? r : a), cRecs[0]);
    const qHi = cRecs.reduce((x, r) => ((r.v as number) > (x.v as number) ? r : x), cRecs[0]);
    text = `${
      (qMin.v as number) < (qHi.v as number) * 0.9
        ? `Bajó a ${comma(qMin.v)} L/s en ${MONTHS[monthOf(qMin.d)]} y llegó a ${comma(qHi.v)} L/s en ${MONTHS[monthOf(qHi.d)]}.`
        : 'El caudal se mantiene estable.'
    } Cuando llueve menos, la naciente baja unas semanas después.`;
  }
  return { has: cRecs.length >= 2, bars, qLine, text };
}

/** Regresión lineal sobre los últimos 5 caudales: ¿qué caudal habría en 2 meses? */
export function flowProjection(ds: Dataset, records: FieldRecord[]) {
  const qs = records
    .filter((r) => r.t === 'caudal')
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-5);
  if (qs.length < 3) return { has: false as const };
  const t0 = Date.parse(qs[0].d);
  const X = qs.map((r) => (Date.parse(r.d) - t0) / (30.4 * 864e5));
  const Y = qs.map((r) => r.v as number);
  const mx = X.reduce((a, v) => a + v, 0) / X.length;
  const my = Y.reduce((a, v) => a + v, 0) / Y.length;
  const sl =
    X.reduce((a, v, i) => a + (v - mx) * (Y[i] - my), 0) /
    Math.max(1e-6, X.reduce((a, v) => a + (v - mx) * (v - mx), 0));
  const last = qs[qs.length - 1];
  const lm = monthOf(last.d);
  const pv = Math.max(0, (last.v as number) + sl * 2);
  const down = sl < -0.05;
  const mxv = Math.max(...Y);
  const pm = MONTHS[(lm + 2) % 12];
  const drop = Math.round(100 * (1 - (last.v as number) / mxv));
  const name = (ds.sources.fuentes[last.src ?? -1] || [0, 0, 0, 0, ''])[4];
  return {
    has: true as const,
    down,
    slope: `${sl >= 0 ? '+' : '−'}${Math.abs(sl).toFixed(1).replace('.', ',')} L/s por mes`,
    pv: pv.toFixed(1).replace('.', ','),
    pm,
    drop,
    msg: down
      ? `El caudal va a la baja. Si sigue así, en ${pm} daría unos ${pv.toFixed(1).replace('.', ',')} L/s. Es momento de prevenir, no de reaccionar.`
      : 'El caudal no muestra tendencia a la baja.',
    bg: down ? '#8E2A21' : '#2E7A43',
    /** Texto para compartir; la app prepara el mensaje, no lo envía. */
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      `Aviso de caudal (Sow Water): la fuente ${name} bajó a ${comma(last.v)} L/s (${drop} % menos). Si sigue así, en ${pm} daría unos ${pv.toFixed(1).replace('.', ',')} L/s.`,
    )}`,
  };
}

export function recordsCsv(ds: Dataset, records: FieldRecord[]): string {
  const rows = [['fecha', 'tipo', 'valor', 'fuente', 'nota', 'compartido']].concat(
    records.map((r) => [
      r.d,
      r.t,
      String(r.v),
      r.src !== undefined ? (ds.sources.fuentes[r.src] || [0, 0, 0, 0, ''])[4] : '',
      r.note || '',
      r.share ? 'si' : 'no',
    ]),
  );
  return rows.map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
}

/** Tablero compartido de la ASADA (finqueros + ASADA). Fincas cercanas: SIMULADAS. */
export function sharedBoard(
  ds: Dataset,
  ctx: PlaceContext,
  records: FieldRecord[],
  source: { i: number; op: string; conn: string },
  nDone: number,
) {
  const q = ds.sources.fuentes[source.i] || [0, 0, 0, 0, '—'];
  const upFarms = ctx.geo.farms.filter((f) => Math.hypot(f.x - q[0], f.y - q[1]) / 10 <= 1.5);
  const cRecs = records.filter((r) => r.t === 'caudal').sort((a, b) => (a.d < b.d ? -1 : 1));
  const last = cRecs.length ? cRecs[cRecs.length - 1] : null;
  const chart = flowChart(ds, ctx, records);
  const name = (ds.sources.fuentes[source.i] || [0, 0, 0, 0, '—'])[4];
  return {
    src: name,
    op: source.op,
    conn: source.conn,
    farms: upFarms.length,
    care: nDone ? 1 : 0,
    lastQ: last ? `${comma(last.v)} L/s` : 'Sin datos',
    trend: chart.text ? `${chart.text.split('. ')[0]}.` : 'Registra el caudal cada mes para ver la tendencia.',
    events: records.filter((r) => r.t === 'evento' && r.share).length,
    actions: records.filter((r) => r.t === 'accion' && r.share).length,
  };
}

/** Vista institucional (CNE, municipalidad, FLUC): caídas de caudal SIMULADAS hasta que las ASADAS registren las suyas. */
export function institutionalView(ds: Dataset, ctx: PlaceContext, plan: WatershedPlan, flucRegions: number) {
  const { fuentes, ops } = ds.sources;
  const nacs = ctx.geo.srcs.filter((i) => fuentes[i][3]);
  const simDown = nacs
    .slice(0, 6)
    .map((i, k) => ({
      n: fuentes[i][4],
      op: (ops[fuentes[i][2]] || [''])[0],
      drop: [42, 35, 28, 12, 5, 0][k],
    }))
    .filter((o) => o.drop > 0);
  return {
    list: simDown.map((o) => ({
      t: `${o.n} · ${o.op}`,
      d: `−${o.drop} % de caudal en 4 meses`,
      col: o.drop >= 30 ? '#B3362B' : o.drop >= 15 ? '#E0A030' : '#2E7A43',
    })),
    nDown: simDown.filter((o) => o.drop >= 15).length,
    prot: plan.nHi,
    fl: flucRegions,
  };
}
