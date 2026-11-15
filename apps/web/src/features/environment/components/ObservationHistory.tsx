import type { PuntoSerie } from '@field-farms/domain';
import { date, number } from '../../../i18n';
import { environmentCopy } from '../../../i18n/environment-copy';
import { useMessageLanguage } from '../../../i18n/messages';

export function ObservationHistory({
  series,
  parameter,
  title,
  unit,
}: {
  series: PuntoSerie[];
  parameter: string;
  title: string;
  unit: string;
}) {
  const text = environmentCopy[useMessageLanguage()];
  const points = series
    .map((point) => ({ date: point.fecha, value: point.valores[parameter] ?? null }))
    .sort((first, second) => first.date.localeCompare(second.date));
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
  if (!values.length) return <p>{text.noHistory}</p>;
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const firstDate = Date.parse(points[0].date);
  const lastDate = Date.parse(points[points.length - 1].date);
  const horizontalPosition = (value: string) =>
    lastDate === firstDate
      ? 320
      : 8 + ((Date.parse(value) - firstDate) / (lastDate - firstDate)) * 624;
  const verticalPosition = (value: number) => 172 - ((value - minimum) / (maximum - minimum)) * 160;
  let connected = false;
  const path = points
    .map((point) => {
      if (point.value === null) {
        connected = false;
        return '';
      }
      const horizontal = horizontalPosition(point.date);
      const vertical = verticalPosition(point.value);
      const segment = `${connected ? 'L' : 'M'}${horizontal.toFixed(2)},${vertical.toFixed(2)}`;
      connected = true;
      return segment;
    })
    .join(' ');
  return (
    <div className="environment-history">
      <h3>{title}</h3>
      <p>
        {date(points[0].date)} – {date(points[points.length - 1].date)} · {unit}
      </p>
      <svg viewBox="0 0 640 184" role="img" aria-label={title} className="environment-chart">
        <path d="M8,172H632" fill="none" stroke="var(--color-line)" />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3" />
        {points.flatMap((point) =>
          point.value === null
            ? []
            : [
                <circle
                  key={point.date}
                  cx={horizontalPosition(point.date)}
                  cy={verticalPosition(point.value)}
                  r="2.5"
                  fill="var(--color-primary)"
                />,
              ],
        )}
      </svg>
      <details>
        <summary>{text.table}</summary>
        <div className="environment-table">
          <table>
            <caption>
              {title} · {unit}
            </caption>
            <thead>
              <tr>
                <th scope="col">{text.date}</th>
                <th scope="col">{text.value}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{date(point.date)}</th>
                  <td>{point.value === null ? text.unavailable : number(point.value, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
