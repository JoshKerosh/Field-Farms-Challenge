import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import {
  AttributionControl,
  Map,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LngLatBoundsLike,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { copy } from '../../../i18n';
import type { BasinProperties } from '../analysis/parcel-analysis';
import type { Bounds } from '../data/basin-explorer.repository';
import { loadMapIcons, type MapIconId } from './map-icons';

setWorkerUrl(workerUrl);

const CR_BOUNDS: LngLatBoundsLike = [
  [-86.0, 8.0],
  [-82.5, 11.25],
];
/** From this zoom on, basin fills almost disappear so the imagery and the parcel stay readable. */
const FADE_ZOOM = 15;

/** Everything drawn on top of the basins. Each collection replaces its source when it changes. */
export interface MapScene {
  basemap: 'satellite' | 'streets';
  /** Which basins are drawn: none, every one, or only `selectedBasins`, outlined. */
  basinsShown: 'none' | 'all' | 'selected';
  selectedBasins: number[];
  /** Property `destacada` marks the point's sub-basin and those the parcel crosses. */
  subbasins: FeatureCollection;
  parcel: FeatureCollection;
  zone: FeatureCollection;
  /** Properties: `intermitente`, `cruza`, `tooltip`. */
  streams: FeatureCollection;
  /** Properties: `tipo`, `tooltip`. */
  sources: FeatureCollection;
  /** Properties: `tooltip`. */
  operators: FeatureCollection;
  user: FeatureCollection;
  accuracy: FeatureCollection;
}
type SceneSource = Exclude<keyof MapScene, 'basemap' | 'basinsShown' | 'selectedBasins'>;
const SCENE_SOURCES: SceneSource[] = [
  'subbasins',
  'parcel',
  'zone',
  'streams',
  'sources',
  'operators',
  'user',
  'accuracy',
];
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

export interface MapView {
  bounds: Bounds;
  zoom: number;
}

export interface BasinMapHandle {
  fitBounds(bounds: Bounds, maxZoom: number): void;
  panTo(lng: number, lat: number): void;
}

export default function BasinMap({
  basins,
  scene,
  onPick,
  onView,
  ref,
}: {
  basins: FeatureCollection<Polygon | MultiPolygon, BasinProperties>;
  scene: MapScene;
  /** Without it, tapping the map only shows tooltips. */
  onPick?: (lng: number, lat: number) => void;
  onView: (view: MapView) => void;
  ref: Ref<BasinMapHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const pendingFit = useRef<((map: Map) => void) | null>(null);
  const callbacks = useRef({ onPick, onView });
  callbacks.current = { onPick, onView };

  useImperativeHandle(ref, () => ({
    fitBounds: ([w, s, e, n], maxZoom) => {
      const fit = (map: Map) =>
        map.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          { maxZoom, padding: 40 },
        );
      // Before the first load the fit waits for whichever map instance finishes loading.
      if (mapRef.current?.isStyleLoaded()) fit(mapRef.current);
      else pendingFit.current = fit;
    },
    panTo: (lng, lat) => mapRef.current?.panTo([lng, lat]),
  }));

  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: baseStyle(),
        bounds: CR_BOUNDS,
        attributionControl: false,
        locale: {
          'NavigationControl.ZoomIn': copy.watershed.zoomIn,
          'NavigationControl.ZoomOut': copy.watershed.zoomOut,
          'NavigationControl.ResetBearing': copy.watershed.resetBearing,
        },
      });
    } catch {
      setUnavailable(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    map.on('error', (event) => {
      // Tile errors (offline, a slow provider) should not hide the map.
      if (!('tile' in event)) console.warn(event.error);
    });
    let removed = false;
    map.on('load', () => {
      // Icons decode asynchronously; layers wait for them so no point is drawn without its icon.
      void loadMapIcons()
        .catch(() => [] as [MapIconId, HTMLImageElement][])
        .then((icons) => {
          if (removed) return;
          for (const [id, image] of icons) map.addImage(iconName(id), image, { pixelRatio: 2 });
          addOverlayLayers(map, basins);
          setLoaded(true);
          pendingFit.current?.(map);
          pendingFit.current = null;
        });
    });
    map.on('click', (event) => callbacks.current.onPick?.(event.lngLat.lng, event.lngLat.lat));

    let frame = 0;
    const emitView = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const b = map.getBounds();
        callbacks.current.onView({
          bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
          zoom: map.getZoom(),
        });
      });
    };
    map.on('move', emitView);
    map.on('load', emitView);

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '260px',
      offset: 10,
    });
    map.on('mousemove', (event) => {
      const [feature] = map.queryRenderedFeatures(event.point, {
        layers: ['operators', 'sources', 'streams', 'streams-intermittent', 'basins-fill'].filter(
          (id) => map.getLayer(id),
        ),
      });
      const text = feature
        ? ((feature.properties.tooltip as string | undefined) ??
          (feature.properties.nombre as string))
        : null;
      map.getCanvas().style.cursor = feature && feature.layer.id !== 'basins-fill' ? 'pointer' : '';
      if (!text) return void popup.remove();
      popup.setLngLat(event.lngLat).setDOMContent(tooltipContent(text)).addTo(map);
    });
    map.on('mouseout', () => popup.remove());

    return () => {
      removed = true;
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, [basins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const id of SCENE_SOURCES) (map.getSource(id) as GeoJSONSource).setData(scene[id]);
  }, [loaded, ...SCENE_SOURCES.map((id) => scene[id])]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    map.setLayoutProperty(
      'satellite',
      'visibility',
      scene.basemap === 'satellite' ? 'visible' : 'none',
    );
    map.setLayoutProperty(
      'streets',
      'visibility',
      scene.basemap === 'streets' ? 'visible' : 'none',
    );
  }, [loaded, scene.basemap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const shown = scene.basinsShown;
    for (const id of ['basins-fill', 'basins-line', 'basins-selected']) {
      map.setLayoutProperty(id, 'visibility', shown === 'none' ? 'none' : 'visible');
    }
    const selected: ExpressionSpecification = [
      'in',
      ['get', 'cuenca_no'],
      ['literal', scene.selectedBasins],
    ];
    const filter = shown === 'selected' ? selected : null;
    map.setFilter('basins-fill', filter);
    map.setFilter('basins-line', filter);
    map.setFilter('basins-selected', filter ?? ['==', ['get', 'cuenca_no'], -1]);
    const opacity = shown === 'selected' ? 0.45 : 0.35;
    map.setPaintProperty('basins-fill', 'fill-opacity', [
      'interpolate',
      ['linear'],
      ['zoom'],
      FADE_ZOOM - 1,
      opacity,
      FADE_ZOOM,
      opacity * 0.15,
    ]);
  }, [loaded, scene.basinsShown, scene.selectedBasins]);

  if (unavailable) return <p role="status">{copy.watershed.mapUnavailable}</p>;
  return (
    <div
      className="basin-map"
      ref={container}
      role="region"
      aria-label={copy.watershed.explorer.mapLabel}
    />
  );
}

