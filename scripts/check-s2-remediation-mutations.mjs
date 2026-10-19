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

function fixture(mcStem, readingStem, mcOptions=['A','B'], readingOptions=['A','B']) {
  return [
    {type:'multiple choice',style:'multiple choice',items:[{question:mcStem,options:mcOptions,correct:0}]},
    {type:'reading comprehension',style:'reading comprehension',passage:'A synthetic visible passage.',items:[{question:readingStem,options:readingOptions,correct:0}]}
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
assert(!hasCode(current, fixture('Choose the best answer.', 'Choose the best answer.', ['has','have'], ['red','blue']), 'literal-cross-exercise-duplicate'), 'current R2-FP policy allows repeated stem with different answer content');
assert(hasCode(current, fixture('Choose the correct answer.', 'Choose the correct answer.', ['A true fact','A false fact'], ['A true fact','A false fact']), 'literal-cross-exercise-duplicate'), 'current R2-TP policy blocks complete duplicate including answer content');
assert(hasCode(current, fixture('According to the following passage, which device broke first?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'current R2-FN policy blocks English following-passage reference');
assert(hasCode(current, fixture('Según el siguiente texto, ¿qué dispositivo falló primero?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'current R2-FN policy blocks Spanish following-text reference');

function sameTypeFixture(type, first, second) {
  const exercises = [{type,style:type,items:[first]},{type,style:type,items:[second]}];
  const typeSpecs = exercises.map(exercise => ({style:exercise.style,type:exercise.type}));
  return { exercises, specs:typeSpecs };
}
function hasFixtureCode(collect, fixtureValue, code) {
  return collect(fixtureValue.exercises, fixtureValue.specs).some(issue => issue.code === code);
}
const conflictingMc = sameTypeFixture('multiple choice',
  {question:'Which word is the past form of go?',options:['went','goes'],correct:0},
  {question:'Which word is the past form of go?',options:['went','goes'],correct:1});
const distinctWordOrder = sameTypeFixture('word order',
  {prompt:'Put the words in the correct order.',words:['She','likes','apples'],correct_sentence:'She likes apples.'},
  {prompt:'Put the words in the correct order.',words:['He','plays','chess'],correct_sentence:'He plays chess.'});
const distinctOrdering = sameTypeFixture('ordering',
  {question:'Put the steps in the correct order.',items:['Wash hands','Prepare food'],correct_order:[0,1]},
  {question:'Put the steps in the correct order.',items:['Get up','Go home'],correct_order:[1,0]});
const distinctTable = sameTypeFixture('table-completion',
  {question:'Complete the missing verb forms.',columns:['Base','Past'],rows:[['go',{answer:'went'}]]},
  {question:'Complete the missing verb forms.',columns:['Base','Past'],rows:[['see',{answer:'saw'}]]});
const conflictingWordOrder = sameTypeFixture('word order',
  {prompt:'Put the words in the correct order.',words:['She','likes','apples'],correct_sentence:'She likes apples.'},
  {prompt:'Put the words in the correct order.',words:['apples','She','likes'],correct_sentence:'Apples like she.'});
const conflictingOrdering = sameTypeFixture('ordering',
  {question:'Put the steps in the correct order.',items:['Wake up','Eat breakfast'],correct_order:[0,1]},
  {question:'Put the steps in the correct order.',items:['Eat breakfast','Wake up'],correct_order:[0,1]});
const conflictingTable = sameTypeFixture('table-completion',
  {question:'Complete the missing verb forms.',columns:['Base','Past'],rows:[['go',{answer:'went'}]]},
  {question:'Complete the missing verb forms.',columns:['Base','Past'],rows:[['go',{answer:'goed'}]]});
assert(hasFixtureCode(current, conflictingMc, 'literal-cross-exercise-duplicate'), 'current F-01 policy detects identical visible MC tasks despite conflicting keys');
assert(hasFixtureCode(current, conflictingMc, 'cross-exercise-answer-key-conflict'), 'current F-01 policy reports the contradictory MC key explicitly');
assert(!hasFixtureCode(current, distinctWordOrder, 'literal-cross-exercise-duplicate'), 'current F-02 policy distinguishes visible word-order pools');
assert(!hasFixtureCode(current, distinctOrdering, 'literal-cross-exercise-duplicate'), 'current F-03 policy distinguishes visible ordering pools');
assert(!hasFixtureCode(current, distinctTable, 'literal-cross-exercise-duplicate'), 'current F-04 policy distinguishes visible table grids');
assert(hasFixtureCode(current, conflictingWordOrder, 'cross-exercise-answer-key-conflict'), 'current F-02 policy keeps word-order keys separate from visible identity');
assert(hasFixtureCode(current, conflictingOrdering, 'cross-exercise-answer-key-conflict'), 'current F-03 policy keeps ordering keys separate from visible identity');
assert(hasFixtureCode(current, conflictingTable, 'cross-exercise-answer-key-conflict'), 'current F-04 policy keeps table answers separate from visible identity');

const oldLengthCutoff = replaceOnce(original, 'if(normalized)rows.push', 'if(normalized&&tokens.length>=5)rows.push', 'S2-R1');
assert(!hasCode(collectorFrom(oldLengthCutoff), fixture('Which device broke first?', 'Which device broke first?'), 'literal-cross-exercise-duplicate'), 'mutation proof S2-R1: restoring the old token cutoff reopens the reported gap');

const noDemonstratives = replaceOnce(original, '(?:the|this|that)', '(?:the)', 'S2-R2');
assert(!hasCode(collectorFrom(noDemonstratives), fixture('According to this passage, which device broke first?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof S2-R2: removing demonstratives reopens the reported gap');

const noSpanish = replaceLine(original, '(?:segun|de acuerdo con|basado en|en|del)', '          /(?!)/,', 'S2-R3');
assert(!hasCode(collectorFrom(noSpanish), fixture('Según el texto, ¿qué dispositivo falló primero?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof S2-R3: removing Spanish references reopens the reported gap');

const renderedIdentityCondition = 'if(a.visibleFingerprint===b.visibleFingerprint&&(!bothReading||a.readingContext===b.readingContext)){' ;
const stemOnlyDuplicate = replaceOnce(original, renderedIdentityCondition, 'if(true){', 'R2-FP');
assert(hasCode(collectorFrom(stemOnlyDuplicate), fixture('Choose the best answer.', 'Choose the best answer.', ['has','have'], ['red','blue']), 'literal-cross-exercise-duplicate'), 'mutation proof R2-FP: stem-only duplicate comparison recreates the false positive');

const genericRowsSkipped = replaceOnce(original, 'if(normalized)rows.push', "if(normalized&&fidelityContentTokens(stem).length)rows.push", 'R2-TP');
assert(!hasCode(collectorFrom(genericRowsSkipped), fixture('Choose the correct answer.', 'Choose the correct answer.', ['A true fact','A false fact'], ['A true fact','A false fact']), 'literal-cross-exercise-duplicate'), 'mutation proof R2-TP: skipping content-free generic stems misses a complete duplicate');

const noFollowing = replaceOnce(original, '(?:following|preceding|above)', '(?:preceding|above)', 'R2-FN-EN');
assert(!hasCode(collectorFrom(noFollowing), fixture('According to the following passage, which device broke first?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof R2-FN-EN: removing following-passage support reopens the hidden-context gap');

const noSiguiente = replaceOnce(original, '(?:siguiente|anterior)', '(?:anterior)', 'R2-FN-ES');
assert(!hasCode(collectorFrom(noSiguiente), fixture('Según el siguiente texto, ¿qué dispositivo falló primero?', 'Where did it happen?'), 'independent-mc-hidden-context'), 'mutation proof R2-FN-ES: removing siguiente-texto support reopens the hidden-context gap');

const keyDependentIdentity = replaceOnce(original, renderedIdentityCondition, 'if(a.visibleFingerprint===b.visibleFingerprint&&(!bothReading||a.readingContext===b.readingContext)&&a.keyFingerprint===b.keyFingerprint){', 'F-01');
assert(!hasFixtureCode(collectorFrom(keyDependentIdentity), conflictingMc, 'literal-cross-exercise-duplicate'), 'mutation proof F-01: mixing the grading key into visible identity hides a conflicting duplicate');

const noWordPool = replaceOnce(original, "addUnordered('words',words);", "", 'F-02');
assert(hasFixtureCode(collectorFrom(noWordPool), distinctWordOrder, 'literal-cross-exercise-duplicate'), 'mutation proof F-02: omitting the visible word pool recreates the false duplicate');

const noOrderingPool = replaceOnce(original, "else if(type==='ordering')addUnordered('items',item.items);", "else if(type==='ordering'){}", 'F-03');
assert(hasFixtureCode(collectorFrom(noOrderingPool), distinctOrdering, 'literal-cross-exercise-duplicate'), 'mutation proof F-03: omitting the visible ordering items recreates the false duplicate');

const noTableGrid = replaceOnce(original, "else if(type==='table-completion'){\n      addOrdered('columns',item.columns);", "else if(type==='table-completion'&&false){\n      addOrdered('columns',item.columns);", 'F-04');
assert(hasFixtureCode(collectorFrom(noTableGrid), distinctTable, 'literal-cross-exercise-duplicate'), 'mutation proof F-04: omitting the visible table grid recreates the false duplicate');

const fibPromptFirst = replaceOnce(original,
  "if(type==='fill-in-the-blank'||type==='error correction'||type==='word formation')return valueText(item.sentence||item.prompt||item.question);",
  "if(type==='fill-in-the-blank'||type==='error correction'||type==='word formation')return valueText(item.prompt||item.question||item.sentence);", 'RF-priority-FIB');
const fibPriorityFixture = sameTypeFixture('fill-in-the-blank',
  {prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'},
  {prompt:'Type a verb.',sentence:'She ___ to school.',answer:'goes'});
assert(!hasFixtureCode(collectorFrom(fibPromptFirst), fibPriorityFixture, 'literal-cross-exercise-duplicate'), 'mutation proof RF priority: non-rendered FIB prompt metadata cannot split an identical rendered sentence');

const tfQuestionFirst = replaceOnce(original,
  "if(type==='true/false')return valueText(item.statement||item.question||item.prompt);",
  "if(type==='true/false')return valueText(item.question||item.prompt||item.statement);", 'RF-priority-TF');
const tfPriorityFixture = sameTypeFixture('true/false',
  {question:'True or false?',statement:'The Earth orbits the Sun.',correct:true},
  {question:'True or false?',statement:'Fish live in trees.',correct:false});
assert(hasFixtureCode(collectorFrom(tfQuestionFirst), tfPriorityFixture, 'literal-cross-exercise-duplicate'), 'mutation proof RF priority: generic true/false question cannot override the rendered statement');

const noReadingContext = replaceOnce(original, renderedIdentityCondition, 'if(a.visibleFingerprint===b.visibleFingerprint){', 'RF-reading-context');
const readingContextFixture = {
  exercises:[
    {type:'reading comprehension',style:'reading comprehension',passage:'Birdwatching at sunrise.',items:[{question:'What did the writer see?',options:['a bird','a plane'],correct:0}]},
    {type:'reading comprehension',style:'reading comprehension',passage:'Air show at the airport.',items:[{question:'What did the writer see?',options:['a bird','a plane'],correct:0}]}
  ],
  specs:[{style:'reading comprehension',type:'reading comprehension'},{style:'reading comprehension',type:'reading comprehension'}]
};
assert(hasFixtureCode(collectorFrom(noReadingContext), readingContextFixture, 'literal-cross-exercise-duplicate'), 'mutation proof RF Reading: omitting the displayed passage recreates the false duplicate');

const noGapLayout = replaceOnce(original,
  "if(renderedText)parts.push('gap-layout:'+renderedText.split('___').map(fidelityNormalizedText).join('<gap>'));",
  "if(renderedText){}", 'RF-gap-layout');
const gapLayoutFixture = sameTypeFixture('fill-in-the-blank',
  {sentence:'She ___ likes apples.',answer:'really'},
  {sentence:'She likes ___ apples.',answer:'green'});
assert(hasFixtureCode(collectorFrom(noGapLayout), gapLayoutFixture, 'literal-cross-exercise-duplicate'), 'mutation proof RF gap layout: blank position remains part of the rendered task');

const noMatchingPool = replaceOnce(original, "addUnordered('matching-pool',pool);", '', 'RF-matching-pool');
const matchingPoolFixture = sameTypeFixture('matching',
  {left:'alpha',right:'first'},
  {left:'alpha',right:'second'});
assert(hasFixtureCode(collectorFrom(noMatchingPool), matchingPoolFixture, 'literal-cross-exercise-duplicate'), 'mutation proof RF Matching: the displayed right-side pool distinguishes tasks');

console.log('Sprint 02.1 R2 remediation mutation gate passed.');
