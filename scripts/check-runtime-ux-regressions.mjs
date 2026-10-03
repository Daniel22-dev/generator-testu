#!/usr/bin/env node
import fs from 'node:fs';

const secure = fs.readFileSync('src/js/13e-secure-student-runtime.js', 'utf8');
const instant = fs.readFileSync('src/js/14b-instant-test-runtime.js', 'utf8');
const verifier = fs.readFileSync('src/js/13f-secure-teacher-verifier.js', 'utf8');
const forms = fs.readFileSync('src/js/13ea-secure-verifier-forms.js', 'utf8');
const ui = fs.readFileSync('src/js/13eb-secure-teacher-verifier-v2-ui.js', 'utf8');

let failed = 0;
const pass = (m) => console.log('PASS ' + m);
const fail = (m) => { failed++; console.error('FAIL ' + m); };
const need = (src, re, m) => re.test(src) ? pass(m) : fail(m);

need(secure, /function isIPadOSWebKitRuntime\([\s\S]*maxTouchPoints/, 'secure runtime detects iPadOS including desktop-class UA');
need(secure, /shouldIgnoreIPadKeyboardBlur\(\)[\s\S]*visibilityState!==['"]visible['"]/, 'secure keyboard exception is limited to a visible page');
need(secure, /window\.addEventListener\(['"]blur['"][\s\S]*shouldIgnoreIPadKeyboardBlur\(\)[\s\S]*keyboard-dismiss-ios[\s\S]*handleLeave\(['"]blur-away['"]/, 'secure blur path ignores only the iPad keyboard transition before normal leave handling');
need(secure, /visibilitychange[\s\S]*visibilityState===['"]hidden['"][\s\S]*handleLeave/, 'secure visibility-hidden path remains fail-closed');
need(secure, /pagehide[\s\S]*handleLeave\(['"]pagehide['"]/, 'secure pagehide path remains fail-closed');

need(instant, /function isIPadOSWebKitInstant\([\s\S]*maxTouchPoints/, 'instant runtime detects iPadOS including desktop-class UA');
need(instant, /shouldIgnoreIPadKeyboardBlurInstant\(\)[\s\S]*visibilityState!==['"]visible['"]/, 'instant keyboard exception is limited to a visible page');
need(instant, /function guardedBlurCheck\([\s\S]*shouldIgnoreIPadKeyboardBlurInstant\(\)[\s\S]*keyboard-dismiss-ios[\s\S]*lockTest\(['"]Stránka ztratila fokus\./, 'instant blur guard preserves normal lock path outside keyboard exception');
need(instant, /function onVisibility\([\s\S]*visibilityState===['"]hidden['"][\s\S]*lockTest/, 'instant visibility-hidden path still locks according to policy');

const formsPos = verifier.indexOf('1. Google Forms (doporučená cesta)');
const fallbackPos = verifier.indexOf('2. Nouzová cesta — answers.txt / vložená záloha');
(formsPos >= 0 && fallbackPos > formsPos) ? pass('Teacher Verifier presents Google Forms before emergency backup') : fail('Google Forms must precede emergency backup');
need(verifier, /CSV nemusíš otevírat v Excelu[\s\S]*ikona ve Windows není důležitá/, 'Verifier explains that CSV file association/icon is irrelevant');
need(verifier, /function setupFormsDropzone\([\s\S]*importFormsCsvFile[\s\S]*ZIP nejdřív rozbal/, 'Google Forms dropzone gives ZIP guidance and imports CSV');
need(ui, /\[['"]results['"],['"]Načtení výsledků['"]\]/, 'Verifier V2 moves the renamed import card into Results');
need(forms, /bulkVerifyPasted\([\s\S]*Nejdřív vlož celý záložní blok SECURE-ANSWERS-V1/, 'Pasted-backup button gives feedback when no payload is present');
need(forms, /importFormsCsvFile\([\s\S]*CSV import dokončen/, 'Forms import confirms successful completion');
need(verifier, /function downloadText\([\s\S]*Stažení bylo spuštěno:/, 'download actions give visible confirmation');

if (failed) process.exit(1);
console.log('PASS runtime UX regression contract');
