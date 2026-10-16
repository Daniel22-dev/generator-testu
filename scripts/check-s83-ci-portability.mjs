#!/usr/bin/env node
import assert from 'node:assert/strict';
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
// The final certification may explicitly approve a trust-anchor pin rotation.
// Normalize only that reviewed SHA replacement and compare every workflow byte
 // against the certified S08.2 baseline. Any other workflow change fails closed.
const baseline='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const oldTrust='afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279';
const reviewedTrust='50ce942425eeb000bd183b860a6899e1949668e8dd8585edf3ab1ca0e9ef05d8';
const baselineWorkflows=execFileSync('git',['ls-tree','-r','--name-only',baseline,'--','.github/workflows'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const actualWorkflows=fs.readdirSync(path.join(root,'.github/workflows')).filter(name=>/\.ya?ml$/i.test(name)).map(name=>'.github/workflows/'+name).sort();
check(JSON.stringify(actualWorkflows)===JSON.stringify([...baselineWorkflows].sort()),'S83-CI07A','workflow file inventory stays unchanged');
const unexpected=actualWorkflows.filter(file=>{
  const baselineText=execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'});
  const currentText=fs.readFileSync(path.join(root,file),'utf8');
  return currentText.replaceAll(reviewedTrust,oldTrust)!==baselineText;
});
check(unexpected.length===0,'S83-CI07B','workflow contents preserve baseline except reviewed trust SHA rotation');


const result={schema:'git-s83-ci-portability-v1',status:'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),platform:process.platform,node:process.version,checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results','s83-ci-portability.json'),JSON.stringify(result,null,2)+'\n');
console.log(`PASS Sprint 08.3 CI portability (${checks.length} checks)`);
