import { localizedResource, message } from '../../i18n/messages';
import type { Dataset } from '../real/types';
import {
  DEMO_SCENARIOS,
  etMultiplier,
  rainFactor,
  type ClimateScenario,
  type DemoScenario,
} from './climate';
import { comma, MONTHS } from './format';
import type { PlaceContext } from './geo';
export type ExampleFarmKey = 'lechera' | 'carne' | 'mixta';
export type FarmKey = 'mia' | ExampleFarmKey;
export interface FarmProfile {
  key: FarmKey;
  name: string;
  who: string;
  tipo: string;
  ha: number;
  /** Hectares to plant (crop or forage). */
  cult: number;
  animals: number;
  /** true if it is the farmer's own data (stored on their device). */
  own: boolean;
}
/** Example profiles (SIMULATED) from the v10 prototype. */
export const EXAMPLE_FARMS: Record<ExampleFarmKey, FarmProfile> = localizedResource(() => ({
  lechera: {
    key: 'lechera',
    name: 'Lechería pequeña',
    who: message('m472d4c7a5f2e'),
    tipo: message('mca5fc8525826'),
    ha: 12,
    cult: 3,
    animals: 18,
    own: false,
  },
  carne: {
    key: 'carne',
    name: 'Ganado de carne',
    who: message('m6bd8132c403b'),
    tipo: message('m1dbf6e1fd37b'),
    ha: 45,
    cult: 6,
    animals: 60,
    own: false,
  },
  mixta: {
    key: 'mixta',
    name: 'Finca mixta',
    who: message('mf75f81b7ad00'),
    tipo: message('mae84b4640840'),
    ha: 6,
    cult: 4,
    animals: 6,
    own: false,
  },
}));
export const FARM_ACTIVITIES: [string, string][] = localizedResource(() => [
  ['leche', message('m5e29f4119cb0')],
  ['carne', message('m7d537cbf9a91')],
  ['doble', message('mc4d6f0f471d5')],
  ['cultivos', message('mb0c6194ad8f5')],
  ['mixta', message('ma21c720697dc')],
]);
export const FARM_WATER: [string, string][] = localizedResource(() => [
  ['naciente', message('m725ff7d87314')],
  ['pozo', message('me187971259d4')],
  ['rio', message('m12874fa1afe4')],
  ['asada', 'ASADA'],
  ['lluvia', message('m0aaee352c4ce')],
]);
export const FARM_FLOODING: [string, string][] = localizedResource(() => [
  ['no', 'No'],
  ['aveces', message('m7fd5abe9df95')],
  ['si', message('mef612425c20b')],
]);
/** The farmer's farm data; stored only on their device. */
export interface MyFarm {
  name: string;
  act: string;
  agua: string;
  ha: number;
  cult: number;
  animals: number;
  ench: 'no' | 'aveces' | 'si';
}
export interface FarmFormInput {
  name: string;
  act: string;
  agua: string;
  ha: string;
  cult: string;
  animals: string;
  ench: string;
}
export const EMPTY_FARM_FORM: FarmFormInput = {
  name: '',
  act: '',
  agua: '',
  ha: '',
  cult: '',
  animals: '',
  ench: 'no',
};
const num = (v: string | undefined): number => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
export function validateFarmForm(f: FarmFormInput) {
  const ha = num(f.ha);
  const cult = num(f.cult);
  const animals = f.animals === '' ? 0 : num(f.animals);
  const errors = {
    ha: !(ha > 0) ? message('m9e2286da7397') : ha > 5000 ? message('m92378f9d3bf0') : '',
    cult: !(cult > 0)
      ? message('m2a30919fe6ff')
      : ha > 0 && cult > ha
        ? message('m31fc2dc6f978', ha)
        : '',
    animals: !(animals >= 0) || animals > 20000 ? message('m216f9d62673d') : '',
    act: f.act ? '' : message('m409005604aa8'),
  };
  const ok = !errors.ha && !errors.cult && !errors.animals && !errors.act;
  const farm: MyFarm | null = ok
    ? {
        name: f.name.trim().slice(0, 40),
        act: f.act,
        agua: f.agua,
        ha,
        cult,
        animals: Math.round(animals),
        ench: (['no', 'aveces', 'si'].includes(f.ench) ? f.ench : 'no') as MyFarm['ench'],
      }
    : null;
  return { errors, ok, farm };
}
export function myFarmToForm(f: MyFarm): FarmFormInput {
  return {
    name: f.name,
    act: f.act,
    agua: f.agua,
    ha: String(f.ha),
    cult: String(f.cult),
    animals: String(f.animals),
    ench: f.ench,
  };
}
const lab = (list: [string, string][], k: string) => list.find((o) => o[0] === k)?.[1] ?? k;
/** Active farm: the farmer's or one of the example profiles. */
export function activeFarm(key: FarmKey, my: MyFarm | null): FarmProfile {
  if (key === 'mia' && my) {
    const water = my.agua ? message('m1dd3302033b8', lab(FARM_WATER, my.agua).toLowerCase()) : '';
    const ench =
      my.ench === 'si'
        ? message('m36424e3470fd')
        : my.ench === 'aveces'
          ? message('mff6b5f76a3e0')
          : '';
    return {
      key: 'mia',
      name: my.name || message('mba8875d8f580'),
      who: message('m53da36542add', my.name || message('mba8875d8f580')),
      tipo: lab(FARM_ACTIVITIES, my.act) + water + ench,
      ha: my.ha,
      cult: my.cult,
      animals: my.animals,
      own: true,
    };
  }
  return EXAMPLE_FARMS[key === 'mia' ? 'lechera' : key];
}
/** Can the farm get waterlogged? (CNE/RIESGOS map, soil drainage, demo mode or the farmer's data). */
export function siteFloods(
  ctx: PlaceContext,
  demo: DemoScenario | null,
  key: FarmKey,
  my: MyFarm | null,
): boolean {
  return (
    ctx.flood ||
    ctx.clsRaw.includes('h') ||
    demo === 'inund' ||
    (key === 'mia' && !!my && my.ench !== 'no')
  );
}
export interface ConservationAction {
  id: string;
  ic: string;
  t: string;
  d: string;
  ley: string;
  who: string;
  opp?: boolean;
}
/** Catalog of owner actions that protect the water (Forestry Law, art. 33; UNDP). */
export const CONSERVATION_ACTIONS: ConservationAction[] = localizedResource(() => [
  {
    id: 'naciente',
    ic: '',
    t: message('m60414a7c0d35'),
    d: message('m10b9d0db8d4d'),
    ley: message('ma799cc98b16f'),
    who: message('me5a8ae7b0be5'),
  },
  {
    id: 'ribera',
    ic: '',
    t: message('m4ec28cf8bf1e'),
    d: message('madeb542e4791'),
    ley: message('ma799cc98b16f'),
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'potreros',
    ic: '',
    t: message('mf84fdd3b79a3'),
    d: message('m915eb959e3b0'),
    ley: '',
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'bebederos',
    ic: '',
    t: message('m4a575ff7a0b4'),
    d: message('md4de59a92411'),
    ley: '',
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'arboles',
    ic: '',
    t: message('mc29de0c02f68'),
    d: message('m77b39eb67bba'),
    ley: '',
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'lluvia',
    ic: '',
    t: message('m3948892529c4'),
    d: message('m25a5604890b3'),
    ley: '',
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'quemas',
    ic: '',
    t: message('m5978b178d0cf'),
    d: message('mae0ef6633d61'),
    ley: '',
    who: message('m761f3a6d1bbe'),
  },
  {
    id: 'turismo',
    ic: '',
    t: message('md81399711b16'),
    d: message('m3a520eb2876b'),
    ley: '',
    who: message('m371956510ae6'),
    opp: true,
  },
]);
export type ActionStatus = 'hecho' | 'plan' | '';
export interface RotationMonth {
  m: string;
  /** Recommended rest days that month. */
  rest: number;
  /** Bar height (4–70 px). */
  h: number;
  col: string;
  /** Animals the pasture can support. */
  cap: number;
}
export interface Rotation {
  apartos: number;
  ha: string;
  an: string;
  rest: string;
  occ: string;
  months: RotationMonth[];
  lineY: number;
  warn: string;
  now: string;
  minCap: number;
  capMonth: string;
  animals: number;
}
/**
 * Pasture rotation using soil moisture (NASA POWER), greenness (MODIS) and expected
 * weather (El Niño per NOAA RONI). Indicative estimate from the v10 prototype.
 */
