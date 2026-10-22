#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {configure,build,w,gdom,enterStartCode} from './redteam-harness-utils.mjs';

const origin='https://d02-context.example';
const checks=[];
const pageErrors=[];
let browser;

function result(id,status,detail,evidence={}){
  checks.push({id,status,detail,evidence});
  (status==='PASS'?console.log:console.error)(`${status} ${id} — ${detail}`);
}

try{
  configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',strictFullscreenFallbackAllowed:false});
  w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
  const pkg=await build();
  assert.ok(!pkg.studentHtml.includes('__GHRAB_TEACHER_PREVIEW__=true'),'public student export must not contain the private marker');
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900},screen:{width:1280,height:900}});
  const shell='<!doctype html><html><body><iframe id="foreign" sandbox="allow-scripts allow-modals"></iframe></body></html>';
  await context.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body:shell}));
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(origin+'/foreign-parent.html');

  const topLevelControl=await page.evaluate(({studentHtml})=>{
    const parser=new DOMParser();
    const doc=parser.parseFromString(studentHtml,'text/html');
    return {publicMarker:studentHtml.includes('__GHRAB_TEACHER_PREVIEW__=true'),hasStrictRuntime:doc.documentElement.textContent.includes('strictTeacherPreview')};
  },{studentHtml:pkg.studentHtml});
  if(topLevelControl.publicMarker===false&&topLevelControl.hasStrictRuntime)result('D02-CONTROL','PASS','public student artifact does not ship the private marker',topLevelControl);
  else result('D02-CONTROL','FAIL','public artifact marker separation is invalid',topLevelControl);

  const forged=pkg.studentHtml.replace(/<head([^>]*)>/i,'<head$1><script>window.__GHRAB_TEACHER_PREVIEW__=true;<\/script>');
  await page.evaluate(html=>{document.getElementById('foreign').srcdoc=html;},forged);
  const frame=page.frameLocator('#foreign');
  await frame.locator('#studentName').waitFor();
  await frame.locator('#studentName').fill('A7B9C2');
  await enterStartCode(frame,pkg);
  await frame.locator('#strictVerifyBtn').click();
  await frame.locator('#strictFallbackStartBtn').waitFor({state:'visible',timeout:15000});
  const preflight=await frame.locator('body').evaluate(()=>({preview:strictTeacherPreview(),ready:strictReadyState(),fullscreen:!!document.fullscreenElement,topLevel:window.self===window.top,href:String(location.href)}));
  await frame.locator('#strictFallbackStartBtn').click();
  await frame.locator('#exerciseArea [data-qid]').first().waitFor({timeout:15000});
  const runtime=await frame.locator('body').evaluate(()=>({preview:strictTeacherPreview(),mode:STRICT_FULLSCREEN_MODE,active:isTestActive(),deadline:TIMER_DEADLINE,fullscreen:!!document.fullscreenElement,timer:$('timer')&&$('timer').textContent||'',answer:ANSWER_TXT}));
  const vulnerable=preflight.preview===true&&preflight.ready==='preview-ready'&&runtime.preview===true&&runtime.mode==='preview'&&runtime.active===true&&runtime.fullscreen===false&&runtime.deadline===0;
  const evidence={preflight,runtime,actualTeacherPreviewButtonUsed:false,artifact:'fresh generated public strict student HTML with a foreign synthetic about:srcdoc wrapper'};
  if(vulnerable)result('D02-FOREIGN-SRCDOC','FAIL','foreign about:srcdoc plus public marker can still select teacher-preview behavior; server-authenticated preview provenance is absent',evidence);
  else result('D02-FOREIGN-SRCDOC','PASS','foreign about:srcdoc cannot select teacher-preview behavior',evidence);
  await context.close();
}finally{
  if(browser)await browser.close().catch(()=>{});
  gdom.window.close();
}

const report={
  schema:'git-r1a1-d02-foreign-context-v1',
  sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  node:process.version,
  platform:process.platform,
  browser:'Chromium via Playwright 1.61.1',
  status:checks.some(check=>check.status==='FAIL')?'FAIL':'PASS',
  checks,
  pageErrors,
  scope:'Synthetic client-only adversarial context. This probe does not claim server authority or physical-device coverage.',
};
fs.mkdirSync('qa-results/r1a1-c32',{recursive:true});
const evidenceTag=String(process.env.D02_EVIDENCE_TAG||'d02-foreign-context').replace(/[^a-z0-9._-]+/gi,'-');
fs.writeFileSync(`qa-results/r1a1-c32/${evidenceTag}.json`,JSON.stringify(report,null,2)+'\n');
console.log(`${report.status} D02 foreign preview context ${checks.filter(check=>check.status==='PASS').length}/${checks.length}`);
if(report.status!=='PASS')process.exit(1);
