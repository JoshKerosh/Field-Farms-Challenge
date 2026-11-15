import type {
  Climate,
  Dataset,
  FlucData,
  HistoryEntry,
  Sources,
  Territory,
} from './types';
import { fixName } from '../engine/format';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Descomprime la cuadrícula riparia: '.' celda vacía, '*n' salto, 8 caracteres por celda de 3 km. */
export function decodeRip(grid: string): Record<string, string> {
  const out: Record<string, string> = {};
  grid.split('\n').forEach((row, cj) => {
    let i = 0;
    let ci = 0;
    while (i < row.length) {
      const c = row[i];
      if (c === '.') {
        i++;
        ci++;
      } else if (c === '*') {
        ci += A.indexOf(row[i + 1]);
        i += 2;
      } else {
        out[`${ci},${cj}`] = row.slice(i, i + 8);
        i += 8;
        ci++;
      }
    }
  });
  return out;
}

export function buildDataset(parts: {
  territory: Territory;
  sources: Sources;
  climate: Climate;
  fluc: FlucData;
  history: HistoryEntry[];
  riparian: { grid: string };
}): Dataset {
  const territory = parts.territory;
  // Los archivos de origen vienen sin tildes en algunos nombres (Rio, Canton…).
  territory.subs.forEach((s) => {
    s.n = fixName(s.n);
  });
  territory.cantons.forEach((c) => {
    c.n = fixName(c.n);
  });
  territory.places.forEach((p) => {
    p[0] = fixName(p[0]);
    p[1] = fixName(p[1]);
    p[2] = fixName(p[2]);
  });
  parts.sources.ops.forEach((o) => {
    o[0] = fixName(o[0]);
  });
  return {
    territory,
    sources: parts.sources,
    climate: parts.climate,
    fluc: parts.fluc,
    history: parts.history,
    rip: decodeRip(parts.riparian.grid),
  };
}

let pending: Promise<Dataset> | undefined;

/**
 * Carga los datasets reales (≈700 KB sin comprimir) una sola vez. Los JSON
 * quedan en chunks separados y el service worker los precarga para uso sin conexión.
 */
export function loadDataset(): Promise<Dataset> {
  pending ??= (async () => {
    const [territory, sources, climate, fluc, history, riparian] = await Promise.all([
      import('./territory.json'),
      import('./sources.json'),
      import('./climate.json'),
      import('./fluc.json'),
      import('./history.json'),
      import('./riparian.json'),
    ]);
    return buildDataset({
      // structuredClone: el módulo JSON es compartido y buildDataset normaliza nombres.
      territory: structuredClone(territory.default) as unknown as Territory,
      sources: structuredClone(sources.default) as unknown as Sources,
      climate: climate.default as unknown as Climate,
      fluc: fluc.default as unknown as FlucData,
      history: history.default as unknown as HistoryEntry[],
      riparian: riparian.default as { grid: string },
    });
  })();
  return pending;
}
