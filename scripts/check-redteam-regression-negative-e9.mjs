// Positive E1–E8 gates run separately. A timeout/runtime error never counts as
// a detected vulnerability. These are deliberate broken exports, not old builds.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mutants} from './redteam-regression-mutants-e9.mjs';
const dir='qa-results/redteam-e9-negative';fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
const controls=[];
for(const m of mutants){
  const run=spawnSync(process.execPath,['scripts/'+m.script],{encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,env:{...process.env,...m.env,GIT_REDTEAM_E9_MUTANT:m.id}});
  const log=(run.stdout||'')+(run.stderr||'');
  const detected=run.status===1&&!run.error&&log.includes('ERR_ASSERTION')&&!/ReferenceError|SyntaxError|TypeError|ETIMEDOUT/.test(log);
  const file=m.id+'.log';fs.writeFileSync(dir+'/'+file,log);
  controls.push({id:m.id,stage:m.stage,script:m.script,selected:m.env||{},expectedExit:1,actualExit:run.status,detected,log:file,logSha256:createHash('sha256').update(log).digest('hex'),scope:'Actual generated artifact intentionally weakened in memory; assertion failure required'});
  console.log(detected?'PASS':'FAIL','E9 negative',m.id);if(!detected)console.error(log.slice(-2200));
}
const report={stage:'E9',version:JSON.parse(fs.readFileSync('package.json')).version,status:controls.every(x=>x.detected)?'PASS':'FAIL',syntheticOnly:true,controls,otherNegativeCoverage:'E7 contract mutations and E8 per-case/retention/native controls execute in their own gates. Existing legacy/GARP mutations remain mandatory.'};
fs.writeFileSync('qa-results/redteam-e9-negative.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.status,'PASS','Every E9 mutant must trigger an actual security assertion');
