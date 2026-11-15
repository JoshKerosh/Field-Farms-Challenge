import type { Dataset } from '../real/types';
import type { AlertsSummary } from './alerts';
import type { FlucSummary } from './fluc';
import type { PlaceContext } from './geo';
import type { WaterJourney, WatershedPlan, zoneFromAbove } from './watershed';

export type QuestionId =
  | 'inunda'
  | 'nino'
  | 'agua'
  | 'desliz'
  | 'caudal'
  | 'aliados'
  | 'hacer'
  | 'orilla'
  | 'unknown';

export const QUICK_QUESTIONS: { id: Exclude<QuestionId, 'unknown'>; label: string }[] = [
  { id: 'inunda', label: '¿Mi finca se inunda?' },
  { id: 'nino', label: '¿Qué hago con El Niño?' },
  { id: 'agua', label: '¿De dónde viene mi agua?' },
  { id: 'desliz', label: '¿Hay peligro de deslizamiento?' },
  { id: 'caudal', label: '¿Cómo mido el caudal?' },
  { id: 'aliados', label: '¿Quiénes son mis aliados?' },
  { id: 'hacer', label: '¿Qué puedo hacer por el agua?' },
  { id: 'orilla', label: '¿Dónde siembro árboles?' },
];

const KEYWORDS: [string, Exclude<QuestionId, 'unknown'>][] = [
  ['orill', 'orilla'],
  ['restaur', 'orilla'],
  ['reforest', 'orilla'],
  ['árbol', 'orilla'],
  ['arbol', 'orilla'],
  ['río', 'orilla'],
  ['rio ', 'orilla'],
  ['riverbank', 'orilla'],
  ['restor', 'orilla'],
  ['tree', 'orilla'],
  ['proteg', 'hacer'],
  ['protej', 'hacer'],
  ['cuid', 'hacer'],
  ['hacer', 'hacer'],
  ['ayud', 'hacer'],
  ['sembr', 'hacer'],
  ['inund', 'inunda'],
  ['lluv', 'inunda'],
  ['desliz', 'desliz'],
  ['ladera', 'desliz'],
  ['caudal', 'caudal'],
  ['medir', 'caudal'],
  ['balde', 'caudal'],
  ['aliad', 'aliados'],
  ['asada', 'aliados'],
  ['fluc', 'aliados'],
  ['niñ', 'nino'],
  ['nino', 'nino'],
  ['sequ', 'nino'],
  ['agua', 'agua'],
  ['naci', 'agua'],
  ['protect', 'hacer'],
  ['flood', 'inunda'],
  ['rain', 'inunda'],
  ['landslide', 'desliz'],
  ['slope', 'desliz'],
  ['flow', 'caudal'],
  ['measure', 'caudal'],
  ['all', 'aliados'],
  ['drought', 'nino'],
  ['water', 'agua'],
  ['spring', 'agua'],
];

export function matchQuestion(text: string): QuestionId {
  const lower = text.trim().toLowerCase();
  const hit = KEYWORDS.find(([kw]) => lower.includes(kw));
  return hit ? hit[1] : 'unknown';
}

export interface AssistantContext {
  ds: Dataset;
  ctx: PlaceContext;
  siteFloodsFlag: boolean;
  journey: WaterJourney;
  alerts: AlertsSummary;
  fluc: FlucSummary;
  plan: WatershedPlan;
  zoneAbove: ReturnType<typeof zoneFromAbove>;
}

