import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readSetupSources, validateSetupSources } from './ci/p2-workflow-contract.mjs';
import {executeStep,regressionChainPasses,resolveStepCommand} from './run-redteam-ci-e10.mjs';
export function validateRegressionCi({pkg,p5,deploy,runner,setup}){
  const scripts=pkg.scripts;
  assert.equal(scripts['qa:redteam:ci'],'node scripts/run-redteam-ci-e10.mjs','Canonical E9 runner required');
  for(const gate of ['isolation','trust','verifier','storage','runtime','publication','mobile','forgery']){
    for(const chain of ['test','qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' missing '+gate);
  }
  for(const gate of ['isolation-browser','trust-browser','verifier-browser','storage-browser','runtime-browser','mobile-recorder','forgery-browser','regression-negative','restart-browser']){
    for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' missing '+gate);
  }
  for(const chain of ['test','qa:p5','qa:p5:ci'])assert.ok(scripts[chain].split(' && ').includes('npm run check:redteam-ci'),chain+' missing CI contract');
  assert.match(runner,/const steps=\['npm test','npm run qa:garp27:foundation','node scripts\/preserve-foundation-evidence-e10.mjs','npm run qa:p5:ci','node scripts\/check-redteam-evidence-e10.mjs'\]/,'Foundation evidence must be preserved before the final P5 build and evidence admission');
  assert.match(runner,/results\.every\(x=>x\.pass\)&&sourceUnchanged/,'Executable source must remain unchanged throughout the chain');
  assert.ok(runner.includes("parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')"),'Command paths must produce safe flat log filenames');
  assert.match(runner,/preserve-foundation-evidence-e10\.mjs/,'Foundation evidence preservation is mandatory');
  assert.match(p5,/branches: \[pre-server-forms-workflow, candidate, main\]/);
  assert.equal((p5.match(/^\s+run: npm run qa:redteam:ci$/gm)||[]).length,1,'P5 must run canonical chain once');
  assert.doesNotMatch(p5,/^\s*(?:continue-on-error:|run:.*(?:\|\|\s*true|qa:p5:ci|qa:garp27:foundation))/m,'No optional/bypassed or extra destructive gate after E9');
  validateSetupSources(setup);
  assert.ok(p5.includes('uses: ./.github/actions/setup-ci-node'));
  assert.ok(p5.includes('uses: ./.github/actions/install-ci-tools'));
  assert.ok(p5.includes('expected-sha: ${{ github.sha }}'));
  assert.match(p5,/name: p5-r2-\$\{\{ github\.sha \}\}/);
  assert.match(p5,/if-no-files-found: error/);
  for(const path of ['qa-results/redteam-e*.json','qa-results/redteam-e9-*.json','qa-results/redteam-e9-negative/*.log','qa-results/redteam-e10-ci/*.log','qa-results/redteam-e10-ci/foundation-evidence/','audit/evidence/garp27-current/','dist/qa-p5-*.json'])assert.ok(p5.includes('            '+path),path+' must be retained by independent P5');
  for(const path of ['qa-results/p4-promotion-certificate.json','qa-results/p4-consumed-promotion-evidence.json','qa-results/premerge-p5/','dist/qa-p5-*.json'])assert.ok(deploy.includes('            '+path),path+' must be retained by P4 deploy');
  assert.match(deploy,/run: node scripts\/ci\/main-protection.mjs --live/,'Deployment must recheck live main protection');
  assert.match(deploy,/run: node scripts\/ci\/p4-promotion-evidence.mjs --consume/,'Deployment must verify exact-tree P4 evidence');
  assert.match(deploy,/gh api \"repos\/\$GITHUB_REPOSITORY\/git\/ref\/heads\/main\" --jq '\.object\.sha'/,'Deployment must reread exact main immediately before Pages deploy');
  assert.match(deploy,/if \[ \"\$current_main\" != \"\$EXPECTED_MAIN_SHA\" \]; then/,'Deployment must reject stale main before Pages deploy');
  assert.match(deploy,/run: npm run build/,'Deployment must build authoritative merged main');
  assert.doesNotMatch(deploy,/run: npm run qa:redteam:ci/,'Main must not repeat the certified E9 chain');
  assert.doesNotMatch(deploy,/^\s+run: npm run (?:qa:p5:ci|qa:garp27:foundation)$/m,'No second destructive certification after exact-tree evidence reuse');
}
if(process.argv[1]?.endsWith('check-redteam-ci-e9.mjs')){
  const input={pkg:JSON.parse(fs.readFileSync('package.json')),p5:fs.readFileSync('.github/workflows/p5-release-gate.yml','utf8'),deploy:fs.readFileSync('.github/workflows/deploy.yml','utf8'),runner:fs.readFileSync('scripts/run-redteam-ci-e10.mjs','utf8'),setup:readSetupSources()};
  validateRegressionCi(input);
  const mutations=[
    ['drop-VM',x=>x.pkg.scripts.test=x.pkg.scripts.test.replace(' && npm run check:redteam-verifier','')],
    ['drop-native',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-forgery-browser','')],
    ['drop-negatives',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-regression-negative','')],
    ['local-ci-drift',x=>x.pkg.scripts['qa:p5']=x.pkg.scripts['qa:p5'].replace(' && npm run check:redteam-restart-browser','')],
    ['skip-admission',x=>x.pkg.scripts['qa:redteam:ci']='npm run qa:p5:ci'],
    ['wrong-order',x=>x.runner=x.runner.replace("'npm run qa:garp27:foundation','node scripts/preserve-foundation-evidence-e10.mjs','npm run qa:p5:ci'","'npm run qa:p5:ci','npm run qa:garp27:foundation','node scripts/preserve-foundation-evidence-e10.mjs'")],
    ['drop-foundation-preservation',x=>x.runner=x.runner.replace("'node scripts/preserve-foundation-evidence-e10.mjs',",'')],
    ['changed-source-accepted',x=>x.runner=x.runner.replace('&&sourceUnchanged','')],
    ['unsafe-log-path',x=>x.runner=x.runner.replace("parts.join('-').replace(/[^a-zA-Z0-9._-]/g,'-')","parts.join('-')")],
    ['swallow-failure',x=>x.p5=x.p5.replace('run: npm run qa:redteam:ci','run: npm run qa:redteam:ci || true')],
    ['optional-gate',x=>x.p5=x.p5.replace('run: npm run qa:redteam:ci','continue-on-error: true\n        run: npm run qa:redteam:ci')],
    ['unlocked-install',x=>x.setup.toolsRunner=x.setup.toolsRunner.replace("['npm', 'ci'","['npm', 'install'")],
    ['unbound-artifact',x=>x.p5=x.p5.replace('p5-r2-${{ github.sha }}','p5-r2-latest')],
    ['missing-evidence',x=>x.p5=x.p5.replace('            qa-results/redteam-e10-ci/foundation-evidence/','')],
    ['deploy-bypass',x=>x.deploy=x.deploy.replace('run: node scripts/ci/p4-promotion-evidence.mjs --consume','run: true')],
  ];
  for(const [id,mutate] of mutations){const broken=structuredClone(input);mutate(broken);assert.throws(()=>validateRegressionCi(broken),{name:'AssertionError'},id);}
  const fakeNpm='C:/node/node_modules/npm/bin/npm-cli.js';
  const resolved=resolveStepCommand('npm test',{npmOptions:{platform:'win32',execPath:'C:/node/node.exe',npmExecPath:fakeNpm,exists:file=>file===fakeNpm}});
  assert.deepEqual(resolved,{program:'C:/node/node.exe',args:[fakeNpm,'test']},'Windows npm must run through the verified CLI and current Node executable');
  let spawnCalled=false;
  const missingCli=executeStep('npm test',{npmOptions:{platform:'win32',execPath:'C:/missing/node.exe',npmExecPath:'C:/missing/npm-cli.js',exists:()=>false},spawnSync:()=>{spawnCalled=true;}});
  assert.equal(spawnCalled,false,'missing npm CLI must fail before process launch');
  assert.equal(missingCli.status,null);
  assert.match(missingCli.error?.message||'',/npm CLI is unavailable/);
  const spawnFailure=Object.assign(new Error('spawnSync node ENOENT'),{code:'ENOENT',errno:-4058,syscall:'spawnSync node',path:'node'});
  const failedSpawn=executeStep('node missing.mjs',{spawnSync:()=>({status:null,stdout:'',stderr:'',error:spawnFailure})});
  assert.equal(failedSpawn.status,null);
  assert.deepEqual({code:failedSpawn.error.code,errno:failedSpawn.error.errno,syscall:failedSpawn.error.syscall},{code:'ENOENT',errno:-4058,syscall:'spawnSync node'});
  const nonzero=executeStep('node failing.mjs',{spawnSync:()=>({status:23,stdout:'',stderr:'failure'})});
  assert.equal(nonzero.status,23);
  assert.equal(nonzero.error,null);
  const timeout=Object.assign(new Error('spawnSync node ETIMEDOUT'),{code:'ETIMEDOUT',errno:-4039,syscall:'spawnSync node'});
  const timedOut=executeStep('node slow.mjs',{spawnSync:()=>({status:null,stdout:'',stderr:'',error:timeout})});
  assert.equal(timedOut.status,null);
  assert.equal(timedOut.error.code,'ETIMEDOUT');
  const complete=Array.from({length:5},()=>({pass:true}));
  assert.equal(regressionChainPasses(complete,5,{sha256:'same'},{sha256:'same'}),true);
  assert.equal(regressionChainPasses(complete,5,{sha256:'before'},{sha256:'after'}),false,'source mutation must fail closed');
  assert.equal(regressionChainPasses(complete.slice(0,4),5,{sha256:'same'},{sha256:'same'}),false,'incomplete chain must fail closed');
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e9-ci-contract.json',JSON.stringify({stage:'E9',version:input.pkg.version,status:'PASS',scope:`Static wiring contract with ${mutations.length} intentional mutations; actual process evidence is separate`,negativeControls:mutations.map(([id])=>({id,detected:true}))},null,2)+'\n');
  console.log('PASS E9 CI wiring,',mutations.length,'wiring mutations, and 7 runner portability/fail-closed controls');
}
