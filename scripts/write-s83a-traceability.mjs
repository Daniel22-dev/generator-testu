#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve('.');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const manifestPath=path.resolve(process.argv[2]||path.join('.s083a-evidence',`final-${sha.slice(0,12)}`,'run-manifest.json'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(manifest.testedProductSha,sha,'evidence manifest must target exact HEAD');
const evidenceRoot=path.dirname(manifestPath),artifacts=new Map(manifest.records.map(row=>[row.id,row]));
for(const row of manifest.records){const file=path.join(evidenceRoot,row.logPath);assert.ok(fs.existsSync(file),`${row.id}: missing log`);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.logSha256,`${row.id}: log hash mismatch`);assert.equal(row.testedProductSha,sha,`${row.id}: SHA mismatch`);}

const source=JSON.parse(fs.readFileSync(path.join(root,'docs','evidence','S08-T01-T135.json'),'utf8'));
const rows=structuredClone(source.rows),byId=new Map(rows.map(row=>[row.id,row]));
const set=(id,patch)=>Object.assign(byId.get(id),patch);
for(const id of ['T19','T126','T127','T132'])set(id,{status:'PASS',limits:''});
set('T46',{status:'NOT VERIFIED',limits:'Exact-final-SHA Linux CI was not executable in the authorized local Windows environment; historical 436/436 is retained only as prior evidence.'});
set('T48',{status:'FAIL',limits:'The reviewed candidate AI fingerprint is not owner-approved and the release version was intentionally unchanged.'});
set('T49',{status:'FAIL',limits:'The protected Windows GARP foundation runner and stale AI assurance evidence remain fail-closed; exact-final-SHA Linux CI is unavailable locally.'});
set('T53',{status:'FAIL',limits:'Certification remains NO-GO pending owner approval for protected evidence updates and an independent audit.'});

const n=id=>Number(id.slice(1));
function artifactFor(id){const value=n(id);if(value<=4||value>=54&&value<=63)return 'pedagogical-source';if(value>=5&&value<=11)return 'workflow-source';if(value===12||value>=21&&value<=42)return 'didactic-source';if(value>=13&&value<=20)return 'teacher-workflow-source';if([43,44,51,52].includes(value))return 'build';if(value>=64&&value<=101)return 'strict-source';if(value>=102&&value<=117)return 'recovery-source';if(value>=118&&value<=135)return 'verifier-source';throw new Error(`${id}: no evidence mapping`);}
const allowed=new Set(['PASS','FAIL','NOT VERIFIED','DEFERRED']);
for(const row of rows){
  assert.ok(allowed.has(row.status),`${row.id}: invalid status`);
  if(row.status!=='PASS')continue;
  const artifactId=artifactFor(row.id),artifact=artifacts.get(artifactId);
  assert.ok(artifact,`${row.id}: missing artifact ${artifactId}`);assert.equal(artifact.status,'PASS',`${row.id}: evidence ${artifactId} did not pass`);assert.equal(artifact.exitCode,0,`${row.id}: evidence exit was nonzero`);
  row.evidence={artifactId,command:artifact.command,result:artifact.status,exitCode:artifact.exitCode,testedProductSha:artifact.testedProductSha,path:path.relative(root,path.join(evidenceRoot,artifact.logPath)).replace(/\\/g,'/'),sha256:artifact.logSha256};
}
assert.equal(rows.length,135);assert.equal(new Set(rows.map(row=>row.id)).size,135);for(let i=1;i<=135;i++)assert.ok(byId.has(`T${String(i).padStart(2,'0')}`));assert.equal(byId.get('T110').status,'DEFERRED');
const protectedPaths=['security/garp27/trust-anchor.json','security/garp27/reviewed-consumer-profile.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/evidence/ai-assurance-fingerprint.json'];
assert.equal(execFileSync('git',['diff','--name-only','f886346fa4ed65c0f657368aa14328cee0bf664f','--',...protectedPaths],{encoding:'utf8'}).trim(),'','protected trust/policy/fingerprint files changed');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,'7.1.99','version change was not authorized');
const summary=Object.fromEntries([...allowed].map(status=>[status,rows.filter(row=>row.status===status).length]));
const output={schema:'git-s83a-t01-t135-machine-evidence-v1',testedProductSha:sha,branch,evidenceManifest:{path:path.relative(root,manifestPath).replace(/\\/g,'/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex')},policy:{releaseAuthorized:false,splitScreen:'SHADOW/AUDIT-ONLY',automaticSplitLock:false,trustPinsChanged:false,aiAssuranceFingerprintChanged:false,t110:'SERVER-DEFERRED'},summary,total:rows.length,rows};
const outputPath=path.join(evidenceRoot,'T01-T135-machine-evidence.json');fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(`PASS S08.3a machine traceability ${rows.length}/135 at ${sha}: ${summary.PASS} PASS / ${summary.FAIL} FAIL / ${summary['NOT VERIFIED']} NOT VERIFIED / ${summary.DEFERRED} DEFERRED`);
