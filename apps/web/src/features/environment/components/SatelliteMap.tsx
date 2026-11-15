import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  Map,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Marker,
  addProtocol,
  setWorkerUrl,
  type GeoJSONSource,
  type ErrorEvent as MapErrorEvent,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import { bbox } from '@turf/turf';
import type { FarmSite } from '../../../app/context/FieldContext';
import { geometryContains } from '../../../shared/geo/geometry';
import { satelliteCopy } from '../../../i18n/satellite-copy';
import { useMessageLanguage } from '../../../i18n/messages';
import { imageryTileUrl, SATELLITE_THEMES, type SatelliteTheme } from '../data/satellite-layers';
import { altitudeColor, terrariumElevation } from '../data/elevation-colors';
import { basinShares, type BasinProperties } from '../../watersheds/analysis/parcel-analysis';

setWorkerUrl(workerUrl);
addProtocol('elevation-color', async (params, controller) => {
  const coordinates = new URL(params.url).pathname.match(/^\/(\d+)\/(\d+)\/(\d+)$/);
  if (!coordinates) throw new Error('Invalid terrain tile');
  const response = await fetch(
    `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${coordinates[1]}/${coordinates[2]}/${coordinates[3]}.png`,
    { signal: controller.signal, cache: 'force-cache', credentials: 'omit' },
  );
  if (!response.ok) throw new Error('Terrain tile unavailable');
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Terrain rendering unavailable');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    if (!pixels.data[offset + 3]) continue;
    const color = altitudeColor(
      terrariumElevation(pixels.data[offset], pixels.data[offset + 1], pixels.data[offset + 2]),
    );
    pixels.data[offset] = color[0];
    pixels.data[offset + 1] = color[1];
    pixels.data[offset + 2] = color[2];
  }
  context.putImageData(pixels, 0, 0);
  return { data: await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer() };
});
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
export type ImageryStatus = 'loading' | 'ready' | 'error' | 'unsupported' | 'empty';
export interface SatelliteMapHandle {
  focusFarm(): void;
  showCountry(): void;
  fitScale(): void;
}

