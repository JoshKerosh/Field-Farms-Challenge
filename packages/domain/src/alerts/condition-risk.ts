/** Initial project screening rules, not calibrated probabilities or official warnings. */
export const CONDITION_RULES = {
  version: 'conditions-v1',
  saturationRatioMin: 0.9,
  landslideSlopeDegreesMin: 20,
  floodHeightAboveDrainageMetresMax: 5,
} as const;

export type ConditionHazard = 'landslide' | 'flood';
export type ConditionColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray';
export const CONDITION_COLORS: Record<ConditionColor, string> = {
  green: '#25804A',
  yellow: '#E6BE28',
  orange: '#DD781C',
  red: '#C83232',
  gray: '#89939D',
};
export interface ConditionReading {
  value: number | boolean | null;
  unit: string;
  status: 'available' | 'outdated' | 'unverified';
  source: string;
  observedAt: string;
  validUntil: string;
}
export interface ZoneConditions {
  /** Water-filled pore fraction, not POWER GWETROOT or raw volumetric moisture. */
  saturation: ConditionReading | null;
  slope: ConditionReading | null;
  heightAboveDrainage: ConditionReading | null;
  /** A mapped geotechnical classification, not an agricultural capability class. */
  susceptibleSoil: ConditionReading | null;
  /** A mapped drainage classification, not an inference from clay percentage. */
  poorDrainage: ConditionReading | null;
}

export function evaluateConditionRisk(
  hazard: ConditionHazard,
  readings: ZoneConditions,
  now = new Date(),
) {
  const numeric = (r: ConditionReading | null, unit: string, min: number, max: number) => {
    const value = usable(r, unit, now);
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? value
      : null;
  };
  const boolean = (r: ConditionReading | null) => {
    const value = usable(r, 'boolean', now);
    return typeof value === 'boolean' ? value : null;
  };
  const saturation = numeric(readings.saturation, 'fraction-of-pore-space', 0, 1);
  const terrain =
    hazard === 'landslide'
      ? numeric(readings.slope, 'degree', 0, 90)
      : numeric(readings.heightAboveDrainage, 'm', 0, Infinity);
  const conditions = {
    saturation: saturation === null ? null : saturation >= CONDITION_RULES.saturationRatioMin,
    soil: boolean(hazard === 'landslide' ? readings.susceptibleSoil : readings.poorDrainage),
    terrain:
      terrain === null
        ? null
        : hazard === 'landslide'
          ? terrain >= CONDITION_RULES.landslideSlopeDegreesMin
          : terrain <= CONDITION_RULES.floodHeightAboveDrainageMetresMax,
  };
  const values = Object.values(conditions);
  const matched = values.filter((v) => v === true).length;
  const known = values.filter((v) => v !== null).length;
  const color: ConditionColor =
    known < 3 ? 'gray' : (['green', 'yellow', 'orange', 'red'] as const)[matched];
  return { color, matched, known, conditions, ruleVersion: CONDITION_RULES.version };
}

function usable(reading: ConditionReading | null, unit: string, now: Date) {
  if (!reading || reading.status !== 'available' || reading.unit !== unit) return null;
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(reading.source)) return null;
  const observed = Date.parse(reading.observedAt),
    expires = Date.parse(reading.validUntil);
  const current = now.getTime();
  if (
    ![observed, expires, current].every(Number.isFinite) ||
    observed > current ||
    expires < current ||
    expires < observed
  )
    return null;
  return reading.value;
}
