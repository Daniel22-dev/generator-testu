// Actual exported runtime; DOM/lifecycle/failure inputs are controlled injections.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,configure,build,genDom,dumpStorage,cloneIdbState,REC} from './redteam-harness-utils.mjs';
const children=[],checks=[],selected=process.env.GIT_REDTEAM_E5_CASE||'all';
let pkg;
async function group(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E5 runtime',id);}
async function fresh(html=pkg.studentHtml,storage,idb){const x=genDom(html,storage,idb);children.push(x);await new Promise(r=>setTimeout(r,0));x.document.getElementById('studentName').value='A7B9C2';await x.startTest();assert.equal(x.isTestActive(),true);await x.flushPendingAttemptWrites();return x;}
const event=(x,target,type,extra={})=>{const e=new x.Event(type,{bubbles:true,cancelable:true});for(const [k,v] of Object.entries(extra))Object.defineProperty(e,k,{value:v});target.dispatchEvent(e);return e;};
const visibility=(x,v)=>{Object.defineProperty(x.document,'visibilityState',{value:v,configurable:true});event(x,x.document,'visibilitychange');};
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");pkg=await build();
  await group('away-during-lock',async()=>{
    const x=await fresh(),deadline=x.eval('TIMER_DEADLINE');visibility(x,'hidden');assert.equal(x.eval('LOCKED'),true);x.eval('LEFT_AT=Date.now()-9000');event(x,x,'pagehide');visibility(x,'visible');
    const returns=x.eval("SEC_EVENTS.filter(e=>e.type==='returned')");assert.equal(returns.length,1,'return must be recorded even while locked');assert.ok(returns[0].awayMs>=9000,'repeated departure must retain the first departure');assert.equal(returns[0].severity,'hard');assert.equal(x.eval('TIMER_DEADLINE'),deadline);
  });
  await group('beforeunload-lock',async()=>{const x=await fresh();event(x,x,'beforeunload');assert.equal(x.eval('LOCKED'),true,'navigation/reload must lock before leaving');assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='beforeunload')"));});
  await group('locked-responses',async()=>{
    const x=await fresh();x.setResp('0_0',1);x.lockTest('controlled lock');x.setResp('0_0',0);assert.equal(x.eval("RESP['0_0']"),1,'ordinary answer helpers cannot edit a locked attempt');assert.equal(x.document.getElementById('test').inert,true);assert.equal(x.document.getElementById('test').getAttribute('aria-hidden'),'true');
    x.document.getElementById('unlockInp').value=REC;await x.tryUnlock();assert.equal(x.eval('LOCKED'),false);assert.equal(x.document.getElementById('test').inert,false);x.setResp('0_0',0);assert.equal(x.eval("RESP['0_0']"),0);
  });
  await group('clipboard-block',async()=>{
    const x=await fresh(),input=x.document.createElement('textarea');input.setAttribute('data-qid','0_0');x.document.getElementById('test').append(input);const secret='synthetic clipboard content '.repeat(12);
    const paste=event(x,input,'paste',{clipboardData:{getData:()=>secret}}),drop=event(x,input,'drop'),before=event(x,input,'beforeinput',{inputType:'insertFromPaste'});
    assert.equal(paste.defaultPrevented,true,'strict paste must be blocked');assert.equal(drop.defaultPrevented,true);assert.equal(before.defaultPrevented,true);assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='paste-blocked')"));assert.equal(JSON.stringify(x.eval('SEC_EVENTS')).includes(secret),false,'clipboard content must not enter audit records');
    x.eval('CFG.lockOnLeave=false');const ordinary=event(x,input,'paste',{clipboardData:{getData:()=>secret}});assert.equal(ordinary.defaultPrevented,false);assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='large-paste')"),'standard mode retains large-paste metadata');
  });
  await group('split-reload',async()=>{
    const x=await fresh();x.eval('stopSplitMonitor();windowIsSmall=function(){return true;};for(var i=0;i<6;i++)splitSampleTick();');await x.flushPendingAttemptWrites();const before=x.eval('({attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,total:splitTotalMs,small:splitSmallMs,run:splitRunMs})');
    const y=await fresh(pkg.studentHtml,dumpStorage(x),cloneIdbState(x.__qaIdbState));assert.equal(y.eval('ATTEMPT_ID'),before.attempt);assert.equal(y.eval('TIMER_DEADLINE'),before.deadline);assert.equal(y.eval('splitTotalMs'),before.total,'reload must preserve monitoring denominator');assert.equal(y.eval('splitSmallMs'),before.small);assert.equal(y.eval('splitRunMs'),before.run);assert.equal(y.eval('LOCKED'),true,'strict reload must restore locked');
    y.eval('startSplitMonitor();recordSplitSummary();');assert.equal(y.eval('splitTotalMs'),before.total);const summary=y.eval("SEC_EVENTS.find(e=>e.type==='split-window')");assert.equal(summary.totalMs,12000);assert.equal(summary.smallMs,4000);
  });
  await group('unlock-race',async()=>{
    const x=await fresh();x.lockTest('controlled lock');x.eval('var E5_RELEASE;var e5Match=function(){return new Promise(r=>{E5_RELEASE=r;});};if(typeof unlockCodeMatches==="function")unlockCodeMatches=e5Match;else recoveryCodeMatches=e5Match;');x.document.getElementById('unlockInp').value=REC;const pending=x.tryUnlock();event(x,x,'beforeunload');x.eval('E5_RELEASE(true)');await pending;
    assert.equal(x.eval('LOCKED'),true,'a matching code cannot finish unlocking after another departure');assert.equal(x.eval('UNLOCK_BUSY'),false);assert.equal(x.eval("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length"),0);
    const again=x.tryUnlock();event(x,x,'blur');x.eval('E5_RELEASE(true)');await again;assert.equal(x.eval('LOCKED'),true,'visible-window focus loss must also invalidate a pending unlock');
  });
  await group('lifecycle-lock',async()=>{
    const x=await fresh();event(x,x.document,'freeze');assert.equal(x.eval('LOCKED'),true,'freeze must lock an active strict attempt');x.eval('LEFT_AT=Date.now()-1000');event(x,x.document,'resume');assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='returned')"));assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='page-resumed')"));
    const y=await fresh();event(y,y,'popstate');assert.equal(y.eval('LOCKED'),true,'history traversal within a page must not bypass the guard');
  });
  await group('ipad-keyboard-model',async()=>{
    const x=await fresh();Object.defineProperty(x.navigator,'userAgent',{value:'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15',configurable:true});Object.defineProperty(x.navigator,'maxTouchPoints',{value:5,configurable:true});x.eval('IOS_KBD_EDITABLE_AT=Date.now();');event(x,x,'blur');await new Promise(r=>setTimeout(r,1050));
    assert.equal(x.eval('LOCKED'),false,'visible iPad keyboard dismissal model must not cause a false lock');assert.ok(x.eval("SEC_EVENTS.some(e=>e.type==='keyboard-dismiss-ios')"));visibility(x,'hidden');assert.equal(x.eval('LOCKED'),true,'real hidden state must still lock this modeled device');
  });
  await group('submitted-responses',async()=>{const x=await fresh();x.setResp('0_0',1);await x.submitSecureTest();assert.equal(x.eval('SUBMITTED'),true);const before=x.eval("RESP['0_0']");x.setResp('0_0',0);assert.equal(x.eval("RESP['0_0']"),before,'ordinary helpers cannot modify a submitted attempt');});
  await group('verifier-audit',async()=>{
    const x=await fresh();event(x,x.document.querySelector('#test [data-qid]')||x.document.getElementById('test'),'paste',{clipboardData:{getData:()=>''}});event(x,x,'popstate');event(x,x.document,'freeze');event(x,x.document,'resume');x.document.getElementById('unlockInp').value=REC;await x.tryUnlock();await x.submitSecureTest();const txt=x.document.getElementById('answerBackup').value;
    const v=genDom(pkg.teacherHtml);children.push(v);await new Promise(r=>setTimeout(r,0));const policy={schoolDomain:'example.invalid',publishedAt:new Date(Date.now()-120000).toISOString(),csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true};if(typeof v.setFormsAnchorPolicy==='function')v.setFormsAnchorPolicy(policy);
    const out=await v.verifyText('e5-synthetic.txt',txt,{source:'google-forms-csv',fullYearCsv:true,formIdentity:'synthetic-a@example.invalid',formTimestamp:new Date().toISOString()});assert.equal(out.row?.status,'OK','guard telemetry must pass schema/Forms checks and reach private scoring');
    const signals=v.securitySignalsFor(out.row);assert.ok(signals.some(s=>s.code==='runtime-guard'&&s.sev==='info'),'new guard events must be visible as client-controlled audit');const timeline=v.securityEventTimelineText(out.row);assert.ok(timeline.includes('paste-blocked'));assert.ok(timeline.includes('page-freeze'));assert.ok(timeline.includes('recovery-unlock'));assert.equal(v.resultTrust(out.row).classificationAuthorization,'REVIEW_REQUIRED');
  });
  assert.ok(checks.length,'unknown E5 runtime case');
  const report={stage:'E5',version:w.eval('RELEASE.version'),status:'PASS',checks,scope:'Actual generated HTML with native Node WebCrypto and simulated DOM/IndexedDB. Lifecycle, dimensions, clipboard and iPad inputs are controlled injections, not real device evidence.',runtime:'CLIENT-CONTROLLED',guarantees:'HARDENED / DETECTED / BEST-EFFORT',mobile:'ANALYZED / NOT TESTED',limits:['Native event proof is the separate Chromium gate','No prevention of client-owner edits, screenshots, overlays, other profiles or other devices','iPad keyboard exemption is a heuristic with a known visible-focus blind spot']};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e5-runtime.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const x of children)x.close();gdom.window.close();}
