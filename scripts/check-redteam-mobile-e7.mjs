import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateMobileMatrix} from './redteam-mobile-contract-e7.mjs';
const read=p=>fs.readFileSync(p,'utf8'),dir='redteam/E7';
const version=JSON.parse(read('package.json')).version,m=JSON.parse(read(dir+'/mobile-matrix.json'));
// The E7 protocol is a historical checkpoint; later candidates keep its provenance.
validateMobileMatrix(m,'7.1.83');
const generatedFiles=['MOBILE-CHECKLIST.html','MOBILE-MATRIX.txt'];
const before=generatedFiles.map(p=>read(dir+'/'+p));
execFileSync(process.execPath,['scripts/build-redteam-mobile-checklist-e7.mjs']);
assert.deepEqual(generatedFiles.map(p=>read(dir+'/'+p)),before,'Checklist must exactly match source matrix/UI');
const guard=read('src/js/13de-secure-student-guard.js');
for (const text of ['},900);','IOS_KBD_EDITABLE_AT<2600','IOS_KBD_VIEWPORT_AT<1800','SOFT_AWAY_MS=8000','SPLIT_RATIO=0.60','SPLIT_SAMPLE_MS=2000','SPLIT_MIN_RUN_MS=10000']) assert.ok(guard.includes(text),'Protocol drift: '+text);
const html=read(dir+'/MOBILE-CHECKLIST.html'),ui=read('scripts/e7-checklist-ui.js'),protocol=read(dir+'/MOBILE-PROTOCOL.txt');
const hash=crypto.createHash('sha256').update(ui).digest('base64');assert.ok(html.includes("script-src 'sha256-"+hash+"'"));
assert.ok(html.includes("connect-src 'none'"));
for (const text of ['ANALYZED / NOT TESTED','NOT READY – BLOCKING ISSUE','MANUALLY REPORTED / NOT VERIFIED']) assert.ok(html.includes(text)&&protocol.includes(text));
assert.ok(!/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\s*[.(]/.test(ui),'Recorder must not send/persist data');
const mutations=[
  ['false-mobile-green',x=>{x.stageStatus='GREEN';}],
  ['false-mobile-pass',x=>{x.stageStatus='PASS';}],
  ['headless-as-physical',x=>{x.physicalDevicesTested=true;}],
  ['missing-ipad',x=>{x.profiles=x.profiles.filter(p=>p.id!=='ipad-safari');}],
  ['executed-before-owner',x=>{x.cases[0].status='PASS';}],
  ['screenshot-prevented',x=>{x.cases[9].categories=['PREVENTED'];}],
  ['second-device-server',x=>{x.cases[37].categories=['SERVER REQUIRED'];}],
  ['no-negative-control',x=>{delete x.cases[4].negativeControl;}],
  ['no-ai-coverage',x=>{x.cases[12].coverage=[];}],
  ['no-reset-boundary',x=>{x.cases[29].categories=['HARDENED'];}],
  ['fake-authentication',x=>{x.reportScope='VERIFIED DEVICE ATTESTATION';}],
  ['threshold-drift',x=>{x.guardParameters.blurDelayMs=50;}],
];
const negativeControls=[];
for (const [id,mutate] of mutations) {const broken=structuredClone(m);mutate(broken);assert.throws(()=>validateMobileMatrix(broken,'7.1.83'),{name:'AssertionError'},id+' must fail');negativeControls.push({id,expectedRejected:true});}
const report={schema:'git-redteam-e7-local-protocol-gate-v1',stage:'E7',version,protocolVersion:m.version,status:'PASS',scope:'Authored protocol consistency and deliberate contract mutations only; not physical mobile evidence',mobileStageStatus:'ANALYZED / NOT TESTED',physicalDevicesTested:false,caseCount:m.cases.length,profileCaseCount:Object.fromEntries(m.profiles.map(p=>[p.id,m.cases.filter(c=>c.profiles.includes(p.id)).length])),negativeControls};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e7-mobile-protocol.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS E7 local protocol gate: 40 cases / 4 profiles / 12 rejected mutations. Physical mobile: ANALYZED / NOT TESTED.');
