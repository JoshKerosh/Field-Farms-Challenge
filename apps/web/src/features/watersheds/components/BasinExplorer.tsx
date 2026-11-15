import { bbox, point as turfPoint } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FarmSite } from '../../../app/context/FieldContext';
import { copy } from '../../../i18n';
import { message, messageLanguage, useMessageLanguage } from '../../../i18n/messages';
import { geometryContains } from '../../../shared/geo/geometry';
import { PageLink } from '../../../shared/ui';
import {
  basinShares,
  mostlyInside,
  streamLabel,
  subbasinShares,
  toParcel,
  type Area,
  type BasinProperties,
  type OperatorProperties,
  type StreamFeature,
  type SubbasinProperties,
  type WaterSourceProperties,
} from '../analysis/parcel-analysis';
import type { BasinExplorerRepository, Bounds } from '../data/basin-explorer.repository';
import BasinMap, { type BasinMapHandle, type MapScene, type MapView } from './BasinMap';
import { BasinMinimap } from './BasinMinimap';
import { BasinResults } from './BasinResults';
import type { BasinResult } from './explorer-result';
import { LegendMark } from './map-icons';
import {
  EMPTY,
  collection,
  operatorTooltip,
  sourceTooltip,
  streamTooltip,
  withTooltip,
} from './map-tooltips';
type LayerKey = 'operators' | 'springs' | 'otherSources' | 'streams';
/** Minimum zoom of each layer, so a whole basin does not draw thousands of points at once. */
const MIN_ZOOM: Record<LayerKey, number> = {
  operators: 9,
  springs: 11,
  otherSources: 11,
  streams: 14,
};
/** Real map of "Mi cuenca": the basins and sub-basins of the farm chosen in "Mi finca". */
export default function BasinExplorer({
  repository,
  site,
}: {
  repository: BasinExplorerRepository;
  site: FarmSite | null;
}) {
  useMessageLanguage();
  const c = copy.watershed.explorer;
  const mapRef = useRef<BasinMapHandle>(null);
  const [basins, setBasins] = useState<FeatureCollection<
    Polygon | MultiPolygon,
    BasinProperties
  > | null>(null);
  const [status, setStatus] = useState<string>(c.loadingBasins);
  const [view, setView] = useState<MapView | null>(null);
  const [basemap, setBasemap] = useState<MapScene['basemap']>('satellite');
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    operators: true,
    springs: true,
    otherSources: true,
    streams: true,
  });
  const [result, setResult] = useState<BasinResult | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [subbasins, setSubbasins] = useState<FeatureCollection>(EMPTY);
  const [water, setWater] = useState<{
    operators: Feature<Point, OperatorProperties>[];
    sources: Feature<Point, WaterSourceProperties>[];
  } | null>(null);
  const [streams, setStreams] = useState<FeatureCollection>(EMPTY);
  useEffect(() => {
    repository.listBasins().then(
      (data) => {
        setBasins(data);
        setStatus('');
      },
      () => setStatus(c.basinsError),
    );
  }, [repository, c]);
  const basinBoxes = useMemo(
    () => basins?.features.map((f) => ({ feature: f, box: bbox(f) })) ?? [],
    [basins, messageLanguage()],
  );
  const overlapping = useCallback(
    (area: Area) => {
      const [w, s, e, n] = bbox(area);
      return basinBoxes
        .filter(({ box }) => box[0] <= e && box[2] >= w && box[1] <= n && box[3] >= s)
        .map(({ feature }) => feature);
    },
    [basinBoxes, messageLanguage()],
  );
  // The farm's basins: the one under its point plus every basin its parcel touches.
  useEffect(() => {
    if (!basins || !site) {
      setResult(null);
      setSelected([]);
      setSubbasins(EMPTY);
      setWater(null);
      return;
    }
    let cancelled = false;
    const { lng, lat, parcel } = site;
    const pointBasin =
      basinBoxes.find(({ feature }) => geometryContains(feature.geometry, lng, lat))?.feature ??
      null;
    const shares = parcel ? basinShares(parcel, overlapping(parcel)) : [];
    const numbers = [
      ...new Set([
        ...(pointBasin ? [pointBasin.properties.cuenca_no] : []),
        ...shares.map((s) => s.basinNumber),
      ]),
    ];
    const base: BasinResult = {
      pointBasin: pointBasin?.properties ?? null,
      basinShares: shares,
      pointSubbasin: null,
      subbasinShares: [],
      water: { state: numbers.length ? 'loading' : 'idle' },
    };
    setResult(base);
    setSelected(numbers);
    setWater(null);
    const areas = basins.features.filter((f) => numbers.includes(f.properties.cuenca_no));
    if (areas.length) mapRef.current?.fitBounds(bbox(collection(areas)) as Bounds, 13);
    if (!numbers.length) return;
    setStatus(c.loadingBasinWater);
    const subTask = Promise.all(
      numbers.map((n) => repository.listSubbasins(n).catch(() => EMPTY)),
    ).then((files) => {
      if (cancelled) return;
      const features = files.flatMap((f) => f.features) as Feature<
        Polygon | MultiPolygon,
        SubbasinProperties
      >[];
      const pointSub = features.find((f) => geometryContains(f.geometry, lng, lat)) ?? null;
      const subShares = parcel ? subbasinShares(parcel, features) : [];
      const highlighted = (f: Feature<Polygon | MultiPolygon, SubbasinProperties>) =>
        f === pointSub ||
        subShares.some(
          (s) => s.name === f.properties.nombre && s.hectares === f.properties.hectareas,
        );
      setSubbasins(
        collection(
          features.map((f) => ({
            ...f,
            properties: { ...f.properties, destacada: highlighted(f) },
          })),
        ),
      );
      setResult(
        (current) =>
          current && {
            ...current,
            pointSubbasin: pointSub?.properties ?? null,
            subbasinShares: subShares,
          },
      );
    });
    const waterTask = Promise.all([
      repository.listOperators(),
      Promise.all(numbers.map((n) => repository.listWaterSources(n))),
    ]).then(
      ([operators, files]) => {
        if (cancelled) return;
        const inBasins = operators.features.filter((f) => numbers.includes(f.properties.cuenca_no));
        const sources = files.flatMap((f) => f.features);
        setWater({ operators: inBasins, sources });
        setResult(
          (current) =>
            current && {
              ...current,
              water: {
                state: 'done',
                value: {
                  operators: inBasins.length,
                  sources: sources.length,
                  springs: sources.filter((f) => f.properties.tipo === 'naciente').length,
                },
              },
            },
        );
      },
      () => {
        if (cancelled) return;
        setResult((current) => current && { ...current, water: { state: 'error' } });
      },
    );
    void Promise.allSettled([subTask, waterTask]).then(() => cancelled || setStatus(''));
    return () => {
      cancelled = true;
    };
  }, [basins, basinBoxes, overlapping, site, repository, c]);
  // Streams come from the IGN by area: only those of the view, once zoomed in enough.
  const zoom = view?.zoom ?? 0;
  const visible = (key: LayerKey) => selected.length > 0 && layers[key] && zoom >= MIN_ZOOM[key];
  const wantStreams = visible('streams');
  const selectedKey = selected.join(',');
  const streamsLoaded = useRef<{
    bounds: Bounds;
    key: string;
    features: StreamFeature[];
  } | null>(null);
  useEffect(() => {
    if (!wantStreams || !view || !basins) return;
    const loaded = streamsLoaded.current;
    const [w, s, e, n] = view.bounds;
    const inside =
      loaded &&
      loaded.bounds[0] <= w &&
      loaded.bounds[1] <= s &&
      loaded.bounds[2] >= e &&
      loaded.bounds[3] >= n;
    const selectedAreas = basins.features.filter((f) => selected.includes(f.properties.cuenca_no));
    const show = (features: StreamFeature[]) =>
      setStreams(
        collection(
          features
            .filter((f) => mostlyInside(f, selectedAreas))
            .map((f) => {
              const { name, kind } = streamLabel(f.properties);
              return {
                ...f,
                properties: {
                  intermitente: kind.toLowerCase().includes('intermitente'),
                  tooltip: streamTooltip(name, kind),
                },
              };
            }),
        ),
      );
    if (inside) {
      if (loaded.key !== selectedKey) {
        loaded.key = selectedKey;
        show(loaded.features);
      }
      return;
    }
    // Ask the IGN for the view plus a margin; moving inside it does not query again.
    const padX = (e - w) * 0.3;
    const padY = (n - s) * 0.3;
    const bounds: Bounds = [w - padX, s - padY, e + padX, n + padY];
    const controller = new AbortController();
    repository.listStreams(bounds, controller.signal).then(
      (features) => {
        streamsLoaded.current = { bounds, key: selectedKey, features };
        show(features);
      },
      () => undefined,
    );
    return () => controller.abort();
  }, [wantStreams, view, selectedKey, basins, repository]);
  const showOperators = visible('operators');
  const showSprings = visible('springs');
  const showOtherSources = visible('otherSources');
  const scene = useMemo<MapScene>(() => {
    const sources = (water?.sources ?? []).filter((f) =>
      f.properties.tipo === 'naciente' ? showSprings : showOtherSources,
    );
    return {
      basemap,
      // Only the farm's basins; every basin while no farm has been chosen.
      basinsShown: selected.length ? 'selected' : 'all',
      selectedBasins: selected,
      subbasins,
      parcel: site?.parcel ? collection([site.parcel]) : EMPTY,
      zone: EMPTY,
      streams: wantStreams ? streams : EMPTY,
      sources: collection(sources.map((f) => withTooltip(f, sourceTooltip(f.properties)))),
      operators:
        showOperators && water
          ? collection(water.operators.map((f) => withTooltip(f, operatorTooltip(f.properties))))
          : EMPTY,
      user: site && !site.parcel ? collection([turfPoint([site.lng, site.lat])]) : EMPTY,
      accuracy: EMPTY,
    };
  }, [
    basemap,
    selected,
    subbasins,
    site,
    water,
    streams,
    wantStreams,
    showOperators,
    showSprings,
    showOtherSources,
    messageLanguage(),
  ]);
  const pending = selected.length
    ? (Object.keys(MIN_ZOOM) as LayerKey[])
        .filter((k) => layers[k] && zoom < MIN_ZOOM[k])
        .map((k) => message('m1ca209490e56', c.layers[k].toLowerCase(), MIN_ZOOM[k]))
    : [];
  return (
    <div className="basin-explorer">
      {site ? (
        <p className="basin-hint">
          {site.parcel ? c.basinOfParcel(toParcel(site.parcel).farmNumber) : c.basinOfPoint}
        </p>
      ) : (
        <div className="basin-notice">
          <p>{c.needsFarm}</p>
          <PageLink to="/farm" primary>
            {c.goToFarm}
          </PageLink>
        </div>
      )}
      <div className="basin-toolbar">
        <div className="filter-group" role="group" aria-label={c.basemap}>
          {(['satellite', 'streets'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="filter-button"
              aria-pressed={basemap === value}
              onClick={() => setBasemap(value)}
            >
              {value === 'satellite' ? c.satellite : c.streets}
            </button>
          ))}
        </div>
      </div>
      <p className="basin-status" role="status">
        {status}
      </p>
      <div className="basin-map-frame">
        {basins ? (
          <>
            <BasinMap ref={mapRef} basins={basins} scene={scene} onView={setView} />
            <BasinMinimap
              basins={basins}
              view={view}
              onPick={(lng, lat) => mapRef.current?.panTo(lng, lat)}
            />
          </>
        ) : (
          <p className="map-loading">{status}</p>
        )}
      </div>
      <fieldset className="basin-options">
        <legend>{c.basinLayers}</legend>
        {(Object.keys(layers) as LayerKey[]).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })}
            />
            <LegendMark layer={key} />
            {c.layers[key]}
          </label>
        ))}
        {pending.length > 0 && <p className="basin-hint">{c.zoomHint(pending.join(', '))}</p>}
        <p className="basin-hint">{message('aiIconsNote')}</p>
      </fieldset>
      {result && <BasinResults result={result} />}
      <p className="source-note">{c.basinSources}</p>
    </div>
  );
}
