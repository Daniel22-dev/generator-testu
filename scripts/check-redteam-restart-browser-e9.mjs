// Native desktop Chromium, original CSP, WebCrypto and durable IndexedDB.
// No retry-on-failure. Pending-write failures may only remain fail-closed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom,genDom,REC} from './redteam-harness-utils.mjs';
import {createFixtures,policy} from './redteam-forgery-fixtures-e8.mjs';
import {mutateArtifact} from './redteam-regression-mutants-e9.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'git-e9-native-')),checks=[],negativeControls=[];
const launch={headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})};
let fixtures,browserVersion;const verifiers=[];
async function scenario(f,mode,repeat,html=f.pkg.studentHtml){
  const profile=fs.mkdtempSync(path.join(temp,'profile-'));let context;
  const url='http://127.0.0.1:18789/student.html';
  async function open(){context=await chromium.launchPersistentContext(profile,launch);browserVersion=context.browser()?.version()||browserVersion;const page=await context.newPage();await page.route(url,r=>r.fulfill({status:200,contentType:'text/html',body:html}));await page.goto(url);return page;}
  try{
    let page=await open();await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,f.pkg);
    if(f.kind==='joker')await page.evaluate(()=>{chooseJokerStart(true);confirmJokerCommit=async()=>true;});
    await page.evaluate(()=>startTest());
    const before=await page.evaluate(async()=>{setResp('0_0',1);await flushPendingAttemptWrites();for(let i=0;i<180;i++)recordSec('paste-blocked','synthetic metadata '+i);return {id:ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE,joker:JOKER_USED,jokerAt:JOKER_SELECTED_AT};});
    if(mode!=='pending-reload')await page.evaluate(()=>flushPendingAttemptWrites());
    if(mode==='profile-restart'){await context.close();context=null;page=await open();}
    else await page.reload();
    await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,f.pkg);await page.evaluate(()=>startTest());
    const after=await page.evaluate(()=>({id:ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE,joker:JOKER_USED,jokerAt:JOKER_SELECTED_AT,locked:LOCKED,integrityLock:PERSIST_INTEGRITY_BLOCK,answer:RESP['0_0'],events:activeAttemptBody().securityEvents}));
    assert.equal(after.id,before.id,'same-profile reload cannot create a new attempt');assert.equal(after.start,before.start,'reload preserves start');assert.equal(after.deadline,before.deadline,'reload cannot extend deadline');assert.equal(after.joker,before.joker);assert.equal(after.jokerAt,before.jokerAt);assert.equal(after.answer,1,'flushed answer survives');assert.equal(after.locked,true,'strict reload restores locked');
    assert.equal(after.events.filter(e=>e.type==='attempt-start').length,1,'original start marker retained');assert.equal(after.events.filter(e=>e.type==='joker-used').length,f.kind==='joker'?1:0);assert.ok(after.events.length<=120);
    if(mode!=='pending-reload')assert.equal(after.integrityLock,false,'flushed normal restart must permit procedural recovery');
    let score=null,classification=null;
    if(!after.integrityLock){
      // Deliberate UI setup only: recovery algorithm remains production code.
      await page.evaluate(async code=>{document.getElementById('unlockInp').value=code;await tryUnlock();},REC);
      assert.equal(await page.evaluate(()=>LOCKED),false,'normal procedural recovery must work');
      await page.evaluate(()=>submitSecureTest());assert.equal(await page.evaluate(()=>SUBMITTED),true);
      const txt=await page.locator('#answerBackup').inputValue(),v=genDom(f.pkg.teacherHtml);verifiers.push(v);await new Promise(r=>setTimeout(r,0));v.setFormsAnchorPolicy({...policy,publishedAt:new Date(Date.now()-120000).toISOString()});
      const out=await v.verifyText('synthetic-e9.txt',txt,{source:'google-forms-csv',fullYearCsv:false,formIdentity:'synthetic-a@example.invalid',formTimestamp:new Date().toISOString()});
      assert.equal(out.row?.status,'OK','recovered native payload reaches private scoring');assert.equal(out.row.pct,20);assert.equal(out.row.attemptId,before.id);classification=v.classificationStatus(out.row);assert.equal(classification,f.kind==='joker'?'JOKER_EXCLUDED':'REVIEW_REQUIRED');score=out.row.pct;
    }else{
      await page.evaluate(async code=>{document.getElementById('unlockInp').value=code;await tryUnlock();},REC);
      assert.equal(await page.evaluate(()=>LOCKED),true,'pending-write integrity lock cannot be bypassed by classroom code');
    }
    return {id:mode+'-'+f.kind+'-'+repeat,status:'PASS',integrityLock:after.integrityLock,originPreserved:true,deadlinePreserved:true,answerPreserved:true,startMarkerCount:1,jokerMarkerCount:f.kind==='joker'?1:0,retained:after.events.length,score,classification,outcome:after.integrityLock?'DETECTED / FAIL-CLOSED':'HARDENED / RECOVERED',scope:mode==='profile-restart'?'Graceful native browser shutdown and reopening of the same persisted profile':'Native reload; 180 real recordSec calls; '+(mode==='pending-reload'?'write queue deliberately not flushed':'write queue flushed')};
  }finally{await context?.close();fs.rmSync(profile,{recursive:true,force:true});}
}
try{
  fixtures=await createFixtures();
  for(const repeat of [1,2])for(const kind of ['default','joker'])for(const mode of ['flushed-reload','pending-reload','profile-restart'])checks.push(await scenario(fixtures[kind],mode,repeat));
  for(const kind of ['default','joker']){
    const f=fixtures[kind],broken=mutateArtifact(f.pkg.studentHtml,'function securityEventSnapshot(events){','return Array.isArray(events)?events.slice(-120):[];');
    let detected=false;try{await scenario(f,'flushed-reload','negative',broken);}catch(e){if(e.code!=='ERR_ASSERTION')throw e;detected=true;}assert.ok(detected,'native regression must detect lost origin marker');negativeControls.push({id:'lost-origin-'+kind,detected:true,scope:'Intentionally weakened generated runtime with recalculated test-only CSP script hash'});
  }
  const report={stage:'E9',version:w.eval('RELEASE.version'),status:'PASS',browser:browserVersion||'Chromium',syntheticOnly:true,checks,negativeControls,physicalMobile:'ANALYZED / NOT TESTED',runtime:'CLIENT-CONTROLLED',limits:['12 favorable desktop lifecycle cases are regression evidence, not exhaustive reliability certification','Graceful browser shutdown is not abrupt OS/process kill, power failure or mobile suspension','Pending writes may cause an integrity lock requiring investigation; this is distinct from successful recovery','Full storage wipe, new profiles and client-owner runtime edits remain architectural limits']};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e9-restart-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{verifiers.forEach(v=>v.close());if(fixtures)Object.values(fixtures).forEach(f=>{f.x.close();f.v.close();});gdom.window.close();fs.rmSync(temp,{recursive:true,force:true});}