export function baseStyle() {
  return {
    version: 8 as const,
    sources: {
      satellite: {
        type: 'raster' as const,
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
      },
      streets: {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap',
      },
    },
    layers: [
      { id: 'background', type: 'background' as const, paint: { 'background-color': '#EDF3EC' } },
      // Satellite by default: SIRI parcels match the imagery; OSM lot drawings can be ~10 m off.
      { id: 'satellite', type: 'raster' as const, source: 'satellite' },
      {
        id: 'streets',
        type: 'raster' as const,
        source: 'streets',
        layout: { visibility: 'none' as const },
      },
    ],
  };
}

function addOverlayLayers(map: Map, basins: FeatureCollection) {
  map.addSource('basins', { type: 'geojson', data: basins });
  for (const id of SCENE_SOURCES) map.addSource(id, { type: 'geojson', data: EMPTY });

  map.addLayer({
    id: 'basins-fill',
    type: 'fill',
    source: 'basins',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 },
  });
  map.addLayer({
    id: 'basins-line',
    type: 'line',
    source: 'basins',
    paint: { 'line-color': ['get', 'color'], 'line-width': 1 },
  });
  map.addLayer({
    id: 'basins-selected',
    type: 'line',
    source: 'basins',
    filter: ['==', ['get', 'cuenca_no'], -1],
    paint: { 'line-color': '#16231C', 'line-width': 3 },
  });
  map.addLayer({
    id: 'subbasins-line',
    type: 'line',
    source: 'subbasins',
    paint: { 'line-color': '#FFFFFF', 'line-width': 1, 'line-opacity': 0.9 },
  });
  map.addLayer({
    id: 'subbasins-highlight',
    type: 'fill',
    source: 'subbasins',
    filter: ['==', ['get', 'destacada'], true],
    paint: { 'fill-color': '#16231C', 'fill-opacity': 0.18 },
  });
  map.addLayer({
    id: 'subbasins-highlight-line',
    type: 'line',
    source: 'subbasins',
    filter: ['==', ['get', 'destacada'], true],
    paint: { 'line-color': '#16231C', 'line-width': 2.5, 'line-dasharray': [3, 2] },
  });
  map.addLayer({
    id: 'parcel-fill',
    type: 'fill',
    source: 'parcel',
    paint: { 'fill-color': '#C2185B', 'fill-opacity': 0.15 },
  });
  map.addLayer({
    id: 'parcel-line',
    type: 'line',
    source: 'parcel',
    paint: { 'line-color': '#C2185B', 'line-width': 3 },
  });
  map.addLayer({
    id: 'zone',
    type: 'line',
    source: 'zone',
    paint: {
      'line-color': '#FFFFFF',
      'line-width': 2,
      'line-opacity': 0.85,
      'line-dasharray': [2, 3],
    },
  });
  const streamWidth: ExpressionSpecification = ['case', ['==', ['get', 'cruza'], true], 5, 3.5];
  map.addLayer({
    id: 'streams',
    type: 'line',
    source: 'streams',
    filter: ['!=', ['get', 'intermitente'], true],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#1E88E5', 'line-width': streamWidth },
  });
  // line-dasharray is not data-driven: intermittent streams get their own layer.
  map.addLayer({
    id: 'streams-intermittent',
    type: 'line',
    source: 'streams',
    filter: ['==', ['get', 'intermitente'], true],
    paint: { 'line-color': '#1E88E5', 'line-width': streamWidth, 'line-dasharray': [2, 1.5] },
  });
  map.addLayer({
    id: 'sources',
    type: 'symbol',
    source: 'sources',
    layout: {
      // Icons are named after the SAGA `tipo`; anything else gets the unclassified one.
      'icon-image': [
        'coalesce',
        ['image', ['concat', 'icon-', ['get', 'tipo']]],
        ['image', iconName('sin clasificar')],
      ],
      'icon-size': ['case', ['==', ['get', 'tipo'], 'naciente'], 1, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
  map.addLayer({
    id: 'operators',
    type: 'symbol',
    source: 'operators',
    layout: {
      'icon-image': iconName('operator'),
      'icon-size': 1.1,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
  map.addLayer({
    id: 'accuracy',
    type: 'fill',
    source: 'accuracy',
    paint: { 'fill-color': '#17617C', 'fill-opacity': 0.12 },
  });
  map.addLayer({
    id: 'user',
    type: 'circle',
    source: 'user',
    paint: {
      'circle-radius': 8,
      'circle-color': '#17617C',
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 3,
    },
  });
}

const iconName = (id: MapIconId) => `icon-${id}`;

/** Tooltip text comes from external data, so it is set as text, never as HTML. */
export function tooltipContent(text: string): HTMLElement {
  const [title, ...lines] = text.split('\n');
  const element = document.createElement('div');
  element.className = 'basin-tooltip';
  const strong = document.createElement('strong');
  strong.textContent = title;
  element.append(strong);
  for (const line of lines) {
    const span = document.createElement('span');
    span.textContent = line;
    element.append(span);
  }
  return element;
}
