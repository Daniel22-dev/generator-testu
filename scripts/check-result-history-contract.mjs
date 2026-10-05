// Synthetic result retention and aggregate-size contract.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const now='2026-10-05T12:00:00Z',c=vm.createContext({SEC_EVENTS:[],LOCKED:false,LOCK_REASON:'',stableRuntimeStringify:JSON.stringify,stopSplitMonitor(){},$:()=>({classList:{remove(){}},textContent:''}),applyGuardUi(){}});
vm.runInContext(fs.readFileSync('src/js/13df-secure-critical-history.js','utf8'),c);vm.runInContext(vm.runInContext('SECURE_CRITICAL_HISTORY_JS',c),c);
c.SEC_EVENTS.push({t:now,type:'attempt-start'},{t:now,type:'joker-used'},{t:now,type:'page-resumed',detail:'Synthetic early event'});
for(let i=0;i<130;i++)c.SEC_EVENTS.push({t:now,type:'focus-transition'});
const paste={t:now,type:'large-paste',chars:600};c.SEC_EVENTS.push(paste);c.appendCriticalEvent(paste);
let result=c.resultSecurityEvents();assert.ok(result.some(e=>e.type==='large-paste'));assert.ok(result.some(e=>e.type==='page-resumed'));assert.ok(result.length>130);assert.equal(vm.runInContext('ROUTINE_HISTORY_TRUNCATED',c),false);
for(let i=0;i<2100;i++)c.SEC_EVENTS.push({t:now,type:'focus-transition'});
for(let i=0;i<900;i++)c.appendCriticalEvent({t:now,type:'left-window'});
result=c.resultSecurityEvents();const n=vm.runInContext('CRITICAL_EVENTS.length',c);assert.equal(n,902);assert.ok(result.length+n<=2048);assert.equal(vm.runInContext('ROUTINE_HISTORY_TRUNCATED',c),true);assert.ok(result.some(e=>e.type==='attempt-start'));assert.ok(result.some(e=>e.type==='joker-used'));assert.ok(result.some(e=>e.type==='large-paste'));
console.log('PASS result history: ordinary retention, critical insertion record, explicit bounded projection');
