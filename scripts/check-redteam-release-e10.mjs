import fs from 'node:fs';
import { validateP1Workflow } from './ci/p1-workflow-contract.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function requireReady(state,version){
  assert.equal(state.schema,'git-release-readiness-e10-v1');assert.equal(state.version,version);
  assert.ok(['READY FOR CONTROLLED STUDENT RED-TEAM','READY WITH DOCUMENTED LIMITATIONS'].includes(state.status),'Release is blocked: '+state.status);
  assert.deepEqual(state.blockers,[],'Unclosed classroom blockers');
  // Both ready states require an explicit owner decision and independent review
  // of THIS version. A JSON status flip is never equivalent to authorization.
  const owner=state.ownerDecision;
  assert.equal(owner?.authorizeGithubPublication,true,'Current owner must authorize GitHub publication');
  assert.match(owner?.recordedOn||'',/^\d{4}-\d{2}-\d{2}$/,'Current owner decision date is required');
  assert.equal(owner?.independentReview?.currentVersionIndependentlyReviewed,true,'Current version needs independent review');
  assert.equal(owner?.independentReview?.reviewedVersion,version,'Reviewed version must match exact release');
  assert.equal(owner?.independentReview?.currentVersion,version,'Owner review must identify current version');
  if(state.status==='READY WITH DOCUMENTED LIMITATIONS'){
    assert.equal(owner?.authorizeProductionReleaseAfterMandatoryGates,true,'Production release authorization is required');
    assert.equal(state.scope,'CONTROLLED_CLASSROOM_WITH_DOCUMENTED_LIMITATIONS','Controlled classroom scope required');
    assert.equal(owner?.LIVE_FORMS?.independentlyVerified,true,'Current-version live Forms integration requires school verification');
    assert.equal(owner?.E7_PHYSICAL?.physicalDevicesTested,true,'Current-version physical device UAT must be completed');
    assert.ok(Array.isArray(state.limitations)&&state.limitations.length>0,'Documented limitations required');
  }
  if(state.status==='READY FOR CONTROLLED STUDENT RED-TEAM'){
    assert.equal(state.scope,'CONTROLLED_STUDENT_RED_TEAM_ONLY','Controlled release scope required');
    assert.equal(state.ownerDecision?.authorizeGithubPublication,true,'Explicit owner publication decision required');
    assert.match(state.ownerDecision?.recordedOn||'',/^\d{4}-\d{2}-\d{2}$/,'Owner decision date required');
    assert.equal(state.ownerDecision?.E6_INCIDENT?.status,'DEFERRED_BY_OWNER','E6 deferral must be explicit');
    assert.equal(state.ownerDecision.E6_INCIDENT.closed,false,'Deferred E6 must not be reported closed');
    assert.equal(state.ownerDecision?.LIVE_FORMS?.status,'OWNER_REPORTED_CHECKED','Forms owner confirmation required');
    assert.equal(state.ownerDecision?.E7_PHYSICAL?.status,'SCHEDULED','Physical mobile verification must remain scheduled');
    assert.equal(state.ownerDecision.E7_PHYSICAL.physicalDevicesTested,false,'Scheduled mobile verification is not a PASS');
    assert.ok(state.ownerDecision.E7_PHYSICAL.testDates?.length>0,'Controlled test dates required');
    for(const date of state.ownerDecision.E7_PHYSICAL.testDates)assert.match(date,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(state.limitations)&&state.limitations.length>0,'Documented limitations required');
  }
}
export function releaseDecision(state,version){
  try{requireReady(state,version);return {releaseReadiness:state.status,releaseBlocked:false};}
  catch(error){if(error instanceof assert.AssertionError)return {releaseReadiness:state.status,releaseBlocked:true};throw error;}
}
function wiring({pkg,deploy,promotion}){
  validateP1Workflow(promotion);
  for(const chain of ['test','qa:p5','qa:p5:ci'])for(const gate of ['content','e10'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:redteam-'+gate),chain+' requires '+gate);
  for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:redteam-content-browser'));
  for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:c32-preview-boundary-browser'),chain+' requires the C32 browser boundary regression');
  for(const chain of ['qa:p5','qa:p5:ci'])assert.ok(pkg.scripts[chain].split(' && ').includes('npm run check:d02-preview-separation-browser'),chain+' requires the D02 preview-separation browser regression');
  assert.doesNotMatch(deploy,/push:\s*\n\s*branches: \[main\]/);assert.match(deploy,/workflow_dispatch:/);assert.match(deploy,/deploy:\s*\n\s*if: github.ref == 'refs\/heads\/main'/);
  assert.match(deploy,/run: node scripts\/check-redteam-release-e10.mjs --require-ready/);assert.match(deploy,/run: node scripts\/ci\/main-protection.mjs --live/);assert.match(deploy,/run: node scripts\/ci\/p4-promotion-evidence.mjs --consume/);assert.match(deploy,/if \[ \"\$current_main\" != \"\$EXPECTED_MAIN_SHA\" \]; then/);
  assert.match(promotion,/run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
  assert.ok(promotion.indexOf('--require-ready')<promotion.indexOf('gh pr merge'),'Readiness precedes merge');
  assert.equal((promotion.match(/run: npm run qa:redteam:ci/g)||[]).length,2,'Both candidate certifications use complete regression chain');
}
if(process.argv[1]?.endsWith('check-redteam-release-e10.mjs')){
  const pkg=JSON.parse(fs.readFileSync('package.json')),state=JSON.parse(fs.readFileSync('security/release-readiness-e10.json'));
  if(process.argv.includes('--require-ready')){requireReady(state,pkg.version);console.log('PASS release readiness');}
  else{
    const input={pkg,deploy:fs.readFileSync('.github/workflows/deploy.yml','utf8'),promotion:fs.readFileSync('.github/workflows/safe-promotion.yml','utf8')};wiring(input);
    const mutations=[['drop-content',x=>x.pkg.scripts.test=x.pkg.scripts.test.replace('npm run check:redteam-content && ','')],['drop-native',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:redteam-content-browser','')],['drop-c32-preview-boundary',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:c32-preview-boundary-browser','')],['drop-d02-preview-separation',x=>x.pkg.scripts['qa:p5:ci']=x.pkg.scripts['qa:p5:ci'].replace(' && npm run check:d02-preview-separation-browser','')],['drop-merge-readiness',x=>x.promotion=x.promotion.replace('run: node scripts/check-redteam-release-e10.mjs --require-ready','run: true')],['drop-deploy-readiness',x=>x.deploy=x.deploy.replace('run: node scripts/check-redteam-release-e10.mjs --require-ready','run: true')],['deploy-candidate',x=>x.deploy=x.deploy.replace("deploy:\n    if: github.ref == 'refs/heads/main'","deploy:\n    if: true")],['deploy-without-p4-evidence',x=>x.deploy=x.deploy.replace('run: node scripts/ci/p4-promotion-evidence.mjs --consume','run: true')],['partial-promotion-gate',x=>x.promotion=x.promotion.replace('run: npm run qa:redteam:ci','run: npm run qa:p5:ci')]];
    for(const [id,mutate] of mutations){const broken=structuredClone(input);mutate(broken);assert.throws(()=>wiring(broken),{name:'AssertionError'},id);}
    const currentReview={status:'SIGNED_VERSION_REVIEW',reviewedVersion:pkg.version,currentVersion:pkg.version,currentVersionIndependentlyReviewed:true};
    const ready={...state,status:'READY WITH DOCUMENTED LIMITATIONS',
      scope:'CONTROLLED_CLASSROOM_WITH_DOCUMENTED_LIMITATIONS',blockers:[],
      ownerDecision:{...state.ownerDecision,recordedOn:'2026-11-01',
        authorizeGithubPublication:true,authorizeProductionReleaseAfterMandatoryGates:true,
        independentReview:currentReview,
        LIVE_FORMS:{...state.ownerDecision.LIVE_FORMS,independentlyVerified:true},
        E7_PHYSICAL:{...state.ownerDecision.E7_PHYSICAL,physicalDevicesTested:true}}};
    requireReady(ready,pkg.version);
    const negativeControls=mutations.map(([id])=>({id,detected:true}));
    for(const [id,broken] of [['not-ready',{...ready,status:'NOT READY – BLOCKING ISSUE'}],['unclosed-blocker',{...ready,blockers:[{id:'synthetic'}]}],['wrong-version',{...ready,version:'7.1.85'}]]){assert.throws(()=>requireReady(broken,pkg.version),{name:'AssertionError'},id);negativeControls.push({id,detected:true});}
    // Mutation tests for the formerly unguarded "READY WITH DOCUMENTED LIMITATIONS" branch.
    for(const [id,mutate] of [
      ['ready-missing-owner',x=>delete x.ownerDecision],
      ['ready-without-publication-approval',x=>x.ownerDecision.authorizeGithubPublication=false],
      ['ready-without-production-approval',x=>x.ownerDecision.authorizeProductionReleaseAfterMandatoryGates=false],
      ['ready-stale-independent-review',x=>x.ownerDecision.independentReview.reviewedVersion='7.1.101'],
      ['ready-unverified-physical-uat',x=>x.ownerDecision.E7_PHYSICAL.physicalDevicesTested=false],
      ['ready-unverified-forms',x=>x.ownerDecision.LIVE_FORMS.independentlyVerified=false],
      ['ready-preproduction-scope',x=>x.scope='PREPRODUCTION_REVIEW_ONLY'],
      ['ready-unrestricted-scope',x=>x.scope='UNRESTRICTED'],
      ['ready-missing-scope',x=>delete x.scope],
    ]){
      const broken=structuredClone(ready);mutate(broken);
      assert.throws(()=>requireReady(broken,pkg.version),{name:'AssertionError'},id);
      negativeControls.push({id,detected:true});
    }
    const controlled={...state,status:'READY FOR CONTROLLED STUDENT RED-TEAM',scope:'CONTROLLED_STUDENT_RED_TEAM_ONLY',blockers:[],ownerDecision:{recordedOn:'2026-11-01',authorizeGithubPublication:true,
      independentReview:currentReview,E6_INCIDENT:{status:'DEFERRED_BY_OWNER',closed:false},LIVE_FORMS:{status:'OWNER_REPORTED_CHECKED'},E7_PHYSICAL:{status:'SCHEDULED',physicalDevicesTested:false,testDates:['2026-10-06','2026-10-09']}},limitations:['Synthetic controlled release fixture']};
    requireReady(controlled,pkg.version);
    for(const [id,mutate] of [['missing-owner-decision',x=>delete x.ownerDecision],['unauthorized-publication',x=>x.ownerDecision.authorizeGithubPublication=false],['unscoped-release',x=>x.scope='UNRESTRICTED'],['undocumented-e6',x=>x.ownerDecision.E6_INCIDENT.status='UNKNOWN'],['false-e6-closure',x=>x.ownerDecision.E6_INCIDENT.closed=true],['unconfirmed-forms',x=>x.ownerDecision.LIVE_FORMS.status='PENDING'],['invented-mobile-pass',x=>x.ownerDecision.E7_PHYSICAL.physicalDevicesTested=true],['unscheduled-mobile',x=>x.ownerDecision.E7_PHYSICAL.testDates=[]],['missing-limitations',x=>x.limitations=[]]]){
      const broken=structuredClone(controlled);mutate(broken);assert.throws(()=>requireReady(broken,pkg.version),{name:'AssertionError'},id);negativeControls.push({id,detected:true});
    }
    const report={stage:'E10',version:pkg.version,status:'PASS',...releaseDecision(state,pkg.version),readinessSha256:createHash('sha256').update(fs.readFileSync('security/release-readiness-e10.json')).digest('hex'),blockers:state.blockers,negativeControls,scope:'Local workflow and readiness enforcement contract. Readiness follows the versioned owner decision; controlled release does not certify physical devices or close deferred incidents.'};fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e10-release.json',JSON.stringify(report,null,2)+'\n');console.log('PASS E10 release guard;',state.status);
  }
}
