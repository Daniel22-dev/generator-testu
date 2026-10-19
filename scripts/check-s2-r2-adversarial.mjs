#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/js/13a-secure-helpers.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const brace = source.indexOf('{', start);
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

const context = vm.createContext({ console });
vm.runInContext("function normalizeType(s){return String(s||'').trim().toLowerCase();} function specialStyleKey(){return '';}", context);
for (const name of ['valueText','hasAnyText','fidelityNormalizedText','fidelityContentTokens','fidelityItemStem','fidelitySimilarity','fidelityStyleKey','collectPedagogicalFidelityIssues']) {
  vm.runInContext(extractFunction(name), context);
}

const collect = vm.runInContext('collectPedagogicalFidelityIssues', context);
const specs = [{style:'multiple choice',type:'multiple choice'},{style:'reading comprehension',type:'reading comprehension'}];
const question = (stem, options, correct=0) => ({question:stem,options,correct});
const make = (mc, reading) => [
  {type:'multiple choice',style:'multiple choice',items:[mc]},
  {type:'reading comprehension',style:'reading comprehension',passage:'The teacher checked both samples. One was red and the other blue.',items:[reading]}
];
const cases = [
  {id:'R2-FP01-generic-best-answer-different-options', expected:'no-bad-duplicate', exercises:make(question('Choose the best answer.',['has','have']),question('Choose the best answer.',['red','blue']))},
  {id:'R2-FP02-generic-correct-form-different-options', expected:'no-bad-duplicate', exercises:make(question('Choose the correct verb form.',['go','goes']),question('Choose the correct verb form.',['went','gone']))},
  {id:'R2-FP03-generic-which-true-different-options', expected:'no-bad-duplicate', exercises:make(question('Which statement is true?',['The sun is hot.','The sun is cold.']),question('Which statement is true?',['The first sample was red.','The first sample was blue.']))},
  {id:'R2-TP01-identical-generic-prompt-and-options', expected:'bad-duplicate', exercises:make(question('Choose the correct answer.',['A true fact','A false fact']),question('Choose the correct answer.',['A true fact','A false fact']))},
  {id:'R2-TP02-identical-substantive-question', expected:'bad-duplicate', exercises:make(question('Which device broke first?',['The laptop','The tablet']),question('Which device broke first?',['The laptop','The tablet']))},
  {id:'R2-FN01-english-following-passage', expected:'hidden-context', exercises:make(question('According to the following passage, which device broke first?',['A','B']),question('Which color was used?',['Red','Blue']))},
  {id:'R2-FN02-spanish-following-text', expected:'hidden-context', exercises:make(question('Según el siguiente texto, ¿qué dispositivo falló primero?',['A','B']),question('Which color was used?',['Red','Blue']))},
  {id:'R2-CTRL01-correct-generic-different-options', expected:'no-bad-duplicate', exercises:make(question('Choose the correct answer.',['A','B']),question('Choose the correct answer.',['C','D']))},
  {id:'R2-CTRL02-existing-demonstrative', expected:'hidden-context', exercises:make(question('According to this passage, which device broke first?',['A','B']),question('Which color was used?',['Red','Blue']))}
];

const results = cases.map(testCase => {
  const issues = collect(testCase.exercises, specs);
  const duplicate = issues.some(issue => issue.code === 'literal-cross-exercise-duplicate' && issue.level === 'bad');
  const hidden = issues.some(issue => issue.code === 'independent-mc-hidden-context' && issue.level === 'bad');
  const actual = duplicate ? 'bad-duplicate' : hidden ? 'hidden-context' : 'no-bad-duplicate';
  return {id:testCase.id,expected:testCase.expected,actual,pass:testCase.expected===actual,issueCodes:issues.map(issue=>issue.code)};
});
const summary = {passed:results.filter(result=>result.pass).length,failed:results.filter(result=>!result.pass).length,total:results.length};
console.log(JSON.stringify({root,results,summary}, null, 2));
if (summary.failed) process.exitCode = 1;
