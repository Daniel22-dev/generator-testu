import fs from 'node:fs';
import path from 'node:path';

const root = '.github/workflows';
const files = fs.readdirSync(root)
  .filter(name => /\.ya?ml$/i.test(name))
  .map(name => path.join(root, name));
let failed = 0;
let checked = 0;

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/\buses:\s*([^\s#]+)/);
    if (!match || match[1].startsWith('./')) return;
    checked++;
    const at = match[1].lastIndexOf('@');
    const ref = at >= 0 ? match[1].slice(at + 1) : '';
    if (!/^[0-9a-f]{40}$/i.test(ref)) {
      failed++;
      console.error(`❌ ${file}:${index + 1}: externí GitHub Action není připnutá plným commit SHA (${match[1]}).`);
    }
  });
}

if (!failed) console.log(`✅  Externí GitHub Actions jsou připnuté plným commit SHA (${checked} použití).`);
process.exit(failed ? 1 : 0);
