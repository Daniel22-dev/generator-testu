#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const FROM='7.1.99';
const TO='7.1.100';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const write=(file,text)=>fs.writeFileSync(path.join(root,file),text,'utf8');
const json=file=>JSON.parse(read(file));
const save=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
const sha256=data=>crypto.createHash('sha256').update(data).digest('hex');
const shaFile=file=>sha256(fs.readFileSync(path.join(root,file)));

const pkg=json('package.json');
if(pkg.version===TO){
  console.log(`Release ${TO} is already prepared.`);
  process.exit(0);
}
if(pkg.version!==FROM)throw new Error(`Expected ${FROM}; found ${pkg.version}`);

const versionFiles=[
  'package.json','package-lock.json','src/shell.html','src/js/07z-ai-core-integration.js',
  'public/access/error-reporter-adapter.js','public/ai-operations.json',
  'public/config/data-manifest.json','public/config/platform-manifest.json',
  'public/config/security-headers.json','ghrab-platform.consumer.json',
  'public/ghrab-platform.consumer.json','qa/qa-manifest.json','reporter-test.config.json',
  'public/manual/index.html','public/manifest.webmanifest','public/sw.js',
  'security/garp27/architecture-policy.json','security/garp27/capability-inventory.json',
  'security/garp27/garp-policy.json'
];
for(const file of versionFiles){
  const source=read(file);
  if(!source.includes(FROM))throw new Error(`Version ${FROM} missing in ${file}`);
  write(file,source.replaceAll(FROM,TO));
}

let core=read('src/js/01-core.js');
core=core.replace(`version: '${FROM}'`,`version: '${TO}'`).replace(/date:\s*'[^']+'/,"date:    '2026-10-18'");
const marker='  changes: [\n',start=core.indexOf(marker),end=core.indexOf('\n  ]\n});',start);
if(start<0||end<0)throw new Error('RELEASE.changes block missing');
const oldRows=core.slice(start+marker.length,end).split('\n').filter(row=>row.trim());
const releaseRow="    'VELKÁ AKTUALIZACE V7 (7.1.100): sjednocené opravy Sprintů 01–08.3a, Teacher Verifier 2.0, Strict Mode Guard V2, pedagogická věrnost, Forms workflow a schválené bezpečnostní změny A+B. Split-screen zůstává SHADOW/AUDIT-ONLY; živé služby a fyzická zařízení zůstávají samostatnou provozní akceptací.',";
core=core.slice(0,start+marker.length)+[releaseRow,...oldRows].slice(0,10).join('\n')+core.slice(end);
write('src/js/01-core.js',core);

const migration=json('security/garp27/application-migration-profile.json');
migration.appVersion=TO;
migration.releaseIdentity={...migration.releaseIdentity,appId:'generator',appVersion:TO,sourceCommit:'0000000000000000000000000000000000000000'};
save('security/garp27/application-migration-profile.json',migration);

const acceptance=json('src/config/release-acceptance.json');
acceptance.appVersion=TO;
acceptance.releaseStatus='ready-with-documented-limitations';
acceptance.primaryRuntime={...acceptance.primaryRuntime,currentUseApproved:true,useScope:'controlled-classroom-with-documented-limitations'};
acceptance.github={...acceptance.github,status:'not-yet-uploaded',postUploadValidationRequired:true};
acceptance.revision='GIT-7.1.100-V7-FINAL-CERTIFICATION-2026-10-18';
acceptance.runtimeAudit={
  required:true,scriptsExecuted:true,partialStaticVmExecuted:true,browserRuntimeExecuted:true,
  transport:'Exact-source local Chromium plus exact-SHA GitHub Actions; live AI, school Forms, Sheets/MailApp and physical devices remain separate operational acceptance.',
  note:'GIT 7.1.100 V7 consolidates Sprints 01–08.3a and owner-approved security changes A+B. Scoring, cryptography, identity quarantine, Recovery separation and split-screen SHADOW/AUDIT-ONLY remain enforced.',
  exactLockfileCiExecuted:false,liveAiExecuted:false,productionDeploymentVerified:false,
  componentBrowserExecuted:true,appsScriptMockExecuted:true
};
acceptance.note='Release candidate 7.1.100 requires exact-SHA P5, Journey, candidate/PR certification, protected main promotion and deployed release-identity verification. Physical devices and live school services are NOT VERIFIED by source automation.';
acceptance.publication={...acceptance.publication,runtimeDistributed:false};
save('src/config/release-acceptance.json',acceptance);

