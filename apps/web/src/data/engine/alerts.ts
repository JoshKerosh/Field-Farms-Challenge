import { messageLanguage as displayLanguage } from '../../i18n/messages';
import { message } from '../../i18n/messages';
import {
  evaluateEnvironmentalRisk,
  evidenceWithFreshness,
  REQUIRED_RISK_EVIDENCE,
  validObservationDate,
  type AlertEvidence,
  type EnvironmentalRisk,
  type RiskSeverity,
} from '@field-farms/domain';
import { demoAlertEvidence, demoAlertSeverities } from '../../demo/fixtures/environmental-alerts';
import type { Dataset } from '../real/types';
import type { DemoScenario } from './climate';
import { getGeo, type PlaceContext } from './geo';
import {
  emptyAlertSources,
  evidenceForLocation,
  type AlertSources,
} from '../../features/alerts/data/alert-sources';
export interface DroughtHistoryItem {
  title: string;
  detail: string;
}
export interface DroughtHistorySummary {
  cuencaName: string;
  connections: string;
  nAsadas: number;
  msg: string;
  hasReports: boolean;
  nCommunity: number;
  nInfra: number;
  list: DroughtHistoryItem[];
  nearest: string;
}
export interface AlertCard {
  id: EnvironmentalRisk;
  icon: string;
  title: string;
  level: number;
  severity: RiskSeverity;
  mode: 'real' | 'demo';
  evidence: AlertEvidence[];
  evaluatedAt: string;
  blockers: string[];
  levelLabel: string;
  bg: string;
  fg: string;
  why: string;
  recs: string[];
  src: string;
  defaultOpen: boolean;
  ruleReferences: string[];
  ruleConditions: string[];
}
export interface AlertsSummary {
  face: string;
  caribe: boolean;
  list: AlertCard[];
  top: AlertCard;
  evaluatedAt: string;
  history: DroughtHistorySummary;
  sourceWarnings: string[];
}
/** Connections of the whole watershed and real 2014–2015 drought reports (HIST). */
export function droughtHistory(ds: Dataset, ctx: PlaceContext): DroughtHistorySummary {
  const geo = getGeo(ds);
  const { byCuenca, hist } = geo.cuencaConnections();
  const opsCu = byCuenca[ctx.cuIdx] || {};
  const opKeys = Object.keys(opsCu);
  const nAsadas = opKeys.length;
  const connCu = opKeys.reduce((acc, k) => acc + (opsCu[Number(k)] || 0), 0);
  const cuencaName =
    ds.territory.cuNames[ctx.cuIdx] ||
    ds.territory.cuencas[ctx.cuIdx]?.n ||
    message('m238ac67fa5d2');
  const hl = (hist[ctx.cuIdx] || []).map((i) => ds.history[i]);
  const nCommunity = hl.filter((h) => h[2] === 'c').length;
  const nInfra = hl.filter((h) => h[2] === 'i').length;
  const nearH = ds.history
    .map((h) => ({ h, d: Math.hypot(h[0] - ctx.loc.x, h[1] - ctx.loc.y) / 10 }))
    .sort((a, b) => a.d - b.d);
  const fmtConn = Math.round(connCu).toLocaleString(displayLanguage() === 'en' ? 'en-US' : 'es-CR');
  return {
    cuencaName,
    connections: fmtConn,
    nAsadas,
    msg: message('ma56388b6ce91', fmtConn, nAsadas, cuencaName),
    hasReports: hl.length > 0,
    nCommunity,
    nInfra,
    list: hl.slice(0, 4).map((h) => ({
      title: message('m0aa4c5a6e943', h[3], h[4]),
      detail: h[2] === 'c' ? message('m6a1976b08254') : h[5],
    })),
    nearest: nearH.length
      ? message('m72013d19fbd9', nearH[0].h[3], nearH[0].h[4], Math.round(nearH[0].d))
      : '',
  };
}

