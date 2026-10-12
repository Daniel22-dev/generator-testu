#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const evidencePath=process.env.S41_EVIDENCE||'qa-results/s41-teacher-verifier-remediation.json';
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const results=[];
function record(id,ok,detail=''){results.push({id,status:ok?'PASS':'FAIL',detail});console.log(`${ok?'PASS':'FAIL'} ${id}${detail?` - ${detail}`:''}`);if(!ok)process.exitCode=1;}
function check(id,fn){try{record(id,true,fn()||'');}catch(error){record(id,false,String(error?.message||error));}}
function must(value,message){if(!value)throw new Error(message);}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const dependencyFiles=[
  'src/js/13b-secure-shared-scoring.js','src/js/13ea-secure-verifier-forms.js','src/js/13eb-secure-teacher-verifier-v2-ui.js',
  'src/js/13ec-secure-verifier-trust.js','src/js/13ed-secure-verifier-validation.js','src/js/13ee-secure-verifier-anchors.js',
  'src/js/13ef-secure-verifier-replay.js','src/js/13eg-secure-verifier-history.js','src/js/13eh-secure-teacher-verifier-s4.js',
  'src/js/13fa-secure-teacher-verifier-pdf.js',
];
const context=vm.createContext({console,H:value=>String(value??''),secureCss:()=>'',auditCommentHtml:()=>'',safeJsonForScript:value=>JSON.stringify(value).replace(/</g,'\\u003c'),verifierLessonHtml:()=>'',verifierFormsStatusHtml:()=>'',verifierAnchorSettingsHtml:()=>''});
for(const file of dependencyFiles)new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}).runInContext(context);
new vm.Script(fs.readFileSync('src/js/13f-secure-teacher-verifier.js','utf8'),{filename:'src/js/13f-secure-teacher-verifier.js'}).runInContext(context);
const cfg={generatorVersion:'7.1.99',buildHash:'s41-source',releaseDate:'2026-10-12',releaseStatus:'qa',generatedAt:'2026-10-12T04:00:00.000Z',creatorId:'synthetic-owner',creatorName:'Synthetic teacher',creatorRole:'teacher',testId:'S41-SYNTHETIC',manifestHash:'a'.repeat(64),studentHtmlSha256:'b'.repeat(64),nazev:'Synthetic S04.1 verifier',proKoho:'QA',isSpanish:false,isCzech:false,csScoringPolicy:{},cefr:'B1',cefrLevels:['B1'],cefrCombined:false,totalBody:10,gradeTyp:'cz',gradeScale:[],gradeScaleRaw:'',fuzzyTolerance:'off',cas:45,identityMode:'name',roster:[],diffGroups:[],zolicek:'ANO',randomizace:false,schoolLogoDataUri:'',privateKey:{kty:'RSA'},formsAnchorPolicy:null};
const variants={__default:[{style:'multiple choice',type:'multiple choice',title:'Synthetic topic',points_total:1,points_each:1,items:[{question:'Q',options:['A','B'],correct:0}]}]};
const html=context.buildSecureTeacherVerifierHtml(cfg,variants);
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://qa.invalid/private-verifier.html',pretendToBeVisual:true,beforeParse(window){window.matchMedia=window.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));window.scrollTo=()=>{};window.HTMLElement.prototype.scrollIntoView=()=>{};if(window.HTMLAnchorElement)window.HTMLAnchorElement.prototype.click=()=>{};window.URL.createObjectURL=()=> 'blob:s41';window.URL.revokeObjectURL=()=>{};window.fetch=async()=>{throw new Error('S04.1 offline verifier attempted network access');};}});
await sleep(40);
const w=dom.window;
function iso(offset){return new Date(Date.parse('2026-10-12T05:00:00.000Z')+offset*1000).toISOString();}
function event(type,index,extra={}){return {t:iso(index),type,detail:`synthetic-${type}-${index}`,...extra};}
function row(id,securityEvents,overrides={}){return {status:'OK',student:`Synthetic ${id}`,file:`synthetic-${id}.txt`,earned:8,total:10,pct:80,grade:2,groupKey:'__default',jokerUsed:false,attemptId:`ATT-${id}`,submissionDigest:`digest-${id}`,semanticDigest:`semantic-${id}`,securityEvents,details:[],answerChangeStats:{},totalAnswerChanges:0,metadataMismatch:[],envelopeMismatch:[],anchorNotes:[],startedAt:iso(0),submittedAt:iso(2000),formIdentity:`synthetic-${id.toLowerCase()}@example.invalid`,formTimestamp:iso(2001),submissionSource:'google-forms-csv',...overrides};}
function setRows(rows){w.eval(`RESULTS=${JSON.stringify(rows)};ATTEMPT_DECISIONS.clear();`);}
function render(){w.renderTable();w.renderSecuritySignals();}
function text(selector){return w.document.querySelector(selector)?.textContent||'';}
function parseCsvLine(line){return [...line.matchAll(/"((?:[^"]|"")*)"(?:;|$)/g)].map(m=>m[1].replace(/""/g,'"'));}

