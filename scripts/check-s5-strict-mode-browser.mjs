#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {w,gdom,configure,build,enterStartCode,REC} from './redteam-harness-utils.mjs';

const origin='http://127.0.0.1:18805';
const checks=[];
const errors=[];
const contexts=[];
let browser;
function pass(id,detail){checks.push({id,status:'PASS',detail});console.log(`PASS ${id} — ${detail}`);}
async function pageFor(pkg,path,unsupported=false){
  const context=await browser.newContext({viewport:{width:1280,height:900},screen:{width:1280,height:900}});contexts.push(context);
  if(unsupported)await context.addInitScript(()=>{try{delete Element.prototype.requestFullscreen;delete Element.prototype.webkitRequestFullscreen;}catch{}});
  const body=typeof pkg==='string'?pkg:pkg.studentHtml;
  await context.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(`${path}: ${error.message}`));await page.goto(origin+path);return page;
}
async function prepareStrict(page,pkg){await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);await page.locator('#strictVerifyBtn').click();await page.waitForFunction(()=>!!STRICT_PREFLIGHT);}
async function startStrict(page,pkg){await prepareStrict(page,pkg);await page.locator('#strictFullscreenStartBtn').click();await page.waitForFunction(()=>isTestActive()&&STRICT_FULLSCREEN_MODE==='enforced'&&!!document.fullscreenElement);}
async function snap(page){return page.evaluate(()=>({active:isTestActive(),attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,locked:LOCKED,mode:STRICT_FULLSCREEN_MODE,fullscreen:!!document.fullscreenElement,events:SEC_EVENTS.map(e=>({...e})),resp:{...RESP},submitted:SUBMITTED}));}

