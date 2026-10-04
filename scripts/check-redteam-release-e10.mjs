import fs from 'node:fs';
import assert from 'node:assert/strict';
export function requireReady(state,version){
  assert.equal(state.schema,'git-release-readiness-e10-v1');assert.equal(state.version,version);
  assert.ok(['READY FOR CONTROLLED STUDENT RED-TEAM','READY WITH DOCUMENTED LIMITATIONS'].includes(state.status),'Release is blocked: '+state.status);
  assert.deepEqual(state.blockers,[],'Unclosed classroom blockers');
}
function wiring({pkg,deploy,promotion}){
  for(const chain of ['test','qa:p5','qa:p5:ci'])for(const gate of ['content','e10'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' requires '+gate);
  for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:redteam-content-browser'));
  assert.match(deploy,/branches: \[main\]/);assert.match(deploy,/deploy:\s*\n\s*if: github.ref == 'refs\/heads\/main'/);
  assert.match(deploy,/run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
  assert.match(promotion,/run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
  assert.ok(promotion.indexOf('--require-ready')<promotion.indexOf('gh pr merge'),'Readiness precedes merge');
  assert.equal((promotion.match(/run: npm run qa:redteam:ci/g)||[]).length,2,'Both candidate certifications use complete regression chain');
}
if(process.argv[1]?.endsWith('check-redteam-release-e10.mjs')){
  const pkg=JSON.parse(fs.readFileSync('package.json')),state=JSON.parse(fs.readFileSync('security/release-readiness-e10.json'));
  if(process.argv.includes('--require-ready')){requireReady(state,pkg.version);console.log('PASS release readiness');}
  else{
    const input={pkg,deploy:fs.readFileSync('.github/workflows/deploy.yml','utf8'),promotion:fs.readFileSync('.github/workflows/safe-promotion.yml','utf8')};wiring(input);
    const mutations=[['drop-content',x=>x.pkg.scripts.test=x.pkg.scripts.test.replace('npm run check:redteam-content && ','')],['drop-native',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-content-browser','')],['drop-merge-readiness',x=>x.promotion=x.promotion.replace('run: node scripts/check-redteam-release-e10.mjs --require-ready','run: true')],['drop-deploy-readiness',x=>x.deploy=x.deploy.replace('run: node scripts/check-redteam-release-e10.mjs --require-ready','run: true')],['deploy-candidate',x=>x.deploy=x.deploy.replace("deploy:\n    if: github.ref == 'refs/heads/main'","deploy:\n    if: true")],['partial-promotion-gate',x=>x.promotion=x.promotion.replace('run: npm run qa:redteam:ci','run: npm run qa:p5:ci')]];
    for(const [id,mutate] of mutations){const broken=structuredClone(input);mutate(broken);assert.throws(()=>wiring(broken),{name:'AssertionError'},id);}
    const ready={...state,status:'READY WITH DOCUMENTED LIMITATIONS',blockers:[]};requireReady(ready,pkg.version);
    const negativeControls=mutations.map(([id])=>({id,detected:true}));
    for(const [id,broken] of [['not-ready',state],['unclosed-blocker',{...ready,blockers:[{id:'synthetic'}]}],['wrong-version',{...ready,version:'7.1.85'}]]){assert.throws(()=>requireReady(broken,pkg.version),{name:'AssertionError'},id);negativeControls.push({id,detected:true});}
    const report={stage:'E10',version:pkg.version,status:'PASS',releaseReadiness:state.status,releaseBlocked:true,blockers:state.blockers,negativeControls,scope:'Local workflow and readiness enforcement contract. A synthetic READY fixture is only a positive validator control; current release remains NOT READY.'};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e10-release.json',JSON.stringify(report,null,2)+'\n');console.log('PASS E10 release guard;',state.status);
  }
}
