#!/usr/bin/env node
// Production, unauthenticated, read-only smoke test. No login bypass or real student submission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const GIT = 'https://daniel22-dev.github.io/generator-testu/';
const STUDIO = 'https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const EXPECTED_GIT_SHA = 'c1f003908e7138ee8b581888fe8115dacba3a870';
const output = { schema: 'live-studio-git-smoke-v1', checkedAt: new Date().toISOString(), urls: { git: GIT, studio: STUDIO }, checks: [], limitations: [] };
const record = (name, details = {}) => { output.checks.push({ name, ...details }); console.log(name, JSON.stringify(details)); };
const stamp = (u) => { const x=new URL(u); x.searchParams.set('__qa_nonce', Date.now().toString()); return x.href; };
async function liveGet(url, type='text') {
  const response = await fetch(stamp(url), { headers: { 'Cache-Control': 'no-cache' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  assert.equal(response.status, 200, 'HTTP 200: '+url+' (actual '+response.status+')');
  return type==='json' ? response.json() : response.text();
}
let browser;
try {
  const [gitHtml, release, gitManifest, studioInfo, registry, viewerHtml, viewerJs] = await Promise.all([
    liveGet(GIT), liveGet(GIT+'release-integrity.json','json'), liveGet(GIT+'studio-manifest.json','json'),
    liveGet(STUDIO+'build-info.json','json'), liveGet(STUDIO+'config/apps.generated.json','json'),
    liveGet(STUDIO+'app/index.html'), liveGet(STUDIO+'app/viewer.js')
  ]);
  assert.equal(release.sourceCommit, EXPECTED_GIT_SHA, 'Deployed GIT commit must exactly match certified release');
  assert.equal(release.appId,'generator');
  assert.equal(gitManifest.id,'generator');
  assert.match(gitHtml,/strictIPhoneCompatibilityAllowed/,'Live GIT must contain new Apple compatibility control');
  const entry=registry.find(x=>x.id==='generator');
  assert.ok(entry, 'GIT in deployed Studio registry');
  assert.equal(new URL(entry.launchUrl).href,GIT, 'Studio launches live GIT, not stale copy');
  assert.match(viewerJs,/frame\.src\s*=\s*appUrl\.href/,'Studio viewer uses manifest launchUrl');
  assert.match(viewerHtml,/id="embedded-app-frame"/,'Studio has app iframe');
  record('LIVE_HTTP_RELEASE_AND_REGISTRY_PASS',{ gitCommit:release.sourceCommit, gitVersion:gitManifest.version, studioVersion:studioInfo.version||studioInfo.appVersion||studioInfo.releaseVersion||'unreported', generatorLaunchUrl:entry.launchUrl });
  browser=await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}) });
  const context=await browser.newContext({viewport:{width:1280,height:850}, locale:'cs-CZ'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror', e=>pageErrors.push(String(e.message).slice(0,280)));
  await page.goto(stamp(GIT),{waitUntil:'domcontentloaded', timeout:45000});
  await page.locator('#strictIPhoneCompatibilityAllowed').waitFor({state:'attached',timeout:25000});
  const checked=await page.locator('#strictIPhoneCompatibilityAllowed').isChecked();
  assert.equal(checked,false,'Fresh browser must default iPhone strict fallback to OFF');
  await page.waitForTimeout(6000); // distinguish a loaded public UI from static hidden source DOM
  const visible=await page.evaluate(()=>{const el=document.getElementById('strictIPhoneCompatibilityAllowed');const card=el?.closest('label');return {inputVisible:!!el&&el.getClientRects().length>0,sectionVisible:!!card&&card.getClientRects().length>0,bodyText:String(document.body?.innerText||'').slice(0,450),bodyBg:getComputedStyle(document.body).backgroundColor};});
  if(!visible.inputVisible)output.limitations.push('The live GIT setting is present in HTML, but is not visually displayed to an unauthenticated browser.');
  record('LIVE_STANDALONE_GIT_BROWSER_PASS',{checkboxPresent:true,defaultOptIn:false,pageTitle:await page.title(),visibility:visible,pageErrors:pageErrors.slice(0,10)});
  await fs.mkdir('qa-results/live-smoke',{recursive:true});
  await page.screenshot({path:'qa-results/live-smoke/git-standalone.png',fullPage:false});
  await page.goto(stamp(STUDIO+'app/?app=generator'),{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#embedded-app-frame').waitFor({state:'attached',timeout:25000});
  await page.waitForTimeout(4500);
  const iframe=page.locator('#embedded-app-frame');
  const normalSrc=(await iframe.getAttribute('src'))||'';
  const studioError=await page.locator('#embedded-error').isVisible().catch(()=>false);
  const studioErrorText=studioError?(await page.locator('#embedded-error').innerText()).slice(0,350):'';
  let actualAccessTest=false;
  if(normalSrc&&normalSrc.startsWith(GIT)) {
    try{await page.frameLocator('#embedded-app-frame').locator('#strictIPhoneCompatibilityAllowed').waitFor({state:'attached',timeout:15000});actualAccessTest=true;}
    catch(e){output.limitations.push('Studio viewer set the GIT iframe, but the control was not accessible in time: '+String(e.message).slice(0,180));}
  } else {
    output.limitations.push('AI Studio has a signed teacher access gate; no authorized session supplied. Cannot certify a real signed-in launch.');
  }
  // Technical iframe compatibility only. This does NOT assert authorization,
  // and does not change the Studio's actual protected launcher.
  if(!actualAccessTest) {
    await iframe.evaluate((el,target)=>{el.src=target;}, GIT);
    await page.frameLocator('#embedded-app-frame').locator('#strictIPhoneCompatibilityAllowed').waitFor({state:'attached',timeout:22000});
  }
  record('LIVE_STUDIO_IFRAME_TECHNICAL_PASS',{
    studioNormalAuthorizedLaunch:actualAccessTest,
    accessGateObserved:studioError||!normalSrc,
    accessGateText:studioErrorText,
    iframeSource:actualAccessTest?normalSrc:GIT,
    attribution:actualAccessTest?'normal protected Studio launch':'synthetic iframe load, not access verification',
    pageErrors:pageErrors.slice(-10)
  });
  await page.screenshot({path:'qa-results/live-smoke/studio-with-git-iframe.png',fullPage:false});
  await context.close();
} catch (error) {
  output.failure=String(error.stack||error).slice(0,3000);
  console.error('LIVE_SMOKE_FAILURE',output.failure);
  process.exitCode=1;
} finally {
  await fs.mkdir('qa-results/live-smoke',{recursive:true});
  await fs.writeFile('qa-results/live-smoke/result.json',JSON.stringify(output,null,2)+'\n');
  if(browser) await browser.close().catch(()=>{});
}
