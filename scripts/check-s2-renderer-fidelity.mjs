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

function exercise(type, item, extra = {}) {
  return { type, style:type, items:[item], ...extra };
}

function compare(id, first, second, expectedDuplicate, expectedConflict = false) {
  const specs = [first, second].map(entry => ({style:entry.style, type:entry.type}));
  const codes = collect([first, second], specs).map(issue => issue.code);
  const actualDuplicate = codes.includes('literal-cross-exercise-duplicate');
  const actualConflict = codes.includes('cross-exercise-answer-key-conflict');
  return {
    id,
    expectedDuplicate,
    actualDuplicate,
    expectedConflict,
    actualConflict,
    pass:actualDuplicate === expectedDuplicate && actualConflict === expectedConflict,
    issueCodes:codes
  };
}

const fixtures = [
  {
    type:'multiple choice',
    same:[{question:'Choose the correct color.',options:['red','blue'],correct:0},{question:'Choose the correct color.',options:['blue','red'],correct:1}],
    different:[{question:'Choose the correct color.',options:['red','blue'],correct:0},{question:'Choose the correct animal.',options:['red','blue'],correct:0}]
  },
  {
    type:'multi-select',
    same:[{question:'Select the warm colors.',options:['red','orange','blue'],correct:[0,1]},{prompt:'Select the warm colors.',options:['blue','orange','red'],correct:[2,1]}],
    different:[{question:'Select the warm colors.',options:['red','orange','blue'],correct:[0,1]},{question:'Select the cold colors.',options:['red','orange','blue'],correct:[2]}]
  },
  {
    type:'fill-in-the-blank',
    same:[{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'},{prompt:'Type a verb.',sentence:'She ___ to school.',answer:'walks'}],
    different:[{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'},{prompt:'Complete the sentence.',sentence:'They ___ in Ostrava.',answer:'live'}],
    sameConflict:true
  },
  {
    type:'matching',
    same:[{left:'alpha',right:'first'},{left:'alpha',right:'first'}],
    different:[{left:'alpha',right:'first'},{left:'alpha',right:'second'}]
  },
  {
    type:'word order',
    same:[{prompt:'Put the words in the correct order.',words:['She','likes','apples'],correct_sentence:'She likes apples.'},{prompt:'Put the words in the correct order.',words:['apples','She','likes'],correct_sentence:'She likes apples.'}],
    different:[{prompt:'Put the words in the correct order.',words:['She','likes','apples'],correct_sentence:'She likes apples.'},{prompt:'Put the words in the correct order.',words:['He','plays','chess'],correct_sentence:'He plays chess.'}]
  },
  {
    type:'ordering',
    same:[{question:'Order the morning steps.',items:['Wake up','Eat breakfast'],correct_order:[0,1]},{prompt:'Order the morning steps.',items:['Eat breakfast','Wake up'],correct_order:[1,0]}],
    different:[{question:'Order the morning steps.',items:['Wake up','Eat breakfast'],correct_order:[0,1]},{question:'Order the morning steps.',items:['Open class','Read a book'],correct_order:[0,1]}]
  },
  {
    type:'highlight-evidence',
    same:[{question:'Select the evidence.',sentences:['It rained.','The ground was wet.'],correct:1},{prompt:'Select the evidence.',sentences:['The ground was wet.','It rained.'],correct:0}],
    different:[{question:'Select the evidence.',sentences:['It rained.','The ground was wet.'],correct:1},{question:'Select the evidence.',sentences:['The sun shone.','The ground was dry.'],correct:1}]
  },
  {
    type:'categorisation-board',
    same:[
      {question:'Sort the words.',categories:['noun','verb'],entries:[{text:'run',category:'verb'},{text:'school',category:'noun'}]},
      {prompt:'Sort the words.',categories:['verb','noun'],entries:[{text:'school',category:'noun'},{text:'run',category:'verb'}]}
    ],
    different:[
      {question:'Sort the words.',categories:['noun','verb'],entries:[{text:'run',category:'verb'},{text:'school',category:'noun'}]},
      {question:'Sort the words.',categories:['noun','verb'],entries:[{text:'walk',category:'verb'},{text:'home',category:'noun'}]}
    ]
  },
  {
    type:'table-completion',
    same:[{question:'Complete the table.',columns:['Base','Past'],rows:[['go',{answer:'went'}]]},{prompt:'Complete the table.',columns:['Base','Past'],rows:[['go',{answer:'goed'}]]}],
    different:[{question:'Complete the table.',columns:['Base','Past'],rows:[['go',{answer:'went'}]]},{question:'Complete the table.',columns:['Base','Past'],rows:[['see',{answer:'saw'}]]}],
    sameConflict:true
  },
  {
    type:'transformation-chain',
    same:[
      {base_sentence:'She goes home.',transformations:[{instruction:'Make it negative.',answer:'She does not go home.'}]},
      {base_sentence:'She goes home.',transformations:[{instruction:'Make it negative.',answer:'She never goes home.'}]}
    ],
    different:[
      {base_sentence:'She goes home.',transformations:[{instruction:'Make it negative.',answer:'She does not go home.'}]},
      {base_sentence:'She goes home.',transformations:[{instruction:'Make it a question.',answer:'Does she go home?'}]}
    ],
    sameConflict:true
  },
  {
    type:'translation',
    same:[{prompt:'Přelož: Dobrý den.',answer:'Good morning.'},{prompt:'Přelož: Dobrý den.',source:'hidden redundant source',answer:'Hello.'}],
    different:[{prompt:'Přelož: Dobrý den.',answer:'Hello.'},{prompt:'Přelož: Dobrou noc.',answer:'Good night.'}],
    sameConflict:true
  },
  {
    type:'true/false',
    same:[{question:'True or false?',statement:'The Moon orbits Earth.',correct:true},{question:'Decide whether this is true.',statement:'The Moon orbits Earth.',correct:false}],
    different:[{question:'True or false?',statement:'The Earth orbits the Sun.',correct:true},{question:'True or false?',statement:'Fish live in trees.',correct:false}],
    sameConflict:true
  },
  {
    type:'error correction',
    same:[{prompt:'Correct the sentence.',sentence:'He go to school.',correction:'He goes to school.'},{prompt:'Fix the grammar.',sentence:'He go to school.',correction:'He went to school.'}],
    different:[{prompt:'Correct the sentence.',sentence:'He go to school.',correction:'He goes to school.'},{prompt:'Correct the sentence.',sentence:'We was here.',correction:'We were here.'}],
    sameConflict:true
  },
  {
    type:'error-tagging',
    same:[
      {sentence:'He go home.',tokens:['He','go','home.'],error_type_options:['grammar','spelling'],error_token_index:1,error_type:'grammar',correction:'goes'},
      {sentence:'He go home.',tokens:['He','go','home.'],error_type_options:['spelling','grammar'],error_token_index:1,error_type:'grammar',correction:'went'}
    ],
    different:[
      {sentence:'He go home.',tokens:['He','go','home.'],error_type_options:['grammar','spelling'],error_token_index:1,error_type:'grammar',correction:'goes'},
      {sentence:'We was here.',tokens:['We','was','here.'],error_type_options:['grammar','spelling'],error_token_index:1,error_type:'grammar',correction:'were'}
    ],
    sameConflict:true
  },
  {
    type:'cloze text',
    same:[{prompt:'Fill the gaps.',text:'They ___ quickly.',answers:['arrived']},{prompt:'Complete the passage.',text:'They ___ quickly.',answers:['left']}],
    different:[{prompt:'Fill the gaps.',text:'They ___ quickly.',answers:['arrived']},{prompt:'Fill the gaps.',text:'The doctor ___ late.',answers:['came']}],
    sameConflict:true
  },
  {
    type:'sentence transformation',
    same:[{prompt:'Rewrite: She is happy.',keyword:'not',answer:'She is not sad.'},{prompt:'Rewrite: She is happy.',keyword:'not',answer:'She is not unhappy.'}],
    different:[{prompt:'Rewrite: She is happy.',keyword:'not',answer:'She is not sad.'},{prompt:'Rewrite: She is happy.',keyword:'very',answer:'She is very happy.'}],
    sameConflict:true
  },
  {
    type:'reading comprehension',
    extra:{passage:'The same visible passage.'},
    same:[{question:'What did the writer see?',options:['a bird','a plane'],correct:0},{question:'What did the writer see?',options:['a bird','a plane'],correct:1}],
    different:[{question:'What did the writer see?',options:['a bird','a plane'],correct:0},{question:'What did the writer see?',options:['a bird','a plane'],correct:0}],
    secondDifferentExtra:{passage:'A different visible passage.'},
    sameConflict:true
  },
  {
    type:'dialogue completion',
    same:[{dialogue:'A: Hello.\nB: ___.',question:'Choose the reply.',options:['Hi!','No.'],correct:0},{dialogue:'A: Hello.\nB: ___.',prompt:'Choose the reply.',options:['Hi!','No.'],correct:1}],
    different:[{dialogue:'A: Hello.\nB: ___.',question:'Choose the reply.',options:['Hi!','No.'],correct:0},{dialogue:'A: Goodbye.\nB: ___.',question:'Choose the reply.',options:['Hi!','No.'],correct:0}],
    sameConflict:true
  },
  {
    type:'categorization',
    same:[{prompt:'Choose a category.',text:'Elephant',categories:['Animal','Food'],correct_category:'Animal'},{prompt:'Select a group.',text:'Elephant',categories:['Food','Animal'],correct_category:'Food'}],
    different:[{prompt:'Choose a category.',text:'Elephant',categories:['Animal','Food'],correct_category:'Animal'},{prompt:'Choose a category.',text:'Bread',categories:['Animal','Food'],correct_category:'Food'}],
    sameConflict:true
  },
  {
    type:'word formation',
    same:[{prompt:'Complete the sentence.',sentence:'The journey was ___.',base_word:'interest',answer:'interesting'},{prompt:'Form a word.',sentence:'The journey was ___.',base:'interest',answer:'interested'}],
    different:[{prompt:'Complete the sentence.',sentence:'The journey was ___.',base_word:'interest',answer:'interesting'},{prompt:'Complete the sentence.',sentence:'He showed great ___.',base_word:'interest',answer:'interest'}],
    sameConflict:true
  },
  {
    type:'listening comprehension',
    same:[{question:'Which sound was heard?',options:['a bell','a horn'],correct:0,transcript:'Teacher-only A'},{prompt:'Which sound was heard?',options:['a bell','a horn'],correct:1,transcript:'Teacher-only B'}],
    different:[{question:'Which sound was heard?',options:['a bell','a horn'],correct:0},{question:'Which instrument was played?',options:['a bell','a horn'],correct:0}],
    sameConflict:true
  }
];

const results = [];
const independentAuditCases = [
  compare('RF-01 FIB distinct displayed sentence; same generic prompt',
    exercise('fill-in-the-blank',{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'}),
    exercise('fill-in-the-blank',{prompt:'Complete the sentence.',sentence:'They ___ in Ostrava.',answer:'live'}), false),
  compare('RF-05 FIB same displayed sentence; different hidden prompt',
    exercise('fill-in-the-blank',{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'}),
    exercise('fill-in-the-blank',{prompt:'Type a verb.',sentence:'She ___ to school.',answer:'goes'}), true),
  compare('RF-02 true/false distinct displayed statements; same generic question',
    exercise('true/false',{question:'True or false?',statement:'The Earth orbits the Sun.',correct:true}),
    exercise('true/false',{question:'True or false?',statement:'Fish live in trees.',correct:false}), false),
  compare('RF-06 error correction distinct displayed sentence; same generic prompt',
    exercise('error correction',{prompt:'Correct the sentence.',sentence:'He go to school.',correction:'He goes to school.'}),
    exercise('error correction',{prompt:'Correct the sentence.',sentence:'We was here.',correction:'We were here.'}), false),
  compare('RF-03 cloze distinct visible text; same generic prompt',
    exercise('cloze text',{prompt:'Fill in the blanks.',text:'They ___ quickly.',answers:['arrived']}),
    exercise('cloze text',{prompt:'Fill in the blanks.',text:'The doctor ___ late.',answers:['came']}), false),
  compare('RF-04 word formation distinct visible sentence; same base word and prompt',
    exercise('word formation',{prompt:'Complete the sentence.',sentence:'The journey was ___.',base_word:'interest',answer:'interesting'}),
    exercise('word formation',{prompt:'Complete the sentence.',sentence:'He showed great ___.',base_word:'interest',answer:'interest'}), false),
  compare('RF-07 categorization distinct displayed text; same prompt',
    exercise('categorization',{prompt:'Choose a category.',text:'Elephant',categories:['Animal','Food'],correct_category:'Animal'}),
    exercise('categorization',{prompt:'Choose a category.',text:'Bread',categories:['Animal','Food'],correct_category:'Food'}), false),
  compare('RF-08 Reading distinct passage; same question/options',
    exercise('reading comprehension',{question:'What did the writer see?',options:['a bird','a plane'],correct:0},{passage:'Birdwatching at sunrise.'}),
    exercise('reading comprehension',{question:'What did the writer see?',options:['a bird','a plane'],correct:0},{passage:'Air show at the airport.'}), false),
  compare('RF-09 FIB identical sentence and answers; same prompt',
    exercise('fill-in-the-blank',{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'}),
    exercise('fill-in-the-blank',{prompt:'Complete the sentence.',sentence:'She ___ to school.',answer:'goes'}), true),
  compare('RF-10 true/false identical statement; different generic question',
    exercise('true/false',{question:'True or false?',statement:'The Moon orbits Earth.',correct:true}),
    exercise('true/false',{question:'Decide whether this is true.',statement:'The Moon orbits Earth.',correct:true}), true)
];
results.push(...independentAuditCases);
for (const fixture of fixtures) {
  const [sameFirst, sameSecond] = fixture.same;
  results.push(compare(`${fixture.type}: identical rendered task`, exercise(fixture.type, sameFirst, fixture.extra), exercise(fixture.type, sameSecond, fixture.extra), true, !!fixture.sameConflict));
  const [differentFirst, differentSecond] = fixture.different;
  results.push(compare(`${fixture.type}: distinct rendered task`, exercise(fixture.type, differentFirst, fixture.extra), exercise(fixture.type, differentSecond, fixture.secondDifferentExtra || fixture.extra), false));
}

results.push(compare('FIB: blank position is visible',
  exercise('fill-in-the-blank',{sentence:'She ___ likes apples.',answer:'really'}),
  exercise('fill-in-the-blank',{sentence:'She likes ___ apples.',answer:'green'}), false));
results.push(compare('Cloze: blank position is visible',
  exercise('cloze text',{text:'She ___ likes apples.',answers:['really']}),
  exercise('cloze text',{text:'She likes ___ apples.',answers:['green']}), false));
results.push(compare('Error tagging: derived and explicit identical tokens',
  exercise('error-tagging',{sentence:'He go home.',error_type_options:['grammar'],error_token_index:1,error_type:'grammar',correction:'goes'}),
  exercise('error-tagging',{sentence:'He go home.',tokens:['He','go','home.'],error_type_options:['grammar'],error_token_index:1,error_type:'grammar',correction:'goes'}), true));
results.push(compare('Reading-vs-MC: passage cannot mask a copied item',
  exercise('multiple choice',{question:'Which device broke first?',options:['laptop','tablet'],correct:0}),
  exercise('reading comprehension',{question:'Which device broke first?',options:['laptop','tablet'],correct:0},{passage:'A visible passage only in Reading.'}), true));

const matchingFirst = {type:'matching',style:'matching',items:[{left:'alpha',right:'first'},{left:'beta',right:'second'}]};
const matchingSecond = {type:'matching',style:'matching',items:[{left:'alpha',right:'second'},{left:'gamma',right:'first'}]};
results.push(compare('Matching: same visible pool keeps the key separate', matchingFirst, matchingSecond, true, true));

for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.id}`);
const summary = {
  independentAudit:{total:independentAuditCases.length,passed:independentAuditCases.filter(result => result.pass).length},
  canonicalTypes:fixtures.length,
  total:results.length,
  passed:results.filter(result => result.pass).length,
  failed:results.filter(result => !result.pass).length,
  results
};
console.log(JSON.stringify(summary, null, 2));
if (summary.failed) process.exitCode = 1;
