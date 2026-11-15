import { messageLanguage as displayLanguage } from '../../i18n/messages';
import { localizedResource, message } from '../../i18n/messages';
import type { Dataset, Fuente, RipCell } from '../real/types';
import { ndviSeries, rainFactor, seasonLength, type DemoScenario } from './climate';
import { distText, f2, fmtInt, fmtKm, MONTHS } from './format';
import { getGeo, type Loc, type PlaceContext } from './geo';
export type MapLayer = 'agua' | 'restaurar' | 'orillas';
export type RiskLevel = 0 | 1 | 2;
export const RISK_LABEL = localizedResource(
  () => [message('m4c65c6b78b08'), message('m5693d7652b9a'), message('m9102470142ed')] as const,
);
/** [name, drop color, label background, label text]. */
export const RISK_STYLE: [string, string, string, string][] = localizedResource(() => [
  [message('m0b6af7d377da'), '#2F7FC1', '#DCEAF5', '#1C4E78'],
  [message('md357175cfe89'), '#E0A030', '#FDF1D6', '#6B4505'],
  [message('m42719229fd62'), '#D9534F', '#F8E1DE', '#8E2A21'],
]);
const FRAG: Record<string, boolean> = { VI: true, VII: true, VIII: true, AP: true };
const R1 = 10; // 1 km in 100 m units
const PCOL = ['#CFE6D3', '#F6D98B', '#F2A65A', '#D9534F', '#B3261E', '#8E1A14'];
const BCOL = ['#E9EEEA', '#2E7A43', '#F2A65A', '#D9534F'];
export interface NearSource {
  i: number;
  q: Fuente;
  /** Distance in km to the selected location. */
  d: number;
}
export function nearbySources(ds: Dataset, ctx: PlaceContext): NearSource[] {
  return ctx.geo.srcs
    .map((i) => {
      const q = ds.sources.fuentes[i];
      return { i, q, d: Math.hypot(q[0] - ctx.loc.x, q[1] - ctx.loc.y) / 10 };
    })
    .sort((a, b) => a.d - b.d);
}
/** Source nearest to the farm, preferably a spring (if it is in the subwatershed). */
export function nearestSource(ds: Dataset, ctx: PlaceContext): NearSource {
  const g = getGeo(ds);
  const { kinds } = g.sourceKinds();
  const near = nearbySources(ds, ctx);
  const nac = near.find((o) => kinds[o.i] === 'n');
  if (nac) return nac;
  if (near[0]) return near[0];
  const z = g.nearestFuente(ctx.loc);
  return { i: z.i, q: ds.sources.fuentes[z.i], d: z.km };
}
export interface WaterJourney {
  /** % of groundwater sources (spring or well) in the subwatershed. */
  pct: string;
  pctPais: string;
  nNac: string;
  nPozo: string;
  src: string;
  srcIndex: number;
  op: string;
  conn: string;
  dist: string;
  distKm: number;
}
export function waterJourney(ds: Dataset, ctx: PlaceContext): WaterJourney {
  const g = getGeo(ds);
  const { kinds, pctSub } = g.sourceKinds();
  const nf0 = nearestSource(ds, ctx);
  const op0 = ds.sources.ops[nf0.q[2]] || ['', 0];
  const subKinds = ctx.geo.srcs.map((i) => kinds[i]);
  const subPct = subKinds.length
    ? Math.round((100 * subKinds.filter((k) => k === 'n' || k === 'p').length) / subKinds.length)
    : pctSub;
  return {
    pct: String(subPct),
    pctPais: String(pctSub),
    nNac: String(subKinds.filter((k) => k === 'n').length),
    nPozo: String(subKinds.filter((k) => k === 'p').length),
    src: nf0.q[4],
    srcIndex: nf0.i,
    op: op0[0],
    conn: fmtInt(op0[1]),
    dist: distText(nf0.d),
    distKm: nf0.d,
  };
}
/** Legal / recharge status of the farm relative to the nearest spring. */
export function legalZone(ds: Dataset, ctx: PlaceContext) {
  const j = waterJourney(ds, ctx);
  if (j.distKm <= 0.1)
    return {
      level: 'protegida' as const,
      t: message('mb10aeea90366'),
      d: message('m0cd93982fdc9'),
      col: '#8E2A21',
      bg: '#F8E1DE',
    };
  if (j.distKm <= 1)
    return {
      level: 'recarga' as const,
      t: message('m8894773c3a5e'),
      d: message('m27e4e38acdac', j.conn, j.op),
      col: '#6B4505',
      bg: '#FDF1D6',
    };
  return {
    level: 'cuenca' as const,
    t: message('me58c807b2293'),
    d: message('mf300ede8ddc9'),
    col: '#17617C',
    bg: '#E3EFF3',
  };
}
/** Whole watershed: connections, ASADAS and 2014–15 drought reports. */
export function basinInfo(ds: Dataset, ctx: PlaceContext) {
  const g = getGeo(ds);
  const { byCuenca, hist } = g.cuencaConnections();
  const ops = byCuenca[ctx.cuIdx] || {};
  const nAs = Object.keys(ops).length;
  const conn = Object.keys(ops).reduce((a, k) => a + (ops[Number(k)] || 0), 0);
  const { territory, history } = ds;
  const name =
    (territory.cuNames && territory.cuNames[ctx.cuIdx]) ||
    (territory.cuencas[ctx.cuIdx] && territory.cuencas[ctx.cuIdx].n) ||
    message('m238ac67fa5d2');
  const hl = (hist[ctx.cuIdx] || []).map((i) => history[i]);
  const hCom = hl.filter((h) => h[2] === 'c');
  const hInf = hl.filter((h) => h[2] === 'i');
  const nearH = history
    .map((h) => ({ h, d: Math.hypot(h[0] - ctx.loc.x, h[1] - ctx.loc.y) / 10 }))
    .sort((a, b) => a.d - b.d);
  return {
    name,
    conn: fmtInt(conn),
    connN: conn,
    nAs,
    msg: message('ma56388b6ce91', fmtInt(conn), nAs, name),
    hasHist: hl.length > 0,
    hCom: hCom.length,
    hInf: hInf.length,
    hList: hl.slice(0, 4).map((h) => ({
      t: message('m0aa4c5a6e943', h[3], h[4]),
      d: h[2] === 'c' ? message('m6a1976b08254') : h[5],
    })),
    hNear: nearH.length
      ? message('m72013d19fbd9', nearH[0].h[3], nearH[0].h[4], Math.round(nearH[0].d))
      : '',
  };
}
/** "Your farm in the watershed" cards: land, flooding and community water. */
export function terrainCards(ds: Dataset, ctx: PlaceContext) {
  const LIM: Record<string, string> = {
    e: message('m449476eaf089'),
    s: 'suelo',
    c: 'clima',
    h: 'drenaje',
  };
  const lims = Object.keys(LIM)
    .filter((k) => ctx.clsRaw.slice(ctx.clase.length).includes(k))
    .map((k) => LIM[k]);
  const CAPT: Record<string, [string, string]> = {
    I: [message('m760c121b15b1'), message('m3dd80acd417a')],
    II: [message('m760c121b15b1'), message('mfca7039a617e')],
    III: [message('m8635ea4eb302'), message('m71690579d3b2')],
    IV: [message('m53df1efc3d7b'), message('m761a6e4ec0ef')],
    V: [message('md81fd56e82ef'), message('meeaba7e39266')],
    VI: [message('mc7352a7beb36'), message('mc4e90d45e9a0')],
    VII: [message('m71473f5d304f'), message('mdafa6dbb1f2b')],
    VIII: [message('mebf17a7b162c'), message('m5c788b6f3a4c')],
    AP: [message('m37f9f6709605'), message('m9ae5557cf18d')],
  };
  const capT = CAPT[ctx.clase] || [message('mad69aefc9787'), message('m60a34311257b')];
  const nf = getGeo(ds).nearestFuente(ctx.loc);
  const fu = ds.sources.fuentes[nf.i];
  const op = ds.sources.ops[fu[2]];
  const capGood = ['I', 'II', 'III'].includes(ctx.clase);
  return [
    {
      k: 'TIERRA',
      title: capT[0] + (ctx.clase ? message('m6a33960e76cf', ctx.clase) : ''),
      text: capT[1] + (lims.length ? message('m419efc62e73f', lims.join(' y ')) : ''),
      src: message('md9b102e2b243'),
      col: capGood ? '#2E7A43' : ctx.clase === 'IV' ? '#E0A030' : '#B3362B',
    },
    {
      k: message('md8f30732c5b5'),
      title: ctx.flood ? message('mf9b4e39c335e') : message('m4753bfdb4f24'),
      text: ctx.flood ? message('m98143974aa24') : message('m2ec263c23e35'),
      src: message('me5abcd9923fa'),
      col: ctx.flood ? '#B3362B' : '#2E7A43',
    },
    {
      k: message('mc5e0987ab762'),
      title: message('m0112c18e975c', fu[4], distText(nf.km)),
      text: message('m141f022887d8', fmtInt(op[1]), op[0]),
      src: message('m133031db2a61'),
      col: '#17617C',
    },
  ];
}
export interface SourceInfo {
  i: number;
  q: Fuente;
  op: [string, number];
  risk: RiskLevel;
  nac: boolean;
  distKm: number;
  why: string;
  kind: string;
}
export interface MapTile {
  x: number;
  y: number;
  /** Cell center in local coordinates. */
  lx: number;
  ly: number;
  col: string;
}
export interface RegenerationAction {
  num: string;
  t: string;
  d: string;
  imp: string;
  when: string;
  who: string;
}
export interface WatershedPlan {
  sources: SourceInfo[];
  nacientes: SourceInfo[];
  /** Springs at medium or high risk. */
  nHi: number;
  nNac: number;
  conn: string;
  connRisk: number;
  tilesRestaurar: MapTile[];
  tilesOrillas: MapTile[];
  /** 1 km recharge halos (Water sources layer). */
  halos: {
    x: number;
    y: number;
    d: number;
    col: string;
  }[];
  rip: {
    has: boolean;
    kmT: string;
    kmNo: string;
    pct: string;
    pas: string;
    haUrg: string;
    haKeep: string;
    down: string;
    ndvi: string;
  };
  forecast: {
    m: string;
    n: number;
    e: number;
  }[];
  forecastTxt: string;
  actions: RegenerationAction[];
  goal: string;
  ndvi: string;
}
/**
 * Subwatershed plan: spring risk, where to restore (NASA MODIS 1 km +
 * IGN 1:5 000 + fragile slope + proximity to springs), rivers without forest and actions.
 */
