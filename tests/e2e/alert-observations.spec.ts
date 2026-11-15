import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { registerTestFarm } from './farm-fixture';

test.beforeEach(async ({ page }) => registerTestFarm(page));

test('explores real history, equal-period comparison and CNE layers without changing risk', async ({
  page,
}) => {
  await page.goto('/alerts');
  const history = page.getByRole('region', { name: 'Historial de lluvia y humedad', exact: true });
  await expect(history.getByRole('combobox', { name: 'Indicador', exact: true })).toBeVisible();
  await history.getByRole('combobox', { name: 'Días visibles', exact: true }).selectOption('90');
  await history.getByText('Ver tabla de datos (90 días)', { exact: true }).click();
  await expect(history.locator('tbody tr')).toHaveCount(90);
  await history
    .getByRole('combobox', { name: 'Duración de cada período', exact: true })
    .selectOption('7');
  await expect(history).toContainText('7 de 7 días con datos');
  await history
    .getByRole('combobox', { name: 'Indicador', exact: true })
    .selectOption('rootZoneWetness');
  await expect(history).toContainText('No es humedad volumétrica SMAP');
  const map = page.getByRole('region', { name: 'Mapa de antecedentes CNE', exact: true });
  await expect(map.getByRole('img')).toBeVisible();
  const flood = map.getByRole('button', {
    name: 'Zonas susceptibles a inundación CNE',
    exact: true,
  });
  await expect(flood).toHaveAttribute('aria-pressed', 'true');
  await flood.click();
  await expect(flood).toHaveAttribute('aria-pressed', 'false');
  await expect(
    map.getByRole('combobox', { name: 'Destacar un elemento', exact: true }).locator('option'),
  ).toHaveCount(1);
  await flood.click();
  await map
    .getByRole('combobox', { name: 'Destacar un elemento', exact: true })
    .selectOption({ index: 1 });
  await expect(map).toContainText('Sin fecha verificada');
  await map.getByRole('button', { name: 'Ampliar mapa', exact: true }).click();
  await expect(map.getByRole('img')).toHaveAttribute('viewBox', '120 80 240 160');
  await map.getByRole('button', { name: 'Restablecer vista', exact: true }).click();
  await expect(map.getByRole('img')).toHaveAttribute('viewBox', '0 0 480 320');
  await expect(map).toContainText('Cero registros no significa ausencia de riesgo');
  await page.getByRole('button', { name: 'Simular sequía', exact: true }).click();
  await expect(history.locator('tbody tr')).toHaveCount(90);
  await expect(map.getByRole('img')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await map.screenshot({ path: `output/alert-map-${test.info().project.name}.png` });
  await history.getByText('Ver tabla de datos (90 días)', { exact: true }).click();
  await history.screenshot({ path: `output/alert-history-${test.info().project.name}.png` });
  await page.screenshot({
    path: `output/alert-observations-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('shows the observed views in English', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'light' })),
  );
  await page.goto('/alerts');
  const history = page.getByRole('region', { name: 'Rainfall and moisture history', exact: true });
  await expect(history.getByRole('combobox', { name: 'Indicator', exact: true })).toBeVisible();
  await expect(
    history.getByRole('heading', { name: 'Temporal comparison', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'CNE historical hazard map', exact: true }).getByRole('img'),
  ).toBeVisible();
});

test('inspects the published reference without applying it to a different farm location', async ({
  page,
}) => {
  const territory = JSON.parse(readFileSync('apps/web/src/data/real/territory.json', 'utf8')) as {
    places: [string, string, string, number, number][];
  };
  const location = territory.places.find((entry) => entry[1] === 'Cartago')!;
  expect(location).toBeDefined();
  const saved = { x: location[3], y: location[4], subId: null };
  await page.addInitScript(
    (value) => localStorage.setItem('ffc.v10.loc', JSON.stringify(value)),
    saved,
  );
  await page.goto('/alerts');
  await page.getByRole('button', { name: 'Ver punto con datos', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Ubicación de las vistas observadas' }),
  ).toContainText('no tu ubicación seleccionada');
  await expect(
    page
      .getByRole('region', { name: 'Historial de lluvia y humedad', exact: true })
      .getByRole('combobox', { name: 'Indicador', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Mapa de antecedentes CNE', exact: true }).getByRole('img'),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ffc.v10.loc')!))).toEqual(
    saved,
  );
  await page.getByRole('button', { name: 'Ver ubicación seleccionada', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Historial de lluvia y humedad', exact: true }),
  ).toContainText('No hay una serie observada');
});
