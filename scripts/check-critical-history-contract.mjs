// Synthetic regression of bounded critical history and monotonic transitions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const element={textContent:'',classList:{remove(){}}};
const c=vm.createContext({console,SEC_EVENTS:[],LOCKED:false,LOCK_REASON:'',stableRuntimeStringify:v=>JSON.stringify(v,Object.keys(v||{}).sort()),stopSplitMonitor(){},$:()=>element,applyGuardUi(){}});
vm.runInContext(fs.readFileSync('src/js/13df-secure-critical-history.js','utf8'),c);
vm.runInContext(vm.runInContext('SECURE_CRITICAL_HISTORY_JS',c),c);
// Use the same stable recursive serializer as the runtime when comparing nested lists.
c.stableRuntimeStringify=function stringify(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stringify).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stringify(v[k])).join(',')+'}';};
const event={t:'2026-10-05T10:00:00Z',type:'locked',detail:'Synthetic reason'};
c.appendCriticalEvent({...event});
const a=vm.runInContext('({criticalEvents:CRITICAL_EVENTS.slice(),criticalCounters:{...CRITICAL_COUNTERS},criticalOverflow:CRITICAL_EVENTS_OVERFLOW,criticalHistoryLegacy:CRITICAL_HISTORY_LEGACY})',c);
assert.equal(a.criticalCounters.locks,1);assert.equal(c.validCriticalState(a),true);
c.appendCriticalEvent({...event,type:'recovery-unlock'});
const b=vm.runInContext('({criticalEvents:CRITICAL_EVENTS.slice(),criticalCounters:{...CRITICAL_COUNTERS},criticalOverflow:CRITICAL_EVENTS_OVERFLOW,criticalHistoryLegacy:CRITICAL_HISTORY_LEGACY})',c);
assert.equal(c.criticalStateExtends(b,a),true);assert.equal(c.criticalStateExtends(a,b),false);
for(let i=2;i<901;i++)c.appendCriticalEvent({...event});
const full=vm.runInContext('({criticalEvents:CRITICAL_EVENTS.slice(),criticalCounters:{...CRITICAL_COUNTERS},criticalOverflow:CRITICAL_EVENTS_OVERFLOW,criticalHistoryLegacy:CRITICAL_HISTORY_LEGACY})',c);
assert.equal(full.criticalEvents.length,902);assert.equal(full.criticalOverflow,true);assert.equal(c.LOCKED,true);assert.equal(c.validCriticalState(full),true);
console.log('PASS critical history: retained counters, monotonic transitions, bounded overflow lock');
