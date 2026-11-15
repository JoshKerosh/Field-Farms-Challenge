import { expect, test } from '@playwright/test';
import { registerTestFarm } from './farm-fixture';

test('a late parcel response replaces manual area before confirmation', async ({
  page,
  context,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let lookups = 0;
  await page.route('**/api/parcela?*', async (route) => {
    lookups++;
    await ready;
    await route.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              identifica: 'late-area',
              shape_area: 180123.456,
              finca: '1',
              provincia: '5',
              canton: '1',
              distrito: '1',
              plano: 'test',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-85.081, 10.799],
                  [-85.079, 10.799],
                  [-85.079, 10.801],
                  [-85.081, 10.801],
                  [-85.081, 10.799],
                ],
              ],
            },
          },
        ],
      },
    });
  });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 10.8, longitude: -85.08, accuracy: 15 });
  await page.goto('/farm');
  await expect.poll(() => lookups).toBe(1);
  await page.locator('#fm-ha').fill('99');
  await page.locator('#fm-name').fill('Área desde SIRI');
  await page.locator('#fm-act').selectOption('carne');
  await page.locator('#fm-cult').fill('6');
  release();
  await expect(page.locator('.farm-area-output')).toBeVisible();
  await expect(page.locator('#fm-ha')).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirmar mi finca', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ffc.v10.farm')!).my.ha))
    .toBe(18.0123456);
  expect(lookups).toBe(1);
});

for (const area of [180123.456, 0, null]) {
  test(`farm area reuses the selected parcel or permits manual entry: ${area}`, async ({
    page,
  }) => {
    await registerTestFarm(page);
    await page.addInitScript((area) => {
      if (area === null) return;
      const site = JSON.parse(localStorage.getItem('ffc.v10.farmSite')!);
      site.parcel = {
        type: 'Feature',
        properties: {
          identifica: 'test-area',
          shape_area: area,
          finca: '1',
          provincia: '5',
          canton: '1',
          distrito: '1',
          plano: 'test',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-85.081, 10.799],
              [-85.079, 10.799],
              [-85.079, 10.801],
              [-85.081, 10.801],
              [-85.081, 10.799],
            ],
          ],
        },
      };
      localStorage.setItem('ffc.v10.farmSite', JSON.stringify(site));
    }, area);
    let parcelRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/parcela')) parcelRequests++;
    });
    await page.goto('/farm');
    await page.getByRole('button', { name: 'Editar datos', exact: true }).click();
    if (area) {
      await expect(page.locator('#fm-ha')).toHaveCount(0);
      await expect(page.getByRole('status', { name: 'Área de la parcela · SIRI' })).toContainText(
        'ha',
      );
    } else {
      await page.locator('#fm-ha').fill('27');
    }
    await page.getByRole('button', { name: 'Confirmar mi finca', exact: true }).click();
    const expected = area ? area / 10_000 : 27;
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('ffc.v10.farm')!).my.ha))
      .toBe(expected);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Finca de pruebas del equipo', exact: true }),
    ).toBeVisible();
    expect(parcelRequests).toBe(0);
  });
}
