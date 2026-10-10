import fs from 'node:fs';
import vm from 'node:vm';

const helperPath = 'src/js/13a-secure-helpers.js';
const original = fs.readFileSync(helperPath, 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Function not found: ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escape = false, inLine = false, inBlock = false;
  for (let i = brace; i < source.length; i++) {
    const char = source[i], next = source[i + 1] || '';
    if (inLine) { if (char === '\n') inLine = false; continue; }
    if (inBlock) { if (char === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (char === '\\') { escape = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { inLine = true; i++; continue; }
    if (char === '/' && next === '*') { inBlock = true; i++; continue; }
    if ('"\`'.includes(char) || char === "'") { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

function collectorFrom(source) {
  const context = vm.createContext({ console });
  vm.runInContext(`function normalizeType(s){return String(s||'').trim().toLowerCase();} function specialStyleKey(){return '';}`, context);
  for (const name of ['valueText','hasAnyText','fidelityNormalizedText','fidelityContentTokens','fidelityItemStem','fidelitySimilarity','fidelityStyleKey','collectPedagogicalFidelityIssues']) {
    vm.runInContext(extractFunction(source, name), context);
  }
  return vm.runInContext('collectPedagogicalFidelityIssues', context);
}

function replaceOnce(source, needle, replacement, id) {
  const first = source.indexOf(needle);
  if (first < 0 || source.indexOf(needle, first + needle.length) >= 0) throw new Error(`${id}: mutation target is not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

function replaceLine(source, marker, replacement, id) {
  const lines = source.split(/\r?\n/);
  const matches = lines.map((line, index) => line.includes(marker) ? index : -1).filter(index => index >= 0);
  if (matches.length !== 1) throw new Error(`${id}: expected one matching line, observed ${matches.length}`);
  lines[matches[0]] = replacement;
  return lines.join('\n');
}

function fixture(mcStem, readingStem) {
  return [
    {type:'multiple choice',style:'multiple choice',items:[{question:mcStem,options:['A','B'],correct:0}]},
    {type:'reading comprehension',style:'reading comprehension',passage:'A synthetic visible passage.',items:[{question:readingStem,options:['A','B'],correct:0}]}
  ];
}
const specs = [{style:'multiple choice',type:'multiple choice'},{style:'reading comprehension',type:'reading comprehension'}];
const hasCode = (collect, exercises, code) => collect(exercises, specs).some(issue => issue.code === code);
const pass = message => console.log(`PASS: ${message}`);
const assert = (condition, message) => { if (!condition) throw new Error(message); pass(message); };

const current = collectorFrom(original);
assert(hasCode(current, fixture('Which device broke first?', 'Which device broke first?'), 'literal-cross-exercise-duplicate'), 'current S2-R1 policy blocks short substantive literal duplicate');
assert(hasCode(current, fixture('According to this passage, which device broke first?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'current S2-R2 policy blocks English demonstrative reference');
assert(hasCode(current, fixture('Según el texto, ¿qué dispositivo falló primero?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'current S2-R3 policy blocks Spanish reference');

const oldLengthCutoff = replaceOnce(original, 'if(normalized&&!genericInstructions.has(normalized))rows.push', 'if(normalized&&tokens.length>=5)rows.push', 'S2-R1');
assert(!hasCode(collectorFrom(oldLengthCutoff), fixture('Which device broke first?', 'Which device broke first?'), 'literal-cross-exercise-duplicate'), 'mutation proof S2-R1: restoring the old token cutoff reopens the reported gap');

const noDemonstratives = replaceOnce(original, '(?:the|this|that)', '(?:the)', 'S2-R2');
assert(!hasCode(collectorFrom(noDemonstratives), fixture('According to this passage, which device broke first?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof S2-R2: removing demonstratives reopens the reported gap');

const noSpanish = replaceLine(original, '(?:segun|de acuerdo con|basado en|en|del)', '          /(?!)/,', 'S2-R3');
assert(!hasCode(collectorFrom(noSpanish), fixture('Según el texto, ¿qué dispositivo falló primero?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof S2-R3: removing Spanish references reopens the reported gap');

console.log('Sprint 02.1 remediation mutation gate passed.');
