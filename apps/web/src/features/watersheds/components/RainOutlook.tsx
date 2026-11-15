import { CloudRain } from 'lucide-react';
import { useState } from 'react';
import { REGION_NAMES, rainFactor, seasonLength } from '../../../data/engine/climate';
import type { DemoScenario } from '../../../data/engine/climate';
import { MONTHS } from '../../../data/engine/format';
import type { Dataset, RegionCode } from '../../../data/real/types';
import { copy, number } from '../../../i18n';

/** November to April: the dry season, when El Niño changes the most. */
const SEASON = [10, 11, 0, 1, 2, 3];
const COLORS = { normal: '#3F7FBF', nino: '#D08A2E' };

interface MonthRain {
  month: string;
  normal: number;
  nino: number;
}

/** Rain outlook for the farm's climate zone: normal against an El Niño year, plus 2026 so far. */
export function RainOutlook({
  ds,
  reg,
  demo,
}: {
  ds: Dataset;
  reg: RegionCode;
  demo: DemoScenario | null;
}) {
  const c = copy.rain;
  const nasa = ds.climate.NASA;
  const zone = nasa[reg];
  const factor = rainFactor(ds, reg, 'nino');
  const months: MonthRain[] = SEASON.map((m) => ({
    month: MONTHS[m],
    normal: zone.clim.rain[m],
    nino: Math.round(zone.clim.rain[m] * factor[m]),
  }));
  const total = (key: 'normal' | 'nino') => months.reduce((sum, m) => sum + m[key], 0);
  const change = Math.round(100 * (total('nino') / Math.max(1, total('normal')) - 1));
  const { dN, dE } = seasonLength(ds, reg, demo);
  const now = zone.y2026;
  const [lat, lon] = nasa.puntos[reg];
  const [active, setActive] = useState<number | null>(null);

  return (
    <article className="v10-card rain-outlook" aria-labelledby="rain-title">
      <h2 id="rain-title">
        <CloudRain size={18} aria-hidden="true" /> {c.title}
      </h2>
      <p className="v10-small">
        {c.zone(REGION_NAMES[reg], `${number(lat, 2)}, ${number(lon, 2)}`)}
      </p>
      <p className="rain-enso">
        <strong>{ensoLabel(nasa.ONI.actual)}</strong>{' '}
        {c.ensoIndex(nasa.ONI.actual.toFixed(1).replace('.', ','), nasa.ONI.temporada)}
      </p>

      <dl className="rain-stats">
        <div>
          <dt>{c.seasonChange}</dt>
          <dd>{`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)} %`}</dd>
          <dd className="v10-small">{c.seasonChangeDetail}</dd>
        </div>
        <div>
          <dt>{c.dryMonths}</dt>
          <dd>{c.months(dE)}</dd>
          <dd className="v10-small">{c.dryNormal(dN)}</dd>
        </div>
        <div>
          <dt>{c.last30}</dt>
          <dd>{`${number(now.rain30, 0)} mm`}</dd>
          <dd className="v10-small">{c.anomaly(now.rain30Anom)}</dd>
        </div>
      </dl>

      <RainChart months={months} active={active} onActive={setActive} />
      <p className="v10-small rain-readout" aria-live="polite">
        {active === null
          ? c.hint
          : c.readout(months[active].month, months[active].normal, months[active].nino)}
      </p>
      <div className="v10-legend-row">
        <span className="v10-legend-dot">
          <i style={{ background: COLORS.normal }} /> {c.normal}
        </span>
        <span className="v10-legend-dot">
          <i style={{ background: COLORS.nino }} /> {c.nino}
        </span>
      </div>

      <details className="rain-table">
        <summary>{c.table}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{c.month}</th>
              <th scope="col">{c.normal}</th>
              <th scope="col">{c.nino}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{m.month}</th>
                <td>{m.normal} mm</td>
                <td>{m.nino} mm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="v10-small">{c.note(c.year(now.ytdAnom), formatDay(now.last))}</p>
    </article>
  );
}

/**
 * Grouped bars on one axis in mm, drawn in HTML so text keeps its size on any screen.
 * Each month is one hover and focus target.
 */
function RainChart({
  months,
  active,
  onActive,
}: {
  months: MonthRain[];
  active: number | null;
  onActive: (index: number | null) => void;
}) {
  const c = copy.rain;
  const max = Math.max(10, ...months.flatMap((m) => [m.normal, m.nino]));
  const step = [10, 20, 25, 50, 100, 200].find((s) => max / s <= 4) ?? 250;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(100 * v) / top}%`;

  return (
    <div
      className="rain-chart"
      role="group"
      aria-label={c.chartLabel}
      onMouseLeave={() => onActive(null)}
    >
      <span className="rain-unit" aria-hidden="true">
        mm
      </span>
      <div className="rain-plot" aria-hidden="true">
        {ticks.map((t) => (
          <div
            key={t}
            className={t ? 'rain-tick' : 'rain-tick rain-base'}
            style={{ bottom: pct(t) }}
          >
            <span>{t}</span>
          </div>
        ))}
        {months.map((m, i) => (
          <div
            key={m.month}
            className={active === i ? 'rain-month is-active' : 'rain-month'}
            onMouseEnter={() => onActive(i)}
          >
            <div
              className="rain-bar"
              style={{ height: pct(m.normal), background: COLORS.normal }}
            />
            <div className="rain-bar" style={{ height: pct(m.nino), background: COLORS.nino }}>
              <span className="rain-value">{m.nino}</span>
            </div>
            <span className="rain-label">{m.month}</span>
          </div>
        ))}
      </div>
      {/* Keyboard users step through the months with these. */}
      <div className="rain-keys">
        {months.map((m, i) => (
          <button
            key={m.month}
            type="button"
            className="sr-only"
            onFocus={() => onActive(i)}
            onBlur={() => onActive(null)}
          >
            {c.readout(m.month, m.normal, m.nino)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ensoLabel(oni: number): string {
  const c = copy.rain.enso;
  if (oni >= 1.5) return c.ninoStrong;
  if (oni >= 1) return c.ninoModerate;
  if (oni >= 0.5) return c.ninoWeak;
  if (oni <= -0.5) return c.nina;
  return c.neutral;
}

/** '20261110' → '10 nov 2026'. */
function formatDay(day: string): string {
  return `${Number(day.slice(6, 8))} ${MONTHS[Number(day.slice(4, 6)) - 1]} ${day.slice(0, 4)}`;
}