const readiness={
  schema:'git-release-readiness-e10-v1',version:TO,status:'READY WITH DOCUMENTED LIMITATIONS',blockers:[],
  f7:'IMPLEMENTED; exact-SHA current-version gates required',
  remotePath:'Owner authorized final GIT 7.1.100 GitHub publication and conditional standard promotion on 2026-10-17. Candidate/main/deployment remain fail-closed behind exact-SHA release gates.',
  scope:'CONTROLLED_CLASSROOM_WITH_DOCUMENTED_LIMITATIONS',
  ownerDecision:{
    recordedOn:'2026-10-17',
    source:'Explicit owner authorization to complete GIT 7.1.100, publish the isolated work branch immediately, and use the existing protected candidate/main release process only after all mandatory checks pass.',
    authorizeGithubPublication:true,authorizeProductionReleaseAfterMandatoryGates:true,
    E6_INCIDENT:{status:'DEFERRED_BY_OWNER',closed:false,note:'Historical cache purge and private credential rotation are not certified complete.'},
    LIVE_FORMS:{status:'NOT_VERIFIED_FOR_7_1_100',independentlyVerified:false,note:'Synthetic Forms CSV and Apps Script/Sheets/MailApp contracts passed; no live school submission or delivery was executed for 7.1.100.'},
    E7_PHYSICAL:{status:'NOT_VERIFIED',physicalDevicesTested:false,testDates:[],note:'Physical iPadOS/iOS/Android behavior is not certified by desktop Chromium automation.'},
    independentReview:{status:'PENDING_FINAL_EXACT_SHA_AUDIT',reviewedVersion:TO,currentVersion:TO,currentVersionIndependentlyReviewed:false,note:'Local and GitHub exact-SHA evidence is required; this source decision does not relabel physical or live-service checks as PASS.'}
  },
  limitations:[
    'Physical iPadOS/iOS/Android and non-Chromium browser behavior is NOT VERIFIED for this release.',
    'Live school Google Forms, Sheets, Apps Script mail delivery and live Gemini transport are NOT VERIFIED for this release.',
    'T110 server-side recovery/revocation remains SERVER-DEFERRED by owner decision.',
    'Split-screen detection remains SHADOW/AUDIT-ONLY and never triggers an automatic lock.',
    'Client-controlled telemetry, full storage wipe, a separate browser profile and a second device remain architectural limits requiring teacher review.',
    'Promotion and deployment are authorized only through exact-SHA candidate, PR, P5, Journey, main-protection and live release-identity gates.'
  ]
};
save('security/release-readiness-e10.json',readiness);

const anchor=json('security/garp27/trust-anchor.json');
anchor.appVersion=TO;
anchor.architecturePolicySha256=shaFile('security/garp27/architecture-policy.json');
anchor.capabilityInventorySha256=shaFile('security/garp27/capability-inventory.json');
anchor.garpPolicySha256=shaFile('security/garp27/garp-policy.json');
anchor.note='GIT 7.1.100 V7 final release anchor: Sprints 01–08.3a plus owner-approved A+B. Scoring, cryptography, Forms, Recovery and split-screen SHADOW/AUDIT-ONLY contracts remain enforced; T110, physical devices and live services are not claimed.';
save('security/garp27/trust-anchor.json',anchor);
const trustPin=shaFile('security/garp27/trust-anchor.json');

for(const name of fs.readdirSync(path.join(root,'.github','workflows'))){
  if(!/\.ya?ml$/i.test(name))continue;
  const file=path.posix.join('.github/workflows',name),source=read(file);
  write(file,source.replace(/(GARP27_EXTERNAL_TRUST_SHA256:\s*)[0-9a-fA-F]{64}/g,`$1${trustPin}`));
}
const consumer=json('tools/ci-standard/consumers/generator-testu.json');
const trust=consumer.trustInputs?.find(item=>item.environment==='GARP27_EXTERNAL_TRUST_SHA256');
if(!trust)throw new Error('Reviewed CI trust input missing');
trust.sha256=trustPin;
save('tools/ci-standard/consumers/generator-testu.json',consumer);

for(const file of ['scripts/check-s81-byte-checkout-policy.mjs','scripts/check-s83-ci-portability.mjs']){
  const source=read(file);
  if(!source.includes('50ce942425eeb000bd183b860a6899e1949668e8dd8585edf3ab1ca0e9ef05d8'))throw new Error(`Reviewed pre-release pin missing in ${file}`);
  write(file,source.replaceAll('50ce942425eeb000bd183b860a6899e1949668e8dd8585edf3ab1ca0e9ef05d8',trustPin));
}

execFileSync(process.execPath,['scripts/generate-cyclonedx-sbom.mjs',`security/sbom/generator-testu-${TO}.cdx.json`],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-ai-assurance-fingerprint.mjs','security/evidence/ai-assurance-fingerprint.json'],{cwd:root,stdio:'inherit'});
console.log(JSON.stringify({status:'PREPARED',from:FROM,to:TO,trustPin,aiFingerprint:json('security/evidence/ai-assurance-fingerprint.json').fingerprint},null,2));
