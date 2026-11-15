import type { Dataset, RegionCode, YearKey } from '../real/types';
import { f2, MONTHS, monthsText, signedPct } from './format';
import { getGeo, type PlaceContext } from './geo';

export type DemoScenario = 'seco' | 'inund' | 'calor';
export type ClimateScenario = 'normal' | 'nino' | 'nina' | 'seco' | 'humedo' | 'calor' | YearKey;

export const DEMO_SCENARIOS: Record<DemoScenario, { name: string; scen: ClimateScenario }> = {
  seco: { name: 'Sequía extrema', scen: 'seco' },
  inund: { name: 'Inundación', scen: 'humedo' },
  calor: { name: 'Ola de calor', scen: 'calor' },
};

export const REGION_NAMES: Record<RegionCode, string> = {
  N: 'Zona Norte',
  C: 'Caribe húmedo',
  S: 'Pacífico seco',
  M: 'Pacífico central',
  U: 'Pacífico sur',
  V: 'Valle Central',
};

const k12 = (v: number) => Array<number>(12).fill(v);

/** Factor de lluvia mensual por escenario. */
export function rainFactor(ds: Dataset, reg: RegionCode, scen: ClimateScenario): number[] {
  const Y = ds.climate.NASA[reg].yrs;
  if (scen === 'nino')
    return Array.from(
      { length: 12 },
      (_, m) => (Y.y9798.f[m] + Y.y1516.f[m] + Y.y2324.f[m]) / 3,
    );
  if (scen === 'nina') return Y.y1011.f;
  if (scen === 'seco') return k12(0.4);
  if (scen === 'humedo') return k12(1.8);
  if (scen === 'calor') return k12(0.85);
  if (scen in Y) return Y[scen as YearKey].f;
  return k12(1);
}

/** Multiplicador de evapotranspiración mensual por escenario. */
export function etMultiplier(ds: Dataset, reg: RegionCode, scen: ClimateScenario): number[] {
  const Y = ds.climate.NASA[reg].yrs;
  if (scen === 'nino')
    return Array.from(
      { length: 12 },
      (_, m) => (Y.y9798.e[m] + Y.y1516.e[m] + Y.y2324.e[m]) / 3,
    );
  if (scen === 'nina') return Y.y1011.e;
  if (scen === 'seco') return k12(1.12);
  if (scen === 'calor') return k12(1.25);
  if (scen in Y) return Y[scen as YearKey].e;
  return k12(1);
}

/** Meses secos seguidos desde noviembre (lluvia < mitad de la evaporación). */
export function dryRun(ds: Dataset, reg: RegionCode, scen: ClimateScenario): number {
  const fz = rainFactor(ds, reg, scen);
  const ez = etMultiplier(ds, reg, scen);
  const cl = ds.climate.NASA[reg].clim;
  let n = 0;
  for (let j = 0; j < 8; j++) {
    const m = (10 + j) % 12;
    if (cl.rain[m] * fz[m] < 0.5 * cl.et[m] * ez[m]) n++;
    else if (n > 0) break;
  }
  return n;
}

/** Largo del verano: normal (dN) y con El Niño o el modo demo (dE). */
export function seasonLength(ds: Dataset, reg: RegionCode, demo: DemoScenario | null) {
  return {
    dN: dryRun(ds, reg, 'normal'),
    dE: dryRun(ds, reg, demo === 'seco' ? 'seco' : 'nino'),
  };
}

export interface RainClass {
  s: string;
  on: boolean;
  bg: string;
  fg: string;
}

export function rainClass(v: number | null | undefined): RainClass {
  if (v === null || v === undefined) return { s: 'Sin dato', on: false, bg: '#EEF1EE', fg: '#55665B' };
  if (v <= -30) return { s: 'Déficit fuerte', on: true, bg: '#F8E1DE', fg: '#8E2A21' };
  if (v <= -15) return { s: 'Déficit', on: true, bg: '#FDF1D6', fg: '#6B4505' };
  if (v >= 30) return { s: 'Exceso fuerte', on: true, bg: '#DCEAF5', fg: '#1C4E78' };
  if (v >= 15) return { s: 'Exceso', on: true, bg: '#E3EFF3', fg: '#0F4659' };
  return { s: 'Normal', on: false, bg: '#E2F1E5', fg: '#1F5A32' };
}

