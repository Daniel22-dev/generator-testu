#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd(),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const git=(args,options={})=>execFileSync('git',args,{cwd:root,...options});
const anchorPath='security/garp27/trust-anchor.json';
const anchor=JSON.parse(fs.readFileSync(anchorPath,'utf8'));
const consumerPath='tools/ci-standard/consumers/generator-testu.json';
const consumer=JSON.parse(fs.readFileSync(consumerPath,'utf8'));
const workflowPaths=fs.readdirSync('.github/workflows').filter(name=>/\.ya?ml$/i.test(name)).map(name=>'.github/workflows/'+name);
const pinnedWorkflows=workflowPaths.filter(file=>fs.readFileSync(file,'utf8').includes('GARP27_EXTERNAL_TRUST_SHA256'));
const vendorPaths=git(['ls-files','vendor/garp-2.7-consolidated-r2']).toString('utf8').trim().split(/\r?\n/).filter(Boolean);
const bytePinned=[
  anchorPath,consumerPath,
  'security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json',
  ...Object.keys(anchor.adapterToolSha256s||{}),...vendorPaths,...pinnedWorkflows,
];

const attr=git(['check-attr','eol','--',...bytePinned]).toString('utf8').trim().split(/\r?\n/);
assert.equal(attr.length,bytePinned.length,'every byte-pinned path must have an eol policy');
for(const line of attr)assert.match(line,/^.+: eol: lf$/,'byte-pinned file is not declared eol=lf: '+line);

for(const file of bytePinned){
  const worktree=fs.readFileSync(file),blob=git(['show','HEAD:'+file]);
  assert.equal(worktree.includes(13),false,file+' contains CR bytes in the worktree');
  assert.equal(Buffer.compare(worktree,blob),0,file+' differs byte-for-byte between Git blob and worktree');
}

const anchorBytes=fs.readFileSync(anchorPath),anchorSha=sha(anchorBytes);
const trust=consumer.trustInputs?.find(item=>item.environment==='GARP27_EXTERNAL_TRUST_SHA256');
assert.equal(anchorSha,'afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279','approved trust anchor bytes changed');
assert.equal(trust?.sha256,anchorSha,'consumer profile pin differs from trust anchor');
let workflowPins=0;
for(const file of pinnedWorkflows)for(const match of fs.readFileSync(file,'utf8').matchAll(/GARP27_EXTERNAL_TRUST_SHA256:\s*([0-9a-f]{64})/gi)){
  workflowPins++;assert.equal(match[1].toLowerCase(),anchorSha,file+' workflow pin differs from trust anchor');
}
assert.ok(workflowPins>0,'no workflow trust pins found');

const crlf=Buffer.from(anchorBytes.toString('utf8').replace(/\n/g,'\r\n'),'utf8');
assert.notEqual(sha(crlf),anchorSha,'CRLF mutation must change the byte-pinned digest');

const report={schema:'git-s81-byte-checkout-policy-v1',status:'PASS',anchorSha256:anchorSha,approvedPinUnchanged:true,bytePinnedFiles:bytePinned.length,workflowPins,negativeMutation:{kind:'LF_TO_CRLF_IN_MEMORY',sha256:sha(crlf),detected:sha(crlf)!==anchorSha}};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s81-byte-checkout-policy.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
