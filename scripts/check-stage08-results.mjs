/* Stage08B portable teacher-side result ledger regression.
   This is NOT a substitute for full signed-access or GIT P5 browser certification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPrivateMapping,validatePrivateMapping,parseVerifierResultsCsv,planResultsImport,
  createMemoryResultAdapter,createResultLedger,validateResultRecord} from '../src/features/group-result-ledger.js';
let checks=0;
function ok(fn){fn();checks++;}
async function asyncOk(fn){await fn();checks++;}
const ID='grp_123456789012',M1='mem_111111111111',M2='mem_222222222222',M3='mem_333333333333';
const members=[{memberId:M1,code:'ABCDEF'},{memberId:M2,code:'GHJKMN'},{memberId:M3,code:'NPQRST'}];
const map=createPrivateMapping({link:{groupId:ID,revision:12},participants:members,testId:'GIT-TEST-2026-001',createdAt:'2026-10-26T17:00:00.000Z'});
ok(()=>assert.deepEqual(Object.keys(map),['schema','groupId','revision','testId','createdAt','entries']));
ok(()=>assert.equal(map.entries.length,3));
ok(()=>assert.ok(!JSON.stringify(map).match(/email|name|grade|password|studentAnswer/i)));
ok(()=>assert.deepEqual(validatePrivateMapping(map),map));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,privateEmail:'a@example.org'}),/PRIVATE_MAPPING_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,groupId:'group-local'}),/PRIVATE_MAPPING_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,revision:0}),/PRIVATE_MAPPING_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,entries:[members[0],members[0]]}),/PRIVATE_MAPPING_ENTRY_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,entries:[members[0],{memberId:M2,code:'ABCDEF'}]}),/PRIVATE_MAPPING_ENTRY_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,entries:[{...members[0],schoolEmail:'a@example.org'}]}),/PRIVATE_MAPPING_ENTRY_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,entries:[{...members[0],name:'Alice'}]}),/PRIVATE_MAPPING_ENTRY_INVALID/));
ok(()=>assert.throws(()=>validatePrivateMapping({...map,entries:[{...members[0],code:'BAD001'}]}),/PRIVATE_MAPPING_ENTRY_INVALID/));
ok(()=>assert.throws(()=>createPrivateMapping({link:{groupId:ID,revision:1},testId:'',participants:members}),/PRIVATE_MAPPING_INVALID/));
const header=['student','forms_email','student_code','points','total','percentage','grade','classification_status','joker_used','attempt_id','security_signal_count','extra'];
const csvRows=[
  ['Alice Novák','alice@example.org','ABCDEF','18','20','90','1','SCORABLE','NO','att-100','1','security note'],
  ['Boris Svoboda','boris@example.org','GHJKMN','9','20','45','4','REVIEW_REQUIRED','YES','att-200','0','quoted; note'],
];
const escape=(v)=>'"'+String(v).replace(/"/g,'""')+'"';
const csv=(rows=csvRows)=>[header,...rows].map(r=>r.map(escape).join(';')).join('\r\n')+'\r\n';
ok(()=>assert.equal(parseVerifierResultsCsv(csv()).length,2));
ok(()=>assert.equal(parseVerifierResultsCsv('\ufeff'+csv())[0].code,'ABCDEF'));
ok(()=>assert.equal(parseVerifierResultsCsv(csv())[1].jokerUsed,true));
ok(()=>assert.equal(parseVerifierResultsCsv(csv())[1].securitySignalCount,0));
ok(()=>assert.equal(parseVerifierResultsCsv(csv([['Alice, "S"\nNovák','a@example.org','ABCDEF','18','20','90','1','SCORABLE','NO','att-100','1','note']]))[0].attemptId,'att-100'));
ok(()=>assert.throws(()=>parseVerifierResultsCsv('garbage'),/VERIFIER_CSV_SIZE_INVALID|VERIFIER_CSV_EMPTY|VERIFIER_CSV_HEADERS_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([csvRows[0],csvRows[0]])),/VERIFIER_CSV_IDENTITY_CONFLICT/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','IIIIII','18','20','90','1','OK','NO','att-33','0','']])),/VERIFIER_CSV_IDENTITY_CONFLICT/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','ABCDEF','21','20','105','1','OK','NO','att-33','0','']])),/VERIFIER_CSV_SCORE_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','ABCDEF','18','20','80','1','OK','NO','att-33','0','']])),/VERIFIER_CSV_SCORE_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','ABCDEF','','20','0','5','OK','NO','att-33','0','']])),/VERIFIER_CSV_SCORE_INVALID/));

ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','ABCDEF','18','20','90','1','OK','NO','att-33','-1','']])),/VERIFIER_CSV_SCORE_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([['x','a','ABCDEF','18','20','90','1','OK','PERHAPS','att-33','0','']])),/VERIFIER_CSV_STATUS_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csvRows.map(r=>r.join(';')).join('\n')),/VERIFIER_CSV_HEADERS_INVALID/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(csv([csvRows[0].slice(0,-1)])),/VERIFIER_CSV_COLUMN_COUNT/));
ok(()=>assert.throws(()=>parseVerifierResultsCsv(header.join(';')+'\n"unterminated'),/VERIFIER_CSV_QUOTING_INVALID/));
const plan=planResultsImport({mapping:map,csv:csv(),recordedAt:'2026-10-26T17:04:00.000Z'});
ok(()=>assert.deepEqual(plan.records.map(r=>r.memberId),[M1,M2]));
ok(()=>assert.equal(plan.missingCodes,1));
ok(()=>assert.equal(plan.records[0].groupRevision,12));
ok(()=>assert.equal(plan.records[0].testId,map.testId));
ok(()=>assert.equal(plan.records[1].jokerUsed,true));
ok(()=>assert.equal(plan.records[0].source,'teacher-acknowledged-verifier-csv'));
ok(()=>assert.ok(!JSON.stringify(plan.records).includes('alice@')));
ok(()=>assert.ok(!JSON.stringify(plan.records).includes('ABCDEF')));
ok(()=>assert.deepEqual(validateResultRecord(plan.records[0]),plan.records[0]));
ok(()=>assert.throws(()=>planResultsImport({mapping:map,csv:csv([['x','x','ZZZZZZ','18','20','90','1','OK','NO','att-2','0','']])}),/VERIFIER_CSV_CODE_NOT_IN_MAPPING/));
const adapter=createMemoryResultAdapter(),ledger=createResultLedger(adapter);
ok(()=>assert.equal(adapter.contract,'ghrab-git-result-adapter-v1'));
ok(()=>assert.throws(()=>createResultLedger({contract:'invalid'}),/PRIVATE_ADAPTER_CONTRACT_INVALID/));
await asyncOk(async()=>await assert.rejects(()=>ledger.importResults({mapping:map,csv:csv(),teacherAcknowledged:false}),/PRIVATE_TEACHER_ACK_REQUIRED/));
let result=await ledger.importResults({mapping:map,csv:csv(),teacherAcknowledged:true,recordedAt:'2026-10-26T17:04:00.000Z'});
ok(()=>assert.equal(result.inserted,2));
result=await ledger.importResults({mapping:map,csv:csv(),teacherAcknowledged:true,recordedAt:'2026-10-27T17:04:00.000Z'});
ok(()=>assert.equal(result.unchanged,2));
await asyncOk(async()=>{const rows=await ledger.listGroupResults(ID);assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.memberId),[M1,M2]);});
const badCsv=csv([['x','x','ABCDEF','15','20','75','3','SCORABLE','NO','att-100','1','']]);
await asyncOk(async()=>await assert.rejects(()=>ledger.importResults({mapping:map,csv:badCsv,teacherAcknowledged:true}),/PRIVATE_ATTEMPT_CONFLICT/));
await asyncOk(async()=>assert.equal((await ledger.listGroupResults(ID)).length,2));
const staleCsv=csv([['Boris archived','a','GHJKMN','10','20','50','3','SCORABLE','NO','att-201','0','']]);
await asyncOk(async()=>{await ledger.importResults({mapping:map,csv:staleCsv,teacherAcknowledged:true});assert.equal((await ledger.listGroupResults(ID)).length,3);});
const archive=await ledger.exportPrivateArchive(ID);
ok(()=>assert.equal(archive.schema,'ghrab-git-private-history-v1'));
ok(()=>assert.equal(archive.records.length,3));
await asyncOk(async()=>await assert.rejects(()=>ledger.importPrivateArchive(archive,false),/PRIVATE_TEACHER_ACK_REQUIRED/));
const newAdapter=createMemoryResultAdapter(),newLedger=createResultLedger(newAdapter);
result=await newLedger.importPrivateArchive(archive,true);
ok(()=>assert.equal(result.inserted,3));
await asyncOk(async()=>assert.ok((await newLedger.listGroupResults(ID)).every(r=>r.source==='teacher-archive-import')));
await asyncOk(async()=>{await newAdapter.clear();assert.equal((await newLedger.listGroupResults(ID)).length,0);});
await asyncOk(async()=>await assert.rejects(()=>newLedger.importPrivateArchive({...archive,records:[{...archive.records[0],schoolEmail:'abc@example.org'}]},true),/PRIVATE_RESULT_INVALID/));
await asyncOk(async()=>await assert.rejects(()=>newLedger.importPrivateArchive({...archive,records:[{...archive.records[0],source:'forged-admin-certified'}]},true),/PRIVATE_RESULT_INVALID/));
const cappedAdapter=createMemoryResultAdapter();
const prototype=archive.records[0];
const largeBatch=Array.from({length:10000},(_,i)=>({...prototype,
  attemptId:'test-cap-'+String(i+1).padStart(6,'0')}));
await asyncOk(async()=>{const response=await cappedAdapter.commitBatch(largeBatch);assert.equal(response.inserted,10000);});
await asyncOk(async()=>await assert.rejects(()=>cappedAdapter.commitBatch([{...prototype,attemptId:'test-cap-10001'}]),/PRIVATE_LEDGER_CAPACITY_EXCEEDED/));
await asyncOk(async()=>assert.equal((await cappedAdapter.listGroupResults(ID)).length,10000));
await cappedAdapter.clear();
const source=fs.readFileSync('src/features/group-result-ledger.js','utf8');
const bridge=fs.readFileSync('src/js/18-central-groups.js','utf8');
const ui=fs.readFileSync('src/features/central-results.js','utf8');
// Lazy browser module is deployed to /features/; resolve sibling ledger there.
assert.ok(ui.includes("import('./group-result-ledger.js')"),'Evidence must import its sibling ledger with the correct relative path');
assert.ok(!ui.includes("import('./features/group-result-ledger.js')"),'Reject mistaken double /features/ prefix');
const lab=fs.readFileSync('src/js/10-testlab.js','utf8');
const shell=fs.readFileSync('src/shell.html','utf8');
const access=fs.readFileSync('src/js/16-access.js','utf8');
ok(()=>assert.ok(!/\blocalStorage\b/.test(source+ui+bridge.replace(/Studio localStorage/,'Studio storage'))));
ok(()=>assert.ok(!/\bfetch\s*\(|\bsendBeacon\s*\(|\bXMLHttpRequest\b|\.postMessage\s*\(/.test(source+ui+bridge)));
ok(()=>assert.ok(!/ghrab-material-v1|ghrab\.handoff|teacherPin|recoveryCode|studentAnswers|answerKey/.test(source+ui+bridge)));
ok(()=>assert.ok(!/\.getRosterProjection\s*\(/.test(source+ui+bridge)));
ok(()=>assert.ok(bridge.includes("load('centralResults','./features/central-results.js')")));
ok(()=>assert.ok(bridge.includes('getPrivateCodeBindings')&&bridge.includes('JSON.stringify(sealed)!==JSON.stringify(rosterForVerifier())')));
ok(()=>assert.ok(lab.includes("function rosterForVerifier(){return rosterEntries.map(e=>({code:e.code,label:e.label,email:e.email}));}")));
ok(()=>assert.ok(shell.includes('GHRAB_GENERATOR_GROUPS.openResults()')));
ok(()=>assert.ok(access.includes('GHRAB_GENERATOR_GROUPS?.clearPrivateState?.()')));
console.log(JSON.stringify({suite:'GIT Stage08B private ledger',passed:checks,realSignedBrowser:'NOT_RUN',fullGITP5:'NOT_RUN'},null,2));
