// Idempotent SemVer patch checkpoint. Changes all runtime identities together.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const json=p=>JSON.parse(read(p));
const save=(p,o)=>write(p,JSON.stringify(o,null,2)+'\n');
const sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const pkg=json('package.json');
const from='7.1.82',to='7.1.83';
if(pkg.version===to){console.log('Red-team E7 checkpoint already prepared:',to);process.exit(0);}
if(pkg.version!==from)throw new Error('Expected E6 checkpoint '+from+'; got '+pkg.version);
const files=['package.json','package-lock.json','src/shell.html','src/js/07z-ai-core-integration.js','public/access/error-reporter-adapter.js','public/ai-operations.json','public/config/data-manifest.json','public/config/platform-manifest.json','public/config/security-headers.json','ghrab-platform.consumer.json','public/ghrab-platform.consumer.json','qa/qa-manifest.json','reporter-test.config.json','public/manual/index.html','public/manifest.webmanifest','public/sw.js','src/config/release-acceptance.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/garp27/application-migration-profile.json'];
for(const p of files){const s=read(p);if(!s.includes(from))throw new Error('Version missing: '+p);}
let core=read('src/js/01-core.js');
const marker='  changes: [\n';const start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw new Error('RELEASE.changes missing');
const rows=core.slice(start+marker.length,end).split('\n').filter(x=>x.trim());
const change="    'RED-TEAM E7 (7.1.83): 40 ručních mobilních scénářů, offline checklist a negativní kontroly záznamníku. iPhone/iPad/Android ANALYZED / NOT TESTED. F7, E6 residual/rotace a E8–E10 čekají; NOT READY.',";
core=core.slice(0,start+marker.length)+[change,...rows].slice(0,10).join('\n')+core.slice(end);
core=core.replace("version: '"+from+"'","version: '"+to+"'").replace(/date:\s*'2026-10-02'/,"date:    '2026-10-03'");
for(const p of files)write(p,read(p).replaceAll(from,to));
write('src/js/01-core.js',core);
const acceptance=json('src/config/release-acceptance.json');
acceptance.releaseStatus='redteam-e6-checkpoint-not-ready';acceptance.primaryRuntime.currentUseApproved=false;
acceptance.github.status='not-yet-uploaded';acceptance.github.postUploadValidationRequired=true;
acceptance.revision='REDTEAM-V2-E7-CHECKPOINT-2026-10-03';
acceptance.runtimeAudit={required:true,scriptsExecuted:false,partialStaticVmExecuted:false,browserRuntimeExecuted:false,transport:'Local exact-lockfile gates must be re-executed for this checkpoint.',note:'E7 authors a manual physical-device matrix and offline owner recorder. No physical mobile execution/certification. E6 public main/Pages and the exposed Actions artifact were removed in separately authorized cleanup; historical raw cache still returned 200 at the last recorded check. Support purge and private rotation remain unconfirmed. F7 content encryption, E8–E10 and client authenticity remain pending. No E7 deployment; NOT READY for classroom release.',exactLockfileCiExecuted:false,liveAiExecuted:false,productionDeploymentVerified:false};
acceptance.note='7.1.83 is a candidate-only E7 checkpoint. Do not promote it for the classroom experiment before the remaining acceptance criteria pass.';
acceptance.publication.runtimeDistributed=false;save('src/config/release-acceptance.json',acceptance);
const anchor=json('security/garp27/trust-anchor.json');anchor.appVersion=to;
anchor.architecturePolicySha256=sha('security/garp27/architecture-policy.json');anchor.capabilityInventorySha256=sha('security/garp27/capability-inventory.json');anchor.garpPolicySha256=sha('security/garp27/garp-policy.json');
anchor.note='Generator GARP 2.7 E7 manual mobile checkpoint '+to+'. Server LIVE remains deferred; classroom red-team readiness is explicitly not granted.';
save('security/garp27/trust-anchor.json',anchor);
const pin=sha('security/garp27/trust-anchor.json');
for(const name of fs.readdirSync('.github/workflows')){if(!/\.ya?ml$/.test(name))continue;const p='.github/workflows/'+name;write(p,read(p).replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[0-9a-fA-F]{64}/g,'$1'+pin));}
const p=json('package.json');for(const key of ['garp25:sbom','garp25:sbom:check'])p.scripts[key]=p.scripts[key].replace(from,to);save('package.json',p);
execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs','security/sbom/generator-testu-'+to+'.cdx.json'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs'],{stdio:'inherit'});
console.log('Prepared',to,'with',rows.length>9?10:rows.length+1,'newest-first changes and matched GARP 2.7 pins.');
