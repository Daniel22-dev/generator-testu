import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {w,gdom,configure,build,decryptedVariants,TEACH,REC} from './redteam-harness-utils.mjs';
import {scanStudentHtml,readStaticConfig,validatePrivatePair,preparePublication,scanPublicationDirectory,scanGitHistory,sha256} from './student-publication-lib.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'git-e6-')),checks=[],mutations=[];
const selected=process.env.GIT_REDTEAM_E6_CASE||'all';
let pkg;
async function group(id,fn){if(selected!=='all'&&selected!==id)return;await fn();checks.push(id);console.log('PASS E6',id);}
const insert=(html,text)=>html.replace('</body>',text+'</body>');
const changeCfg=(patch)=>{const cfg=readStaticConfig(pkg.studentHtml,'CFG');return pkg.studentHtml.replace(/const CFG=[\s\S]*?;\nconst STUDENT_VARIANTS=/,'const CFG='+JSON.stringify({...cfg,...patch})+';\nconst STUDENT_VARIANTS=');};
function rejected(id,html){const result=scanStudentHtml(html);assert.equal(result.status,'FAIL',id);assert.ok(result.findings.length,id);mutations.push({id,findings:result.findings});}
try {
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");pkg=await build();
  await group('generated-student-and-private-pair',async()=>{
    const r=scanStudentHtml(pkg.studentHtml);assert.equal(r.status,'PASS',JSON.stringify(r.findings));
    assert.equal(validatePrivatePair(pkg.studentHtml,pkg.teacherHtml).status,'PASS');
    for(const secret of [TEACH,REC,'A7B9C2','synthetic-a@example.invalid'])assert.equal(pkg.studentHtml.includes(secret),false);
    assert.equal(scanStudentHtml(pkg.teacherHtml).status,'FAIL','renamed private verifier must be rejected');
  });
  await group('all-21-exercise-types',async()=>{
    const types='multiple choice|reading comprehension|listening comprehension|dialogue completion|true/false|matching|fill-in-the-blank|error correction|error-tagging|word order|translation|sentence transformation|word formation|categorization|cloze text|multi-select|ordering|categorisation-board|table-completion|transformation-chain|highlight-evidence'.split('|');
    const marker='E6_PRIVATE_SYNTHETIC_CANARY';
    const items=(type,index)=>({question:'Q',prompt:'Prompt',sentence:'A ___ sentence',statement:'Statement',options:['A','B'],correct:type==='true/false'?true:(type==='multi-select'?[0]:0),answer:marker,answers:[marker],alt_answers:type==='cloze text'?[[marker]]:[marker],correct_order:[1,0],correct_category:'X',correct_sentence:marker,model_answer:marker,right:'Right '+index,transcript:marker,explanation:marker,error_token_index:1,error_type:'verb',correction:marker,teacherConfig:{privateKey:marker},answer_hash:marker,shuffle_seed:marker,words:['two','one'],text:type==='listening comprehension'?marker:'Passage with ___',source:type==='listening comprehension'?marker:'Source',passage:type==='listening comprehension'?marker:'Passage',audio_url:marker,source_url:marker,left:'L',item:'item',categories:['X','Y'],items:['two','one'],entries:[{text:'entry one',category:'X',answer_hash:marker},{text:'entry two',category:'Y',answer_hash:marker}],tokens:['A','token'],error_type_options:['verb','noun'],columns:['one','two'],rows:[['fixed',{answer:marker,secret:marker}]],base_sentence:'Base',transformations:[{instruction:'Transform',answer:marker,privateKey:marker}],sentences:['first','second']});
    const counts=type=>type==='matching'?2:1;
    const gen={exercises:types.map(type=>({title:type,type,points_total:counts(type),points_each:1,teacherConfig:marker,items:Array.from({length:counts(type)},(_,i)=>items(type,i))}))};
    const fixtureState={...w.eval('state'),exerciseDetail:true,exerciseConfig:types.map(typ=>({typ,pocetOtazek:counts(typ),body:counts(typ)}))};
    const result=await w.assembleTestHtml(fixtureState,gen);
    assert.equal(result.studentHtml.includes(marker),false,'all nested private canaries must be removed');
    const r=scanStudentHtml(result.studentHtml);assert.equal(r.status,'PASS',JSON.stringify(r.findings));
    const variants=await decryptedVariants(result);assert.equal(variants.__default.length,21);
    const listening=variants.__default.find(x=>x.type==='listening comprehension');assert.ok(!listening.items[0].text&&!listening.items[0].source&&!listening.items[0].passage);
    assert.equal(validatePrivatePair(result.studentHtml,result.teacherHtml).status,'PASS');
  });
  await group('export-answer-derivative-rejection',async()=>{
    const cfg=readStaticConfig(pkg.studentHtml,'CFG'),variants=readStaticConfig(pkg.studentHtml,'STUDENT_VARIANTS');
    for(const key of ['answer_hash','answerChecksum','normalized_answer','correct_position','shuffle_seed','teacher_config','private_jwk','debug_config']) {
      assert.throws(()=>w.assertSecureStudentIsolation(cfg,{...variants,synthetic:[{items:[{[key]:'synthetic'}]}]},pkg.studentHtml),/zakázané/,key);
      assert.throws(()=>w.assertSecureStudentIsolation({...cfg,synthetic:{[key]:'synthetic'}},variants,pkg.studentHtml),/zakázané/,key);
    }
  });
  await group('hidden-data-comments-scripts-attributes',async()=>{
    rejected('hidden-json',insert(pkg.studentHtml,'<script type="application/json">{"answer_key":["synthetic"]}</script>'));
    rejected('template-hidden-json',insert(pkg.studentHtml,'<template><script type="application/json">{"correct":0}</script></template>'));
    rejected('single-script-hidden-answer',pkg.studentHtml.replace('const STUDENT_VARIANTS=',"const E6_HIDDEN={answer:'synthetic'};\nconst STUDENT_VARIANTS="));
    rejected('unused-teacher-module',insert(pkg.studentHtml,'<script>function teacherLogin(){}</script>'));
    rejected('teacher-hash-comment',insert(pkg.studentHtml,'<!-- teacherPinHash="synthetic" -->'));
    rejected('teacher-secret-comment',insert(pkg.studentHtml,'<!-- Teacher secret: synthetic -->'));
    rejected('answer-hash-comment',insert(pkg.studentHtml,'<!-- answer_hash="synthetic" -->'));
    rejected('attribute',insert(pkg.studentHtml,'<div hidden data-correct-answer="synthetic"></div>'));
    rejected('source-map',insert(pkg.studentHtml,'<!-- //# sourceMappingURL=student.js.map -->'));
    rejected('external-script',insert(pkg.studentHtml,'<script src="unused-teacher.js"></script>'));
    rejected('private-pem',insert(pkg.studentHtml,'<!-- -----BEGIN PRIVATE KEY----- synthetic -----END PRIVATE KEY----- -->'));
    const cfg=readStaticConfig(pkg.studentHtml,'CFG'),privateCfg=readStaticConfig(pkg.teacherHtml,'CONFIG');
    rejected('private-rsa',changeCfg({publicKey:{...cfg.publicKey,d:privateCfg.privateKey.d}}));
    rejected('nested-roster',changeCfg({diffGroups:[{key:'x',name:'X',studentHashes:['synthetic']}]}));
    rejected('hidden-config',changeCfg({extra:{teacher_secret:'synthetic'}}));
    rejected('executable-cfg',pkg.studentHtml.replace('const CFG=','const CFG=window.__E6_EXECUTED=true,'));
    assert.equal(globalThis.__E6_EXECUTED,undefined,'scanner must not execute scanned HTML');
  });
  await group('private-pair-byte-and-identity-binding',async()=>{
    assert.throws(()=>validatePrivatePair(insert(pkg.studentHtml,'<!-- innocent change -->'),pkg.teacherHtml),/does not match/);
    const other=await build();assert.throws(()=>validatePrivatePair(pkg.studentHtml,other.teacherHtml),/does not match/);
    assert.throws(()=>validatePrivatePair(pkg.teacherHtml,pkg.studentHtml),/preflight failed/);
    assert.throws(()=>validatePrivatePair(pkg.studentHtml,pkg.studentHtml),/configuration/);
  });
  await group('publication-allowlist-and-no-private-copy',async()=>{
    const student=path.join(temp,'student.html'),teacher=path.join(temp,'PRIVATE.html'),out=path.join(temp,'publish');
    fs.writeFileSync(student,pkg.studentHtml);fs.writeFileSync(teacher,pkg.teacherHtml);
    assert.equal(preparePublication(student,teacher,out).status,'PASS');
    assert.deepEqual(fs.readdirSync(out).sort(),['.nojekyll','index.html','student-publication.json']);
    assert.equal(sha256(fs.readFileSync(path.join(out,'index.html'))),pkg.studentHtmlSha256);
    assert.throws(()=>preparePublication(student,teacher,out),/already exist/);
    for(const name of ['teacher.html','secret.json','student.js.map','backup.zip','private.pem','old.html.bak','.env']) {
      const p=path.join(out,name);fs.writeFileSync(p,name==='teacher.html'?pkg.teacherHtml:'synthetic');
      assert.equal(scanPublicationDirectory(out).status,'FAIL',name);fs.unlinkSync(p);
    }
    fs.symlinkSync(teacher,path.join(out,'other.html'));assert.equal(scanPublicationDirectory(out).status,'FAIL');fs.unlinkSync(path.join(out,'other.html'));
    fs.appendFileSync(path.join(out,'index.html'),'<!-- mutation -->');assert.equal(scanPublicationDirectory(out).status,'FAIL');
    fs.writeFileSync(path.join(out,'index.html'),pkg.teacherHtml);assert.equal(scanPublicationDirectory(out).status,'FAIL','teacher renamed index');
    const bad=path.join(temp,'bad.html');fs.writeFileSync(bad,pkg.teacherHtml);assert.throws(()=>preparePublication(bad,teacher,path.join(temp,'no-output')),/preflight/);assert.equal(fs.existsSync(path.join(temp,'no-output')),false);
  });
  await group('deleted-blob-and-all-ref-history',async()=>{
    const repo=path.join(temp,'history');fs.mkdirSync(repo);
    const git=(...args)=>execFileSync('git',args,{cwd:repo,stdio:'pipe'});
    git('init','-q','-b','main');git('config','user.name','Synthetic');git('config','user.email','synthetic@example.invalid');
    fs.writeFileSync(path.join(repo,'README.md'),'Synthetic public repository\n');git('add','.');git('commit','-qm','clean');
    assert.equal(scanGitHistory(path.join(repo,'.git')).status,'PASS');
    fs.writeFileSync(path.join(repo,'teacher.html'),pkg.teacherHtml);git('add','.');git('commit','-qm','intentionally leaked');git('branch','leaked-ref');
    git('rm','-q','teacher.html');git('commit','-qm','removed from head');
    const r=scanGitHistory(path.join(repo,'.git'));assert.equal(r.status,'FAIL');assert.equal(r.reachableCommits,3);assert.equal(r.refs.length,2);
    assert.ok(r.findings.some(f=>f.paths.includes('teacher.html')&&f.findings.includes('private-jwk')),'deleted historical private verifier remains detectable');
    assert.equal(JSON.stringify(r).includes(readStaticConfig(pkg.teacherHtml,'CONFIG').privateKey.d),false,'report must omit secret values');
  });
  assert.ok(checks.length,'Unknown E6 case');
  const report={schema:'git-redteam-e6-publication-gate-v1',version:w.eval('RELEASE.version'),status:'PASS',syntheticOnly:true,checks,negativeArtifactMutations:mutations,scope:'Actual generated artifacts, native Node WebCrypto, static nonexecuting scanner, temporary owner-side private pairing and synthetic deleted-file Git history. No actual student data saved.',readiness:'NOT READY – BLOCKING ISSUE',limits:['No proof that arbitrary prose/encoded data hides no answers or secrets','F7 encrypts stripped content; this stage does not deploy or rewrite history','Private verifier is trusted owner-side input, not a server signature','Native mobile: ANALYZED / NOT TESTED']};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e6-publication.json',JSON.stringify(report,null,2)+'\n');
}finally{fs.rmSync(temp,{recursive:true,force:true});gdom.window.close();}
