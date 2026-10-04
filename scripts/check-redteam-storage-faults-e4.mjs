// Fault injection against actual generated runtime, not copies of persistence helpers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,configure,build,genDom,dumpStorage,cloneIdbState} from './redteam-harness-utils.mjs';
const children=[],checks=[],selected=process.env.GIT_REDTEAM_E4_FAULT||'all';
async function group(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E4 fault',id);}
let pkg;
async function fresh(){const x=genDom(pkg.studentHtml);children.push(x);await new Promise(r=>setTimeout(r,0));x.document.getElementById('studentName').value='A7B9C2';await x.startTest();assert.equal(x.isTestActive(),true);await x.flushPendingAttemptWrites();return x;}
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");pkg=await build();
  await group('guard-write-failure',async()=>{
    const x=await fresh();x.eval("const e4Save=saveSignedRecord;saveSignedRecord=async function(kind,body,rev,allow){if(kind==='attemptGuard'&&body.state==='submitted')throw new Error('synthetic guard failure');return e4Save(kind,body,rev,allow);};");await x.submitSecureTest();const txt=x.document.getElementById('answerBackup').value;
    assert.ok(txt.startsWith('SECURE-ANSWERS-V1'),'a saved outbox must be accessible even when guard commit fails');assert.equal(x.eval('SUBMITTED'),true,'durably prepared submission cannot reopen the active attempt');
    const y=genDom(pkg.studentHtml,dumpStorage(x),cloneIdbState(x.__qaIdbState));children.push(y);await new Promise(r=>setTimeout(r,0));y.document.getElementById('studentName').value='A7B9C2';await y.startTest();assert.equal(y.document.getElementById('answerBackup').value,txt);assert.equal(y.eval('SUBMITTED'),true);assert.equal((await y.idbGet('attemptGuard')).body.state,'submitted');
  });
  await group('crypto-failure',async()=>{
    const x=await fresh(),deadline=x.eval('TIMER_DEADLINE');x.eval("var E4_MONITOR_RESTARTS=0;const e4Monitor=startSplitMonitor;startSplitMonitor=function(){E4_MONITOR_RESTARTS++;return e4Monitor();};encryptPayloadForTeacher=async function(){throw new Error('synthetic crypto failure');};");await x.submitSecureTest();assert.equal(x.eval('SUBMITTED'),false);assert.equal(x.eval('E4_MONITOR_RESTARTS'),1,'failed encryption must restart monitoring');assert.equal(x.eval('TIMER_DEADLINE'),deadline,'failed submission must not extend the deadline');assert.equal(await x.idbGet('submissionOutbox'),undefined);
  });
  await group('outbox-local-quota',async()=>{
    const x=await fresh();x.eval("const e4WriteLocal=writeLocalSigned;writeLocalSigned=function(kind,rec){if(kind==='submissionOutbox'||(kind==='attemptGuard'&&rec.body.state==='submitted'))return false;return e4WriteLocal(kind,rec);};");await x.submitSecureTest();assert.equal(x.eval('SUBMITTED'),true);assert.ok(x.document.getElementById('answerBackup').value.startsWith('SECURE-ANSWERS-V1'),'IDB ciphertext remains downloadable after localStorage quota failure');assert.ok(await x.idbGet('submissionOutbox'));assert.equal((await x.idbGet('attemptGuard')).body.state,'submitted');
  });
  await group('active-write-failure',async()=>{
    const x=await fresh(),attempt=x.eval('ATTEMPT_ID'),deadline=x.eval('TIMER_DEADLINE');x.eval("const e4Put=idbPut;idbPut=async function(kind,value){if(kind==='activeAttempt')throw new Error('synthetic active-state write denial');return e4Put(kind,value);};");assert.equal(await x.persistActiveAttemptSeal(),false);assert.equal(x.eval('LOCKED'),true,'an active write failure must block further editing');assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),true);x.document.getElementById('unlockInp').value='REC-AB12-CD34';await x.tryUnlock();assert.equal(x.eval('LOCKED'),true,'classroom unlock cannot clear an integrity failure');assert.equal(x.eval('ATTEMPT_ID'),attempt);assert.equal(x.eval('TIMER_DEADLINE'),deadline);
  });
  await group('unavailable-idb',async()=>{
    const x=genDom(pkg.studentHtml);children.push(x);await new Promise(r=>setTimeout(r,0));x.eval("PERSIST_DB_PROMISE=null;idbGet=async function(){throw new Error('synthetic read denial');};");x.document.getElementById('studentName').value='A7B9C2';await x.startTest();assert.equal(x.isTestActive(),false);assert.equal(x.eval('PERSIST_INTEGRITY_BLOCK'),true,'unreadable storage cannot look like no existing attempt');
  });
  const report={stage:'E4',version:w.eval('RELEASE.version'),status:'PASS',selected,checks,scope:'Generated-runtime fault injection using WebCrypto and simulated IDB; real restart proof is the separate native browser gate',guarantees:'HARDENED / BEST-EFFORT',limits:'No proof against client-owner editing or complete storage rollback'};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e4-faults.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const x of children)x.close();gdom.window.close();}
