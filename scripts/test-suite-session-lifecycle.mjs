#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const platformSource=fs.readFileSync('vendor/ghrab-platform-1.1.2/ghrab-platform.js','utf8');
const suiteSource=fs.readFileSync('public/access/suite-session-cleanup.js','utf8');
const expectedHash='199d03d9dc9263a9e74ed1f1102df0324f3b63e78704f1c70aeacec5feec530c';
const actualHash=crypto.createHash('sha256').update(platformSource).digest('hex');
const CANARY='GARP-STUDENT-CANARY-SYNTHETIC-ONLY';
const GEN='ghrab.platform.suite-session-generation.v1';
const SEEN='ghrab.generator.suite-session-seen.v1';
const STATUS='ghrab.generator.suite-session-status.v1';
const checks=[];
const wait=(ms=20)=>new Promise(r=>setTimeout(r,ms));
function check(ok,name,detail=''){checks.push({ok:Boolean(ok),name,detail});if(!ok)console.error('FAIL',name,detail)}

function eventTarget(target={}){
  const listeners=new Map();
  target.addEventListener=(type,fn,opts)=>{if(typeof fn!=='function')return;const list=listeners.get(type)||[];list.push({fn,once:Boolean(opts&&opts.once)});listeners.set(type,list)};
  target.removeEventListener=(type,fn)=>{listeners.set(type,(listeners.get(type)||[]).filter(x=>x.fn!==fn))};
  target.dispatchEvent=(event)=>{const type=String(event&&event.type||'');const list=[...(listeners.get(type)||[])];for(const item of list){try{item.fn.call(target,event)}catch(e){console.error(e)}if(item.once)target.removeEventListener(type,item.fn)}return true};
  return target;
}
function element(){
  const el=eventTarget({dataset:{},style:{},children:[],hidden:false,textContent:'',className:'',id:'',attributes:new Map()});
  el.classList={add(){},remove(){},toggle(){},contains(){return false}};
  el.append=(...nodes)=>el.children.push(...nodes);el.prepend=(...nodes)=>el.children.unshift(...nodes);el.replaceChildren=(...nodes)=>{el.children=[...nodes]};
  el.querySelector=()=>null;el.querySelectorAll=()=>[];el.setAttribute=(k,v)=>el.attributes.set(k,String(v));el.getAttribute=k=>el.attributes.get(k)||null;el.hasAttribute=k=>el.attributes.has(k);el.removeAttribute=k=>el.attributes.delete(k);el.focus=()=>{};el.click=()=>{};
  return el;
}
function makeRealm({suite=suiteSource,seed={},sessionSeed={},failRemoveKey=''}={}){
  class FakeStorage{
    constructor(entries={}){this.map=new Map(Object.entries(entries));this.failRemoveKey=failRemoveKey}
    get length(){return this.map.size}
    key(i){return [...this.map.keys()][i]??null}
    getItem(k){k=String(k);return this.map.has(k)?this.map.get(k):null}
    setItem(k,v){this.map.set(String(k),String(v))}
    removeItem(k){k=String(k);if(this.failRemoveKey&&k===this.failRemoveKey)throw new Error('synthetic-remove-failure');this.map.delete(k)}
  }
  const localStorage=new FakeStorage(seed),sessionStorage=new FakeStorage(sessionSeed);
  const root=element(),body=element(),head=element();
  root.dataset.ghrabAppId='generator';root.dataset.ghrabAppVersion='7.1.21';
  const document=eventTarget({currentScript:{src:'https://example.test/generator-testu/ghrab/ghrab-platform.js'},documentElement:root,body,head,readyState:'loading',hidden:false});
  document.getElementById=()=>null;document.querySelector=()=>null;document.querySelectorAll=()=>[];document.createElement=()=>element();document.createTextNode=text=>({textContent:String(text)});
  const context=eventTarget({console,URL,URLSearchParams,TextEncoder,TextDecoder,Blob,setTimeout,clearTimeout,queueMicrotask,crypto:crypto.webcrypto,location:new URL('https://example.test/generator-testu/'),navigator:{},document,localStorage,sessionStorage,Storage:FakeStorage,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init&&init.detail}},MutationObserver:class{observe(){}disconnect(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),GHRAB_PLATFORM_CONFIG:{appId:'generator',appName:'Generátor testů',appVersion:'7.1.21',requiredPlatformRange:'>=1.1.2 <2.0.0',autoFooter:false,bridgeWriteLegacy:true,bridgeMaxBytes:500000,theme:{supported:['dark','light'],default:'dark'},storageMigration:{id:'p2-storage-namespace-v1',backup:'full',mappings:[]}}});
  context.window=context;context.globalThis=context;
  vm.runInNewContext(suite,context,{filename:'suite-session-cleanup.js'});
  vm.runInNewContext(platformSource,context,{filename:'ghrab-platform.js'});
  context.__GHRAB_GENERATOR_SUITE_SESSION__.bindPlatform();
  return context;
}
function seedCanaries(w){
  w.localStorage.setItem('ghrab.generator.state.v1',`state-${CANARY}`);
  w.localStorage.setItem('ghrab.generator.migration.p2-storage-namespace-v1.backup',`backup-${CANARY}`);
  w.localStorage.setItem('sestavovac_hist_v5_13_0',`legacy-${CANARY}`);
  w.localStorage.setItem('ghrab.generator.ai.key.local.v1','synthetic-not-a-real-key');
  w.sessionStorage.setItem('ghrab.generator.ai.key.session.v1','synthetic-not-a-real-key');
  w.sessionStorage.setItem('genWelcomeShown_session','1');
  w.localStorage.setItem('ghrab.other-app.state','must-survive');
  w.localStorage.setItem('ghrab.pilot.events.v2','[{"synthetic":true}]');
  w.localStorage.setItem('ghrab.platform.handoff.v2',JSON.stringify({schema:'ghrab-studio-handoff-v2',schemaVersion:2,target:{appId:'generator'},payload:{value:CANARY}}));
}
function ownedGone(w){return w.localStorage.getItem('ghrab.generator.state.v1')===null&&w.localStorage.getItem('ghrab.generator.migration.p2-storage-namespace-v1.backup')===null&&w.localStorage.getItem('sestavovac_hist_v5_13_0')===null&&w.localStorage.getItem('ghrab.generator.ai.key.local.v1')===null&&w.sessionStorage.getItem('ghrab.generator.ai.key.session.v1')===null&&w.sessionStorage.getItem('genWelcomeShown_session')===null&&w.localStorage.getItem('ghrab.platform.handoff.v2')===null}

