// Production readiness guard for the serverless release.
// This script checks a small set of invariants that must not silently regress.
import fs from 'node:fs';

let failed = 0;
const fail = message => { failed++; console.error(`❌ ${message}`); };
const pass = message => console.log(`✅  ${message}`);
const read = file => fs.readFileSync(file, 'utf8');
const requireText = (text, pattern, message) => {
  if (!pattern.test(text)) fail(message);
};
const forbidText = (text, pattern, message) => {
  if (pattern.test(text)) fail(message);
};

const core = read('src/js/01-core.js');
const persistence = read('src/js/02-state-persistence.js');
const renderer = read('src/js/03-ui-render.js');
const formFields = read('src/js/05-form-fields.js');
const gemini = read('src/js/07-gemini.js');
const secureHelpers = read('src/js/13a-secure-helpers.js');
const securePackage = read('src/js/13c-secure-package.js');
const secureStudentRuntime = read('src/js/13e-secure-student-runtime.js');
const assembler = read('src/js/13g-assemble-test-html.js');
const instantRuntime = read('src/js/14b-instant-test-runtime.js');
const releaseGuides = read('src/js/14d-generator-release-guides.js');
const shell = read('src/shell.html');
const readme = read('README.md');
const security = read('SECURITY.md');
const operations = read('PROVOZNI-PRAVIDLA.md');
const audit = read('AUDIT-V2.md');
const checklist = read('RELEASE-CHECKLIST.md');
const assistantKbStart = core.indexOf('const GENERATOR_ASSISTANT_KB');
const assistantKbEnd = core.indexOf('const GA_NOT_ADDRESSED', assistantKbStart);
const assistantKb = assistantKbStart >= 0 && assistantKbEnd > assistantKbStart
  ? core.slice(assistantKbStart, assistantKbEnd)
  : '';

requireText(core, /status:\s*['"]production-serverless['"]/, 'RELEASE.status musi byt production-serverless.');
requireText(gemini, /const GEMINI_MODEL_DEFAULT\s*=\s*['"]gemini-3\.5-flash['"]/, 'Vychozi Gemini model neni gemini-3.5-flash.');
requireText(gemini, /const GEMINI_FALLBACK_MODELS\s*=\s*\[\s*['"]gemini-3\.1-flash-lite['"]/, 'Prvni zalozni model neni gemini-3.1-flash-lite.');
requireText(gemini, /ensureGeminiDataNotice\(\)/, 'Pred AI pozadavkem chybi transparentni datove upozorneni.');
requireText(gemini, /if \(!\(await ensureGeminiDataNotice\(\)\)\)/, 'AI volani neni blokovano datovym upozornenim.');
requireText(persistence, /state\.anonymizace\s*=\s*['"]ANO['"]/, 'Stare ulozene nastaveni se neprevadi na povinnou anonymizaci.');
requireText(formFields, /students\.map\(\(_?,?\s*i\)\s*=>\s*`Student \$\{label\}\$\{i\+1\}`\)/, 'Diferenciace nevytvari ocekavane anonymni kody studentu.');
forbidText(formFields, /students\.join\s*\(/, 'Diferenciace muze primo spojovat skutecna jmena do promptu.');
requireText(secureHelpers, /async function buildPublicDiffGroups\(/, 'Chybi transformace seznamu studentu na verejne hashe.');
requireText(secureHelpers, /GIT-DIFF-ROSTER-V1\|/, 'Hash rosteru nema oddeleny domenovy prefix.');
requireText(assembler, /diffGroups:\s*publicDiffGroups/, 'Vystupni konfigurace nepouziva hashovany roster.');
requireText(securePackage, /studentHashes:Array\.isArray\(g\.studentHashes\)/, 'Secure studentsky balicek neprenasi jen hashovany roster.');
requireText(instantRuntime, /await resolveStudentGroup\(n\)/, 'Instant runtime nevybira variantu podle hashovane identity.');
requireText(secureStudentRuntime, /await chooseVariant\(name\)/, 'Secure runtime nevybira variantu podle hashovane identity.');
forbidText([securePackage, secureStudentRuntime, instantRuntime, assembler].join('\n'), /g\.students|\.students\s*\|\|/, 'Studentsky runtime nebo vystup stale pracuje s citelnym seznamem studentu.');
requireText(secureStudentRuntime, /if\(\(CFG\.diffGroups\|\|\[\]\)\.length&&!ACTIVE_KEY\)/, 'Secure runtime neodmita neznamy diferenciacni identifikator.');
requireText(instantRuntime, /if\(\(CFG\.diffGroups\|\|\[\]\)\.length&&!g\)/, 'Instant runtime neodmita neznamy diferenciacni identifikator.');
forbidText(assistantKb, /buildStudentPackage|accessGroups|group\.pin|group\.password|buildAccessManifest|restoreAnswers|buildLocalTeacherMap|group\.anonymize/, 'Interni poradce obsahuje zastaraly symbol nebo stary bezpecnostni model.');
requireText(assistantKb, /SHA-256 otisk|SHA-256 hash/, 'Interni poradce nevysvetluje hashovany roster.');
requireText(assistantKb, /rozpracované odpovědi[^.]*neobnov|rozpracovaný pokus[^.]*neobnov/i, 'Interni poradce neuvadi omezeni obnovy rozpracovaneho testu.');
forbidText(shell, /Poslat jména do promptu|data-val=['"]NE['"][^>]*onclick=['"][^'"]*anonymizace/is, 'UI stale nabizi odeslani skutecnych jmen do AI.');
requireText(shell, /role=['"]progressbar['"]/, 'Prubehovy ukazatel nema ARIA roli progressbar.');
requireText(renderer, /setAttribute\(['"]aria-valuenow['"]/, 'ARIA hodnota prubehu se pri navigaci neaktualizuje.');
requireText(shell, /id=['"]btnGuide['"][^>]*aria-label=/, 'Ikonove tlacitko navodu nema pristupny nazev.');
requireText(shell, /class=['"]ai-data-notice['"][^>]*role=['"]note['"]/, 'V UI chybi stale upozorneni na data odesilana do Gemini.');
requireText(releaseGuides, /RELEASE\.status\s*===\s*['"]production-serverless['"]/, 'Průvodce vydanim nerozpoznava produkcni serverless stav.');

const currentDocs = [readme, security, operations, audit, checklist].join('\n');
forbidText(currentDocs, /pro školní pilot|pilotní pravidla|pro pilotní ověřování/i, 'Aktualni provozni dokumentace stale popisuje verzi jako pilot.');
requireText(currentDocs, /jednorázov(?:é|ých) kód/i, 'Dokumentace nedoporucuje jednorazove kody pro diferenciaci.');
requireText(currentDocs, /studentHashes|SHA-256/, 'Dokumentace nepopisuje hashovany roster ve studentskem vystupu.');
requireText(currentDocs, /reload|obnovení stránky/i, 'Dokumentace nepopisuje ztratu rozpracovaneho pokusu po reloadu.');
forbidText([shell, gemini, releaseGuides].join('\n'), /\b20\s*(?:požadavků|requestů)?\s*\/\s*den\b|\b5\s*\/\s*min\b|\b1000\s*\/\s*den\b|reset\w*\s+(?:o\s+)?půlnoc/i, 'UI nebo runtime obsahuje neoverenou pevnou hodnotu Gemini kvoty.');

if (!failed) pass('Produkcni invariants jsou splneny.');
process.exit(failed ? 1 : 0);
