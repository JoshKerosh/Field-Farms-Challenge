import { describe, expect, it } from 'vitest';
import { imageryTileUrl, parseImageryCatalog, SATELLITE_THEMES } from './satellite-layers';

describe('real satellite imagery', () => {
  it('only offers dates advertised by NASA and preserves gaps', () => {
    const xml = `<WMS_Capabilities><Layer><Name>MODIS_Terra_NDVI_8Day</Name><Dimension name="time" units="ISO8601" default="2026-11-14">2026-11-09/2026-11-11/P1D,2026-11-13/2026-11-14/P1D</Dimension></Layer></WMS_Capabilities>`;
    expect(parseImageryCatalog(xml).vegetation?.dates).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-13',
      '2026-11-14',
    ]);
    expect(parseImageryCatalog(xml).vegetation?.latest).toBe('2026-11-14');
    expect(parseImageryCatalog(xml).rain).toBeUndefined();
  });

  it('uses the actual layer cadence, not a fabricated daily sequence', () => {
    const xml = `<Layer><Name>MODIS_Terra_NDVI_8Day</Name><Dimension name="time" default="2026-11-14">2026-10-13/2026-11-14/P8D</Dimension></Layer>`;
    expect(parseImageryCatalog(xml).vegetation?.dates).toEqual([
      '2026-10-21',
      '2026-10-29',
      '2026-11-06',
      '2026-11-14',
    ]);
  });

  it('rejects invalid dates and missing metadata instead of labeling imagery as current', () => {
    expect(parseImageryCatalog('<html>Service unavailable</html>')).toEqual({});
    expect(
      parseImageryCatalog(
        '<Layer><Name>MODIS_Terra_NDVI_8Day</Name><Dimension name="time" default="2026-02-30">2026-01-01/2026-03-01/P1D</Dimension></Layer>',
      ),
    ).toEqual({});
    expect(() => imageryTileUrl('vegetation', '2026-02-30')).toThrow();
    expect(() => imageryTileUrl('satellite', '2026-11-14')).toThrow();
  });

  it.each(['vegetation', 'rain', 'heat', 'moisture', 'dryness'] as const)(
    'requests the real %s raster at the selected date',
    (theme) => {
      const tile = imageryTileUrl(theme, '2026-11-10');
      const url = new URL(tile);
      expect(url.hostname).toBe('gibs.earthdata.nasa.gov');
      expect(url.searchParams.get('LAYERS')).toBe(SATELLITE_THEMES[theme].layer);
      expect(url.searchParams.get('TIME')).toBe('2026-11-10');
      expect(url.searchParams.get('SRS')).toBe('EPSG:3857');
      expect(tile).toContain('{bbox-epsg-3857}');
    },
  );
});
