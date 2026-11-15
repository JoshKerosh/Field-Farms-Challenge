/** Local verification only: no installs, credentials, downloads of environmental data or Git mutations. */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flags = process.argv.slice(2);
if (flags.includes('--help')) {
  console.log('npm run verify:alerts [-- --browser]');
  console.log(
    'Verifica tipos, lint, pruebas TypeScript/Python y compilación. --browser añade Alertas en escritorio y móvil.',
  );
  process.exit(0);
}
if (flags.some((flag) => flag !== '--browser')) {
  console.error('Opción desconocida. Usa npm run verify:alerts -- --help');
  process.exit(2);
}
const npm = process.env.npm_execpath;
if (!npm) {
  console.error('Ejecuta este archivo mediante npm run verify:alerts.');
  process.exit(2);
}
const python = join(
  root,
  'jobs',
  'data-pipeline',
  '.venv',
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);
if (!existsSync(python)) {
  console.error(
    'Falta jobs/data-pipeline/.venv. Consulta jobs/data-pipeline/IMERG.md para prepararlo.',
  );
  process.exit(2);
}
const env = { ...process.env };
if (flags.includes('--browser') && process.platform === 'win32' && !env.PLAYWRIGHT_CHANNEL) {
  const edge = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles]
    .filter(Boolean)
    .some((path) => existsSync(join(path, 'Microsoft', 'Edge', 'Application', 'msedge.exe')));
  if (edge) env.PLAYWRIGHT_CHANNEL = 'msedge';
}

function run(label, executable, args) {
  console.log(`\n${label}`);
  const result = spawnSync(executable, args, { cwd: root, env, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    console.error(`Validación detenida: ${label}. No se completaron todos los controles.`);
    process.exit(result.status || 1);
  }
}
const npmRun = (script, args = []) => run(script, process.execPath, [npm, 'run', script, ...args]);
npmRun('typecheck');
npmRun('lint');
npmRun('test');
run('Pruebas Python', python, ['-m', 'pytest', 'jobs/data-pipeline/tests', '-q']);
npmRun('build');
if (flags.includes('--browser'))
  npmRun('test:e2e', [
    '--',
    'tests/e2e/alerts.spec.ts',
    'tests/e2e/alert-observations.spec.ts',
    'tests/e2e/condition-risk-map.spec.ts',
    'tests/e2e/nasa-regions.spec.ts',
  ]);
console.log(
  '\nValidación completada. Esto verifica el software; no aprueba umbrales científicos ni fuentes pendientes.',
);
