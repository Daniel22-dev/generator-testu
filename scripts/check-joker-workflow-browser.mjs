#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const source=fs.readFileSync('src/js/13e-secure-student-runtime.js','utf8');
const ctx=vm.createContext({});
vm.runInContext(source+'\n;globalThis.__qaSecureStudentScript=secureStudentScript();',ctx);
const runtime=ctx.__qaSecureStudentScript;
if(typeof runtime!=='string'||!runtime.includes('persistActiveAttemptSeal'))throw new Error('Secure student runtime extraction failed');

const CFG={testId:'JOKER-BROWSER-QA',manifestHash:'qa-manifest-714',nazev:'Joker QA',proKoho:'QA',cas:30,identityMode:'name',diffRosterSalt:'qa-salt',diffGroups:[],zolicek:true,randomizace:false,layout:'classic',publicKey:{kty:'RSA'},lockOnLeave:true,secureLabels:{jokerSelectedYes:'Zvoleno: BERU SI ŽOLÍKA.',jokerSelectedNo:'Zvoleno: DĚLÁM TEST.',jokerConfirmTitle:'Potvrzení žolíka',jokerConfirmBody:'Opravdu chceš použít žolíka? Po spuštění testu už volbu nelze změnit.',jokerConfirmUse:'Ano, použít žolíka',jokerConfirmBack:'Zpět',jokerSealedChoice:'Rozpracovaný pokus: původní volba žolíka je uzamčena.',activeAttemptTitle:'Rozpracovaný pokus je uzamčen',activeAttemptHint:'Na tomto zařízení už byl tento test zahájen jinou identitou. Nový pokus může povolit pouze učitel.',activeAttemptReset:'Zrušit rozpracovaný pokus',activeAttemptResetDone:'Rozpracovaný pokus byl zrušen.',activeAttemptStorageError:'Test nelze bezpečně zahájit, protože prohlížeč nepovolil místní uložení stavu pokusu.',jokerReport:'ŽOLÍK POUŽIT',exercise:'Cvičení',cryptoRequired:'WebCrypto required',deviceSelected:'Zařízení',deviceAutoDetected:'Rozpoznáno',deviceManuallySelected:'Vybráno',desktop:'PC / Mac',apple:'iPhone / iPad',android:'Android',auto:'Auto',textEncoding:'Text',txtCreation:'TXT',crypto:'WebCrypto',env:'Prostředí',ok:'OK',usable:'Použitelné',risky:'Rizikové',unusable:'Nevhodné',unsupported:'Nepodporováno',unavailable:'Nedostupné',lockReason:'Důvod',lockedEvent:'opuštění okna/aplikace',retryCode:'Učitelský kód',retryBad:'Nesprávný kód',close:'Zavřít'},labels:{}};
const variants={__default:[]};
const shim=`(function(){var host=(parent&&parent!==window)?parent:window;if(!host.__qaLocalStorage)host.__qaLocalStorage={};var store={getItem:function(k){return Object.prototype.hasOwnProperty.call(host.__qaLocalStorage,k)?String(host.__qaLocalStorage[k]):null},setItem:function(k,v){host.__qaLocalStorage[k]=String(v)},removeItem:function(k){delete host.__qaLocalStorage[k]},clear:function(){host.__qaLocalStorage={}}};Object.defineProperty(window,'localStorage',{value:store,configurable:true});})();`;
const html=`<!doctype html><html><head><meta charset="utf-8"><style>.hidden{display:none!important}.s-modal-bd{position:fixed;inset:0;background:#0008;z-index:99}.s-modal-box{background:white;margin:60px auto;padding:20px;max-width:500px}.selected{outline:2px solid green}</style></head><body><section id="intro"><div id="envWarning" class="hidden"></div><div id="deviceDetectedTag"></div><div id="deviceChoice"><button class="device-btn" data-device="auto"></button></div><div id="deviceInstructions"></div><div id="deviceStatus"></div><button id="jokerNo" onclick="chooseJokerStart(false)">Dělám test</button><button id="jokerYes" onclick="chooseJokerStart(true)">Beru si žolíka</button><div id="jokerChoiceConfirm"></div><input id="studentName"><button id="startBtn" onclick="startTest()">Spustit test</button></section><section id="test" class="hidden"><span id="timer"></span><div id="a11yNote" class="hidden"></div><div id="jokerWatermark" class="hidden"></div><div id="exerciseArea"></div><div id="secureSubmitCard"></div><div id="submitError" class="hidden"></div></section><section id="done" class="hidden"><div id="jokerDoneBox" class="hidden"></div><textarea id="answerBackup"></textarea><div id="formsSubmissionBox"></div><div id="formsPayloadWarning"></div></section><div id="teacherModal" class="hidden"></div><div id="lockScreen" class="hidden"><div id="lockReasonBox"></div><div id="unlockReveal" class="hidden"></div><input id="unlockInp"></div><script>${shim}<\/script><script>'use strict';const CFG=${JSON.stringify(CFG)};const STUDENT_VARIANTS=${JSON.stringify(variants)};${runtime}<\/script></body></html>`;

