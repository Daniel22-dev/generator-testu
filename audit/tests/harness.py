from pathlib import Path
import subprocess, json, re, mimetypes, os, shutil
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
TESTS=Path(__file__).resolve().parent
_default_root=TESTS.parents[1] if (TESTS.parents[1]/'src/shell.html').is_file() else TESTS.parent/'generator-testu-main'
ROOT=Path(os.environ.get('GENERATOR_AUDIT_ROOT',str(_default_root))).resolve()
PRELUDE=r'''
(() => {
 const NativeURL=URL; window.URL=class extends NativeURL{constructor(url,base){super(url,base==='about:blank'?'https://audit.local/':base);}};
 function pack(v){if(v instanceof ArrayBuffer)return {$bytes:Array.from(new Uint8Array(v))};if(ArrayBuffer.isView(v))return {$bytes:Array.from(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};if(v&&v.$key)return {$key:v.$key};if(Array.isArray(v))return v.map(pack);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,pack(x)]));return v;}
 function unpack(v){if(v&&v.$bytes)return new Uint8Array(v.$bytes).buffer;if(v&&v.$key)return v;if(Array.isArray(v))return v.map(unpack);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,unpack(x)]));return v;}
 Object.defineProperty(crypto,'subtle',{configurable:true,value:new Proxy({}, {get:(_,method)=>(...args)=>__auditCrypto({method,args:pack(args)}).then(r=>{if(!r.ok)throw new Error(r.error);return unpack(r.value);})})});
 for(const key of ['localStorage','sessionStorage']){try{window[key].getItem('__probe__');}catch{let m=new Map();const storage={getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>Array.from(m.keys())[i]||null,get length(){return m.size;}};Object.defineProperty(window,key,{configurable:true,value:storage});}}
 window.__GHRAB_STUDIO_ACCESS__={appId:'generator',permit:{sub:'AUDIT',displayName:'Audit Teacher',role:'admin',apps:['*'],iat:1,exp:4102444800,jti:'offline-review'}};
 window.__GHRAB_DEPLOYMENT_CONFIG__={profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',telemetryMode:'local',apiBaseUrl:'',endpoints:{aiGenerate:'ai/generate',aiHealth:'ai/health'},features:{allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false}};
 window.__errors=[];addEventListener('error',e=>__errors.push(String(e.message||e.error)));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason?.stack||e.reason)));
 window.__downloads=[];
 HTMLAnchorElement.prototype.click=function(){if(this.download){__downloads.push({name:this.download,href:this.href});return;}return HTMLElement.prototype.click.call(this);};
})()
'''
class Harness:
 def __init__(self):
  self.crypto=subprocess.Popen(['node',str(TESTS/'crypto-rpc.mjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
  self.p=sync_playwright().start()
  self.browser=self.p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  self.context=self.browser.new_context(viewport={'width':1400,'height':1000},bypass_csp=True)
  self.context.expose_binding('__auditCrypto',lambda source,r:self.crypto_call(r))
  self.context.add_init_script(PRELUDE)
  self.context.route('**/*',self.route)
  self.console=[]
 def crypto_call(self,r):
  self.crypto.stdin.write(json.dumps(r)+'\n');self.crypto.stdin.flush();return json.loads(self.crypto.stdout.readline())
 def route(self,route):
  path=unquote(urlparse(route.request.url).path).lstrip('/')
  if path.startswith('generator-testu/'):path=path[len('generator-testu/'):]
  f=(ROOT/'dist'/path).resolve()
  if f.is_relative_to(ROOT/'dist') and f.is_file():
   route.fulfill(body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0]or'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
  else:route.abort()
 def new_page(self,html=None):
  page=self.context.new_page(); page.set_default_timeout(10000)
  page.on('console',lambda m:self.console.append(m.type+':'+m.text))
  page.on('pageerror',lambda e:self.console.append('PAGEERROR:'+str(e)))
  if html is not None:page.set_content(html,wait_until='load')
  return page
 def app(self):
  html=(ROOT/'dist/index.html').read_text()
  html=re.sub(r'<script type="module" data-ghrab-access-bootstrap>[\s\S]*?</script>','',html)
  html=re.sub(r'type="application/ghrab-protected"\s+data-ghrab-protected\s*','',html)
  html=html.replace('<head>','<head><base href="https://audit.local/">',1)
  page=self.new_page(html)
  page.wait_for_timeout(1200)
  # Load the bundled parser without a network or a dependency version substitution at runtime.
  page.add_script_tag(content=(ROOT/'dist/vendor/acorn.js').read_text())
  # Authentication/origin are fixture boundaries, not bypasses shipped in the app.
  page.evaluate("document.documentElement.dataset.ghrabAccess='granted';Access.envKind='official';Access.envOfficial=true;Access.blockAllGeneration=false")
  return page
 def close(self):
  self.context.close();self.browser.close();self.p.stop();self.crypto.terminate()
if __name__=='__main__':
 h=Harness()
 try:
  p=h.app()
  print(p.evaluate('({errors:__errors, init:window.__ACCESS_INIT_REACHED__,mode:state.appMode,version:RELEASE.version,cs:typeof csEnterCzechFromButton})'))
  print('console',h.console[-15:])
  p.screenshot(path=str(TESTS.parent/'evidence/initial-app.png'),full_page=True)
  print(p.evaluate("async()=>await sha256Text('probe')"))
 finally:h.close()
