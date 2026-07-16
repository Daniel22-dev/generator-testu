import fs from 'node:fs';

const file = 'package-lock.json';
if (!fs.existsSync(file)) {
  console.error('❌ Chybí package-lock.json.');
  process.exit(1);
}
const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
const resolved = [];
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.resolved === 'string') resolved.push(value.resolved);
  for (const child of Object.values(value)) walk(child);
}
walk(lock);
const forbidden = resolved.filter(url => /internal\.api|openai\.org\/artifactory|applied-caas/i.test(url));
const publicNpm = resolved.filter(url => url.startsWith('https://registry.npmjs.org/'));
if (forbidden.length) {
  console.error('❌ package-lock.json obsahuje interní registry URL:');
  forbidden.slice(0, 5).forEach(url => console.error('   - ' + url));
  process.exit(1);
}
if (!publicNpm.length) {
  console.error('❌ package-lock.json neobsahuje žádné balíčky z veřejného registry.npmjs.org.');
  process.exit(1);
}
console.log(`✅  Lockfile používá veřejný npm registr (${publicNpm.length} resolved URL, 0 interních).`);