function chromiumPath(){for(const p of [process.env.CHROMIUM_PATH,'/usr/bin/chromium','/usr/lib/chromium/chromium','/usr/bin/google-chrome'].filter(Boolean))if(fs.existsSync(p))return p;throw new Error('Chromium není dostupné.');}
async function waitJson(url){for(let i=0;i<300;i++){try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await sleep(50);}throw new Error('Chromium debug timeout');}
class Cdp{constructor(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();this.ready=new Promise((res,rej)=>{this.ws.onopen=res;this.ws.onerror=rej});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}}}async call(method,params={}){await this.ready;return new Promise((resolve,reject)=>{const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('CDP timeout '+method));},30000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({id,method,params}));});}async eval(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}close(){try{this.ws.close()}catch{}}}
function assert(v,msg){if(!v)throw new Error(msg);console.log('PASS '+msg);}
async function waitEval(c,expr){for(let i=0;i<160;i++){if(await c.eval(expr))return true;await sleep(40);}return false;}
const W="document.getElementById('qaFrame').contentWindow";
const D=W+".document";
const childEval=(code)=>`${W}.eval(${JSON.stringify(code)})`;

const debugPort=13500+(process.pid%300),profile=`/tmp/ghrab-joker-${process.pid}`;fs.rmSync(profile,{recursive:true,force:true});
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><html><body><iframe id="qaFrame"></iframe></body></html>');});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const chrome=spawn(chromiumPath(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-extensions','--no-first-run','--remote-allow-origins=*',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,origin],{stdio:'ignore',detached:true});
let client;
async function loadFrame(){await client.eval(`document.getElementById('qaFrame').srcdoc=${JSON.stringify(html)}`);assert(await waitEval(client,`${W}&&${childEval("typeof startTest==='function'")}`),'studentský runtime se načetl v novém browser kontextu');}
async function resetPersistence(){
  try{await client.eval(childEval(`(async()=>{try{if(PERSIST_DB_PROMISE){const db=await PERSIST_DB_PROMISE;db.close();}}catch(_){}await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('testgen-secure-state-v2');r.onsuccess=()=>resolve(true);r.onerror=()=>reject(r.error||new Error('IndexedDB delete failed'));r.onblocked=()=>reject(new Error('IndexedDB delete blocked'));});return true;})()`));}catch(_){}
  await client.eval(`window.__qaLocalStorage={}`);
}
try{
  await waitJson(`http://127.0.0.1:${debugPort}/json/version`);const targets=await waitJson(`http://127.0.0.1:${debugPort}/json`);const target=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);client=new Cdp(target.webSocketDebuggerUrl);await client.call('Runtime.enable');await client.call('Page.enable');assert(await waitEval(client,`location.origin===${JSON.stringify(origin)}&&!!document.getElementById('qaFrame')`),'browser harness běží na důvěryhodném localhost originu');await resetPersistence();await loadFrame();

  await client.eval(`${D}.getElementById('studentName').value='ABC234';${D}.getElementById('jokerNo').click();${D}.getElementById('startBtn').click()`);
  assert(await waitEval(client,`!${D}.getElementById('test').classList.contains('hidden')`),'student spustí test s volbou „Dělám test“');
  const first=await client.eval(childEval(`(()=>{const r=JSON.parse(localStorage.getItem(storageKey('activeAttempt'))),s=(r&&r.body)||r;return {joker:s.jokerUsed,attempt:s.attemptId,deadline:s.timerDeadline,choice:JOKER_CHOICE}})()`));
  assert(first&&first.joker===false&&first.choice===false&&first.attempt&&first.deadline>Date.now(),'první start zapečetí volbu NE, attempt ID a absolutní deadline');

  await client.eval(childEval(`lockTest('qa-lock-before-reload')`));
  await loadFrame();
  assert(await waitEval(client,`${D}.getElementById('jokerNo').disabled&&${D}.getElementById('jokerYes').disabled&&${childEval('JOKER_CHOICE===false')}`),'reload dokončí asynchronní obnovu zapečetěné volby žolíka');
  const pre=await client.eval(`({noDisabled:${D}.getElementById('jokerNo').disabled,yesDisabled:${D}.getElementById('jokerYes').disabled,choice:${childEval('JOKER_CHOICE')},text:${D}.getElementById('jokerChoiceConfirm').textContent})`);
  assert(pre.noDisabled&&pre.yesDisabled&&pre.choice===false&&/uzamčena/.test(pre.text),'po reloadu jsou přepínače žolíka uzamčené na původní volbě');
  await client.eval(`${D}.getElementById('jokerYes').click()`);assert((await client.eval(childEval('JOKER_CHOICE')))===false,'disabled tlačítko nemůže po reloadu přepnout NE → ANO');

  await client.eval(`${D}.getElementById('studentName').value='XYZ999';${D}.getElementById('startBtn').click()`);
  assert(await waitEval(client,`!!${D}.querySelector('.s-modal-bd')`),'jiná identita narazí na učitelsky chráněný aktivní pokus');
  assert(await client.eval(`${D}.getElementById('test').classList.contains('hidden')`),'jiná identita se bez učitelského resetu do testu nedostane');
  await client.eval(`${D}.querySelector('.s-modal-bd .s-modal-btn:last-child').click();${D}.getElementById('studentName').value='ABC234';${D}.getElementById('startBtn').click()`);
  assert(await waitEval(client,`!${D}.getElementById('test').classList.contains('hidden')`),'původní identita může obnovit tentýž pokus');
  const resumed=await client.eval(childEval(`({attempt:ATTEMPT_ID,deadline:TIMER_DEADLINE,joker:JOKER_USED,locked:LOCKED,resume:SEC_EVENTS.some(e=>e.type==='attempt-resumed-after-reload')})`));
  assert(resumed.attempt===first.attempt&&resumed.deadline===first.deadline&&resumed.joker===false,'obnovení zachová attempt ID, deadline a volbu žolíka');
  assert(resumed.locked===true&&resumed.resume===true,'obnovení zachová bezpečnostní zámek a auditní událost');

  await resetPersistence();await loadFrame();
  await client.eval(`${D}.getElementById('studentName').value='ABC234';${D}.getElementById('jokerYes').click();${D}.getElementById('startBtn').click()`);
  assert(await waitEval(client,`!!${D}.querySelector('[data-confirm-ok]')`),'volba žolíka otevře explicitní potvrzení před startem');
  assert(await client.eval(`${D}.getElementById('test').classList.contains('hidden')&&window.__qaLocalStorage&&Object.keys(window.__qaLocalStorage).length===0`),'před potvrzením ještě pokus neběží ani není zapečetěn');
  await client.eval(`${D}.querySelector('[data-confirm-ok]').click()`);assert(await waitEval(client,`!${D}.getElementById('test').classList.contains('hidden')`),'po potvrzení se žolíkový pokus spustí');
  const yes=await client.eval(childEval(`(()=>{const r=JSON.parse(localStorage.getItem(storageKey('activeAttempt')));return (r&&r.body)||r;})()`));assert(yes&&yes.jokerUsed===true&&!!yes.jokerSelectedAt,'potvrzený žolík se zapečetí v aktivním pokusu');

  await resetPersistence();await loadFrame();
  await client.eval(childEval(`(()=>{const orig=localStorage.setItem.bind(localStorage);localStorage.setItem=function(k,v){if(String(k).includes('activeAttempt'))throw new Error('qa-storage-denied');return orig(k,v)}})()`));
  await client.eval(`${D}.getElementById('studentName').value='ABC234';${D}.getElementById('jokerNo').click();${D}.getElementById('startBtn').click()`);
  assert(await waitEval(client,`!!${D}.querySelector('.s-modal-bd')`),'selhání uložení aktivního pokusu vyvolá fail-closed hlášku');
  const failed=await client.eval(`({hidden:${D}.getElementById('test').classList.contains('hidden'),text:${D}.querySelector('.s-modal-body')?.textContent||''})`);
  assert(failed.hidden&&/nelze bezpečně zahájit/.test(failed.text),'bez spolehlivé pečeti se bezpečný test nespustí');

  console.log('PASS joker workflow real-browser click test');
}finally{client?.close();await new Promise(r=>server.close(r));if(chrome.exitCode===null){try{process.kill(-chrome.pid,'SIGTERM')}catch{}}await Promise.race([new Promise(r=>chrome.once('exit',r)),sleep(1500)]);if(chrome.exitCode===null){try{process.kill(-chrome.pid,'SIGKILL')}catch{}}fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
