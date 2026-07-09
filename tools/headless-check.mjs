// tools/headless-check.mjs
// Headless verifikace Generátoru testů (jsdom). Používá se jako "definition of done"
// v každém vlákně modularizace: soubor musí projít 100% stejně před úpravou i po ní.
//
// Instalace:  npm i -D jsdom
// Spuštění:   node tools/headless-check.mjs [cesta/k/index.html]
//             (výchozí: dist/index.html — spusť nejdřív `node scripts/build.mjs`)
// Exit code:  0 = vše OK, 1 = jakýkoli FAIL nebo JS chyba

import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

const target = process.argv[2] || 'dist/index.html';
const html = fs.readFileSync(target, 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://daniel22-dev.github.io/generator-testu/',
  pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    w.URL.createObjectURL = () => 'blob:fake';
    w.URL.revokeObjectURL = () => {};
    w.__errors = [];
    w.addEventListener('error', e => w.__errors.push(String(e.message || e.error)));
    w.fetch = async (u) => { throw new Error('network disabled in harness: ' + u); };
  }
});

const w = dom.window;
await new Promise(r => setTimeout(r, 1500));

let failed = 0;
const check = (name, fn) => {
  try { const v = fn(); console.log('PASS', name, v !== undefined ? '→ ' + String(v).slice(0, 80) : ''); }
  catch (e) { failed++; console.log('FAIL', name, '—', e.message); }
};

console.log('=== headless-check:', target, '===');
check('boot bez JS chyb', () => { if (w.__errors.length) throw new Error(w.__errors.join(' | ')); });
check('RELEASE definován', () => w.eval('RELEASE.version + " · " + RELEASE.date'));
check('changelog max 10 záznamů', () => { const n = w.eval('RELEASE.changes.length'); if (n > 10) throw new Error(n + ' záznamů'); return n; });
check('buildPrompt() > 500 znaků', () => { const n = w.buildPrompt().length; if (n < 500) throw new Error('jen ' + n); return n; });
check('exportZadani() bez výjimky', () => w.exportZadani());
check('setAppMode advanced/simple', () => { w.setAppMode('advanced'); w.setAppMode('simple'); });
check('validate + applyVisualState', () => { w.validate(); w.applyVisualState(); });
check('přepnutí jazyka čeština↔angličtina', () => { w.pickJazyk('čeština'); w.pickJazyk('angličtina'); });
check('appModeSummary element existuje a má text', () => {
  const el = w.document.getElementById('appModeSummary');
  if (!el || !el.textContent.trim()) throw new Error('chybí nebo prázdný');
});

// všech 7 jednoduchých šablon
for (const [lang, ids] of [['angličtina', ['fl_practice','fl_homework','fl_graded_quick','fl_strict']], ['čeština', ['cs_practice','cs_text','cs_strict']]]) {
  w.eval(`pickJazyk('${lang}')`);
  for (const id of ids) check('šablona ' + id, () => { w.eval(`chooseSimpleTemplate('${id}')`); return w.eval('state.testMode+"/"+state.resultMode+"/"+state.feedbackMode'); });
}

// Test Lab jako admin
w.eval("Access.profile={role:'admin',userId:'BALAZ',displayName:'Admin',status:'active'};Access.granted=true;");
const checks = w.tlChecks();
let pass = 0, fail = 0, warn = 0;
for (const c of checks) {
  let r;
  try { r = await c.run(); } catch (e) { r = { status: 'fail', name: c.name, message: String(e && e.message || e) }; }
  if (r.status === 'pass') pass++;
  else if (r.status === 'warn') warn++;
  else { fail++; console.log('TESTLAB FAIL:', r.name, '—', r.message); }
}
console.log(`Test Lab: ${pass} pass / ${warn} warn / ${fail} fail`);
if (fail > 0) failed++;

check('žádné JS chyby po celém běhu', () => { if (w.__errors.length) throw new Error(w.__errors.slice(0, 5).join(' | ')); });

console.log(failed ? `\n❌ ${failed} kontrol selhalo` : '\n✅ Vše prošlo');
process.exit(failed ? 1 : 0);
