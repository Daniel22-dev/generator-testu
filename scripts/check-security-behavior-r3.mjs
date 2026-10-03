import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import * as acorn from 'acorn';

const TEACH='TEACH-ABCDEF-123456';
const REC='REC-AB12-CD34';
const TEACHER_NAME='Daniel Teacher';
const results=[];
function rec(id,status,detail=''){results.push({id,status,detail});console.log(status.padEnd(5),id,detail?'- '+detail:'')}
async function test(id,fn){try{rec(id,'PASS',await fn()||'')}catch(e){rec(id,'FAIL',String(e&&e.message||e));process.exitCode=1}}
function must(c,m){if(!c)throw new Error(m)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const source=fs.readFileSync('dist/index.html','utf8');
const executable=source
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'')
  .replace('<body>','<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"R3",displayName:"R3",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"r3"}};<\/script>');
const gdom=new JSDOM(executable,{runScripts:'dangerously',url:'https://qa.local/generator-testu/',pretendToBeVisual:true,beforeParse(w){
  w.acorn=acorn;if(!w.crypto||!w.crypto.subtle)Object.defineProperty(w,'crypto',{value:webcrypto});
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  if(w.HTMLAnchorElement)w.HTMLAnchorElement.prototype.click=()=>{};
  w.URL.createObjectURL=()=> 'blob:r3';w.URL.revokeObjectURL=()=>{};
  w.fetch=async()=>{throw new Error('network disabled in R3 gate')};
}});
const w=gdom.window;
await sleep(1400);
if(w.__errors?.length)throw new Error('generator runtime failed: '+w.__errors.join(' | '));
function setVal(id,v){const el=w.document.getElementById(id);if(!el)throw new Error('missing #'+id);el.value=v}
const GEN={exercises:[{title:'MC',type:'multiple choice',points_total:5,points_each:1,items:[{question:'Q1',options:['A','B'],correct:0},{question:'Q2',options:['A','B'],correct:1},{question:'Q3',options:['A','B'],correct:0},{question:'Q4',options:['A','B'],correct:1},{question:'Q5',options:['A','B'],correct:0}]}]};
function configure(over={},teacher=TEACH,recovery=REC){
  w.eval(`Object.assign(state,{appMode:'advanced',jazyk:'angli\u010dtina',instrJazyk:'cs',uroven:['B1'],kombinovat:false,pocet:1,typyCviceni:['multiple choice'],cas:15,odevzdavani:'B',randomizace:'NE',layout:'classic',tema:'default',zolicek:'NE',diferencovany:'NE',overeni:'NE',anonymizace:'ANO',identityMode:'name',testMode:'bezny',resultMode:'instant',screenGuard:true,feedbackMode:'brief',body:5},${JSON.stringify(over)});rosterEntries=[];`);
  setVal('nazev','R3 test');setVal('proKoho','1.A');setVal('latka','x');setVal('ucitelJmeno',TEACHER_NAME);setVal('ucitelPin',teacher);setVal('recoveryCode',recovery);
}
const build=async()=>w.assembleTestHtml(w.eval('state'),JSON.parse(JSON.stringify(GEN)));
function fakeIndexedDb(shared=new Map()){
  const dbs=shared;
  function dbFor(name){if(!dbs.has(name))dbs.set(name,new Map());return dbs.get(name)}
  function makeDb(name){
    const stores=dbFor(name);
    return {
      objectStoreNames:{contains:n=>stores.has(String(n))},
      createObjectStore(n){n=String(n);if(!stores.has(n))stores.set(n,new Map());return {};},
      transaction(storeName){
        storeName=String(storeName);if(!stores.has(storeName))stores.set(storeName,new Map());const store=stores.get(storeName);
        const tx={oncomplete:null,onerror:null,onabort:null,error:null};
        tx.objectStore=()=>({
          get(key){const req={result:undefined,onsuccess:null,onerror:null};queueMicrotask(()=>{try{req.result=store.get(String(key));req.onsuccess&&req.onsuccess();}catch(e){req.error=e;req.onerror&&req.onerror();}});return req;},
          put(value,key){queueMicrotask(()=>{try{store.set(String(key),value);tx.oncomplete&&tx.oncomplete();}catch(e){tx.error=e;tx.onerror&&tx.onerror();}});return {};},
          delete(key){queueMicrotask(()=>{try{store.delete(String(key));tx.oncomplete&&tx.oncomplete();}catch(e){tx.error=e;tx.onerror&&tx.onerror();}});return {};}
        });
        return tx;
      },
      close(){}
    };
  }
  return {
    open(name){const req={result:null,error:null,onupgradeneeded:null,onsuccess:null,onerror:null};const fresh=!dbs.has(String(name));queueMicrotask(()=>{try{req.result=makeDb(String(name));if(fresh&&req.onupgradeneeded)req.onupgradeneeded();req.onsuccess&&req.onsuccess();}catch(e){req.error=e;req.onerror&&req.onerror();}});return req;},
    deleteDatabase(name){const req={onsuccess:null,onerror:null,onblocked:null,error:null};queueMicrotask(()=>{dbs.delete(String(name));req.onsuccess&&req.onsuccess();});return req;}
  };
}
function genDom(html,storage,idbState=new Map()){const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://school.example/t.html',pretendToBeVisual:true,beforeParse(x){
  if(!x.crypto||!x.crypto.subtle)Object.defineProperty(x,'crypto',{value:webcrypto});
  x.matchMedia=x.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  x.scrollTo=()=>{};x.HTMLElement.prototype.scrollIntoView=()=>{};if(x.HTMLAnchorElement)x.HTMLAnchorElement.prototype.click=()=>{};
  x.URL.createObjectURL=()=> 'blob:r3-child';x.URL.revokeObjectURL=()=>{};
  Object.defineProperty(x,'indexedDB',{value:fakeIndexedDb(idbState),configurable:true});
  Object.defineProperty(x,'__qaIdbState',{value:idbState,configurable:true});
  if(storage)for(const [k,v] of Object.entries(storage))x.localStorage.setItem(k,v);
}});return dom;}
function dumpStorage(x){const out={};for(let i=0;i<x.localStorage.length;i++){const k=x.localStorage.key(i);out[k]=x.localStorage.getItem(k)}return out}

