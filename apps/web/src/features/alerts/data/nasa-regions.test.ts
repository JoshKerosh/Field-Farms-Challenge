import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateRegionalNasaRisk } from '@field-farms/domain';
import { parseNasaRegions } from './nasa-regions';

const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL('../../../../public/data/alerts/nasa-regions.geojson', import.meta.url),
      'utf8',
    ),
  );
describe('published real NASA regional dataset', () => {
  it('validates all 34 regions and retains coverage, dates and sampled terrain', () => {
    const parsed = parseNasaRegions(fixture());
    expect(parsed).not.toBeNull();
    expect(parsed?.regions).toHaveLength(34);
    const now = new Date(`${parsed!.observedEnd}T12:00:00Z`);
    expect(parsed!.regions.every((r) => r.terrain.sampleCount === 9)).toBe(true);
    expect(
      parsed!.regions.every(
        (r) => evaluateRegionalNasaRisk('landslide', r.weather, r.terrain, now).known === 3,
      ),
    ).toBe(true);
  });
  it('rejects fake sources, changed resolution and inconsistent samples', () => {
    const fake = fixture();
    fake.sources[0].url = 'https://example.test/not-nasa';
    expect(parseNasaRegions(fake)).toBeNull();
    const fine = fixture();
    fine.spatial.powerResolutionDegrees = [0.001, 0.001];
    expect(parseNasaRegions(fine)).toBeNull();
    const terrain = fixture();
    terrain.features[0].properties.terrain.slopeDegreesMax = 89;
    expect(parseNasaRegions(terrain)).toBeNull();
    const missing = fixture();
    missing.features[0].properties.terrain.samples.pop();
    expect(parseNasaRegions(missing)).toBeNull();
    const duplicate = fixture();
    duplicate.features.push(duplicate.features[0]);
    expect(parseNasaRegions(duplicate)).toBeNull();
  });
  it('accepts missing weather as unknown and rejects incomplete period metadata', () => {
    const missing = fixture();
    missing.features[0].properties.weather.wetness3d = null;
    expect(parseNasaRegions(missing)?.regions[0].weather.wetness3d).toBeNull();
    const invalid = fixture();
    invalid.features[0].properties.weather.observedStart = '2026-01-01';
    expect(parseNasaRegions(invalid)).toBeNull();
  });
});
