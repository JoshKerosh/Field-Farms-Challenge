import { validObservationDate } from './index';
import type { ConditionColor, ConditionHazard } from './condition-risk';

/** Screening choices made for this project, not scientific warning thresholds. */
export const REGIONAL_NASA_RULES = {
  version: 'nasa-screening-v1',
  wetness3dMin: 0.9,
  rain7dMmMin: 100,
  slopeDegreesMin: 20,
  flatSlopeDegreesMax: 2,
  flatSampleFractionMin: 0.5,
  minimumWeatherCoverage: 0.95,
  maximumLagDays: 7,
} as const;

export interface RegionalWeather {
  wetness3d: number | null;
  rain7dMm: number | null;
  coverageFraction: number;
  powerCellCount: number;
  observedStart: string;
  wetnessStart: string;
  observedEnd: string;
}
export interface RegionalTerrain {
  sampleCount: number;
  plannedSampleCount: number;
  slopeDegreesMax: number | null;
  flatSampleFraction: number | null;
  elevationMinM: number | null;
  elevationMaxM: number | null;
  samples: { longitude: number; latitude: number; elevationM: number; slopeDegrees: number }[];
}

export function evaluateRegionalNasaRisk(
  hazard: ConditionHazard,
  weather: RegionalWeather,
  terrain: RegionalTerrain,
  now = new Date(),
) {
  const finite = (value: number | null, min: number, max = Infinity): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const end = Date.parse(`${weather.observedEnd}T00:00:00Z`);
  const today = Number.isFinite(now.getTime()) ? Date.parse(now.toISOString().slice(0, 10)) : NaN;
  const lag = (today - end) / 86400000;
  const fresh =
    validObservationDate(weather.observedEnd) &&
    lag >= 0 &&
    lag <= REGIONAL_NASA_RULES.maximumLagDays;
  const complete =
    fresh &&
    finite(weather.coverageFraction, REGIONAL_NASA_RULES.minimumWeatherCoverage, 1) &&
    weather.powerCellCount > 0 &&
    validObservationDate(weather.observedStart) &&
    validObservationDate(weather.wetnessStart) &&
    end - Date.parse(weather.observedStart) === 6 * 86400000 &&
    end - Date.parse(weather.wetnessStart) === 2 * 86400000;
  const terrainReady =
    terrain.sampleCount > 0 && terrain.sampleCount === terrain.plannedSampleCount;
  const conditions = {
    wetness:
      complete && finite(weather.wetness3d, 0, 1)
        ? weather.wetness3d >= REGIONAL_NASA_RULES.wetness3dMin
        : null,
    rainfall:
      complete && finite(weather.rain7dMm, 0)
        ? weather.rain7dMm >= REGIONAL_NASA_RULES.rain7dMmMin
        : null,
    terrain: !terrainReady
      ? null
      : hazard === 'landslide'
        ? finite(terrain.slopeDegreesMax, 0, 90)
          ? terrain.slopeDegreesMax >= REGIONAL_NASA_RULES.slopeDegreesMin
          : null
        : finite(terrain.flatSampleFraction, 0, 1)
          ? terrain.flatSampleFraction >= REGIONAL_NASA_RULES.flatSampleFractionMin
          : null,
  };
  const values = Object.values(conditions);
  const matched = values.filter((value) => value === true).length;
  const known = values.filter((value) => value !== null).length;
  const color: ConditionColor =
    known === 3 ? (['green', 'yellow', 'orange', 'red'] as const)[matched] : 'gray';
  return {
    color,
    matched,
    known,
    conditions,
    fresh,
    lagDays: lag,
    soilIncluded: false,
    ruleVersion: REGIONAL_NASA_RULES.version,
  };
}
