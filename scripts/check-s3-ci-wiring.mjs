#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const split=command=>String(command||'').split(' && ').map(step=>step.trim()).filter(Boolean);

function validate(pkg,workflow){
  assert.equal(pkg.scripts?.['check:s3-workflow-fidelity'],'node scripts/check-s3-workflow-fidelity.mjs && node scripts/check-s31-remediation.mjs && node scripts/check-s31-r2-point-validation.mjs && node scripts/check-s31-r2-detail-authority.mjs',
    'S3 source gate must execute the reviewed workflow fidelity, S3.1 and both S3.1-R2 scripts');
  assert.equal(pkg.scripts?.['check:s31-remediation'],'node scripts/check-s31-remediation.mjs && node scripts/check-s31-r2-point-validation.mjs && node scripts/check-s31-r2-detail-authority.mjs',
    'S3.1 remediation gate must execute all reviewed edge-case scripts');
  assert.equal(pkg.scripts?.['check:s31-r2-point-validation'],'node scripts/check-s31-r2-point-validation.mjs',
    'S3.1-R2 must expose a directly runnable fail-closed gate');
  assert.equal(pkg.scripts?.['check:s31-r2-detail-authority'],'node scripts/check-s31-r2-detail-authority.mjs',
    'S3.1-R2 closure must expose a directly runnable detail-authority gate');
  assert.equal(pkg.scripts?.['check:s3-workflow-browser'],'node scripts/check-s3-workflow-browser.mjs',
    'S3 browser gate must execute the reviewed Chromium script');
  assert.equal(pkg.devDependencies?.playwright,'1.61.1','S3 browser evidence requires the reviewed Playwright pin');

  const prebuild=split(pkg.scripts?.prebuild);
  assert.equal(prebuild.filter(step=>step==='npm run check:s3-workflow-fidelity').length,1,
    'prebuild must execute the blocking S3 source gate exactly once');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    assert.equal(steps.filter(step=>step==='npm run check:s3-workflow-browser').length,1,
      `${name} must execute the blocking S3 browser gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:s3-workflow-browser'),
      `${name} must build before the S3 browser gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s3-ci-wiring.mjs'),
    'CI orchestration must enforce the S3 wiring contract');
  assert.match(workflow,/qa-results\/workflow-fidelity-browser-s3\.json/,
    'P5 release evidence must retain the self-bound S3 browser report');
}

const pkg=JSON.parse(read('package.json'));
const workflow=read('.github/workflows/p5-release-gate.yml');
validate(pkg,workflow);

const noSource=structuredClone(pkg);
noSource.scripts.prebuild=noSource.scripts.prebuild.replace(' && npm run check:s3-workflow-fidelity','');
assert.throws(()=>validate(noSource,workflow),/blocking S3 source gate/);
const noR2=structuredClone(pkg);
noR2.scripts['check:s3-workflow-fidelity']=noR2.scripts['check:s3-workflow-fidelity'].replace(' && node scripts/check-s31-r2-point-validation.mjs','');
assert.throws(()=>validate(noR2,workflow),/S3 source gate/);
const noDetailAuthority=structuredClone(pkg);
noDetailAuthority.scripts['check:s3-workflow-fidelity']=noDetailAuthority.scripts['check:s3-workflow-fidelity'].replace(' && node scripts/check-s31-r2-detail-authority.mjs','');
assert.throws(()=>validate(noDetailAuthority,workflow),/S3 source gate/);
const noBrowser=structuredClone(pkg);
noBrowser.scripts['qa:p5:ci']=noBrowser.scripts['qa:p5:ci'].replace(' && npm run check:s3-workflow-browser','');
assert.throws(()=>validate(noBrowser,workflow),/blocking S3 browser gate/);
assert.throws(()=>validate(pkg,workflow.replace(/^\s*qa-results\/workflow-fidelity-browser-s3\.json\r?\n/m,'')),/retain the self-bound S3 browser report/);

console.log('PASS S3 CI wiring contract: prebuild and P5 certification block on workflow fidelity evidence');
