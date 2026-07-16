import fs from 'node:fs';
import path from 'node:path';

const swPath = path.resolve('dist/sw.js');
if (!fs.existsSync(swPath)) {
  console.error('❌ Chybí dist/sw.js. Nejdřív spusť build.');
  process.exit(1);
}
const sw = fs.readFileSync(swPath, 'utf8');
const block = sw.match(/const\s+CORE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
if (!block) {
  console.error('❌ V dist/sw.js nebyl nalezen CORE_ASSETS.');
  process.exit(1);
}
const assets = [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
if (!assets.length) {
  console.error('❌ CORE_ASSETS je prázdný.');
  process.exit(1);
}
const missing = [];
for (const asset of assets) {
  let rel = asset.replace(/^\.\//, '').split(/[?#]/, 1)[0];
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const target = path.resolve('dist', rel);
  if (!fs.existsSync(target)) missing.push(`${asset} -> ${path.relative(process.cwd(), target)}`);
}
if (!/key\.startsWith\(CACHE_PREFIX\)\s*&&\s*key\s*!==\s*CACHE_NAME/.test(sw)) {
  console.error('❌ Service worker při aktivaci nemaže cache izolovaně podle vlastního prefixu.');
  process.exit(1);
}
if (/access-manifest\.json/.test(sw)) {
  console.error('❌ Service worker stále odkazuje na odstraněný access-manifest.json.');
  process.exit(1);
}
if (missing.length) {
  console.error('❌ Service worker precache odkazuje na neexistující soubory:');
  missing.forEach(x => console.error('   - ' + x));
  process.exit(1);
}
console.log(`✅  Service worker precache je konzistentní (${assets.length}/${assets.length} souborů existuje).`);