export default function SatelliteMap({
  site,
  theme,
  imageryDate,
  opacity,
  smooth,
  terrain,
  onStatus,
  onElevation,
  onBasins,
  ref,
}: {
  site: FarmSite | null;
  theme: SatelliteTheme;
  imageryDate: string | null;
  opacity: number;
  smooth: boolean;
  terrain: boolean;
  onStatus: (status: ImageryStatus) => void;
  onElevation: (value: number | null) => void;
  onBasins: (names: string[]) => void;
  ref: Ref<SatelliteMapHandle>;
}) {
  const text = satelliteCopy[useMessageLanguage()];
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onStatus, onElevation, onBasins });
  callbacks.current = { onStatus, onElevation, onBasins };
  const selection = useRef(site);
  selection.current = site;
  const currentTheme = useRef(theme);
  currentTheme.current = theme;
  const [unsupported, setUnsupported] = useState(false);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useImperativeHandle(ref, () => ({
    fitScale() {
      const map = mapRef.current;
      if (map)
        map.easeTo({
          zoom: Math.min(map.getZoom(), SATELLITE_THEMES[theme].maxZoom + 0.7),
          duration: reducedMotion() ? 0 : 700,
        });
    },
    focusFarm() {
      if (!site) return;
      mapRef.current?.flyTo({
        center: [site.lng, site.lat],
        zoom: 12.5,
        duration: reducedMotion() ? 0 : 1200,
      });
    },
    showCountry() {
      mapRef.current?.fitBounds(
        [
          [-85.95, 8.05],
          [-82.55, 11.25],
        ],
        { padding: 40, duration: reducedMotion() ? 0 : 1200 },
      );
    },
  }));

  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        attributionControl: false,
        center: selection.current ? [selection.current.lng, selection.current.lat] : [-84.15, 9.8],
        zoom: selection.current ? 9.4 : 7.2,
        maxZoom: 18,
        minZoom: 4,
        style: {
          version: 8,
          sources: {
            satellite: {
              type: 'raster',
              tileSize: 256,
              maxzoom: 19,
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              ],
              attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
            },
            elevation: {
              type: 'raster-dem',
              encoding: 'terrarium',
              tileSize: 256,
              maxzoom: 14,
              tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
              attribution:
                '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain Tiles · Mapzen / SRTM</a>',
            },
            'elevation-colors': {
              type: 'raster',
              tileSize: 256,
              maxzoom: 12,
              tiles: ['elevation-color://tiles/{z}/{x}/{y}'],
            },
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#0d2529' } },
            {
              id: 'satellite',
              type: 'raster',
              source: 'satellite',
              paint: { 'raster-fade-duration': 400 },
            },
            {
              id: 'relief-shading',
              type: 'hillshade',
              source: 'elevation',
              layout: { visibility: 'none' },
              paint: {
                'hillshade-exaggeration': 0.5,
                'hillshade-shadow-color': '#142923',
                'hillshade-highlight-color': '#eee9ca',
              },
            },
            {
              id: 'elevation-colors',
              type: 'raster',
              source: 'elevation-colors',
              layout: { visibility: 'none' },
              paint: { 'raster-opacity': 0.88, 'raster-fade-duration': 300 },
            },
          ],
        },
      });
    } catch {
      setUnsupported(true);
      callbacks.current.onStatus('unsupported');
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    map.on('style.load', () => {
      map.addSource('farm-parcel', { type: 'geojson', data: EMPTY });
      map.addSource('farm-position', { type: 'geojson', data: EMPTY });
      map.addSource('farm-basins', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'watershed-fill',
        type: 'fill',
        source: 'farm-basins',
        paint: { 'fill-color': '#c8ffbf', 'fill-opacity': 0.045 },
      });
      map.addLayer({
        id: 'watershed-outline-shadow',
        type: 'line',
        source: 'farm-basins',
        paint: { 'line-color': '#10241e', 'line-width': 5, 'line-opacity': 0.7 },
      });
      map.addLayer({
        id: 'watershed-outline',
        type: 'line',
        source: 'farm-basins',
        paint: {
          'line-color': '#d3f9e7',
          'line-width': 2.2,
          'line-opacity': 0.95,
          'line-dasharray': [3, 3],
        },
      });
      map.addLayer({
        id: 'farm-parcel-fill',
        type: 'fill',
        source: 'farm-parcel',
        paint: { 'fill-color': '#b6f5b1', 'fill-opacity': 0.13 },
      });
      map.addLayer({
        id: 'farm-parcel-line',
        type: 'line',
        source: 'farm-parcel',
        paint: { 'line-color': '#d6ff8a', 'line-width': 3 },
      });
      map.addLayer({
        id: 'farm-halo',
        type: 'circle',
        source: 'farm-position',
        paint: { 'circle-radius': 20, 'circle-color': '#d6ff8a', 'circle-opacity': 0.18 },
      });
      map.addLayer({
        id: 'farm-point',
        type: 'circle',
        source: 'farm-position',
        paint: {
          'circle-radius': 6,
          'circle-color': '#d6ff8a',
          'circle-stroke-color': '#102b25',
          'circle-stroke-width': 3,
        },
      });
      setReady(true);
    });
    let elevationFailed = false;
    map.on('error', (event) => {
      if ('sourceId' in event && event.sourceId === 'elevation') elevationFailed = true;
      if ('sourceId' in event && (event.sourceId === 'satellite' || event.sourceId === 'elevation'))
        callbacks.current.onStatus('error');
    });
    const updateElevation = () => {
      if (!map.getTerrain() || elevationFailed || !map.isSourceLoaded('elevation'))
        return callbacks.current.onElevation(null);
      const point = map.getCenter();
      const elevation = map.queryTerrainElevation(point);
      callbacks.current.onElevation(
        elevation !== null && Number.isFinite(elevation) ? elevation / 1.3 : null,
      );
    };
    map.on('idle', updateElevation);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource('farm-position') as GeoJSONSource).setData(
      site
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [site.lng, site.lat] },
              },
            ],
          }
        : EMPTY,
    );
    (map.getSource('farm-parcel') as GeoJSONSource).setData(
      site?.parcel ? { type: 'FeatureCollection', features: [site.parcel] } : EMPTY,
    );
    if (site)
      map.flyTo({ center: [site.lng, site.lat], zoom: 9.4, duration: reducedMotion() ? 0 : 900 });
    const controller = new AbortController();
    void fetch('/data/geo/cuencas.geojson', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as FeatureCollection;
        if (!Array.isArray(data.features) || controller.signal.aborted) return;
        const candidates = data.features as Feature<Polygon | MultiPolygon, BasinProperties>[];
        const shares = site?.parcel ? basinShares(site.parcel, candidates) : [];
        const selected = new Set(shares.map((share) => share.basinNumber));
        const features = site
          ? candidates.filter(
              (feature) =>
                geometryContains(feature.geometry, site.lng, site.lat) ||
                selected.has(feature.properties.cuenca_no),
            )
          : candidates;
        (map.getSource('farm-basins') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features,
        });
        callbacks.current.onBasins(
          site ? features.map((feature) => feature.properties.nombre) : [],
        );
        if (site && features.length) {
          const bounds = bbox({ type: 'FeatureCollection', features });
          map.fitBounds(
            [
              [bounds[0], bounds[1]],
              [bounds[2], bounds[3]],
            ],
            {
              padding: 65,
              maxZoom: Math.min(9.7, SATELLITE_THEMES[currentTheme.current].maxZoom + 0.7),
              duration: reducedMotion() ? 0 : 1000,
            },
          );
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [ready, site]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !site) return;
    const label = document.createElement('div');
    label.className = 'satellite-farm-label';
    label.textContent = text.parcel;
    const marker = new Marker({ element: label, anchor: 'bottom', offset: [0, -18] })
      .setLngLat([site.lng, site.lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [ready, site, text.parcel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setTerrain(terrain ? { source: 'elevation', exaggeration: 1.3 } : null);
    map.easeTo({
      pitch: terrain ? 55 : 0,
      bearing: terrain ? -18 : 0,
      duration: reducedMotion() ? 0 : 900,
    });
    if (!terrain) onElevation(null);
  }, [ready, terrain, onElevation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty('relief-shading', 'visibility', theme === 'terrain' ? 'visible' : 'none');
    map.setLayoutProperty(
      'elevation-colors',
      'visibility',
      theme === 'terrain' ? 'visible' : 'none',
    );
  }, [ready, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer('thematic-imagery')) map.removeLayer('thematic-imagery');
    if (map.getSource('thematic-imagery')) map.removeSource('thematic-imagery');
    if (!SATELLITE_THEMES[theme].layer || !imageryDate) {
      onStatus('ready');
      return;
    }
    onStatus('loading');
    let failed = false;
    let empty = false;
    const controller = new AbortController();
    const onData = (event: { sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event.sourceId === 'thematic-imagery' && event.isSourceLoaded && !failed && !empty)
        onStatus('ready');
    };
    const onError = (event: MapErrorEvent) => {
      if ('sourceId' in event && event.sourceId === 'thematic-imagery') {
        failed = true;
        onStatus('error');
      }
    };
    map.on('sourcedata', onData);
    map.on('error', onError);
    map.addSource('thematic-imagery', {
      type: 'raster',
      tiles: [imageryTileUrl(theme, imageryDate)],
      tileSize: 256,
      maxzoom: SATELLITE_THEMES[theme].maxZoom,
      attribution: 'NASA GIBS / EOSDIS',
    });
    map.addLayer(
      {
        id: 'thematic-imagery',
        type: 'raster',
        source: 'thematic-imagery',
        paint: {
          'raster-opacity': 0.8,
          'raster-fade-duration': 300,
          'raster-resampling': 'nearest',
        },
      },
      'watershed-fill',
    );
    const bounds = map.getBounds();
    const probe = new URL(
      imageryTileUrl(theme, imageryDate).replace(
        '{bbox-epsg-3857}',
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(','),
      ),
    );
    probe.searchParams.set('SRS', 'EPSG:4326');
    probe.searchParams.set('WIDTH', '64');
    probe.searchParams.set('HEIGHT', '64');
    void fetch(probe, { signal: controller.signal, credentials: 'omit' })
      .then(async (response) => {
        if (!response.ok) return;
        const image = await createImageBitmap(await response.blob());
        const canvas = new OffscreenCanvas(64, 64);
        const context = canvas.getContext('2d');
        if (!context) {
          image.close();
          return;
        }
        context.drawImage(image, 0, 0, 64, 64);
        image.close();
        const pixels = context.getImageData(0, 0, 64, 64).data;
        empty = !pixels.some((channel, index) => index % 4 === 3 && channel > 0);
        if (empty && !controller.signal.aborted && !failed) onStatus('empty');
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      map.off('sourcedata', onData);
      map.off('error', onError);
    };
  }, [ready, theme, imageryDate, onStatus]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready && map?.getLayer('thematic-imagery'))
      map.setPaintProperty('thematic-imagery', 'raster-opacity', opacity);
  }, [ready, opacity, theme, imageryDate]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready && map?.getLayer('thematic-imagery'))
      map.setPaintProperty('thematic-imagery', 'raster-resampling', smooth ? 'linear' : 'nearest');
  }, [ready, smooth, theme, imageryDate]);

  if (unsupported)
    return (
      <p className="satellite-map-fallback" role="status">
        {text.noWebgl}
      </p>
    );
  return (
    <div ref={container} className="satellite-map-canvas" role="region" aria-label={text.map} />
  );
}
