import assert from 'node:assert/strict';
import fs from 'node:fs';
export function validateRegressionCi({pkg,p5,deploy,runner}){
  const scripts=pkg.scripts;
  assert.equal(scripts['qa:redteam:ci'],'node scripts/run-redteam-ci-e10.mjs','Canonical E9 runner required');
  for(const gate of ['isolation','trust','verifier','storage','runtime','publication','mobile','forgery']){
    for(const chain of ['test','qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' missing '+gate);
  }
  for(const gate of ['isolation-browser','trust-browser','verifier-browser','storage-browser','runtime-browser','mobile-recorder','forgery-browser','regression-negative','restart-browser']){
    for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' missing '+gate);
  }
  for(const chain of ['test','qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-ci'),chain+' missing CI contract');
  assert.match(runner,/const steps=\['npm test','npm run qa:garp27:foundation','npm run qa:p5:ci','node scripts\/check-redteam-evidence-e10.mjs'\]/,'Foundation must precede the final P5 build and evidence admission');
  assert.match(runner,/results\.every\(x=>x\.pass\)&&sourceUnchanged/,'Executable source must remain unchanged throughout the chain');
  assert.ok(runner.includes("parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')"),'Command paths must produce safe flat log filenames');
  assert.match(p5,/branches: \[pre-server-forms-workflow, candidate, main\]/);
  assert.equal((p5.match(/^\s+run: npm run qa:redteam:ci$/gm)||[]).length,1,'P5 must run canonical chain once');
  assert.doesNotMatch(p5,/^\s*(?:continue-on-error:|run:.*(?:\|\|\s*true|qa:p5:ci|qa:garp27:foundation))/m,'No optional/bypassed or extra destructive gate after E9');
  assert.match(p5,/run: npm ci --ignore-scripts --no-audit --no-fund --registry=https:\/\/registry\.npmjs\.org/);
  assert.match(p5,/npx playwright install --with-deps chromium/);
  assert.match(p5,/name: p5-r2-\$\{\{ github\.sha \}\}/);
  assert.match(p5,/if-no-files-found: error/);
  for(const path of ['qa-results/redteam-e*.json','qa-results/redteam-e9-*.json','qa-results/redteam-e9-negative/*.log','qa-results/redteam-e10-ci/*.log','audit/evidence/garp27-current/','dist/qa-p5-*.json'])for(const workflow of [p5,deploy])assert.ok(workflow.includes('            '+path),path+' must be retained');
  assert.match(deploy,/run: npm run qa:redteam:ci/,'Deployment must require the same E9 admission');
  assert.doesNotMatch(deploy,/^\s+run: npm run (?:qa:p5:ci|qa:garp27:foundation)$/m,'No second rebuild after certified chain');
}
if(process.argv[1]?.endsWith('check-redteam-ci-e9.mjs')){
  const input={pkg:JSON.parse(fs.readFileSync('package.json')),p5:fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8'),deploy:fs.readFileSync('.github/workflows/deploy.yml','utf8'),runner:fs.readFileSync('scripts/run-redteam-ci-e10.mjs','utf8')};
  validateRegressionCi(input);
  const mutations=[
    ['drop-VM',x=>x.pkg.scripts.test=x.pkg.scripts.test.replace(' && npm run check:redteam-verifier','')],
    ['drop-native',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-forgery-browser','')],
    ['drop-negatives',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-regression-negative','')],
    ['local-ci-drift',x=>x.pkg.scripts['qa:p5']=x.pkg.scripts['qa:p5'].replace(' && npm run check:redteam-restart-browser','')],
    ['skip-admission',x=>x.pkg.scripts['qa:redteam:ci']='npm run qa:p5:ci'],
    ['wrong-order',x=>x.runner=x.runner.replace("'npm run qa:garp27:foundation','npm run qa:p5:ci'","'npm run qa:p5:ci','npm run qa:garp27:foundation'")],
    ['changed-source-accepted',x=>x.runner=x.runner.replace('&&sourceUnchanged','')],
    ['unsafe-log-path',x=>x.runner=x.runner.replace("parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')","parts.join('-')")],
    ['swallow-failure',x=>x.p5=x.p5.replace('run: npm run qa:redteam:ci','run: npm run qa:redteam:ci || true')],
    ['optional-gate',x=>x.p5=x.p5.replace('run: npm run qa:redteam:ci','continue-on-error: true\n        run: npm run qa:redteam:ci')],
    ['unlocked-install',x=>x.p5=x.p5.replace('run: npm ci','run: npm install')],
    ['unbound-artifact',x=>x.p5=x.p5.replace('p5-r2-${{ github.sha }}','p5-r2-latest')],
    ['missing-evidence',x=>x.p5=x.p5.replace('            audit/evidence/garp27-current/','')],
    ['deploy-bypass',x=>x.deploy=x.deploy.replace('run: npm run qa:redteam:ci','run: npm run qa:p5:ci')],
  ];
  for(const [id,mutate] of mutations){const broken=structuredClone(input);mutate(broken);assert.throws(()=>validateRegressionCi(broken),{name:'AssertionError'},id);}
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e9-ci-contract.json',JSON.stringify({stage:'E9',version:input.pkg.version,status:'PASS',scope:'Static wiring contract with 14 intentional mutations; actual process evidence is separate',negativeControls:mutations.map(([id])=>({id,detected:true}))},null,2)+'\n');
  console.log('PASS E9 CI wiring and',mutations.length,'negative controls');
}
