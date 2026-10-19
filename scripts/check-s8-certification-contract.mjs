#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const BASE='33fcffeae9ab5b59c3be7d1213cf23a59c3f6054';
const allowed=new Set(['PASS','FAIL','NOT VERIFIED','DEFERRED']);
const id=n=>`T${String(n).padStart(2,'0')}`;
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>i+a);
const rows=range(1,135).map(n=>({id:id(n),status:'PASS',claim:`MASTER V7 acceptance scenario ${id(n)}`,evidence:'Automated source/browser evidence listed in the Sprint 08 report',limits:''}));
const byId=new Map(rows.map(row=>[row.id,row]));
const set=(n,patch)=>Object.assign(byId.get(id(n)),patch);
const setRange=(a,b,patch)=>range(a,b).forEach(n=>set(n,typeof patch==='function'?patch(n):patch));

const claims={
  1:'Pedagogical type selected by the teacher remains authoritative',
  2:'Multiple Choice and Reading Comprehension remain structurally distinct',
  3:'Exercise names remain consistent in generator, student HTML and verifier',
  4:'Question counts, points and canonical structure remain stable',
  5:'Opening the manual preserves the active generator session',
  6:'Roster and one-time student codes remain stable in the same session',
  7:'Global point mode has one strict integer authority',
  8:'Detailed point mode has one strict integer authority',
  9:'Redistribution is bounded, explicit and preserves item counts',
  10:'Primary Reading/Listening count is synchronized in both directions',
  11:'Secondary Reading/Listening rows remain independent',
  12:'Didactic AI review uses the shared create-new-task policy',
  13:'Complete Sheets and Apps Script installation/setup guide',
  14:'Only explicitly selected recipients receive code messages',
  15:'Latecomers, deduplication and deliberate resend are handled',
  16:'START requires a submitted trusted Forms marker',
  17:'END and chronology require submitted trusted Forms markers',
  18:'Settings, icons, labels and navigation are accessible',
  19:'Teacher preview, integrity panel and output review remain coherent',
  20:'AI progress is truthful and never invents percentages',
  21:'Formats are recommended before the teacher selects them',
  22:'Recommendations reflect the supplied teaching context',
  23:'Recommendation cache/fingerprint invalidates on context changes',
  24:'Unverified URL/source context is represented honestly',
  25:'Manual workflow remains available and preserves teacher choice',
  26:'Composition review uses the shared policy',
  27:'The validated catalog contains all 38 formats',
  28:'Every catalog entry satisfies the metadata contract',
  29:'Conditionals search returns appropriate formats',
  30:'Nature/weather search returns appropriate formats',
  31:'Spanish/table search returns appropriate formats',
  32:'Reading prerequisites are enforced',
  33:'Heading prerequisites and filtering are enforced',
  34:'Listening source prerequisites are enforced',
  35:'Source, format, count and scoring stay independent',
  36:'Filtering does not silently change teacher selection',
  37:'Canonical formatId remains stable',
  38:'AI phases use indeterminate labels without fabricated percentage',
  39:'Catalog interaction remains keyboard and narrow-viewport usable',
  40:'AI receives only typed, allowlisted teaching context',
  41:'Prompt, student output and verifier preserve style fidelity',
  42:'AI review preserves security modes and existing gates',
  43:'Sprint work remains isolated from release branches',
  44:'No merge, push, staging or deployment occurs during certification',
  45:'Remote branch protection is effective',
  46:'GitHub-hosted Linux CI completes on the exact candidate SHA',
  47:'Staging, promotion and rollback paths are exercised',
  48:'Release identity, version and signed evidence are internally current',
  49:'Complete release preflight is green on all required platforms',
  50:'AI Studio and physical-device smoke tests complete',
  51:'Audit handoff is reproducible from bundle, patches and hashes',
  52:'Certification evidence contains synthetic data only',
  53:'Final release decision has no open blocking finding',
  54:'AI does not invent format IDs or mutate scoring authority',
  55:'Five pedagogical styles keep their ordering and identity',
  56:'Secure output preserves pedagogical labels',
  57:'Instant output preserves pedagogical labels',
  58:'Preview, verifier and PDF agree on exercise identity',
  59:'Content and pedagogical style remain separate concepts',
  60:'Title and canonical type remain separate concepts',
  61:'Historic data receives a compatible fallback',
  62:'All 38 formats retain scorer mappings',
  63:'Variants and exports preserve pedagogical fidelity',
  102:'Credential/recovery audit covers both generated student channels',
  103:'Recovery behavior is verified on required desktop and physical tablet environments',
  104:'Raw credentials do not enter application-controlled storage or exports',
  105:'Native password-manager behavior does not retain sensitive inputs',
  106:'Recovery and Teacher/Admin purposes are explicit and localized',
  107:'Recovery, Teacher and Admin privileges remain separated',
  108:'Credential derivations and test binding remain separate',
  109:'All active credential branches are covered by regression contracts',
  110:'Server-side recovery/revocation enforcement',
  111:'Recovery interoperability is verified on required physical devices',
  112:'Both generated student modes pass a real local Chromium journey',
  113:'Storage, URL, log and export leakage scans pass',
  114:'Reload, navigation and BFCache behavior preserve attempt state',
  115:'Negative control proves a client can capture a credential before cleanup',
  116:'Authorized GitHub Pages staging passes recovery tests',
  117:'Republish/cache behavior preserves active attempt integrity',
  118:'Verifier empty state is safe',119:'Verifier renders one compact result row',120:'Verifier aggregates the 43/43/13 fixture',
  121:'Verifier preserves split values 7%, 49% and 96%',122:'Missing split measurement differs from measured 0%',
  123:'More than 300 security events remain available',124:'Orientation/split telemetry stays non-accusatory and audit-only',
  125:'Lock, successful Recovery and failed Recovery remain separate',126:'Replay, duplicate, identity and joker decisions remain coherent',
  127:'Scoring/import and effective-result analytics remain authoritative',128:'Teacher UI does not alter student or Forms behavior',
  129:'Verifier is responsive in required themes and viewports',130:'Verifier keyboard, ARIA and contrast contracts pass',
  131:'CSV remains append-only and backward compatible',132:'Untrusted verifier content is XSS-safe',133:'Verifier is offline and CSP isolated',
  134:'A newly generated verifier is actually exercised',135:'Normal/practice workflow remains unaffected'
};
for(const [n,claim] of Object.entries(claims))set(Number(n),{claim});
setRange(1,4,{evidence:'check:s2-pedagogical-fidelity + check:s2-pedagogical-browser'});
setRange(5,11,{evidence:'check:s3-workflow-fidelity + check:s3-workflow-browser'});
for(const n of [12,...range(21,42),...range(54,63)])set(n,{evidence:'check:s6-pedagogical-ai + S06 traceability + Chromium'});
setRange(13,20,{evidence:'S07 source, traceability and Chromium evidence'});
setRange(43,53,{evidence:'Sprint 08 Git/history/environment/release audit'});
setRange(64,101,n=>({claim:`Strict Mode Guard V2 acceptance scenario ${id(n)}`,evidence:'S05 source + Chromium + T64–T101 traceability'}));
setRange(102,117,{evidence:'S01 security gates + newly generated instant/secure Chromium evidence'});
setRange(118,135,{evidence:'S04/S04.1 source + newly generated Teacher Verifier Chromium evidence'});

