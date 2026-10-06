// Real generator -> generated student public-key encryption -> generated private verifier.
// Baseline controls select independent groups; policy setup is optional only on old builds.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {w,gdom,configure,build,genDom} from './redteam-harness-utils.mjs';
const selected=process.env.GIT_REDTEAM_E3_CASE||'all',checks=[],children=[];
const policy={schoolDomain:'example.invalid',publishedAt:'2026-10-03T11:59:00Z',csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,oneResponseConfirmed:false};
const source={source:'google-forms-csv',fullYearCsv:true,formIdentity:'synthetic-a@example.invalid',formTimestamp:'2026-10-03T12:16:00Z'};
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D4E6F8',label:'Synthetic B',email:'synthetic-b@example.invalid'}];");
  const pkg=await build(),x=genDom(pkg.studentHtml),v=genDom(pkg.teacherHtml);children.push(x,v);await new Promise(r=>setTimeout(r,0));const cfg=x.eval('CFG');
  const base={v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:pkg.studentHtmlSha256,attemptId:'E3-A',identityMode:'oneTimeCode',code:'A7B9C2',student:'A7B9C2',groupKey:'__default',startedAt:'2026-10-03T12:00:00Z',submittedAt:'2026-10-03T12:15:00Z',resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},securityEvents:[{t:'2026-10-03T12:00:00Z',type:'attempt-start'}]};
  function reset(p=policy){if(v.verifierReplayStorageKey){v.localStorage.removeItem(v.verifierReplayStorageKey());v.eval('VERIFIER_REPLAY_HISTORY=[];');}if(v.setFormsAnchorPolicy)v.setFormsAnchorPolicy(p);else v.eval('RESULTS=[];ATTEMPT_DECISIONS.clear();');}
  async function text(payload=base){return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,manifestHash:cfg.manifestHash,payload:await x.encryptPayloadForTeacher(payload)});}
  async function submit(patch={},sm=source){return v.verifyText('e3-synthetic.txt',await text({...base,...patch}),sm);}
  async function reject(patch,sm=source,code){reset();const result=await submit(patch,sm);assert.equal(result.classification,'invalid-current');assert.equal(result.row?.status,'CHYBA');assert.equal(result.row?.total,0,'rejection must precede scoring');assert.equal(v.effectiveResults().length,0);if(code)assert.equal(result.code,code);return result;}
  async function group(id,fn){if(selected!=='all'&&selected!==id)return;reset();await fn();checks.push(id);console.log('PASS E3',id);}
  await group('forms-policy',async()=>{
    assert.equal(v.e3PragueLocalIso('2026-10-06','13:20'),'2026-10-06T13:20:00+02:00');
    assert.equal(v.e3PragueLocalIso('2026-01-15','13:20'),'2026-01-15T13:20:00+01:00');
    assert.equal(v.e3PragueLocalIso('2026-07-15','13:20'),'2026-07-15T13:20:00+02:00');
    assert.equal(v.e3PragueLocalIso('2026-10-06','25:80'),'');
    assert.throws(()=>v.setFormsAnchorPolicy({...policy,publishedAt:undefined,publishedDate:'2026-10-06',publishedTime:''}));
    assert.throws(()=>v.setFormsAnchorPolicy({...policy,csvOriginalConfirmed:false}));
    const uiPolicy=v.setFormsAnchorPolicy({...policy,publishedAt:undefined,publishedDate:'2026-10-06',publishedTime:'13:20'});
    assert.equal(uiPolicy.publishedAt,'2026-10-06T13:20:00+02:00');assert.equal(uiPolicy.csvOriginalConfirmed,true);assert.equal(Object.prototype.hasOwnProperty.call(uiPolicy,'oneResponseConfirmed'),false);
    const limitOff=v.setFormsAnchorPolicy({...policy,oneResponseConfirmed:false});assert.equal(limitOff.schoolDomain,'example.invalid');
  });
  await group('schema',async()=>{
    for(const patch of [{v:2},{attemptId:''},{resp:[]},{resp:{'99_0':1}},{resp:{'0_0':'1'}},{resp:{'0_0':99}},{resp:{'0_0':-1}},{resp:{'0_0':{answer:1}}},{securityEvents:[]},{securityEvents:null},{securityEvents:[{type:'attempt-start'}]},{securityEvents:[{t:base.startedAt,type:'attempt-start',bad:{nested:true}}]},{serverVerified:true},{trustAssessment:{runtimeAuthenticity:'PREVENTED'}},{totalAnswerChanges:1},{answerChangeStats:{'0_0':-1}},{jokerUsed:true,jokerSelectedAt:base.submittedAt},{pct:Infinity}])await reject(patch);
    reset();const missing={...base};delete missing.securityEvents;const result=await v.verifyText('missing.txt',await text(missing),source);assert.equal(result.row?.status,'CHYBA');
    reset();const partial=await submit({resp:{},pct:100,grade:1});assert.equal(partial.classification,'current');assert.equal(partial.row.pct,0,'client grade is not scored');
    const legacy=await submit({attemptId:'OTHER'});assert.equal(legacy.row.total,5);
  });
  await group('answers',async()=>{
    const cases=[
      ...['multiple choice','reading comprehension','listening comprehension','dialogue completion'].map(t=>[t,{question:'Pick A',options:['A','B'],correct:0},0,2]),
      ['true/false',{statement:'True',correct:true},true,'true'],
      ['highlight-evidence',{question:'Pick A',sentences:['A','B'],correct:0},0,2],
      ['multi-select',{question:'Pick A and B',options:['A','B','C'],correct:[0,1]},[0,1],[0,0]],
      ['ordering',{question:'Order',items:['B','A'],correct_order:[1,0]},[1,0],[2]],
      ['categorization',{text:'x',categories:['A','B'],correct_category:'A'},'A','outside'],
      ['matching',{left:'A',right:'a'},'a','outside'],
      ['fill-in-the-blank',{sentence:'___ ___',answers:['x','y']},['x','y'],['x','y','z']],
      ['cloze text',{text:'___',answers:['x']},['x'],[1]],
      ['transformation-chain',{base_sentence:'x',transformations:[{instruction:'x',answer:'x'}]},['x'],['x','y']],
      ['categorisation-board',{question:'Sort',categories:['A','B'],entries:[{text:'x',category:'A'}]},['A'],['outside']],
      ['table-completion',{question:'Fill',columns:['Fixed','Input'],rows:[['Fixed',{answer:'x'}]]},[[null,'x']],[['replace-fixed','x']]],
      ['error-tagging',{sentence:'She go',tokens:['She','go'],error_token_index:1,error_type_options:['verb'],error_type:'verb',correction:'goes'},{token:1,etype:'verb',corr:'goes'},{token:2,etype:'verb',corr:'goes'}],
      ...['error correction','word order','translation','sentence transformation','word formation'].map(t=>[t,{sentence:'x',prompt:'x',answer:'x',correct_sentence:'x',correction:'x'},'x',{nested:'x'}])
    ];
    const exs=cases.map(([type,it])=>({title:type,type,points_total:1,points_each:1,items:[it]}));
    const apkg=await w.assembleSecureOfflinePackage({__outputFields:{recoveryCode:'REC-AB12-CD34'}},w.eval('lastAssembled.cfg'),{__default:exs});
    const ax=genDom(apkg.studentHtml),av=genDom(apkg.teacherHtml);children.push(ax,av);await new Promise(r=>setTimeout(r,0));if(av.setFormsAnchorPolicy)av.setFormsAnchorPolicy(policy);
    const acfg=ax.eval('CFG'),resp=Object.fromEntries(cases.map(([t,,a],i)=>[i+(t==='matching'?'_match_':'_')+'0',a]));
    const p={...base,testId:acfg.testId,manifestHash:acfg.manifestHash,studentHtmlSha256:apkg.studentHtmlSha256,resp};
    const atxt=async data=>'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:acfg.testId,manifestHash:acfg.manifestHash,payload:await ax.encryptPayloadForTeacher(data)});
    const good=await av.verifyText('all-answers.txt',await atxt(p),source);assert.equal(good.classification,'current');assert.equal(good.row.total,21);assert.equal(good.row.pct,100);
    for(let i=0;i<cases.length;i++){const [t,,,bad]=cases[i],qid=i+(t==='matching'?'_match_':'_')+'0',invalid=await av.verifyText('invalid-answer.txt',await atxt({...p,resp:{...resp,[qid]:bad}}),source);assert.equal(invalid.row?.status,'CHYBA',t);assert.equal(invalid.row.total,0,t);}
  });
  await group('identity',async()=>{
    await reject({}, {...source,formIdentity:'synthetic-b@example.invalid'},'anchors.identity-mismatch');
    await reject({}, {...source,formIdentity:'synthetic-a@other.invalid'},'anchors.email');await reject({}, {...source,formIdentity:''},'anchors.email');await reject({}, {...source,formIdentity:source.formIdentity+' '.repeat(400)+'junk'},'anchors.source-shape');
    await reject({code:'ZZZZZZ',student:'ZZZZZZ'});await reject({student:'D4E6F8'});await reject({groupKey:'unknown'});await reject({manifestHash:'wrong'});await reject({testId:'other-test'},{...source,fullYearCsv:false});
    reset();if(v.eval('typeof FORMS_ANCHOR_POLICY')!=='undefined')v.eval('FORMS_ANCHOR_POLICY=null;');const missing=await submit();assert.equal(missing.row?.status,'CHYBA');assert.equal(missing.code,'anchors.missing-policy');
    reset();const good=await submit({}, {...source,formIdentity:'SYNTHETIC-A@EXAMPLE.INVALID'});assert.equal(good.classification,'current');assert.equal(v.resultTrust(good.row).externalIdentity,'MATCHED_FORMS_ROSTER');
    const originalRoster=v.eval('CONFIG.roster');for(const roster of [[{code:'A7B9C2'}],[{code:'A7B9C2',email:'synthetic-a@other.invalid'}],[{code:'A7B9C2',email:'synthetic-a@example.invalid'},{code:'D4E6F8',email:'synthetic-a@example.invalid'}],[{code:'A7B9C2',email:'synthetic-a@example.invalid'},{code:'A7B9C2',email:'synthetic-b@example.invalid'}]]){v.__badRoster=roster;v.eval('CONFIG.roster=window.__badRoster');await reject({},source,'anchors.roster');}v.__badRoster=originalRoster;v.eval('CONFIG.roster=window.__badRoster');
    good.row.trustAssessment={externalIdentity:'FORGED',classificationAuthorization:'AUTHORIZED'};assert.equal(v.resultTrust(good.row).externalIdentity,'MATCHED_FORMS_ROSTER');assert.equal(v.resultTrust(good.row).classificationAuthorization,'REVIEW_REQUIRED');
    assert.throws(()=>v.setFormsAnchorPolicy({...policy,verifiedEmailConfirmed:false}));
  });
  await group('time',async()=>{
    for(const patch of [{startedAt:'2040-01-01T12:00:00Z',submittedAt:'2000-01-01T12:00:00Z'},{startedAt:'2026-10-03T11:58:59Z',securityEvents:[{type:'attempt-start',t:'2026-10-03T11:58:59Z'}]},{submittedAt:'2026-10-03T12:16:01Z'},{startedAt:'2026-02-30T12:00:00Z'},{startedAt:'2026-10-03 12:00:00'},{securityEvents:[{type:'attempt-start',t:'2026-10-03T12:15:01Z'}]}])await reject(patch);
    for(const timestamp of ['', 'not-a-time','2026-10-03T11:58:00Z','25.10.2026 02:30:00','29.3.2026 02:30:00'])await reject({}, {...source,formTimestamp:timestamp});
    reset();const boundary=await submit({submittedAt:'2026-10-03T12:16:00.999Z'}, {...source,formTimestamp:'3.10.2026 14:16:00'});assert.equal(boundary.classification,'current');assert.equal(v.resultTrust(boundary.row).externalTimeWindow,'WITHIN_PUBLICATION_FORMS_WINDOW');
    await reject({submittedAt:'2026-10-03T12:16:01.000Z'}, {...source,formTimestamp:'3.10.2026 14:16:00'},'anchors.time-window');
  });
  await group('replay',async()=>{
    const txt=await text();const a=await v.verifyText('one.txt',txt,source);assert.equal(a.classification,'current');assert.equal(v.effectiveResults().length,1);
    const b=await v.verifyText('two.txt',txt,source);assert.equal(b.row.exactDuplicate,true);assert.equal(v.classificationStatus(b.row),'REJECTED');assert.equal(v.effectiveResults().length,1);
    const c=await submit({pct:3,grade:5});assert.notEqual(c.row.submissionDigest,a.row.submissionDigest);assert.equal(c.row.semanticDigest,a.row.semanticDigest);assert.equal(c.row.replayStatus,'SEMANTIC_DUPLICATE');assert.equal(v.effectiveResults().length,1);
    const d=await submit({attemptId:'E3-B',resp:{'0_0':0}});assert.equal(d.row.hardReplayConflict,true);assert.equal(v.effectiveResults().length,0);v.chooseAttemptByDigest(d.row.submissionDigest);assert.equal(v.effectiveResults().length,0,'manual selection cannot bypass conflict');
    reset();await submit();const collision=await submit({student:'D4E6F8',code:'D4E6F8'}, {...source,formIdentity:'synthetic-b@example.invalid'});assert.equal(collision.row.replayStatus,'ATTEMPT_CONFLICT');assert.equal(v.effectiveResults().length,0);
  });
  await group('csv',async()=>{
    const txt=await text(),q=s=>'"'+s.replaceAll('"','""')+'"',row=(mail='synthetic-a@example.invalid',payload=txt,other='')=>['2026-10-03T12:16:00Z',mail,payload,other].map(q).join(',');
    const header='Timestamp,Email Address,Result,Other\n';const summary=await v.importFormsCsvText(header+row()+'\n'+row()+'\n'+row('synthetic-a@example.invalid',txt,txt)+'\n'+row('synthetic-a@example.invalid',''),'e3.csv');
    assert.equal(summary.ok,2);assert.equal(summary.ambiguous,1);assert.equal(summary.missing,1);assert.equal(v.eval('RESULTS.length'),4);assert.equal(v.effectiveResults().length,1);assert.equal(summary.replayRejected,1);
    await v.importFormsCsvText(header+row(),'e3-again.csv');assert.equal(v.effectiveResults().length,1);assert.equal(v.eval('RESULTS.length'),5,'imports append to the existing replay ledger');
    for(const malformed of ['Timestamp,Email Address,Email Address\na,b,c','Timestamp,Email Address,Result\na,b','Timestamp,Email Address,Result\na,b,c,d','Timestamp,Email Address,Result\n"a"x,b,c','Timestamp,Email Address,Result\na,b,"c'])assert.throws(()=>v.parseFormsCsvText(malformed));
    assert.throws(()=>v.parseFormsCsvText('Timestamp,Entered Email,Result\na,b,c'),'owner-selected email header must exist');
    const semicolon='\uFEFFTimestamp;Email Address;Result\r\n'+['3.10.2026 14:16:00','synthetic-a@example.invalid',txt].map(q).join(';');assert.equal(v.parseFormsCsvText(semicolon).delimiter,';');
    reset();const diag=await submit({},{});assert.equal(diag.classification,'diagnostic-only');assert.equal(diag.row.status,'DIAGNOSTIC_ONLY');assert.equal(v.effectiveResults().length,0);assert.equal(v.classificationStatus(diag.row),'DIAGNOSTIC_ONLY');v.afterResultsChanged();assert.equal(v.document.getElementById('studentSelect').options.length,1);assert.ok(v.feedbackHtmlFor(diag.row,'score-only').includes('DIAGNOSTIC_ONLY'));assert.equal(v.resultTrust(diag.row).externalIdentity,'MISSING_FORMS');
  });
  await group('json',async()=>{
    const valid=await text(),pack=JSON.parse(valid.slice(valid.indexOf('\n')+1));
    async function rawText(raw){const c=x.crypto.subtle,aes=await c.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']),iv=x.crypto.getRandomValues(new Uint8Array(12)),data=await c.encrypt({name:'AES-GCM',iv},aes,new TextEncoder().encode(raw)),pub=await c.importKey('jwk',cfg.publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']),key=await c.encrypt({name:'RSA-OAEP'},pub,await c.exportKey('raw',aes)),b=buf=>Buffer.from(buf).toString('base64url');return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,manifestHash:cfg.manifestHash,payload:{mode:'encrypted',alg:'RSA-OAEP+AES-GCM',key:b(key),iv:b(iv),data:b(data)}});}
    const plainDuplicate=JSON.stringify(base).replace('"v":1','"v":0,"v":1');const inner=await v.verifyText('inner-duplicate.txt',await rawText(plainDuplicate),source);assert.equal(inner.row?.status,'CHYBA');assert.equal(inner.code,'schema.duplicate-key');
    const duplicate='SECURE-ANSWERS-V1\n'+JSON.stringify(pack).replace('"testId":','"testId":"ignored","testId":');let result=await v.verifyText('dup.txt',duplicate,source);assert.equal(result.row?.status,'CHYBA');assert.equal(result.code,'schema.duplicate-key');
    result=await v.verifyText('proto.txt','SECURE-ANSWERS-V1\n{"__proto__":{},"payload":{}}',source);assert.equal(result.code,'schema.prototype');
    result=await v.verifyText('oversize.txt','SECURE-ANSWERS-V1\n'+ ' '.repeat(2*1024*1024),source);assert.equal(result.code,'envelope.size');
    for(const change of [{payload:{...pack.payload,iv:'AA'}},{payload:{...pack.payload,alg:'plain'}},{unexpected:1}]){result=await v.verifyText('bad-envelope.txt','SECURE-ANSWERS-V1\n'+JSON.stringify({...pack,...change}),source);assert.equal(result.row?.status,'CHYBA');assert.equal(result.row.total,0);}
  });
  assert.ok(checks.length,'unknown E3 case');const report={status:'PASS',version:w.eval('RELEASE.version'),syntheticOnly:true,checks,scope:'actual generated HTML, RSA-OAEP/AES-GCM, direct import and CSV import',limits:['Owner attests Forms settings and unaltered CSV; no live configuration proof','Private E4 digest observations survive restart; full storage deletion or another profile needs server trust','Consistent public-key forgeries remain possible; runtime CLIENT-CONTROLLED','Mobile NOT TESTED; F7 and E5–E10 pending']};
  if(selected==='all'){fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e3-verifier.json',JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));
}finally{children.forEach(x=>x.close());gdom.window.close();}
