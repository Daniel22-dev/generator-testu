#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve('.'),dist=path.join(root,'dist'),outDir=path.join(root,'qa-results','s83-quality-browser'),evidencePath=path.join(outDir,'evidence.json');
const candidates=[process.env.CHROMIUM_PATH,'C:/Users/42073/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe','/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean),executablePath=candidates.find(file=>fs.existsSync(file));
if(!executablePath)throw new Error('Chromium není dostupné; nastav CHROMIUM_PATH.');
const featurePath='/features/generator-assistant.js',checks=[],pageErrors=[],featureRequests=[];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function check(condition,id,detail){if(!condition)throw new Error(`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}
function browserFixture(html){
  const withoutBootstrap=html.replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'');
  const active=withoutBootstrap.replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'');
  return active.replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"S83",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"s83"}};document.documentElement.dataset.ghrabAccess="granted";<\/script>');
}
const mime=new Map([['.html','text/html; charset=utf-8'],['.js','application/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.webmanifest','application/manifest+json'],['.png','image/png'],['.svg','image/svg+xml'],['.ico','image/x-icon']]);
const builtHtml=fs.readFileSync(path.join(dist,'index.html'),'utf8'),fixture=browserFixture(builtHtml);
const server=http.createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url||'/',`http://${request.headers.host||'127.0.0.1'}`).pathname),relative=pathname==='/'?'index.html':pathname.slice(1),file=path.resolve(dist,relative);
    if(file!==dist&&!file.startsWith(dist+path.sep)){response.writeHead(403).end();return;}
    if(relative==='index.html'){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end(fixture);return;}
    const body=await fsp.readFile(file);response.writeHead(200,{'content-type':mime.get(path.extname(file).toLowerCase())||'application/octet-stream','cache-control':'no-store'});response.end(body);
  }catch(error){response.writeHead(error?.code==='ENOENT'?404:500,{'content-type':'text/plain; charset=utf-8'});response.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const address=server.address(),origin=`http://127.0.0.1:${address.port}`;
fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run']});
const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();
await page.addInitScript(()=>{window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'s83-browser',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});});
page.on('pageerror',error=>pageErrors.push(String(error?.stack||error)));
page.on('console',message=>{if(message.type()==='error')pageErrors.push(`console: ${message.text()}`);});
page.on('request',request=>{if(new URL(request.url()).pathname===featurePath)featureRequests.push({phase:'request',url:request.url()});});
page.on('response',response=>{if(new URL(response.url()).pathname===featurePath)featureRequests.push({phase:'response',status:response.status(),contentType:response.headers()['content-type']||''});});

try{
  await page.goto(origin+'/index.html',{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.openGeneratorAssistant==='function'&&typeof window.ghrabGeneratorFeatureLoader==='function',null,{timeout:20000});
  check(featureRequests.length===0,'S83-B01','optional assistant is not requested during initial generator load');
  const before=await page.evaluate(()=>({registered:Boolean(window.GHRABGeneratorFeatures?.generatorAssistant),scriptTags:[...document.scripts].filter(node=>/generator-assistant\.js/.test(node.src)).length,button:Boolean(document.getElementById('btnAssistant'))}));
  check(before.button&&!before.registered&&before.scriptTags===0,'S83-B02','initial DOM contains the launcher but no eager assistant registration or script tag');

  await page.locator('#btnAssistant').click();
  await page.waitForSelector('#gaBackdrop',{state:'attached',timeout:15000});
  const first=await page.evaluate(()=>({registered:Boolean(window.GHRABGeneratorFeatures?.generatorAssistant),dialog:document.getElementById('gaBackdrop')?.getAttribute('role')||'',closeLabel:document.getElementById('gaClose')?.getAttribute('aria-label')||'',scriptTags:[...document.scripts].filter(node=>/generator-assistant\.js/.test(node.src)).length}));
  check(first.registered&&first.dialog==='dialog'&&first.closeLabel==='Zavřít','S83-B03','teacher action loads and opens the accessible Generator Assistant dialog');
  check(featureRequests.filter(item=>item.phase==='request').length===1&&featureRequests.some(item=>item.phase==='response'&&item.status===200&&/javascript/.test(item.contentType)),'S83-B04','lazy feature is fetched exactly once as JavaScript with HTTP 200');
  await page.screenshot({path:path.join(outDir,'generator-assistant-lazy-loaded.png'),fullPage:true});

  await page.locator('#gaClose').click();
  await page.waitForSelector('#gaBackdrop',{state:'detached'});
  await page.locator('#btnAssistant').click();
  await page.waitForSelector('#gaBackdrop',{state:'attached'});
  await page.waitForTimeout(100);
  check(featureRequests.filter(item=>item.phase==='request').length===1,'S83-B05','cached feature reopens without duplicate network load');
  check(pageErrors.length===0,'S83-B06','lazy-load journey completes without pageerror or console error');

  const evidence={schema:'git-s83-quality-browser-v1',status:'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chromium:executablePath,fixture:{source:'dist/index.html',accessBootstrap:'removed only in browser harness',protectedScripts:'activated only in browser harness',sha256:sha(fixture)},featureRequests,checks,pageErrors};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  console.log(`PASS Sprint 08.3 Chromium lazy-feature gate (${checks.length} checks)`);
}catch(error){
  const evidence={schema:'git-s83-quality-browser-v1',status:'FAIL',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),chromium:executablePath,featureRequests,checks,pageErrors,error:String(error?.stack||error)};
  await fsp.writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  throw error;
}finally{
  await context.close().catch(()=>{});await browser.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));
}
