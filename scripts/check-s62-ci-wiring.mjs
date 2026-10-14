#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(item=>item.trim()).filter(Boolean);
function validate(pkg,workflow){
  assert.equal(pkg.scripts?.['check:s62-diagnostic-remediation'],'node scripts/check-s62-diagnostic-remediation.mjs');
  assert.equal(pkg.scripts?.['check:s62-diagnostic-remediation-browser'],'node scripts/check-s62-diagnostic-remediation-browser.mjs');
  assert.equal(split(pkg.scripts?.prebuild).filter(item=>item==='npm run check:s62-diagnostic-remediation').length,1,'prebuild must block on the S62 source gate');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    assert.equal(steps.filter(item=>item==='npm run check:s62-diagnostic-remediation-browser').length,1,`${name} must run the S62 Chromium gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:s62-diagnostic-remediation-browser'),`${name} must build before the S62 Chromium gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s62-ci-wiring.mjs'));
  for(const item of ['qa-results/s62-diagnostic-remediation-source.json','qa-results/s62-diagnostic-remediation-browser/evidence.json','qa-results/s62-diagnostic-remediation-browser/*.png','qa-results/s62-ci-wiring.json'])assert.ok(workflow.includes('            '+item),`workflow must retain ${item}`);
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8');validate(pkg,workflow);
const mutations=[];
function reject(id,mutate){const changed=structuredClone(pkg),wf={value:workflow};mutate(changed,wf);assert.throws(()=>validate(changed,wf.value),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-source',pkg=>{pkg.scripts.prebuild=pkg.scripts.prebuild.replace(' && npm run check:s62-diagnostic-remediation','');});
reject('drop-ci-browser',pkg=>{pkg.scripts['qa:p5:ci']=pkg.scripts['qa:p5:ci'].replace(' && npm run check:s62-diagnostic-remediation-browser','');});
reject('drop-local-browser',pkg=>{pkg.scripts['qa:p5']=pkg.scripts['qa:p5'].replace(' && npm run check:s62-diagnostic-remediation-browser','');});
reject('fake-source',pkg=>{pkg.scripts['check:s62-diagnostic-remediation']='node -e "process.exit(0)"';});
reject('drop-evidence',(_pkg,wf)=>{wf.value=wf.value.replace('qa-results/s62-diagnostic-remediation-browser/evidence.json','qa-results/removed-s62.json');});
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s62-ci-wiring.json',JSON.stringify({schema:'git-s62-ci-wiring-v1',stage:'S06.2',status:'PASS',negativeControls:mutations},null,2)+'\n');
console.log(`PASS S62 CI wiring and ${mutations.length} negative controls`);
