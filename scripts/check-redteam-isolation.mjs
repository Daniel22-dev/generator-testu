import assert from 'node:assert/strict';
import fs from 'node:fs';
import { w, gdom, configure, build, genDom, dumpStorage, cloneIdbState, TEACH, REC } from './redteam-harness-utils.mjs';
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const windows=[];
function child(html,storage,idb){const x=genDom(html,storage,idb);windows.push(x);return x;}
try {
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  const x=child(pkg.studentHtml);
  const cfg=x.eval('CFG');
  await check('real artifact has no teacher mode, credential hashes, roster or code membership oracle',async()=>{
    for(const key of ['ucitelPinHash','recoveryCodeHash','identityCodeHashes','studentHashes','diffRosterSalt','privateKey','roster'])assert.ok(!pkg.studentHtml.includes(key),key);
    for(const token of [TEACH,REC,'A7B9C2','synthetic-a@example.invalid'])assert.ok(!pkg.studentHtml.includes(token),token);
    assert.ok(!x.document.getElementById('teacherModal'));
    for(const name of ['teacherLogin','teacherSecretMatches','openTeacherModal','clearSubmittedLocked'])assert.equal(typeof x[name],'undefined',name);
    assert.ok(cfg.unlockCodeHash);
    assert.ok(!cfg.publicKey.d);
  });
  await check('private verifier retains code to email mapping and independent answer scoring',async()=>{
    const v=child(pkg.teacherHtml);
    assert.equal(v.eval('CONFIG.roster[0].email'),'synthetic-a@example.invalid');
    assert.ok(v.eval('CONFIG.privateKey.d'));
    assert.equal(v.scorePayload({groupKey:'__default',resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},pct:0,grade:5}).pct,100);
  });
  x.document.getElementById('studentName').value='A7B9C2';
  await x.startTest();
  assert.ok(x.eval('ATTEMPT_ID'));
  await check('classroom unlock preserves attempt, deadline, identity, answers and history',async()=>{
    x.setResp('0_0',1);await x.persistActiveAttemptSeal();await x.flushPendingAttemptWrites();
    const before=x.eval('({id:ATTEMPT_ID,deadline:TIMER_DEADLINE,identity:ACTIVE_IDENTITY_HASH})');
    x.lockTest('synthetic-lock');await x.flushPendingAttemptWrites();
    x.document.getElementById('unlockInp').value=TEACH;await x.tryUnlock();assert.equal(x.eval('LOCKED'),true);
    x.document.getElementById('unlockInp').value=REC.toLowerCase();await x.tryUnlock();await x.flushPendingAttemptWrites();assert.equal(x.eval('LOCKED'),false);
    assert.equal(x.eval('ATTEMPT_ID'),before.id);assert.equal(x.eval('TIMER_DEADLINE'),before.deadline);assert.equal(x.eval('ACTIVE_IDENTITY_HASH'),before.identity);assert.equal(x.eval("RESP['0_0']"),1);
    assert.equal(x.eval("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length"),1);
    const y=child(pkg.studentHtml,dumpStorage(x),cloneIdbState(x.__qaIdbState));y.document.getElementById('studentName').value='A7B9C2';await y.startTest();assert.equal(y.eval('ATTEMPT_ID'),before.id);assert.equal(y.eval('TIMER_DEADLINE'),before.deadline);
  });
  await check('foreign identity cannot reset an active attempt',async()=>{
    const y=child(pkg.studentHtml,dumpStorage(x),cloneIdbState(x.__qaIdbState));y.document.getElementById('studentName').value='D8E4F6';await y.startTest();
    assert.ok(y.document.querySelector('.s-modal-bd'));assert.ok(!y.document.querySelector('.s-modal-bd input[type=password]'));assert.ok(y.document.getElementById('test').classList.contains('hidden'));
  });
  await check('submitted guard denies another attempt and output has no student grade',async()=>{
    await x.submitSecureTest();assert.ok(x.document.getElementById('answerBackup').value.startsWith('SECURE-ANSWERS-V1'));
    assert.equal(await x.submittedLocked(),true);await x.startTest();assert.equal(await x.submittedLocked(),true);assert.ok(!x.document.querySelector('[data-retry-code]'));
    assert.ok(!x.document.querySelector('#done .grade'));
  });
  await check('negative controls: teacher hash, code hashes, private JWK and answer key are rejected',async()=>{
    const cleanVariants=x.eval('STUDENT_VARIANTS');
    for(const patch of [{ucitelPinHash:'MUTATION'},{recoveryCodeHash:'MUTATION'},{identityCodeHashes:['MUTATION']},{diffGroups:[{studentHashes:['MUTATION']}]},{publicKey:{...cfg.publicKey,d:'MUTATION'}}])assert.throws(()=>w.assertSecureStudentIsolation({...cfg,...patch},cleanVariants,pkg.studentHtml));
    assert.throws(()=>w.assertSecureStudentIsolation(cfg,{__default:[{items:[{answer:'MUTATION'}]}]},pkg.studentHtml));
    const previous=w.securePublicCfg;
    w.securePublicCfg=(...args)=>({...previous(...args),ucitelPinHash:'MUTATION'});
    await assert.rejects(build(),/zakázan/);
    w.securePublicCfg=previous;
  });
  await check('negative control: missing parser fails closed instead of serializing legacy runtime',async()=>{
    const parser=w.acorn,loader=w.ensureJavascriptParser;w.acorn=null;
    w.ensureJavascriptParser=async()=>{throw new Error('Lokální parser není dostupný.');};
    try {await assert.rejects(build(),/parser/);}finally{w.acorn=parser;w.ensureJavascriptParser=loader;}
  });
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e1-isolation.json',JSON.stringify({status:'PASS',syntheticOnly:true,checks},null,2)+'\n');
} finally {windows.forEach(x=>x.close());gdom.window.close();}
