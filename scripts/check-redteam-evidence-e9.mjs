import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const reports=[
  ...['e1-isolation','e1-browser','e2-trust','e2-browser','e3-verifier','e3-browser','e4-faults','e4-browser','e5-runtime','e5-browser','e6-publication','e7-mobile-protocol','e7-recorder','e8-forgery','e8-retention','e8-browser','e9-ci-contract','e9-negative','e9-restart-browser'].map(x=>'qa-results/redteam-'+x+'.json'),
  'qa-results/security-behavior-r3.json','qa-results/adversarial-harness-r5.json','qa-results/d7-regressions.json','qa-results/d8-final-audit.json','qa-results/stage3-pdf-runtime/summary.json','qa-results/stage3-pdf-quality/summary.json','qa-results/verifier-ui-runtime/summary.json',
  ...['qa-p3-browser-report','qa-p5-runtime-report','qa-p5-xss-sinks-report','qa-p5-axe-runtime-report','qa-p5-release-report','qa-p5-acceptance-report','quality-report'].map(x=>'dist/'+x+'.json'),
  'audit/evidence/garp27-current/foundation-summary.json',
];
function validate(records,version,startedAt){
  assert.ok(Number.isFinite(Date.parse(startedAt)),'Complete E9 chain start required');
  for(const file of reports){
    const record=records[file];assert.ok(record,'Missing report '+file);assert.ok(record.mtimeMs>=Date.parse(startedAt)-1,'Stale report '+file);
    const d=record.data;
    if(Array.isArray(d)){assert.ok(d.length>0);assert.ok(d.every(x=>x.status==='PASS'),'Failed adversarial list '+file);continue;}
    for(const key of ['version','appVersion'])if(d[key])assert.equal(d[key],version,'Wrong '+key+' '+file);
    if(d.status)assert.ok(['PASS','passed','FOUNDATION_PASS_LIVE_NOT_TESTED'].includes(d.status),'Failed report '+file);
    if(d.summary){for(const key of ['failed','blockers','browserExceptions','initFailures','overflows'])if(key in d.summary)assert.equal(d.summary[key],0,'Failure '+file+' '+key);}
  }
  const get=name=>records['qa-results/redteam-'+name+'.json'].data;
  const e8=get('e8-forgery');assert.equal(e8.caseCount,108);assert.equal(e8.negativeControls,108);assert.equal(e8.cases.length,108);assert.equal(e8.rejections,89);assert.equal(e8.replaySequences,6);assert.equal(e8.controls,13);
  assert.equal(get('e9-negative').controls.length,7);assert.ok(get('e9-negative').controls.every(x=>x.detected&&x.actualExit===1));
  assert.equal(get('e9-ci-contract').negativeControls.length,14);assert.ok(get('e9-ci-contract').negativeControls.every(x=>x.detected));
  const native=get('e9-restart-browser');assert.equal(native.checks.length,12);assert.ok(native.checks.every(x=>x.status==='PASS'&&x.originPreserved&&x.deadlinePreserved&&x.answerPreserved));assert.equal(native.negativeControls.length,2);assert.ok(native.negativeControls.every(x=>x.detected));
  for(const name of ['e7-mobile-protocol','e7-recorder']){assert.equal(get(name).physicalDevicesTested,false);assert.equal(get(name).protocolVersion,'7.1.83');}
  assert.equal(get('e7-mobile-protocol').mobileStageStatus,'ANALYZED / NOT TESTED');
  const f=records['audit/evidence/garp27-current/foundation-summary.json'].data;assert.deepEqual(f.summary,{total:12,passed:12,failed:0});assert.equal(f.liveStatus,'NOT_TESTED');
  if(process.env.GITHUB_SHA)assert.deepEqual(f.sourceIdentity,{value:process.env.GITHUB_SHA,kind:'git-commit'});
  const q=records['dist/quality-report.json'].data;assert.equal(q.budget.entryCriticalBytes,1770000);assert.ok(q.metrics.entryCriticalBytes<=q.budget.entryCriticalBytes);assert.equal(q.summary.failed,0);
}
const version=JSON.parse(fs.readFileSync('package.json')).version,startedAt=process.env.GIT_REDTEAM_E9_RUN_STARTED_AT;
const records=Object.fromEntries(reports.map(file=>[file,{data:JSON.parse(fs.readFileSync(file)),mtimeMs:fs.statSync(file).mtimeMs,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}]));
validate(records,version,startedAt);
const mutations=[
  ['missing-report',x=>delete x['dist/qa-p5-release-report.json']],
  ['stale-report',x=>x['qa-results/redteam-e8-forgery.json'].mtimeMs=0],
  ['wrong-version',x=>x['qa-results/redteam-e8-forgery.json'].data.version='7.1.84'],
  ['failed-VM',x=>x['qa-results/redteam-e3-verifier.json'].data.status='FAIL'],
  ['missing-forgery-negative',x=>x['qa-results/redteam-e8-forgery.json'].data.negativeControls=107],
  ['failed-export-negative',x=>x['qa-results/redteam-e9-negative.json'].data.controls[0].detected=false],
  ['partial-native-matrix',x=>x['qa-results/redteam-e9-restart-browser.json'].data.checks.pop()],
  ['invented-mobile-proof',x=>x['qa-results/redteam-e7-mobile-protocol.json'].data.physicalDevicesTested=true],
  ['failed-adversarial-list',x=>x['qa-results/adversarial-harness-r5.json'].data[0].status='ERROR'],
  ['increased-budget',x=>x['dist/quality-report.json'].data.budget.entryCriticalBytes=2000000],
  ['failed-foundation',x=>x['audit/evidence/garp27-current/foundation-summary.json'].data.summary.failed=1],
];
for(const [id,mutate] of mutations){const broken=structuredClone(records);mutate(broken);assert.throws(()=>validate(broken,version,startedAt),{name:'AssertionError'},id);}
const report={stage:'E9',version,status:'PASS',startedAt,completedAt:new Date().toISOString(),scope:'Complete current-version process chain, report admission and SHA256 binding; local execution is not remote CI',reportCount:reports.length,reports:reports.map(file=>({file,sha256:records[file].sha256})),negativeControls:mutations.map(([id])=>({id,detected:true})),physicalMobile:'ANALYZED / NOT TESTED',releaseReadiness:'NOT READY – BLOCKING ISSUE'};
fs.writeFileSync('qa-results/redteam-e9-evidence.json',JSON.stringify(report,null,2)+'\n');console.log('PASS E9 evidence admission:',reports.length,'reports,',mutations.length,'negative controls');
