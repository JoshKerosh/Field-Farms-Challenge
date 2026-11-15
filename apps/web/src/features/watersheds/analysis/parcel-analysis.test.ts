import { describe, expect, it } from 'vitest';
import type { Feature, Point, Polygon } from 'geojson';
import {
  basinShares,
  mostlyInside,
  nearbyStreams,
  nearbyWater,
  streamLabel,
  toParcel,
  type BasinProperties,
  type OperatorProperties,
  type StreamFeature,
  type WaterSourceProperties,
} from './parcel-analysis';

// Near Cartago: 0.001° ≈ 110 m.
const X = -84.04;
const Y = 9.83;
const box = <P>(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  properties: P,
): Feature<Polygon, P> => ({
  type: 'Feature',
  properties,
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  },
});
const parcel = box(X, Y, X + 0.002, Y + 0.002, {});
const basin = (no: number, x0: number, x1: number) =>
  box<BasinProperties>(x0, Y - 0.01, x1, Y + 0.01, {
    cuenca_no: no,
    nombre: `C${no}`,
    area_ha: 1,
    color: '#000',
  });
const point = <P>(x: number, y: number, properties: P): Feature<Point, P> => ({
  type: 'Feature',
  properties,
  geometry: { type: 'Point', coordinates: [x, y] },
});
const source = (x: number, y: number, nombre: string, ideo = 'A1') =>
  point<WaterSourceProperties>(x, y, {
    nombre,
    tipo: 'naciente',
    ideo,
    operador: `ASADA ${ideo}`,
    altitud: null,
    caudal: null,
  });
const line = (coords: [number, number][], nom_objeto = 'QUEBRADA INTERMITENTE'): StreamFeature => ({
  type: 'Feature',
  properties: { nom_objeto, nombre: null },
  geometry: { type: 'LineString', coordinates: coords },
});

describe('parcel analysis', () => {
  it('splits a parcel between two basins by area, largest first', () => {
    // Divide at 75 % of the parcel width.
    const divide = X + 0.0015;
    const shares = basinShares(parcel, [basin(24, X - 0.01, divide), basin(26, divide, X + 0.01)]);
    expect(shares.map((s) => s.basinNumber)).toEqual([24, 26]);
    expect(shares[0].percent).toBeCloseTo(75, 0);
    expect(shares[1].percent).toBeCloseTo(25, 0);
  });

  it('ignores slivers under 1 % of the parcel', () => {
    const shares = basinShares(parcel, [
      basin(1, X - 0.01, X + 0.00001),
      basin(2, X + 0.00001, X + 0.01),
    ]);
    expect(shares.map((s) => s.basinNumber)).toEqual([2]);
  });

  it('marks public roads and builds the farm number', () => {
    const road = toParcel({
      type: 'Feature',
      geometry: parcel.geometry,
      properties: {
        provincia: '3',
        canton: '01',
        distrito: '09',
        finca: 'V000012',
        identifica: 'x',
        plano: 'p',
        shape_area: 1,
      },
    });
    expect(road.isPublicRoad).toBe(true);
    expect(road.farmNumber).toBe('3-V000012');
  });

  it('measures streams that cross or pass near the parcel', () => {
    const crossing = line([
      [X + 0.001, Y - 0.001],
      [X + 0.001, Y + 0.003],
    ]);
    const near = line(
      [
        [X + 0.0025, Y - 0.001],
        [X + 0.0025, Y + 0.003],
      ],
      'RIO',
    );
    const far = line([
      [X + 0.02, Y],
      [X + 0.02, Y + 0.002],
    ]);
    const result = nearbyStreams(parcel, [near, crossing, far], 200);
    expect(result).toHaveLength(2);
    expect(result[0].stream.distanceM).toBe(0);
    expect(result[0].stream.insideM).toBeGreaterThan(200);
    expect(result[0].stream.intermittent).toBe(true);
    expect(result[1].stream.kind).toBe('Río');
    expect(result[1].stream.distanceM).toBeGreaterThan(40);
    expect(result[1].stream.distanceM).toBeLessThan(70);
  });

  it('lists sources within the radius grouped by operator, with nearby offices', () => {
    const operators = [
      point<OperatorProperties>(X + 0.003, Y, {
        cuenca_no: 9,
        ideo: 'B2',
        nombre: 'ASADA B2',
        tipo: 'ASADA',
        zona: 'Rural',
        servicios: 40,
        fuentes: 3,
        nacientes: 3,
      }),
    ];
    const water = nearbyWater(
      parcel,
      [
        source(X + 0.001, Y + 0.001, 'Dentro'),
        source(X + 0.0035, Y + 0.001, 'Cerca'),
        source(X + 0.05, Y, 'Lejos'),
      ],
      operators,
      300,
    );
    expect(water.nearestOutsideRadius).toBe(false);
    expect(water.sources.map((s) => s.name)).toEqual(['Dentro', 'Cerca']);
    expect(water.sources[0].distanceM).toBe(0);
    expect(water.operators.map((o) => [o.id, o.sources])).toEqual([
      ['A1', 2],
      ['B2', 0],
    ]);
    expect(water.operators[1].office?.services).toBe(40);
  });

  it('falls back to the nearest source when none is within the radius', () => {
    const water = nearbyWater(
      parcel,
      [source(X + 0.05, Y, 'Lejos'), source(X + 0.02, Y, 'Menos lejos')],
      [],
      300,
    );
    expect(water.nearestOutsideRadius).toBe(true);
    expect(water.sources.map((s) => s.name)).toEqual(['Menos lejos']);
  });

  it('keeps streams whose points are mostly in the selected basins', () => {
    const selected = [basin(24, X - 0.01, X)];
    const inside = line([
      [X - 0.005, Y],
      [X - 0.004, Y],
      [X + 0.001, Y],
    ]);
    const startsOnDivide = line([
      [X - 0.001, Y],
      [X + 0.001, Y],
      [X + 0.002, Y],
    ]);
    expect(mostlyInside(inside, selected)).toBe(true);
    expect(mostlyInside(startsOnDivide, selected)).toBe(false);
  });

  it('cleans IGN names', () => {
    expect(streamLabel({ nombre: 'QUEBRADA ALUMBRE', nom_objeto: 'QUEBRADA' })).toEqual({
      name: 'Quebrada Alumbre',
      kind: 'Quebrada',
    });
    expect(streamLabel({ nombre: 'RIO JERICO', nom_objeto: 'RIO' })).toEqual({
      name: 'Río Jerico',
      kind: 'Río',
    });
  });
});
