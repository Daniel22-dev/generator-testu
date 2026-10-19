#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=command=>String(command||'').split(' && ').map(x=>x.trim()).filter(Boolean);
function validate(pkg,workflow,harness){
  assert.equal(pkg.scripts?.['check:s5-strict-mode'],'node scripts/check-s5-strict-mode.mjs','S5 source gate must execute the reviewed Strict Guard matrix');
  assert.equal(pkg.scripts?.['check:s5-strict-mode-browser'],'node scripts/check-s5-strict-mode-browser.mjs','S5 Chromium gate must execute generated student artifacts');
  assert.equal(pkg.scripts?.['check:s5-traceability'],'node scripts/check-s5-traceability.mjs','S5 traceability must execute the reviewed T64-T101 matrix');
  assert.equal(pkg.devDependencies?.playwright,'1.61.1','S5 browser evidence requires the reviewed Playwright pin');
  assert.ok(harness.includes("execFileSync(process.execPath, ['scripts/build.mjs']")&&harness.includes('!fs.existsSync(generatorHtml) && !process.env.GIT_REDTEAM_GENERATOR_HTML'),'clean checkout must build the S5 fixture directly without recursive npm lifecycle entry');
  const prebuild=split(pkg.scripts?.prebuild),sourceGate='npm run check:s5-strict-mode';
  assert.equal(prebuild.filter(x=>x===sourceGate).length,1,'prebuild must execute the blocking S5 source gate exactly once');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]),browserGate='npm run check:s5-strict-mode-browser',traceability='npm run check:s5-traceability';
    assert.equal(steps.filter(x=>x===browserGate).length,1,`${name} must execute the blocking S5 browser gate exactly once`);
    assert.equal(steps.filter(x=>x===traceability).length,1,`${name} must execute the blocking S5 traceability gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf(browserGate),`${name} must build before the S5 browser gate`);
    assert.ok(steps.indexOf(browserGate)<steps.indexOf(traceability),`${name} must create browser evidence before S5 traceability`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s5-ci-wiring.mjs'),'CI orchestration must enforce the S5 wiring contract');
  for(const evidence of ['qa-results/s5-strict-mode-source.json','qa-results/s5-strict-mode-browser/evidence.json','qa-results/s5-traceability-t64-t101.json','qa-results/s5-ci-wiring.json'])assert.ok(workflow.includes('            '+evidence),`P5 evidence must retain ${evidence}`);
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8'),harness=fs.readFileSync('scripts/redteam-harness-utils.mjs','utf8');
validate(pkg,workflow,harness);
const mutations=[];
function reject(id,mutate){const p=structuredClone(pkg),w={value:workflow},h={value:harness};mutate(p,w,h);assert.throws(()=>validate(p,w.value,h.value),{name:'AssertionError'},id);mutations.push({id,detected:true});}
reject('drop-source-gate',p=>{p.scripts.prebuild=p.scripts.prebuild.replace(' && npm run check:s5-strict-mode','');});
reject('drop-clean-checkout-bootstrap',(_p,_w,h)=>{h.value=h.value.replace("execFileSync(process.execPath, ['scripts/build.mjs']","void(process.execPath, ['scripts/build.mjs']");});
reject('drop-browser-gate',p=>{p.scripts['qa:p5:ci']=p.scripts['qa:p5:ci'].replace(' && npm run check:s5-strict-mode-browser','');});
reject('browser-before-build',p=>{const gate='npm run check:s5-strict-mode-browser';p.scripts['qa:p5']=p.scripts['qa:p5'].replace(' && '+gate,'').replace('npm run build',gate+' && npm run build');});
reject('wrong-source-command',p=>{p.scripts['check:s5-strict-mode']='node -e "process.exit(0)"';});
reject('missing-browser-evidence',(_p,w)=>{w.value=w.value.replace('qa-results/s5-strict-mode-browser/evidence.json','qa-results/removed-s5-browser-evidence.json');});
reject('drop-traceability',p=>{p.scripts['qa:p5:ci']=p.scripts['qa:p5:ci'].replace(' && npm run check:s5-traceability','');});
const report={schema:'git-s5-ci-wiring-v1',stage:'S05',status:'PASS',negativeControls:mutations};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s5-ci-wiring.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS S5 CI wiring contract and ${mutations.length} negative controls`);
