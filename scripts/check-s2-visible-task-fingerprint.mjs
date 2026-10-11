#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'src/js/13a-secure-helpers.js'), 'utf8');

function extractFunction(name) {
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
    if ('"\'`'.includes(char)) { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function: ${name}`);
}

const context = vm.createContext({ console });
vm.runInContext("function normalizeType(s){return String(s||'').trim().toLowerCase();} function specialStyleKey(){return '';}", context);
for (const name of ['valueText','hasAnyText','fidelityNormalizedText','fidelityContentTokens','fidelityItemStem','fidelitySimilarity','fidelityStyleKey','collectPedagogicalFidelityIssues']) {
  vm.runInContext(extractFunction(name), context);
}
const collect = vm.runInContext('collectPedagogicalFidelityIssues', context);

function test(id, type, first, second, expectedDuplicate, expectedConflict = false) {
  const exercises = [
    { type, style: type, items: [first] },
    { type, style: type, items: [second] }
  ];
  const specs = exercises.map(exercise => ({ style: exercise.style, type: exercise.type }));
  const issues = collect(exercises, specs);
  const codes = issues.map(issue => issue.code);
  const actualDuplicate = codes.includes('literal-cross-exercise-duplicate');
  const actualConflict = codes.includes('cross-exercise-answer-key-conflict');
  return {
    id,
    expectedDuplicate,
    actualDuplicate,
    expectedConflict,
    actualConflict,
    pass: actualDuplicate === expectedDuplicate && actualConflict === expectedConflict,
    issueCodes: codes
  };
}

const cases = [
  test('F-02 word-order distinct visible word pools', 'word order',
    { prompt: 'Put the words in the correct order.', words: ['She','likes','apples'], correct_sentence: 'She likes apples.' },
    { prompt: 'Put the words in the correct order.', words: ['He','plays','chess'], correct_sentence: 'He plays chess.' }, false),
  test('F-02 control identical word-order task', 'word order',
    { prompt: 'Put the words in the correct order.', words: ['She','likes','apples'], correct_sentence: 'She likes apples.' },
    { prompt: 'Put the words in the correct order.', words: ['She','likes','apples'], correct_sentence: 'She likes apples.' }, true),
  test('F-03 ordering distinct visible item pools', 'ordering',
    { question: 'Put the steps in the correct order.', items: ['Wash hands','Prepare food'], correct_order: [0,1] },
    { question: 'Put the steps in the correct order.', items: ['Get up','Go home'], correct_order: [1,0] }, false),
  test('F-04 table-completion distinct visible grids', 'table-completion',
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['go',{ answer: 'went' }]] },
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['see',{ answer: 'saw' }]] }, false),
  test('F-01 identical MC task with conflicting key', 'multiple choice',
    { question: 'Which word is the past form of go?', options: ['went','goes'], correct: 0 },
    { question: 'Which word is the past form of go?', options: ['went','goes'], correct: 1 }, true, true),
  test('F-01 control reordered MC options with consistent key', 'multiple choice',
    { question: 'Which word is the past form of go?', options: ['went','goes'], correct: 0 },
    { question: 'Which word is the past form of go?', options: ['goes','went'], correct: 1 }, true)
];

const structuralControls = [
  test('word-order reordered pool with consistent key', 'word order',
    { prompt: 'Put the words in the correct order.', words: ['She','likes','apples'], correct_sentence: 'She likes apples.' },
    { prompt: 'Put the words in the correct order.', words: ['apples','She','likes'], correct_sentence: 'She likes apples.' }, true),
  test('word-order identical visible task with conflicting key', 'word order',
    { prompt: 'Put the words in the correct order.', words: ['She','likes','apples'], correct_sentence: 'She likes apples.' },
    { prompt: 'Put the words in the correct order.', words: ['apples','She','likes'], correct_sentence: 'Apples like she.' }, true, true),
  test('ordering reordered pool with consistent sequence', 'ordering',
    { question: 'Put the steps in the correct order.', items: ['Wake up','Eat breakfast'], correct_order: [0,1] },
    { question: 'Put the steps in the correct order.', items: ['Eat breakfast','Wake up'], correct_order: [1,0] }, true),
  test('ordering identical visible task with conflicting key', 'ordering',
    { question: 'Put the steps in the correct order.', items: ['Wake up','Eat breakfast'], correct_order: [0,1] },
    { question: 'Put the steps in the correct order.', items: ['Wake up','Eat breakfast'], correct_order: [1,0] }, true, true),
  test('table identical visible grid with conflicting hidden answer', 'table-completion',
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['go',{ answer: 'went' }]] },
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['go',{ answer: 'goed' }]] }, true, true),
  test('table row order remains semantically visible', 'table-completion',
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['go',{ answer: 'went' }],['see',{ answer: 'saw' }]] },
    { question: 'Complete the missing verb forms.', columns: ['Base','Past'], rows: [['see',{ answer: 'saw' }],['go',{ answer: 'went' }]] }, false)
];

for (const result of cases) console.log(`${result.pass ? 'PASS' : 'FAIL'}: ${result.id}`);
for (const result of structuralControls) console.log(`${result.pass ? 'PASS' : 'FAIL'}: ${result.id}`);
console.log(JSON.stringify({
  attachedScenarios: { passed: cases.filter(result => result.pass).length, total: cases.length, cases },
  structuralControls: { passed: structuralControls.filter(result => result.pass).length, total: structuralControls.length, cases: structuralControls }
}, null, 2));
if (cases.concat(structuralControls).some(result => !result.pass)) process.exitCode = 1;

