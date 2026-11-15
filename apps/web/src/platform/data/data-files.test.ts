import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  validarArchivoIndicadores,
  validarMeta,
  parseRiskPolicies,
  type CatalogoFuentes,
  type Fuente,
} from '@field-farms/domain';
import { ARCHIVOS } from './data-files';
import { parseAlertSource } from '../../features/alerts/data/alert-sources';
import { parseCneSource } from '../../features/alerts/data/cne-source';
import { parseHazardMap } from '../../features/alerts/data/hazard-map';
import { parseConditionMap } from '../../features/alerts/data/condition-map';
import { parseNasaRegions } from '../../features/alerts/data/nasa-regions';

/**
 * Quality guard for `public/data/`: runs in `npm test` and in CI. If a connector publishes something
 * malformed, without a source, or simulated where real data belongs, the test fails.
 */
const DATA = join(__dirname, '../../../public/data');
const catalogo = JSON.parse(readFileSync(join(DATA, 'fuentes.json'), 'utf-8')) as CatalogoFuentes;

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? archivos(path)
      : [relative(DATA, path).split(sep).join('/')];
  });
}

const cubre = (patron: string, path: string) =>
  patron.endsWith('/*') ? path.startsWith(patron.slice(0, -1)) : patron === path;
const fuenteDe = (path: string): Fuente | undefined =>
  catalogo.fuentes.find((f) => f.archivos.some((p) => cubre(p, path)));
const leer = (path: string) =>
  JSON.parse(readFileSync(join(DATA, path), 'utf-8')) as Record<string, unknown>;

const todos = archivos(DATA).filter((p) => p !== 'fuentes.json' && !p.startsWith('esquemas/'));
// The geo/ layers published before the contract have no `meta`; their source is in the catalog.
const conMeta = todos.filter(
  (p) =>
    !p.startsWith('alerts/') &&
    (p.endsWith('.json') || p.startsWith('geo/cne/') || p.startsWith('geo/sinac/')),
);

// Alert files have versioned scientific/provenance schemas of their own. Validate them with
// the same readers as the UI, while every file still has to belong to the shared catalog.
describe('formatos publicados de alertas', () => {
  it.each(todos.filter((p) => p.startsWith('alerts/')))('%s cumple su contrato', (path) => {
    const json = leer(path);
    switch (json.schemaVersion) {
      case 'alert-source-v1':
        expect(['power', 'roni']).toContain(json.kind);
        expect(parseAlertSource(json, json.kind as 'power' | 'roni')).not.toBeNull();
        break;
      case 'alert-cne-v1':
        expect(parseCneSource(json)).not.toBeNull();
        break;
      case 'alert-cne-map-v1':
        expect(parseHazardMap(json)).not.toBeNull();
        break;
      case 'alert-condition-map-v1':
        expect(parseConditionMap(json)).not.toBeNull();
        break;
      case 'alert-nasa-regions-v1':
        expect(parseNasaRegions(json)).not.toBeNull();
        break;
      case 'alert-risk-policies-v1':
        expect(json.policies).toEqual([]);
        expect(parseRiskPolicies(json)).toEqual({});
        expect(json.pendingApproval).toEqual([
          'sequia',
          'inundacion',
          'saturacion',
          'deslizamiento',
        ]);
        break;
      default:
        expect(path.endsWith('status.json')).toBe(true);
        expect(Number.isFinite(Date.parse(String(json.attemptedAt)))).toBe(true);
        expect(['ok', 'failed']).toContain(json.status);
        expect(typeof json.lastValidAvailable).toBe('boolean');
    }
  });
});

/** Hosts accepted as the origin of real data in the NASA layer. */
const HOSTS_NASA = ['nasa.gov', 'noaa.gov', 'ornl.gov'];

describe('catálogo fuentes.json', () => {
  it('tiene ids únicos', () => {
    const ids = catalogo.fuentes.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada archivo de public/data pertenece a una fuente del catálogo', () => {
    expect(todos.filter((p) => !fuenteDe(p))).toEqual([]);
  });

  it('cada archivo declarado existe, salvo de un conector que nunca ha tenido un dato bueno', () => {
    const faltan = catalogo.fuentes
      .filter((f) => !(f.estado === 'falla' && f.ultima_carga_buena === null))
      .flatMap((f) => f.archivos)
      .filter((p) => !todos.some((t) => cubre(p, t)));
    expect(faltan).toEqual([]);
  });

  it('solo las fuentes simuladas tienen estado simulado', () => {
    for (const f of catalogo.fuentes) expect(f.estado === 'simulado', f.id).toBe(f.simulado);
  });
});

describe.each(conMeta)('%s', (path) => {
  const json = leer(path);
  const f = fuenteDe(path)!;

  it('tiene un encabezado meta válido que coincide con su fuente', () => {
    expect(validarMeta(json.meta)).toEqual([]);
    const meta = json.meta as { fuente: string; simulado: boolean; capa: string; url: string };
    expect(meta.fuente).toBe(f.id);
    expect(meta.simulado).toBe(f.simulado);
    expect(meta.capa).toBe(f.capa);
  });

  it('si es dato NASA real, viene de un servicio de NASA o NOAA', () => {
    const meta = json.meta as { simulado: boolean; capa: string; url: string };
    if (meta.capa !== 'nasa' || meta.simulado) return;
    const host = new URL(meta.url).hostname;
    expect(
      HOSTS_NASA.some((h) => host === h || host.endsWith(`.${h}`)),
      host,
    ).toBe(true);
  });

  it('solo los archivos de ejemplos/ son simulados', () => {
    expect((json.meta as { simulado: boolean }).simulado).toBe(path.startsWith('ejemplos/'));
  });
});

describe('archivos de indicadores', () => {
  it.each(Object.values(ARCHIVOS).filter((p) => todos.includes(p)))(
    '%s cumple el contrato',
    (path) => {
      expect(validarArchivoIndicadores(leer(path))).toEqual([]);
    },
  );

  it('los conectores reales ya publicaron POWER y RONI', () => {
    expect(todos).toContain(ARCHIVOS.power);
    expect(todos).toContain(ARCHIVOS.roni);
  });
});