export function answerQuestion(id: QuestionId, info: AssistantContext): string {
  const { ds, ctx, siteFloodsFlag, journey, alerts, fluc, plan, zoneAbove } = info;
  const steep = /^(VI|VII|VIII|AP)/.test(ctx.clsRaw);
  const oni = ds.climate.NASA.ONI.actual;

  switch (id) {
    case 'inunda':
      return siteFloodsFlag
        ? `Sí. Tu finca está en una zona que el mapa oficial marca como inundable. ${
            ctx.caribe ? 'Con El Niño, en el Caribe llueve más. ' : ''
          }Ten un potrero alto para el ganado y guarda la comida en alto.`
        : `Según el mapa oficial, tu finca no está en una zona inundable. ${
            ctx.caribe
              ? 'Aun así, en el Caribe El Niño trae más lluvia: limpia drenajes.'
              : 'Cuida los aguaceros fuertes: no dejes ganado cerca del río.'
          }`;
    case 'nino':
      return `El Niño está muy fuerte (+${oni.toFixed(1).replace('.', ',')}). ${alerts.face} Lo más importante para ti: ${alerts.top.recs[0]}`;
    case 'agua':
      return `El agua de tu zona sale de la fuente «${journey.src}», a ${journey.dist}. La administra la ASADA ${journey.op} y llega a ${journey.conn} conexiones. El ${journey.pct} % de las fuentes de tu subcuenca son agua subterránea: lo que cae en tu suelo llega a ellas.`;
    case 'desliz':
      return steep
        ? 'Tu finca es de ladera, así que hay riesgo de deslizamiento cuando llueve mucho. Siembra árboles en la pendiente y no la sobrecargues con ganado.'
        : 'Tu terreno no es de ladera fuerte, el riesgo de deslizamiento es bajo.';
    case 'caudal':
      return 'Es fácil: pon un balde bajo la salida de la naciente y cuenta cuántos segundos tarda en llenarse. Anota los litros del balde y los segundos en «Registros», y la app calcula el caudal. Hazlo una vez al mes.';
    case 'aliados':
      return fluc.has
        ? `Tus aliados son tu ASADA (${journey.op}) y las organizaciones de ASADAS de ${fluc.region}: ${fluc.list
            .filter((o) => !o.national)
            .slice(0, 3)
            .map((o) => o.name)
            .join('; ')}.`
        : `Tu aliado principal es tu ASADA, ${journey.op}.`;
    case 'hacer':
      return 'Tres acciones que ayudan mucho: cercar la naciente (100 m), sembrar árboles a la orilla de ríos y quebradas, y que el ganado no tome agua del río. El agua se siembra.';
    case 'orilla':
      return `${zoneAbove.t}. ${zoneAbove.d}${
        plan.rip.has
          ? ` En tu subcuenca faltan árboles en ${plan.rip.kmNo} km de orillas, y hay ${plan.rip.haUrg} ha para restaurar primero (mira «Mi cuenca»).`
          : ''
      } ${zoneAbove.verd}.`;
    default:
      return 'No entendí la pregunta. Prueba con una de las opciones de abajo.';
  }
}

export interface DataReference {
  n: number;
  title: string;
  detail: string;
  sourceLabel: string;
  kind: 'nasa' | 'local' | 'sim';
  color: string;
}

