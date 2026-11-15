import type { WaterReading } from '@field-farms/domain';
import { copy, number } from '../../i18n';
import { message, useMessageLanguage } from '../../i18n/messages';
/** The adjacent readings table is the text equivalent of this decorative chart. */
export function FlowChart({ readings }: { readings: WaterReading[] }) {
  useMessageLanguage();
  const values = readings
    .filter((reading) => reading.kind === 'flow')
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  if (values.length < 2) return null;
  const ceiling = Math.max(...values.map((value) => value.value), 1) * 1.2;
  const points = values.map((reading, index) => ({
    x: 48 + (index * 390) / (values.length - 1),
    y: 140 - (reading.value / ceiling) * 120,
    value: reading.value,
  }));
  return (
    <figure className="flow-chart">
      <svg viewBox="0 0 480 166" aria-hidden="true" focusable="false">
        <line x1="38" y1="140" x2="450" y2="140" stroke="#DCE4DD" />
        <line x1="38" y1="80" x2="450" y2="80" stroke="#DCE4DD" />
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#17617C"
          strokeWidth="3"
        />
        {points.map((point, index) => (
          <g key={index}>
            <circle cx={point.x} cy={point.y} r="5" fill="#17617C" />
            <text x={point.x} y={point.y - 15} textAnchor="middle" fill="#16231C" fontSize="15">
              {number(point.value)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        {copy.water.chartLabel}
        {message('mae75154c344b')}
      </figcaption>
    </figure>
  );
}
