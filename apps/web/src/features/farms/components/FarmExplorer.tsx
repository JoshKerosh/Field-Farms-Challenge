import { bbox, circle, point as turfPoint } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { LocateFixed } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FarmSite } from '../../../app/context/FieldContext';
import { copy } from '../../../i18n';
import type { ParcelFeature } from '../../../platform/siri/parcel';
import {
  STREAMS_RADIUS_M,
  WATER_RADIUS_M,
  nearbyStreams,
  nearbyWater,
  searchZone,
  toParcel,
  type BasinProperties,
} from '../../watersheds/analysis/parcel-analysis';
import type {
  BasinExplorerRepository,
  Bounds,
} from '../../watersheds/data/basin-explorer.repository';
import BasinMap, {
  type BasinMapHandle,
  type MapScene,
  type MapView,
} from '../../watersheds/components/BasinMap';
import { BasinMinimap } from '../../watersheds/components/BasinMinimap';
import { formatDistance } from '../../watersheds/components/BasinResults';
import type { FarmResult } from '../../watersheds/components/explorer-result';
import {
  EMPTY,
  collection,
  sourceDetail,
  streamTooltip,
  withTooltip,
} from '../../watersheds/components/map-tooltips';
import { LegendMark } from '../../watersheds/components/map-icons';
import { FarmResults } from './FarmResults';

type LayerKey = 'operators' | 'springs' | 'otherSources' | 'streams';

/** Real map of "Mi finca": the SIRI parcel under the point and the water near it. */
export default function FarmExplorer({
  repository,
  site,
  onSite,
}: {
  repository: BasinExplorerRepository;
  /** Farm chosen earlier; it is shown again without asking the SIRI. */
  site: FarmSite | null;
  /** Called with the chosen point, and again with its parcel once the SIRI answers. */
  onSite: (site: FarmSite) => void;
}) {
  const c = copy.watershed.explorer;
  const mapRef = useRef<BasinMapHandle>(null);
  const requestId = useRef(0);
  const onSiteRef = useRef(onSite);
  onSiteRef.current = onSite;
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
  const [result, setResult] = useState<FarmResult | null>(null);

  useEffect(() => {
    repository.listBasins().then(
      (data) => {
        setBasins(data);
        setStatus(c.ready);
      },
      () => setStatus(c.basinsError),
    );
  }, [repository, c]);

  /**
   * Looks up the farm at the point. With `known` (a farm chosen earlier) the SIRI is not asked
   * again and the app's location is left as it is.
   */
  const locate = useCallback(
    async (
      lng: number,
      lat: number,
      accuracyM: number | null,
      fit: boolean,
      known?: ParcelFeature | null,
    ) => {
      if (!basins) return;
      const id = ++requestId.current;
      const stale = () => id !== requestId.current;
      const report = known === undefined;
      if (report) onSiteRef.current({ lng, lat, accuracyM, parcel: null });
      const base: FarmResult = {
        lng,
        lat,
        accuracyM,
        parcel: { state: 'loading' },
        streams: { state: 'idle' },
        water: { state: 'idle' },
      };
      setResult(base);
      setStatus(c.searchingParcel);

      let parcelFeature: ParcelFeature | null = known ?? null;
      let parcelError = false;
      if (report) {
        try {
          parcelFeature = await repository.findParcel(lng, lat);
        } catch {
          parcelError = true;
        }
        if (stale()) return;
        if (!parcelError) onSiteRef.current({ lng, lat, accuracyM, parcel: parcelFeature });
      }

      const withParcel: FarmResult = {
        ...base,
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
      const [zw, zs, ze, zn] = bbox(zone);
      const zoneBasins = basins.features
        .filter((f) => {
          const [w, s, e, n] = bbox(f);
          return w <= ze && e >= zw && s <= zn && n >= zs;
        })
        .map((f) => f.properties.cuenca_no);
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
    [basins, repository, c],
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

  // On open, show the farm chosen earlier or else use the user's location; tapping still picks.
  const started = useRef(false);
  useEffect(() => {
    if (!basins || started.current) return;
    started.current = true;
    if (site) void locate(site.lng, site.lat, site.accuracyM, true, site.parcel);
    else requestPosition(true);
  }, [basins, site, locate, requestPosition]);

  // Another picker on the page (district, sub-basin, example places) replaced the farm.
  useEffect(() => {
    if (site || !started.current) return;
    requestId.current++;
    setResult(null);
    setStatus(c.ready);
  }, [site, c]);

  const scene = useMemo<MapScene>(() => {
    const water = result?.water.state === 'done' ? result.water.value : null;
    const parcel = result?.parcel.state === 'done' ? result.parcel.value?.feature : null;
    const kindVisible = (tipo: string) =>
      tipo === 'naciente' ? layers.springs : layers.otherSources;
    const sources = water
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
    const operators = water
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
      // Basins belong to "Mi cuenca"; here only the farm and its water.
      basinsShown: 'none',
      selectedBasins: [],
      subbasins: EMPTY,
      parcel: parcel ? collection([parcel]) : EMPTY,
      zone: parcel ? collection([searchZone(parcel, WATER_RADIUS_M)]) : EMPTY,
      streams:
        layers.streams && result?.streams.state === 'done' ? result.streams.value.parts : EMPTY,
      sources: collection(sources),
      operators: layers.operators ? collection(operators) : EMPTY,
      user: result ? collection([turfPoint([result.lng, result.lat])]) : EMPTY,
      accuracy: result?.accuracyM
        ? collection([
            circle([result.lng, result.lat], result.accuracyM, { units: 'meters', steps: 48 }),
          ])
        : EMPTY,
    };
  }, [result, layers, basemap, c]);

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
              plain
            />
          </>
        ) : (
          <p className="map-loading">{status}</p>
        )}
      </div>
      <fieldset className="basin-options">
        <legend>{c.farmLayers}</legend>
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
      </fieldset>
      {result && <FarmResults result={result} />}
      <p className="source-note">{c.farmSources}</p>
    </div>
  );
}
