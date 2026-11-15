import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.setTimeout(60000);

async function openObservations(page: Page) {
  await expect(page.locator('#page-title')).toBeVisible();
  const details = page.locator('.environment-observations');
  if ((await details.count()) && (await details.getAttribute('open')) === null) {
    await details.locator(':scope > summary').click();
  }
}
const power = JSON.parse(readFileSync('apps/web/public/data/nasa/power/latest.json', 'utf8'));
const farm = { lat: 10.8, lng: -85.08, accuracyM: 15, parcel: null };

test('requires a selected farm instead of presenting default location data', async ({ page }) => {
  await page.goto('/environment');
  await openObservations(page);
  await expect(page.getByRole('heading', { name: 'Primero ubica tu finca' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ubicar mi finca', exact: true })).toHaveAttribute(
    'href',
    '/farm',
  );
  await expect(page.locator('#environment-power')).toHaveCount(0);
});

test('keeps published observations and their original dates available offline', async ({
  page,
  context,
}) => {
  await page.addInitScript(
    (site) => localStorage.setItem('ffc.v10.farmSite', JSON.stringify(site)),
    farm,
  );
  await page.goto('/environment');
  await openObservations(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await page.reload();
  await openObservations(page);
  await expect(page.getByText('411,9 mm', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean(
          (await caches.match('/data/nasa/power/latest.json')) &&
          (await caches.match('/data/noaa/roni/latest.json')),
        ),
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  try {
    await page.reload();
    await openObservations(page);
    await expect(page.getByText('411,9 mm', { exact: true })).toBeVisible();
    await expect(page.getByText('+1,97 °C', { exact: true })).toBeVisible();
    await expect(page.locator('time[datetime="2026-11-11"]').first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test.describe('observations for a selected farm', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((site) => {
      if (!localStorage.getItem('ffc.v10.farmSite')) {
        localStorage.setItem('ffc.v10.farmSite', JSON.stringify(site));
      }
    }, farm);
    await page.route('**/data/nasa/modis/latest.json', (route) => route.fulfill({ status: 404 }));
  });

  test('shows published values, dates, coverage and an honest unavailable satellite state', async ({
    page,
  }) => {
    await page.goto('/environment');
    await openObservations(page);
    const weather = page.getByRole('region', { name: 'NASA POWER', exact: true });
    await expect(weather.getByText('411,9 mm', { exact: true })).toBeVisible();
    await expect(weather.getByText(/más lluvia que el promedio/)).toBeVisible();
    await expect(weather.getByText(/Punto de referencia: Zona Norte/)).toBeVisible();
    await expect(weather.locator('time[datetime="2026-11-11"]').first()).toBeVisible();
    await expect(weather.getByRole('link', { name: 'NASA POWER' })).toHaveAttribute(
      'href',
      power.meta.url,
    );
    await expect(page.getByText(/no son mediciones dentro de tu finca/)).toBeVisible();
    await expect(page.getByText(/MODIS: el histórico regional/)).toBeVisible();
    await expect(page.getByText('+1,97 °C', { exact: true })).toBeVisible();
    await expect(page.locator('#sat-slider')).toHaveCount(1);
    await expect(page.locator('.basin-time-map')).toBeVisible();
    await weather.getByText('Ver fechas y valores', { exact: true }).click();
    await expect(weather.getByRole('table')).toBeVisible();
    await page.screenshot({
      path: `output/weather-${test.info().project.name}.png`,
      fullPage: true,
    });
  });

  test('changing the farm selects its regional observations instead of keeping Upala', async ({
    page,
  }) => {
    await page.goto('/environment');
    await openObservations(page);
    await expect(page.getByText('411,9 mm', { exact: true })).toBeVisible();
    const southernUnit = power.datos.items.find((item: { id: string }) => item.id === 'S');
    await page.evaluate((site) => localStorage.setItem('ffc.v10.farmSite', JSON.stringify(site)), {
      lat: southernUnit.lat,
      lng: southernUnit.lon,
      accuracyM: 15,
      parcel: null,
    });
    await page.reload();
    await openObservations(page);
    const weather = page.getByRole('region', { name: 'NASA POWER', exact: true });
    await expect(weather.getByText(/Punto de referencia: Pacífico Norte/)).toBeVisible();
    const rainfall = southernUnit.indicadores.find(
      (indicator: { id: string }) => indicator.id === 'lluvia_30d',
    );
    await expect(
      weather.getByText(`${new Intl.NumberFormat('es-CR').format(rainfall.valor)} mm`, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('a simulated weather file is rejected without hiding NOAA observations', async ({
    page,
  }) => {
    const simulated = structuredClone(power);
    simulated.meta.simulado = true;
    for (const item of simulated.datos.items)
      for (const indicator of item.indicadores) indicator.simulado = true;
    await page.route('**/data/nasa/power/latest.json', (route) =>
      route.fulfill({ json: simulated }),
    );
    await page.goto('/environment');
    await openObservations(page);
    const weather = page.getByRole('region', { name: 'NASA POWER', exact: true });
    await expect(weather.getByText(/No se pudo cargar un archivo real válido/)).toBeVisible();
    await expect(weather.getByText('411,9 mm', { exact: true })).toHaveCount(0);
    await expect(page.getByText('+1,97 °C', { exact: true })).toBeVisible();
  });

  test('retries an unavailable source without falling back to prototype data', async ({ page }) => {
    let requests = 0;
    await page.route('**/data/nasa/power/latest.json', (route) => {
      requests++;
      return requests === 1 ? route.fulfill({ status: 503 }) : route.fulfill({ json: power });
    });
    await page.goto('/environment');
    await openObservations(page);
    const weather = page.getByRole('region', { name: 'NASA POWER', exact: true });
    await expect(weather.getByText(/No se pudo cargar un archivo real válido/)).toBeVisible();
    await page.getByRole('button', { name: 'Volver a consultar' }).click();
    await expect(weather.getByText('411,9 mm', { exact: true })).toBeVisible();
  });

  test('keeps missing observations distinct from zero and warns about failed updates', async ({
    page,
  }) => {
    const incomplete = structuredClone(power);
    const unit = incomplete.datos.items.find((item: { id: string }) => item.id === 'N');
    unit.indicadores.find((indicator: { id: string }) => indicator.id === 'lluvia_30d').valor =
      null;
    unit.indicadores.find((indicator: { id: string }) => indicator.id === 'lluvia_30d').estado =
      'sin_dato';
    unit.indicadores.find((indicator: { id: string }) => indicator.id === 'lluvia_7d').valor = 0;
    await page.route('**/data/nasa/power/latest.json', (route) =>
      route.fulfill({ json: incomplete }),
    );
    await page.route('**/data/fuentes.json', (route) =>
      route.fulfill({
        json: {
          fuentes: [{ id: 'nasa-power', estado: 'falla' }],
        },
      }),
    );
    await page.goto('/environment');
    await openObservations(page);
    const weather = page.getByRole('region', { name: 'NASA POWER', exact: true });
    await expect(
      weather
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: 'Lluvia acumulada · 30 días' }) }),
    ).toContainText('Sin datos disponibles');
    await expect(weather.getByText('0 mm', { exact: true })).toBeVisible();
    await expect(
      weather.getByText(/último archivo disponible con su fecha original/),
    ).toBeVisible();
  });

  test('renders an available MODIS file with its actual series and coverage', async ({ page }) => {
    await page.route('**/data/nasa/modis/latest.json', (route) =>
      route.fulfill({
        json: {
          meta: {
            fuente: 'nasa-modis',
            url: 'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset',
            capa: 'nasa',
            simulado: false,
            fecha_dato: '2026-10-16',
            fecha_carga: '2026-11-15T03:49:28Z',
            version: 1,
          },
          datos: {
            unidad: 'zona',
            items: [
              {
                id: 'N',
                nombre: 'Zona Norte',
                lat: 10.8,
                lon: -85.08,
                indicadores: [
                  ['verdor', 0.6],
                  ['verdor_normal', 0.7],
                  ['verdor_anomalia', -0.1],
                ].map(([id, valor]) => ({
                  id,
                  nombre: id,
                  valor,
                  unidad: 'NDVI',
                  estado: 'sin_evaluar',
                  fuente: 'nasa-modis',
                  fecha: '2026-10-16',
                  simulado: false,
                  capa: 'nasa',
                })),
                serie: [
                  { fecha: '2026-09-30', valores: { verdor: 0.5 } },
                  { fecha: '2026-10-16', valores: { verdor: 0.6 } },
                ],
              },
            ],
          },
        },
      }),
    );
    await page.goto('/environment');
    await openObservations(page);
    const satellite = page.getByRole('region', { name: 'Vegetación observada por satélite' });
    await expect(satellite.getByText('0,6 NDVI', { exact: true })).toBeVisible();
    await expect(satellite.getByText(/menos verdor que su promedio histórico/)).toBeVisible();
    await expect(satellite.getByText(/aproximadamente 2 km/)).toBeVisible();
    await expect(
      satellite.getByRole('img', { name: 'Verdor de la vegetación · NDVI' }),
    ).toBeVisible();
    await expect(satellite.locator('time[datetime="2026-10-16"]').first()).toBeVisible();
  });

  test('supports English and dark mode without overflow or accessibility violations', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'dark' })),
    );
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/environment');
    await openObservations(page);
    await expect(
      page.getByRole('heading', { name: 'Weather and satellite', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('411.9 mm', { exact: true })).toBeVisible();
    await expect(page.getByText(/not measurements inside your farm/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const accessibility = await new AxeBuilder({ page })
      .include('.environment-page')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });
});
