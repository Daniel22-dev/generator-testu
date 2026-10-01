#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const fixture = path.resolve('qa-results/qa-fixtures/teacher_verifier.html');
const outDir = path.resolve('qa-results/verifier-ui-runtime');
const summaryPath = path.join(outDir, 'summary.json');
if (!fs.existsSync(fixture)) {
  console.error('FAIL Verifier UI runtime: chybi qa-results/qa-fixtures/teacher_verifier.html. Spust nejprve QA fixture generation.');
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function chromiumPath() {
  for (const candidate of [process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/lib/chromium/chromium', '/usr/bin/google-chrome'].filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Chromium neni dostupne. Nastav CHROMIUM_PATH nebo nainstaluj Chromium.');
}

async function waitJson(url) {
  for (let i = 0; i < 300; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {}
    await sleep(50);
  }
  throw new Error(`Chromium debug timeout: ${url}`);
}

async function waitPageTarget(debugPort) {
  for (let i = 0; i < 200; i++) {
    try {
      const targets = await waitJson(`http://127.0.0.1:${debugPort}/json`);
      const target = Array.isArray(targets) ? targets.find(item => item?.type === 'page' && item.webSocketDebuggerUrl) : null;
      if (target) return target;
    } catch {}
    await sleep(50);
  }
  throw new Error('Chromium page target timeout');
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
        return;
      }
      this.events.push(message);
    };
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout ${method}`));
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

const html = await fsp.readFile(fixture, 'utf8');
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url?.startsWith('/teacher_verifier.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
    return;
  }
  res.writeHead(404, { 'cache-control': 'no-store' });
  res.end('not found');
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const listenPort = server.address().port;
const debugPort = 12600 + (process.pid % 300);
const profile = `/tmp/ghrab-verifier-ui-${process.pid}`;
fs.rmSync(profile, { recursive: true, force: true });
const chrome = spawn(chromiumPath(), [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--disable-background-networking', '--disable-extensions', '--no-first-run', '--mute-audio',
  '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', detached: true });
let client;
const summary = { schema: 'ghrab-verifier-ui-runtime-v1', chromium: chromiumPath(), status: 'failed', checks: {} };
try {
  await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const target = await waitPageTarget(debugPort);
  client = new Cdp(target.webSocketDebuggerUrl);
  await client.call('Runtime.enable');
  await client.call('Page.enable');
  await client.call('Page.navigate', { url: `http://127.0.0.1:${listenPort}/teacher_verifier.html` });
  let ready = false;
  for (let i = 0; i < 240; i++) {
    ready = Boolean(await client.eval(`document.readyState==='complete' && !!document.querySelector('#v2ThemeBtn') && !!document.querySelector('#v2FullscreenBtn')`));
    if (ready) break;
    await sleep(50);
  }
  assert(ready, 'Teacher Verifier V2 shell se v Chromium inicializoval');

  const themeSnapshot = `(()=>{const bg=s=>getComputedStyle(document.querySelector(s)).backgroundColor;const modal=document.createElement('div');modal.className='v-modal-box';document.body.appendChild(modal);const out={theme:document.body.dataset.verifierTheme||'',body:bg('body'),card:bg('.card'),nav:bg('.v2-nav'),input:bg('input'),modal:getComputedStyle(modal).backgroundColor};modal.remove();return out})()`;
  const dark = await client.eval(themeSnapshot);
  const expectedDark = { theme: 'dark', body: 'rgb(11, 18, 32)', card: 'rgb(17, 24, 39)', nav: 'rgb(16, 24, 39)', input: 'rgb(15, 23, 42)', modal: 'rgb(17, 24, 39)' };
  assert(JSON.stringify(dark) === JSON.stringify(expectedDark), `dark theme ma skutecnou tmavou paletu ${JSON.stringify(dark)}`);
  summary.checks.dark = dark;

  await client.eval(`toggleVerifierTheme()`);
  const light = await client.eval(themeSnapshot);
  const expectedLight = { theme: 'light', body: 'rgb(244, 246, 251)', card: 'rgb(255, 255, 255)', nav: 'rgb(243, 244, 246)', input: 'rgb(255, 255, 255)', modal: 'rgb(255, 255, 255)' };
  assert(JSON.stringify(light) === JSON.stringify(expectedLight), `light theme ma samostatnou svetlou paletu ${JSON.stringify(light)}`);
  const lightControl = await client.eval(`(()=>{const b=document.querySelector('#v2ThemeBtn');return {pressed:b.getAttribute('aria-pressed'),label:b.getAttribute('aria-label'),text:b.textContent.replace(/\s+/g,' ').trim()}})()`);
  assert(lightControl.pressed === 'true' && /tmav/i.test(lightControl.label.normalize('NFD').replace(/\p{Diacritic}/gu,'')), 'theme control vystavuje aktivni light stav pres aria');
  summary.checks.light = light;

  await client.eval(`(()=>{window.__qaFullscreen=null;Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>window.__qaFullscreen});Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:async()=>{window.__qaFullscreen=document.documentElement;document.dispatchEvent(new Event('fullscreenchange'))}});Object.defineProperty(document,'exitFullscreen',{configurable:true,value:async()=>{window.__qaFullscreen=null;document.dispatchEvent(new Event('fullscreenchange'))}})})()`);
  await client.eval(`toggleVerifierFullscreen()`);
  const entered = await client.eval(`(()=>{const b=document.querySelector('#v2FullscreenBtn');return {pressed:b.getAttribute('aria-pressed'),text:b.textContent.replace(/\s+/g,' ').trim(),body:document.body.classList.contains('v2-fullscreen')}})()`);
  assert(entered.pressed === 'true' && entered.body && /Ukoncit/i.test(entered.text.normalize('NFD').replace(/\p{Diacritic}/gu,'')), 'fullscreen vstup aktualizuje stav tlacitka i body');

  await client.eval(`window.__qaFullscreen=null;document.dispatchEvent(new Event('fullscreenchange'))`);
  const escaped = await client.eval(`(()=>{const b=document.querySelector('#v2FullscreenBtn');return {pressed:b.getAttribute('aria-pressed'),text:b.textContent.replace(/\s+/g,' ').trim(),body:document.body.classList.contains('v2-fullscreen')}})()`);
  assert(escaped.pressed === 'false' && !escaped.body && /Cela obrazovka/i.test(escaped.text.normalize('NFD').replace(/\p{Diacritic}/gu,'')), 'fullscreenchange/Esc ekvivalent vrati UI do neaktivniho stavu');

  const unsupported = await client.eval(`(async()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:undefined});Object.defineProperty(document,'exitFullscreen',{configurable:true,value:undefined});window.__qaFullscreen=null;const ok=await toggleVerifierFullscreen();return {ok,text:document.querySelector('#v2UiStatus').textContent}})()`);
  assert(unsupported.ok === false && /neni v tomto prohlizeci dostupny/i.test(unsupported.text.normalize('NFD').replace(/\p{Diacritic}/gu,'')), 'nepodporovany fullscreen ma explicitni feedback');

  const rejected = await client.eval(`(async()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:async()=>{throw new Error('qa reject')}});window.__qaFullscreen=null;const ok=await toggleVerifierFullscreen();return {ok,text:document.querySelector('#v2UiStatus').textContent}})()`);
  assert(rejected.ok === false && /nepodarilo spustit/i.test(rejected.text.normalize('NFD').replace(/\p{Diacritic}/gu,'')) && /F11/.test(rejected.text), 'odmitnuty fullscreen ma F11 fallback feedback');
  summary.checks.fullscreen = { entered, escaped, unsupported, rejected };

  summary.status = 'passed';
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log('PASS Teacher Verifier D4 theme/fullscreen real-browser runtime');
} catch (error) {
  summary.error = String(error?.stack || error);
  await fsp.writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  throw error;
} finally {
  client?.close();
  server.close();
  if (chrome.exitCode === null) { try { process.kill(-chrome.pid, 'SIGTERM'); } catch {} }
  await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(1500)]);
  if (chrome.exitCode === null) { try { process.kill(-chrome.pid, 'SIGKILL'); } catch {} }
  await sleep(100);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
