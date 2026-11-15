import { localizedResource, message } from '../../i18n/messages';
import type { Dataset } from '../real/types';
import type { AlertsSummary } from './alerts';
import type { FlucSummary } from './fluc';
import type { PlaceContext } from './geo';
import type { WaterJourney, WatershedPlan, zoneFromAbove } from './watershed';
export type QuestionId =
  'inunda' | 'nino' | 'agua' | 'desliz' | 'caudal' | 'aliados' | 'hacer' | 'orilla' | 'unknown';
export const QUICK_QUESTIONS: {
  id: Exclude<QuestionId, 'unknown'>;
  label: string;
}[] = localizedResource(() => [
  { id: 'inunda', label: message('mbcaa646fb078') },
  { id: 'nino', label: message('m1634ebc4fa77') },
  { id: 'agua', label: message('m158d4f144d8d') },
  { id: 'desliz', label: message('mfaad847cf831') },
  { id: 'caudal', label: message('m15950aca0d6f') },
  { id: 'aliados', label: message('mf26a26e180b4') },
  { id: 'hacer', label: message('m34eca4a6260f') },
  { id: 'orilla', label: message('m991a6b5d8d40') },
]);
const KEYWORDS: [string, Exclude<QuestionId, 'unknown'>][] = localizedResource(() => [
  ['orill', 'orilla'],
  ['restaur', 'orilla'],
  ['reforest', 'orilla'],
  [message('ma7a42630ce19'), 'orilla'],
  ['arbol', 'orilla'],
  [message('maac15f98477f'), 'orilla'],
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
  [message('m1959193939cd'), 'nino'],
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
]);
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
  const { journey, alerts, fluc, plan, zoneAbove } = info;
  switch (id) {
    case 'inunda':
    case 'desliz': {
      const card = alerts.list.find(
        (alert) => alert.id === (id === 'inunda' ? 'inundacion' : 'deslizamiento'),
      )!;
      return message('alerts.assistantAnswer', card.title, card.levelLabel, alerts.face, card.why);
    }
    case 'nino':
      return message(
        'alerts.assistantAnswer',
        alerts.top.title,
        alerts.top.levelLabel,
        alerts.face,
        alerts.top.why,
      );
    case 'agua':
      return message(
        'm1a29b470a606',
        journey.src,
        journey.dist,
        journey.op,
        journey.conn,
        journey.pct,
      );
    case 'caudal':
      return message('mf0b7a3aefddc');
    case 'aliados':
      return fluc.has
        ? message(
            'm33e3befdd3df',
            journey.op,
            fluc.region,
            fluc.list
              .filter((o) => !o.national)
              .slice(0, 3)
              .map((o) => o.name)
              .join('; '),
          )
        : message('m1aa28c9715b6', journey.op);
    case 'hacer':
      return message('m5635ec99f1ef');
    case 'orilla':
      return message(
        'm28d3d781f20c',
        zoneAbove.t,
        zoneAbove.d,
        plan.rip.has ? message('m716e3380744b', plan.rip.kmNo, plan.rip.haUrg) : '',
        zoneAbove.verd,
      );
    default:
      return message('mf46f08fd34d2');
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
const RAW_REFS: [string, string, string, 'n' | 'l' | 's'][] = localizedResource(() => [
  [message('md41adfb23776'), message('m85e18a9b7e6a'), 'power.larc.nasa.gov', 'n'],
  [
    message('m26f1c44c5bda'),
    message('ma06d2dd65866'),
    'doi.org/10.5067/MODIS/MOD13Q1.061 · modis.ornl.gov',
    'n',
  ],
  [
    message('m7765cfc104c2'),
    message('m437da5d4c1ca'),
    'cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni',
    'n',
  ],
  [message('mf99c7f5f6eda'), message('mb2894ae18a0d'), message('m0ef96b67be61'), 'n'],
  [message('m4f9da4f8e424'), message('m2d17afce6ef5'), message('mfe6e5b7466e2'), 'l'],
  [message('m60b7684e70f8'), message('md179ec079cb7'), message('mfe6e5b7466e2'), 'l'],
  [message('m05ab0e9080e1'), message('md42289792af7'), message('mfe6e5b7466e2'), 'l'],
  [message('m6e0019d4d61c'), message('m92508d6ed4a6'), message('mfe6e5b7466e2'), 'l'],
  [message('m9eef6d84b9c0'), message('mccf801015919'), message('m0316e9215deb'), 'l'],
  [message('m9a1263ffd6b9'), message('ma1dabc6efd90'), 'fao.org/3/x0490s', 'l'],
  [message('mb10fd774ed7a'), message('m4d97c27e96ca'), message('m490da665f774'), 's'],
  [message('ma085113c6b76'), message('m972c75cc6290'), 'faolex.fao.org/docs/pdf/cos7778.pdf', 'l'],
  [message('m3bf0e0010e38'), message('md7e7010c418a'), message('mfe6e5b7466e2'), 'l'],
  [message('mca7c1dbea073'), message('m2d52f558ab9d'), message('me40d5298a274'), 's'],
  [message('m6da988ca38bc'), message('m6bb4df0db489'), message('m0942d0792729'), 'l'],
  [
    message('m7b22d427c956'),
    message('mfd01eb8f366d'),
    'doi.org/10.5067/MODIS/MOD13A3.061 · gibs.earthdata.nasa.gov',
    'n',
  ],
]);
export const REFERENCES: DataReference[] = RAW_REFS.map(
  ([title, detail, sourceLabel, flag], i) => ({
    n: i + 1,
    title,
    detail,
    sourceLabel,
    kind: flag === 'n' ? 'nasa' : flag === 'l' ? 'local' : 'sim',
    color: flag === 'n' ? '#17617C' : flag === 'l' ? '#2E7A43' : '#9C5F1C',
  }),
);
