import { pendingRiskAssessment, validObservationDate } from './index';
import type { AlertBlocker, AlertEvidence, EnvironmentalRisk, RiskSeverity } from './index';

export const REQUIRED_RISK_EVIDENCE: Record<EnvironmentalRisk, readonly string[]> = {
  sequia: ['roni', 'drainage', 'rain30anomaly', 'soilMoisture'],
  inundacion: ['rain1d', 'rain7d', 'floodZone', 'drainage'],
  saturacion: ['soilMoisture'],
  deslizamiento: ['slope', 'soil', 'rain7d', 'soilMoisture', 'landslideZone'],
};
type DeterminedSeverity = Exclude<RiskSeverity, 'indeterminate'>;
type Condition = {
  indicator: string;
  operator: 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
  value: number | string | boolean;
};
export interface RiskPolicy {
  id: string;
  version: string;
  risk: EnvironmentalRisk;
  approval: { status: 'approved'; by: string; date: string; references: string[] };
  requirements: Record<
    string,
    { unit: string; productId: string; maxAgeDays: number; windowDays?: number }
  >;
  bands: { id: string; severity: DeterminedSeverity; all: Condition[] }[];
  defaultSeverity: DeterminedSeverity;
}
export type RiskPolicies = Partial<Record<EnvironmentalRisk, RiskPolicy>>;
export interface RiskEvaluation {
  severity: RiskSeverity;
  blockers: AlertBlocker[];
  matchedBandIds: string[];
  matchedEvidenceIds: string[];
  policy: { id: string; version: string; references: string[] } | null;
}

