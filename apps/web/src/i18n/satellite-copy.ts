const es = {
  eyebrow: 'OBSERVATORIO DE TU FINCA',
  title: 'Tu territorio, desde otra perspectiva.',
  intro:
    'Explora relieve, agua, clima y vegetación con históricos regionales e imágenes satelitales.',
  explorer: 'Explorador satelital',
  basinView: 'Mi subcuenca',
  imageryView: 'Imágenes satelitales',
  basinTitle: 'El verdor de tu cuenca, en el tiempo',
  archived: 'Histórico regional · 2026',
  frame: 'Observación',
  historical: 'Promedio histórico de esta fecha',
  noHistorical: 'Sin referencia histórica para esta fecha',
  basinNote:
    'Histórico NDVI regional procesado. La cuadrícula es una representación espacial ilustrativa. Abre Imágenes satelitales para explorar los píxeles reales de NASA.',
  lessGreen: 'Menos verdor que la referencia histórica',
  moreGreen: 'Más verdor que la referencia histórica',
  sameGreen: 'Verdor similar a la referencia histórica',
  zoomIn: 'Acercar subcuenca',
  zoomOut: 'Alejar subcuenca',
  map: 'Mapa satelital interactivo de clima y territorio',
  themes: 'Elige qué quieres explorar',
  country: 'Vista país',
  focus: 'Acercar a mi finca',
  fullscreen: 'Pantalla completa',
  flat: 'Vista 2D',
  relief: 'Relieve 3D',
  opacity: 'Intensidad de la capa',
  smooth: 'Suavizar bordes',
  fitScale: 'Ajustar escala',
  noObservation:
    'Sin observación para esta zona y fecha. Prueba otra fecha; las nubes o la falta de cobertura pueden dejar la imagen transparente.',
  archiveSourceNote:
    'MODIS: el histórico regional está disponible en Mi subcuenca y las imágenes geográficas en Imágenes satelitales, cada una con su fecha.',
  compare: 'Ver imagen base',
  compareAltitude: 'Vegetación ↔ Altitud',
  showLayer: 'Mostrar capa',
  date: 'Fecha de la imagen',
  latest: 'Última disponible',
  play: 'Reproducir fechas',
  pause: 'Pausar',
  loading: 'Cargando imágenes…',
  connecting: 'Consultando catálogo NASA…',
  ready: 'Imágenes cargadas',
  error: 'No se pudieron cargar algunas imágenes. La imagen base sigue disponible.',
  catalogError:
    'No pudimos consultar las fechas de NASA. Puedes explorar el satélite y el relieve o volver a intentar.',
  retry: 'Reintentar NASA',
  noImage: 'Esta capa no tiene fechas disponibles en el catálogo.',
  resolution: 'Resolución de referencia',
  legend: 'Leyenda oficial',
  mosaic: 'Mosaico · fechas variables',
  staticTerrain: 'Elevación · mosaico de varias fuentes',
  terrainResolution: 'DEM · resolución variable',
  imageryResolution: 'Imágenes de referencia',
  altitude: 'Altitud aproximada en el centro del mapa',
  meters: 'm s. n. m.',
  noWebgl:
    'Tu dispositivo no pudo iniciar el mapa interactivo. Los datos y sus fuentes siguen disponibles abajo.',
  coverage:
    'Los colores corresponden a la resolución de cada producto. Las áreas transparentes pueden indicar nubes, agua o ausencia de datos.',
  parcel: 'Tu finca',
  basin: 'Límite de cuenca',
  observations: 'Datos y fuentes de mi zona',
  observationsHelp: 'Consulta los valores regionales, las fechas, los históricos y su procedencia.',
  summary: 'Una mirada a tu zona',
  summaryNote:
    'NASA POWER · datos del punto de referencia de la zona, no mediciones dentro de la finca.',
  nasaLink: 'Abrir en NASA Worldview',
  exploreWithoutFarm:
    'Explora Costa Rica o ubica tu finca para centrar el mapa y ver sus datos regionales.',
  satellite: {
    label: 'Satélite',
    title: 'El territorio en color real',
    description:
      'Reconoce bosques, ríos y potreros en el mosaico de Esri. Las imágenes pueden corresponder a fechas distintas.',
  },
  terrain: {
    label: 'Altura · 3D',
    title: 'El agua sigue el relieve',
    description:
      'Mapa de calor por altitud real: cada color corresponde a metros sobre el nivel del mar. Terrain Tiles aporta las elevaciones; el relieve 3D se amplifica 1,3 veces.',
  },
  vegetation: {
    label: 'Verdor',
    title: 'La vegetación, vista desde el espacio',
    description:
      'NDVI de Terra/MODIS: compuesto móvil de 8 días. Consulta la escala para comparar el verdor; no es una medición directa del pasto.',
  },
  rain: {
    label: 'Lluvia',
    title: 'Dónde se concentra la lluvia',
    description:
      'IMERG muestra la tasa media diaria de precipitación en mm/h. Es diferente al acumulado regional de 30 días de POWER.',
  },
  heat: {
    label: 'Temperatura',
    title: 'El calor de la superficie',
    description:
      'Temperatura diurna de la superficie, compuesta en ocho días para reducir vacíos por nubes. La fecha indica el inicio del periodo; la leyenda usa kelvin, no temperatura del aire.',
  },
  moisture: {
    label: 'Agua en suelo',
    title: 'El agua cerca de la superficie',
    description:
      'SMAP L4 estima humedad volumétrica en los primeros 5 cm, en m³/m³. Un píxel representa unos 9 km, no una parcela.',
  },
  dryness: {
    label: 'Sequedad',
    title: 'La humedad que llega a las raíces',
    description:
      'SMAP L4 estima humedad en la zona de raíces (0–100 cm). Los valores bajos señalan suelo más seco; no confirman por sí solos una sequía.',
  },
};

