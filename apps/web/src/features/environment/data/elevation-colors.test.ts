import { describe, expect, it } from 'vitest';
import { altitudeColor, terrariumElevation, ALTITUDE_STOPS } from './elevation-colors';

describe('elevation heatmap', () => {
  it('decodes actual Terrarium meters, including fractional and below sea level values', () => {
    expect(terrariumElevation(128, 0, 0)).toBe(0);
    expect(terrariumElevation(131, 232, 0)).toBe(1000);
    expect(terrariumElevation(127, 255, 0)).toBe(-1);
    expect(terrariumElevation(128, 1, 128)).toBe(1.5);
  });
  it('uses the same physical elevation stops as its legend', () => {
    for (const [height, color] of ALTITUDE_STOPS) expect(altitudeColor(height)).toEqual(color);
    expect(altitudeColor(-2000)).toEqual(ALTITUDE_STOPS[0][1]);
    expect(altitudeColor(9000)).toEqual(ALTITUDE_STOPS.at(-1)![1]);
    const midpoint = altitudeColor(1125);
    expect(midpoint).toEqual([201, 192, 107]);
  });
});
