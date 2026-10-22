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
  const line=`${status} ${id} — ${detail}${error?`: ${error}`:''}`;
  (status==='PASS'?console.log:console.error)(line);
}

async function scenario(id,detail,fn){
  try{await fn();record(id,'PASS',detail);}
  catch(error){record(id,'FAIL',detail,String(error&&error.message||error));}
}

async function newContext(body,{topLevelFlag=false}={}){
  const context=await browser.newContext({viewport:{width:1280,height:900},screen:{width:1280,height:900},acceptDownloads:true});
  contexts.push(context);
  if(topLevelFlag)await context.addInitScript(()=>{window.__GHRAB_TEACHER_PREVIEW__=true;});
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
}

async function startStrict(page,pkg){
  await prepareStrict(page,pkg);
  await page.locator('#strictFullscreenStartBtn').click();
  await page.waitForFunction(()=>isTestActive()&&STRICT_FULLSCREEN_MODE==='enforced'&&!!document.fullscreenElement);
}

async function overwritePreviewVerifier(page){
  return page.evaluate(()=>{
    const before=strictTeacherPreview();
    let directError='';
    try{strictTeacherPreview=()=>true;}catch(error){directError=String(error&&error.name||error);}
    const afterDirect=strictTeacherPreview();
    let propertyError='';
    try{Object.defineProperty(window,'strictTeacherPreview',{value:()=>true,writable:true,configurable:true});}
    catch(error){propertyError=String(error&&error.name||error);}
    return {before,afterDirect,resolved:strictTeacherPreview(),directError,propertyError,windowPropertyResult:typeof window.strictTeacherPreview==='function'?window.strictTeacherPreview():null};
  });
}

async function startAfterOverwrite(page,pkg){
  await prepareStrict(page,pkg);
  const state=await page.evaluate(()=>strictReadyState());
  if(state==='supported-ready')await page.locator('#strictFullscreenStartBtn').click();
  else if(state==='preview-ready')await page.locator('#strictFallbackStartBtn').click();
  else throw new Error('unexpected strict ready state after overwrite: '+state);
  await page.waitForFunction(()=>isTestActive());
}

