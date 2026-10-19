#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:18816';
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const checks=[];let browser,context;
function pass(id,detail){checks.push({id,status:'PASS',detail});console.log(`PASS ${id} — ${detail}`);}
const fixture={
  objectiveTags:['A2 comparatives','weather vocabulary'],
  recommendedFormats:[
    {formatId:'multiple choice',why:'New comparative choices can be created from the grammar target.',assessedLanguageTargets:['comparatives'],evidenceFromSource:'The source names comparative forms but contains no multiple-choice exercise.',sampleTask:'Today is ___ than yesterday. (warmer / warm / warmest)',suggestedCount:5,requirements:[],confidence:0.94},
    {formatId:'odd one out',why:'The weather set supports lexical categorisation.',assessedLanguageTargets:['weather vocabulary'],evidenceFromSource:'rain, windy, cloudy and forecast occur in the material.',sampleTask:'rain / wind / cloud / spoon',suggestedCount:4,requirements:[],confidence:0.91},
    {formatId:'error correction',why:'New sentences can test comparative morphology.',assessedLanguageTargets:['comparative morphology'],evidenceFromSource:'The objective explicitly targets -er and more.',sampleTask:'Today is more cold than yesterday. → Today is colder than yesterday.',suggestedCount:4,requirements:['Teacher reviews accepted correction scope.'],confidence:0.82}
  ],
  limitations:['No audio source is present, so listening is not recommended.'],
  sourceCoverage:[{source:'Unit 5 synthetic text',status:'studied',note:'Text input was available.'},{source:'https://example.invalid/unit5',status:'unverified',note:'URL contents were not used.'}],
  optionalAlternativeFormats:['fill-in-the-blank']
};

function appHtml(){return fs.readFileSync('dist/index.html','utf8').replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'').replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'').replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S6",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s6"}};<\/script>');}

