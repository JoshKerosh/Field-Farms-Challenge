import { useState } from 'react';
import { date, number } from '../../../i18n';
import { message, messageLanguage, useMessageLanguage } from '../../../i18n/messages';
import {
  compareClimatePeriods,
  type ClimateHistory,
  type ClimateMetric,
} from '../data/climate-history';

export function ClimateHistoryPanel({ history }: { history: ClimateHistory | null }) {
  useMessageLanguage();
  const [metric, setMetric] = useState<ClimateMetric>('precipitationMm');
  const [visibleDays, setVisibleDays] = useState<7 | 30 | 90>(30);
  const [periodDays, setPeriodDays] = useState<1 | 7 | 30>(30);
  const label = message(
    metric === 'precipitationMm' ? 'alerts.history.rain' : 'alerts.history.wetness',
  );
  const formatted = (value: number | null) =>
    value === null
      ? message('alerts.noValue')
      : `${number(value, metric === 'precipitationMm' ? 2 : 3)}${metric === 'precipitationMm' ? ' mm' : ''}`;
  const series = history?.daily.slice(-visibleDays) ?? [];
  const comparison = history ? compareClimatePeriods(history, metric, periodDays) : null;
  const values = series.flatMap((day) => (day[metric] === null ? [] : [day[metric]!]));
  const ceiling = metric === 'rootZoneWetness' ? 1 : Math.max(1, ...values) * 1.1;
  let path = '',
    previousValid = false;
  series.forEach((day, index) => {
    const value = day[metric];
    if (value === null) {
      previousValid = false;
      return;
    }
    const x = 44 + (index * 408) / Math.max(series.length - 1, 1),
      y = 160 - (value / ceiling) * 135;
    path += `${previousValid ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    previousValid = true;
  });
  return (
    <section className="v10-card" aria-labelledby="alert-history-title">
      <h2 id="alert-history-title">{message('alerts.history.title')}</h2>
      <p className="v10-small">{message('alerts.observationsNotice')}</p>
      {!history ? (
        <p>{message('alerts.history.noData')}</p>
      ) : (
        <>
          <div className="alert-observation-controls">
            <label className="alert-data-control" htmlFor="alert-history-metric">
              {message('alerts.history.indicator')}
              <select
                id="alert-history-metric"
                value={metric}
                onChange={(e) => setMetric(e.target.value as ClimateMetric)}
              >
                <option value="precipitationMm">{message('alerts.history.rain')}</option>
                <option value="rootZoneWetness">{message('alerts.history.wetness')}</option>
              </select>
            </label>
            <label className="alert-data-control" htmlFor="alert-history-range">
              {message('alerts.history.visibleDays')}
              <select
                id="alert-history-range"
                value={visibleDays}
                onChange={(e) => setVisibleDays(Number(e.target.value) as 7 | 30 | 90)}
              >
                {[7, 30, 90].map((days) => (
                  <option key={days} value={days}>
                    {message('alerts.history.days', days)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <figure className="alert-history-chart">
            <svg viewBox="0 0 480 195" aria-hidden="true" focusable="false">
              {[0, 0.5, 1].map((fraction) => (
                <g key={fraction}>
                  <line
                    x1="44"
                    x2="452"
                    y1={160 - 135 * fraction}
                    y2={160 - 135 * fraction}
                    stroke="var(--color-line)"
                  />
                  <text
                    x="38"
                    y={164 - 135 * fraction}
                    textAnchor="end"
                    fill="var(--color-ink)"
                    fontSize="12"
                  >
                    {number(ceiling * fraction, 1)}
                  </text>
                </g>
              ))}
              <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
              {series.map((day, index) =>
                day[metric] === null ? null : (
                  <circle
                    key={day.date}
                    cx={44 + (index * 408) / Math.max(series.length - 1, 1)}
                    cy={160 - (day[metric]! / ceiling) * 135}
                    r="1.8"
                    fill="var(--color-primary)"
                  />
                ),
              )}
              <text x="44" y="185" fill="var(--color-ink)" fontSize="12">
                {date(series[0].date)}
              </text>
              <text x="452" y="185" textAnchor="end" fill="var(--color-ink)" fontSize="12">
                {date(series[series.length - 1].date)}
              </text>
            </svg>
            <figcaption>
              {label} · {date(series[0].date)} – {date(history.observedEnd)}.{' '}
              {message('alerts.history.gaps')}
            </figcaption>
          </figure>
          {metric === 'rootZoneWetness' && (
            <p className="v10-small">{message('alerts.history.wetnessNote')}</p>
          )}
          <details>
            <summary>{message('alerts.history.showTable', series.length)}</summary>
            <div
              className="table-scroll"
              role="region"
              tabIndex={0}
              aria-label={message('alerts.history.table')}
            >
              <table className="alert-history-table">
                <caption>{message('alerts.history.table')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{message('alerts.history.day')}</th>
                    <th scope="col">{label}</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{date(day.date)}</th>
                      <td>{formatted(day[metric])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <h3 id="alert-comparison-title">{message('alerts.comparison.title')}</h3>
          <p>
            {message(
              'alerts.comparison.method',
              metric === 'precipitationMm'
                ? message('alerts.comparison.sum')
                : message('alerts.comparison.mean'),
            )}
          </p>
          <label className="alert-data-control" htmlFor="alert-comparison-period">
            {message('alerts.comparison.period')}
            <select
              id="alert-comparison-period"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value) as 1 | 7 | 30)}
            >
              {[1, 7, 30].map((days) => (
                <option value={days} key={days}>
                  {days === 1
                    ? message('alerts.history.oneDay')
                    : message('alerts.history.days', days)}
                </option>
              ))}
            </select>
          </label>
          {comparison && (
            <div className="alert-comparison-grid" aria-live="polite">
              {(
                [
                  ['current', comparison.current],
                  ['previous', comparison.previous],
                ] as const
              ).map(([key, window]) => (
                <div key={key} className="alert-comparison-item">
                  <strong>{message(`alerts.comparison.${key}`)}</strong>
                  <p>
                    {date(window.start)} – {date(window.end)}
                  </p>
                  <p className="alert-comparison-value">{formatted(window.value)}</p>
                  <span className="v10-small">
                    {message('alerts.comparison.coverage', window.validDays, window.expectedDays)}
                  </span>
                </div>
              ))}
              <div className="alert-comparison-item">
                <strong>{message('alerts.comparison.change')}</strong>
                <p className="alert-comparison-value">
                  {comparison.difference !== null && comparison.difference > 0 ? '+' : ''}
                  {formatted(comparison.difference)}
                </p>
                <p>
                  {comparison.percent === null
                    ? message(
                        comparison.reason === 'zero-reference'
                          ? 'alerts.comparison.zero'
                          : 'alerts.comparison.incomplete',
                      )
                    : `${comparison.percent > 0 ? '+' : ''}${number(comparison.percent, 2)} %`}
                </p>
              </div>
            </div>
          )}
          <p className="v10-small">
            <a href={history.sourceUrl} target="_blank" rel="noreferrer">
              {message('alerts.history.powerSource')}
            </a>
            {' · '}
            {message('alerts.history.point', history.latitude, history.longitude)}
            <br />
            {message(
              'alerts.history.downloaded',
              new Intl.DateTimeFormat(messageLanguage() === 'en' ? 'en-US' : 'es-CR', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'America/Costa_Rica',
              }).format(new Date(history.retrievedAt)),
            )}
          </p>
        </>
      )}
    </section>
  );
}
