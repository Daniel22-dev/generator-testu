import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const target = path.resolve(process.argv[2] || path.join(root, 'dist/index.html'));
const sourceCheck = fs.readFileSync(path.join(here, 'workflow-matrix-check.mjs'), 'utf8');
const begin = sourceCheck.indexOf('// WORKFLOW-CHECKS-BEGIN');
const end = sourceCheck.indexOf('// WORKFLOW-CHECKS-END');
if (begin < 0 || end < 0 || end <= begin) throw new Error('Workflow test nemá značky WORKFLOW-CHECKS-BEGIN/END.');
const checks = sourceCheck.slice(sourceCheck.indexOf('\n', begin) + 1, end);

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0'
    ? process.env.PLAYWRIGHT_BROWSERS_PATH
    : path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    for (const name of fs.readdirSync(cache).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const candidate = path.join(cache, name, rel);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return '';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
};

function executableHtml() {
  let html = fs.readFileSync(target, 'utf8');
  html = html
    .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
    .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '');
  const prelude = `<script>
  window.__GHRAB_STUDIO_ACCESS__={appId:'generator',permit:{sub:'TEST',displayName:'Test',role:'admin',apps:['*'],iat:1,exp:4102444800,jti:'workflow-browser'}};
  window.__errors=[];
  addEventListener('error',event=>window.__errors.push(String(event.message||event.error||'error')));
  addEventListener('unhandledrejection',event=>window.__errors.push(String(event.reason?.message||event.reason||'promise')));
  window.matchMedia=window.matchMedia||((q)=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  window.scrollTo=()=>{};
  HTMLElement.prototype.scrollIntoView=()=>{};
  HTMLAnchorElement.prototype.click=()=>{};
  window.alert=()=>{}; window.confirm=()=>true; window.prompt=()=>'';
  const __nativeFetch=window.fetch.bind(window); window.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input.url,location.href);if(u.origin===location.origin)return __nativeFetch(input,init);return Promise.reject(new Error('external network disabled'));};
  if(navigator.serviceWorker){try{Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{register:async()=>({}),ready:Promise.resolve({})}});}catch{}}
  <\/script>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (match) => `${match}${prelude}`);
  else html = html.replace(/<body[^>]*>/i, (match) => `${match}${prelude}`);
  return html;
}

const generatedPages = new Map();
let generatedSequence = 0;

function startServer() {
  const base = path.dirname(target);
  const html = executableHtml();
  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    if (req.method === 'POST' && pathname === '__generated') {
      const chunks=[]; let size=0;
      req.on('data',chunk=>{size+=chunk.length;if(size<=8*1024*1024)chunks.push(chunk);});
      req.on('end',()=>{if(size>8*1024*1024){res.writeHead(413);res.end('too large');return;} const id=String(++generatedSequence);generatedPages.set(id,Buffer.concat(chunks).toString('utf8'));res.writeHead(201,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({id}));});
      return;
    }
    if (req.method === 'GET' && pathname.startsWith('__generated/')) {
      const id=pathname.slice('__generated/'.length); const page=generatedPages.get(id); if(page==null){res.writeHead(404);res.end('not found');return;} res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(page); return;
    }
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (!pathname || pathname === 'index.html' || pathname === 'generator-testu' || pathname === 'generator-testu/') {
      return send(200, html, 'text/html; charset=utf-8');
    }
    if (pathname.startsWith('generator-testu/')) pathname = pathname.slice('generator-testu/'.length);
    const absolute = path.normalize(path.join(base, pathname));
    if (absolute !== base && !absolute.startsWith(`${base}${path.sep}`)) return send(403, 'forbidden');
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return send(404, 'not found');
    res.writeHead(200, { 'content-type': MIME[path.extname(absolute).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(absolute));
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function freePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

class CdpClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      for (const callback of this.listeners.get(message.method) || []) callback(message.params || {});
    };
  }
  on(method, callback) {
    const list = this.listeners.get(method) || [];
    list.push(callback);
    this.listeners.set(method, list);
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed');
    return result.result.value;
  }
  close() { try { this.ws.close(); } catch {} }
}

async function waitJson(url, attempts = 300) {
  for (let i = 0; i < attempts; i++) {
    try { const response = await fetch(url); if (response.ok) return await response.json(); } catch {}
    await sleep(50);
  }
  throw new Error(`Timeout: ${url}`);
}

async function waitFor(client, expression, label, attempts = 400) {
  for (let i = 0; i < attempts; i++) {
    try { if (await client.evaluate(expression)) return; } catch {}
    await sleep(50);
  }
  const diag = await client.evaluate(`({href:location.href,ready:document.readyState,errors:window.__errors||[],text:document.body?.innerText?.slice(0,300)||''})`).catch(() => null);
  throw new Error(`${label}${diag ? `: ${JSON.stringify(diag)}` : ''}`);
}

function browserExpression() {
  const helper = String.raw`
  async function createGeneratedDom(generatedHtml) {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1024px;height:768px;border:0';
    const setup = '<script>' +
      'window.matchMedia=window.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));' +
      'try{if((!window.crypto||!window.crypto.subtle)&&parent.crypto)Object.defineProperty(window,\"crypto\",{configurable:true,value:parent.crypto});}catch{}' +
      'try{if(!window.TextEncoder&&parent.TextEncoder)Object.defineProperty(window,\"TextEncoder\",{configurable:true,value:parent.TextEncoder});}catch{}' +
      'window.scrollTo=()=>{};HTMLElement.prototype.scrollIntoView=()=>{};HTMLAnchorElement.prototype.click=()=>{};' +
      'window.alert=()=>{};window.confirm=()=>true;window.prompt=()=>"";' +
      '<\/script>';
    const prepared = /<head[^>]*>/i.test(generatedHtml)
      ? generatedHtml.replace(/<head[^>]*>/i, (match) => match + setup)
      : setup + generatedHtml;
    const stored = await fetch('/__generated', { method:'POST', headers:{'content-type':'text/html; charset=utf-8'}, body:prepared }).then(r=>{if(!r.ok)throw new Error('generated page store failed '+r.status);return r.json();});
    iframe.src = '/__generated/' + encodeURIComponent(stored.id);
    const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once:true }));
    document.body.appendChild(iframe);
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 120));
    return { window: iframe.contentWindow, close: () => iframe.remove() };
  }
  `;
  return `(async()=>{const w=window;const target=${JSON.stringify(path.relative(root, target).replaceAll('\\', '/'))};${helper}\n${checks}\nreturn {passed,failed,errors:window.__errors||[]};})()`;
}

const chromium = findChromium();
if (!chromium) throw new Error('Chromium není dostupné pro hermetický workflow fallback.');
const { server, port } = await startServer();
const debugPort = await freePort();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ghrab-generator-workflow-'));
const chrome = spawn(chromium, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
  '--disable-sync', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
  '--host-resolver-rules=MAP ghrab.local 127.0.0.1', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
let chromeError = '';
chrome.stderr.on('data', (chunk) => { chromeError = (chromeError + String(chunk)).slice(-6000); });
let client;
try {
  const version = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const pages = await waitJson(`http://127.0.0.1:${debugPort}/json`);
  const page = pages.find((item) => item.type === 'page');
  if (!page) throw new Error('Chromium nevytvořil testovací stránku.');
  client = new CdpClient(page.webSocketDebuggerUrl || version.webSocketDebuggerUrl);
  await client.open();
  await client.call('Page.enable');
  await client.call('Runtime.enable');
  client.on('Runtime.consoleAPICalled', ({ type, args = [] }) => {
    const values = args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
    if (/^(PASS|FAIL|===|TESTLAB)/.test(values)) console.log(values);
    else if (type === 'error') console.error(values);
  });
  const runtimeErrors = [];
  client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => runtimeErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'runtime exception'));
  await client.call('Page.navigate', { url: `http://127.0.0.1:${port}/generator-testu/` });
  await waitFor(client, `document.readyState==='complete' && typeof validate==='function' && typeof state!=='undefined'`, 'Aplikace se v Chromiu nespustila');
  await sleep(800);
  console.log(`=== workflow-matrix-check (Chromium fallback): ${path.relative(root, target)} ===`);
  const result = await client.evaluate(browserExpression());
  if (runtimeErrors.length) {
    for (const error of runtimeErrors) console.log('FAIL runtime výjimka —', error);
    result.failed += runtimeErrors.length;
  }
  console.log(`\nWorkflow audit: ${result.passed} PASS / ${result.failed} FAIL`);
  process.exitCode = result.failed ? 1 : 0;
} catch (error) {
  console.error(error?.stack || error);
  if (chromeError) console.error(chromeError);
  console.log('\nWorkflow audit: 0 PASS / 1 FAIL');
  process.exitCode = 1;
} finally {
  client?.close();
  try { chrome.kill('SIGTERM'); } catch {}
  const exited = await Promise.race([
    chromeExited.then(() => true),
    sleep(5000).then(() => false),
  ]);
  if (!exited) {
    try { chrome.kill('SIGKILL'); } catch {}
    await Promise.race([chromeExited, sleep(1500)]);
  }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 150 }); } catch (error) { console.warn(`WARN: dočasný Chromium profil se nepodařilo celý odstranit: ${error.code || error.message}`); }
}
