import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(path, 'utf8');
const failures = [];
const pass = message => console.log(`PASS: ${message}`);
const check = (condition, message) => {
  if (condition) pass(message);
  else failures.push(message);
};

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unterminated function ${name}`);
}

const promptSource = read('src/js/12-prompt-builder.js');
const helperSource = read('src/js/13a-secure-helpers.js');
const packageSource = read('src/js/13c-secure-package.js');
const instantBuilderSource = read('src/js/14a-test-html-builders.js');
const secureRuntimeSource = read('src/js/13e-secure-student-runtime.js');
const instantRuntimeSource = read('src/js/14b-instant-test-runtime.js');
const verifierSource = read('src/js/13f-secure-teacher-verifier.js');
const verifierUiSource = read('src/js/13eb-secure-teacher-verifier-v2-ui.js');
const previewEditorSource = read('src/features/preview-editor.js');
const didacticsSource = read('src/js/06-result-didactics.js');
const stylesSource = read('src/js/05-form-fields.js');

const styleStart = stylesSource.indexOf('const SPECIAL_STYLES =');
const styleEnd = stylesSource.indexOf('function getExerciseTypeOptions', styleStart);
if (styleStart < 0 || styleEnd < 0) throw new Error('Missing SPECIAL_STYLES contract');

const context = vm.createContext({ console });
vm.runInContext(`
  var state = {};
  function trim(){ return ''; }
  function uniqueExerciseTypes(values){ return Array.from(new Set((values || []).map(String))); }
  function hasConfiguredExercises(st){ return !!(st && (st.exerciseDetail || st.exerciseConfigSaved)); }
  function isAllowedExerciseType(){ return true; }
  function resolveCorrectIndex(item){
    if (!item || !Array.isArray(item.options)) return -1;
    const value = Number(item.correct);
    return Number.isInteger(value) && value >= 0 && value < item.options.length ? value : -1;
  }
