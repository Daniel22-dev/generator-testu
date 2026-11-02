#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {configure,build,w,gdom,enterStartCode} from './redteam-harness-utils.mjs';

const origin='https://c32-boundary.example';
const results=[];
const contexts=[];
const pageErrors=[];
let browser;

function record(id,status,detail,error=''){
  results.push({id,status,detail,error});
  (status==='PASS'?console.log:console.error)(`${status} ${id} — ${detail}${error?`: ${error}`:''}`);
}

async function scenario(id,detail,fn){
  try{await fn();record(id,'PASS',detail);}
  catch(error){record(id,'FAIL',detail,String(error&&error.message||error));}
}

async function newContext(body,{legacyFlag=false,legacyHelper=false}={}){
  const context=await browser.newContext({viewport:{width:1280,height:900},screen:{width:1280,height:900},acceptDownloads:true});
  contexts.push(context);
  if(legacyFlag||legacyHelper)await context.addInitScript(({legacyFlag,legacyHelper})=>{
    if(legacyFlag)window.__GHRAB_TEACHER_PREVIEW__=true;
    if(legacyHelper)window.strictTeacherPreview=()=>true;
  },{legacyFlag,legacyHelper});
  await context.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body}));
  return context;
}

async function newPage(context,path){
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(`${path}: ${error.message}`));
  await page.goto(origin+path);
  return page;
}

async function prepareStrict(page,pkg){
  await page.locator('#studentName').fill('A7B9C2');
  await enterStartCode(page,pkg);
  await page.locator('#strictVerifyBtn').click();
  await page.waitForFunction(()=>!!STRICT_PREFLIGHT);
  assert.equal(await page.evaluate(()=>strictReadyState()),'supported-ready');
}

async function startStrict(page,pkg){
  await prepareStrict(page,pkg);
  await page.locator('#strictFullscreenStartBtn').click();
  await page.waitForFunction(()=>isTestActive()&&STRICT_FULLSCREEN_MODE==='enforced'&&!!document.fullscreenElement);
}

