import { describe, expect, it } from 'vitest';
import power from '../../../../public/data/nasa/power/latest.json';
import { compareClimatePeriods, parseClimateHistory, type ClimateHistory } from './climate-history';

function synthetic(): ClimateHistory {
  return {
    longitude: -85,
    latitude: 10,
    sourceUrl: 'https://example.test/fixture',
    retrievedAt: '2026-11-15T00:00:00Z',
    observedEnd: '2026-11-13',
    daily: Array.from({ length: 90 }, (_, index) => ({
      date: new Date(Date.parse('2026-08-16') + index * 86400000).toISOString().slice(0, 10),
      precipitationMm: index < 60 ? 2 : 3,
      rootZoneWetness: index < 60 ? 0.4 : 0.6,
    })),
  };
}

describe('observed history and comparable windows', () => {
  it('reads all 90 downloaded days without changing their source dates or units', () => {
    const history = parseClimateHistory(power.sample);
    expect(history?.daily).toHaveLength(90);
    expect(history?.daily[0].date).toBe('2026-08-16');
    expect(history?.observedEnd).toBe('2026-11-13');
  });
  it('compares equal, consecutive windows without overlap', () => {
    const comparison = compareClimatePeriods(synthetic(), 'precipitationMm', 30);
    expect(comparison.current).toMatchObject({
      start: '2026-10-15',
      end: '2026-11-13',
      value: 90,
      validDays: 30,
    });
    expect(comparison.previous).toMatchObject({
      start: '2026-09-15',
      end: '2026-10-14',
      value: 60,
    });
    expect(comparison.difference).toBe(30);
    expect(comparison.percent).toBe(50);
  });
  it('uses mean moisture rather than adding relative daily indices', () => {
    const comparison = compareClimatePeriods(synthetic(), 'rootZoneWetness', 30);
    expect(comparison.current.value).toBeCloseTo(0.6);
    expect(comparison.previous.value).toBeCloseTo(0.4);
    expect(comparison.difference).toBeCloseTo(0.2);
  });
  it('retains zero as valid but does not divide by a zero reference', () => {
    const history = synthetic();
    history.daily.forEach((day) => {
      day.precipitationMm = 0;
    });
    const comparison = compareClimatePeriods(history, 'precipitationMm', 7);
    expect(comparison.current.value).toBe(0);
    expect(comparison.percent).toBeNull();
    expect(comparison.reason).toBe('zero-reference');
  });
  it('does not compare partial periods or silently fill missing days with zeros', () => {
    const history = synthetic();
    history.daily[80].precipitationMm = null;
    const comparison = compareClimatePeriods(history, 'precipitationMm', 30);
    expect(comparison.current.validDays).toBe(29);
    expect(comparison.current.value).toBeNull();
    expect(comparison.previous.value).toBe(60);
    expect(comparison.difference).toBeNull();
    expect(comparison.reason).toBe('incomplete');
    expect(
      compareClimatePeriods(
        { ...synthetic(), daily: synthetic().daily.slice(-30) },
        'precipitationMm',
        30,
      ).previous.value,
    ).toBeNull();
  });
  it('rejects unordered dates, duplicate days and invalid physical units or values', () => {
    for (const mutate of [
      (s: typeof power.sample) => {
        s.dailyHistory.reverse();
      },
      (s: typeof power.sample) => {
        s.dailyHistory[1].date = s.dailyHistory[0].date;
      },
      (s: typeof power.sample) => {
        s.dailyHistory[0].precipitationMm = -1;
      },
      (s: typeof power.sample) => {
        s.dailyHistory[0].rootZoneWetness = 1.5;
      },
      (s: typeof power.sample) => {
        s.parameterMetadata.GWETROOT.units = 'm3/m3';
      },
    ]) {
      const sample = structuredClone(power.sample);
      mutate(sample);
      expect(parseClimateHistory(sample)).toBeNull();
    }
  });
});
