#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const fixture=read('audit/tests/fixtures.js');
const identity=read('audit/tests/identity_suite.py');
const browser=read('audit/tests/browser_matrix.py');
const journey=read('audit/tests/journey_suite.py');
const runner=read('audit/run_audit.py');
const failures=[];
const pass=(label,ok,detail='')=>{if(ok)console.log(`PASS F2: ${label}${detail?` - ${detail}`:''}`);else{console.error(`FAIL F2: ${label}${detail?` - ${detail}`:''}`);failures.push(label);}};

pass('audit fixture declares independent Teacher/Admin secret',/AUDIT_TEACHER_SECRET\s*=\s*['"][^'"]{12,}['"]/.test(fixture));
pass('audit fixture declares independent Recovery code',/AUDIT_RECOVERY_CODE\s*=\s*['"][^'"]{8,}['"]/.test(fixture));
const teach=(fixture.match(/AUDIT_TEACHER_SECRET\s*=\s*['"]([^'"]+)['"]/)||[])[1]||'';
const recovery=(fixture.match(/AUDIT_RECOVERY_CODE\s*=\s*['"]([^'"]+)['"]/)||[])[1]||'';
pass('Teacher/Admin and Recovery audit credentials are distinct',!!teach&&!!recovery&&teach!==recovery);
pass('audit fixture populates recoveryCode field',/recoveryCode\s*:\s*window\.AUDIT_RECOVERY_CODE/.test(fixture));
pass('legacy heslo fixture is empty',/heslo\s*:\s*['"]['"]/.test(fixture));

for(const token of ['unlock-password','CFG.hesloHash','secretMatches(']){
  pass(`identity journey contains no legacy ${token}`,!identity.includes(token));
}
pass('identity journey proves Recovery cannot teacher-login',identity.includes('recoveryCannotTeacherLogin'));
pass('identity journey proves Teacher cannot recovery-unlock',identity.includes('teacherCannotRecoveryUnlock'));
pass('identity journey reveals Recovery input through the five-tap lock affordance',identity.includes("#lockIcon")&&identity.includes('range(5)'));
pass('identity journey opens Verifier fallback details before paste',/data-v2-panel=["\']results["\'][^\n]+fallbackImportDetails[^\n]+open=true[^\n]+pasteBox/.test(identity));
pass('browser matrix opens Verifier fallback details before paste',/data-v2-panel=["\']results["\'][^\n]+fallbackImportDetails[^\n]+open=true[^\n]+pasteBox/.test(browser));
pass('instant joker journey confirms irreversible choice',identity.includes(".modal-ov [data-jok]"));
pass('secure joker journey confirms irreversible choice',identity.includes(".s-modal-bd [data-confirm-ok]"));
pass('primary journey no longer searches for the removed shared-code button',!journey.includes('Doplnit náhodný kód'));
pass('primary journey uses the current Teacher/Admin generator',journey.includes('Vygenerovat tajný učitelský kód'));
pass('primary journey knows the current Recovery generator',journey.includes('Vygenerovat náhodný Recovery kód'));
pass('strict journey proves Teacher/Admin cannot unlock',journey.includes('Teacher/Admin secret must not unlock the student lock'));
pass('strict journey proves Recovery can unlock',journey.includes('Recovery code must unlock the current student lock'));
pass('primary journey discloses Verifier emergency fallback before paste',journey.includes("#fallbackImportDetails summary"));
pass('identity suite scenario cardinality stays 8',/['"]identity_suite['"]\s*:\s*\(['"]identity-suite\.json['"]\s*,\s*8\)/.test(runner));

if(failures.length){console.error(`F2 journey migration gate failed: ${failures.length} issue(s).`);process.exit(1);}
console.log('PASS F2 journey E2E migration gate');
