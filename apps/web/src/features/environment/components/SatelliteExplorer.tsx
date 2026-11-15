import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Satellite,
  Mountain,
  Leaf,
  CloudRain,
  Thermometer,
  Droplets,
  Sun,
  LocateFixed,
  Expand,
  Globe,
  Play,
  Pause,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import type { UnidadIndicadores } from '@field-farms/domain';
import type { FarmSite } from '../../../app/context/FieldContext';
import { date, number } from '../../../i18n';
import { environmentCopy } from '../../../i18n/environment-copy';
import { satelliteCopy } from '../../../i18n/satellite-copy';
import { useMessageLanguage } from '../../../i18n/messages';
import { observation } from '../data/environment-data';
import {
  SATELLITE_THEMES,
  loadImageryCatalog,
  type ImageryCatalog,
  type SatelliteTheme,
} from '../data/satellite-layers';
import type { ImageryStatus, SatelliteMapHandle } from './SatelliteMap';
import { BasinTimeViewer } from './BasinTimeViewer';
import { ALTITUDE_STOPS } from '../data/elevation-colors';

const SatelliteMap = lazy(() => import('./SatelliteMap'));
const THEME_ICONS = {
  satellite: Satellite,
  terrain: Mountain,
  vegetation: Leaf,
  rain: CloudRain,
  heat: Thermometer,
  moisture: Droplets,
  dryness: Sun,
};