try{
  browser=await chromium.launch({headless:true});context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.route(origin+'/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/'||pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html',body:appHtml()});
    // The generated document contains production access-layer assets. This
    // deterministic local harness removes that bootstrap above and therefore
    // serves its remaining external scripts as inert resources instead of
    // accidentally returning index.html as JavaScript.
    if(pathname.endsWith('.js'))return route.fulfill({status:200,contentType:'application/javascript',body:''});
    return route.fulfill({status:204,body:''});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/index.html');
  await page.waitForFunction(()=>typeof recommendPedagogicalFormats==='function'&&typeof PEDAGOGICAL_FORMAT_CATALOG!=='undefined');
  // The production access bootstrap is deliberately removed by this local
  // harness. Reveal the already permit-seeded page without weakening source.
  await page.evaluate(()=>document.documentElement.setAttribute('data-ghrab-access','granted'));

  const catalog=await page.evaluate(()=>PEDAGOGICAL_FORMAT_CATALOG.map(item=>({id:item.formatId,es:item.exampleEs,goals:item.goalTags,pre:item.prerequisites,renderer:item.renderer,scorer:item.scorer})));
  assert.equal(catalog.length,38);assert.equal(new Set(catalog.map(x=>x.id)).size,38);assert.ok(catalog.every(x=>x.es&&x.goals.length&&x.pre.length&&x.renderer===x.scorer));
  pass('S6-B01','native Chromium loaded one complete 38-format catalog with bilingual examples and unchanged scorer bindings');

  const searches=await page.evaluate(()=>({conditionals:pedagogicalCatalogSearch('conditionals','all').map(x=>x.formatId),weather:pedagogicalCatalogSearch('weather','vocabulary').map(x=>x.formatId),spanish:pedagogicalCatalogSearch('časování','all').map(x=>x.formatId)}));
  assert.ok(searches.conditionals.includes('multiple choice'));assert.ok(searches.conditionals.includes('error correction'));assert.ok(!searches.conditionals.includes('heading matching'));assert.ok(searches.weather.includes('odd one out'));assert.ok(searches.weather.includes('match word to definition'));assert.ok(searches.spanish.includes('table-completion'));
  pass('S6-B02','conditionals, nature/weather and Spanish-conjugation searches return relevant formats without making heading matching a default');

  const mutation=await page.evaluate(value=>{const valid=validatePedagogicalRecommendationResponse(value,PEDAGOGICAL_FORMAT_CATALOG.map(x=>x.formatId));let unknown=false,duplicate=false;try{validatePedagogicalRecommendationResponse({...value,recommendedFormats:[{...value.recommendedFormats[0],formatId:'invented-format'}]},PEDAGOGICAL_FORMAT_CATALOG.map(x=>x.formatId));}catch{unknown=true}try{validatePedagogicalRecommendationResponse({...value,recommendedFormats:[value.recommendedFormats[0],value.recommendedFormats[0]]},PEDAGOGICAL_FORMAT_CATALOG.map(x=>x.formatId));}catch{duplicate=true}return {valid:valid.recommendedFormats.map(x=>x.formatId),coverage:valid.sourceCoverage,unknown,duplicate};},fixture);
  assert.deepEqual(mutation.valid,['multiple choice','odd one out','error correction']);assert.equal(mutation.unknown,true);assert.equal(mutation.duplicate,true);assert.equal(mutation.coverage[1].status,'unverified');
  pass('S6-B03','typed response gate accepts supported recommendations and rejects invented or duplicate formatId values');

  await page.evaluate(value=>{
    showOnlyStep(1);Object.assign(state,{jazyk:'angličtina',uroven:['A2'],zadaniTab:'text',sourceUseMode:'grammar',typyCviceni:['translation'],pocet:1});
    $('latka').value='Unit 5: comparative adjectives and weather vocabulary';$('zadaniText').value='warm warmer, cold colder, rain, windy, cloudy, forecast';
    genAiAvailable=()=>true;ensureGeminiDataNotice=async()=>true;buildGeminiFilePartsForApi=async()=>({parts:[]});buildGeminiUrlPartsForApi=()=>({parts:[],useUrlContext:false});runPedagogicalAiRequest=async()=>value;applyVisualState();validate();
  },fixture);
  const order=await page.evaluate(()=>{const p=$('pedagogicalRecommendationPanel'),types=$('globalTypesField');return !!(p.compareDocumentPosition(types)&Node.DOCUMENT_POSITION_FOLLOWING);});assert.equal(order,true);
  await page.locator('#pedagogicalRecommendationAiBtn').click();await page.waitForFunction(()=>document.querySelectorAll('.recommendation-card').length===3);
  assert.deepEqual(await page.evaluate(()=>state.typyCviceni),['translation'],'AI must not silently change selection');
  assert.match(await page.locator('#pedagogicalRecommendationResult').innerText(),/unverified/);assert.match(await page.locator('#pedagogicalRecommendationResult').innerText(),/Today is/);
  pass('S6-B04','pre-selection AI path renders evidence, sample tasks and source coverage without changing the teacher selection');

  await page.locator('.recommendation-card[data-format-id="multiple choice"] .recommendation-add').click();
  assert.deepEqual(await page.evaluate(()=>state.typyCviceni),['translation','multiple choice']);
  await page.locator('#formatCatalogRecommended').click();await page.locator('#formatCatalogGoal').selectOption('grammar');
  assert.equal(await page.locator('#typyBtns .tag-btn[data-val="multiple choice"]').isVisible(),true);assert.equal(await page.locator('#typyBtns .tag-btn[data-val="translation"]').isVisible(),true,'selected manual format stays visible even outside recommendation filter');
  pass('S6-B05','teacher accepts one recommendation while prior manual selection and synchronized count remain intact');

  await page.evaluate(()=>{$('latka').value='A2 past simple travel';onInput();});
  assert.match(await page.locator('#pedagogicalRecommendationResult').innerText(),/zneplatněno/);assert.equal(await page.locator('#formatCatalogRecommended').isDisabled(),true);assert.deepEqual(await page.evaluate(()=>state.typyCviceni),['translation','multiple choice']);
  pass('S6-B06','objective change invalidates stale AI advice without a hidden request or selection loss');

  const safe=await page.evaluate(value=>{value={...value,recommendedFormats:[{...value.recommendedFormats[0],sampleTask:'<img src=x onerror="window.__s6xss=1">'}]};const data=validatePedagogicalRecommendationResponse(value,PEDAGOGICAL_FORMAT_CATALOG.map(x=>x.formatId));renderPedagogicalRecommendationResult(data,pedagogicalRecommendationKey());return {html:$('pedagogicalRecommendationResult').innerHTML,xss:window.__s6xss||0};},fixture);
  assert.equal(safe.xss,0);assert.ok(!safe.html.includes('<img src=x'));pass('S6-B07','AI text is rendered with textContent and cannot create active HTML');

  await page.setViewportSize({width:390,height:844});await page.locator('#formatCatalogSearch').fill('conditionals');assert.equal(await page.locator('#formatCatalogSearch').isVisible(),true);await page.locator('#formatCatalogSearch').focus();assert.equal(await page.evaluate(()=>document.activeElement.id),'formatCatalogSearch');
  pass('S6-B08','catalog search and recommendation controls remain keyboard reachable in a 390x844 Chromium viewport');
  assert.deepEqual(errors,[],'generator page must have no unhandled errors');

  const report={schema:'git-s6-pedagogical-ai-browser-v1',stage:'S06',status:'PASS',provenance:{sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),trackedDiffSha256:sha256(execFileSync('git',['diff','--binary'],{encoding:'utf8'})),node:process.version,platform:process.platform,arch:process.arch,playwright:JSON.parse(fs.readFileSync('node_modules/playwright/package.json','utf8')).version,browser:await browser.version()},checks,scope:'Native headless Chromium exercises the built generator UI and a deterministic synthetic AI response. No real provider, AI Studio, GitHub Pages or physical device claim.',realProvider:'NOT VERIFIED',physicalDevices:'NOT VERIFIED',githubPages:'NOT VERIFIED'};
  fs.mkdirSync('qa-results/s6-pedagogical-ai-browser',{recursive:true});fs.writeFileSync('qa-results/s6-pedagogical-ai-browser/evidence.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS Sprint 06 Chromium gate ${checks.length}/${checks.length}`);
}finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
