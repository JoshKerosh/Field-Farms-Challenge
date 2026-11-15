import { messageLanguage } from './messages';
import { esCR } from './es-CR';

export const copy = esCR;
export const locale = 'es-CR';
export const number = (value: number, digits = 1) =>
  new Intl.NumberFormat(messageLanguage() === 'en' ? 'en-US' : locale, {
    maximumFractionDigits: digits,
  }).format(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat(messageLanguage() === 'en' ? 'en-US' : locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
