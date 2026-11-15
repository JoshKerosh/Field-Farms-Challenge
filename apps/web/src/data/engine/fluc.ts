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

const KIND_LABEL: Record<string, string> = {
  fed: 'Federación',
  uni: 'Unión',
  lig: 'Liga',
  con: 'Confederación',
  tra: 'En trámite',
};

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
  const region = formatRegionName(regCode) || 'tu región';
  const matches = ds.fluc.f.filter((o) => o.r === regCode || o.r === 'Nacional');
  const nReg = matches.filter((o) => o.r !== 'Nacional' && o.kc !== 'tra').length;
  const nAsadas = matches
    .filter((o) => o.r !== 'Nacional' && o.a && !o.sc)
    .reduce((acc, o) => acc + o.a, 0);

  const list: FlucOrg[] = matches
    .map((o) => ({
      kind: KIND_LABEL[o.kc] || o.k,
      name: o.n,
      col: KIND_COLOR[o.kc] || '#17617C',
      meta: o.a
        ? `agrupa ${o.a}${o.kc === 'con' ? ' uniones y federaciones' : ' ASADAS'}`
        : 'en trámite ante el AyA',
      status: o.sc === 'ext' ? 'En causal de extinción' : '',
      hasStatus: o.sc === 'ext',
      national: o.r === 'Nacional',
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
