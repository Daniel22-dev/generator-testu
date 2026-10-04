// Exported public student HTML, original CSP, native Chromium storage and events.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom,configure,build,REC} from './redteam-harness-utils.mjs';
const checks=[],observations=[],errors=[],contexts=[],selected=process.env.GIT_REDTEAM_E5_BROWSER_CASE||'all';
const origin='http://127.0.0.1:18781';let browser,pkg;
async function fresh(){const c=await browser.newContext({viewport:{width:1280,height:900},screen:{width:2560,height:1800}});contexts.push(c);await c.route(origin+'/**',r=>r.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/student.html');return p;}
async function start(p){await p.locator('#studentName').fill('A7B9C2');await enterStartCode(p,pkg);await p.evaluate(()=>startTest());assert.equal(await p.evaluate(()=>isTestActive()),true);}
const state=p=>p.evaluate(async()=>{await flushPendingAttemptWrites();return {attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,resp:{...RESP},locked:LOCKED,integrity:PERSIST_INTEGRITY_BLOCK,events:SEC_EVENTS.map(e=>({...e})),audit:typeof runtimeAuditState==='function'?runtimeAuditState():null};});
async function group(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E5 browser',id);}
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");pkg=await build();browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  await group('native-reload',async()=>{
    const p=await fresh();await start(p);await p.evaluate(async()=>{setResp('0_0',1);await persistActiveAttemptSeal();});const before=await state(p);await p.reload();await start(p);const after=await state(p);
    assert.equal(after.attempt,before.attempt);assert.equal(after.deadline,before.deadline);assert.equal(after.resp['0_0'],1);assert.equal(after.locked,true,'native strict reload must restore locked');assert.equal(after.integrity,false,'ordinary guard-only pagehide shadow must not create an integrity fault');assert.ok(after.events.some(e=>e.type==='returned'),'a native reload must retain and pair departure audit');
    await p.evaluate(async code=>{$('unlockInp').value=code;await tryUnlock();},REC);assert.equal((await state(p)).locked,false);await p.context().close();
  });
  await group('native-fullscreen-exit',async()=>{
    const p=await fresh();await p.locator('.btn-fullscreen').click();await p.waitForFunction(()=>!!document.fullscreenElement);await start(p);const before=await state(p);await p.evaluate(()=>document.exitFullscreen());await p.waitForFunction(()=>!document.fullscreenElement);await p.waitForTimeout(100);const after=await state(p);assert.equal(after.locked,true,'native fullscreen exit must lock');
    assert.equal(after.deadline,before.deadline);assert.ok(after.events.some(e=>e.type==='fullscreen-left'),'native fullscreen exit must be audited and lock a strict test');await p.context().close();
  });
  await group('native-history',async()=>{
    const p=await fresh();await start(p);const before=await state(p);await p.evaluate(()=>history.pushState({synthetic:true},'', '#synthetic'));await p.goBack();await p.waitForFunction(()=>location.hash==='');await p.waitForTimeout(100);const after=await state(p);assert.equal(after.locked,true,'native history traversal must lock');
    assert.equal(after.attempt,before.attempt);assert.equal(after.deadline,before.deadline);assert.ok(after.events.some(e=>e.type==='history-navigation'));await p.context().close();
  });
  await group('controlled-freeze-resume',async()=>{
    const p=await fresh();await start(p);const before=await state(p),cdp=await p.context().newCDPSession(p);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await p.waitForTimeout(250);await cdp.send('Page.setWebLifecycleState',{state:'active'});await p.waitForTimeout(100);
    const nativeDelivered=await p.evaluate(()=>SEC_EVENTS.some(e=>e.type==='page-freeze'));observations.push(nativeDelivered?'CDP freeze event delivered in this run.':'CDP freeze/active did not dispatch lifecycle events on the visible headless page: native freeze/resume NOT TESTED.');
    await p.evaluate(()=>{document.dispatchEvent(new Event('freeze'));document.dispatchEvent(new Event('resume'));});const after=await state(p);assert.equal(after.locked,true,'dispatched freeze must leave a strict attempt locked');assert.equal(after.attempt,before.attempt);assert.equal(after.deadline,before.deadline);assert.ok(after.events.some(e=>e.type==='page-freeze'));assert.ok(after.events.some(e=>e.type==='returned'));await p.context().close();
  });
  await group('native-inert-keyboard',async()=>{
    const p=await fresh();await start(p);await p.evaluate(()=>{setResp('0_0',1);lockTest('controlled trigger for native keyboard verification');});const before=await state(p);
    await p.evaluate(()=>{const input=document.createElement('textarea');input.id='e5-native-input';input.value='unchanged';$('test').append(input);input.focus();});await p.keyboard.type('synthetic edit');
    assert.equal(await p.locator('#e5-native-input').inputValue(),'unchanged','native inert subtree must reject keyboard focus/edit');assert.equal(await p.evaluate(()=>$('test').inert),true);await p.evaluate(()=>setResp('0_0',0));assert.equal((await state(p)).resp['0_0'],before.resp['0_0']);await p.context().close();
  });
  await group('native-split-persistence',async()=>{
    const p=await fresh();await start(p);assert.equal(await p.evaluate(()=>windowIsSmall()),true,'native viewport/screen dimensions must drive the heuristic');await p.evaluate(async()=>{stopSplitMonitor();for(let i=0;i<6;i++)splitSampleTick();await flushPendingAttemptWrites();});const before=await state(p);await p.reload();await start(p);const after=await state(p);
    assert.equal(after.audit?.splitTotalMs,12000,'native storage/reload must retain simulated sampling totals');assert.equal(after.audit?.splitSmallMs,4000);assert.equal(after.audit?.splitRunMs,12000);assert.equal(after.deadline,before.deadline);assert.equal(after.locked,true);observations.push('Real viewport/screen ratio and IndexedDB reload; six sample ticks were accelerated by explicit calls, not 12 elapsed seconds.');await p.context().close();
  });
  await group('controlled-pageshow-reconciliation',async()=>{
    const p=await fresh();await start(p);await p.evaluate(async()=>{setResp('0_0',1);await persistActiveAttemptSeal();window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));await flushPendingAttemptWrites();LOCKED=false;RESP={'0_0':0};window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
    await p.waitForTimeout(300);const after=await state(p);assert.equal(after.locked,true,'a restored page must reconcile and lock before allowing edits');assert.equal(after.resp['0_0'],1,'stale RAM cannot overwrite the latest persisted answer');assert.equal(after.integrity,false);assert.ok(after.events.some(e=>e.type==='page-restored'));observations.push('persisted pageshow/pagehide deliberately dispatched: reconciliation proven, native BFCache eligibility NOT TESTED.');await p.context().close();
    const standard=await fresh();await start(standard);await standard.evaluate(async()=>{CFG.lockOnLeave=false;setResp('0_0',1);await persistActiveAttemptSeal();window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));await flushPendingAttemptWrites();RESP={'0_0':0};window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await standard.waitForFunction(()=>SEC_EVENTS.some(e=>e.type==='page-restored'));const restored=await state(standard);assert.equal(restored.locked,false,'a valid standard-mode restore must release its temporary reconciliation lock');assert.equal(restored.resp['0_0'],1);assert.equal(await standard.evaluate(()=>$('test').inert),false);await standard.context().close();
  });
  await group('controlled-fullscreen-rejection',async()=>{
    const p=await fresh();await start(p);await p.evaluate(async()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('synthetic denial'));await enterFullscreen();});assert.ok((await state(p)).events.some(e=>e.type==='fullscreen-unavailable'));assert.equal(await p.locator('.s-modal-bd').count()>0,true);observations.push('Fullscreen rejection branch uses controlled API rejection, with no unhandled pageerror.');await p.context().close();
  });
  assert.ok(checks.length,'unknown E5 browser case');assert.deepEqual(errors,[],'original CSP must produce no unhandled pageerrors');
  const report={stage:'E5',version:w.eval('RELEASE.version'),browser:await browser.version(),status:'PASS',checks,observations,originalCsp:true,native:['reload + beforeunload/pagehide','Fullscreen entry/exit with user gesture','same-document history traversal','inert keyboard focus exclusion','IndexedDB and Web Locks'],controlled:['freeze/resume event dispatch','sample tick acceleration','persisted pageshow reconciliation','fullscreen API rejection','lock trigger for keyboard test'],runtime:'CLIENT-CONTROLLED',mobile:'ANALYZED / NOT TESTED',otherEngines:'ANALYZED / NOT TESTED',limits:['Native freeze/resume and BFCache eligibility NOT TESTED on this platform','Viewport split/overlay detection BEST-EFFORT; no browser DRM','No screenshot, second-device or developer-tools prevention']};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e5-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const c of contexts)await c.close().catch(()=>{});if(browser)await browser.close();gdom.window.close();}
