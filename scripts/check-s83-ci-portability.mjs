#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {resolveNpmCommand} from './lib/npm-command.mjs';

const root=path.resolve('.'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),checks=[];
function check(condition,id,detail){assert.ok(condition,`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
function validateScripts(scripts){
  const offenders=Object.entries(scripts).filter(([,command])=>/(?:^|&&|\|\|)\s*[A-Z][A-Z0-9_]*=[^\s]+\s+/.test(command)).map(([name])=>name);
  if(offenders.length)throw new Error(`POSIX-only environment assignment in npm scripts: ${offenders.join(', ')}`);
}
validateScripts(pkg.scripts);
check(true,'S83-CI01','npm scripts contain no POSIX-only inline environment assignment');
check(pkg.scripts['qa:p3:ci'].includes('qa:axe:required')&&pkg.scripts['qa:p5:ci'].includes('qa:p5-release:required'),'S83-CI02','both CI certification sequences use the platform-neutral required-axe wrapper');
check(pkg.scripts['qa:axe:required']==='node scripts/required-axe-runner.mjs runtime'&&pkg.scripts['qa:p5-release:required']==='node scripts/required-axe-runner.mjs release','S83-CI03','required-axe wrapper exposes only the reviewed runtime and release targets');
const wrapper=fs.readFileSync(path.join(root,'scripts','required-axe-runner.mjs'),'utf8');
check(wrapper.includes("process.env.AXE_REQUIRED='1'")&&wrapper.includes("await import(targets[target])"),'S83-CI04','wrapper sets the environment in-process before importing the selected gate');
const synthetic={...pkg.scripts,'qa:p3:ci':'npm run build && AXE_REQUIRED=1 npm run qa:axe'};
assert.throws(()=>validateScripts(synthetic),/POSIX-only environment assignment/);
check(true,'S83-CI05','negative mutation restores the Windows-breaking syntax and is rejected');
const fakeCli=path.join(root,'node_modules','npm','bin','npm-cli.js');
const win=resolveNpmCommand(['run','build'],{platform:'win32',execPath:process.execPath,npmExecPath:fakeCli,exists:file=>file===fakeCli}),posix=resolveNpmCommand(['run','build'],{platform:'linux'});
check(win.program===process.execPath&&win.args[0]===fakeCli&&posix.program==='npm','S83-CI06','npm subprocess resolution remains explicit on Windows and native on Linux');
const fullHistoryWorkflows=new Set([
  '.github/workflows/journey-e2e.yml',
  '.github/workflows/p3-quality.yml',
  '.github/workflows/p5-release-gate.yml'
]);
function checkoutUsesFullHistory(text){
  return /uses:\s*actions\/checkout@[^\r\n]+[\s\S]{0,220}?fetch-depth:\s*0(?:\s|$)/.test(text);
}
for(const file of fullHistoryWorkflows){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  check(checkoutUsesFullHistory(text),`S83-CI06-${path.basename(file,'.yml')}`,'certification checkout retains the approved historical baseline');
}
assert.equal(checkoutUsesFullHistory(fs.readFileSync(path.join(root,'.github/workflows/p5-release-gate.yml'),'utf8').replace('fetch-depth: 0','fetch-depth: 1')),false,'negative mutation must reject shallow checkout');
check(true,'S83-CI06-MUTATION','shallow checkout mutation is rejected before historical byte comparison');
// The final certification may explicitly approve a trust-anchor pin rotation.
// Normalize only that reviewed SHA replacement, the three exact full-history
// checkout lines and the exact fresh-foundation evidence path. Any other
// workflow change fails closed.
const baseline='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const protectedMainBaseline='d7bf7875a33ca97fd619cd403a276973b23d14ea';
const oldTrust='afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279';
const reviewedTrust='ec7aa8abbc4a4a915627f569eaa69b3a8da56155565b955814263bead2061006';
const baselineWorkflows=execFileSync('git',['ls-tree','-r','--name-only',baseline,'--','.github/workflows'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const protectedMainWorkflowAdditions=new Set([
  '.github/workflows/manual-browser-qa.yml',
  '.github/workflows/manual-navigation-qa.yml'
]);
const actualWorkflows=fs.readdirSync(path.join(root,'.github/workflows')).filter(name=>/\.ya?ml$/i.test(name)).map(name=>'.github/workflows/'+name).sort();
// Stage08 temporary non-deploy preproduction workflow is an exact-byte,
// branch-scoped exception only. It cannot become part of candidate/main.
const stage08Workflow='.github/workflows/stage08-preprod-verification.yml';
const stage08Sha='aa8165a5bf4f83f63cc9f1b3f62c184635334992d2f765a3c55b28b89b90d870';
const stage08AllowedRef='refs/heads/feature/stage08-groups-direct-r3-20261026';

const expectedWorkflows=[...new Set([...baselineWorkflows,...protectedMainWorkflowAdditions,stage08Workflow])].sort();
const workflowInventoryMatches=files=>JSON.stringify([...files].sort())===JSON.stringify(expectedWorkflows);
execFileSync('git',['merge-base','--is-ancestor',protectedMainBaseline,'HEAD']);
check(workflowInventoryMatches(actualWorkflows),'S83-CI07A','workflow inventory contains reviewed baseline, two protected-main workflows, and one exact SHA-pinned temporary Stage08 test workflow');
function normalizeReviewedWorkflow(text,file){
  let normalized=text.replaceAll(reviewedTrust,oldTrust);
  if(!fullHistoryWorkflows.has(file))return normalized;
  normalized=normalized.replace(/^\s*fetch-depth:\s*0\s*\r?\n/m,'');
  if(file==='.github/workflows/p3-quality.yml')normalized=normalized.replace(/^(\s*- uses: actions\/checkout@[^\r\n]+\r?\n)\s*with:\s*\r?\n(?=\s*- uses: actions\/setup-node@)/m,'$1');
  if(file==='.github/workflows/p5-release-gate.yml')normalized=normalized.replace(/^\s*qa-results\/redteam-e10-ci\/foundation-evidence\/\s*\r?\n/m,'');
  return normalized;
}
const unexpected=actualWorkflows.filter(file=>{
  if(file===stage08Workflow){
    const source=fs.readFileSync(path.join(root,file));
    const actualSha=crypto.createHash('sha256').update(source).digest('hex');
    const branchAllowed=process.env.CI!=='true'||process.env.GITHUB_REF===stage08AllowedRef;
    return pkg.version!=='7.1.102'||actualSha!==stage08Sha||!branchAllowed;
  }
  if(protectedMainWorkflowAdditions.has(file)){
    const protectedMainText=execFileSync('git',['show',protectedMainBaseline+':'+file],{encoding:'utf8'});
    return fs.readFileSync(path.join(root,file),'utf8')!==protectedMainText;
  }
  const baselineText=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'});
  const currentText=fs.readFileSync(path.join(root,file),'utf8');
  return normalizeReviewedWorkflow(currentText,file)!==baselineText;
});
check(unexpected.length===0,'S83-CI07B','workflow contents preserve reviewed exceptions, protected-main manual QA, and the exact Stage08 test-only SHA');
assert.equal(workflowInventoryMatches([...actualWorkflows,'.github/workflows/unapproved.yml']),false,'an unreviewed workflow addition must fail inventory admission');
const changedManualBrowser=fs.readFileSync(path.join(root,'.github/workflows/manual-browser-qa.yml'),'utf8').replace('timeout-minutes: 24','timeout-minutes: 25');
assert.notEqual(changedManualBrowser,execFileSync('git',['show',protectedMainBaseline+':.github/workflows/manual-browser-qa.yml'],{encoding:'utf8'}),'a protected-main workflow byte mutation must fail admission');
check(true,'S83-CI07B-MUTATION','unreviewed workflow additions and protected-main workflow byte mutations are rejected');
const p5File='.github/workflows/p5-release-gate.yml',p5Text=fs.readFileSync(path.join(root,p5File),'utf8'),p5Baseline=execFileSync('git',['show',baseline+':'+p5File],{encoding:'utf8'});
assert.notEqual(normalizeReviewedWorkflow(p5Text.replace('qa-results/redteam-e10-ci/foundation-evidence/','qa-results/unreviewed-evidence/'),p5File),p5Baseline,'unreviewed artifact paths must remain visible to the baseline comparison');
check(true,'S83-CI07C-MUTATION','an unreviewed evidence upload path is rejected');


const result={schema:'git-s83-ci-portability-v1',status:'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),platform:process.platform,node:process.version,checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results','s83-ci-portability.json'),JSON.stringify(result,null,2)+'\n');
console.log(`PASS Sprint 08.3 CI portability (${checks.length} checks)`);
