#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=process.cwd();
const outDir=path.resolve('qa-results/r1b1-c29-browser');
const evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executablePath=candidates.find(item=>fs.existsSync(item));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const checks=[];
const failures=[];
const pageErrors=[];
const START='https://docs.google.com/forms/d/e/SYNTHETIC-C29/viewform?usp=pp_url&entry.1=TEST&entry.4=GIT-LESSON-START-V1';
const END='https://docs.google.com/forms/d/e/SYNTHETIC-C29/viewform?usp=pp_url&entry.1=TEST&entry.4=GIT-LESSON-END-V1';
const CODE='C29SYN';

function record(id,status,detail,error=''){
  const row={id,status,detail,...(error?{error}:{})};checks.push(row);
  (status==='PASS'?console.log:console.error)(`${status} ${id} - ${detail}${error?`: ${error}`:''}`);
}
async function check(id,detail,fn){
  try{await fn();record(id,'PASS',detail);}
  catch(error){const text=String(error?.stack||error);failures.push({id,error:text});record(id,'FAIL',detail,text);}
}
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const pngSize=file=>{const data=fs.readFileSync(file);assert.equal(data.toString('ascii',1,4),'PNG');return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};};

let generatorHtml=fs.readFileSync(path.resolve('dist/index.html'),'utf8');
generatorHtml=generatorHtml
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'')
  .replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"R1B1",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"r1b1"}};<\/script>');

const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{
  window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'r1b1',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});
});
await context.route('https://generator.example/**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/'||pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:generatorHtml});
  if(pathname.endsWith('.js'))return route.fulfill({status:200,contentType:'application/javascript',body:''});
  return route.fulfill({status:204,body:''});
});
const page=await context.newPage();
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
page.on('console',message=>{if(message.type()==='error')pageErrors.push(`console: ${message.text()}`);});
await page.goto('https://generator.example/index.html');
await page.waitForFunction(()=>typeof renderStartCode==='function'&&typeof updateSecureDownloadGate==='function');
page.setDefaultTimeout(2000);
await page.evaluate(()=>document.documentElement.setAttribute('data-ghrab-access','granted'));

async function state(kind='locked',patch={}){
  return page.evaluate(({kind,patch,start,end,code})=>{
    generatedPackage={mode:'secureOffline',startCode:code,lessonStartUrl:start,lessonEndUrl:end,...patch};
    exportChecklist=kind==='allowed'?{content:true,answers:true,grading:true,distribution:true}:{};
    lastSelfTest=kind==='never'?null:{ok:kind!=='failed',hasErrors:kind==='failed',hasGaps:kind==='gaps',gapCount:kind==='gaps'?1:0};
    secureGapsAcknowledged=kind==='allowed';
    lastKeyCheck=kind==='ai-diff'?{closedDiffs:1}:null;
    keyDiffsAcknowledged=false;
    renderStartCode();
    updateSecureDownloadGate();
    resultStep(4,false);
    // The production flow unhides the result container when generation completes.
    // Each isolated scenario must restore that precondition after earlier cases
    // deliberately mutate package state and result visibility.
    $('step4').classList.remove('hidden');
    $('genResult').classList.remove('hidden');
    $('resultPanel4').classList.remove('hidden');
    return {allowed:secureDownloadAllowed()};
  },{kind,patch,start:START,end:END,code:CODE});
}
const snapshot=()=>page.evaluate(()=>{
  const card=document.querySelector('#privateStartCode');
  return {
    card:!!card,
    parent:card?.closest('[data-result-panel]')?.id||'',
    text:card?.textContent||'',
    html:card?.innerHTML||'',
    hrefs:[...(card?.querySelectorAll('a[href]')||[])].map(a=>({href:a.href,target:a.target,rel:a.rel})),
    buttons:[...(card?.querySelectorAll('button')||[])].map(b=>({text:b.textContent.trim(),disabled:b.disabled})),
    details:!!card?.querySelector('details'),
    count:document.querySelectorAll('#privateStartCode').length
  };
});

