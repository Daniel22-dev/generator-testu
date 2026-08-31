#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`❌ Studio manifest template: ${message}`);
  process.exit(1);
};

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const templatePath = 'studio/app-manifest.template.json';
const raw = fs.readFileSync(templatePath, 'utf8');
const appVersion = String(pkg.version || '').trim();

if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(appVersion)) {
  fail(`package.json má neplatnou verzi ${appVersion || '(prázdná)'}`);
}

let manifest;
try {
  manifest = JSON.parse(
    raw
      .replaceAll('__APP_VERSION__', appVersion)
      .replaceAll('__BUILD_TIME__', '2000-01-01T00:00:00.000Z'),
  );
} catch (error) {
  fail(`šablona není po substituci platný JSON: ${error.message}`);
}

if (manifest.version !== appVersion) {
  fail(`version ${manifest.version} neodpovídá package.json ${appVersion}`);
}

const expectedCacheName = `ghrab-${manifest.id}-v${appVersion}`;
if (manifest.platform?.cacheName !== expectedCacheName) {
  fail(`platform.cacheName ${manifest.platform?.cacheName || '(chybí)'} neodpovídá ${expectedCacheName}`);
}

const expectedTemplateCache = `ghrab-${manifest.id}-v__APP_VERSION__`;
if (manifest.id && !raw.includes(`"cacheName": "${expectedTemplateCache}"`)) {
  fail(`cacheName musí v šabloně používat __APP_VERSION__: ${expectedTemplateCache}`);
}

if (manifest.platform?.storagePrefix !== `ghrab.${manifest.id}.`) {
  fail(`platform.storagePrefix ${manifest.platform?.storagePrefix || '(chybí)'} neodpovídá ghrab.${manifest.id}.`);
}

console.log(`✅ Studio manifest template: ${manifest.id} ${appVersion}, cache ${expectedCacheName}`);
