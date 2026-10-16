#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve('.');
const dist=path.join(root,'dist');
const outDir=path.join(root,'qa-results','s83a-assistant-remediation-browser');
const evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean);
const executablePath=candidates.find(file=>fs.existsSync(file));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');

const checks=[];
const failures=[];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function check(condition,id,detail){
  const status=condition?'PASS':'FAIL';
  checks.push({id,status,detail});
  console[condition?'log':'error'](`${status} ${id} - ${detail}`);
  if(!condition)failures.push(id);
}
function browserFixture(html){
  const withoutBootstrap=html.replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'');
  const active=withoutBootstrap.replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'');
  return active.replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S83A",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s83a"}};document.documentElement.dataset.ghrabAccess="granted";<\/script>');
}
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','application/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.webmanifest','application/manifest+json'],['.png','image/png'],['.svg','image/svg+xml'],['.ico','image/x-icon']]);
const builtHtml=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const fixture=browserFixture(builtHtml);
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url||'/',`http://${request.headers.host||'127.0.0.1'}`).pathname);
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    const file=path.resolve(dist,relative);
    if(file!==dist&&!file.startsWith(dist+path.sep)){response.writeHead(403).end();return;}
    if(relative==='index.html'){
      response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
      response.end(fixture);
      return;
    }
    const body=await fsp.readFile(file);
    response.writeHead(200,{'content-type':mime.get(path.extname(file).toLowerCase())||'application/octet-stream','cache-control':'no-store'});
    response.end(body);
  }catch(error){
    response.writeHead(error?.code==='ENOENT'?404:500,{'content-type':'text/plain; charset=utf-8'});
    response.end('Not found');
  }
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});

async function newPage(){
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  const page=await context.newPage();
  const errors=[];
  await page.addInitScript(()=>{
    window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'s83a-browser',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});
  });
  page.on('pageerror',error=>errors.push(String(error?.stack||error)));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
  await page.goto(origin+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.openGeneratorAssistant==='function'&&typeof window.ghrabGeneratorFeatureLoader==='function',null,{timeout:20000});
  return {context,page,errors};
}

