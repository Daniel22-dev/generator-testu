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
const from='7.1.79',to='7.1.80';
if(pkg.version===to){console.log('Red-team E4 checkpoint already prepared:',to);process.exit(0);}
if(pkg.version!==from)throw new Error('Expected E3 checkpoint '+from+'; got '+pkg.version);
const files=['package.json','package-lock.json','src/shell.html','src/js/07z-ai-core-integration.js','public/access/error-reporter-adapter.js','public/ai-operations.json','public/config/data-manifest.json','public/config/platform-manifest.json','public/config/security-headers.json','ghrab-platform.consumer.json','public/ghrab-platform.consumer.json','qa/qa-manifest.json','reporter-test.config.json','public/manual/index.html','public/manifest.webmanifest','public/sw.js','src/config/release-acceptance.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/garp27/application-migration-profile.json'];
for(const p of files){const s=read(p);if(!s.includes(from))throw new Error('Version missing: '+p);}
let core=read('src/js/01-core.js');
const marker='  changes: [\n';const start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw new Error('RELEASE.changes missing');
const rows=core.slice(start+marker.length,end).split('\n').filter(x=>x.trim());
const change="    'RED-TEAM E4 / STORAGE (7.1.80): restart zachovává pokus, deadline i zašifrovaný výsledek; outbox předchází submitted guardu a obnovuje přerušené odevzdání. Web Locks brání souběhu karet v podporovaném profilu. Poškozený stav a nepodepsaný shadow mají explicitní integrity lock. Soukromá replay evidence přežije restart verifieru. Skutečné Chromium restart/profile a poruchové testy s negativními kontrolami. Úplné smazání storage či jiný profil vyžaduje server; CLIENT-CONTROLLED. E5–E10 a F7 čekají.',";
core=core.slice(0,start+marker.length)+[change,...rows].slice(0,10).join('\n')+core.slice(end);
core=core.replace("version: '"+from+"'","version: '"+to+"'").replace(/date:\s*'2026-10-02'/,"date:    '2026-10-03'");
for(const p of files)write(p,read(p).replaceAll(from,to));
write('src/js/01-core.js',core);
const acceptance=json('src/config/release-acceptance.json');
acceptance.releaseStatus='redteam-e4-checkpoint-not-ready';acceptance.primaryRuntime.currentUseApproved=false;
acceptance.github.status='not-yet-uploaded';acceptance.github.postUploadValidationRequired=true;
acceptance.revision='REDTEAM-V2-E4-CHECKPOINT-2026-10-03';
acceptance.runtimeAudit={required:true,scriptsExecuted:false,partialStaticVmExecuted:false,browserRuntimeExecuted:false,transport:'Local exact-lockfile gates must be re-executed for this checkpoint.',note:'E0 confirmed a public-key forgery with wrong Forms email, impossible times and empty telemetry accepted by the baseline verifier. E3 validates schema and Forms anchors. E4 preserves browser-local active/submitted attempts and ciphertext across restart, prevents native Web Locks tab concurrency, and retains private verifier replay observations. Full storage deletion/incognito/independent profiles require server trust. Correctly anchored public-key forgeries still lack runtime authenticity; content encryption is pending F7. This checkpoint is not a live red-team release.',exactLockfileCiExecuted:false,liveAiExecuted:false,productionDeploymentVerified:false};
acceptance.note='7.1.79 is a candidate-only E4 checkpoint. Do not promote it for the classroom experiment before the remaining acceptance criteria pass.';
acceptance.publication.runtimeDistributed=false;save('src/config/release-acceptance.json',acceptance);
const anchor=json('security/garp27/trust-anchor.json');anchor.appVersion=to;
anchor.architecturePolicySha256=sha('security/garp27/architecture-policy.json');anchor.capabilityInventorySha256=sha('security/garp27/capability-inventory.json');anchor.garpPolicySha256=sha('security/garp27/garp-policy.json');
anchor.note='Generator GARP 2.7 E4 persistence checkpoint '+to+'. Server LIVE remains deferred; classroom red-team readiness is explicitly not granted.';
save('security/garp27/trust-anchor.json',anchor);
const pin=sha('security/garp27/trust-anchor.json');
for(const name of fs.readdirSync('.github/workflows')){if(!/\.ya?ml$/.test(name))continue;const p='.github/workflows/'+name;write(p,read(p).replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[0-9a-fA-F]{64}/g,'$1'+pin));}
const p=json('package.json');for(const key of ['garp25:sbom','garp25:sbom:check'])p.scripts[key]=p.scripts[key].replace(from,to);save('package.json',p);
execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs','security/sbom/generator-testu-'+to+'.cdx.json'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs'],{stdio:'inherit'});
console.log('Prepared',to,'with',rows.length>9?10:rows.length+1,'newest-first changes and matched GARP 2.7 pins.');
