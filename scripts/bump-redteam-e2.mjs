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
const from='7.1.77',to='7.1.78';
if(pkg.version===to){console.log('Red-team E2 checkpoint already prepared:',to);process.exit(0);}
if(pkg.version!==from)throw new Error('Expected E1 checkpoint '+from+'; got '+pkg.version);
const files=['package.json','package-lock.json','src/shell.html','src/js/07z-ai-core-integration.js','public/access/error-reporter-adapter.js','public/ai-operations.json','public/config/data-manifest.json','public/config/platform-manifest.json','public/config/security-headers.json','ghrab-platform.consumer.json','public/ghrab-platform.consumer.json','qa/qa-manifest.json','reporter-test.config.json','public/manual/index.html','public/manifest.webmanifest','public/sw.js','src/config/release-acceptance.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/garp27/application-migration-profile.json'];
for(const p of files){const s=read(p);if(!s.includes(from))throw new Error('Version missing: '+p);}
let core=read('src/js/01-core.js');
const marker='  changes: [\n';const start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw new Error('RELEASE.changes missing');
const rows=core.slice(start+marker.length,end).split('\n').filter(x=>x.trim());
const change="    'RED-TEAM E2 / TRUST BOUNDARIES (7.1.78): verifier rozlišuje přepočtené skóre a neprokázaný původ výsledku. Klientský self-hash, časy a telemetrie jsou CLIENT-CONTROLLED; šifrování neprokazuje autora. UI, feedback, CSV a archivy vyžadují REVIEW_REQUIRED; externí Forms vazby čekají E3. Secure generátor nevyžaduje nepoužívaný Teacher/Admin secret. Přidány skutečné artefaktové/browser kontroly a negativní kontroly starších buildů. E3–E10, startovní šifrování a živá certifikace čekají.',";
core=core.slice(0,start+marker.length)+[change,...rows].slice(0,10).join('\n')+core.slice(end);
core=core.replace("version: '"+from+"'","version: '"+to+"'").replace(/date:\s*'2026-10-02'/,"date:    '2026-10-03'");
for(const p of files)write(p,read(p).replaceAll(from,to));
write('src/js/01-core.js',core);
const acceptance=json('src/config/release-acceptance.json');
acceptance.releaseStatus='redteam-e2-checkpoint-not-ready';acceptance.primaryRuntime.currentUseApproved=false;
acceptance.github.status='not-yet-uploaded';acceptance.github.postUploadValidationRequired=true;
acceptance.revision='REDTEAM-V2-E2-CHECKPOINT-2026-10-03';
acceptance.runtimeAudit={required:true,scriptsExecuted:false,partialStaticVmExecuted:false,browserRuntimeExecuted:false,transport:'Local exact-lockfile gates must be re-executed for this checkpoint.',note:'E0 confirmed a public-key forgery with wrong Forms email, impossible times and empty telemetry accepted by the baseline verifier. E2 labels decrypted/scored submissions as unverified and requires review; external Forms identity/time/schema/replay enforcement is pending E3 and content encryption is pending F7. This checkpoint is not a live red-team release.',exactLockfileCiExecuted:false,liveAiExecuted:false,productionDeploymentVerified:false};
acceptance.note='7.1.78 is a candidate-only E2 checkpoint. Do not promote it for the classroom experiment before the remaining acceptance criteria pass.';
acceptance.publication.runtimeDistributed=false;save('src/config/release-acceptance.json',acceptance);
const anchor=json('security/garp27/trust-anchor.json');anchor.appVersion=to;
anchor.architecturePolicySha256=sha('security/garp27/architecture-policy.json');anchor.capabilityInventorySha256=sha('security/garp27/capability-inventory.json');anchor.garpPolicySha256=sha('security/garp27/garp-policy.json');
anchor.note='Generator GARP 2.7 E2 trust-boundary checkpoint '+to+'. Server LIVE remains deferred; classroom red-team readiness is explicitly not granted.';
save('security/garp27/trust-anchor.json',anchor);
const pin=sha('security/garp27/trust-anchor.json');
for(const name of fs.readdirSync('.github/workflows')){if(!/\.ya?ml$/.test(name))continue;const p='.github/workflows/'+name;write(p,read(p).replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[0-9a-fA-F]{64}/g,'$1'+pin));}
const p=json('package.json');for(const key of ['garp25:sbom','garp25:sbom:check'])p.scripts[key]=p.scripts[key].replace(from,to);save('package.json',p);
execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs','security/sbom/generator-testu-'+to+'.cdx.json'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs'],{stdio:'inherit'});
console.log('Prepared',to,'with',rows.length>9?10:rows.length+1,'newest-first changes and matched GARP 2.7 pins.');
