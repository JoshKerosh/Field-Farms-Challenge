import type { Provenance, SourcedEntity } from '../common';

export type EnvironmentalRisk = 'sequia' | 'inundacion' | 'saturacion' | 'deslizamiento';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical' | 'indeterminate';
export type AlertDataStatus = 'available' | 'outdated' | 'simulated' | 'unavailable' | 'unverified';

/** Evidence attached to an alert; not a replacement for the shared SPA-7 indicator contract. */
export interface AlertEvidence {
  id: string;
  value: number | string | boolean | null;
  unit: string;
  status: AlertDataStatus;
  expectedSource: string;
  provenance: Provenance | null;
  observedStart: string | null;
  observedEnd: string | null;
  productId?: string;
}

export type AlertBlocker =
  'missing-data' | 'outdated-data' | 'unverified-data' | 'simulated-data' | 'rules-unapproved';

export function validObservationDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** No production thresholds are approved yet: readiness must never imply low risk. */
export function pendingRiskAssessment(
  evidence: AlertEvidence[],
  evaluatedAt: string,
): {
  severity: 'indeterminate';
  blockers: AlertBlocker[];
} {
  const blockers = new Set<AlertBlocker>();
  const evaluationDate = evaluatedAt.slice(0, 10);
  if (!validObservationDate(evaluationDate)) throw new Error('Invalid evaluation date');
  if (evidence.length === 0) blockers.add('missing-data');
  for (const item of evidence) {
    const missing =
      item.value === null ||
      item.value === '' ||
      (typeof item.value === 'number' && !Number.isFinite(item.value)) ||
      !item.provenance?.source.trim() ||
      !validObservationDate(item.provenance?.asOf ?? null) ||
      !validObservationDate(item.observedStart) ||
      !validObservationDate(item.observedEnd) ||
      item.observedStart > item.observedEnd ||
      item.observedEnd > evaluationDate;
    if (missing || item.status === 'unavailable') blockers.add('missing-data');
    if (item.status === 'outdated') blockers.add('outdated-data');
    if (item.status === 'unverified') blockers.add('unverified-data');
    if (item.status === 'simulated' || item.provenance?.origin === 'demo')
      blockers.add('simulated-data');
  }
  blockers.add('rules-unapproved');
  return { severity: 'indeterminate', blockers: [...blockers] };
}

export interface FieldAlert extends SourcedEntity {
  watershedId: string;
  title: string;
  description: string;
  nextStep: string;
}

export interface FieldIncident extends SourcedEntity {
  farmId: string;
  sourceId: string;
  recordedAt: string;
  title: string;
  note: string;
}
