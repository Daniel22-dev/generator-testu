#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const sourcePath = 'src/js/13f-secure-teacher-verifier.js';
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Chybí funkce ${name}`);
  const open = source.indexOf('{', start);
  if (open < 0) throw new Error(`Chybí tělo funkce ${name}`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1] || '';
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Neukončené tělo funkce ${name}`);
}

const names = [
  'normStudentKey',
  'rebuildDuplicateState',
  'duplicateInfo',
  'effectiveResults',
  'unresolvedAttemptConflicts',
  'iaPearson',
  'iaMedian',
  'iaSum',
  'iaTopWrongAnswers',
  'distributionStats',
  'itemAnalysisRows',
];

const ctx = vm.createContext({ console });
vm.runInContext(`var RESULTS=[]; var ATTEMPT_DECISIONS=new Map();\n${names.map(extractFunction).join('\n')}`, ctx);

function row({student, digest, attempt, pct, grade, earned, group='__default', ok=true, answer='x'}) {
  return {
    status: 'OK', student, submissionDigest: digest, attemptId: attempt,
    pct, grade, earned, total: 10, groupKey: group,
    details: [{ex:1,q:1,prompt:'Q1',type:'multiple choice',pts:ok?1:0,total:1,ok,student:answer}],
  };
}

function load(rows, decisions = []) {
  ctx.RESULTS.splice(0, ctx.RESULTS.length, ...rows);
  ctx.ATTEMPT_DECISIONS.clear();
  for (const [k,v] of decisions) ctx.ATTEMPT_DECISIONS.set(k,v);
}

function snap() {
  return {
    effective: ctx.effectiveResults().map(r => r.submissionDigest),
    unresolved: ctx.unresolvedAttemptConflicts(),
    distribution: ctx.distributionStats(),
    items: ctx.itemAnalysisRows(),
  };
}

function assert(cond, msg) { if (!cond) throw new Error(msg); console.log(`PASS ${msg}`); }

// 1) Exact duplicate must never inflate class distribution or item n.
load([
  row({student:'Alice',digest:'a1',attempt:'A1',pct:80,grade:2,earned:8,ok:true}),
  row({student:'Alice',digest:'a1',attempt:'A1-copy',pct:80,grade:2,earned:8,ok:true}),
  row({student:'Bob',digest:'b1',attempt:'B1',pct:60,grade:3,earned:6,ok:false,answer:'y'}),
]);
let s = snap();
assert(s.effective.length === 2, 'exact duplicate: effectiveResults má 2 výsledky');
assert(s.distribution.n === 2, 'exact duplicate: distributionStats.n používá effectiveResults');
assert(s.distribution.mean === 70, 'exact duplicate: průměr není nafouknut duplicitou');
assert(s.items.length === 1 && s.items[0].n === 2, 'exact duplicate: itemAnalysisRows.n používá effectiveResults');

// 2) Distinct attempts for the same student are excluded until teacher resolves them.
load([
  row({student:'Alice',digest:'a-old',attempt:'A-old',pct:40,grade:4,earned:4,ok:false,answer:'old'}),
  row({student:'Alice',digest:'a-new',attempt:'A-new',pct:90,grade:1,earned:9,ok:true,answer:'new'}),
  row({student:'Bob',digest:'b1',attempt:'B1',pct:60,grade:3,earned:6,ok:false,answer:'b'}),
]);
s = snap();
assert(s.unresolved.length === 1, 'unresolved attempts: konflikt je detekován');
assert(s.effective.length === 1 && s.effective[0] === 'b1', 'unresolved attempts: oba Alice pokusy jsou do rozhodnutí vyřazeny');
assert(s.distribution.n === 1 && s.distribution.mean === 60, 'unresolved attempts: distribuce obsahuje jen efektivní výsledky');
assert(s.items.length === 1 && s.items[0].n === 1, 'unresolved attempts: položková analýza obsahuje jen efektivní výsledky');

// 3) After explicit teacher choice, exactly the selected attempt enters all analytics.
ctx.ATTEMPT_DECISIONS.set('alice', 'a-new');
s = snap();
assert(s.unresolved.length === 0, 'resolved attempt: konflikt po výběru zmizí');
assert(s.effective.length === 2 && s.effective.includes('a-new') && !s.effective.includes('a-old'), 'resolved attempt: započítá se jen zvolený pokus');
assert(s.distribution.n === 2 && s.distribution.mean === 75, 'resolved attempt: distribuce používá zvolený pokus');
assert(s.items.length === 1 && s.items[0].n === 2, 'resolved attempt: položková analýza používá zvolený pokus');

// Contract guard: all analytics entry points must use the same authority.
const distributionSource = extractFunction('distributionStats');
const itemSource = extractFunction('itemAnalysisRows');
const analysisSource = extractFunction('analysisHtml');
assert(/var ok=effectiveResults\(\)/.test(distributionSource), 'contract: distributionStats je napojen na effectiveResults');
assert(/var ok=effectiveResults\(\)/.test(itemSource), 'contract: itemAnalysisRows je napojen na effectiveResults');
assert(/var ok=effectiveResults\(\)/.test(analysisSource), 'contract: analysisHtml je napojen na effectiveResults');

console.log('PASS Teacher Verifier effective analytics regression');