try{
  const online=await newPage();
  await online.page.locator('#btnAssistant').click();
  await online.page.waitForSelector('#gaBackdrop',{state:'attached',timeout:15000});
  const diagnostics=await online.page.evaluate(()=>{
    const api=window.GHRABGeneratorFeatures?.generatorAssistant;
    return {positive:api.verify(),negative:api.verify(''),registered:Boolean(api)};
  });
  check(diagnostics.registered,'S83A-ASST-01','assistant lazy feature registers its public API');
  check(Array.isArray(diagnostics.positive)&&diagnostics.positive.length===0,'S83A-ASST-02',`runtime KB diagnostics have no false missing evidence (${diagnostics.positive.length}${diagnostics.positive.length?`: ${diagnostics.positive.slice(0,8).join(' | ')}`:''})`);
  check(Array.isArray(diagnostics.negative)&&diagnostics.negative.length>0,'S83A-ASST-03','empty evidence corpus is rejected by the same runtime diagnostic');
  await online.page.evaluate(()=>{
    window.__S83B_CACHED_API=window.GHRABGeneratorFeatures.generatorAssistant;
    window.__S83B_CACHED_STATE=JSON.stringify(window.state||{});
    window.__S83B_ALERTS=[];
    window.uiAlert=(message,title)=>{window.__S83B_ALERTS.push({message:String(message||''),title:String(title||'')});return Promise.resolve();};
  });
  await online.page.locator('#gaClose').click();
  await online.page.waitForSelector('#gaBackdrop',{state:'detached',timeout:5000});
  await online.context.setOffline(true);
  for(let cycle=0;cycle<3;cycle+=1){
    await online.page.locator('#btnAssistant').click();
    await online.page.waitForSelector('#gaBackdrop',{state:'attached',timeout:5000});
    const cached=await online.page.evaluate(()=>({
      sameApi:window.__S83B_CACHED_API===window.GHRABGeneratorFeatures.generatorAssistant,
      stateUnchanged:window.__S83B_CACHED_STATE===JSON.stringify(window.state||{}),
      dialogs:document.querySelectorAll('#gaBackdrop').length,
      alerts:window.__S83B_ALERTS.length
    }));
    check(cached.sameApi,`S83B-CACHE-${cycle+1}A`,'offline reopen reuses the already validated assistant API');
    check(cached.stateUnchanged&&cached.dialogs===1&&cached.alerts===0,`S83B-CACHE-${cycle+1}B`,'offline cached reopen preserves generator state and creates one dialog without a false alert');
    await online.page.locator('#gaClose').click();
    await online.page.waitForSelector('#gaBackdrop',{state:'detached',timeout:5000});
  }
  check(online.errors.length===0,'S83A-ASST-04','online load and repeated cached offline reopens produce no page or console errors');
  await online.context.close();

  const offline=await newPage();
  await offline.page.evaluate(()=>{
    window.__S83A_ALERTS=[];
    window.uiAlert=(message,title)=>{window.__S83A_ALERTS.push({message:String(message||''),title:String(title||'')});return Promise.resolve();};
    window.__S83A_STATE_BEFORE=JSON.stringify(window.state||{});
  });
  await offline.context.setOffline(true);
  check(await offline.page.evaluate(()=>navigator.onLine===false),'S83A-OFF-01','browser reports offline before the first assistant open');
  await offline.page.locator('#btnAssistant').click();
  await offline.page.waitForFunction(()=>window.__S83A_ALERTS.length>0,null,{timeout:15000});
  await offline.page.waitForTimeout(200);
  const denied=await offline.page.evaluate(()=>({
    alert:window.__S83A_ALERTS.at(-1)||null,
    dialog:Boolean(document.getElementById('gaBackdrop')),
    registered:Boolean(window.GHRABGeneratorFeatures?.generatorAssistant),
    stateUnchanged:window.__S83A_STATE_BEFORE===JSON.stringify(window.state||{}),
    loaderPromise:Boolean(window.__GHRAB_GENERATOR_FEATURE_PROMISES?.generatorAssistant)
  }));
  check(/offline|bez připojení|připojení k internetu/i.test(denied.alert?.message||''),'S83A-OFF-02','first offline open explains the offline limitation explicitly');
  check(!denied.dialog&&!denied.registered,'S83A-OFF-03','failed first offline open does not create a partial assistant UI');
  check(denied.stateUnchanged,'S83A-OFF-04','failed first offline open preserves the complete generator state');
  check(!denied.loaderPromise,'S83A-OFF-05','failed lazy-load promise is cleared so a safe retry is possible');

  await offline.context.setOffline(false);
  await offline.page.locator('#btnAssistant').click();
  await offline.page.waitForSelector('#gaBackdrop',{state:'attached',timeout:15000});
  const recovered=await offline.page.evaluate(()=>({
    registered:Boolean(window.GHRABGeneratorFeatures?.generatorAssistant),
    stateUnchanged:window.__S83A_STATE_BEFORE===JSON.stringify(window.state||{}),
    diagnostics:window.GHRABGeneratorFeatures.generatorAssistant.verify()
  }));
  check(recovered.registered&&recovered.diagnostics.length===0,'S83A-OFF-06','assistant loads successfully after connectivity returns');
  check(recovered.stateUnchanged,'S83A-OFF-07','offline failure and online retry preserve generator state');
  check(offline.errors.length===0,'S83A-OFF-08','offline denial and retry create no unhandled page or console error');
  await offline.page.screenshot({path:path.join(outDir,'assistant-offline-retry.png'),fullPage:true});
  await offline.context.close();

  const studentSources=['src/js/13d-secure-student-shell.js','src/js/13e-secure-student-runtime.js','src/js/14b-instant-test-runtime.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
  check(!/generator-assistant\.js|openGeneratorAssistant|GENERATOR_ASSISTANT_KB/.test(studentSources),'S83A-OFF-09','student runtimes remain independent of the optional teacher assistant');

  const evidence={schema:'git-s83a-assistant-remediation-browser-v1',status:failures.length?'FAIL':'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chromium:executablePath,fixture:{source:'dist/index.html',sha256:sha(fixture)},diagnostics,checks,failures};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  if(failures.length)throw new Error(`Sprint 08.3a assistant remediation failed: ${failures.join(', ')}`);
  console.log(`PASS Sprint 08.3a assistant remediation browser gate (${checks.length} checks)`);
}catch(error){
  if(!fs.existsSync(evidencePath))await fsp.writeFile(evidencePath,JSON.stringify({schema:'git-s83a-assistant-remediation-browser-v1',status:'FAIL',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chromium:executablePath,checks,failures,error:String(error?.stack||error)},null,2)+'\n');
  throw error;
}finally{
  await browser.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
