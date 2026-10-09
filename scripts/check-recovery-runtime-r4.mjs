import fs from 'node:fs';
import vm from 'node:vm';

const secure = (fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+fs.readFileSync('src/js/13e-secure-student-runtime.js','utf8'));
const instant = fs.readFileSync('src/js/14b-instant-test-runtime.js','utf8');

function ok(cond,msg){
  if(!cond){console.error('FAIL R4:',msg);process.exitCode=1;return;}
  console.log('PASS R4:',msg);
}
function fnBlock(src,name){
  const start=src.indexOf(`async function ${name}(`);
  if(start<0)throw new Error(`missing async function ${name}`);
  const brace=src.indexOf('{',start);
  let depth=0, quote='', esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error(`unterminated function ${name}`);
}
function plainFn(src,name){
  const start=src.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`missing function ${name}`);
  const brace=src.indexOf('{',start);
  let depth=0, quote='', esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;
    else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error(`unterminated function ${name}`);
}

ok(/LOCK_REASON='',UNLOCK_BUSY=false/.test(secure),'secure runtime declares unlock busy state');
ok(/if\(!LOCKED\|\|UNLOCK_BUSY\)return;/.test(secure),'secure tryUnlock is a no-op unless locked and serializes concurrent unlocks');
ok(/UNLOCK_BUSY=true;var guardEpoch=GUARD_EPOCH;try\{/.test(secure)&&/finally\{if\(input\)input\.value='';UNLOCK_BUSY=false;\}/.test(secure),'secure unlock busy flag and DOM cleanup are fail-safe via try/finally');
ok(/unlockBusy=false/.test(instant),'instant runtime declares unlock busy state');
ok(/if\(!locked\|\|unlockBusy\)return;/.test(instant),'instant tryUnlock is a no-op unless locked and serializes concurrent unlocks');
ok(/unlockBusy=true;try\{/.test(instant)&&/finally\{if\(input\)input\.value='';unlockBusy=false;\}/.test(instant),'instant unlock busy flag and DOM cleanup are fail-safe via try/finally');
ok(/warningCount=securityCounts\(\)\.warnings/.test(instant),'instant warningCount tracks warning-class events only');

const secureTry=fnBlock(secure,'tryUnlock');
const sctx={setTimeout,clearTimeout};vm.createContext(sctx);
vm.runInContext(`
let LOCKED=true,LOCK_REASON='focus lost',UNLOCK_BUSY=false,LOCK_TAPS=5,PERSIST_INTEGRITY_BLOCK=false,GUARD_EPOCH=0;
let CRITICAL_EVENTS_OVERFLOW=false;
let SEC_EVENTS=[{t:'LOCK-1',type:'locked',detail:'focus lost'}];
const elements={
 unlockInp:{value:'REC-OK'},
 lockScreen:{classList:{add(){}}},
 unlockReveal:{classList:{add(){}}},
 lockReasonBox:{textContent:''}
};
const document={visibilityState:"visible"};function applyGuardUi(){}
function $(id){return elements[id];}
function t(_k,f){return f;}
function sModal(){}
let matchCalls=0,persistCalls=0;
async function recoveryCodeMatches(v){matchCalls++;await new Promise(r=>setTimeout(r,20));return v==='REC-OK';}
function persistActiveAttemptSeal(){persistCalls++;return true;}
function recordSec(type,detail,extra){SEC_EVENTS.push({t:'EV-'+SEC_EVENTS.length,type,detail,...(extra||{})});}
${secureTry}
globalThis.__state=()=>({LOCKED,UNLOCK_BUSY,LOCK_REASON,SEC_EVENTS:[...SEC_EVENTS],matchCalls,persistCalls,inputValue:elements.unlockInp.value});
globalThis.__setLocked=v=>{LOCKED=v;};
globalThis.__setValue=v=>{elements.unlockInp.value=v;};
globalThis.__setMatcher=fn=>{recoveryCodeMatches=fn;};
globalThis.__setCritical=v=>{CRITICAL_EVENTS_OVERFLOW=v;};
`,sctx);
await Promise.all([sctx.tryUnlock(),sctx.tryUnlock()]);
let ss=sctx.__state();
ok(ss.LOCKED===false,'secure concurrent recovery unlock releases the lock');
ok(ss.matchCalls===1,'secure concurrent recovery unlock performs exactly one PBKDF2 match');
ok(ss.SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length===1,'secure one lock produces exactly one recovery-unlock audit event');
ok(ss.inputValue==='','secure successful recovery clears the DOM input');
const beforeSecure=ss.SEC_EVENTS.length;
await sctx.tryUnlock();
ss=sctx.__state();
ok(ss.SEC_EVENTS.length===beforeSecure&&ss.matchCalls===1,'secure unlock on an already unlocked attempt is a no-op');
sctx.__setLocked(true);sctx.__setValue('REC-WRONG');await sctx.tryUnlock();ss=sctx.__state();
ok(ss.LOCKED===true&&ss.inputValue==='','secure rejected recovery keeps the lock and clears the DOM input');
sctx.__setMatcher(async()=>{throw new Error('synthetic authorization fault');});sctx.__setValue('REC-FAULT');try{await sctx.tryUnlock();}catch{}ss=sctx.__state();
ok(ss.LOCKED===true&&ss.inputValue==='','secure recovery exception keeps the lock and clears the DOM input');
sctx.__setCritical(true);sctx.__setValue('REC-INTERRUPTED');await sctx.tryUnlock();ss=sctx.__state();
ok(ss.LOCKED===true&&ss.inputValue==='','secure interrupted authorization clears the DOM input before returning');

const instantTry=fnBlock(instant,'tryUnlock');
const instantCounts=plainFn(instant,'securityCounts');
const instantRecord=plainFn(instant,'recordSecurityEvent');
const ictx={setTimeout,clearTimeout};vm.createContext(ictx);
vm.runInContext(`
var locked=true,unlockBusy=false,LOCK_TAPS=5,warningCount=0;
var securityEvents=[{type:'lock',detail:'pagehide',ts:'LOCK-1'}];
var elements={unlockInp:{value:'REC-OK',style:{}},lockScreen:{},unlockReveal:{}};
function I(id){return elements[id];}
function hide(_id){}
let matchCalls=0;
async function recoveryCodeMatches(v){matchCalls++;await new Promise(r=>setTimeout(r,20));return v==='REC-OK';}
${instantCounts}
${instantRecord}
${instantTry}
globalThis.__state=()=>({locked,unlockBusy,warningCount,securityEvents:[...securityEvents],matchCalls,inputValue:elements.unlockInp.value});
globalThis.__setLocked=v=>{locked=v;};
globalThis.__setValue=v=>{elements.unlockInp.value=v;};
globalThis.__setMatcher=fn=>{recoveryCodeMatches=fn;};
`,ictx);
await Promise.all([ictx.tryUnlock(),ictx.tryUnlock()]);
let is=ictx.__state();
ok(is.locked===false,'instant concurrent recovery unlock releases the lock');
ok(is.matchCalls===1,'instant concurrent recovery unlock performs exactly one PBKDF2 match');
ok(is.securityEvents.filter(e=>e.type==='recovery-unlock').length===1,'instant one lock produces exactly one recovery-unlock audit event');
ok(is.warningCount===0,'instant recovery-unlock and lock events do not inflate warningCount');
ok(is.inputValue==='','instant successful recovery clears the DOM input');
const beforeInstant=is.securityEvents.length;
await ictx.tryUnlock();
is=ictx.__state();
ok(is.securityEvents.length===beforeInstant&&is.matchCalls===1,'instant unlock on an already unlocked attempt is a no-op');
ictx.__setLocked(true);ictx.__setValue('REC-WRONG');await ictx.tryUnlock();is=ictx.__state();
ok(is.locked===true&&is.inputValue==='','instant rejected recovery keeps the lock and clears the DOM input');
ictx.__setMatcher(async()=>{throw new Error('synthetic authorization fault');});ictx.__setValue('REC-FAULT');try{await ictx.tryUnlock();}catch{}is=ictx.__state();
ok(is.locked===true&&is.inputValue==='','instant recovery exception keeps the lock and clears the DOM input');
ictx.recordSecurityEvent('warning','manual warning');
is=ictx.__state();
ok(is.warningCount===1&&is.securityEvents.length===3,'instant warningCount increments only for warning-class events');

if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R4 recovery runtime gate');
