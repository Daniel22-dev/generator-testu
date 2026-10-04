// Forensic baseline: generate real artifacts and encrypt forgeries with the public key.
import fs from 'node:fs';
import { w, gdom, configure, build, genDom } from './redteam-harness-utils.mjs';
const findings = [];
const note = (id, observed, detail) => { findings.push({ id, observed, detail }); console.log(id, observed, detail); };
configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D8E4F6',label:'Synthetic B',email:'synthetic-b@example.invalid'}];");
const pkg = await build();
const cfg = JSON.parse(pkg.studentHtml.match(/const CFG=(.*);\nconst STUDENT_VARIANTS=/)[1]);
const x = genDom(pkg.studentHtml);
const v = genDom(pkg.teacherHtml);
try {
  note('F1', {teacherHash:!!cfg.ucitelPinHash,recoveryHash:!!cfg.recoveryCodeHash,teacherMode:pkg.studentHtml.includes('function openTeacherModal')}, 'actual generated student HTML');
  note('code-hashes', {count:(cfg.identityCodeHashes||[]).length}, 'public membership-hash count; a nonzero value enables offline guessing');
  note('F7', pkg.studentHtml.includes('Q1?'), 'questions readable in the public artifact before start');
  note('F6-roster', v.eval('CONFIG.roster.some(r=>!!r.email)'), 'private roster retains email; this does not establish Forms enforcement');
  const now = new Date().toISOString();
  const payload = {v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:'',attemptId:'A-FORGED',identityMode:'oneTimeCode',code:'A7B9C2',student:'A7B9C2',groupKey:'__default',startedAt:'2040-01-01T00:00:00Z',submittedAt:'2000-01-01T00:00:00Z',resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},securityEvents:[],jokerUsed:false,answerChangeStats:{},totalAnswerChanges:0};
  const cipher = await x.encryptPayloadForTeacher(payload);
  const txt = 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,manifestHash:cfg.manifestHash,payload:cipher});
  const outcome = await v.verifyText('synthetic-forgery.txt',txt,{source:'google-forms-csv',formIdentity:'synthetic-b@example.invalid',formTimestamp:now,fullYearCsv:true});
  note('W1-W3b', {classification:outcome.classification,status:outcome.row?.status,pct:outcome.row?.pct,runtimeAuthenticity:outcome.row?.trustAssessment?.runtimeAuthenticity,classificationAuthorization:outcome.row?.trustAssessment?.classificationAuthorization}, 'public-key encrypted forged payload, impossible times, empty telemetry, synthetic wrong Forms email; technical scoring alone is not authenticated acceptance');
  const duplicate = await v.verifyText('duplicate.txt',txt,{source:'google-forms-csv',formIdentity:'synthetic-b@example.invalid',formTimestamp:now,fullYearCsv:true});
  note('duplicate',duplicate.classification,'same ciphertext imported twice');
  fs.mkdirSync('qa-results',{recursive:true});
  fs.writeFileSync(process.env.GIT_REDTEAM_BASELINE_REPORT || 'qa-results/redteam-e0-baseline.json',JSON.stringify({syntheticOnly:true,findings},null,2)+'\n');
} finally { x.close(); v.close(); gdom.window.close(); }
