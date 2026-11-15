import type { Page } from '@playwright/test';

/** Explicit test input; the app itself must continue to start without a sample farm. */
export async function registerTestFarm(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ffc.v10.farm',
      JSON.stringify({
        version: 2,
        key: 'mia',
        my: {
          name: 'Finca de pruebas del equipo',
          act: 'carne',
          agua: 'pozo',
          ha: 24,
          cult: 6,
          animals: 15,
          ench: 'no',
        },
      }),
    );
    localStorage.setItem(
      'ffc.v10.farmSite',
      JSON.stringify({ lat: 10.8, lng: -85.08, accuracyM: 15, parcel: null }),
    );
  });
}
