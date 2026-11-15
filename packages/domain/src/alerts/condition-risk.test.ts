import { describe, expect, it } from 'vitest';
import {
  evaluateConditionRisk,
  type ConditionReading,
  type ZoneConditions,
} from './condition-risk';

const now = new Date('2026-11-15T12:00:00Z');
const reading = (value: number | boolean, unit: string): ConditionReading => ({
  value,
  unit,
  status: 'available',
  source: 'https://example.test/synthetic',
  observedAt: '2026-11-15T00:00:00Z',
  validUntil: '2026-11-16T00:00:00Z',
});
function zone(wet: boolean, soil: boolean, terrain: boolean): ZoneConditions {
  return {
    saturation: reading(wet ? 0.9 : 0.89, 'fraction-of-pore-space'),
    slope: reading(terrain ? 20 : 19.9, 'degree'),
    heightAboveDrainage: reading(terrain ? 5 : 5.1, 'm'),
    susceptibleSoil: reading(soil, 'boolean'),
    poorDrainage: reading(soil, 'boolean'),
  };
}
describe('project condition screening', () => {
  for (const hazard of ['landslide', 'flood'] as const) {
    it(`${hazard}: counts every combination without depending on condition order`, () => {
      for (let mask = 0; mask < 8; mask++) {
        const flags = [!!(mask & 1), !!(mask & 2), !!(mask & 4)] as const;
        const count = flags.filter(Boolean).length;
        expect(evaluateConditionRisk(hazard, zone(...flags), now)).toMatchObject({
          matched: count,
          known: 3,
          color: ['green', 'yellow', 'orange', 'red'][count],
        });
      }
    });
    it(`${hazard}: any missing required condition is gray even with two positives`, () => {
      const fields =
        hazard === 'landslide'
          ? (['saturation', 'slope', 'susceptibleSoil'] as const)
          : (['saturation', 'heightAboveDrainage', 'poorDrainage'] as const);
      for (const field of fields)
        expect(
          evaluateConditionRisk(hazard, { ...zone(true, true, true), [field]: null }, now).color,
        ).toBe('gray');
    });
  }
  it('rejects stale, future, unverified, nonnumeric and wrong-product saturation inputs', () => {
    const base = zone(true, true, true);
    for (const change of [
      { validUntil: '2026-11-14T00:00:00Z' },
      { observedAt: '2026-11-16T00:00:00Z' },
      { observedAt: 'invalid' },
      { status: 'unverified' as const },
      { value: NaN },
      { value: true },
      { value: 1.01 },
      { value: -0.01 },
      { unit: 'GWETROOT' },
      { source: 'javascript:alert(1)' },
    ]) {
      const saturation = { ...base.saturation!, ...change };
      expect(evaluateConditionRisk('landslide', { ...base, saturation }, now).color).toBe('gray');
    }
  });
});
