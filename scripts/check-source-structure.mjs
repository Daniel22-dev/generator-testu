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
const forbidden = ['13-secure-export.js', '14-test-html-builders.js'];
const maxSplitSize = 90 * 1024;

let failed = 0;
function fail(msg){ failed++; console.error('❌ ' + msg); }
function pass(msg){ console.log('✅  ' + msg); }

if (!fs.existsSync(jsDir)) fail('Chybi slozka src/js.');
const files = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort() : [];

for (const name of forbidden) {
  if (files.includes(name)) fail(`Puvodni velky modul ${name} je porad ve zdroji.`);
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

if (!failed) {
  pass(`Zdrojova struktura OK: ${requiredOrder.length} split modulu, bez puvodnich monolitu.`);
}
process.exit(failed ? 1 : 0);
