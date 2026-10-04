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
ok(/UNLOCK_BUSY=true;var guardEpoch=GUARD_EPOCH;try\{/.test(secure)&&/finally\{UNLOCK_BUSY=false;\}/.test(secure),'secure unlock busy flag is fail-safe via try/finally');
ok(/unlockBusy=false/.test(instant),'instant runtime declares unlock busy state');
ok(/if\(!locked\|\|unlockBusy\)return;/.test(instant),'instant tryUnlock is a no-op unless locked and serializes concurrent unlocks');
ok(/unlockBusy=true;try\{/.test(instant)&&/finally\{unlockBusy=false;\}/.test(instant),'instant unlock busy flag is fail-safe via try/finally');
ok(/warningCount=securityCounts\(\)\.warnings/.test(instant),'instant warningCount tracks warning-class events only');

const secureTry=fnBlock(secure,'tryUnlock');
const sctx={setTimeout,clearTimeout};vm.createContext(sctx);
vm.runInContext(`
let LOCKED=true,LOCK_REASON='focus lost',UNLOCK_BUSY=false,LOCK_TAPS=5,PERSIST_INTEGRITY_BLOCK=false,GUARD_EPOCH=0;
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
let matchCalls=0,persistCalls=0;
async function recoveryCodeMatches(v){matchCalls++;await new Promise(r=>setTimeout(r,20));return v==='REC-OK';}
function persistActiveAttemptSeal(){persistCalls++;return true;}
function recordSec(type,detail,extra){SEC_EVENTS.push({t:'EV-'+SEC_EVENTS.length,type,detail,...(extra||{})});}
${secureTry}
globalThis.__state=()=>({LOCKED,UNLOCK_BUSY,LOCK_REASON,SEC_EVENTS:[...SEC_EVENTS],matchCalls,persistCalls});
globalThis.__setLocked=v=>{LOCKED=v;};
globalThis.__setValue=v=>{elements.unlockInp.value=v;};
`,sctx);
await Promise.all([sctx.tryUnlock(),sctx.tryUnlock()]);
let ss=sctx.__state();
ok(ss.LOCKED===false,'secure concurrent recovery unlock releases the lock');
ok(ss.matchCalls===1,'secure concurrent recovery unlock performs exactly one PBKDF2 match');
ok(ss.SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length===1,'secure one lock produces exactly one recovery-unlock audit event');
const beforeSecure=ss.SEC_EVENTS.length;
await sctx.tryUnlock();
ss=sctx.__state();
ok(ss.SEC_EVENTS.length===beforeSecure&&ss.matchCalls===1,'secure unlock on an already unlocked attempt is a no-op');

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
globalThis.__state=()=>({locked,unlockBusy,warningCount,securityEvents:[...securityEvents],matchCalls});
globalThis.__setLocked=v=>{locked=v;};
globalThis.__setValue=v=>{elements.unlockInp.value=v;};
`,ictx);
await Promise.all([ictx.tryUnlock(),ictx.tryUnlock()]);
let is=ictx.__state();
ok(is.locked===false,'instant concurrent recovery unlock releases the lock');
ok(is.matchCalls===1,'instant concurrent recovery unlock performs exactly one PBKDF2 match');
ok(is.securityEvents.filter(e=>e.type==='recovery-unlock').length===1,'instant one lock produces exactly one recovery-unlock audit event');
ok(is.warningCount===0,'instant recovery-unlock and lock events do not inflate warningCount');
const beforeInstant=is.securityEvents.length;
await ictx.tryUnlock();
is=ictx.__state();
ok(is.securityEvents.length===beforeInstant&&is.matchCalls===1,'instant unlock on an already unlocked attempt is a no-op');
ictx.recordSecurityEvent('warning','manual warning');
is=ictx.__state();
ok(is.warningCount===1&&is.securityEvents.length===3,'instant warningCount increments only for warning-class events');

if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R4 recovery runtime gate');
