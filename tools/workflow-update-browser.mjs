import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve('dist');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8')
  .replace('data-ghrab-access="checking"','data-ghrab-access="ready"')
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi,'')
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(source);return;}
  const full=path.resolve(root,'.'+url.pathname);
  if(!full.startsWith(root+path.sep)||(!fs.existsSync(full)||!fs.statSync(full).isFile())){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',full.endsWith('.js')?'application/javascript':full.endsWith('.css')?'text/css':full.endsWith('.json')?'application/json':'application/octet-stream');res.end(fs.readFileSync(full));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const failures=[];let passes=0;
function pass(label){passes++;console.log('PASS '+label);}
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',error=>{failures.push(error.message);console.error(error.stack);});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.addInitScript(()=>{
    window.__GHRAB_STUDIO_ACCESS__={appId:'generator',permit:{sub:'QA',displayName:'QA',role:'admin',apps:['*'],iat:1,exp:4102444800,jti:'qa-browser'}};
    window.__GHRAB_DEPLOYMENT_CONFIG__={profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',features:{allowLocalProviderKeys:true}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.waitForFunction(()=>typeof openComprehensionDialog==='function'&&!!document.getElementById('readingSettingsDialog'));
  await page.evaluate(()=>{
    state=JSON.parse(JSON.stringify(DEFAULT));Object.assign(state,{appMode:'advanced',workPreset:'advanced',jazyk:'angličtina',uroven:['B1'],body:30});
    setVal('nazev','Workflow QA');setVal('proKoho','QA');setVal('latka','Grammar');applyVisualState();maxStep=4;goTo(1);
  });
  await page.locator('#typyBtns [data-val="reading comprehension"]').click();
  await page.waitForFunction(()=>document.getElementById('readingSettingsDialog').open);
  assert(await page.locator('#readingSettingsDialog').isVisible());
  assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')?.id),'readingSettingsDialog');
  assert.equal(await page.evaluate(()=>document.querySelectorAll('dialog:modal').length),1);
  pass('Reading se otevře jako nativní modal s fokusem uvnitř');
  await page.locator('#readingSettingsDialog #rcLenBtns [data-val="long"]').click();
  await page.locator('#readingQuestionCount').selectOption('5');
  await page.locator('#readingTopicCustom').fill('Travel');
  const scrollBefore=await page.evaluate(()=>window.scrollY);
  await page.getByRole('button',{name:'Uložit nastavení',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.readingQuestionCount),5);
  assert.equal(await page.evaluate(()=>window.scrollY),scrollBefore);
  assert(await page.locator('#comprehensionSummary').innerText().then(s=>s.includes('Nastaveno')));
  pass('Uložení zachová nastavení i pozici hlavní stránky');
  await page.locator('#comprehensionSummary button').click();
  await page.locator('#readingTopicCustom').fill('Discard draft');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#readingTopicCustom').inputValue(),'Travel');
  assert.equal(await page.evaluate(()=>document.querySelectorAll('dialog:modal').length),0);
  pass('Upravit a Escape zruší pouze rozepsané změny');
  await page.locator('#typyBtns [data-val="listening comprehension"]').click();
  await page.getByRole('button',{name:'Uložit nastavení',exact:true}).click();
  assert(await page.locator('#listeningSettingsDialog').isVisible());assert.match(await page.locator('#listeningSettingsDialog [role=alert]').innerText(),/Doplň/);
  await page.locator('#listeningTranscript').fill('A listening transcript for the teacher.');
  await page.locator('#listeningQuestionCount').selectOption('6');await page.getByRole('button',{name:'Uložit nastavení',exact:true}).click();
  pass('Listening vyžaduje zdroj a uloží počet otázek');
  await page.evaluate(()=>{setVal('rosterEmails','a@example.invalid\nb@example.invalid');rosterRefreshParticipants();state.identityMode='oneTimeCode';applyVisualState();goTo(2);});
  assert.equal(await page.locator('#participantMode').count(),0);assert.equal(await page.locator('#participantList').count(),0);
  await page.getByRole('button',{name:'Připravit / doplnit kódy',exact:true}).click();
  assert.equal(await page.evaluate(()=>rosterEntries.length),2);
  assert.deepEqual(await page.evaluate(()=>rosterEntries.map(x=>x.email)),['a@example.invalid','b@example.invalid']);
  pass('GIT připraví kódy celé skupině bez operativního výběru účastníků');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>goTo(1));await page.locator('#comprehensionSummary button').first().click();
  const box=await page.locator('#readingSettingsDialog').boundingBox();assert(box.width<=390);assert(box.x>=0);
  await page.locator('#readingText').fill('Mobile layout sample passage.');
  fs.mkdirSync('qa-results',{recursive:true});await page.screenshot({path:'qa-results/workflow-dialog-mobile.png'});
  await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:900});
  await page.locator('#comprehensionSummary button').first().click();await page.screenshot({path:'qa-results/workflow-dialog-desktop.png'});
  pass('Dialog se vejde na desktop i viewport telefonu');
  assert.deepEqual(failures,[]);pass('Žádná neošetřená chyba v nativním Chromium');
  fs.writeFileSync('qa-results/workflow-update-browser.json',JSON.stringify({status:'passed',checks:passes,appVersion:JSON.parse(fs.readFileSync('package.json')).version,browser:await browser.version(),physicalMobile:false,liveAi:false},null,2)+'\n');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
