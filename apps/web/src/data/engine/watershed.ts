import type { Dataset, Fuente, RipCell } from '../real/types';
import { distText, fmtInt, fmtKm, f2, MONTHS } from './format';
import { getGeo, type Loc, type PlaceContext } from './geo';
import { rainFactor, seasonLength, type DemoScenario, ndviSeries } from './climate';

export type MapLayer = 'agua' | 'restaurar' | 'orillas';
export type RiskLevel = 0 | 1 | 2;

export const RISK_LABEL = ['Riesgo bajo', 'Riesgo medio', 'Riesgo alto'] as const;
/** [nombre, color de la gota, fondo de la etiqueta, texto de la etiqueta]. */
export const RISK_STYLE: [string, string, string, string][] = [
  ['Baja', '#2F7FC1', '#DCEAF5', '#1C4E78'],
  ['Media', '#E0A030', '#FDF1D6', '#6B4505'],
  ['Alta', '#D9534F', '#F8E1DE', '#8E2A21'],
];

const FRAG: Record<string, boolean> = { VI: true, VII: true, VIII: true, AP: true };
const R1 = 10; // 1 km en unidades de 100 m
const PCOL = ['#CFE6D3', '#F6D98B', '#F2A65A', '#D9534F', '#B3261E', '#8E1A14'];
const BCOL = ['#E9EEEA', '#2E7A43', '#F2A65A', '#D9534F'];

export interface NearSource {
  i: number;
  q: Fuente;
  /** Distancia en km a la ubicación seleccionada. */
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

/** Fuente más cercana a la finca, preferiblemente naciente (si está en la subcuenca). */
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
  /** % de fuentes subterráneas (naciente o pozo) en la subcuenca. */
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

/** Estado legal / de recarga de la finca respecto de la naciente más cercana. */
export function legalZone(ds: Dataset, ctx: PlaceContext) {
  const j = waterJourney(ds, ctx);
  if (j.distKm <= 0.1)
    return {
      level: 'protegida' as const,
      t: 'Tu finca está dentro de los 100 m de protección de una naciente',
      d: 'Ley Forestal 7575, art. 33: no se debe cortar árboles ni usar esa franja para ganado o cultivos.',
      col: '#8E2A21',
      bg: '#F8E1DE',
    };
  if (j.distKm <= 1)
    return {
      level: 'recarga' as const,
      t: 'Tu finca está en la zona de recarga de una naciente',
      d: `Lo que pasa en tu suelo llega al agua de ${j.conn} conexiones de la ASADA ${j.op}.`,
      col: '#6B4505',
      bg: '#FDF1D6',
    };
  return {
    level: 'cuenca' as const,
    t: 'Tu finca es parte de la cuenca',
    d: 'El agua que se infiltra en tu suelo alimenta las nacientes y pozos de la subcuenca.',
    col: '#17617C',
    bg: '#E3EFF3',
  };
}

/** Cuenca completa: conexiones, ASADAS y reportes de sequía 2014–15. */
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
    'tu cuenca';
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
    msg: `Lo que pasa en tu finca llega, cuenca abajo, al agua de ${fmtInt(conn)} conexiones de ${nAs} acueductos comunales de la cuenca ${name}.`,
    hasHist: hl.length > 0,
    hCom: hCom.length,
    hInf: hInf.length,
    hList: hl.slice(0, 4).map((h) => ({
      t: `${h[3]} (${h[4]})`,
      d: h[2] === 'c' ? 'Comunidad reportó falta de agua' : h[5],
    })),
    hNear: nearH.length ? `${nearH[0].h[3]} (${nearH[0].h[4]}), a ${Math.round(nearH[0].d)} km` : '',
  };
}

