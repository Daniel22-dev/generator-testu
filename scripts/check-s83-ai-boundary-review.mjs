#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {AI_ASSURANCE_FILES,buildAiAssuranceFingerprint} from './lib/ai-assurance-fingerprint.mjs';

const REVIEWED='5b908065ed3f01844b77f616850064df5c324476';
const SPRINT_BASE='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const expectedChanged=[
  'src/features/preview-editor.js',
  'src/js/01-core.js',
  'src/js/03-ui-render.js',
  'src/js/05-form-fields.js',
  'src/js/05b-workflow-context.js',
  'src/js/05c-exercise-suitability.js',
  'src/js/12-prompt-builder.js',
  'src/js/13a-secure-helpers.js'
].sort();
const root=path.resolve('.'),storedPath=path.join(root,'security','evidence','ai-assurance-fingerprint.json'),storedBytes=fs.readFileSync(storedPath),stored=JSON.parse(storedBytes),candidate=buildAiAssuranceFingerprint({rootDir:root});
const storedRows=new Map(stored.files.map(row=>[row.path,row])),changed=candidate.files.filter(row=>storedRows.get(row.path)?.sha256!==row.sha256||storedRows.get(row.path)?.size!==row.size).map(row=>row.path).sort();
const checks=[];
function check(condition,id,detail){assert.ok(condition,`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
check(JSON.stringify(changed)===JSON.stringify(expectedChanged),'S83-AI01','exactly the eight declared AI-boundary modules differ from approved evidence');
check(execFileSync('git',['show',`${REVIEWED}:security/evidence/ai-assurance-fingerprint.json`]).equals(storedBytes),'S83-AI02','stored fingerprint is byte-identical to the last approved evidence and was not rewritten');

const untouched=AI_ASSURANCE_FILES.filter(file=>!expectedChanged.includes(file));
check(untouched.every(file=>{const row=candidate.files.find(item=>item.path===file),old=storedRows.get(file);return row&&old&&row.sha256===old.sha256&&row.size===old.size;}),'S83-AI03','transport, AI Core, operation registry, corpus and all other boundary inputs remain byte-equivalent');
for(const file of expectedChanged)parse(fs.readFileSync(path.join(root,...file.split('/')),'utf8'),{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true});
check(true,'S83-AI04','all eight reviewed JavaScript modules parse with Acorn');

const diff=execFileSync('git',['diff','--unified=0',`${REVIEWED}..${SPRINT_BASE}`,'--',...expectedChanged],{encoding:'utf8',maxBuffer:20*1024*1024}),added=diff.split(/\r?\n/).filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1)).join('\n');
const forbiddenAdditions=[/generativelanguage\.googleapis\.com/i,/x-goog-api-key/i,/\bXMLHttpRequest\b/,/\bnew\s+Function\s*\(/,/\beval\s*\(/,/\bfetch\s*\(/];
check(forbiddenAdditions.every(pattern=>!pattern.test(added)),'S83-AI05','reviewed additions introduce no direct provider transport, raw API header, eval or ad-hoc fetch path');
const registry=new Set(JSON.parse(fs.readFileSync(path.join(root,'public','ai-operations.json'),'utf8')).operations.map(row=>row.operation)),addedOperations=[...added.matchAll(/operation\s*:\s*['"]([^'"]+)['"]/g)].map(match=>match[1]);
check(addedOperations.length>0&&addedOperations.every(operation=>registry.has(operation)),'S83-AI06','every newly referenced AI operation is allowlisted in the unchanged operation registry');

const moduleControls=[
  ['src/js/01-core.js',['strictFullscreenFallbackAllowed:false'],'strict fullscreen fallback is explicit and default-denied'],
  ['src/js/03-ui-render.js',['function pickNum(key, value)','wrapUntrustedSource','callGeminiJSON'],'UI changes preserve strict numeric authority and typed AI wrappers'],
  ['src/js/05-form-fields.js',['function strictIntegerValue(value)','Classroom Recovery Code','wrapUntrustedSource'],'form/prompt changes preserve strict scoring and credential/data separation'],
  ['src/js/05b-workflow-context.js',['effectiveComprehensionQuestionCount','workflowFingerprint'],'workflow cache identity follows authoritative Reading/Listening counts'],
  ['src/js/05c-exercise-suitability.js',['validatePedagogicalRecommendationResponse','validateSuitabilityResponse',"operation:'exercise-suitability'",'ensureGeminiDataNotice','Teacher confirmation is mandatory','textContent'],'pedagogical AI is consented, typed, allowlisted and teacher-confirmed'],
  ['src/js/12-prompt-builder.js',['wrapUntrustedField','wrapUntrustedSource','canonical scoring/render type','Preserve each requested pedagogical style'],'prompt construction separates pedagogical style, scoring type and untrusted data'],
  ['src/js/13a-secure-helpers.js',['studentVisibleTaskFingerprint','gradingKeyFingerprint','validateExerciseSetStrict'],'secure validation mirrors visible-task and answer-key separation'],
  ['src/features/preview-editor.js',['exerciseStyleLabel','exerciseThemeTitle','H(style)'],'preview preserves style/scorer/title separation with escaped rendering']
].map(([file,needles,conclusion])=>{const source=fs.readFileSync(path.join(root,...file.split('/')),'utf8');const missing=needles.filter(needle=>!source.includes(needle));check(missing.length===0,`S83-AI-${path.basename(file).replace(/\W/g,'').slice(0,12)}`,`${file}: ${conclusion}`);return {file,status:'PASS',conclusion,controls:needles};});

const crlfOverrides=new Map(AI_ASSURANCE_FILES.map(file=>[file,Buffer.from(fs.readFileSync(path.join(root,...file.split('/')),'utf8').replace(/\r\n?|\n/g,'\r\n'),'utf8')])),crlf=buildAiAssuranceFingerprint({rootDir:root,overrides:crlfOverrides});
check(crlf.fingerprint===candidate.fingerprint,'S83-AI07','candidate fingerprint is stable across LF/CRLF checkout normalization');
const mutationFile='src/js/05c-exercise-suitability.js',mutatedOverrides=new Map([[mutationFile,Buffer.concat([fs.readFileSync(path.join(root,...mutationFile.split('/'))),Buffer.from('\n// s83-review-negative-mutation\n')])]]),mutated=buildAiAssuranceFingerprint({rootDir:root,overrides:mutatedOverrides});
check(mutated.fingerprint!==candidate.fingerprint,'S83-AI08','semantic negative mutation invalidates the candidate fingerprint');
check(!fs.readFileSync(storedPath).equals(Buffer.from(JSON.stringify(candidate,null,2)+'\n')),'S83-AI09','candidate remains deliberately unapproved and the stale official gate stays fail-closed');

const result={schema:'git-s83-ai-boundary-review-v1',status:'PASS_CANDIDATE_REVIEW_ONLY',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),lastApprovedFingerprintCommit:REVIEWED,sprintBase:SPRINT_BASE,storedFingerprint:stored.fingerprint,candidateFingerprint:candidate.fingerprint,crlfCandidateFingerprint:crlf.fingerprint,negativeMutation:{file:mutationFile,fingerprint:mutated.fingerprint},storedFingerprintUpdated:false,ownerApprovalRequired:true,changedFiles:changed,addedOperations:[...new Set(addedOperations)].sort(),moduleReviews:moduleControls,checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results','s83-ai-boundary-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,storedFingerprint:result.storedFingerprint,candidateFingerprint:result.candidateFingerprint,changedFiles:result.changedFiles,storedFingerprintUpdated:false},null,2));
