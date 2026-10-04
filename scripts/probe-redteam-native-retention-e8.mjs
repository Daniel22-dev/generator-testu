// Supplemental observation, deliberately outside PASS gates: interrupted native
// reload reliability remains unconfirmed. No private HTML or keys leave memory.
import fs from 'node:fs';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom} from './redteam-harness-utils.mjs';
import {createFixtures} from './redteam-forgery-fixtures-e8.mjs';
let fixtures,browser;const observations=[];
try{
  fixtures=await createFixtures();browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(let i=0;i<5;i++){
    const context=await browser.newContext();try{
      const page=await context.newPage(),url='http://127.0.0.1:18785/student.html';await page.route(url,r=>r.fulfill({status:200,contentType:'text/html',body:fixtures.default.pkg.studentHtml}));await page.goto(url);await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,fixtures.default.pkg);await page.evaluate(()=>startTest());
      const before=await page.evaluate(async()=>{for(let i=0;i<180;i++)recordSec('paste-blocked','synthetic metadata '+i);await flushPendingAttemptWrites();return {id:ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE};});await page.reload();await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,fixtures.default.pkg);await page.evaluate(()=>startTest());
      const after=await page.evaluate(()=>({sameId:!!ATTEMPT_ID,start:STARTED_AT,deadline:TIMER_DEADLINE,locked:LOCKED,integrityLock:PERSIST_INTEGRITY_BLOCK,markers:SEC_EVENTS.filter(e=>e.type==='attempt-start').length,retained:activeAttemptBody().securityEvents.length}));const idMatches=await page.evaluate(id=>ATTEMPT_ID===id,before.id);
      observations.push({run:i+1,idMatches,startMatches:before.start===after.start,deadlineMatches:before.deadline===after.deadline,locked:after.locked,integrityLock:after.integrityLock,startMarkerCount:after.markers,retained:after.retained,outcome:!idMatches||after.start!==before.start||after.deadline!==before.deadline||after.markers!==1?'INCONSISTENT_RELOAD':after.integrityLock?'INTEGRITY_LOCK_REQUIRES_INVESTIGATION':'ORIGIN_RETAINED'});
    }finally{await context.close();}
  }
  const report={stage:'E8',version:w.eval('RELEASE.version'),status:'OBSERVATION ONLY / NOT CERTIFIED',browser:await browser.version(),syntheticOnly:true,observations,scope:'Five isolated desktop Chromium profiles; original student CSP, 180 actual recordSec calls, flushed active-state writes and native reload; no physical mobile evidence or authenticity claim.',negativeControl:'Not a PASS/security certification gate. Prior failure/retry evidence is in redteam/E8/native-high-volume-reload-probe.json.',limits:['Five favorable observations cannot establish native reload reliability; E9 follow-up remains open','Interrupted unload writes may correctly fail closed; root cause of prior missing marker is not proved','No normal unlock or score is authorized by this probe']};const path=process.env.GIT_REDTEAM_E8_PROBE_REPORT||'qa-results/redteam-e8-native-retention-probe.json';fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser?.close();if(fixtures)Object.values(fixtures).forEach(f=>{f.x.close();f.v.close();});gdom.window.close();}
