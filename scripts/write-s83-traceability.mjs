#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const START='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const allowed=new Set(['PASS','FAIL','NOT VERIFIED','DEFERRED']);
const source=JSON.parse(fs.readFileSync('docs/evidence/S08-T01-T135.json','utf8'));
const rows=structuredClone(source.rows);
const byId=new Map(rows.map(row=>[row.id,row]));
const set=(id,patch)=>Object.assign(byId.get(id),patch);
const pass=(id,evidence)=>set(id,{status:'PASS',evidence,limits:''});

pass('T19','S08.1 workflow-update source/browser regression and final S08.3 Windows regression evidence');
pass('T126','D7 effective analytics, replay/duplicate/identity/joker source and real-browser regressions');
pass('T127','D7 effective-result analytics, quarantine and scoring/import regressions');
pass('T132','Global XSS sink inventory and hostile-rendering regressions');
set('T46',{status:'NOT VERIFIED',limits:'No GitHub-hosted Linux run was authorized on the exact final S08.3 SHA; historical Linux evidence is not relabeled as current.'});
set('T48',{status:'FAIL',limits:'Package identity remains 7.1.99 and the reviewed AI-boundary candidate fingerprint is not owner-approved; neither value was changed.'});
set('T49',{status:'FAIL',limits:'The protected Windows GARP foundation runner records null execution results, the AI assurance gate rejects the stale fingerprint, and exact-final-SHA Linux CI is not available locally.'});
set('T53',{status:'FAIL',limits:'Certification remains NO-GO pending owner decisions for the AI fingerprint/protected foundation runner and an independent audit.'});

assert.equal(rows.length,135);
assert.equal(new Set(rows.map(row=>row.id)).size,135);
for(let n=1;n<=135;n++)assert.ok(byId.has(`T${String(n).padStart(2,'0')}`),`missing T${n}`);
for(const row of rows)assert.ok(allowed.has(row.status),`${row.id}: invalid status`);
assert.equal(byId.get('T110').status,'DEFERRED');
assert.equal(byId.get('T48').status,'FAIL');
assert.equal(byId.get('T49').status,'FAIL');
assert.equal(byId.get('T53').status,'FAIL');

const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.ok(branch.startsWith('codex/'),'S08.3 evidence must be produced on an isolated codex branch');
assert.notEqual(branch,'candidate');
assert.notEqual(branch,'main');
const protectedPaths=['security/garp27/trust-anchor.json','security/garp27/reviewed-consumer-profile.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/evidence/ai-assurance-fingerprint.json'];
assert.equal(execFileSync('git',['diff','--name-only',START,'--',...protectedPaths],{encoding:'utf8'}).trim(),'','protected trust/policy/fingerprint files changed');
assert.equal(JSON.parse(fs.readFileSync('package.json','utf8')).version,'7.1.99','release version change was not authorized');

const summary=Object.fromEntries([...allowed].map(status=>[status,rows.filter(row=>row.status===status).length]));
const output={schema:'git-s83-t01-t135-traceability-v1',testedProductSha:sha,branch,policy:{releaseAuthorized:false,splitScreen:'SHADOW/AUDIT-ONLY',automaticSplitLock:false,trustPinsChanged:false,aiAssuranceFingerprintChanged:false,t110:'DEFERRED'},summary,total:rows.length,rows};
const outDir=path.join('qa-results');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'s83-t01-t135.json'),JSON.stringify(output,null,2)+'\n');
console.log(`PASS S08.3 traceability: ${rows.length}/135 mapped at ${sha}; ${summary.PASS} PASS / ${summary.FAIL} FAIL / ${summary['NOT VERIFIED']} NOT VERIFIED / ${summary.DEFERRED} DEFERRED.`);
