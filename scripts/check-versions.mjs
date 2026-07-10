// scripts/check-versions.mjs
// Kontrola, ze vsechny soubory s runtime/PWA verzi ukazuji na stejnou verzi.
// Cilem je zabranit situaci, kdy aplikace ma novy RELEASE, ale service worker
// nebo manifest porad drzi starou cache / start_url.
import fs from 'node:fs';

function fail(message) {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const pkg = JSON.parse(read('package.json'));
const packageVersion = String(pkg.version || '').trim();

const core = read('src/js/01-core.js');
const sw = read('public/sw.js');
const manifest = JSON.parse(read('public/manifest.webmanifest'));

const coreMatch = core.match(/version:\s*['"]([^'"]+)['"]/);
const cacheMatch = sw.match(/CACHE_NAME\s*=\s*['"][^'"]*v([^'"]+)['"]/);
const manifestMatch = String(manifest.start_url || '').match(/[?&]v=([^&]+)/);

const found = {
  'package.json version': packageVersion,
  'src/js/01-core.js RELEASE.version': coreMatch?.[1] || null,
  'public/sw.js CACHE_NAME': cacheMatch?.[1] || null,
  'public/manifest.webmanifest start_url': manifestMatch?.[1] || null,
};

for (const [label, value] of Object.entries(found)) {
  if (!value) fail(`${label} nebyla nalezena.`);
}

const unique = new Set(Object.values(found).filter(Boolean));
if (unique.size > 1) {
  console.error('❌ Nesedi verze napric projektem:');
  for (const [label, value] of Object.entries(found)) {
    console.error(`   - ${label}: ${value || 'NENALEZENO'}`);
  }
  process.exitCode = 1;
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`✅  Verze sedi napric projektem: ${packageVersion}`);
