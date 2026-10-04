import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const inputs=[{version:'7.1.76',file:process.env.GIT_REDTEAM_BASELINE_HTML,case:'generated-student-and-private-pair'},{version:'7.1.81',file:process.env.GIT_REDTEAM_E5_HTML,case:'export-answer-derivative-rejection'}];
const controls=[];fs.mkdirSync('redteam/E6',{recursive:true});
for(const input of inputs) {
  assert.ok(input.file&&fs.existsSync(input.file),'Explicit actual historical HTML snapshot required for '+input.version);
  const html=fs.readFileSync(input.file);assert.ok(html.includes(Buffer.from(input.version)),'Wrong historical version');
  const run=spawnSync(process.execPath,['scripts/check-redteam-publication-e6.mjs'],{encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024,env:{...process.env,GIT_REDTEAM_GENERATOR_HTML:input.file,GIT_REDTEAM_E6_CASE:input.case}});
  const log=(run.stdout||'')+(run.stderr||'');
  assert.equal(run.status,1,'Negative control must return assertion failure');assert.match(log,/AssertionError/);assert.doesNotMatch(log,/ReferenceError|TypeError|SyntaxError|ETIMEDOUT/);
  const logPath='redteam/E6/negative-'+input.version+'.log';fs.writeFileSync(logPath,log.replace(/\x1b\[[0-9;]*[a-zA-Z]/g,''));
  controls.push({version:input.version,case:input.case,sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),exitCode:run.status,expectedRejected:true,reason:'AssertionError; no missing dependency, syntax/runtime error or timeout accepted',log:logPath});
}
fs.writeFileSync('redteam/E6/negative-controls.json',JSON.stringify({schema:'git-redteam-e6-historical-negative-v1',status:'PASS',controls},null,2)+'\n');console.log('PASS E6 actual historical negative controls:',controls.length);