const EVIDENCE_LABELS = {
  roni: 'alerts.evidence.roni',
  drainage: 'alerts.evidence.drainage',
  rain30anomaly: 'alerts.evidence.rain30anomaly',
  soilMoisture: 'alerts.evidence.soilMoisture',
  rain1d: 'alerts.evidence.rain1d',
  rain7d: 'alerts.evidence.rain7d',
  floodZone: 'alerts.evidence.floodZone',
  slope: 'alerts.evidence.slope',
  soil: 'alerts.evidence.soil',
  landslideZone: 'alerts.evidence.landslideZone',
} as const;

export function evidenceLabel(id: string): string {
  const key = EVIDENCE_LABELS[id as keyof typeof EVIDENCE_LABELS];
  return key ? message(key) : id;
}

export function evidenceValue(item: AlertEvidence): string {
  if (item.value === null || (typeof item.value === 'number' && !Number.isFinite(item.value)))
    return message('alerts.noValue');
  if (item.value === 'demo-soil') return message('alerts.demoSoil');
  if (item.value === 'demo-drainage') return message('alerts.demoDrainage');
  if (item.id === 'drainage')
    return item.value === 'C' ? message('alerts.caribbean') : message('alerts.pacific');
  if (typeof item.value === 'boolean') return message(item.value ? 'alerts.yes' : 'alerts.no');
  const value =
    typeof item.value === 'number'
      ? new Intl.NumberFormat(displayLanguage() === 'en' ? 'en-US' : 'es-CR', {
          maximumFractionDigits: 3,
        }).format(item.value)
      : item.value;
  return `${value}${item.unit ? ` ${item.unit}` : ''}`;
}

