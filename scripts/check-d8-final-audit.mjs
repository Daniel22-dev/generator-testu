#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json'));
const files = {
  core: read('src/js/01-core.js'),
  state: read('src/js/02-state-persistence.js'),
  templates: read('src/js/04-templates.js'),
  fields: read('src/js/05-form-fields.js'),
  didactics: read('src/js/06-result-didactics.js'),
  gemini: read('src/js/07-gemini.js'),
  workflow: read('src/js/08a-output-workflow.js'),
  prompt: read('src/js/12-prompt-builder.js'),
  student: (fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+read('src/js/13e-secure-student-runtime.js')),
  verifier: read('src/js/13f-secure-teacher-verifier.js'),
  pdf: read('src/js/13fa-secure-teacher-verifier-pdf.js'),
  verifierUi: read('src/js/13eb-secure-teacher-verifier-v2-ui.js'),
  prodCheck: read('scripts/check-production-readiness.mjs'),
  d7Runner: read('scripts/qa-d7-regressions.mjs'),
  d7Wiring: read('scripts/check-d7-ci-wiring.mjs'),
  journey: read('.github/workflows/journey-e2e.yml'),
  safePromotion: read('.github/workflows/safe-promotion.yml'),
  p5: read('.github/workflows/p5-release-gate.yml'),
  releaseAdmission: read('scripts/ci/release-admission.mjs'),
};

const results = [];
function check(group, id, title, condition, detail='') {
  const pass = !!condition;
  results.push({group,id,title,status:pass?'PASS':'FAIL',detail});
  const tag = pass ? 'PASS' : 'FAIL';
  (pass ? console.log : console.error)(`${tag} ${group}.${id} ${title}${detail ? ` — ${detail}` : ''}`);
}
const has = (text, ...needles) => needles.every(x => text.includes(x));
const lacks = (text, ...needles) => needles.every(x => !text.includes(x));

// A — Generator behaviour and content contracts.
check('A','1','prefill_v3 restores rcTopic and warns about non-persisted attachments',
  has(files.state, "format:'prefill_v3'", 'rcTopic', 'attachmentWasPresent', 'připoj ji znovu'));
check('A','2','Reading default/count contract remains explicit',
  /readingQuestionCount\s*:\s*4/.test(files.core) && has(files.state,'readingQuestionCount') && has(files.workflow,'readingQuestionCount'));
check('A','3','Listening default/count contract remains explicit',
  /listeningQuestionCount\s*:\s*4/.test(files.core) && has(files.state,'listeningQuestionCount') && has(files.workflow,'listeningQuestionCount'));
check('A','4','Listening multimodal routing supports audio/video and YouTube provider input',
  has(files.gemini, 'audio/mpeg','video/mp4','function isYoutubeUrl','buildGeminiUrlPartsForApi','fileData:{fileUri}','inlineData:{mimeType:apiMimeForFile(f)'));
check('A','5','Basic/Standard/Challenge preserve curriculum, types, counts and points in both prompt paths',
  has(files.prompt,'Keep the SAME tested curriculum','exercise types, item counts and point totals') &&
  has(files.fields,'Zachovej STEJNOU měřenou látku','počty položek i celkové bodové součty') &&
  lacks(files.fields,'méně/kratší položky','vyšší podíl produkčních úloh') &&
  lacks(files.prompt,'fewer/shorter items','higher share of productive'));
check('A','6','content drift tracks source/topic/count/differentiation inputs',
  has(files.workflow,"'rcTopic'","'readingQuestionCount'","'listeningQuestionCount'","'differentiationLevel'"));

// B — Teacher Verifier UX, analytics and security semantics.
check('B','1','Teacher Verifier exposes seven-panel information architecture',
  has(files.verifierUi,"['dashboard','results','analysis','security','test','export','tech']"));
check('B','2','technical identity/build/integrity data live in Technical panel, not Dashboard intro',
  has(files.verifierUi,'Identita testu','Autor a build','Manifest SHA-256','Student HTML SHA-256','Technické údaje'));
check('B','3','navigation has icon/text hierarchy and explicit active markers',
  has(files.verifierUi,'v2-nav-icon','v2-nav-label','.v2-nav .active{','box-shadow:inset 3px 0 0 var(--v2-accent)','@media(max-width:760px)'));
