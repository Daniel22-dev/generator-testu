// One-shot, exact-version source preparation. Not a deploy or a gate bypass.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const FROM='7.1.101',TO='7.1.102';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s,'utf8');
const load=p=>JSON.parse(read(p));
const save=(p,x)=>write(p,JSON.stringify(x,null,2)+'\n');
const sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const pkg=load('package.json');
if(pkg.version!==FROM)throw new Error('Unexpected GIT base '+pkg.version+' != '+FROM);
const PATHS=[
'package.json','package-lock.json','src/shell.html','src/js/07z-ai-core-integration.js',
'public/access/error-reporter-adapter.js','public/ai-operations.json','public/config/data-manifest.json',
'public/config/platform-manifest.json','public/config/security-headers.json','ghrab-platform.consumer.json',
'public/ghrab-platform.consumer.json','qa/qa-manifest.json','reporter-test.config.json',
'public/manual/index.html','public/manifest.webmanifest','public/sw.js',
'src/config/release-acceptance.json','security/garp27/architecture-policy.json',
'security/garp27/capability-inventory.json','security/garp27/garp-policy.json',
'security/garp27/application-migration-profile.json'];
for(const p of PATHS)if(!read(p).includes(FROM))throw new Error('Version missing: '+p);
let core=read('src/js/01-core.js');
const marker='  changes: [\n',start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw new Error('RELEASE.changes missing');
const rows=core.slice(start+marker.length,end).split('\n').filter(s=>s.trim());
const update="    'MOJE SKUPINY E8 (7.1.102): volitelný učitelský import kanonické skupiny z AI Studia, školní e-maily pouze pro individuální kódy Forms; soukromá přenositelná evidence proti groupId/memberId. Studentský runtime, verifier a integrita testu se nemění. Školní UAT vyžaduje samostatné potvrzení.',";
core=core.slice(0,start+marker.length)+[update,...rows].slice(0,10).join('\n')+core.slice(end);
if(!core.includes("version: '"+FROM+"'"))throw new Error('RELEASE version missing');
core=core.replace("version: '"+FROM+"'","version: '"+TO+"'").replace("date:    '2026-10-20'","date:    '2026-10-27'");
for(const p of PATHS)write(p,read(p).replaceAll(FROM,TO));
write('src/js/01-core.js',core);
const acceptance=load('src/config/release-acceptance.json');
acceptance.revision='GIT-7.1.102-STAGE08-GROUPS-CANDIDATE-2026-10-27';
acceptance.note='Stage08 candidate requires exact-SHA P5, Journey E2E, protected Safe Promotion, Pages byte parity and signed-school positive UAT. School server remains disconnected.';
acceptance.runtimeAudit={...acceptance.runtimeAudit,scriptsExecuted:false,partialStaticVmExecuted:false,browserRuntimeExecuted:false,exactLockfileCiExecuted:false,productionDeploymentVerified:false,componentBrowserExecuted:false,appsScriptMockExecuted:false,note:'7.1.101 acceptance cannot certify the new 7.1.102 E8 source. CI and school signed-access UAT pending.'};
acceptance.publication.runtimeDistributed=false;
save('src/config/release-acceptance.json',acceptance);
const anchor=load('security/garp27/trust-anchor.json');
anchor.appVersion=TO;
anchor.architecturePolicySha256=sha('security/garp27/architecture-policy.json');
anchor.capabilityInventorySha256=sha('security/garp27/capability-inventory.json');
anchor.garpPolicySha256=sha('security/garp27/garp-policy.json');
anchor.note='GIT '+TO+' Stage08 candidate: scoped teacher-private canonical groups/ledger; full P5 and signed-school UAT pending; school server deferred.';
save('security/garp27/trust-anchor.json',anchor);
const trustSha=sha('security/garp27/trust-anchor.json');
for(const name of fs.readdirSync('.github/workflows')){
 if(!/\.ya?ml$/.test(name))continue;
 const path='.github/workflows/'+name,before=read(path);
 const after=before.replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[0-9a-fA-F]{64}/g,(_m,prefix)=>prefix+trustSha);
 if(after!==before)write(path,after);
}
execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs','security/sbom/generator-testu-'+TO+'.cdx.json'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs'],{stdio:'inherit'});
console.log(JSON.stringify({status:'STAGE08_RELEASE_PREPARED',from:FROM,to:TO,trustSha,versionFiles:PATHS.length}));