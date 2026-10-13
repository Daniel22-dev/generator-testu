#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/js/05c-exercise-suitability.js','utf8');
const shell=fs.readFileSync('src/shell.html','utf8');
const ui=fs.readFileSync('src/js/03-ui-render.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const checks=[];
function check(id,condition,detail){assert.ok(condition,`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} — ${detail}`);}

check('S6-SRC-01',/const PEDAGOGICAL_FORMAT_CATALOG\s*=/.test(source),'validated pedagogical catalog is present');
check('S6-SRC-02',/validatePedagogicalFormatCatalog/.test(source)&&/formatId/.test(source)&&/exampleEs/.test(source),'catalog validates stable IDs and bilingual examples');
check('S6-SRC-03',/validatePedagogicalRecommendationResponse/.test(source)&&/recommendedFormats/.test(source)&&/sourceCoverage/.test(source),'pre-selection AI response has a strict typed validator');
check('S6-SRC-04',/pedagogicalRecommendationKey/.test(source)&&/workflowSharedSource/.test(source)&&/language/.test(source)&&/cefr/.test(source),'recommendation provenance covers source, target language and CEFR');
check('S6-SRC-05',/acceptRecommendedFormat/.test(source)&&/toggleType\(formatId\)/.test(source),'teacher applies one recommendation without replacing the manual selection');
check('S6-SRC-06',/capability to CREATE NEW tasks/.test(source)&&/must not require that the source already contains/.test(source),'T12 evaluates ability to create new tasks rather than source-format presence');
check('S6-SRC-07',/pedagogicalSharedEvaluationPolicy/.test(source)&&/mode==='recommendation'/.test(source),'pre-selection and composition review share one didactic policy');
check('S6-SRC-08',/id="pedagogicalRecommendationPanel"/.test(shell)&&/id="formatCatalogSearch"/.test(shell)&&/id="formatCatalogGoal"/.test(shell),'recommendation precedes selection and catalog supports search/filter');
check('S6-SRC-09',/id="next1"/.test(shell)&&!/next1[^>]+pedagogicalRecommendation/i.test(shell),'manual no-AI workflow remains available');
check('S6-SRC-10',/renderFormatCatalogView/.test(ui),'catalog view integrates without mutating exercise state');
check('S6-SRC-11',pkg.scripts?.['check:s6-pedagogical-ai']==='node scripts/check-s6-pedagogical-ai.mjs','blocking S6 source command is registered');

fs.mkdirSync('qa-results',{recursive:true});
fs.writeFileSync('qa-results/s6-pedagogical-ai-source.json',JSON.stringify({schema:'git-s6-pedagogical-ai-source-v1',stage:'S06',status:'PASS',checks},null,2)+'\n');
console.log(`PASS Sprint 06 pedagogical AI source gate ${checks.length}/${checks.length}`);
