import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(p,'utf8');
const persistence = read('src/js/02-state-persistence.js');
const form = read('src/js/05-form-fields.js');
const scannerSource = read('src/js/09-selftest-keycheck.js');
const gemini = read('src/js/07-gemini.js');
const guide = read('src/js/14d-generator-release-guides.js');
const workflow = read('src/js/08a-output-workflow.js');

let failed = 0;
function assert(ok,msg){ if(ok) console.log('✅ '+msg); else { console.error('❌ '+msg); failed++; } }

// Static persistence contract.
assert(/SENSITIVE_FIELD_IDS\s*=\s*\[[^\]]*'ucitelPin'[^\]]*'recoveryCode'/.test(read('src/js/01-core.js')), 'E5: both credential DOM fields remain marked sensitive');
assert(/SENSITIVE_STORAGE_KEY_NAMES/.test(persistence) && /teacheradminsecret/.test(persistence) && /classroomrecoverycode/.test(persistence), 'E5: persistent storage has explicit raw-credential key denylist');
assert(/getStoredState\(\).*stripSensitiveKeysDeep/s.test(persistence), 'E5: stored state is recursively stripped before persistence/export');
assert(/function redactCredentialValuesDeep/.test(persistence) && /sanitizeStoredRecord\(record\).*redactCredentialValuesDeep/s.test(persistence), 'E5: current live credential values are recursively redacted from arbitrary stored string fields');
assert(/sanitizeStateForLoad\(raw\).*stripSensitiveKeysDeep/s.test(persistence), 'E5: imported/legacy state is recursively stripped before use');
assert(/rawSnap[\s\S]*sanitizeStoredRecord\(JSON\.parse\(rawSnap\)\)/.test(persistence), 'E5: migration physically scrubs the current snapshot');
assert(/saveTemplates\(t\).*sanitizeStoredArray\(t\)/s.test(persistence), 'E5: every template write passes through secret sanitizer');
assert(/saveHistory\(hist\).*sanitizeStoredArray\(hist\)/s.test(persistence), 'E5: every history write passes through secret sanitizer');
assert(/buildZadaniExport\(\).*sanitizeStoredRecord/s.test(persistence), 'E5: assignment export passes through secret sanitizer');
assert(/applyImportedZadani\(data\).*sanitizeStoredRecord\(data\)/s.test(persistence), 'E5: imported assignment is scrubbed before state replacement');

// Manual/AI workflow contract.
assert(form.includes('__TEACHER_ADMIN_SECRET_DOPLN_LOKALNE__'), 'E5: manual/AI prompt uses Teacher/Admin placeholder');
assert(form.includes('__CLASSROOM_RECOVERY_CODE_DOPLN_LOKALNE__'), 'E5: manual/AI prompt uses Classroom Recovery placeholder');
assert(!form.includes('__TEACHER_ACCESS_CODE_DOPLN_LOKALNE__'), 'E5: obsolete one-code placeholder is gone');
assert(!form.includes('Uživatel zadává jeden kód.'), 'E5: prompt no longer instructs AI to use one shared credential');
assert(form.includes('Recovery Code smí mít jedinou pravomoc'), 'E5: prompt documents the one-purpose recovery boundary');
assert(form.includes('teacher-pin|<testId>') && form.includes('recovery-code|<testId>'), 'E5: prompt documents independent per-test derivation domains');
assert(guide.includes('samostatným Recovery kódem konkrétního testu') && guide.includes('Tajný Teacher/Admin kód'), 'E5: current security guide describes the split credential workflow');
assert(/\['recoveryCode','Recovery kód'\]/.test(workflow), 'E5: changing Recovery Code after generation is tracked as output drift');

// Generated-output defenses.
assert(gemini.includes('TEACHER_ADMIN_SECRET|CLASSROOM_RECOVERY_CODE') || gemini.includes('(?:TEACHER_ADMIN_SECRET|CLASSROOM_RECOVERY_CODE)'), 'E5: generated HTML smoke check rejects leaked local credential placeholders');
assert(scannerSource.includes('RAW_TEST_CREDENTIAL_REGEXES'), 'E5: SecretScanner has dedicated raw test credential rules');
assert(scannerSource.includes('raw-teacher-admin-credential') && scannerSource.includes('raw-recovery-credential') && scannerSource.includes('credential-placeholder-leak'), 'E5: SecretScanner covers teacher, recovery and placeholder leaks');

