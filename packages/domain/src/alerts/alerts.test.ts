import { describe, expect, it } from 'vitest';
import { pendingRiskAssessment, validObservationDate, type AlertEvidence } from './index';

const observed: AlertEvidence = {
  id: 'rain1d',
  value: 0,
  unit: 'mm',
  status: 'available',
  expectedSource: 'Test provider',
  provenance: { origin: 'estimated', source: 'Test provider', asOf: '2026-11-13' },
  observedStart: '2026-11-13',
  observedEnd: '2026-11-13',
};
const now = '2026-11-15T12:00:00Z';

describe('pending risk assessment', () => {
  it('never interprets missing indicators as low risk', () => {
    expect(pendingRiskAssessment([], now)).toEqual({
      severity: 'indeterminate',
      blockers: ['missing-data', 'rules-unapproved'],
    });
  });

  it('accepts a zero observation but still requires approved rules', () => {
    expect(pendingRiskAssessment([observed], now)).toEqual({
      severity: 'indeterminate',
      blockers: ['rules-unapproved'],
    });
  });

  it.each([null, NaN, Infinity, ''])('rejects missing or invalid values: %s', (value) => {
    expect(pendingRiskAssessment([{ ...observed, value }], now).blockers).toContain('missing-data');
  });

  it.each(['2026-02-30', '2026-11-16', '20261113', 'not-a-date', null])(
    'rejects invalid, future or absent observation dates: %s',
    (observedEnd) => {
      expect(pendingRiskAssessment([{ ...observed, observedEnd }], now).blockers).toContain(
        'missing-data',
      );
    },
  );

  it('requires ordered periods and source provenance', () => {
    expect(
      pendingRiskAssessment([{ ...observed, observedStart: '2026-11-14' }], now).blockers,
    ).toContain('missing-data');
    expect(pendingRiskAssessment([{ ...observed, provenance: null }], now).blockers).toContain(
      'missing-data',
    );
  });

  it('does not use simulations in real assessments even with an available status', () => {
    const disguised = {
      ...observed,
      provenance: { ...observed.provenance!, origin: 'demo' as const },
    };
    expect(pendingRiskAssessment([disguised], now).blockers).toContain('simulated-data');
  });

  it('distinguishes outdated and unverified data without inventing an expiry rule', () => {
    expect(pendingRiskAssessment([{ ...observed, status: 'outdated' }], now).blockers).toContain(
      'outdated-data',
    );
    expect(pendingRiskAssessment([{ ...observed, status: 'unverified' }], now).blockers).toContain(
      'unverified-data',
    );
  });

  it('validates leap days and rejects invalid evaluation dates', () => {
    expect(validObservationDate('2024-02-29')).toBe(true);
    expect(validObservationDate('2025-02-29')).toBe(false);
    expect(() => pendingRiskAssessment([observed], 'invalid')).toThrow('Invalid evaluation date');
  });
});
