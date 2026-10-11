#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const formSource = read('src/js/05-form-fields.js');
const uiSource = read('src/js/03-ui-render.js');
const stateSource = read('src/js/02-state-persistence.js');
const promptSource = read('src/js/12-prompt-builder.js');
const rosterSource = read('src/js/10-testlab.js');
const shellSource = read('src/shell.html');

function extractFunction(source, name) {
  const functionStart = source.indexOf(`function ${name}(`);
  if (functionStart < 0) return '';
  const start = source.slice(Math.max(0, functionStart - 6), functionStart) === 'async ' ? functionStart - 6 : functionStart;
  const brace = source.indexOf('{', functionStart);
  let depth = 0, quote = '', escaped = false, line = false, block = false;
  for (let i = brace; i < source.length; i++) {
    const char = source[i], next = source[i + 1] || '';
    if (line) { if (char === '\n') line = false; continue; }
    if (block) { if (char === '*' && next === '/') { block = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { line = true; i++; continue; }
    if (char === '/' && next === '*') { block = true; i++; continue; }
    if ('"\'`'.includes(char)) { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

const results = [];
async function check(id, run) {
  try {
    await run();
    results.push({ id, status:'PASS' });
    console.log(`PASS ${id}`);
  } catch (error) {
    results.push({ id, status:'FAIL', detail:error.message });
    console.error(`FAIL ${id}: ${error.message}`);
  }
}

function workflowContext(initialState) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value:'', innerHTML:'', textContent:'', classList:{add(){},remove(){},toggle(){}}, querySelector(){return null;} });
    return elements.get(id);
  };
  let confirmResult = true;
  const context = vm.createContext({
    console,
    state:structuredClone(initialState),
    document:{ getElementById:element, querySelectorAll(){ return []; } },
    setTimeout(fn){ fn(); return 1; },
    clearTimeout(){},
    $:element,
    setVal(id, value){ element(id).value = value == null ? '' : String(value); },
    trim(){ return ''; },
    normalizeType(value){ return String(value || '').trim().toLowerCase(); },
    specialStyleKey(){ return ''; },
    isAllowedExerciseType(){ return true; },
    isManualSupported(){ return false; },
    uniqueExerciseTypes(values){ return [...new Set((values || []).filter(Boolean))]; },
    defaultItemCount(type, st){
      const key = String(type).toLowerCase() === 'reading comprehension' ? 'readingQuestionCount' : 'listeningQuestionCount';
      return Math.max(1, Math.min(30, Number(st?.[key] ?? context.state[key]) || 4));
    },
    renderExerciseConfig(){}, renderExTotals(){}, renderSmartTimeTip(){}, applyVisualState(){}, renderHybridBanner(){}, validate(){}, saveSnapshot(){}, initTooltips(){},
    uiToast(){}, uiAlert(){},
    async uiConfirm(){ return confirmResult; }
  });
  context.__setConfirm = value => { confirmResult = value; };
  for (const name of [
    'hasConfiguredExercises', 'exercisePointsTotal', 'syncDetailedPointsTotal', 'exercisePointsDistribution',
    'syncExercisePoints', 'syncExerciseConfig', 'distributeExercisePoints', 'updateExField',
    'comprehensionCountKey', 'configuredComprehensionIndexes', 'effectiveComprehensionQuestionCount',
    'syncComprehensionCountsFromConfig', 'syncComprehensionControl'
  ]) {
    const fn = extractFunction(formSource, name);
    if (fn) vm.runInContext(fn, context);
  }
  vm.runInContext(extractFunction(uiSource, 'setComprehensionQuestionCount'), context);
  return { context, elements };
}

await check('T09-manual-opens-without-destroying-generator-context', () => {
  const tag = shellSource.match(/<a[^>]+id="btnManual"[^>]*>/)?.[0] || '';
  assert.match(tag, /href="\.\/manual\/\?from=app"/);
  assert.match(tag, /target="_blank"/);
  assert.match(tag, /rel="[^"]*noopener[^"]*"/);
});

await check('T06-detailed-points-are-immediate-source-of-truth', () => {
  const { context, elements } = workflowContext({
    body:29, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:[{typ:'multiple choice',pocetOtazek:5,body:8},{typ:'translation',pocetOtazek:5,body:8}], typyCviceni:[]
  });
  vm.runInContext("updateExField(0,'body','5')", context);
  assert.equal(context.state.body, 13);
  assert.equal(elements.get('bodyCustom')?.value, '13');
});

await check('T07-distribute-29-as-6-6-6-6-5', async () => {
  const { context } = workflowContext({
    body:29, pocet:5, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:[1,1,1,1,25].map(body => ({typ:'multiple choice',pocetOtazek:5,body})), typyCviceni:[]
  });
  context.__setConfirm(true);
  await vm.runInContext('distributeExercisePoints()', context);
  assert.deepEqual(Array.from(context.state.exerciseConfig, ex => ex.body), [6,6,6,6,5]);
  assert.equal(context.state.body, 29);
});

await check('T08-distribution-requires-conscious-confirmation', async () => {
  const { context } = workflowContext({
    body:29, pocet:5, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:[1,1,1,1,25].map(body => ({typ:'multiple choice',pocetOtazek:5,body})), typyCviceni:[]
  });
  context.__setConfirm(false);
  await vm.runInContext('distributeExercisePoints()', context);
  assert.deepEqual(Array.from(context.state.exerciseConfig, ex => ex.body), [1,1,1,1,25]);
});

await check('S3-negative-target-smaller-than-exercise-count-never-creates-zero', () => {
  const { context } = workflowContext({
    body:3, pocet:5, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:Array.from({length:5}, () => ({typ:'multiple choice',pocetOtazek:5,body:1})), typyCviceni:[]
  });
  const before = Array.from(context.state.exerciseConfig, ex => ex.body);
  const accepted = vm.runInContext('syncExercisePoints(3)', context);
  assert.equal(accepted, false);
  assert.deepEqual(Array.from(context.state.exerciseConfig, ex => ex.body), before);
});

await check('T04-T05-primary-reading-panel-updates-only-its-exercise', () => {
  const { context } = workflowContext({
    readingQuestionCount:5, listeningQuestionCount:4, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:5,body:10},
      {typ:'multiple choice',pocetOtazek:4,body:4},
      {typ:'reading comprehension',pocetOtazek:9,body:9}
    ], typyCviceni:[]
  });
  vm.runInContext("setComprehensionQuestionCount('reading comprehension',7)", context);
  assert.deepEqual(Array.from(context.state.exerciseConfig, ex => ex.pocetOtazek), [7,4,9]);
  assert.equal(context.state.readingQuestionCount, 7);
});

