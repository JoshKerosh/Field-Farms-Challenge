import { describe, expect, it } from 'vitest';
import {
  evaluateEnvironmentalRisk,
  parseRiskPolicies,
  REQUIRED_RISK_EVIDENCE,
  type RiskPolicy,
} from './evaluate';
import type { AlertEvidence, EnvironmentalRisk } from './index';

const now = '2026-11-15T12:00:00Z';
// Every threshold/reference/approval below is SYNTHETIC and exists only in this test.
function example(risk: EnvironmentalRisk): { policy: RiskPolicy; inputs: AlertEvidence[] } {
  const inputs: AlertEvidence[] = REQUIRED_RISK_EVIDENCE[risk].map((id) => ({
    id,
    value: 10,
    unit: 'test-unit',
    productId: 'test-product',
    status: 'available',
    expectedSource: 'Synthetic',
    provenance: { origin: 'estimated', source: 'Synthetic fixture', asOf: '2026-11-13' },
    observedStart: '2026-11-13',
    observedEnd: '2026-11-13',
  }));
  const policy: RiskPolicy = {
    id: `synthetic-${risk}`,
    version: 'test-only',
    risk,
    approval: {
      status: 'approved',
      by: 'Synthetic test fixture',
      date: '2026-11-01',
      references: ['https://example.test/fixture'],
    },
    requirements: Object.fromEntries(
      inputs.map((i) => [
        i.id,
        { unit: 'test-unit', productId: 'test-product', maxAgeDays: 2, windowDays: 1 },
      ]),
    ),
    bands: [
      {
        id: 'test-high',
        severity: 'high',
        all: inputs.map((i) => ({ indicator: i.id, operator: 'gte', value: 10 })),
      },
    ],
    defaultSeverity: 'low',
  };
  return { policy, inputs };
}

describe.each(['sequia', 'inundacion', 'saturacion', 'deslizamiento'] as const)(
  '%s evaluation',
  (risk) => {
    it('requires every factor and evaluates exact threshold boundaries', () => {
      const { policy, inputs } = example(risk);
      const result = evaluateEnvironmentalRisk(risk, inputs, now, policy);
      expect(result.severity).toBe('high');
      expect(result.matchedEvidenceIds).toEqual(REQUIRED_RISK_EVIDENCE[risk]);
      expect(result.policy?.version).toBe('test-only');
      expect(
        evaluateEnvironmentalRisk(
          risk,
          inputs.map((i) => ({ ...i, value: 9 })),
          now,
          policy,
        ).severity,
      ).toBe('low');
      expect(evaluateEnvironmentalRisk(risk, inputs.slice(1), now, policy).severity).toBe(
        'indeterminate',
      );
    });

    it('cannot evaluate with missing, simulated, outdated or unverified factors', () => {
      const { policy, inputs } = example(risk);
      for (const status of ['unavailable', 'simulated', 'outdated', 'unverified'] as const) {
        const changed = inputs.map((i, index) => (index === 0 ? { ...i, status } : i));
        expect(evaluateEnvironmentalRisk(risk, changed, now, policy).severity).toBe(
          'indeterminate',
        );
      }
    });

    it('uses policy freshness and rejects wrong units, product, period and future observations', () => {
      const { policy, inputs } = example(risk);
      for (const patch of [
        { unit: 'wrong' },
        { productId: 'wrong' },
        { observedStart: '2026-11-12' },
        { observedEnd: '2026-11-10', observedStart: '2026-11-10' },
        { observedEnd: '2026-11-16' },
      ]) {
        expect(
          evaluateEnvironmentalRisk(
            risk,
            inputs.map((i, index) => (index === 0 ? { ...i, ...patch } : i)),
            now,
            policy,
          ).severity,
        ).toBe('indeterminate');
      }
    });

    it('does not enable unapproved rules, even with complete real data', () => {
      const { inputs, policy } = example(risk);
      expect(evaluateEnvironmentalRisk(risk, inputs, now).blockers).toContain('rules-unapproved');
      expect(
        evaluateEnvironmentalRisk(risk, inputs, now, {
          ...policy,
          approval: { ...policy.approval, by: '' },
        }).severity,
      ).toBe('indeterminate');
      expect(
        evaluateEnvironmentalRisk(risk, inputs, now, {
          ...policy,
          approval: { ...policy.approval, date: '2026-11-16' },
        }).severity,
      ).toBe('indeterminate');
    });
  },
);

describe('policy validation and combinations', () => {
  it('rejects drafts, duplicates, unreferenced policies and incomplete requirement lists', () => {
    const { policy } = example('inundacion');
    expect(
      parseRiskPolicies({ schemaVersion: 'alert-risk-policies-v1', policies: [policy] }).inundacion,
    ).toBeDefined();
    expect(
      parseRiskPolicies({ schemaVersion: 'alert-risk-policies-v1', policies: [policy, policy] }),
    ).toEqual({});
    for (const invalid of [
      { ...policy, approval: { ...policy.approval, status: 'draft' } },
      { ...policy, requirements: {} },
      { ...policy, approval: { ...policy.approval, references: [] } },
      { ...policy, bands: [{ ...policy.bands[0], all: [] }] },
    ])
      expect(
        parseRiskPolicies({ schemaVersion: 'alert-risk-policies-v1', policies: [invalid] }),
      ).toEqual({});
  });

  it('evaluates regional boolean/string combinations without type coercion and chooses highest severity', () => {
    const { policy, inputs } = example('inundacion');
    const changed = inputs.map((i) =>
      i.id === 'drainage' ? { ...i, value: 'C' } : i.id === 'floodZone' ? { ...i, value: true } : i,
    );
    policy.bands = [
      {
        id: 'medium-rain',
        severity: 'medium',
        all: [{ indicator: 'rain1d', operator: 'gte', value: 5 }],
      },
      {
        id: 'critical-combination',
        severity: 'critical',
        all: [
          { indicator: 'rain1d', operator: 'gt', value: 9 },
          { indicator: 'floodZone', operator: 'eq', value: true },
          { indicator: 'drainage', operator: 'eq', value: 'C' },
        ],
      },
    ];
    expect(evaluateEnvironmentalRisk('inundacion', changed, now, policy).severity).toBe('critical');
    expect(
      evaluateEnvironmentalRisk(
        'inundacion',
        changed.map((i) => (i.id === 'drainage' ? { ...i, value: 'P' } : i)),
        now,
        policy,
      ).severity,
    ).toBe('medium');
    expect(
      evaluateEnvironmentalRisk(
        'inundacion',
        changed.map((i) => (i.id === 'floodZone' ? { ...i, value: 'true' } : i)),
        now,
        policy,
      ).severity,
    ).toBe('indeterminate');
  });

  it('rejects duplicate evidence IDs instead of silently selecting a factor', () => {
    const { inputs, policy } = example('saturacion');
    expect(
      evaluateEnvironmentalRisk('saturacion', [...inputs, ...inputs], now, policy).blockers,
    ).toContain('unverified-data');
  });
});
