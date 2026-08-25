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
const lock = JSON.parse(read('package-lock.json'));

const core = read('src/js/01-core.js');
const sw = read('public/sw.js');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const jsonVersion = file => String(JSON.parse(read(file)).appVersion || JSON.parse(read(file)).version || '').trim();

const coreMatch = core.match(/version:\s*['"]([^'"]+)['"]/);
const cacheMatch = sw.match(/CACHE_NAME\s*=\s*['"][^'"]*v([^'"]+)['"]/);
const manifestMatch = String(manifest.version || '').trim();

const found = {
  'package.json version': packageVersion,
  'package-lock.json version': String(lock.version || '').trim(),
  'package-lock.json root package version': String(lock.packages?.['']?.version || '').trim(),
  'src/js/01-core.js RELEASE.version': coreMatch?.[1] || null,
  'public/sw.js CACHE_NAME': cacheMatch?.[1] || null,
  'public/manifest.webmanifest version': manifestMatch || null,
  'src/shell.html app version': read('src/shell.html').match(/data-ghrab-app-version="([^"]+)"/)?.[1] || null,
  'src/js/07z-ai-core-integration.js app version': read('src/js/07z-ai-core-integration.js').match(/GEN_AI_APP=.*?version:'([^']+)'/)?.[1] || null,
  'public/access/error-reporter-adapter.js app version': read('public/access/error-reporter-adapter.js').match(/appVersion:\s*'([^']+)'/)?.[1] || null,
  'public/ai-operations.json appVersion': jsonVersion('public/ai-operations.json'),
  'public/config/data-manifest.json appVersion': jsonVersion('public/config/data-manifest.json'),
  'public/config/platform-manifest.json appVersion': jsonVersion('public/config/platform-manifest.json'),
  'public/config/release-acceptance.json appVersion': jsonVersion('public/config/release-acceptance.json'),
  'public/config/security-headers.json version': jsonVersion('public/config/security-headers.json'),
  'ghrab-platform.consumer.json appVersion': jsonVersion('ghrab-platform.consumer.json'),
  'public/ghrab-platform.consumer.json appVersion': jsonVersion('public/ghrab-platform.consumer.json'),
  'qa/qa-manifest.json appVersion': jsonVersion('qa/qa-manifest.json'),
  'reporter-test.config.json version': jsonVersion('reporter-test.config.json'),
  'public/manual/index.html version': read('public/manual/index.html').match(/data-ghrab-app-version="([^"]+)"/)?.[1] || null,
};


if (manifest.id !== './' || manifest.start_url !== './') {
  fail('PWA manifest musí mít stabilní relativní id a start_url bez verzního parametru.');
}

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
