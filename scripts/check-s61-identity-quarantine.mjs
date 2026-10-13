#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  w, configure, build, genDom, startGeneratedTest
} from './redteam-harness-utils.mjs';

const IDENTITY='A7B9C2';
const checks=[];
function check(id,condition,detail){
  const status=condition?'PASS':'FAIL';
  checks.push({id,status,detail});
  console.log(`${status} ${id} - ${detail}`);
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});
w.eval(`rosterEntries=[{name:'Synthetic Student',code:${JSON.stringify(IDENTITY)},email:'synthetic.student@example.invalid'}]`);
const pkg=await build();

const student=genDom(pkg.studentHtml,undefined,new Map());
student.document.getElementById('studentName').value=IDENTITY.toLowerCase();
await startGeneratedTest(student);
student.eval(`RESP={"0_0":1};ANSWER_CHANGE_STATS={"0_0":2}`);
const attemptBefore=student.eval('ATTEMPT_ID');
const deadlineBefore=student.eval('TIMER_DEADLINE');
const canonicalPayload=await student.secureAnswers();
check('S61-R01',canonicalPayload.student===IDENTITY&&canonicalPayload.code===IDENTITY,
  'lowercase one-time code is normalized at a valid start');

student.document.getElementById('studentName').value='';
const changedPayload=await student.secureAnswers();
student.eval(`ANSWER_TXT='SECURE-ANSWERS-V1\\n{}'`);
await student.saveSubmissionOutbox();
const outbox=(await student.eval(`loadSignedRecord('submissionOutbox')`)).record?.body;
check('S61-R02',changedPayload.student===IDENTITY&&changedPayload.code===IDENTITY&&outbox?.student===IDENTITY,
  'payload and outbox use the canonical attempt identity after the DOM field is cleared');

student.document.getElementById('studentName').value='ZZZZZZ';
student.eval(`ANSWER_TXT=''`);
await student.submitSecureTest('manual');
await sleep(30);
const mismatch=student.eval(`({submitted:SUBMITTED,attemptId:ATTEMPT_ID,deadline:TIMER_DEADLINE,resp:JSON.parse(JSON.stringify(RESP)),events:SEC_EVENTS.map(e=>e.type),identity:document.getElementById('studentName').value})`);
check('S61-R03',!mismatch.submitted&&mismatch.attemptId===attemptBefore&&mismatch.deadline===deadlineBefore&&mismatch.resp['0_0']===1&&mismatch.events.includes('identity-input-mismatch'),
  'foreign DOM identity blocks submit, records an audit event, and preserves the active attempt');
student.close();

const producer=genDom(pkg.studentHtml,undefined,new Map());
producer.document.getElementById('studentName').value=IDENTITY;
await startGeneratedTest(producer);
producer.eval(`RESP={"0_0":1}`);
const invalid=await producer.secureAnswers();
invalid.student='';invalid.code='';
invalid.securityEvents=[
  {t:invalid.startedAt,type:'attempt-start',detail:invalid.attemptId},
  ...Array.from({length:302},(_,i)=>({t:new Date(Date.parse(invalid.startedAt)+i+1).toISOString(),type:i%73===0?'locked':'focus-transition',detail:'synthetic '+i})),
  {t:new Date(Date.parse(invalid.startedAt)+400).toISOString(),type:'split-window',detail:'unknown pct'},
  {t:new Date(Date.parse(invalid.startedAt)+401).toISOString(),type:'split-window',pct:0,detail:'measured zero'},
  {t:new Date(Date.parse(invalid.startedAt)+402).toISOString(),type:'split-window',pct:19,detail:'measured 19'},
  {t:new Date(Date.parse(invalid.startedAt)+403).toISOString(),type:'split-window',pct:96,detail:'measured 96'}
];
invalid.criticalEvents=[{t:new Date(Date.parse(invalid.startedAt)+1).toISOString(),type:'locked',detail:'synthetic 0',criticalSeq:1}];
invalid.criticalCounters={locks:1,unlocks:0,resumes:0,badUnlocks:0};
invalid.criticalOverflow=false;invalid.criticalHistoryLegacy=false;
invalid.submittedAt=new Date(Date.parse(invalid.startedAt)+1000).toISOString();
const encrypted=await producer.encryptPayloadForTeacher(invalid);
const answerText='SECURE-ANSWERS-V1\n'+JSON.stringify({
  testId:invalid.testId,manifestHash:invalid.manifestHash,studentHtmlSha256:invalid.studentHtmlSha256||'',payload:encrypted
});
producer.close();

const teacher=genDom(pkg.teacherHtml,undefined,new Map(),false);
const outcome=await teacher.verifyText('invalid-empty-identity.txt',answerText);
const quarantined=outcome.row;
check('S61-R04',quarantined?.status==='DECRYPTED_INVALID_IDENTITY'&&quarantined?.diagnosticQuarantine===true,
  'decrypted payload with an invalid identity is explicitly quarantined');
check('S61-R05',!Object.hasOwn(quarantined||{},'earned')&&!Object.hasOwn(quarantined||{},'total')&&!Object.hasOwn(quarantined||{},'pct')&&!Object.hasOwn(quarantined||{},'grade'),
  'diagnostic quarantine carries no score, percentage, or grade');
check('S61-R06',quarantined?.attemptId===invalid.attemptId&&quarantined?.answerCount===1&&(quarantined?.validationCodes||[]).includes('schema.identity'),
  'quarantine preserves sanitized attempt ID, answer count, and validation reason');
const summary=teacher.verifierSecuritySummary(quarantined);
check('S61-R07',summary.events.length>=307&&summary.lockedCount>=5&&summary.splitWindowEvents===4&&summary.splitWindowUnknownPctCount===1&&summary.splitWindowSamples.some(x=>x.pct===0)&&summary.splitWindowSamples.some(x=>x.pct===19)&&summary.splitWindowSamples.some(x=>x.pct===96),
  '300+ events, critical history, split UNKNOWN/0/19/96 and chronology remain available');
teacher.afterResultsChanged();teacher.showVerifierPanel('security');
check('S61-R08',teacher.document.getElementById('securitySignals').textContent.includes(invalid.attemptId)&&(teacher.document.getElementById('securitySignals').textContent.includes('Recovery')||teacher.document.getElementById('securitySignals').textContent.includes('karant')),
  'quarantined result is present in the main security dashboard');
const malformed=await teacher.verifyText('malformed.txt','SECURE-ANSWERS-V1\n{"payload":"broken"}');
check('S61-R09',malformed.row?.status==='MALFORMED_CIPHERTEXT'&&!Array.isArray(malformed.row?.securityEvents),
  'malformed ciphertext remains separate and does not pretend telemetry exists');
teacher.close();

const failed=checks.filter(x=>x.status!=='PASS');
const evidence={schema:'git-s61-identity-quarantine-source-v1',status:failed.length?'FAIL':'PASS',checks};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s61-identity-quarantine-source.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
assert.equal(failed.length,0,`${failed.length} Sprint 06.1 regression checks failed`);
