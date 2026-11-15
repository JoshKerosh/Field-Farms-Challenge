import { describe, it, expect } from 'vitest';
import {
  recoveryFarmId,
  recoveryProgress,
  recoveryExpenses,
  suggestedRecoveryNeeds,
  validRecoveryGoal,
  type RecoveryGoal,
} from './recovery';
const goal = (): RecoveryGoal => ({
  id: 'g',
  template: 'trees',
  target: 10,
  unit: 'trees',
  due: '2027-01-01',
  place: 'north',
  budget: 100,
  status: 'active',
  entries: [],
});
describe('recovery tracking', () => {
  it('keeps a parcel identity when another point is selected inside it', () => {
    expect(
      recoveryFarmId({ lat: 10, lng: -84, parcel: { properties: { identifica: 'CR1' } } }),
    ).toBe(
      recoveryFarmId({ lat: 10.1, lng: -84.1, parcel: { properties: { identifica: 'CR1' } } }),
    );
    expect(recoveryFarmId({ lat: 10, lng: -84, parcel: null })).not.toBe('siri-CR1');
  });
  it('uses the latest cumulative measurement, allowing setbacks and backdated entries', () => {
    const g = goal();
    g.entries = [
      { id: 'a', date: '2026-11-10', quantity: 9, note: '', expense: 20, photos: [] },
      { id: 'b', date: '2026-11-12', quantity: 7, note: '', expense: 30, photos: [] },
      { id: 'c', date: '2026-11-09', quantity: 10, note: '', expense: 0, photos: [] },
    ];
    expect(recoveryProgress(g)).toBe(70);
    expect(recoveryExpenses(g)).toBe(50);
    g.entries.push({ ...g.entries[1], id: 'd', quantity: 8 });
    expect(recoveryProgress(g)).toBe(80);
  });
  it('suggests at most three confirmed needs', () => {
    expect(
      suggestedRecoveryNeeds({
        water: 'yes',
        soil: 'yes',
        trees: 'yes',
        cattle: 'yes',
        shade: 'no',
        season: 'unknown',
      }),
    ).toEqual(['water', 'soil', 'cattle']);
  });
  it('requires a valid target, date and nonnegative budget', () => {
    expect(validRecoveryGoal(goal())).toBe(true);
    expect(validRecoveryGoal({ ...goal(), target: 0 })).toBe(false);
    expect(validRecoveryGoal({ ...goal(), due: '2027-02-31' })).toBe(false);
    expect(validRecoveryGoal({ ...goal(), budget: -1 })).toBe(false);
  });
});
