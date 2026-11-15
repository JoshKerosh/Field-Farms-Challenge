import { bbox, circle, point as turfPoint } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { LocateFixed } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { copy, number } from '../../../i18n';
import type { ParcelFeature } from '../../../platform/siri/parcel';
import { geometryContains } from '../../../shared/geo/geometry';
import {
  STREAMS_RADIUS_M,
  WATER_RADIUS_M,
  basinShares,
  mostlyInside,
  nearbyStreams,
  nearbyWater,
  searchZone,
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
import { BasinResults, formatDistance } from './BasinResults';
import type { ExplorerResult } from './explorer-result';

type Scope = 'near' | 'basins';
type LayerKey = 'operators' | 'springs' | 'otherSources' | 'streams';

/** Minimum zoom of each layer when showing everything in the farm's basins. */
const BASINS_MIN_ZOOM: Record<LayerKey, number> = {
  operators: 9,
  springs: 11,
  otherSources: 11,
  streams: 14,
};
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const collection = (features: Feature[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

export default function BasinExplorer({
  repository,
  onLocate,
}: {
  repository: BasinExplorerRepository;
  /** Called with every chosen point (GPS or tap), e.g. to share it with the rest of the app. */
  onLocate?: (lng: number, lat: number) => void;
}) {
  const c = copy.watershed.explorer;
  const mapRef = useRef<BasinMapHandle>(null);
  const requestId = useRef(0);
  const onLocateRef = useRef(onLocate);
  onLocateRef.current = onLocate;
  const [basins, setBasins] = useState<FeatureCollection<
    Polygon | MultiPolygon,
    BasinProperties
  > | null>(null);
  const [status, setStatus] = useState<string>(c.loadingBasins);
  const [view, setView] = useState<MapView | null>(null);
  const [basemap, setBasemap] = useState<MapScene['basemap']>('satellite');
  const [scope, setScope] = useState<Scope>('near');
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    operators: true,
    springs: true,
    otherSources: true,
    streams: true,
  });
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [subbasins, setSubbasins] = useState<FeatureCollection>(EMPTY);
  const [basinLayers, setBasinLayers] = useState({
    operators: EMPTY,
    sources: EMPTY,
    streams: EMPTY,
  });

  useEffect(() => {
    repository.listBasins().then(
      (data) => {
        setBasins(data);
        setStatus(c.ready);
      },
      () => setStatus(c.basinsError),
    );
  }, [repository, c]);

  const basinBoxes = useMemo(
    () => basins?.features.map((f) => ({ feature: f, box: bbox(f) })) ?? [],
    [basins],
  );
  const overlapping = useCallback(
    (area: Area) => {
      const [w, s, e, n] = bbox(area);
      return basinBoxes
        .filter(({ box }) => box[0] <= e && box[2] >= w && box[1] <= n && box[3] >= s)
        .map(({ feature }) => feature);
    },
    [basinBoxes],
  );

  const locate = useCallback(
    async (lng: number, lat: number, accuracyM: number | null, fit: boolean) => {
      if (!basins) return;
      const id = ++requestId.current;
      const stale = () => id !== requestId.current;
      onLocateRef.current?.(lng, lat);
      const pointBasin =
        basinBoxes.find(({ feature }) => geometryContains(feature.geometry, lng, lat))?.feature ??
        null;
      const base: ExplorerResult = {
        lng,
        lat,
        accuracyM,
        pointBasin: pointBasin?.properties ?? null,
        basinShares: [],
        pointSubbasin: null,
        subbasinShares: [],
        parcel: { state: 'loading' },
        streams: { state: 'idle' },
        water: { state: 'idle' },
      };
      setResult(base);
      const firstBasins = [pointBasin?.properties.cuenca_no ?? 0];
      setSelected(firstBasins);
      setStatus(c.searchingParcel);

      let parcelFeature: ParcelFeature | null = null;
      let parcelError = false;
      try {
        parcelFeature = await repository.findParcel(lng, lat);
      } catch {
        parcelError = true;
      }
      if (stale()) return;

      // A parcel on a divide also selects every basin it touches.
      const shares = parcelFeature ? basinShares(parcelFeature, overlapping(parcelFeature)) : [];
      const basinNumbers = [...new Set([...firstBasins, ...shares.map((s) => s.basinNumber)])];
      setSelected(basinNumbers);
      const subFiles = await Promise.all(
        basinNumbers.map((n) => repository.listSubbasins(n).catch(() => EMPTY)),
      );
      if (stale()) return;
      const subFeatures = subFiles.flatMap((f) => f.features) as Feature<
        Polygon | MultiPolygon,
        SubbasinProperties
      >[];
      const pointSub = subFeatures.find((f) => geometryContains(f.geometry, lng, lat)) ?? null;
      const subShares = parcelFeature ? subbasinShares(parcelFeature, subFeatures) : [];
      const highlighted = (f: Feature<Polygon | MultiPolygon, SubbasinProperties>) =>
        f === pointSub ||
        subShares.some(
          (s) => s.name === f.properties.nombre && s.hectares === f.properties.hectareas,
        );
      setSubbasins(
        collection(
          subFeatures.map((f) => ({
            ...f,
            properties: { ...f.properties, destacada: highlighted(f) },
          })),
        ),
      );

      const withParcel: ExplorerResult = {
        ...base,
        basinShares: shares,
        pointSubbasin: pointSub?.properties ?? null,
        subbasinShares: subShares,
        parcel: parcelError
          ? { state: 'error' }
          : {
              state: 'done',
              value: parcelFeature && { info: toParcel(parcelFeature), feature: parcelFeature },
            },
        streams: { state: parcelFeature ? 'loading' : 'idle' },
        water: { state: parcelFeature ? 'loading' : 'idle' },
      };
      setResult(withParcel);
      if (!parcelFeature) {
        setStatus('');
        if (fit) mapRef.current?.fitBounds([lng - 0.02, lat - 0.02, lng + 0.02, lat + 0.02], 14);
        return;
      }
      const parcel = parcelFeature;
      if (fit) mapRef.current?.fitBounds(bbox(parcel) as Bounds, 17);
      setStatus(c.searchingWater);

      const streamsTask = repository
        .listStreams(bbox(searchZone(parcel, STREAMS_RADIUS_M)) as Bounds)
        .then((streams) => {
          const found = nearbyStreams(parcel, streams);
          return {
            list: found.map((s) => s.stream),
            parts: collection(
              found.flatMap(({ stream, parts }) =>
                parts.map((part) => ({
                  ...part,
                  properties: {
                    intermitente: stream.intermittent,
                    cruza: stream.distanceM === 0,
                    tooltip: streamTooltip(stream.name, stream.kind),
                  },
                })),
              ),
            ),
          };
        });
      // Sources are published per basin: load those of every basin the search zone reaches.
      const zone = searchZone(parcel, WATER_RADIUS_M);
      const zoneBasins = [
        ...new Set([...basinNumbers, ...overlapping(zone).map((f) => f.properties.cuenca_no)]),
      ];
      const waterTask = Promise.all([
        Promise.all(zoneBasins.map((n) => repository.listWaterSources(n))),
        repository.listOperators(),
      ]).then(([files, operators]) =>
        nearbyWater(
          parcel,
          files.flatMap((f) => f.features),
          operators.features,
        ),
      );

      const [streams, water] = await Promise.allSettled([streamsTask, waterTask]);
      if (stale()) return;
      setResult({
        ...withParcel,
        streams:
          streams.status === 'fulfilled'
            ? { state: 'done', value: streams.value }
            : { state: 'error' },
        water:
          water.status === 'fulfilled' ? { state: 'done', value: water.value } : { state: 'error' },
      });
      setStatus('');
      if (fit) {
        // Frame the parcel with the nearby streams and, when nothing was within the radius,
        // the nearest water source.
        const framed: Feature[] = [parcel];
        if (streams.status === 'fulfilled') framed.push(...streams.value.parts.features);
        if (
          water.status === 'fulfilled' &&
          water.value.nearestOutsideRadius &&
          water.value.sources[0]
        ) {
          framed.push(turfPoint(water.value.sources[0].coordinates));
        }
        mapRef.current?.fitBounds(bbox(collection(framed)) as Bounds, 17);
      }
    },
    [basins, basinBoxes, overlapping, repository, c],
  );

  /**
   * Asks the device for its position. When `auto` (on page open), a point picked on the map
   * meanwhile wins, and a refusal stays quiet: the user did not press the button.
   */
  const requestPosition = useCallback(
    (auto: boolean) => {
      if (!navigator.geolocation) return void (auto || setStatus(c.noGeolocation));
      const startedAt = requestId.current;
      if (!auto) setStatus(c.locating);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (auto && requestId.current !== startedAt) return;
          void locate(pos.coords.longitude, pos.coords.latitude, pos.coords.accuracy, true);
        },
        (error) => {
          if (auto) return;
          setStatus(error.code === error.PERMISSION_DENIED ? c.permissionDenied : c.locationFailed);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    },
    [locate, c],
  );
  const useMyLocation = () => requestPosition(false);

  // Use the user's location as soon as the basins are ready; tapping the map still picks any point.
  const autoLocated = useRef(false);
  useEffect(() => {
    if (!basins || autoLocated.current) return;
    autoLocated.current = true;
    requestPosition(true);
  }, [basins, requestPosition]);

  // "Everything in the farm's basins": operators and sources of those basins, and streams in view.
  const zoom = view?.zoom ?? 0;
  const wants = (key: LayerKey) =>
    scope === 'basins' && result !== null && layers[key] && zoom >= BASINS_MIN_ZOOM[key];
  const selectedKey = selected.join(',');
  const streamsLoaded = useRef<{ bounds: Bounds; key: string; features: StreamFeature[] } | null>(
    null,
  );
  const wantOperators = wants('operators');
  const wantSources = wants('springs') || wants('otherSources');
  const wantStreams = wants('streams');
  useEffect(() => {
    if (!wantOperators && !wantSources) return;
    let cancelled = false;
    Promise.all([
      wantOperators ? repository.listOperators() : null,
      wantSources ? Promise.all(selected.map((n) => repository.listWaterSources(n))) : null,
    ]).then(
      ([operators, files]) => {
        if (cancelled) return;
        setBasinLayers((current) => ({
          ...current,
          operators: operators
            ? collection(
                operators.features
                  .filter((f) => selected.includes(f.properties.cuenca_no))
                  .map((f) => withTooltip(f, operatorTooltip(f.properties))),
              )
            : current.operators,
          sources: files
            ? collection(
                files
                  .flatMap((f) => f.features)
                  .map((f) => withTooltip(f, sourceTooltip(f.properties))),
              )
            : current.sources,
        }));
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [wantOperators, wantSources, selectedKey, repository]);

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
      setBasinLayers((current) => ({
        ...current,
        streams: collection(
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
      }));
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

  const scene = useMemo<MapScene>(() => {
    const water = result?.water.state === 'done' ? result.water.value : null;
    const parcel = result?.parcel.state === 'done' ? result.parcel.value?.feature : null;
    const near = scope === 'near';
    const kindVisible = (tipo: string) =>
      tipo === 'naciente' ? layers.springs : layers.otherSources;
    const nearSources = water
      ? water.sources
          .filter((s) => kindVisible(s.kind))
          .map((s) =>
            withTooltip(turfPoint(s.coordinates, { tipo: s.kind }), [
              s.name,
              `${c.sourceKind[s.kind]} · ${s.operatorName}`,
              s.distanceM === 0 ? c.inParcelLong : c.distance(formatDistance(s.distanceM)),
              sourceDetail(s.altitudeM, s.lastFlow),
            ]),
          )
      : [];
    const nearOperators = water
      ? water.operators
          .filter((o) => o.office)
          .map((o) =>
            withTooltip(turfPoint(o.office!.coordinates), [
              o.name,
              `${o.office!.kind} · ${c.services(o.office!.services)}`,
              c.operatorOffice(
                o.office!.distanceM === 0
                  ? c.inParcelLong
                  : c.distance(formatDistance(o.office!.distanceM)),
              ),
            ]),
          )
      : [];
    return {
      basemap,
      selectedBasins: result ? selected : [],
      subbasins,
      parcel: parcel ? collection([parcel]) : EMPTY,
      zone: near && parcel ? collection([searchZone(parcel, WATER_RADIUS_M)]) : EMPTY,
      streams: !layers.streams
        ? EMPTY
        : near
          ? result?.streams.state === 'done'
            ? result.streams.value.parts
            : EMPTY
          : wants('streams')
            ? basinLayers.streams
            : EMPTY,
      sources: near
        ? collection(nearSources)
        : wantSources
          ? collection(basinLayers.sources.features.filter((f) => kindVisible(f.properties?.tipo)))
          : EMPTY,
      operators: !layers.operators
        ? EMPTY
        : near
          ? collection(nearOperators)
          : wantOperators
            ? basinLayers.operators
            : EMPTY,
      user: result ? collection([turfPoint([result.lng, result.lat])]) : EMPTY,
      accuracy: result?.accuracyM
        ? collection([
            circle([result.lng, result.lat], result.accuracyM, { units: 'meters', steps: 48 }),
          ])
        : EMPTY,
    };
  }, [
    result,
    selected,
    subbasins,
    scope,
    layers,
    basemap,
    basinLayers,
    wantSources,
    wantOperators,
    zoom,
    c,
  ]);

  const pending =
    scope === 'basins' && result
      ? (Object.keys(BASINS_MIN_ZOOM) as LayerKey[])
          .filter((k) => layers[k] && zoom < BASINS_MIN_ZOOM[k])
          .map((k) => `${c.layers[k].toLowerCase()} (zoom ${BASINS_MIN_ZOOM[k]})`)
      : [];
  const hint =
    scope === 'basins' && !result
      ? c.scopeNeedsPoint
      : pending.length
        ? c.zoomHint(pending.join(', '))
        : '';

  return (
    <div className="basin-explorer">
      <div className="basin-toolbar">
        <button
          type="button"
          className="button button-primary"
          onClick={useMyLocation}
          disabled={!basins}
        >
          <LocateFixed size={20} aria-hidden="true" />
          {c.locate}
        </button>
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
      {!navigator.onLine && <p className="basin-notice">{c.offline}</p>}
      <p className="basin-status" role="status">
        {status}
      </p>
      <div className="basin-map-frame">
        {basins ? (
          <>
            <BasinMap
              ref={mapRef}
              basins={basins}
              scene={scene}
              onPick={(lng, lat) => void locate(lng, lat, null, false)}
              onView={setView}
            />
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
        <legend>{c.scope}</legend>
        {(['near', 'basins'] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="basin-scope"
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            {value === 'near' ? c.scopeNear : c.scopeBasins}
          </label>
        ))}
        {(Object.keys(layers) as LayerKey[]).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={(event) => setLayers({ ...layers, [key]: event.target.checked })}
            />
            <span className={`legend-mark legend-${key}`} aria-hidden="true" />
            {c.layers[key]}
          </label>
        ))}
        {hint && <p className="basin-hint">{hint}</p>}
      </fieldset>
      {result && <BasinResults result={result} />}
      <p className="source-note">{c.sources}</p>
    </div>
  );
}

function withTooltip<G extends Point>(feature: Feature<G>, lines: (string | null)[]): Feature<G> {
  return {
    ...feature,
    properties: { ...feature.properties, tooltip: lines.filter(Boolean).join('\n') },
  };
}

function streamTooltip(name: string | null, kind: string): string {
  return name ? `${name}\n${kind}` : kind;
}

function sourceTooltip(p: WaterSourceProperties): (string | null)[] {
  const c = copy.watershed.explorer;
  return [p.nombre, `${c.sourceKind[p.tipo]} · ${p.operador}`, sourceDetail(p.altitud, p.caudal)];
}

function operatorTooltip(p: OperatorProperties): (string | null)[] {
  const c = copy.watershed.explorer;
  return [
    p.nombre,
    `${p.tipo} · ${p.zona}`,
    `${c.services(p.servicios)} · ${c.operatorTotals(p.fuentes, p.nacientes)}`,
  ];
}

function sourceDetail(altitude: number | null, flow: number | null): string | null {
  const c = copy.watershed.explorer;
  const parts = [
    altitude ? c.altitude(number(altitude, 0)) : null,
    flow != null ? c.lastFlow(number(flow, 2)) : null,
  ];
  return parts.filter(Boolean).join(' · ') || null;
}