await check('T05-secondary-reading-detail-does-not-overwrite-primary-panel', () => {
  const { context } = workflowContext({
    readingQuestionCount:5, listeningQuestionCount:4, exerciseDetail:true, exerciseConfigSaved:true,
    exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:5,body:10},
      {typ:'reading comprehension',pocetOtazek:9,body:9}
    ], typyCviceni:[]
  });
  vm.runInContext("updateExField(1,'pocetOtazek','8')", context);
  assert.equal(context.state.readingQuestionCount, 5);
  assert.deepEqual(Array.from(context.state.exerciseConfig, ex => ex.pocetOtazek), [5,8]);
});

await check('T05-loaded-state-reconciles-panel-to-primary-reading', () => {
  const { context } = workflowContext({ readingQuestionCount:4, listeningQuestionCount:4, exerciseConfig:[] });
  const normalize = extractFunction(stateSource, 'normalizeLoadedState');
  vm.runInContext(normalize, context);
  const loaded = {
    appMode:'advanced', workPreset:'advanced', readingQuestionCount:4, listeningQuestionCount:4,
    exerciseDetail:false, exerciseConfigSaved:true, exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:7,body:7},
      {typ:'reading comprehension',pocetOtazek:9,body:9}
    ], typyCviceni:[]
  };
  context.loaded = loaded;
  vm.runInContext('normalizeLoadedState(loaded)', context);
  assert.equal(loaded.readingQuestionCount, 7);
  assert.equal(loaded.body, 16);
});

