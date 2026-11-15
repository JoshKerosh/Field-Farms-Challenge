import { describe, expect, it } from 'vitest';
import { evaluateConditionRisk } from '@field-farms/domain';
import { parseConditionMap } from './condition-map';

const fixture = () => ({
  schemaVersion: 'alert-condition-map-v1',
  dataMode: 'real',
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'synthetic',
        name: 'Test polygon',
        conditions: {
          saturation: {
            value: 0.95,
            unit: 'fraction-of-pore-space',
            status: 'available',
            source: 'https://example.test/fixture',
            observedAt: '2026-11-15T00:00:00Z',
            validUntil: '2026-11-16T00:00:00Z',
          },
        },
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-85, 10],
            [-84, 10],
            [-84, 11],
            [-85, 10],
          ],
        ],
      },
    },
  ],
});
describe('spatial condition observations', () => {
  it('does not invent soil or terrain observations from moisture alone', () => {
    const zones = parseConditionMap(fixture());
    expect(zones).toHaveLength(1);
    expect(
      evaluateConditionRisk('landslide', zones![0].conditions, new Date('2026-11-15T12:00:00Z')),
    ).toMatchObject({ color: 'gray', matched: 1, known: 1 });
  });
  it('allows an explicitly empty collection with no implied green coverage', () => {
    expect(parseConditionMap({ ...fixture(), features: [] })).toEqual([]);
  });
  it('rejects demos, duplicate identities, wrong units, points and invalid coordinates', () => {
    expect(parseConditionMap({ ...fixture(), dataMode: 'demo' })).toBeNull();
    const duplicate = fixture();
    duplicate.features.push(duplicate.features[0]);
    expect(parseConditionMap(duplicate)).toBeNull();
    const unit = fixture();
    unit.features[0].properties.conditions.saturation.unit = 'GWETROOT';
    expect(parseConditionMap(unit)).toBeNull();
    const invalid = fixture();
    invalid.features[0].geometry.coordinates[0][0][0] = 190;
    expect(parseConditionMap(invalid)).toBeNull();
    const point = fixture();
    point.features[0].geometry.type = 'Point';
    expect(parseConditionMap(point)).toBeNull();
  });
});
