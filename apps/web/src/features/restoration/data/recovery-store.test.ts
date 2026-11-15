import 'fake-indexeddb/auto';
import { describe, it, expect, vi } from 'vitest';
import { loadRecoveryPlan, saveRecoveryPlan } from './recovery-store';
import type { RecoveryPlan } from '@field-farms/domain';
const plan = (farmId: string): RecoveryPlan => ({
  version: 1,
  farmId,
  farmName: 'Farm',
  profile: { activity: 'carne', hectares: 10, animals: 3, water: 'asada' },
  confirmedAt: '2026-11-15',
  needs: {
    water: 'yes',
    soil: 'unknown',
    trees: 'no',
    cattle: 'unknown',
    shade: 'no',
    season: 'unknown',
  },
  goals: [],
});
describe('private local recovery plans', () => {
  it('hides the old generic record but preserves a new manually confirmed farm with that name', async () => {
    const example = { ...plan('legacy-example'), farmName: 'Finja Ejemplo' };
    await saveRecoveryPlan(example);
    expect(await loadRecoveryPlan(example.farmId)).toBe(null);
    await saveRecoveryPlan({ ...example, origin: 'manual' });
    expect((await loadRecoveryPlan(example.farmId))?.farmName).toBe('Finja Ejemplo');
  });
  it('does not replace an existing plan after a failed write', async () => {
    const original = plan('quota-test');
    await saveRecoveryPlan(original);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    await expect(saveRecoveryPlan({ ...original, farmName: 'Unsaved' })).rejects.toThrow();
    put.mockRestore();
    expect((await loadRecoveryPlan('quota-test'))?.farmName).toBe(original.farmName);
  });
  it('rejects malformed plans instead of persisting unusable data', async () => {
    await expect(
      saveRecoveryPlan({ ...plan('invalid'), needs: null as unknown as RecoveryPlan['needs'] }),
    ).rejects.toThrow();
    expect(await loadRecoveryPlan('invalid')).toBe(null);
  });
  it('persists photos, quantities and costs without mixing farms', async () => {
    const a = plan('siri-test-a');
    a.goals = [
      {
        id: 'g',
        template: 'water',
        target: 3,
        unit: 'points',
        due: '2027-01-01',
        place: '',
        status: 'active',
        budget: 2500,
        entries: [
          {
            id: 'e',
            date: '2026-11-15',
            quantity: 1,
            note: 'repair',
            expense: 1200,
            photos: [{ id: 'photo', data: new Uint8Array([1, 2, 3]).buffer }],
          },
        ],
      },
    ];
    await saveRecoveryPlan(a);
    await saveRecoveryPlan(plan('siri-test-b'));
    expect(await loadRecoveryPlan(a.farmId)).toEqual(a);
    expect((await loadRecoveryPlan('siri-test-b'))?.goals).toEqual([]);
    expect(await loadRecoveryPlan('unknown')).toBe(null);
  });
});
