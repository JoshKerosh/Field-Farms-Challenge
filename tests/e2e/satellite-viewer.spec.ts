import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test.setTimeout(60000);
const image = readFileSync('apps/web/public/icons/icon-192.png');
const layers = [
  'MODIS_Terra_NDVI_8Day',
  'IMERG_Precipitation_Rate',
  'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
  'SMAP_L4_Analyzed_Surface_Soil_Moisture',
  'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
];
const capabilities = `<WMS_Capabilities>${layers.map((layer) => `<Layer><Name>${layer}</Name><Dimension name="time" default="2026-11-01">2026-10-08/2026-11-01/P8D</Dimension></Layer>`).join('')}</WMS_Capabilities>`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'ffc.v10.farmSite',
      JSON.stringify({ lat: 9.8556, lng: -83.9126, accuracyM: 15, parcel: null }),
    ),
  );
  await page.route('https://gibs.earthdata.nasa.gov/**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    return params.get('REQUEST') === 'GetCapabilities'
      ? route.fulfill({ contentType: 'text/xml', body: capabilities })
      : route.fulfill({ contentType: 'image/png', body: image });
  });
  await page.route('https://server.arcgisonline.com/**', (route) =>
    route.fulfill({ contentType: 'image/png', body: image }),
  );
});

test('restores the dev watershed viewer with working playback and date selection', async ({
  page,
}) => {
  await page.goto('/environment');
  await expect(page.locator('.basin-time-map')).toBeVisible();
  expect(await page.locator('.basin-time-map rect').count()).toBeGreaterThan(100);
  const slider = page.locator('#sat-slider');
  await expect(slider).toHaveValue('18');
  await page.getByRole('button', { name: 'Reproducir fechas', exact: true }).click();
  await expect(slider).not.toHaveValue('18');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await slider.focus();
  await slider.press('Home');
  await expect(slider).toHaveValue('0');
  await expect(page.locator('.basin-time-heading time')).toHaveAttribute('datetime', '2026-01-01');
  await slider.press('End');
  await expect(page.locator('.basin-time-heading time')).toHaveAttribute('datetime', '2026-10-16');
  await expect(page.locator('.environment-observations')).not.toHaveAttribute('open');
});

test('NASA layers use their real identifiers and dates while retaining the farm and basin', async ({
  page,
}) => {
  await page.goto('/environment');
  const requested = page.waitForRequest(
    (request) =>
      request.url().includes('REQUEST=GetMap') &&
      new URL(request.url()).searchParams.get('LAYERS') === layers[2],
  );
  await page.getByRole('button', { name: 'Temperatura', exact: true }).click();
  const request = await requested;
  expect(new URL(request.url()).searchParams.get('TIME')).toBe('2026-11-01');
  await expect(page.locator('.satellite-farm-label')).toHaveText('Tu finca');
  await expect(page.locator('.satellite-map-key')).toContainText('Reventazón');
  await expect(page.locator('.satellite-stage')).toHaveAttribute('data-theme', 'heat');
  await expect(page.locator('.satellite-date-slider time')).toHaveAttribute(
    'datetime',
    '2026-11-01',
  );
  const canvas = await page.locator('.satellite-map-canvas canvas').elementHandle();
  await page.getByRole('button', { name: 'Verdor', exact: true }).click();
  await expect(page.locator('.satellite-stage')).toHaveAttribute('data-theme', 'vegetation');
  expect(
    await canvas!.evaluate(
      (element) => element === document.querySelector('.satellite-map-canvas canvas'),
    ),
  ).toBe(true);
  await expect(page.locator('.satellite-farm-label')).toHaveCount(1);
  await page.getByRole('button', { name: 'Vegetación ↔ Altitud', exact: true }).click();
  await expect(page.locator('.satellite-stage')).toHaveAttribute('data-theme', 'terrain');
  await expect(page.locator('.satellite-altitude-legend')).toBeVisible();
  await page.getByRole('button', { name: 'Vegetación ↔ Altitud', exact: true }).click();
  await expect(page.locator('.satellite-stage')).toHaveAttribute('data-theme', 'vegetation');
  await expect(page.locator('.satellite-map-key')).toContainText('Reventazón');
  await expect(page.locator('.satellite-farm-label')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('shows every basin crossed by the parcel, not just the basin under its point', async ({
  page,
}) => {
  const polygon = (west: number, east: number) => ({
    type: 'Polygon',
    coordinates: [
      [
        [west, 9.85],
        [east, 9.85],
        [east, 9.86],
        [west, 9.86],
        [west, 9.85],
      ],
    ],
  });
  await page.addInitScript(
    (geometry) =>
      localStorage.setItem(
        'ffc.v10.farmSite',
        JSON.stringify({
          lat: 9.8556,
          lng: -83.9126,
          accuracyM: 15,
          parcel: { type: 'Feature', properties: {}, geometry },
        }),
      ),
    polygon(-83.913, -83.912),
  );
  await page.route('**/data/geo/cuencas.geojson', (route) =>
    route.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { cuenca_no: 1, nombre: 'Cuenca oeste', area_ha: 100, color: '#83b384' },
            geometry: polygon(-83.914, -83.9125),
          },
          {
            type: 'Feature',
            properties: { cuenca_no: 2, nombre: 'Cuenca este', area_ha: 100, color: '#83b384' },
            geometry: polygon(-83.9125, -83.911),
          },
          {
            type: 'Feature',
            properties: { cuenca_no: 3, nombre: 'Cuenca ajena', area_ha: 100, color: '#83b384' },
            geometry: polygon(-83.91, -83.909),
          },
        ],
      },
    }),
  );
  await page.goto('/environment');
  await page.getByRole('button', { name: 'Verdor', exact: true }).click();
  await expect(page.locator('.satellite-map-key')).toContainText('Cuenca oeste');
  await expect(page.locator('.satellite-map-key')).toContainText('Cuenca este');
  await expect(page.locator('.satellite-map-key')).not.toContainText('Cuenca ajena');
});