await check('T04-prompt-specs-preserve-per-exercise-reading-counts-and-points', () => {
  const context = vm.createContext({
    console,
    trim(){ return ''; },
    hasConfiguredExercises(st){ return !!(st.exerciseDetail || st.exerciseConfigSaved); },
    uniqueExerciseTypes(values){ return [...new Set((values || []).filter(Boolean))]; },
    sanitizeExerciseTypeList(values){ return values || []; },
    isAllowedExerciseType(){ return true; },
    specialStyleKey(){ return ''; },
    scoringTypeFor(value){ return String(value || '').toLowerCase(); }
  });
  for (const name of ['normalizeType','defaultItemCount','buildExerciseSpecs']) vm.runInContext(extractFunction(promptSource, name), context);
  context.fixture = {
    readingQuestionCount:5, listeningQuestionCount:4, exerciseDetail:true, exerciseConfigSaved:true,
    typyCviceni:['reading comprehension'],
    exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:7,body:14},
      {typ:'reading comprehension',pocetOtazek:9,body:18}
    ]
  };
  const specs = vm.runInContext('buildExerciseSpecs(fixture)', context);
  assert.deepEqual(Array.from(specs, spec => [spec.count,spec.pts]), [[7,14],[9,18]]);
});

await check('T09-T10-roster-28-codes-and-repeat-csv-are-stable', () => {
  let csv = '';
  const emails = Array.from({length:28}, (_, index) => `synthetic-${String(index + 1).padStart(2, '0')}@example.invalid`).join('\n');
  const context = vm.createContext({
    console, crypto:crypto.webcrypto, state:{}, Map, Set, Uint32Array,
    rosterEntries:[], lastAssembled:null,
    val(id){ return id === 'rosterEmails' ? emails : ''; },
    rosterRender(){}, validate(){},
    outputSlug(){ return 'synthetic'; },
    downloadBlobFile(content){ csv = content; }
  });
  const rosterStart = rosterSource.indexOf('function rosterParseEmails(');
  const rosterEnd = rosterSource.indexOf('function outputSlug(');
  assert.ok(rosterStart >= 0 && rosterEnd > rosterStart, 'roster workflow source block is missing');
  vm.runInContext(
    rosterSource.slice(rosterStart, rosterEnd) + '\n' +
    extractFunction(rosterSource, 'rosterChosenParticipants') + '\nrosterRender=()=>{};',
    context
  );
  vm.runInContext('rosterGenerate()', context);
  const first = vm.runInContext('rosterEntries.map(e=>({email:e.email,code:e.code}))', context);
  vm.runInContext('rosterDownloadCsv()', context);
  const firstCsv = csv;
  vm.runInContext('rosterGenerate();rosterDownloadCsv()', context);
  const second = vm.runInContext('rosterEntries.map(e=>({email:e.email,code:e.code}))', context);
  assert.equal(first.length, 28);
  assert.equal(new Set(first.map(entry => entry.code)).size, 28);
  assert.deepEqual(JSON.parse(JSON.stringify(second)), JSON.parse(JSON.stringify(first)));
  assert.equal(csv, firstCsv);
});

const summary = {
  sprint:'03-session-scoring-reading',
  passed:results.filter(result => result.status === 'PASS').length,
  failed:results.filter(result => result.status === 'FAIL').length,
  total:results.length,
  results
};
console.log(JSON.stringify(summary, null, 2));
if (summary.failed) process.exitCode = 1;