check('S41-01-missing-split-pct-is-not-zero',()=>{
  const samples=[event('split-window',1,{pct:null}),event('split-window',2,{pct:''}),event('split-window',3),event('split-window',4,{pct:'invalid'}),event('split-window',5,{pct:-1}),event('split-window',6,{pct:101})];
  const summary=w.verifierSecuritySummary(row('MISSING-PCT',samples));
  must(summary.splitWindowSamples.every(x=>x.pct===null),`missing values became ${summary.splitWindowSamples.map(x=>String(x.pct)).join(',')}`);
  must(summary.splitWindowMaxPct===null,`missing maximum became ${summary.splitWindowMaxPct}`);
  return 'null, empty, undefined, malformed and out-of-range values remain unknown';
});

check('S41-02-valid-split-values-preserved',()=>{
  const values=[0,7,49,96];
  const summary=w.verifierSecuritySummary(row('VALID-PCT',values.map((pct,i)=>event('split-window',i+1,{pct}))));
  must(JSON.stringify(summary.splitWindowSamples.map(x=>x.pct))===JSON.stringify(values),'0/7/49/96 changed');
  must(summary.splitWindowMaxPct===96,'maximum is not 96');
  return '0/7/49/96 preserved';
});

check('S41-03-ui-summary-and-detail-show-unknown',()=>{
  setRows([row('UI-UNKNOWN',[event('split-window',1,{pct:null}),event('split-window',2,{pct:''}),event('split-window',3)])]);render();
  const all=text('#resultTable');
  must(/Nezjištěno/i.test(all),'UI does not expose unknown split percentage');
  must(!/(?:max|podíl)\s*0\s*%/i.test(all),'missing percentage is displayed as 0%');
  return 'summary and detail distinguish unknown from 0%';
});

check('S41-04-csv-keeps-unknown-split-explicit',()=>{
  setRows([row('CSV-UNKNOWN',[event('split-window',1,{pct:null})])]);
  w.eval('downloadText=function(txt,fn,mime){window.__s41Csv={txt:txt,fn:fn,mime:mime};}');w.downloadResultsCsv();
  const lines=w.__s41Csv.txt.split('\n'),header=parseCsvLine(lines[0]),data=parseCsvLine(lines[1]);
  const timeline=data[header.indexOf('security_event_timeline')];
  must(data.at(-2)==='1'&&data.at(-1)==='','event count/max CSV semantics changed');
  must(/Nezjištěno/i.test(timeline),'CSV timeline does not preserve unknown percentage');
  return 'count=1, max blank, timeline says unknown';
});

