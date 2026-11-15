import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('shows pending real assessments, switches demo scenarios, and returns without fictional data', async ({
  page,
}) => {
  const protectedRequests: string[] = [];
  page.on('request', (request) => {
    if (/earthdata\.nasa\.gov|gesdisc.*nasa\.gov/.test(request.url()))
      protectedRequests.push(request.url());
  });
  await page.goto('/alerts');
  const cards = page.locator('[data-alert-type]');
  await expect(cards).toHaveCount(4);
  await expect(cards.filter({ hasText: 'Indeterminada' })).toHaveCount(4);
  await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Simular lluvias intensas', exact: true }).click();
  await expect(cards.first()).toHaveAttribute('data-alert-type', 'inundacion');
  await expect(cards.first()).toContainText('Crítica');
  await expect(cards.first()).toContainText('Simulado');
  await expect(page.locator('[data-alert-type="saturacion"]')).toContainText('Alta');
  await expect(page.locator('#alert-mode-title')).toContainText('ficticios');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `output/alerts-demo-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Simular sequía', exact: true }).click();
  await expect(cards.first()).toHaveAttribute('data-alert-type', 'sequia');
  await page
    .getByRole('region', { name: 'Probar escenarios', exact: true })
    .getByRole('button', { name: 'Salir de la simulación', exact: true })
    .click();
  await expect(cards.filter({ hasText: 'Indeterminada' })).toHaveCount(4);
  await expect(page.locator('#alert-mode-title')).toContainText('no significa ausencia');
  await expect(cards.first()).not.toContainText('Field Farms Challenge · demo');
  expect(protectedRequests).toEqual([]);
});

test('supports the same simulation and provenance in English', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'light' })),
  );
  await page.goto('/alerts');
  await expect(
    page.getByRole('heading', { name: 'Environmental alerts', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Simulate heavy rain', exact: true }).click();
  const flood = page.locator('[data-alert-type="inundacion"]');
  await expect(flood).toContainText('Critical');
  await expect(flood).toContainText('Simulated');
  await expect(flood).toContainText('Observation period');
  await expect(page.locator('[data-alert-type="saturacion"]')).toContainText('Excess soil water');
});

test.describe('real published sources', () => {
  test.use({ serviceWorkers: 'block' });

  test('shows actual POWER and RONI dates while unapproved risk stays indeterminate', async ({
    page,
  }) => {
    await page.goto('/alerts');
    const drought = page.locator('[data-alert-type="sequia"]');
    const anomaly = drought.getByRole('row', { name: /Anomalía de lluvia de 30 días/ });
    await expect(anomaly).toContainText('1991–2020');
    await expect(anomaly).toContainText('13 nov 2026');
    await expect(anomaly).toContainText('Disponible');
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText(
      'NOAA CPC · RONI ERSSTv6',
    );
    await expect(
      page.locator('[data-alert-type]').filter({ hasText: 'Indeterminada' }),
    ).toHaveCount(4);
    await page.getByRole('button', { name: 'Simular sequía', exact: true }).click();
    await expect(drought).toContainText('Field Farms Challenge · demo');
    await expect(drought).not.toContainText('NASA POWER (10.8');
  });

  test('retains cached observation dates after a refresh fails', async ({ page }) => {
    await page.goto('/alerts');
    const drought = page.locator('[data-alert-type="sequia"]');
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText(
      'NOAA CPC · RONI ERSSTv6',
    );
    await page.route('**/data/nasa/roni/latest.json', (route) => route.abort());
    await page.reload();
    await expect(
      page.getByRole('region', { name: 'Estado de actualización de las fuentes' }),
    ).toContainText('copia local');
    await expect(drought.getByRole('row', { name: /Índice RONI/ })).toContainText('31 oct 2026');
    await expect(drought).toContainText('Indeterminada');
  });
});
