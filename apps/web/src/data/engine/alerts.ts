import { messageLanguage as displayLanguage } from '../../i18n/messages';
import { localizedResource, message } from '../../i18n/messages';
import type { Dataset } from '../real/types';
import { seasonLength, type DemoScenario } from './climate';
import type { Rotation } from './farm';
import { getGeo, type PlaceContext } from './geo';
export interface DroughtHistoryItem {
  title: string;
  detail: string;
}
export interface DroughtHistorySummary {
  cuencaName: string;
  connections: string;
  nAsadas: number;
  msg: string;
  hasReports: boolean;
  nCommunity: number;
  nInfra: number;
  list: DroughtHistoryItem[];
  nearest: string;
}
export interface AlertCard {
  id: 'sequia' | 'inundacion' | 'deslizamiento';
  icon: string;
  title: string;
  level: 0 | 1 | 2;
  levelLabel: string;
  bg: string;
  fg: string;
  why: string;
  recs: string[];
  src: string;
  defaultOpen: boolean;
}
export interface AlertsSummary {
  face: string;
  caribe: boolean;
  list: AlertCard[];
  top: AlertCard;
  whatsappUrl: string;
  history: DroughtHistorySummary;
}
const LEVELS: [string, string, string][] = localizedResource(() => [
  [message('m0b6af7d377da'), '#E2F1E5', '#1F5A32'],
  [message('md357175cfe89'), '#FDF1D6', '#6B4505'],
  [message('m42719229fd62'), '#F8E1DE', '#8E2A21'],
]);
/** Conexiones de la cuenca completa y reportes reales de sequía 2014–2015 (HIST). */
export function droughtHistory(ds: Dataset, ctx: PlaceContext): DroughtHistorySummary {
  const geo = getGeo(ds);
  const { byCuenca, hist } = geo.cuencaConnections();
  const opsCu = byCuenca[ctx.cuIdx] || {};
  const opKeys = Object.keys(opsCu);
  const nAsadas = opKeys.length;
  const connCu = opKeys.reduce((acc, k) => acc + (opsCu[Number(k)] || 0), 0);
  const cuencaName =
    ds.territory.cuNames[ctx.cuIdx] ||
    ds.territory.cuencas[ctx.cuIdx]?.n ||
    message('m238ac67fa5d2');
  const hl = (hist[ctx.cuIdx] || []).map((i) => ds.history[i]);
  const nCommunity = hl.filter((h) => h[2] === 'c').length;
  const nInfra = hl.filter((h) => h[2] === 'i').length;
  const nearH = ds.history
    .map((h) => ({ h, d: Math.hypot(h[0] - ctx.loc.x, h[1] - ctx.loc.y) / 10 }))
    .sort((a, b) => a.d - b.d);
  const fmtConn = Math.round(connCu).toLocaleString(displayLanguage() === 'en' ? 'en-US' : 'es-CR');
  return {
    cuencaName,
    connections: fmtConn,
    nAsadas,
    msg: message('ma56388b6ce91', fmtConn, nAsadas, cuencaName),
    hasReports: hl.length > 0,
    nCommunity,
    nInfra,
    list: hl.slice(0, 4).map((h) => ({
      title: message('m0aa4c5a6e943', h[3], h[4]),
      detail: h[2] === 'c' ? message('m6a1976b08254') : h[5],
    })),
    nearest: nearH.length
      ? message('m72013d19fbd9', nearH[0].h[3], nearH[0].h[4], Math.round(nearH[0].d))
      : '',
  };
}
/** Las dos caras de El Niño: Sequía, Lluvias e inundación y Deslizamiento. */
export function elNinoAlerts(
  ds: Dataset,
  ctx: PlaceContext,
  demo: DemoScenario | null,
  rotation: Rotation,
  siteFloodsFlag: boolean,
): AlertsSummary {
  const { reg, caribe, clsRaw } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const ONI = ds.climate.NASA.ONI;
  const { dN: dryNormal, dE: dryNino } = seasonLength(ds, reg, demo);
  const steep = /^(VI|VII|VIII|AP)/.test(clsRaw);
  const wet = demo === 'inund' || NZ.rain30Anom >= 50 || NZ.gw30 >= 0.88;
  const dryNow = demo === 'seco' || NZ.gw30Anom <= -0.08;
  const minCap = rotation.minCap;
  const anR = rotation.animals;
  const capMes = rotation.capMonth;
  const sLv: 0 | 1 | 2 = (!caribe && ONI.actual >= 1.5) || dryNow ? 2 : dryNino > dryNormal ? 1 : 0;
  const fLv: 0 | 1 | 2 =
    (siteFloodsFlag && wet) || (caribe && wet) ? 2 : siteFloodsFlag || caribe ? 1 : 0;
  const dLv: 0 | 1 | 2 = steep && wet ? 2 : steep ? 1 : 0;
  const makeCard = (
    id: AlertCard['id'],
    icon: string,
    title: string,
    level: 0 | 1 | 2,
    why: string,
    recs: string[],
    src: string,
  ): AlertCard => ({
    id,
    icon,
    title,
    level,
    levelLabel: LEVELS[level][0],
    bg: LEVELS[level][1],
    fg: LEVELS[level][2],
    why,
    recs,
    src,
    defaultOpen: false,
  });
  const raw: AlertCard[] = [
    makeCard(
      'sequia',
      '☀️',
      message('mca9d461485f3'),
      sLv,
      message(
        'm78db363a40bd',
        ONI.actual.toFixed(1).replace('.', displayLanguage() === 'en' ? '.' : ','),
        dryNino,
        dryNino === 1 ? 'mes' : 'meses',
        dryNormal,
      ),
      [
        minCap < anR
          ? message('m68b58e402e21', capMes, minCap, anR)
          : message('m222595545d97', anR),
        message('mcb75d199b102'),
        message('m5182d0419fdf'),
      ],
      message('md1f5c73a04c0'),
    ),
    makeCard(
      'inundacion',
      '🌊',
      message('m3b4b1f8fff8a'),
      fLv,
      message(
        'ma2fc4df55b8c',
        siteFloodsFlag ? message('m388dda35953d') : '',
        caribe ? message('mb6c7cdfaaae8') : message('m93847552708e'),
        NZ.rain30Anom >= 0 ? '+' : '',
        NZ.rain30Anom,
      ),
      [message('md6ed15da1820'), message('ma4b0929fb07e'), message('m806cc8fcda2b')],
      message('mcc0989ae065a'),
    ),
    makeCard(
      'deslizamiento',
      '⛰️',
      message('m6e6f4d6c09bb'),
      dLv,
      steep
        ? message('mc756c873ec56', clsRaw, wet ? message('m7943fd12275e') : '')
        : message('md1df11c63d75'),
      [message('md83b9e9eed5a'), message('m783a67deff19'), message('m041624c1a0e2')],
      message('m45e8dbc51d15'),
    ),
  ];
  raw.sort((a, b) => b.level - a.level);
  const list = raw.map((c, idx) => ({ ...c, defaultOpen: idx === 0 || c.level === 2 }));
  const top = list[0];
  const waTxt = message(
    'm518156c90a8a',
    ctx.sub.n,
    top.title,
    top.levelLabel.toLowerCase(),
    top.recs[0],
  );
  return {
    face: caribe ? message('m498b73931ef5') : message('m04d89b0013c2'),
    caribe,
    list,
    top,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(waTxt)}`,
    history: droughtHistory(ds, ctx),
  };
}
