import { localizedResource, message } from '../../i18n/messages';
import type { Dataset } from '../real/types';
import { normUpper } from './format';
export interface FlucOrg {
  kind: string;
  name: string;
  col: string;
  meta: string;
  status: string;
  hasStatus: boolean;
  national: boolean;
}
export interface FlucSummary {
  region: string;
  has: boolean;
  nReg: number;
  nAsadas: number;
  list: FlucOrg[];
}
const KIND_COLOR: Record<string, string> = {
  fed: '#17617C',
  uni: '#2E7A43',
  lig: '#9C5F1C',
  con: '#0F4659',
  tra: '#7E8F84',
};
const KIND_LABEL: Record<string, string> = localizedResource(() => ({
  fed: message('m0297978b54e4'),
  uni: message('m22d28601fdb0'),
  lig: message('ma699b7110b63'),
  con: message('m1c418300cf13'),
  tra: message('mab6597b9a616'),
}));
function formatRegionName(regCode: string): string {
  if (!regCode) return '';
  return regCode
    .replace('REGIÓN ', '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
    .replace('Pacifico', 'Pacífico');
}
/** Federaciones, ligas, uniones y confederaciones de ASADAS en la región del cantón. */
export function flucForCanton(ds: Dataset, cantonName: string): FlucSummary {
  const regCode = ds.fluc.c[normUpper(cantonName)] || '';
  const region = formatRegionName(regCode) || message('m9648dfdc9eb4');
  const matches = ds.fluc.f.filter((o) => o.r === regCode || o.r === message('m0b66eb17676c'));
  const nReg = matches.filter((o) => o.r !== message('m0b66eb17676c') && o.kc !== 'tra').length;
  const nAsadas = matches
    .filter((o) => o.r !== message('m0b66eb17676c') && o.a && !o.sc)
    .reduce((acc, o) => acc + o.a, 0);
  const list: FlucOrg[] = matches
    .map((o) => ({
      kind: KIND_LABEL[o.kc] || o.k,
      name: o.n,
      col: KIND_COLOR[o.kc] || '#17617C',
      meta: o.a
        ? message('m164758ca1589', o.a, o.kc === 'con' ? message('m70fdafefdf8d') : ' ASADAS')
        : message('mebf0a0dece48'),
      status: o.sc === 'ext' ? message('m3da8ed0c44cf') : '',
      hasStatus: o.sc === 'ext',
      national: o.r === message('m0b66eb17676c'),
    }))
    .sort((a, b) => Number(a.national) - Number(b.national));
  return {
    region,
    has: list.length > 0,
    nReg,
    nAsadas,
    list,
  };
}
