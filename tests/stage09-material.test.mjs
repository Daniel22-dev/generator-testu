import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mapGeneratedTestToMaterial, describeMaterialForReview, trustedStudioRoot
} from '../src/features/stage09-material.js';
import {saveMaterialToStudio} from '../src/features/stage09-save-to-studio-local.js';

const ID='git-01234567-89ab-4cde-8f01-123456789abc';
const base=(exercises,extra={})=>({
  cfg:{nazev:'CONFIDENTIAL_TEST_TITLE',teacherPin:'SECRET_TEACHER_PIN'},
  sourceState:{roster:[{name:'SECRET_STUDENT_NAME',email:'private@example.invalid'}]},
  variants:{__default:exercises,...extra},results:[{student:'SECRET_STUDENT_RESULT',points:39}],
});
const exercise=(type,items,extra={})=>({type,items,...extra});
const args=(assembled,extra={})=>({assembled,title:'Past habits',subject:'English',yearGroup:'3A4',
  objective:'Practise expressing past habits',level:'B1',language:'angličtina',
  id:ID,now:'2026-11-02T10:00:00.000Z',appVersion:'7.1.102',privacyConfirmed:true,...extra});
const options=['Used to','Will go','Going to'];

test('real canonical export preserves supported educational tasks and refuses private context',()=>{
  const assembly=base([
    exercise('multiple choice',[{question:'Choose a habitual past action.',options,correct:0,answer:'PRIVATE_KEY',explanation:'SECRET_EXPLANATION'}]),
    exercise('true/false',[{statement:'He used to cycle.',correct:true}]),
    exercise('reading comprehension',[{question:'What is preferred?',options:['Train','Car'],correct:0}],{passage:'The author chooses the train.'}),
    exercise('matching',[{left:'a',right:'b'}]),
  ],{alpha:[exercise('multiple choice',[{question:'SECRET_DIFFERENTIATED_VARIANT',options}])]});
  const out=mapGeneratedTestToMaterial(args(assembly));
  assert.equal(out.exportedItems,3);assert.equal(out.excludedItems,1);
  assert.deepEqual(out.material.content.tasks.map(x=>x.type),['select','truefalse','select']);
  assert.equal(out.material.language,'en');
  assert.match(out.material.content.tasks[2].prompt,/author chooses the train/i);
  const payload=JSON.stringify(out.material);
  for(const secret of ['SECRET_TEACHER_PIN','SECRET_STUDENT_NAME','private@example.invalid',
    'SECRET_STUDENT_RESULT','SECRET_DIFFERENTIATED_VARIANT','SECRET_EXPLANATION',
    'PRIVATE_KEY','CONFIDENTIAL_TEST_TITLE'])assert.ok(!payload.includes(secret),secret);
  assert.ok(out.material.content.tasks.every(x=>!('answer' in x)&&!('correct' in x)&&!('explanation' in x)));
  assert.ok(out.warnings.includes('answer-keys-and-explanations-omitted'));
  assert.match(describeMaterialForReview(out.material),/Choose a habitual past action/);
});

test('Spanish canonical GIT dialogue without distinct question remains portable',()=>{
  const ex=exercise('dialogue completion',[{dialogue:'A: ¿Cómo estás? B: ___',options:['Muy bien','Hasta mañana'],correct:0}]);
  const out=mapGeneratedTestToMaterial(args(base([ex]),{language:'španělština'}));
  assert.equal(out.exportedItems,1);assert.equal(out.material.language,'es');
  assert.equal(out.material.content.tasks[0].prompt,'A: ¿Cómo estás? B: ___');
  assert.equal(out.material.content.tasks[0].type,'select');
  const different=mapGeneratedTestToMaterial(args(base([
    exercise('dialogue completion',[{dialogue:'A: Hello B: ___',question:'What should B say?',options:['Hello','Bye'],correct:0}])
  ])));
  assert.equal(different.material.content.tasks[0].prompt,'A: Hello B: ___\n\nWhat should B say?');
  const alias=mapGeneratedTestToMaterial(args(base([
    exercise('dialogue completion',[{dialogue:'A: Hello B: ___',question:'A: Hello B: ___',options:['Hello','Bye']}])
  ])));
  assert.equal(alias.material.content.tasks[0].prompt,'A: Hello B: ___');
});

test('PII, scripting, credentials and unreviewed payload all fail closed',()=>{
  const attempt=question=>mapGeneratedTestToMaterial(args(base([
    exercise('multiple choice',[{question,options:['A','B']}]),
  ])));
  for(const unsafe of ['contact alice@example.invalid','<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>','javascript:alert(1)','BEGIN PRIVATE KEY: sample',
    'teacher PIN: 1234'])assert.throws(()=>attempt(unsafe),/PRIVATE_OR_ACTIVE_CONTENT/);
  assert.throws(()=>mapGeneratedTestToMaterial(args(base([
    exercise('multiple choice',[{question:'Valid',options:['A','B']}])
  ]),{privacyConfirmed:false})),/ANONYMITY_NOT_CONFIRMED/);
  assert.throws(()=>mapGeneratedTestToMaterial(args(base([
    exercise('matching',[{question:'Not portable'}])
  ]))),/NO_PORTABLE_TASKS/);
});

test('trusted Studio URL is exact same-origin app mount',()=>{
  const here='https://school.example/generator-testu/';
  assert.equal(trustedStudioRoot('/AI-Studio-GHRAB/',here),'https://school.example/AI-Studio-GHRAB/');
  assert.throws(()=>trustedStudioRoot('https://evil.example/AI-Studio-GHRAB/',here),/STUDIO_URL_UNTRUSTED/);
  assert.throws(()=>trustedStudioRoot('/AI-Studio-GHRAB-evil/',here),/STUDIO_URL_UNTRUSTED/);
});

