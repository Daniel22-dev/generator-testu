#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(item=>item.trim()).filter(Boolean);
function validate(pkg){
  assert.equal(pkg.scripts?.['check:r1b1-c29-browser'],'node scripts/check-r1b1-c29-browser.mjs');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    const gate=steps.indexOf('npm run check:r1b1-c29-browser');
    assert.equal(steps.filter(item=>item==='npm run check:r1b1-c29-browser').length,1,`${name} must run the C29 Chromium gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<gate,`${name} must build before the C29 Chromium gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-r1b1-c29-ci-wiring.mjs'),'CI orchestration must enforce the C29 wiring contract');
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
validate(pkg);
const mutations=[];
function reject(id,mutate){const changed=structuredClone(pkg);mutate(changed);assert.throws(()=>validate(changed),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-local-gate',pkg=>{pkg.scripts['qa:p5']=pkg.scripts['qa:p5'].replace(' && npm run check:r1b1-c29-browser','');});
reject('drop-ci-gate',pkg=>{pkg.scripts['qa:p5:ci']=pkg.scripts['qa:p5:ci'].replace(' && npm run check:r1b1-c29-browser','');});
reject('duplicate-ci-gate',pkg=>{pkg.scripts['qa:p5:ci']+=' && npm run check:r1b1-c29-browser';});
reject('fake-browser-gate',pkg=>{pkg.scripts['check:r1b1-c29-browser']='node -e "process.exit(0)"';});
reject('gate-before-build',pkg=>{const steps=split(pkg.scripts['qa:p5:ci']),gate=steps.indexOf('npm run check:r1b1-c29-browser');steps.splice(gate,1);steps.unshift('npm run check:r1b1-c29-browser');pkg.scripts['qa:p5:ci']=steps.join(' && ');});
reject('drop-orchestration-guard',pkg=>{pkg.scripts['check:ci-orchestration']=pkg.scripts['check:ci-orchestration'].replace(' && node scripts/check-r1b1-c29-ci-wiring.mjs','');});
fs.mkdirSync('qa-results',{recursive:true});
fs.writeFileSync('qa-results/r1b1-c29-ci-wiring.json',JSON.stringify({schema:'git-r1b1-c29-ci-wiring-v1',stage:'R1-B1',status:'PASS',negativeControls:mutations},null,2)+'\n');
console.log(`PASS R1-B1 C29 CI wiring and ${mutations.length} negative controls`);
