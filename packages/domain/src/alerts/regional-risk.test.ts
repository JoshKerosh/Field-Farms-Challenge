import { describe, expect, it } from 'vitest';
import {
  evaluateRegionalNasaRisk,
  type RegionalTerrain,
  type RegionalWeather,
} from './regional-risk';

const now = new Date('2026-11-15T12:00:00Z');
const weather = (wet = 0.9, rain = 100): RegionalWeather => ({
  wetness3d: wet,
  rain7dMm: rain,
  coverageFraction: 1,
  powerCellCount: 2,
  observedStart: '2026-11-07',
  wetnessStart: '2026-11-11',
  observedEnd: '2026-11-13',
});
const terrain = (active = true): RegionalTerrain => ({
  sampleCount: 9,
  plannedSampleCount: 9,
  slopeDegreesMax: active ? 20 : 19.9,
  flatSampleFraction: active ? 0.5 : 0.49,
  elevationMinM: 10,
  elevationMaxM: 100,
  samples: [],
});

describe('NASA regional screening, independently of soil conditions', () => {
  for (const hazard of ['landslide', 'flood'] as const) {
    it(`${hazard}: handles all signal combinations and inclusive cutoffs`, () => {
      for (let bits = 0; bits < 8; bits++) {
        const flags = [!!(bits & 1), !!(bits & 2), !!(bits & 4)];
        const count = flags.filter(Boolean).length;
        expect(
          evaluateRegionalNasaRisk(
            hazard,
            weather(flags[0] ? 0.9 : 0.89, flags[1] ? 100 : 99.9),
            terrain(flags[2]),
            now,
          ),
        ).toMatchObject({
          color: ['green', 'yellow', 'orange', 'red'][count],
          matched: count,
          soilIncluded: false,
        });
      }
    });
    it(`${hazard}: retains unknown inputs rather than lowering risk`, () => {
      expect(
        evaluateRegionalNasaRisk(hazard, { ...weather(), wetness3d: null }, terrain(), now).color,
      ).toBe('gray');
      expect(
        evaluateRegionalNasaRisk(hazard, weather(), { ...terrain(), sampleCount: 8 }, now).color,
      ).toBe('gray');
      expect(
        evaluateRegionalNasaRisk(hazard, { ...weather(), coverageFraction: 0.94 }, terrain(), now)
          .color,
      ).toBe('gray');
      expect(
        evaluateRegionalNasaRisk(hazard, { ...weather(), rain7dMm: NaN }, terrain(), now).color,
      ).toBe('gray');
    });
  }
  it('rejects stale, future and incomplete time windows without using download freshness', () => {
    expect(
      evaluateRegionalNasaRisk('landslide', weather(), terrain(), new Date('2026-11-21')).color,
    ).toBe('gray');
    expect(
      evaluateRegionalNasaRisk('landslide', weather(), terrain(), new Date('2026-11-12')).color,
    ).toBe('gray');
    expect(
      evaluateRegionalNasaRisk(
        'landslide',
        { ...weather(), observedStart: '2026-11-08' },
        terrain(),
        now,
      ).color,
    ).toBe('gray');
    expect(
      evaluateRegionalNasaRisk(
        'landslide',
        { ...weather(), wetnessStart: '2026-11-10' },
        terrain(),
        now,
      ).color,
    ).toBe('gray');
  });
  it('preserves a valid dry zero and distinguishes that from a missing reading', () => {
    expect(evaluateRegionalNasaRisk('landslide', weather(0, 0), terrain(false), now).color).toBe(
      'green',
    );
  });
});
