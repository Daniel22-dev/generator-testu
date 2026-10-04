// Actual exported HTML, native Chromium WebCrypto/IndexedDB/Web Locks, original CSP.
// A separate private file URL keeps verifier data outside the student's origin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom,configure,build} from './redteam-harness-utils.mjs';
const selected=process.env.GIT_REDTEAM_E4_CASE||'all',checks=[],limits=[],errors=[];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'git-e4-private-')),contexts=new Set();
const origin='http://127.0.0.1:18780',publishedAt=new Date(Date.now()-120000).toISOString();
let pkg;
async function launch(profile){const c=await chromium.launchPersistentContext(path.join(temp,profile),{headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});contexts.add(c);await c.route(origin+'/**',r=>r.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));for(const p of c.pages())p.on('pageerror',e=>errors.push(e.message));return c;}
async function close(c){await c.close();contexts.delete(c);}
async function page(c){const p=await c.newPage();await p.goto(origin+'/student.html');return p;}
async function start(p,code='A7B9C2'){await p.locator('#studentName').fill(code);await enterStartCode(p,pkg);await p.evaluate(()=>startTest());}
const state=p=>p.evaluate(async()=>{await flushPendingAttemptWrites();return {attemptId:ATTEMPT_ID,deadline:TIMER_DEADLINE,resp:RESP,locked:LOCKED,integrity:PERSIST_INTEGRITY_BLOCK,submitted:SUBMITTED,events:SEC_EVENTS.map(e=>e.type),active:isTestActive(),done:!$('done').classList.contains('hidden')};});
async function group(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E4',id);}
const policy={schoolDomain:'example.invalid',publishedAt,csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true};
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D4E6F8',label:'Synthetic B',email:'synthetic-b@example.invalid'}];");pkg=await build();
  await group('restart-outbox',async()=>{
    let c=await launch('restart'),p=await page(c);await start(p);assert.equal((await state(p)).active,true);
    await p.evaluate(async()=>{setResp('0_0',1);await persistActiveAttemptSeal();});const first=await state(p);
    await p.reload();await start(p);let next=await state(p);assert.equal(next.attemptId,first.attemptId);assert.equal(next.deadline,first.deadline);assert.equal(next.resp['0_0'],1);
    await close(c);c=await launch('restart');p=await page(c);await start(p);next=await state(p);assert.equal(next.attemptId,first.attemptId);assert.equal(next.deadline,first.deadline);assert.equal(next.resp['0_0'],1);
    await p.evaluate(()=>submitSecureTest());const txt=await p.locator('#answerBackup').inputValue();assert.ok(txt.startsWith('SECURE-ANSWERS-V1'));
    await close(c);c=await launch('restart');p=await page(c);await start(p);next=await state(p);assert.equal(next.done,true,'submitted ciphertext must recover after a real browser restart');assert.equal(next.active,false);assert.equal(next.attemptId,first.attemptId);assert.equal(await p.locator('#answerBackup').inputValue(),txt);
    await p.evaluate(()=>Promise.all([submitSecureTest(),submitSecureTest()]));assert.equal(await p.locator('#answerBackup').inputValue(),txt,'duplicate submit must not re-encrypt');
    // Losing only localStorage retains both the guard and ciphertext in IDB.
    await p.evaluate(()=>localStorage.clear());await p.reload();await start(p);assert.equal((await state(p)).done,true);assert.equal(await p.locator('#answerBackup').inputValue(),txt);await close(c);
  });
  await group('parallel-tabs',async()=>{
    const c=await launch('tabs'),a=await page(c),b=await page(c);await a.locator('#studentName').fill('A7B9C2');await enterStartCode(a,pkg);await b.locator('#studentName').fill('A7B9C2');await enterStartCode(b,pkg);
    await Promise.all([a.evaluate(()=>startTest()),b.evaluate(()=>startTest())]);const sa=await state(a),sb=await state(b);assert.equal(Number(sa.active)+Number(sb.active),1,'two native tabs cannot run one browser-local attempt concurrently');
    const winner=sa.active?a:b,other=sa.active?b:a,id=(sa.active?sa:sb).attemptId;await winner.close();await start(other);assert.equal((await state(other)).attemptId,id);await close(c);
  });
  await group('integrity',async()=>{
    const c=await launch('integrity');let p=await page(c);await start(p);const first=await state(p);
    // Inject at the inactive intro: E5 unload guard legitimately saves current RAM.
    // The probe must reach the next startup read without a later active-page write.
    await p.goto(origin+'/student.html');await p.evaluate(()=>{localStorage.setItem(storageKey('activeAttempt'),'{broken-json');localStorage.removeItem(storageKey('activeAttemptShadow'));});await p.reload();await start(p);let s=await state(p);assert.equal(s.attemptId,first.attemptId);assert.equal(s.integrity,true,'malformed local record must not masquerade as absent');assert.equal(s.locked,true);
    await close(c);
    const d=await launch('shadow');p=await page(d);await start(p);await p.evaluate(async()=>{await persistActiveAttemptSeal();const shadow=JSON.parse(storageGet('activeAttemptShadow'));shadow.body.resp={'0_0':0};storageSet('activeAttemptShadow',JSON.stringify(shadow));});
    // Read while loaded: avoid a legitimate pagehide write replacing the injection.
    const merged=await p.evaluate(async()=>{const seal=await loadActiveAttemptSeal();return {integrity:PERSIST_INTEGRITY_BLOCK,locked:seal.locked};});assert.equal(merged.integrity,true,'unsigned shadow changes must be marked unverified');assert.equal(merged.locked,true);await close(d);
  });
  await group('interrupted-submit',async()=>{
    let c=await launch('interrupt'),p=await page(c);await start(p);const first=await state(p);assert.equal(await p.evaluate(()=>typeof saveSubmissionOutbox),'function','crash-safe encrypted outbox is required');
    const txt=await p.evaluate(async()=>{SUBMITTED=true;await flushPendingAttemptWrites();const payload=await secureAnswers();ANSWER_TXT='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:CFG.testId,manifestHash:CFG.manifestHash,payload:await encryptPayloadForTeacher(payload)});await saveSubmissionOutbox();return ANSWER_TXT;});
    // Close between the real outbox transaction and submitted guard transaction.
    await close(c);c=await launch('interrupt');p=await page(c);await start(p);assert.equal((await state(p)).done,true);assert.equal((await state(p)).attemptId,first.attemptId);assert.equal(await p.locator('#answerBackup').inputValue(),txt);assert.equal(await p.evaluate(async()=>(await idbGet('attemptGuard')).body.state),'submitted');await close(c);
  });
  await group('private-replay-restart',async()=>{
    const file=path.join(temp,'owner-verifier.html');fs.writeFileSync(file,pkg.teacherHtml);let c=await launch('private-replay'),student=await page(c);await start(student);await student.evaluate(()=>submitSecureTest());const nativeTxt=await student.locator('#answerBackup').inputValue();let v=await c.newPage();await v.goto(pathToFileURL(file).href);await v.evaluate(p=>{if(typeof setFormsAnchorPolicy==='function')setFormsAnchorPolicy(p);},policy);
    const meta={source:'google-forms-csv',fullYearCsv:true,formIdentity:'synthetic-a@example.invalid',formTimestamp:new Date().toISOString()};
    const verify=async(text=nativeTxt)=>v.evaluate(async({text,meta})=>{const out=await verifyText('e4-synthetic.txt',text,meta);return {status:out.row?.status,eligible:effectiveResults().length,replay:out.row?.replayStatus,known:out.row?.replayKnown,trust:typeof resultTrust==='function'?resultTrust(out.row):null};},{text,meta});
    assert.equal((await verify()).eligible,1);await close(c);c=await launch('private-replay');v=await c.newPage();await v.goto(pathToFileURL(file).href);assert.equal(await v.evaluate(()=>typeof FORMS_ANCHOR_POLICY==='undefined'?null:FORMS_ANCHOR_POLICY),null,'owner anchor confirmations are not silently restored');await v.evaluate(p=>{if(typeof setFormsAnchorPolicy==='function')setFormsAnchorPolicy(p);},policy);
    const restored=await verify();assert.equal(restored.eligible,1);assert.equal(restored.known,true,'private file-origin observations survive browser restart');assert.equal(restored.trust.classificationAuthorization,'REVIEW_REQUIRED');assert.equal((await verify()).eligible,1);assert.equal(await v.evaluate(()=>classificationStatus(RESULTS.at(-1))),'REJECTED');
    await v.evaluate(()=>clearVerifierResults());assert.equal((await verify()).known,true,'clearing UI must retain private replay observations');
    student=await page(c);const forged=await student.evaluate(async txt=>{const p=JSON.parse(txt.slice(txt.indexOf('\n')+1));return p;},nativeTxt); // encrypted envelope, not a teacher key
    const changed=await v.evaluate(async txt=>{const pack=parseTxt(txt),payload=await decryptPayload(pack);return {...payload,attemptId:'E4-DIFFERENT',securityEvents:payload.securityEvents.map(e=>e.type==='attempt-start'?{...e,detail:'E4-DIFFERENT'}:e)};},nativeTxt);
    const changedTxt=await student.evaluate(async p=>'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:CFG.testId,manifestHash:CFG.manifestHash,payload:await encryptPayloadForTeacher(p)}),changed);assert.ok(forged.payload);
    await v.evaluate(()=>clearVerifierResults());const conflict=await verify(changedTxt);assert.equal(conflict.eligible,0,'new attempt must conflict with observations from previous browser session');assert.equal(conflict.replay,'PERSISTED_REPLAY_CONFLICT');
    await v.evaluate(()=>{localStorage.setItem(verifierReplayStorageKey(),'{broken-json');clearVerifierResults();});assert.equal((await verify()).status,'CHYBA','corrupt private replay storage fails closed');await close(c);
  });
  await group('storage-and-profile-limits',async()=>{
    let c=await launch('partial'),p=await page(c);await start(p);const first=await state(p);await p.evaluate(()=>localStorage.clear());await p.reload();await start(p);assert.equal((await state(p)).attemptId,first.attemptId,'active attempt survives deletion of only localStorage');
    await p.evaluate(async()=>{await flushPendingAttemptWrites();(await openPersistenceDb()).close();await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('testgen-secure-state-v2');r.onsuccess=resolve;r.onerror=reject;});});await p.reload();await start(p);assert.equal((await state(p)).active,false,'missing non-extractable MAC key with local evidence blocks restart');await close(c);
    c=await launch('wipe');p=await page(c);await start(p);const prior=(await state(p)).attemptId;await p.goto(origin+'/student.html');await p.evaluate(async()=>{localStorage.clear();(await openPersistenceDb()).close();await new Promise(resolve=>{const r=indexedDB.deleteDatabase('testgen-secure-state-v2');r.onsuccess=resolve;});});await p.reload();await start(p);assert.notEqual((await state(p)).attemptId,prior);assert.equal((await state(p)).active,true);limits.push('Full origin storage wipe permits a fresh local attempt');
    const privateContext=await c.browser().newContext();contexts.add(privateContext);await privateContext.route(origin+'/**',r=>r.fulfill({contentType:'text/html',body:pkg.studentHtml}));const incognito=await page(privateContext);await start(incognito);assert.equal((await state(incognito)).active,true);assert.notEqual((await state(incognito)).attemptId,prior);limits.push('Incognito context has a separate storage namespace');await close(privateContext);await close(c);
    c=await launch('coherent-rollback');p=await page(c);await start(p);
    const rollback=await p.evaluate(async()=>{await persistActiveAttemptSeal();return {active:await idbGet('activeAttempt'),guard:await idbGet('attemptGuard'),shadow:storageGet('activeAttemptShadow')};});
    await p.evaluate(async old=>{setResp('0_0',1);await persistActiveAttemptSeal();await idbPut('activeAttempt',old.active);await idbPut('attemptGuard',old.guard);writeLocalSigned('activeAttempt',old.active);writeLocalSigned('attemptGuard',old.guard);storageSet('activeAttemptShadow',old.shadow);},rollback);
    const rolled=await p.evaluate(async()=>({seal:await loadActiveAttemptSeal(),integrity:PERSIST_INTEGRITY_BLOCK}));assert.equal(rolled.integrity,false);assert.equal(rolled.seal.resp['0_0'],undefined);limits.push('Coherent replay of both signed stores with the preserved MAC key cannot be distinguished from the original local state');await close(c);
    c=await launch('different-browser-profile');p=await page(c);await start(p);assert.equal((await state(p)).active,true);assert.notEqual((await state(p)).attemptId,prior);limits.push('Independent Chromium browser profile has no shared local attempt ledger; Firefox/Safari not tested');await close(c);
  });
  assert.deepEqual(errors,[],'original-CSP native browser test must have no pageerrors');
  const report={stage:'E4',version:w.eval('RELEASE.version'),status:'PASS',selected,checks,guarantees:'HARDENED / DETECTED, same origin and browser profile only; tab exclusion requires native Web Locks; unsupported browsers use BEST-EFFORT',limits,storageIsolation:'ARCHITECTURAL LIMIT – SERVER TRUST REQUIRED',privateReplayRecovery:'Identical validated submission reconstructs one working row; different persisted content conflicts. No score/trust bits restored.',otherEngines:'ANALYZED / NOT TESTED',realMobile:'ANALYZED / NOT TESTED',teacherLocation:'private owner PC outside school',runtime:'CLIENT-CONTROLLED',classification:'REVIEW_REQUIRED'};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e4-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{for(const c of contexts)await c.close().catch(()=>{});gdom.window.close();fs.rmSync(temp,{recursive:true,force:true});}
