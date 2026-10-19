#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {w,gdom,configure,build,genDom,installControlledFullscreen,REC} from './redteam-harness-utils.mjs';

const children=[];
const checks=[];
function pass(id,detail){checks.push({id,status:'PASS',detail});console.log(`PASS ${id} — ${detail}`);}
function fresh(pkg){const x=genDom(pkg.studentHtml);children.push(x);x.document.getElementById('studentName').value='A7B9C2';return x;}
async function verify(x){await x.startTest();assert.ok(x.eval('STRICT_PREFLIGHT'),'strict preflight was not retained');}

try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const strictPkg=await build();
  assert.match(strictPkg.studentHtml,/id="strictVerifyBtn"/);
  assert.match(strictPkg.studentHtml,/id="strictFullscreenStartBtn"/);
  assert.doesNotMatch(strictPkg.studentHtml,/class="ghost btn-fullscreen"/);
  pass('S5-SRC-01','generated strict HTML exposes two distinct start actions');

  const gate=fresh(strictPkg);
  installControlledFullscreen(gate);
  await gate.startTestAttempt();
  assert.equal(gate.isTestActive(),false);
  assert.equal(gate.eval('TIMER_DEADLINE'),0);
  await verify(gate);
  assert.equal(gate.isTestActive(),false);
  assert.equal(gate.eval('ATTEMPT_ID'),'');
  assert.equal(gate.eval('TIMER_DEADLINE'),0);
  pass('S5-SRC-02','preflight and direct start cannot consume an attempt or start the timer');

  gate.eval("Object.defineProperty(document,'fullscreenElement',{configurable:true,get:function(){return document.documentElement;}});STRICT_FULLSCREEN_MODE='none';");
  await gate.startTestAttempt();
  assert.equal(gate.isTestActive(),false,'a browser/F11 fullscreen-shaped state must not bypass the application gate');
  pass('S5-SRC-03','F11-shaped fullscreen state is insufficient without the verified API transition');
  gate.close();children.pop();

  const denied=fresh(strictPkg);
  let active=null;
  Object.defineProperty(denied.document,'fullscreenElement',{configurable:true,get:()=>active});
  denied.document.documentElement.requestFullscreen=()=>Promise.reject(Object.assign(new Error('synthetic denial'),{name:'NotAllowedError'}));
  await verify(denied);
  await denied.startStrictFullscreen();
  assert.equal(denied.isTestActive(),false);
  assert.equal(denied.eval('ATTEMPT_ID'),'');
  assert.equal(denied.eval('TIMER_DEADLINE'),0);
  assert.match(denied.document.getElementById('strictStartStatus').textContent,/zamítnut|denied/i);
  denied.document.documentElement.requestFullscreen=async()=>{active=denied.document.documentElement;denied.document.dispatchEvent(new denied.Event('fullscreenchange'));};
  await denied.startStrictFullscreen();
  assert.equal(denied.isTestActive(),true);
  assert.equal(denied.eval('STRICT_FULLSCREEN_MODE'),'enforced');
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='attempt-start').length"),1);
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='fullscreen-denied').length"),1);
  pass('S5-SRC-04','denial is retryable and the successful retry creates exactly one attempt');

  denied.setResp('0_0',1);
  const beforeRecovery=denied.eval("({attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,response:RESP['0_0']})");
  active=null;denied.document.dispatchEvent(new denied.Event('fullscreenchange'));
  assert.equal(denied.eval('LOCKED'),true);
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='fullscreen-left').length"),1);
  denied.document.getElementById('unlockInp').value=REC;
  await denied.tryUnlock();
  assert.equal(denied.eval('LOCKED'),true,'Recovery outside enforced fullscreen must not immediately resume');
  assert.equal(denied.eval('STRICT_RECOVERY_AUTHORIZED'),true);
  await denied.startStrictRecoveryFullscreen();
  assert.equal(denied.eval('LOCKED'),false);
  assert.deepEqual(denied.eval("({attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,response:RESP['0_0']})"),beforeRecovery);
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length"),1);
  pass('S5-SRC-05','Recovery requires fullscreen re-entry and preserves attempt, deadline and response');

  denied.eval("SPLIT_ORIENTATION_GRACE_UNTIL=0;SPLIT_BASELINE_WIDTH=1000;SPLIT_BASELINE_TRUSTED=true;Object.defineProperty(window,'innerWidth',{value:500,configurable:true});SPLIT_SUSPECTED_AT=1000;");
  const confirmed=denied.eval('strictSplitObservation(12000)');
  assert.equal(confirmed.state,'CONFIRMED');
  denied.eval('recordSplitShadowTransition(strictSplitObservation(12000))');
  assert.equal(denied.eval('LOCKED'),false);
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='split-shadow').every(e=>e.lockApplied===false)"),true);
  denied.eval("Object.defineProperty(window,'innerWidth',{value:900,configurable:true});SPLIT_SUSPECTED_AT=0;");
  assert.equal(denied.eval('strictSplitObservation(13000).state'),'NORMAL');
  denied.eval("Object.defineProperty(window,'innerWidth',{value:700,configurable:true});SPLIT_SUSPECTED_AT=10000;");
  assert.equal(denied.eval('strictSplitObservation(13000).state'),'SUSPECTED');
  assert.equal(denied.eval('LOCKED'),false);
  pass('S5-SRC-06','50/50 confirms only in SHADOW; 90% is normal and a 3s narrowing does not lock');

  denied.eval("Object.defineProperty(navigator,'maxTouchPoints',{value:5,configurable:true});Object.defineProperty(window,'innerWidth',{value:1000,configurable:true});Object.defineProperty(window,'visualViewport',{value:{width:1000,height:400,scale:1,addEventListener:function(){}},configurable:true});IOS_KBD_EDITABLE_AT=Date.now();");
  assert.equal(denied.eval('strictSplitObservation(Date.now()).state'),'EXEMPT');
  denied.eval("Object.defineProperty(window,'visualViewport',{value:{width:1000,height:800,scale:1.25,addEventListener:function(){}},configurable:true});IOS_KBD_EDITABLE_AT=0;");
  assert.equal(denied.eval('strictSplitObservation(Date.now()).state'),'EXEMPT');
  assert.equal(denied.eval('LOCKED'),false);
  pass('S5-SRC-07','keyboard height-only and zoom changes are exempt and never auto-lock');

  const locksBefore=denied.eval("SEC_EVENTS.filter(e=>e.type==='locked').length");
  denied.eval("SPLIT_ORIENTATION_GRACE_UNTIL=Date.now()+4000;SPLIT_SUSPECTED_AT=0;");
  assert.equal(denied.eval('strictSplitObservation(Date.now()).state'),'EXEMPT');
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='locked').length"),locksBefore);
  pass('S5-SRC-08','orientation grace is explicit and cannot create a lock');

  denied.eval("Object.defineProperty(window,'visualViewport',{value:{width:800,height:1200,scale:1,addEventListener:function(){}},configurable:true});Object.defineProperty(window,'innerWidth',{value:800,configurable:true});Object.defineProperty(window,'innerHeight',{value:1200,configurable:true});Object.defineProperty(screen,'orientation',{value:{type:'portrait-primary',addEventListener:function(){}},configurable:true});SPLIT_BASELINE_WIDTH=1200;SPLIT_BASELINE_ORIENTATION='landscape';SPLIT_BASELINE_TRUSTED=true;SPLIT_SUSPECTED_AT=Date.now()-20000;");
  assert.equal(denied.eval("captureStrictFullscreenBaseline('orientation')"),true);
  assert.equal(denied.eval('SPLIT_BASELINE_WIDTH'),800,'a new legitimate portrait fullscreen baseline must replace the old landscape width');
  assert.equal(denied.eval('SPLIT_BASELINE_ORIENTATION'),'portrait');
  denied.eval('SPLIT_ORIENTATION_GRACE_UNTIL=0;');
  assert.equal(denied.eval('strictSplitObservation(Date.now()).state'),'NORMAL');
  assert.equal(denied.eval('LOCKED'),false);
  pass('S5-SRC-15','orientation recalibration replaces the old fullscreen baseline and remains NORMAL after grace');

  await denied.submitSecureTest();
  active=null;denied.document.dispatchEvent(new denied.Event('fullscreenchange'));
  assert.equal(denied.eval('SUBMITTED'),true);
  assert.equal(denied.eval("SEC_EVENTS.filter(e=>e.type==='fullscreen-left').length"),1,'post-submit exit must not append another fullscreen lock');
  pass('S5-SRC-09','fullscreen exit after submission does not lock a completed attempt');

  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:true});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const fallbackPkg=await build();
  const fallback=fresh(fallbackPkg);
  await verify(fallback);
  assert.equal(fallback.eval('strictFullscreenSupport()'),'unsupported');
  assert.equal(fallback.document.getElementById('strictFallbackStartBtn').classList.contains('hidden'),false);
  await fallback.startStrictFallback();
  assert.equal(fallback.isTestActive(),true);
  assert.equal(fallback.eval('STRICT_FULLSCREEN_MODE'),'fallback');
  assert.ok(fallback.eval("SEC_EVENTS.some(e=>e.type==='fullscreen-fallback')"));
  assert.equal(fallback.eval('SPLIT_BASELINE_TRUSTED'),false);
  assert.equal(fallback.eval('SPLIT_SHADOW_STATE'),'AMBIGUOUS');
  assert.equal(fallback.eval('LOCKED'),false);
  pass('S5-SRC-10','teacher-authorized unsupported fallback is explicit, audited and has no false baseline');

  fallback.eval("splitTotalMs=2000;splitMeasuredMs=0;splitSmallMs=0;SPLIT_STATE_COUNTS={NORMAL:0,SUSPECTED:0,CONFIRMED:0,AMBIGUOUS:1,EXEMPT:0};SPLIT_SHADOW_STATE='AMBIGUOUS';recordSplitSummary();");
  const unknownRuntime=fallback.eval("SEC_EVENTS.filter(e=>e.type==='split-window').slice(-1)[0]");
  assert.equal(unknownRuntime.pct,null);
  assert.equal(unknownRuntime.measurementAvailable,false);
  assert.match(unknownRuntime.detail,/Nezjištěno/);
  denied.eval("splitTotalMs=4000;splitMeasuredMs=2000;splitSmallMs=0;SPLIT_STATE_COUNTS={NORMAL:1,SUSPECTED:0,CONFIRMED:0,AMBIGUOUS:0,EXEMPT:0};SPLIT_SHADOW_STATE='NORMAL';recordSplitSummary();");
  const zeroRuntime=denied.eval("SEC_EVENTS.filter(e=>e.type==='split-window').slice(-1)[0]");
  assert.equal(zeroRuntime.pct,0);
  assert.equal(zeroRuntime.measurementAvailable,true);
  assert.match(zeroRuntime.detail,/podil=0%/);

  const blocked=fresh(strictPkg);
  await verify(blocked);
  assert.equal(blocked.eval('strictFullscreenSupport()'),'unsupported');
  assert.equal(blocked.document.getElementById('strictFallbackStartBtn').classList.contains('hidden'),true);
  await blocked.startStrictFallback();
  assert.equal(blocked.isTestActive(),false);
  assert.equal(blocked.eval('ATTEMPT_ID'),'');
  pass('S5-SRC-11','unsupported fullscreen is fail-closed unless the teacher explicitly authorized fallback');

  configure({testMode:'bezny',resultMode:'secureOffline',screenGuard:false,identityMode:'name'});
  const normalPkg=await build();
  const normal=fresh(normalPkg);normal.document.getElementById('studentName').value='Synthetic';
  await normal.startTest();
  assert.equal(normal.isTestActive(),true);
  assert.equal(normal.eval('STRICT_FULLSCREEN_MODE'),'none');
  assert.match(normalPkg.studentHtml,/class="ghost btn-fullscreen"/);
  assert.doesNotMatch(normalPkg.studentHtml,/id="strictVerifyBtn"/);
  pass('S5-SRC-12','ordinary secure test preserves its one-step start and optional fullscreen control');

  const published=JSON.stringify(JSON.parse(fallbackPkg.studentHtml.match(/const CFG=(\{.*?\});\s*const STUDENT_VARIANTS/s)[1]));
  assert.equal(published.includes(REC),false);
  assert.equal(fallbackPkg.studentHtml.includes(REC),false);
  const guardSource=fs.readFileSync('src/js/13de-secure-student-guard.js','utf8');
  assert.doesNotMatch(guardSource,/split[^\n]{0,120}lockTest\s*\(/i);
  assert.match(guardSource,/shadowOnly:true,lockApplied:false/);
  pass('S5-SRC-13','public artifact excludes raw Recovery and split implementation is structurally audit-only');

  const verifier=genDom(strictPkg.teacherHtml);children.push(verifier);await new Promise(r=>setTimeout(r,0));
  const summary=verifier.verifierSecuritySummary({status:'OK',securityEvents:[{t:'2026-01-01T00:00:00Z',type:'fullscreen-enforced',fullscreenMode:'enforced'},{t:'2026-01-01T00:00:01Z',type:'split-shadow',splitState:'CONFIRMED',shadowOnly:true,lockApplied:false}]});
  assert.equal(summary.fullscreenMode,'enforced');
  assert.equal(summary.splitShadowState,'CONFIRMED');
  assert.equal(summary.splitShadowLockApplied,false);
  const signals=verifier.securitySignalsFor({status:'OK',securityEvents:[{t:'2026-01-01T00:00:00Z',type:'fullscreen-fallback',fullscreenMode:'fallback'},{t:'2026-01-01T00:00:01Z',type:'split-shadow',splitState:'AMBIGUOUS',shadowOnly:true,lockApplied:false}]});
  assert.ok(signals.some(s=>s.code==='fullscreen-fallback'&&s.sev==='info'));
  assert.ok(signals.some(s=>s.code==='split-shadow'&&s.sev==='info'));
  pass('S5-SRC-14','Teacher Verifier interprets fullscreen/fallback and SHADOW events as audit evidence');

  const unknownRecord={status:'OK',securityEvents:[{t:'2026-01-01T00:00:00Z',type:'split-window',pct:null,detail:'podil=Nezjištěno'}]},zeroRecord={status:'OK',securityEvents:[{t:'2026-01-01T00:00:00Z',type:'split-window',pct:0,detail:'podil=0%'}]};
  assert.equal(verifier.verifierSecuritySummary(unknownRecord).splitWindowMaxPct,null);
  assert.deepEqual(Array.from(verifier.splitWindowCsvValues(unknownRecord)),[1,'']);
  assert.equal(verifier.splitWindowSecuritySignal(unknownRecord).severity,'info');
  assert.match(verifier.securityEventTimelineText(unknownRecord),/Nezjištěno/);
  assert.equal(verifier.verifierSecuritySummary(zeroRecord).splitWindowMaxPct,0);
  assert.deepEqual(Array.from(verifier.splitWindowCsvValues(zeroRecord)),[1,0]);
  assert.equal(verifier.splitWindowSecuritySignal(zeroRecord).severity,'info');
  assert.match(verifier.securityEventTimelineText(zeroRecord),/0 %/);
  pass('S5-SRC-16','runtime, verifier chronology and CSV distinguish unavailable split measurement from measured 0%');

  const report={schema:'git-s5-strict-mode-source-v1',stage:'S05',status:'PASS',provenance:{sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:process.platform,arch:process.arch},checks,scope:'Generated strict and ordinary artifacts with Node WebCrypto plus controlled DOM/fullscreen/viewport inputs. No physical-device claim.',splitPolicy:'SHADOW/AUDIT-ONLY',physicalDevices:'NOT VERIFIED'};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s5-strict-mode-source.json',JSON.stringify(report,null,2)+'\n');
  console.log(`PASS Sprint 05 Strict Mode source gate ${checks.length}/${checks.length}`);
}finally{for(const x of children){try{x.close();}catch{}}gdom.window.close();}
