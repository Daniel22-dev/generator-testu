#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {resolveNpmCommand} from './lib/npm-command.mjs';

const root=path.resolve('.');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const target=path.resolve(process.argv[2]||path.join('.s083a-evidence',`final-${sha.slice(0,12)}`));
const commands=[
  ['build',['run','build']],
  ['assistant-source',['run','check:s83a-assistant-remediation']],
  ['assistant-browser',['run','check:s83a-assistant-remediation-browser']],
  ['ai-behavior',['run','check:s83a-ai-boundary-behavior']],
  ['ci-wiring',['run','check:s83a-ci-wiring']],
  ['ai-review',['run','check:s83-ai-boundary-review']],
  ['pedagogical-source',['run','check:s2-pedagogical-fidelity']],
  ['pedagogical-browser',['run','check:s2-pedagogical-browser']],
  ['workflow-source',['run','check:s3-workflow-fidelity']],
  ['workflow-browser',['run','check:s3-workflow-browser']],
  ['verifier-source',['run','check:s4-teacher-verifier']],
  ['verifier-browser',['run','check:s4-teacher-verifier-browser']],
  ['strict-source',['run','check:s5-strict-mode']],
  ['strict-browser',['run','check:s5-strict-mode-browser']],
  ['strict-traceability',['run','check:s5-traceability']],
  ['didactic-source',['run','check:s6-pedagogical-ai']],
  ['didactic-browser',['run','check:s6-pedagogical-ai-browser']],
  ['didactic-traceability',['run','check:s6-traceability']],
  ['teacher-workflow-source',['run','check:s7-teacher-workflow']],
  ['teacher-workflow-browser',['run','check:s7-teacher-workflow-browser']],
  ['teacher-workflow-traceability',['run','check:s7-traceability']],
  ['recovery-source',['run','check:credential-security']],
  ['recovery-browser',['run','check:s1-recovery-browser']],
  ['f0',['run','check:f0-ci-trust-pin']],
  ['garp-static',['run','qa:garp27:static']],
  ['quality-41',['run','qa:quality']],
  ['windows-ci',['test']],
  ['windows-p5',['run','qa:p5:ci']],
  ['ai-assurance',['run','garp25:ai-evidence:check']],
  ['garp-foundation',['run','qa:garp27:foundation']]
];
fs.mkdirSync(target,{recursive:true});
const records=[];
for(const [id,args] of commands){
  const startedAt=new Date().toISOString();
  const command=resolveNpmCommand(args);
  const commandText=`npm ${args.join(' ')}`;
  console.log(`\n=== ${id}: ${commandText} ===`);
  const run=spawnSync(command.program,command.args,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:100*1024*1024,windowsHide:true});
  const exitCode=Number.isInteger(run.status)?run.status:1;
  const log=[`S83.3a evidence command: ${commandText}`,`testedProductSha: ${sha}`,`branch: ${branch}`,`platform: ${process.platform} ${process.arch}`,`node: ${process.version}`,`startedAt: ${startedAt}`,`finishedAt: ${new Date().toISOString()}`,`exitCode: ${exitCode}`,'--- STDOUT ---',run.stdout||'','--- STDERR ---',run.stderr||'',run.error?`--- SPAWN ERROR ---\n${run.error.stack||run.error}`:''].join('\n');
  const logName=`${id}.log`,logPath=path.join(target,logName);fs.writeFileSync(logPath,log,'utf8');
  const record={id,command:commandText,status:exitCode===0?'PASS':'FAIL',exitCode,testedProductSha:sha,platform:`${process.platform}-${process.arch}`,node:process.version,logPath:logName,logSha256:crypto.createHash('sha256').update(log).digest('hex')};
  records.push(record);fs.writeFileSync(path.join(target,'run-manifest.partial.json'),JSON.stringify({schema:'git-s83a-final-run-manifest-v1',testedProductSha:sha,branch,records},null,2)+'\n');
  console.log(`${record.status} ${id} exit=${exitCode}`);
}
const manifest={schema:'git-s83a-final-run-manifest-v1',testedProductSha:sha,branch,createdAt:new Date().toISOString(),records};
fs.writeFileSync(path.join(target,'run-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.rmSync(path.join(target,'run-manifest.partial.json'),{force:true});
console.log(JSON.stringify({target,testedProductSha:sha,passed:records.filter(row=>row.status==='PASS').length,failed:records.filter(row=>row.status==='FAIL').length,total:records.length},null,2));
