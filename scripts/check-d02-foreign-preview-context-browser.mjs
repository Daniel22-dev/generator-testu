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
  const forbidden=['__GHRAB_TEACHER_PREVIEW__','strictTeacherPreview','preview-ready','isolated-teacher-srcdoc','__GHRAB_PRIVATE_TEACHER_PREVIEW__'];
  const publicInventory=Object.fromEntries(forbidden.map(token=>[token,pkg.studentHtml.includes(token)]));
  if(Object.values(publicInventory).every(value=>value===false))result('D02-CONTROL','PASS','public student artifact contains no private or legacy preview capability',publicInventory);
  else result('D02-CONTROL','FAIL','public artifact still contains a preview capability',publicInventory);

  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1280,height:900},screen:{width:1280,height:900}});
  const shell='<!doctype html><html><body><iframe id="foreign" sandbox="allow-scripts allow-modals"></iframe></body></html>';
  await context.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html',body:shell}));
  const page=await context.newPage();
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(origin+'/foreign-parent.html');

  const injected='<script>window.__GHRAB_TEACHER_PREVIEW__=true;window.strictTeacherPreview=()=>true;<\/script>';
  const forged=pkg.studentHtml.replace(/<head([^>]*)>/i,`<head$1>${injected}`);
  await page.evaluate(html=>{document.getElementById('foreign').srcdoc=html;},forged);
  const frame=page.frameLocator('#foreign');
  await frame.locator('#studentName').waitFor();
  await frame.locator('#studentName').fill('A7B9C2');
  await enterStartCode(frame,pkg);
  await frame.locator('#strictVerifyBtn').click();
  await page.waitForTimeout(750);
  const state=await frame.locator('body').evaluate(()=>({
    attackerFlag:window.__GHRAB_TEACHER_PREVIEW__,
    attackerHelper:typeof window.strictTeacherPreview==='function'&&window.strictTeacherPreview(),
    privateAdapter:window.__GHRAB_PRIVATE_TEACHER_PREVIEW__===true,
    ready:strictReadyState(),
    fullscreenButton:!$('strictFullscreenStartBtn').classList.contains('hidden'),
    fallbackButton:!$('strictFallbackStartBtn').classList.contains('hidden'),
    fullscreen:!!document.fullscreenElement,
    active:isTestActive(),
    mode:STRICT_FULLSCREEN_MODE,
    deadline:TIMER_DEADLINE,
    preflight:!!STRICT_PREFLIGHT,
    status:$('strictStartStatus')&&$('strictStartStatus').textContent||'',
    storedAttempt:storageGet('activeAttempt'),
    href:String(location.href),
    topLevel:window.self===window.top
  }));
  const green=state.attackerFlag===true&&state.attackerHelper===true&&state.privateAdapter===false&&state.ready==='verify'&&state.preflight===false&&state.fullscreenButton===false&&state.fallbackButton===false&&state.fullscreen===false&&state.active===false&&state.mode==='none'&&state.deadline===0&&state.storedAttempt===null;
  const evidence={state,artifact:'fresh generated public strict student HTML in a foreign synthetic about:srcdoc wrapper with both legacy preview symbols injected',actualTeacherPreviewButtonUsed:false};
  if(green)result('D02-FOREIGN-SRCDOC','PASS','foreign about:srcdoc and injected legacy symbols cannot select private teacher-preview behavior',evidence);
  else result('D02-FOREIGN-SRCDOC','FAIL','foreign wrapper still changes public strict runtime behavior',evidence);
  await context.close();
}finally{
  if(browser)await browser.close().catch(()=>{});
  gdom.window.close();
}

const report={schema:'git-r1a2-d02-foreign-context-v2',sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,platform:process.platform,browser:'Chromium via Playwright 1.61.1',status:checks.some(check=>check.status==='FAIL')?'FAIL':'PASS',checks,pageErrors,scope:'Synthetic client-only adversarial about:srcdoc context. This probe does not claim server authority or physical-device coverage.'};
fs.mkdirSync('qa-results/r1a2-d02',{recursive:true});
const evidenceTag=String(process.env.D02_EVIDENCE_TAG||'d02-foreign-context').replace(/[^a-z0-9._-]+/gi,'-');
fs.writeFileSync(`qa-results/r1a2-d02/${evidenceTag}.json`,JSON.stringify(report,null,2)+'\n');
console.log(`${report.status} D02 foreign preview context ${checks.filter(check=>check.status==='PASS').length}/${checks.length}`);
if(report.status!=='PASS')process.exit(1);
