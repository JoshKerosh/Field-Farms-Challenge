import { describe, expect, it } from 'vitest';
import map from '../../../../public/data/alerts/cne/map.json';
import { geometryDrawing, parseHazardMap } from './hazard-map';

describe('CNE historical cartography (no risk classification)', () => {
  it('validates the downloaded map and keeps counts and provenance separate from risk', () => {
    const parsed = parseHazardMap(map);
    expect(parsed).not.toBeNull();
    expect(
      parsed?.layers.find((layer) => layer.id === 'floodZone')?.features.length,
    ).toBeGreaterThan(0);
    expect(parsed?.layers.find((layer) => layer.id === 'landslideZone')?.matchedCount).toBe(0);
  });
  it('rejects simulated layers, invented observation dates and false completeness claims', () => {
    expect(parseHazardMap({ ...map, dataMode: 'demo' })).toBeNull();
    expect(parseHazardMap({ ...map, observedEnd: '2026-11-15' })).toBeNull();
    const bad = structuredClone(map);
    bad.layers[0].completeQuery = false;
    expect(parseHazardMap(bad)).toBeNull();
  });
  it('preserves polygon holes and represents recorded points as points, not areas', () => {
    const drawing = geometryDrawing(
      {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 0],
          ],
          [
            [0.5, 0.5],
            [1, 0.5],
            [1, 1],
            [0.5, 0.5],
          ],
        ],
      },
      (x, y) => [x, y],
    );
    expect(drawing.paths[0].match(/M/g)).toHaveLength(2);
    const point = geometryDrawing({ type: 'Point', coordinates: [1, 2] }, (x, y) => [x, y]);
    expect(point.paths).toEqual([]);
    expect(point.points).toEqual([[1, 2]]);
  });
});