const RAW_REFS: [string, string, string, 'n' | 'l' | 's'][] = [
  [
    'NASA POWER · clima, temperatura y humedad del suelo',
    'NASA Langley Research Center, proyecto POWER (API v2, comunidad AG). Lluvia (PRECTOTCORR), temperaturas (T2M, T2M_MAX, T2M_MIN) y humedad del suelo en raíces (GWETROOT). Mensual 1991–2025 y diario 2026 hasta el 10 nov. Seis puntos de referencia, uno por zona. Consultado el 13 nov 2026.',
    'power.larc.nasa.gov',
    'n',
  ],
  [
    'NASA MODIS · verdor de la vegetación (NDVI)',
    'Didan, K. (2021). MOD13Q1 MODIS/Terra Vegetation Indices 16-Day L3 Global 250 m, versión 061. NASA LP DAAC. Obtenido con el servicio MODIS de ORNL DAAC. Imagen del 16 oct 2026 y promedio 2012–2025.',
    'doi.org/10.5067/MODIS/MOD13Q1.061 · modis.ornl.gov',
    'n',
  ],
  [
    'NOAA · índice RONI de El Niño',
    'NOAA Climate Prediction Center, Relative Oceanic Niño Index (RONI), índice oficial de El Niño desde el 1 de febrero de 2026. Valor de ago–oct 2026: +2,0 (provisional). Picos de los años de prueba: 1997-98 (+2,3), 2015-16 (+2,3), 2023-24 (+1,4) y La Niña 2010-11 (−1,6). Consultado el 13 nov 2026.',
    'cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni',
    'n',
  ],
  [
    'NOAA · perspectiva de El Niño',
    'Más de 83 % de probabilidad de El Niño fuerte hasta ene–mar 2027, según NOAA. Reportado por Infobae el 10 nov 2026.',
    'infobae.com (10 nov 2026)',
    'n',
  ],
  [
    'Fuentes y operadores de agua (ASADAS)',
    'Sistema SAGA: 1 334 entes operadores activos y 5 395 fuentes con ubicación, servicios abastecidos y último caudal. Datos al 11 nov 2026. Archivo del equipo: Operadores_y_Fuentes_Ubicaciones.xlsx.',
    'Archivo del equipo',
    'l',
  ],
  [
    'Cuencas y subcuencas de Costa Rica',
    'Capas cuencas_hidrograficas (34 cuencas) y Subcuencas_CRTM05 (1 868 subcuencas), proyección CRTM05. Archivos del equipo.',
    'Archivo del equipo',
    'l',
  ],
  [
    'Capacidad de uso de la tierra y zonas inundables',
    'Paquete RIESGOS.datosabiertos: capacidad de uso de la tierra (clases I a VIII y área protegida) y áreas con potencial de inundación. Archivos del equipo.',
    'Archivo del equipo',
    'l',
  ],
  [
    'Anomalía de lluvia por cantón, octubre 2026',
    'Porcentaje de lluvia frente a lo normal en octubre y de enero a octubre de 2026, para 84 cantones. Archivo del equipo: Anomalia_lluvia_cantonal_octubre2026.xlsx. Institución de origen por confirmar.',
    'Archivo del equipo',
    'l',
  ],
  [
    'Acciones de «Prepárate»',
    'Plan del MAG ante El Niño (35 acciones: heno, ensilaje, bancos forrajeros, cosecha de lluvia, protección de nacientes), reportado por La Nación el 25 set 2026, y buenas prácticas ganaderas generales.',
    'nacion.com (25 set 2026)',
    'l',
  ],
  [
    'Métodos de cálculo',
    'Evapotranspiración de referencia con el método de Hargreaves y Samani (1985), según FAO-56 (Allen et al., 1998). Coeficientes de cultivo y sensibilidad al agua orientativos, basados en FAO-56 y FAO-33. Consumo del ganado: 10 kg de materia seca por animal al día.',
    'fao.org/3/x0490s',
    'l',
  ],
  [
    'SIMULADO · GPM IMERG y SMAP',
    'Lluvia de 7 días y máxima en 24 h (GPM IMERG) y humedad superficial del suelo (SMAP) con valores de ejemplo, hasta conectar la cuenta de NASA Earthdata. Productos reales previstos: GPM_3IMERGHHE V07 (GES DISC) y SPL4SMGP (NSIDC).',
    'disc.gsfc.nasa.gov · nsidc.org/data/spl4smgp',
    's',
  ],
  [
    'Ley Forestal 7575 de Costa Rica, artículo 33',
    'Áreas de protección: 100 m alrededor de nacientes permanentes; 15 m (zona rural) o 10 m (urbana) a cada lado de ríos y quebradas en terreno plano, 50 m en terreno quebrado; 50 m alrededor de lagos y embalses; áreas de recarga de acuíferos.',
    'faolex.fao.org/docs/pdf/cos7778.pdf',
    'l',
  ],
  [
    'AyA · Registro de FLUC',
    'Federaciones, Ligas, Uniones y Confederaciones de ASADAS inscritas, en trámite y rechazadas, con su región y número de ASADAS. Archivo del equipo: DOC-20261021-WA0172.xlsx (21 oct 2026).',
    'Archivo del equipo',
    'l',
  ],
  [
    'SIMULADO · fincas, vecinos y modo demo',
    'Los 3 perfiles de finca, las 40 fincas de cada subcuenca y los eventos del modo demostración son de ejemplo, para mostrar cómo funciona la app.',
    'Generado para el prototipo',
    's',
  ],
  [
    'IGN · ríos, bosque y potreros 1:5 000 (2017)',
    'Instituto Geográfico Nacional, capas hidrografia_5000, forestal2017_5k y pastos2017_5k del SNIT (servicio WMS oficial), descargadas el 14 nov 2026. Para cada tramo de río se mide si hay bosque en la franja de unos 15 m a cada lado; resumen cada 500 m y cada 1,5 km. En total, unos 51 000 km de ríos y quebradas: 67 % de sus orillas con bosque y 19 % en potrero.',
    'snitcr.go.cr · geos.snitcr.go.cr/be/IGN_5/wms',
    'l',
  ],
  [
    'NASA MODIS · verdor mensual (NDVI) para todo el país',
    'NASA MODIS/Terra Vegetation Indices Monthly L3 Global 1 km (MOD13A3, versión 061), vía el servicio NASA GIBS. Promedio de nov 2025 a oct 2026 frente al promedio de 2016–2020 (72 imágenes), cada 1,5 km. Una baja de 0,03 o más se marca como verdor que baja.',
    'doi.org/10.5067/MODIS/MOD13A3.061 · gibs.earthdata.nasa.gov',
    'n',
  ],
];

export const REFERENCES: DataReference[] = RAW_REFS.map(([title, detail, sourceLabel, flag], i) => ({
  n: i + 1,
  title,
  detail,
  sourceLabel,
  kind: flag === 'n' ? 'nasa' : flag === 'l' ? 'local' : 'sim',
  color: flag === 'n' ? '#17617C' : flag === 'l' ? '#2E7A43' : '#9C5F1C',
}));