export function SatelliteExplorer({
  site,
  weather,
}: {
  site: FarmSite | null;
  weather?: UnidadIndicadores;
}) {
  const language = useMessageLanguage();
  const text = satelliteCopy[language];
  const observations = environmentCopy[language];
  const mapRef = useRef<SatelliteMapHandle>(null);
  const workspace = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<SatelliteTheme>('vegetation');
  const [view, setView] = useState<'basin' | 'imagery'>(site ? 'basin' : 'imagery');
  const [catalog, setCatalog] = useState<ImageryCatalog>({});
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const rememberedDates = useRef<Partial<Record<SatelliteTheme, string | null>>>({});
  const [playing, setPlaying] = useState(false);
  const [terrain, setTerrain] = useState(false);
  const [opacity, setOpacity] = useState(0.85);
  const [smooth, setSmooth] = useState(true);
  const [compare, setCompare] = useState(false);
  const [status, setStatus] = useState<ImageryStatus>('loading');
  const [elevation, setElevation] = useState<number | null>(null);
  const [basins, setBasins] = useState<string[]>([]);
  const config = SATELLITE_THEMES[theme];
  const themeText = text[theme];
  const dates = catalog[theme]?.dates ?? [];
  const imageryDate =
    selectedDate && dates.includes(selectedDate) ? selectedDate : (dates.at(-1) ?? null);
  const dateIndex = imageryDate ? dates.indexOf(imageryDate) : 0;
  const dynamic = view === 'imagery' && config.layer !== null;
  const resolution =
    config.resolution === 'imagery'
      ? text.imageryResolution
      : config.resolution === 'terrain'
        ? text.terrainResolution
        : config.resolution;

  useEffect(() => {
    let cancelled = false;
    setCatalogStatus('loading');
    void loadImageryCatalog(attempt > 0).then(
      (result) => {
        if (!cancelled) {
          setCatalog(result);
          setCatalogStatus('ready');
        }
      },
      () => {
        if (!cancelled) setCatalogStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!playing || dates.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedDate(
        (previous) =>
          dates[(dates.indexOf(previous ?? dates[dates.length - 1]) + 1) % dates.length],
      );
    }, 1600);
    return () => window.clearInterval(timer);
  }, [playing, catalog, theme]);

  const selectTheme = (value: SatelliteTheme) => {
    if (imageryDate) rememberedDates.current[theme] = imageryDate;
    setView('imagery');
    setTheme(value);
    setSelectedDate(rememberedDates.current[value] ?? null);
    setPlaying(false);
    setCompare(false);
    if (value === 'terrain') setTerrain(true);
  };
  const togglePlayback = () => {
    if (!playing && dateIndex === dates.length - 1) setSelectedDate(dates[0]);
    setPlaying((previous) => !previous);
  };
  const mapStatus =
    dynamic && catalogStatus === 'loading'
      ? text.connecting
      : status === 'loading'
        ? text.loading
        : status === 'error'
          ? text.error
          : status === 'empty'
            ? text.noObservation
            : text.ready;

  return (
    <>
      <section className="satellite-workspace" ref={workspace} aria-label={text.explorer}>
        <div className="satellite-workspace-header">
          <span className="satellite-eyebrow">
            <Satellite size={16} aria-hidden="true" />
            {text.eyebrow}
          </span>
          <div className="satellite-view-controls">
            <button
              type="button"
              onClick={() =>
                selectTheme(view === 'imagery' && theme === 'terrain' ? 'vegetation' : 'terrain')
              }
            >
              <Layers size={16} aria-hidden="true" />
              {text.compareAltitude}
            </button>
            <button
              type="button"
              aria-pressed={view === 'basin'}
              onClick={() => {
                setView('basin');
                setPlaying(false);
              }}
            >
              {text.basinView}
            </button>
            <button
              type="button"
              aria-pressed={view === 'imagery'}
              onClick={() => setView('imagery')}
            >
              {text.imageryView}
            </button>
            <button
              type="button"
              aria-pressed={terrain && view === 'imagery'}
              onClick={() => {
                setView('imagery');
                setTerrain((previous) => !previous);
              }}
            >
              <Mountain size={16} aria-hidden="true" />
              {terrain ? text.flat : text.relief}
            </button>
            <button
              type="button"
              aria-label={text.fullscreen}
              onClick={() => {
                if (document.fullscreenElement)
                  void document.exitFullscreen().catch(() => undefined);
                else void workspace.current?.requestFullscreen?.().catch(() => undefined);
              }}
            >
              <Expand size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        {view === 'basin' ? (
          <BasinTimeViewer site={site} />
        ) : (
          <div className="satellite-stage" data-theme={theme}>
            <Suspense
              fallback={
                <p className="satellite-map-fallback" role="status">
                  {text.loading}
                </p>
              }
            >
              <SatelliteMap
                ref={mapRef}
                site={site}
                theme={theme}
                imageryDate={imageryDate}
                opacity={compare ? 0 : opacity}
                smooth={smooth}
                terrain={terrain}
                onStatus={setStatus}
                onElevation={setElevation}
                onBasins={setBasins}
              />
            </Suspense>
            <div className="satellite-title-overlay">
              <span className="satellite-product">{config.provider}</span>
              <h2>{themeText.title}</h2>
              <span className="satellite-date-badge">
                {dynamic
                  ? imageryDate
                    ? date(imageryDate)
                    : '—'
                  : theme === 'terrain'
                    ? text.staticTerrain
                    : text.mosaic}
              </span>
            </div>
            <div className="satellite-camera-controls">
              <button type="button" onClick={() => mapRef.current?.showCountry()}>
                <Globe size={16} aria-hidden="true" />
                {text.country}
              </button>
              <button type="button" disabled={!site} onClick={() => mapRef.current?.focusFarm()}>
                <LocateFixed size={16} aria-hidden="true" />
                {text.focus}
              </button>
              {dynamic && (
                <button type="button" onClick={() => mapRef.current?.fitScale()}>
                  {text.fitScale}
                </button>
              )}
            </div>
            <div className="satellite-map-key">
              {site && (
                <span>
                  <i className="satellite-farm-dot" />
                  {text.parcel}
                </span>
              )}
              <span>
                <i className="satellite-basin-line" />
                {basins.length ? basins.join(' · ') : text.basin}
              </span>
            </div>
            {terrain && elevation !== null && (
              <div className="satellite-elevation">
                <Mountain size={17} aria-hidden="true" />
                <strong>
                  {number(elevation, 0)} <small>{text.meters}</small>
                </strong>
                <span>{text.altitude}</span>
              </div>
            )}
            {theme === 'terrain' && (
              <div className="satellite-legend satellite-altitude-legend">
                <span>
                  {text.terrain.label} · {text.meters}
                </span>
                <i
                  style={{
                    background: `linear-gradient(90deg, ${ALTITUDE_STOPS.map(([height, color]) => `rgb(${color.join(',')}) ${Math.max(0, (height / 4200) * 100)}%`).join(', ')})`,
                  }}
                />
                <div>
                  {[0, 1000, 2000, 3000, 4000].map((height) => (
                    <span key={height}>{number(height, 0)}</span>
                  ))}
                </div>
              </div>
            )}
            {config.legend && imageryDate && !compare && (
              <div className="satellite-legend">
                <span>{text.legend}</span>
                <img
                  src={`https://gibs.earthdata.nasa.gov/legends/${config.legend}`}
                  alt={`${text.legend}: ${themeText.label}`}
                />
              </div>
            )}
          </div>
        )}
        <div className="satellite-theme-strip" role="group" aria-label={text.themes}>
          {(Object.keys(SATELLITE_THEMES) as SatelliteTheme[]).map((key) => {
            const Icon = THEME_ICONS[key];
            return (
              <button
                type="button"
                key={key}
                className={`satellite-theme satellite-theme-${key}`}
                aria-pressed={view === 'imagery' && theme === key}
                onClick={() => selectTheme(key)}
              >
                <span className="satellite-theme-swatch">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <span>{text[key].label}</span>
              </button>
            );
          })}
        </div>
        {view === 'imagery' && (
          <div className="satellite-timeline">
            <div className="satellite-layer-caption">
              <Layers size={17} aria-hidden="true" />
              <p>{themeText.description}</p>
            </div>
            {dynamic && imageryDate && (
              <>
                <div className="satellite-playback">
                  <button
                    type="button"
                    className="satellite-play"
                    disabled={dates.length < 2}
                    aria-label={playing ? text.pause : text.play}
                    aria-pressed={playing}
                    onClick={togglePlayback}
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
                      <strong>
                        <time dateTime={imageryDate}>{date(imageryDate)}</time>
                      </strong>
                    </label>
                    <input
                      id="sat-slider"
                      type="range"
                      min={0}
                      max={Math.max(0, dates.length - 1)}
                      value={dateIndex}
                      disabled={dates.length < 2}
                      onChange={(event) => {
                        setPlaying(false);
                        setSelectedDate(dates[Number(event.target.value)]);
                      }}
                    />
                    <div className="satellite-date-extents">
                      <span>{date(dates[0])}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(null);
                          setPlaying(false);
                        }}
                      >
                        {text.latest}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="satellite-opacity">
                  <label className="satellite-smoothing">
                    <input
                      type="checkbox"
                      checked={smooth}
                      onChange={(event) => setSmooth(event.target.checked)}
                    />
                    {text.smooth}
                  </label>
                  <label htmlFor="sat-opacity">{text.opacity}</label>
                  <input
                    id="sat-opacity"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(opacity * 100)}
                    onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                  />
                  <button
                    type="button"
                    aria-pressed={compare}
                    onClick={() => setCompare((previous) => !previous)}
                  >
                    {compare ? text.showLayer : text.compare}
                  </button>
                </div>
              </>
            )}
            {dynamic && catalogStatus === 'ready' && !imageryDate && (
              <p role="status">{text.noImage}</p>
            )}
            {catalogStatus === 'error' && (
              <div className="satellite-connection-warning" role="status">
                <p>{text.catalogError}</p>
                <button type="button" onClick={() => setAttempt((previous) => previous + 1)}>
                  {text.retry}
                </button>
              </div>
            )}
            <div className="satellite-source-strip">
              <span role="status" className={`satellite-connection satellite-connection-${status}`}>
                {mapStatus}
              </span>
              <span>
                {text.resolution}: {resolution}
              </span>
              {config.layer && imageryDate && (
                <a
                  href={`https://worldview.earthdata.nasa.gov/?l=${config.layer}&t=${imageryDate}&v=-86,8,-82.5,11.3`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {text.nasaLink}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}
      </section>
      {dynamic && <p className="satellite-coverage-note">{text.coverage}</p>}
      {weather && (
        <section className="satellite-regional-snapshot" aria-label={text.summary}>
          <div className="satellite-snapshot-title">
            <h2>{text.summary}</h2>
            <p>{text.summaryNote}</p>
          </div>
          <div className="satellite-snapshot-grid">
            {[
              ['lluvia_30d', observations.rain30, CloudRain],
              ['lluvia_7d', observations.rain7, Droplets],
              ['tmax_30d', observations.temperature, Thermometer],
              ['humedad_raiz_30d', observations.soil, Leaf],
            ].map(([id, label, Icon]) => {
              const value = observation(weather, id as string);
              const MetricIcon = Icon as typeof CloudRain;
              return (
                <article key={id as string}>
                  <MetricIcon size={20} aria-hidden="true" />
                  <span>{label as string}</span>
                  <div>
                    <strong>{value?.valor == null ? '—' : number(value.valor, 2)}</strong>
                    <span>{value?.unidad === '0-1' ? '' : value?.unidad}</span>
                  </div>
                  {value && <time dateTime={value.fecha}>{date(value.fecha)}</time>}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
