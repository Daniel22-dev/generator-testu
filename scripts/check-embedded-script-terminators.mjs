import fs from 'node:fs';
import path from 'node:path';

const requested = process.argv.slice(2);
const roots = requested.length ? requested : ['src/js', 'src/features'];
const bad = [];

function walk(target) {
  if (!fs.existsSync(target)) return;
  const st = fs.statSync(target);
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
    return;
  }
  if (!/\.js$/i.test(target)) return;
  const text = fs.readFileSync(target, 'utf8');
  const re = /<\/script(?=[\s/>])/ig;
  let m;
  while ((m = re.exec(text))) {
    const line = text.slice(0, m.index).split('\n').length;
    bad.push(`${target}:${line}`);
  }
}

for (const root of roots) walk(root);
if (bad.length) {
  console.error('❌ Souvislý </script> v JS zdroji může předčasně ukončit obalující inline <script>:');
  for (const item of bad) console.error(`   - ${item}`);
  process.exit(1);
}
console.log(`✅ Embedded-script terminator guard: PASS (${roots.join(', ')})`);
