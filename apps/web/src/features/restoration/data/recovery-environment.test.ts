import { describe, it, expect } from 'vitest';
import { summarizePixels } from './recovery-environment';
describe('environmental comparisons', () => {
  it('requires common valid pixels rather than independently clear images', () => {
    const months = ['2025-01', '2026-01'];
    const pixels = Array.from({ length: 10 }, (_, i) => ({
      lat: 10,
      lon: -84,
      ndvi: [i < 8 ? 0.5 : null, i >= 2 ? 0.7 : null],
      rain: [10, 20],
    }));
    const rows = summarizePixels(pixels, months);
    expect(rows[1].coverage).toBe(0.8);
    expect(rows[1].change).toBe(null);
  });
  it('compares the same month and preserves negative valid vegetation values', () => {
    const rows = summarizePixels(
      [{ lat: 10, lon: -84, ndvi: [-0.1, 0.1], rain: [null, 0] }],
      ['2025-01', '2026-01'],
    );
    expect(rows[1].change).toBeCloseTo(0.2);
    expect(rows[0].ndvi).toBe(-0.1);
    expect(rows[0].rain).toBe(null);
    expect(rows[1].rain).toBe(0);
  });
});
