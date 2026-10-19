#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const outDir=path.resolve('qa-results/s7-teacher-workflow-browser'),evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean),executablePath=candidates.find(item=>fs.existsSync(item));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks=[],pageErrors=[];
function check(condition,id,detail){if(!condition)throw new Error(`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const watch=page=>{page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));page.on('console',message=>{if(message.type()==='error')pageErrors.push(`console: ${message.text()}`);});return page;};

// The release build is intentionally not bypassed when a prebuild trust gate
// fails. For browser testing only, overlay the reviewed Sprint 07 source files
// on the last built shell and point the existing generator harness at that
// explicit, non-release fixture.
let generatorSourceHtml=fs.readFileSync(path.resolve('dist/index.html'),'utf8');
for(const file of ['13ea-secure-verifier-forms.js','13ec-secure-verifier-trust.js','13f-secure-teacher-verifier.js']){
  const current=fs.readFileSync(path.resolve('src/js',file),'utf8'),pattern=new RegExp(`(<script[^>]+data-source="${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>)[\\s\\S]*?(</script>)`);
  if(!pattern.test(generatorSourceHtml))throw new Error(`Built shell does not contain ${file}`);
  generatorSourceHtml=generatorSourceHtml.replace(pattern,`$1\n${current}\n$2`);
}
const sourceFixture=path.join(outDir,'generator-current-source-fixture.html');fs.writeFileSync(sourceFixture,generatorSourceHtml);process.env.GIT_REDTEAM_GENERATOR_HTML=sourceFixture;
const {w,configure,build}=await import(`./redteam-harness-utils.mjs?s7=${Date.now()}`);

configure({identityMode:'oneTimeCode',resultMode:'secureOffline',testMode:'bezny',lockOnLeave:false});
w.eval(`rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}]`);
const pkg=await build(),browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('https://school.example/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:route.request().url().includes('verifier')?pkg.teacherHtml:pkg.studentHtml}));

try{
  const student=watch(await context.newPage());await student.goto('https://school.example/student.html');await student.locator('#startCode').fill(pkg.startCode);await student.locator('#studentName').fill('A7B9C2');await student.evaluate(()=>startTest());await student.waitForFunction(()=>isTestActive());
  const payloads=await student.evaluate(async()=>{
    const valid=await secureAnswers(),rejected=structuredClone(valid);rejected.attemptId='S07-REJECTED';rejected.resp='invalid';
    async function wrap(payload){return 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:payload.testId,manifestHash:payload.manifestHash,studentHtmlSha256:payload.studentHtmlSha256||'',payload:await encryptPayloadForTeacher(payload)});}
    return {valid:await wrap(valid),rejected:await wrap(rejected)};
  });
  await student.close();

  const verifier=watch(await context.newPage());await verifier.goto('https://school.example/verifier.html');
  await verifier.evaluate(async payloads=>{await verifyText('valid.txt',payloads.valid,{});await verifyText('rejected.txt',payloads.rejected,{});afterResultsChanged();},payloads);
  const state=await verifier.evaluate(()=>({
    rows:RESULTS.map(row=>({status:row.status,attemptId:row.attemptId,scoreKeys:['earned','total','pct','grade'].filter(key=>Object.hasOwn(row,key)),score:verifierScoreValues(row)})),
    table:[...$('resultTable').querySelectorAll('tr')].slice(1).map(row=>[...row.cells].map(cell=>cell.textContent.trim()))
  }));
  const rejected=state.rows.find(row=>row.attemptId==='S07-REJECTED'),valid=state.rows.find(row=>row.attemptId!=='S07-REJECTED'),rejectedTable=state.table.find(row=>row.length>3&&row.some(cell=>cell.includes('Nevyhodnotitelné')));
  check(rejected?.status==='CHYBA'&&rejected.scoreKeys.length===0&&!rejected.score.scored,'S07-B01','newly generated verifier keeps rejected non-identity payload unscored in memory');
  check(rejectedTable&&/Nevyhodnotitelné/.test(rejectedTable[1])&&/bez skóre/i.test(rejectedTable[1])&&/Bez známky/.test(rejectedTable[2])&&!/0\s*%|0\s*\/\s*0/.test(rejectedTable.slice(0,3).join(' ')),'S07-B02','teacher result table renders no points, percentage or grade for the rejected payload');
  check(valid?.score.scored&&valid.score.pointsText.includes('/')&&valid.score.percentText.endsWith(' %')&&valid.score.gradeText!=='—','S07-B03','valid result still renders its computed score and grade');

  const exports=await verifier.evaluate(()=>{
    window.__s7Downloads={};downloadText=(text,name)=>{window.__s7Downloads[name]=text;};
    downloadIndexCsv();downloadResultsCsv();downloadArchiveHtml();downloadArchiveJson();
    const byPrefix=prefix=>Object.entries(window.__s7Downloads).find(([name])=>name.startsWith(prefix))?.[1]||'';
    const index=byPrefix('archive_index_'),result=byPrefix('results_'),archive=byPrefix('archive_')&&Object.entries(window.__s7Downloads).find(([name])=>name.startsWith('archive_')&&name.endsWith('.html'))?.[1]||'',json=Object.entries(window.__s7Downloads).find(([name])=>name.startsWith('archive_')&&name.endsWith('.json'))?.[1]||'';
    const rows=csvParseDelimited(index,';'),head=rows[0],col=name=>head.indexOf(name),mapped=rows.slice(1).map(row=>({attempt:row[col('sourceFile')],status:row[col('status')],earned:row[col('earned')],total:row[col('total')],pct:row[col('pct')],grade:row[col('grade')]}));
    const doc=new DOMParser().parseFromString(archive,'text/html'),archiveRows=[...doc.querySelectorAll('table.tbl tr')].slice(1).map(row=>[...row.cells].map(cell=>cell.textContent.trim()));
    return {indexRows:mapped,results:result,archiveRows,json:JSON.parse(json)};
  });
  const rejectedCsv=exports.indexRows.find(row=>row.attempt==='rejected.txt'),validCsv=exports.indexRows.find(row=>row.attempt==='valid.txt'),rejectedArchive=exports.archiveRows.find(row=>row[0].includes('A7B9C2')&&row[1]==='—');
  check(rejectedCsv&&[rejectedCsv.earned,rejectedCsv.total,rejectedCsv.pct,rejectedCsv.grade].every(value=>value===''),'S07-B04','historical archive CSV columns stay present but blank for a rejected result');
  check(validCsv&&validCsv.earned!==''&&validCsv.total!==''&&validCsv.pct!==''&&validCsv.grade!=='','S07-B05','archive CSV preserves the score of a valid result');
  check(rejectedArchive&&rejectedArchive[1]==='—'&&rejectedArchive[2]==='—'&&rejectedArchive[3]==='—','S07-B06','archive HTML renders rejected score cells as unavailable');
  const rejectedJson=exports.json.results.find(row=>row.attemptId==='S07-REJECTED');
  check(rejectedJson&&['earned','total','pct','grade'].every(key=>!Object.hasOwn(rejectedJson,key))&&!exports.results.includes('rejected.txt'),'S07-B07','archive JSON has no synthetic score and grade CSV excludes the rejected result');
  await verifier.screenshot({path:path.join(outDir,'teacher-verifier-s07-af01.png'),fullPage:true});

  const dist=generatorSourceHtml,generator=watch(await context.newPage()),generatorUiHtml=dist.replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'').replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'').replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S7",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s7"}};<\/script>');
  await generator.addInitScript(()=>{window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'s7',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});});
  await context.route('https://generator.example/**',route=>{const pathname=new URL(route.request().url()).pathname;if(pathname==='/'||pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:generatorUiHtml});if(pathname.endsWith('.js'))return route.fulfill({status:200,contentType:'application/javascript',body:''});return route.fulfill({status:204,body:''});});
  await generator.goto('https://generator.example/index.html');await generator.waitForFunction(()=>typeof setGenUI==='function',null,{timeout:15000});await generator.evaluate(()=>document.documentElement.setAttribute('data-ghrab-access','granted'));
  const ai=await generator.evaluate(()=>{setGenUI('loading');setGenMsg('Čekám na odpověď AI — dokončený krok se zobrazí po skutečné odpovědi.');const box=$('genProgress'),msg=$('genProgressMsg');return {visible:!box.classList.contains('hidden'),text:msg.textContent,role:msg.getAttribute('role'),live:msg.getAttribute('aria-live'),valueNow:box.getAttribute('aria-valuenow'),progressBars:box.querySelectorAll('[role="progressbar"],progress').length};});
  check(ai.visible&&ai.role==='status'&&ai.live==='polite'&&ai.valueNow===null&&ai.progressBars===0&&!/%/.test(ai.text),'S07-B08','generator browser shows truthful indeterminate AI operation status without invented percentage');
  const ux=await generator.evaluate(()=>({hints:document.querySelectorAll('.field-hint').length,icons:document.querySelectorAll('.preset-card-emoji').length,resultSteps:document.querySelectorAll('[data-result-step]').length,preview:!!document.querySelector('#btnPreview'),manual:document.querySelector('a[href="./manual/rozesilani-kodu.html"]')?.getAttribute('rel')||''}));
  check(ux.hints>5&&ux.icons>=3&&ux.resultSteps===4&&ux.preview&&ux.manual.includes('noopener'),'S07-B09','settings, icons, accessible step workflow, preview and safe guide link are present in built generator');
  await generator.screenshot({path:path.join(outDir,'generator-s07-workflow.png'),fullPage:true});
  check(pageErrors.length===0,'S07-B10','Chromium run completed without pageerror or console error');

  const evidence={schema:'git-s7-teacher-workflow-browser-v1',status:'PASS',gitHead,chromium:executablePath,artifacts:{studentSha256:sha(pkg.studentHtml),teacherSha256:sha(pkg.teacherHtml),distSha256:sha(dist)},checks,pageErrors};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');console.log(`PASS Sprint 07 Chromium gate (${checks.length} checks)`);
}catch(error){const evidence={schema:'git-s7-teacher-workflow-browser-v1',status:'FAIL',gitHead,chromium:executablePath,checks,pageErrors,error:String(error?.stack||error)};await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');throw error;}finally{await context.close().catch(()=>{});await browser.close().catch(()=>{});}