/** Tarjetas "Tu finca en la cuenca": tierra, inundación y agua de la comunidad. */
export function terrainCards(ds: Dataset, ctx: PlaceContext) {
  const LIM: Record<string, string> = { e: 'erosión', s: 'suelo', c: 'clima', h: 'drenaje' };
  const lims = Object.keys(LIM)
    .filter((k) => ctx.clsRaw.slice(ctx.clase.length).includes(k))
    .map((k) => LIM[k]);
  const CAPT: Record<string, [string, string]> = {
    I: ['Tierra muy buena', 'Sirve para casi cualquier cultivo.'],
    II: ['Tierra muy buena', 'Sirve para cultivos anuales con cuidados sencillos.'],
    III: ['Tierra buena con cuidados', 'Acepta cultivos anuales si se protege el suelo.'],
    IV: ['Tierra con límites', 'Sirve para cultivos solo si el suelo se mantiene cubierto.'],
    V: ['Tierra para pastos', 'Mejor pastos o cultivos permanentes.'],
    VI: ['Tierra para pastos con árboles', 'Mejor pastos con árboles, cultivos permanentes o bosque.'],
    VII: ['Tierra para bosque', 'Mejor manejo forestal; no para cultivos anuales.'],
    VIII: ['Tierra de protección', 'Debe quedar con bosque para cuidar el agua.'],
    AP: ['Área protegida', 'Aquí no se debería sembrar.'],
  };
  const capT = CAPT[ctx.clase] || ['Sin dato de tierra', 'No tenemos la capacidad de uso de este punto.'];
  const nf = getGeo(ds).nearestFuente(ctx.loc);
  const fu = ds.sources.fuentes[nf.i];
  const op = ds.sources.ops[fu[2]];
  const capGood = ['I', 'II', 'III'].includes(ctx.clase);
  return [
    {
      k: 'TIERRA',
      title: capT[0] + (ctx.clase ? ` · clase ${ctx.clase}` : ''),
      text: capT[1] + (lims.length ? ` Límite por ${lims.join(' y ')}.` : ''),
      src: 'Dato oficial · capacidad de uso · fuente [7]',
      col: capGood ? '#2E7A43' : ctx.clase === 'IV' ? '#E0A030' : '#B3362B',
    },
    {
      k: 'INUNDACIÓN',
      title: ctx.flood ? 'Zona que se puede inundar' : 'Fuera de zona inundable',
      text: ctx.flood
        ? 'En meses muy lluviosos el terreno se puede encharcar.'
        : 'No está en las áreas con potencial de inundación.',
      src: 'Dato real · áreas con potencial de inundación · fuente [7]',
      col: ctx.flood ? '#B3362B' : '#2E7A43',
    },
    {
      k: 'AGUA DE LA COMUNIDAD',
      title: `${fu[4]} a ${distText(nf.km)}`,
      text: `Abastece ${fmtInt(op[1])} conexiones de ${op[0]}. Lo que pase en tu finca puede llegar a esa agua.`,
      src: 'Dato real · fuentes de ASADAS, nov 2026 · fuente [5]',
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
  /** Centro de la celda en coordenadas locales. */
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
  /** Nacientes de riesgo medio o alto. */
  nHi: number;
  nNac: number;
  conn: string;
  connRisk: number;
  tilesRestaurar: MapTile[];
  tilesOrillas: MapTile[];
  /** Halos de 1 km de recarga (capa Fuentes de agua). */
  halos: { x: number; y: number; d: number; col: string }[];
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
  forecast: { m: string; n: number; e: number }[];
  forecastTxt: string;
  actions: RegenerationAction[];
  goal: string;
  ndvi: string;
}

/**
 * Plan de la subcuenca: riesgo de nacientes, dónde restaurar (NASA MODIS 1 km +
 * IGN 1:5 000 + ladera frágil + cercanía a nacientes), ríos sin bosque y acciones.
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
    return { t, p, d: dmin, r, pr: keep ? -1 : Math.min(5, pr), water: !r || (nd === null && !r.bank) };
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

  // cifras de orillas y restauración
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
    haUrg: Math.round((sub.ha * urgN) / nT).toLocaleString('es-CR'),
    haKeep: Math.round((sub.ha * keepN) / nT).toLocaleString('es-CR'),
    down: String(Math.round((100 * downN) / nT)),
    ndvi: ndM === null ? '—' : f2(ndM),
  };

  // fuentes: riesgo según tierra frágil y restauración urgente a 1 km
  const sources: SourceInfo[] = srcI.map((i) => {
    const q = fuentes[i];
    const op = (ops[q[2]] || ['', 0]) as [string, number];
    const near = tileP.filter((o) => Math.hypot(q[0] - o.t.lx, q[1] - o.t.ly) <= R1);
    const hot = near.length ? near.filter((o) => o.p >= 4).length / near.length : 0;
    const nac = !!q[3];
    const risk: RiskLevel = !nac ? 0 : hot >= 0.4 ? 2 : hot >= 0.15 ? 1 : 0;
    const why = nac
      ? risk === 2
        ? 'Alrededor hay tierra frágil o que se inunda, y con El Niño el verano sería más largo.'
        : risk === 1
          ? 'Hay tierra frágil cerca: conviene mantener el suelo cubierto.'
          : 'Su alrededor está en buen estado.'
      : 'Los pozos dependen del agua subterránea de toda la cuenca.';
    return {
      i,
      q,
      op,
      risk,
      nac,
      why,
      kind: nac ? 'Naciente' : 'Pozo u otra fuente',
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

  // Pronóstico de lluvia nov–abr con El Niño
  const climF = rainFactor(ds, reg, 'nino');
  const clR = ds.climate.NASA[reg].clim.rain;
  const forecast = [10, 11, 0, 1, 2, 3].map((m) => ({
    m: MONTHS[m],
    n: clR[m],
    e: Math.round(clR[m] * climF[m]),
  }));
  const sumN = Math.max(1, forecast.reduce((a, o) => a + o.n, 0));
  const rainDrop = Math.round(100 * (1 - forecast.reduce((a, o) => a + o.e, 0) / sumN));
  const forecastTxt = `${rainDrop > 0 ? '−' : '+'}${Math.abs(rainDrop)} % de lluvia de nov a abr · verano de ${dE} ${dE === 1 ? 'mes' : 'meses'} (normal: ${dN})`;

  const risky = hi.length + mid.length;
  const actions: Omit<RegenerationAction, 'num'>[] = [];
  if (risky)
    actions.push({
      t: `Proteger ${risky} ${risky === 1 ? 'naciente en riesgo' : 'nacientes en riesgo'}`,
      d: 'Cercar y dejar crecer el bosque en 100 m alrededor (Ley Forestal, art. 33).',
      imp: `${fmtInt(connHi)} conexiones`,
      when: 'Antes de enero',
      who: 'ASADA + fincas',
    });
  actions.push({
    t: kmNo >= 0.5 ? `Sembrar ${fmtKm(kmNo)} km de orillas` : 'Corredores ribereños',
    d: `${kmNo >= 0.5 ? `${Math.round((100 * kmNo) / Math.max(0.01, kmT))} % de las orillas sin árboles. ` : 'Árboles a cada lado de ríos y quebradas: '}15 m en plano, 50 m en ladera (Ley Forestal, art. 33).`,
    imp: 'El agua se siembra',
    when: 'Lluvias de 2027',
    who: 'Fincas + SINAC',
  });
  if (urgN / nT >= 0.03)
    actions.push({
      t: `Restaurar primero ${rip.haUrg} ha`,
      d: 'Donde el satélite ve poco verdor o verdor que baja, y la orilla está sin árboles: regeneración natural y pasto con árboles.',
      imp: 'Más agua en verano',
      when: 'Lluvias de 2027',
      who: 'Fincas + SINAC',
    });
  if (nearFarms)
    actions.push({
      t: `Cubrir el suelo en ${nearFarms} ${nearFarms === 1 ? 'finca cerca del agua' : 'fincas cerca del agua'}`,
      d: 'Fincas a menos de 1 km de una naciente: abono verde, sin quemas.',
      imp: 'Menos tierra al agua',
      when: 'Esta siembra (nov–dic)',
      who: 'Fincas',
    });
  if (fragShare >= 0.08)
    actions.push({
      t: `Árboles en ${fmtInt(fragShare * sub.ha)} ha de ladera`,
      d: 'Tierra de pasto o bosque: pasto con árboles o regeneración natural.',
      imp: 'Recarga de agua',
      when: 'Lluvias de 2027',
      who: 'Fincas + PNUD',
    });
  actions.push({
    t: dE > dN ? `Prepararse para un verano de ${dE} meses` : 'Guardar agua para el verano',
    d: 'Tanques, reservorios y forraje guardado en las fincas sin naciente propia.',
    imp: dE > dN ? (dE - dN === 1 ? '1 mes más seco' : `${dE - dN} meses más secos`) : 'Verano normal',
    when: 'Antes de diciembre',
    who: 'Fincas + ASADA',
  });
  if (floodShare >= 0.05)
    actions.push({
      t: 'Dejar libres las zonas que se inundan',
      d: 'Ganado y cultivos fuera de las partes bajas en meses muy lluviosos.',
      imp: `${fmtInt(floodShare * sub.ha)} ha inundables`,
      when: 'Set–nov',
      who: 'Fincas + municipalidad',
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
    goal: risky
      ? `Si se hace el plan: ${fmtInt(connHi)} conexiones de agua más seguras.`
      : 'Las fuentes de esta subcuenca están en buen estado: el plan es mantenerlas.',
    ndvi: f2(serie[nF - 1]),
  };
}

/** Bloque "Tu zona vista desde arriba" (1,5 km alrededor de la finca). */
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
    { t: 'No hay ríos dibujados cerca de tu finca', d: 'Revisa en el mapa de tu cuenca las quebradas de la zona.', col: '#55665B', bg: '#EEF1EE', tag: 'Sin río' },
    { t: 'Las orillas cerca de tu finca tienen bosque', d: 'Cuídalo: esa sombra mantiene fresca y limpia el agua.', col: '#1F6B3A', bg: '#E4EFE6', tag: 'Con bosque' },
    { t: 'Las orillas cerca de tu finca tienen bosque a medias', d: 'Completa los 15 m de árboles a cada lado del río (Ley Forestal, art. 33).', col: '#6B4505', bg: '#FDF1D6', tag: 'A medias' },
    { t: 'Las orillas cerca de tu finca no tienen bosque', d: 'Es lo primero para sembrar agua: 15 m de árboles a cada lado del río (Ley Forestal, art. 33).', col: '#8E2A21', bg: '#F8E1DE', tag: 'Sin bosque' },
  ];
  const bk0 = BK[r0 ? r0.bank : 0];
  const vd = r0 && r0.ndvi !== null ? r0.ndvi : null;
  const dd = r0 ? r0.d : 0;
  const tired = vd !== null && (vd < 0.6 || dd <= -0.03);
  return {
    ...bk0,
    verd:
      vd === null
        ? 'Sin dato de verdor'
        : `Verdor ${f2(vd)}${dd <= -0.03 ? ` · bajó ${f2(-dd)} desde 2016–2020` : dd >= 0.03 ? ` · subió ${f2(dd)} desde 2016–2020` : ' · igual que en 2016–2020'}`,
    vcol: vd === null ? '#55665B' : vd < 0.55 || dd <= -0.03 ? '#8E2A21' : '#1F6B3A',
    tip: tired ? 'Pasto cansado: rotar potreros y sembrar árboles en el potrero.' : '',
    src: 'Mapa oficial IGN 1:5 000 [15] y NASA MODIS [16], alrededor de tu finca.',
    ndvi: vd,
    delta: dd,
    bank: r0 ? r0.bank : 0,
  };
}
