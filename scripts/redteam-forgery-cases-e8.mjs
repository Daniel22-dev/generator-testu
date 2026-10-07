// Independent hostile inputs; expected codes and effects are explicit per case.
import {clone} from './redteam-forgery-fixtures-e8.mjs';
export const cases=[];
function p(id,group,code,mutate,fixture='default'){cases.push({id,group,fixture,expect:'REJECTED',code,build:ctx=>{mutate(ctx.p,ctx);return ctx;}});}
function outer(id,code,mutate){cases.push({id,group:'envelope',fixture:'default',expect:'REJECTED',code,build:ctx=>{ctx.outer=mutate;return ctx;}});}
function raw(id,code,mutate){cases.push({id,group:'parser',fixture:'default',expect:'REJECTED',code,build:ctx=>{ctx.rawInner=mutate(JSON.stringify(ctx.p));return ctx;}});}
function anchor(id,code,mutate){cases.push({id,group:'anchors',fixture:'default',expect:'REJECTED',code,build:ctx=>{mutate(ctx);return ctx;}});}
p('schema-version','schema','schema.version',x=>{x.v=2;});
p('unknown-server-claim','schema','schema.fields',x=>{x.serverVerified=true;});
p('unknown-trust-object','schema','schema.fields',x=>{x.trustAssessment={runtimeAuthenticity:'PREVENTED'};});
p('unknown-total-score','schema','schema.fields',x=>{x.earned=999;x.total=999;});
p('empty-attempt','schema','schema.identity',x=>{x.attemptId='';});
p('unsafe-attempt','schema','schema.attempt',x=>{x.attemptId='../other';});
p('missing-student','schema','schema.identity',x=>{delete x.student;});
p('identity-mode-invalid','schema','schema.identity',x=>{x.identityMode='admin';});
p('code-shape','schema','schema.code',x=>{x.code='ABCD';});
p('student-code-disagree','identity','schema.code',x=>{x.student='D4E6F8';});
p('unknown-roster-code','identity','binding.identity-variant',x=>{x.student=x.code='ZZZZZZ';});
p('identity-mode-rebound','identity','binding.identity-variant',x=>{x.identityMode='name';x.code='';x.student='Synthetic A';});
p('foreign-test-inner','binding','binding.test',x=>{x.testId='OTHER-TEST';});
p('foreign-manifest-inner','binding','binding.manifest',x=>{x.manifestHash='other-manifest';});
p('hash-invalid-shape','binding','schema.hash',x=>{x.studentHtmlSha256='not-sha';});
p('hash-foreign-reference','binding','binding.hash',x=>{x.studentHtmlSha256='a'.repeat(64);});
p('foreign-variant-missing','variant','binding.variant',x=>{x.groupKey='unknown';});
p('foreign-existing-variant','variant','binding.identity-variant',x=>{x.groupKey='g2';},'variant');
p('default-alias-not-assigned','variant','binding.identity-variant',x=>{x.groupKey='__default';},'variant');
p('identity-rebound-variant','variant','binding.identity-variant',x=>{x.student=x.code='D4E6F8';},'variant');
anchor('forms-wrong-account','anchors.identity-mismatch',c=>{c.source.formIdentity='synthetic-b@example.invalid';});
anchor('complete-identity-rebinding','anchors.identity-mismatch',c=>{c.p.student=c.p.code='D4E6F8';});
anchor('forms-foreign-domain','anchors.email',c=>{c.source.formIdentity='synthetic-a@other.invalid';});
anchor('forms-email-missing','anchors.email',c=>{c.source.formIdentity='';});
anchor('forms-email-number','anchors.source-shape',c=>{c.source.formIdentity=7;});
anchor('forms-email-oversize','anchors.source-shape',c=>{c.source.formIdentity='synthetic-a@example.invalid'+' '.repeat(300)+'junk';});
// 7.1.97: precise parser codes (format / ambiguous DST); still rejected before scoring.
anchor('forms-time-missing','anchors.timestamp-format',c=>{c.source.formTimestamp='';});
anchor('forms-time-invalid','anchors.timestamp-format',c=>{c.source.formTimestamp='not-a-time';});
anchor('forms-before-publication','anchors.timestamp',c=>{c.source.formTimestamp='2026-10-04T11:58:00Z';});
anchor('forms-policy-missing','anchors.missing-policy',c=>{c.missingPolicy=true;});
anchor('forms-dst-ambiguous','anchors.timestamp-ambiguous',c=>{c.source.formTimestamp='25.10.2026 02:30:00';});
anchor('forms-dst-nonexistent','anchors.timestamp-ambiguous',c=>{c.source.formTimestamp='29.3.2026 02:30:00';});
// 7.1.97 (F4): typed Forms metadata is untrusted convenience; a mismatch is a visible warning, never a rejection or a grade change.
function meta(id,mutate){cases.push({id,group:'anchors',fixture:'default',expect:'METADATA_WARNING',build:ctx=>{mutate(ctx);return ctx;}});}
meta('forms-metadata-id',c=>{c.source.formTestId='OTHER';});
meta('forms-metadata-title',c=>{c.source.formTestName='OTHER';});
meta('forms-metadata-group',c=>{c.source.formGroup='OTHER';});
p('end-before-start','time','time.order',x=>{x.submittedAt='2026-10-04T11:59:59Z';});
p('invalid-calendar','time','time.order',x=>{x.startedAt='2026-02-30T12:00:00Z';});
p('no-timezone','time','time.order',x=>{x.startedAt='2026-10-04 12:00:00';});
p('start-before-publication','time','anchors.time-window',x=>{x.startedAt=x.securityEvents[0].t='2026-10-04T11:58:59Z';});
p('end-after-forms','time','anchors.time-window',x=>{x.submittedAt='2026-10-04T12:36:01Z';});
p('event-after-end','time','time.event',x=>{x.securityEvents.push({type:'locked',t:'2026-10-04T12:35:01Z'});});
p('event-before-start','time','time.event',x=>{x.securityEvents.push({type:'locked',t:'2026-10-04T11:59:59Z'});});
p('empty-telemetry','telemetry','schema.telemetry',x=>{x.securityEvents=[];});
p('missing-telemetry','telemetry','schema.telemetry',x=>{delete x.securityEvents;});
p('object-telemetry','telemetry','schema.telemetry',x=>{x.securityEvents={};});
p('telemetry-over-limit','telemetry','schema.telemetry',x=>{x.securityEvents=Array.from({length:2049},()=>clone(x.securityEvents[0]));});
p('event-nested-data','telemetry','schema.event',x=>{x.securityEvents[0].nested={x:1};});
p('event-missing-time','telemetry','time.event',x=>{delete x.securityEvents[0].t;});
p('missing-attempt-start','semantics','telemetry.start',x=>{x.securityEvents=[{type:'locked',t:x.startedAt}];});
p('duplicated-attempt-start','semantics','telemetry.start',x=>{x.securityEvents.push(clone(x.securityEvents[0]));});
p('attempt-start-wrong-time','semantics','telemetry.start',x=>{x.securityEvents[0].t='2026-10-04T12:01:00Z';});
p('attempt-start-wrong-id','semantics','telemetry.start',x=>{x.securityEvents[0].detail='OTHER';});
const split=(x,patch)=>x.securityEvents.push({type:'split-window',t:x.submittedAt,smallMs:4000,totalMs:12000,pct:33,...patch});
p('split-small-exceeds-total','semantics','telemetry.split',x=>split(x,{smallMs:14000}));
p('split-percent-disagrees','semantics','telemetry.split',x=>split(x,{pct:100}));
p('split-zero-total','semantics','telemetry.split',x=>split(x,{totalMs:0}));
p('split-missing-numbers','semantics','telemetry.split',x=>{x.securityEvents.push({type:'split-window',t:x.submittedAt});});
p('changes-negative','answers','schema.changes',x=>{x.answerChangeStats={'0_0':-1};x.totalAnswerChanges=-1;});
p('changes-total-disagrees','answers','schema.changes',x=>{x.answerChangeStats={'0_0':2};x.totalAnswerChanges=3;});
p('changes-unknown-question','answers','schema.changes',x=>{x.answerChangeStats={'99_0':1};x.totalAnswerChanges=1;});
p('answers-array','answers','schema.answers',x=>{x.resp=[];});
p('answers-unknown-question','answers','schema.answer',x=>{x.resp['99_0']=1;});
p('answer-out-of-range','answers','schema.answer',x=>{x.resp['0_0']=999;});
p('answer-nested-object','answers','schema.answer',x=>{x.resp['0_0']={answer:1};});
p('answer-string-index','answers','schema.answer',x=>{x.resp['0_0']='1';});
p('score-out-of-range','score','schema.score',x=>{x.pct=101;});
p('grade-out-of-range','score','schema.score',x=>{x.grade=0;});
p('joker-disabled-in-private-config','joker','schema.joker',x=>{x.jokerUsed=true;x.jokerSelectedAt='2026-10-04T11:59:30Z';x.securityEvents.push({type:'joker-used',t:x.jokerSelectedAt});});
p('joker-selection-after-start','joker','schema.joker',x=>{x.jokerUsed=true;x.jokerSelectedAt='2026-10-04T12:01:00Z';},'joker');
p('joker-time-without-choice','joker','schema.joker',x=>{x.jokerSelectedAt='2026-10-04T11:59:30Z';});
p('joker-event-without-choice','semantics','telemetry.joker',x=>{x.securityEvents.push({type:'joker-used',t:x.startedAt});});
p('joker-choice-without-event','semantics','telemetry.joker',x=>{x.jokerUsed=true;x.jokerSelectedAt='2026-10-04T11:59:30Z';},'joker');
p('joker-event-wrong-time','semantics','time.event',x=>{x.jokerUsed=true;x.jokerSelectedAt='2026-10-04T11:59:30Z';x.securityEvents.push({type:'joker-used',t:'2026-10-04T11:59:31Z'});},'joker');
raw('inner-duplicate-key','schema.duplicate-key',s=>s.replace('"v":1','"v":0,"v":1'));
raw('inner-escaped-duplicate','schema.duplicate-key',s=>s.replace('"v":1','"v":0,"\\u0076":1'));
raw('inner-prototype-key','schema.prototype',s=>s.replace('"resp":{','"resp":{"__proto__":{},'));
raw('inner-depth-limit','schema.limit',s=>s.replace('"resp":{','"extra":'+('['.repeat(13)+'0'+']'.repeat(13))+',"resp":{'));
outer('outer-foreign-test','binding.test',x=>{x.testId='OTHER';return x;});
outer('outer-foreign-manifest','binding.manifest',x=>{x.manifestHash='OTHER';return x;});
outer('outer-foreign-hash','binding.hash',x=>{x.studentHtmlSha256='a'.repeat(64);return x;});
outer('outer-unknown-field','envelope.fields',x=>{x.serverVerified=true;return x;});
outer('outer-plain-fallback','envelope.crypto',x=>{x.payload.mode='plain-b64';return x;});
outer('outer-algorithm','envelope.crypto',x=>{x.payload.alg='AES-CBC';return x;});
outer('outer-bad-base64','envelope.base64',x=>{x.payload.data='!';return x;});
outer('outer-short-iv','envelope.crypto-size',x=>{x.payload.iv='AA';return x;});
outer('outer-short-key','envelope.crypto-size',x=>{x.payload.key='AA';return x;});
outer('ciphertext-gcm-tamper','crypto.parse-decrypt',x=>{const b=Buffer.from(x.payload.data,'base64url');b[0]^=1;x.payload.data=b.toString('base64url');return x;});
cases.push({id:'invalid-utf8',group:'parser',fixture:'default',expect:'REJECTED',code:'crypto.parse-decrypt',build:c=>({...c,rawInner:new Uint8Array([0xc3,0x28])})});
cases.push({id:'outer-duplicate-key',group:'parser',fixture:'default',expect:'REJECTED',code:'schema.duplicate-key',build:c=>({...c,rawOuter:s=>s.replace('"testId":','"testId":"ignored","testId":')})});
cases.push({id:'oversize-txt',group:'parser',fixture:'default',expect:'REJECTED',code:'envelope.size',build:c=>({...c,rawOuter:()=> ' '.repeat(2097153)})});
for(const [id,build,pct] of [
  ['valid-correct',c=>c,100],['valid-unanswered',c=>{c.p.resp={};return c;},0],
  ['client-score-inflated',c=>{c.p.resp={};c.p.pct=100;c.p.grade=1;return c;},0],
  ['client-score-deflated',c=>{c.p.pct=0;c.p.grade=5;return c;},100],
  ['case-normalized-code',c=>{c.p.student=c.p.code='a7b9c2';return c;},100],
  ['valid-split-summary',c=>{split(c.p,{});return c;},100],
  ['valid-start-detail',c=>{c.p.securityEvents[0].detail=c.p.attemptId;return c;},100],
])cases.push({id,group:'controls',fixture:'default',expect:id.startsWith('client-score')?'RESCORED':'REVIEW_ONLY',pct,build});
cases.push({id:'valid-joker',group:'controls',fixture:'joker',expect:'JOKER_EXCLUDED',pct:100,build:c=>{c.p.jokerUsed=true;c.p.jokerSelectedAt='2026-10-04T11:59:30Z';c.p.securityEvents.push({type:'joker-used',t:c.p.jokerSelectedAt});return c;}});
cases.push({id:'valid-variant-b',group:'controls',fixture:'variant',expect:'REVIEW_ONLY',pct:100,build:c=>{c.p.student=c.p.code='D4E6F8';c.p.groupKey='g2';c.source.formIdentity='synthetic-b@example.invalid';return c;}});
cases.push({id:'missing-forms-diagnostic',group:'limits',fixture:'default',expect:'DIAGNOSTIC_ONLY',pct:100,build:c=>{c.source={};return c;}});
cases.push({id:'consistent-public-key-forgery',group:'limits',fixture:'default',expect:'REVIEW_ONLY',pct:100,build:c=>c});
cases.push({id:'copied-html-hash-forgery',group:'limits',fixture:'default',expect:'REVIEW_ONLY',pct:100,build:c=>{c.p.userAgent='MODIFIED CLIENT copying the expected hash';return c;}});
cases.push({id:'full-year-other-test',group:'routing',fixture:'default',expect:'OTHER_TEST',build:c=>{c.p.testId='OTHER-TEST';c.source.fullYearCsv=true;return c;}});
for(const kind of ['exact-ciphertext','reencrypted-same','score-only-reencrypted','changed-answer-same-attempt','new-attempt-same-identity','same-attempt-other-identity'])cases.push({id:'replay-'+kind,group:'replay',fixture:'default',expect:'REPLAY_REJECTED',sequence:kind});
for(const c of cases)c.categories=c.expect==='REJECTED'?['DETECTED','HARDENED']:c.expect==='REPLAY_REJECTED'?['DETECTED','BEST-EFFORT']:['RESCORED','JOKER_EXCLUDED','DIAGNOSTIC_ONLY','OTHER_TEST'].includes(c.expect)?['HARDENED']:c.group==='limits'?['CLIENT-CONTROLLED','ARCHITECTURAL LIMIT']:['CLIENT-CONTROLLED'];
