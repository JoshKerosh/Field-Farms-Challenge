import type { Farm, WaterSource, WatershedMapData } from '@field-farms/domain';
import { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { copy } from '../../i18n';

setWorkerUrl(workerUrl);

export default function WatershedMap({
  farm,
  sources,
  mapData,
}: {
  farm: Farm;
  sources: WaterSource[];
  mapData: WatershedMapData;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let map: Map | undefined;
    try {
      map = new Map({
        container: container.current,
        style: {
          version: 8,
          sources: {},
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#EDF3EC' } },
          ],
        },
        center: farm.coordinates,
        zoom: 12,
        attributionControl: false,
        locale: {
          'NavigationControl.ZoomIn': copy.watershed.zoomIn,
          'NavigationControl.ZoomOut': copy.watershed.zoomOut,
          'NavigationControl.ResetBearing': copy.watershed.resetBearing,
        },
      });
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', () => setUnavailable(true));
      map.on('load', () => {
        if (!map) return;
        map.addSource('demo-landscape', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [mapData.outline],
                },
              },
            ],
          },
        });
        map.addLayer({
          id: 'basin-fill',
          type: 'fill',
          source: 'demo-landscape',
          paint: { 'fill-color': '#D2E4D0', 'fill-opacity': 0.8 },
        });
        map.addLayer({
          id: 'basin-outline',
          type: 'line',
          source: 'demo-landscape',
          paint: { 'line-color': '#7A9B75', 'line-width': 2, 'line-dasharray': [3, 3] },
        });
        map.addSource('demo-river', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: mapData.river,
            },
          },
        });
        map.addLayer({
          id: 'river',
          type: 'line',
          source: 'demo-river',
          paint: { 'line-color': '#68A9BD', 'line-width': 5 },
          layout: { 'line-join': 'round', 'line-cap': 'round' },
        });
        map.addSource('demo-points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { kind: 'farm' },
                geometry: { type: 'Point', coordinates: farm.coordinates },
              },
              ...sources.map((source) => ({
                type: 'Feature' as const,
                properties: { kind: 'water' },
                geometry: { type: 'Point' as const, coordinates: source.coordinates },
              })),
            ],
          },
        });
        map.addLayer({
          id: 'points',
          type: 'circle',
          source: 'demo-points',
          paint: {
            'circle-radius': 8,
            'circle-color': ['match', ['get', 'kind'], 'farm', '#2E7A43', '#17617C'],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF',
          },
        });
        map.resize();
      });
    } catch {
      setUnavailable(true);
    }
    return () => map?.remove();
  }, [farm, sources, mapData]);
  return (
    <>
      <div
        className="watershed-map"
        ref={container}
        role="region"
        aria-label={copy.watershed.mapTitle}
        hidden={unavailable}
      />
      {unavailable && <p role="status">{copy.watershed.mapUnavailable}</p>}
      <div className="map-legend">
        <span>
          <i className="legend-farm" aria-hidden="true" />
          {farm.name}
        </span>
        <span>
          <i className="legend-water" aria-hidden="true" />
          {copy.watershed.sourceTitle}
        </span>
        <span className="map-demo-label">{copy.common.example}</span>
      </div>
    </>
  );
}
