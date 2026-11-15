import type { AlertEvidence, EnvironmentalRisk, RiskSeverity } from '@field-farms/domain';

/** All numbers and levels are fictional examples, not scientific risk rules. */
export type AlertDemoScenario = 'seco' | 'inund' | 'calor';
export const DEMO_OBSERVED_END = '2026-01-07';
export const DEMO_SOURCE = 'Field Farms Challenge · demo';

export function demoAlertEvidence(scenario: AlertDemoScenario): Record<string, AlertEvidence> {
  const wet = scenario === 'inund';
  const dry = scenario === 'seco';
  const values: Record<string, [number | string | boolean, string, string]> = {
    rain1d: [wet ? 90 : dry ? 0 : 8, 'mm', DEMO_OBSERVED_END],
    rain7d: [wet ? 350 : dry ? 2 : 45, 'mm', '2026-01-01'],
    rain30anomaly: [wet ? 60 : dry ? -50 : -10, '%', '2025-12-09'],
    soilMoisture: [wet ? 0.45 : dry ? 0.12 : 0.28, 'm³/m³', DEMO_OBSERVED_END],
    roni: [dry ? 1.5 : 0, '°C', '2025-10-01'],
    drainage: ['demo-drainage', '', DEMO_OBSERVED_END],
    slope: [25, '°', DEMO_OBSERVED_END],
    soil: ['demo-soil', '', DEMO_OBSERVED_END],
    floodZone: [wet, '', DEMO_OBSERVED_END],
    landslideZone: [wet, '', DEMO_OBSERVED_END],
  };
  return Object.fromEntries(
    Object.entries(values).map(([id, [value, unit, start]]) => [
      id,
      {
        id,
        value,
        unit,
        status: 'simulated',
        expectedSource: DEMO_SOURCE,
        provenance: {
          origin: 'demo',
          source: DEMO_SOURCE,
          asOf: id === 'roni' ? '2025-12-31' : DEMO_OBSERVED_END,
        },
        observedStart: start,
        observedEnd: id === 'roni' ? '2025-12-31' : DEMO_OBSERVED_END,
      },
    ]),
  );
}

/** Predetermined storyboard levels: no comparison between numbers and invented thresholds. */
export function demoAlertSeverities(
  scenario: AlertDemoScenario,
): Record<EnvironmentalRisk, RiskSeverity> {
  if (scenario === 'inund')
    return {
      inundacion: 'critical',
      saturacion: 'high',
      deslizamiento: 'high',
      sequia: 'low',
    };
  if (scenario === 'seco')
    return {
      sequia: 'high',
      inundacion: 'low',
      saturacion: 'low',
      deslizamiento: 'low',
    };
  return { sequia: 'medium', inundacion: 'low', saturacion: 'low', deslizamiento: 'low' };
}
