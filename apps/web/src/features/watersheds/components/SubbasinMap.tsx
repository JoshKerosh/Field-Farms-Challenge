import { bbox } from '@turf/turf';
import { AttributionControl, Map, NavigationControl, Popup, type GeoJSONSource } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { MapLayer } from '../../../data/engine/watershed';
import { copy } from '../../../i18n';
import { baseStyle, tooltipContent } from './BasinMap';
import type { SubbasinLayers } from './subbasin-layers';

const SOURCES = ['outline', 'restore', 'banks', 'halos', 'sources', 'farm'] as const;
/** Map layers shown by each plan layer; the outline, sources and farm are always shown. */
const PLAN_LAYERS: Record<MapLayer, string[]> = {
  agua: ['halos'],
  restaurar: ['restore'],
  orillas: ['banks'],
};

/** The sub-basin plan (water, where to restore, banks without forest) on the satellite map. */
export default function SubbasinMap({
  layers,
  layer,
  selected,
  onSelect,
  label,
}: {
  layers: SubbasinLayers;
  layer: MapLayer;
  selected: number | null;
  onSelect: (sourceIndex: number) => void;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const outlineKey = JSON.stringify(bbox(layers.outline));

  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: baseStyle(),
        bounds: bbox(layers.outline) as [number, number, number, number],
        fitBoundsOptions: { padding: 24 },
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
      if (!('tile' in event)) console.warn(event.error);
    });
    map.on('load', () => {
      addLayers(map);
      setLoaded(true);
    });
    map.on('click', 'sources', (event) => {
      const i = event.features?.[0]?.properties.i;
      if (typeof i === 'number') onSelectRef.current(i);
    });

    const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: '260px' });
    map.on('mousemove', (event) => {
      const [feature] = map.getLayer('sources')
        ? map.queryRenderedFeatures(event.point, { layers: ['sources'] })
        : [];
      map.getCanvas().style.cursor = feature ? 'pointer' : '';
      if (!feature) return void popup.remove();
      popup
        .setLngLat(event.lngLat)
        .setDOMContent(tooltipContent(feature.properties.tooltip as string))
        .addTo(map);
    });
    map.on('mouseout', () => popup.remove());

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; data and view follow in the effects below.
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const id of SOURCES) (map.getSource(id) as GeoJSONSource).setData(layers[id]);
  }, [loaded, layers]);

  // A new sub-basin moves the view to it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const [w, s, e, n] = JSON.parse(outlineKey) as number[];
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: 24 },
    );
  }, [loaded, outlineKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    for (const [plan, ids] of Object.entries(PLAN_LAYERS)) {
      for (const id of ids.flatMap((id) => [`${id}-fill`, `${id}-line`])) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', plan === layer ? 'visible' : 'none');
        }
      }
    }
    map.setPaintProperty('sources', 'circle-radius', [
      'case',
      ['==', ['get', 'i'], selected ?? -1],
      9,
      6,
    ]);
  }, [loaded, layer, selected]);

  if (unavailable) return <p role="status">{copy.watershed.mapUnavailable}</p>;
  return <div className="basin-map" ref={container} role="region" aria-label={label} />;
}

function addLayers(map: Map) {
  for (const id of SOURCES) {
    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }
  map.addLayer({
    id: 'outline-fill',
    type: 'fill',
    source: 'outline',
    paint: { 'fill-color': '#FFFFFF', 'fill-opacity': 0.08 },
  });
  map.addLayer({
    id: 'restore-fill',
    type: 'fill',
    source: 'restore',
    layout: { visibility: 'none' },
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.6 },
  });
  map.addLayer({
    id: 'banks-fill',
    type: 'fill',
    source: 'banks',
    layout: { visibility: 'none' },
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.65 },
  });
  map.addLayer({
    id: 'halos-fill',
    type: 'fill',
    source: 'halos',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 },
  });
  map.addLayer({
    id: 'halos-line',
    type: 'line',
    source: 'halos',
    paint: { 'line-color': ['get', 'color'], 'line-opacity': 0.5, 'line-dasharray': [2, 2] },
  });
  map.addLayer({
    id: 'outline-line',
    type: 'line',
    source: 'outline',
    paint: { 'line-color': '#FFFFFF', 'line-width': 2.5 },
  });
  map.addLayer({
    id: 'farm-fill',
    type: 'fill',
    source: 'farm',
    filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
    paint: { 'fill-color': '#C2185B', 'fill-opacity': 0.2 },
  });
  map.addLayer({
    id: 'farm-line',
    type: 'line',
    source: 'farm',
    filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
    paint: { 'line-color': '#C2185B', 'line-width': 3 },
  });
  map.addLayer({
    id: 'farm-point',
    type: 'circle',
    source: 'farm',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 7,
      'circle-color': '#17617C',
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 2.5,
    },
  });
  map.addLayer({
    id: 'sources',
    type: 'circle',
    source: 'sources',
    paint: {
      'circle-radius': 6,
      'circle-color': ['get', 'color'],
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 1.5,
    },
  });
}
