import assert from 'node:assert/strict';
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const split=s=>String(s||'').split(' && ');
function validate(p){
  assert.equal(p.scripts?.['check:r1b2-c30-progress'],'node scripts/check-r1b2-c30-progress.mjs');
  assert.equal(p.scripts?.['check:r1b2-c30-ai-boundary'],'node scripts/check-r1b2-c30-ai-boundary-review.mjs && node scripts/check-r1b2-c30-generation-integration.cjs');
  assert.equal(p.scripts?.['check:r1b2-c30-browser'],'node scripts/check-r1b2-c30-browser.mjs');
  assert.ok(split(p.scripts?.prebuild).includes('npm run check:r1b2-c30-progress'));
  assert.ok(split(p.scripts?.prebuild).includes('npm run check:r1b2-c30-ai-boundary'));
  assert.ok(split(p.scripts?.['check:ci-orchestration']).includes('node scripts/check-r1b2-c30-ci-wiring.mjs'));
  for(const name of ['qa:p5','qa:p5:ci']){const steps=split(p.scripts?.[name]);assert.equal(steps.filter(x=>x==='npm run check:r1b2-c30-browser').length,1);assert.ok(steps.indexOf('npm run build')<steps.indexOf('npm run check:r1b2-c30-browser'))}
}
validate(pkg);let controls=0;const reject=(name,mutate)=>{const p=structuredClone(pkg);mutate(p);assert.throws(()=>validate(p),undefined,name);controls++};
reject('drop source',p=>{p.scripts.prebuild=p.scripts.prebuild.replace(' && npm run check:r1b2-c30-progress','')});
reject('drop AI-boundary integration',p=>{p.scripts.prebuild=p.scripts.prebuild.replace(' && npm run check:r1b2-c30-ai-boundary','')});
reject('drop CI browser',p=>{p.scripts['qa:p5:ci']=p.scripts['qa:p5:ci'].replace(' && npm run check:r1b2-c30-browser','')});
reject('duplicate browser',p=>{p.scripts['qa:p5']+=' && npm run check:r1b2-c30-browser'});
reject('fake source',p=>{p.scripts['check:r1b2-c30-progress']='node -e "process.exit(0)"'});
reject('fake AI-boundary integration',p=>{p.scripts['check:r1b2-c30-ai-boundary']='node -e "process.exit(0)"'});
reject('drop wiring',p=>{p.scripts['check:ci-orchestration']=p.scripts['check:ci-orchestration'].replace(' && node scripts/check-r1b2-c30-ci-wiring.mjs','')});
console.log(`PASS R1-B2 C30 CI wiring (${controls} negative controls)`);
