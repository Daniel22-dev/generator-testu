#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {execFileSync} from 'node:child_process';

const root=path.resolve('.');
const runs=Number.parseInt(process.env.GIT_S83B_E4_RUNS||'10',10);
assert.ok(Number.isInteger(runs)&&runs>=10&&runs<=100,'GIT_S83B_E4_RUNS must be an integer from 10 to 100');
const script=path.join(root,'scripts','check-redteam-storage-browser-e4.mjs');
const results=[];
for(let index=1;index<=runs;index+=1){
  const started=Date.now();
  const child=spawnSync(process.execPath,[script],{
    cwd:root,
    env:{...process.env,GIT_REDTEAM_E4_CASE:'parallel-tabs'},
    encoding:'utf8',
    maxBuffer:16*1024*1024
  });
  const stdout=child.stdout||'';
  const stderr=child.stderr||'';
  const result={
    run:index,
    status:child.status===0?'PASS':'FAIL',
    exitCode:child.status,
    signal:child.signal||null,
    durationMs:Date.now()-started,
    stdoutSha256:crypto.createHash('sha256').update(stdout).digest('hex'),
    stderrSha256:crypto.createHash('sha256').update(stderr).digest('hex'),
    stdout,
    stderr
  };
  results.push(result);
  console.log(`${result.status} E4 parallel-tabs ${index}/${runs} (${result.durationMs} ms)`);
}
const failures=results.filter(item=>item.status!=='PASS');
const evidence={
  schema:'git-s083b-e4-stability-v1',
  status:failures.length?'FAIL':'PASS',
  gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  platform:process.platform,
  node:process.version,
  chromium:process.env.CHROMIUM_PATH||null,
  requestedRuns:runs,
  pass:runs-failures.length,
  fail:failures.length,
  results
};
const outDir=path.join(root,'qa-results','s083b-e4-stability');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,`${process.platform}-evidence.json`),JSON.stringify(evidence,null,2)+'\n');
assert.equal(failures.length,0,`E4 parallel-tabs stability failed in runs: ${failures.map(item=>item.run).join(', ')}`);
console.log(`PASS E4 parallel-tabs stability ${runs}/${runs} on ${process.platform}`);
