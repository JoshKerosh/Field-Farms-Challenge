import { describe, it, expect } from 'vitest';
import { encodeRecoveryBackup, decodeRecoveryBackup } from './recovery-backup';
import {
  recoveryFarmId,
  recoveryExpenses,
  recoveryProgress,
  type RecoveryPlan,
} from '@field-farms/domain';
const plan: RecoveryPlan = {
  version: 1,
  origin: 'manual',
  farmId: 'siri-123',
  farmName: 'Finca',
  profile: { activity: 'carne', hectares: 24, animals: 15, water: 'pozo' },
  confirmedAt: '2026-11-15',
  needs: {
    water: 'yes',
    soil: 'unknown',
    cattle: 'no',
    trees: 'unknown',
    shade: 'unknown',
    season: 'unknown',
  },
  goals: [
    {
      id: 'g',
      template: 'water',
      target: 5,
      unit: 'points',
      due: '2027-02-01',
      place: 'Bebederos',
      budget: 10000,
      status: 'active',
      entries: [
        {
          id: 'e',
          date: '2026-11-15',
          quantity: 3,
          note: 'Fuga',
          expense: 3500,
          photos: [{ id: 'p', data: new Uint8Array([0, 1, 128, 255]).buffer }],
        },
      ],
    },
  ],
};
describe('restorable recovery backups', () => {
  it('preserves quantities, expenses and binary photo bytes', () => {
    expect(decodeRecoveryBackup(encodeRecoveryBackup(plan), plan.farmId)).toEqual(plan);
  });
  it('rejects another cadastral parcel or a malformed backup', () => {
    expect(() => decodeRecoveryBackup(encodeRecoveryBackup(plan), 'siri-other')).toThrow();
    expect(() => decodeRecoveryBackup('{}', plan.farmId)).toThrow();
    const invalid = structuredClone(plan);
    invalid.goals[0].entries[0].date = '2026-02-31';
    expect(() => decodeRecoveryBackup(encodeRecoveryBackup(invalid), plan.farmId)).toThrow();
  });
  it('can recover a draft at a newly registered location, pending UI confirmation', () => {
    const draft = { ...plan, farmId: 'draft:old' };
    expect(decodeRecoveryBackup(encodeRecoveryBackup(draft), 'draft:new').farmId).toBe('draft:old');
  });
  it('keeps a provisional identity when GPS coordinates move', () => {
    const site = { lat: 10, lng: -84, parcel: null, provisionalId: 'draft:stable' };
    expect(recoveryFarmId(site)).toBe(recoveryFarmId({ ...site, lat: 10.001, lng: -84.001 }));
  });
  it('recomputes the totals after a correction and preserves the evidence', () => {
    const g = structuredClone(plan.goals[0]);
    g.entries[0] = { ...g.entries[0], quantity: 4, expense: 1500 };
    expect(recoveryProgress(g)).toBe(80);
    expect(recoveryExpenses(g)).toBe(1500);
    expect(g.entries[0].photos).toEqual(plan.goals[0].entries[0].photos);
  });
});