export interface Signal {
  t: string;
  state: string;
  bg: string;
  fg: string;
  text: string;
  src: string;
  srcCol: string;
  on: boolean;
  /** true cuando el dato es de ejemplo (IMERG/SMAP pendientes, modo demo). */
  simulated: boolean;
}

export interface NinoInfo {
  state: string;
  /** Valor del índice RONI, ej. '+2,0'. */
  val: string;
  /** Posición (2–98 %) en la escala La Niña … Muy fuerte. */
  pos: number;
  effect: string;
  season: string;
}

export function ndviContext(ds: Dataset, reg: RegionCode) {
  const MD = ds.climate.MODIS[reg];
  const ndviNow = Math.max(MD.y26['273'] || 0, MD.y26['289'] || 0);
  const ndviClim = Math.max(MD.clim['273'].m, MD.clim['289'].m);
  const ndviSd = Math.max(MD.clim['273'].sd, MD.clim['289'].sd, 0.03);
  return { ndviNow, ndviClim, ndviSd, zN: (ndviNow - ndviClim) / ndviSd };
}

const oniText = (v: number) => `+${v.toFixed(1).replace('.', ',')}`;

/** Señales de la zona (alertas de clima) con el mismo criterio del prototipo v10. */
export function climateSignals(ds: Dataset, ctx: PlaceContext, demo: DemoScenario | null) {
  const { reg, canton } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const ONI = ds.climate.NASA.ONI;
  const oct = canton.a ? canton.a[0] : null;
  const ytd = canton.a ? canton.a[1] : null;
  const rc = rainClass(oct);
  const ry = rainClass(ytd);
  const ninoText =
    reg === 'C'
      ? 'En tu zona suele traer más lluvia y encharcamiento.'
      : 'En tu zona suele traer menos lluvia, más calor y un verano más largo.';
  const zona = REGION_NAMES[reg];
  const srcN = `NASA POWER · zona ${zona} · hasta el 10 nov 2026`;
  const fmtN = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)} %`;
  const disagree = (a: number | null, b: number | null) =>
    a !== null && b !== null && ((a <= -15 && b >= 15) || (a >= 15 && b <= -15));
  const r30 = rainClass(NZ.rain30Anom);
  const heatOn = NZ.tmax30Anom >= 1.5 || NZ.hotDays30 >= 5;
  const soil =
    NZ.gw30Anom <= -0.08
      ? { s: 'Suelo seco', on: true, bg: '#FDF1D6', fg: '#6B4505' }
      : NZ.gw30Anom >= 0.08
        ? { s: 'Suelo muy húmedo', on: true, bg: '#DCEAF5', fg: '#1C4E78' }
        : { s: 'Normal', on: false, bg: '#E2F1E5', fg: '#1F5A32' };
  const octN = NZ.monthAnom[9];
  const rcN = oct === null ? rainClass(octN) : rc;
  const ryN = ytd === null ? rainClass(NZ.ytdAnom) : ry;
  const nd = ndviContext(ds, reg);
  const ndviSt =
    nd.zN <= -1.5
      ? { s: 'Pasto muy seco', on: true, bg: '#F8E1DE', fg: '#8E2A21' }
      : nd.zN <= -0.75
        ? { s: 'Más seco de lo normal', on: true, bg: '#FDF1D6', fg: '#6B4505' }
        : nd.zN >= 1
          ? { s: 'Más verde de lo normal', on: false, bg: '#E2F1E5', fg: '#1F5A32' }
          : { s: 'Normal', on: false, bg: '#E2F1E5', fg: '#1F5A32' };
  // Valores de ejemplo hasta conectar IMERG/SMAP (cuenta Earthdata): SIMULADOS.
  const MOCK = {
    N: [96, 55, 41, 0.41, 0.33],
    C: [140, 70, 63, 0.46, 0.4],
    S: [38, 60, 17, 0.27, 0.3],
    M: [88, 65, 35, 0.38, 0.35],
    U: [160, 58, 72, 0.45, 0.4],
    V: [70, 40, 29, 0.36, 0.3],
  }[reg];
  const IM = { r7: MOCK[0], n7: MOCK[1], max24: MOCK[2] };
  const SM = { v: MOCK[3], n: MOCK[4] };
  const imOn = IM.max24 >= 50;
  const smSt =
    SM.v - SM.n >= 0.06
      ? { s: 'Más húmedo', bg: '#DCEAF5', fg: '#1C4E78' }
      : SM.v - SM.n <= -0.06
        ? { s: 'Más seco', bg: '#FDF1D6', fg: '#6B4505' }
        : { s: 'Normal', bg: '#E2F1E5', fg: '#1F5A32' };
  const real = '#2E7A43';
  const nasa = '#17617C';
  const sim = '#9C5F1C';

  const list: Signal[] = [
    {
      t: 'El Niño',
      state:
        ONI.actual >= 2
          ? 'Activo · muy fuerte'
          : ONI.actual >= 1.5
            ? 'Activo · fuerte'
            : ONI.actual >= 0.5
              ? 'Activo'
              : 'No activo',
      bg: '#FDF1D6',
      fg: '#6B4505',
      text: `${ninoText} El índice RONI de NOAA está en ${oniText(ONI.actual)}; desde +2,0 se considera muy fuerte.`,
      src: 'NOAA · índice RONI, ago–oct 2026 (provisional)',
      srcCol: real,
      on: ONI.actual >= 0.5,
      simulated: false,
    },
    {
      t: 'Lluvia de octubre',
      state: rcN.s,
      bg: rcN.bg,
      fg: rcN.fg,
      text: `${oct === null ? '' : `Dato local: ${signedPct(oct)}. `}NASA POWER: ${octN === null ? 'sin dato' : fmtN(octN)}.${disagree(oct, octN) ? ' Las dos fuentes no coinciden; confírmalo con el IMN.' : ''}`,
      src: `Datos del equipo (cantón ${canton.n}) y ${srcN}`,
      srcCol: real,
      on: rcN.on,
      simulated: false,
    },
    {
      t: 'Lluvia del año',
      state: ryN.s,
      bg: ryN.bg,
      fg: ryN.fg,
      text: `${ytd === null ? '' : `Dato local: ${signedPct(ytd)}. `}NASA POWER: ${fmtN(NZ.ytdAnom)} de enero a octubre.${disagree(ytd, NZ.ytdAnom) ? ' Las fuentes no coinciden.' : ''}`,
      src: `Datos del equipo y ${srcN}`,
      srcCol: real,
      on: ryN.on,
      simulated: false,
    },
    {
      t: 'Lluvia de los últimos 30 días',
      state: r30.s,
      bg: r30.bg,
      fg: r30.fg,
      text: `${NZ.rain30} mm, ${fmtN(NZ.rain30Anom)} frente a lo normal para estas fechas. Dato preliminar: los meses recientes de NASA POWER se corrigen después.`,
      src: srcN,
      srcCol: nasa,
      on: r30.on,
      simulated: false,
    },
    {
      t: 'Calor extremo',
      state: heatOn ? 'Activo' : 'Normal',
      bg: heatOn ? '#F8E1DE' : '#E2F1E5',
      fg: heatOn ? '#8E2A21' : '#1F5A32',
      text: `Máxima promedio de ${String(NZ.tmax30).replace('.', ',')} °C en 30 días (${NZ.tmax30Anom > 0 ? '+' : '−'}${String(Math.abs(NZ.tmax30Anom)).replace('.', ',')} °C frente a lo normal). ${NZ.hotDays30} días muy calientes.`,
      src: srcN,
      srcCol: nasa,
      on: heatOn,
      simulated: false,
    },
    {
      t: 'Humedad del suelo',
      state: soil.s,
      bg: soil.bg,
      fg: soil.fg,
      text: `Zona de raíces al ${Math.round(NZ.gw30 * 100)} % (lo normal: ${Math.round((NZ.gw30 - NZ.gw30Anom) * 100)} %). La verificación con el satélite SMAP viene después.`,
      src: `NASA POWER · humedad del suelo · zona ${zona}`,
      srcCol: nasa,
      on: soil.on,
      simulated: false,
    },
    {
      t: 'Estado del pasto',
      state: ndviSt.s,
      bg: ndviSt.bg,
      fg: ndviSt.fg,
      text: `Verdor de la vegetación (NDVI) de ${f2(nd.ndviNow)} a mediados de octubre. Lo normal para estas fechas es ${f2(nd.ndviClim)}.`,
      src: `NASA MODIS · imagen del 16 oct 2026 · zona ${zona}`,
      srcCol: nasa,
      on: ndviSt.on,
      simulated: false,
    },
    {
      t: 'Aguacero fuerte',
      state: imOn ? 'Activo' : 'Normal',
      bg: imOn ? '#F8E1DE' : '#E2F1E5',
      fg: imOn ? '#8E2A21' : '#1F5A32',
      text: `${IM.r7} mm en los últimos 7 días (lo normal: ${IM.n7} mm). Máximo en 24 horas: ${IM.max24} mm${imOn ? '; desde 50 mm hay riesgo de crecidas.' : '.'}`,
      src: 'SIMULADO · GPM IMERG (pendiente de Earthdata)',
      srcCol: sim,
      on: imOn,
      simulated: true,
    },
    {
      t: 'Suelo medido por satélite',
      state: smSt.s,
      bg: smSt.bg,
      fg: smSt.fg,
      text: `Humedad de la capa superficial: ${String(SM.v).replace('.', ',')} m³/m³ (lo normal: ${String(SM.n).replace('.', ',')}). Sirve para confirmar la humedad del modelo de NASA POWER.`,
      src: 'SIMULADO · SMAP (pendiente de Earthdata)',
      srcCol: sim,
      on: false,
      simulated: true,
    },
  ];

  if (demo) {
    const override = (t: string, o: Partial<Signal>) => {
      const a = list.find((x) => x.t === t);
      if (a) Object.assign(a, { srcCol: sim, on: true, simulated: true, src: 'SIMULADO · modo demo' }, o);
    };
    if (demo === 'seco') {
      override('Lluvia de los últimos 30 días', { state: 'Déficit fuerte', bg: '#F8E1DE', fg: '#8E2A21', text: '41 mm, −72 % frente a lo normal para estas fechas.' });
      override('Humedad del suelo', { state: 'Suelo seco', bg: '#FDF1D6', fg: '#6B4505', text: 'Zona de raíces al 24 % (lo normal: 62 %).' });
      override('Calor extremo', { state: 'Activo', bg: '#F8E1DE', fg: '#8E2A21', text: 'Máxima promedio +2,1 °C sobre lo normal. 7 días muy calientes.' });
      override('Estado del pasto', { state: 'Pasto muy seco', bg: '#F8E1DE', fg: '#8E2A21', text: 'Verdor de la vegetación (NDVI) de 0,38. Lo normal para estas fechas es 0,66.' });
    } else if (demo === 'inund') {
      override('Lluvia de los últimos 30 días', { state: 'Exceso fuerte', bg: '#DCEAF5', fg: '#1C4E78', text: '980 mm, +190 % frente a lo normal para estas fechas.' });
      override('Humedad del suelo', { state: 'Suelo saturado', bg: '#DCEAF5', fg: '#1C4E78', text: 'Zona de raíces al 99 %: el suelo ya no absorbe más agua.' });
      override('Aguacero fuerte', { state: 'Activo', bg: '#F8E1DE', fg: '#8E2A21', text: '112 mm en 24 horas. Riesgo de crecida en ríos y quebradas.' });
    } else {
      override('Calor extremo', { state: 'Activo', bg: '#F8E1DE', fg: '#8E2A21', text: 'Máxima promedio de 37,8 °C (+3,4 °C sobre lo normal). 11 días muy calientes.' });
      override('Humedad del suelo', { state: 'Suelo seco', bg: '#FDF1D6', fg: '#6B4505', text: 'Zona de raíces al 41 % (lo normal: 63 %).' });
    }
  }

  const REFOF: Record<string, string> = {
    'El Niño': '[3][4]',
    'Lluvia de octubre': '[8][1]',
    'Lluvia del año': '[8][1]',
    'Lluvia de los últimos 30 días': '[1]',
    'Calor extremo': '[1]',
    'Humedad del suelo': '[1]',
    'Estado del pasto': '[2]',
    'Aguacero fuerte': '[11]',
    'Suelo medido por satélite': '[11]',
  };
  list.forEach((a) => {
    const rf = a.src.startsWith('SIMULADO · modo demo') ? '[12]' : REFOF[a.t] || '';
    if (rf && !a.src.includes(' · fuente ')) a.src = `${a.src} · fuente ${rf}`;
  });

  const nino: NinoInfo = {
    state:
      ONI.actual >= 2
        ? 'Muy fuerte'
        : ONI.actual >= 1.5
          ? 'Fuerte'
          : ONI.actual >= 0.5
            ? 'Activo'
            : ONI.actual <= -0.5
              ? 'La Niña'
              : 'Neutral',
    val: `${ONI.actual >= 0 ? '+' : '−'}${Math.abs(ONI.actual).toFixed(1).replace('.', ',')}`,
    pos: Math.round(Math.max(2, Math.min(98, ((ONI.actual + 2) / 5) * 100))),
    effect:
      reg === 'C'
        ? 'En tu zona suele traer más lluvia y encharcamiento.'
        : 'En tu zona suele traer menos lluvia y un verano más largo.',
    season: ONI.temporada,
  };
  const nActive = list.filter((a) => a.on && a.t !== 'El Niño').length;
  return { list, nino, nActive, NZ, ONI };
}

export interface PrepItem {
  num: string;
  t: string;
  d: string;
  when: string;
  kind: 'dry' | 'wet';
}

/** Acciones "Prepárate" (plan del MAG ante El Niño y buenas prácticas). */
export function prepare(ds: Dataset, ctx: PlaceContext, demo: DemoScenario | null) {
  const { reg, canton, flood } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const oct = canton.a ? canton.a[0] : null;
  const ytd = canton.a ? canton.a[1] : null;
  const dry = demo ? demo !== 'inund' : reg !== 'C' || (oct !== null && oct <= -15);
  const wet = demo ? demo === 'inund' : reg === 'C' || (ytd !== null && ytd >= 30) || flood || NZ.rain30Anom >= 50;
  const DRY: [string, string, string][] = [
    ['Guarda comida para el verano', 'Haz ensilaje o heno ahora que hay pasto. Planea para un verano más largo de lo normal.', 'Ahora'],
    ['Asegura el agua del ganado', 'Revisa cuánto da tu naciente o pozo y si alcanza para tus animales. Pon tanques o un reservorio.', 'Ahora'],
    ['Cosecha la lluvia', 'Recoge el agua de los techos en tanques mientras todavía llueve.', 'Ahora'],
    ['Protege nacientes y quebradas', 'Cerca las nacientes y deja árboles en las orillas: guardan el agua por más tiempo.', 'Antes del verano'],
    ['No quemes', 'Con El Niño hay más incendios. Haz rondas cortafuego alrededor de potreros secos.', 'En verano'],
    ['Ajusta cuántos animales tienes', 'Si el pasto no va a alcanzar, vende a tiempo y no cuando ya bajaron los precios.', 'Antes del verano'],
  ];
  const WET: [string, string, string][] = [
    ['Ten un potrero alto de refugio', 'Si se inunda, mueve el ganado a zonas altas antes de la crecida.', 'Ahora'],
    ['Bebederos lejos del río', 'Así el ganado no baja al cauce ni queda atrapado en una crecida.', 'Ahora'],
    ['Limpia drenajes', 'Revisa canales y zanjas para que el agua salga rápido de los potreros.', 'Ahora'],
    ['No siembres en lo más bajo', 'Deja las partes que se encharcan para pasto o arroz.', 'Al sembrar'],
    ['Guarda alimento seco', 'Ten heno o concentrado por si el pasto queda bajo el agua.', 'Ahora'],
  ];
  const HEAT: [string, string, string][] = [
    ['Sombra y agua fresca', 'Con calor el ganado come menos. Los árboles en el potrero y el agua fresca ayudan.', 'En verano'],
  ];
  const pl: [string, string, string, 'dry' | 'wet'][] = [];
  if (dry) DRY.forEach((a) => pl.push([...a, 'dry']));
  if (wet) WET.forEach((a) => pl.push([...a, 'wet']));
  if (reg !== 'C') HEAT.forEach((a) => pl.push([...a, 'dry']));
  const items: PrepItem[] = pl.slice(0, 8).map((a, k) => ({
    num: String(k + 1),
    t: a[0],
    d: a[1],
    when: a[2],
    kind: a[3],
  }));
  return {
    title:
      dry && wet
        ? 'Prepárate para sequía y para lluvias fuertes'
        : dry
          ? 'Prepárate para menos lluvia y más calor'
          : 'Prepárate para más lluvia y encharcamiento',
    sub: `Acciones para tu finca según las alertas activas en ${canton.n}.`,
    items,
    info: [
      { t: '¿Qué es El Niño?', d: 'Un calentamiento del océano Pacífico que cambia la lluvia en el país. Suele durar de 9 a 12 meses. En el Pacífico y el Valle Central trae menos lluvia; en el Caribe, más.' },
      { t: '¿Y La Niña?', d: 'Lo contrario: el Pacífico se enfría. Suele traer más lluvia en el Pacífico y a veces menos en el Caribe.' },
    ],
  };
}

const PAL: [number, [number, number, number]][] = [
  [0.15, [139, 94, 52]],
  [0.35, [201, 163, 90]],
  [0.5, [222, 212, 122]],
  [0.65, [141, 191, 90]],
  [0.8, [46, 122, 67]],
  [0.95, [18, 82, 45]],
];

/** Color de la rampa de verdor (café seco → verde bosque). */
export function ndviColor(v: number): string {
  if (v <= PAL[0][0]) return `rgb(${PAL[0][1].join(',')})`;
  for (let i = 1; i < PAL.length; i++) {
    if (v <= PAL[i][0]) {
      const a = PAL[i - 1];
      const b = PAL[i];
      const t = (v - a[0]) / (b[0] - a[0]);
      return `rgb(${a[1].map((c, j) => Math.round(c + (b[1][j] - c) * t)).join(',')})`;
    }
  }
  return `rgb(${PAL[PAL.length - 1][1].join(',')})`;
}

export interface SatelliteView {
  tiles: { x: number; y: number; col: string }[];
  frames: number;
  frame: number;
  date: string;
  first: string;
  last: string;
  /** Verdor del cuadro mostrado. */
  v: string;
  verd: { k: 'ambos' | 'inund' | 'seca' | 'viene' | 'ok'; icon: string; t: string; s: string; bg: string };
  acts: string[];
  sigs: { n: string; v: string; d: string; st: string; col: string; src: string }[];
  spark: { line: string; area: string; dotX: number; dotY: number; normX: number; normY: number };
  /** Serie de verdor 2026 por imagen (19 imágenes MODIS de 250 m). */
  serie: number[];
  floodTiles: number;
  src: string;
}

/** Serie de verdor 2026 (limpia nubes) con ajustes del modo demo. */
export function ndviSeries(ds: Dataset, reg: RegionCode, demo: DemoScenario | null) {
  const MD = ds.climate.MODIS[reg];
  const doys = Object.keys(MD.y26).sort();
  const raw = doys.map((k) => MD.y26[k]);
  const clean = raw.map((v, i) =>
    Math.max(v, i > 0 ? raw[i - 1] : 0, i > 1 && raw[i - 1] < 0.3 ? raw[i - 2] : 0),
  );
  const nF = clean.length;
  let serie = clean.slice();
  if (demo === 'seco')
    serie = serie.map((v, i) => (i < nF - 6 ? v : Math.max(0.22, v - (i - (nF - 7)) * 0.075)));
  if (demo === 'calor')
    serie = serie.map((v, i) => (i < nF - 4 ? v : Math.max(0.3, v - (i - (nF - 5)) * 0.05)));
  return { doys, serie, nF };
}

const dateOfDoy = (k: string) => {
  const d = new Date(2026, 0, Number(k));
  return `${d.getDate()} ${MONTHS[d.getMonth()]} 2026`;
};

export function satelliteView(
  ds: Dataset,
  ctx: PlaceContext,
  demo: DemoScenario | null,
  frame: number | null,
): SatelliteView {
  const { reg, subId } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const nd = ndviContext(ds, reg);
  const { doys, serie, nF } = ndviSeries(ds, reg, demo);
  const fIdx = frame === null ? nF - 1 : Math.min(frame, nF - 1);
  const vNow = serie[nF - 1];
  const vPrev = serie[nF - 3];
  const trend = vNow - vPrev;
  const satZ = demo === 'seco' ? -2.6 : demo === 'calor' ? -1.3 : nd.zN;
  const wetNow =
    demo === 'inund' || (!demo && (NZ.rain30Anom >= 100 || (NZ.gw30 >= 0.88 && NZ.gw30Anom >= 0.05)));
  const { dN, dE } = seasonLength(ds, reg, demo);
  const satB = getGeo(ds).satBase(subId);
  const vF = serie[fIdx];
  const tiles = satB.map((t) => {
    const v = vF + t.n * 0.07 + t.adj * (vF < 0.6 ? 1.6 : 1);
    const water = demo === 'inund' && t.fl && fIdx >= nF - 2;
    return {
      x: t.x,
      y: t.y,
      col: water ? (t.n > 0 ? '#2F7FC1' : '#4A97D6') : ndviColor(Math.max(0.05, Math.min(0.95, v))),
    };
  });
  const floodTiles = demo === 'inund' ? satB.filter((t) => t.fl).length : 0;

  let verd: SatelliteView['verd'];
  if (wetNow && dE > dN && demo !== 'inund')
    verd = { k: 'ambos', icon: '⇅', t: 'Mucha agua hoy, verano largo después', s: `Ahora sobra lluvia, pero con El Niño el verano sería de ${monthsText(dE)} en vez de ${monthsText(dN)}.`, bg: '#1C4E78' };
  else if (wetNow)
    verd = { k: 'inund', icon: '≋', t: demo === 'inund' ? 'La cuenca se está inundando' : 'Mucha agua en la cuenca', s: 'Lluvia y suelo muy por encima de lo normal: el suelo ya casi no absorbe.', bg: '#1C4E78' };
  else if (satZ <= -1 || trend <= -0.1)
    verd = { k: 'seca', icon: '▼', t: 'La cuenca se está secando', s: trend <= -0.03 ? `El verdor bajó ${Math.round(Math.abs(trend) * 100)} puntos en un mes y está por debajo de lo normal.` : 'El verdor está por debajo de lo normal para estas fechas.', bg: '#8E2A21' };
  else if (dE > dN)
    verd = { k: 'viene', icon: '◔', t: 'Verde hoy, seco después', s: `El pasto está bien, pero con El Niño el verano sería de ${monthsText(dE)} en vez de ${monthsText(dN)}.`, bg: '#9C5F1C' };
  else
    verd = { k: 'ok', icon: '●', t: 'La cuenca está estable', s: 'Verdor, lluvia y suelo dentro de lo normal para estas fechas.', bg: '#2E7A43' };

  const extra = Math.max(1, dE - dN);
  const ACT = {
    ambos: ['Aprovecha la humedad: siembra el forraje para el verano en las próximas 2–3 semanas, en las partes altas.', `Guarda ${extra} mes(es) extra de comida para el ganado.`, 'En el plan usamos el clima de años con El Niño fuerte.'],
    inund: ['Mueve el ganado a potreros altos antes de la próxima lluvia fuerte.', 'No siembres en las partes bajas hasta que baje el agua.', 'En el plan priorizamos cultivos que aguantan encharcamiento.'],
    seca: ['Haz ensilaje o heno con el pasto que queda.', 'Reduce animales o compra alimento antes de que suban los precios.', 'En el plan priorizamos forraje resistente a sequía.'],
    viene: ['Siembra el forraje para el verano en las próximas 2–3 semanas, mientras hay humedad.', `Guarda ${extra} mes(es) extra de comida para el ganado.`, 'En el plan usamos el clima de años con El Niño fuerte.'],
    ok: ['Buen momento para renovar potreros o sembrar abono verde.', 'Sigue revisando cada 16 días: así llega una imagen nueva del satélite.', 'En el plan usamos un año normal.'],
  }[verd.k];

  const W = 300;
  const H = 70;
  const mn = 0.1;
  const mx = 0.95;
  const pts = serie.map((v, i) => [
    Math.round((i / (nF - 1)) * W * 10) / 10,
    Math.round((1 - (v - mn) / (mx - mn)) * H * 10) / 10,
  ]);
  const spark = {
    line: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(''),
    area: `M0,${H}${pts.map((p) => `L${p[0]},${p[1]}`).join('')}L${W},${H}Z`,
    dotX: pts[fIdx][0],
    dotY: pts[fIdx][1],
    normY: Math.round((1 - (nd.ndviClim - mn) / (mx - mn)) * H * 10) / 10,
    normX: Math.round(((nF - 3) / (nF - 1)) * W),
  };

  const soilPct = demo === 'inund' ? 99 : demo === 'seco' ? 24 : Math.round(NZ.gw30 * 100);
  const soilSat = demo === 'inund' || (!demo && NZ.gw30 >= 0.9);
  const soilWet = !demo && NZ.gw30Anom >= 0.08;
  const soilDry = demo === 'seco' || (!demo && NZ.gw30Anom <= -0.08);
  const simSrc = 'SIMULADO · modo demo';
  const sigs = [
    { n: 'Verdor', v: f2(vNow), d: `${satZ >= 0 ? '+' : '−'}${Math.abs(satZ).toFixed(1).replace('.', ',')} σ`, st: satZ <= -1 ? 'Bajo' : satZ >= 1 ? 'Alto' : 'Normal', col: satZ <= -1 ? '#E0705F' : '#7BC47F', src: demo ? simSrc : 'MODIS [2]' },
    { n: 'Tendencia', v: `${trend >= 0 ? '+' : '−'}${Math.round(Math.abs(trend) * 100)}`, d: 'en 1 mes', st: trend <= -0.06 ? 'Retrocede' : trend >= 0.06 ? 'Reverdece' : 'Estable', col: trend <= -0.06 ? '#E0705F' : '#7BC47F', src: demo ? simSrc : 'MODIS [2]' },
    { n: 'Suelo', v: `${soilPct} %`, d: 'zona de raíces', st: soilSat ? 'Saturado' : soilWet ? 'Muy húmedo' : soilDry ? 'Seco' : 'Normal', col: soilSat || soilWet ? '#6FA8DC' : soilDry ? '#E0705F' : '#7BC47F', src: demo ? simSrc : 'POWER [1]' },
    { n: 'Verano', v: monthsText(dE), d: `normal: ${dN}`, st: dE > dN ? 'Más largo' : 'Normal', col: dE > dN ? '#F2B53A' : '#7BC47F', src: 'POWER + NOAA [1][3]' },
  ];

  return {
    tiles,
    frames: nF,
    frame: fIdx,
    date: dateOfDoy(doys[fIdx]),
    first: dateOfDoy(doys[0]).replace(' 2026', ''),
    last: dateOfDoy(doys[nF - 1]).replace(' 2026', ''),
    v: f2(vF),
    verd,
    acts: ACT,
    sigs,
    spark,
    serie,
    floodTiles,
    src: demo
      ? 'SIMULADO · modo demo, sobre datos de NASA MODIS [2] y NASA POWER [1]'
      : `Verdor de la zona ${REGION_NAMES[reg]}: NASA MODIS, ${nF} imágenes de 2026, limpiando nubes [2]. El patrón dentro de la subcuenca es ilustrativo, según capacidad de uso [7].`,
  };
}
