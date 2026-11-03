import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const executablePath=process.env.CHROMIUM_PATH||chromium.executablePath();
const outDir=path.resolve('qa-results/r1b2-c30-browser');fs.mkdirSync(outDir,{recursive:true});
const dist=path.resolve('dist');
const built=await fsp.readFile(path.join(dist,'index.html'),'utf8');
const fixture=built
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'')
  .replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"R1B2-C30",displayName:"Synthetic",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"r1b2-c30"}};document.documentElement.dataset.ghrabAccess="granted";<\/script>');
const server=http.createServer(async(request,response)=>{
  try{
    const base='http://'+(request.headers.host||'127.0.0.1');
    const pathname=decodeURIComponent(new URL(request.url||'/',base).pathname);
    if(pathname==='/'||pathname==='/index.html'){
      response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(fixture);return;
    }
    const relative=pathname.replace(/^\/+/,''),resolved=path.resolve(dist,relative);
    if(resolved!==dist&&!resolved.startsWith(dist+path.sep)){response.writeHead(403);response.end('forbidden');return}
    const data=await fsp.readFile(resolved);
    const ext=path.extname(resolved);const mime=ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.json'?'application/json':'application/octet-stream';
    response.writeHead(200,{'content-type':mime});response.end(data);
  }catch{response.writeHead(404);response.end('not found')}
});
await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',error=>error?reject(error):resolve()));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath});
const checks=[],failures=[],pageErrors=[];
const check=async(id,title,fn)=>{try{await fn();checks.push({id,title,status:'PASS'});console.log(`PASS ${id} - ${title}`)}catch(error){checks.push({id,title,status:'FAIL',error:error.message});failures.push(`${id}: ${error.message}`);console.error(`FAIL ${id} - ${error.message}`)}};
try{
  const page=await browser.newPage({viewport:{width:1024,height:900}});page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.addInitScript(()=>{window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'r1b2-c30-browser',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})})});
  await page.goto(origin+'/index.html');await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(()=>typeof window.GHRAB_GENERATION_PROGRESS_CORE?.reduce==='function');
  await page.evaluate(()=>{const p=document.querySelector('#genProgress');p.classList.remove('hidden');document.querySelector('#btnCancelGen').classList.remove('hidden');document.body.replaceChildren(p);document.body.style.cssText='margin:0;padding:14px;max-width:none'});
  await check('C30-31','mobile widths, wrapping, themes and visible Cancel',async()=>{for(const width of [360,390]){await page.setViewportSize({width,height:900});for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);const x=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cancel:!!document.querySelector('#btnCancelGen')?.getClientRects().length,bar:document.querySelector('#genProgressBar')?.tagName}));assert.deepEqual(x,{overflow:false,cancel:true,bar:'PROGRESS'})}}});
  await check('C30-32','desktop widths, zoom reflow and keyboard focus',async()=>{for(const width of [768,1024,1440]){await page.setViewportSize({width,height:900});await page.evaluate(w=>document.body.style.zoom=w===768?'4':'2',width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false)}await page.evaluate(()=>{document.body.style.zoom='1';document.querySelector('#btnCancelGen').focus()});assert.equal(await page.evaluate(()=>document.activeElement?.id),'btnCancelGen')});
  await check('C30-33','native progress and comprehensible accessible text',async()=>{const a=await page.evaluate(()=>{const p=document.querySelector('#genProgressBar'),s=document.querySelector('#genProgressSummary'),m=document.querySelector('#genProgressMsg');return{max:p.max,value:p.value,described:p.getAttribute('aria-describedby'),summary:s.textContent,msgRole:m.getAttribute('role'),live:m.getAttribute('aria-live')}});assert.equal(a.max,100);assert.match(a.described,/genProgressSummary/);assert.match(a.summary,/Dokončeno/);assert.equal(a.msgRole,'status');assert.equal(a.live,'polite')});
  await check('C30-34','standalone and Studio iframe share the same controller',async()=>{assert.equal(await page.evaluate(()=>typeof window.GHRAB_GENERATION_PROGRESS_CORE?.reduce),'function');const frame=await page.locator('body').evaluate(async()=>{const f=document.createElement('iframe');f.src=location.href;document.body.append(f);await new Promise((r,j)=>{f.onload=r;f.onerror=j});const ok=typeof f.contentWindow.GHRAB_GENERATION_PROGRESS_CORE?.reduce==='function';f.remove();return ok});assert.equal(frame,true)});
  await check('C30-RUNTIME','live controller updates native UI only for confirmed units',async()=>{const x=await page.evaluate(()=>{window.__GHRAB_GENERATOR_WORKFLOW_ID__='browser-run';const id=window.GHRAB_GENERATION_PROGRESS.begin({resultMode:'instant'},{sourceAnalysisCalls:0,config:[{}]});window.GHRAB_GENERATION_PROGRESS.done(['prep'],id);window.GHRAB_GENERATION_PROGRESS.exercises([0],id);window.GHRAB_GENERATION_PROGRESS.stop('fail',id);window.GHRAB_GENERATION_PROGRESS.done(['acceptance'],id);return{value:document.querySelector('#genProgressBar').value,summary:document.querySelector('#genProgressSummary').textContent}});assert.equal(x.value,40);assert.match(x.summary,/2\/5/)});
  await check('C30-BEHAVIOR','real UI ignores stale workflow events and duplicate credit',async()=>{const x=await page.evaluate(()=>{const c=window.GHRAB_GENERATION_PROGRESS_CORE;let s=c.reduce(null,{type:'begin',workflowId:'new',planKey:'a|b',units:['a','b']});s=c.reduce(s,{type:'complete',workflowId:'old',unitIds:['a','b']});s=c.reduce(s,{type:'complete',workflowId:'new',unitIds:['a','a']});return c.snapshot(s)});assert.equal(x.completed,1);assert.equal(x.percent,50)});
  await check('C30-NO-ERROR','browser scenario has no page errors',async()=>assert.deepEqual(pageErrors,[]));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(outDir,'progress-390.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(outDir,'progress-1440.png'),fullPage:true});
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
const evidence={schema:'git-r1b2-c30-browser-v1',status:failures.length?'FAIL':'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gitTree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),node:process.version,chromium:executablePath,checks,pageErrors,failures};
fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
if(failures.length)process.exitCode=1;else console.log(`PASS R1-B2 C30 browser gate (${checks.length}/${checks.length})`);
