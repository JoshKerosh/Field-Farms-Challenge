import { expect, test } from '@playwright/test';
import { registerTestFarm } from './farm-fixture';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => registerTestFarm(page));
test('a goal in the plan is recorded only in Records and survives corrections and reload', async ({
  page,
}) => {
  await page.goto('/care');
  await page.getByRole('button', { name: /Crear plan$/ }).click();
  const suggestion = page
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Revisar el abastecimiento y las fugas' }) });
  await suggestion.locator('summary').click();
  await suggestion.getByRole('spinbutton', { name: 'Cantidad objetivo', exact: true }).fill('5');
  await suggestion.getByLabel('Fecha objetivo', { exact: true }).fill('2027-02-01');
  await suggestion.getByLabel('Lugar dentro de la finca', { exact: true }).fill('Bebederos');
  await suggestion.getByRole('button', { name: 'Agregar meta', exact: true }).click();
  const goal = page.locator('.recovery-goal');
  await expect(goal).toHaveCount(1);
  await expect(goal.locator('input[type=file]')).toHaveCount(0);
  await goal.getByRole('link', { name: 'Registrar avance en Registros', exact: true }).click();
  await expect(page).toHaveURL(/\/records\?section=plan&goal=/);
  await goal.locator('summary').filter({ hasText: 'Registrar avance' }).click();
  await goal.getByLabel('Cantidad total alcanzada a esta fecha', { exact: true }).fill('3');
  await goal.getByLabel('Gasto de este registro (CRC)', { exact: true }).fill('2000');
  await goal.locator('input[type=file]').setInputFiles('apps/web/public/icons/icon-192.png');
  await goal.getByRole('button', { name: 'Guardar en este dispositivo', exact: true }).click();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '60');
  await goal.locator('summary').filter({ hasText: 'Corregir registro' }).click();
  const correction = goal
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Corregir registro' }) });
  await correction
    .getByRole('spinbutton', { name: 'Cantidad total alcanzada a esta fecha', exact: true })
    .fill('4');
  await correction.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '80');
  await page.reload();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '80');
  await expect(goal.getByRole('img')).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.context().setOffline(true);
  await page.reload();
  await expect(goal.getByRole('progressbar')).toHaveAttribute('value', '80');
  await expect(goal.getByRole('img')).toHaveCount(1);
  await page.context().setOffline(false);
  await page.getByRole('link', { name: 'Definir o editar metas en el plan', exact: true }).click();
  await expect(page.locator('.recovery-goal progress')).toHaveAttribute('value', '80');
  await page
    .getByRole('navigation', { name: 'Secciones principales' })
    .getByRole('link', { name: 'Registros', exact: true })
    .click();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('link', { name: 'Beneficios', exact: true }).click();
  await expect(page.locator('.benefit-summary dd')).toHaveText(['0', '1', '1']);
  for (const article of await page.locator('article.opportunity').all()) {
    await article.locator('summary').click();
    await expect(article.getByRole('heading', { name: 'Qué preparar', exact: true })).toBeVisible();
    await expect(
      article.getByRole('heading', { name: 'Costos y compromisos', exact: true }),
    ).toBeVisible();
    await expect(article.locator('.opportunity-details a')).not.toHaveCount(0);
  }
  await page.screenshot({
    path: `output/benefits-expanded-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    localStorage.setItem(
      'ffc.v10.farmSite',
      JSON.stringify({
        lat: 9.8556,
        lng: -83.9126,
        accuracyM: 15,
        parcel: null,
        provisionalId: 'draft:another-test-farm',
      }),
    );
    const saved = JSON.parse(localStorage.getItem('ffc.v10.farm')!);
    saved.my.name = 'Otra finca del equipo';
    localStorage.setItem('ffc.v10.farm', JSON.stringify(saved));
  });
  const other = await page.context().newPage();
  await other.goto('http://127.0.0.1:4173/care');
  await expect(
    other.getByRole('heading', { name: 'Otra finca del equipo', exact: true }),
  ).toBeVisible();
  await expect(other.locator('.recovery-goal')).toHaveCount(0);
  await expect(other.locator('.context-location')).not.toContainText('Upala');
  await other.close();
  await page.goto('/care');
  await expect(page.locator('.recovery-goal progress')).toHaveAttribute('value', '80');
});

test('water measurements require a source and preserve a measured zero rainfall', async ({
  page,
}) => {
  await page.goto('/records?section=water');
  await page.getByRole('button', { name: 'Guardar medición', exact: true }).click();
  await expect(
    page.getByText('Medición guardada en este dispositivo.', { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Tipo de medición', exact: true })
    .selectOption('lluvia');
  await page.getByRole('spinbutton', { name: 'Lluvia medida (mm)', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Guardar medición', exact: true }).click();
  await expect(
    page.getByText('Medición guardada en este dispositivo.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ffc.registros')!).some(
        (r: { t: string; v: number; location?: unknown }) =>
          r.t === 'lluvia' && r.v === 0 && !!r.location,
      ),
    ),
  ).toBe(true);
  await expect(page.getByRole('button', { name: /Cargar.*ejemplo/ })).toHaveCount(0);
});
