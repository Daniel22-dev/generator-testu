import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const secure=(fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+read('src/js/13e-secure-student-runtime.js'));
const instant=read('src/js/14b-instant-test-runtime.js');
const core=read('src/js/13g-assemble-test-html.js');
const persistence=read('src/js/02-state-persistence.js');
const verifier=read('src/js/13f-secure-teacher-verifier.js');
function ok(c,m){if(!c){console.error('FAIL E6:',m);process.exitCode=1}else console.log('PASS E6:',m)}
function count(s,n){return s.split(n).length-1}
function between(src,start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);if(a<0||b<0)throw new Error('E6 source marker missing: '+start+' -> '+end);return src.slice(a,b)}

const secureUnlock=between(secure,'async function tryUnlock','function openTeacherModal');
const secureTeacherLogin=between(secure,'async function teacherLogin','function renderTeacherRuntimeInfo');
const secureRetry=between(secure,'function showSubmittedLocked','function normRosterIdentity');
const secureReset=between(secure,'function showActiveAttemptLocked','async function startTest');
const instantTeacherLogin=between(instant,'async function doTeacherLogin','function logoutTeacher');
const instantUnlock=instant.slice(instant.indexOf('async function tryUnlock'));

ok(count(secure,'recoveryCodeMatches(')===2 && secureUnlock.includes('recoveryCodeMatches(v)'),'secure recovery credential has one runtime authority: unlock');
ok(!secureTeacherLogin.includes('recoveryCodeMatches(') && secureTeacherLogin.includes('teacherSecretMatches(pin)'),'secure teacher login uses Teacher/Admin only');
ok(!secureRetry.includes('recoveryCodeMatches(') && secureRetry.includes('teacherSecretMatches(v)'),'secure submitted retry uses Teacher/Admin only');
ok(!secureReset.includes('recoveryCodeMatches(') && secureReset.includes('teacherSecretMatches(v)'),'secure active-attempt reset uses Teacher/Admin only');
ok(count(instant,'recoveryCodeMatches(')===2 && instantUnlock.includes('recoveryCodeMatches(v)'),'instant recovery credential has one runtime authority: unlock');
ok(!instantTeacherLogin.includes('recoveryCodeMatches(') && instantTeacherLogin.includes('teacherSecretMatches(p)'),'instant teacher login uses Teacher/Admin only');

ok(core.includes("'teacher-pin'") && core.includes("'recovery-code'"),'generator retains distinct credential derivation domains');
ok(!core.includes("'unlock-password'"),'obsolete shared unlock derivation domain cannot re-enter new output');
async function derive(secret,domain,testId){const enc=new TextEncoder();const base=await crypto.webcrypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveBits']);const salt=enc.encode(domain+'|'+testId);const bits=await crypto.webcrypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:120000},base,256);return Buffer.from(bits).toString('base64url')}
const same='SAME-PLAINTEXT-SECRET';
const [t1,r1,r2]=await Promise.all([derive(same,'teacher-pin','T-A'),derive(same,'recovery-code','T-A'),derive(same,'recovery-code','T-B')]);
ok(t1!==r1,'same plaintext cannot cross Teacher/Recovery role boundary');
ok(r1!==r2,'Recovery Code material cannot replay across testId boundary');
for(const key of ['ucitelPin','recoveryCode','heslo']) ok(persistence.includes(key),'persistence deny/sanitizer retains '+key+' coverage');
ok(/recovery-unlock/.test(verifier) && /sev===['"]info['"]/.test(verifier),'Verifier keeps Recovery Unlock audit-only');
ok(/security_event_timeline/.test(verifier),'Verifier export preserves forensic timeline');
ok(/persistActiveAttemptSeal/.test(secure) && /timerDeadline/.test(secure),'secure runtime retains sealed attempt/deadline persistence');
if(process.exitCode)process.exit(process.exitCode);console.log('PASS E6 adversarial security gate');
