// Actual generator and encrypted student artifacts. No private artifact is saved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {w,gdom,configure,build,genDom,decryptedVariants,GEN,TEACH,REC} from './redteam-harness-utils.mjs';
import {readStaticConfig,scanStudentHtml} from './student-publication-lib.mjs';
const checks=[],negativeControls=[],children=[];
const child=html=>{const x=genDom(html,undefined,new Map(),false);children.push(x);return x;};
function inactive(x){assert.equal(x.isTestActive(),false);assert.equal(x.eval('STARTED_AT'), '');assert.equal(x.eval('TIMER_DEADLINE'),0);assert.equal(x.eval('ATTEMPT_ID'),'');assert.equal(x.document.querySelectorAll('#exerciseArea input').length,0);assert.equal(Object.keys(x.eval('STUDENT_VARIANTS')).length,0);}
async function blocked(pkg,code,html=pkg.studentHtml){const x=child(html);x.document.getElementById('studentName').value='Synthetic';x.document.getElementById('startCode').value=code;await x.startTest();inactive(x);return x;}
async function test(id,fn){await fn();checks.push({id,status:'PASS'});console.log('PASS E10',id);}
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true});
  const pkg=await build();if(process.env.GIT_REDTEAM_E10_OLD_PROBE){assert.equal(pkg.studentHtml.includes('Q1?'),false,'old build exposes pre-start question');process.exit(0);}
  const cfg=readStaticConfig(pkg.studentHtml,'CFG'),cipher=readStaticConfig(pkg.studentHtml,'ENCRYPTED_CONTENT');
  await test('opaque-artifact-private-secret',async()=>{
    assert.match(pkg.startCode,/^[A-Z2-7]{10}$/);assert.equal(pkg.studentHtml.includes(pkg.startCode),false);
    for(const secret of [TEACH,REC,...GEN.exercises[0].items.map(x=>x.question)])assert.equal(pkg.studentHtml.includes(secret),false,'plaintext secret/question absent');
    assert.equal(Object.keys(readStaticConfig(pkg.studentHtml,'STUDENT_VARIANTS')).length,0);assert.equal(scanStudentHtml(pkg.studentHtml).status,'PASS');
    assert.equal(readStaticConfig(pkg.teacherHtml,'CONFIG').startCode,pkg.startCode);
    const variants=await decryptedVariants(pkg);assert.equal(variants.__default[0].items[0].question,'Q1?');assert.equal('correct' in variants.__default[0].items[0],false);
    inactive(child(pkg.studentHtml));
  });
  if(process.env.GIT_REDTEAM_E10_OLD_PROBE)process.exit(0);
  await test('missing-short-wrong-and-classroom-code',async()=>{
    const wrong=(pkg.startCode[0]==='A'?'B':'A')+pkg.startCode.slice(1);
    for(const code of ['', 'ABC234', wrong, REC, TEACH])await blocked(pkg,code);
  });
  await test('cipher-tamper-and-binding',async()=>{
    const x=child(pkg.studentHtml);
    const change=s=>(s[0]==='A'?'B':'A')+s.slice(1);
    for(const [id,alter] of [['data',c=>({...c,data:change(c.data)})],['tag',c=>({...c,data:c.data.slice(0,-3)+change(c.data.slice(-3))})],['iv',c=>({...c,iv:change(c.iv)})],['salt',c=>({...c,salt:change(c.salt)})],['iterations',c=>({...c,iterations:1})],['algorithm',c=>({...c,alg:'plaintext'})],['extra-field',c=>({...c,code:pkg.startCode})]]){
      const broken=alter(cipher);await assert.rejects(x.decryptStudentContent(broken,pkg.startCode,cfg));
      const html=pkg.studentHtml.replace('const ENCRYPTED_CONTENT='+JSON.stringify(cipher),'const ENCRYPTED_CONTENT='+JSON.stringify(broken));assert.notEqual(html,pkg.studentHtml);await blocked(pkg,pkg.startCode,html);negativeControls.push({id:'altered-'+id,detected:true});
    }
    for(const key of ['testId','manifestHash'])await assert.rejects(x.decryptStudentContent(cipher,pkg.startCode,{...cfg,[key]:cfg[key]+'x'}));
  });
  await test('fresh-code-salt-iv-and-cross-package',async()=>{
    const other=await build(),otherCipher=readStaticConfig(other.studentHtml,'ENCRYPTED_CONTENT');
    assert.notEqual(pkg.startCode,other.startCode);for(const key of ['salt','iv','data'])assert.notEqual(cipher[key],otherCipher[key]);
    await blocked(other,pkg.startCode);
    const random=w.crypto.getRandomValues;w.crypto.getRandomValues=()=>{throw new Error('synthetic entropy denial');};
    try{await assert.rejects(w.encryptStudentContent({__default:[]},cfg),/entropy denial/);}finally{w.crypto.getRandomValues=random;}
    negativeControls.push({id:'no-randomness-no-export',detected:true});
  });
  await test('correct-code-memory-only-and-independent-scoring',async()=>{
    const x=child(pkg.studentHtml);x.document.getElementById('studentName').value='Synthetic';x.document.getElementById('startCode').value=pkg.startCode.toLowerCase();await x.startTest();assert.equal(x.isTestActive(),true);assert.equal(x.eval('CONTENT_READY'),true);assert.equal(x.document.getElementById('startCode').value,'');
    x.setResp('0_0',1);await x.flushPendingAttemptWrites();
    for(let i=0;i<x.localStorage.length;i++){const value=x.localStorage.getItem(x.localStorage.key(i));assert.equal(value.includes(pkg.startCode),false);assert.equal(value.includes('Q1?'),false);}
    for(const stores of x.__qaIdbState.values())for(const entries of stores.values())for(const value of entries.values()){const text=JSON.stringify(value);assert.equal(text.includes(pkg.startCode),false);assert.equal(text.includes('Q1?'),false);}
    await x.submitSecureTest();const v=genDom(pkg.teacherHtml);children.push(v);const pack=v.parseTxt(x.document.getElementById('answerBackup').value),payload=await v.decryptPayload(pack);assert.equal(v.scorePayload(payload).pct,20);assert.equal('startCode' in payload,false);
  });
  await test('missing-webcrypto-fails-closed',async()=>{
    const x=child(pkg.studentHtml);Object.defineProperty(x,'crypto',{value:{getRandomValues:w.crypto.getRandomValues.bind(w.crypto)}});x.document.getElementById('studentName').value='Synthetic';x.document.getElementById('startCode').value=pkg.startCode;await x.startTest();inactive(x);
  });
  if(process.env.GIT_REDTEAM_E10_BASELINE_HTML){
    const result=spawnSync(process.execPath,[process.argv[1]],{env:{...process.env,GIT_REDTEAM_GENERATOR_HTML:process.env.GIT_REDTEAM_E10_BASELINE_HTML,GIT_REDTEAM_E10_OLD_PROBE:'1'},encoding:'utf8',timeout:45000});
    assert.equal(result.status,1);assert.match(result.stderr,/ERR_ASSERTION/);assert.doesNotMatch(result.stderr,/SyntaxError|ReferenceError|TypeError|MODULE_NOT_FOUND/);
    negativeControls.push({id:'actual-7.1.85-build',detected:true,actualExit:result.status});
  }
  const report={stage:'E10',version:w.eval('RELEASE.version'),status:'PASS',checks,negativeControls,entropyBits:50,kdf:{name:'PBKDF2-SHA256',iterations:210000},cipher:'AES-256-GCM',aad:'testId+manifestHash',scope:'Actual opaque generated artifact, production decryptor and private scoring; synthetic inputs only',physicalMobile:'ANALYZED / NOT TESTED',limits:['After the start code is disclosed, a client owner can inspect content.','Encryption protects pre-start confidentiality; no result or runtime authentication.','Publish encrypted student artifacts as late as possible.']};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e10-content.json',JSON.stringify(report,null,2)+'\n');
}finally{children.forEach(x=>x.close());gdom.window.close();}
