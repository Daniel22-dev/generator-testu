#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {configure,build,w,enterStartCode} from './redteam-harness-utils.mjs';

const origin='http://127.0.0.1:18809';
const contexts=[];
let browser;
const errors=[];
let nativeBefore=null,nativeAfter=null,nativeFrameAccess=null;

async function nativeStorageSnapshot(page){
  return page.evaluate(async()=>{
    const local={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      local[key]=localStorage.getItem(key);
    }
    const session={};
    for(let i=0;i<sessionStorage.length;i++){
      const key=sessionStorage.key(i);
      session[key]=sessionStorage.getItem(key);
    }
    const databases=typeof indexedDB.databases==='function'?await indexedDB.databases():[];
    const idb=[];
    for(const info of databases){
      if(!info||!info.name)continue;
      const detail=await new Promise((resolve,reject)=>{
        const request=indexedDB.open(info.name);
        request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
        request.onsuccess=()=>{
          const db=request.result;
          const stores=Array.from(db.objectStoreNames);
          if(!stores.length){db.close();resolve({name:info.name,version:info.version||db.version,stores:[]});return;}
          let pending=stores.length;
          const rows=[];
          for(const storeName of stores){
            const tx=db.transaction(storeName,'readonly');
            const store=tx.objectStore(storeName);
            const keys=store.getAllKeys();
            const values=store.getAll();
            tx.oncomplete=()=>{rows.push({name:storeName,keys:keys.result.map(String),values:values.result.map(value=>JSON.stringify(value))});if(--pending===0){db.close();resolve({name:info.name,version:info.version||db.version,stores:rows.sort((a,b)=>a.name.localeCompare(b.name))});}};
            tx.onerror=()=>reject(tx.error||new Error('IndexedDB read failed'));
            tx.onabort=()=>reject(tx.error||new Error('IndexedDB read aborted'));
          }
        };
      });
      idb.push(detail);
    }
    return {local,session,idb:idb.sort((a,b)=>a.name.localeCompare(b.name))};
  });
}
try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false,strictIPhoneCompatibilityAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  // The preview/editor is a lazy feature: load its real source into the generator harness.
  const lazyScript=w.document.createElement('script');
  lazyScript.textContent=fs.readFileSync('src/features/preview-editor.js','utf8');
  w.document.body.appendChild(lazyScript);
  assert.equal(typeof w.getPreviewHtml,'function','preview feature must register in the generator document');
  w.__hotfixPkg=pkg;
  w.eval('generatedPackage=window.__hotfixPkg');
  const pv=w.getPreviewHtml();
  assert.ok(pv&&pv.html&&pv.secure);
  assert.ok(pv.html.includes('data-ghrab-private-teacher-preview="1"'));
  assert.ok(pv.html.includes('__GHRAB_PRIVATE_TEACHER_PREVIEW__'));
  assert.ok(pv.html.includes(pkg.startCode),'private unlock code should exist only in transient teacher preview');
  assert.ok(!pkg.studentHtml.includes(pkg.startCode),'student export must not publish the unlock code');
  for(const forbidden of ['__GHRAB_TEACHER_PREVIEW__','strictTeacherPreview','__GHRAB_PRIVATE_TEACHER_PREVIEW__','data-ghrab-private-teacher-preview']){
    assert.ok(!pkg.studentHtml.includes(forbidden),`student export must not contain ${forbidden}`);
  }
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  contexts.push(ctx);
  const shell='<html><head><meta charset="utf-8"></head><body><main id="stage"></main></body></html>';
  await ctx.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body:shell}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e&&e.message||e||'unknown page error')));
  await page.goto(origin+'/preview');
  nativeBefore=await nativeStorageSnapshot(page);
  async function openPreview(width){
    await page.evaluate(({html,width})=>{
      document.getElementById('stage').innerHTML='';
      const frame=document.createElement('iframe');
      frame.id='teacher-preview';
      frame.setAttribute('sandbox','allow-scripts allow-modals');
      frame.style.width=width+'px';frame.style.height='680px';
      document.getElementById('stage').appendChild(frame);
      frame.srcdoc=html;
    },{html:pv.html,width});
    const frame=page.frameLocator('#teacher-preview');
    await frame.locator('#studentName').waitFor();
    const boot=await frame.locator('body').evaluate(()=>({privatePreview:window.__GHRAB_PRIVATE_TEACHER_PREVIEW__===true,ready:strictReadyState(),verifySource:String(verifyStrictTest).slice(0,120)}));
    assert.equal(boot.privatePreview,true,'generator-only private adapter must initialize in the isolated iframe');
    return frame;
  }
  let frame=await openPreview(360);
  assert.deepEqual(errors,[],'preview must load without page errors before native storage probe');
  nativeFrameAccess=await frame.locator('body').evaluate(async()=>{
    const out={};
    try{out.localStorage={available:true,length:localStorage.length,keys:Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))};}
    catch(error){out.localStorage={available:false,error:String(error&&error.name||error)};}
    return out;
  });
  assert.deepEqual(errors,[],'native storage probe must not create page errors');
  assert.ok(nativeFrameAccess.localStorage.available===false||nativeFrameAccess.localStorage.length===0,'legitimate preview must not observe native localStorage records');
  assert.equal(await frame.locator('#studentName').inputValue(),'A7B9C2');
  assert.equal(await frame.locator('#startCode').inputValue(),pkg.startCode);
  await frame.locator('#strictVerifyBtn').click();
  await page.waitForTimeout(500);
  const verifiedState=await frame.locator('body').evaluate(()=>({ready:strictReadyState(),preflight:STRICT_PREFLIGHT,status:$('strictStartStatus')&&$('strictStartStatus').textContent||'',fallbackHidden:$('strictFallbackStartBtn').classList.contains('hidden')}));
  assert.equal(verifiedState.ready,'private-preview-ready',JSON.stringify(verifiedState));
  assert.equal(verifiedState.fallbackHidden,false,JSON.stringify(verifiedState));
  await frame.locator('#strictFallbackStartBtn').click();
  await frame.locator('#exerciseArea').locator('[data-qid]').first().waitFor({timeout:15000});
  let state=await frame.locator('#timer').textContent();
  assert.match(state,/NÁHLED/);
  assert.ok(await frame.locator('#strictRuntimeModeNotice').isVisible());
  const audit=await frame.locator('#strictRuntimeModeNotice').textContent();
  assert.match(audit,/SIMULACE/);
  const before=await frame.locator('#exerciseArea [data-qid]').count();
  assert.ok(before>0);
  const previewRuntime=await frame.locator('body').evaluate(async()=>({
    privatePreview:window.__GHRAB_PRIVATE_TEACHER_PREVIEW__===true,
    mode:STRICT_FULLSCREEN_MODE,
    timerDeadline:TIMER_DEADLINE,
    answerText:ANSWER_TXT,
    activeAttempt:storageGet('activeAttempt'),
    submitted:storageGet('submitted'),
    signedAttempt:await loadSignedRecord('activeAttempt')
  }));
  assert.equal(previewRuntime.privatePreview,true,'generator-only private adapter must be active');
  assert.equal(previewRuntime.mode,'private-preview','private adapter must identify the isolated simulation');
  assert.equal(previewRuntime.timerDeadline,0,'preview must not arm a real timer deadline');
  assert.equal(previewRuntime.answerText,'','preview must not create a real answer payload');
  assert.equal(previewRuntime.activeAttempt,null,'preview must not share active-attempt persistence');
  assert.equal(previewRuntime.submitted,null,'preview must not share submitted persistence');
  assert.deepEqual(previewRuntime.signedAttempt,{record:null,tamper:false},'preview must not create a signed persistence record');
  await page.evaluate(()=>{document.querySelector('#teacher-preview').style.width='768px'});
  await frame.locator('#exerciseArea [data-qid]').first().waitFor();
  await page.evaluate(()=>{document.querySelector('#teacher-preview').style.width='100%'});
  assert.ok(await frame.locator('#exerciseArea [data-qid]').count()>0);
  const submitted=await frame.locator('body').evaluate(async()=>{
    let opened=0;window.open=()=>{opened++;return {};};
    const accepted=await requestSecureSubmit();
    openSubmissionForm();
    return {accepted,opened,answerText:ANSWER_TXT,timerDeadline:TIMER_DEADLINE,done:!document.getElementById('done').classList.contains('hidden')};
  });
  assert.deepEqual(submitted,{accepted:true,opened:0,answerText:'',timerDeadline:0,done:true},'preview submit must remain a local simulation without Forms or result payload');
  await page.evaluate(()=>document.getElementById('stage').innerHTML='');
  frame=await openPreview(360);
  assert.equal(await frame.locator('#studentName').inputValue(),'A7B9C2');
  assert.equal(await frame.locator('#intro').isVisible(),true);
  assert.equal(await frame.locator('#test').isVisible(),false);
  nativeAfter=await nativeStorageSnapshot(page);
  assert.deepEqual(nativeAfter,nativeBefore,'legitimate preview must not mutate native parent-origin localStorage, sessionStorage or IndexedDB');
  assert.deepEqual(errors,[]);
  console.log('PASS strict nested teacher preview: private adapter, no persistence/timer/result/Forms, widths, close/reopen');
}finally{
  for(const c of contexts)try{await c.close();}catch{}
  if(browser)await browser.close();
  w.close();
}

const report={schema:'git-r1a2-preview-native-storage-v2',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:process.platform,browser:'Chromium via Playwright 1.61.1',status:'PASS',nativeBefore,nativeAfter,nativeFrameAccess,pageErrors:errors,scope:'Fresh generated private teacher preview adapter in a sandboxed about:srcdoc iframe; native read-only storage snapshots, synthetic data only.'};
fs.mkdirSync('qa-results/r1a2-d02',{recursive:true});
const evidenceTag=String(process.env.PREVIEW_STORAGE_EVIDENCE_TAG||'preview-native-storage').replace(/[^a-z0-9._-]+/gi,'-');
fs.writeFileSync(`qa-results/r1a2-d02/${evidenceTag}.json`,JSON.stringify(report,null,2)+'\n');
