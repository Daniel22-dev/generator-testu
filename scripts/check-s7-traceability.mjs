#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const sourcePath='qa-results/s7-teacher-workflow-source.json',browserPath='qa-results/s7-teacher-workflow-browser/evidence.json';
assert.ok(fs.existsSync(sourcePath),'S7 source evidence must exist before traceability');assert.ok(fs.existsSync(browserPath),'S7 browser evidence must exist before traceability');
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8')),browser=JSON.parse(fs.readFileSync(browserPath,'utf8'));assert.equal(source.status,'PASS');assert.equal(browser.status,'PASS');
const sourceIds=new Set(source.checks.filter(row=>row.status==='PASS').map(row=>row.id)),browserIds=new Set(browser.checks.filter(row=>row.status==='PASS').map(row=>row.id));
const mapping={
  T13:{area:'P1-07',evidence:['S07-FORMS-R11','S07-FORMS-R12'],claim:'complete Sheets / Apps Script installation and per-test setup guide'},
  T14:{area:'P1-08',evidence:['S07-FORMS-R01','S07-FORMS-R02','S07-FORMS-R06'],claim:'only explicitly checked recipients are sent mail'},
  T15:{area:'P1-08',evidence:['S07-FORMS-R03','S07-FORMS-R04','S07-FORMS-R05','S07-FORMS-R07','S07-FORMS-R08','S07-FORMS-R09','S07-FORMS-R10'],claim:'latecomers, deduplication, deliberate resend and uncertain delivery'},
  T16:{area:'P1-07',evidence:['S07-LESSON-R01','S07-LESSON-R02','S07-B09'],claim:'START is derived from a submitted trusted CSV marker, never merely opening Forms'},
  T17:{area:'P1-07',evidence:['S07-LESSON-R01','S07-LESSON-R02','S07-LESSON-R03'],claim:'END and chronology are derived from submitted trusted CSV markers'},
  T18:{area:'P2-09/P2-10',evidence:['S07-UX-R04','S07-B09'],claim:'clear settings, icons, labels and accessible navigation'},
  T19:{area:'P2-11',evidence:['S07-UX-R03','S07-B09'],claim:'teacher preview, integrity panel and four-step output review'},
  T20:{area:'P2-12/P2-15',evidence:['S07-UX-R01','S07-UX-R02','S07-B08'],claim:'truthful indeterminate AI operation status without invented percentages'}
};
const allIds=new Set([...sourceIds,...browserIds]);for(const [id,row] of Object.entries(mapping))for(const evidence of row.evidence)assert.ok(allIds.has(evidence),`${id}: missing ${evidence}`);
const additional=[
  {id:'S07-AF01',area:'P2-15',status:'PASS',evidence:['S07-AF01-R01','S07-AF01-R02','S07-AF01-R03','S07-AF01-R04','S07-AF01-R05','S07-B01','S07-B02','S07-B04','S07-B06','S07-B07'],claim:'rejected non-identity payload has no synthetic points, percentage or grade in memory, UI, archive CSV/HTML/JSON'},
  {id:'split-screen-policy',area:'security-regression',status:'PASS',evidence:['source review'],claim:'Sprint 07 changes do not touch or enable split-screen locking'},
  {id:'T110-server',area:'deferred',status:'NOT VERIFIED',evidence:[],claim:'server-side enforcement remains explicitly deferred'}
];
const report={schema:'git-s7-traceability-v1',stage:'S07',status:'PASS',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows:Object.entries(mapping).map(([id,row])=>({id,status:'PASS',...row})),additional,notVerified:['real Google account authorization and delivery','real Google Forms submission / CSV export','GitHub Pages publication','AI provider responses','physical iPad, split-screen calibration and other physical devices','AI Studio host integration']};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s7-traceability-t13-t20.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS S7 traceability ${report.rows.length}/${report.rows.length}; external environments remain NOT VERIFIED`);
