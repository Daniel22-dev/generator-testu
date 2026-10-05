#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const sourceFile = process.argv[2] || 'src/js/13f-secure-teacher-verifier.js';
const dependencyFiles = [
  'src/js/13b-secure-shared-scoring.js',
  'src/js/13ea-secure-verifier-forms.js',
  'src/js/13eb-secure-teacher-verifier-v2-ui.js',
  'src/js/13ec-secure-verifier-trust.js',
  'src/js/13ed-secure-verifier-validation.js',
  'src/js/13ee-secure-verifier-anchors.js',
  'src/js/13ef-secure-verifier-replay.js',
  'src/js/13eg-secure-verifier-history.js',
  'src/js/13fa-secure-teacher-verifier-pdf.js',
];
const context = vm.createContext({
  console,
  H: value => String(value ?? ''),
  secureCss: () => '',
  auditCommentHtml: () => '',
  safeJsonForScript: value => JSON.stringify(value).replace(/</g, '\\u003c'),
});

for (const file of dependencyFiles) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    new vm.Script(code, { filename: file }).runInContext(context);
  } catch (error) {
    console.error(`FAIL R1: dependency ${file} does not parse/evaluate: ${error.message}`);
    process.exit(1);
  }
}

const source = fs.readFileSync(sourceFile, 'utf8');
try {
  new vm.Script(source, { filename: sourceFile }).runInContext(context);
} catch (error) {
  console.error(`FAIL R1: source file itself does not parse: ${error.message}`);
  process.exit(1);
}

if (typeof context.buildSecureTeacherVerifierHtml !== 'function') {
  console.error('FAIL R1: buildSecureTeacherVerifierHtml was not defined.');
  process.exit(1);
}

const cfg = {
  generatorVersion: 'R1-SYNTAX-GATE',
  buildHash: 'r1', releaseDate: '2026-10-02', releaseStatus: 'qa', generatedAt: '2026-10-02T00:00:00Z',
  creatorId: 'qa', creatorName: 'QA', creatorRole: 'teacher', testId: 'R1-VERIFIER-SYNTAX',
  manifestHash: 'r1', studentHtmlSha256: 'r1', nazev: 'R1 Verifier syntax gate', proKoho: 'QA',
  isSpanish: false, isCzech: false, csScoringPolicy: {}, cefr: 'B1', cefrLevels: ['B1'], cefrCombined: false,
  totalBody: 1, gradeTyp: 'cz', gradeScale: [], gradeScaleRaw: '', fuzzyTolerance: 'off', cas: 5,
  identityMode: 'name', roster: [], schoolLogoDataUri: '', privateKey: {},
};
const variants = { __default: [] };
let html;
try {
  html = context.buildSecureTeacherVerifierHtml(cfg, variants);
} catch (error) {
  console.error(`FAIL R1: verifier HTML generation failed: ${error.message}`);
  process.exit(1);
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
if (!scripts.length) {
  console.error('FAIL R1: generated verifier contains no inline script.');
  process.exit(1);
}

let failed = 0;
for (let i = 0; i < scripts.length; i++) {
  try {
    new vm.Script(scripts[i], { filename: `generated-teacher-verifier-inline-${i + 1}.js` });
    console.log(`PASS R1: inline verifier script ${i + 1}/${scripts.length} parses.`);
  } catch (error) {
    failed++;
    console.error(`FAIL R1: generated verifier inline script ${i + 1} does not parse: ${error.message}`);
  }
}

const main = scripts.join('\n');
for (const symbol of ['renderTable','downloadResultsCsv','parseFormsCsvText','bulkVerifyPasted','downloadDirectPdf']) {
  if (!new RegExp(`function\\s+${symbol}\\b`).test(main)) {
    failed++;
    console.error(`FAIL R1: expected verifier function ${symbol} is missing from generated script.`);
  } else {
    console.log(`PASS R1: generated verifier contains ${symbol}().`);
  }
}

if (failed) process.exit(1);
console.log('R1 generated Teacher Verifier syntax gate PASS.');
