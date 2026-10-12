#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const split=command=>String(command||'').split(' && ').map(x=>x.trim()).filter(Boolean);

function validate(pkg,workflow){
  assert.equal(pkg.scripts?.['check:s4-teacher-verifier'],'node scripts/check-s4-teacher-verifier.mjs','S4 source gate must execute the reviewed T118-T135 matrix');
  assert.equal(pkg.scripts?.['check:s41-teacher-verifier-remediation'],'node scripts/check-s41-teacher-verifier-remediation.mjs','S4.1 source gate must execute the reviewed remediation matrix');
  assert.equal(pkg.scripts?.['check:s4-teacher-verifier-browser'],'node scripts/qa-generate-fixtures.mjs && node scripts/check-s4-teacher-verifier-browser.mjs','S4 browser gate must generate a real verifier before Chromium');
  assert.equal(pkg.devDependencies?.playwright,'1.61.1','S4 browser evidence requires the reviewed Playwright pin');
  const prebuild=split(pkg.scripts?.prebuild);
  assert.equal(prebuild.filter(x=>x==='npm run check:s4-teacher-verifier').length,1,'prebuild must execute the blocking S4 source gate exactly once');
  assert.equal(prebuild.filter(x=>x==='npm run check:s41-teacher-verifier-remediation').length,1,'prebuild must execute the blocking S4.1 source gate exactly once');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]),gate='npm run check:s4-teacher-verifier-browser';
    assert.equal(steps.filter(x=>x===gate).length,1,`${name} must execute the blocking S4 browser gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf(gate),`${name} must build before the S4 browser gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s4-ci-wiring.mjs'),'CI orchestration must enforce the S4 wiring contract');
  assert.match(workflow,/qa-results\/s4-teacher-verifier-source\.json/,'P5 evidence must retain the S4 source report');
  assert.match(workflow,/qa-results\/s41-teacher-verifier-remediation\.json/,'P5 evidence must retain the S4.1 source report');
  assert.match(workflow,/qa-results\/s4-teacher-verifier-browser\/evidence\.json/,'P5 evidence must retain the S4 Chromium report');
}

const pkg=JSON.parse(read('package.json')),workflow=read('.github/workflows/p5-release-gate.yml');
validate(pkg,workflow);
const noSource=structuredClone(pkg);noSource.scripts.prebuild=noSource.scripts.prebuild.replace(' && npm run check:s4-teacher-verifier','');assert.throws(()=>validate(noSource,workflow),/blocking S4 source gate/);
const noRemediation=structuredClone(pkg);noRemediation.scripts.prebuild=noRemediation.scripts.prebuild.replace(' && npm run check:s41-teacher-verifier-remediation','');assert.throws(()=>validate(noRemediation,workflow),/blocking S4\.1 source gate/);
const noBrowser=structuredClone(pkg);noBrowser.scripts['qa:p5:ci']=noBrowser.scripts['qa:p5:ci'].replace(' && npm run check:s4-teacher-verifier-browser','');assert.throws(()=>validate(noBrowser,workflow),/blocking S4 browser gate/);
const noGeneration=structuredClone(pkg);noGeneration.scripts['check:s4-teacher-verifier-browser']='node scripts/check-s4-teacher-verifier-browser.mjs';assert.throws(()=>validate(noGeneration,workflow),/generate a real verifier/);
assert.throws(()=>validate(pkg,workflow.replace(/^\s*qa-results\/s4-teacher-verifier-browser\/evidence\.json\r?\n/m,'')),/retain the S4 Chromium report/);
assert.throws(()=>validate(pkg,workflow.replace(/^\s*qa-results\/s41-teacher-verifier-remediation\.json\r?\n/m,'')),/retain the S4\.1 source report/);
console.log('PASS S4 CI wiring contract: prebuild and P5 certification block on generated Teacher Verifier evidence');
