import fs from 'node:fs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const shell = read('src/shell.html');
const core = read('src/js/01-core.js');
const persistence = read('src/js/02-state-persistence.js');
const ui = read('src/js/03-ui-render.js');
const form = read('src/js/05-form-fields.js');
const labels = read('src/js/12-prompt-builder.js');
const extraLabels = read('src/js/12a-language-catalog.js');
const secureLabels = read('src/js/13d-secure-student-shell.js');
const secureIsolation = read('src/js/13da-secure-student-isolation.js');
const instantBuilders = read('src/js/14a-test-html-builders.js');

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
for(const text of ['Odemykací kód testu','Classroom Recovery Code','Código de recuperación del test','Wiederherstellungscode des Tests']){
  assert(labels.includes(text)&&secureLabels.includes(text)&&secureIsolation.includes(text), `E1: generated CS/EN/ES/DE lock labels include ${text}`);
}
for(const text of ["Code de r\\u00e9cup\\u00e9ration du test",'Codex recuperationis examinis']){
  assert(extraLabels.includes(text)&&secureIsolation.includes(text.replace(/\\u00e9/g,'é')), `E1: generated FR/LA lock labels include ${text}`);
}
for(const text of ['Učitelský přístupový kód','Teacher access code','Código de acceso del profesor','Lehrer-Zugangscode']){
  assert(labels.includes(text), `E1: generated CS/EN/ES/DE Teacher/Admin labels include ${text}`);
}
for(const text of ["Code d'acc\\u00e8s enseignant",'Codex accessus magistri']){
  assert(extraLabels.includes(text), `E1: generated FR/LA Teacher/Admin labels include ${text}`);
}
assert(!/unlockPh:'(?:Učitelský přístupový kód|Teacher access code|Código de acceso del profesor|Lehrer-Zugangscode)'/.test(labels+secureLabels),'E1: lock labels no longer identify Recovery as Teacher/Admin access');
assert(/<input type="password" id="unlockInp"[^>]*autocomplete="off"[^>]*autocorrect="off"[^>]*autocapitalize="off"[^>]*spellcheck="false"/.test(instantBuilders),'E1: instant Recovery input disables app-controlled autofill/correction hints');
assert(/id="t-pin"[^>]*L\.teacherAccess[^>]*autocomplete="off"[^>]*autocorrect="off"[^>]*autocapitalize="off"[^>]*spellcheck="false"/.test(instantBuilders),'E1: instant Teacher/Admin input is distinct and disables app-controlled autofill/correction hints');

if(process.exitCode) process.exit(process.exitCode);
console.log('PASS E1 credential model + generator UX gate');
