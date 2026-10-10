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
for (const name of ['valueText', 'hasAnyText', 'hasNonEmptyArray', 'canonicalizeExercise', 'validateExerciseSetStrict']) {
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
    title:'Advanced Conditionals',
    items:[item(duplicateQuestion), item('Choose the correct conditional form 2.'), item('Choose the correct conditional form 3.'), item('Choose the correct conditional form 4.'), item('Choose the correct conditional form 5.')]
  },
  {
    type:'reading comprehension',
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

check(/style\s*:\s*ex\.style/.test(packageSource), 'T55/T56 secure student package preserves the selected pedagogical style');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(instantBuilderSource), 'T55/T57 instant student headings use pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(secureRuntimeSource), 'T55/T58 secure student headings use pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(instantRuntimeSource), 'T55/T59 instant teacher view uses pedagogical style as the primary label');
check(/exerciseStyleLabel|exercisePedagogicalStyle/.test(verifierSource), 'T55/T60 verifier preview and print use pedagogical style as the primary label');
check(/READING[_ -]ONLY|READING EXERCISE ONLY|must not refer to the Reading passage/i.test(promptSource), 'T03 prompt isolates Reading passage and questions from independent Multiple Choice');

if (failures.length) {
  console.error(`\nPedagogical fidelity regression gate failed (${failures.length}):`);
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('\nPedagogical fidelity regression gate passed.');
