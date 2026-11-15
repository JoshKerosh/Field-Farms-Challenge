import { localizedResource, messageLanguage } from '../../i18n/messages';
/** Formatting and text normalization helpers for the Costa Rica data. */

export const MONTHS = localizedResource(() =>
  Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(messageLanguage() === 'en' ? 'en-US' : 'es-CR', {
      month: 'short',
      timeZone: 'UTC',
    })
      .format(new Date(Date.UTC(2026, month, 1)))
      .replace(/\.$/, ''),
  ),
);

/** Restores accents that the official files lack. */
export function fixName(t: string): string {
  return String(t)
    .replace(/^Cano /, 'Caño ')
    .replace(/\bRio\b/g, 'Río')
    .replace(/\bFrio\b/g, 'Frío')
    .replace(/Sarapiqui\b/g, 'Sarapiquí')
    .replace(/Perez Zeledon/g, 'Pérez Zeledón')
    .replace(/Leon Cortes/g, 'León Cortés')
    .replace(/San Jose\b/g, 'San José')
    .replace(/\bLimon\b/g, 'Limón')
    .replace(/Pococi/g, 'Pococí')
    .replace(/Guacimo/g, 'Guácimo')
    .replace(/Tilaran/g, 'Tilarán')
    .replace(/San Ramon/g, 'San Ramón')
    .replace(/Ca.as\b/g, 'Cañas');
}

/** Lowercase without accents, for searching. */
export function norm(t: string): string {
  return String(t)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Uppercase without accents (canton key of the FLUC registry). */
export function normUpper(t: string): string {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export const f2 = (v: number): string =>
  v.toFixed(2).replace('.', messageLanguage() === 'en' ? '.' : ',');
export const comma = (v: number | string): string =>
  String(v).replace('.', messageLanguage() === 'en' ? '.' : ',');
export const fmtInt = (v: number): string =>
  Math.round(v).toLocaleString(messageLanguage() === 'en' ? 'en-US' : 'es-CR');
export const fmtKm = (v: number): string =>
  v >= 10 ? fmtInt(v) : v.toFixed(1).replace('.', messageLanguage() === 'en' ? '.' : ',');

/** Readable distance: 'm' under 1 km, 'km' from there on. */
export function distText(km: number): string {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(1).replace('.', messageLanguage() === 'en' ? '.' : ',')} km`;
}

export function signedPct(v: number): string {
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString(
    messageLanguage() === 'en' ? 'en-US' : 'es-CR',
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  )} %`;
}

export const monthsText = (n: number): string =>
  `${n} ${messageLanguage() === 'en' ? (n === 1 ? 'month' : 'months') : n === 1 ? 'mes' : 'meses'}`;