await state('never');
await check('B1-01','card is mounted exactly once inside result panel 4',async()=>{const s=await snapshot();assert.equal(s.parent,'resultPanel4');assert.equal(s.count,1);assert.equal(await page.locator('#resultPanel1 #privateStartCode').count(),0);});
await check('B1-02','component uses dedicated handoff styles and semantic controls',async()=>{const s=await snapshot();assert.match(s.html,/handoff-lesson-/);assert.equal(/class="(?:note|warn|row|btn)"/.test(s.html),false);});
await check('B1-03','copy distinguishes opening from submitting START and END forms',async()=>{await state('allowed');const s=await snapshot();assert.match(s.text,/Otevřít formulář START/);assert.match(s.text,/je nutné jej odeslat/);assert.match(s.text,/Samotné otevření odkazu nic nezahajuje ani neukončuje/);assert.doesNotMatch(s.text,/Začít příjem teď|Ukončit příjem teď|START odeslán|END potvrzen/);});
await check('B1-04','raw phone URLs are contained in an initially collapsed details control',async()=>{await state('allowed');const d=page.locator('#privateStartCode details');assert.equal(await d.count(),1);assert.equal(await d.getAttribute('open'),null);assert.equal(await page.locator('#privateStartCode .handoff-lesson-url').first().isVisible(),false);});

for(const [id,kind,detail] of [
  ['B1-05','never','secure package before self-test is fail-closed'],
  ['B1-06','failed','failed self-test is fail-closed'],
  ['B1-07','locked','pending teacher review is fail-closed'],
  ['B1-08','gaps','unacknowledged scoring gaps are fail-closed']
]){
  await check(id,detail,async()=>{const result=await state(kind);const s=await snapshot();assert.equal(result.allowed,false);assert.equal(s.html.includes(CODE),false);assert.equal(s.html.includes(START),false);assert.equal(s.html.includes(END),false);assert.equal(s.hrefs.length,0);});
}
await check('B1-09','completed secure gate reveals only the current package actions',async()=>{const result=await state('allowed');const s=await snapshot();assert.equal(result.allowed,true);assert.equal(s.hrefs.length,2);assert.deepEqual(s.hrefs.map(x=>x.href),[START,END]);assert.equal(s.html.includes(CODE),false,'code must remain hidden until reveal');});
await check('B1-10','new unresolved closed AI difference re-locks all values',async()=>{await state('ai-diff');const s=await snapshot();assert.equal(s.html.includes(CODE)||s.html.includes(START)||s.html.includes(END),false);assert.equal(s.hrefs.length,0);});
await check('B1-11','START and END actions use the exact current URL and safe new-tab attributes',async()=>{await state('allowed');const s=await snapshot();assert.deepEqual(s.hrefs,[{href:START,target:'_blank',rel:'noopener noreferrer'},{href:END,target:'_blank',rel:'noopener noreferrer'}]);});
await check('B1-12','opening a lesson form cannot claim receipt or mutate lesson state',async()=>{await state('allowed');const before=await page.evaluate(()=>({storage:{...localStorage},pkg:JSON.stringify(generatedPackage),text:$('privateStartCode').textContent}));await page.evaluate(()=>{window.__c29Open=[];window.open=(...args)=>{window.__c29Open.push(args);return {opener:null};};openHandoffLesson('START');});const after=await page.evaluate(()=>({storage:{...localStorage},pkg:JSON.stringify(generatedPackage),text:$('privateStartCode').textContent,opened:window.__c29Open}));assert.deepEqual(after.storage,before.storage);assert.equal(after.pkg,before.pkg);assert.equal(after.opened.length,1);assert.doesNotMatch(after.text,/přijato|odeslán|potvrzen/i);});
await check('B1-13','missing lesson URLs show diagnostics without broken links while code remains available',async()=>{await state('allowed',{lessonStartUrl:'',lessonEndUrl:''});const s=await snapshot();assert.equal(s.hrefs.length,0);assert.match(s.text,/odkaz.*není dostupný|odkazy.*nejsou dostupné/i);await page.getByRole('button',{name:'Zobrazit kód'}).click();assert.match((await snapshot()).text,new RegExp(CODE));});
await check('B1-14','javascript, data and http lesson URLs never become active',async()=>{for(const url of ['javascript:alert(1)','data:text/html,bad','http://docs.google.com/forms/d/e/X/viewform']){await state('allowed',{lessonStartUrl:url,lessonEndUrl:url});assert.equal((await snapshot()).hrefs.length,0);assert.equal(await page.evaluate(()=>openHandoffLesson('START')),false);}});
await check('B1-15','code copy succeeds or exposes an accessible manual fallback without logging the code',async()=>{await state('allowed');await page.getByRole('button',{name:'Zobrazit kód'}).click();assert.match((await snapshot()).text,new RegExp(CODE));await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}}));await page.getByRole('button',{name:'Kopírovat kód'}).click();const status=page.locator('#handoffLessonStatus');assert.match(await status.textContent(),/ručně|označen/i);assert.equal((await status.textContent()).includes(CODE),false);assert.equal(await page.locator('#handoffStartCodeValue').getAttribute('tabindex'),'0');});
await check('B1-16','phone copy is available only after gate approval and cannot copy stale URL',async()=>{await state('allowed');await page.locator('#privateStartCode details summary').click();assert.ok(await page.getByRole('button',{name:/Kopírovat START odkaz/}).isVisible());await state('never');assert.equal((await snapshot()).html.includes(START),false);assert.equal(await page.evaluate(()=>copyHandoffLessonValue('START')),false);});
await check('B1-17','artifact invalidation removes revealed code and stale actions immediately',async()=>{await state('allowed');await page.getByRole('button',{name:'Zobrazit kód'}).click();await page.evaluate(()=>{lastSelfTest=null;selfTestStaleReason='Synthetic edit';updateSecureDownloadGate();});const s=await snapshot();assert.equal(s.html.includes(CODE)||s.html.includes(START)||s.html.includes(END),false);});
await check('B1-18','new package render uses only the new code and new lesson URLs',async()=>{await state('allowed');await page.evaluate(()=>{generatedPackage={...generatedPackage,startCode:'NEWC29',lessonStartUrl:'https://docs.google.com/forms/d/e/NEW-C29/viewform?entry.4=GIT-LESSON-START-V1',lessonEndUrl:'https://docs.google.com/forms/d/e/NEW-C29/viewform?entry.4=GIT-LESSON-END-V1'};renderStartCode();});await page.getByRole('button',{name:'Zobrazit kód'}).click();const s=await snapshot();assert.match(s.text,/NEWC29/);assert.equal(s.html.includes(CODE)||s.html.includes('SYNTHETIC-C29'),false);});
await check('B1-19','empty generation state clears the card and rollback restores only its actual package',async()=>{await state('allowed');await page.evaluate(()=>{generatedPackage=null;renderStartCode();});assert.equal((await snapshot()).card,false);await state('allowed',{startCode:'ROLL29',lessonStartUrl:START,lessonEndUrl:END});await page.getByRole('button',{name:'Zobrazit kód'}).click();assert.match((await snapshot()).text,/ROLL29/);});
await check('B1-20','instant and practice output do not render secure lesson controls',async()=>{await page.evaluate(({start,end})=>{generatedPackage={mode:'instant',startCode:'SHOULD-NOT-APPEAR',lessonStartUrl:start,lessonEndUrl:end};renderStartCode();},{start:START,end:END});assert.equal((await snapshot()).card,false);await page.evaluate(()=>{generatedPackage=null;generatedTestHtml='<html></html>';renderStartCode();});assert.equal((await snapshot()).card,false);});

