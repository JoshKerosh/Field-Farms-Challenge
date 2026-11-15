import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerTestFarm } from './farm-fixture';

test.beforeEach(async ({ page }) => registerTestFarm(page));

test('shows only real observations and explains incomplete assessments', async ({ page }) => {
  const protectedRequests: string[] = [];
  page.on('request', (request) => {
    if (/earthdata\.nasa\.gov|gesdisc.*nasa\.gov/.test(request.url()))
      protectedRequests.push(request.url());
  });
  await page.goto('/alerts');
  await expect(page.locator('[data-alert-type]')).toHaveCount(4);
  await expect(
    page.locator('[data-alert-type]').filter({ hasText: 'Aún no se puede evaluar' }),
  ).toHaveCount(4);
  await expect(page.getByRole('button', { name: /Simular|Probar escenarios/ })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Qué podemos evaluar hoy', exact: true }),
  ).toContainText('fuentes verificadas');
  await page.screenshot({
    path: `output/alerts-real-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(protectedRequests).toEqual([]);
});

test('explains current observations and missing data in English', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'dark' })),
  );
  await page.goto('/alerts');
  await expect(
    page.getByRole('heading', { name: 'Environmental alerts', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-alert-type]').filter({ hasText: 'Not enough information to assess' }),
  ).toHaveCount(4);
  await expect(page.getByRole('button', { name: /Simulate/ })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'What can be assessed today', exact: true }),
  ).toContainText('verified sources');
});

test.describe('real published sources', () => {
  test.use({ serviceWorkers: 'block' });

  test('shows actual POWER and RONI dates while unapproved risk stays indeterminate', async ({
    page,
  }) => {
    await page.goto('/alerts');
    const drought = page.locator('[data-alert-type="sequia"]');
    await drought.locator('summary').click();
    const anomaly = drought.getByRole('row', { name: /Anomalía de lluvia de 30 días/ });
    await expect(anomaly).toContainText('1991–2020');
    await expect(anomaly).toContainText('13 nov 2026');
    await expect(anomaly).toContainText('Disponible');
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText(
      'NOAA CPC · RONI ERSSTv6',
    );
    await expect(
      page.locator('[data-alert-type]').filter({ hasText: 'Aún no se puede evaluar' }),
    ).toHaveCount(4);
  });

  test('retains cached observation dates after a refresh fails', async ({ page }) => {
    await page.goto('/alerts');
    const drought = page.locator('[data-alert-type="sequia"]');
    await drought.locator('summary').click();
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText(
      'NOAA CPC · RONI ERSSTv6',
    );
    await page.route('**/data/alerts/climate/roni/latest.json', (route) => route.abort());
    await page.reload();
    await drought.locator('summary').click();
    await expect(
      page.getByRole('region', { name: 'Estado de actualización de las fuentes' }),
    ).toContainText('copia local');
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText('31 oct 2026');
    await expect(drought).toContainText('Aún no se puede evaluar');
  });
});
