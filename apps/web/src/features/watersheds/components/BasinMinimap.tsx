import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { useMemo } from 'react';
import { copy } from '../../../i18n';
import type { BasinProperties } from '../analysis/parcel-analysis';
import type { MapView } from './BasinMap';

/** Costa Rica frame in degrees; x = longitude, y = -latitude. */
const FRAME = { west: -86.0, east: -82.5, north: 11.3, south: 8.0 };
/** The minimap only needs the silhouette: keep one vertex in this many. */
const STEP = 6;
/** Below this many degrees the view box would be a speck; draw a dot instead. */
const MIN_BOX = 0.03;

/**
 * Inline SVG minimap: Costa Rica with muted basins and the area the main map shows.
 * An SVG instead of a second WebGL map keeps phones light.
 */
export function BasinMinimap({
  basins,
  view,
  onPick,
}: {
  basins: FeatureCollection<Polygon | MultiPolygon, BasinProperties>;
  view: MapView | null;
  onPick: (lng: number, lat: number) => void;
}) {
  const paths = useMemo(
    () =>
      basins.features.map((f) => ({
        id: f.properties.cuenca_no,
        color: f.properties.color,
        d: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
          .map((polygon) => ring(polygon[0]))
          .join(''),
      })),
    [basins],
  );
  const width = FRAME.east - FRAME.west;
  const height = FRAME.north - FRAME.south;
  const box = view && {
    x: view.bounds[0],
    y: -view.bounds[3],
    w: view.bounds[2] - view.bounds[0],
    h: view.bounds[3] - view.bounds[1],
  };
  const tiny = box && (box.w < MIN_BOX || box.h < MIN_BOX);

  return (
    <svg
      className="basin-minimap"
      viewBox={`${FRAME.west} ${-FRAME.north} ${width} ${height}`}
      role="img"
      aria-label={copy.watershed.explorer.minimap}
      onClick={(event) => {
        const svg = event.currentTarget;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const local = point.matrixTransform(svg.getScreenCTM()!.inverse());
        onPick(local.x, -local.y);
      }}
    >
      {paths.map((p) => (
        <path key={p.id} d={p.d} fill={p.color} stroke={p.color} />
      ))}
      {box &&
        (tiny ? (
          <circle className="minimap-dot" cx={box.x + box.w / 2} cy={box.y + box.h / 2} r={0.06} />
        ) : (
          <rect className="minimap-box" x={box.x} y={box.y} width={box.w} height={box.h} />
        ))}
    </svg>
  );
}

function ring(coords: Position[]): string {
  const points = coords.filter((_, i) => i % STEP === 0 || i === coords.length - 1);
  return `M${points.map(([x, y]) => `${x.toFixed(3)},${(-y).toFixed(3)}`).join('L')}Z`;
}
