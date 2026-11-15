import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

test('keeps missing spatial evidence gray and exposes both project rules', async ({ page }) => {
  await page.goto('/alerts');
  const map = page.getByRole('region', { name: 'Mapa de condiciones de riesgo', exact: true });
  await expect(map.getByRole('img')).toBeVisible();
  await expect(map).toContainText('Faltan capas verificadas');
  await expect(map).toContainText('pendiente ≥20°');
  await map.getByRole('button', { name: 'Inundaciones', exact: true }).click();
  await expect(map).toContainText('≤5m (HAND)');
  await expect(map.locator('svg path[fill="#25804A"]')).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .include('section:has(h2[id$="-title"])')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test('renders all four combinations and evaluates flooding independently', async ({ page }) => {
  const base = JSON.parse(readFileSync('apps/web/public/data/alerts/cne/map.json', 'utf8')) as {
    bounds: number[];
  };
  const [west, south, east, north] = base.bounds;
  const observedAt = new Date(Date.now() - 3600000).toISOString();
  const validUntil = new Date(Date.now() + 86400000).toISOString();
  const reading = (value: number | boolean, unit: string) => ({
    value,
    unit,
    status: 'available',
    source: 'https://example.test/browser-fixture',
    observedAt,
    validUntil,
  });
  const features = Array.from({ length: 4 }, (_, index) => {
    const left = west + ((east - west) * index) / 4,
      right = west + ((east - west) * (index + 1)) / 4;
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [left, south],
            [right, south],
            [right, north],
            [left, north],
            [left, south],
          ],
        ],
      },
      properties: {
        id: `test-${index}`,
        name: `Synthetic zone ${index}`,
        conditions: {
          saturation: reading(index > 0 ? 0.95 : 0.5, 'fraction-of-pore-space'),
          slope: reading(index === 3 ? 25 : 10, 'degree'),
          susceptibleSoil: reading(index >= 2, 'boolean'),
          heightAboveDrainage: reading(10, 'm'),
          poorDrainage: reading(false, 'boolean'),
        },
      },
    };
  });
  await page.route('**/data/alerts/conditions.geojson', (route) =>
    route.fulfill({
      json: {
        type: 'FeatureCollection',
        schemaVersion: 'alert-condition-map-v1',
        dataMode: 'real',
        features,
      },
    }),
  );
  await page.goto('/alerts');
  const map = page.getByRole('region', { name: 'Mapa de condiciones de riesgo', exact: true });
  for (const color of ['#25804A', '#E6BE28', '#DD781C', '#C83232'])
    await expect(map.locator(`svg path[fill="${color}"]`)).toHaveCount(1);
  await map
    .getByRole('combobox', { name: 'Consultar condiciones de una zona', exact: true })
    .selectOption('test-3');
  await expect(map).toContainText('Synthetic zone 3 · Rojo: 3 condiciones');
  await map.getByRole('button', { name: 'Inundaciones', exact: true }).click();
  await expect(map.locator('svg path[fill="#C83232"]')).toHaveCount(0);
  await expect(map.locator('svg path[fill="#E6BE28"]')).toHaveCount(3);
  await expect(map.locator('svg path[fill="#25804A"]')).toHaveCount(1);
  await map.screenshot({ path: `output/condition-risk-map-${test.info().project.name}.png` });
});
