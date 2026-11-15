import { messageLanguage as displayLanguage } from '../../i18n/messages';
import { localizedResource, message } from '../../i18n/messages';
import type { Dataset, RegionCode, YearKey } from '../real/types';
import { f2, MONTHS, monthsText, signedPct } from './format';
import { getGeo, type PlaceContext } from './geo';
export type DemoScenario = 'seco' | 'inund' | 'calor';
export type ClimateScenario = 'normal' | 'nino' | 'nina' | 'seco' | 'humedo' | 'calor' | YearKey;
export const DEMO_SCENARIOS: Record<
  DemoScenario,
  {
    name: string;
    scen: ClimateScenario;
  }
> = {
  seco: { name: 'Sequía extrema', scen: 'seco' },
  inund: { name: 'Inundación', scen: 'humedo' },
  calor: { name: 'Ola de calor', scen: 'calor' },
};
export const REGION_NAMES: Record<RegionCode, string> = localizedResource(() => ({
  N: message('ma1359d140216'),
  C: message('m3374c7a74dbc'),
  S: message('ma8f56ea8908c'),
  M: message('m25a6f23cb321'),
  U: message('ma8c767bf35ca'),
  V: message('mab29bbf1c58f'),
}));
const k12 = (v: number) => Array<number>(12).fill(v);
/** Monthly rainfall factor per scenario. */
export function rainFactor(ds: Dataset, reg: RegionCode, scen: ClimateScenario): number[] {
  const Y = ds.climate.NASA[reg].yrs;
  if (scen === 'nino')
    return Array.from({ length: 12 }, (_, m) => (Y.y9798.f[m] + Y.y1516.f[m] + Y.y2324.f[m]) / 3);
  if (scen === 'nina') return Y.y1011.f;
  if (scen === 'seco') return k12(0.4);
  if (scen === 'humedo') return k12(1.8);
  if (scen === 'calor') return k12(0.85);
  if (scen in Y) return Y[scen as YearKey].f;
  return k12(1);
}
/** Monthly evapotranspiration multiplier per scenario. */
export function etMultiplier(ds: Dataset, reg: RegionCode, scen: ClimateScenario): number[] {
  const Y = ds.climate.NASA[reg].yrs;
  if (scen === 'nino')
    return Array.from({ length: 12 }, (_, m) => (Y.y9798.e[m] + Y.y1516.e[m] + Y.y2324.e[m]) / 3);
  if (scen === 'nina') return Y.y1011.e;
  if (scen === 'seco') return k12(1.12);
  if (scen === 'calor') return k12(1.25);
  if (scen in Y) return Y[scen as YearKey].e;
  return k12(1);
}
/** Consecutive dry months from November (rainfall < half of evaporation). */
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
/** Length of the dry season: normal (dN) and with El Niño or demo mode (dE). */
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
  if (v === null || v === undefined)
    return { s: message('m102d6d7274f9'), on: false, bg: '#EEF1EE', fg: '#55665B' };
  if (v <= -30) return { s: message('md85bed84c8ee'), on: true, bg: '#F8E1DE', fg: '#8E2A21' };
  if (v <= -15) return { s: message('mc2614d5df513'), on: true, bg: '#FDF1D6', fg: '#6B4505' };
  if (v >= 30) return { s: message('mdf4cc6809570'), on: true, bg: '#DCEAF5', fg: '#1C4E78' };
  if (v >= 15) return { s: message('m02c872e4ddff'), on: true, bg: '#E3EFF3', fg: '#0F4659' };
  return { s: message('ma7248eeb45eb'), on: false, bg: '#E2F1E5', fg: '#1F5A32' };
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
  /** true when the data is an example (IMERG/SMAP pending, demo mode). */
  simulated: boolean;
}
export interface NinoInfo {
  state: string;
  /** RONI index value, e.g. '+2,0'. */
  val: string;
  /** Position (2–98 %) on the La Niña … Very strong scale. */
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
const oniText = (v: number) =>
  `+${v.toFixed(1).replace('.', displayLanguage() === 'en' ? '.' : ',')}`;
/** Signals for the area (weather alerts) with the same criteria as the v10 prototype. */
export function climateSignals(ds: Dataset, ctx: PlaceContext, demo: DemoScenario | null) {
  const { reg, canton } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const ONI = ds.climate.NASA.ONI;
  const oct = canton.a ? canton.a[0] : null;
  const ytd = canton.a ? canton.a[1] : null;
  const rc = rainClass(oct);
  const ry = rainClass(ytd);
  const ninoText = reg === 'C' ? message('m46e558fecfa0') : message('m717a3fd77140');
  const zona = REGION_NAMES[reg];
  const srcN = message('mde54e4b7d786', zona);
  const fmtN = (v: number) => message('m3d32b6e19086', v > 0 ? '+' : '−', Math.abs(v));
  const disagree = (a: number | null, b: number | null) =>
    a !== null && b !== null && ((a <= -15 && b >= 15) || (a >= 15 && b <= -15));
  const r30 = rainClass(NZ.rain30Anom);
  const heatOn = NZ.tmax30Anom >= 1.5 || NZ.hotDays30 >= 5;
  const soil =
    NZ.gw30Anom <= -0.08
      ? { s: message('me24404874d3d'), on: true, bg: '#FDF1D6', fg: '#6B4505' }
      : NZ.gw30Anom >= 0.08
        ? { s: message('m977e98f5f758'), on: true, bg: '#DCEAF5', fg: '#1C4E78' }
        : { s: message('ma7248eeb45eb'), on: false, bg: '#E2F1E5', fg: '#1F5A32' };
  const octN = NZ.monthAnom[9];
  const rcN = oct === null ? rainClass(octN) : rc;
  const ryN = ytd === null ? rainClass(NZ.ytdAnom) : ry;
  const nd = ndviContext(ds, reg);
  const ndviSt =
    nd.zN <= -1.5
      ? { s: message('m49affa941bbf'), on: true, bg: '#F8E1DE', fg: '#8E2A21' }
      : nd.zN <= -0.75
        ? { s: message('md7ff9ca9e600'), on: true, bg: '#FDF1D6', fg: '#6B4505' }
        : nd.zN >= 1
          ? { s: message('mf9c77adf2c49'), on: false, bg: '#E2F1E5', fg: '#1F5A32' }
          : { s: message('ma7248eeb45eb'), on: false, bg: '#E2F1E5', fg: '#1F5A32' };
  // Example values until IMERG/SMAP are connected (Earthdata account): SIMULATED.
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
      ? { s: message('ma109874584ca'), bg: '#DCEAF5', fg: '#1C4E78' }
      : SM.v - SM.n <= -0.06
        ? { s: message('m11a6c74f7b46'), bg: '#FDF1D6', fg: '#6B4505' }
        : { s: message('ma7248eeb45eb'), bg: '#E2F1E5', fg: '#1F5A32' };
  const real = '#2E7A43';
  const nasa = '#17617C';
  const sim = '#9C5F1C';
  const list: Signal[] = [
    {
      t: message('m24536845b70c'),
      state:
        ONI.actual >= 2
          ? message('m87f3f3b0630e')
          : ONI.actual >= 1.5
            ? message('m188f6fa8e74f')
            : ONI.actual >= 0.5
              ? message('m723858144bd5')
              : message('m1879f4a1c853'),
      bg: '#FDF1D6',
      fg: '#6B4505',
      text: message('m7c8ca159c550', ninoText, oniText(ONI.actual)),
      src: message('m4d8b55527dcd'),
      srcCol: real,
      on: ONI.actual >= 0.5,
      simulated: false,
    },
    {
      t: message('m6b83815e49fa'),
      state: rcN.s,
      bg: rcN.bg,
      fg: rcN.fg,
      text: message(
        'm807cd0a0164f',
        oct === null ? '' : message('m844ca5b18505', signedPct(oct)),
        octN === null ? message('m43750f5acdff') : fmtN(octN),
        disagree(oct, octN) ? message('m4a559ea93713') : '',
      ),
      src: message('m312dfbbe4f05', canton.n, srcN),
      srcCol: real,
      on: rcN.on,
      simulated: false,
    },
    {
      t: message('m7a8d5c0507b7'),
      state: ryN.s,
      bg: ryN.bg,
      fg: ryN.fg,
      text: message(
        'm0717e9ff6bdf',
        ytd === null ? '' : message('m844ca5b18505', signedPct(ytd)),
        fmtN(NZ.ytdAnom),
        disagree(ytd, NZ.ytdAnom) ? message('m36b957416937') : '',
      ),
      src: message('m9dc14d57346f', srcN),
      srcCol: real,
      on: ryN.on,
      simulated: false,
    },
    {
      t: message('m0936d4ad0dd6'),
      state: r30.s,
      bg: r30.bg,
      fg: r30.fg,
      text: message('m85021db8c5ca', NZ.rain30, fmtN(NZ.rain30Anom)),
      src: srcN,
      srcCol: nasa,
      on: r30.on,
      simulated: false,
    },
    {
      t: message('md4f6c87fb5a2'),
      state: heatOn ? message('m723858144bd5') : message('ma7248eeb45eb'),
      bg: heatOn ? '#F8E1DE' : '#E2F1E5',
      fg: heatOn ? '#8E2A21' : '#1F5A32',
      text: message(
        'm95ac276aa351',
        String(NZ.tmax30).replace('.', displayLanguage() === 'en' ? '.' : ','),
        NZ.tmax30Anom > 0 ? '+' : '−',
        String(Math.abs(NZ.tmax30Anom)).replace('.', displayLanguage() === 'en' ? '.' : ','),
        NZ.hotDays30,
      ),
      src: srcN,
      srcCol: nasa,
      on: heatOn,
      simulated: false,
    },
    {
      t: message('m894047577f48'),
      state: soil.s,
      bg: soil.bg,
      fg: soil.fg,
      text: message(
        'm2723a96a0c60',
        Math.round(NZ.gw30 * 100),
        Math.round((NZ.gw30 - NZ.gw30Anom) * 100),
      ),
      src: message('mc80b8ea9768b', zona),
      srcCol: nasa,
      on: soil.on,
      simulated: false,
    },
    {
      t: message('mf9e8a954b510'),
      state: ndviSt.s,
      bg: ndviSt.bg,
      fg: ndviSt.fg,
      text: message('m388b7c7e0974', f2(nd.ndviNow), f2(nd.ndviClim)),
      src: message('m42b5422276e2', zona),
      srcCol: nasa,
      on: ndviSt.on,
      simulated: false,
    },
    {
      t: message('mde70e4db900e'),
      state: imOn ? message('m723858144bd5') : message('ma7248eeb45eb'),
      bg: imOn ? '#F8E1DE' : '#E2F1E5',
      fg: imOn ? '#8E2A21' : '#1F5A32',
      text: message('md1af48a8dcb0', IM.r7, IM.n7, IM.max24, imOn ? message('m4074ae3c3430') : '.'),
      src: message('mee593bebfdd4'),
      srcCol: sim,
      on: imOn,
      simulated: true,
    },
    {
      t: message('mfb13acf69c0e'),
      state: smSt.s,
      bg: smSt.bg,
      fg: smSt.fg,
      text: message(
        'md6368f2a701c',
        String(SM.v).replace('.', displayLanguage() === 'en' ? '.' : ','),
        String(SM.n).replace('.', displayLanguage() === 'en' ? '.' : ','),
      ),
      src: message('m87a89ee6b7a7'),
      srcCol: sim,
      on: false,
      simulated: true,
    },
  ];
  if (demo) {
    const override = (t: string, o: Partial<Signal>) => {
      const a = list.find((x) => x.t === t);
      if (a)
        Object.assign(
          a,
          { srcCol: sim, on: true, simulated: true, src: message('md1f8d6589964') },
          o,
        );
    };
    if (demo === 'seco') {
      override(message('m0936d4ad0dd6'), {
        state: message('md85bed84c8ee'),
        bg: '#F8E1DE',
        fg: '#8E2A21',
        text: message('me969a837d857'),
      });
      override(message('m894047577f48'), {
        state: message('me24404874d3d'),
        bg: '#FDF1D6',
        fg: '#6B4505',
        text: message('m5398344ad396'),
      });
      override(message('md4f6c87fb5a2'), {
        state: message('m723858144bd5'),
        bg: '#F8E1DE',
        fg: '#8E2A21',
        text: message('m66280fcd723c'),
      });
      override(message('mf9e8a954b510'), {
        state: message('m49affa941bbf'),
        bg: '#F8E1DE',
        fg: '#8E2A21',
        text: message('m595f2a9dad13'),
      });
    } else if (demo === 'inund') {
      override(message('m0936d4ad0dd6'), {
        state: message('mdf4cc6809570'),
        bg: '#DCEAF5',
        fg: '#1C4E78',
        text: message('m9aca667803b0'),
      });
      override(message('m894047577f48'), {
        state: message('m521bb83f746d'),
        bg: '#DCEAF5',
        fg: '#1C4E78',
        text: message('m74c2c81addac'),
      });
      override(message('mde70e4db900e'), {
        state: message('m723858144bd5'),
        bg: '#F8E1DE',
        fg: '#8E2A21',
        text: message('m5b97fdfd64be'),
      });
    } else {
      override(message('md4f6c87fb5a2'), {
        state: message('m723858144bd5'),
        bg: '#F8E1DE',
        fg: '#8E2A21',
        text: message('m828afa7b6ab9'),
      });
      override(message('m894047577f48'), {
        state: message('me24404874d3d'),
        bg: '#FDF1D6',
        fg: '#6B4505',
        text: message('mef4bbf200180'),
      });
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
    const rf = a.src.startsWith(message('md1f8d6589964')) ? '[12]' : REFOF[a.t] || '';
    if (rf && !a.src.includes(message('mbe5419236e1a')))
      a.src = message('m1efa22bf40b1', a.src, rf);
  });
  const nino: NinoInfo = {
    state:
      ONI.actual >= 2
        ? message('md00764623679')
        : ONI.actual >= 1.5
          ? message('m386b5d1f67b1')
          : ONI.actual >= 0.5
            ? message('m723858144bd5')
            : ONI.actual <= -0.5
              ? message('m9c96f08f5e57')
              : message('m1c6ac69f1e5d'),
    val: `${ONI.actual >= 0 ? '+' : '−'}${Math.abs(ONI.actual)
      .toFixed(1)
      .replace('.', displayLanguage() === 'en' ? '.' : ',')}`,
    pos: Math.round(Math.max(2, Math.min(98, ((ONI.actual + 2) / 5) * 100))),
    effect: reg === 'C' ? message('m46e558fecfa0') : message('mfde8e5045c9f'),
    season: ONI.temporada,
  };
  const nActive = list.filter((a) => a.on && a.t !== message('m24536845b70c')).length;
  return { list, nino, nActive, NZ, ONI };
}
export interface PrepItem {
  num: string;
  t: string;
  d: string;
  when: string;
  kind: 'dry' | 'wet';
}
/** "Prepárate" actions (MAG's El Niño plan and good practices). */
export function prepare(ds: Dataset, ctx: PlaceContext, demo: DemoScenario | null) {
  const { reg, canton, flood } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const oct = canton.a ? canton.a[0] : null;
  const ytd = canton.a ? canton.a[1] : null;
  const dry = demo ? demo !== 'inund' : reg !== 'C' || (oct !== null && oct <= -15);
  const wet = demo
    ? demo === 'inund'
    : reg === 'C' || (ytd !== null && ytd >= 30) || flood || NZ.rain30Anom >= 50;
  const DRY: [string, string, string][] = [
    [message('ma6248a59fffc'), message('m8b2f2c6ae9e3'), message('m00cd944998c0')],
    [message('mf6045e064afa'), message('m27182ba1e866'), message('m00cd944998c0')],
    [message('m44e343231483'), message('mf346775c0002'), message('m00cd944998c0')],
    [message('m2393c66a8a4d'), message('mdbea5f6ac389'), message('m4976e39d1055')],
    [message('m9844e1f4cec3'), message('m9bab91a65daa'), message('m87603c76b2ff')],
    [message('ma7e9e023319f'), message('mc3efdacdff18'), message('m4976e39d1055')],
  ];
  const WET: [string, string, string][] = [
    [message('mcd86cdb7d778'), message('m4ce1214f1646'), message('m00cd944998c0')],
    [message('mdda103fc4b7b'), message('m711c3c555c86'), message('m00cd944998c0')],
    [message('mcc4633ef5a30'), message('m00912bbcbc86'), message('m00cd944998c0')],
    [message('m5f571521c816'), message('mb3664adb7c07'), message('mb31983c4ecc9')],
    [message('md35cc3c8c66d'), message('m0c553c71bde8'), message('m00cd944998c0')],
  ];
  const HEAT: [string, string, string][] = [
    [message('mb33875e9801f'), message('m15afd67d0d49'), message('m87603c76b2ff')],
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
        ? message('mcb525116249a')
        : dry
          ? message('m6cc11ae1f6f1')
          : message('m26360c37b0a6'),
    sub: message('m0a0c083eb366', canton.n),
    items,
    info: [
      { t: message('m538392d9e0ec'), d: message('m7e48f59c789f') },
      { t: message('mb5679942f7d7'), d: message('m2d5534f9f47d') },
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
/** Greenness ramp color (dry brown → forest green). */
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
  tiles: {
    x: number;
    y: number;
    col: string;
  }[];
  frames: number;
  frame: number;
  date: string;
  first: string;
  last: string;
  /** Greenness of the cell shown. */
  v: string;
  verd: {
    k: 'ambos' | 'inund' | 'seca' | 'viene' | 'ok';
    icon: string;
    t: string;
    s: string;
    bg: string;
  };
  acts: string[];
  sigs: {
    n: string;
    v: string;
    d: string;
    st: string;
    col: string;
    src: string;
  }[];
  spark: {
    line: string;
    area: string;
    dotX: number;
    dotY: number;
    normX: number;
    normY: number;
  };
  /** 2026 greenness series per image (19 MODIS 250 m images). */
  serie: number[];
  floodTiles: number;
  src: string;
}
/** 2026 greenness series (cloud-cleaned) with demo mode adjustments. */
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
  return message('ma5db1f8f7557', d.getDate(), MONTHS[d.getMonth()]);
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
    demo === 'inund' ||
    (!demo && (NZ.rain30Anom >= 100 || (NZ.gw30 >= 0.88 && NZ.gw30Anom >= 0.05)));
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
    verd = {
      k: 'ambos',
      icon: '⇅',
      t: message('mc9b12a37d78e'),
      s: message('m37f6c59bb723', monthsText(dE), monthsText(dN)),
      bg: '#1C4E78',
    };
  else if (wetNow)
    verd = {
      k: 'inund',
      icon: '≋',
      t: demo === 'inund' ? message('m27063000f105') : message('mf513e6950ee1'),
      s: message('m76febfd49d2f'),
      bg: '#1C4E78',
    };
  else if (satZ <= -1 || trend <= -0.1)
    verd = {
      k: 'seca',
      icon: '▼',
      t: message('m7041c4f4f9bf'),
      s:
        trend <= -0.03
          ? message('md9bc7c9502bf', Math.round(Math.abs(trend) * 100))
          : message('m6d93c1559a4a'),
      bg: '#8E2A21',
    };
  else if (dE > dN)
    verd = {
      k: 'viene',
      icon: '◔',
      t: message('mde153772e07e'),
      s: message('m67efe21f71b9', monthsText(dE), monthsText(dN)),
      bg: '#9C5F1C',
    };
  else
    verd = {
      k: 'ok',
      icon: '●',
      t: message('maf1e45958d55'),
      s: message('m7500289e23f5'),
      bg: '#2E7A43',
    };
  const extra = Math.max(1, dE - dN);
  const ACT = {
    ambos: [message('mea528e0697d7'), message('m123ba4763331', extra), message('mcfa81120b106')],
    inund: [message('m471acb3cc0c3'), message('m75a768e0bc3f'), message('mf41bb4fecf67')],
    seca: [message('m57e53d9b7a1e'), message('m956ddb61bb60'), message('m4d06b3c4da8a')],
    viene: [message('m414e8f7bff76'), message('m123ba4763331', extra), message('mcfa81120b106')],
    ok: [message('m36e8933552c2'), message('m05e0427f7378'), message('m1df0c675b637')],
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
  const simSrc = message('md1f8d6589964');
  const sigs = [
    {
      n: message('mf6b456bb6d62'),
      v: f2(vNow),
      d: message(
        'mf1f982b08d6b',
        satZ >= 0 ? '+' : '−',
        Math.abs(satZ)
          .toFixed(1)
          .replace('.', displayLanguage() === 'en' ? '.' : ','),
      ),
      st:
        satZ <= -1
          ? message('mece6db80e377')
          : satZ >= 1
            ? message('m85e2adef7ede')
            : message('ma7248eeb45eb'),
      col: satZ <= -1 ? '#E0705F' : '#7BC47F',
      src: demo ? simSrc : message('m7ae8e18bc8e1'),
    },
    {
      n: message('maccc6308fce7'),
      v: `${trend >= 0 ? '+' : '−'}${Math.round(Math.abs(trend) * 100)}`,
      d: message('mcff50e4070d8'),
      st:
        trend <= -0.06
          ? message('m14d5c271baac')
          : trend >= 0.06
            ? message('m89adbbfab3da')
            : message('m831d0f67387d'),
      col: trend <= -0.06 ? '#E0705F' : '#7BC47F',
      src: demo ? simSrc : message('m7ae8e18bc8e1'),
    },
    {
      n: message('mc15c179c61d7'),
      v: message('m1ba91c921924', soilPct),
      d: message('m9ae784660359'),
      st: soilSat
        ? message('m654e5048c080')
        : soilWet
          ? message('m7be8bd821d4d')
          : soilDry
            ? message('mfc5cf207990b')
            : message('ma7248eeb45eb'),
      col: soilSat || soilWet ? '#6FA8DC' : soilDry ? '#E0705F' : '#7BC47F',
      src: demo ? simSrc : message('mbcd86ea9b4fc'),
    },
    {
      n: message('m290aa743909b'),
      v: monthsText(dE),
      d: message('m833bd229e770', dN),
      st: dE > dN ? message('maaf5e501cf1b') : message('ma7248eeb45eb'),
      col: dE > dN ? '#F2B53A' : '#7BC47F',
      src: message('mf7c18b1356f5'),
    },
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
    src: demo ? message('m9928f3a5650d') : message('m72230366af92', REGION_NAMES[reg], nF),
  };
}
