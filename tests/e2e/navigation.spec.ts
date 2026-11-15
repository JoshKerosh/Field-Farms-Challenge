import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.setTimeout(60000);

test('recorre las seis secciones principales con datos reales y foco accesible', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Guía de uso', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Secciones principales' });
  const destinations: [string, RegExp][] = [
    ['Mi finca', /^Mi finca$/],
    ['Mi cuenca', /Subcuenca/],
    ['Alertas', /Alertas: las dos caras de El Niño/],
    ['Cuidar', /Cuidar el agua y los potreros/],
    ['Registros', /Registros del agua y monitoreo/],
    ['Guía', /Guía de uso/],
  ];
  for (const [link, heading] of destinations) {
    await nav.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    if (link !== 'Mi finca')
      await expect(page.locator('.demo-label')).toContainText('Fuentes de datos');
    await expect(page.locator('#page-title')).toBeFocused();
  }
});

test('integra los registros de caudal, cambia roles y carga ejemplos de 5 meses', async ({
  page,
}) => {
  await page.goto('/records', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /ASADA/ }).click();
  await expect(page.getByRole('heading', { name: /Tablero de la ASADA/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cargar 5 meses de ejemplo' }).click();
  await expect(page.getByRole('heading', { name: /Historial guardado/ })).toContainText('(7)');
  await page.getByRole('button', { name: /Institución/ }).click();
  await expect(page.getByRole('heading', { name: /Vista institucional/ })).toBeVisible();
});

test('muestra avance en finca y catálogo de beneficios con vigencia y fuente', async ({ page }) => {
  await page.goto('/benefits', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Empieza a documentar acciones/ })).toBeVisible();
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

test('el asistente responde preguntas rápidas usando el contexto real de la finca', async ({
  page,
}) => {
  await page.goto('/assistant', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Asistente del agua' })).toBeVisible();
  await page.getByRole('button', { name: '¿De dónde viene mi agua?' }).click();
  await expect(page.getByText(/El agua de tu zona sale de la fuente/)).toBeVisible();
});

test('no recorta controles a 320 px ni al aumentar el texto al 200 %', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  for (const route of [
    '/guide',
    '/farm',
    '/watershed',
    '/care',
    '/alerts',
    '/records',
    '/environment',
    '/benefits',
    '/assistant',
    '/sources',
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page-title')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.goto('/guide', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await expect(page.getByRole('link', { name: /Ubicar mi finca/ })).toBeVisible();
});

test('mantiene semántica y contraste WCAG 2.2 AA en todas las vistas', async ({ page }) => {
  for (const route of [
    '/guide',
    '/farm',
    '/watershed',
    '/care',
    '/alerts',
    '/records',
    '/environment',
    '/benefits',
    '/assistant',
    '/sources',
  ]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page-title')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});

test('abre satélite y fuentes y simula eventos extremos', async ({ page }) => {
  await page.goto('/environment', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Satélite y clima en tu subcuenca' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sequía extrema' }).click();
  await expect(page.locator('.demo-label')).toContainText('Simulación: Sequía extrema');
  await page.getByRole('button', { name: 'Salir de la simulación' }).click();
  await expect(page.locator('.demo-label')).toContainText('Fuentes de datos');

  await page.getByRole('link', { name: 'Fuentes de los datos' }).first().click();
  await expect(page.getByRole('heading', { name: 'Fuentes de los datos' })).toBeVisible();
});

test('consulta la base descargada sin conexión y recarga una ruta interna', async ({
  page,
  context,
}) => {
  await page.goto('/guide', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/watershed', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Subcuenca/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Subcuenca/ })).toBeVisible();
  await expect(
    page.locator('.connection-status:visible').filter({ hasText: 'Sin conexión' }),
  ).toBeVisible();
  await context.setOffline(false);
});
