// Executable teacher/student artifacts, synthetic identities only.
// GIT_REDTEAM_E2_CASE selects a group for independent baseline negative controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,configure,build,genDom,TEACH,REC} from './redteam-harness-utils.mjs';
const selected=process.env.GIT_REDTEAM_E2_CASE||'all',checks=[];
const children=[];
async function check(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E2',id);}
try {
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build(),x=genDom(pkg.studentHtml),v=genDom(pkg.teacherHtml);children.push(x,v);
  const cfg=x.eval('CFG');
  const base={v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:pkg.studentHtmlSha256,attemptId:'E2-FORGED',identityMode:'oneTimeCode',code:'A7B9C2',student:'A7B9C2',groupKey:'__default',startedAt:'2026-10-03T12:00:00Z',submittedAt:'2026-10-03T12:15:00Z',resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},securityEvents:[{t:'2026-10-03T12:00:00Z',type:'attempt-start'}],pct:0,grade:5};
  async function forge(patch={},removeEvents=false){
    const payload={...base,...patch};if(removeEvents)delete payload.securityEvents;
    const cipher=await x.encryptPayloadForTeacher(payload);
    const txt='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,manifestHash:cfg.manifestHash,payload:cipher});
    return await v.verifyText('synthetic-e2.txt',txt,{source:'google-forms-csv',fullYearCsv:true,formIdentity:'synthetic-a@example.invalid',formTimestamp:'2026-10-03T12:16:00Z'});
  }
  await new Promise(r=>setTimeout(r,0));
  if(v.setFormsAnchorPolicy)v.setFormsAnchorPolicy({schoolDomain:'example.invalid',publishedAt:'2026-10-03T11:59:00Z',csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true});
  const sample=await forge();
  await check('trust',async()=>{
    assert.equal(sample.classification,'current');assert.equal(sample.row.pct,100);
    const t=sample.row.trustAssessment;assert.ok(t,'private verifier must construct trust assessment');
    assert.equal(t.runtimeAuthenticity,'CLIENT-CONTROLLED');assert.equal(t.encryption,'DECRYPTED_NOT_AUTHENTICATED');
    assert.equal(t.clientHtmlHash,'CLAIM_MATCHES_REFERENCE');assert.equal(t.classificationAuthorization,'REVIEW_REQUIRED');
    assert.equal(t.externalIdentity,'MATCHED_FORMS_ROSTER');assert.equal(t.externalTimeWindow,'WITHIN_PUBLICATION_FORMS_WINDOW');
    assert.equal(t.scoreSource,'TEACHER_ANSWER_KEY');assert.equal(v.classificationStatus(sample.row),'REVIEW_REQUIRED');
    // Matching expected hash, encryption and client-supplied trusted bits never authorize a grade.
    const bad=await forge({manifestHash:'wrong-manifest'});assert.equal(bad.classification,'invalid-current');
    const unknown=await forge({code:'UNKNOWN',student:'UNKNOWN'});assert.equal(unknown.classification,'invalid-current');
    assert.equal(v.resultTrust(unknown.row).scoreSource,'NOT_SCORED');
    assert.equal(v.resultTrust(unknown.row).buildBinding,'NOT_VERIFIED');
  });
  await check('telemetry',async()=>{
    for(const [value,missing] of [[[],false],[null,false],[{},false],[undefined,true]]){
      const outcome=await forge({securityEvents:value},missing);assert.equal(outcome.row?.status,'CHYBA');assert.equal(v.resultTrust(outcome.row).scoreSource,'NOT_SCORED');
    }
    const signals=v.securitySignalsFor(sample.row,v.duplicateInfo());assert.ok(signals.some(s=>s.code==='client-controlled'&&s.sev==='info'));
    assert.equal(sample.row.trustAssessment.clientTelemetry,'PRESENT_UNVERIFIED');assert.equal(sample.row.trustAssessment.runtimeAuthenticity,'CLIENT-CONTROLLED');

  });
  function single(){v.__sampleRow=sample.row;v.eval('RESULTS=[window.__sampleRow];');}
  await check('ui',async()=>{
    single();v.afterResultsChanged();
    assert.ok(v.document.getElementById('resultTable').textContent.includes('PŮVOD NEPROKÁZÁN'));
    assert.equal(v.document.querySelectorAll('#resultTable .result-row-ok').length,0);
    assert.ok(v.document.getElementById('summary').textContent.includes('Návrhy známek k posouzení'));
    assert.ok(v.document.getElementById('v2ResultHealth').textContent.includes('návrhů známek k posouzení'));
    assert.ok(!v.document.getElementById('securitySignals').textContent.includes('bez bezpečnostního problému'));
    assert.ok(v.feedbackHtmlFor(sample.row,'score-only').includes('verifier-trust-notice'));
    assert.ok(v.plainFeedbackFor(sample.row,'score-only').includes('REVIEW_REQUIRED'));
  });
  await check('exports',async()=>{
    single();v.eval("RESULTS[0].trustAssessment={runtimeAuthenticity:'PREVENTED',classificationAuthorization:'AUTHORIZED',externalIdentity:'FORGED'};");
    const captures={};v.downloadText=(txt,name)=>{captures[name]=txt;};
    for(const fn of ['downloadResultsCsv','downloadSubmissionsCsv','downloadIndexCsv']){
      v[fn]();const txt=Object.values(captures).at(-1);const rows=v.csvParseDelimited(txt,';');
      assert.equal(rows[0].length,rows[1].length,'evidence headers must align with values');
      for(const [key,value] of [['runtime_authenticity','CLIENT-CONTROLLED'],['classification_authorization','REVIEW_REQUIRED'],['external_identity_status','MATCHED_FORMS_ROSTER'],['client_html_hash_status','CLAIM_MATCHES_REFERENCE']])assert.equal(rows[1][rows[0].indexOf(key)],value,key);
      assert.ok(!rows[0].includes('verified_email'));
      if(rows[0].includes('classification_status'))assert.equal(rows[1][rows[0].indexOf('classification_status')],'REVIEW_REQUIRED');
    }
    v.downloadArchiveJson();const data=JSON.parse(Object.values(captures).at(-1));
    assert.equal(data.metadata.authorizedClassificationCount,0);
    assert.equal(data.metadata.trustContract.runtimeAuthenticity,'CLIENT-CONTROLLED');
    assert.equal(data.results[0].classificationStatus,'REVIEW_REQUIRED');
    assert.equal(data.results[0].trustAssessment.classificationAuthorization,'REVIEW_REQUIRED');
    v.downloadArchiveHtml();assert.ok(Object.values(captures).at(-1).includes('PŮVOD NEPROKÁZÁN'));
    v.downloadFeedbackHtml();assert.ok(Object.values(captures).at(-1).includes('verifier-trust-notice'));
    assert.equal(v.classificationStatus({...sample.row,jokerUsed:true}),'JOKER_EXCLUDED');
  });
  await check('credentials',async()=>{
    configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'name'},'',REC);
    w.document.getElementById('ucitelJmeno').value='';w.validate();
    assert.equal(w.document.getElementById('next3').disabled,false);
    assert.equal(w.document.getElementById('teacherAccessCodeField').classList.contains('hidden'),true);
    const secure=await build();assert.equal(w.eval('lastAssembled.cfg.ucitelPinHash'),'');assert.ok(secure.studentHtml.includes('unlockCodeHash'));
    configure({testMode:'bezny',resultMode:'instant',screenGuard:true,identityMode:'name'},'',REC);w.validate();
    assert.equal(w.document.getElementById('next3').disabled,true);await assert.rejects(build(),/učitelský/);
    configure({testMode:'bezny',resultMode:'instant',screenGuard:true,identityMode:'name'},TEACH,TEACH);await assert.rejects(build(),/stejný/);
    configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'name'},'','');await assert.rejects(build(),/Recovery/);
  });
  assert.ok(checks.length,'unknown GIT_REDTEAM_E2_CASE');
  const report={status:'PASS',version:w.eval('RELEASE.version'),syntheticOnly:true,checks,forgedPayload:{technicalAcceptance:sample.classification,score:sample.row.pct,runtimeAuthenticity:v.resultTrust(sample.row).runtimeAuthenticity,classificationAuthorization:v.resultTrust(sample.row).classificationAuthorization},limitation:'E3 anchors constrain the input; matching anchors still leave runtime CLIENT-CONTROLLED and classification REVIEW_REQUIRED.'};
  if(selected==='all'){fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e2-trust.json',JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));
} finally {children.forEach(x=>x.close());gdom.window.close();}
