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
  await page.add_script_tag(content=(HERE/'workflow-tests.js').read_text())
  result=await page.evaluate('runWorkflowComponentTests()')
  result['browser_errors']=errors
  (OUT/'workflow-tests.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
  print(json.dumps(result,ensure_ascii=False,indent=2))
  await page.add_script_tag(content=(HERE/'shuffle-tests.js').read_text())
  shuffle=await page.evaluate('runShuffleRegression()')
  (OUT/'shuffle-tests.json').write_text(json.dumps(shuffle,ensure_ascii=False,indent=2))
  print(json.dumps(shuffle,ensure_ascii=False,indent=2))
  await browser.close()
asyncio.run(main())
