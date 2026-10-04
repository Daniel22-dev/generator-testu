import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,genDom,dumpStorage,cloneIdbState,REC} from './redteam-harness-utils.mjs';
import {createFixtures,policy} from './redteam-forgery-fixtures-e8.mjs';
const probe=process.env.GIT_REDTEAM_E8_MODE==='probe',children=[],checks=[];
async function run(f,html=f.pkg.studentHtml){
  const x=genDom(html);children.push(x);await new Promise(r=>setTimeout(r,0));x.document.getElementById('studentName').value='A7B9C2';if(f.kind==='joker')x.eval('JOKER_CHOICE=true;confirmJokerCommit=async function(){return true;};');
  await x.startTest();assert.equal(x.isTestActive(),true);x.setResp('0_0',1);
  const origin=x.eval('({attempt:ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE,jokerAt:JOKER_SELECTED_AT})');
  x.eval("for(var i=0;i<180;i++)recordSec('paste-blocked','synthetic metadata '+i);");await x.flushPendingAttemptWrites();
  const body=x.activeAttemptBody();assert.equal(body.securityEvents.length,120);assert.equal(body.securityEvents.filter(e=>e.type==='attempt-start').length,1,'bounded persistence must retain the original start');assert.equal(body.securityEvents.filter(e=>e.type==='joker-used').length,f.kind==='joker'?1:0);
  const y=genDom(html,dumpStorage(x),cloneIdbState(x.__qaIdbState));children.push(y);await new Promise(r=>setTimeout(r,0));y.document.getElementById('studentName').value='A7B9C2';await y.startTest();
  assert.equal(y.eval('ATTEMPT_ID'),origin.attempt);assert.equal(y.eval('STARTED_AT'),origin.start);assert.equal(y.eval('TIMER_DEADLINE'),origin.deadline);assert.equal(y.eval('JOKER_SELECTED_AT'),origin.jokerAt);assert.equal(y.eval('LOCKED'),true);
  y.document.getElementById('unlockInp').value=REC;await y.tryUnlock();assert.equal(y.eval('LOCKED'),false);await y.submitSecureTest();assert.equal(y.eval('SUBMITTED'),true);
  const v=genDom(f.pkg.teacherHtml);children.push(v);await new Promise(r=>setTimeout(r,0));v.setFormsAnchorPolicy({...policy,publishedAt:new Date(Date.now()-60000).toISOString()});
  const out=await v.verifyText('synthetic-long-history.txt',y.document.getElementById('answerBackup').value,{source:'google-forms-csv',fullYearCsv:false,formIdentity:'synthetic-a@example.invalid',formTimestamp:new Date().toISOString()});
  assert.equal(out.classification,'current');assert.equal(out.row.status,'OK');assert.equal(out.row.attemptId,origin.attempt);assert.equal(out.row.startedAt,origin.start);assert.equal(out.row.pct,20);assert.equal(v.classificationStatus(out.row),f.kind==='joker'?'JOKER_EXCLUDED':'REVIEW_REQUIRED');assert.equal(v.resultTrust(out.row).runtimeAuthenticity,'CLIENT-CONTROLLED');
}
async function integrity(f,html=f.pkg.studentHtml){
  const x=genDom(html);children.push(x);await new Promise(r=>setTimeout(r,0));x.document.getElementById('studentName').value='A7B9C2';if(f.kind==='joker')x.eval('JOKER_CHOICE=true;confirmJokerCommit=async function(){return true;};');await x.startTest();
  x.eval("for(var i=0;i<180;i++)recordSec('paste-blocked','synthetic metadata '+i);");await x.flushPendingAttemptWrites();const initial=x.activeAttemptBody();x.storageSet('activeAttempt','{broken-json');const seal=await x.loadActiveAttemptSeal();
  assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),true);assert.equal(seal.locked,true);assert.equal(seal.attemptId,initial.attemptId);assert.equal(seal.timerDeadline,initial.timerDeadline);assert.equal(seal.securityEvents.filter(e=>e.type==='attempt-start').length,1,'integrity diagnostics must preserve origin');assert.equal(seal.securityEvents.filter(e=>e.type==='joker-used').length,f.kind==='joker'?1:0);assert.ok(seal.securityEvents.some(e=>e.type==='persistence-integrity'));assert.ok(seal.securityEvents.length<=120);
}
async function signedGuardTransition(f,html=f.pkg.studentHtml){
  const x=genDom(html);children.push(x);await new Promise(r=>setTimeout(r,0));x.document.getElementById('studentName').value='A7B9C2';await x.startTest();await x.flushPendingAttemptWrites();
  const older=await x.idbGet('activeAttempt'),oldGuard=await x.idbGet('attemptGuard');x.lockTest('controlled unload guard');await x.flushPendingAttemptWrites();const newer=await x.idbGet('activeAttempt');assert.ok(newer.rev>older.rev);assert.equal(newer.body.locked,true);
  x.writeLocalSigned('activeAttempt',older);x.writeLocalSigned('attemptGuard',oldGuard);let seal=await x.loadActiveAttemptSeal();assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),false,'valid guard-only revision divergence must reconcile conservatively');assert.equal(seal.locked,true);assert.equal(seal.timerDeadline,older.body.timerDeadline);assert.equal(seal.attemptId,older.body.attemptId);
  x.writeLocalSigned('activeAttempt',newer);await x.idbPut('activeAttempt',older);seal=await x.loadActiveAttemptSeal();assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),false);assert.equal(seal.locked,true);
  // Both MACs are valid, but changing answers is not a guard-only transition.
  x.eval('LOCKED=false;');x.setResp('0_0',1);await x.persistActiveAttemptSeal();await x.flushPendingAttemptWrites();x.writeLocalSigned('activeAttempt',older);await x.loadActiveAttemptSeal();assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),true,'answer replay must still fail closed');
}
let fixtures;
try{
  fixtures=await createFixtures();
  for(const kind of ['default','joker']){
    const f=fixtures[kind];let status='PASS',negativeControl='NOT_RUN_BASELINE_PROBE';
    try{await run(f);}catch(e){if(!probe)throw e;status='BASELINE_GAP';}
    if(!probe){const seam='function securityEventSnapshot(events){';assert.ok(f.pkg.studentHtml.includes(seam));const broken=f.pkg.studentHtml.replace(seam,seam+'return Array.isArray(events)?events.slice(-120):[];');let detected=false;try{await run(f,broken);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;detected=true;}assert.ok(detected,'negative retention control must fail');negativeControl='DETECTED_WEAKENED_BUILD';}
    checks.push({id:'long-history-reload-'+kind,status,negativeControl});
    if(!probe){await integrity(f);const seam='var ev=securityEventSnapshot(body.securityEvents);';assert.ok(f.pkg.studentHtml.includes(seam));const broken=f.pkg.studentHtml.replace(seam,'var ev=Array.isArray(body.securityEvents)?body.securityEvents.slice(-119):[];');let detected=false;try{await integrity(f,broken);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;detected=true;}assert.ok(detected,'negative integrity snapshot control must fail');checks.push({id:'long-history-integrity-'+kind,status:'PASS',negativeControl:'DETECTED_WEAKENED_BUILD'});}
  }
  if(!probe){const f=fixtures.default;await signedGuardTransition(f);const seam='function guardOnlySignedTransition(kind,a,b){';assert.ok(f.pkg.studentHtml.includes(seam));for(const answer of ['false','true']){let detected=false;try{await signedGuardTransition(f,f.pkg.studentHtml.replace(seam,seam+'return '+answer+';'));}catch(e){if(e.code!=='ERR_ASSERTION')throw e;detected=true;}assert.ok(detected);}checks.push({id:'signed-guard-only-divergence-preserves-lock-and-rejects-answer-replay',status:'PASS',negativeControl:'DETECTED_2_WEAKENED_BUILDS'});}
  const report={stage:'E8',version:w.eval('RELEASE.version'),status:probe?'BASELINE_PROBE':'PASS',checks,scope:'Actual generated student start, 180 runtime audit records, signed active-state persistence, same-profile reload, recovery unlock, encrypted submit and private scoring; controlled jsdom/IndexedDB, native Node crypto.',limits:['Only start/joker markers plus a bounded recent tail are retained; this is not a complete or authenticated audit trail','Physical mobile NOT TESTED; runtime CLIENT-CONTROLLED']};const path=process.env.GIT_REDTEAM_E8_REPORT||'qa-results/redteam-e8-retention.json';fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{children.forEach(x=>x.close());if(fixtures)Object.values(fixtures).forEach(f=>{f.x.close();f.v.close();});gdom.window.close();}
