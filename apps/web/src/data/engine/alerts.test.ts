import { afterEach, describe, expect, it } from 'vitest';
import { loadDataset } from '../real/load';
import { getGeo, placeAt } from './geo';
import { environmentalAlerts } from './alerts';
import { setMessageLanguage } from '../../i18n/messages';
import { answerQuestion, type AssistantContext } from './assistant';

const now = '2026-11-15T12:00:00Z';
afterEach(() => setMessageLanguage('es'));

async function setup() {
  const ds = await loadDataset();
  const ctx = placeAt(ds, getGeo(ds).llToLocal(10.8, -85.08), null)!;
  return { ds, ctx };
}

describe('environmental alerts without Earthdata', () => {
  it('always shows four categories and never classifies missing real data as low risk', async () => {
    const { ds, ctx } = await setup();
    const summary = environmentalAlerts(ds, ctx, null, now);
    expect(summary.list.map((alert) => alert.id)).toEqual([
      'sequia',
      'inundacion',
      'saturacion',
      'deslizamiento',
    ]);
    expect(
      summary.list.every((alert) => alert.mode === 'real' && alert.severity === 'indeterminate'),
    ).toBe(true);
    expect(summary.list.flatMap((a) => a.evidence).filter((e) => e.status === 'simulated')).toEqual(
      [],
    );
    expect(summary.list.find((a) => a.id === 'saturacion')!.evidence[0].value).toBeNull();
  });

  it('preserves the bundled POWER observation period and marks its verification pending', async () => {
    const { ds, ctx } = await setup();
    const drought = environmentalAlerts(ds, ctx, null, now).list.find((a) => a.id === 'sequia')!;
    const power = drought.evidence.find((e) => e.id === 'rain30anomaly')!;
    expect(power.status).toBe('unverified');
    expect(power.observedEnd).toBe('2026-11-10');
    expect(power.observedStart).toBe('2026-10-12');
    expect(power.provenance?.origin).toBe('estimated');
    expect(drought.evidence.find((e) => e.id === 'soilMoisture')?.value).toBeNull();
  });

  it('orders wet-scenario cards by severity and identifies every input as simulated', async () => {
    const { ds, ctx } = await setup();
    const summary = environmentalAlerts(ds, ctx, 'inund', now);
    expect(summary.list.map((a) => a.id)).toEqual([
      'inundacion',
      'saturacion',
      'deslizamiento',
      'sequia',
    ]);
    expect(summary.top.severity).toBe('critical');
    for (const card of summary.list) {
      expect(card.mode).toBe('demo');
      expect(
        card.evidence.every((e) => e.status === 'simulated' && e.provenance?.origin === 'demo'),
      ).toBe(true);
      expect(card.evaluatedAt).toBe(now);
    }
  });

  it('restores pending real assessments after exiting a simulation without modifying data', async () => {
    const { ds, ctx } = await setup();
    const before = JSON.stringify(ds.climate);
    expect(environmentalAlerts(ds, ctx, 'seco', now).top.id).toBe('sequia');
    expect(environmentalAlerts(ds, ctx, null, now).top.severity).toBe('indeterminate');
    expect(JSON.stringify(ds.climate)).toBe(before);
  });

  it('does not use actual farm class or location to make a fictional assessment look real', async () => {
    const { ds, ctx } = await setup();
    const changed = { ...ctx, clsRaw: 'I', caribe: false };
    const levels = (location: typeof ctx) =>
      environmentalAlerts(ds, location, 'inund', now).list.map((a) => a.severity);
    expect(levels(changed)).toEqual(levels(ctx));
  });

  it('updates alert text when the language changes', async () => {
    const { ds, ctx } = await setup();
    expect(environmentalAlerts(ds, ctx, null, now).list[0].levelLabel).toBe('Indeterminada');
    setMessageLanguage('en');
    const summary = environmentalAlerts(ds, ctx, null, now);
    expect(summary.list[0].levelLabel).toBe('Indeterminate');
    expect(summary.list.find((a) => a.id === 'saturacion')!.title).toBe('Excess soil water');
  });

  it('keeps assistant answers consistent with pending and simulated assessments', async () => {
    const { ds, ctx } = await setup();
    // These question branches only consume the alert summary; other context is irrelevant here.
    const info = { alerts: environmentalAlerts(ds, ctx, null, now) } as AssistantContext;
    expect(answerQuestion('inunda', info)).toContain('Indeterminada');
    expect(answerQuestion('desliz', info)).toContain('Indeterminada');
    expect(answerQuestion('nino', info)).not.toContain('muy fuerte');
    info.alerts = environmentalAlerts(ds, ctx, 'inund', now);
    expect(answerQuestion('inunda', info)).toContain('ficticios');
  });
});
