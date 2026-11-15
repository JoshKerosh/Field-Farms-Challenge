import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Only local layers (public/data/geo): SIRI and IGN are external and stay out of CI.
test('muestra el explorador de cuencas con controles accesibles', async ({ page }) => {
  await page.goto('/watershed');
  await expect(page.getByRole('heading', { name: 'Ubicá tu finca en su cuenca' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toBeEnabled();
  await expect(page.getByRole('group', { name: 'Fondo del mapa' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Solo cerca de la finca' })).toBeChecked();
  await expect(page.getByRole('img', { name: /Minimapa de Costa Rica/ })).toBeVisible();
  await expect(page.getByText('Tocá un punto del mapa o usá tu ubicación.')).toBeVisible();

  await page.getByRole('radio', { name: 'Todo en las cuencas de la finca' }).check();
  await expect(
    page.getByText('Elegí un punto para ver el agua de las cuencas de esa finca.'),
  ).toBeVisible();

  // The demo example stays below the real map.
  await expect(page.getByText('Administrada por: ASADA de ejemplo')).toHaveCount(2);

  const result = await new AxeBuilder({ page })
    .exclude('.basin-map')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(result.violations).toEqual([]);
});

test('el explorador no desborda a 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/watershed');
  await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
