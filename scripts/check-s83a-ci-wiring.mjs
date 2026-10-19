#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(item=>item.trim()).filter(Boolean);

function validate(pkg,workflow,runner,evidenceRunner){
  assert.equal(pkg.scripts?.['check:s83a-assistant-remediation'],'node scripts/check-s83a-assistant-remediation.mjs');
  assert.equal(pkg.scripts?.['check:s83a-assistant-remediation-browser'],'node scripts/check-s83a-assistant-remediation-browser.mjs');
  assert.equal(pkg.scripts?.['check:s83a-ai-boundary-behavior'],'node scripts/check-s83a-ai-boundary-behavior.mjs');
  assert.equal(pkg.scripts?.['check:s83a-ci-wiring'],'node scripts/check-s83a-ci-wiring.mjs');
  assert.equal(pkg.scripts?.['check:s83b-parallel-tabs-stability'],'node scripts/check-s83b-parallel-tabs-stability.mjs');

  const postbuild=split(pkg.scripts?.postbuild);
  assert.equal(postbuild.filter(item=>item==='npm run check:s83a-assistant-remediation').length,1,'postbuild must run the assistant source gate exactly once');
  assert.equal(postbuild.filter(item=>item==='npm run check:s83a-ai-boundary-behavior').length,1,'postbuild must run the eight-module behavioral AI gate exactly once');

  for(const name of ['preqa:p5','preqa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    const build=steps.indexOf('npm run build');
    const browser=steps.indexOf('npm run check:s83a-assistant-remediation-browser');
    const stability=steps.indexOf('npm run check:s83b-parallel-tabs-stability');
    assert.equal(steps.filter(item=>item==='npm run check:s83a-assistant-remediation-browser').length,1,`${name} must run the S08.3a Chromium gate exactly once`);
    assert.equal(steps.filter(item=>item==='npm run check:s83b-parallel-tabs-stability').length,1,`${name} must run the repeated E4 parallel-tab gate exactly once`);
    assert.ok(build>=0&&build<browser,`${name} must build before the S08.3a Chromium gate`);
    assert.ok(browser>=0&&browser<stability,`${name} must run the assistant browser gate before repeated E4 stability`);
  }

  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s83a-ci-wiring.mjs'),'CI orchestration must self-check S08.3a wiring');
  assert.ok(runner.includes("'npm run qa:p5:ci'"),'fail-fast release runner must invoke qa:p5:ci');
  assert.ok(workflow.includes('run: npm run qa:redteam:ci'),'pinned release workflow must invoke the fail-fast runner');
  assert.ok(evidenceRunner.includes("import {resolveNpmCommand} from './lib/npm-command.mjs';")&&evidenceRunner.includes('const command=resolveNpmCommand(args);'),'exact-SHA evidence runner must use the reviewed Windows/Posix npm resolver');
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8');
const runner=fs.readFileSync('scripts/run-redteam-ci-e10.mjs','utf8');
const evidenceRunner=fs.readFileSync('scripts/run-s83a-final-evidence.mjs','utf8');
validate(pkg,workflow,runner,evidenceRunner);

const mutations=[];
function reject(id,mutate){
  const changed=structuredClone(pkg),wf={value:workflow},run={value:runner},evidence={value:evidenceRunner};
  mutate(changed,wf,run,evidence);
  assert.throws(()=>validate(changed,wf.value,run.value,evidence.value),{name:'AssertionError'});
  mutations.push({id,detected:true});
}
reject('drop-assistant-source',pkg=>{pkg.scripts.postbuild=pkg.scripts.postbuild.replace(' && npm run check:s83a-assistant-remediation','');});
reject('drop-ai-behavior',pkg=>{pkg.scripts.postbuild=pkg.scripts.postbuild.replace(' && npm run check:s83a-ai-boundary-behavior','');});
reject('drop-local-browser',pkg=>{pkg.scripts['preqa:p5']=pkg.scripts['preqa:p5'].replace(' && npm run check:s83a-assistant-remediation-browser','');});
reject('drop-ci-browser',pkg=>{pkg.scripts['preqa:p5:ci']=pkg.scripts['preqa:p5:ci'].replace(' && npm run check:s83a-assistant-remediation-browser','');});
reject('drop-local-e4-stability',pkg=>{pkg.scripts['preqa:p5']=pkg.scripts['preqa:p5'].replace(' && npm run check:s83b-parallel-tabs-stability','');});
reject('drop-ci-e4-stability',pkg=>{pkg.scripts['preqa:p5:ci']=pkg.scripts['preqa:p5:ci'].replace(' && npm run check:s83b-parallel-tabs-stability','');});
reject('browser-before-build',pkg=>{pkg.scripts['preqa:p5:ci']=pkg.scripts['preqa:p5:ci'].replace('npm run build && npm run check:s83-quality-browser && npm run check:s83a-assistant-remediation-browser','npm run check:s83a-assistant-remediation-browser && npm run build && npm run check:s83-quality-browser');});
reject('fake-ai-behavior',pkg=>{pkg.scripts['check:s83a-ai-boundary-behavior']='node -e "process.exit(0)"';});
reject('drop-self-check',pkg=>{pkg.scripts['check:ci-orchestration']=pkg.scripts['check:ci-orchestration'].replace(' && node scripts/check-s83a-ci-wiring.mjs','');});
reject('drop-release-chain',(_pkg,_wf,run)=>{run.value=run.value.replace("'npm run qa:p5:ci'", "'node -e \\\"process.exit(0)\\\"'");});
reject('drop-pinned-workflow-entry',(_pkg,wf)=>{wf.value=wf.value.replace('run: npm run qa:redteam:ci','run: node -e "process.exit(0)"');});
reject('restore-direct-npm-cmd',(_pkg,_wf,_run,evidence)=>{evidence.value=evidence.value.replace("import {resolveNpmCommand} from './lib/npm-command.mjs';",'').replace('const command=resolveNpmCommand(args);',"const command={program:'npm.cmd',args};");});

fs.mkdirSync('qa-results',{recursive:true});
fs.writeFileSync('qa-results/s83a-ci-wiring.json',JSON.stringify({schema:'git-s83a-ci-wiring-v1',stage:'S08.3a',status:'PASS',negativeControls:mutations},null,2)+'\n');
console.log(`PASS S08.3a CI wiring and ${mutations.length} negative controls`);
