// R5 release-remediation adversarial gate, odvozený z nezávislého Claude harnessu pro GIT 7.1.76.
// Spuštění z kořene repozitáře po buildu: node scripts/check-security-adversarial-r5.mjs
// Spouští SKUTEČNÝ generátor z dist/index.html a SKUTEČNĚ vygenerované instant/secure/verifier HTML v jsdom.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import * as acorn from 'acorn';
import {applyRegressionMutation} from './redteam-regression-mutants-e9.mjs';

const TEACH = 'TEACH-ABCDEF-123456', REC = 'REC-AB12-CD34', TEACHER_NAME = 'Daniel Teacher';
const results = []; // Synthetic data only; never save generated teacher HTML to the repository.
function rec(id, status, detail) { results.push({ id, status, detail }); console.log(`${status.padEnd(9)} ${id} — ${detail}`); }
async function T(id, fn) { try { const d = await fn(); rec(id, 'PASS', d || ''); } catch (e) { rec(id, e.isFinding ? 'FAIL' : 'ERROR', e.message); } }
function must(c, m) { if (!c) { const e = new Error(m); e.isFinding = true; throw e; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let html = fs.readFileSync(process.env.GIT_REDTEAM_GENERATOR_HTML || 'dist/index.html', 'utf8')
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
  .replace('<body>', '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"ADV",displayName:"Adv",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"adv"}};<\/script>');
const blobs = [];
const gdom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://daniel22-dev.github.io/generator-testu/', pretendToBeVisual: true,
  beforeParse(w) {
    w.acorn = acorn;
    w.__GHRAB_DEPLOYMENT_CONFIG__ = Object.freeze({ schema: 'ghrab-deployment-config-v1', version: 1, environmentId: 'adv', profile: 'github-pages', authMode: 'signed-permit', aiTransport: 'direct-gemini', apiBaseUrl: '', features: Object.freeze({ allowLocalProviderKeys: true, serverSessionReady: false, schoolGatewayReady: false, schoolServerConnected: false }) });
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = b => { blobs.push(b); return 'blob:adv'; }; w.URL.revokeObjectURL = () => {};
    w.fetch = async () => { throw new Error('network disabled'); };
  }
});
const w = gdom.window;
await sleep(1500);
const setVal = (id, v) => { const el = w.document.getElementById(id); if (!el) throw new Error('chybí #' + id); el.value = v; };
const GEN = { exercises: [{ title: 'MC', type: 'multiple choice', points_total: 5, points_each: 1, items: [1,2,3,4,5].map(i => ({ question: 'Q'+i+'?', options: ['A', 'B'], correct: i%2 })) }] };
function configure(over, t = TEACH, r = REC) {
  w.eval(`Object.assign(state,{appMode:'advanced',jazyk:'angličtina',instrJazyk:'cs',uroven:['B1'],kombinovat:false,pocet:1,typyCviceni:['multiple choice'],cas:15,odevzdavani:'B',randomizace:'NE',layout:'classic',tema:'default',zolicek:'NE',diferencovany:'NE',overeni:'NE',anonymizace:'ANO',body:5,identityMode:'name'},${JSON.stringify(over)});rosterEntries=[];`);
  setVal('nazev', 'ADV test'); setVal('proKoho', '1.A'); setVal('latka', 'x'); setVal('ucitelJmeno', TEACHER_NAME);
  setVal('ucitelPin', t); setVal('recoveryCode', r);
}
const startCodes=new Map();
const originalAssemble=w.assembleTestHtml;
w.assembleTestHtml=async(...args)=>{const pkg=await originalAssemble(...args);if(pkg?.startCode)startCodes.set(pkg.testId,pkg.startCode);return pkg;};
const build = async () => {
  const pkg=await w.assembleTestHtml(w.eval('state'), JSON.parse(JSON.stringify(GEN)));
  return process.env.GIT_REDTEAM_E9_MUTANT?applyRegressionMutation(pkg,process.env.GIT_REDTEAM_E9_MUTANT):pkg;
};
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
function cloneIdbState(state){
  const out=new Map();
  for(const [dbName,stores] of (state||new Map())){const ss=new Map();for(const [storeName,entries] of stores)ss.set(storeName,new Map(entries));out.set(dbName,ss);}
  return out;
}
function genDom(h, storage, idbState=new Map(),enterCode=true) {
  const d = new JSDOM(h, {
    runScripts: 'dangerously', url: 'https://school.example/t.html', pretendToBeVisual: true,
    beforeParse(x) {
      if (!x.crypto || !x.crypto.subtle) Object.defineProperty(x, 'crypto', { value: webcrypto });
      x.matchMedia = x.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      x.scrollTo = () => {}; x.HTMLElement.prototype.scrollIntoView = () => {};
      if (x.HTMLAnchorElement) x.HTMLAnchorElement.prototype.click = () => {};
      x.URL.createObjectURL = () => 'blob:g'; x.URL.revokeObjectURL = () => {};
      Object.defineProperty(x,'indexedDB',{value:fakeIndexedDb(idbState),configurable:true});
      Object.defineProperty(x,'__qaIdbState',{value:idbState,configurable:true});
      if (storage) for (const [k, v] of Object.entries(storage)) x.localStorage.setItem(k, v);
    }
  });
  if(enterCode){const input=d.window.document.getElementById('startCode');if(input)input.value=startCodes.get(d.window.eval('CFG.testId'))||'';}
  return d.window;
}
export async function enterStartCode(page,pkg){await page.locator('#startCode').fill(pkg.startCode);}
export async function decryptedVariants(pkg){const x=genDom(pkg.studentHtml,undefined,new Map(),false);try{return await x.decryptStudentContent(x.eval('ENCRYPTED_CONTENT'),pkg.startCode,x.eval('CFG'));}finally{x.close();}}
const dumpStorage = x => { const o = {}; for (let i = 0; i < x.localStorage.length; i++) { const k = x.localStorage.key(i); o[k] = x.localStorage.getItem(k); } return o; };
const storedBody = raw => { const r = raw ? JSON.parse(raw) : null; return r && r.body ? r.body : r; };
const rawVariants = s => [s, s.toLowerCase()];
const containsRaw = (txt, s) => rawVariants(s).some(v => txt.includes(v));


export { w, gdom, configure, build, genDom, dumpStorage, cloneIdbState, fakeIndexedDb, GEN, TEACH, REC, html as generatorHarnessHtml };
