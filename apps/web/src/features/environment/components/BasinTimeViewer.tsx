import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, Leaf, ZoomIn, ZoomOut } from 'lucide-react';
import { useField, type FarmSite } from '../../../app/context/FieldContext';
import { satelliteView, ndviSeries } from '../../../data/engine/climate';
import { getGeo, placeAt } from '../../../data/engine/geo';
import { date, number } from '../../../i18n';
import { satelliteCopy } from '../../../i18n/satellite-copy';
import { environmentCopy } from '../../../i18n/environment-copy';
import { useMessageLanguage } from '../../../i18n/messages';

export function BasinTimeViewer({ site }: { site: FarmSite | null }) {
  const language = useMessageLanguage();
  const text = satelliteCopy[language];
  const { ds, ctx } = useField();
  const [frame, setFrame] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const location = useMemo(
    () => (ds && site ? placeAt(ds, getGeo(ds).llToLocal(site.lat, site.lng), null) : ctx),
    [ds, site, ctx],
  );
  const view = useMemo(
    () => (ds && location ? satelliteView(ds, location, null, frame) : null),
    [ds, location, frame, language],
  );
  const series = useMemo(
    () => (ds && location ? ndviSeries(ds, location.reg, null) : null),
    [ds, location],
  );
  const count = view?.frames ?? 0;
  useEffect(() => {
    if (!playing || count < 2) return;
    const timer = window.setInterval(
      () => setFrame((previous) => (previous === null ? 0 : (previous + 1) % count)),
      650,
    );
    return () => window.clearInterval(timer);
  }, [playing, count]);
  useEffect(() => {
    setFrame(null);
    setPlaying(false);
    setZoom(1);
  }, [location?.reg, location?.subId]);
  if (!ds || !location || !view || !series)
    return <p className="satellite-map-fallback">{text.loading}</p>;
  const active = frame === null ? count - 1 : Math.min(frame, count - 1);
  const isoDate = (index: number) =>
    new Date(Date.UTC(2026, 0, Number(series.doys[index]))).toISOString().slice(0, 10);
  const normal = ds.climate.MODIS[location.reg].clim[series.doys[active]]?.m;
  const value = series.serie[active];
  const difference = normal === undefined ? null : value - normal;
  const { BW, BH } = location.geo.box;
  return (
    <div className="basin-time-viewer">
      <div className="basin-time-heading">
        <span className="satellite-product">
          {text.archived} · {environmentCopy[language].zones[location.reg]}
        </span>
        <h2>{text.basinTitle}</h2>
        <span className="satellite-date-badge">
          <time dateTime={isoDate(active)}>{date(isoDate(active))}</time> · {location.sub.n}
        </span>
      </div>
      <div className="basin-time-body">
        <div className="basin-time-map">
          <svg
            viewBox={`${(BW * (1 - 1 / zoom)) / 2} ${(BH * (1 - 1 / zoom)) / 2} ${BW / zoom} ${BH / zoom}`}
            role="img"
            aria-label={`${text.basinView}: ${location.sub.n}, ${date(isoDate(active))}`}
          >
            <svg viewBox={location.geo.vb} width={BW} height={BH} preserveAspectRatio="none">
              <path d={location.geo.d} fill="#153a2c" stroke="#b1deaa" strokeWidth="2" />
            </svg>
            {view.tiles.flatMap((tile, index) =>
              Array.from({ length: 4 }, (_, part) => (
                <rect
                  key={`${index}-${part}`}
                  x={tile.x + (part % 2) * 4.25}
                  y={tile.y + Math.floor(part / 2) * 4.25}
                  width="4.05"
                  height="4.05"
                  rx="0.6"
                  fill={tile.col}
                />
              )),
            )}
          </svg>
          <div className="basin-time-zoom">
            <button
              type="button"
              aria-label={text.zoomIn}
              onClick={() => setZoom((previous) => Math.min(4, previous * 1.5))}
            >
              <ZoomIn size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={text.zoomOut}
              onClick={() => setZoom((previous) => Math.max(1, previous / 1.5))}
            >
              <ZoomOut size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="basin-time-color-key">
            <span>NDVI</span>
            <i />
            <span>0 → 1</span>
          </div>
        </div>
        <div className="basin-time-insight">
          <Leaf size={25} aria-hidden="true" />
          <span>NDVI</span>
          <strong>{number(value, 3)}</strong>
          <p>
            {difference === null
              ? text.noHistorical
              : difference < -0.02
                ? text.lessGreen
                : difference > 0.02
                  ? text.moreGreen
                  : text.sameGreen}
          </p>
          <span className="basin-time-baseline">
            {text.historical}: {normal === undefined ? '—' : number(normal, 3)}
          </span>
          <svg
            viewBox="0 0 300 80"
            role="img"
            aria-label={text.basinTitle}
            className="basin-time-spark"
          >
            <path d={view.spark.area} fill="rgba(180,233,135,.12)" />
            <path d={view.spark.line} fill="none" stroke="#c8f78f" strokeWidth="2.5" />
            <circle cx={view.spark.dotX} cy={view.spark.dotY} r="4.5" fill="#f3cb6a" />
          </svg>
          <span className="basin-time-frame">
            {text.frame} {active + 1} / {count}
          </span>
        </div>
      </div>
      <div className="satellite-timeline basin-time-timeline">
        <div className="satellite-playback">
          <button
            type="button"
            className="satellite-play"
            aria-label={playing ? text.pause : text.play}
            aria-pressed={playing}
            onClick={() => {
              if (!playing && active === count - 1) setFrame(0);
              setPlaying((previous) => !previous);
            }}
          >
            {playing ? (
              <Pause size={19} aria-hidden="true" />
            ) : (
              <Play size={19} aria-hidden="true" />
            )}
          </button>
          <div className="satellite-date-slider">
            <label htmlFor="sat-slider">
              {text.date}
              <strong>{date(isoDate(active))}</strong>
            </label>
            <input
              id="sat-slider"
              type="range"
              min={0}
              max={count - 1}
              value={active}
              onChange={(event) => {
                setPlaying(false);
                setFrame(Number(event.target.value));
              }}
            />
            <div className="satellite-date-extents">
              <span>{date(isoDate(0))}</span>
              <button
                type="button"
                onClick={() => {
                  setFrame(null);
                  setPlaying(false);
                }}
              >
                {date(isoDate(count - 1))}
              </button>
            </div>
          </div>
        </div>
        <p className="basin-time-method">{text.basinNote}</p>
      </div>
    </div>
  );
}
