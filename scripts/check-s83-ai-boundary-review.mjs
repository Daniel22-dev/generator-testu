#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';
import {AI_ASSURANCE_FILES,buildAiAssuranceFingerprint} from './lib/ai-assurance-fingerprint.mjs';

const HISTORIC_REVIEWED='5b908065ed3f01844b77f616850064df5c324476';
const HISTORIC_SPRINT_BASE='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const OWNER_APPROVED_COMMIT='429c2a9639f1a16933eda8cb6fb06134b80c462c';
const OWNER_APPROVED_FINGERPRINT='846ebda83bdec5e5ad9538ec880dcab8255322e7d4e1f30f5434e65d305b7655';
const historicallyReviewed=[
  'src/features/preview-editor.js',
  'src/js/01-core.js',
  'src/js/03-ui-render.js',
  'src/js/05-form-fields.js',
  'src/js/05b-workflow-context.js',
  'src/js/05c-exercise-suitability.js',
  'src/js/12-prompt-builder.js',
  'src/js/13a-secure-helpers.js'
].sort();

const root=path.resolve('.');
const storedPath=path.join(root,'security','evidence','ai-assurance-fingerprint.json');
const storedBytes=fs.readFileSync(storedPath);
const stored=JSON.parse(storedBytes);
const candidate=buildAiAssuranceFingerprint({rootDir:root});
const checks=[];
function check(condition,id,detail){
  assert.ok(condition,`${id}: ${detail}`);
  checks.push({id,status:'PASS',detail});
  console.log(`PASS ${id} - ${detail}`);
}

check(stored.fingerprint===OWNER_APPROVED_FINGERPRINT,'S83-AI01','stored fingerprint equals the explicit owner-approved value');
check(candidate.fingerprint===OWNER_APPROVED_FINGERPRINT,'S83-AI02','current AI boundary equals the owner-approved fingerprint');
check(execFileSync('git',['show',`${OWNER_APPROVED_COMMIT}:security/evidence/ai-assurance-fingerprint.json`]).equals(storedBytes),'S83-AI03','stored evidence is byte-identical to the owner-approved A+B commit');

const approvedRows=new Map(stored.files.map(row=>[row.path,row]));
const currentChanged=candidate.files.filter(row=>{
  const approved=approvedRows.get(row.path);
  return !approved||approved.sha256!==row.sha256||approved.size!==row.size;
}).map(row=>row.path).sort();
check(currentChanged.length===0,'S83-AI04','no protected AI-boundary input changed after owner approval');

for(const file of AI_ASSURANCE_FILES.filter(file=>/\.(?:js|mjs)$/.test(file))){
  parse(fs.readFileSync(path.join(root,...file.split('/')),'utf8'),{
    ecmaVersion:'latest',sourceType:file.endsWith('.mjs')?'module':'script',allowAwaitOutsideFunction:true
  });
}
check(true,'S83-AI05','all JavaScript AI-boundary inputs parse with Acorn');

const historicDiff=execFileSync('git',['diff','--name-only',`${HISTORIC_REVIEWED}..${HISTORIC_SPRINT_BASE}`,'--',...AI_ASSURANCE_FILES],{encoding:'utf8'})
  .split(/\r?\n/).filter(Boolean).sort();
check(JSON.stringify(historicDiff)===JSON.stringify(historicallyReviewed),'S83-AI06','historical eight-file review scope remains reproducible and is not rewritten');

const historicPatch=execFileSync('git',['diff','--unified=0',`${HISTORIC_REVIEWED}..${HISTORIC_SPRINT_BASE}`,'--',...historicallyReviewed],{encoding:'utf8',maxBuffer:20*1024*1024});
const historicAdditions=historicPatch.split(/\r?\n/).filter(line=>line.startsWith('+')&&!line.startsWith('+++')).map(line=>line.slice(1)).join('\n');
const forbiddenAdditions=[/generativelanguage\.googleapis\.com/i,/x-goog-api-key/i,/\bXMLHttpRequest\b/,/\bnew\s+Function\s*\(/,/\beval\s*\(/,/\bfetch\s*\(/];
check(forbiddenAdditions.every(pattern=>!pattern.test(historicAdditions)),'S83-AI07','historically approved additions contain no direct provider transport, raw API header, eval or ad-hoc fetch path');

const crlfOverrides=new Map(AI_ASSURANCE_FILES.map(file=>[
  file,Buffer.from(fs.readFileSync(path.join(root,...file.split('/')),'utf8').replace(/\r\n?|\n/g,'\r\n'),'utf8')
]));
const crlf=buildAiAssuranceFingerprint({rootDir:root,overrides:crlfOverrides});
check(crlf.fingerprint===candidate.fingerprint,'S83-AI08','approved fingerprint is stable across LF/CRLF checkout normalization');

const mutationFile='src/js/05c-exercise-suitability.js';
const mutationSource=fs.readFileSync(path.join(root,...mutationFile.split('/')),'utf8');
const semanticMutation=mutationSource.replace('||seen.has(item.formatId)','');
const mutated=buildAiAssuranceFingerprint({
  rootDir:root,
  overrides:new Map([[mutationFile,Buffer.from(semanticMutation,'utf8')]])
});
check(semanticMutation!==mutationSource&&mutated.fingerprint!==candidate.fingerprint,'S83-AI09','behavior-changing duplicate-format mutation invalidates the approved fingerprint');

const result={
  schema:'git-s83-ai-boundary-review-v2',
  status:'PASS_POST_APPROVAL_REVIEW',
  gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  historicalReview:{reviewedCommit:HISTORIC_REVIEWED,sprintBase:HISTORIC_SPRINT_BASE,changedFiles:historicDiff},
  ownerApproval:{commit:OWNER_APPROVED_COMMIT,fingerprint:OWNER_APPROVED_FINGERPRINT},
  storedFingerprint:stored.fingerprint,
  candidateFingerprint:candidate.fingerprint,
  crlfCandidateFingerprint:crlf.fingerprint,
  currentChangedFiles:currentChanged,
  negativeMutation:{file:mutationFile,fingerprint:mutated.fingerprint},
  checks
};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results','s83-ai-boundary-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,ownerApprovedCommit:OWNER_APPROVED_COMMIT,storedFingerprint:stored.fingerprint,candidateFingerprint:candidate.fingerprint,currentChangedFiles:currentChanged,negativeMutation:result.negativeMutation},null,2));
