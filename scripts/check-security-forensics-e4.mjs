import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const secure = read('src/js/13e-secure-student-runtime.js');
const instant = read('src/js/14b-instant-test-runtime.js');
const verifier = read('src/js/13f-secure-teacher-verifier.js');

function assert(cond,msg){ if(!cond){console.error('FAIL',msg);process.exitCode=1;} else console.log('PASS',msg); }
function extractFunction(src,name){
  const re=new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`); const m=re.exec(src); if(!m)throw new Error('Function not found: '+name);
  const start=m.index, brace=src.indexOf('{',start); let depth=0,quote='',esc=false,line=false,block=false;
  for(let i=brace;i<src.length;i++){const c=src[i],n=src[i+1]||''; if(line){if(c==='\n')line=false;continue;} if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;} if(quote){if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(c===quote)quote='';continue;} if(c==='/'&&n==='/'){line=true;i++;continue;}if(c==='/'&&n==='*'){block=true;i++;continue;}if(c==='\''||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return src.slice(start,i+1);} throw new Error('Unbalanced '+name);
}
function makeEl(hidden=false){const c=new Set(hidden?['hidden']:[]);return{value:'',textContent:'',style:{},classList:{add:(...x)=>x.forEach(v=>c.add(v)),remove:(...x)=>x.forEach(v=>c.delete(v)),contains:x=>c.has(x)},focus(){}};}

assert(/recordSec\('recovery-unlock'/.test(secure), 'E4 secure: successful Classroom Recovery unlock has explicit recovery-unlock event');
assert(/lockReason:priorReason/.test(secure) && /lockAt:/.test(secure), 'E4 secure: recovery-unlock preserves previous lock reason and lock timestamp');
assert(/recordSecurityEvent\('recovery-unlock'/.test(instant), 'E4 instant: successful Classroom Recovery unlock has explicit recovery-unlock event');
assert(/lockReason:String\(priorLock&&priorLock\.detail/.test(instant), 'E4 instant: recovery-unlock preserves previous lock reason');
assert(/sev===\'info\'/.test(verifier) && /recovery odemčení aktuálního pokusu/.test(verifier), 'E4 verifier: recovery unlock is rendered as audit/info, not hard/soft issue');
assert(/filter\(x=>x\.sev!==\'info\'\)/.test(verifier), 'E4 verifier: audit-only recovery unlock is excluded from security issue count');
assert(/security_audit_info/.test(verifier) && /security_event_timeline/.test(verifier), 'E4 exports: results CSV retains audit info and full security event timeline');
assert(/results:RESULTS/.test(verifier), 'E4 exports: archive JSON retains result objects including securityEvents');

// Execute real secure tryUnlock twice to prove LOCK -> RECOVERY UNLOCK -> LOCK -> RECOVERY UNLOCK is reconstructible.
{
  const els={unlockInp:makeEl(),lockScreen:makeEl(false),unlockReveal:makeEl(true),lockReasonBox:makeEl()};
  const ctx={console,setTimeout:()=>1,clearTimeout:()=>{},$:id=>els[id]||makeEl(),t:(k,f)=>f||k,
    SEC_EVENTS:[],LOCKED:true,LOCK_REASON:'first reason',UNLOCK_BUSY:false,LOCK_TAPS:0,CFG:{},
    recoveryCodeMatches:async v=>v==='REC',persistActiveAttemptSeal:()=>true};
  ctx.recordSec=function(type,detail,extra){const ev={t:'T'+(ctx.SEC_EVENTS.length+1),type,detail:detail||''};Object.assign(ev,extra||{});ctx.SEC_EVENTS.push(ev);};
  vm.createContext(ctx); vm.runInContext(extractFunction(secure,'tryUnlock'),ctx);
  ctx.SEC_EVENTS.push({t:'L1',type:'locked',detail:'first reason'}); els.unlockInp.value='REC'; await vm.runInContext('tryUnlock()',ctx);
  ctx.LOCKED=true;ctx.LOCK_REASON='second reason';ctx.SEC_EVENTS.push({t:'L2',type:'locked',detail:'second reason'});els.unlockInp.value='REC';await vm.runInContext('tryUnlock()',ctx);
  const seq=ctx.SEC_EVENTS.map(e=>e.type).join('>');
  assert(seq==='locked>recovery-unlock>locked>recovery-unlock','E4 secure dynamic: repeated lock/recovery-unlock cycles remain ordered and reconstructible');
  assert(ctx.SEC_EVENTS[1].lockReason==='first reason'&&ctx.SEC_EVENTS[3].lockReason==='second reason','E4 secure dynamic: each recovery unlock carries its own preceding lock reason');
}

// Verifier dynamic semantics: recovery unlock is info-only; lock remains a security issue.
{
  const ctx={console,Set,Math,Date,CONFIG:{cas:0,identityMode:'name',roster:[]},
    duplicateInfo:()=>({}),duplicateWarningsFor:()=>[],answerChangeTotal:()=>0,durationMinutes:()=>null,rosterHasCode:()=>true,submittedCode:()=>''};
  vm.createContext(ctx);
  for(const fn of ['eventCount','eventTime','eventDetails','recoveryUnlockEvents','legacyUnlockEvents','securityEventTimelineText','securitySignalsFor','securityIssueCount','securitySignalText','securityAuditText']) vm.runInContext(extractFunction(verifier,fn),ctx);
  const onlyAudit={status:'OK',securityEvents:[{t:'1',type:'recovery-unlock',detail:'unlocked',lockReason:'left window'}],details:[],answerChangeStats:{}};
  ctx.r=onlyAudit;
  assert(vm.runInContext('securityIssueCount(r)',ctx)===0,'E4 verifier dynamic: recovery unlock alone does not count as a security issue');
  assert(vm.runInContext('securityAuditText(r,{}).length',ctx)===1,'E4 verifier dynamic: recovery unlock remains visible as audit information');
  const cycle={status:'OK',securityEvents:[{t:'1',type:'locked',detail:'first reason'},{t:'2',type:'recovery-unlock',detail:'unlocked',lockReason:'first reason'},{t:'3',type:'locked',detail:'second reason'},{t:'4',type:'recovery-unlock',detail:'unlocked',lockReason:'second reason'}],details:[],answerChangeStats:{}};
  ctx.r=cycle;
  const sig=vm.runInContext('securitySignalText(r,{})',ctx).join(' | '), aud=vm.runInContext('securityAuditText(r,{})',ctx).join(' | '), timeline=vm.runInContext('securityEventTimelineText(r)',ctx);
  assert(sig.includes('záznamů: 2')&&sig.includes('first reason')&&sig.includes('second reason'),'E4 verifier dynamic: lock count and both reasons are visible');
  assert(aud.includes('záznamů: 2')&&aud.includes('first reason')&&aud.includes('second reason'),'E4 verifier dynamic: recovery count and linked lock reasons are visible');
  assert(timeline.indexOf('locked')<timeline.indexOf('recovery-unlock')&&timeline.split('recovery-unlock').length-1===2,'E4 verifier dynamic: exported timeline preserves event order');
}

if(process.exitCode)process.exit(process.exitCode);
console.log('PASS E4 forensic audit gate');
