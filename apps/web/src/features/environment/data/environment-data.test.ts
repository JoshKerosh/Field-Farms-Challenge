import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validarArchivoIndicadores, type ArchivoIndicadores } from '@field-farms/domain';
import { loadDataset } from '../../../data/real/load';
import { getGeo, placeAt } from '../../../data/engine/geo';
import {
  loadEnvironmentSource,
  observation,
  observationAge,
  referenceDistance,
  referenceUnit,
  validateRealSource,
  validObservationDate,
} from './environment-data';

function published(path: string): ArchivoIndicadores {
  return JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data', path), 'utf8'));
}

afterEach(() => vi.unstubAllGlobals());

describe('published environmental observations', () => {
  it.each([
    ['power', 'nasa/power/latest.json'],
    ['roni', 'noaa/roni/latest.json'],
  ] as const)('accepts the published %s file and its contract', (source, path) => {
    const file = published(path);
    expect(validarArchivoIndicadores(file)).toEqual([]);
    expect(() => validateRealSource(file, source)).not.toThrow();
  });

  it('selects the reference for the actual farm, rather than a default location', async () => {
    const dataset = await loadDataset();
    const file = published('nasa/power/latest.json');
    for (const coordinates of [
      [10.8, -85.08, 'N'],
      [10.55, -85.45, 'S'],
    ] as const) {
      const location = placeAt(
        dataset,
        getGeo(dataset).llToLocal(coordinates[0], coordinates[1]),
        null,
      );
      expect(location).not.toBeNull();
      expect(location!.reg).toBe(coordinates[2]);
      const unit = referenceUnit(file, location!.reg);
      expect(unit?.id).toBe(location!.reg);
      expect(referenceDistance({ lat: unit!.lat!, lng: unit!.lon! }, unit)).toBe(0);
    }
    expect(referenceUnit(file, null)).toBeUndefined();
  });

  it('preserves a missing value and a real zero without inventing a measurement', () => {
    const file = published('nasa/power/latest.json');
    const unit = file.datos.items[0];
    unit.indicadores[0].valor = null;
    unit.indicadores[0].estado = 'sin_dato';
    unit.indicadores[1].valor = 0;
    expect(observation(unit, unit.indicadores[0].id)?.valor).toBeNull();
    expect(observation(unit, unit.indicadores[1].id)?.valor).toBe(0);
    expect(() => validateRealSource(file, 'power')).not.toThrow();
  });

  it('rejects simulated values, mismatched sources and lookalike hostnames', () => {
    const file = published('nasa/power/latest.json');
    file.datos.items[0].indicadores[0].simulado = true;
    expect(() => validateRealSource(file, 'power')).toThrow();
    file.datos.items[0].indicadores[0].simulado = false;
    file.meta.url = 'https://nasa.gov.example.com/data';
    expect(() => validateRealSource(file, 'power')).toThrow();
    file.meta.url = 'https://power.larc.nasa.gov/api/temporal/daily/point';
    file.datos.items[0].indicadores[0].fuente = 'noaa-roni';
    expect(() => validateRealSource(file, 'power')).toThrow();
  });

  it('rejects impossible dates, duplicate observations and nonnumeric series', () => {
    expect(validObservationDate('2026-02-30')).toBe(false);
    expect(validObservationDate('2026-02-28')).toBe(true);
    const file = published('nasa/power/latest.json');
    file.datos.items[0].serie![0].fecha = '2026-02-30';
    expect(() => validateRealSource(file, 'power')).toThrow();
    const duplicate = published('nasa/power/latest.json');
    duplicate.datos.items[0].serie!.push(duplicate.datos.items[0].serie![0]);
    expect(() => validateRealSource(duplicate, 'power')).toThrow();
    const invalid = published('nasa/power/latest.json');
    invalid.datos.items[0].serie![0].valores.lluvia = Number.NaN;
    expect(() => validateRealSource(invalid, 'power')).toThrow();
  });

  it('does not use a bundled or simulated fallback when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(loadEnvironmentSource('power', true)).rejects.toThrow();
  });

  it('can retry a failed source and reads the new response', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json(published('nasa/power/latest.json')));
    vi.stubGlobal('fetch', request);
    await expect(loadEnvironmentSource('power', true)).rejects.toThrow();
    await expect(loadEnvironmentSource('power', true)).resolves.toHaveProperty(
      'meta.fuente',
      'nasa-power',
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('calculates age from observation date instead of download time', () => {
    expect(observationAge('2026-11-11', Date.parse('2026-11-15T12:00:00Z'))).toBe(4);
  });
});
