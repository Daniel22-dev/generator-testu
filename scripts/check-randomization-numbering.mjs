#!/usr/bin/env node
// GIT 7.1.90 — statický kontrakt randomizace: viditelné číslo = pozice, interní ID beze změny,
// shodný algoritmus pořadí ve studentském testu a verifieru, slova u error-tagging se nemíchají.
import fs from 'node:fs';
import vm from 'node:vm';
const secure = fs.readFileSync('src/js/13e-secure-student-runtime.js', 'utf8');
const verifier = fs.readFileSync('src/js/13f-secure-teacher-verifier.js', 'utf8');
const instant = fs.readFileSync('src/js/14b-instant-test-runtime.js', 'utf8');
let failed = 0; const pass = m => console.log('PASS ' + m); const fail = m => { failed++; console.error('FAIL ' + m); };
const need = (c, m) => c ? pass(m) : fail(m);
const m = secure.match(/const SECURE_QUESTION_ORDER_JS=String\.raw`\n([\s\S]*?)`;\n/);
need(!!m, 'studentský runtime definuje SECURE_QUESTION_ORDER_JS');
const body = m ? m[1] : '';
need(body && verifier.includes(body), 'verifier obsahuje přesnou kopii algoritmu pořadí otázek');
need(/questionOrderBase\(CFG\.testId,currentAttemptId\(\),ACTIVE_KEY,STARTED_AT\)/.test(secure), 'seed pořadí = test, pokus, varianta, start (stabilní po obnovení stránky)');
need(!/studentName'\)&&\$\('studentName'\)\.value,ACTIVE_KEY/.test(secure), 'seed už nezávisí na zápisu jména/kódu');
need(/shuffleElementChildren\(card,'\.q',questionOrderSeed\(base,ei\)\)/.test(secure) && /node\.dataset\.displayNumber=String\(index\+1\)/.test(secure), 'secure: zamíchání se seedem sdíleným s verifierem a přečíslování podle pozice');
need(/data-shuffle-order/.test(secure), 'secure: opakované zamíchání vychází z původního pořadí (shoda s questionOrderFor)');
need(/querySelectorAll\('\.opts:not\(\.et-list\)'\)/.test(secure), 'secure: tokeny error-tagging se nemíchají');
need(/label\.textContent=String\(index\+1\)/.test(instant) && /querySelectorAll\('\.mc-opts:not\(\.et-list\)'\)/.test(instant), 'instant: přečíslování a nemíchání tokenů');
need(/displayOrder\(ei,\(ex\.items\|\|\[\]\)\.length\)\.forEach/.test(instant), 'instant: zpětná vazba v pořadí studenta');
need(/presentedQuestionNumbers\(payload,exs\)/.test(verifier) && /displayQ:pq\.map\[ei\]\[qi\]/.test(verifier), 'verifier: dopočítá číslo otázky u studenta');
need(/randomizace:cfg\.randomizace===true\|\|cfg\.randomizace==='ANO'/.test(verifier), 'verifier CONFIG nese příznak randomizace');
const ctx = vm.createContext({}); vm.runInContext(body + ';globalThis.q=questionOrderFor;globalThis.b=questionOrderBase;globalThis.s=questionOrderSeed;', ctx);
let okPerm = true, moved = 0;
for (let n = 1; n <= 12; n++) for (let t = 0; t < 40; t++) {
  const ord = ctx.q(n, ctx.s(ctx.b('T' + t, 'A' + n, '__default', '2026-10-06T08:00:00.000Z'), t % 5));
  const sorted = ord.slice().sort((x, y) => x - y);
  if (sorted.join(',') !== Array.from({ length: n }, (_, i) => i).join(',')) okPerm = false;
  if (ord.some((v, i) => v !== i)) moved++;
  if (JSON.stringify(ord) !== JSON.stringify(ctx.q(n, ctx.s(ctx.b('T' + t, 'A' + n, '__default', '2026-10-06T08:00:00.000Z'), t % 5)))) okPerm = false;
}
need(okPerm, 'pořadí je vždy úplná permutace a je deterministické');
need(moved > 300, 'pořadí se skutečně mění (' + moved + ' z 480 případů)');
if (failed) process.exit(1);
console.log('PASS randomization numbering contract');