check('B','4','dark and light themes define distinct real palettes',
  has(files.verifierUi,'body{','body.v2-light{','--v2-bg:#0b1220','--v2-bg:#f4f6fb'));
check('B','5','fullscreen follows browser state and exposes unsupported/rejected fallback',
  has(files.verifierUi,'fullscreenchange','webkitfullscreenchange','requestFullscreen','webkitRequestFullscreen','F11'));
check('B','6','Results use unified security-signal text',
  has(files.verifier,'securitySignalText(r,info)','výsledek vyžaduje kontrolu'));
check('B','7','distribution/item analytics use effectiveResults',
  /function distributionStats\(\)\{var ok=effectiveResults\(\)/.test(files.verifier) &&
  /function itemAnalysisRows\(\)\{var ok=effectiveResults\(\)/.test(files.verifier) &&
  /function analysisHtml\(forExport\)\{var ok=effectiveResults\(\)/.test(files.verifier));
check('B','8','metadata mismatch is a soft Security signal; split-window is explicitly heuristic/non-authoritative',
  has(files.verifier,'METADATA MISMATCH','metadata Google Forms',"'soft'") &&
  has(files.student,'Je to MĚKKÝ signál','druhé zařízení','SPLIT_RATIO=0.60','SPLIT_MIN_RUN_MS=10000') &&
  has(files.verifier,'split-window','možný split screen','Toto není automatický důkaz podvodu.'),
  'accepted limitation: browser telemetry cannot prove absence of a second device or every split-screen layout');

// C — PDF/print quality and semantics.
check('C','1','direct PDF uses origin-clean DOM rasterizer and no foreignObject',
  has(files.pdf,'pdf3Rasterize','pdf3Variant') && !/foreignObject/i.test(files.pdf));
check('C','2','student PDF path is generated without answer-key flag',
  has(files.pdf,'downloadDirectPdf','pdf3Variant') && has(files.verifier,'withKey'));
check('C','3','teacher PDF/key path remains distinct',
  has(files.verifier,"withKey?' — KLÍČ':''",'downloadDirectPdf(true)') && has(files.pdf,"withKey?'ucitel_klic_':'student_'"));
check('C','4','school logo is embedded through verified PNG data URI',
  has(files.verifier,'schoolLogoDataUri:/^data:image\\/png;base64,') && has(files.verifier,'school-logo') && has(files.verifier,'CONFIG.schoolLogoDataUri'));
check('C','5','Czech PDF labels keep diacritics and stale unaccented labels are absent',
  has(files.verifier,'Výchozí věta:','Vysvětlení:') && lacks(files.verifier,'Vychozi veta:','Vysvetleni:'));
check('C','6','safe pagination and print fallback remain present',
  has(files.pdf,'pdf3SafeBlockCut','pdf3SafeTextCut','pdf3PageCuts') && has(files.verifier,'openPrint'));

// D — Release gates/evidence hardening.
check('D','1','P5 mandatory path includes D7 browser/PDF regression runner',
  pkg.scripts?.['qa:p5:ci']?.includes('npm run qa:d7:ci') && pkg.scripts?.['qa:p5']?.includes('npm run qa:d7:ci'));
check('D','2','D7 runner covers analytics, IA/security, joker browser workflow, PDF runtime/quality and verifier UI runtime',
  ['check-verifier-effective-analytics.mjs','check-verifier-ia-security.mjs','check-joker-workflow-browser.mjs','check-stage3-pdf-runtime.mjs','check-stage3-pdf-quality.mjs','check-verifier-ui-runtime.mjs'].every(x=>files.d7Runner.includes(x)));
check('D','3','Journey clears stale evidence, covers config/state flows and binds artifact to exact SHA',
  /rm -rf audit\/evidence[\s\S]*mkdir -p audit\/evidence/.test(files.journey) &&
  has(files.journey,'--suite state_transition_suite','--suite config_extra_suite','journey-e2e-evidence-${{ github.sha }}'));
check('D','4','Safe Promotion requires independent certification and read-only admission for the exact certified SHA',
  has(files.safePromotion,
    'name: release-admission',
    'needs: [prepare, candidate-gate, pr-certification]',
    'run: node scripts/ci/release-admission.mjs --prerequisites',
    'needs: [prepare, candidate-gate, pr-certification, admission]',
    'gh pr merge "$PR_NUMBER" --repo "$GITHUB_REPOSITORY" --merge --match-head-commit "$CERTIFIED_SHA"') &&
  (files.safePromotion.match(/release-admission\.mjs --independent/g) || []).length >= 2 &&
  has(files.releaseAdmission,
    "{ file: 'p5-release-gate.yml', job: 'p5-release-gate' }",
    "{ file: 'journey-e2e.yml', job: 'journey-e2e' }",
    "assert.equal(needs?.[id]?.result, 'success'",
    "assert.equal(needs[id].outputs?.eligible, 'true'",
    "assert.equal(needs[id].outputs?.certified_sha, sha",
    "run.head_sha === sha",
    "assert.equal(run.path, '.github/workflows/' + gate.file",
    "assert.equal(run.repository?.full_name, repo",
    "assert.equal(run.head_repository?.full_name, repo",
    "assert.equal(check.app?.id, ACTIONS_APP_ID",
    "assert.equal(check.status, 'completed')",
    "assert.equal(check.conclusion, 'success')",
    "Independent P5/Journey did not both succeed within the bounded wait"));
check('D','5','D7 removes sensitive browser fixtures/PDFs and retains only safe summaries',
  has(files.d7Runner,'cleanupSensitiveRuntimeArtifacts','qa-fixtures',"entry !== 'summary.json'") &&
  has(files.p5,'qa-results/d7-regressions.json','qa-results/d8-final-audit.json','qa-results/stage3-pdf-runtime/summary.json','qa-results/stage3-pdf-quality/summary.json','qa-results/verifier-ui-runtime/summary.json'));

// Cleanup — only proven-dead legacy/stale paths are removed while migrations survive.
const runtimeCombined = [files.state,files.templates,files.fields,files.didactics,files.gemini,files.workflow,files.prompt,files.student,files.verifier,files.pdf,files.verifierUi].join('\n');
check('CLEANUP','1','dead direct legacy template helpers are absent',
  lacks(runtimeCombined,'chooseSimpleTemplate(','openSimpleTemplateDetail(','simpleTemplateLockList(','TEMPLATE_GOVERNED_KEYS'));
check('CLEANUP','2','obsolete source slicing state/helper are absent and representative-chunk help is accurate',
  lacks(runtimeCombined,'pickSourceSlice(','sourceSliceMode') &&
  has(files.didactics,'reprezentativní průřez','tematicky relevantní pasáže','rozprostřené napříč celým zdrojem','Nejde o prosté uříznutí'));
check('CLEANUP','3','legacy saved template IDs still migrate forward',
  has(files.state,"fl_homework:'fl_practice'","fl_graded_quick:'fl_standard'","cs_text:'cs_practice'"));
check('CLEANUP','4','dead pedagogicalPreset state is absent', lacks(runtimeCombined,'pedagogicalPreset'));

const failed = results.filter(x=>x.status==='FAIL');
const summary = {
  schema:'ghrab-d8-final-audit-v1',
  appVersion:pkg.version,
  generatedAt:new Date().toISOString(),
  status:failed.length?'FAIL':'PASS',
  counts:{total:results.length,passed:results.length-failed.length,failed:failed.length},
  acceptedLimitations:[
    'Split-screen detection is heuristic browser telemetry. It cannot prove that no second device was used and intentionally remains a soft signal.',
    'School-server LIVE validation remains deferred by owner decision; it is outside the current serverless release acceptance scope.'
  ],
  results
};
fs.mkdirSync(path.resolve('qa-results'),{recursive:true});
fs.writeFileSync('qa-results/d8-final-audit.json',JSON.stringify(summary,null,2)+'\n');
if(failed.length){
  console.error(`D8 final audit FAIL: ${failed.length}/${results.length} checks failed.`);
  process.exit(1);
}
console.log(`D8 final audit PASS: ${results.length}/${results.length} checks passed.`);
