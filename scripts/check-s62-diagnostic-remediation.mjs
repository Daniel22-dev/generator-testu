#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const root=path.resolve('src/js'),checks=[];
function check(id,condition,detail){const status=condition?'PASS':'FAIL';checks.push({id,status,detail});console.log(`${status} ${id} - ${detail}`);}
const ctx=vm.createContext({
  console,Date,JSON,Map,Set,WeakMap,TextEncoder,crypto:webcrypto,window:{TextEncoder},
  CONFIG:{testId:'T-S62',manifestHash:'H-S62',studentHtmlSha256:'',identityMode:'name',roster:[],diffGroups:[],nazev:'synthetic',proKoho:'synthetic',generatorVersion:'7.1.100'},
  RESULTS:[],VARIANTS_FULL:{__default:[]},FORMS_ANCHOR_POLICY:{schoolDomain:'example.invalid'},LAST_FORMS_IMPORT:null,ATTEMPT_DECISIONS:new Map(),
  afterResultsChanged:()=>{},renderFormsImportSummary:()=>{},vToast:()=>{},metadataMismatchFor:()=>[]
});
function addTemplate(file){const source=fs.readFileSync(path.join(root,file),'utf8'),start=source.indexOf('String.raw`')+'String.raw`'.length,end=source.lastIndexOf('`;');assert.ok(start>='String.raw`'.length&&end>start,`missing template ${file}`);vm.runInContext(source.slice(start,end),ctx,{filename:file});}
function addNamedTemplate(file,marker){const source=fs.readFileSync(path.join(root,file),'utf8'),start=source.indexOf(marker)+marker.length,end=source.lastIndexOf('`;');assert.ok(start>=marker.length&&end>start,`missing named template ${file}`);vm.runInContext(source.slice(start,end),ctx,{filename:file});}
for(const file of ['13ed-secure-verifier-validation.js','13ec-secure-verifier-trust.js','13ef-secure-verifier-replay.js','13eg-secure-verifier-history.js','13ea-secure-verifier-forms.js'])addTemplate(file);
vm.runInContext(`
  validateSecureEnvelope=function(){};
  parseTxt=function(txt){return JSON.parse(txt)};
  decryptPayload=async function(pack){return pack.payload};
  validateSecurePayload=function(payload){if(payload.__error)throw e3Error(payload.__error,'synthetic rejected');return true};
  payloadBindingError=async function(){return ''};
`,ctx);
const run=source=>vm.runInContext(source,ctx);
async function submit(payload,meta){ctx.__txt=JSON.stringify({testId:'T-S62',manifestHash:'H-S62',payload});ctx.__meta=meta;const result=await run(`verifyText('synthetic.txt',__txt,__meta)`);delete ctx.__txt;delete ctx.__meta;return result;}
function payload(attemptId,overrides={}){return {testId:'T-S62',manifestHash:'H-S62',__error:'schema.identity',student:'',code:'',resp:{'0_0':1},attemptId,securityEvents:[],criticalEvents:[],criticalCounters:{locks:0,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false,...overrides};}

const duplicate=payload('S62-DUPLICATE',{securityEvents:[{t:'2026-10-13T18:00:00Z',type:'locked',detail:'single lock'}],criticalEvents:[{t:'2026-10-13T18:00:00Z',type:'locked',detail:'single lock',criticalSeq:1}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0}});
await submit(duplicate,{source:'google-forms-csv',formIdentity:'synthetic@example.invalid',formTimestamp:'2026-10-13T18:01:00Z',formRow:1});
await submit(duplicate,{source:'google-forms-csv',formIdentity:'synthetic@example.invalid',formTimestamp:'2026-10-13T18:02:00Z',formRow:2});
let rows=run(`RESULTS.map(r=>({exactDuplicate:r.exactDuplicate,exactDuplicateOf:r.exactDuplicateOf,replayStatus:r.replayStatus,formRow:r.formRow}))`);
check('S62-R01',rows.length===2&&!rows[0].exactDuplicate&&rows[0].replayStatus==='CLEAR'&&rows[1].exactDuplicate&&rows[1].exactDuplicateOf===0&&rows[1].replayStatus==='EXACT_DUPLICATE','identical quarantine import is retained while the repeat points to its original');
check('S62-R02',rows[0].formRow===1&&rows[1].formRow===2,'both identical Forms records retain separate source metadata');
check('S62-R03',run(`securityReviewResults().length`)===1,'security review exposes one unique attempt for two identical quarantine imports');

ctx.securityBox={innerHTML:''};ctx.VERIFIER_SECURITY_QUERY='';ctx.$=id=>id==='securitySignals'?ctx.securityBox:null;ctx.displayStudent=r=>r.student||r.file||'';ctx.securitySignalsFor=()=>[];ctx.securityIssueCount=()=>0;ctx.esc=value=>String(value??'');ctx.trustNoticeHtml=()=>'';ctx.s4SplitStateHtml=()=>'';ctx.setTimeout=()=>0;ctx.document={};
addNamedTemplate('13eh-secure-teacher-verifier-s4.js','const SECURE_VERIFIER_S4_JS=String.raw`');run(`s4RenderSecuritySignals()`);
check('S62-R04',ctx.securityBox.innerHTML.includes('<b>1</b>pokusů')&&ctx.securityBox.innerHTML.includes('<b>1</b>zámků'),'security dashboard counts a repeated ciphertext exactly once');

run(`RESULTS.length=0`);
await submit(payload('S62-CONFLICT',{securityEvents:[{t:'2026-10-13T18:03:00Z',type:'locked',detail:'first'}],criticalEvents:[{t:'2026-10-13T18:03:00Z',type:'locked',detail:'first',criticalSeq:1}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0}}));
await submit(payload('S62-CONFLICT',{securityEvents:[{t:'2026-10-13T18:03:01Z',type:'bad-unlock',detail:'second'}],criticalEvents:[{t:'2026-10-13T18:03:01Z',type:'bad-unlock',detail:'second',criticalSeq:1}],criticalCounters:{locks:0,unlocks:0,resumes:0,badUnlocks:1}}));
rows=run(`RESULTS.map(r=>({digest:r.submissionDigest,exactDuplicate:r.exactDuplicate,hardReplayConflict:r.hardReplayConflict,attemptConflict:r.attemptConflict,replayStatus:r.replayStatus}))`);
check('S62-R05',rows.length===2&&rows[0].digest!==rows[1].digest&&rows.every(r=>!r.exactDuplicate&&r.hardReplayConflict&&r.attemptConflict&&r.replayStatus==='ATTEMPT_CONFLICT'),'different payloads under one attemptId remain separate conflicts for manual review');

const invalidCounters=[
  ['NULLS',{locks:null,unlocks:null,resumes:null,badUnlocks:null}],
  ['EMPTY-STRINGS',{locks:'',unlocks:'',resumes:'',badUnlocks:''}],
  ['FALSES',{locks:false,unlocks:false,resumes:false,badUnlocks:false}],
  ['NUMERIC-STRINGS',{locks:'0',unlocks:'1',resumes:'0',badUnlocks:'0'}]
];
for(const [name,counters] of invalidCounters){
  const direct=run(`diagnosticCriticalCounters(${JSON.stringify(counters)})`);check('S62-RC-DIRECT-'+name,direct===undefined,`${name}: coercible non-number values are rejected`);
  run(`RESULTS.length=0`);const outcome=await submit(payload('S62-'+name,{criticalCounters:counters})),history=run(`historyCompletenessAssessment(RESULTS[0])`),csv=run(`historyCsvValues(RESULTS[0])`);
  check('S62-RC-'+name,outcome.row.criticalCountersState==='INVALID'&&!Object.hasOwn(outcome.row,'criticalCounters')&&history.possiblyIncomplete&&history.label==='NEOVĚŘITELNÉ KRITICKÉ ČÍTAČE'&&csv.slice(-4).every(value=>value===''),`${name}: invalid counters stay blank and history is unverifiable`);
}
run(`RESULTS.length=0`);const missingPayload=payload('S62-MISSING');delete missingPayload.criticalCounters;const missing=await submit(missingPayload),missingHistory=run(`historyCompletenessAssessment(RESULTS[0])`),missingCsv=run(`historyCsvValues(RESULTS[0])`);
check('S62-RC-MISSING',missing.row.criticalCountersState==='MISSING'&&missingHistory.possiblyIncomplete&&missingHistory.label==='CHYBÍ KRITICKÉ ČÍTAČE'&&missingCsv.slice(-4).every(value=>value===''),'missing counters are not interpreted as zero or complete history');

for(const [name,counters,events] of [
  ['ZERO',{locks:0,unlocks:0,resumes:0,badUnlocks:0},[]],
  ['ONE',{locks:1,unlocks:0,resumes:0,badUnlocks:0},[{t:'2026-10-13T18:04:00Z',type:'locked',detail:'one',criticalSeq:1}]]
]){
  run(`RESULTS.length=0`);const routine=events.map(event=>({...event})),outcome=await submit(payload('S62-'+name,{securityEvents:routine,criticalEvents:events,criticalCounters:counters})),history=run(`historyCompletenessAssessment(RESULTS[0])`),csv=run(`historyCsvValues(RESULTS[0])`);
  check('S62-RC-'+name,outcome.row.criticalCountersState==='PRESENT'&&!history.possiblyIncomplete&&csv.slice(-4)[0]===counters.locks,`${name}: genuine numeric counter ${counters.locks} remains valid and complete`);
}

run(`RESULTS.length=0`);
const stressEvents=Array.from({length:305},(_,index)=>({t:new Date(Date.parse('2026-10-13T18:10:00Z')+index).toISOString(),type:index%100===0?'locked':'focus-transition',detail:'stress '+index}));
const stress=payload('S62-STRESS',{securityEvents:stressEvents});delete stress.criticalEvents;delete stress.criticalCounters;
const criticalOnly=payload('S62-CRITICAL-ONLY',{securityEvents:undefined,criticalEvents:[{t:'2026-10-13T18:20:00Z',type:'recovery-unlock',detail:'authorized recovery',criticalSeq:1}],criticalCounters:{locks:0,unlocks:1,resumes:0,badUnlocks:0}});delete criticalOnly.securityEvents;
const shared={t:'2026-10-13T18:30:00Z',type:'locked',detail:'shared'};
const both=payload('S62-BOTH',{securityEvents:[shared],criticalEvents:[{...shared,criticalSeq:1}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0}});
for(const item of [stress,criticalOnly,both])await submit(item);
const summaries=run(`RESULTS.map(r=>{const s=verifierSecuritySummary(r);return {id:r.attemptId,events:s.events.length,locks:s.lockedCount,recovery:s.recoveryCount,telemetry:s.telemetryState}})`);
check('S62-R06',summaries[0].events===305&&summaries[0].locks===4,'security-only history preserves 300+ events and all lock evidence');
check('S62-R07',summaries[1].events===1&&summaries[1].recovery===1&&summaries[1].telemetry==='ABSENT','critical-only history remains visible while routine telemetry stays explicitly absent');
check('S62-R08',summaries[2].events===1&&summaries[2].locks===1,'matching routine and critical evidence is deduplicated only within one attempt');

const failed=checks.filter(item=>item.status!=='PASS'),evidence={schema:'git-s62-diagnostic-remediation-source-v1',status:failed.length?'FAIL':'PASS',checks};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s62-diagnostic-remediation-source.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));assert.equal(failed.length,0,`${failed.length} Sprint 06.2 source checks failed`);