try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  for(const forbidden of ['__GHRAB_TEACHER_PREVIEW__','strictTeacherPreview','preview-ready','isolated-teacher-srcdoc','__GHRAB_PRIVATE_TEACHER_PREVIEW__']){
    assert.equal(pkg.studentHtml.includes(forbidden),false,`public student artifact must not contain ${forbidden}`);
  }
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});

  await scenario('C32-B01','legacy preview flag before start cannot suppress signed attempt persistence',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml,{legacyFlag:true}),'/flag-prestart.html');
    await startStrict(page,pkg);
    await page.evaluate(()=>flushPendingAttemptWrites());
    const state=await page.evaluate(()=>({active:isTestActive(),attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,stored:localStorage.getItem(storageKey('activeAttempt')),mode:STRICT_FULLSCREEN_MODE}));
    assert.equal(state.mode,'enforced');assert.equal(state.active,true);assert.ok(state.attempt);assert.ok(state.deadline>0);
    assert.ok(typeof state.stored==='string'&&state.stored.includes(state.attempt));
  });

  await scenario('C32-B02','legacy preview flag during an attempt cannot bypass persistence or leave lock',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml),'/flag-during.html');
    await startStrict(page,pkg);
    const state=await page.evaluate(async()=>{
      window.__GHRAB_TEACHER_PREVIEW__=true;
      await saveSignedRecord('c32Probe',{stage:'during'},++PERSIST_REV,true);
      handleLeave('c32-controlled-leave','controlled leave after legacy flag injection');
      await flushPendingAttemptWrites();
      return {stored:localStorage.getItem(storageKey('c32Probe')),locked:LOCKED,events:SEC_EVENTS.filter(event=>event.type==='c32-controlled-leave').length};
    });
    assert.ok(state.stored);assert.equal(state.locked,true);assert.equal(state.events,1);
  });

  await scenario('C32-B03','legacy preview flag cannot bypass the same-origin concurrent-tab lock',async()=>{
    const context=await newContext(pkg.studentHtml,{legacyFlag:true});
    const first=await newPage(context,'/flag-tab-a.html');
    const second=await newPage(context,'/flag-tab-b.html');
    await prepareStrict(first,pkg);
    await second.locator('#studentName').fill('A7B9C2');await enterStartCode(second,pkg);await second.locator('#strictVerifyBtn').click();await second.waitForTimeout(250);
    assert.equal(await first.evaluate(()=>!!STRICT_PREFLIGHT),true);
    assert.deepEqual(await second.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,active:isTestActive()})),{preflight:false,active:false});
  });

  await scenario('C32-B04','legacy preview flag cannot hide completed submission or create a replacement attempt',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/flag-submitted.html');
    await startStrict(page,pkg);await page.evaluate(()=>submitSecureTest());
    await page.waitForFunction(()=>SUBMITTED&&ANSWER_TXT.startsWith('SECURE-ANSWERS-V1'));
    await page.addInitScript(()=>{window.__GHRAB_TEACHER_PREVIEW__=true;});await page.reload();
    await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);
    const state=await page.evaluate(async()=>({guard:localStorage.getItem(storageKey('submitted')),guardLocked:await submittedLocked(),prepared:!!(await strictPreflightChecks()),active:isTestActive(),outbox:await loadSignedRecord('submissionOutbox'),answer:ANSWER_TXT}));
    assert.equal(state.guard,'1');assert.equal(state.guardLocked,true);assert.equal(state.prepared,false);assert.equal(state.active,false);
    assert.ok(state.outbox.record&&state.outbox.record.body.txt.startsWith('SECURE-ANSWERS-V1'));assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'));
  });

  await scenario('C32-B05','legacy preview flag does not suppress the real Forms handoff path',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml,{legacyFlag:true}),'/flag-forms.html');
    const state=await page.evaluate(()=>{let opened='';CFG.formsSubmissionUrl='https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform';const status=document.createElement('div');status.id='formsSubmitStatus';document.body.appendChild(status);window.open=url=>{opened=String(url);return {opener:null};};openSubmissionForm();return {opened,status:status.textContent};});
    assert.equal(state.opened,'https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform');assert.match(state.status,/otev|open/i);
  });

  await scenario('C32-H01','legacy helper before start cannot select preview mode or suppress signed persistence',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml,{legacyHelper:true}),'/helper-prestart.html');
    await startStrict(page,pkg);await page.evaluate(()=>flushPendingAttemptWrites());
    const state=await page.evaluate(()=>({legacyResult:window.strictTeacherPreview(),mode:STRICT_FULLSCREEN_MODE,active:isTestActive(),attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,stored:localStorage.getItem(storageKey('activeAttempt'))}));
    assert.equal(state.legacyResult,true);assert.equal(state.mode,'enforced');assert.equal(state.active,true);assert.ok(state.attempt);assert.ok(state.deadline>0);assert.ok(state.stored.includes(state.attempt));
  });

  await scenario('C32-H02','legacy helper during an attempt cannot bypass leave lock or dual persistence',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml),'/helper-during.html');
    await startStrict(page,pkg);
    const state=await page.evaluate(async()=>{window.strictTeacherPreview=()=>true;handleLeave('c32-helper-leave','controlled helper injection');await flushPendingAttemptWrites();return {locked:LOCKED,events:SEC_EVENTS.filter(event=>event.type==='c32-helper-leave').length,local:localStorage.getItem(storageKey('activeAttempt')),idb:await idbGet('activeAttempt')};});
    assert.equal(state.locked,true);assert.equal(state.events,1);assert.ok(state.local.includes(state.idb.body.attemptId));
  });

  await scenario('C32-H03','legacy helper cannot bypass the concurrent-tab guard',async()=>{
    const context=await newContext(pkg.studentHtml,{legacyHelper:true});
    const first=await newPage(context,'/helper-tab-a.html');const second=await newPage(context,'/helper-tab-b.html');
    await prepareStrict(first,pkg);await second.locator('#studentName').fill('A7B9C2');await enterStartCode(second,pkg);await second.locator('#strictVerifyBtn').click();await second.waitForTimeout(250);
    assert.equal(await first.evaluate(()=>!!STRICT_PREFLIGHT),true);assert.deepEqual(await second.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,active:isTestActive()})),{preflight:false,active:false});
  });

  await scenario('C32-H04','legacy helper after reload cannot hide submitted state or create a replacement attempt',async()=>{
    const context=await newContext(pkg.studentHtml);const page=await newPage(context,'/helper-submitted.html');
    await startStrict(page,pkg);await page.evaluate(()=>submitSecureTest());await page.waitForFunction(()=>SUBMITTED&&ANSWER_TXT.startsWith('SECURE-ANSWERS-V1'));await page.reload();
    await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);await page.evaluate(()=>{window.strictTeacherPreview=()=>true;});
    const state=await page.evaluate(async()=>({guard:localStorage.getItem(storageKey('submitted')),guardLocked:await submittedLocked(),prepared:!!(await strictPreflightChecks()),submitted:SUBMITTED,answer:ANSWER_TXT}));
    assert.equal(state.guard,'1');assert.equal(state.guardLocked,true);assert.equal(state.prepared,false);assert.equal(state.submitted,true);assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'));
  });

  await scenario('C32-H05','legacy helper cannot turn real submit and Forms handoff into preview simulation',async()=>{
    const page=await newPage(await newContext(pkg.studentHtml),'/helper-submit.html');await startStrict(page,pkg);
    const state=await page.evaluate(async()=>{window.strictTeacherPreview=()=>true;let opened='';CFG.formsSubmissionUrl='https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform';window.open=url=>{opened=String(url);return {opener:null};};await submitSecureTest();openSubmissionForm();await flushPendingAttemptWrites();return {submitted:SUBMITTED,answer:ANSWER_TXT,opened,guard:localStorage.getItem(storageKey('submitted')),outbox:await idbGet('submissionOutbox')};});
    assert.equal(state.submitted,true);assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'));assert.equal(state.opened,'https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform');assert.equal(state.guard,'1');assert.equal(state.outbox.body.txt,state.answer);
  });

  assert.deepEqual(pageErrors,[],'generated student pages must have no unhandled page errors');
}finally{
  for(const context of contexts)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  gdom.window.close();
}

const failed=results.filter(result=>result.status!=='PASS');
const report={schema:'git-r1a2-c32-browser-v3',stage:'R1-A2',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:process.platform,browser:'Chromium via Playwright 1.61.1',status:failed.length?'FAIL':'PASS',checks:results,pageErrors,scope:'Fresh generated strict public student HTML on a synthetic HTTPS origin. Legacy preview symbols are adversarial page inputs only; no physical-device, live Forms or server-authority claim.'};
fs.mkdirSync('qa-results/r1a2-d02',{recursive:true});
const evidenceTag=String(process.env.C32_EVIDENCE_TAG||'c32-browser-evidence').replace(/[^a-z0-9._-]+/gi,'-');
fs.writeFileSync(`qa-results/r1a2-d02/${evidenceTag}.json`,JSON.stringify(report,null,2)+'\n');
console.log(`${report.status} R1-A2 C32 browser boundary ${results.length-failed.length}/${results.length}`);
if(failed.length)process.exit(1);
