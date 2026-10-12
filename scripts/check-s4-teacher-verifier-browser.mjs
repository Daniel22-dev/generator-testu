#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const fixture=path.resolve('qa-results/qa-fixtures/teacher_verifier.html');
const outDir=path.resolve('qa-results/s4-teacher-verifier-browser');
const evidencePath=path.join(outDir,'evidence.json');
const chromiumCandidates=[
  process.env.CHROMIUM_PATH,
  'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe',
  '/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'
].filter(Boolean);
const executablePath=chromiumCandidates.find(p=>fs.existsSync(p));
if(!fs.existsSync(fixture))throw new Error('Chybí generovaný qa-results/qa-fixtures/teacher_verifier.html. Spusť nejprve QA fixture generation.');
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const html=await fsp.readFile(fixture,'utf8');
const fixtureSha256=crypto.createHash('sha256').update(html).digest('hex');
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const server=http.createServer((req,res)=>{if(req.url==='/'||req.url?.startsWith('/teacher_verifier.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html);return;}res.writeHead(404);res.end('not found');});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port=server.address().port;
const checks=[];
function check(condition,id,detail){if(!condition)throw new Error(`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}

const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run','--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));page.on('console',m=>{if(m.type()==='error')pageErrors.push(`console: ${m.text()}`);});
try{
  await page.goto(`http://127.0.0.1:${port}/teacher_verifier.html`,{waitUntil:'load'});
  await page.waitForSelector('#v2ThemeBtn');
  await page.evaluate(()=>{
    const at=n=>new Date(Date.UTC(2026,9,12,7,0,0)+n*1000).toISOString();
    const ev=(type,n,extra={})=>({type,t:at(n),...extra});
    const row=(id,securityEvents,extra={})=>({
      status:'OK',student:`Synthetic ${id}`,code:id,file:`synthetic-${id}.txt`,earned:17,total:20,pct:85,grade:'2',groupKey:'__default',
      attemptId:`ATT-${id}`,submissionDigest:`digest-${id}`,semanticDigest:`semantic-${id}`,securityEvents,
      details:[{id:'q1',ok:true,earned:1,max:1}],answerChangeStats:{},totalAnswerChanges:0,
      startedAt:at(0),submittedAt:at(1200),metadataMismatch:[],envelopeMismatch:[],anchorNotes:[],jokerUsed:false,
      ...extra
    });
    const counts=[[8,8,3],[7,7,2],[7,7,2],[7,7,2],[7,7,2],[7,7,2]];
    const rows=counts.map((c,i)=>{const events=[ev('attempt-start',i)];let n=i*100;for(let x=0;x<c[0];x++)events.push(ev('locked',++n,{detail:`lock ${x+1}`}));for(let x=0;x<c[1];x++)events.push(ev('recovery-unlock',++n,{lockReason:`lock ${x+1}`}));for(let x=0;x<c[2];x++)events.push(ev('bad-unlock',++n));if(i<3)events.push(ev('split-window',++n,{pct:[7,49,96][i],detail:`synthetic split ${[7,49,96][i]}%`}));return row(`S${i+1}`,events);});
    const stress=Array.from({length:302},(_,i)=>ev(i%71===0?'left-window':'focus-transition',1500+i,{detail:i===301?'<img src=x onerror="window.__s4Xss=1">':`stress ${i+1}`}));
    rows.push(row('STRESS-302',stress));
    rows.push(row('TELEMETRY-ZERO',[]));
    const absent=row('TELEMETRY-ABSENT',[]);delete absent.securityEvents;rows.push(absent);
    rows.push(row('UNKNOWN-PCT',[ev('split-window',2100,{pct:null,detail:'missing null'}),ev('split-window',2101,{pct:'',detail:'missing blank'}),ev('split-window',2102,{detail:'missing undefined'})]));
    rows.push(row('VALID-SPLIT-ZERO',[ev('split-window',2200,{pct:0,detail:'measured zero'})]));
    const criticalOnly=row('CRITICAL-ONLY',[]);delete criticalOnly.securityEvents;criticalOnly.criticalEvents=[ev('locked',2300,{detail:'critical-only lock',criticalSeq:1}),ev('recovery-unlock',2301,{detail:'critical-only recovery',lockReason:'critical-only lock',criticalSeq:2})];criticalOnly.criticalCounters={locks:1,unlocks:1,resumes:0,badUnlocks:0};criticalOnly.criticalOverflow=false;criticalOnly.criticalHistoryLegacy=false;rows.push(criticalOnly);
    const duplicate=ev('locked',2400,{detail:'shared duplicate',criticalSeq:1});rows.push(row('MERGED-EVENTS',[{...duplicate},ev('locked',2401,{detail:'unique routine lock'})],{criticalEvents:[{...duplicate}],criticalCounters:{locks:1,unlocks:0,resumes:0,badUnlocks:0},criticalOverflow:false,criticalHistoryLegacy:false}));
    window.__s4Xss=0;RESULTS=rows;afterResultsChanged();showVerifierPanel('results');
  });
  await page.waitForSelector('.s4-result-main');
  const initial=await page.evaluate(()=>({
    rows:document.querySelectorAll('.s4-result-main').length,
    detailHidden:[...document.querySelectorAll('.s4-result-detail')].every(x=>x.hidden),
    sums:[...document.querySelectorAll('.s4-result-main')].slice(0,6).reduce((a,row)=>{const cells=row.cells;a.locks+=Number(cells[3].textContent);const recovery=cells[4].textContent.match(/(\d+)\s*\/\s*(\d+)/);a.recovery+=Number(recovery?.[1]||0);a.bad+=Number(recovery?.[2]||0);return a;},{locks:0,recovery:0,bad:0}),
    split:[...document.querySelectorAll('[data-s4-split-state="detected"]')].slice(0,3).map(x=>x.textContent.replace(/\s+/g,' ').trim()),
    telemetry:['TELEMETRY-ZERO','TELEMETRY-ABSENT'].map(id=>{const row=[...document.querySelectorAll('.s4-result-main')].find(x=>x.textContent.includes(id)),split=row?.querySelector('.s4-split');return split?.getAttribute('data-s4-split-state')+':'+split?.textContent.trim();}),
    unknownSplit:(()=>{const row=[...document.querySelectorAll('.s4-result-main')].find(x=>x.textContent.includes('UNKNOWN-PCT'));return row?.querySelector('.s4-split')?.textContent.replace(/\s+/g,' ').trim();})(),
    measuredZero:(()=>{const row=[...document.querySelectorAll('.s4-result-main')].find(x=>x.textContent.includes('VALID-SPLIT-ZERO'));return row?.querySelector('.s4-split')?.textContent.replace(/\s+/g,' ').trim();})(),
    xss:window.__s4Xss,
    injectedImages:document.querySelectorAll('.s4-detail-panel img').length,
    maxMainHeight:Math.max(...[...document.querySelectorAll('.s4-result-main')].map(x=>x.getBoundingClientRect().height))
  }));
  check(initial.rows===13,'S4-B01','skutečně generovaný verifier vykreslil 13 syntetických pokusů včetně nápravných scénářů');
  check(initial.detailHidden,'S4-B02','plná telemetrie je ve výchozím stavu skrytá v detailu');
  check(initial.sums.locks===43&&initial.sums.recovery===43&&initial.sums.bad===13,'S4-B03',`souhrn 43/43/13 (${JSON.stringify(initial.sums)})`);
  check(initial.split.some(x=>/7\s*%/.test(x))&&initial.split.some(x=>/49\s*%/.test(x))&&initial.split.some(x=>/96\s*%/.test(x)),'S4-B04',`split-window 7/49/96 % (${initial.split.join(' | ')})`);
  check(initial.telemetry.some(x=>x.startsWith('none:Nezaznamenáno'))&&initial.telemetry.some(x=>x.startsWith('absent:Data nejsou k dispozici')),'S4-B05',`chybějící telemetrie je odlišena od validní nuly (${initial.telemetry.join(' | ')})`);
  check(/maximum Nezjištěno/i.test(initial.unknownSplit)&&/3× Nezjištěno/i.test(initial.unknownSplit)&&!/0\s*%/.test(initial.unknownSplit),'S41-B15',`null/prázdná/nedefinovaná procenta nejsou 0 % (${initial.unknownSplit})`);
  check(/max 0\s*%/.test(initial.measuredZero),'S41-B16',`skutečně naměřených 0 % zůstává 0 % (${initial.measuredZero})`);
  check(initial.maxMainHeight<150,'S4-B06',`kompaktní hlavní řádky, max ${Math.round(initial.maxMainHeight)} px`);

  const firstToggle=page.locator('.s4-detail-toggle').first();await firstToggle.focus();await page.keyboard.press('Tab');
  const focusOrder=await page.evaluate(()=>({index:document.activeElement?.getAttribute('data-result-index'),tag:document.activeElement?.tagName}));
  check(focusOrder.tag==='BUTTON'&&focusOrder.index==='1','S4-B07','Tab postupuje mezi ovladači detailu v pořadí výsledků');
  const stressIndex=await page.evaluate(()=>[...document.querySelectorAll('.s4-result-main')].find(x=>/STRESS-302/.test(x.textContent))?.dataset.resultIndex);
  const toggle=page.locator(`.s4-detail-toggle[data-result-index="${stressIndex}"]`);await toggle.focus();await page.keyboard.press('Enter');
  const detail=await page.evaluate(index=>{const row=document.querySelector(`#s4-result-detail-${index}`),viewport=row.querySelector('.s4-timeline-viewport');row.querySelector('.s4-timeline summary').click();return {hidden:row.hidden,expanded:document.querySelector(`.s4-detail-toggle[data-result-index="${index}"]`).getAttribute('aria-expanded'),events:row.querySelectorAll('[data-s4-event]').length,scrollable:viewport.scrollHeight>viewport.clientHeight,xss:window.__s4Xss,images:row.querySelectorAll('img').length};},stressIndex);
  check(!detail.hidden&&detail.expanded==='true','S4-B08','detail lze otevřít klávesou Enter a aria-expanded odpovídá stavu');
  check(detail.events===302&&detail.scrollable,'S4-B09',`v detailu je úplná scrollovatelná osa ${detail.events} událostí`);
  check(detail.xss===0&&detail.images===0,'S4-B10','nebezpečný obsah události zůstal textem');

  const remediationDetails=await page.evaluate(()=>{
    const inspect=id=>{const main=[...document.querySelectorAll('.s4-result-main')].find(x=>x.textContent.includes(id)),index=main?.dataset.resultIndex,toggle=document.querySelector(`.s4-detail-toggle[data-result-index="${index}"]`);if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();const detail=document.querySelector(`#s4-result-detail-${index}`),eventTexts=[...(detail?.querySelectorAll('[data-s4-event]')||[])].map(x=>x.textContent);return {main:main?.textContent||'',detail:detail?.textContent||'',events:eventTexts.length,eventTexts};};
    return {unknown:inspect('UNKNOWN-PCT'),critical:inspect('CRITICAL-ONLY'),merged:inspect('MERGED-EVENTS')};
  });
  check(remediationDetails.unknown.events===3&&(remediationDetails.unknown.detail.match(/Nezjištěno/g)||[]).length>=3&&!/podíl:\s*0\s*%/i.test(remediationDetails.unknown.detail),'S41-B17','detailní osa zobrazuje tři chybějící hodnoty jako Nezjištěno');
  check(remediationDetails.critical.events===2&&/Běžná telemetrie není k dispozici/i.test(remediationDetails.critical.detail)&&/critical-only lock/.test(remediationDetails.critical.detail),'S41-B18','criticalEvents-only zůstávají viditelné při explicitně nedostupné běžné telemetrii');
  check(remediationDetails.merged.events===2&&remediationDetails.merged.eventTexts.filter(x=>/shared duplicate/.test(x)).length===1&&remediationDetails.merged.eventTexts.some(x=>/unique routine lock/.test(x)),'S41-B19','společná událost je jednou a unikátní událost stejného typu se neztratí');
  const csv=await page.evaluate(()=>{window.__s41Csv='';downloadText=function(txt){window.__s41Csv=txt;};downloadResultsCsv();return window.__s41Csv;});
  const csvUnknown=csv.split('\n').find(line=>line.includes('UNKNOWN-PCT'))||'',csvZero=csv.split('\n').find(line=>line.includes('VALID-SPLIT-ZERO'))||'',csvCritical=csv.split('\n').find(line=>line.includes('CRITICAL-ONLY'))||'';
  check(/split pct: Nezjištěno/.test(csvUnknown)&&!/split pct: 0 %/.test(csvUnknown)&&/split pct: 0 %/.test(csvZero),'S41-B20','CSV rozlišuje Nezjištěno od skutečných 0 %');
  check(/critical-only lock/.test(csvCritical)&&/critical-only recovery/.test(csvCritical),'S41-B21','CSV chronologie obsahuje samostatné criticalEvents');

  await page.evaluate(()=>showVerifierPanel('security'));
  await page.selectOption('#v2SecurityKind','recovery');
  const filtered=await page.evaluate(()=>({value:document.querySelector('#v2SecurityKind').value,rows:document.querySelectorAll('.s4-security-table tr').length-1,text:document.querySelector('#securitySignals').textContent}));
  check(filtered.value==='recovery'&&filtered.rows===7,'S4-B11',`filtr Recovery oddělil 7 relevantních pokusů včetně criticalEvents-only`);
  check(/legitimní servisní operace/i.test(filtered.text)&&/nikoli automatický důkaz podvodu/i.test(filtered.text),'S4-B12','Recovery a heuristika mají neobviňující interpretaci');

  const viewports=[{name:'desktop',width:1440,height:900},{name:'tablet-landscape',width:1024,height:768},{name:'tablet-portrait',width:768,height:1024},{name:'mobile',width:390,height:844}];
  const responsive=[];
  for(const theme of ['dark','light']){
    await page.evaluate(t=>setVerifierTheme(t,false),theme);
    for(const vp of viewports){await page.setViewportSize({width:vp.width,height:vp.height});await page.evaluate(()=>showVerifierPanel('results'));const metrics=await page.evaluate(()=>{const rgb=s=>{const m=String(s).match(/[\d.]+/g)?.map(Number)||[];return m.slice(0,3).map(x=>x/255);},lum=c=>c.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};const card=document.querySelector('.s4-detail-card'),style=getComputedStyle(card);return {bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,buttonVisible:(()=>{const b=document.querySelector('.s4-detail-toggle'),r=b.getBoundingClientRect();return r.width>0&&r.height>0;})(),theme:document.body.dataset.verifierTheme,contrast:ratio(style.color,style.backgroundColor)};});await page.screenshot({path:path.join(outDir,`${theme}-${vp.name}.png`),fullPage:true});responsive.push({theme,...vp,...metrics});check(metrics.bodyOverflow<=1&&metrics.buttonVisible&&metrics.theme===theme&&metrics.contrast>=4.5,`S4-B13-${theme}-${vp.name}`,`${vp.width}x${vp.height}, bez body overflow, ovladač viditelný, kontrast ${metrics.contrast.toFixed(2)}:1`);}
  }
  check(pageErrors.length===0,'S4-B14','bez pageerror/console error v Chromium');
  const evidence={schema:'git-s4-teacher-verifier-browser-v1',status:'PASS',gitHead,fixture:path.relative(process.cwd(),fixture).replaceAll('\\','/'),fixtureSha256,chromium:executablePath,checks,responsive,pageErrors};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  console.log(`PASS Sprint 04 Teacher Verifier Chromium gate (${checks.length} checks)`);
}catch(error){const evidence={schema:'git-s4-teacher-verifier-browser-v1',status:'FAIL',gitHead,fixtureSha256,chromium:executablePath,checks,pageErrors,error:String(error?.stack||error)};await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');throw error;}finally{await page.close().catch(()=>{});await browser.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}
