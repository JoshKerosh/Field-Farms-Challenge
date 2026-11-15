import { useId, useState } from 'react';
import { message, messageLanguage, useMessageLanguage } from '../../../i18n/messages';
import { geometryDrawing, type HazardLayerId, type HazardMapData } from '../data/hazard-map';

export function HazardHistoryMap({
  data,
  loading = false,
}: {
  data: HazardMapData | null;
  loading?: boolean;
}) {
  useMessageLanguage();
  const descriptionId = useId();
  const [visible, setVisible] = useState<Record<HazardLayerId, boolean>>({
    floodZone: true,
    landslideZone: true,
  });
  const [selected, setSelected] = useState('');
  const [zoom, setZoom] = useState(1);
  const label = (id: HazardLayerId) =>
    message(id === 'floodZone' ? 'alerts.map.flood' : 'alerts.map.landslide');
  if (!data)
    return (
      <section className="v10-card" aria-labelledby="alert-hazard-title">
        <h2 id="alert-hazard-title">{message('alerts.map.title')}</h2>
        <p role="status">{message(loading ? 'alerts.map.loading' : 'alerts.map.noData')}</p>
      </section>
    );
  const [west, south, east, north] = data.bounds;
  const cosine = Math.cos((data.location.latitude * Math.PI) / 180);
  const scale = Math.min(440 / ((east - west) * cosine), 280 / (north - south));
  const xPadding = (480 - (east - west) * cosine * scale) / 2,
    yPadding = (320 - (north - south) * scale) / 2;
  const project = (lon: number, lat: number): [number, number] => [
    xPadding + (lon - west) * cosine * scale,
    yPadding + (north - lat) * scale,
  ];
  const boundary = geometryDrawing(data.subbasin.geometry, project);
  const position = project(data.location.longitude, data.location.latitude);
  const features = data.layers
    .filter((layer) => visible[layer.id])
    .flatMap((layer) => layer.features.map((feature) => ({ ...feature, layer: layer.id })));
  const selectedFeature = features.find((feature) => `${feature.layer}:${feature.id}` === selected);
  const viewWidth = 480 / zoom,
    viewHeight = 320 / zoom;
  return (
    <section className="v10-card" aria-labelledby="alert-hazard-title">
      <h2 id="alert-hazard-title">{message('alerts.map.title')}</h2>
      <p id={descriptionId}>{message('alerts.map.notice')}</p>
      <div className="v10-pill-row" role="group" aria-label={message('alerts.map.layers')}>
        {(['floodZone', 'landslideZone'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className="v10-pill-btn"
            aria-pressed={visible[id]}
            onClick={() => setVisible((v) => ({ ...v, [id]: !v[id] }))}
          >
            {label(id)}
          </button>
        ))}
      </div>
      <figure className="alert-hazard-map">
        <svg
          viewBox={`${(480 - viewWidth) / 2} ${(320 - viewHeight) / 2} ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={message('alerts.map.svgLabel', data.subbasin.name)}
          aria-describedby={descriptionId}
        >
          <defs>
            <clipPath id={`${descriptionId}-frame`}>
              <rect x="0" y="0" width="480" height="320" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${descriptionId}-frame)`}>
            {boundary.paths.map((d, index) => (
              <path
                key={index}
                d={d}
                fill="var(--color-water-tint)"
                fillRule="evenodd"
                stroke="var(--color-muted)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {features.map((feature) => {
              const drawing = geometryDrawing(feature.geometry, project);
              const active = selected === `${feature.layer}:${feature.id}`;
              const color = feature.layer === 'floodZone' ? '#267BB4' : '#B36B25';
              return (
                <g key={`${feature.layer}:${feature.id}`}>
                  {drawing.paths.map((d, index) => (
                    <path
                      key={index}
                      d={d}
                      fill={d.endsWith('Z') ? color : 'none'}
                      fillOpacity={active ? 0.7 : 0.28}
                      fillRule="evenodd"
                      stroke={color}
                      strokeWidth={active ? 3 : 1.2}
                      strokeDasharray={feature.layer === 'landslideZone' ? '5 2' : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {drawing.points.map(([x, y], index) => (
                    <circle key={index} cx={x} cy={y} r={active ? 4 : 3} fill={color} />
                  ))}
                </g>
              );
            })}
            <circle
              cx={position[0]}
              cy={position[1]}
              r={4 / Math.sqrt(zoom)}
              fill="var(--color-ink)"
              stroke="var(--color-surface)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
        <figcaption>{message('alerts.map.caption', data.subbasin.name)}</figcaption>
      </figure>
      <div className="v10-pill-row" role="group" aria-label={message('alerts.map.zoom')}>
        <button
          type="button"
          className="v10-pill-btn"
          disabled={zoom >= 8}
          onClick={() => setZoom((v) => Math.min(8, v * 2))}
        >
          {message('alerts.map.zoomIn')}
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          disabled={zoom <= 1}
          onClick={() => setZoom((v) => Math.max(1, v / 2))}
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
      <ul className="alert-map-legend" aria-label={message('alerts.map.legend')}>
        <li>
          <span className="alert-map-swatch alert-map-swatch--flood" aria-hidden="true" />
          {label('floodZone')}
        </li>
        <li>
          <span className="alert-map-swatch alert-map-swatch--landslide" aria-hidden="true" />
          {label('landslideZone')}
        </li>
        <li>
          <span aria-hidden="true">●</span> {message('alerts.map.point')}
        </li>
      </ul>
      <label className="alert-data-control" htmlFor={`${descriptionId}-selection`}>
        {message('alerts.map.selectFeature')}
        <select
          id={`${descriptionId}-selection`}
          value={selectedFeature ? selected : ''}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">{message('alerts.map.allFeatures')}</option>
          {features.map((feature) => (
            <option key={`${feature.layer}:${feature.id}`} value={`${feature.layer}:${feature.id}`}>
              {label(feature.layer)} · {feature.name}
            </option>
          ))}
        </select>
      </label>
      {selectedFeature && (
        <p aria-live="polite">
          {label(selectedFeature.layer)} · {selectedFeature.name} · {message('alerts.noDate')}
        </p>
      )}
      <div
        className="table-scroll"
        role="region"
        tabIndex={0}
        aria-label={message('alerts.map.coverage')}
      >
        <table>
          <caption>{message('alerts.map.coverage')}</caption>
          <thead>
            <tr>
              <th scope="col">{message('alerts.map.layers')}</th>
              <th scope="col">{message('alerts.map.records')}</th>
              <th scope="col">{message('alerts.map.query')}</th>
            </tr>
          </thead>
          <tbody>
            {data.layers.map((layer) => (
              <tr key={layer.id}>
                <th scope="row">{label(layer.id)}</th>
                <td>
                  {layer.downloadedCount} / {layer.matchedCount}
                </td>
                <td>
                  {message(
                    layer.completeQuery ? 'alerts.map.completeQuery' : 'alerts.map.partialQuery',
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="v10-small">
        {message('alerts.map.emptyWarning')} {message('alerts.map.pointWarning')}
      </p>
      <p className="v10-small">
        <a href={data.source} target="_blank" rel="noreferrer">
          {message('alerts.map.source')}
        </a>{' '}
        ·{' '}
        {message(
          'alerts.history.downloaded',
          new Intl.DateTimeFormat(messageLanguage() === 'en' ? 'en-US' : 'es-CR', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'America/Costa_Rica',
          }).format(new Date(data.retrievedAt)),
        )}{' '}
        · {message('alerts.noDate')}
      </p>
    </section>
  );
}