for(const n of [14,15])set(n,{status:'NOT VERIFIED',limits:'Synthetic Sheets/MailApp simulation passed; no live Google authorization or delivery was performed.'});
for(const n of [16,17])set(n,{status:'NOT VERIFIED',limits:'Synthetic Forms CSV/browser path passed; no live school Google Forms submission/export was performed.'});
set(19,{status:'FAIL',limits:'workflow audit and workflow-update source gate found secure-submit visibility/configuration synchronization regressions.'});
for(const n of [45,46,47,50])set(n,{status:'NOT VERIFIED',limits:'Remote GitHub, staging, AI Studio or physical-device environment was not authorized/available.'});
set(48,{status:'FAIL',limits:'Package remains 7.1.99 and AI assurance evidence is stale; no version bump or fingerprint rewrite was authorized.'});
set(49,{status:'FAIL',limits:'Windows CI, AI assurance, foundation evidence, XSS baseline and legacy harness blockers remain open.'});
set(53,{status:'FAIL',limits:'Certification verdict is NO-GO pending remediation and independent audit.'});
for(const n of [73,77])set(n,{status:'NOT VERIFIED',limits:'Automatic split-screen LOCK intentionally remains disabled in SHADOW/AUDIT-ONLY mode.'});
set(80,{status:'NOT VERIFIED',limits:'No physical iPadOS Stage Manager/orientation calibration.'});
for(const n of range(85,89))set(n,{status:'NOT VERIFIED',limits:'Required physical mobile/tablet behavior was not tested.'});
for(const n of [103,105,111,114,116,117])set(n,{status:'NOT VERIFIED',limits:'Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested.'});
set(110,{status:'DEFERRED',limits:'Explicitly deferred to the separately authorized server phase.'});
set(126,{status:'FAIL',limits:'Legacy verifier/forgery and D7 effective-analytics harnesses fail after diagnostic-quarantine changes; product browser scenarios pass but complete regression certification does not.'});
set(127,{status:'FAIL',limits:'D7 effective-result analytics harness throws because its extracted runtime omits isDiagnosticQuarantine; full certification is blocked.'});
set(132,{status:'FAIL',limits:'Focused hostile text rendering passed, but global XSS sink inventory is 165 versus approved baseline 161.'});