// Dynamic test of the exact persistence sanitizers from production source.
function sliceBetween(text,startNeedle,endNeedle){
  const a=text.indexOf(startNeedle); const b=text.indexOf(endNeedle,a);
  if(a<0||b<0) throw new Error('Cannot extract '+startNeedle);
  return text.slice(a,b);
}
const sanitizerDefinitions = sliceBetween(persistence, 'const SENSITIVE_STORAGE_KEY_NAMES', 'function safeDomEntries')
  + '\n' + sliceBetween(persistence, 'function sanitizePromptForStorage', 'function clearOldUnsafeStorage');
const live = {heslo:'LEGACY-RAW-999',ucitelPin:'TEACH-RAW-123456',recoveryCode:'REC-AB12-CD34'};
const ctx = {
  cloneSafeStoredValue:v=>structuredClone(v),
  trim:id=>live[id]||'',
  structuredClone,
  console
};
vm.createContext(ctx);
vm.runInContext(sanitizerDefinitions+'\nglobalThis.__e5={stripSensitiveKeysDeep,sanitizeStoredRecord,sanitizePromptForStorage};',ctx);
const rawRecord = {
  id:1,
  dom:{nazev:'Safe',ucitelPin:live.ucitelPin,recoveryCode:live.recoveryCode,heslo:live.heslo},
  state:{exerciseConfig:[{typ:'mc',teacherAccessCode:'NESTED-TEACH',classroomRecoveryCode:'NESTED-REC',body:2}],safe:'ok'},
  prompt:'Učitelský přístupový kód: '+live.ucitelPin+'\nRecovery kód pro odemknutí testu: '+live.recoveryCode+'\nPoznámka: '+live.heslo,
  ordinaryNote:'Dočasně zapsáno '+live.ucitelPin+' / '+live.recoveryCode
};
const cleaned = ctx.__e5.sanitizeStoredRecord(rawRecord);
const serialized = JSON.stringify(cleaned);
for (const secret of [...Object.values(live),'NESTED-TEACH','NESTED-REC']) assert(!serialized.includes(secret), 'E5 dynamic: persisted artifact removes raw secret '+secret.slice(0,10)+'…');
assert(cleaned.prompt.includes('__TEACHER_ADMIN_SECRET_DOPLN_LOKALNE__'), 'E5 dynamic: stored prompt replaces Teacher/Admin line with placeholder');
assert(cleaned.prompt.includes('__CLASSROOM_RECOVERY_CODE_DOPLN_LOKALNE__'), 'E5 dynamic: stored prompt replaces Recovery line with placeholder');
assert(cleaned.state.exerciseConfig[0].body===2 && cleaned.state.safe==='ok', 'E5 dynamic: sanitizer preserves non-secret nested data');
assert(!cleaned.ordinaryNote.includes(live.ucitelPin) && !cleaned.ordinaryNote.includes(live.recoveryCode) && cleaned.ordinaryNote.includes('[NEULOŽENO]'), 'E5 dynamic: live credential values are redacted even under non-sensitive field names');

// Dynamic SecretScanner regression suite, using the production IIFE exactly.
const scannerBlock = sliceBetween(scannerSource, 'const SecretScanner = (function(){', '// Wrapper pro spuštění');
const scanCtx={console}; vm.createContext(scanCtx);
vm.runInContext(scannerBlock+'\nglobalThis.__scanner=SecretScanner;',scanCtx);
const scanRun=scanCtx.__scanner.runTests();
assert(scanRun.fail===0, 'E5 dynamic: SecretScanner built-in regression suite passes ('+scanRun.pass+'/'+scanRun.total+')');
const hashOnly=scanCtx.__scanner.assertSafeExport({fileName:'student_test.html',target:'student',content:'const CFG={ucitelPinHash:"abc",recoveryCodeHash:"def"};'});
assert(hashOnly.ok, 'E5 dynamic: derived credential hash fields remain allowed in student HTML');
const rawRecovery=scanCtx.__scanner.assertSafeExport({fileName:'student_test.html',target:'student',content:'const recoveryCode="REC-LEAK-1234";'});
assert(!rawRecovery.ok, 'E5 dynamic: raw Recovery Code is blocked by SecretScanner');

if(failed){
  console.error(`\nE5 secret hygiene gate FAILED (${failed} finding(s)).`);
  process.exit(1);
}
console.log('\n✅ E5 secret hygiene gate PASS.');
