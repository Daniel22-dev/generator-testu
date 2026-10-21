#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {configure,build,w,enterStartCode} from './redteam-harness-utils.mjs';

const origin='http://127.0.0.1:18809';
const contexts=[];
let browser;
const errors=[];
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
  assert.ok(pv.html.includes('__GHRAB_TEACHER_PREVIEW__=true'));
  assert.ok(pv.html.includes(pkg.startCode),'private unlock code should exist only in transient teacher preview');
  assert.ok(!pkg.studentHtml.includes(pkg.startCode),'student export must not publish the unlock code');
  assert.ok(!pkg.studentHtml.includes('__GHRAB_TEACHER_PREVIEW__=true'),'student export must not activate preview');
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  contexts.push(ctx);
  const shell='<html><head><meta charset="utf-8"></head><body><main id="stage"></main></body></html>';
  await ctx.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body:shell}));
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/preview');
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
    return frame;
  }
  let frame=await openPreview(360);
  assert.equal(await frame.locator('#studentName').inputValue(),'A7B9C2');
  assert.equal(await frame.locator('#startCode').inputValue(),pkg.startCode);
  await frame.locator('#strictVerifyBtn').click();
  await frame.locator('#strictFallbackStartBtn').waitFor({state:'visible',timeout:15000});
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
    verified:strictTeacherPreview(),
    timerDeadline:TIMER_DEADLINE,
    answerText:ANSWER_TXT,
    activeAttempt:storageGet('activeAttempt'),
    submitted:storageGet('submitted'),
    signedAttempt:await loadSignedRecord('activeAttempt')
  }));
  assert.equal(previewRuntime.verified,true,'preview privilege must be context verified');
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
  assert.deepEqual(errors,[]);
  console.log('PASS strict nested teacher preview: verified context, no persistence/timer/result/Forms, widths, close/reopen');
}finally{
  for(const c of contexts)try{await c.close();}catch{}
  if(browser)await browser.close();
  w.close();
}