assert.equal(rows.length,135);
assert.deepEqual(rows.map(row=>row.id),range(1,135).map(id));
assert.equal(new Set(rows.map(row=>row.id)).size,135);
for(const row of rows)assert.ok(allowed.has(row.status),`${row.id}: invalid status ${row.status}`);
assert.equal(byId.get('T110').status,'DEFERRED');
assert.equal(byId.get('T73').status,'NOT VERIFIED');
assert.equal(byId.get('T77').status,'NOT VERIFIED');

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version,'7.1.99','Sprint 08 is not authorized to bump the production version');
const protectedPaths=['security/garp27/trust-anchor.json','security/garp27/reviewed-consumer-profile.json','security/garp27/architecture-policy.json','security/garp27/capability-inventory.json','security/garp27/garp-policy.json','security/evidence/ai-assurance-fingerprint.json'];
const changed=execFileSync('git',['diff','--name-only',BASE,'--',...protectedPaths],{encoding:'utf8'}).trim();
assert.equal(changed,'','Sprint 08 must not change trust anchors, GARP policy/pins or AI assurance fingerprint');
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
assert.notEqual(branch,'candidate');assert.notEqual(branch,'main');

const summary=Object.fromEntries([...allowed].map(status=>[status,rows.filter(row=>row.status===status).length]));
const output={schema:'git-s8-t01-t135-traceability-v1',testedProductSha:BASE,branch,policy:{releaseAuthorized:false,splitScreen:'SHADOW/AUDIT-ONLY',automaticSplitLock:false,trustPinsChanged:false,aiAssuranceFingerprintChanged:false,t110:'DEFERRED'},summary,total:rows.length,rows};
const outDir=path.join('docs','evidence');
const jsonPath=path.join(outDir,'S08-T01-T135.json');
const mdPath=path.join('docs','S08-CERTIFICATION-TRACEABILITY.md');
const md=['# Sprint 08 — traceability T01–T135','',`Tested product checkpoint: \`${BASE}\`.`, '',`Summary: ${summary.PASS} PASS / ${summary.FAIL} FAIL / ${summary['NOT VERIFIED']} NOT VERIFIED / ${summary.DEFERRED} DEFERRED.`, '', '| ID | Status | Requirement | Evidence / limitation |','|---|---|---|---|',...rows.map(row=>`| ${row.id} | **${row.status}** | ${row.claim.replaceAll('|','\\|')} | ${(row.limits||row.evidence).replaceAll('|','\\|')} |`),'','A PASS here means the listed local source or Chromium contract passed on the tested product SHA. It is not a claim about a real iPad, AI Studio, Google service, GitHub Pages or production environment unless explicitly stated.',''];
if(process.argv.includes('--write')){
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(jsonPath,JSON.stringify(output,null,2)+'\n');
  fs.writeFileSync(mdPath,md.join('\n'));
}
assert.ok(fs.existsSync(jsonPath),'Run with --write once to materialize the JSON traceability artifact');
assert.ok(fs.existsSync(mdPath),'Run with --write once to materialize the Markdown traceability artifact');
assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath,'utf8')).rows,rows,'Committed JSON traceability must match the executable contract');
assert.equal(fs.readFileSync(mdPath,'utf8'),md.join('\n'),'Committed Markdown traceability must match the executable contract');
console.log(`PASS S08 certification contract: ${rows.length}/135 mapped; ${summary.PASS} PASS, ${summary.FAIL} FAIL, ${summary['NOT VERIFIED']} NOT VERIFIED, ${summary.DEFERRED} DEFERRED; protected trust/assurance files unchanged.`);
