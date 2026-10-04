// Desktop Chromium, real IndexedDB/WebCrypto. This is not an iOS/Android pilot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom,configure,GEN,TEACH,REC,generatorHarnessHtml} from './redteam-harness-utils.mjs';
configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode'});
w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];");
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const generator=await browser.newPage();generator.on('pageerror',e=>errors.push(e.message));
  let parserRequests=0;
  await generator.addInitScript(()=>{window.__GHRAB_DEPLOYMENT_CONFIG__=Object.freeze({schema:'ghrab-deployment-config-v1',version:1,environmentId:'adv',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:Object.freeze({allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false})});});
  await generator.route('http://127.0.0.1:18777/generator/**',route=>{
    const rel=new URL(route.request().url()).pathname.slice('/generator/'.length);
    if(rel==='index.html')return route.fulfill({status:200,contentType:'text/html',body:generatorHarnessHtml});
    if(rel==='vendor/acorn.js')parserRequests++;
    if(rel.includes('..')||!fs.existsSync('dist/'+rel)||!fs.statSync('dist/'+rel).isFile())return route.fulfill({status:404,body:''});
    return route.fulfill({status:200,contentType:rel.endsWith('.js')?'text/javascript':rel.endsWith('.json')?'application/json':'application/octet-stream',body:fs.readFileSync('dist/'+rel)});
  });
  await generator.goto('http://127.0.0.1:18777/generator/index.html');
  await generator.waitForFunction(()=>typeof window.assembleTestHtml==='function');
  assert.equal(await generator.evaluate(()=>typeof window.acorn),'undefined');
  const pkg=await generator.evaluate(async({settings,data,teacher,unlock})=>{
    Object.assign(state,settings);rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'}];
    for(const [id,value] of Object.entries({nazev:'ADV test',proKoho:'1.A',latka:'x',ucitelJmeno:'Daniel Teacher',ucitelPin:teacher,recoveryCode:unlock}))document.getElementById(id).value=value;
    return await assembleTestHtml(state,data);
  },{settings:JSON.parse(w.eval('JSON.stringify(state)')),data:GEN,teacher:TEACH,unlock:REC});
  await page.route('http://127.0.0.1:18777/student.html',route=>route.fulfill({status:200,contentType:'text/html',body:pkg.studentHtml}));
  await page.goto('http://127.0.0.1:18777/student.html');
  assert.equal(await page.evaluate(()=>window.isSecureContext&&!!crypto.subtle&&!!indexedDB),true);
  assert.equal(await page.evaluate(()=>typeof window.teacherLogin),'undefined');
  assert.equal(parserRequests,1);assert.equal(await generator.evaluate(()=>typeof window.acorn.parse),'function');
  await generator.close();
  await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);await page.evaluate(()=>startTest());
  await page.locator('#test').waitFor({state:'visible'});
  await page.evaluate(()=>setResp('0_0',1));await page.evaluate(()=>persistActiveAttemptSeal());await page.evaluate(()=>flushPendingAttemptWrites());
  const before=await page.evaluate(()=>({id:ATTEMPT_ID,deadline:TIMER_DEADLINE}));
  await page.evaluate(()=>lockTest('browser-negative-control'));
  await page.evaluate(()=>flushPendingAttemptWrites());
  await page.reload();await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);await page.evaluate(()=>startTest());
  assert.equal(await page.evaluate(()=>LOCKED),true);
  assert.deepEqual(await page.evaluate(()=>({id:ATTEMPT_ID,deadline:TIMER_DEADLINE})),before);
  assert.equal(await page.evaluate(()=>RESP['0_0']),1);
  await page.locator('#unlockInp').evaluate((el,value)=>{el.value=value;},REC);
  await page.evaluate(()=>tryUnlock());assert.equal(await page.evaluate(()=>LOCKED),false);
  await page.evaluate(()=>submitSecureTest());await page.locator('#done').waitFor({state:'visible'});
  assert.ok((await page.locator('#answerBackup').inputValue()).startsWith('SECURE-ANSWERS-V1'));
  await page.reload();await page.locator('#studentName').fill('A7B9C2');await enterStartCode(page,pkg);await page.evaluate(()=>startTest());
  assert.equal(await page.evaluate(()=>submittedLocked()),true);
  assert.equal(await page.locator('[data-retry-code]').count(),0);
  assert.equal(await page.locator('#test').isVisible(),false);
  assert.deepEqual(errors,[]);
  const report={status:'PASS',browser:await browser.version(),syntheticOnly:true,platformScope:'desktop Chromium; not real mobile',checks:['cold generator loads bundled parser before first export','teacher capability absent','real WebCrypto + IndexedDB','locked reload retains ID/deadline/answers','classroom unlock preserves attempt','encrypted submission','submitted reload cannot retry']};
  fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/redteam-e1-browser.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser?.close();gdom.window.close();}