const en: typeof es = {
  eyebrow: 'YOUR FARM OBSERVATORY',
  title: 'Your land. A new perspective.',
  intro:
    'Explore terrain, water, weather and vegetation with regional histories and satellite imagery.',
  explorer: 'Satellite explorer',
  basinView: 'My subwatershed',
  imageryView: 'Satellite imagery',
  basinTitle: 'Your watershed’s greenness, through time',
  archived: 'Regional history · 2026',
  frame: 'Observation',
  historical: 'Historical average for this date',
  noHistorical: 'No historical reference for this date',
  basinNote:
    'Processed regional NDVI archive. The grid is an illustrative spatial representation. Open Satellite imagery to explore NASA’s actual pixels.',
  lessGreen: 'Less green than the historical reference',
  moreGreen: 'Greener than the historical reference',
  sameGreen: 'Greenness similar to the historical reference',
  zoomIn: 'Zoom in on subwatershed',
  zoomOut: 'Zoom out of subwatershed',
  map: 'Interactive satellite map of weather and terrain',
  themes: 'Choose what to explore',
  country: 'Country view',
  focus: 'Zoom to my farm',
  fullscreen: 'Full screen',
  flat: '2D view',
  relief: '3D terrain',
  opacity: 'Layer intensity',
  smooth: 'Smooth edges',
  fitScale: 'Fit product scale',
  noObservation:
    'No observation for this area and date. Try another date; clouds or missing coverage can leave the image transparent.',
  archiveSourceNote:
    'MODIS: regional history is available under My subwatershed and geographic images under Satellite imagery, each with its own date.',
  compare: 'View base imagery',
  compareAltitude: 'Vegetation ↔ Elevation',
  showLayer: 'Show layer',
  date: 'Imagery date',
  latest: 'Latest available',
  play: 'Play dates',
  pause: 'Pause',
  loading: 'Loading imagery…',
  connecting: 'Checking NASA catalog…',
  ready: 'Imagery loaded',
  error: 'Some imagery could not load. Base imagery remains available.',
  catalogError:
    'NASA dates could not be retrieved. Explore the satellite and terrain views or try again.',
  retry: 'Retry NASA',
  noImage: 'The catalog has no available dates for this layer.',
  resolution: 'Reference resolution',
  legend: 'Official legend',
  mosaic: 'Mosaic · varying acquisition dates',
  staticTerrain: 'Elevation · multiple source mosaic',
  terrainResolution: 'DEM · varying resolution',
  imageryResolution: 'Reference imagery',
  altitude: 'Approximate elevation at map center',
  meters: 'm above sea level',
  noWebgl:
    'Your device could not start the interactive map. Observations and sources remain available below.',
  coverage:
    'Colors follow each product’s resolution. Transparent areas may indicate clouds, water or missing data.',
  parcel: 'Your farm',
  basin: 'Watershed boundary',
  observations: 'Regional observations and sources',
  observationsHelp: 'Explore regional values, observation dates, history and provenance.',
  summary: 'A snapshot of your region',
  summaryNote:
    'NASA POWER · observations for the regional reference point, not measurements inside the farm.',
  nasaLink: 'Open in NASA Worldview',
  exploreWithoutFarm:
    'Explore Costa Rica or locate your farm to center the map and see regional observations.',
  satellite: {
    label: 'Satellite',
    title: 'Your land in true color',
    description:
      'Explore forests, rivers and paddocks in Esri’s imagery mosaic. Images may have different acquisition dates.',
  },
  terrain: {
    label: 'Elevation · 3D',
    title: 'Water follows the terrain',
    description:
      'Real elevation heatmap: colors represent meters above sea level. Elevations come from Terrain Tiles; 3D relief is exaggerated by 1.3.',
  },
  vegetation: {
    label: 'Greenness',
    title: 'Vegetation, seen from space',
    description:
      'Terra/MODIS NDVI: a rolling 8 day composite. Read the scale to compare greenness; this does not directly measure pasture.',
  },
  rain: {
    label: 'Rainfall',
    title: 'Where rainfall concentrates',
    description:
      'IMERG shows the daily mean precipitation rate in mm/h. This differs from POWER’s regional 30 day rainfall accumulation.',
  },
  heat: {
    label: 'Temperature',
    title: 'Heat at the surface',
    description:
      'Daytime land surface temperature, composited over eight days to reduce cloud gaps. The date marks the period’s start; the legend uses kelvin, not air temperature.',
  },
  moisture: {
    label: 'Soil water',
    title: 'Water near the surface',
    description:
      'SMAP L4 estimates volumetric moisture in the top 5 cm, in m³/m³. Each pixel represents about 9 km, not a parcel.',
  },
  dryness: {
    label: 'Dryness',
    title: 'Moisture reaching the roots',
    description:
      'SMAP L4 estimates root zone moisture (0–100 cm). Lower values indicate drier soil; they do not establish drought on their own.',
  },
};

export const satelliteCopy = { es, en };
