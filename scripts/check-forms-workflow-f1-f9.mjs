// Offline, deterministic regression of the actual Forms helpers; no private fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = name => fs.readFileSync('src/js/' + name, 'utf8');
const ctx = vm.createContext({URL, Intl, TextEncoder, TextDecoder, console, DEFAULT: {}, localStorage: {getItem:()=>null}, H: x=>String(x)});
for (const file of ['02-state-persistence.js','02a-forms-workflow-settings.js','13ed-secure-verifier-validation.js','13ee-secure-verifier-anchors.js']) vm.runInContext(read(file),ctx,{filename:file});
const fixture={schoolDomain:'school.example',teacherEmails:['teacher@school.example'],verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:true,csvTimezone:'Europe/Prague',emailHeader:'auto',timestampHeader:'auto',toleranceMinutes:2};
const runtime=vm.createContext({Intl,URL,TextEncoder,CONFIG:{formsAnchorPolicy:fixture},console});
vm.runInContext(vm.runInContext('SECURE_VERIFIER_VALIDATION_JS',ctx),runtime);
vm.runInContext(vm.runInContext('SECURE_VERIFIER_ANCHORS_JS',ctx),runtime);
let passed=0;
function test(name, fn){fn();passed++;console.log('PASS | '+name);}
const cases=[
 ['2026/10/06 2:38:00 pm EEST','2026-10-06T11:38:00.000Z'],
 ['10/6/2026 13:20:00','2026-10-06T11:20:00.000Z'],
 ['6. 10. 2026 13:20:00','2026-10-06T11:20:00.000Z'],
 ['2026-10-06T13:20:00+02:00','2026-10-06T11:20:00.000Z'],
 ['2026/10/06 12:00:00 am UTC','2026-10-06T00:00:00.000Z'],
 ['2026/10/06 12:00:00 pm UTC','2026-10-06T12:00:00.000Z'],
 ['2026/10/06 12:00:00 am GMT+5:30','2026-10-05T18:30:00.000Z'],
 ['25. 10. 2026 2:30:00 CEST','2026-10-25T00:30:00.000Z'],
 ['25. 10. 2026 2:30:00 CET','2026-10-25T01:30:00.000Z'],
 ['29. 3. 2026 1:59:59','2026-03-29T00:59:59.000Z'],
 ['29. 3. 2026 3:00:00','2026-03-29T01:00:00.000Z']
];
for(const [zone,hour] of Object.entries({CET:1,CEST:2,EET:2,EEST:3,WET:0,WEST:1,UTC:0,GMT:0,'GMT-2':-2})) cases.push([`2026/10/06 12:00:00 pm ${zone}`,`2026-10-06T${String(12-hour).padStart(2,'0')}:00:00.000Z`]);
for (const [input,expected] of cases)test('timestamp '+input,()=>assert.equal(new Date(runtime.e3FormsTime(input).lower).toISOString(),expected));
for (const input of ['29. 3. 2026 2:30:00','25. 10. 2026 2:30:00','2026/02/30 1:00:00 pm CET','2026/10/06 13:00:00 pm CET','2026/10/06 2:30:00 pm XYZ','2026/10/06 2:30:00 pm GMT+14:30']) test('reject ambiguous/invalid '+input,()=>assert.throws(()=>runtime.e3FormsTime(input),e=>!!e.validationCode&&e.message.includes(input)));
const url='https://docs.google.com/forms/d/e/SYNTHETIC/viewform?usp=pp_url&entry.1=TESTID&entry.2=NAZEV&entry.3=TRIDA&entry.4=KOD';
let metadata;
test('extract four entry IDs',()=>{metadata=ctx.parseGoogleFormsPrefilledMetadataUrl(url);assert.equal(JSON.stringify(metadata.entries),JSON.stringify({testId:'1',testName:'2',group:'3',submission:'4'}));});
test('legacy placeholder aliases',()=>assert.equal(ctx.parseGoogleFormsPrefilledMetadataUrl(url.replace('TESTID','GIT_TEST_ID').replace('NAZEV','GIT_TEST_NAME').replace('TRIDA','GIT_GROUP')).entries.submission,'4'));
for (const bad of [url+'&entry.1=TESTID',url.replace('entry.2','entry.1'),url.replace('entry.3=TRIDA','entry.3=OTHER'),url.replace('docs.google.com','evil.example'),url.replace('https://','https://user@')])test('reject invalid prefill mapping',()=>assert.throws(()=>ctx.parseGoogleFormsPrefilledMetadataUrl(bad)));
const state={resultMode:'secureOffline',identityMode:'oneTimeCode',__formsSubmissionUrl:metadata.responderUrl,__formsMetadata:metadata,__formsAnchorProfile:fixture,__roster:[{code:'A1B2C3',email:'student@school.example'}]};
test('complete Forms configuration accepted',()=>assert.equal(ctx.requireFormsExportConfiguration(state).schoolDomain,'school.example'));
for(const [name,patch] of [['missing mapping',{__formsMetadata:null}],['missing submission entry',{__formsMetadata:{...metadata,entries:{testId:'1',testName:'2',group:'3'}}}],['missing teacher',{__formsAnchorProfile:{...fixture,teacherEmails:[]}}],['unconfirmed policy',{__formsAnchorProfile:{...fixture,verifiedEmailConfirmed:false}}],['foreign roster email',{__roster:[{code:'A1B2C3',email:'student@other.example'}]}],['duplicate roster',{__roster:[...state.__roster,...state.__roster]}],['other form',{__formsSubmissionUrl:metadata.responderUrl.replace('SYNTHETIC','DIFFERENT')}]]) test('export blocked: '+name,()=>assert.throws(()=>ctx.requireFormsExportConfiguration({...state,...patch})));
for(const kind of ['START','END'])test('teacher '+kind+' link carries marker and metadata',()=>{const link=new URL(ctx.formsLessonLink({testId:'SYNTHETIC',manifestHash:'a'.repeat(64),nazev:'Sample',proKoho:'3.A',formsSubmissionUrl:metadata.responderUrl,formsMetadata:metadata},kind));assert.equal(link.searchParams.get('entry.1'),'SYNTHETIC');assert.ok(link.searchParams.get('entry.4').startsWith('GIT-LESSON-'+kind+'-V1'));assert.equal(link.searchParams.get('usp'),'pp_url');});
test('mobile reading CSS retains justify and hyphenation',()=>{const s=read('13d-secure-student-shell.js');for(const pattern of ['text-align:justify','text-align-last:left','hyphens:auto','overflow-wrap:anywhere','@media(max-width:420px)'])assert.ok(s.includes(pattern));});
test('both generated reading containers carry language',()=>{const s=read('13e-secure-student-runtime.js');assert.ok(s.includes('function readingPassageLang'));assert.ok((s.match(/readingPassageLang\(\)/g)||[]).length>=3);});
const languageFunction=read('13e-secure-student-runtime.js').split('\n').find(line=>line.startsWith('function readingPassageLang'));
for (const [input,expected] of [['en','en'],['es','es'],['cs','cs'],['de','de'],['Angli\u010dtina','en'],['\u0160pan\u011bl\u0161tina','es'],['\u010ce\u0161tina','cs'],['N\u011bm\u010dina','de']]) test('reading language '+input,()=>{const c=vm.createContext({CFG:{jazyk:input}});vm.runInContext(languageFunction,c);assert.equal(c.readingPassageLang(),expected);});
test('Forms submission rules do not mention screenshot',()=>{for(const l of ['cs','en','es','de'])assert.ok(!/screenshot/i.test(ctx.formsSubmissionRule(l)));});
test('trusted Forms timestamp cannot precede teacher START',()=>{const a=read('13ee-secure-verifier-anchors.js');assert.ok(a.includes("e3Require(t.upper>=pub,'anchors.timestamp'"));assert.ok(!a.includes("e3Require(t.upper>=pub-grace,'anchors.timestamp'"));});
vm.runInContext(read('13dh-secure-student-submit.js'),ctx,{filename:'13dh-secure-student-submit.js'});
const openFormSource=vm.runInContext('SECURE_STUDENT_SUBMIT_JS',ctx).split('\n').find(line=>line.startsWith('function openSubmissionForm'));
test('open-form button does not request noopener (spec returns null and the fallback would navigate the test away)',()=>{assert.ok(openFormSource);const call=openFormSource.match(/window\.open\(([^)]*)\)/);assert.ok(call);assert.ok(!/noopener|noreferrer/i.test(call[1]));assert.ok(/opened\.opener\s*=\s*null/.test(openFormSource));});
for(const [label,popup] of [['popup opened',{opener:{}}],['popup blocked',null]])test('open-form '+label+': exactly one Forms destination',()=>{const loc={href:'https://pages.example/test.html'},calls=[];const c=vm.createContext({window:{open:(u,t,f)=>{calls.push([u,t,f]);return popup;},location:loc},formsOpenUrl:()=>'https://docs.google.com/forms/d/e/X/viewform',setFormsSubmitStatus:()=>{},t:(k,d)=>d||k});vm.runInContext(openFormSource+';openSubmissionForm();',c);assert.equal(calls.length,1);if(popup){assert.equal(loc.href,'https://pages.example/test.html');assert.equal(popup.opener,null);}else assert.equal(loc.href,'https://docs.google.com/forms/d/e/X/viewform');});
test('teacher verifier V2 layout is not capped at the legacy 860 px column',()=>{const css=read('13eb-secure-teacher-verifier-v2-ui.js');const m=css.match(/\.wrap\[data-v2-ready\]\{max-width:min\((\d+)px,/);assert.ok(m&&Number(m[1])>=1200);});
console.log('SUMMARY: '+passed+' passed, 0 failed. Unit/source contracts only; browser/Google/physical-device checks are separate.');