check(actualHash===expectedHash,'Platform 1.1.2 exact vendor SHA-256',actualHash);

// 1 Open child + ack ordering
{
  const w=makeRealm();seedCanaries(w);let release;const gate=new Promise(r=>release=r);w.__GHRAB_GENERATOR_SUITE_SESSION__.registerRuntimeCleanup(async()=>{await gate;return{ok:true}});
  const ended=w.GHRAB_PLATFORM.session.end({reason:'test-open-child'});await wait(10);
  check(w.localStorage.getItem(SEEN)!==ended.generation,'Open-child ack waits for runtime cleanup');
  release();await wait(30);
  check(ownedGone(w),'Open-child clears synthetic Generator canaries');
  check(w.localStorage.getItem('ghrab.other-app.state')==='must-survive','Open-child preserves other child namespace');
  check(w.localStorage.getItem('ghrab.pilot.events.v2')!==null,'Open-child preserves non-content telemetry');
  check(w.localStorage.getItem(GEN)===ended.generation,'Open-child preserves global suite generation tombstone');
  const st=JSON.parse(w.localStorage.getItem(STATUS)||'{}');check(st.generation===ended.generation&&st.seenAt&&st.cleanupCompletedAt,'F-02 records seen and cleanup complete');
  check(w.localStorage.getItem(SEEN)===ended.generation,'Open-child ack exists after cleanup');
}
// 2 Delayed open + reload idempotency
{
  const pending='synthetic-generation-delayed';const w=makeRealm({seed:{[GEN]:pending,'ghrab.generator.state.v1':`delayed-${CANARY}`,'ghrab.generator.migration.p2-storage-namespace-v1.backup':`backup-${CANARY}`}});await wait(35);
  check(w.localStorage.getItem('ghrab.generator.state.v1')===null&&w.localStorage.getItem('ghrab.generator.migration.p2-storage-namespace-v1.backup')===null,'Delayed-open replay clears pending canaries');
  check(w.localStorage.getItem(SEEN)===pending,'Delayed-open replay acknowledges generation');
  const snapshot=Object.fromEntries(w.localStorage.map.entries());let repeats=0;const w2=makeRealm({seed:snapshot});w2.document.addEventListener('ghrab:generator-suite-session-cleanup-complete',()=>repeats++);await wait(25);check(repeats===0,'Reload after replay does not repeat destructive cleanup');
}
// 3 Multi-tab/cross-context
{
  const w=makeRealm();seedCanaries(w);const generation='synthetic-generation-multitab';w.localStorage.setItem(GEN,generation);w.dispatchEvent({type:'storage',key:GEN,newValue:generation,oldValue:null,storageArea:w.localStorage,url:w.location.href});await wait(30);
  check(ownedGone(w),'Multi-tab cross-context signal clears canaries');check(w.__GHRAB_GENERATOR_SUITE_SESSION__.persistenceAllowed()===false,'Multi-tab stale tab persistence is locked');if(w.__GHRAB_GENERATOR_SUITE_SESSION__.persistenceAllowed())w.localStorage.setItem('ghrab.generator.state.v1',CANARY);check(w.localStorage.getItem('ghrab.generator.state.v1')===null,'Multi-tab autosave cannot restore canary');
}
// 4 BFCache/back-forward with ack already written by another tab
{
  const w=makeRealm();seedCanaries(w);const generation='synthetic-generation-bfcache';w.localStorage.setItem(GEN,generation);w.localStorage.setItem(SEEN,generation);w.dispatchEvent({type:'pageshow',persisted:true});await wait(30);check(ownedGone(w),'BFCache stale document cleans despite shared seen ack');check(w.__GHRAB_GENERATOR_SUITE_SESSION__.persistenceAllowed()===false,'BFCache stale document stays locked');
}
// 5 Fail closed
{
  const bad='ghrab.generator.state.v1';const w=makeRealm({failRemoveKey:bad});w.localStorage.setItem(bad,`failure-${CANARY}`);const ended=w.GHRAB_PLATFORM.session.end({reason:'test-fail-closed'});await wait(35);check(w.localStorage.getItem(bad)!==null,'Fail-closed synthetic delete failure is observable');check(w.localStorage.getItem(SEEN)!==ended.generation,'Fail-closed does not falsely acknowledge');const st=JSON.parse(w.localStorage.getItem(STATUS)||'{}');check(Boolean(st.cleanupFailedAt)&&Array.isArray(st.failures)&&st.failures.length>0,'Fail-closed status records failure');
}
// 6 Mandatory negative control: weaken a disposable source copy
{
  const weakened=suiteSource.replace("const owned = ownsGeneratorStorageKey(key);","const owned = false;");const w=makeRealm({suite:weakened});w.localStorage.setItem('ghrab.generator.state.v1',`negative-${CANARY}`);const ended=w.GHRAB_PLATFORM.session.end({reason:'negative-control'});await wait(30);const weakenedWouldPass=w.localStorage.getItem('ghrab.generator.state.v1')===null&&w.localStorage.getItem(SEEN)===ended.generation;check(weakenedWouldPass===false,'Negative control detects disabled cleanup (weakened copy fails as required)');
}

const failed=checks.filter(x=>!x.ok);console.log(JSON.stringify({schema:'ghrab-generator-suite-session-test-v1',platformVersion:'1.1.2',syntheticDataOnly:true,checks,summary:{total:checks.length,passed:checks.length-failed.length,failed:failed.length},status:failed.length?'failed':'passed'},null,2));if(failed.length)process.exit(1);
