import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'public'];
const textExt = new Set(['.js', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.webmanifest']);
const files = [];
function collect(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (textExt.has(path.extname(entry.name)) || entry.name.endsWith('.webmanifest')) files.push(full);
  }
}
roots.forEach(collect);
const rules = [
  {label:'reálný Gemini API klíč', re:/AIza[0-9A-Za-z_-]{30,}/g},
  {label:'e-mailová adresa', re:/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g},
  {label:'české rodné číslo', re:/(?<!\d)(?:\d{2})(?:0[1-9]|1[0-2]|2[1-9]|3[0-2]|5[1-9]|6[0-2]|7[1-9]|8[0-2])(?:0[1-9]|[12]\d|3[01])\/?\d{3,4}(?!\d)/g},
];
let failed = 0;
for (const file of files) {
  const txt = fs.readFileSync(file, 'utf8');
  for (const rule of rules) {
    const hits = [...txt.matchAll(rule.re)];
    if (hits.length) {
      console.error(`❌ ${file}: nalezen ${rule.label} (${hits[0][0].slice(0, 18)}…).`);
      failed++;
    }
  }
}
if (!failed) console.log(`✅  Obecná kontrola citlivých údajů prošla (${files.length} veřejných zdrojových souborů).`);
process.exit(failed ? 1 : 0);
