/** Utilidades de formato y normalización de texto para los datos de Costa Rica. */

export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Restituye tildes que los archivos oficiales traen sin acentuar. */
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

/** Minúsculas sin tildes, para búsquedas. */
export function norm(t: string): string {
  return String(t)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Mayúsculas sin tildes (clave de cantón del registro FLUC). */
export function normUpper(t: string): string {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export const f2 = (v: number): string => v.toFixed(2).replace('.', ',');
export const comma = (v: number | string): string => String(v).replace('.', ',');
export const fmtInt = (v: number): string => Math.round(v).toLocaleString('es-CR');
export const fmtKm = (v: number): string =>
  v >= 10 ? fmtInt(v) : v.toFixed(1).replace('.', ',');

/** Distancia legible: 'm' bajo 1 km, 'km' en adelante. */
export function distText(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export function signedPct(v: number): string {
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('es-CR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

export const monthsText = (n: number): string => `${n} ${n === 1 ? 'mes' : 'meses'}`;
