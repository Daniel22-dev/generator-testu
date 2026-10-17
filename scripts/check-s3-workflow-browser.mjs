// Sprint 03: Chromium evidence for live-session preservation, stable roster/CSV,
// detailed scoring and per-exercise Reading counts. Synthetic data only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { configure, build, enterStartCode, completeGeneratedPageStart, GEN, gdom, w } from './redteam-harness-utils.mjs';

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

function listeningExercise(count, prefix) {
  return {
    type:'listening comprehension', style:'listening comprehension', title:`${prefix} listening`,
    audio_prompt:'Teacher reads a synthetic classroom recording twice.', points_total:count * 2, points_each:2,
    items:Array.from({length:count}, (_, index) => ({
      question:`${prefix} synthetic listening question ${index + 1}?`,
      options:['Synthetic A','Synthetic B','Synthetic C'], correct:index % 3,
      transcript:`Synthetic teacher-only transcript for ${prefix} item ${index + 1}.`,
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
    {typ:'reading comprehension',pocetOtazek:1,body:2},
    {typ:'reading comprehension',pocetOtazek:30,body:60},
    {typ:'listening comprehension',pocetOtazek:2,body:4},
    {typ:'listening comprehension',pocetOtazek:9,body:18}
  ];
  const exercises = [
    readingExercise(1,passages[0],'Alpha'),readingExercise(30,passages[1],'Beta'),
    listeningExercise(2,'Gamma'),listeningExercise(9,'Delta')
  ];

  configure({
    testMode:'bezny', resultMode:'instant', screenGuard:false, feedbackMode:'brief', layout:'tabs',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:['reading comprehension','listening comprehension'], exerciseConfig, body:84, pocet:4,
    readingQuestionCount:1, listeningQuestionCount:2
  });
  GEN.exercises = structuredClone(exercises);
  const instantHtml = await build();
  const instant = await generatedPage(instantHtml, 'instant-s3.html');
  await instant.locator('#studentName').fill('Synthetic Student');
  await instant.evaluate(() => startTest());
  assert.deepEqual(await instant.locator('.ex-panel').evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.question,.q').length)), [1,30,2,9]);
  assert.equal(await instant.locator('.reading-passage').count(), 2);

  configure({
    testMode:'prisny', resultMode:'secureOffline', screenGuard:true, feedbackMode:'none', layout:'tabs',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:['reading comprehension','listening comprehension'], exerciseConfig, body:84, pocet:4,
    readingQuestionCount:1, listeningQuestionCount:2
  });
  GEN.exercises = structuredClone(exercises);
  const securePackage = await build();
  const secure = await generatedPage(securePackage.studentHtml, 'secure-s3.html');
  await secure.locator('#studentName').fill('Synthetic Student');
  await enterStartCode(secure, securePackage);
  await completeGeneratedPageStart(secure);
  assert.deepEqual(await secure.locator('.ex-panel').evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.question,.q').length)), [1,30,2,9]);
  assert.equal(await secure.locator('.reading-passage').count(), 2);

  const verifier = await generatedPage(securePackage.teacherHtml, 'teacher-verifier-s3.html');
  await verifier.evaluate(() => renderTeacherPreview('__default'));
  assert.equal(await verifier.locator('#teacherPreview .feedback h3').count(), 4);
  assert.deepEqual(await verifier.locator('#teacherPreview .feedback').evaluateAll(cards => cards.map(card => card.querySelectorAll('.q').length)), [1,30,2,9]);
  const verifierText = await verifier.locator('#teacherPreview').innerText();
  assert.match(verifierText, /Alpha reading/);
  assert.match(verifierText, /Beta reading/);
  assert.match(verifierText, /Gamma listening/);
  assert.match(verifierText, /Delta listening/);

  return {
    instantSha256:sha256(instantHtml), secureStudentSha256:sha256(securePackage.studentHtml),
    verifierSha256:sha256(securePackage.teacherHtml), renderedCounts:[1,30,2,9], totalPoints:84
  };
}

function browserGeneratorHtml() {
  return fs.readFileSync('dist/index.html','utf8')
    .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/g, '')
    .replace(/<link[^>]+(?:rel="stylesheet"|rel="manifest"|rel="icon"|rel="apple-touch-icon")[^>]*>/g, '')
    .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
    .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
    .replace('data-ghrab-access="checking"','data-ghrab-access="granted"')
    .replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S3",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s3"}};<\/script>');
}

async function sessionPreservationCase() {
  const context = await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  contexts.push(context);
  const generatorHtml = browserGeneratorHtml();
  await context.addInitScript(() => {
    window.__GHRAB_DEPLOYMENT_CONFIG__ = Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'s3',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});
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

  async function pointInputWorkflowCase(){
    const pointPage=await context.newPage();
    pointPage.on('pageerror',error=>pageErrors.push(`point-input-workflow: ${error.message}`));
    await pointPage.goto(origin+'/generator/');
    await pointPage.waitForFunction(()=>typeof onCustomBody==='function'&&typeof pickNum==='function'&&typeof goTo==='function');
    await pointPage.evaluate(()=>{
      Object.assign(state,{
        appMode:'advanced',workPreset:'advanced',body:20,pocet:5,odevzdavani:'B',gradeTyp:'standard',exerciseDetail:false,exerciseConfigSaved:false,
        exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),
        typyCviceni:['multiple choice','gap fill','true/false','translation','error correction']
      });
      document.querySelectorAll('[id^="step"]').forEach(step=>step.classList.add('hidden'));
      document.getElementById('step2').classList.remove('hidden');
      currentStep=2;maxStep=2;applyVisualState();validate();
    });
    const input=pointPage.locator('#bodyCustom'),next=pointPage.locator('#next2');
    await input.fill('29.7');
    const immediate=await pointPage.evaluate(()=>(
      {body:state.body,points:state.exerciseConfig.map(ex=>ex.body),nextDisabled:document.getElementById('next2').disabled,
        value:document.getElementById('bodyCustom').value,message:document.getElementById('bodyCustom').validationMessage,
        ariaInvalid:document.getElementById('bodyCustom').getAttribute('aria-invalid')}
    ));
    await pointPage.locator('#gradeSkola').click();
    const afterUnrelated=await pointPage.evaluate(()=>(
      {body:state.body,nextDisabled:document.getElementById('next2').disabled,currentStep,
        value:document.getElementById('bodyCustom').value,message:document.getElementById('bodyCustom').validationMessage}
    ));
    let normalClickBlocked=false;
    try{await next.click({timeout:750});}catch{normalClickBlocked=true;}
    const directAdvance=await pointPage.evaluate(()=>({returned:goTo(3),currentStep}));
    await pointPage.locator('#bodyBtns .tag-btn[data-val="30"]').click();
    const afterPreset=await pointPage.evaluate(()=>(
      {body:state.body,points:state.exerciseConfig.map(ex=>ex.body),nextDisabled:document.getElementById('next2').disabled,
        value:document.getElementById('bodyCustom').value,message:document.getElementById('bodyCustom').validationMessage,
        ariaInvalid:document.getElementById('bodyCustom').getAttribute('aria-invalid')}
    ));
    await next.click();
    const advancedAfterCorrection=await pointPage.evaluate(()=>currentStep);
    await pointPage.evaluate(()=>goTo(2));
    await input.fill('29.7');await input.fill('29');
    const afterTyped=await pointPage.evaluate(()=>(
      {body:state.body,points:state.exerciseConfig.map(ex=>ex.body),nextDisabled:document.getElementById('next2').disabled,
        value:document.getElementById('bodyCustom').value,message:document.getElementById('bodyCustom').validationMessage,
        ariaInvalid:document.getElementById('bodyCustom').getAttribute('aria-invalid')}
    ));
    assert.deepEqual(immediate,{body:20,points:[4,4,4,4,4],nextDisabled:true,value:'29.7',message:'Zadej celé číslo v povoleném rozsahu.',ariaInvalid:'true'});
    assert.equal(afterUnrelated.body,20);assert.equal(afterUnrelated.nextDisabled,true);assert.equal(afterUnrelated.currentStep,2);
    assert.equal(afterUnrelated.value,'29.7');assert.notEqual(afterUnrelated.message,'');
    assert.equal(normalClickBlocked,true);assert.deepEqual(directAdvance,{returned:false,currentStep:2});
    assert.deepEqual(afterPreset,{body:30,points:[6,6,6,6,6],nextDisabled:false,value:'30',message:'',ariaInvalid:null});
    assert.equal(advancedAfterCorrection,3);
    assert.deepEqual(afterTyped,{body:29,points:[6,6,6,6,5],nextDisabled:false,value:'29',message:'',ariaInvalid:null});
    await pointPage.close();
    return{immediate,afterUnrelated,normalClickBlocked,directAdvance,afterPreset,advancedAfterCorrection,afterTyped};
  }
  const pointInputWorkflow=await pointInputWorkflowCase();

  async function detailPointAuthorityWorkflowCase(){
    const detailPage=await context.newPage();
    detailPage.on('pageerror',error=>pageErrors.push(`detail-point-authority: ${error.message}`));
    await detailPage.goto(origin+'/generator/');
    await detailPage.waitForFunction(()=>typeof onCustomBody==='function'&&typeof toggleExDetail==='function'&&typeof updateExField==='function');
    await detailPage.evaluate(()=>{
      Object.assign(state,{
        appMode:'advanced',workPreset:'advanced',jazyk:'angličtina',uroven:['B2'],body:20,pocet:5,
        odevzdavani:'B',gradeTyp:'standard',exerciseDetail:false,exerciseConfigSaved:false,
        exerciseConfig:Array.from({length:5},(_,index)=>({
          typ:['multiple choice','gap fill','true/false','translation','error correction'][index],pocetOtazek:4,body:4
        })),
        typyCviceni:['multiple choice','gap fill','true/false','translation','error correction']
      });
      document.querySelectorAll('[id^="step"]').forEach(step=>step.classList.add('hidden'));
      document.getElementById('step2').classList.remove('hidden');
      currentStep=2;maxStep=2;applyVisualState();validate();
    });
    const bodyInput=detailPage.locator('#bodyCustom');
    await bodyInput.fill('29.7');
    const invalidGlobal=await detailPage.evaluate(()=>(
      {step:currentStep,body:state.body,points:state.exerciseConfig.map(ex=>ex.body),value:bodyCustom.value,
        message:bodyCustom.validationMessage,ariaInvalid:bodyCustom.getAttribute('aria-invalid'),next2Disabled:next2.disabled}
    ));
    await detailPage.evaluate(()=>goTo(1));
    await detailPage.locator('#btnExDetail').click();
    const afterDetailSwitch=await detailPage.evaluate(()=>(
      {step:currentStep,detail:state.exerciseDetail,body:state.body,points:state.exerciseConfig.map(ex=>ex.body),
        value:bodyCustom.value,message:bodyCustom.validationMessage,ariaInvalid:bodyCustom.getAttribute('aria-invalid'),
        globalBodyHidden:globalBodyField.classList.contains('hidden'),next1Disabled:next1.disabled}
    ));
    await detailPage.locator('#next1').click();
    const detailTotal20=await detailPage.evaluate(()=>(
      {step:currentStep,body:state.body,value:bodyCustom.value,message:bodyCustom.validationMessage,
        ariaInvalid:bodyCustom.getAttribute('aria-invalid'),next2Disabled:next2.disabled}
    ));
    await detailPage.evaluate(()=>goTo(1));
    let pointInputs=detailPage.locator('#exConfigList .ex-row input[type="number"][max="999"]');
    assert.equal(await pointInputs.count(),5);
    await pointInputs.nth(0).fill('5');await pointInputs.nth(0).press('Tab');
    const validDetail21=await detailPage.evaluate(()=>(
      {step:currentStep,body:state.body,points:state.exerciseConfig.map(ex=>ex.body),value:bodyCustom.value,
        message:bodyCustom.validationMessage,ariaInvalid:bodyCustom.getAttribute('aria-invalid'),next1Disabled:next1.disabled}
    ));
    pointInputs=detailPage.locator('#exConfigList .ex-row input[type="number"][max="999"]');
    await pointInputs.nth(0).fill('4.5');await pointInputs.nth(0).press('Tab');
    const rejectedInvalidDetail=await detailPage.evaluate(()=>(
      {body:state.body,points:state.exerciseConfig.map(ex=>ex.body),rendered:Array.from(document.querySelectorAll('#exConfigList .ex-row input[type="number"][max="999"]'),input=>input.value)}
    ));
    const target=[6,6,6,6,5];
    for(let index=0;index<target.length;index++){
      pointInputs=detailPage.locator('#exConfigList .ex-row input[type="number"][max="999"]');
      await pointInputs.nth(index).fill(String(target[index]));await pointInputs.nth(index).press('Tab');
    }
    const validDetail29=await detailPage.evaluate(()=>(
      {body:state.body,points:state.exerciseConfig.map(ex=>ex.body),value:bodyCustom.value,
        message:bodyCustom.validationMessage,ariaInvalid:bodyCustom.getAttribute('aria-invalid'),next1Disabled:next1.disabled}
    ));
    await detailPage.locator('#next1').click();
    const detailTotal29=await detailPage.evaluate(()=>(
      {step:currentStep,body:state.body,value:bodyCustom.value,message:bodyCustom.validationMessage,
        ariaInvalid:bodyCustom.getAttribute('aria-invalid'),next2Disabled:next2.disabled}
    ));
    assert.deepEqual(invalidGlobal,{step:2,body:20,points:[4,4,4,4,4],value:'29.7',
      message:'Zadej celé číslo v povoleném rozsahu.',ariaInvalid:'true',next2Disabled:true});
    assert.deepEqual(afterDetailSwitch,{step:1,detail:true,body:20,points:[4,4,4,4,4],value:'20',message:'',
      ariaInvalid:null,globalBodyHidden:true,next1Disabled:false});
    assert.deepEqual(detailTotal20,{step:2,body:20,value:'20',message:'',ariaInvalid:null,next2Disabled:false});
    assert.deepEqual(validDetail21,{step:1,body:21,points:[5,4,4,4,4],value:'21',message:'',ariaInvalid:null,next1Disabled:false});
    assert.deepEqual(rejectedInvalidDetail,{body:21,points:[5,4,4,4,4],rendered:['5','4','4','4','4']});
    assert.deepEqual(validDetail29,{body:29,points:[6,6,6,6,5],value:'29',message:'',ariaInvalid:null,next1Disabled:false});
    assert.deepEqual(detailTotal29,{step:2,body:29,value:'29',message:'',ariaInvalid:null,next2Disabled:false});
    await detailPage.close();
    return{invalidGlobal,afterDetailSwitch,detailTotal20,validDetail21,rejectedInvalidDetail,validDetail29,detailTotal29};
  }
  const detailPointAuthorityWorkflow=await detailPointAuthorityWorkflowCase();

  const controls = await page.evaluate(() => {
    const supported=[1,2,3,8,9,30];
    state.exerciseDetail=true;state.exerciseConfigSaved=true;state.pocet=5;state.body=20;
    state.exerciseConfig=Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4}));
    const original=JSON.stringify({body:state.body,exerciseConfig:state.exerciseConfig});
    const invalidTotals=['29.7','29.0','2e1','',0,-1,4996].map(value=>({value:String(value),accepted:syncExercisePoints(value)}));
    const unchangedAfterDirect=JSON.stringify({body:state.body,exerciseConfig:state.exerciseConfig})===original;
    const bodyInput=document.getElementById('bodyCustom');
    bodyInput.value='29.7';bodyInput.dispatchEvent(new Event('input',{bubbles:true}));
    const unchangedAfterInput=JSON.stringify({body:state.body,exerciseConfig:state.exerciseConfig})===original;
    const detailBefore=JSON.stringify({body:state.body,exerciseConfig:state.exerciseConfig});
    const detailAccepted=updateExField(0,'body','4.5');
    const unchangedAfterDetail=JSON.stringify({body:state.body,exerciseConfig:state.exerciseConfig})===detailBefore;
    bodyInput.value='29';bodyInput.dispatchEvent(new Event('input',{bubbles:true}));
    const distributed=state.exerciseConfig.map(ex=>ex.body);

    state.exerciseDetail=true;state.exerciseConfigSaved=true;state.pocet=4;state.body=84;
    state.exerciseConfig=[
      {typ:'reading comprehension',pocetOtazek:4,body:2},{typ:'reading comprehension',pocetOtazek:17,body:60},
      {typ:'listening comprehension',pocetOtazek:4,body:4},{typ:'listening comprehension',pocetOtazek:19,body:18}
    ];
    state.typyCviceni=['reading comprehension','listening comprehension'];
    applyVisualState();
    const selections=[];
    for(const value of supported){
      setComprehensionQuestionCount('reading comprehension',String(value));
      setComprehensionQuestionCount('listening comprehension',String(value));
      selections.push({value,readingControl:document.getElementById('readingQuestionCount').value,listeningControl:document.getElementById('listeningQuestionCount').value,counts:state.exerciseConfig.map(ex=>ex.pocetOtazek)});
    }
    updateExField(1,'pocetOtazek','1');updateExField(3,'pocetOtazek','2');
    return {
      readingOptions:Array.from(document.getElementById('readingQuestionCount').options,option=>Number(option.value)),
      listeningOptions:Array.from(document.getElementById('listeningQuestionCount').options,option=>Number(option.value)),
      invalidTotals,unchangedAfterDirect,unchangedAfterInput,detailAccepted,unchangedAfterDetail,distributed,selections,
      finalCounts:state.exerciseConfig.map(ex=>ex.pocetOtazek),primaryCounts:[state.readingQuestionCount,state.listeningQuestionCount]
    };
  });
  assert.deepEqual(controls.readingOptions,Array.from({length:30},(_,index)=>index+1));
  assert.deepEqual(controls.listeningOptions,Array.from({length:30},(_,index)=>index+1));
  assert.ok(controls.invalidTotals.every(result=>result.accepted===false));
  assert.equal(controls.unchangedAfterDirect,true);
  assert.equal(controls.unchangedAfterInput,true);
  assert.equal(controls.detailAccepted,false);
  assert.equal(controls.unchangedAfterDetail,true);
  assert.deepEqual(controls.distributed,[6,6,6,6,5]);
  for(const selection of controls.selections){
    assert.equal(selection.readingControl,String(selection.value));
    assert.equal(selection.listeningControl,String(selection.value));
    assert.deepEqual(selection.counts,[selection.value,17,selection.value,19]);
  }
  assert.deepEqual(controls.finalCounts,[30,1,30,2]);
  assert.deepEqual(controls.primaryCounts,[30,30]);

  async function snapshot(){return page.evaluate(() => ({
    codes:rosterEntries.map(entry => ({email:entry.email,code:entry.code})),
    name:document.getElementById('nazev').value,
    currentStep,maxStep,
    keyInMemory:geminiApiKey,
    keyInSession:sessionStorage.getItem(GEMINI_KEY_SESSION_SK),
    keyInLocal:localStorage.getItem(GEMINI_KEY_SK),
    body:state.body,counts:state.exerciseConfig.map(ex=>ex.pocetOtazek),points:state.exerciseConfig.map(ex=>ex.body)
  }));}
  const runtimeBeforeManuals=await snapshot();
  async function openManual(trigger,expected){
    const popupEvent=context.waitForEvent('page');
    await trigger();
    const manual=await popupEvent;
    await manual.waitForURL(expected,{timeout:15000});
    await manual.waitForLoadState('domcontentloaded');
    assert.match(manual.url(),expected);
    assert.equal(await manual.evaluate(()=>window.opener===null),true);
    assert.equal(page.url(),origin+'/generator/');
    assert.deepEqual(await snapshot(),runtimeBeforeManuals);
    await manual.close();
  }
  await openManual(()=>page.locator('#btnManual').click(),/\/manual\/\?from=app$/);
  await page.locator('#releaseChangesBtn').click();
  await openManual(()=>page.locator('#aboutAppGate .about-help-links a').click(),/\/manual\/\?from=app$/);
  await page.locator('#aboutAppCloseBtn').click();
  await openManual(()=>page.locator('a[href="./manual/rozesilani-kodu.html"]').evaluate(link=>link.click()),/\/manual\/rozesilani-kodu\.html$/);
  const csv3=await downloadCsv();
  assert.equal(sha256(csv3.bytes),sha256(csv1.bytes));
  assert.deepEqual(await snapshot(),runtimeBeforeManuals);
  assert.deepEqual(runtimeBeforeManuals.codes,before.codes);
  return {recipients:28,csvSha256:sha256(csv1.bytes),codesStable:true,sessionKeyScope:'session-only',manualRoutes:3,controls,pointInputWorkflow,detailPointAuthorityWorkflow};
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
      'header, About and Apps Script manual routes open in separate noopener tabs while the original generator runtime remains alive',
      '28 synthetic recipients retain the same in-memory codes and byte-identical repeated CSV',
      'session-scoped synthetic API key remains in the original session and is absent from localStorage',
      'a real invalid points input remains blocking after an unrelated click and both normal and direct forward navigation fail closed',
      'real preset and typed corrections clear stale validity state and restore navigation with exact point distributions',
      'real step 2 to step 1 detail-mode switch transfers point authority, clears only the hidden stale global error and preserves exact 20, 21 and 29 totals',
      'a fractional detail-point edit is rejected without mutating the valid detailed point plan',
      'fractional, empty, negative and out-of-range totals do not mutate the point plan; valid 29 remains 6+6+6+6+5',
      'Reading and Listening controls expose 1-30 and keep primary/secondary rows independent',
      'instant, secure student and teacher verifier render per-exercise Reading/Listening counts 1, 30, 2 and 9'
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
