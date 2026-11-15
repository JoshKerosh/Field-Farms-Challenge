import { localizedResource, message } from '../../i18n/messages';
export const demoScenario = localizedResource(
  () =>
    ({
      id: 'watershed-care',
      name: 'Una finca y su comunidad',
      referenceDate: '2026-11-14',
      description: message('m0926c2db2653'),
    }) as const,
);
