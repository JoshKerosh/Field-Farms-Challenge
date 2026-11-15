import { validObservationDate } from '@field-farms/domain';

export interface ClimateDay {
  date: string;
  precipitationMm: number | null;
  rootZoneWetness: number | null;
}
export type ClimateMetric = 'precipitationMm' | 'rootZoneWetness';
export interface ClimateHistory {
  longitude: number;
  latitude: number;
  sourceUrl: string;
  retrievedAt: string;
  observedEnd: string;
  daily: ClimateDay[];
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseClimateHistory(value: unknown): ClimateHistory | null {
  if (
    !object(value) ||
    !object(value.location) ||
    !finite(value.location.longitude) ||
    !finite(value.location.latitude) ||
    !object(value.evidence) ||
    typeof value.evidence.url !== 'string' ||
    typeof value.retrievedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.retrievedAt)) ||
    !validObservationDate(typeof value.observedEnd === 'string' ? value.observedEnd : null) ||
    !object(value.parameterMetadata) ||
    !object(value.parameterMetadata.GWETROOT) ||
    value.parameterMetadata.GWETROOT.units !== '1' ||
    !object(value.parameterMetadata.PRECTOTCORR) ||
    value.parameterMetadata.PRECTOTCORR.units !== 'mm/day'
  )
    return null;
  const days = value.dailyHistory ?? value.daily;
  if (!Array.isArray(days) || days.length === 0 || days.length > 366) return null;
  const daily: ClimateDay[] = [];
  for (const item of days) {
    if (
      !object(item) ||
      typeof item.date !== 'string' ||
      !validObservationDate(item.date) ||
      !(
        item.precipitationMm === null ||
        (finite(item.precipitationMm) && item.precipitationMm >= 0)
      ) ||
      !(
        item.rootZoneWetness === null ||
        (finite(item.rootZoneWetness) && item.rootZoneWetness >= 0 && item.rootZoneWetness <= 1)
      )
    )
      return null;
    if (
      daily.length &&
      Date.parse(item.date) - Date.parse(daily[daily.length - 1].date) !== 86400000
    )
      return null;
    daily.push({
      date: item.date,
      precipitationMm: item.precipitationMm,
      rootZoneWetness: item.rootZoneWetness,
    });
  }
  if (daily[daily.length - 1].date !== value.observedEnd) return null;
  return {
    longitude: value.location.longitude,
    latitude: value.location.latitude,
    sourceUrl: value.evidence.url,
    retrievedAt: value.retrievedAt,
    observedEnd: value.observedEnd,
    daily,
  };
}

export function sameClimatePoint(
  source: { longitude: number; latitude: number },
  longitude: number,
  latitude: number,
): boolean {
  return (
    source.longitude.toFixed(6) === longitude.toFixed(6) &&
    source.latitude.toFixed(6) === latitude.toFixed(6)
  );
}

export function compareClimatePeriods(
  history: ClimateHistory,
  metric: ClimateMetric,
  days: 1 | 7 | 30,
) {
  const byDate = new Map(history.daily.map((day) => [day.date, day]));
  const window = (offset: number) => {
    const end = Date.parse(history.observedEnd) - offset * 86400000;
    const keys = Array.from({ length: days }, (_, i) =>
      new Date(end - (days - i - 1) * 86400000).toISOString().slice(0, 10),
    );
    const values = keys.map((key) => byDate.get(key)?.[metric] ?? null);
    const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
    const total = valid.reduce((sum, value) => sum + value, 0);
    return {
      start: keys[0],
      end: keys[keys.length - 1],
      validDays: valid.length,
      expectedDays: days,
      value: valid.length === days ? (metric === 'precipitationMm' ? total : total / days) : null,
    };
  };
  const current = window(0),
    previous = window(days);
  const difference =
    current.value !== null && previous.value !== null ? current.value - previous.value : null;
  return {
    current,
    previous,
    difference,
    percent:
      difference !== null && previous.value !== 0 && previous.value !== null
        ? (difference / previous.value) * 100
        : null,
    reason:
      current.value === null || previous.value === null
        ? ('incomplete' as const)
        : previous.value === 0
          ? ('zero-reference' as const)
          : ('complete' as const),
  };
}
