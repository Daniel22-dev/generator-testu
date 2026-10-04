import asyncio,json,re,traceback,os,shutil
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
HERE=Path(__file__).resolve().parent
R=HERE.parents[1]
OUT=Path(os.environ.get('GIT_QA_OUTPUT',str(R/'qa-results/workflow-7.1.89')))
OUT.mkdir(parents=True,exist_ok=True)
ACORN=Path(os.environ.get('ACORN_DIAGNOSTIC_PATH',str(R/'node_modules/acorn/dist/acorn.js')))
BROWSER=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
if not BROWSER: raise RuntimeError('Set CHROMIUM_PATH to an installed Chromium binary.')
async def main():
 soup=BeautifulSoup((R/'src/shell.html').read_text(),'html.parser')
 for x in soup.find_all(['script','noscript']):x.decompose()
 for x in soup.find_all('meta',attrs={'http-equiv':True}):x.decompose()
 for x in soup.find_all('link'):x.decompose()
 soup.html['data-ghrab-access']='granted'
 html=str(soup).replace('{{STYLES}}',(R/'src/styles.css').read_text())
 code='\n'.join(p.read_text() for p in sorted((R/'src/js').glob('*.js')) if p.name not in ['13-secure-export.js','14-test-html-builders.js'])
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path=BROWSER,headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1000})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m: errors.append('CONSOLE '+m.text) if m.type=='error' else None)
  await page.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html',body=html) if route.request.is_navigation_request() else route.abort())
  await page.set_content(html)
  await page.add_script_tag(content="""window.__GHRAB_STUDIO_ACCESS__={appId:'generator',permit:{sub:'TEST',displayName:'Synthetic Teacher',role:'admin',apps:['*'],iat:1,exp:4102444800,jti:'test'}};
window.__GHRAB_DEPLOYMENT_CONFIG__={appBaseUrl:'https://daniel22-dev.github.io/generator-testu/',studioBaseUrl:'https://daniel22-dev.github.io/AI-Studio-GHRAB/',schema:'ghrab-deployment-config-v1',version:1,environmentId:'test',profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',apiBaseUrl:'',features:{allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false}};
const memoryStorage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i],get length(){return m.size}}};Object.defineProperty(window,'localStorage',{value:memoryStorage()});Object.defineProperty(window,'sessionStorage',{value:memoryStorage()});
window.fetch=async()=>{throw new Error('Network intentionally blocked in diagnostic test')};
""")
  await page.add_script_tag(content=ACORN.read_text())
  await page.add_script_tag(content=code)
  await page.wait_for_timeout(300)
  print('ENV',await page.evaluate("({url:location.href,crypto:!!crypto.subtle,state:typeof state,types:typeof ALL_TYPES})"))
  print('INIT ERRORS',errors)
  await page.evaluate("""Object.assign(state,{appMode:'advanced',jazyk:'angli\u010dtina',instrJazyk:'cs',uroven:['C2'],pocet:1,typyCviceni:['reading comprehension'],body:8,exerciseDetail:false,exerciseConfigSaved:false,rcLength:'medium',readingQuestionCount:4,readingSourceScope:'shared',readingSourceAction:'generate',zadaniTab:'text'});setVal('nazev','Workflow test');setVal('proKoho','Synthetic group');setVal('latka','School vocabulary');setVal('zadaniText','The school library lends books and provides a quiet space for study.');applyVisualState();showOnlyStep(1);validate();""")
  await page.screenshot(path=str(OUT/'01-workflow.png'),full_page=True)
  await page.evaluate("openComprehensionDialog('reading comprehension')")
  await page.screenshot(path=str(OUT/'02-reading.png'),full_page=True)
  print('ReadingOpened',await page.evaluate("({dialog:$('readingSettingsDialog').open,context:$('readingSettingsDialog').querySelector('.comp-context').textContent,nextDisabled:$('next1').disabled})"))
  await page.evaluate("()=>{window.testConfirmation=uiConfirm('Synthetic data confirmation','Confirm',true)}")
  print('MODAL',await page.evaluate("({native:$('uiModal').tagName,modal:$('uiModal').matches(':modal'),focus:document.activeElement.outerHTML.slice(0,140)})"))
  await page.screenshot(path=str(OUT/'03-nested-confirmation.png'),full_page=True)
  await page.locator('#uiModal [data-ui-ok]').click()
  print('CONFIRMED',await page.evaluate('window.testConfirmation'))
  await page.evaluate("""()=>{geminiApiKey='synthetic-not-real';geminiDataNoticeAcceptedInMemory=false;sessionStorage.removeItem(GEMINI_DATA_NOTICE_SESSION_SK);state.readingSourceScope='own';setVal('readingSourceText','');window.mockAiCalls=0;callGeminiJSON=async()=>{mockAiCalls++;return {passage:'Synthetic passage',questions:[1,2,3,4].map(n=>({q:'Question '+n,a:'Answer '+n}))}};window.aiAction=aiSuggestReading();}""")
  await page.wait_for_selector('#uiModal')
  privacy=[]
  a=await page.evaluate("({native:$('uiModal').matches(':modal'),focusInside:$('uiModal').contains(document.activeElement),calls:mockAiCalls})")
  privacy.append({'name':'AI consent above Reading; keyboard focus inside; no request before consent','status':'PASS' if a['native'] and a['focusInside'] and a['calls']==0 else 'FAIL','observed':a})
  await page.screenshot(path=str(OUT/'03-nested-confirmation.png'),full_page=False)
  await page.keyboard.press('Escape')
  await page.evaluate('window.aiAction')
  b=await page.evaluate("({calls:mockAiCalls,readingStillOpen:$('readingSettingsDialog').open,buttonReady:!$('rcAiBtn').disabled})")
  privacy.append({'name':'Escape cancels consent only, sends no request and leaves Reading usable','status':'PASS' if b['calls']==0 and b['readingStillOpen'] and b['buttonReady'] else 'FAIL','observed':b})
  await page.evaluate('()=>{window.aiAction=aiSuggestReading()}')
  await page.wait_for_selector('#uiModal')
  await page.locator('#uiModal [data-ui-ok]').click()
  await page.evaluate('window.aiAction')
  c=await page.evaluate("({calls:mockAiCalls,hasPreview:!!_rcAiDraft,textUnchanged:trim('readingText')==='',buttonReady:!$('rcAiBtn').disabled})")
  privacy.append({'name':'Explicit consent allows one request and preview without silent adoption','status':'PASS' if c['calls']==1 and c['hasPreview'] and c['textUnchanged'] and c['buttonReady'] else 'FAIL','observed':c})
  (OUT/'privacy-dialog-tests.json').write_text(json.dumps({'scope':'Real native dialogs with mock provider; no network or production access tested','total':len(privacy),'passed':sum(x['status']=='PASS' for x in privacy),'results':privacy},ensure_ascii=False,indent=2))
  await page.evaluate("closeComprehensionDialog(false)")
  print('FINAL ERRORS',errors)
  (OUT/'init-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
  await browser.close()
asyncio.run(main())
