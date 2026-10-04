import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {w,gdom,configure,build,genDom,enterStartCode,REC} from './redteam-harness-utils.mjs';
import {mutateArtifact} from './redteam-regression-mutants-e9.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'git-e10-')),checks=[],negativeControls=[],errors=[],children=[];
let browser;
async function snap(p){return p.evaluate(()=>({active:isTestActive(),ready:CONTENT_READY,id:ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE,resp:RESP,locked:LOCKED,input:$('startCode').value,exercises:Object.keys(STUDENT_VARIANTS).length}));}
async function attempt(p,code){await p.locator('#studentName').fill('Synthetic');await p.locator('#startCode').fill(code);await p.evaluate(()=>startTest());}
async function dismiss(p){await p.evaluate(()=>document.querySelectorAll('.s-modal-bd').forEach(x=>x.remove()));}
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true});const pkg=await build();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext();context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const url='http://127.0.0.1:18790/student.html';await context.route(url,r=>r.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));
  const p=await context.newPage();await p.goto(url);assert.equal(await p.locator('meta[http-equiv="Content-Security-Policy"]').count(),1);assert.equal((await snap(p)).exercises,0);
  const wrong=(pkg.startCode[0]==='A'?'B':'A')+pkg.startCode.slice(1);
  for(const code of ['',wrong,REC]){await attempt(p,code);const s=await snap(p);assert.equal(s.active,false);assert.equal(s.id,'');assert.equal(s.deadline,0);assert.equal(s.exercises,0);await dismiss(p);}
  checks.push({id:'pre-start-missing-wrong-classroom-code',status:'PASS'});
  await attempt(p,pkg.startCode);let s=await snap(p);assert.equal(s.active,true);assert.equal(s.input,'');assert.equal(s.ready,true);await p.evaluate(async()=>{setResp('0_0',1);await flushPendingAttemptWrites();});const before=await snap(p);
  checks.push({id:'native-correct-code',status:'PASS'});
  await p.reload();await attempt(p,'');s=await snap(p);assert.equal(s.active,false);assert.equal(s.ready,false);assert.equal(s.exercises,0);await dismiss(p);
  const persisted=await p.evaluate(async()=>{const a=await loadActiveAttemptSeal();return {id:a.attemptId,deadline:a.timerDeadline,resp:a.resp};});assert.equal(persisted.id,before.id);assert.equal(persisted.deadline,before.deadline);assert.equal(persisted.resp['0_0'],1);
  checks.push({id:'reload-requires-code-preserves-persisted-origin',status:'PASS'});
  await enterStartCode(p,pkg);await p.evaluate(()=>startTest());s=await snap(p);assert.equal(s.id,before.id);assert.equal(s.start,before.start);assert.equal(s.deadline,before.deadline);assert.equal(s.locked,true);
  await p.evaluate(async code=>{$('unlockInp').value=code;await tryUnlock();},REC);assert.equal((await snap(p)).locked,false);await p.evaluate(()=>submitSecureTest());
  const v=genDom(pkg.teacherHtml);children.push(v);const pack=v.parseTxt(await p.locator('#answerBackup').inputValue());assert.equal(v.scorePayload(await v.decryptPayload(pack)).pct,20);
  checks.push({id:'reload-code-recovery-and-private-rescore',status:'PASS'});
  const offlineContext=await browser.newContext();await offlineContext.route(url,r=>r.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));const offline=await offlineContext.newPage();await offline.goto(url);await offlineContext.setOffline(true);await attempt(offline,pkg.startCode);assert.equal((await snap(offline)).active,true);checks.push({id:'loaded-standalone-offline-start',status:'PASS'});await offlineContext.close();
  const file=path.join(temp,'synthetic-student.html');fs.writeFileSync(file,pkg.studentHtml);const filePage=await context.newPage();await filePage.goto(pathToFileURL(file).href);await attempt(filePage,pkg.startCode);assert.equal((await snap(filePage)).active,false);checks.push({id:'file-protocol-existing-environment-block-preserved',status:'PASS'});
  const broken=mutateArtifact(pkg.studentHtml,'async function unlockTestContent(){','return true;');
  const badContext=await browser.newContext();await badContext.route(url,r=>r.fulfill({status:200,contentType:'text/html',body:broken}));const bad=await badContext.newPage();await bad.goto(url);await attempt(bad,wrong);let detected=false;try{assert.equal((await snap(bad)).active,false,'wrong code must block even an empty test');}catch(e){if(e.code!=='ERR_ASSERTION')throw e;detected=true;}assert.equal(detected,true);negativeControls.push({id:'bypassed-production-unlock',detected:true});await badContext.close();
  assert.deepEqual(errors,[]);
  const report={stage:'E10',version:w.eval('RELEASE.version'),status:'PASS',browser:browser.version(),checks,negativeControls,exceptions:errors.length,scope:'Actual generated encrypted artifact and original exported policy on native desktop Chromium, durable IndexedDB, offline already-loaded page, existing file-protocol block, real private rescore. Test-only broken script remains executable.',physicalMobile:'ANALYZED / NOT TESTED'};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e10-browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS E10 native content:',checks.length,'cases,',negativeControls.length,'negative');
}finally{await browser?.close();children.forEach(x=>x.close());gdom.window.close();fs.rmSync(temp,{recursive:true,force:true});}
