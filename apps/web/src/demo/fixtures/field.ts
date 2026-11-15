import type {
  EnvironmentalIndicator,
  Farm,
  FieldAlert,
  FieldIncident,
  Organization,
  Provenance,
  RestorationAction,
  WaterReading,
  Watershed,
  WaterSource,
} from '@field-farms/domain';
import { localizedResource, message } from '../../i18n/messages';
const provenance: Provenance = {
  origin: 'demo',
  source: 'Ejemplo ficticio para explorar la aplicación',
  asOf: '2026-11-14',
};
export const farm: Farm = localizedResource(() => ({
  id: 'demo-farm',
  name: 'Finca El Guayacán',
  district: message('meaf581a401ae'),
  activity: message('mf776712dacee'),
  areaHa: 12,
  animals: 18,
  paddocks: 8,
  watershedId: 'demo-watershed',
  organizationId: 'demo-asada',
  coordinates: [-85.023, 10.808],
  provenance,
}));
export const watershed: Watershed = localizedResource(() => ({
  id: 'demo-watershed',
  name: 'Río Zapote',
  basin: message('mc381e004528d'),
  region: message('m0ece0eaa335a'),
  description: message('me2181e42c81e'),
  provenance,
}));
export const organizations: Organization[] = localizedResource(() => [
  {
    id: 'demo-asada',
    name: 'ASADA de ejemplo',
    kind: 'asada',
    description: message('m135f3a23e5ce'),
    provenance,
  },
  {
    id: 'demo-fluc',
    name: 'Red de ASADAS de ejemplo',
    kind: 'fluc',
    description: message('ma1eacecb54d3'),
    provenance,
  },
]);
export const sources: WaterSource[] = [
  {
    id: 'demo-spring',
    name: 'Naciente de ejemplo',
    kind: 'spring',
    watershedId: watershed.id,
    organizationId: 'demo-asada',
    coordinates: [-85.035, 10.824],
    provenance,
  },
  {
    id: 'demo-well',
    name: 'Pozo de ejemplo',
    kind: 'well',
    watershedId: watershed.id,
    organizationId: 'demo-asada',
    coordinates: [-85.008, 10.794],
    provenance,
  },
];
export const readings: WaterReading[] = [
  ...[8.4, 7.9, 7.1, 6.6].map((value, index): WaterReading => ({
    id: `demo-flow-${index}`,
    sourceId: 'demo-spring',
    farmId: farm.id,
    recordedAt: `2026-${String(index + 7).padStart(2, '0')}-15`,
    kind: 'flow',
    value,
    unit: 'L/s',
    provenance,
  })),
  {
    id: 'demo-rain',
    sourceId: 'demo-spring',
    farmId: farm.id,
    recordedAt: '2026-10-15',
    kind: 'rain',
    value: 24,
    unit: 'mm',
    provenance,
  },
];
export const actions: RestorationAction[] = localizedResource(() => [
  {
    id: 'demo-action-water',
    farmId: farm.id,
    title: message('m60414a7c0d35'),
    description: message('mc32ba744fb94'),
    status: 'planned',
    benefit: message('md6846a0de323'),
    provenance,
  },
  {
    id: 'demo-action-trees',
    farmId: farm.id,
    title: message('m9c59adbf44ef'),
    description: message('mf12ba94bccb4'),
    status: 'planned',
    benefit: message('m20974e05add6'),
    provenance,
  },
  {
    id: 'demo-action-trough',
    farmId: farm.id,
    title: message('m769dfdac44b5'),
    description: message('m7ef1191dac3d'),
    status: 'done',
    benefit: message('mc23d82fd0c5b'),
    provenance,
  },
]);
export const indicators: EnvironmentalIndicator[] = localizedResource(() => [
  {
    id: 'demo-indicator-rain',
    title: message('m879d349968e9'),
    value: 'Por conectar',
    description: message('m6739d190925c'),
    provider: message('mf54c4313c0e8'),
    provenance,
  },
  {
    id: 'demo-indicator-green',
    title: message('m45a30081b7a6'),
    value: 'Por conectar',
    description: message('m19876f9291b4'),
    provider: message('m4e504bd5a9c5'),
    provenance,
  },
  {
    id: 'demo-indicator-climate',
    title: message('m844dfce70e4d'),
    value: 'Por conectar',
    description: message('md7581ad9bf9e'),
    provider: 'NOAA',
    provenance,
  },
]);
export const alerts: FieldAlert[] = localizedResource(() => [
  {
    id: 'demo-alert-flow',
    watershedId: watershed.id,
    title: message('m2924152aeb94'),
    description: message('mb161fff611ab'),
    nextStep: message('m8dca09ed26e7'),
    provenance,
  },
]);
export const incidents: FieldIncident[] = localizedResource(() => [
  {
    id: 'demo-incident',
    farmId: farm.id,
    sourceId: 'demo-spring',
    recordedAt: '2026-10-15',
    title: message('ma22c98003c9b'),
    note: message('m3b4232b6c50e'),
    provenance,
  },
]);
