// E8 runs the real generated private verifier, never a replacement implementation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,genDom} from './redteam-harness-utils.mjs';
import {createFixtures,clone,packet,text,reset,source,evidenceHash} from './redteam-forgery-fixtures-e8.mjs';
import {cases} from './redteam-forgery-cases-e8.mjs';
const probe=process.env.GIT_REDTEAM_E8_MODE==='probe',rows=[],windows=[];
function replaceOnce(html,needle,value){assert.ok(html.includes(needle),'negative-control seam absent: '+needle);return html.replace(needle,value);}
function weakened(html,c,ctx){
  if(c.expect==='REJECTED'){
    if(c.code==='crypto.parse-decrypt')return replaceOnce(html,'async function decryptPayload(pack){','async function decryptPayload(pack){return '+JSON.stringify(ctx.p)+';');
    return replaceOnce(html,'function e3Require(ok,code,message){','function e3Require(ok,code,message){if(code==='+JSON.stringify(c.code)+')return;');
  }
  if(c.expect==='REPLAY_REJECTED')return replaceOnce(html,'function rebuildDuplicateState(){','function rebuildDuplicateState(){return;');
  if(c.expect==='RESCORED')return replaceOnce(html,'scored=scorePayload(payload);','scored=scorePayload(payload);scored.pct=payload.pct;scored.grade=payload.grade;');
  if(c.expect==='OTHER_TEST')return replaceOnce(html,"if(fullYear&&payload.testId!==CONFIG.testId)return {classification:'other-test',verifiedTestId:payload.testId};",'');
  if(c.expect==='JOKER_EXCLUDED')return replaceOnce(html,'jokerUsed:!!payload.jokerUsed,','jokerUsed:false,');
  if(c.expect==='DIAGNOSTIC_ONLY')return replaceOnce(html,'function evaluateFormsAnchors(p,source){',"function evaluateFormsAnchors(p,source){return {identity:'MATCHED_FORMS_ROSTER',timeWindow:'WITHIN_PUBLICATION_FORMS_WINDOW',diagnosticOnly:false,codes:[]};");
  return replaceOnce(html,"runtimeAuthenticity:'CLIENT-CONTROLLED',","runtimeAuthenticity:'AUTHENTICATED',");
}
async function prepare(f,c){let ctx={p:clone(f.base),source:clone(source)};ctx.p.attemptId='E8-'+c.id;ctx=c.build?c.build(ctx):ctx;let pack=await packet(f,ctx.p,ctx.rawInner);if(ctx.outer)pack=ctx.outer(pack);ctx.txt=ctx.rawOuter?ctx.rawOuter(text(pack)):text(pack);return ctx;}
async function check(f,c,ctx){
  reset(f);if(ctx.missingPolicy)f.v.eval('FORMS_ANCHOR_POLICY=null;');
  const v=f.v,a=await v.verifyText('synthetic-'+c.id+'.txt',ctx.txt,ctx.source);
  if(c.expect==='REJECTED'){
    assert.equal(a.classification,'invalid-current',c.id);assert.equal(a.code,c.code,c.id);
    assert.equal(a.row.status,'CHYBA');assert.equal(a.row.total,0,'reject before private scoring');assert.equal(v.effectiveResults().length,0);
    assert.equal(v.resultTrust(a.row).scoreSource,'NOT_SCORED');assert.equal(v.classificationStatus(a.row),'REJECTED');
  }else if(c.expect==='OTHER_TEST'){
    assert.equal(a.classification,'other-test');assert.equal(v.eval('RESULTS.length'),0);assert.equal(v.effectiveResults().length,0);
  }else if(c.expect==='REPLAY_REJECTED'){
    assert.equal(a.classification,'current');assert.equal(v.effectiveResults().length,1);
    const p=clone(ctx.p),sm=clone(ctx.source);let txt=ctx.txt;
    if(c.sequence==='score-only-reencrypted'){p.pct=0;p.grade=5;}
    if(c.sequence==='changed-answer-same-attempt')p.resp['0_0']=0;
    if(c.sequence==='new-attempt-same-identity')p.attemptId+='-SECOND';
    if(c.sequence==='same-attempt-other-identity'){p.student=p.code='D4E6F8';sm.formIdentity='synthetic-b@example.invalid';}
    if(c.sequence!=='exact-ciphertext')txt=text(await packet(f,p));
    const b=await v.verifyText('synthetic-repeated.txt',txt,sm);assert.equal(b.classification,'current');
    const duplicate=['exact-ciphertext','reencrypted-same','score-only-reencrypted'].includes(c.sequence);
    assert.equal(v.classificationStatus(b.row),'REJECTED');assert.equal(v.effectiveResults().length,duplicate?1:0);
    if(duplicate){assert.equal(b.row.exactDuplicate,true);assert.equal(b.row.replayStatus,c.sequence==='exact-ciphertext'?'EXACT_DUPLICATE':'SEMANTIC_DUPLICATE');}
    else{assert.equal(b.row.hardReplayConflict,true);assert.equal(v.classificationStatus(a.row),'REJECTED');v.chooseAttemptByDigest(b.row.submissionDigest);assert.equal(v.effectiveResults().length,0);}
  }else{
    const diagnostic=c.expect==='DIAGNOSTIC_ONLY',joker=c.expect==='JOKER_EXCLUDED';
    assert.equal(a.classification,diagnostic?'diagnostic-only':'current');assert.equal(a.row.pct,c.pct);assert.equal(a.row.total,5);
    const trust=v.resultTrust(a.row);assert.equal(trust.encryption,'DECRYPTED_NOT_AUTHENTICATED');assert.equal(trust.runtimeAuthenticity,'CLIENT-CONTROLLED');assert.equal(trust.scoreSource,'TEACHER_ANSWER_KEY');
    assert.equal(v.classificationStatus(a.row),diagnostic?'DIAGNOSTIC_ONLY':joker?'JOKER_EXCLUDED':'REVIEW_REQUIRED');assert.equal(v.effectiveResults().length,diagnostic||joker?0:1);
    if(!diagnostic){assert.equal(trust.externalIdentity,'MATCHED_FORMS_ROSTER');assert.equal(trust.externalTimeWindow,'WITHIN_PUBLICATION_FORMS_WINDOW');}
    if(c.expect==='RESCORED')assert.equal(a.row.grade,v.gradeFor(c.pct),'client grade must be ignored');
  }
  return {classification:a.classification,code:a.code||'',scored:a.row?.total||0,effective:v.effectiveResults().length};
}
let fixtures;
try{
  fixtures=await createFixtures();
  for(const c of cases){
    const f=fixtures[c.fixture],ctx=await prepare(f,c);let result;
    try{result=await check(f,c,ctx);}catch(e){if(!probe)throw e;rows.push({id:c.id,expect:c.expect,categories:c.categories,status:'BASELINE_GAP',diagnostic:e.message.slice(0,600)});continue;}
    let negative='NOT_RUN_BASELINE_PROBE';
    if(!probe){
      const v=genDom(weakened(f.pkg.teacherHtml,c,ctx));windows.push(v);await new Promise(r=>setTimeout(r,0));
      try{await check({...f,v},c,ctx);assert.fail('negative control escaped: '+c.id);}catch(e){if(e.code!=='ERR_ASSERTION'||e.message.startsWith('negative control escaped:'))throw e;negative='DETECTED_WEAKENED_BUILD';}finally{v.close();windows.pop();}
    }
    rows.push({id:c.id,group:c.group,expect:c.expect,categories:c.categories,status:'PASS',...result,negativeControl:negative});
  }
  const html=fs.readFileSync(process.env.GIT_REDTEAM_GENERATOR_HTML||'dist/index.html');
  const report={stage:'E8',version:w.eval('RELEASE.version'),status:probe?'BASELINE_PROBE':'PASS',syntheticOnly:true,generatorSha256:evidenceHash(html),caseCount:rows.length,rejections:rows.filter(r=>r.expect==='REJECTED'&&r.status==='PASS').length,replaySequences:rows.filter(r=>r.expect==='REPLAY_REJECTED'&&r.status==='PASS').length,controls:rows.filter(r=>!['REJECTED','REPLAY_REJECTED'].includes(r.expect)&&r.status==='PASS').length,negativeControls:rows.filter(r=>r.negativeControl==='DETECTED_WEAKENED_BUILD').length,baselineGaps:rows.filter(r=>r.status==='BASELINE_GAP').length,cases:rows,scope:'Actual generated HTML in jsdom; native Node RSA-OAEP/AES-GCM, independent public-key-only hostile payload creation; controlled DOM/IndexedDB. Original CSP/native desktop browser is a separate gate.',negativeControlMethod:'Each oracle is rerun against a deliberately weakened generated verifier in memory. Exact diagnostic codes are part of rejection oracles: a secondary rejection with the wrong code is a detected guard regression, not evidence of successful forgery acceptance.',categories:['PREVENTED','DETECTED','HARDENED','BEST-EFFORT','CLIENT-CONTROLLED','ARCHITECTURAL LIMIT','SERVER REQUIRED'],limits:['Consistent public-key forgeries and copied expected HTML hashes can reach private scoring; REVIEW_REQUIRED, never runtime authenticated','Forms policy and unaltered owner-imported CSV are attested, not live-inspected','Telemetry contradictions are detectable; consistent fabricated telemetry is CLIENT-CONTROLLED','Private replay persistence is same-profile best effort; full wipe/new profile needs server trust','Mobile ANALYZED / NOT TESTED; another device MIMO TECHNICKÝ DOSAH – POUZE DOZOR','F7 content encryption, E6 residual/rotation, physical E7 and E9/E10 remain blocking; NOT READY']};
  const path=process.env.GIT_REDTEAM_E8_REPORT||'qa-results/redteam-e8-forgery.json';fs.mkdirSync(path.slice(0,path.lastIndexOf('/')),{recursive:true});fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({stage:report.stage,version:report.version,status:report.status,cases:report.caseCount,rejections:report.rejections,replay:report.replaySequences,controls:report.controls,negativeControls:report.negativeControls,baselineGaps:report.baselineGaps}));
}finally{windows.forEach(x=>x.close());if(fixtures)Object.values(fixtures).forEach(f=>{f.x.close();f.v.close();});gdom.window.close();}