function availableEvidence(ds: Dataset, ctx: PlaceContext): Record<string, AlertEvidence> {
  const sources: Record<string, string> = {
    roni: 'NOAA CPC · RONI/ONI',
    drainage: message('alerts.prototypeMap'),
    rain30anomaly: 'NASA POWER',
    soilMoisture: 'NASA SMAP L4',
    rain1d: 'NASA IMERG Late',
    rain7d: 'NASA IMERG Late',
    floodZone: 'CNE',
    slope: 'DEM',
    soil: '',
    landslideZone: 'CNE',
  };
  const result = Object.fromEntries(
    Object.entries(sources).map(([id, source]) => [
      id,
      {
        id,
        value: null,
        unit: '',
        status: 'unavailable' as const,
        expectedSource: source,
        provenance: null,
        observedStart: null,
        observedEnd: null,
      },
    ]),
  ) as Record<string, AlertEvidence>;
  const power = ds.climate.NASA[ctx.reg].y2026;
  const end = power.last.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  if (validObservationDate(end) && Number.isFinite(power.rain30Anom)) {
    const start = new Date(`${end}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 29);
    result.rain30anomaly = {
      ...result.rain30anomaly,
      value: power.rain30Anom,
      unit: '%',
      status: 'unverified',
      provenance: { origin: 'estimated', source: message('alerts.powerSnapshot'), asOf: end },
      observedStart: start.toISOString().slice(0, 10),
      observedEnd: end,
    };
  }
  result.roni = {
    ...result.roni,
    value: ds.climate.NASA.ONI.actual,
    unit: '°C',
    status: 'unverified',
  };
  result.drainage = { ...result.drainage, value: ctx.sub.v, status: 'unverified' };
  return result;
}

/** Real observations and fictional storyboard data never share an assessment. */
export function environmentalAlerts(
  ds: Dataset,
  ctx: PlaceContext,
  demo: DemoScenario | null,
  evaluatedAt = new Date().toISOString(),
  sources: AlertSources = emptyAlertSources(),
): AlertsSummary {
  const [longitude, latitude] = getGeo(ds).localToLngLat(ctx.loc);
  const inputs = demo
    ? demoAlertEvidence(demo)
    : {
        ...availableEvidence(ds, ctx),
        ...evidenceForLocation(sources, longitude, latitude),
      };
  const demoLevels = demo ? demoAlertSeverities(demo) : null;
  const definitions = [
    { id: 'sequia', icon: '☀️', title: message('mca9d461485f3'), recs: [message('m5182d0419fdf')] },
    {
      id: 'inundacion',
      icon: '🌊',
      title: message('m3b4b1f8fff8a'),
      recs: [message('m806cc8fcda2b')],
    },
    {
      id: 'saturacion',
      icon: '💧',
      title: message('alerts.saturation'),
      recs: [message('alerts.saturationRecommendation')],
    },
    {
      id: 'deslizamiento',
      icon: '⛰️',
      title: message('m6e6f4d6c09bb'),
      recs: [message('m783a67deff19')],
    },
  ] as const;
  const rank: Record<RiskSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    indeterminate: 0,
  };
  const colors: Record<RiskSeverity, [string, string]> = {
    critical: ['#F8E1DE', '#8E2A21'],
    high: ['#F8E1DE', '#8E2A21'],
    medium: ['#FDF1D6', '#6B4505'],
    low: ['#E2F1E5', '#1F5A32'],
    indeterminate: ['#EEF1EE', '#55665B'],
  };
  const raw = definitions.map((definition): AlertCard => {
    const policy = demo ? undefined : sources.policies[definition.id];
    const evidence = evidenceWithFreshness(
      REQUIRED_RISK_EVIDENCE[definition.id].map((id) => inputs[id]),
      policy,
      evaluatedAt,
    );
    const pending = evaluateEnvironmentalRisk(definition.id, evidence, evaluatedAt, policy);
    const severity = demoLevels?.[definition.id] ?? pending.severity;
    const [bg, fg] = colors[severity];
    const blockers = demo
      ? []
      : pending.blockers.map((blocker) => message(`alerts.blocker.${blocker}`));
    return {
      ...definition,
      recs: [...definition.recs],
      severity,
      mode: demo ? 'demo' : 'real',
      evidence,
      evaluatedAt,
      blockers,
      level: rank[severity],
      levelLabel: message(`alerts.level.${severity}`),
      bg,
      fg,
      defaultOpen: false,
      ruleReferences: pending.policy?.references ?? [],
      ruleConditions:
        policy && pending.policy
          ? policy.bands
              .filter((band) => pending.matchedBandIds.includes(band.id))
              .flatMap((band) =>
                band.all.map(
                  (condition) =>
                    `${evidenceLabel(condition.indicator)} ${
                      { gte: '≥', lte: '≤', gt: '>', lt: '<', eq: '=' }[condition.operator]
                    } ${evidenceValue({ ...inputs[condition.indicator], value: condition.value })}`,
                ),
              )
          : [],
      why: demo
        ? message(`alerts.demoWhy.${definition.id}`)
        : pending.severity === 'indeterminate'
          ? message('alerts.pendingWhy')
          : message(
              'alerts.ruleWhy',
              pending.policy?.version,
              pending.matchedEvidenceIds.map(evidenceLabel).join(', ') ||
                message('alerts.noThresholdMatched'),
            ),
      src: [
        ...new Set(
          evidence.map(
            (item) =>
              item.provenance?.source || item.expectedSource || message('alerts.sourcePending'),
          ),
        ),
      ].join(' · '),
    };
  });
  raw.sort((a, b) => b.level - a.level);
  const list = raw.map((card, index) => ({ ...card, defaultOpen: index === 0 || card.level >= 3 }));
  return {
    face: message(
      demo
        ? 'alerts.demoNotice'
        : raw.some((c) => c.severity !== 'indeterminate')
          ? 'alerts.liveNotice'
          : 'alerts.realNotice',
    ),
    caribe: ctx.caribe,
    list,
    top: list[0],
    evaluatedAt,
    history: droughtHistory(ds, ctx),
    sourceWarnings: demo ? [] : sources.warnings.map((warning) => message(warning)),
  };
}
