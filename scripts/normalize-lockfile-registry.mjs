import fs from 'node:fs';

const file = 'package-lock.json';
const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = 0;
for (const [pkgPath, meta] of Object.entries(lock.packages || {})) {
  if (!meta || typeof meta.resolved !== 'string' || !/internal\.api|openai\.org\/artifactory|applied-caas/i.test(meta.resolved)) continue;
  const marker = 'node_modules/';
  const pos = pkgPath.lastIndexOf(marker);
  if (pos < 0 || !meta.version) throw new Error(`Nelze odvodit npm balíček pro ${pkgPath}`);
  const rel = pkgPath.slice(pos + marker.length);
  const parts = rel.split('/');
  const name = rel.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const tarName = name.includes('/') ? name.split('/').pop() : name;
  meta.resolved = `https://registry.npmjs.org/${name}/-/${tarName}-${meta.version}.tgz`;
  changed++;
}
fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
console.log(`✅  Lockfile normalizován na registry.npmjs.org (${changed} URL).`);
