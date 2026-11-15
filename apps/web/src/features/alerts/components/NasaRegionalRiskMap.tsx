import { useEffect, useId, useState } from 'react';
import { bbox, booleanPointInPolygon } from '@turf/turf';
import {
  CONDITION_COLORS,
  REGIONAL_NASA_RULES,
  evaluateRegionalNasaRisk,
  type ConditionHazard,
} from '@field-farms/domain';
import { message, messageLanguage, useMessageLanguage } from '../../../i18n/messages';
import { geometryDrawing } from '../data/hazard-map';
import { loadNasaRegions, type NasaRegionalData } from '../data/nasa-regions';

export function NasaRegionalRiskMap({
  longitude,
  latitude,
}: {
  longitude: number;
  latitude: number;
}) {
  useMessageLanguage();
  const id = useId();
  const [data, setData] = useState<NasaRegionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hazard, setHazard] = useState<ConditionHazard>('landslide');
  const [selected, setSelected] = useState('');
  const [zoom, setZoom] = useState(1);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const controller = new AbortController();
    void loadNasaRegions(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setData(result);
        setLoading(false);
      }
    });
    const timer = setInterval(() => setClock(new Date()), 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  const automatic = data?.regions.find((r) =>
    booleanPointInPolygon([longitude, latitude], r.geometry),
  );
  const rows =
    data?.regions.map((r) => ({
      ...r,
      result: evaluateRegionalNasaRisk(hazard, r.weather, r.terrain, clock),
    })) ?? [];
  const chosen = rows.find((r) => r.id === (selected || automatic?.id)) ?? rows[0];
  const [west, south, east, north] = data
    ? bbox({
        type: 'FeatureCollection',
        features: data.regions.map((r) => ({
          type: 'Feature' as const,
          geometry: r.geometry,
          properties: {},
        })),
      })
    : [-86, 8, -82, 12];
  const cosine = Math.cos(((north + south) * Math.PI) / 360);
  const scale = Math.min(580 / ((east - west) * cosine), 340 / (north - south));
  const project = (lon: number, lat: number): [number, number] => [
    (640 - (east - west) * cosine * scale) / 2 + (lon - west) * cosine * scale,
    (400 - (north - south) * scale) / 2 + (north - lat) * scale,
  ];
  const centre =
    chosen && zoom > 1
      ? (() => {
          const b = bbox(chosen.geometry);
          return project((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
        })()
      : [320, 200];
  const point = project(longitude, latitude);
  const nf = new Intl.NumberFormat(messageLanguage() === 'en' ? 'en-US' : 'es-CR', {
    maximumFractionDigits: 1,
  });
  const n = (v: number | null, multiplier = 1) => (v === null ? '—' : nf.format(v * multiplier));
  const colorName = (color: keyof typeof CONDITION_COLORS) => message(`alerts.nasa.${color}`);
  return (
    <section className="v10-card" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{message('alerts.nasa.title')}</h2>
      <p id={`${id}-description`}>{message('alerts.nasa.notice')}</p>
      {loading || !data ? (
        <p role="status">{message(loading ? 'alerts.map.loading' : 'alerts.nasa.noData')}</p>
      ) : (
        <>
          <p>{message('alerts.nasa.dates', data.observedEnd, data.regions.length)}</p>
          <div
            className="v10-pill-row"
            role="group"
            aria-label={message('alerts.conditions.hazard')}
          >
            {(['landslide', 'flood'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className="v10-pill-btn"
                aria-pressed={hazard === value}
                onClick={() => setHazard(value)}
              >
                {message(`alerts.conditions.${value}`)}
              </button>
            ))}
          </div>
          <p>
            {message(
              'alerts.nasa.weatherRule',
              REGIONAL_NASA_RULES.wetness3dMin * 100,
              REGIONAL_NASA_RULES.rain7dMmMin,
            )}{' '}
            {message(
              hazard === 'landslide' ? 'alerts.nasa.landslideRule' : 'alerts.nasa.floodRule',
              hazard === 'landslide'
                ? REGIONAL_NASA_RULES.slopeDegreesMin
                : REGIONAL_NASA_RULES.flatSampleFractionMin * 100,
            )}
          </p>
          {!chosen?.result.fresh && (
            <p role="status">{message('alerts.nasa.stale', REGIONAL_NASA_RULES.maximumLagDays)}</p>
          )}
          <label className="alert-data-control" htmlFor={`${id}-region`}>
            {message('alerts.nasa.selectRegion')}
            <select
              id={`${id}-region`}
              value={chosen?.id ?? ''}
              onChange={(e) => {
                setSelected(e.target.value);
                setZoom(1);
              }}
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {colorName(r.result.color)}
                </option>
              ))}
            </select>
          </label>
          <figure className="alert-hazard-map">
            <svg
              viewBox={`${centre[0] - 320 / zoom} ${centre[1] - 200 / zoom} ${640 / zoom} ${400 / zoom}`}
              role="img"
              aria-label={message('alerts.nasa.svgLabel')}
              aria-describedby={`${id}-description`}
            >
              {rows.map((r) => (
                <g key={r.id}>
                  <title>
                    {r.name} · {colorName(r.result.color)}
                  </title>
                  {geometryDrawing(r.geometry, project).paths.map((d, index) => (
                    <path
                      key={index}
                      d={d}
                      fill={CONDITION_COLORS[r.result.color]}
                      fillRule="evenodd"
                      fillOpacity={chosen?.id === r.id ? 1 : 0.7}
                      stroke={chosen?.id === r.id ? 'var(--color-ink)' : 'var(--color-surface)'}
                      strokeWidth={chosen?.id === r.id ? 2 : 0.7}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ))}
              {longitude >= west && longitude <= east && latitude >= south && latitude <= north && (
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={4 / Math.sqrt(zoom)}
                  fill="var(--color-ink)"
                  stroke="var(--color-surface)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{message('alerts.map.point')}</title>
                </circle>
              )}
            </svg>
            <figcaption>{message('alerts.nasa.caption')}</figcaption>
          </figure>
          <div className="v10-pill-row" role="group" aria-label={message('alerts.map.zoom')}>
            <button
              type="button"
              className="v10-pill-btn"
              disabled={zoom >= 8}
              onClick={() => setZoom((z) => z * 2)}
            >
              {message('alerts.map.zoomIn')}
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              disabled={zoom <= 1}
              onClick={() => setZoom((z) => z / 2)}
            >
              {message('alerts.map.zoomOut')}
            </button>
            <button type="button" className="v10-pill-btn" onClick={() => setZoom(1)}>
              {message('alerts.map.reset')}
            </button>
          </div>
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
          {chosen && (
            <div aria-live="polite">
              <h3>
                {chosen.name} · {colorName(chosen.result.color)}
              </h3>
              <div
                className="table-scroll"
                role="region"
                tabIndex={0}
                aria-label={message('alerts.nasa.evidence')}
              >
                <table>
                  <caption>{message('alerts.nasa.evidence')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{message('alerts.nasa.indicator')}</th>
                      <th scope="col">{message('alerts.nasa.value')}</th>
                      <th scope="col">{message('alerts.nasa.signal')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ['wetness', `${n(chosen.weather.wetness3d, 100)}%`],
                        ['rainfall', `${n(chosen.weather.rain7dMm)} mm`],
                        [
                          'terrain',
                          hazard === 'landslide'
                            ? `${n(chosen.terrain.slopeDegreesMax)}°`
                            : `${n(chosen.terrain.flatSampleFraction, 100)}%`,
                        ],
                      ] as const
                    ).map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row">
                          {message(
                            key === 'terrain'
                              ? hazard === 'landslide'
                                ? 'alerts.nasa.slope'
                                : 'alerts.nasa.flat'
                              : `alerts.nasa.${key}`,
                          )}
                        </th>
                        <td>{value}</td>
                        <td>
                          {message(
                            chosen.result.conditions[key] === null
                              ? 'alerts.conditions.unknown'
                              : chosen.result.conditions[key]
                                ? 'alerts.conditions.yes'
                                : 'alerts.conditions.no',
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                {message(
                  'alerts.nasa.coverage',
                  n(chosen.weather.coverageFraction, 100),
                  chosen.terrain.sampleCount,
                  chosen.terrain.plannedSampleCount,
                )}
              </p>
              <p>
                {message(
                  'alerts.nasa.periods',
                  chosen.weather.wetnessStart,
                  chosen.weather.observedStart,
                  chosen.weather.observedEnd,
                )}
              </p>
              <p>
                {message(
                  'alerts.nasa.elevation',
                  n(chosen.terrain.elevationMinM),
                  n(chosen.terrain.elevationMaxM),
                )}
              </p>
            </div>
          )}
          <p className="v10-small">{message('alerts.nasa.resolution')}</p>
          <p className="v10-small">{message('alerts.nasa.limits')}</p>
          <p className="v10-small">
            {data.powerSources.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {message('alerts.nasa.powerLink', index === 0 ? 'GWETROOT' : 'PRECTOTCORR')}{' '}
              </a>
            ))}
            ·{' '}
            <a href="https://www.opentopodata.org/datasets/srtm/" target="_blank" rel="noreferrer">
              {message('alerts.nasa.terrainLink')}
            </a>
            {' · '}
            {message(
              'alerts.history.downloaded',
              new Intl.DateTimeFormat(messageLanguage() === 'en' ? 'en-US' : 'es-CR', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'America/Costa_Rica',
              }).format(new Date(data.generatedAt)),
            )}{' '}
            · {REGIONAL_NASA_RULES.version}
          </p>
        </>
      )}
    </section>
  );
}
