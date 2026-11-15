import { useId, useState } from 'react';
import {
  CONDITION_COLORS,
  CONDITION_RULES,
  evaluateConditionRisk,
  type ConditionHazard,
} from '@field-farms/domain';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { geometryDrawing, type HazardMapData } from '../data/hazard-map';
import type { ConditionZone } from '../data/condition-map';

export function ConditionRiskMap({
  base,
  zones,
  loading,
}: {
  base: HazardMapData | null;
  zones: ConditionZone[] | null;
  loading: boolean;
}) {
  useMessageLanguage();
  const id = useId();
  const [hazard, setHazard] = useState<ConditionHazard>('landslide');
  const [selected, setSelected] = useState('');
  const [zoom, setZoom] = useState(1);
  const [west, south, east, north] = base?.bounds ?? [-86, 8, -82, 12];
  const cosine = Math.cos(((south + north) * Math.PI) / 360);
  const scale = Math.min(440 / ((east - west) * cosine), 280 / (north - south));
  const project = (lon: number, lat: number): [number, number] => [
    (480 - (east - west) * cosine * scale) / 2 + (lon - west) * cosine * scale,
    (320 - (north - south) * scale) / 2 + (north - lat) * scale,
  ];
  const boundary = base ? geometryDrawing(base.subbasin.geometry, project) : null;
  const now = new Date();
  const rows = (zones ?? []).map((zone) => ({
    ...zone,
    result: evaluateConditionRisk(hazard, zone.conditions, now),
  }));
  const chosen = rows.find((row) => row.id === selected);
  const colorName = (color: keyof typeof CONDITION_COLORS) => message(`alerts.conditions.${color}`);
  if (!loading && (!base || !rows.length))
    return (
      <section className="v10-card" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`}>{message('alerts.conditions.title')}</h2>
        <p>{message('alerts.conditions.missing')}</p>
        <p>{message('alerts.futureNotice')}</p>
        <details>
          <summary>{message('alerts.missingEvidence')}</summary>
          <p>
            {message(
              'alerts.conditions.landslideRule',
              CONDITION_RULES.saturationRatioMin * 100,
              CONDITION_RULES.landslideSlopeDegreesMin,
            )}
          </p>
          <p>
            {message(
              'alerts.conditions.floodRule',
              CONDITION_RULES.saturationRatioMin * 100,
              CONDITION_RULES.floodHeightAboveDrainageMetresMax,
            )}
          </p>
        </details>
      </section>
    );
  return (
    <section className="v10-card" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{message('alerts.conditions.title')}</h2>
      <p id={`${id}-notice`}>{message('alerts.conditions.notice')}</p>
      <div className="v10-pill-row" role="group" aria-label={message('alerts.conditions.hazard')}>
        {(['landslide', 'flood'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="v10-pill-btn"
            aria-pressed={hazard === value}
            onClick={() => {
              setHazard(value);
              setSelected('');
            }}
          >
            {message(`alerts.conditions.${value}`)}
          </button>
        ))}
      </div>
      <p>
        {message(
          hazard === 'landslide'
            ? 'alerts.conditions.landslideRule'
            : 'alerts.conditions.floodRule',
          CONDITION_RULES.saturationRatioMin * 100,
          hazard === 'landslide'
            ? CONDITION_RULES.landslideSlopeDegreesMin
            : CONDITION_RULES.floodHeightAboveDrainageMetresMax,
        )}
      </p>
      <p role="status">
        {message(
          loading
            ? 'alerts.map.loading'
            : !base
              ? 'alerts.map.noData'
              : rows.length
                ? 'alerts.conditions.available'
                : 'alerts.conditions.missing',
        )}
      </p>
      {boundary && (
        <>
          <figure className="alert-hazard-map">
            <svg
              viewBox={`${240 - 240 / zoom} ${160 - 160 / zoom} ${480 / zoom} ${320 / zoom}`}
              role="img"
              aria-label={message('alerts.conditions.svgLabel', base!.subbasin.name)}
              aria-describedby={`${id}-notice`}
            >
              <defs>
                <clipPath id={`${id}-basin`}>
                  {boundary.paths.map((d, index) => (
                    <path key={index} d={d} fillRule="evenodd" clipRule="evenodd" />
                  ))}
                </clipPath>
              </defs>
              {boundary.paths.map((d, index) => (
                <path
                  key={index}
                  d={d}
                  fill={CONDITION_COLORS.gray}
                  fillOpacity="0.3"
                  fillRule="evenodd"
                  stroke="var(--color-muted)"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <g clipPath={`url(#${id}-basin)`}>
                {rows.map((zone) => (
                  <g key={zone.id}>
                    <title>
                      {zone.name}: {colorName(zone.result.color)} ({zone.result.matched}/3)
                    </title>
                    {geometryDrawing(zone.geometry, project).paths.map((d, index) => (
                      <path
                        key={index}
                        d={d}
                        fill={CONDITION_COLORS[zone.result.color]}
                        fillOpacity="0.75"
                        fillRule="evenodd"
                        stroke={selected === zone.id ? 'var(--color-ink)' : 'var(--color-surface)'}
                        strokeWidth={selected === zone.id ? 3 : 0.7}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                ))}
              </g>
            </svg>
            <figcaption>{message('alerts.conditions.caption', base!.subbasin.name)}</figcaption>
          </figure>
          <div className="v10-pill-row" role="group" aria-label={message('alerts.map.zoom')}>
            <button
              type="button"
              className="v10-pill-btn"
              disabled={zoom >= 8}
              onClick={() => setZoom((v) => v * 2)}
            >
              {message('alerts.map.zoomIn')}
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              disabled={zoom <= 1}
              onClick={() => setZoom((v) => v / 2)}
            >
              {message('alerts.map.zoomOut')}
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              onClick={() => {
                setZoom(1);
                setSelected('');
              }}
            >
              {message('alerts.map.reset')}
            </button>
          </div>
        </>
      )}
      <ul className="alert-map-legend" aria-label={message('alerts.map.legend')}>
        {(['red', 'orange', 'yellow', 'green', 'gray'] as const).map((color) => (
          <li key={color}>
            <span
              className="alert-map-swatch"
              style={{ backgroundColor: CONDITION_COLORS[color] }}
              aria-hidden="true"
            />
            {colorName(color)}
          </li>
        ))}
      </ul>
      {rows.length > 0 && (
        <label className="alert-data-control" htmlFor={`${id}-zone`}>
          {message('alerts.conditions.selectZone')}
          <select
            id={`${id}-zone`}
            value={chosen ? selected : ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">{message('alerts.map.allFeatures')}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {colorName(row.result.color)}
              </option>
            ))}
          </select>
        </label>
      )}
      {chosen && (
        <div aria-live="polite">
          <p>
            {chosen.name} · {colorName(chosen.result.color)}
          </p>
          <ul>
            {(['saturation', 'soil', 'terrain'] as const).map((key) => (
              <li key={key}>
                {message(`alerts.conditions.${key}`)}:{' '}
                {message(
                  chosen.result.conditions[key] === null
                    ? 'alerts.conditions.unknown'
                    : chosen.result.conditions[key]
                      ? 'alerts.conditions.yes'
                      : 'alerts.conditions.no',
                )}
              </li>
            ))}
          </ul>
          <ul>
            {Object.entries(chosen.conditions)
              .filter(([key]) =>
                hazard === 'landslide'
                  ? ['saturation', 'slope', 'susceptibleSoil'].includes(key)
                  : ['saturation', 'heightAboveDrainage', 'poorDrainage'].includes(key),
              )
              .map(
                ([key, reading]) =>
                  reading && (
                    <li key={key}>
                      {message(
                        key === 'saturation'
                          ? 'alerts.conditions.saturation'
                          : ['slope', 'heightAboveDrainage'].includes(key)
                            ? 'alerts.conditions.terrain'
                            : 'alerts.conditions.soil',
                      )}{' '}
                      · {reading.observedAt}{' '}
                      {/^https:\/\//.test(reading.source) && (
                        <a href={reading.source} target="_blank" rel="noreferrer">
                          {message('alerts.conditions.source')}
                        </a>
                      )}
                    </li>
                  ),
              )}
          </ul>
        </div>
      )}
      <p className="v10-small">
        {message('alerts.conditions.limits')} · {CONDITION_RULES.version}
      </p>
    </section>
  );
}
