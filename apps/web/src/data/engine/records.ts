import { messageLanguage as displayLanguage } from '../../i18n/messages';
import { localizedResource, message } from '../../i18n/messages';
import type { Dataset } from '../real/types';
import { comma, MONTHS } from './format';
import type { PlaceContext } from './geo';
import type { WatershedPlan } from './watershed';
export type RecordType = 'caudal' | 'accion' | 'evento' | 'lluvia';
/** Field record stored on the user's device. */
export interface FieldRecord {
  id: string;
  location?: { lat: number; lng: number };
  t: RecordType;
  /** L/s (flow), mm (rainfall) or text (action/event). */
  v: number | string;
  /** Index of the source in `sources.fuentes`. */
  src?: number;
  note?: string;
  /** Date YYYY-MM-DD. */
  d: string;
  /** The user decides whether to share it with their ASADA. */
  share: boolean;
  /** Example record (SIMULATED). */
  demo?: boolean;
}
export const EVENT_TYPES = localizedResource(
  () =>
    [
      message('mfeb29d8418f9'),
      message('ma22c98003c9b'),
      message('medf71ab58975'),
      message('m6e6f4d6c09bb'),
      message('m846a081f4e65'),
      message('m1a9ecf78c1b1'),
    ] as const,
);
export const RECORD_TYPES: {
  id: RecordType;
  ic: string;
  n: string;
  d: string;
}[] = localizedResource(() => [
  { id: 'caudal', ic: '', n: message('m1f4dc3b3db5e'), d: message('ma4c7ed873722') },
  { id: 'accion', ic: '', n: message('m212e06c386ff'), d: message('m4f3feefeda40') },
  { id: 'evento', ic: '', n: message('m43f6698cdd81'), d: message('m3479bd1a00ba') },
  { id: 'lluvia', ic: '', n: message('m24af7c4cec82'), d: message('m40897cf0d637') },
]);
export type ViewRole = 'finquero' | 'asada' | 'inst';
export const VIEW_ROLES: {
  id: ViewRole;
  n: string;
}[] = localizedResource(() => [
  { id: 'finquero', n: message('m2db681c4e15b') },
  { id: 'asada', n: message('m2bc63ae305f2') },
  { id: 'inst', n: message('mdf9b84ddd8d1') },
]);
/** Flow with bucket and stopwatch: liters ÷ seconds. */
export function flowFromBucket(liters: string, seconds: string) {
  const l = Number(String(liters || '20').replace(',', '.'));
  const s = Number(String(seconds || '').replace(',', '.'));
  const lps = l > 0 && s > 0 ? l / s : 0;
  return {
    lps,
    valid: lps > 0,
    lpsText: lps ? lps.toFixed(2).replace('.', displayLanguage() === 'en' ? '.' : ',') : '—',
    lpdText: lps
      ? Math.round(lps * 86400).toLocaleString(displayLanguage() === 'en' ? 'en-US' : 'es-CR')
      : '—',
  };
}
/** Example records (SIMULATED) to show how the screen works. */
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
  rows.push({
    id: 'demo-a',
    t: 'accion',
    v: message('m4ec28cf8bf1e'),
    d: '2026-09-02',
    share: true,
    demo: true,
  });
  rows.push({
    id: 'demo-e',
    t: 'evento',
    v: message('ma22c98003c9b'),
    src: srcIndex,
    d: '2026-10-20',
    share: true,
    demo: true,
  });
  return rows.reverse();
}
const monthOf = (d: string) => Number(d.slice(5, 7)) - 1;
export function recordTitle(ds: Dataset, r: FieldRecord): string {
  const nm = (i: number | undefined) =>
    i === undefined ? '—' : (ds.sources.fuentes[i] || [0, 0, 0, 0, '—'])[4];
  if (r.t === 'caudal') return message('m8871e538bb78', comma(r.v), nm(r.src));
  if (r.t === 'lluvia') return message('m4d5702ed33ff', comma(r.v));
  if (r.t === 'evento') return message('ma417ac239419', r.v, nm(r.src));
  return String(r.v);
}
export function recordDateText(r: FieldRecord): string {
  return message(
    'md456e3d51121',
    r.d.slice(8, 10),
    MONTHS[monthOf(r.d)],
    r.d.slice(0, 4),
    r.share ? message('m1a7bc4549e6b') : message('m4b2c171c3b0a'),
    r.demo ? message('m5c9454a9a87f') : '',
  );
}
/** Chart: Jun–Nov 2026 rainfall bars (NASA POWER) and a line of the recorded flow. */
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
  const qLine =
    pts.length >= 2 ? pts.map((p, k) => `${k ? 'L' : 'M'}${p[0]},${p[1]}`).join('') : '';
  let text = '';
  if (cRecs.length >= 2) {
    const qMin = cRecs.reduce((a, r) => ((r.v as number) < (a.v as number) ? r : a), cRecs[0]);
    const qHi = cRecs.reduce((x, r) => ((r.v as number) > (x.v as number) ? r : x), cRecs[0]);
    text = message(
      'md916642cc0f1',
      (qMin.v as number) < (qHi.v as number) * 0.9
        ? message(
            'mfe13b0123b76',
            comma(qMin.v),
            MONTHS[monthOf(qMin.d)],
            comma(qHi.v),
            MONTHS[monthOf(qHi.d)],
          )
        : message('m8a391f93e04e'),
    );
  }
  return { has: cRecs.length >= 2, bars, qLine, text };
}
/** Linear regression over the last 5 flows: what would the flow be in 2 months? */
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
    Math.max(
      1e-6,
      X.reduce((a, v) => a + (v - mx) * (v - mx), 0),
    );
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
    slope: message(
      'mf793a0ad5963',
      sl >= 0 ? '+' : '−',
      Math.abs(sl)
        .toFixed(1)
        .replace('.', displayLanguage() === 'en' ? '.' : ','),
    ),
    pv: pv.toFixed(1).replace('.', displayLanguage() === 'en' ? '.' : ','),
    pm,
    drop,
    msg: down
      ? message(
          'm00db408a3c07',
          pm,
          pv.toFixed(1).replace('.', displayLanguage() === 'en' ? '.' : ','),
        )
      : message('m619ba60f2970'),
    bg: down ? '#8E2A21' : '#2E7A43',
    /** Text to share; the app prepares the message, it does not send it. */
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message('ma7228e7e3ec0', name, comma(last.v), drop, pm, pv.toFixed(1).replace('.', displayLanguage() === 'en' ? '.' : ',')))}`,
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
  return rows
    .map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
/** Shared ASADA dashboard (farmers + ASADA). Nearby farms: SIMULATED. */
export function sharedBoard(
  ds: Dataset,
  ctx: PlaceContext,
  records: FieldRecord[],
  source: {
    i: number;
    op: string;
    conn: string;
  },
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
    lastQ: last ? message('m5d031782b006', comma(last.v)) : message('m03dc8297d3d6'),
    trend: chart.text ? `${chart.text.split('. ')[0]}.` : message('mfe4c5f849749'),
    events: records.filter((r) => r.t === 'evento' && r.share).length,
    actions: records.filter((r) => r.t === 'accion' && r.share).length,
  };
}
/** Institutional view (CNE, municipality, FLUC): flow drops are SIMULATED until the ASADAS record their own. */
export function institutionalView(
  ds: Dataset,
  ctx: PlaceContext,
  plan: WatershedPlan,
  flucRegions: number,
) {
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
      t: message('ma417ac239419', o.n, o.op),
      d: message('ma858fb48e56f', o.drop),
      col: o.drop >= 30 ? '#B3362B' : o.drop >= 15 ? '#E0A030' : '#2E7A43',
    })),
    nDown: simDown.filter((o) => o.drop >= 15).length,
    prot: plan.nHi,
    fl: flucRegions,
  };
}