export function pastureRotation(
  ds: Dataset,
  ctx: PlaceContext,
  demo: DemoScenario | null,
  farm: FarmProfile,
  apartosIn: number,
  vNow: number,
): Rotation {
  const { reg } = ctx;
  const NZ = ds.climate.NASA[reg].y2026;
  const TC = ds.climate.NASA[reg].clim;
  const scen: ClimateScenario = demo ? DEMO_SCENARIOS[demo].scen : 'nino';
  const fNi = rainFactor(ds, reg, scen);
  const eNi = etMultiplier(ds, reg, scen);
  const haP = Math.max(1, Number(farm.ha) - (farm.animals ? 0 : Number(farm.cult || 0)) || 10);
  const anP = farm.animals || 20;
  const apartos = Math.max(2, Math.min(40, apartosIn || 8));
  const gNow = Math.max(
    0.15,
    Math.min(1, 0.5 * Math.min(1, NZ.gw30 / 0.8) + 0.5 * Math.min(1, vNow / 0.75)),
  );
  const ROTM = [10, 11, 0, 1, 2, 3];
  const gm: number[] = [];
  ROTM.forEach((m, k) => {
    if (k === 0) {
      gm.push(gNow);
      return;
    }
    const raw = Math.max(0.2, Math.min(1, (TC.rain[m] * fNi[m]) / (0.8 * TC.et[m] * eNi[m])));
    gm.push(Math.round((0.5 * raw + 0.5 * gm[k - 1]) * 100) / 100);
  });
  const restOf = (g: number) => Math.round(Math.max(21, Math.min(60, 25 + (1 - g) * 35)));
  const capOf = (g: number) => Math.round((haP * 60 * g) / 10);
  const mx = Math.max(anP * 1.4, ...gm.map(capOf));
  const months: RotationMonth[] = ROTM.map((m, k) => {
    const cap = capOf(gm[k]);
    return {
      m: MONTHS[m],
      rest: restOf(gm[k]),
      h: Math.max(4, Math.round((70 * cap) / mx)),
      col: cap < anP ? '#E0A030' : '#2E7A43',
      cap,
    };
  });
  const rest = restOf(gNow);
  const occ = Math.max(1, Math.round(rest / (apartos - 1)));
  const short = months.filter((x) => x.cap < anP);
  const minCap = months.reduce((a, m) => Math.min(a, m.cap), 1e9);
  const capMonth = (months.find((m) => m.cap === minCap) || { m: '' }).m;
  return {
    apartos,
    ha: comma(haP),
    an: String(anP),
    rest: String(rest),
    occ: String(occ),
    months,
    lineY: Math.round(70 - (70 * anP) / mx),
    warn: short.length
      ? message(
          'mdf95b2b18d7b',
          short.map((x) => x.m).join(', '),
          Math.min(...short.map((x) => x.cap)),
          anP,
        )
      : message('m0e4a06e02610', anP),
    now: message(
      'm97c40a294ffa',
      rest,
      occ,
      occ === 1 ? message('m52cf8502b836') : message('mccaa97b96dfa'),
    ),
    minCap,
    capMonth,
    animals: anP,
  };
}
