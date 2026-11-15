import { checkedCopy } from './interface-copy';
import { usePreferences } from './preferences';

export function useI18n() {
  const { language } = usePreferences();
  const locale = language === 'es' ? 'es-CR' : 'en-US';
  return {
    copy: checkedCopy[language],
    locale,
    language,
    number: (value: number, digits = 1) =>
      new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value),
    date: (value: string) =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${value}T12:00:00Z`)),
  };
}
