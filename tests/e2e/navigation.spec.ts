import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('recorre las seis secciones y conserva el aviso demo', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'El agua se siembra', exact: true }),
  ).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Secciones principales' });
  const destinations = [
    ['Mi finca', 'Mi finca'],
    ['Mi cuenca', 'Mi cuenca'],
    ['Alertas', 'Alertas y eventos'],
    ['Cuidar', 'Cuidar la finca'],
    ['Registros', 'Registros'],
    ['Guía', 'El agua se siembra'],
  ];
  for (const [link, heading] of destinations) {
    await nav.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, level: 1, exact: true })).toBeVisible();
    await expect(page.locator('.demo-label')).toHaveText('Vista demo');
    await expect(page.locator('#page-title')).toBeFocused();
  }
});

test('integra los registros y distingue las vistas de rol de una sesión real', async ({ page }) => {
  await page.goto('/records');
  await page.getByRole('button', { name: 'ASADA', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tablero ASADA · ejemplo' })).toBeVisible();
  await expect(
    page.getByText('Este selector cambia la presentación. No inicia sesión ni concede permisos.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Acciones de la finca' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eventos de campo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar una medición' })).toBeDisabled();
});

test('muestra el ahorro pendiente y los apoyos con vigencia y fuente', async ({ page }) => {
  await page.goto('/benefits');
  await expect(page.getByRole('heading', { name: 'Aún no calculado' })).toBeVisible();
  const ganbos = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'GANBOS · convocatoria de pastoreo 2026' }) });
  await expect(ganbos.getByText('Convocatoria vencida')).toBeVisible();
  await expect(ganbos.getByText(/31 oct 2026/)).toBeVisible();
  await expect(ganbos.getByRole('link', { name: /Consultar fuente externa/ })).toHaveAttribute(
    'href',
    'https://www.ganbos-costarica.com/incentivospastoreo',
  );
  await page.getByRole('button', { name: 'Reconocimientos', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bandera Azul Ecológica Agropecuaria' }),
  ).toBeVisible();
  await expect(ganbos).toHaveCount(0);
});

test('ofrece respuestas predefinidas sin presentar una IA conectada', async ({ page }) => {
  await page.goto('/assistant');
  await page.getByRole('button', { name: '¿Cómo sé cuánto estoy ahorrando?' }).click();
  await expect(
    page.getByRole('heading', { name: '¿Cómo sé cuánto estoy ahorrando?' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Ayuda con respuestas predefinidas. No es un asistente de inteligencia artificial.',
    ),
  ).toBeVisible();
});

test('no recorta controles a 320 px ni al aumentar el texto', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  for (const route of ['/guide', '/farm', '/benefits', '/assistant', '/records']) {
    await page.goto(route);
    await expect(page.locator('#page-title')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.goto('/guide');
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await expect(page.getByRole('link', { name: 'Explorar mi finca', exact: true })).toBeVisible();
});

test('mantiene semántica y contraste en las vistas principales', async ({ page }) => {
  for (const route of ['/guide', '/records', '/benefits', '/assistant']) {
    await page.goto(route);
    await expect(page.locator('#page-title')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});

test('abre ambiente y fuentes desde los accesos secundarios', async ({ page }) => {
  await page.goto('/watershed');
  await expect(page.getByText('Administrada por: ASADA de ejemplo')).toHaveCount(2);
  await page.getByRole('link', { name: 'Consultar clima y satélite' }).click();
  await expect(page.getByRole('heading', { name: 'Clima y satélite', exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Esta base no descarga datos NASA ni muestra condiciones meteorológicas actuales.',
    ),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Conocer las fuentes' }).click();
  await expect(page.getByRole('heading', { name: 'De dónde salen los datos' })).toBeVisible();
});

test('consulta la base descargada sin conexión y recarga una ruta interna', async ({
  page,
  context,
}) => {
  await page.goto('/guide');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/benefits');
  await expect(page.getByRole('heading', { name: 'Beneficios para tu finca' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Aún no calculado' })).toBeVisible();
  await expect(
    page
      .locator('.connection-status:visible')
      .filter({ hasText: 'Sin conexión · estás consultando la demo' }),
  ).toBeVisible();
  await context.setOffline(false);
});
