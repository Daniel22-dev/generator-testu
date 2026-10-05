// Bounded independent secure attempt audit. No network dependency.
const SECURE_CRITICAL_HISTORY_JS=String.raw`
// The independent critical history has a reserved overflow record and final lock.
const CRITICAL_EVENT_LIMIT=900;
const CRITICAL_EVENT_TYPES=['locked','recovery-unlock','bad-unlock','persistence-integrity','attempt-resumed-after-reload','page-discarded','page-restored','left-window','large-paste','paste-blocked','critical-events-overflow'];
let CRITICAL_EVENTS=[],CRITICAL_COUNTERS={locks:0,unlocks:0,resumes:0,badUnlocks:0},CRITICAL_EVENTS_OVERFLOW=false,CRITICAL_HISTORY_LEGACY=false;
function criticalCounts(events){var out={locks:0,unlocks:0,resumes:0,badUnlocks:0};events.forEach(function(e){var k=({locked:'locks','recovery-unlock':'unlocks','attempt-resumed-after-reload':'resumes','bad-unlock':'badUnlocks'})[e.type];if(k)out[k]++;});return out;}
function validCriticalState(body){
  if(body.criticalEvents===undefined&&body.criticalCounters===undefined)return body.criticalOverflow===undefined&&body.criticalHistoryLegacy===undefined;
  var list=body.criticalEvents,c=body.criticalCounters;
  if(!Array.isArray(list)||list.length>CRITICAL_EVENT_LIMIT+2||!c||typeof c!=='object'||Array.isArray(c)||typeof body.criticalOverflow!=='boolean'||typeof body.criticalHistoryLegacy!=='boolean')return false;
  if(!list.every(function(e,i){return e&&CRITICAL_EVENT_TYPES.indexOf(e.type)!==-1&&e.criticalSeq===i+1;}))return false;
  if(stableRuntimeStringify(c)!==stableRuntimeStringify(criticalCounts(list)))return false;
  var overflow=list.filter(function(e){return e.type==='critical-events-overflow';});
  return body.criticalOverflow?list.length===CRITICAL_EVENT_LIMIT+2&&overflow.length===1&&list[CRITICAL_EVENT_LIMIT].type==='critical-events-overflow'&&list[CRITICAL_EVENT_LIMIT+1].type==='locked':list.length<=CRITICAL_EVENT_LIMIT&&overflow.length===0;
}
function criticalStateExtends(newer,older){
  if(!validCriticalState(newer)||!validCriticalState(older))return false;
  if(older.criticalEvents===undefined)return true;
  if(newer.criticalEvents===undefined||newer.criticalEvents.length<older.criticalEvents.length||older.criticalOverflow&&!newer.criticalOverflow||older.criticalHistoryLegacy&&!newer.criticalHistoryLegacy)return false;
  return older.criticalEvents.every(function(e,i){return stableRuntimeStringify(e)===stableRuntimeStringify(newer.criticalEvents[i]);})&&Object.keys(older.criticalCounters).every(function(k){return newer.criticalCounters[k]>=older.criticalCounters[k];});
}
function appendCriticalEvent(ev){
  if(CRITICAL_EVENT_TYPES.indexOf(ev.type)===-1||CRITICAL_EVENTS_OVERFLOW)return;
  if(CRITICAL_EVENTS.length>=CRITICAL_EVENT_LIMIT){
    CRITICAL_EVENTS_OVERFLOW=true;LOCKED=true;LOCK_REASON='critical events capacity reached';
    var overflow={t:ev.t,type:'critical-events-overflow',detail:'critical history capacity reached',criticalSeq:CRITICAL_EVENTS.length+1};CRITICAL_EVENTS.push(overflow);SEC_EVENTS.push(overflow);
    var lock={t:ev.t,type:'locked',detail:LOCK_REASON,criticalSeq:CRITICAL_EVENTS.length+1};CRITICAL_EVENTS.push(lock);SEC_EVENTS.push(lock);CRITICAL_COUNTERS=criticalCounts(CRITICAL_EVENTS);
    stopSplitMonitor();if($('lockReasonBox'))$('lockReasonBox').textContent=LOCK_REASON;$('lockScreen').classList.remove('hidden');applyGuardUi(true);return;
  }
  ev.criticalSeq=CRITICAL_EVENTS.length+1;CRITICAL_EVENTS.push(Object.assign({},ev));CRITICAL_COUNTERS=criticalCounts(CRITICAL_EVENTS);
}
function restoreCriticalAudit(seal){
  CRITICAL_EVENTS=[];CRITICAL_COUNTERS=criticalCounts([]);CRITICAL_EVENTS_OVERFLOW=false;CRITICAL_HISTORY_LEGACY=false;
  if(!seal)return;
  if(!validCriticalState(seal)){PERSIST_INTEGRITY_BLOCK=true;CRITICAL_HISTORY_LEGACY=true;return;}
  if(Array.isArray(seal.criticalEvents)){CRITICAL_EVENTS=seal.criticalEvents.map(function(e){return Object.assign({},e);});CRITICAL_COUNTERS=Object.assign({},seal.criticalCounters);CRITICAL_EVENTS_OVERFLOW=seal.criticalOverflow;CRITICAL_HISTORY_LEGACY=seal.criticalHistoryLegacy;}
  else{CRITICAL_HISTORY_LEGACY=true;(seal.securityEvents||[]).forEach(function(e){appendCriticalEvent(Object.assign({},e));});}
  if(CRITICAL_EVENTS_OVERFLOW){LOCKED=true;LOCK_REASON='critical events capacity reached';}
}
function sealedCriticalIntegrity(body){
  if(!Array.isArray(body.criticalEvents))return;
  if(body.criticalEvents.some(function(e){return e.type==='persistence-integrity';})||body.criticalOverflow)return;
  var e={t:new Date().toISOString(),type:'persistence-integrity',detail:'state mismatch/replay/tamper detected',criticalSeq:body.criticalEvents.length+1};
  if(body.criticalEvents.length<CRITICAL_EVENT_LIMIT){body.criticalEvents=body.criticalEvents.concat([e]);body.criticalCounters=criticalCounts(body.criticalEvents);}
  else{body.criticalEvents=body.criticalEvents.concat([{t:e.t,type:'critical-events-overflow',detail:'critical history capacity reached',criticalSeq:CRITICAL_EVENT_LIMIT+1},{t:e.t,type:'locked',detail:'critical events capacity reached',criticalSeq:CRITICAL_EVENT_LIMIT+2}]);body.criticalOverflow=true;body.criticalCounters=criticalCounts(body.criticalEvents);}
}
let ROUTINE_HISTORY_TRUNCATED=false;
function resultSecurityEvents(){
  const routine=SEC_EVENTS.filter(function(e){return CRITICAL_EVENT_TYPES.indexOf(e.type)===-1;});
  // The result carries the critical projection twice; both lists share the 2048 budget.
  const limit=Math.max(0,2048-2*CRITICAL_EVENTS.length);
  ROUTINE_HISTORY_TRUNCATED=routine.length>limit;
  const head=ROUTINE_HISTORY_TRUNCATED?routine.filter(function(e){return e.type==='attempt-start'||e.type==='joker-used';}).slice(0,Math.min(2,limit)):[];
  const tail=ROUTINE_HISTORY_TRUNCATED?routine.filter(function(e){return head.indexOf(e)===-1;}).slice(-Math.max(0,limit-head.length)):routine;
  return head.concat(tail).concat(CRITICAL_EVENTS).sort(function(a,b){return Date.parse(a.t)-Date.parse(b.t);});
}

`;
