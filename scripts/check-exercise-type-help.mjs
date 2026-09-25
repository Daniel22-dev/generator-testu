#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const shell = read('src/shell.html');
const helpSource = read('src/js/03a-exercise-type-help.js');
const stateUi = read('src/js/02-state-persistence.js');
const formFields = read('src/js/05-form-fields.js');
const styles = read('src/styles.css');

const start = shell.indexOf('id="typyBtns"');
const end = shell.indexOf('<div class="small-muted"', start);
if (start < 0 || end < 0) {
  console.error('FAIL: exercise type chooser block not found');
  process.exit(1);
}

const block = shell.slice(start, end);
const types = [...block.matchAll(/data-val="([^"]+)"/g)].map((match) => match[1]);
const duplicateValues = (values) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

const registryMatch = helpSource.match(/const\s+EXERCISE_TYPE_HELP\s*=\s*Object\.freeze\((\{[\s\S]*?\})\);/);
let help = null;
try {
  help = registryMatch ? Function(`"use strict"; return (${registryMatch[1]});`)() : null;
} catch (error) {
  console.error('FAIL: exercise type help registry cannot be parsed:', error.message);
  process.exit(1);
}

const helpKeys = help && typeof help === 'object' ? Object.keys(help) : [];
const typeSet = new Set(types);
const helpSet = new Set(helpKeys);
const missing = types.filter((type) => !helpSet.has(type));
const extra = helpKeys.filter((type) => !typeSet.has(type));
const duplicateTypes = duplicateValues(types);
const incomplete = helpKeys.filter((type) => {
  const entry = help[type];
  return !entry || typeof entry.summary !== 'string' || !entry.summary.trim()
    || typeof entry.example !== 'string' || !entry.example.trim();
});

const problems = [];
if (!types.length) problems.push('no exercise types found');
if (missing.length) problems.push('missing help metadata: ' + missing.join(', '));
if (extra.length) problems.push('orphan help metadata: ' + extra.join(', '));
if (duplicateTypes.length) problems.push('duplicate chooser types: ' + duplicateTypes.join(', '));
if (incomplete.length) problems.push('empty summary/example metadata: ' + incomplete.join(', '));
if (!shell.includes('id="exerciseTypePopover"')) problems.push('context help popover missing');
if (shell.includes('id="typeGuidePanel"')) problems.push('legacy expandable type guide is still present');
if (!helpSource.includes('function initExerciseTypeHelp()')) problems.push('exercise type help initializer missing');

// Simple mode must keep basic per-exercise control without leaking advanced/manual controls.
if (!stateUi.includes("btnEx.classList.remove('advanced-only')")) problems.push('Simple mode does not expose per-exercise detail button');
if (!stateUi.includes('Upravit položky a body')) problems.push('Simple mode detail label is missing');
if (!shell.includes('simple-exdetail-hint')) problems.push('Simple mode per-exercise hint is missing');
if (!formFields.includes('<span style="text-align:center">Položek</span>')) problems.push('per-exercise item-count column is missing');
if (!formFields.includes('<span style="text-align:center">Body</span>')) problems.push('per-exercise points column is missing');
if (!formFields.includes('<span style="text-align:right">b/pol.</span>')) problems.push('points-per-item column is missing');
if (!formFields.includes('Celkem položek:')) problems.push('per-exercise totals do not use item terminology');
if (!styles.includes('.advanced-mode .ex-manual-toggle { display:flex; }')) problems.push('manual generation control is not confined to Advanced mode');

if (problems.length) {
  console.error('FAIL: exercise type/help + Simple detail parity gate');
  for (const problem of problems) console.error(' - ' + problem);
  process.exit(1);
}

console.log(`PASS: ${types.length} exercise types have complete contextual help; Simple mode exposes item/point controls without advanced manual controls.`);
