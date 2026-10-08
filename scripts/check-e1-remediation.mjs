#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

const fail=(m)=>{throw new Error('E1 REMEDIATION FAIL: '+m)};
const pass=(m)=>console.log('PASS',m);
const must=(v,m)=>{if(!v)fail(m)};
const read=(p)=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');

const student=(fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+read('src/js/13dh-secure-student-submit.js')+'\n'+read('src/js/13e-secure-student-runtime.js'));
const verifier=read('src/js/13f-secure-teacher-verifier.js');
const formsSrc=read('src/js/13ea-secure-verifier-forms.js');

must(student.includes("indexedDB.open('testgen-secure-state-v2'"),'signed persistence IndexedDB is missing');
must(student.includes("generateKey({name:'HMAC',hash:'SHA-256'},false,['sign','verify'])"),'non-extractable HMAC key is missing');
must(student.includes("crypto.subtle.sign('HMAC'" )&&student.includes("crypto.subtle.verify('HMAC'"),'HMAC signing/verification is incomplete');
must(student.includes("loadSignedRecord('activeAttempt')")&&student.includes("loadSignedRecord('attemptGuard')"),'active attempt + durable guard are not jointly validated');
must(student.includes("Number(local.rev)!==Number(dbrec.rev)"),'revision mismatch/replay detection is missing');
must(student.includes("state:'submitted'")&&student.includes("submittedLocked()"),'durable submitted guard is missing');
must(student.includes('resp:RESP')&&student.includes('restoreResponseUi()'),'in-progress response persistence/restore is missing');
must(student.includes('async function flushPendingAttemptWrites()'),'pending persistence flush is missing');
const submitAt=student.indexOf('async function submitSecureTest(');
must(submitAt>=0,'submitSecureTest definition is missing');
const submitChunk=student.slice(submitAt,submitAt+2600);
must(submitChunk.indexOf('await flushPendingAttemptWrites()')>=0,'submit does not drain pending active-attempt writes');
must(submitChunk.indexOf('await flushPendingAttemptWrites()')<submitChunk.indexOf('await setSubmittedLocked()'),'submitted guard can race with an older active-attempt write');
must(submitChunk.includes('await clearActiveAttemptSeal(false)'),'submit does not preserve submitted guard while clearing active state');
pass('student persistence is signed, revisioned, redundant and submit-race hardened');

must(verifier.includes('diffRosterSalt:cfg.diffRosterSalt')&&verifier.includes('studentHashes'), 'teacher verifier does not carry differentiated roster binding data');
const formCtx=vm.createContext({});
vm.runInContext(formsSrc+'\n;globalThis.__forms=SECURE_VERIFIER_FORMS_JS;',formCtx);
const forms=formCtx.__forms;
must(typeof forms==='string'&&forms.includes('async function payloadBindingError(payload)'), 'payload binding verifier helper missing');
const bindingAt=forms.indexOf('bindingError=await payloadBindingError(checked)'),schemaAt=forms.indexOf('validateSecurePayload(payload)'),anchorAt=forms.indexOf('evaluateFormsAnchors(checked,sm)'),scoreAt=forms.indexOf('scored=scorePayload(checked)');
must(bindingAt>=0&&schemaAt>=0&&anchorAt>=0&&scoreAt>bindingAt&&scoreAt>schemaAt&&scoreAt>anchorAt, 'payload schema, identity binding and Forms anchors are not enforced before scoring');
must(forms.includes('validateSecurePayload(candidate)')&&forms.includes("error.validationCode!=='schema.code'")&&forms.includes("'identity.recovery-hash'")&&forms.includes("'IDENTITY_REVIEW'")&&forms.includes('async function confirmFormsIdentity('), 'manual identity candidate must retain schema/hash checks and explicit teacher confirmation');

const norm=(value)=>String(value??'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const b64url=(buf)=>Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const salt='e1-remediation-salt';
async function rosterHash(value){
  const input='GIT-DIFF-ROSTER-V1|'+salt+'|'+norm(value);
  return b64url(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(input)));
}
const a=await rosterHash('CODE-A'), b=await rosterHash('CODE-B');
const ctx=vm.createContext({
  crypto:webcrypto,
  TextEncoder,
  TextDecoder,
  btoa:(s)=>Buffer.from(s,'binary').toString('base64'),
  atob:(s)=>Buffer.from(s,'base64').toString('binary'),
  window:{TextEncoder},
  CONFIG:{identityMode:'oneTimeCode',diffRosterSalt:salt,roster:[{code:'CODE-A'},{code:'CODE-B'}],diffGroups:[{key:'g1',studentHashes:[a]},{key:'g2',studentHashes:[b]}]},
  VARIANTS_FULL:{g1:[],g2:[]},
  console
});
vm.runInContext(forms+'\n;globalThis.__payloadBindingError=payloadBindingError;',ctx);
const binding=ctx.__payloadBindingError;
must(await binding({identityMode:'oneTimeCode',code:'CODE-A',student:'CODE-A',groupKey:'g1'})==='','correct student-variant binding is rejected');
const wrong=await binding({identityMode:'oneTimeCode',code:'CODE-A',student:'CODE-A',groupKey:'g2'});
must(/student-varianta/i.test(wrong),'forged groupKey is not rejected');
const unknown=await binding({identityMode:'oneTimeCode',code:'UNKNOWN',student:'UNKNOWN',groupKey:'g1'});
must(/rosteru/i.test(unknown),'unknown one-time code is not rejected by verifier binding');
pass('teacher verifier rejects forged student-variant binding before scoring');

console.log('E1 REMEDIATION STATIC/DYNAMIC GATE PASSED');