try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});

  await scenario('C32-B01','top-level preview flag before start cannot suppress signed attempt persistence',async()=>{
    const context=await newContext(pkg.studentHtml,{topLevelFlag:true});
    const page=await newPage(context,'/prestart.html');
    assert.equal(await page.evaluate(()=>strictTeacherPreview()),false,'top-level document must never be a teacher preview');
    await startStrict(page,pkg);
    await page.evaluate(()=>flushPendingAttemptWrites());
    const state=await page.evaluate(()=>({active:isTestActive(),attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,stored:storageGet('activeAttempt'),preview:strictTeacherPreview()}));
    assert.equal(state.preview,false);
    assert.equal(state.active,true);
    assert.ok(state.attempt);
    assert.ok(state.deadline>0);
    assert.ok(typeof state.stored==='string'&&state.stored.includes(state.attempt),'signed active attempt must be stored despite the writable flag');
  });

  await scenario('C32-B02','setting the flag during a strict attempt cannot bypass persistence or leave lock',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/during.html');
    await startStrict(page,pkg);
    const state=await page.evaluate(async()=>{
      window.__GHRAB_TEACHER_PREVIEW__=true;
      const preview=strictTeacherPreview();
      await saveSignedRecord('c32Probe',{stage:'during'},++PERSIST_REV,true);
      const stored=storageGet('c32Probe');
      handleLeave('c32-controlled-leave','controlled leave after writable flag');
      await flushPendingAttemptWrites();
      return {preview,stored,locked:LOCKED,events:SEC_EVENTS.filter(event=>event.type==='c32-controlled-leave').length};
    });
    assert.equal(state.preview,false);
    assert.ok(state.stored,'signed record must not become a preview-only fake record');
    assert.equal(state.locked,true,'strict leave must still lock');
    assert.equal(state.events,1,'strict leave must remain in the security chronology');
  });

  await scenario('C32-B03','top-level preview flag cannot bypass the same-origin concurrent-tab lock',async()=>{
    const context=await newContext(pkg.studentHtml,{topLevelFlag:true});
    const first=await newPage(context,'/tab-a.html');
    const second=await newPage(context,'/tab-b.html');
    await prepareStrict(first,pkg);
    await second.locator('#studentName').fill('A7B9C2');
    await enterStartCode(second,pkg);
    await second.locator('#strictVerifyBtn').click();
    await second.waitForTimeout(250);
    const states=await Promise.all([
      first.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,preview:strictTeacherPreview()})),
      second.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,preview:strictTeacherPreview(),active:isTestActive()})),
    ]);
    assert.equal(states[0].preview,false);
    assert.equal(states[0].preflight,true);
    assert.equal(states[1].preview,false);
    assert.equal(states[1].active,false);
    assert.equal(states[1].preflight,false,'second tab must not obtain a verified preflight while the first tab owns the lock');
  });

  await scenario('C32-B04','top-level preview flag cannot hide a completed-submission guard or enable a replacement attempt',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/submitted.html');
    await startStrict(page,pkg);
    await page.evaluate(()=>submitSecureTest());
    await page.waitForFunction(()=>SUBMITTED&&ANSWER_TXT.startsWith('SECURE-ANSWERS-V1'));
    assert.equal(await page.evaluate(()=>storageGet('submitted')), '1');
    await page.addInitScript(()=>{window.__GHRAB_TEACHER_PREVIEW__=true;});
    await page.reload();
    await page.locator('#studentName').fill('A7B9C2');
    await enterStartCode(page,pkg);
    const state=await page.evaluate(async()=>{
      const guardLocked=await submittedLocked();
      const prepared=await strictPreflightChecks();
      return {preview:strictTeacherPreview(),submitted:SUBMITTED,prepared:!!prepared,active:isTestActive(),guard:storageGet('submitted'),outbox:await loadSignedRecord('submissionOutbox'),guardLocked,answer:ANSWER_TXT,done:!$('done').classList.contains('hidden')};
    });
    assert.equal(state.preview,false);
    assert.equal(state.guard,'1','completed-submission marker must remain readable');
    assert.ok(state.outbox.record&&state.outbox.record.body&&state.outbox.record.body.txt.startsWith('SECURE-ANSWERS-V1'),'completed outbox must remain signed and recoverable');
    assert.equal(state.guardLocked,true,'completed-submission guard must remain authoritative');
    assert.equal(state.prepared,false,'completed submission must not create a replacement preflight');
    assert.equal(state.active,false,'completed submission must not start another attempt');
    assert.equal(state.submitted,true,'matching completed outbox must be restored');
    assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'),'restored submission payload must remain available');
    assert.equal(state.done,true,'restored submission view must remain visible');
  });

  await scenario('C32-B05','top-level preview flag does not suppress the real Forms handoff path',async()=>{
    const context=await newContext(pkg.studentHtml,{topLevelFlag:true});
    const page=await newPage(context,'/forms.html');
    const state=await page.evaluate(()=>{
      let opened='';
      CFG.formsSubmissionUrl='https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform';
      const status=document.createElement('div');status.id='formsSubmitStatus';document.body.appendChild(status);
      window.open=url=>{opened=String(url);return {opener:null};};
      openSubmissionForm();
      return {preview:strictTeacherPreview(),opened,status:$('formsSubmitStatus')&&$('formsSubmitStatus').textContent||''};
    });
    assert.equal(state.preview,false);
    assert.equal(state.opened,'https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform');
    assert.match(state.status,/otev|open/i);
  });

  await scenario('C32-H01','same-context helper overwrite before start cannot select preview mode or suppress signed persistence',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/helper-prestart.html');
    const overwrite=await overwritePreviewVerifier(page);
    await startAfterOverwrite(page,pkg);
    await page.evaluate(()=>flushPendingAttemptWrites());
    const state=await page.evaluate(()=>({preview:strictTeacherPreview(),mode:STRICT_FULLSCREEN_MODE,active:isTestActive(),attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,stored:localStorage.getItem(storageKey('activeAttempt'))}));
    assert.equal(overwrite.before,false);
    assert.equal(overwrite.afterDirect,false,'direct assignment must not replace the verifier binding');
    assert.equal(overwrite.resolved,false,'a window property must not shadow the verifier binding');
    assert.equal(state.preview,false);
    assert.equal(state.mode,'enforced','public strict test must use confirmed fullscreen, never preview mode');
    assert.equal(state.active,true);
    assert.ok(state.attempt);
    assert.ok(state.deadline>0);
    assert.ok(typeof state.stored==='string'&&state.stored.includes(state.attempt),'native localStorage must contain the signed active attempt');
  });

  await scenario('C32-H02','same-context helper overwrite during an attempt cannot bypass leave lock or dual persistence',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/helper-during.html');
    await startStrict(page,pkg);
    const overwrite=await overwritePreviewVerifier(page);
    const state=await page.evaluate(async()=>{
      handleLeave('c32-helper-leave','controlled same-context helper overwrite');
      await flushPendingAttemptWrites();
      const local=localStorage.getItem(storageKey('activeAttempt'));
      let idb=null;try{idb=await idbGet('activeAttempt');}catch(error){idb={error:String(error&&error.message||error)};}
      return {preview:strictTeacherPreview(),attempt:ATTEMPT_ID,locked:LOCKED,events:SEC_EVENTS.filter(event=>event.type==='c32-helper-leave').length,local,idb};
    });
    assert.equal(overwrite.afterDirect,false);
    assert.equal(overwrite.resolved,false);
    assert.equal(state.preview,false);
    assert.equal(state.locked,true,'leave protection must still lock the attempt');
    assert.equal(state.events,1,'leave event must remain in the chronology');
    assert.ok(typeof state.local==='string'&&state.local.includes(state.attempt),'signed attempt must remain in native localStorage');
    assert.ok(state.idb&&state.idb.body&&state.idb.body.attemptId,'signed attempt must remain in IndexedDB');
  });

  await scenario('C32-H03','same-context helper overwrite cannot bypass the concurrent-tab guard',async()=>{
    const context=await newContext(pkg.studentHtml);
    const first=await newPage(context,'/helper-tab-a.html');
    const second=await newPage(context,'/helper-tab-b.html');
    const firstOverwrite=await overwritePreviewVerifier(first);
    const secondOverwrite=await overwritePreviewVerifier(second);
    await prepareStrict(first,pkg);
    await second.locator('#studentName').fill('A7B9C2');
    await enterStartCode(second,pkg);
    await second.locator('#strictVerifyBtn').click();
    await second.waitForTimeout(250);
    const states=await Promise.all([
      first.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,preview:strictTeacherPreview()})),
      second.evaluate(()=>({preflight:!!STRICT_PREFLIGHT,preview:strictTeacherPreview(),active:isTestActive()})),
    ]);
    assert.equal(firstOverwrite.resolved,false);
    assert.equal(secondOverwrite.resolved,false);
    assert.deepEqual(states[0],{preflight:true,preview:false});
    assert.equal(states[1].preview,false);
    assert.equal(states[1].active,false);
    assert.equal(states[1].preflight,false,'second tab must not obtain a preflight while the first owns the lock');
  });

  await scenario('C32-H04','same-context helper overwrite after reload cannot hide submitted state or create a replacement attempt',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/helper-submitted.html');
    await startStrict(page,pkg);
    await page.evaluate(()=>submitSecureTest());
    await page.waitForFunction(()=>SUBMITTED&&ANSWER_TXT.startsWith('SECURE-ANSWERS-V1'));
    await page.reload();
    await page.locator('#studentName').fill('A7B9C2');
    await enterStartCode(page,pkg);
    const overwrite=await overwritePreviewVerifier(page);
    const state=await page.evaluate(async()=>({preview:strictTeacherPreview(),guard:localStorage.getItem(storageKey('submitted')),guardLocked:await submittedLocked(),prepared:!!(await strictPreflightChecks()),submitted:SUBMITTED,answer:ANSWER_TXT,done:!$('done').classList.contains('hidden')}));
    assert.equal(overwrite.resolved,false);
    assert.equal(state.preview,false);
    assert.equal(state.guard,'1');
    assert.equal(state.guardLocked,true);
    assert.equal(state.prepared,false,'completed submission must not create a replacement preflight');
    assert.equal(state.submitted,true);
    assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'));
    assert.equal(state.done,true);
  });

  await scenario('C32-H05','same-context helper overwrite cannot turn real submit and Forms handoff into preview simulation',async()=>{
    const context=await newContext(pkg.studentHtml);
    const page=await newPage(context,'/helper-submit.html');
    await startStrict(page,pkg);
    const overwrite=await overwritePreviewVerifier(page);
    const state=await page.evaluate(async()=>{
      let opened='';
      CFG.formsSubmissionUrl='https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform';
      window.open=url=>{opened=String(url);return {opener:null};};
      await submitSecureTest();
      openSubmissionForm();
      await flushPendingAttemptWrites();
      let outbox=null;try{outbox=await idbGet('submissionOutbox');}catch(error){outbox={error:String(error&&error.message||error)};}
      return {preview:strictTeacherPreview(),submitted:SUBMITTED,answer:ANSWER_TXT,opened,guard:localStorage.getItem(storageKey('submitted')),outbox};
    });
    assert.equal(overwrite.resolved,false);
    assert.equal(state.preview,false);
    assert.equal(state.submitted,true);
    assert.ok(state.answer.startsWith('SECURE-ANSWERS-V1'),'real encrypted payload must be created');
    assert.equal(state.opened,'https://docs.google.com/forms/d/e/SYNTHETIC-C32/viewform');
    assert.equal(state.guard,'1');
    assert.ok(state.outbox&&state.outbox.body&&state.outbox.body.txt===state.answer,'IndexedDB outbox must contain the encrypted payload');
  });

  assert.deepEqual(pageErrors,[],'generated student pages must have no unhandled page errors');
}finally{
  for(const context of contexts)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  gdom.window.close();
}

const failed=results.filter(result=>result.status!=='PASS');
const report={
  schema:'git-r1a1-c32-browser-v2',
  stage:'R1-A1',
  sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  node:process.version,
  platform:process.platform,
  browser:'Chromium via Playwright 1.61.1',
  status:failed.length?'FAIL':'PASS',
  checks:results,
  pageErrors,
  scope:'Fresh generated strict student HTML on a synthetic HTTPS origin. No physical-device, live Forms or server-authority claim.',
};
fs.mkdirSync('qa-results/r1a1-c32',{recursive:true});
const evidenceTag=String(process.env.C32_EVIDENCE_TAG||'browser-evidence').replace(/[^a-z0-9._-]+/gi,'-');
fs.writeFileSync(`qa-results/r1a1-c32/${evidenceTag}.json`,JSON.stringify(report,null,2)+'\n');
console.log(`${report.status} R1-A1 C32 browser boundary ${results.length-failed.length}/${results.length}`);
if(failed.length)process.exit(1);