await check('B1-21','generated secure student/verifier pair keeps IDs, hashes and lesson markers consistent',async()=>{
  process.env.GIT_REDTEAM_GENERATOR_HTML=path.resolve('dist/index.html');
  const {w,configure,build}=await import(`./redteam-harness-utils.mjs?r1b1=${Date.now()}`);
  configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});
  w.eval(`rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];state.__formsSubmissionUrl='https://docs.google.com/forms/d/e/SYNTHETIC-C29/viewform';state.__formsMetadata=parseGoogleFormsPrefilledMetadataUrl('https://docs.google.com/forms/d/e/SYNTHETIC-C29/viewform?usp=pp_url&entry.111=TESTID&entry.222=NAZEV&entry.333=TRIDA&entry.444=KOD');state.__formsAnchorProfile={teacherEmails:['teacher@example.invalid'],verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:true};`);
  const pkg=await build();
  assert.ok(pkg.testId&&pkg.manifestHash&&pkg.studentHtmlSha256&&pkg.teacherHtml);
  assert.equal(pkg.studentHtml.includes(pkg.startCode),false);
  assert.ok(pkg.lessonStartUrl.includes('GIT-LESSON-START-V1'));
  assert.ok(pkg.lessonEndUrl.includes('GIT-LESSON-END-V1'));
  assert.ok(pkg.teacherHtml.includes(pkg.testId));
  assert.ok(pkg.teacherHtml.includes(pkg.manifestHash));
});
await check('B1-22','result tabs and lesson controls remain keyboard accessible',async()=>{await state('allowed');await page.locator('#resultTab1').focus();await page.locator('#resultTab1').press('End');assert.equal(await page.locator('#resultTab4').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#resultTab4').evaluate(node=>document.activeElement===node),true);const controls=page.locator('#privateStartCode button,#privateStartCode a,#privateStartCode summary');let heights=await controls.evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>node.getBoundingClientRect().height));assert.ok(heights.length>=5);assert.ok(heights.every(height=>height>=44));await page.locator('#privateStartCode details summary').press('Enter');heights=await controls.evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>node.getBoundingClientRect().height));assert.ok(heights.length>=7);assert.ok(heights.every(height=>height>=44));});
await check('B1-23','responsive card has no horizontal overflow at required widths and measured zoom states',async()=>{try{for(const width of [360,390,768,1024,1440]){await page.setViewportSize({width,height:900});await state('allowed');await page.locator('#privateStartCode details summary').click();const dims=await page.locator('#privateStartCode').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(dims.scroll<=dims.client+1,`${width}px overflow ${dims.scroll}/${dims.client}`);if(width===360||width===1440)await page.screenshot({path:path.join(outDir,`handoff-${width}.png`),fullPage:true});if(width===390){await page.evaluate(()=>document.body.classList.add('light'));await page.screenshot({path:path.join(outDir,'handoff-light-390.png'),fullPage:true});assert.equal(pngSize(path.join(outDir,'handoff-light-390.png')).width,390);await page.evaluate(()=>document.body.classList.remove('light'));}}for(const zoom of [2,4]){await page.setViewportSize({width:1280,height:900});await state('allowed');await page.evaluate(value=>{document.documentElement.style.zoom=String(value);},zoom);const dims=await page.locator('#privateStartCode').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,zoom:getComputedStyle(document.documentElement).zoom,offenders:[...el.querySelectorAll('*')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>`${node.tagName}.${node.className}:${node.scrollWidth}/${node.clientWidth}`).slice(0,8)}));assert.equal(Number(dims.zoom),zoom);assert.ok(dims.scroll<=dims.client+1,`${zoom*100}% CSS zoom overflow ${dims.scroll}/${dims.client}; ${dims.offenders.join(', ')}`);await page.evaluate(()=>{document.documentElement.style.zoom='';});}}finally{await page.evaluate(()=>{document.documentElement.style.zoom='';document.body.classList.remove('light');});}});
await check('B1-24','standalone and simulated AI Studio iframe render the same gated component',async()=>{await page.setViewportSize({width:768,height:900});await state('allowed');const outer=await context.newPage();await outer.setContent('<iframe title="AI Studio simulation" style="width:390px;height:800px"></iframe>');const frame=outer.frames()[1];await frame.setContent(generatorHtml);await frame.waitForFunction(()=>typeof renderStartCode==='function');await frame.evaluate(({start,end,code})=>{document.documentElement.setAttribute('data-ghrab-access','granted');generatedPackage={mode:'secureOffline',startCode:code,lessonStartUrl:start,lessonEndUrl:end};exportChecklist={content:true,answers:true,grading:true,distribution:true};lastSelfTest={ok:true,hasErrors:false,hasGaps:false};secureGapsAcknowledged=true;lastKeyCheck=null;keyDiffsAcknowledged=false;renderStartCode();updateSecureDownloadGate();},{start:START,end:END,code:CODE});assert.equal(await frame.locator('#resultPanel4 #privateStartCode').count(),1);await outer.close();});
await check('B1-25','repeated gate updates remain idempotent and stale callbacks fail closed',async()=>{await state('allowed');for(let i=0;i<8;i++)await page.evaluate(()=>updateSecureDownloadGate());assert.equal((await snapshot()).count,1);await page.evaluate(()=>{lastSelfTest=null;updateSecureDownloadGate();});assert.equal(await page.evaluate(()=>openHandoffLesson('START')),false);assert.equal(await page.evaluate(()=>copyHandoffLessonValue('START')),false);});
await check('B1-26','normal asynchronous artifact edit immediately disables stale handoff controls',async()=>{await state('allowed');const observed=await page.evaluate(async()=>{lastAssembled={sourceState:{}};lastGenData={exercises:[]};const original=assembleTestHtml;let rejectBuild;assembleTestHtml=()=>new Promise((_,reject)=>{rejectBuild=reject;});const pending=commitAnswerData({exercises:[]},lastAssembled,{},{}).catch(()=>false);await Promise.resolve();const card=$('privateStartCode');const during={busy:outputMutationBusy,activeLinks:card?.querySelectorAll('a[href]').length||0,copyButton:[...(card?.querySelectorAll('button')||[])].some(button=>/Kopírovat kód/.test(button.textContent)&&!button.disabled),containsCode:card?.innerHTML.includes(generatedPackage?.startCode||'')||false};rejectBuild(new Error('synthetic rollback'));await pending;assembleTestHtml=original;return during;});assert.deepEqual(observed,{busy:true,activeLinks:0,copyButton:false,containsCode:false});});
await check('B1-27','stale DOM controls are bound to their rendered package and exact URLs',async()=>{await state('allowed',{startCode:'A1START'});await page.locator('#privateStartCode details summary').click();const result=await page.evaluate(async()=>{const oldLink=$('privateStartCode').querySelector('a[href]'),buttons=[...$('privateStartCode').querySelectorAll('button')],oldCodeCopy=buttons.find(button=>/Kopírovat kód/.test(button.textContent)),oldUrlCopy=buttons.find(button=>/Kopírovat START odkaz/.test(button.textContent));const oldHref=oldLink.href;const writes=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>writes.push(value)}});generatedPackage={...generatedPackage,startCode:'B2START',lessonStartUrl:'https://docs.google.com/forms/d/e/B-C29/viewform?entry.4=GIT-LESSON-START-V1',lessonEndUrl:'https://docs.google.com/forms/d/e/B-C29/viewform?entry.4=GIT-LESSON-END-V1'};const event=new MouseEvent('click',{bubbles:true,cancelable:true});oldLink.dispatchEvent(event);oldCodeCopy.click();oldUrlCopy.click();await Promise.resolve();return {oldHref,prevented:event.defaultPrevented,writes};});assert.equal(result.oldHref,START);assert.equal(result.prevented,true);assert.deepEqual(result.writes,[]);});
await check('B1-28','stable rerender preserves revealed code, details state and focused control',async()=>{await state('allowed');await page.getByRole('button',{name:'Zobrazit kód'}).click();await page.locator('#privateStartCode details summary').click();await page.getByRole('button',{name:/Kopírovat START odkaz/}).focus();const before=await page.evaluate(()=>{window.__c29BeforeCard=$('privateStartCode');return {text:$('handoffStartCodeValue').textContent};});await page.evaluate(()=>updateSecureDownloadGate());const after=await page.evaluate(()=>({sameCard:$('privateStartCode')===window.__c29BeforeCard,expanded:$('handoffStartCodeToggle').getAttribute('aria-expanded'),details:$('handoffLessonPhoneDetails').open,focused:/Kopírovat START odkaz/.test(document.activeElement?.textContent||''),text:$('handoffStartCodeValue').textContent}));assert.equal(before.text,CODE);assert.deepEqual(after,{sameCard:true,expanded:'true',details:true,focused:true,text:CODE});});
await check('B1-29','a real gate lock removes every previously revealed value',async()=>{await state('allowed');await page.getByRole('button',{name:'Zobrazit kód'}).click();await page.locator('#privateStartCode details summary').click();await page.evaluate(()=>{lastSelfTest=null;updateSecureDownloadGate();});const s=await snapshot();assert.equal(s.html.includes(CODE)||s.html.includes(START)||s.html.includes(END),false);assert.equal(s.hrefs.length,0);});
await check('B1-30','handoff guidance distinguishes all four code authorities',async()=>{await state('allowed');const text=(await snapshot()).text;assert.match(text,/startovn/i);assert.match(text,/osobn/i);assert.match(text,/Recovery/);assert.match(text,/Teacher\/Admin/);});
await check('B1-31','browser scenario completes without page or console errors',async()=>assert.deepEqual(pageErrors,[]));

const evidence={schema:'git-r1b1-c29-browser-v1',status:failures.length?'FAIL':'PASS',gitHead,gitTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),node:process.version,chromium:executablePath,fixture:{startSha256:sha(START),endSha256:sha(END),code:'synthetic-redacted'},checks,pageErrors,failures};
await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
await context.close();
await browser.close();
if(failures.length){console.error(`FAIL R1-B1 C29 browser gate (${checks.length-failures.length}/${checks.length} PASS)`);process.exitCode=1;}
else console.log(`PASS R1-B1 C29 browser gate (${checks.length}/${checks.length})`);
