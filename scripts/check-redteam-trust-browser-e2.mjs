// Actual desktop verifier, original CSP, real WebCrypto and download blobs.
// Synthetic CSV models a teacher import; it does not prove live Forms settings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {w,gdom,configure,build} from './redteam-harness-utils.mjs';
let browser;
try {
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const student=await browser.newPage(),verifier=await browser.newPage();
  const errors=[];for(const page of [student,verifier])page.on('pageerror',e=>errors.push(e.message));
  await student.route('http://127.0.0.1:18778/student.html',r=>r.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));
  await verifier.route('http://127.0.0.1:18778/verifier.html',r=>r.fulfill({status:200,contentType:'text/html',body:pkg.teacherHtml}));
  await student.goto('http://127.0.0.1:18778/student.html');
  const txt=await student.evaluate(async expectedHash=>{
    // Everything except the public-key encryption is attacker-authored.
    const payload={v:1,testId:CFG.testId,manifestHash:CFG.manifestHash,studentHtmlSha256:expectedHash,
      attemptId:'E2-BROWSER-FORGED',identityMode:'oneTimeCode',code:'A7B9C2',student:'A7B9C2',groupKey:'__default',
      startedAt:'2026-10-03T12:00:00Z',submittedAt:'2026-10-03T12:15:00Z',securityEvents:[{t:'2026-10-03T12:00:00Z',type:'attempt-start'}],
      resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},pct:0,grade:5};
    return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:CFG.testId,manifestHash:CFG.manifestHash,payload:await encryptPayloadForTeacher(payload)});
  },pkg.studentHtmlSha256);
  await verifier.goto('http://127.0.0.1:18778/verifier.html');
  await verifier.evaluate(()=>{if(window.setFormsAnchorPolicy)setFormsAnchorPolicy({schoolDomain:'example.invalid',publishedAt:'2026-10-03T11:59:00Z',csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true});});
  const quote=s=>'"'+s.replaceAll('"','""')+'"';
  const csv='Timestamp,Email Address,Result\n'+['2026-10-03T12:16:00Z','synthetic-a@example.invalid',txt].map(quote).join(',');
  const outcome=await verifier.evaluate(async text=>{
    const summary=await importFormsCsvText(text,'synthetic-e2.csv');
    return {technicalCount:summary.ok,pct:RESULTS[0].pct,trust:RESULTS[0].trustAssessment};
  },csv);
  assert.equal(outcome.technicalCount,1);assert.equal(outcome.pct,100);
  assert.equal(outcome.trust?.runtimeAuthenticity,'CLIENT-CONTROLLED');
  assert.equal(outcome.trust?.clientHtmlHash,'CLAIM_MATCHES_REFERENCE');
  assert.equal(outcome.trust?.clientTelemetry,'PRESENT_UNVERIFIED');
  assert.equal(outcome.trust?.externalIdentity,'MATCHED_FORMS_ROSTER');
  assert.equal(outcome.trust?.classificationAuthorization,'REVIEW_REQUIRED');
  await verifier.evaluate(()=>showVerifierPanel('results'));
  await verifier.locator('#resultTable').waitFor({state:'visible'});
  assert.ok((await verifier.locator('#resultTable').innerText()).includes('PŮVOD NEPROKÁZÁN'));
  assert.equal(await verifier.locator('#resultTable .result-row-ok').count(),0);
  assert.ok((await verifier.locator('#formsImportSummary').innerText()).includes('původ neprokázán'));
  await verifier.evaluate(()=>showVerifierPanel('tech'));
  assert.ok((await verifier.locator('.v2-tech-integrity').innerText()).includes('jeho shoda neprokazuje'));
  for(const [fn,verify] of [
    ['downloadResultsCsv',s=>assert.ok(s.includes('REVIEW_REQUIRED')&&s.includes('CLIENT-CONTROLLED'))],
    ['downloadArchiveJson',s=>{const data=JSON.parse(s);assert.equal(data.metadata.authorizedClassificationCount,0);assert.equal(data.results[0].classificationStatus,'REVIEW_REQUIRED');}],
    ['downloadFeedbackHtml',s=>assert.ok(s.includes('Původ výsledku není prokázán.'))]
  ]){
    const downloaded=verifier.waitForEvent('download');
    await verifier.evaluate(name=>{if(name==='downloadFeedbackHtml')document.getElementById('feedbackLevel').value='score-only';window[name]();},fn);
    const stream=await (await downloaded).createReadStream(),parts=[];
    for await(const part of stream)parts.push(part);
    verify(Buffer.concat(parts).toString('utf8'));
  }
  assert.deepEqual(errors,[]);
  const report={status:'PASS',version:w.eval('RELEASE.version'),browser:await browser.version(),syntheticOnly:true,platformScope:'desktop Chromium; real mobile NOT TESTED',checks:['public-key forged payload through real Forms CSV import','score recalculated from private answer key','matching self-hash does not authorize','nonempty client telemetry stays unverified','UI declares unproven origin','actual CSV/JSON/score-only feedback downloads require review','no pageerror; original student/verifier CSP'],limitation:'A public-key forge consistent with the roster account and publication/Forms window can still pass. Runtime provenance is unproven even with matched E3 anchors.'};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e2-browser.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser?.close();gdom.window.close();}
