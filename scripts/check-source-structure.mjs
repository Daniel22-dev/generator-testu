// Kontrola zdrojove struktury po opatrne modularizaci velkych bloku.
// Nehodnoti funkcni chovani aplikace; hlida, ze se omylem nevratil puvodni monolit
// a ze build bude skladat klicove moduly ve spravnem poradi.
import fs from 'node:fs';
import path from 'node:path';

const jsDir = path.resolve('src/js');
const requiredOrder = [
  '13a-secure-helpers.js',
  '13b-secure-shared-scoring.js',
  '13c-secure-package.js',
  '13d-secure-student-shell.js',
  '13e-secure-student-runtime.js',
  '13f-secure-teacher-verifier.js',
  '13g-assemble-test-html.js',
  '14a-test-html-builders.js',
  '14b-instant-test-runtime.js',
  '14c-test-css.js',
  '14d-generator-release-guides.js',
];
const migrated = ['13-secure-export.js', '14-test-html-builders.js'];
const maxSplitSize = 90 * 1024;
const lazyFeatures = ['features/testlab.js', 'features/preview-editor.js'];

let failed = 0;
function fail(msg){ failed++; console.error('❌ ' + msg); }
function pass(msg){ console.log('✅  ' + msg); }

if (!fs.existsSync(jsDir)) fail('Chybi slozka src/js.');
const files = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort() : [];

for (const name of migrated) {
  if (!files.includes(name)) continue;
  const text = fs.readFileSync(path.join(jsDir, name), 'utf8');
  const size = fs.statSync(path.join(jsDir, name)).size;
  if (!text.includes('MIGRATION_TOMBSTONE') || size > 2048) fail(`Puvodni velky modul ${name} je porad ve zdroji.`);
}

let lastIndex = -1;
for (const name of requiredOrder) {
  const idx = files.indexOf(name);
  if (idx === -1) { fail(`Chybi modul ${name}.`); continue; }
  if (idx <= lastIndex) fail(`Modul ${name} neni ve spravnem abecednim poradi.`);
  lastIndex = idx;
  const size = fs.statSync(path.join(jsDir, name)).size;
  if (size > maxSplitSize) fail(`${name} je moc velky (${Math.round(size/1024)} kB); cil po deleni je pod 90 kB.`);
}

for (const rel of lazyFeatures) {
  const target = path.resolve('src', rel);
  if (!fs.existsSync(target)) fail(`Chybi lazy modul ${rel}.`);
  else if (fs.statSync(target).size < 8 * 1024) fail(`Lazy modul ${rel} je podezrele maly.`);
}
const inlineTestLab = fs.readFileSync(path.join(jsDir, '10-testlab.js'), 'utf8');
const inlineEditor = fs.readFileSync(path.join(jsDir, '11-preview-editor.js'), 'utf8');
if (inlineTestLab.length > 24 * 1024) fail('Test Lab loader je prilis velky; admin diagnostika se vratila do initial payloadu.');
if (inlineEditor.length > 12 * 1024) fail('Preview/editor loader je prilis velky; editor se vratil do initial payloadu.');

if (!failed) {
  pass(`Zdrojova struktura OK: ${requiredOrder.length} split modulu, puvodni nazvy pouze jako migracni tombstones.`);
}
process.exit(failed ? 1 : 0);