const levels: DeterminedSeverity[] = ['low', 'medium', 'high', 'critical'];
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** Runtime validation: malformed or draft policies never become active rules. */
export function isRiskPolicy(value: unknown): value is RiskPolicy {
  if (
    !object(value) ||
    !text(value.id) ||
    !text(value.version) ||
    !text(value.risk) ||
    !Object.hasOwn(REQUIRED_RISK_EVIDENCE, value.risk) ||
    !object(value.approval) ||
    value.approval.status !== 'approved' ||
    !text(value.approval.by) ||
    !validObservationDate(typeof value.approval.date === 'string' ? value.approval.date : null) ||
    !Array.isArray(value.approval.references) ||
    value.approval.references.length === 0 ||
    !value.approval.references.every((url) => text(url) && /^https:\/\/[^\s/]+\//.test(url)) ||
    !object(value.requirements) ||
    !Array.isArray(value.bands) ||
    value.bands.length === 0 ||
    !levels.includes(value.defaultSeverity as DeterminedSeverity)
  )
    return false;
  for (const id of REQUIRED_RISK_EVIDENCE[value.risk as EnvironmentalRisk]) {
    if (!Object.hasOwn(value.requirements, id)) return false;
  }
  for (const req of Object.values(value.requirements)) {
    if (
      !object(req) ||
      typeof req.unit !== 'string' ||
      !text(req.productId) ||
      !integer(req.maxAgeDays) ||
      (req.windowDays !== undefined && (!integer(req.windowDays) || req.windowDays === 0))
    )
      return false;
  }
  const bandIds = new Set<string>();
  for (const band of value.bands) {
    if (
      !object(band) ||
      !text(band.id) ||
      bandIds.has(band.id) ||
      !levels.includes(band.severity as DeterminedSeverity) ||
      !Array.isArray(band.all) ||
      band.all.length === 0
    )
      return false;
    bandIds.add(band.id);
    for (const condition of band.all) {
      if (
        !object(condition) ||
        !text(condition.indicator) ||
        !Object.hasOwn(value.requirements, condition.indicator) ||
        !['gte', 'lte', 'gt', 'lt', 'eq'].includes(condition.operator as string) ||
        !['number', 'string', 'boolean'].includes(typeof condition.value) ||
        (typeof condition.value === 'number' && !Number.isFinite(condition.value)) ||
        (condition.operator !== 'eq' && typeof condition.value !== 'number')
      )
        return false;
    }
  }
  return true;
}

export function parseRiskPolicies(value: unknown): RiskPolicies {
  const result: RiskPolicies = {};
  if (
    !object(value) ||
    value.schemaVersion !== 'alert-risk-policies-v1' ||
    !Array.isArray(value.policies)
  )
    return result;
  const duplicates = new Set<EnvironmentalRisk>();
  for (const policy of value.policies) {
    if (!isRiskPolicy(policy)) continue;
    if (result[policy.risk] || duplicates.has(policy.risk)) {
      delete result[policy.risk];
      duplicates.add(policy.risk);
    } else result[policy.risk] = policy;
  }
  return result;
}

export function evidenceWithFreshness(
  evidence: AlertEvidence[],
  policy: RiskPolicy | undefined,
  evaluatedAt: string,
): AlertEvidence[] {
  return evidence.map((item) => {
    const req = policy?.requirements[item.id];
    if (!req || item.status !== 'available' || !validObservationDate(item.observedEnd)) return item;
    const age = (Date.parse(evaluatedAt.slice(0, 10)) - Date.parse(item.observedEnd)) / 86400000;
    return age > req.maxAgeDays ? { ...item, status: 'outdated' } : item;
  });
}

/** Policy data contains the scientific thresholds; the engine contains no invented constants. */
export function evaluateEnvironmentalRisk(
  risk: EnvironmentalRisk,
  evidence: AlertEvidence[],
  evaluatedAt: string,
  candidate?: RiskPolicy,
): RiskEvaluation {
  const policy =
    isRiskPolicy(candidate) &&
    candidate.risk === risk &&
    candidate.approval.date <= evaluatedAt.slice(0, 10)
      ? candidate
      : undefined;
  const considered = evidenceWithFreshness(evidence, policy, evaluatedAt);
  const readiness = pendingRiskAssessment(considered, evaluatedAt);
  const blocked: RiskEvaluation = {
    ...readiness,
    matchedBandIds: [],
    matchedEvidenceIds: [],
    policy: null,
  };
  if (!policy) return blocked;
  const blockers = new Set<AlertBlocker>(
    readiness.blockers.filter((b) => b !== 'rules-unapproved'),
  );
  const byId = new Map(considered.map((e) => [e.id, e]));
  if (byId.size !== considered.length) blockers.add('unverified-data');
  for (const [id, req] of Object.entries(policy.requirements)) {
    const item = byId.get(id);
    if (!item) {
      blockers.add('missing-data');
      continue;
    }
    if (item.unit !== req.unit || item.productId !== req.productId) blockers.add('unverified-data');
    if (
      req.windowDays &&
      validObservationDate(item.observedStart) &&
      validObservationDate(item.observedEnd) &&
      (Date.parse(item.observedEnd) - Date.parse(item.observedStart)) / 86400000 + 1 !==
        req.windowDays
    )
      blockers.add('unverified-data');
  }
  for (const band of policy.bands)
    for (const condition of band.all) {
      if (
        byId.has(condition.indicator) &&
        typeof byId.get(condition.indicator)!.value !== typeof condition.value
      )
        blockers.add('unverified-data');
    }
  const identity = {
    id: policy.id,
    version: policy.version,
    references: [...policy.approval.references],
  };
  if (blockers.size) return { ...blocked, blockers: [...blockers], policy: identity };
  const matches = (condition: Condition): boolean => {
    const value = byId.get(condition.indicator)!.value;
    if (condition.operator === 'eq') return value === condition.value;
    if (typeof value !== 'number' || typeof condition.value !== 'number') return false;
    return condition.operator === 'gte'
      ? value >= condition.value
      : condition.operator === 'gt'
        ? value > condition.value
        : condition.operator === 'lte'
          ? value <= condition.value
          : value < condition.value;
  };
  const bands = policy.bands.filter((band) => band.all.every(matches));
  const severity = bands.reduce<DeterminedSeverity>(
    (highest, band) =>
      levels.indexOf(band.severity) > levels.indexOf(highest) ? band.severity : highest,
    policy.defaultSeverity,
  );
  return {
    severity,
    blockers: [],
    policy: identity,
    matchedBandIds: bands.map((band) => band.id),
    matchedEvidenceIds: [...new Set(bands.flatMap((band) => band.all.map((c) => c.indicator)))],
  };
}
