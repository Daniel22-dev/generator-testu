import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixture=read('scripts/qa-generate-fixtures.mjs');
const workflow=read('tools/workflow-matrix-check.mjs');
const e6=read('scripts/check-security-adversarial-e6.mjs');
const behavior=read('scripts/check-security-behavior-r3.mjs');
const pkg=JSON.parse(read('package.json'));
function ok(c,m){if(!c){console.error('FAIL R3:',m);process.exitCode=1}else console.log('PASS R3:',m)}

ok(/setField\("ucitelPin",\s*"TEACH-QA-123456"\)/.test(fixture),'D7 fixture uses a policy-compliant Teacher/Admin secret');
ok(/setField\("recoveryCode",\s*"REC-QA12-3456"\)/.test(fixture),'D7 fixture provides a separate Recovery Code');
ok(!/setField\("heslo",\s*"QA-LOCK-2026"\)/.test(fixture),'D7 fixture no longer seeds the legacy shared code');
ok(/setVal\('recoveryCode','REC-AB12-CD34'\)/.test(workflow),'workflow resetBase seeds a separate Recovery Code');
ok(!workflow.includes("deriveSecretHash('unlock-password'"),'workflow matrix no longer derives the legacy unlock-password branch');
ok(!/unlock jednim kodem|jeden kod vytvari dva/i.test(workflow),'workflow matrix no longer asserts the one-code model');
ok(workflow.includes("value='teach-abcdef-123456'") && workflow.includes("value='rec-ab12-cd34'"),'workflow matrix exercises separate Teacher and Recovery runtime inputs');
ok(!e6.includes('authorizeSubmittedRetry') && !e6.includes('authorizeActiveAttemptReset'),'E6 no longer checks nonexistent authorization functions');
ok(e6.includes("function showSubmittedLocked") && e6.includes("function showActiveAttemptLocked"),'E6 targets real retry/reset runtime functions');
ok(behavior.includes("dist/index.html") && behavior.includes('JSDOM') && behavior.includes('applySettingsWithoutAi'),'R3 behavioral gate executes the built generator and drift path');
ok(behavior.includes('pack.teacherHtml') && behavior.includes('acorn.parse'),'R3 behavioral gate parses the generated Teacher Verifier');
ok(pkg.scripts?.['check:r3-security-behavior']==='node scripts/check-security-behavior-r3.mjs','R3 behavioral gate has an npm script');
ok(String(pkg.scripts?.test||'').includes('npm run check:r3-security-behavior'),'npm test requires the R3 behavioral gate after build');

if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R3 test infrastructure gate');
