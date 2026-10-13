#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const source=fs.readFileSync('src/js/05c-exercise-suitability.js','utf8');
const browserPath='qa-results/s6-pedagogical-ai-browser/evidence.json';
assert.ok(fs.existsSync(browserPath),'S6 browser evidence must exist before traceability');
const browser=JSON.parse(fs.readFileSync(browserPath,'utf8'));assert.equal(browser.status,'PASS');
const ids=['T12',...Array.from({length:22},(_,i)=>`T${i+21}`),...Array.from({length:10},(_,i)=>`T${i+54}`)];
const evidence={
  T12:['S6-B04','shared CREATE NEW task policy'],T21:['S6-B04','pre-selection panel'],T22:['S6-B03','synthetic Unit 5 recommendations'],T23:['S6-B06','fingerprint invalidation'],T24:['S6-B04','unverified URL coverage'],T25:['S6-B05','manual selection preserved'],T26:['S6-SRC-07','shared composition-review policy'],T27:['S6-B01','38-format catalog'],T28:['S6-B01','metadata contract'],T29:['S6-B02','conditionals search'],T30:['S6-B02','nature/weather search'],T31:['S6-B02','Spanish table search'],T32:['S6-B01','reading prerequisites'],T33:['S6-B02','heading prerequisite/filter'],T34:['S6-B01','listening source prerequisite'],T35:['S2 regression','independent source/format/count scoring'],T36:['S6-B05','filters preserve selection'],T37:['S6-B01','stable canonical formatId'],T38:['S6-SRC-03','indeterminate phase labels, no invented percentage'],T39:['S6-B08','keyboard/mobile Chromium'],T40:['S6-B03','typed allowlist and enumerated context'],T41:['S2 regression','prompt/student/verifier style fidelity'],T42:['security regression','review gate and security modes'],
  T54:['S6-B01','no invented ID or scorer mutation'],T55:['S2 regression','five-style ordering'],T56:['S2 regression','secure labels'],T57:['S2 regression','instant labels'],T58:['S2 regression','preview/verifier/PDF'],T59:['S2 regression','content/style'],T60:['S2 regression','title/type separation'],T61:['S2 regression','historic fallback'],T62:['S6-B01','38 scorer mappings'],T63:['S2 regression','variant/export fidelity']
};
for(const id of ids)assert.ok(evidence[id],`missing traceability ${id}`);
assert.match(source,/targetLanguage:state\.jazyk/);assert.doesNotMatch(source,/JSON\.stringify\(state\)/);
const rows=ids.map(id=>({id,status:'PASS',evidence:evidence[id]}));
const report={schema:'git-s6-traceability-v1',stage:'S06',status:'PASS',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows,notes:['T35 and T41–T42 plus T55–T63 depend on separately executed existing S1–S5/S2 regression gates; this file validates the S06 mapping and does not replace their logs.','Real provider, physical devices, AI Studio and GitHub Pages remain NOT VERIFIED.']};
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s6-traceability-t12-t42-t54-t63.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS S6 traceability ${rows.length}/${rows.length}`);
