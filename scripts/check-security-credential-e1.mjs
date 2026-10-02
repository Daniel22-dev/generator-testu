import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const shell = read('src/shell.html');
const core = read('src/js/01-core.js');
const persistence = read('src/js/02-state-persistence.js');
const ui = read('src/js/03-ui-render.js');
const form = read('src/js/05-form-fields.js');

function assert(cond, msg){ if(!cond){ console.error('FAIL', msg); process.exitCode = 1; } else console.log('PASS', msg); }

const step3 = shell.slice(shell.indexOf('id="step3"'), shell.indexOf('id="jokerField"'));
assert(/id="ucitelPin"/.test(step3), 'E1: teacher/admin secret field exists');
assert(/id="recoveryCode"/.test(step3), 'E1: separate recovery field exists');
assert(/TAJNÝ/.test(step3) && /Recovery kód/.test(step3), 'E1: UI clearly distinguishes secret teacher credential from recovery');
assert(!/Používáš jeden kód|Jediný kód pro učitelský mód/.test(step3), 'E1: step 3 no longer claims one shared code');
assert(/SENSITIVE_FIELD_IDS\s*=\s*\[[^\]]*'ucitelPin'[^\]]*'recoveryCode'/.test(core), 'E1: both credentials are marked sensitive');
assert(/function recoveryCodeValue\(\)/.test(core) && /function syncRecoveryCode\(\)/.test(core), 'E1: recovery has independent value/sync helpers');
assert(/function fillTeacherAdminSecret\(\)/.test(core) && /function fillRecoveryCode\(\)/.test(core), 'E1: teacher and recovery generation helpers are separate');
assert(!/legacy\.value\s*=\s*normalized/.test(core), 'E1: teacher secret is no longer mirrored into legacy unlock field');
assert(/REC-' \+ randomChunk\(4\) \+ '-' \+ randomChunk\(4\)/.test(core), 'E1: recovery generation uses randomChunk/WebCrypto path');
assert(/state\.testMode\s*===\s*'prisny'\s*\|\|\s*!!state\.screenGuard/.test(core), 'E1: strict mode or screenGuard requires recovery');
assert(/ensureRecoveryCodeForGuard\(\)/.test(ui), 'E1: UI mode changes trigger recovery provisioning');
assert(/function credentialPolicyErrors\(/.test(form) && /teacher===recovery/.test(form) && /Recovery kód nesmí být stejný/.test(form), 'E1: validation rejects identical teacher/recovery values');
assert(/teacher\.length<12/.test(form), 'E1: teacher secret retains minimum 12-character strength gate');
assert(/recovery\.length<8/.test(form), 'E1: manual recovery code has a minimum strength floor');
assert(/trim\('recoveryCode'\)/.test(persistence), 'E1: persistence sanitizer includes recovery raw value');
assert(/Recovery kód tohoto testu/.test(shell) && /Tajný učitelský\/admin kód k běžnému odemčení nepoužívej/.test(shell), 'E1: download guidance uses recovery, not teacher secret');

if(process.exitCode) process.exit(process.exitCode);
console.log('PASS E1 credential model + generator UX gate');
