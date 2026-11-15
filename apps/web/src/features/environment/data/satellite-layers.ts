import { validObservationDate } from './environment-data';

export const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
export const GIBS_CAPABILITIES = `${GIBS_WMS}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`;
export const SATELLITE_THEMES = {
  satellite: {
    layer: null,
    provider: 'Esri World Imagery',
    resolution: 'imagery',
    maxZoom: 19,
    legend: null,
  },
  terrain: {
    layer: null,
    provider: 'Mapzen Terrain Tiles / SRTM',
    resolution: 'terrain',
    maxZoom: 14,
    legend: null,
  },
  vegetation: {
    layer: 'MODIS_Terra_NDVI_8Day',
    provider: 'NASA · Terra / MODIS',
    resolution: '250 m',
    maxZoom: 9,
    legend: 'MODIS_NDVI_H.png',
  },
  rain: {
    layer: 'IMERG_Precipitation_Rate',
    provider: 'NASA · GPM / IMERG',
    resolution: '~10 km',
    maxZoom: 6,
    legend: 'GPM_Precipitation_Rate_H.png',
  },
  heat: {
    layer: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
    provider: 'NASA · Terra / MODIS',
    resolution: '1 km',
    maxZoom: 8,
    legend: 'MODIS_Land_Surface_Temp_H.png',
  },
  moisture: {
    layer: 'SMAP_L4_Analyzed_Surface_Soil_Moisture',
    provider: 'NASA · SMAP L4',
    resolution: '9 km',
    maxZoom: 7,
    legend: 'SMAP_Analyzed_Soil_Moisture_H.png',
  },
  dryness: {
    layer: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    provider: 'NASA · SMAP L4',
    resolution: '9 km',
    maxZoom: 7,
    legend: 'SMAP_Analyzed_Soil_Moisture_H.png',
  },
} as const;

export type SatelliteTheme = keyof typeof SATELLITE_THEMES;
export interface ImageryAvailability {
  dates: string[];
  latest: string;
}
export type ImageryCatalog = Partial<Record<SatelliteTheme, ImageryAvailability>>;

export function parseImageryCatalog(xml: string): ImageryCatalog {
  const catalog: ImageryCatalog = {};
  for (const [theme, config] of Object.entries(SATELLITE_THEMES)) {
    if (!config.layer) continue;
    const name = `<Name>${config.layer}</Name>`;
    const start = xml.indexOf(name);
    if (start < 0) continue;
    const end = xml.indexOf('</Layer>', start);
    if (end < 0) continue;
    const block = xml.slice(start, end);
    const dimension = block.match(/<Dimension\b([^>]*\bname="time"[^>]*)>([^<]+)<\/Dimension>/);
    const latest = dimension?.[1].match(/\bdefault="(\d{4}-\d{2}-\d{2})"/)?.[1];
    if (!dimension || !latest || !validObservationDate(latest)) continue;
    const ranges = dimension[2].split(',').map((range) => range.trim().split('/'));
    const dates: string[] = [];
    for (let offset = 27; offset >= 0; offset--) {
      const candidate = new Date(Date.parse(latest) - offset * 86400000).toISOString().slice(0, 10);
      const available = ranges.some(([first, last, interval]) => {
        if (!validObservationDate(first)) return false;
        if (!last) return candidate === first;
        const days = interval?.match(/^P(\d+)D$/)?.[1];
        if (!days || Number(days) < 1 || !validObservationDate(last)) return false;
        return (
          candidate >= first &&
          candidate <= last &&
          ((Date.parse(candidate) - Date.parse(first)) / 86400000) % Number(days) === 0
        );
      });
      if (available) dates.push(candidate);
    }
    if (dates.length) catalog[theme as SatelliteTheme] = { dates, latest: dates[dates.length - 1] };
  }
  return catalog;
}

let catalogRequest: Promise<ImageryCatalog> | undefined;
export function loadImageryCatalog(refresh = false): Promise<ImageryCatalog> {
  if (refresh) catalogRequest = undefined;
  if (!catalogRequest) {
    catalogRequest = fetch(GIBS_CAPABILITIES, {
      signal: AbortSignal.timeout(20000),
      credentials: 'omit',
    }).then(async (response) => {
      if (!response.ok) throw new Error('Imagery catalog unavailable');
      const catalog = parseImageryCatalog(await response.text());
      if (!Object.keys(catalog).length) throw new Error('No supported imagery layers');
      return catalog;
    });
    const request = catalogRequest;
    void request.catch(() => {
      if (catalogRequest === request) catalogRequest = undefined;
    });
  }
  return catalogRequest;
}

export function imageryTileUrl(theme: SatelliteTheme, observationDate: string): string {
  const layer = SATELLITE_THEMES[theme].layer;
  if (!layer || !validObservationDate(observationDate)) throw new Error('Invalid imagery request');
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
    SRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
    TIME: observationDate,
    BBOX: '{bbox-epsg-3857}',
  });
  return `${GIBS_WMS}?${params}`.replace('%7Bbbox-epsg-3857%7D', '{bbox-epsg-3857}');
}
