import { describe, expect, it } from 'vitest';
import { validarArchivoIndicadores, validarIndicador, validarMeta } from './index';

const meta = {
  fuente: 'nasa-power',
  url: 'https://power.larc.nasa.gov/api/temporal/daily/point',
  capa: 'nasa',
  simulado: false,
  fecha_dato: '2026-11-11',
  fecha_carga: '2026-11-15T03:49:28Z',
  version: 1,
};
const ind = {
  id: 'lluvia_30d',
  nombre: 'Lluvia de 30 días',
  valor: 411.9,
  unidad: 'mm',
  estado: 'sin_evaluar',
  fuente: 'nasa-power',
  fecha: '2026-11-11',
  simulado: false,
  capa: 'nasa',
};
const archivo = (i: object = ind) => ({
  meta,
  datos: { unidad: 'zona', items: [{ id: 'N', nombre: 'Zona Norte', indicadores: [i] }] },
});

describe('contrato de indicador', () => {
  it('acepta un archivo válido', () => {
    expect(validarArchivoIndicadores(archivo())).toEqual([]);
  });

  it('exige meta con fecha y url', () => {
    expect(validarMeta({ ...meta, url: 'power.larc.nasa.gov', fecha_dato: '11/11/2026' })).toEqual([
      'meta.url debe empezar con http(s)://',
      'meta.fecha_dato debe ser AAAA-MM-DD',
    ]);
    expect(validarMeta(undefined)).toEqual(['falta "meta"']);
  });

  it('un valor nulo solo puede ir con estado sin_dato', () => {
    expect(validarIndicador({ ...ind, valor: null })).toContain(
      'indicador: sin valor el estado debe ser sin_dato',
    );
    expect(validarIndicador({ ...ind, valor: null, estado: 'sin_dato' })).toEqual([]);
  });

  it('rechaza un indicador simulado dentro de un archivo real', () => {
    expect(validarArchivoIndicadores(archivo({ ...ind, simulado: true }))).toEqual([
      'items[0].indicadores[0].simulado no coincide con meta.simulado',
    ]);
  });
});
