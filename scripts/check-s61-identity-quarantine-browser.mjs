#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {w,configure,build} from './redteam-harness-utils.mjs';

const outDir=path.resolve('qa-results/s61-identity-quarantine-browser');
const evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executablePath=candidates.find(x=>fs.existsSync(x));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks=[],pageErrors=[];
function check(condition,id,detail){if(!condition)throw new Error(`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});
w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D4E6F8',label:'Synthetic B',email:'synthetic-b@example.invalid'},{code:'G3H5J7',label:'Synthetic C',email:'synthetic-c@example.invalid'},{code:'K2M4N6',label:'Synthetic D',email:'synthetic-d@example.invalid'}];");
const pkg=await build();
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});
const contexts=[];
function watch(page){page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));page.on('console',m=>{if(m.type()==='error')pageErrors.push(`console: ${m.text()}`);});return page;}
async function contextFor(artifacts){
  const context=await browser.newContext({viewport:{width:1365,height:900}});contexts.push(context);
  await context.route('https://school.example/**',route=>{const url=route.request().url();const body=url.includes('verifier')?artifacts.teacherHtml:artifacts.studentHtml;return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body});});
  return context;
}
async function start(page,artifacts,identity){
  await page.goto('https://school.example/student.html');
  await page.locator('#startCode').fill(artifacts.startCode);
  await page.locator('#studentName').fill(identity);
  await page.evaluate(()=>startTest());
  await page.waitForFunction(()=>isTestActive());
}
async function snapshot(page){return page.evaluate(()=>({active:isTestActive(),submitted:SUBMITTED,attemptId:ATTEMPT_ID,identity:ACTIVE_IDENTITY,identityHash:ACTIVE_IDENTITY_HASH,deadline:TIMER_DEADLINE,resp:JSON.parse(JSON.stringify(RESP)),events:SEC_EVENTS.map(e=>e.type),done:!$('done').classList.contains('hidden'),answer:$('answerBackup').value}));}

try{
  const c1=await contextFor(pkg),student=watch(await c1.newPage());
  await start(student,pkg,'a7b9c2');
  await student.evaluate(()=>setResp('0_0',1));
  const before=await snapshot(student);
  await student.evaluate(()=>$('studentName').value='ZZZZZZ');
  await student.evaluate(()=>submitSecureTest('manual'));
  await student.waitForTimeout(250);
  const blocked=await snapshot(student);
  check(blocked.active&&!blocked.submitted&&blocked.attemptId===before.attemptId&&blocked.deadline===before.deadline&&blocked.resp['0_0']===1&&blocked.identity==='A7B9C2'&&blocked.events.includes('identity-input-mismatch'),'S61-B01','cizí DOM identita blokuje submit a zachová identity/attempt/timer/odpovědi');
  check(await student.evaluate(()=>$('studentName').value)==='A7B9C2','S61-B02','po fail-closed kontrole je formulář vrácen na kanonickou identitu');
  await student.evaluate(()=>submitSecureTest('manual'));
  await student.waitForFunction(()=>!$('done').classList.contains('hidden'));
  const submitted=await snapshot(student);
  check(submitted.answer.startsWith('SECURE-ANSWERS-V1\n'),'S61-B03','opakované odevzdání s kanonickou identitou úspěšně vytvořilo šifrovaný výsledek');

  const pkgReload=await build(),c2=await contextFor(pkgReload),reload=watch(await c2.newPage());
  await start(reload,pkgReload,'A7B9C2');await reload.evaluate(()=>{setResp('0_0',1);return flushPendingAttemptWrites();});
  const reloadBefore=await snapshot(reload);await reload.reload();
  await reload.locator('#startCode').fill(pkgReload.startCode);await reload.locator('#studentName').fill('a7b9c2');await reload.evaluate(()=>startTest());await reload.waitForFunction(()=>isTestActive());
  const restored=await snapshot(reload);
  check(restored.attemptId===reloadBefore.attemptId&&restored.deadline===reloadBefore.deadline&&restored.resp['0_0']===1&&restored.identity==='A7B9C2','S61-B04','reload obnovil stejný pokus, timer, odpovědi a kanonickou identitu');
  await reload.evaluate(()=>handlePageRestore({persisted:true}));
  const bfcache=await snapshot(reload);
  check(bfcache.attemptId===reloadBefore.attemptId&&bfcache.deadline===reloadBefore.deadline&&bfcache.resp['0_0']===1&&bfcache.events.includes('page-restored'),'S61-B04B','BFCache obnova zachovala identitu, timer, odpověď a přidala auditní událost');
  const second=watch(await c2.newPage());await second.goto('https://school.example/student.html');await second.locator('#startCode').fill(pkgReload.startCode);await second.locator('#studentName').fill('A7B9C2');await second.evaluate(()=>startTest());await second.waitForTimeout(300);
  check(!(await second.evaluate(()=>isTestActive())),'S61-B04C','souběžná druhá karta nepřevzala aktivní pokus');await second.close();
  await reload.evaluate(()=>$('studentName').value='');
  await reload.evaluate(()=>{TIMER_DEADLINE=Date.now()-1;refreshSecureTimer();});
  await reload.waitForFunction(()=>!$('done').classList.contains('hidden'),null,{timeout:8000});
  const timerDone=await snapshot(reload);
  check(timerDone.submitted&&timerDone.resp['0_0']===1&&timerDone.events.includes('identity-input-mismatch'),'S61-B05','timer auto-submit nejprve fail-closed opravil identitu a následně odevzdal bez ztráty odpovědi');

  const pkgCrash=await build(),c3=await contextFor(pkgCrash),crash=watch(await c3.newPage());
  await start(crash,pkgCrash,'A7B9C2');await crash.evaluate(()=>setResp('0_0',1));
  await crash.evaluate(()=>{setSubmittedLocked=async()=>false;return submitSecureTest('manual');});await crash.waitForFunction(()=>!$('done').classList.contains('hidden'));
  const outbox=await crash.evaluate(async()=>({body:(await loadSignedRecord('submissionOutbox')).record?.body,answer:$('answerBackup').value}));
  check(outbox.body?.student==='A7B9C2'&&outbox.body?.txt===outbox.answer,'S61-B06','crash mezi outboxem a submitted guardem zachoval kanonickou identitu a ciphertext');
  await crash.reload();await crash.locator('#startCode').fill(pkgCrash.startCode);await crash.locator('#studentName').fill('A7B9C2');await crash.evaluate(()=>startTest());await crash.waitForFunction(()=>!$('done').classList.contains('hidden'));
  check((await snapshot(crash)).answer===outbox.answer,'S61-B07','po reloadu se obnovil původní outbox bez náhradního pokusu');

  configure({identityMode:'name',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});w.eval('rosterEntries=[];');
  const pkgName=await build(),cName=await contextFor(pkgName),named=watch(await cName.newPage());await start(named,pkgName,'  Synthetic Student  ');await named.evaluate(()=>{setResp('0_0',1);$('studentName').value='Foreign Name';return submitSecureTest('manual');});await named.waitForTimeout(250);
  const namedState=await snapshot(named);
  check(namedState.active&&!namedState.submitted&&namedState.identity==='Synthetic Student'&&namedState.resp['0_0']===1&&namedState.events.includes('identity-input-mismatch'),'S61-B07B','jmenná identita je normalizována a stejným fail-closed pravidlem chrání odpovědi');

  configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D4E6F8',label:'Synthetic B',email:'synthetic-b@example.invalid'},{code:'G3H5J7',label:'Synthetic C',email:'synthetic-c@example.invalid'},{code:'K2M4N6',label:'Synthetic D',email:'synthetic-d@example.invalid'}];");
  const c4=await contextFor(pkg),producer=watch(await c4.newPage());await start(producer,pkg,'A7B9C2');
  const rows=await producer.evaluate(async()=>{
    const base=await secureAnswers(),codes=['A7B9C2','D4E6F8','G3H5J7','K2M4N6'],emails=['synthetic-a@example.invalid','synthetic-b@example.invalid','synthetic-c@example.invalid','synthetic-d@example.invalid'],out=[];
    async function wrap(payload){return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:payload.testId,manifestHash:payload.manifestHash,studentHtmlSha256:payload.studentHtmlSha256||'',payload:await encryptPayloadForTeacher(payload)});}
    for(let i=0;i<4;i++){const started=new Date(Date.parse(base.startedAt)+i*2000).toISOString(),submitted=new Date(Date.parse(started)+1000).toISOString(),attemptId='S61-VALID-'+(i+1);const p={...base,attemptId,student:codes[i],code:codes[i],startedAt:started,submittedAt:submitted,resp:{'0_0':1},securityEvents:[{t:started,type:'attempt-start',detail:attemptId}],criticalEvents:[],criticalCounters:{locks:0,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false};out.push({txt:await wrap(p),email:emails[i],formTimestamp:new Date(Date.parse(submitted)+1000).toISOString(),kind:'valid',attemptId});}
    const started=new Date(Date.parse(base.startedAt)+12000).toISOString(),submitted=new Date(Date.parse(started)+2000).toISOString();
    const routine=[{t:started,type:'attempt-start',detail:'S61-INVALID-SECURITY'},...Array.from({length:302},(_,i)=>({t:new Date(Date.parse(started)+i+1).toISOString(),type:i%70===0?'locked':'focus-transition',detail:'event '+i})),{t:new Date(Date.parse(started)+500).toISOString(),type:'split-window',detail:'unknown'},{t:new Date(Date.parse(started)+501).toISOString(),type:'split-window',pct:0,detail:'zero'},{t:new Date(Date.parse(started)+502).toISOString(),type:'split-window',pct:19,detail:'nineteen'},{t:new Date(Date.parse(started)+503).toISOString(),type:'split-window',pct:96,detail:'ninety-six'}];
    const invalidA={...base,attemptId:'S61-INVALID-SECURITY',student:'',code:'',startedAt:started,submittedAt:submitted,resp:{'0_0':1},securityEvents:routine};delete invalidA.criticalEvents;delete invalidA.criticalCounters;delete invalidA.criticalOverflow;delete invalidA.criticalHistoryLegacy;out.push({txt:await wrap(invalidA),email:'unknown@example.invalid',formTimestamp:new Date(Date.parse(submitted)+1000).toISOString(),kind:'invalid',attemptId:invalidA.attemptId});
    const critical=[];for(let i=0;i<15;i++){critical.push({t:new Date(Date.parse(started)+600+i*3).toISOString(),type:'locked',detail:'authorized experiment',criticalSeq:critical.length+1});critical.push({t:new Date(Date.parse(started)+601+i*3).toISOString(),type:'recovery-unlock',detail:'authorized recovery',criticalSeq:critical.length+1});if(i<8)critical.push({t:new Date(Date.parse(started)+602+i*3).toISOString(),type:'bad-unlock',detail:'synthetic bad',criticalSeq:critical.length+1});}
    const invalidB={...base,attemptId:'S61-INVALID-CRITICAL',student:'',code:'',startedAt:started,submittedAt:submitted,resp:{'0_0':1,'0_1':0},criticalEvents:critical,criticalCounters:{locks:15,unlocks:15,resumes:0,badUnlocks:8},criticalOverflow:false,criticalHistoryLegacy:false};delete invalidB.securityEvents;out.push({txt:await wrap(invalidB),email:'unknown@example.invalid',formTimestamp:new Date(Date.parse(submitted)+1000).toISOString(),kind:'invalid',attemptId:invalidB.attemptId});return out;
  });
  const verifier=watch(await c4.newPage());await verifier.goto('https://school.example/verifier.html');
  const policy={schoolDomain:'example.invalid',publishedAt:new Date(Date.now()-60000).toISOString(),csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,oneResponseConfirmed:false};
  await verifier.evaluate(p=>setFormsAnchorPolicy(p),policy);
  const outcomes=[];for(const row of rows){outcomes.push(await verifier.evaluate(async row=>verifyText(row.attemptId+'.txt',row.txt,{source:'google-forms-csv',formIdentity:row.email,formTimestamp:row.formTimestamp}),row));}
  const counts=await verifier.evaluate(()=>({scored:RESULTS.filter(isScoredResult).length,quarantine:RESULTS.filter(isDiagnosticQuarantine).length,effective:effectiveResults().length,zeroGrades:RESULTS.filter(r=>isDiagnosticQuarantine(r)&&['earned','total','pct','grade'].some(k=>Object.hasOwn(r,k))).length,answers:RESULTS.filter(isDiagnosticQuarantine).map(r=>r.answerCount),classes:RESULTS.map(classificationStatus)}));
  check(counts.scored===4&&counts.quarantine===2&&counts.effective===4&&counts.zeroGrades===0&&counts.answers.join(',')==='1,2','S61-B08','mix 4 platné + 2 prázdné identity vytvořil 4 bodované výsledky a 2 karantény bez 0/0');
  await verifier.evaluate(()=>{afterResultsChanged();showVerifierPanel('results');});
  const ui=await verifier.evaluate(()=>({table:$('resultTable').textContent,quarantineRows:[...document.querySelectorAll('.s4-result-main')].filter(r=>/Nevyhodnotitelné/.test(r.textContent)).map(r=>r.textContent),security:(showVerifierPanel('security'),$('securitySignals').textContent)}));
  check(ui.quarantineRows.length===2&&ui.quarantineRows.every(x=>/Nevyhodnotitelné/.test(x)&&!/0\/0/.test(x)&&/Bez známky/.test(x)),'S61-B09','hlavní tabulka zobrazuje dvě nevyhodnotitelné karantény bez 0/0 a známky: '+JSON.stringify(ui.quarantineRows));
  check(/S61-INVALID-SECURITY/.test(ui.security)&&/S61-INVALID-CRITICAL/.test(ui.security)&&/15/.test(ui.security)&&/legitimní servisní operace|audit-only/i.test(ui.security),'S61-B10','bezpečnostní dashboard zahrnuje security-only i critical-only karanténu a neobviňující Recovery interpretaci');
  const csv=await verifier.evaluate(()=>{window.__s61Downloads={};downloadText=(txt,fn)=>{window.__s61Downloads[fn]=txt;};downloadResultsCsv();downloadSubmissionsCsv();return window.__s61Downloads;});
  const gradeCsv=Object.entries(csv).find(([k])=>k.startsWith('results_'))?.[1]||'',diagnosticCsv=Object.entries(csv).find(([k])=>k.startsWith('submissions_'))?.[1]||'';
  check(!gradeCsv.includes('S61-INVALID')&&gradeCsv.split('\n').length===5,'S61-B11','standardní export známek obsahuje pouze čtyři platné výsledky');
  check(/diagnostic_status/.test(diagnosticCsv)&&/answer_count/.test(diagnosticCsv)&&/DIAGNOSTIC_QUARANTINE/.test(diagnosticCsv)&&/S61-INVALID-SECURITY/.test(diagnosticCsv)&&/split pct: Nezjištěno/.test(diagnosticCsv)&&/split pct: 0 %/.test(diagnosticCsv)&&/split pct: 19 %/.test(diagnosticCsv)&&/split pct: 96 %/.test(diagnosticCsv),'S61-B12','diagnostické CSV zachovává stav, počet odpovědí, chronologii a split UNKNOWN/0/19/96');
  const malformed=await verifier.evaluate(()=>verifyText('malformed.txt','SECURE-ANSWERS-V1\n{"payload":"broken"}'));
  check(malformed.row.status==='MALFORMED_CIPHERTEXT'&&!Object.hasOwn(malformed.row,'securityEvents')&&!Object.hasOwn(malformed.row,'grade'),'S61-B13','malformed ciphertext je oddělený a nepředstírá telemetrii ani známku');
  await verifier.screenshot({path:path.join(outDir,'teacher-verifier-quarantine.png'),fullPage:true});
  check(pageErrors.length===0,'S61-B14','Chromium běh skončil bez pageerror/console error');

  const evidence={schema:'git-s61-identity-quarantine-browser-v1',status:'PASS',gitHead,chromium:executablePath,artifacts:{studentSha256:sha(pkg.studentHtml),teacherSha256:sha(pkg.teacherHtml)},checks,pageErrors};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  console.log(`PASS Sprint 06.1 Chromium gate (${checks.length} checks)`);
}catch(error){const evidence={schema:'git-s61-identity-quarantine-browser-v1',status:'FAIL',gitHead,chromium:executablePath,checks,pageErrors,error:String(error?.stack||error)};await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');throw error;}finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close().catch(()=>{});}
