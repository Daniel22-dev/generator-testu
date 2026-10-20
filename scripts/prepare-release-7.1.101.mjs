#!/usr/bin/env node
// Deterministic 7.1.101 release preparation from the certified 7.1.100 source.
// Never modifies student runtime, scoring, Recovery, Teacher Verifier, or protected refs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd(),FROM='7.1.100',TO='7.1.101',DATE='2026-10-20';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(ROOT,p),s,'utf8');
const parse=p=>JSON.parse(read(p));
const save=(p,x)=>write(p,JSON.stringify(x,null,2)+'\n');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
const replaceOnce=(source,old,next,p)=>{
  if(!source.includes(old))throw Error(p+': missing '+old);
  return source.replace(old,next);
};
const pkg=parse('package.json');
if(pkg.version!==FROM)throw Error('Expected certified '+FROM+' base, found '+pkg.version);
if(!read('src/js/13di-secure-strict-mode-runtime.js').includes('strictIPhoneCompatibilityAllowed'))
  throw Error('Refusing release without previously certified iPhone hotfix.');
if(!read('src/features/preview-editor.js').includes('__GHRAB_TEACHER_PREVIEW__'))
  throw Error('Refusing release without previously certified preview fix.');

// Versioned, user-visible and platform/PWA inputs. This matches the existing
// 7.1.100 release-preparation inventory, not a generic repository-wide replace.
const versionFiles=[
 'package.json','package-lock.json','src/shell.html',
 'src/js/07z-ai-core-integration.js','public/access/error-reporter-adapter.js',
 'public/ai-operations.json','public/config/data-manifest.json',
 'public/config/platform-manifest.json','public/config/security-headers.json',
 'ghrab-platform.consumer.json','public/ghrab-platform.consumer.json',
 'qa/qa-manifest.json','reporter-test.config.json','public/manual/index.html',
 'public/manifest.webmanifest','public/sw.js',
 'security/garp27/architecture-policy.json',
 'security/garp27/capability-inventory.json',
 'security/garp27/garp-policy.json'
];
for(const p of versionFiles){
  const src=read(p);
  if(!src.includes(FROM))throw Error('Missing '+FROM+' in '+p);
  write(p,src.replaceAll(FROM,TO));
}

// This is one hotfix RELEASE record, not six fake version entries. Keep the
// existing preceding releases, and keep the visible catalog bounded at 10.
const corePath='src/js/01-core.js';
let core=read(corePath);
core=replaceOnce(core,"  version: '"+FROM+"',","  version: '"+TO+"',",corePath);
core=replaceOnce(core,"  date:    '2026-10-18',","  date:    '"+DATE+"',",corePath);
const marker='  changes: [\n';
const start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw Error('Release changelog marker missing');
const previous=core.slice(start+marker.length,end).split('\n').filter(x=>x.trim().length>0);
const row="    'HOTFIX (7.1.101, 20. 10. 2026): opraven učitelský náhled přísného testu (dvoukrokové spuštění simulace bez fullscreenu, časovače a skutečného odevzdání; soukromé předvyplnění kódů), přidána volitelná kompatibilita iPhone/iPod při chybějícím Fullscreen API, důvod výjimky se audituje. Recovery, Forms, Teacher Verifier a ostatní režimy zachovány. Funkční oprava byla poprvé publikována pod 7.1.100; nyní ji zpřehledňuje samostatné verzované vydání a obnovená PWA cache.',";
core=core.slice(0,start+marker.length)+[row,...previous].slice(0,10).join('\n')+core.slice(end);
write(corePath,core);

const changeTitle='## 7.1.101 – '+DATE+' – hotfix náhledu přísného testu a kompatibility iPhone\n\n';
const bullets=[
 '- Opravené dvoukrokové spuštění učitelského náhledu přísného testu v odděleném sandboxu bez požadavku na fullscreen.',
 '- Učitelská simulace bez běžícího časovače a bez skutečného odevzdání; po zavření a opětovném otevření vznikne nový náhled.',
 '- Přístupový a studentský kód se předvyplňují pouze v dočasném učitelském náhledu, nikoli do veřejného studentského HTML.',
 '- Nové samostatné učitelské povolení kompatibilního startu na iPhonu/iPodu bez Element Fullscreen API; standardně vypnuto, pouze samostatný test přes HTTPS.',
 '- Nepovolený fullscreen s existujícím API nelze zaměnit za nepodporované API; skutečná kompatibilní výjimka má viditelné upozornění a auditní důvod.',
 '- Zachovány přísný režim, Recovery, odevzdání, Google Forms, Teacher Verifier, běžné testy a procvičování. Split-screen zůstává SHADOW/AUDIT-ONLY.',
 '- Doplněna browser/regresní certifikace a bezpečná DOM oprava XSS sinku ve výsledku simulace.',
 '- Tato funkční oprava již byla v produkčním commitu 7.1.100 ze dne 20. 10. 2026; vydání 7.1.101 napravuje její chybějící changelog, release identitu a verzování PWA cache.',
 '- Fyzické testování Safari na iPhonu/iPadu a živých školních formulářů se tímto dokumentačním vydáním nevydává za ověřené.'
];
const notes='# GIT 7.1.101 – Učitelský náhled a kompatibilita Apple\n\nDatum vydání: '+DATE+'\n\n## Změny\n\n'+bullets.join('\n')+'\n\n## Rozsah\n\nBez nové funkcionality nad již vydaný 7.1.100 hotfix. Changelog, konzistentní SemVer, PWA a cache identita, SBOM, release assurance a přesná CI certifikace. Bez zásahu do hodnoticího algoritmu a datových kontraktů.\n';
write('RELEASE-NOTES-7.1.101.md',notes);
let history=read('CHANGELOG.md');
if(!history.startsWith('## 7.1.100'))throw Error('Unexpected changelog head; manual review needed');
history=changeTitle+bullets.join('\n')+'\n\n'+history;
write('CHANGELOG.md',history);

