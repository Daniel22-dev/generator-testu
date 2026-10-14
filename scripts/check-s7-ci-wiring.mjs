#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(item=>item.trim()).filter(Boolean);
function validate(pkg,workflow,runner){
  assert.equal(pkg.scripts?.['check:s7-teacher-workflow'],'node scripts/check-s7-teacher-workflow.mjs');
  assert.equal(pkg.scripts?.['check:s7-teacher-workflow-browser'],'node scripts/check-s7-teacher-workflow-browser.mjs');
  assert.equal(pkg.scripts?.['check:s7-traceability'],'node scripts/check-s7-traceability.mjs');
  assert.equal(split(pkg.scripts?.prebuild).filter(item=>item==='npm run check:s7-teacher-workflow').length,1,'prebuild must block on the S7 source gate');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]),browser=steps.indexOf('npm run check:s7-teacher-workflow-browser'),trace=steps.indexOf('npm run check:s7-traceability');
    assert.equal(steps.filter(item=>item==='npm run check:s7-teacher-workflow-browser').length,1,`${name} must run the S7 Chromium gate exactly once`);
    assert.equal(steps.filter(item=>item==='npm run check:s7-traceability').length,1,`${name} must run S7 traceability exactly once`);
    assert.ok(steps.indexOf('npm run build')<browser&&browser<trace,`${name} must build, run Chromium, then traceability`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s7-ci-wiring.mjs'));
  assert.ok(runner.includes("'npm run qa:p5:ci'"),'fail-fast release runner must invoke qa:p5:ci');
  assert.ok(workflow.includes('run: npm run qa:redteam:ci'),'pinned release workflow must invoke fail-fast runner');
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8'),runner=fs.readFileSync('scripts/run-redteam-ci-e10.mjs','utf8');validate(pkg,workflow,runner);
const mutations=[];function reject(id,mutate){const changed=structuredClone(pkg),wf={value:workflow},run={value:runner};mutate(changed,wf,run);assert.throws(()=>validate(changed,wf.value,run.value),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-source',pkg=>{pkg.scripts.prebuild=pkg.scripts.prebuild.replace(' && npm run check:s7-teacher-workflow','');});
reject('drop-ci-browser',pkg=>{pkg.scripts['qa:p5:ci']=pkg.scripts['qa:p5:ci'].replace(' && npm run check:s7-teacher-workflow-browser','');});
reject('drop-local-traceability',pkg=>{pkg.scripts['qa:p5']=pkg.scripts['qa:p5'].replace(' && npm run check:s7-traceability','');});
reject('fake-source',pkg=>{pkg.scripts['check:s7-teacher-workflow']='node -e "process.exit(0)"';});
reject('trace-before-browser',pkg=>{pkg.scripts['qa:p5:ci']=pkg.scripts['qa:p5:ci'].replace('npm run check:s7-teacher-workflow-browser && npm run check:s7-traceability','npm run check:s7-traceability && npm run check:s7-teacher-workflow-browser');});
reject('drop-release-chain',(_pkg,_wf,run)=>{run.value=run.value.replace("'npm run qa:p5:ci'", "'node -e \\\"process.exit(0)\\\"'");});
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s7-ci-wiring.json',JSON.stringify({schema:'git-s7-ci-wiring-v1',stage:'S07',status:'PASS',negativeControls:mutations},null,2)+'\n');console.log(`PASS S7 CI wiring and ${mutations.length} negative controls`);
