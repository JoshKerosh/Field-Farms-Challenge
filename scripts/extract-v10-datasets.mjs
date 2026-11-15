/**
 * Extrae los datasets reales embebidos en el prototipo v10 (context/) hacia
 * apps/web/src/data/real/*.json. Solo lectura del HTML; no modifica el artefacto.
 *
 *   node scripts/extract-v10-datasets.mjs
 *
 * Los JSON resultantes son copias versionadas de datos oficiales (SAGA/AyA,
 * SNIT/IGN, CNE, NASA POWER/MODIS, NOAA RONI). Ver context/FUENTES_DE_DATOS.md
 * para el origen y el conector futuro de cada uno.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import console from 'node:console';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctxDir = path.join(root, 'context');
const htmlName = fs.readdirSync(ctxDir).find((f) => f.startsWith('Field Farms Challenge') && f.endsWith('.html'));
if (!htmlName) throw new Error('No se encontró el HTML v10 en context/');
const OUT = path.join(root, 'apps/web/src/data/real');

const outer = fs.readFileSync(path.join(ctxDir, htmlName), 'utf8').split(/\r?\n/);
const tplIdx = outer.findIndex((l) => l.trim().startsWith('<script type="__bundler/template"'));
const inner = JSON.parse(outer[tplIdx + 1]);
const L = inner.split(/\r?\n/);

function grab(name) {
  const idx = L.findIndex((l) => l.startsWith(`    const ${name} = `));
  if (idx < 0) throw new Error(`No se encontró ${name}`);
  const expr = L[idx].replace(new RegExp(`^\\s*const ${name} = `), '').replace(/;\s*$/, '');
  return vm.runInNewContext(`(${expr})`);
}

const N = grab('N');
const { fuentes, ops, ...territory } = N;

fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(data));
  console.log(name.padEnd(16), `${(fs.statSync(p).size / 1024).toFixed(1)} KB`);
};

write('territory.json', territory);
write('sources.json', { fuentes, ops });
write('climate.json', { NASA: grab('NASA'), MODIS: grab('MODIS') });
write('fluc.json', grab('FLUC'));
write('history.json', grab('HIST'));
write('riparian.json', { grid: grab('RIPG') });