// Retain accurate limits and earlier approval history. Update only the 7.1.101
// issuance event and verifiable metadata, not historical claims.
let readiness=parse('security/release-readiness-e10.json');
if(readiness.version!==FROM)throw Error('Readiness baseline mismatch');
readiness.version=TO;
readiness.remotePath='Owner requested separate GIT 7.1.101 hotfix documentation/cache release on 2026-10-20. Only exact-SHA protected candidate/main admission may deploy.';
readiness.ownerDecision.recordedOn=DATE;
readiness.ownerDecision.source='Owner approval on 2026-10-20 to complete the 7.1.101 release for the already deployed strict preview / iPhone hotfix with recorded changelog and version/caching parity; all mandatory gates remain required.';
readiness.ownerDecision.authorizeGithubPublication=true;
readiness.ownerDecision.authorizeProductionReleaseAfterMandatoryGates=true;
readiness.ownerDecision.independentReview.reviewedVersion=TO;
readiness.ownerDecision.independentReview.currentVersion=TO;
readiness.ownerDecision.independentReview.currentVersionIndependentlyReviewed=false;
save('security/release-readiness-e10.json',readiness);
let acceptance=parse('src/config/release-acceptance.json');
if(acceptance.appVersion!==FROM)throw Error('Acceptance baseline mismatch');
acceptance.appVersion=TO;
acceptance.revision='GIT-7.1.101-STRICT-PREVIEW-IPHONE-DOC-2026-10-20';
acceptance.runtimeAudit.note='Hotfix was independently browser-tested on 7.1.100. Release 7.1.101 republishes unchanged behavior with corrected changelog, version/cache and new exact-SHA release certification. Physical Safari and live school Forms not independently verified.';
acceptance.note='Require exact-SHA P5, Journey E2E, candidate and PR certification, protected main merge and production release identity verification for 7.1.101.';
save('src/config/release-acceptance.json',acceptance);
let migration=parse('security/garp27/application-migration-profile.json');
if(migration.appVersion!==FROM)throw Error('Migration baseline mismatch');
migration.appVersion=TO;
migration.releaseIdentity={...migration.releaseIdentity,appId:'generator',appVersion:TO,sourceCommit:'0000000000000000000000000000000000000000'};
save('security/garp27/application-migration-profile.json',migration);

const anchorFile='security/garp27/trust-anchor.json';
let anchor=parse(anchorFile);
if(anchor.appVersion!==FROM)throw Error('GARP trust anchor baseline mismatch');
anchor.appVersion=TO;
anchor.architecturePolicySha256=hash('security/garp27/architecture-policy.json');
anchor.capabilityInventorySha256=hash('security/garp27/capability-inventory.json');
anchor.garpPolicySha256=hash('security/garp27/garp-policy.json');
anchor.note='GIT 7.1.101: traceable version/PWA cache refresh of approved strict teacher preview + iPhone compatibility hotfix. Runtime contracts, limitations and protected release gates unchanged.';
save(anchorFile,anchor);
const trustPin=hash(anchorFile);
const workflowDir='.github/workflows';
let changedPins=0;
for(const name of fs.readdirSync(path.join(ROOT,workflowDir))){
  if(!/\.ya?ml$/i.test(name))continue;
  const p=path.posix.join(workflowDir,name),old=read(p);
  const changed=old.replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[a-f0-9]{64}/gi,(_,prefix)=>prefix+trustPin);
  if(changed!==old){changedPins++;write(p,changed);}
}
if(changedPins===0)throw Error('No pinned GARP workflow anchor updated');
const consumerPath='tools/ci-standard/consumers/generator-testu.json';
const consumer=parse(consumerPath);
const pin=consumer.trustInputs?.find(x=>x.environment==='GARP27_EXTERNAL_TRUST_SHA256');
if(!pin)throw Error('Reviewed GARP consumer missing');
pin.sha256=trustPin;
save(consumerPath,consumer);

execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs','security/sbom/generator-testu-'+TO+'.cdx.json'],{cwd:ROOT,stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs','security/evidence/ai-assurance-fingerprint.json'],{cwd:ROOT,stdio:'inherit'});
execFileSync(process.execPath,['scripts/check-versions.mjs'],{cwd:ROOT,stdio:'inherit'});
if(parse('package.json').version!==TO)throw Error('Version bump failed');
console.log(JSON.stringify({status:'RELEASE_PREPARED',from:FROM,to:TO,releaseDate:DATE,versions:versionFiles.length,workflowPins:changedPins,trustPin},null,2));
