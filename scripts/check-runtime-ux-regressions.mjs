#!/usr/bin/env node
import fs from 'node:fs';

const secure = (fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+fs.readFileSync('src/js/13e-secure-student-runtime.js', 'utf8'));
const instant = fs.readFileSync('src/js/14b-instant-test-runtime.js', 'utf8');
const verifier = fs.readFileSync('src/js/13f-secure-teacher-verifier.js', 'utf8');
const forms = fs.readFileSync('src/js/13ea-secure-verifier-forms.js', 'utf8');
const ui = fs.readFileSync('src/js/13eb-secure-teacher-verifier-v2-ui.js', 'utf8');
const preview = fs.readFileSync('src/features/preview-editor.js', 'utf8');
const shell = fs.readFileSync('src/shell.html', 'utf8');
const anchors = fs.readFileSync('src/js/13ee-secure-verifier-anchors.js', 'utf8');
const suitability = fs.readFileSync('src/js/05c-exercise-suitability.js', 'utf8');
const lab = fs.readFileSync('src/js/10-testlab.js', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

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
need(preview, /__GHRAB_TEACHER_PREVIEW__=true/, 'Teacher preview injects an explicit preview-only runtime flag');
need(preview, /function createPreviewFrame\([\s\S]*createElement\(['"]iframe['"]\)[\s\S]*previewInstance/, 'Teacher preview creates a fresh iframe browsing context for every open');
need(preview, /function destroyPreviewFrame\([\s\S]*parentNode\.removeChild/, 'Teacher preview destroys the iframe browsing context on close');
!/srcdoc\s*=\s*['"]['"]/.test(preview) ? pass('Teacher preview teardown never navigates a reused iframe to blank srcdoc') : fail('Teacher preview must destroy, not blank and reuse, its iframe');
!/id=["']previewFrame["']/.test(shell) ? pass('Preview shell does not ship a reusable iframe browsing context') : fail('Preview shell must create iframe only on demand');
need(secure, /function acquireAttemptTabLock\(\)[\s\S]*__GHRAB_TEACHER_PREVIEW__===true[\s\S]*return true/, 'Secure runtime bypasses cross-tab locking only in explicit teacher preview');
need(secure, /function handleLeave\([\s\S]*__GHRAB_TEACHER_PREVIEW__===true[\s\S]*return/, 'Teacher preview cannot trigger the real leave-test lock');
need(secure, /function submissionOutboxMatchesIdentity\([\s\S]*body\.identityHash===expectedIdentityHash[\s\S]*normRosterIdentity\(body\.student\)===normRosterIdentity\(expectedStudent\)/, 'Completed submission outbox is cryptographically bound to the currently entered identity');
need(secure, /function startTestAttempt\([\s\S]*identityAllowed\(name\)[\s\S]*activeAttemptIdentityHash\(name\)[\s\S]*unlockTestContent\(\)[\s\S]*restoreSubmissionOutbox\(name,identityHash\)[\s\S]*submittedLocked\(\)/, 'Start flow validates identity and start code before any completed outbox can be restored');
need(secure, /function restoreSubmissionOutbox\(expectedStudent,expectedIdentityHash\)[\s\S]*submissionOutboxMatchesIdentity[\s\S]*showSubmissionOutboxIdentityConflict[\s\S]*ANSWER_TXT=b\.txt/, 'Foreign completed outbox is blocked before ciphertext is assigned to the UI');
need(secure, /function handlePageRestore\(event\)[\s\S]*restoreSubmissionOutbox\(\(\$\('studentName'\)[\s\S]*ACTIVE_IDENTITY_HASH\)/, 'BFCache/pageshow outbox recovery preserves the current identity binding');
need(secure, /function storageGet\(kind\)\{if\(\(typeof window!==['"]undefined['"]&&window\.__GHRAB_TEACHER_PREVIEW__===true\)\)return null/, 'Teacher preview cannot read persistent submitted/outbox state');
need(secure, /async function submittedLocked\(\)\{if\(\(typeof window!==['"]undefined['"]&&window\.__GHRAB_TEACHER_PREVIEW__===true\)\)return false/, 'Teacher preview never inherits a submitted lock');
need(lab, /function downloadTargetContext\([\s\S]*window\.top\.location\.origin===window\.location\.origin[\s\S]*targetDocument=window\.top\.document/, 'Downloads are promoted to the same-origin AI Studio top-level context when embedded');
need(shell, /Roster a kódy zůstávají jen v paměti právě otevřené relace GIT[\s\S]*Otevřít samostatně/, 'Roster UI explains that standalone opens a new in-memory preparation session');
need(shell, /ui-modal generator-settings-dialog/, 'Generator settings uses the dedicated large responsive dialog');
need(styles, /#generatorSettingsModal \.generator-settings-dialog \{ width:min\(1120px,calc\(100vw - 48px\)\)/, 'Generator settings expands on desktop without affecting other modals');
need(anchors, /Řízení testovací hodiny[\s\S]*formsLessonState[\s\S]*Startovací kód pro studenty[\s\S]*forms-lesson-tech/, 'Verifier lesson controls group START/END, start code and collapsed technical URL');

need(shell, /Kontrola celé sady cvičení[\s\S]*Vhodnost vybraných cvičení k podkladu/, 'Suitability panel clearly scopes itself to all selected exercises');
need(shell, /Jak odpovídá student\?[\s\S]*vybírá odpověď z nabízených možností/, 'Reading setup explicitly explains the student answer format');
need(suitability, /suitability-card[\s\S]*suitability-status[\s\S]*suitability-suggestion/, 'AI suitability result uses structured status cards');
need(anchors, /Ověření Google Forms[\s\S]*bezpečnostní nastavení importu/, 'Verifier explains Google Forms verification in teacher-facing language');
need(verifier, /Načtení výsledků[\s\S]*verifierFormsStatusHtml\(\)[\s\S]*verifierAnchorSettingsHtml\(\)[\s\S]*Výsledky/, 'Results keeps only a compact Forms verification status while full settings stay separate');
need(ui, /\['security','Ověření Google Forms'\]/, 'Verifier V2 moves Google Forms verification into Security');


if (failed) process.exit(1);
console.log('PASS runtime UX regression contract');
