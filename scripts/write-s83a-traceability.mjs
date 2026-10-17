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
const passed=id=>artifacts.get(id)?.status==='PASS'&&artifacts.get(id)?.exitCode===0;
const failed=id=>artifacts.has(id)&&!passed(id);
const setFromArtifacts=(id,ids,{missingStatus='NOT VERIFIED',missingLimits='',failedLimits='One or more required exact-SHA evidence commands failed.'}={})=>{
  if(ids.every(passed)){set(id,{status:'PASS',limits:''});return;}
  if(ids.some(failed)){set(id,{status:'FAIL',limits:failedLimits});return;}
  set(id,{status:missingStatus,limits:missingLimits});
};

setFromArtifacts('T19',['teacher-workflow-source','teacher-workflow-browser']);
setFromArtifacts('T126',['verifier-source','verifier-browser','windows-p5']);
setFromArtifacts('T127',['verifier-source','verifier-browser','windows-p5']);
setFromArtifacts('T132',['windows-p5'],{missingLimits:'The current global XSS inventory must be evidenced by the exact-SHA P5 log.'});
setFromArtifacts('T46',['linux-ci'],{missingLimits:'Exact-final-SHA GitHub-hosted Linux CI evidence is not present in this manifest; local or historical Linux results are not substituted.'});

const packageVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
if(packageVersion==='7.1.100')setFromArtifacts('T48',['build','ai-assurance','f0'],{missingStatus:'FAIL',missingLimits:'Release identity is 7.1.100, but exact-SHA build, AI assurance and F0 evidence are not all present.',failedLimits:'Release identity 7.1.100 failed build, AI assurance or F0 evidence.'});
else set('T48',{status:'FAIL',limits:`Release identity is ${packageVersion}; 7.1.100 identity and its protected evidence have not been completed on this SHA.`});

setFromArtifacts('T49',['windows-ci','windows-p5','garp-foundation','linux-ci'],{missingLimits:'Local Windows CI/P5/foundation may be green, but exact-final-SHA GitHub-hosted Linux CI evidence is still absent.',failedLimits:'At least one required Windows, P5, GARP foundation or GitHub-hosted Linux preflight failed.'});
setFromArtifacts('T53',['release-decision'],{missingLimits:'Final production GO and physical/live-service acceptance are owner-controlled evidence and are not inferred from local automation.'});

const n=id=>Number(id.slice(1));
function artifactsFor(id){
  if(id==='T05')return ['workflow-source','workflow-browser'];
  if(id==='T19')return ['teacher-workflow-source','teacher-workflow-browser'];
  if(id==='T46')return ['linux-ci'];
  if(id==='T48')return ['build','ai-assurance','f0'];
  if(id==='T49')return ['windows-ci','windows-p5','garp-foundation','linux-ci'];
  if(id==='T53')return ['release-decision'];
  if(id==='T126'||id==='T127')return ['verifier-source','verifier-browser','windows-p5'];
  if(id==='T132')return ['windows-p5'];
  const value=n(id);if(value<=4||value>=54&&value<=63)return ['pedagogical-source'];if(value>=5&&value<=11)return ['workflow-source'];if(value===12||value>=21&&value<=42)return ['didactic-source'];if(value>=13&&value<=20)return ['teacher-workflow-source'];if([43,44,51,52].includes(value))return ['build'];if(value>=64&&value<=101)return ['strict-source'];if(value>=102&&value<=117)return ['recovery-source'];if(value>=118&&value<=135)return ['verifier-source'];throw new Error(`${id}: no evidence mapping`);
}
const allowed=new Set(['PASS','FAIL','NOT VERIFIED','DEFERRED']);
for(const row of rows){
  assert.ok(allowed.has(row.status),`${row.id}: invalid status`);
  if(row.status!=='PASS')continue;
  const artifactIds=artifactsFor(row.id),evidenceArtifacts=artifactIds.map(artifactId=>{
    const artifact=artifacts.get(artifactId);
    assert.ok(artifact,`${row.id}: missing artifact ${artifactId}`);assert.equal(artifact.status,'PASS',`${row.id}: evidence ${artifactId} did not pass`);assert.equal(artifact.exitCode,0,`${row.id}: evidence ${artifactId} exit was nonzero`);
    return {artifactId,command:artifact.command,result:artifact.status,exitCode:artifact.exitCode,testedProductSha:artifact.testedProductSha,path:path.relative(root,path.join(evidenceRoot,artifact.logPath)).replace(/\\/g,'/'),sha256:artifact.logSha256};
  });
  row.evidence={...evidenceArtifacts[0],supportingArtifacts:evidenceArtifacts};
}
assert.equal(rows.length,135);assert.equal(new Set(rows.map(row=>row.id)).size,135);for(let i=1;i<=135;i++)assert.ok(byId.has(`T${String(i).padStart(2,'0')}`));assert.equal(byId.get('T110').status,'DEFERRED');
const protectedPaths=['security/garp27/trust-anchor.json','security/garp27/reviewed-consumer-profile.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/evidence/ai-assurance-fingerprint.json'];
const ownerApprovedBase='429c2a9639f1a16933eda8cb6fb06134b80c462c';
const protectedChanges=execFileSync('git',['diff','--name-only',ownerApprovedBase,'--',...protectedPaths],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.match(packageVersion,/^7\.1\.(?:99|100)$/,'unexpected release identity');
const summary=Object.fromEntries([...allowed].map(status=>[status,rows.filter(row=>row.status===status).length]));
const output={schema:'git-s83a-t01-t135-machine-evidence-v2',testedProductSha:sha,branch,evidenceManifest:{path:path.relative(root,manifestPath).replace(/\\/g,'/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex')},policy:{packageVersion,productionPromoted:false,splitScreen:'SHADOW/AUDIT-ONLY',automaticSplitLock:false,ownerApprovedProtectedBase:ownerApprovedBase,protectedChangesSinceApprovedBase:protectedChanges,t110:'SERVER-DEFERRED'},summary,total:rows.length,rows};
const outputPath=path.join(evidenceRoot,'T01-T135-machine-evidence.json');fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(`PASS S08.3a machine traceability ${rows.length}/135 at ${sha}: ${summary.PASS} PASS / ${summary.FAIL} FAIL / ${summary['NOT VERIFIED']} NOT VERIFIED / ${summary.DEFERRED} DEFERRED`);