await test('R2-direct-same-secret',async()=>{
  configure({},REC,REC);let threw=false;try{await build()}catch(e){threw=/Recovery|credential|stejn/i.test(String(e.message))}must(threw,'assembleTestHtml accepted Teacher == Recovery');return 'fail-closed';
});
await test('R2-direct-weak-teacher',async()=>{
  configure({},'123456',REC);let threw=false;try{await build()}catch(e){threw=true}must(threw,'assembleTestHtml accepted weak Teacher/Admin secret');return 'fail-closed';
});
await test('R2-drift-bypass',async()=>{
  configure();await build();w.eval('lastGenData='+JSON.stringify(GEN)+';generatedTestHtml="r3";');const before=w.eval('lastAssembled');
  setVal('ucitelPin',REC);setVal('recoveryCode',REC);w.validate();must(w.document.getElementById('next3').disabled,'UI validation did not block same secret');
  await w.applySettingsWithoutAi();await sleep(30);must(w.eval('lastAssembled')===before,'invalid drift replaced lastAssembled');return 'invalid drift cannot rebuild';
});

configure({testMode:'bezny',resultMode:'instant',screenGuard:true,feedbackMode:'brief'});
const instant=await build();
await test('R3-instant-privilege-boundary',async()=>{
  const d=genDom(instant);const x=d.window;await sleep(120);x.document.getElementById('studentName').value='Student';await x.startTest();
  x.openTeacherModal();x.document.getElementById('t-name').value=TEACHER_NAME;x.document.getElementById('t-pin').value=REC;await x.doTeacherLogin();must(x.document.getElementById('t-panel').classList.contains('hidden'),'Recovery opened instant teacher panel');
  x.document.getElementById('t-pin').value=TEACH;await x.doTeacherLogin();must(!x.document.getElementById('t-panel').classList.contains('hidden'),'Teacher/Admin login failed');x.closeTeacherModal();
  x.dispatchEvent(new x.Event('pagehide'));await sleep(20);must(!x.document.getElementById('lockScreen').classList.contains('hidden'),'instant did not lock');
  x.document.getElementById('unlockInp').value=TEACH;await x.tryUnlock();must(!x.document.getElementById('lockScreen').classList.contains('hidden'),'Teacher/Admin unlocked instant lock');
  x.document.getElementById('unlockInp').value=REC;await x.tryUnlock();must(x.document.getElementById('lockScreen').classList.contains('hidden'),'Recovery did not unlock instant lock');d.window.close();return 'login/unlock separated';
});

configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,feedbackMode:'none'});
const pack=await build();
await test('R1-verifier-generated-script',async()=>{
  const scripts=[...pack.teacherHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);must(scripts.length>0,'no verifier inline script');for(const code of scripts)acorn.parse(code,{ecmaVersion:'latest'});
  const d=genDom(pack.teacherHtml);await sleep(180);for(const fn of ['renderTable','downloadResultsCsv','parseFormsCsvText','bulkVerifyPasted','downloadDirectPdf'])must(typeof d.window[fn]==='function',fn+' missing');d.window.close();return scripts.length+' script(s) parsed';
});
await test('R3-secure-privilege-boundary',async()=>{
  const d=genDom(pack.studentHtml);const x=d.window;await sleep(150);x.document.getElementById('studentName').value='Alice';await x.startTest();x.lockTest('r3-lock');await sleep(20);
  x.document.getElementById('teacherName').value=TEACHER_NAME;x.document.getElementById('teacherPin').value=REC;await x.teacherLogin();must(x.document.getElementById('teacherPanel').classList.contains('hidden'),'Recovery opened secure teacher panel');
  x.document.getElementById('teacherPin').value=TEACH;await x.teacherLogin();must(!x.document.getElementById('teacherPanel').classList.contains('hidden'),'Teacher/Admin secure login failed');x.teacherLogout();
  x.document.getElementById('unlockInp').value=TEACH;await x.tryUnlock();must(x.eval('LOCKED')===true,'Teacher/Admin unlocked secure lock');x.document.getElementById('unlockInp').value=REC;await x.tryUnlock();must(x.eval('LOCKED')===false,'Recovery did not unlock secure lock');
  const storage=dumpStorage(x);const activeKey=x.eval("storageKey('activeAttempt')");const y=genDom(pack.studentHtml,storage,d.window.__qaIdbState).window;await sleep(150);y.document.getElementById('studentName').value='Bob';await y.startTest();await sleep(30);const box=()=>y.document.querySelector('.s-modal-bd input[type=password]');must(box(),'active-attempt reset modal missing');box().value=REC;y.document.querySelector('.s-modal-bd .s-modal-btn.primary').click();await sleep(850);must(y.localStorage.getItem(activeKey)!==null,'Recovery reset foreign active attempt');box().value=TEACH;y.document.querySelector('.s-modal-bd .s-modal-btn.primary').click();await sleep(850);must(y.localStorage.getItem(activeKey)===null,'Teacher/Admin reset failed');y.close();d.window.close();return 'login/unlock/reset separated';
});

fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/security-behavior-r3.json',JSON.stringify(results,null,2));
gdom.window.close();
if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R3 behavioral security gate');
