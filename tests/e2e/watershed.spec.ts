import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Only local layers (public/data/geo): SIRI and IGN are external and stay out of CI.
test('Mi finca muestra el mapa de la finca con controles accesibles', async ({ page }) => {
  await page.goto('/farm', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ubicación de la finca' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toBeEnabled();
  await expect(page.getByRole('group', { name: 'Fondo del mapa' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Agua cerca de la finca' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Minimapa de Costa Rica/ })).toBeVisible();
  await expect(page.getByText('Tocá un punto del mapa o usá tu ubicación.')).toBeVisible();

  const result = await new AxeBuilder({ page })
    .include('.basin-explorer')
    .exclude('.basin-map')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('Mi cuenca pide ubicar la finca antes de mostrar su cuenca', async ({ page }) => {
  await page.goto('/watershed', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Mi cuenca', exact: true })).toBeVisible();
  await expect(page.getByText('Ingresa los datos de tu finca para continuar.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ubicar mi finca' })).toHaveAttribute(
    'href',
    '/farm',
  );
  await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toHaveCount(0);
  await expect(page.locator('.basin-explorer')).toHaveCount(0);

  const result = await new AxeBuilder({ page })
    .exclude('.basin-map')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('la finca ubicada con GPS en Mi finca define la cuenca de Mi cuenca', async ({
  page,
  context,
}) => {
  await page.route('**/api/parcela?*', (route) =>
    route.fulfill({ json: { type: 'FeatureCollection', features: [] } }),
  );
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 9.8556, longitude: -83.9126, accuracy: 15 });
  await page.goto('/farm', { waitUntil: 'domcontentloaded' });
  await expect(
    page
      .locator('.basin-results')
      .getByText(/Tu ubicación: 9\.85560, -83\.91260 \(precisión ±15 m\)/),
  ).toBeVisible();

  await page.locator('#fm-name').fill('Finca de pruebas GPS');
  await page.locator('#fm-act').selectOption('carne');
  await page.locator('#fm-ha').fill('24');
  await page.locator('#fm-cult').fill('6');
  await page.locator('#fm-animals').fill('15');
  await page.getByRole('button', { name: 'Confirmar mi finca', exact: true }).click();

  await page.goto('/watershed', { waitUntil: 'domcontentloaded' });
  const results = page.locator('.basin-results');
  await expect(results.getByRole('heading', { name: 'Reventazón' })).toBeVisible();
  await expect(results.getByText(/ASADAS y operadores con oficina en la cuenca/)).toBeVisible();
  await expect(page.getByText('Todavía no ubicaste tu finca en el mapa.')).toHaveCount(0);
});

test('los mapas no desbordan a 320 px', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ffc.v10.farm',
      JSON.stringify({
        version: 2,
        key: 'mia',
        my: {
          name: 'Finca de pruebas móvil',
          act: 'carne',
          agua: 'pozo',
          ha: 24,
          cult: 6,
          animals: 15,
          ench: 'no',
        },
      }),
    );
    localStorage.setItem(
      'ffc.v10.farmSite',
      JSON.stringify({ lat: 9.8556, lng: -83.9126, accuracyM: 15, parcel: null }),
    );
  });
  await page.setViewportSize({ width: 320, height: 760 });
  for (const route of ['/farm', '/watershed']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.basin-explorer')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
});
