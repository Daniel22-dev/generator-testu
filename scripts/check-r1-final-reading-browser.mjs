#!/usr/bin/env node
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { configure, build, enterStartCode, completeGeneratedPageStart, GEN, gdom, w } from './redteam-harness-utils.mjs';

const origin='http://127.0.0.1:18793';
const primary='První odstavec s kontextem.\r\nDruhý odstavec s dlouhým slovem abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz.\nTřetí <img src=x onerror=alert(1)> & nedůvěryhodný text.';
const secondary='Odlišný odstavec pro druhou otázku.\nDruhý řádek s <script>window.__readingXss=1</script>.';
const contexts=[];
const pageErrors=[];
let browser;

const choice=(passage,label)=>({passage,question:`${label}: Co text popisuje?`,options:['A','B'],correct:0,explanation:'Syntetické vysvětlení.'});
const exercise=shared=>({
  type:'reading comprehension',style:'reading comprehension',title:'Reading integration',points_total:2,points_each:1,
  ...(shared?{passage:primary}:{}),
  items:shared?[choice(undefined,'Otázka 1'),choice(undefined,'Otázka 2')]:[choice(primary,'Otázka 1'),choice(secondary,'Otázka 2')]
});

function configureCase(secure,shared){
  configure({
    testMode:secure?'prisny':'bezny',resultMode:secure?'secureOffline':'instant',screenGuard:secure,
    feedbackMode:secure?'none':'brief',layout:'list',randomizace:'NE',exerciseDetail:true,exerciseConfigSaved:true,
    typyCviceni:['reading comprehension'],exerciseConfig:[{typ:'reading comprehension',pocetOtazek:2,body:2}],
    readingSourceScope:'shared',body:2,pocet:1
  });
  // Canonical generation accepts one exercise-level Reading source. The
  // per-item case below is injected only after generation to exercise the
  // supported legacy renderer branch inside the real generated artifact.
  GEN.exercises=[structuredClone(exercise(true))];
}

async function pageFor(html,path,width=768){
  const context=await browser.newContext({viewport:{width,height:780}});contexts.push(context);
  await context.route(origin+'/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
  const page=await context.newPage();page.on('pageerror',error=>pageErrors.push(`${path}: ${error.message}`));
  await page.goto(`${origin}/${path}`,{waitUntil:'load'});return page;
}

async function readingMetrics(page,selector){
  return page.locator(selector).evaluateAll(nodes=>nodes.map(el=>({
    text:el.textContent||'',whiteSpace:getComputedStyle(el).whiteSpace,align:getComputedStyle(el).textAlign,
    overflow:el.scrollWidth<=el.clientWidth+1,active:el.querySelectorAll('img,script').length
  })));
}

function assertMetrics(metrics,shared,label,width){
  assert.equal(metrics.length,shared?1:2,`${label} ${width}px: wrong Reading source count`);
  for(const metric of metrics){
    assert.equal(metric.whiteSpace,'pre-line',`${label} ${width}px: line endings are not preserved`);
    assert.equal(metric.align,'justify',`${label} ${width}px: text is not justified`);
    assert.equal(metric.overflow,true,`${label} ${width}px: horizontal overflow`);
    assert.equal(metric.active,0,`${label} ${width}px: hostile markup became active`);
    assert.ok(metric.text.includes('\n'),`${label} ${width}px: LF/CRLF is not present in rendered text`);
  }
  assert.ok(metrics[0].text.includes('<img src=x onerror=alert(1)>'),`${label}: XSS payload was not preserved as text`);
  if(!shared)assert.ok(metrics[1].text.includes('<script>window.__readingXss=1</script>'),`${label}: per-item XSS payload was not preserved as text`);
}

async function assertAtWidths(page,selector,shared,label){
  for(const width of [360,768]){
    await page.setViewportSize({width,height:780});
    assertMetrics(await readingMetrics(page,selector),shared,label,width);
    console.log(`PASS actual ${label} ${shared?'shared':'per-item'} ${width}px`);
  }
}

async function instantPath(shared){
  configureCase(false,shared);const html=await build();assert.equal(typeof html,'string','instant generator did not return HTML');
  const legacyHtml=shared?null:w.buildVariantHtmls(JSON.parse(w.JSON.stringify(w.eval('lastAssembled.cfg'))),{__default:[exercise(false)]}).__default;
  const page=await pageFor(html,`instant-${shared?'shared':'per-item'}.html`);
  await page.locator('#studentName').fill('Synthetic Reader');await completeGeneratedPageStart(page);
  if(!shared)await page.evaluate(({ex,rendered})=>{VARIANTS.__default=[ex];VARIANT_HTMLS.__default=rendered;activateVariant('__default');},{ex:exercise(false),rendered:legacyHtml});
  await assertAtWidths(page,'.reading-passage',shared,'instant student');
}

async function securePaths(shared){
  configureCase(true,shared);const pkg=await build();assert.ok(pkg?.studentHtml&&pkg?.teacherHtml,'secure generator did not return student/verifier pair');
  const student=await pageFor(pkg.studentHtml,`secure-${shared?'shared':'per-item'}.html`);
  await student.locator('#studentName').fill('Synthetic Reader');await enterStartCode(student,pkg);await completeGeneratedPageStart(student);
  if(!shared)await student.evaluate(ex=>{EXS=[ex];renderTest();},exercise(false));
  await assertAtWidths(student,'.reading-passage',shared,'secure student');

  const verifier=await pageFor(pkg.teacherHtml,`verifier-${shared?'shared':'per-item'}.html`);
  if(shared)await verifier.evaluate(()=>renderTeacherPreview('__default'));
  else await verifier.evaluate(ex=>{VARIANTS_FULL.__default=[ex];renderTeacherPreview('__default');},exercise(false));
  await assertAtWidths(verifier,'#teacherPreview .reading-passage',shared,'teacher preview');

  let printable=await verifier.evaluate(()=>buildPrintableHtml(true,'r1finalreadingnonce'));
  if(process.env.GIT_R1_FINAL_READING_MUTANT==='print-css')printable=printable.replace('white-space:pre-line','white-space:normal');
  const printPage=await pageFor(printable,`print-${shared?'shared':'per-item'}.html`);
  await assertAtWidths(printPage,'.ex .src',shared,'teacher print');
}

try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  for(const shared of [true,false]){await instantPath(shared);await securePaths(shared);}
  assert.deepEqual(pageErrors,[],'generated Reading paths produced browser errors');
  console.log('PASS ID13 actual generated renderer integration: 4 paths × shared/per-item × 360/768');
}finally{
  await Promise.all(contexts.map(context=>context.close().catch(()=>{})));await browser?.close();gdom.window.close();
}
