// Sprint 03: Chromium evidence for live-session preservation, stable roster/CSV,
// detailed scoring and per-exercise Reading counts. Synthetic data only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { configure, build, enterStartCode, GEN, gdom, w } from './redteam-harness-utils.mjs';

const origin = 'http://127.0.0.1:18789';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const contexts = [];
const pageErrors = [];
let browser;

function provenance() {
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim().toLowerCase();
  const trackedStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {encoding:'utf8'}).trim();
  assert.match(sourceHead, /^[0-9a-f]{40}$/);
  assert.equal(trackedStatus, '', 'S3 browser evidence requires a clean tracked working tree');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const playwrightVersion = JSON.parse(fs.readFileSync('node_modules/playwright/package.json', 'utf8')).version;
  assert.equal(playwrightVersion, packageJson.devDependencies.playwright);
  return {
    sourceHead,
    nodeVersion:process.version,
    platform:process.platform,
    architecture:process.arch,
    playwrightVersion,
    gateScriptSha256:sha256(fs.readFileSync(new URL(import.meta.url))),
    packageLockSha256:sha256(fs.readFileSync('package-lock.json'))
  };
}

async function generatedPage(html, path) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  contexts.push(context);
  await context.route(origin + '/**', route => route.fulfill({status:200,contentType:'text/html',body:html}));
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${path}: ${error.message}`));
  await page.goto(`${origin}/${path}`);
  return page;
}

function readingExercise(count, passage, prefix) {
  return {
    type:'reading comprehension', style:'reading comprehension', title:`${prefix} reading`, passage,
    points_total:count * 2, points_each:2,
    items:Array.from({length:count}, (_, index) => ({
      question:`${prefix} synthetic question ${index + 1}?`,
      options:['Synthetic A','Synthetic B','Synthetic C'], correct:index % 3,
      explanation:'Synthetic explanation.'
    }))
  };
}

async function generatorRuntimeCase() {
  configure({
    exerciseDetail:true, exerciseConfigSaved:true, pocet:2, body:24,
    typyCviceni:['reading comprehension'], readingQuestionCount:5,
    exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:5,body:10},
      {typ:'reading comprehension',pocetOtazek:7,body:14}
    ]
  });
  w.applyVisualState();
  assert.equal(w.document.getElementById('readingQuestionCount').value, '5');
  assert.match(w.document.getElementById('readingQuestionCountScope').textContent, /cvičení č\. 1/);
  assert.match(w.document.getElementById('readingQuestionCountScope').textContent, /vlastní počet/);

  w.updateExField(1, 'pocetOtazek', '8');
  assert.equal(w.eval('state.readingQuestionCount'), 5, 'secondary Reading must not overwrite the primary panel');
  w.updateExField(0, 'pocetOtazek', '7');
  assert.equal(w.eval('state.readingQuestionCount'), 7, 'primary Reading detail must update the panel');

  w.eval("state.exerciseConfig=[1,1,1,1,25].map(body=>({typ:'multiple choice',pocetOtazek:5,body}));state.pocet=5;state.body=29;uiConfirm=async()=>true;");
  await w.distributeExercisePoints();
  assert.deepEqual(Array.from(w.eval('state.exerciseConfig'), ex => ex.body), [6,6,6,6,5]);
  assert.equal(w.eval('state.body'), 29);

  const before = Array.from(w.eval('state.exerciseConfig'), ex => ex.body);
  w.eval('uiConfirm=async()=>false;state.exerciseConfig[4].body=25;state.exerciseConfig[0].body=1;state.exerciseConfig[1].body=1;state.exerciseConfig[2].body=1;state.exerciseConfig[3].body=1;syncDetailedPointsTotal(state);');
  await w.distributeExercisePoints();
  assert.deepEqual(Array.from(w.eval('state.exerciseConfig'), ex => ex.body), [1,1,1,1,25]);
  assert.notDeepEqual(Array.from(w.eval('state.exerciseConfig'), ex => ex.body), before);

  return {planCounts:[7,8],distributedPoints:[6,6,6,6,5]};
}

async function rendererCase() {
  const passages = [
    'Synthetic passage Alpha describes a school garden and its weekly measurements.',
    'Synthetic passage Beta describes a library project and its reading schedule.'
  ];
  const exerciseConfig = [
    {typ:'reading comprehension',pocetOtazek:5,body:10},
    {typ:'reading comprehension',pocetOtazek:7,body:14}
  ];
  const exercises = [readingExercise(5,passages[0],'Alpha'),readingExercise(7,passages[1],'Beta')];

  configure({
    testMode:'bezny', resultMode:'instant', screenGuard:false, feedbackMode:'brief', layout:'tabs',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:['reading comprehension'], exerciseConfig, body:24, pocet:2,
    readingQuestionCount:5
  });
  GEN.exercises = structuredClone(exercises);
  const instantHtml = await build();
  const instant = await generatedPage(instantHtml, 'instant-s3.html');
  await instant.locator('#studentName').fill('Synthetic Student');
  await instant.evaluate(() => startTest());
  assert.deepEqual(await instant.locator('.ex-panel').evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.question,.q').length)), [5,7]);
  assert.equal(await instant.locator('.reading-passage').count(), 2);

  configure({
    testMode:'prisny', resultMode:'secureOffline', screenGuard:true, feedbackMode:'none', layout:'tabs',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:['reading comprehension'], exerciseConfig, body:24, pocet:2,
    readingQuestionCount:5
  });
  GEN.exercises = structuredClone(exercises);
  const securePackage = await build();
  const secure = await generatedPage(securePackage.studentHtml, 'secure-s3.html');
  await secure.locator('#studentName').fill('Synthetic Student');
  await enterStartCode(secure, securePackage);
  await secure.evaluate(() => startTest());
  assert.deepEqual(await secure.locator('.ex-panel').evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.question,.q').length)), [5,7]);
  assert.equal(await secure.locator('.reading-passage').count(), 2);

  const verifier = await generatedPage(securePackage.teacherHtml, 'teacher-verifier-s3.html');
  await verifier.evaluate(() => renderTeacherPreview('__default'));
  assert.equal(await verifier.locator('#teacherPreview .feedback h3').count(), 2);
  const verifierText = await verifier.locator('#teacherPreview').innerText();
  assert.match(verifierText, /Alpha reading/);
  assert.match(verifierText, /Beta reading/);

  return {
    instantSha256:sha256(instantHtml), secureStudentSha256:sha256(securePackage.studentHtml),
    verifierSha256:sha256(securePackage.teacherHtml), renderedCounts:[5,7], totalPoints:24
  };
}

function browserGeneratorHtml() {
  return fs.readFileSync('dist/index.html','utf8')
    .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/g, '')
    .replace(/<link[^>]+(?:rel="stylesheet"|rel="manifest"|rel="icon"|rel="apple-touch-icon")[^>]*>/g, '')
    .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
    .replace('data-ghrab-access="checking"','data-ghrab-access="granted"')
    .replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S3",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s3"}};<\/script>');
}

async function sessionPreservationCase() {
  const context = await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  contexts.push(context);
  const generatorHtml = browserGeneratorHtml();
  await context.addInitScript(() => {
    window.__GHRAB_DEPLOYMENT_CONFIG__ = Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'s3',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});
    window.scrollTo = (...args) => HTMLElement.prototype.scrollTo ? HTMLElement.prototype.scrollTo.apply(document.documentElement,args) : undefined;
  });
  await context.route(origin + '/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/manual/')) return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Synthetic manual</title><h1>Manual</h1>'});
    return route.fulfill({status:200,contentType:'text/html',body:generatorHtml});
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`generator-session: ${error.message}`));
  await page.goto(origin + '/generator/');
  await page.waitForFunction(() => typeof rosterGenerate === 'function' && typeof useGeminiKeyForSession === 'function');
  const emails = Array.from({length:28}, (_, index) => `browser-${String(index + 1).padStart(2,'0')}@example.invalid`).join('\n');
  await page.evaluate(({emails}) => {
    document.getElementById('rosterEmails').value=emails;
    document.getElementById('nazev').value='Synthetic in-progress test';
    document.getElementById('geminiKeyInput').value='synthetic-session-key-not-real';
    useGeminiKeyForSession();
    Object.assign(state,{jazyk:'angličtina',uroven:['B1'],currentSyntheticMarker:'s3'});
    rosterGenerate();
    currentStep=2;maxStep=3;
  }, {emails});
  const before = await page.evaluate(() => ({
    codes:rosterEntries.map(entry => ({email:entry.email,code:entry.code})),
    name:document.getElementById('nazev').value,
    currentStep,maxStep,
    keyInMemory:geminiApiKey,
    keyInSession:sessionStorage.getItem(GEMINI_KEY_SESSION_SK),
    keyInLocal:localStorage.getItem(GEMINI_KEY_SK)
  }));
  assert.equal(before.codes.length, 28);
  assert.equal(new Set(before.codes.map(entry => entry.code)).size, 28);
  assert.equal(before.keyInLocal, null);

  async function downloadCsv() {
    const event = page.waitForEvent('download');
    await page.evaluate(() => rosterDownloadCsv());
    const download = await event;
    const downloadPath = await download.path();
    return {name:download.suggestedFilename(),bytes:fs.readFileSync(downloadPath)};
  }
  const csv1 = await downloadCsv();
  const csv2 = await downloadCsv();
  assert.equal(csv1.name, csv2.name);
  assert.equal(sha256(csv1.bytes), sha256(csv2.bytes));

  const popupEvent = context.waitForEvent('page');
  await page.locator('#btnManual').click();
  const manual = await popupEvent;
  await manual.waitForLoadState('domcontentloaded');
  assert.match(manual.url(), /\/manual\/\?from=app$/);
  assert.equal(page.url(), origin + '/generator/');

  const after = await page.evaluate(() => ({
    codes:rosterEntries.map(entry => ({email:entry.email,code:entry.code})),
    name:document.getElementById('nazev').value,
    currentStep,maxStep,
    keyInMemory:geminiApiKey,
    keyInSession:sessionStorage.getItem(GEMINI_KEY_SESSION_SK),
    keyInLocal:localStorage.getItem(GEMINI_KEY_SK)
  }));
  assert.deepEqual(after, before);
  await manual.close();
  return {recipients:28,csvSha256:sha256(csv1.bytes),codesStable:true,sessionKeyScope:'session-only'};
}

try {
  const startedAt = new Date().toISOString();
  const source = provenance();
  browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const generatorRuntime = await generatorRuntimeCase();
  const renderers = await rendererCase();
  const session = await sessionPreservationCase();
  assert.deepEqual(pageErrors, [], 'S3 browser pages produced JavaScript errors');
  const report = {
    sprint:'03-session-scoring-reading', status:'PASS', startedAt, completedAt:new Date().toISOString(),
    provenance:source, browser:await browser.version(),
    checks:[
      'manual opens in a separate noopener tab while the original generator runtime remains alive',
      '28 synthetic recipients retain the same in-memory codes and byte-identical repeated CSV',
      'session-scoped synthetic API key remains in the original session and is absent from localStorage',
      'detailed point totals and confirmed 29-point distribution remain exact',
      'primary and secondary Reading counts remain independent',
      'instant, secure student and teacher verifier render per-exercise Reading counts 5 and 7'
    ],
    evidence:{generatorRuntime,renderers,session},
    limits:[
      'Headless Chromium on the recorded host only; physical iPadOS/Safari, Android and embedded AI Studio WebView were not tested',
      'Synthetic generated content only; no live AI request was made',
      'No live Google Forms submission, GitHub Pages staging or production deployment was performed'
    ]
  };
  fs.mkdirSync('qa-results',{recursive:true});
  fs.writeFileSync('qa-results/workflow-fidelity-browser-s3.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  gdom.window.close();
}
