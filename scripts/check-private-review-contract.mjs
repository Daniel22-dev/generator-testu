// Synthetic offline regression of private review properties.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({console,Intl,TextEncoder,CONFIG:{cas:40,identityMode:'oneTimeCode',roster:[{code:'ABC234',email:'synthetic@example.invalid'}],diffGroups:[]},$:()=>null,afterResultsChanged(){},renderFormsImportSummary(){},RESULTS:[],ATTEMPT_DECISIONS:new Map(),LAST_FORMS_IMPORT:null});
for(const [f,symbol] of [['13ed-secure-verifier-validation.js','SECURE_VERIFIER_VALIDATION_JS'],['13ee-secure-verifier-anchors.js','SECURE_VERIFIER_ANCHORS_JS'],['13eg-secure-verifier-history.js','SECURE_VERIFIER_HISTORY_JS']]){vm.runInContext(fs.readFileSync('src/js/'+f,'utf8'),c);vm.runInContext(vm.runInContext(symbol,c),c);}
const p={code:'ABC234',groupKey:'__default',startedAt:'2026-10-05T10:00:00Z',submittedAt:'2026-10-05T10:35:00Z',securityEvents:[{t:'2026-10-05T10:00:00Z',type:'attempt-start'}]};
const policy={schoolDomain:'example.invalid',publishedAt:p.startedAt,csvTimezone:'Europe/Prague',emailHeader:'Email',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true};
c.setFormsAnchorPolicy(policy);
const source={submissionSource:'google-forms-csv',formIdentity:'synthetic@example.invalid',formTimestamp:'2026-10-05T10:42:00Z'};
assert.equal(c.evaluateFormsAnchors(p,source).plannedMinutes,40);
assert.throws(()=>c.evaluateFormsAnchors(p,{...source,formTimestamp:'2026-10-05T10:42:01Z'}),e=>e.validationCode==='anchors.after-deadline');
for(const n of [119,120,121])assert.equal(c.historyCompletenessAssessment({securityEvents:[...Array.from({length:n},()=>({t:p.startedAt,type:'paste-blocked'})),{t:p.submittedAt,type:'attempt-resumed-after-reload'}]}).possiblyIncomplete,n>=120);
assert.match(c.lockHistoryText({securityEvents:[{t:p.startedAt,type:'locked',detail:'Synthetic reason'},{t:p.submittedAt,type:'recovery-unlock',lockReason:'Synthetic reason'}]}),/Zámky: 1; recovery odemčení: 1/);
// The public contract also covers private accommodation and missing anchors.
for(const [factor,extra] of [['125',10],['150',20],['200',40]]){
 c.CONFIG.diffGroups=[{key:'__default',a11y:{time:factor}}];c.setFormsAnchorPolicy({...policy,receptionEndsAt:'2026-10-05T10:42:00Z'});
 const cutoff=Date.parse('2026-10-05T10:42:00Z')+extra*60000;
 assert.equal(c.evaluateFormsAnchors(p,{...source,formTimestamp:new Date(cutoff).toISOString()}).deadlineMs,cutoff);
 assert.throws(()=>c.evaluateFormsAnchors(p,{...source,formTimestamp:new Date(cutoff+1000).toISOString()}),e=>e.validationCode==='anchors.after-deadline');
}
c.CONFIG.diffGroups=[{key:'__default',a11y:{time:'none'}}];assert.equal(c.evaluateFormsAnchors(p,{...source,formTimestamp:'2026-10-05T15:00:00Z'}).deadlineMs,null);
c.CONFIG.diffGroups=[];vm.runInContext('FORMS_ANCHOR_POLICY=null',c);assert.throws(()=>c.evaluateFormsAnchors(p,source),e=>e.validationCode==='anchors.missing-policy');
assert.match(c.formatReceptionTime(Date.parse('2026-10-05T12:00:00Z')),/14:00:00/);assert.match(c.formatReceptionTime(Date.parse('2026-12-05T12:00:00Z')),/13:00:00/);
console.log('PASS private review: deadline-inclusive, private time plan, history-completeness boundaries, lock history visibility');
