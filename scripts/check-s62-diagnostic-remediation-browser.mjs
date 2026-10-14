#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {w,configure,build} from './redteam-harness-utils.mjs';

const outDir=path.resolve('qa-results/s62-diagnostic-remediation-browser'),evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean),executablePath=candidates.find(item=>fs.existsSync(item));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks=[],pageErrors=[];
function check(condition,id,detail){if(!condition)throw new Error(`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});
w.eval(`rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}]`);
const pkg=await build(),browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('https://school.example/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:route.request().url().includes('verifier')?pkg.teacherHtml:pkg.studentHtml}));
function watch(page){page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));page.on('console',message=>{if(message.type()==='error')pageErrors.push(`console: ${message.text()}`);});return page;}

try{
  const student=watch(await context.newPage());await student.goto('https://school.example/student.html');await student.locator('#startCode').fill(pkg.startCode);await student.locator('#studentName').fill('A7B9C2');await student.evaluate(()=>startTest());await student.waitForFunction(()=>isTestActive());
  const imports=await student.evaluate(async()=>{
    const base=await secureAnswers(),origin=Date.parse(base.startedAt),stamp=offset=>new Date(origin+offset).toISOString(),out=[];
    async function wrap(payload){return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:payload.testId,manifestHash:payload.manifestHash,studentHtmlSha256:payload.studentHtmlSha256||'',payload:await encryptPayloadForTeacher(payload)});}
    function invalid(attemptId,options={}){const payload=structuredClone(base),type=options.type||'locked',offset=options.offset||0,event={t:stamp(offset+10),type,detail:options.detail||attemptId,criticalSeq:1};Object.assign(payload,{attemptId,student:'',code:'',resp:{'0_0':1},startedAt:stamp(offset),submittedAt:stamp(offset+1000),securityEvents:options.securityEvents??[event],criticalEvents:options.criticalEvents??[event],criticalCounters:options.criticalCounters??{locks:type==='locked'?1:0,unlocks:type==='recovery-unlock'?1:0,resumes:0,badUnlocks:type==='bad-unlock'?1:0},criticalOverflow:false,criticalHistoryLegacy:false,routineHistoryTruncated:false});if(options.missingCounters)delete payload.criticalCounters;if(options.securityOnly){delete payload.criticalEvents;delete payload.criticalCounters;delete payload.criticalOverflow;delete payload.criticalHistoryLegacy;}if(options.criticalOnly)delete payload.securityEvents;return payload;}
    const duplicate=invalid('S62-DUPLICATE',{detail:'single lock'}),duplicateTxt=await wrap(duplicate);out.push({id:'S62-DUPLICATE-1',txt:duplicateTxt,row:1});out.push({id:'S62-DUPLICATE-2',txt:duplicateTxt,row:2});
    out.push({id:'S62-CONFLICT-A',txt:await wrap(invalid('S62-CONFLICT',{offset:5000,detail:'first payload'})),row:3});out.push({id:'S62-CONFLICT-B',txt:await wrap(invalid('S62-CONFLICT',{offset:5000,type:'bad-unlock',detail:'second payload'})),row:4});
    const counterCases=[['NULLS',{locks:null,unlocks:null,resumes:null,badUnlocks:null}],['EMPTY',{locks:'',unlocks:'',resumes:'',badUnlocks:''}],['FALSE',{locks:false,unlocks:false,resumes:false,badUnlocks:false}],['STRINGS',{locks:'0',unlocks:'1',resumes:'0',badUnlocks:'0'}]];
    for(let index=0;index<counterCases.length;index++){const [name,counters]=counterCases[index],payload=invalid('S62-COUNTER-'+name,{offset:10000+index*1500,securityEvents:[],criticalEvents:[],criticalCounters:counters});out.push({id:payload.attemptId,txt:await wrap(payload),row:10+index});}
    const missing=invalid('S62-COUNTER-MISSING',{offset:17000,securityEvents:[],criticalEvents:[],missingCounters:true});out.push({id:missing.attemptId,txt:await wrap(missing),row:14});
    const zero=invalid('S62-COUNTER-ZERO',{offset:18500,securityEvents:[],criticalEvents:[],criticalCounters:{locks:0,unlocks:0,resumes:0,badUnlocks:0}});out.push({id:zero.attemptId,txt:await wrap(zero),row:15});
    const oneEvent={t:stamp(20010),type:'locked',detail:'one',criticalSeq:1},one=invalid('S62-COUNTER-ONE',{offset:20000,securityEvents:[oneEvent],criticalEvents:[oneEvent],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0}});out.push({id:one.attemptId,txt:await wrap(one),row:16});
    const stressEvents=Array.from({length:305},(_,index)=>({t:stamp(30000+index),type:index%100===0?'locked':'focus-transition',detail:'stress '+index})),stress=invalid('S62-STRESS',{offset:30000,securityEvents:stressEvents,securityOnly:true});out.push({id:stress.attemptId,txt:await wrap(stress),row:20});
    const critical=invalid('S62-CRITICAL-ONLY',{offset:40000,type:'recovery-unlock',detail:'authorized recovery',criticalOnly:true});out.push({id:critical.attemptId,txt:await wrap(critical),row:21});
    const shared={t:stamp(50010),type:'locked',detail:'shared',criticalSeq:1},both=invalid('S62-BOTH',{offset:50000,securityEvents:[shared],criticalEvents:[shared],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0}});out.push({id:both.attemptId,txt:await wrap(both),row:22});return out;
  });

  const verifier=watch(await context.newPage());await verifier.goto('https://school.example/verifier.html');
  for(const item of imports)await verifier.evaluate(async item=>verifyText(item.id+'.txt',item.txt,{source:'google-forms-csv',formIdentity:'synthetic@example.invalid',formTimestamp:'2026-10-13T18:00:00Z',formRow:item.row,formFile:'synthetic.csv',formBatchId:'S62-BATCH'}),item);
  const state=await verifier.evaluate(()=>{
    rebuildDuplicateState();
    const duplicate=RESULTS.filter(r=>r.attemptId==='S62-DUPLICATE').map(r=>({exact:r.exactDuplicate,of:r.exactDuplicateOf,replay:r.replayStatus,formRow:r.formRow}));
    const conflict=RESULTS.filter(r=>r.attemptId==='S62-CONFLICT').map(r=>({exact:r.exactDuplicate,hard:r.hardReplayConflict,attempt:r.attemptConflict,replay:r.replayStatus,digest:r.submissionDigest}));
    const counter=RESULTS.filter(r=>r.attemptId.startsWith('S62-COUNTER-')).map(r=>({id:r.attemptId,state:r.criticalCountersState,has:Object.hasOwn(r,'criticalCounters'),history:historyCompletenessAssessment(r),csv:historyCsvValues(r).slice(-4)}));
    const summaries=['S62-STRESS','S62-CRITICAL-ONLY','S62-BOTH'].map(id=>{const r=RESULTS.find(x=>x.attemptId===id),s=verifierSecuritySummary(r);return {id,events:s.events.length,locks:s.lockedCount,recovery:s.recoveryCount,telemetry:s.telemetryState};});
    return {rows:RESULTS.length,uniqueDuplicate:securityReviewResults().filter(r=>r.attemptId==='S62-DUPLICATE').length,duplicate,conflict,counter,summaries};
  });
  check(state.rows===14&&state.uniqueDuplicate===1&&state.duplicate[0].exact===false&&state.duplicate[1].exact===true&&state.duplicate[1].of===0&&state.duplicate[1].replay==='EXACT_DUPLICATE','S62-B01','generated verifier retains two imports but aggregates one unique duplicate attempt');
  check(state.duplicate[0].formRow===1&&state.duplicate[1].formRow===2,'S62-B02','generated verifier preserves source metadata of both identical Forms rows');
  check(state.conflict.length===2&&state.conflict[0].digest!==state.conflict[1].digest&&state.conflict.every(r=>!r.exact&&r.hard&&r.attempt&&r.replay==='ATTEMPT_CONFLICT'),'S62-B03','different ciphertexts under one attemptId stay separate and visibly conflicted');
  const invalid=state.counter.filter(item=>['S62-COUNTER-NULLS','S62-COUNTER-EMPTY','S62-COUNTER-FALSE','S62-COUNTER-STRINGS','S62-COUNTER-MISSING'].includes(item.id));
  check(invalid.length===5&&invalid.every(item=>!item.has&&item.history.possiblyIncomplete&&/ČÍTAČE/.test(item.history.label)&&item.csv.every(value=>value==='')),'S62-B04','invalid and missing counters remain UNKNOWN in generated verifier and history CSV values');
  const zero=state.counter.find(item=>item.id==='S62-COUNTER-ZERO'),one=state.counter.find(item=>item.id==='S62-COUNTER-ONE');
  check(zero.state==='PRESENT'&&!zero.history.possiblyIncomplete&&zero.csv[0]===0&&one.state==='PRESENT'&&!one.history.possiblyIncomplete&&one.csv[0]===1,'S62-B05','genuine numeric zero and one remain distinct valid measurements');
  check(state.summaries[0].events===305&&state.summaries[0].locks===4&&state.summaries[1].events===1&&state.summaries[1].recovery===1&&state.summaries[1].telemetry==='ABSENT'&&state.summaries[2].events===1,'S62-B06','300+, security-only, critical-only and merged dual-source histories retain their semantics');

  const ui=await verifier.evaluate(()=>{afterResultsChanged();showVerifierPanel('results');const results=$('resultTable').textContent;VERIFIER_SECURITY_QUERY='S62-DUPLICATE';showVerifierPanel('security');s4RenderSecuritySignals();return {results,security:$('securitySignals').textContent,securityRows:[...$('securitySignals').querySelectorAll('tbody tr, tr')].filter(row=>row.textContent.includes('S62-DUPLICATE')).length};});
  check(/Identická duplicita/.test(ui.results)&&/S62-CONFLICT/.test(ui.results)&&/Hard replay konflikt/.test(ui.results),'S62-B07','results UI labels the repeated import and same-attempt conflict for manual review');
  check(ui.securityRows===1&&/S62-DUPLICATE/.test(ui.security),'S62-B08','security dashboard renders only the unique quarantine attempt, not its repeated copy');

  const csv=await verifier.evaluate(()=>{window.__s62Downloads={};downloadText=(text,name)=>{window.__s62Downloads[name]=text;};downloadSubmissionsCsv();const text=window.__s62Downloads[Object.keys(window.__s62Downloads)[0]],rows=csvParseDelimited(text,';'),head=rows[0],col=name=>head.indexOf(name);return {head,rows:rows.slice(1).map(row=>({attempt:row[col('attempt_id')],exact:row[col('exact_duplicate')],replay:row[col('replay_status')],history:row[col('history_completeness')],locks:row[col('critical_locks')],unlocks:row[col('critical_unlocks')],resumes:row[col('critical_resumes')],bad:row[col('critical_bad_unlocks')]}))};});
  const csvDuplicate=csv.rows.filter(row=>row.attempt==='S62-DUPLICATE'),csvUnknown=csv.rows.filter(row=>invalid.some(item=>item.id===row.attempt)),csvZero=csv.rows.find(row=>row.attempt==='S62-COUNTER-ZERO'),csvOne=csv.rows.find(row=>row.attempt==='S62-COUNTER-ONE');
  check(csvDuplicate.length===2&&csvDuplicate[0].exact==='NE'&&csvDuplicate[0].replay==='CLEAR'&&csvDuplicate[1].exact==='ANO'&&csvDuplicate[1].replay==='EXACT_DUPLICATE','S62-B09','diagnostic CSV explicitly distinguishes original versus repeated identical import');
  check(csvUnknown.length===5&&csvUnknown.every(row=>/ČÍTAČE/.test(row.history)&&[row.locks,row.unlocks,row.resumes,row.bad].every(value=>value===''))&&csvZero.locks==='0'&&csvOne.locks==='1','S62-B10','diagnostic CSV exports UNKNOWN as blank and preserves measured 0/1');
  await verifier.screenshot({path:path.join(outDir,'teacher-verifier-s62-diagnostics.png'),fullPage:true});
  check(pageErrors.length===0,'S62-B11','Chromium run completed without pageerror or console error');

  const evidence={schema:'git-s62-diagnostic-remediation-browser-v1',status:'PASS',gitHead,chromium:executablePath,artifacts:{studentSha256:sha(pkg.studentHtml),teacherSha256:sha(pkg.teacherHtml)},checks,pageErrors};await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');console.log(`PASS Sprint 06.2 Chromium gate (${checks.length} checks)`);
}catch(error){const evidence={schema:'git-s62-diagnostic-remediation-browser-v1',status:'FAIL',gitHead,chromium:executablePath,checks,pageErrors,error:String(error?.stack||error)};await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');throw error;}finally{await context.close().catch(()=>{});await browser.close().catch(()=>{});}