test('vendored Studio helper equals pinned canonical git blob',()=>{
  const buffer=fs.readFileSync('src/features/stage09-save-to-studio-local.js');
  const digest=createHash('sha1').update(Buffer.from('blob '+buffer.length+'\0')).update(buffer).digest('hex');
  assert.equal(digest,'8e3229d1469b56065611d0942927ed5f8c494cf7');
});
test('official helper passes reviewed material to Platform Bridge v2 and declines PII',()=>{
  const beforeLoc=globalThis.location,beforePlatform=globalThis.GHRAB_PLATFORM;
  try {
    globalThis.location={href:'https://school.example/generator-testu/'};
    let packet=null;
    globalThis.GHRAB_PLATFORM={bridge:{create:x=>{packet=x;return {id:'synthetic-accepted'};},peek:()=>null}};
    const material=mapGeneratedTestToMaterial(args(base([
      exercise('multiple choice',[{question:'Pick A',options:['A','B'],correct:0}])
    ]))).material;
    const good=saveMaterialToStudio({material,studioUrl:'/AI-Studio-GHRAB/',
      sourceAppId:'generator',sourceAppVersion:'7.1.102',navigate:false});
    assert.equal(good.ok,true);
    assert.equal(packet.target,'ai-studio');
    assert.equal(packet.material.content.tasks[0].prompt,'Pick A');
    assert.equal(packet.material.content.tasks[0].answer,undefined);
    assert.equal(good.targetUrl,'https://school.example/AI-Studio-GHRAB/library/?studioHandoff=1');
    const dirty=structuredClone(material);dirty.content.sourceText='alice@example.invalid';
    const bad=saveMaterialToStudio({material:dirty,studioUrl:'/AI-Studio-GHRAB/',navigate:false});
    assert.equal(bad.ok,false);assert.equal(bad.reason,'unsafe-material');
  } finally {globalThis.location=beforeLoc;globalThis.GHRAB_PLATFORM=beforePlatform;}
});

test('actual teacher UI and offline service worker retain the consent and reviewed-state safety rails',()=>{
  const ui=fs.readFileSync('src/js/17a-stage09-material-outbound.js','utf8');
  const html=fs.readFileSync('src/shell.html','utf8');
  const sw=fs.readFileSync('public/sw.js','utf8');
  assert.match(html,/id="stage09SaveMaterial"/);
  assert.match(ui,/stage09Consent/);
  assert.ok(ui.split("!q('stage09Consent').checked").length>=3);
  assert.match(ui,/reviewedKey/);assert.match(ui,/saveMaterialToStudio/);
  assert.match(ui,/stage09-save-to-studio-local\.js/);
  assert.match(sw,/\.\/features\/stage09-material\.js/);
  assert.match(sw,/\.\/features\/stage09-save-to-studio-local\.js/);
});
test('legacy inbound accepts verified bridge v2 but rejects absent or malformed expiry',()=>{
  const source=fs.readFileSync('src/js/17-ai-studio-bridge.js','utf8');
  assert.match(source,/!Number\.isFinite\(expiry\)\|\|expiry<=Date\.now\(\)/);
  const sample={schema:'ghrab-material-v1',id:'synthetic',title:'Synthetic',subject:'English',content:{sourceText:'text'}};
  const packet=expiresAt=>({schema:'ghrab-handoff-v1',target:'generator',expiresAt,material:sample});
  const run=expiry=>{
    const state=new Map([['ghrab.handoff.v1',JSON.stringify(packet(expiry))]]);
    const scope={console,URL,URLSearchParams,Date,
      location:{search:'?studioHandoff=1',href:'https://school.example/generator-testu/'},
      localStorage:{getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,String(v)),removeItem:k=>state.delete(k)},
      window:{GHRAB_PLATFORM:{bridge:{take:()=>null}},addEventListener(){}}
    };
    const testSource=source.replace('  function boot(){','  window.__take = take;\n  function boot(){');
    assert.notEqual(testSource,source);
    vm.runInNewContext(testSource,scope,{timeout:3000});
    return {material:scope.window.__take(),remaining:state.get('ghrab.handoff.v1')};
  };
  for(const expiry of [undefined,'','broken','2020-01-01T00:00:00Z']){
    const result=run(expiry);assert.equal(result.material,null);assert.equal(result.remaining,undefined);
  }
  const accepted=run('2099-01-01T00:00:00Z');
  assert.equal(accepted.material.material.id,'synthetic');
});

// The complete CSP audit must parse the TWO new Stage09 ESM files as modules
// while retaining its AST safety scan (eval/new Function/string timers).
// This runs the same public security gate that release certification invokes.
test('CSP security scanner accepts exact reviewed Stage09 ESM modules without bypass',()=>{
  const source=fs.readFileSync('scripts/check-csp.mjs','utf8');
  for(const name of ['group-result-ledger.js','stage09-material.js','stage09-save-to-studio-local.js']){
    assert.ok(source.includes("path.join('src','features','"+name+"')"),name+' must be explicit in ESM allowlist');
  }
  assert.match(source,/sourceModules\.has\(file\)\?'module':'script'/);
  assert.match(source,/walk\(parse\(read\(file\)/);
  const actual=spawnSync(process.execPath,['scripts/check-csp.mjs'],{
    encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
  });
  assert.equal(actual.status,0,actual.stderr||actual.stdout||String(actual.error));
  assert.match(actual.stdout,/bez unsafe-eval/);
});
