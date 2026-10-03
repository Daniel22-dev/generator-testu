import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const secure = read('src/js/13e-secure-student-runtime.js');
const instant = read('src/js/14b-instant-test-runtime.js');

function assert(cond, msg){
  if(!cond){ console.error('FAIL', msg); process.exitCode = 1; }
  else console.log('PASS', msg);
}
function count(src, needle){ return src.split(needle).length - 1; }
function between(src, a, b){
  const i=src.indexOf(a), j=src.indexOf(b, i + a.length);
  if(i<0 || j<0) throw new Error(`Cannot slice ${a} -> ${b}`);
  return src.slice(i,j);
}
function extractFunction(src, name){
  const re = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const m = re.exec(src);
  if(!m) throw new Error(`Function not found: ${name}`);
  const start=m.index;
  const brace=src.indexOf('{', start);
  let depth=0, quote='', esc=false, lineComment=false, blockComment=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i], n=src[i+1]||'';
    if(lineComment){ if(c==='\n') lineComment=false; continue; }
    if(blockComment){ if(c==='*'&&n==='/'){ blockComment=false; i++; } continue; }
    if(quote){
      if(esc){esc=false; continue;}
      if(c==='\\'){esc=true; continue;}
      if(c===quote){quote='';}
      continue;
    }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}
    if(c==='{') depth++;
    else if(c==='}' && --depth===0) return src.slice(start,i+1);
  }
  throw new Error(`Unbalanced function: ${name}`);
}
function derive(kind, secret, testId){
  const norm=['teacher-pin','recovery-code'].includes(kind)?String(secret||'').trim().toUpperCase():String(secret||'').trim();
  return 'pbkdf2-v1$'+crypto.pbkdf2Sync(norm, `${kind}|${testId}`, 120000, 32, 'sha256').toString('base64url');
}
function makeEl(hidden=false){
  const classes=new Set(hidden?['hidden']:[]);
  return {
    value:'', textContent:'', innerHTML:'', style:{}, focused:false,
    classList:{ add:(...xs)=>xs.forEach(x=>classes.add(x)), remove:(...xs)=>xs.forEach(x=>classes.delete(x)), contains:x=>classes.has(x), toggle:(x,v)=>{if(v===undefined){if(classes.has(x))classes.delete(x);else classes.add(x);}else if(v)classes.add(x);else classes.delete(x);} },
    focus(){this.focused=true;}
  };
}

// Static privilege-boundary proof: secure runtime.
const secureRetry = between(secure, 'function showSubmittedLocked(){', 'function normRosterIdentity');
const secureReset = between(secure, 'function showActiveAttemptLocked(){', 'async function rosterHash');
const secureUnlock = between(secure, 'async function tryUnlock()', 'function openTeacherModal');
const secureLogin = between(secure, 'async function teacherLogin()', 'function renderTeacherRuntimeInfo');
assert(/teacherSecretMatches\(v\)/.test(secureRetry) && !/recoveryCodeMatches|recovery-code|recoveryCodeHash/.test(secureRetry), 'E3 secure: submitted retry accepts only Teacher/Admin authorization');
assert(/teacherSecretMatches\(v\)/.test(secureReset) && !/recoveryCodeMatches|recovery-code|recoveryCodeHash/.test(secureReset), 'E3 secure: active-attempt reset accepts only Teacher/Admin authorization');
assert(/recoveryCodeMatches\(v\)/.test(secureUnlock) && !/teacherSecretMatches|teacher-pin|ucitelPinHash/.test(secureUnlock), 'E3 secure: tryUnlock accepts only Classroom Recovery authorization');
assert(/teacherSecretMatches\(pin\)/.test(secureLogin) && !/recoveryCodeMatches|recovery-code|recoveryCodeHash/.test(secureLogin), 'E3 secure: teacher login accepts only Teacher/Admin authorization');
assert(count(secure,'teacherSecretMatches(')===4, 'E3 secure: Teacher/Admin helper is limited to retry, reset and teacher login plus its definition');
assert(count(secure,'recoveryCodeMatches(')===2, 'E3 secure: Recovery helper is limited to tryUnlock plus its definition');
assert(/function lockTap\(\).*LOCK_TAPS>=5/s.test(secure), 'E3 secure: hidden 5x lock-tap reveal is preserved');

