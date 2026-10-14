#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(item=>item.trim()).filter(Boolean);
function validate(pkg,workflow,runner){
  assert.equal(pkg.scripts?.['check:s62-diagnostic-remediation'],'node scripts/check-s62-diagnostic-remediation.mjs');
  assert.equal(pkg.scripts?.['check:s62-diagnostic-remediation-browser'],'node scripts/check-s62-diagnostic-remediation-browser.mjs');
  assert.equal(split(pkg.scripts?.prebuild).filter(item=>item==='npm run check:s62-diagnostic-remediation').length,1,'prebuild must block on the S62 source gate');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    assert.equal(steps.filter(item=>item==='npm run check:s62-diagnostic-remediation-browser').length,1,`${name} must run the S62 Chromium gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:s62-diagnostic-remediation-browser'),`${name} must build before the S62 Chromium gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s62-ci-wiring.mjs'));
  assert.equal(pkg.scripts?.['qa:redteam:ci'],'node scripts/run-redteam-ci-e10.mjs');
  assert.ok(runner.includes("'npm run qa:p5:ci'"),'the fail-fast release runner must invoke qa:p5:ci');
  assert.ok(workflow.includes('run: npm run qa:redteam:ci'),'the pinned release workflow must invoke the fail-fast runner');
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8'),runner=fs.readFileSync('scripts/run-redteam-ci-e10.mjs','utf8');validate(pkg,workflow,runner);
const mutations=[];
function reject(id,mutate){const changed=structuredClone(pkg),wf={value:workflow},run={value:runner};mutate(changed,wf,run);assert.throws(()=>validate(changed,wf.value,run.value),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-source',pkg=>{pkg.scripts.prebuild=pkg.scripts.prebuild.replace(' && npm run check:s62-diagnostic-remediation','');});
reject('drop-ci-browser',pkg=>{pkg.scripts['qa:p5:ci']=pkg.scripts['qa:p5:ci'].replace(' && npm run check:s62-diagnostic-remediation-browser','');});
reject('drop-local-browser',pkg=>{pkg.scripts['qa:p5']=pkg.scripts['qa:p5'].replace(' && npm run check:s62-diagnostic-remediation-browser','');});
reject('fake-source',pkg=>{pkg.scripts['check:s62-diagnostic-remediation']='node -e "process.exit(0)"';});
reject('drop-release-chain',(_pkg,_wf,run)=>{run.value=run.value.replace("'npm run qa:p5:ci'", "'node -e \\\"process.exit(0)\\\"'");});
reject('drop-pinned-workflow-entry',(_pkg,wf)=>{wf.value=wf.value.replace('run: npm run qa:redteam:ci','run: node -e "process.exit(0)"');});
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s62-ci-wiring.json',JSON.stringify({schema:'git-s62-ci-wiring-v1',stage:'S06.2',status:'PASS',negativeControls:mutations},null,2)+'\n');
console.log(`PASS S62 CI wiring and ${mutations.length} negative controls`);
