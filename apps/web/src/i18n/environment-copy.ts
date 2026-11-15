const es = {
  title: 'Clima y satélite',
  intro:
    'Datos publicados para la zona de referencia de tu finca. Consulta su fecha antes de tomar decisiones.',
  locateTitle: 'Primero ubica tu finca',
  locateHelp: 'Selecciona tu finca en el mapa para consultar la zona que le corresponde.',
  locate: 'Ubicar mi finca',
  farm: 'Finca seleccionada',
  regional: 'Cobertura regional',
  coverage:
    'Estos valores representan un punto de referencia de la zona; no son mediciones dentro de tu finca ni un pronóstico diario.',
  unknownRegion:
    'No pudimos determinar la zona de referencia para esta ubicación. Vuelve a ubicar tu finca.',
  reference: 'Punto de referencia',
  distance: 'Distancia aproximada a tu finca',
  loading: 'Cargando datos publicados…',
  unavailable: 'Sin datos disponibles',
  retry: 'Volver a consultar',
  source: 'Fuente',
  observed: 'Fecha del dato',
  downloaded: 'Publicado en el archivo',
  age: 'Días desde el dato',
  lastGood:
    'La fuente informa una falla de actualización. Se muestra el último archivo disponible con su fecha original.',
  failed:
    'No se pudo cargar un archivo real válido de esta fuente. No se sustituyó por datos de ejemplo.',
  noUnit: 'El archivo no contiene datos para la zona de esta finca.',
  meaning: 'Qué significa para tu finca',
  wetter:
    'La referencia regional registra más lluvia que el promedio de 1991–2020 para ese periodo. Revisa cómo están los drenajes y las fuentes en tu finca; este dato no confirma una inundación.',
  drier:
    'La referencia regional registra menos lluvia que el promedio de 1991–2020 para ese periodo. Revisa tus reservas y lleva un registro del caudal; este dato no confirma una sequía en tu finca.',
  usualRain:
    'La lluvia de la referencia regional coincide con su promedio de 1991–2020 para ese periodo. Continúa observando tus fuentes de agua.',
  noComparison:
    'No hay una comparación de lluvia válida para este periodo. Los demás valores disponibles se muestran por separado.',
  rain30: 'Lluvia acumulada · 30 días',
  rain7: 'Lluvia acumulada · 7 días',
  rainAnomaly: 'Diferencia de lluvia frente a 1991–2020',
  normalRain: 'Lluvia de referencia para esos 30 días',
  temperature: 'Promedio de máximas diarias · 30 días',
  temperatureHelp:
    'Es el promedio de las temperaturas máximas del periodo, no la temperatura de hoy.',
  soil: 'Humedad en la zona de raíces · 30 días',
  soilHelp:
    'Índice regional de 0 (seco) a 1 (saturado). No es el porcentaje de agua medido en el suelo de tu finca.',
  soilAnomaly: 'Diferencia frente a la humedad habitual',
  rainHistory: 'Cómo ha cambiado la lluvia',
  history: 'Observaciones disponibles',
  table: 'Ver fechas y valores',
  date: 'Fecha',
  value: 'Valor',
  noHistory: 'No hay observaciones disponibles para esta serie.',
  satellite: 'Vegetación observada por satélite',
  satelliteHelp:
    'MODIS resume el verdor alrededor del punto de referencia (aproximadamente 2 km). No es una imagen ni una medición de cada potrero.',
  ndvi: 'Verdor de la vegetación · NDVI',
  ndviNormal: 'Verdor histórico para esa fecha',
  ndviDifference: 'Diferencia frente al verdor histórico',
  lessGreen:
    'El punto de referencia muestra menos verdor que su promedio histórico. Revisa el estado del pasto en campo; el índice por sí solo no determina la causa.',
  moreGreen:
    'El punto de referencia muestra más verdor que su promedio histórico. Compáralo con tus observaciones del pasto; no mide directamente su cantidad o calidad.',
  sameGreen: 'El verdor del punto de referencia coincide con su promedio histórico.',
  noGreenComparison:
    'No hay una referencia histórica suficiente para interpretar este valor de verdor.',
  noModis:
    'El archivo numérico nuevo de MODIS aún no está publicado. El histórico regional y las imágenes NASA GIBS se consultan en el visor de arriba.',
  enso: 'Contexto climático · El Niño / La Niña',
  ensoCoverage:
    'Pacífico ecuatorial · región Niño 3.4. Es un indicador climático de gran escala, no un pronóstico para tu finca.',
  ensoHelp:
    'Valor del trimestre móvil publicado; los valores recientes pueden ser provisionales. Una sola lectura no confirma un episodio ni predice la lluvia local.',
  nino: 'Señal cálida compatible con El Niño',
  nina: 'Señal fría compatible con La Niña',
  neutral: 'Señal neutral',
  simulatedPending:
    'El visor muestra imágenes reales IMERG y SMAP de NASA GIBS. Los ejemplos simulados no se usan para los indicadores regionales.',
  realDespiteDemo:
    'Esta pantalla muestra observaciones reales publicadas; el modo de simulación de la app no modifica estos valores.',
  zones: {
    N: 'Zona Norte',
    C: 'Caribe',
    S: 'Pacífico Norte',
    M: 'Pacífico Central',
    U: 'Pacífico Sur',
    V: 'Valle Central',
  },
};

