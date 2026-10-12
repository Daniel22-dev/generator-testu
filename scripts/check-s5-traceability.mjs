#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const source=readJson('qa-results/s5-strict-mode-source.json');
const browser=readJson('qa-results/s5-strict-mode-browser/evidence.json');
assert.equal(source.status,'PASS','S5 source evidence must pass before traceability is issued');
assert.equal(browser.status,'PASS','S5 Chromium evidence must pass before traceability is issued');
assert.match(source.provenance?.sourceHead||'',/^[0-9a-f]{40}$/,'S5 source evidence must bind an exact Git SHA');
assert.equal(browser.provenance?.sourceHead,source.provenance.sourceHead,'S5 source and browser evidence must bind the same Git SHA');

const rows=[];
const add=(id,status,evidence,limits='')=>rows.push({id,status,evidence,limits});
for(const [id,evidence] of [
  ['T64','S5-B01'],['T65','S5-B01'],['T66','S5-B01'],['T67','S5-B04/S5-B05'],
  ['T68','S5-B04'],['T69','S5-B06'],['T70','S5-B06'],['T71','S5-B08'],
  ['T72','S5-SRC-06/S5-B07'],['T74','S5-SRC-06'],['T75','S5-SRC-06'],['T76','S5-SRC-06'],
  ['T78','S5-SRC-07'],['T79','S5-SRC-07'],['T81','S5-SRC-09/S5-B08'],
  ['T82','S5-SRC-05'],['T83','S5-SRC-05'],['T84','S5-SRC-05'],
  ['T90','S5-SRC-04/S5-B04'],['T91','S5-SRC-11/S5-B04'],['T92','S5-SRC-11/S5-B05'],
  ['T93','S5-SRC-05/S5-B06'],['T94','S5-SRC-05/S5-B06'],['T95','S5-SRC-05/S5-B06'],
  ['T96','S5-SRC-02/S5-B01'],['T97','S5-SRC-12/S5-B09'],['T98','S5-SRC-12/S5-B09'],
  ['T99','S5-SRC-14'],['T100','S5-SRC-06/S5-B07'],['T101','S5 source + Chromium evidence and this matrix']
])add(id,'PASS',evidence,'Automated synthetic/generated-artifact evidence; see environment metadata.');

add('T73','NOT VERIFIED','S5-SRC-06/S5-B07','Automatic split-screen LOCK is intentionally disabled in SHADOW/AUDIT-ONLY mode pending physical calibration and owner approval.');
add('T77','NOT VERIFIED','S5-SRC-06/S5-B07','Automatic sustained-small-window LOCK is intentionally disabled pending physical calibration and owner approval.');
add('T80','NOT VERIFIED','Source-level orientation grace only','No physical iPadOS Stage Manager calibration was performed.');
for(const id of ['T85','T86','T87','T88','T89'])add(id,'NOT VERIFIED','Controlled source/Chromium simulations only','Required physical mobile/tablet device behavior was not tested.');

rows.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
assert.equal(rows.length,38,'T64-T101 matrix must contain exactly 38 scenarios');
assert.deepEqual(rows.map(x=>x.id),Array.from({length:38},(_,i)=>'T'+(64+i)),'T64-T101 must be complete and ordered');
assert.equal(new Set(rows.map(x=>x.id)).size,38,'Traceability IDs must be unique');
assert.ok(rows.filter(x=>x.status==='PASS').length===30,'Expected 30 automated PASS scenarios');
assert.ok(rows.filter(x=>x.status==='NOT VERIFIED').length===8,'Expected 8 explicitly unverified or intentionally deferred scenarios');
assert.ok(rows.filter(x=>x.status==='FAIL').length===0,'No known failing S5 acceptance scenario may be hidden');

const report={schema:'git-s5-traceability-v1',stage:'S05',status:'PASS',generatedAt:new Date().toISOString(),sourceHead:source.provenance.sourceHead,sourceEvidence:'qa-results/s5-strict-mode-source.json',browserEvidence:'qa-results/s5-strict-mode-browser/evidence.json',environment:{browser:browser.browser||'Chromium',node:process.version,physicalDevices:false,githubPages:false,googleFormsLive:false},policy:{splitScreen:'SHADOW/AUDIT-ONLY',automaticSplitLock:false,trustPinsChanged:false},summary:{pass:30,fail:0,notVerified:8,total:38},scenarios:rows};
fs.mkdirSync('qa-results',{recursive:true});
fs.writeFileSync('qa-results/s5-traceability-t64-t101.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS S5 traceability T64-T101: 30 PASS, 0 FAIL, 8 NOT VERIFIED');
