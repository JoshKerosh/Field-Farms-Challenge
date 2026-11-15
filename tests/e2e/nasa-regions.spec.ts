import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const snapshot = JSON.parse(
  readFileSync('apps/web/public/data/alerts/nasa-regions.geojson', 'utf8'),
) as {
  observedEnd: string;
  features: {
    properties: {
      id: string;
      name: string;
      weather: { wetness3d: number; rain7dMm: number };
      terrain: { slopeDegreesMax: number; flatSampleFraction: number };
    };
  }[];
};
const observationTime = Date.parse(`${snapshot.observedEnd}T12:00:00Z`);

test('shows real nationwide NASA estimates, basin details and independent terrain signals', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(observationTime + 86400000));
  await page.goto('/alerts');
  const map = page.getByRole('region', { name: 'Estimación regional NASA', exact: true });
  await expect(map.getByRole('img')).toBeVisible();
  await expect(map).toContainText('34 cuencas');
  const select = map.getByRole('combobox', { name: 'Consultar cuenca', exact: true });
  await expect(select.locator('option')).toHaveCount(34);
  const basin = snapshot.features.find(
    (f) =>
      f.properties.terrain.slopeDegreesMax >= 20 && f.properties.terrain.flatSampleFraction < 0.5,
  )!.properties;
  await select.selectOption(basin.id);
  await expect(map.getByRole('heading', { level: 3 })).toContainText(basin.name);
  const weatherCount =
    Number(basin.weather.wetness3d >= 0.9) + Number(basin.weather.rain7dMm >= 100);
  const labels = ['Verde: 0 señales', 'Amarillo: 1 señal', 'Naranja: 2 señales', 'Rojo: 3 señales'];
  await expect(map.getByRole('heading', { level: 3 })).toContainText(labels[weatherCount + 1]);
  await map.getByRole('button', { name: 'Inundaciones', exact: true }).click();
  await expect(map.getByRole('heading', { level: 3 })).toContainText(labels[weatherCount]);
  await expect(map).toContainText('no mide el desbordamiento de ríos');
  await expect(map).toContainText('no determina si el suelo es inadecuado');
  await expect(map).toContainText('9/9');
  await map.getByRole('button', { name: 'Ampliar mapa', exact: true }).click();
  await expect(map.getByRole('img')).not.toHaveAttribute('viewBox', '0 0 640 400');
  await map.getByRole('button', { name: 'Restablecer vista', exact: true }).click();
  await expect(map.getByRole('img')).toHaveAttribute('viewBox', '0 0 640 400');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .include('section:has(h2[id$="-title"])')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await map.screenshot({ path: `output/nasa-regions-${test.info().project.name}.png` });
});

test('marks expired observations gray even when the file was downloaded recently', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(observationTime + 8 * 86400000));
  await page.goto('/alerts');
  const map = page.getByRole('region', { name: 'Estimación regional NASA', exact: true });
  await expect(map).toContainText('Los datos meteorológicos no están vigentes');
  await expect(map.getByRole('heading', { level: 3 })).toContainText(
    'Gris: datos insuficientes o vencidos',
  );
  await expect(map.locator('svg path[fill="#25804A"]')).toHaveCount(0);
  await expect(map.locator('svg path[fill="#C83232"]')).toHaveCount(0);
});

test('keeps a failed NASA layer independent of the existing CNE map', async ({ page }) => {
  await page.route('**/data/alerts/nasa-regions.geojson', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/alerts');
  await expect(
    page.getByRole('region', { name: 'Estimación regional NASA', exact: true }),
  ).toContainText('No se pudo cargar la capa regional NASA');
  await expect(
    page.getByRole('region', { name: 'Mapa de antecedentes CNE', exact: true }).getByRole('img'),
  ).toBeVisible();
});

test('explains the same regional estimate in English', async ({ page }) => {
  await page.clock.setFixedTime(new Date(observationTime + 86400000));
  await page.addInitScript(() =>
    localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'light' })),
  );
  await page.goto('/alerts');
  const map = page.getByRole('region', { name: 'NASA regional estimate', exact: true });
  await expect(map.getByRole('img')).toBeVisible();
  await expect(
    map.getByRole('combobox', { name: 'Inspect basin', exact: true }).locator('option'),
  ).toHaveCount(34);
  await expect(map).toContainText('does not include soil type');
});