`, context);
vm.runInContext(stylesSource.slice(styleStart, styleEnd), context);
for (const name of ['normalizeType', 'defaultItemCount', 'buildExerciseSpecs']) {
  vm.runInContext(extractFunction(promptSource, name), context);
}
for (const name of [
  'makeItemPoints', 'valueText', 'hasAnyText', 'hasNonEmptyArray',
  'exercisePedagogicalStyle', 'exerciseStyleLabel', 'exerciseThemeTitle', 'exerciseDisplayName',
  'fidelityNormalizedText', 'fidelityContentTokens', 'fidelityItemStem', 'fidelitySimilarity',
  'fidelityStyleKey', 'collectPedagogicalFidelityIssues', 'canonicalizeExercise',
  'validateExerciseSetStrict', 'csEnsureExerciseFeedback', 'normalizeGeneratedExercises',
  'getGroupVariantExercisesRaw', 'normalizeAllVariants'
]) {
  vm.runInContext(extractFunction(helperSource, name), context);
}

const item = question => ({ question, options:['A', 'B', 'C', 'D'], correct:0, explanation:'Synthetic explanation.' });
const passage = 'A synthetic school passage about a coastal research station and its weekly environmental measurements.';
const duplicateQuestion = 'According to the passage, what did the coastal research team measure every week?';
const stateFixture = {
  exerciseDetail:true,
  exerciseConfigSaved:true,
  typyCviceni:['multiple choice', 'reading comprehension'],
  readingQuestionCount:5,
  exerciseConfig:[
    { typ:'multiple choice', pocetOtazek:5, body:5 },
    { typ:'reading comprehension', pocetOtazek:5, body:10 }
  ]
};
const badExercises = [
  {
    type:'multiple choice',
    style:'multiple choice',
    title:'Advanced Conditionals',
    items:[item(duplicateQuestion), item('Choose the correct conditional form 2.'), item('Choose the correct conditional form 3.'), item('Choose the correct conditional form 4.'), item('Choose the correct conditional form 5.')]
  },
  {
    type:'reading comprehension',
    style:'reading comprehension',
    title:'Advanced Conditionals',
    passage,
    items:[item(duplicateQuestion), item('What was the station built to study?'), item('Who recorded the results?'), item('When were the findings discussed?'), item('Why was the project useful?')]
  }
];

let duplicateRejected = false;
try {
  vm.runInContext('validateExerciseSetStrict', context)(stateFixture, badExercises, 'synthetic T01/T02');
} catch (error) {
  duplicateRejected = /duplicit|reading|passage|context/i.test(String(error.validationDetails || error.message));
}
check(duplicateRejected, 'T01/T02 independent Multiple Choice cannot duplicate or depend on the Reading passage');

const stateFiveStyles = {
  jazyk:'Angličtina',
  exerciseDetail:true,
  exerciseConfigSaved:true,
  typyCviceni:['multiple choice', 'paraphrase the sentence', 'translation', 'reading comprehension', 'verb form'],
  readingQuestionCount:5,
  exerciseConfig:[
    { typ:'multiple choice', pocetOtazek:4, body:4 },
    { typ:'paraphrase the sentence', pocetOtazek:3, body:6 },
    { typ:'translation', pocetOtazek:2, body:4 },
    { typ:'reading comprehension', pocetOtazek:5, body:10 },
    { typ:'verb form', pocetOtazek:4, body:8 }
  ]
};
const fillItems = (count, factory) => Array.from({length:count}, (_, index) => factory(index));
const validFiveStyles = [
  { type:'multiple choice', style:'multiple choice', title:'Advanced Conditionals', items:fillItems(4, i => item(`Select the correct conditional verb form for situation ${i + 1}.`)) },
  { type:'sentence transformation', style:'paraphrase the sentence', title:'Advanced Conditionals', items:fillItems(3, i => ({prompt:`Rewrite conditional sentence ${i + 1} without changing its meaning.`, answer:`Synthetic paraphrase ${i + 1}.`, explanation:'Synthetic explanation.'})) },
  { type:'translation', style:'translation', title:'Advanced Conditionals', items:fillItems(2, i => ({prompt:`Přelož kontrolní větu ${i + 1}.`, answer:`Synthetic translation ${i + 1}.`, explanation:'Synthetic explanation.'})) },
  { type:'reading comprehension', style:'reading comprehension', title:'Advanced Conditionals', passage, items:fillItems(5, i => item(`Reading comprehension question number ${i + 1} about the coastal station.`)) },
  { type:'fill-in-the-blank', style:'verb form', title:'Advanced Conditionals', items:fillItems(4, i => ({sentence:`If the researcher arrived earlier, she ___ (record) sample ${i + 1}.`, answer:'would record', explanation:'Synthetic explanation.'})) }
];

let normalizedFiveStyles;
try {
  normalizedFiveStyles = vm.runInContext('normalizeGeneratedExercises', context)(stateFiveStyles, {exercises:validFiveStyles}, 'synthetic T55-T63');
  pass('T55-T63 valid five-style fixture passes strict normalization');
} catch (error) {
  failures.push(`T55-T63 valid five-style fixture passes strict normalization (${error.message})`);
}
if (normalizedFiveStyles) {
  check(JSON.stringify(normalizedFiveStyles.map(ex => ex.style)) === JSON.stringify(stateFiveStyles.typyCviceni), 'T55 selected pedagogical styles survive normalization unchanged');
  check(JSON.stringify(normalizedFiveStyles.map(ex => ex.type)) === JSON.stringify(['multiple choice','sentence transformation','translation','reading comprehension','fill-in-the-blank']), 'T56 special styles map to their canonical scoring/render types');
  check(normalizedFiveStyles.every(ex => ex.title === 'Advanced Conditionals'), 'T57 thematic title remains a subtitle and never replaces the selected style');
  check(JSON.stringify(normalizedFiveStyles.map(ex => ex.items.length)) === JSON.stringify([4,3,2,5,4]), 'T58 configured item counts remain exact for every exercise');
  check(JSON.stringify(normalizedFiveStyles.map(ex => ex.points_total)) === JSON.stringify([4,6,4,10,8]), 'T59 configured point totals remain exact for every exercise');
  check(normalizedFiveStyles.every(ex => Math.abs(ex.item_points.reduce((sum, points) => sum + points, 0) - ex.points_total) < 0.0001), 'T60 per-item points sum to each configured exercise total');
}

const specsFiveStyles = vm.runInContext('buildExerciseSpecs', context)(stateFiveStyles);
check(JSON.stringify(specsFiveStyles.map(spec => [spec.style, spec.type])) === JSON.stringify([
  ['multiple choice','multiple choice'],
  ['paraphrase the sentence','sentence transformation'],
  ['translation','translation'],
  ['reading comprehension','reading comprehension'],
  ['verb form','fill-in-the-blank']
]), 'T61 prompt/spec contract preserves pedagogy separately from scoring type');

const mappingState = {
  exerciseDetail:true,
  exerciseConfigSaved:true,
  typyCviceni:['odd one out','verb form'],
  exerciseConfig:[
    {typ:'odd one out',pocetOtazek:6,body:6},
    {typ:'verb form',pocetOtazek:4,body:8}
  ]
};
const mappingSpecs = vm.runInContext('buildExerciseSpecs', context)(mappingState);
check(mappingSpecs[0].style === 'odd one out' && mappingSpecs[0].type === 'multiple choice', 'T62 Odd One Out retains its pedagogical style and uses Multiple Choice scoring');
check(mappingSpecs[1].style === 'verb form' && mappingSpecs[1].type === 'fill-in-the-blank', 'T63 Verb Form retains its pedagogical style and uses Fill-in-the-blank scoring');

const specialStyleMatrix = JSON.parse(vm.runInContext('JSON.stringify(Object.entries(SPECIAL_STYLES).map(([style,contract])=>({style,score:contract.score,actual:scoringTypeFor(style)})))', context));
check(specialStyleMatrix.length >= 10, 'T55-T63 complete registered pedagogical-style matrix is present');
check(specialStyleMatrix.every(row => row.actual === row.score), 'T55-T63 every registered pedagogical style maps to its declared scoring type');
const matrixState = {
  exerciseDetail:true,
  exerciseConfigSaved:true,
  typyCviceni:specialStyleMatrix.map(row => row.style),
  exerciseConfig:specialStyleMatrix.map(row => ({typ:row.style,pocetOtazek:2,body:4}))
};
const matrixSpecs = vm.runInContext('buildExerciseSpecs', context)(matrixState);
check(matrixSpecs.every((spec, index) => spec.style === specialStyleMatrix[index].style && spec.type === specialStyleMatrix[index].score), 'T55-T63 build specs preserve the full registered style/scoring matrix');

const differentiated = vm.runInContext('normalizeAllVariants', context)(stateFiveStyles, {
  group_variants:{
    g1:{exercises:structuredClone(validFiveStyles)},
    g2:{exercises:structuredClone(validFiveStyles).map(ex => ({...ex,title:'Advanced Conditionals B'}))}
  }
}, [{key:'g1',name:'Synthetic A'},{key:'g2',name:'Synthetic B'}]);
check(['g1','g2','__default'].every(key => differentiated[key].map(ex => ex.style).join('|') === stateFiveStyles.typyCviceni.join('|')), 'T55-T63 differentiated variants preserve every pedagogical style');

const collectIssues = vm.runInContext('collectPedagogicalFidelityIssues', context);
const missingPassage = structuredClone(validFiveStyles);
delete missingPassage[3].passage;
check(collectIssues(missingPassage, specsFiveStyles).some(issue => issue.code === 'reading-context-missing' && issue.level === 'bad'), 'T03 Reading requires one visible exercise-level passage');
const repeatedPassage = structuredClone(validFiveStyles);
repeatedPassage[3].items[0].passage = passage;
check(collectIssues(repeatedPassage, specsFiveStyles).some(issue => issue.code === 'reading-context-repeated' && issue.level === 'bad'), 'T03 item-level hidden/repeated Reading passage is rejected');
const wrongStyle = structuredClone(validFiveStyles);
wrongStyle[4].style = 'multiple choice';
check(collectIssues(wrongStyle, specsFiveStyles).some(issue => issue.code === 'style-mismatch' && issue.level === 'bad'), 'T04 AI cannot silently replace the teacher-selected pedagogical style');
const hiddenMcContext = structuredClone(validFiveStyles);
hiddenMcContext[0].items[0].question = 'According to the passage, which statement is correct?';
check(collectIssues(hiddenMcContext, specsFiveStyles).some(issue => issue.code === 'independent-mc-hidden-context' && issue.level === 'bad'), 'T01 independent Multiple Choice cannot refer to a hidden Reading context');
const similarAcrossExercises = structuredClone(validFiveStyles);
similarAcrossExercises[0].items[0].question = 'Explain how coastal researchers carefully measured changing water temperatures during weekly environmental surveys.';
similarAcrossExercises[3].items[0].question = 'Explain how coastal researchers carefully measured water temperatures changing during weekly environmental surveys.';
check(collectIssues(similarAcrossExercises, specsFiveStyles).some(issue => issue.code === 'high-cross-exercise-similarity' && issue.level === 'warn'), 'T02 high cross-exercise similarity is surfaced for teacher review');
const shortLegitimate = structuredClone(validFiveStyles);
shortLegitimate[0].items[0].question = 'Choose the correct answer.';
shortLegitimate[3].items[0].question = 'Choose the correct answer.';
check(!collectIssues(shortLegitimate, specsFiveStyles).some(issue => /duplicate|similarity/.test(issue.code)), 'T02 short generic instructions do not trigger a false duplicate finding');

const legacyExercise = {type:'multiple choice', title:'Advanced Conditionals'};
check(vm.runInContext('exerciseStyleLabel', context)(legacyExercise) === 'Multiple choice', 'legacy tests without style fall back to their canonical type without inventing pedagogy');
check(vm.runInContext('exerciseThemeTitle', context)(legacyExercise) === 'Advanced Conditionals', 'legacy thematic titles remain visible as subtitles');

check(/style\s*:\s*ex\.style/.test(packageSource), 'T55/T56 secure student package preserves the selected pedagogical style');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(instantBuilderSource), 'T55/T57 instant student headings use pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(secureRuntimeSource), 'T55/T58 secure student headings use pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(instantRuntimeSource), 'T55/T59 instant teacher view uses pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(verifierSource), 'T55/T60 verifier preview and print use pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(verifierUiSource), 'T55/T60 verifier UI helpers distinguish pedagogical style from thematic title');
check(/Tematický podtitulek/.test(previewEditorSource) && /bodování:/.test(previewEditorSource), 'T55/T60 preview editor distinguishes style, scoring type and thematic subtitle');
check(/collectPedagogicalFidelityIssues/.test(didacticsSource), 'T02/T04 generator quality diagnostics expose fidelity findings to the teacher');
check(/READING[_ -]ONLY|READING EXERCISE ONLY|must not refer to the Reading passage/i.test(promptSource), 'T03 prompt isolates Reading passage and questions from independent Multiple Choice');
check(/"style"/.test(promptSource) && /thematic subtitle/.test(promptSource), 'T04 prompt schema keeps style and thematic title semantically separate');

if (failures.length) {
  console.error(`\nPedagogical fidelity regression gate failed (${failures.length}):`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('\nPedagogical fidelity regression gate passed.');