try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const strictPkg=await build();
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:true});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const fallbackPkg=await build();
  configure({testMode:'bezny',resultMode:'secureOffline',screenGuard:false,identityMode:'name'});
  const normalPkg=await build();
  configure({testMode:'bezny',resultMode:'instant',screenGuard:false,identityMode:'name'});
  const practicePkg=await build();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});

  const main=await pageFor(strictPkg,'/strict.html');
  await prepareStrict(main,strictPkg);
  let state=await snap(main);
  assert.equal(state.active,false);assert.equal(state.attempt,'');assert.equal(state.deadline,0);assert.equal(state.fullscreen,false);
  pass('S5-B01','native Chromium preflight leaves attempt and timer untouched');
  await main.locator('#strictFullscreenStartBtn').click();
  await main.waitForFunction(()=>isTestActive()&&!!document.fullscreenElement);
  state=await snap(main);assert.equal(state.mode,'enforced');assert.equal(state.events.filter(e=>e.type==='attempt-start').length,1);assert.ok(state.events.some(e=>e.type==='fullscreen-enforced'));
  pass('S5-B02','second native click acquires Fullscreen API and starts exactly one attempt');

  const f11=await pageFor(strictPkg,'/f11.html');
  await f11.locator('#studentName').fill('A7B9C2');await enterStartCode(f11,strictPkg);
  await f11.evaluate(async()=>{await startTestAttempt();});
  state=await snap(f11);assert.equal(state.active,false);assert.equal(state.attempt,'');assert.equal(state.deadline,0);
  pass('S5-B03','direct start/F11-equivalent application bypass is rejected');

  const denied=await pageFor(strictPkg,'/denied.html');
  await denied.evaluate(()=>{window.__s5OriginalRequest=document.documentElement.requestFullscreen.bind(document.documentElement);document.documentElement.requestFullscreen=()=>Promise.reject(Object.assign(new Error('controlled denial'),{name:'NotAllowedError'}));});
  await prepareStrict(denied,strictPkg);await denied.locator('#strictFullscreenStartBtn').click();await denied.waitForTimeout(100);
  state=await snap(denied);assert.equal(state.active,false);assert.equal(state.attempt,'');assert.equal(state.deadline,0);assert.match(await denied.locator('#strictStartStatus').textContent(),/zamítnut|denied/i);
  await denied.evaluate(()=>{document.documentElement.requestFullscreen=window.__s5OriginalRequest;});await denied.locator('#strictFullscreenStartBtn').click();await denied.waitForFunction(()=>isTestActive()&&!!document.fullscreenElement);
  state=await snap(denied);assert.equal(state.events.filter(e=>e.type==='attempt-start').length,1);assert.equal(state.events.filter(e=>e.type==='fullscreen-denied').length,1);
  pass('S5-B04','controlled native denial is retryable with no lost or duplicate attempt');

  const unsupportedBlocked=await pageFor(strictPkg,'/unsupported-blocked.html',true);
  await prepareStrict(unsupportedBlocked,strictPkg);assert.equal(await unsupportedBlocked.locator('#strictFallbackStartBtn').isVisible(),false);state=await snap(unsupportedBlocked);assert.equal(state.active,false);
  const unsupportedAllowed=await pageFor(fallbackPkg,'/unsupported-allowed.html',true);
  await prepareStrict(unsupportedAllowed,fallbackPkg);assert.equal(await unsupportedAllowed.locator('#strictFallbackStartBtn').isVisible(),true);await unsupportedAllowed.locator('#strictFallbackStartBtn').click();await unsupportedAllowed.waitForFunction(()=>isTestActive());state=await snap(unsupportedAllowed);assert.equal(state.mode,'fallback');assert.equal(state.fullscreen,false);assert.ok(state.events.some(e=>e.type==='fullscreen-fallback'));
  pass('S5-B05','unsupported API is blocked by default and starts only through explicit teacher-authorized fallback');

  await main.evaluate(()=>document.exitFullscreen());await main.waitForFunction(()=>LOCKED&&!document.fullscreenElement);state=await snap(main);assert.equal(state.events.filter(e=>e.type==='fullscreen-left').length,1);const attemptBefore=state.attempt,deadlineBefore=state.deadline;
  await main.evaluate(()=>setResp('0_0',1));
  await main.evaluate(()=>{for(let i=0;i<5;i++)lockTap();});await main.locator('#unlockInp').fill(REC);await main.evaluate(()=>tryUnlock());await main.waitForFunction(()=>STRICT_RECOVERY_AUTHORIZED===true);
  state=await snap(main);assert.equal(state.locked,true);assert.equal(state.fullscreen,false);assert.equal(state.resp['0_0'],undefined,'locked response helper must not modify answers');
  await main.locator('#strictRecoveryFullscreen button').click();await main.waitForFunction(()=>!LOCKED&&!!document.fullscreenElement);
  state=await snap(main);assert.equal(state.attempt,attemptBefore);assert.equal(state.deadline,deadlineBefore);assert.equal(state.events.filter(e=>e.type==='recovery-unlock').length,1);assert.equal(state.events.filter(e=>e.type==='fullscreen-left').length,1);
  pass('S5-B06','native fullscreen exit locks once; Recovery resumes only after native fullscreen re-entry');

  const beforeShadow=await snap(main);
  const shadow=await main.evaluate(()=>{SPLIT_ORIENTATION_GRACE_UNTIL=0;SPLIT_BASELINE_WIDTH=1000;SPLIT_BASELINE_TRUSTED=true;Object.defineProperty(window,'innerWidth',{value:500,configurable:true});SPLIT_SUSPECTED_AT=Date.now()-11000;const obs=strictSplitObservation(Date.now());recordSplitShadowTransition(obs);return {obs,locked:LOCKED,events:SEC_EVENTS.filter(e=>e.type==='split-shadow').map(e=>({...e}))};});
  assert.equal(shadow.obs.state,'CONFIRMED');assert.equal(shadow.locked,false);assert.ok(shadow.events.every(e=>e.lockApplied===false));assert.equal((await snap(main)).events.filter(e=>e.type==='locked').length,beforeShadow.events.filter(e=>e.type==='locked').length);
  pass('S5-B07','controlled 50/50 viewport reaches CONFIRMED telemetry but never automatic LOCK');

  const completed=await pageFor(strictPkg,'/completed.html');await startStrict(completed,strictPkg);await completed.evaluate(()=>submitSecureTest());await completed.waitForFunction(()=>SUBMITTED);if(await completed.evaluate(()=>!!document.fullscreenElement))await completed.evaluate(()=>document.exitFullscreen());await completed.waitForTimeout(100);state=await snap(completed);assert.equal(state.submitted,true);assert.equal(state.locked,false);assert.equal(state.events.filter(e=>e.type==='fullscreen-left').length,0);
  pass('S5-B08','fullscreen exit after completed submission cannot create a late lock');

  const normal=await pageFor(normalPkg,'/normal.html');await normal.locator('#studentName').fill('Synthetic');await enterStartCode(normal,normalPkg);await normal.evaluate(()=>startTest());await normal.waitForFunction(()=>isTestActive());assert.equal(await normal.locator('#strictVerifyBtn').count(),0);
  const practice=await pageFor(practicePkg,'/practice.html');await practice.locator('#studentName').fill('Synthetic');await practice.evaluate(()=>startTest());await practice.waitForFunction(()=>document.querySelectorAll('.ex-panel').length>0);assert.equal(await practice.locator('#strictVerifyBtn').count(),0);
  pass('S5-B09','ordinary secure test and instant practice preserve one-step start without Strict Guard UI');

  assert.deepEqual(errors,[],'generated pages must have no unhandled page errors');
  const report={schema:'git-s5-strict-mode-browser-v1',stage:'S05',status:'PASS',browser:await browser.version(),checks,inputs:{fullscreen:'native Chromium click/exit except explicitly named controlled denial and unsupported cases',split:'controlled viewport metrics inside real generated runtime'},splitPolicy:'SHADOW/AUDIT-ONLY',physicalDevices:'NOT VERIFIED',otherEngines:'NOT VERIFIED',limits:['Headless Chromium is not a physical iPad/iPhone/Android test','The unsupported branch removes Fullscreen API before loading the generated artifact','Split ratios are controlled runtime metrics; no OS split-window automation']};
  fs.mkdirSync('qa-results/s5-strict-mode-browser',{recursive:true});fs.writeFileSync('qa-results/s5-strict-mode-browser/evidence.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS Sprint 05 Chromium gate ${checks.length}/${checks.length}`);
}finally{for(const c of contexts)await c.close().catch(()=>{});if(browser)await browser.close();gdom.window.close();}