// Static privilege-boundary proof: instant runtime.
const instantUnlock = between(instant, 'async function tryUnlock()', '`;\n}');
const instantLogin = between(instant, 'async function doTeacherLogin()', 'function logoutTeacher');
assert(/recoveryCodeMatches\(v\)/.test(instantUnlock) && !/teacherSecretMatches|teacher-pin|ucitelPinHash/.test(instantUnlock), 'E3 instant: tryUnlock accepts only Classroom Recovery authorization');
assert(/teacherSecretMatches\(p\)/.test(instantLogin) && !/recoveryCodeMatches|recovery-code|recoveryCodeHash/.test(instantLogin), 'E3 instant: teacher login accepts only Teacher/Admin authorization');
assert(!/async function secretMatches\(/.test(instant), 'E3 instant: generic cross-role secret matcher was removed');
assert(count(instant,'teacherSecretMatches(')===2 && count(instant,'recoveryCodeMatches(')===2, 'E3 instant: role-specific helpers are each used only by their matching operation');
assert(/function lockTap\(\).*LOCK_TAPS>=5/s.test(instant), 'E3 instant: hidden 5x lock-tap reveal is preserved');

const TEST_ID='E3-BOUNDARY-TEST';
const TEACHER='Teacher-Secret-2026!';
const RECOVERY='REC-AB12-CD34';
const teacherHash=derive('teacher-pin',TEACHER,TEST_ID);
const recoveryHash=derive('recovery-code',RECOVERY,TEST_ID);

// Execute the real secure helper/login/unlock functions in a dependency-free VM harness.
{
  const els={
    unlockInp:makeEl(), lockScreen:makeEl(false), unlockReveal:makeEl(true), lockReasonBox:makeEl(),
    teacherName:makeEl(), teacherPin:makeEl(), teacherErr:makeEl(true), teacherLoginBox:makeEl(false), teacherPanel:makeEl(true), teacherRuntimeInfo:makeEl()
  };
  const ctx={
    console, TextEncoder, Uint8Array, crypto:crypto.webcrypto, window:{crypto:crypto.webcrypto, TextEncoder},
    btoa:s=>Buffer.from(s,'binary').toString('base64'), setTimeout:()=>1, clearTimeout:()=>{},
    CFG:{testId:TEST_ID,ucitelPinHash:teacherHash,recoveryCodeHash:recoveryHash,ucitelJmeno:'Teacher'},
    b64UrlFromBufferLocal:buf=>Buffer.from(new Uint8Array(buf)).toString('base64url'),
    $:id=>els[id]||makeEl(), t:(k,f)=>f||k, renderTeacherRuntimeInfo:()=>{},
  };
  vm.createContext(ctx);
  vm.runInContext(`
    let ATTEMPT_ID='ATT-E3-001', ACTIVE_IDENTITY_HASH='IDENTITY-HASH-001', ACTIVE_KEY='VARIANT-B', STARTED_AT='2026-10-02T15:00:00.000Z';
    let TIMER_DEADLINE=1999999999999, LOCKED=true, LOCK_REASON='Student left window', UNLOCK_BUSY=false, SUBMITTED=false;
    let JOKER_USED=true, JOKER_SELECTED_AT='2026-10-02T15:00:05.000Z', JOKER_CHOICE=true;
    let RESP={q1:'A',q2:'B'}, SEC_EVENTS=[{t:'2026-10-02T15:05:00.000Z',type:'locked',detail:'Student left window'}];
    let LOCK_TAPS=0, LOCK_TAP_TIMER=null; let __lastSeal=null;
    function recordSec(type,detail){SEC_EVENTS.push({t:'NOW',type,detail});}
    function saveActiveAttemptSeal(seal){__lastSeal=JSON.parse(JSON.stringify(seal));return true;}
  `,ctx);
  for(const fn of ['deriveSecretHash','teacherSecretMatches','recoveryCodeMatches','persistActiveAttemptSeal','lockTap','normLoginName','tryUnlock','teacherLogin']){
    vm.runInContext(extractFunction(secure,fn),ctx);
  }
  assert(await vm.runInContext(`teacherSecretMatches(${JSON.stringify(TEACHER)})`,ctx), 'E3 secure dynamic: Teacher/Admin secret matches Teacher/Admin branch');
  assert(!(await vm.runInContext(`teacherSecretMatches(${JSON.stringify(RECOVERY)})`,ctx)), 'E3 secure dynamic: Recovery Code cannot authenticate as Teacher/Admin');
  assert(await vm.runInContext(`recoveryCodeMatches(${JSON.stringify(RECOVERY)})`,ctx), 'E3 secure dynamic: Recovery Code matches Recovery branch');
  assert(!(await vm.runInContext(`recoveryCodeMatches(${JSON.stringify(TEACHER)})`,ctx)), 'E3 secure dynamic: Teacher/Admin secret does not substitute for Recovery Code');

  els.teacherName.value='Teacher'; els.teacherPin.value=RECOVERY;
  await vm.runInContext('teacherLogin()',ctx);
  assert(els.teacherPanel.classList.contains('hidden'), 'E3 secure dynamic: Recovery Code does not open teacher panel');
  els.teacherPin.value=TEACHER;
  await vm.runInContext('teacherLogin()',ctx);
  assert(!els.teacherPanel.classList.contains('hidden'), 'E3 secure dynamic: Teacher/Admin secret opens teacher panel');

  const before=vm.runInContext(`JSON.stringify({ATTEMPT_ID,TIMER_DEADLINE,ACTIVE_IDENTITY_HASH,ACTIVE_KEY,JOKER_USED,JOKER_SELECTED_AT,JOKER_CHOICE,STARTED_AT,RESP})`,ctx);
  els.unlockInp.value=TEACHER;
  await vm.runInContext('tryUnlock()',ctx);
  assert(vm.runInContext('LOCKED',ctx)===true, 'E3 secure dynamic: Teacher/Admin secret cannot unlock through the Recovery path');

  vm.runInContext(`SEC_EVENTS=[{t:'2026-10-02T15:05:00.000Z',type:'locked',detail:'Student left window'}]; LOCKED=true; LOCK_REASON='Student left window';`,ctx);
  els.unlockInp.value=RECOVERY;
  await vm.runInContext('tryUnlock()',ctx);
  const after=vm.runInContext(`JSON.stringify({ATTEMPT_ID,TIMER_DEADLINE,ACTIVE_IDENTITY_HASH,ACTIVE_KEY,JOKER_USED,JOKER_SELECTED_AT,JOKER_CHOICE,STARTED_AT,RESP})`,ctx);
  assert(before===after, 'E3 secure dynamic: Recovery unlock preserves attemptId, deadline, identity, variant, joker choice, start time and answers');
  assert(vm.runInContext('LOCKED',ctx)===false, 'E3 secure dynamic: valid Recovery Code unlocks the current attempt');
  assert(vm.runInContext(`SEC_EVENTS.length===2 && SEC_EVENTS[0].type==='locked' && SEC_EVENTS[1].type==='recovery-unlock'`,ctx), 'E3 secure dynamic: Recovery unlock appends to existing securityEvents instead of replacing them');
  assert(vm.runInContext(`__lastSeal && __lastSeal.attemptId==='ATT-E3-001' && __lastSeal.timerDeadline===1999999999999 && __lastSeal.identityHash==='IDENTITY-HASH-001' && __lastSeal.activeKey==='VARIANT-B' && __lastSeal.jokerUsed===true`,ctx), 'E3 secure dynamic: persisted active-attempt seal retains immutable attempt identity/variant/joker/deadline');

  els.unlockReveal.classList.add('hidden');
  vm.runInContext('LOCK_TAPS=0; lockTap(); lockTap(); lockTap(); lockTap();',ctx);
  assert(els.unlockReveal.classList.contains('hidden'), 'E3 secure dynamic: fewer than five lock taps do not reveal Recovery input');
  vm.runInContext('lockTap()',ctx);
  assert(!els.unlockReveal.classList.contains('hidden'), 'E3 secure dynamic: fifth lock tap reveals Recovery input');
}

// Execute the real instant runtime authentication/unlock functions.
{
  const els={
    't-name':makeEl(), 't-pin':makeEl(), 't-err':makeEl(true), 't-login':makeEl(false), 't-panel':makeEl(true), 't-body':makeEl(),
    unlockInp:makeEl(), unlockReveal:makeEl(true), lockScreen:makeEl(false)
  };
  const ctx={
    console, TextEncoder, Uint8Array, crypto:crypto.webcrypto, window:{crypto:crypto.webcrypto, TextEncoder},
    btoa:s=>Buffer.from(s,'binary').toString('base64'), setTimeout:()=>1, clearTimeout:()=>{},
    CFG:{testId:TEST_ID,ucitelPinHash:teacherHash,recoveryCodeHash:recoveryHash,ucitelJmeno:'Teacher',activeGroupKey:'GROUP-A',activeVariantKey:'VARIANT-A'},
    I:id=>els[id]||makeEl(),
    hide:id=>{const e=els[id];if(e)e.classList.add('hidden');}, show:id=>{const e=els[id];if(e)e.classList.remove('hidden');},
    b64Url:buf=>Buffer.from(new Uint8Array(buf)).toString('base64url'),
    T:k=>k, buildTeacherBody:()=>'<p>teacher</p>'
  };
  vm.createContext(ctx);
  vm.runInContext(`
    var teacherLogged=false, locked=true, unlockBusy=false, LOCK_TAPS=0, LOCK_TAP_TIMER=null;
    var attemptId='INSTANT-ATT-1', timerDeadline=1888888888888, jokerUsed=true, jokerSelectedAt='2026-10-02T15:00:05.000Z';
    var securityEvents=[{type:'lock',detail:'left',ts:'before'}], warningCount=1;
    function recordSecurityEvent(type,detail){securityEvents.push({type,detail,ts:'NOW'});warningCount=securityEvents.length;}
  `,ctx);
  for(const fn of ['deriveSecretHashClient','teacherSecretMatches','recoveryCodeMatches','doTeacherLogin','tryUnlock','lockTap']){
    vm.runInContext(extractFunction(instant,fn),ctx);
  }
  els['t-name'].value='Teacher'; els['t-pin'].value=RECOVERY;
  await vm.runInContext('doTeacherLogin()',ctx);
  assert(vm.runInContext('teacherLogged',ctx)===false, 'E3 instant dynamic: Recovery Code does not open teacher panel');
  els['t-pin'].value=TEACHER;
  await vm.runInContext('doTeacherLogin()',ctx);
  assert(vm.runInContext('teacherLogged',ctx)===true, 'E3 instant dynamic: Teacher/Admin secret opens teacher panel');

  const before=vm.runInContext(`JSON.stringify({attemptId,timerDeadline,jokerUsed,jokerSelectedAt,group:CFG.activeGroupKey,variant:CFG.activeVariantKey})`,ctx);
  vm.runInContext('locked=true;',ctx); els.unlockInp.value=TEACHER;
  await vm.runInContext('tryUnlock()',ctx);
  assert(vm.runInContext('locked',ctx)===true, 'E3 instant dynamic: Teacher/Admin secret cannot unlock through Recovery path');
  vm.runInContext(`securityEvents=[{type:'lock',detail:'left',ts:'before'}]; locked=true;`,ctx); els.unlockInp.value=RECOVERY;
  await vm.runInContext('tryUnlock()',ctx);
  const after=vm.runInContext(`JSON.stringify({attemptId,timerDeadline,jokerUsed,jokerSelectedAt,group:CFG.activeGroupKey,variant:CFG.activeVariantKey})`,ctx);
  assert(before===after, 'E3 instant dynamic: Recovery unlock preserves attempt id, deadline, variant and joker state');
  assert(vm.runInContext(`!locked && securityEvents.length===2 && securityEvents[0].type==='lock' && securityEvents[1].type==='recovery-unlock'`,ctx), 'E3 instant dynamic: valid Recovery Code unlocks and appends an audit event');

  els.unlockReveal.classList.add('hidden'); vm.runInContext('LOCK_TAPS=0; lockTap(); lockTap(); lockTap(); lockTap();',ctx);
  assert(els.unlockReveal.classList.contains('hidden'), 'E3 instant dynamic: fewer than five lock taps do not reveal Recovery input');
  vm.runInContext('lockTap()',ctx);
  assert(!els.unlockReveal.classList.contains('hidden'), 'E3 instant dynamic: fifth lock tap reveals Recovery input');
}

if(process.exitCode) process.exit(process.exitCode);
console.log('PASS E3 runtime privilege-boundary gate');