check('S41-05-critical-only-events-appear-in-timeline',()=>{
  const critical=[event('locked',1,{criticalSeq:1}),event('recovery-unlock',2,{criticalSeq:2,lockReason:'synthetic lock'})];
  const r=row('CRITICAL-ONLY',undefined,{criticalEvents:critical,criticalCounters:{locks:1,unlocks:1,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});delete r.securityEvents;
  const summary=w.verifierSecuritySummary(r);must(summary.lockedCount===1&&summary.recoveryCount===1&&summary.events.length===2,'critical-only summary is incomplete');
  setRows([r]);render();must(w.document.querySelectorAll('#resultTable [data-s4-event]').length===2,'critical-only timeline is missing events');
  return 'critical-only summary and timeline contain both events';
});

check('S41-06-security-only-events-remain-supported',()=>{
  const summary=w.verifierSecuritySummary(row('SECURITY-ONLY',[event('locked',1),event('bad-unlock',2)]));
  must(summary.lockedCount===1&&summary.badRecoveryCount===1&&summary.events.length===2,'security-only history changed');
  return 'security-only history preserved';
});

check('S41-07-exact-cross-source-duplicate-counted-once',()=>{
  const duplicate=event('locked',1,{criticalSeq:1,detail:'same evidence'});
  const r=row('EXACT-DEDUPE',[{...duplicate}],{criticalEvents:[{...duplicate}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});
  const summary=w.verifierSecuritySummary(r);must(summary.events.length===1&&summary.lockedCount===1,`duplicate count ${summary.events.length}/${summary.lockedCount}`);
  return 'same event appears once';
});

check('S41-08-partial-overlap-does-not-drop-unique-event',()=>{
  const first=event('locked',1,{criticalSeq:1,detail:'first lock'}),second=event('locked',2,{criticalSeq:2,detail:'second lock'});
  const r=row('PARTIAL',[{...first},{...second}],{criticalEvents:[{...first}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});
  const summary=w.verifierSecuritySummary(r);must(summary.events.length===2&&summary.lockedCount===2,`unique event lost: ${summary.events.length}/${summary.lockedCount}`);
  return 'one duplicate removed, second lock retained';
});

check('S41-09-order-evidence-and-severity-preserved',()=>{
  const lock=event('locked',30,{criticalSeq:1,detail:'hard lock'}),recovery=event('recovery-unlock',20,{criticalSeq:2,lockReason:'hard lock'}),split=event('split-window',10,{pct:7,detail:'soft split'});
  const r=row('ORDER',[split,{...lock}],{criticalEvents:[{...lock},{...recovery}],criticalCounters:{locks:1,unlocks:1,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});
  const summary=w.verifierSecuritySummary(r),times=summary.events.map(e=>e.t);
  must(times.every((t,i)=>i===0||Date.parse(times[i-1])<=Date.parse(t)),'events are not chronological');
  must(summary.lockedCount===1&&summary.recoveryCount===1&&summary.splitWindowEvents===1,'classification counts changed');
  const signals=w.securitySignalsFor(r,w.duplicateInfo());
  must(signals.some(s=>s.code==='split-window'&&s.sev==='soft'),'split soft classification missing');
  must(signals.some(s=>s.code==='recovery-unlock'&&s.sev==='info'),'legitimate Recovery info classification missing');
  return 'chronology, evidence and soft/info classification preserved';
});

check('S41-10-more-than-300-events-remain-complete',()=>{
  const routine=Array.from({length:305},(_,i)=>event('focus-transition',i+1,{awayMs:i}));
  const lock=event('locked',400,{criticalSeq:1,detail:'stress lock'});routine.push({...lock});
  const r=row('STRESS',routine,{criticalEvents:[{...lock}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});
  const summary=w.verifierSecuritySummary(r);must(summary.events.length===306,'300+ merged history is incomplete');
  setRows([r]);render();must(w.document.querySelectorAll('#resultTable [data-s4-event]').length===306,'300+ timeline is incomplete');
  return '306 unique events shown';
});

check('S41-11-critical-only-is-not-false-zero-telemetry',()=>{
  const critical=[event('locked',1,{criticalSeq:1})],r=row('NO-ROUTINE',undefined,{criticalEvents:critical,criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false});delete r.securityEvents;setRows([r]);render();
  must(/Data nejsou k dispozici/.test(text('.s4-split')),'missing routine telemetry is not marked unavailable');
  must(w.document.querySelectorAll('#resultTable [data-s4-event]').length===1,'available critical evidence is hidden');
  return 'routine telemetry absent while critical evidence remains visible';
});

const passed=results.filter(x=>x.status==='PASS').length;
fs.mkdirSync(new URL('../qa-results/',import.meta.url),{recursive:true});
fs.writeFileSync(evidencePath,JSON.stringify({schema:'git-s41-teacher-verifier-remediation-v1',gitHead,status:passed===results.length?'PASS':'FAIL',passed,failed:results.length-passed,total:results.length,results},null,2)+'\n');
console.log(`${passed===results.length?'PASS':'FAIL'} Sprint 04.1 remediation gate ${passed}/${results.length}`);
await dom.window.close();
