import { describe, expect, it } from 'vitest';
import { loadDataset } from '../real/load';
import { elNinoAlerts } from './alerts';
import { climateSignals } from './climate';
import { EXAMPLE_FARMS, pastureRotation, validateFarmForm } from './farm';
import { flucForCanton } from './fluc';
import { getGeo, placeAt } from './geo';
import { flowChart, flowFromBucket, flowProjection, demoRecords } from './records';
import { watershedPlan, zoneFromAbove } from './watershed';

describe('Motor espacial y de cálculo con datos reales v10', () => {
  it('carga los 6 datasets reales y resuelve Upala desde lat/lon', async () => {
    const ds = await loadDataset();
    expect(ds.territory.cuencas.length).toBeGreaterThanOrEqual(34);
    expect(ds.territory.subs.length).toBe(279);
    expect(ds.sources.fuentes.length).toBeGreaterThan(5000);

    const geo = getGeo(ds);
    const upalaLoc = geo.llToLocal(10.8, -85.08);
    const ctx = placeAt(ds, upalaLoc, null);
    expect(ctx).not.toBeNull();
    expect(ctx?.canton.n.toLowerCase()).toContain('upala');
    expect(ctx?.sub.n.length).toBeGreaterThan(2);
  });

  it('decodifica orillas IGN 1:5 000 + MODIS y arma el plan de subcuenca', async () => {
    const ds = await loadDataset();
    const ctx = placeAt(ds, getGeo(ds).llToLocal(10.8, -85.08), null)!;
    const plan = watershedPlan(ds, ctx, null);
    expect(plan.forecast).toHaveLength(6);
    expect(plan.actions.length).toBeGreaterThan(0);

    const zone = zoneFromAbove(ds, ctx.loc);
    expect(zone.t.length).toBeGreaterThan(5);
  });

  it('calcula rotación de potreros, caudal con balde, alertas El Niño y red FLUC', async () => {
    const ds = await loadDataset();
    const ctx = placeAt(ds, getGeo(ds).llToLocal(10.8, -85.08), null)!;
    const clima = climateSignals(ds, ctx, null);
    expect(clima.list.length).toBeGreaterThan(5);

    const rot = pastureRotation(ds, ctx, null, EXAMPLE_FARMS.lechera, 8, 0.65);
    expect(rot.months).toHaveLength(6);
    expect(Number(rot.rest)).toBeGreaterThan(0);

    const alerts = elNinoAlerts(ds, ctx, null, rot, ctx.flood);
    expect(alerts.list).toHaveLength(3);

    const fluc = flucForCanton(ds, ctx.canton.n);
    expect(fluc.has).toBe(true);
    expect(fluc.list.length).toBeGreaterThan(0);

    const bucket = flowFromBucket('20', '4');
    expect(bucket.valid).toBe(true);
    expect(bucket.lps).toBe(5);

    const recs = demoRecords(0);
    const chart = flowChart(ds, ctx, recs);
    expect(chart.has).toBe(true);
    const proj = flowProjection(ds, recs);
    expect(proj.has).toBe(true);

    const validForm = validateFarmForm({
      name: 'Mi prueba',
      act: 'leche',
      agua: 'naciente',
      ha: '15',
      cult: '10',
      animals: '20',
      ench: 'no',
    });
    expect(validForm.ok).toBe(true);
    expect(validForm.farm?.animals).toBe(20);
  });
});
