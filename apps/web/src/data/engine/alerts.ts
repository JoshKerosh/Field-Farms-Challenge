import type { Dataset } from '../real/types';
import { seasonLength, type DemoScenario } from './climate';
import { getGeo, type PlaceContext } from './geo';
import type { Rotation } from './farm';

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
  levelLabel: 'Baja' | 'Media' | 'Alta';
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

const LEVELS: ['Baja' | 'Media' | 'Alta', string, string][] = [
  ['Baja', '#E2F1E5', '#1F5A32'],
  ['Media', '#FDF1D6', '#6B4505'],
  ['Alta', '#F8E1DE', '#8E2A21'],
];

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
    'tu cuenca';

  const hl = (hist[ctx.cuIdx] || []).map((i) => ds.history[i]);
  const nCommunity = hl.filter((h) => h[2] === 'c').length;
  const nInfra = hl.filter((h) => h[2] === 'i').length;

  const nearH = ds.history
    .map((h) => ({ h, d: Math.hypot(h[0] - ctx.loc.x, h[1] - ctx.loc.y) / 10 }))
    .sort((a, b) => a.d - b.d);

  const fmtConn = Math.round(connCu).toLocaleString('es-CR');
  return {
    cuencaName,
    connections: fmtConn,
    nAsadas,
    msg: `Lo que pasa en tu finca llega, cuenca abajo, al agua de ${fmtConn} conexiones de ${nAsadas} acueductos comunales de la cuenca ${cuencaName}.`,
    hasReports: hl.length > 0,
    nCommunity,
    nInfra,
    list: hl.slice(0, 4).map((h) => ({
      title: `${h[3]} (${h[4]})`,
      detail: h[2] === 'c' ? 'Comunidad reportó falta de agua' : h[5],
    })),
    nearest: nearH.length
      ? `${nearH[0].h[3]} (${nearH[0].h[4]}), a ${Math.round(nearH[0].d)} km`
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
  const fLv: 0 | 1 | 2 = (siteFloodsFlag && wet) || (caribe && wet) ? 2 : siteFloodsFlag || caribe ? 1 : 0;
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
      'Sequía',
      sLv,
      `El Niño está en +${ONI.actual.toFixed(1).replace('.', ',')} (muy fuerte). En tu zona el verano sería de ${dryNino} ${dryNino === 1 ? 'mes' : 'meses'} (normal: ${dryNormal}).`,
      [
        minCap < anR
          ? `Ajusta el ganado al pasto: en ${capMes} tu potrero aguantaría unos ${minCap} animales y tienes ${anR}.`
          : `Tu pasto alcanzaría para tus ${anR} animales; igual guarda forraje.`,
        'Guarda agua de lluvia en tanques o reservorios antes de diciembre.',
        'Mide el caudal de tu naciente cada mes y compártelo con tu ASADA.',
      ],
      'NOAA RONI [3] · NASA POWER [1] · MODIS [2]',
    ),
    makeCard(
      'inundacion',
      '🌊',
      'Lluvias e inundación',
      fLv,
      `${siteFloodsFlag ? 'Tu finca está en una zona que se puede inundar. ' : ''}${
        caribe
          ? 'En la vertiente Caribe, El Niño suele traer más lluvia. '
          : 'En el Pacífico, los aguaceros fuertes también llegan con El Niño. '
      }Lluvia de los últimos 30 días: ${NZ.rain30Anom >= 0 ? '+' : ''}${NZ.rain30Anom} % frente a lo normal.`,
      [
        'Sube los animales a los potreros más altos antes de la lluvia fuerte.',
        'Sube la comida y el ensilaje a un lugar seco.',
        'Limpia drenajes y no dejes ganado cerca del río.',
      ],
      'Mapa de zonas inundables [7] · NASA POWER [1]',
    ),
    makeCard(
      'deslizamiento',
      '⛰️',
      'Deslizamiento',
      dLv,
      steep
        ? `Tu finca está en terreno de ladera (clase ${clsRaw}).${wet ? ' Con el suelo tan húmedo, aumenta el riesgo.' : ''}`
        : 'Tu terreno no es de ladera fuerte.',
      [
        'No sobrecargues la ladera con ganado cuando llueve mucho.',
        'Revisa grietas en el suelo y árboles inclinados.',
        'Siembra árboles en la ladera: sus raíces sostienen el suelo.',
      ],
      'Capacidad de uso de la tierra [7] · NASA POWER [1]',
    ),
  ];

  raw.sort((a, b) => b.level - a.level);
  const list = raw.map((c, idx) => ({ ...c, defaultOpen: idx === 0 || c.level === 2 }));
  const top = list[0];
  const waTxt = `Aviso del agua (Sow Water) · subcuenca ${ctx.sub.n}: ${top.title} – riesgo ${top.levelLabel.toLowerCase()}. ${top.recs[0]}`;

  return {
    face: caribe
      ? 'En tu vertiente (Caribe), El Niño suele traer más lluvia e inundaciones.'
      : 'En tu vertiente (Pacífico), El Niño trae sequía: las fuentes se secan.',
    caribe,
    list,
    top,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(waTxt)}`,
    history: droughtHistory(ds, ctx),
  };
}
