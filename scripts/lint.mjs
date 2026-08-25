import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveOptional(specifier) {
  try {
    return require.resolve(specifier, { paths: [root] });
  } catch {
    return null;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'archive', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(?:m?js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const eslintBin = resolveOptional('eslint/bin/eslint.js')
  || (fs.existsSync(path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js'))
    ? path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js')
    : null);
const espree = resolveOptional('espree');
const globals = resolveOptional('globals');

if (eslintBin && espree && globals) {
  run(process.execPath, ['scripts/generate-eslint-globals.mjs']);
  run(process.execPath, [eslintBin, '.']);
  process.exit(0);
}

const missing = [
  !eslintBin && 'eslint',
  !espree && 'espree',
  !globals && 'globals',
].filter(Boolean);

console.warn(`⚠️  Plný ESLint nelze v tomto prostředí spustit (chybí: ${missing.join(', ')}).`);
console.warn('    Aktivován hermetický fallback: parser classic scriptů + node --check modulů.');
console.warn('    V CI po npm ci zůstává automaticky aktivní plný ESLint se stejnou konfigurací.');

const files = [
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'public')),
  ...walk(path.join(root, 'scripts')),
  ...walk(path.join(root, 'tools')),
  path.join(root, 'eslint.config.mjs'),
  path.join(root, 'eslint-globals.generated.mjs'),
].filter((file, index, list) => fs.existsSync(file) && list.indexOf(file) === index).sort();

let checked = 0;
for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const source = fs.readFileSync(file, 'utf8');
  const isModule = rel.endsWith('.mjs')
    || rel.startsWith('scripts/')
    || rel.startsWith('tools/')
    || /^\s*(?:import|export)\s/m.test(source);
  if (isModule) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: root,
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      process.exit(result.status ?? 1);
    }
  } else {
    try {
      new vm.Script(source, { filename: rel });
    } catch (error) {
      console.error(error?.stack || error);
      process.exit(1);
    }
  }
  checked++;
}

if (!fs.readFileSync(path.join(root, 'eslint-globals.generated.mjs'), 'utf8').includes('export const projectGlobals')) {
  console.error('❌  eslint-globals.generated.mjs neobsahuje očekávaný export projectGlobals.');
  process.exit(1);
}

console.log(`✅  Hermetická syntaktická kontrola prošla (${checked} souborů).`);
