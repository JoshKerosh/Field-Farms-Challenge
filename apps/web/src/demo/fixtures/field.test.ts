import { describe, expect, it } from 'vitest';
import {
  farm,
  watershed,
  sources,
  readings,
  actions,
  incidents,
  organizations,
  indicators,
  alerts,
} from './field';
import { opportunities } from './opportunities';
import { demoRepositories } from '../repositories';

describe('integridad del ejemplo de cuenca', () => {
  it('vincula observaciones y acciones con entidades existentes', () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    const organizationIds = new Set(organizations.map((organization) => organization.id));
    expect(farm.watershedId).toBe(watershed.id);
    expect(organizationIds.has(farm.organizationId)).toBe(true);
    for (const source of sources) {
      expect(source.watershedId).toBe(watershed.id);
      expect(organizationIds.has(source.organizationId)).toBe(true);
    }
    for (const reading of [...readings, ...incidents]) {
      expect(sourceIds.has(reading.sourceId)).toBe(true);
      expect(reading.farmId).toBe(farm.id);
    }
    for (const action of actions) expect(action.farmId).toBe(farm.id);
  });
  it('identifica todos los datos de campo como demostración', () => {
    for (const entity of [
      farm,
      watershed,
      ...sources,
      ...readings,
      ...actions,
      ...incidents,
      ...indicators,
      ...alerts,
      ...organizations,
    ]) {
      expect(entity.provenance.origin).toBe('demo');
      expect(entity.provenance.asOf).toBe('2026-11-14');
    }
  });
  it('conserva la procedencia y el cierre de la convocatoria GANBOS', () => {
    const call = opportunities.find((opportunity) => opportunity.id === 'ganbos-2026');
    expect(call?.availability).toBe('closed');
    expect(call?.deadline).toBe('2026-10-31');
    for (const opportunity of opportunities) {
      expect(new URL(opportunity.sourceUrl).protocol).toBe('https:');
      expect(opportunity.reviewedAt).toBeTruthy();
    }
  });
  it('no altera la referencia compartida al consultar los adaptadores demo', async () => {
    const first = await demoRepositories.water.listReadings();
    first.splice(0, 1);
    expect(await demoRepositories.water.listReadings()).toHaveLength(readings.length);
  });
});
