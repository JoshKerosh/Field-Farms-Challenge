import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.use({ locale: 'es-CR' });
test.setTimeout(60000);

test('muestra las secciones en inglés y mantiene accesible la configuración en una esquina', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language: 'en', theme: 'light' })),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of [
    '/guide',
    '/farm',
    '/watershed',
    '/alerts',
    '/care',
    '/records',
    '/environment',
    '/benefits',
    '/assistant',
    '/sources',
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page-title')).toBeVisible();
    await expect(page.locator('#page-title')).not.toContainText(
      /Mi finca|Subcuenca|Alertas|Registros|Plan de recuperación|Fuentes de/,
    );
  }
  await page.goto('/farm', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fm-name')).toBeVisible();
  await page.screenshot({ path: `output/farm-${test.info().project.name}.png`, fullPage: true });
  const settings = await page.locator('.settings-trigger').boundingBox();
  expect(settings).not.toBeNull();
  expect(settings!.x + settings!.width).toBeGreaterThan(page.viewportSize()!.width - 60);
  expect(errors).toEqual([]);
});

test('Mi finca conserva los datos al cambiar de idioma y elimina los perfiles simulados', async ({
  page,
}) => {
  await page.goto('/farm', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#fm-name')).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Lechería pequeña' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Paso \d/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mapa del país' })).toHaveCount(0);
  await page.locator('#fm-name').fill('Finca de prueba');
  await page.locator('#fm-ha').fill('18');
  await page.getByRole('button', { name: 'Idioma y tema' }).click();
  await page.getByRole('radio', { name: 'English' }).check();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#fm-name')).toHaveValue('Finca de prueba');
  await expect(page.locator('#fm-ha')).toHaveValue('18');
  await expect(page.getByRole('button', { name: 'Confirm my farm' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My farm', exact: true })).toBeVisible();
});

test('cambia idioma y tema, conserva preferencias y devuelve el foco', async ({ page }) => {
  await page.goto('/guide', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#page-title')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Idioma y tema' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'English' }).check();
  await dialog.getByRole('radio', { name: 'Dark' }).check();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Language and theme' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  await page.getByRole('button', { name: 'Language and theme' }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

for (const language of ['es', 'en']) {
  for (const theme of ['light', 'dark']) {
    test(`preferencias accesibles: ${language}, ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ({ language, theme }) => {
          localStorage.setItem('ffc.preferences.v1', JSON.stringify({ language, theme }));
        },
        { language, theme },
      );
      await page.setViewportSize({ width: 320, height: 760 });
      await page.goto('/guide', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#page-title')).toBeVisible({ timeout: 30000 });
      await page
        .getByRole('button', { name: language === 'es' ? 'Idioma y tema' : 'Language and theme' })
        .click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations).toEqual([]);
    });
  }
}