const en: typeof es = {
  title: 'Weather and satellite',
  intro:
    'Published observations for your farm’s reference area. Check their dates before making decisions.',
  locateTitle: 'Locate your farm first',
  locateHelp: 'Select your farm on the map to find its reference area.',
  locate: 'Locate my farm',
  farm: 'Selected farm',
  regional: 'Regional coverage',
  coverage:
    'These values represent a reference point in the region. They are not measurements inside your farm or a daily forecast.',
  unknownRegion:
    'We could not identify a reference area for this location. Locate your farm again.',
  reference: 'Reference point',
  distance: 'Approximate distance to your farm',
  loading: 'Loading published observations…',
  unavailable: 'No data available',
  retry: 'Check again',
  source: 'Source',
  observed: 'Observation date',
  downloaded: 'File publication date',
  age: 'Days since observation',
  lastGood:
    'The source reports an update failure. The last available file is shown with its original observation date.',
  failed:
    'A valid real data file could not be loaded from this source. No example data was substituted.',
  noUnit: 'This file has no observations for your farm’s reference area.',
  meaning: 'What this means for your farm',
  wetter:
    'The regional reference recorded more rain than the 1991–2020 average for this period. Check drainage and water sources on your farm; this does not confirm flooding.',
  drier:
    'The regional reference recorded less rain than the 1991–2020 average for this period. Check water reserves and record flow measurements; this does not confirm drought on your farm.',
  usualRain:
    'Rainfall at the regional reference matches its 1991–2020 average for this period. Continue observing your water sources.',
  noComparison:
    'There is no valid rainfall comparison for this period. Other available values are shown separately.',
  rain30: 'Accumulated rainfall · 30 days',
  rain7: 'Accumulated rainfall · 7 days',
  rainAnomaly: 'Rainfall difference from 1991–2020',
  normalRain: 'Reference rainfall for those 30 days',
  temperature: 'Average daily maximum temperature · 30 days',
  temperatureHelp:
    'This averages daily maximum temperatures over the period; it is not today’s temperature.',
  soil: 'Root zone soil wetness · 30 days',
  soilHelp:
    'Regional index from 0 (dry) to 1 (saturated). It is not a measured percentage of water in your farm’s soil.',
  soilAnomaly: 'Difference from usual soil wetness',
  rainHistory: 'How rainfall has changed',
  history: 'Available observations',
  table: 'View dates and values',
  date: 'Date',
  value: 'Value',
  noHistory: 'No observations are available for this series.',
  satellite: 'Vegetation observed by satellite',
  satelliteHelp:
    'MODIS summarizes greenness around the reference point (approximately 2 km). It is not an image or a measurement of each paddock.',
  ndvi: 'Vegetation greenness · NDVI',
  ndviNormal: 'Historical greenness for that date',
  ndviDifference: 'Difference from historical greenness',
  lessGreen:
    'The reference point is less green than its historical average. Check pasture conditions in the field; the index alone does not identify the cause.',
  moreGreen:
    'The reference point is greener than its historical average. Compare it with field observations; it does not directly measure pasture quantity or quality.',
  sameGreen: 'Greenness at the reference point matches its historical average.',
  noGreenComparison:
    'There is not enough historical reference data to interpret this greenness value.',
  noModis:
    'The new numeric MODIS file is not published yet. The regional archive and NASA GIBS imagery are available in the viewer above.',
  enso: 'Climate context · El Niño / La Niña',
  ensoCoverage:
    'Equatorial Pacific · Niño 3.4 region. This is a large scale climate indicator, not a forecast for your farm.',
  ensoHelp:
    'Published rolling three month value; recent values may be provisional. A single reading does not confirm an episode or predict local rainfall.',
  nino: 'Warm signal consistent with El Niño',
  nina: 'Cold signal consistent with La Niña',
  neutral: 'Neutral signal',
  simulatedPending:
    'The viewer displays real IMERG and SMAP imagery from NASA GIBS. Simulated examples are not used for regional indicators.',
  realDespiteDemo:
    'This page shows real published observations. The app’s simulation mode does not change these values.',
  zones: {
    N: 'Northern region',
    C: 'Caribbean',
    S: 'North Pacific',
    M: 'Central Pacific',
    U: 'South Pacific',
    V: 'Central Valley',
  },
};

export const environmentCopy = { es, en };
