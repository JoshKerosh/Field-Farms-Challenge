import type {
  Farm,
  Watershed,
  WatershedMapData,
  WaterSource,
  WaterReading,
  RestorationAction,
  EnvironmentalIndicator,
  FieldAlert,
  FieldIncident,
  Organization,
  Provenance,
} from '@field-farms/domain';

const provenance: Provenance = {
  origin: 'demo',
  source: 'Ejemplo ficticio para explorar la aplicación',
  asOf: '2026-11-14',
};

export const farm: Farm = {
  id: 'demo-farm',
  name: 'Finca El Guayacán',
  district: 'Upala, Alajuela',
  activity: 'Ganadería de leche',
  areaHa: 12,
  animals: 18,
  paddocks: 8,
  watershedId: 'demo-watershed',
  organizationId: 'demo-asada',
  coordinates: [-85.023, 10.808],
  provenance,
};

export const watershed: Watershed = {
  id: 'demo-watershed',
  name: 'Río Zapote',
  basin: 'Cuenca del río Zapote',
  region: 'Huetar Norte',
  description:
    'Un ejemplo para explorar cómo una finca, una fuente y una ASADA pueden compartir información.',
  provenance,
};

export const watershedMapData: WatershedMapData = {
  outline: [
    [-85.055, 10.841],
    [-85.012, 10.84],
    [-84.992, 10.813],
    [-85.004, 10.775],
    [-85.041, 10.781],
    [-85.06, 10.811],
    [-85.055, 10.841],
  ],
  river: [
    [-85.043, 10.845],
    [-85.033, 10.826],
    [-85.027, 10.815],
    [-85.018, 10.809],
    [-85.015, 10.799],
    [-85.004, 10.785],
    [-85.001, 10.771],
  ],
};

export const organizations: Organization[] = [
  {
    id: 'demo-asada',
    name: 'ASADA de ejemplo',
    kind: 'asada',
    description:
      'Vista de un acueducto comunal. Organización ficticia, sin conexión con servicios reales.',
    provenance,
  },
  {
    id: 'demo-fluc',
    name: 'Red de ASADAS de ejemplo',
    kind: 'fluc',
    description: 'Ejemplo de coordinación entre acueductos de una región.',
    provenance,
  },
];

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

export const actions: RestorationAction[] = [
  {
    id: 'demo-action-water',
    farmId: farm.id,
    title: 'Proteger la naciente',
    description: 'Revisar con la ASADA dónde hacen falta cercas y protección del bosque.',
    status: 'planned',
    benefit: 'Cuidar la fuente de agua',
    provenance,
  },
  {
    id: 'demo-action-trees',
    farmId: farm.id,
    title: 'Sembrar cercas vivas',
    description: 'Identificar los tramos de cerca donde se pueden establecer árboles.',
    status: 'planned',
    benefit: 'Sombra y protección del suelo',
    provenance,
  },
  {
    id: 'demo-action-trough',
    farmId: farm.id,
    title: 'Ubicar bebederos fuera de la quebrada',
    description: 'Mantener un punto de agua para el ganado separado de la fuente.',
    status: 'done',
    benefit: 'Evitar el acceso directo del ganado al agua',
    provenance,
  },
];

export const indicators: EnvironmentalIndicator[] = [
  {
    id: 'demo-indicator-rain',
    title: 'Lluvia de la zona',
    value: 'Por conectar',
    description: 'La lluvia ayuda a interpretar el registro de la naciente.',
    provider: 'NASA POWER',
    provenance,
  },
  {
    id: 'demo-indicator-green',
    title: 'Estado de la vegetación',
    value: 'Por conectar',
    description: 'El verdor es una señal del paisaje; necesita interpretación local.',
    provider: 'NASA MODIS',
    provenance,
  },
  {
    id: 'demo-indicator-climate',
    title: 'Escenarios de clima',
    value: 'Por conectar',
    description: 'Comparar distintos escenarios ayudará a planificar las acciones.',
    provider: 'NOAA',
    provenance,
  },
];

export const alerts: FieldAlert[] = [
  {
    id: 'demo-alert-flow',
    watershedId: watershed.id,
    title: 'Ejemplo: el caudal va bajando',
    description:
      'En la serie ficticia, las últimas mediciones son menores que las primeras. Esto no es una alerta vigente.',
    nextStep: 'En una situación real, revisar las mediciones y coordinar con la ASADA.',
    provenance,
  },
];

export const incidents: FieldIncident[] = [
  {
    id: 'demo-incident',
    farmId: farm.id,
    sourceId: 'demo-spring',
    recordedAt: '2026-10-15',
    title: 'Bajó el caudal',
    note: 'Reporte ficticio para mostrar cómo se verá un evento de campo.',
    provenance,
  },
];