export function watershedPlan(
  ds: Dataset,
  ctx: PlaceContext,
  demo: DemoScenario | null,
): WatershedPlan {
  const g = getGeo(ds);
  const { reg, sub, geo } = ctx;
  const { fuentes, ops } = ds.sources;
  const tiles = g.satBase(ctx.subId);
  const srcI = geo.srcs.slice(0, 160);
  const { dN, dE } = seasonLength(ds, reg, demo);
  const tileP = tiles.map((t) => {
    let dmin = 1e9;
    srcI.forEach((i) => {
      const q = fuentes[i];
      if (q[3]) {
        const d = Math.hypot(q[0] - t.lx, q[1] - t.ly);
        if (d < dmin) dmin = d;
      }
    });
    const p =
      (dmin < 6 ? 2 : dmin < 15 ? 1 : 0) +
      (FRAG[t.cl] ? 1 : 0) +
      (t.flR ? 1 : 0) +
      (dE > dN && (t.cl === 'IV' || FRAG[t.cl]) ? 1 : 0);
    const r = g.ripAt(t.lx, t.ly);
    const nd = r ? r.ndvi : null;
    const pr =
      (r
        ? (r.bank === 3 ? 2 : r.bank === 2 ? 1 : 0) +
          (nd !== null ? (nd < 0.55 ? 2 : nd < 0.7 ? 1 : 0) : 0) +
          (r.d <= -0.03 ? 1 : 0)
        : 0) +
      (FRAG[t.cl] ? 1 : 0) +
      (dmin < 6 ? 1 : 0);
    const keep = nd !== null && nd >= 0.8 && (!r || r.bank <= 1);
    return {
      t,
      p,
      d: dmin,
      r,
      pr: keep ? -1 : Math.min(5, pr),
      water: !r || (nd === null && !r.bank),
    };
  });
  const tilesRestaurar: MapTile[] = tileP.map((o) => ({
    x: o.t.x,
    y: o.t.y,
    lx: o.t.lx,
    ly: o.t.ly,
    col: o.water ? '#CFE3EC' : o.pr < 0 ? '#1F6B3A' : PCOL[o.pr],
  }));
  const tilesOrillas: MapTile[] = tileP.map((o) => ({
    x: o.t.x,
    y: o.t.y,
    lx: o.t.lx,
    ly: o.t.ly,
    col: o.water || !o.r ? '#CFE3EC' : BCOL[o.r.bank],
  }));
  // riverbank and restoration figures
  const rSeen: Record<string, number> = {};
  let kmT = 0;
  let kmNo = 0;
  let kmPas = 0;
  tileP.forEach((o) => {
    const r: RipCell | null = o.r;
    if (!r || !r.bank || rSeen[r.key]) return;
    rSeen[r.key] = 1;
    kmT += r.km;
    if (r.bank >= 2) {
      const k = r.bank === 3 ? r.km : r.km * 0.5;
      kmNo += k;
      if (r.rF !== null && r.rF < 1) kmPas += k * Math.min(1, (r.rP || 0) / (1 - r.rF));
    }
  });
  const nT = Math.max(1, tileP.length);
  const urgN = tileP.filter((o) => o.pr >= 4).length;
  const keepN = tileP.filter((o) => o.pr < 0).length;
  const downN = tileP.filter((o) => o.r && o.r.d <= -0.03 && !o.water).length;
  const nd10 = tileP.filter((o) => o.r && o.r.ndvi !== null).map((o) => o.r!.ndvi as number);
  const ndM = nd10.length ? nd10.reduce((a, v) => a + v, 0) / nd10.length : null;
  const rip = {
    has: kmT > 0.5,
    kmT: fmtKm(kmT),
    kmNo: fmtKm(kmNo),
    pct: String(Math.round((100 * kmNo) / Math.max(0.01, kmT))),
    pas: String(Math.round((100 * kmPas) / Math.max(0.01, kmNo))),
    haUrg: Math.round((sub.ha * urgN) / nT).toLocaleString(
      displayLanguage() === 'en' ? 'en-US' : 'es-CR',
    ),
    haKeep: Math.round((sub.ha * keepN) / nT).toLocaleString(
      displayLanguage() === 'en' ? 'en-US' : 'es-CR',
    ),
    down: String(Math.round((100 * downN) / nT)),
    ndvi: ndM === null ? '—' : f2(ndM),
  };
  // sources: risk from fragile land and urgent restoration within 1 km
  const sources: SourceInfo[] = srcI.map((i) => {
    const q = fuentes[i];
    const op = (ops[q[2]] || ['', 0]) as [string, number];
    const near = tileP.filter((o) => Math.hypot(q[0] - o.t.lx, q[1] - o.t.ly) <= R1);
    const hot = near.length ? near.filter((o) => o.p >= 4).length / near.length : 0;
    const nac = !!q[3];
    const risk: RiskLevel = !nac ? 0 : hot >= 0.4 ? 2 : hot >= 0.15 ? 1 : 0;
    const why = nac
      ? risk === 2
        ? message('m7a26754b941b')
        : risk === 1
          ? message('m511935cab707')
          : message('m55d74594dc5c')
      : message('m1614967ac895');
    return {
      i,
      q,
      op,
      risk,
      nac,
      why,
      kind: nac ? message('m28dad06f04fc') : message('m6770a6f355f4'),
      distKm: Math.hypot(q[0] - ctx.loc.x, q[1] - ctx.loc.y) / 10,
    };
  });
  const pxU = geo.pxPerUnit;
  const halos = sources
    .filter((o) => o.nac)
    .map((o) => {
      const p = geo.toPx(o.q[0], o.q[1]);
      const r = Math.max(10, Math.round(R1 * pxU));
      return {
        x: p.x - r,
        y: p.y - r,
        d: r * 2,
        col:
          o.risk === 2
            ? 'rgba(217, 83, 79, 0.16)'
            : o.risk === 1
              ? 'rgba(224, 160, 48, 0.16)'
              : 'rgba(47, 127, 193, 0.14)',
      };
    });
  const nacs = sources.filter((o) => o.nac);
  const hi = nacs.filter((o) => o.risk === 2);
  const mid = nacs.filter((o) => o.risk === 1);
  const opsSum = (list: SourceInfo[]) => {
    const m: Record<number, number> = {};
    list.forEach((o) => {
      m[o.q[2]] = o.op[1];
    });
    return Object.keys(m).reduce((a, k) => a + m[Number(k)], 0);
  };
  const connHi = opsSum([...hi, ...mid]);
  const connAll = opsSum(sources);
  const fragShare = tileP.length ? tileP.filter((o) => FRAG[o.t.cl]).length / tileP.length : 0;
  const floodShare = tileP.length ? tileP.filter((o) => o.t.flR).length / tileP.length : 0;
  const nearFarms = geo.farms.filter((f) => f.dkm < 1).length;
  // Nov–Apr rainfall outlook with El Niño
  const climF = rainFactor(ds, reg, 'nino');
  const clR = ds.climate.NASA[reg].clim.rain;
  const forecast = [10, 11, 0, 1, 2, 3].map((m) => ({
    m: MONTHS[m],
    n: clR[m],
    e: Math.round(clR[m] * climF[m]),
  }));
  const sumN = Math.max(
    1,
    forecast.reduce((a, o) => a + o.n, 0),
  );
  const rainDrop = Math.round(100 * (1 - forecast.reduce((a, o) => a + o.e, 0) / sumN));
  const forecastTxt = message(
    'm4eddec12a5b6',
    rainDrop > 0 ? '−' : '+',
    Math.abs(rainDrop),
    dE,
    dE === 1 ? 'mes' : 'meses',
    dN,
  );
  const risky = hi.length + mid.length;
  const actions: Omit<RegenerationAction, 'num'>[] = [];
  if (risky)
    actions.push({
      t: message(
        'm4a6913bd8d56',
        risky,
        risky === 1 ? message('md750bee548f4') : message('m8592b789c6d4'),
      ),
      d: message('ma84eaa803836'),
      imp: message('m49021cc4c958', fmtInt(connHi)),
      when: message('mc69bee6f591a'),
      who: message('mcccb5d76c3f6'),
    });
  actions.push({
    t: kmNo >= 0.5 ? message('m7c9b42248454', fmtKm(kmNo)) : message('m7c940e50417d'),
    d: message(
      'm8c2a1d8a1247',
      kmNo >= 0.5
        ? message('m116c83b2e547', Math.round((100 * kmNo) / Math.max(0.01, kmT)))
        : message('m7d7db327eeb2'),
    ),
    imp: message('me1099d6eb3d7'),
    when: message('mbfb9b52a4d0b'),
    who: message('mf60b400d8653'),
  });
  if (urgN / nT >= 0.03)
    actions.push({
      t: message('m41e711242791', rip.haUrg),
      d: message('m5d844080cf05'),
      imp: message('mdbfdb5898023'),
      when: message('mbfb9b52a4d0b'),
      who: message('mf60b400d8653'),
    });
  if (nearFarms)
    actions.push({
      t: message(
        'm81b8117767f2',
        nearFarms,
        nearFarms === 1 ? message('mcc721d665c14') : message('md4ce66edf69d'),
      ),
      d: message('maf29584acf5f'),
      imp: message('mf0be73cd3654'),
      when: message('maf96f0469c12'),
      who: message('m25b0e8f10754'),
    });
  if (fragShare >= 0.08)
    actions.push({
      t: message('mff9e7ed6a456', fmtInt(fragShare * sub.ha)),
      d: message('mcd3d90e2b6da'),
      imp: message('m78d7c6fc90f4'),
      when: message('mbfb9b52a4d0b'),
      who: message('m9c0d8f2a205f'),
    });
  actions.push({
    t: dE > dN ? message('m873465bc2a1e', dE) : message('m354f638d1013'),
    d: message('m9ea7176a898f'),
    imp:
      dE > dN
        ? dE - dN === 1
          ? message('m981a2b71e2cf')
          : message('m8f3c10456bf5', dE - dN)
        : message('mbef2f8c23ee8'),
    when: message('mfe13268441b2'),
    who: message('mbe2519e7bd84'),
  });
  if (floodShare >= 0.05)
    actions.push({
      t: message('m2887dab37ce2'),
      d: message('ma6c829656b0d'),
      imp: message('m1ca6279597d6', fmtInt(floodShare * sub.ha)),
      when: 'Set–nov',
      who: message('m8e541ade321b'),
    });
  const { serie, nF } = ndviSeries(ds, reg, demo);
  return {
    sources,
    nacientes: nacs.slice().sort((a, b) => b.risk - a.risk || b.op[1] - a.op[1]),
    nHi: risky,
    nNac: nacs.length,
    conn: fmtInt(connAll),
    connRisk: connHi,
    tilesRestaurar,
    tilesOrillas,
    halos,
    rip,
    forecast,
    forecastTxt,
    actions: actions.map((a, k) => ({ ...a, num: String(k + 1) })),
    goal: risky ? message('mb09bf673f6a7', fmtInt(connHi)) : message('m443d556ddee2'),
    ndvi: f2(serie[nF - 1]),
  };
}
/** "Your area from above" block (1.5 km around the farm). */
export function zoneFromAbove(ds: Dataset, loc: Loc) {
  const g = getGeo(ds);
  const me = g.ripAt(loc.x, loc.y);
  const r0: RipCell | null = (() => {
    if (me && me.bank) return me;
    const nb: RipCell[] = [];
    for (let dy = -15; dy <= 15; dy += 15)
      for (let dx = -15; dx <= 15; dx += 15) {
        const q = g.ripAt(loc.x + dx, loc.y + dy);
        if (q && q.bank) nb.push(q);
      }
    if (!nb.length) return me;
    const cnt = [0, 0, 0, 0];
    nb.forEach((q) => {
      cnt[q.bank]++;
    });
    const b = ([3, 2, 1] as const).reduce((m, k) => (cnt[k] > cnt[m] ? k : m), 3 as 1 | 2 | 3);
    return { ...(me || nb[0]), bank: b };
  })();
  const BK = [
    {
      t: message('mf0cd0e6164a9'),
      d: message('m0a8051d62829'),
      col: '#55665B',
      bg: '#EEF1EE',
      tag: message('m19eeff642eb7'),
    },
    {
      t: message('mde7ae36d60d5'),
      d: message('m3ff29657707b'),
      col: '#1F6B3A',
      bg: '#E4EFE6',
      tag: message('m5e6d853d221a'),
    },
    {
      t: message('mad86ab95000a'),
      d: message('m26d58e442483'),
      col: '#6B4505',
      bg: '#FDF1D6',
      tag: message('m03467940805b'),
    },
    {
      t: message('m022e8719f328'),
      d: message('m3a9c329e0bce'),
      col: '#8E2A21',
      bg: '#F8E1DE',
      tag: message('m0eb38eaefd65'),
    },
  ];
  const bk0 = BK[r0 ? r0.bank : 0];
  const vd = r0 && r0.ndvi !== null ? r0.ndvi : null;
  const dd = r0 ? r0.d : 0;
  const tired = vd !== null && (vd < 0.6 || dd <= -0.03);
  return {
    ...bk0,
    verd:
      vd === null
        ? message('mc54e2ff289ba')
        : message(
            'mcb37cae7e00d',
            f2(vd),
            dd <= -0.03
              ? message('m3af9ddfbe6d9', f2(-dd))
              : dd >= 0.03
                ? message('m4157d5ea6f11', f2(dd))
                : message('m70dbcc14c385'),
          ),
    vcol: vd === null ? '#55665B' : vd < 0.55 || dd <= -0.03 ? '#8E2A21' : '#1F6B3A',
    tip: tired ? message('mf7f82bbfca5c') : '',
    src: message('m42fdf6d9386a'),
    ndvi: vd,
    delta: dd,
    bank: r0 ? r0.bank : 0,
  };
}
