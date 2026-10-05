// Synthetic generator-session export contract; no credentials are persisted.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const source=fs.readFileSync('src/js/08b-secure-export-credentials.js','utf8');
function session(initial){let value=initial,n=0;const c=vm.createContext({normalizeCredentialInput:s=>s.trim().toUpperCase(),sha256HexText:async s=>createHash('sha256').update(s).digest('hex'),syncRecoveryCode:()=>value,setVal:(_,s)=>{value=s;},fillRecoveryCode:()=>{if(!value)value='REC-SYNTH-'+(++n);},uiConfirm:async()=>false});vm.runInContext(source,c);return {c,value:()=>value,set:v=>{value=v;}};}
const {c,value,set}=session('REC-SYNTH-INITIAL'),st={resultMode:'secureOffline',testMode:'prisny',screenGuard:true};
const first={};await c.registerSecureRecoveryExport(first,value());c.rememberSecureRecoveryExport(first);const initial=value();await c.prepareSecureRecoveryExport(st);assert.notEqual(value(),initial);
const second={};await c.registerSecureRecoveryExport(second,value());c.rememberSecureRecoveryExport(second);const used=value();set(used);vm.runInContext('recoveryCodeEditedByTeacher=true',c);await assert.rejects(()=>c.prepareSecureRecoveryExport(st),/Použitý Recovery kód/);
const fresh=session('');fresh.c.replaceRecoveryCode();assert.equal(vm.runInContext('lastSecureRecoveryExportHash',fresh.c),'');assert.ok(fresh.value());
console.log('PASS recovery export: distinct successful packages, manual reuse denied, fresh session identity');
