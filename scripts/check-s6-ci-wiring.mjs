#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const split=value=>String(value||'').split(' && ').map(x=>x.trim()).filter(Boolean);
function validate(pkg,workflow){
  assert.equal(pkg.scripts?.['check:s6-pedagogical-ai'],'node scripts/check-s6-pedagogical-ai.mjs');
  assert.equal(pkg.scripts?.['check:s6-pedagogical-ai-browser'],'node scripts/check-s6-pedagogical-ai-browser.mjs');
  assert.equal(pkg.scripts?.['check:s6-traceability'],'node scripts/check-s6-traceability.mjs');
  assert.equal(split(pkg.scripts?.prebuild).filter(x=>x==='npm run check:s6-pedagogical-ai').length,1,'prebuild must block on S6 source gate');
  for(const name of ['qa:p5','qa:p5:ci']){const steps=split(pkg.scripts?.[name]);assert.equal(steps.filter(x=>x==='npm run check:s6-pedagogical-ai-browser').length,1,`${name} must run S6 browser gate`);assert.equal(steps.filter(x=>x==='npm run check:s6-traceability').length,1,`${name} must run S6 traceability`);assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:s6-pedagogical-ai-browser'));assert.ok(steps.indexOf('npm run check:s6-pedagogical-ai-browser')<steps.indexOf('npm run check:s6-traceability'));}
  assert.ok(split(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s6-ci-wiring.mjs'));
  for(const path of ['qa-results/s6-pedagogical-ai-source.json','qa-results/s6-pedagogical-ai-browser/evidence.json','qa-results/s6-traceability-t12-t42-t54-t63.json','qa-results/s6-ci-wiring.json'])assert.ok(workflow.includes('            '+path),`workflow must retain ${path}`);
}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),workflow=fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8');validate(pkg,workflow);
const mutations=[];function reject(id,mutate){const p=structuredClone(pkg),w={value:workflow};mutate(p,w);assert.throws(()=>validate(p,w.value),{name:'AssertionError'});mutations.push({id,detected:true});}
reject('drop-source',p=>{p.scripts.prebuild=p.scripts.prebuild.replace(' && npm run check:s6-pedagogical-ai','');});reject('drop-browser',p=>{p.scripts['qa:p5:ci']=p.scripts['qa:p5:ci'].replace(' && npm run check:s6-pedagogical-ai-browser','');});reject('drop-traceability',p=>{p.scripts['qa:p5']=p.scripts['qa:p5'].replace(' && npm run check:s6-traceability','');});reject('fake-source',p=>{p.scripts['check:s6-pedagogical-ai']='node -e "process.exit(0)"';});reject('drop-evidence',(_p,w)=>{w.value=w.value.replace('qa-results/s6-pedagogical-ai-browser/evidence.json','qa-results/removed-s6.json');});
fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/s6-ci-wiring.json',JSON.stringify({schema:'git-s6-ci-wiring-v1',stage:'S06',status:'PASS',negativeControls:mutations},null,2)+'\n');console.log(`PASS S6 CI wiring and ${mutations.length} negative controls`);
