#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const split=value=>String(value||'').split(' && ').map(x=>x.trim()).filter(Boolean);
function validate(pkg,workflow){
  assert.equal(pkg.scripts?.['check:s61-identity-quarantine'],'node scripts/check-s61-identity-quarantine.mjs');
  assert.equal(pkg.scripts?.['check:s61-identity-quarantine-browser'],'node scripts/check-s61-identity-quarantine-browser.mjs');
  assert.equal(split(pkg.scripts?.prebuild).filter(x=>x==='npm run check:s61-identity-quarantine').length,1,'prebuild must block on the S61 source gate');
  for(const name of ['qa:p5','qa:p5:ci']){
    const steps=split(pkg.scripts?.[name]);
    assert.equal(steps.filter(x=>x==='npm run check:s61-identity-quarantine-browser').length,1,`${name} must run the blocking S61 Chromium gate exactly once`);
    assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:s61-identity-quarantine-browser'),`${name} must build before the S61 Chromium gate`);
  }
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s61-ci-wiring.mjs'));
  for(const item of ['qa-results/s61-identity-quarantine-source.json','qa-results/s61-identity-quarantine-browser/evidence.json','qa-results/s61-identity-quarantine-browser/*.png','qa-results/s61-ci-wiring.json'])assert.ok(workflow.includes('            '+item),`workflow must retain ${item}`);
}

const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8');validate(pkg,workflow);
const mutations=[];
function reject(id,mutate){const p=structuredClone(pkg),w={value:workflow};mutate(p,w);assert.throws(()=>validate(p,w.value),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-source',p=>{p.scripts.prebuild=p.scripts.prebuild.replace(' && npm run check:s61-identity-quarantine','');});
reject('drop-ci-browser',p=>{p.scripts['qa:p5:ci']=p.scripts['qa:p5:ci'].replace(' && npm run check:s61-identity-quarantine-browser','');});
reject('drop-local-browser',p=>{p.scripts['qa:p5']=p.scripts['qa:p5'].replace(' && npm run check:s61-identity-quarantine-browser','');});
reject('fake-source',p=>{p.scripts['check:s61-identity-quarantine']='node -e "process.exit(0)"';});
reject('drop-evidence',(_p,w)=>{w.value=w.value.replace('qa-results/s61-identity-quarantine-browser/evidence.json','qa-results/removed-s61.json');});
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s61-ci-wiring.json',JSON.stringify({schema:'git-s61-ci-wiring-v1',stage:'S06.1',status:'PASS',negativeControls:mutations},null,2)+'\n');
console.log(`PASS S61 CI wiring and ${mutations.length} negative controls`);
