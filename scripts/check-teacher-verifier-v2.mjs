#!/usr/bin/env node
import fs from 'node:fs';

const authorityFile='src/js/13f-secure-teacher-verifier.js';
const uiFile='src/js/13eb-secure-teacher-verifier-v2-ui.js';
const authority=fs.readFileSync(authorityFile,'utf8')+'\n'+fs.readFileSync('src/js/13ef-secure-verifier-replay.js','utf8');
const ui=fs.readFileSync(uiFile,'utf8');
const s=ui+'\n'+authority;
let failed=0;
const pass=m=>console.log('✅  '+m);
const fail=m=>{failed++;console.error('❌ '+m);};
const need=(re,m)=>re.test(s)?pass(m):fail(m);
const forbid=(re,m)=>re.test(s)?fail(m):pass(m);

need(/Teacher Verifier 2\.0/,'Teacher Verifier 2.0 shell exists.');
const expectedPanels=['dashboard','results','analysis','security','test','export','tech'];
const panelMatch=ui.match(/VERIFIER_PANEL_IDS=\[([^\]]+)\]/);
const panels=(panelMatch?.[1].match(/'([^']+)'/g)||[]).map(x=>x.slice(1,-1));
panels.length===expectedPanels.length&&expectedPanels.every((id,i)=>panels[i]===id)?pass('Navigation contains all seven Stage B panels in canonical order.'):fail('Stage B panel registry is incomplete or reordered.');
ui.includes(`data-v2-panel="'+i+'" aria-controls="v2-'+i+'"`)?pass('Generated navigation binds panel id and aria-controls.'):fail('Generated navigation must bind panel id and aria-controls.');
need(/id=["']v2-["']\+i[\s\S]*aria-hidden=["']true["']/,'Generated panels expose aria-hidden state.');
need(/function showVerifierPanel\([\s\S]*aria-current/,'Panel switching marks the active navigation item.');
need(/function showVerifierPanel\([\s\S]*aria-hidden/,'Panel switching exposes hidden/visible regions to accessibility APIs.');
(ui.includes('/Arrow(Right|Down)/')&&ui.includes('/Arrow(Left|Up)/')&&ui.includes("e.key==='Home'")&&ui.includes("e.key==='End'"))?pass('Keyboard navigation is present.'):fail('Keyboard navigation is incomplete.');
need(/function toggleVerifierTheme\([\s\S]*VERIFIER_THEME_KEY/,'Theme toggle persists preference.');
need(/body\{[\s\S]*--v2-bg:#0b1220[\s\S]*color-scheme:dark/,'Default verifier theme defines a real dark palette.');
need(/body\.v2-light\{[\s\S]*--v2-bg:#f4f6fb[\s\S]*color-scheme:light/,'Light verifier theme defines an explicit light palette.');
need(/\.card\{[\s\S]*var\(--v2-surface\)[\s\S]*input,textarea,select\{[\s\S]*var\(--v2-input\)[\s\S]*\.v-modal-box\{[\s\S]*var\(--v2-surface\)/,'Theme tokens cover cards, form controls and modal surfaces.');
need(/function toggleVerifierFullscreen\([\s\S]*verifierFullscreenExit\([\s\S]*verifierFullscreenRequest\(/,'Fullscreen toggle uses explicit request/exit capability resolution.');
need(/function setupVerifierFullscreenState\([\s\S]*fullscreenchange[\s\S]*syncVerifierFullscreenState/,'Fullscreen state follows browser fullscreenchange events.');
need(/function syncVerifierFullscreenState\([\s\S]*aria-pressed[\s\S]*Ukončit[\s\S]*Celá obrazovka/,'Fullscreen button exposes active state and changing label.');
need(/Režim celé obrazovky není v tomto prohlížeči dostupný/,'Unsupported fullscreen produces explicit user feedback.');
need(/Režim celé obrazovky se nepodařilo spustit[\s\S]*F11/,'Fullscreen failure produces actionable fallback feedback.');
need(/v2ResultHealth[\s\S]*nevyřešené pokusy/,'Results health summary exposes unresolved attempts.');
need(/v2SecurityFilter[\s\S]*setVerifierSecurityQuery/,'Security signal filter is present.');
need(/METADATA MISMATCH — metadata Google Forms/,'Google Forms metadata mismatch is promoted into the Security signal model.');
need(/I\('tech',[\s\S]*Creator ID[\s\S]*Manifest SHA-256[\s\S]*Student HTML SHA-256[\s\S]*Kontrola integrity/,'Low-level identity/build/integrity metadata live in the Technical panel.');
need(/v2-nav-icon[\s\S]*v2-nav-label/,'Navigation exposes icon + label hierarchy.');
need(/Pouze soukromý počítač vlastníka mimo školu/,'Teacher-only archive route is clearly labeled.');
need(/Pro studenty[\s\S]*Feedback HTML/,'Student-facing feedback route is separated from teacher archive.');
need(/Nejde o automatické obvinění z podvodu|Toto není automatický důkaz podvodu/,'Security signals retain non-accusatory interpretation.');

need(/async function decryptPayload\(pack\)[\s\S]*RSA-OAEP[\s\S]*AES-GCM/,'RSA-OAEP/AES-GCM verifier decryption remains present.');
need(/function parseTxt\(txt\)[\s\S]*SECURE-ANSWERS-V1/,'SECURE-ANSWERS-V1 parser remains present.');
need(/function resolvedResults\(\)[\s\S]*exactDuplicate[\s\S]*hardReplayConflict[\s\S]*ATTEMPT_DECISIONS[\s\S]*function effectiveResults/,'Effective results exclude duplicates/hard replay conflicts and preserve legacy attempt decisions.');
need(/function downloadResultsCsv\(\)[\s\S]*unresolvedAttemptConflicts\(\)[\s\S]*Nejdřív vyber pokus/,'Results CSV remains blocked on unresolved attempt conflicts.');
need(/function renderTable\(\)[\s\S]*securitySignalText\(r,info\)/,'Results status is sourced from the unified Security signal model.');
need(/function analysisHtml\(forExport\)\{var ok=effectiveResults\(\)[\s\S]*Diskriminace[\s\S]*Obtížnost/,'Item analysis remains available and uses effective results.');
need(/function distributionStats\(\)\{var ok=effectiveResults\(\)/,'Distribution analytics use effective results.');
need(/function itemAnalysisRows\(\)\{var ok=effectiveResults\(\)/,'Item analytics use effective results.');
need(/function renderSecuritySignals\(\)[\s\S]*VERIFIER_SECURITY_QUERY/,'Security filtering is display-only over existing signals.');
forbid(/function\s+scoreSubmissionV2|function\s+decryptPayloadV2/,'Stage B did not introduce a parallel scoring/decryption authority.');
if (ui.includes('function scoreItemSecure') || ui.includes('async function decryptPayload')) fail('V2 UI module nesmí obsahovat scoring/decryption authority.');
else pass('V2 UI module contains presentation/orchestration only.');

if(failed) process.exit(1);
console.log('Teacher Verifier 2.0 contract PASS.');
