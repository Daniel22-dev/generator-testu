#!/usr/bin/env node
import fs from 'node:fs';

const authorityFile='src/js/13f-secure-teacher-verifier.js';
const uiFile='src/js/13eb-secure-teacher-verifier-v2-ui.js';
const authority=fs.readFileSync(authorityFile,'utf8');
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
need(/function toggleVerifierFullscreen\([\s\S]*requestFullscreen/,'Fullscreen toggle is present.');
need(/v2ResultHealth[\s\S]*nevyřešené pokusy/,'Results health summary exposes unresolved attempts.');
need(/v2SecurityFilter[\s\S]*setVerifierSecurityQuery/,'Security signal filter is present.');
need(/Pouze učitel \/ školní úložiště/,'Teacher-only archive route is clearly labeled.');
need(/Pro studenty[\s\S]*Feedback HTML/,'Student-facing feedback route is separated from teacher archive.');
need(/Nejde o automatické obvinění z podvodu|Toto není automatický důkaz podvodu/,'Security signals retain non-accusatory interpretation.');

need(/async function decryptPayload\(pack\)[\s\S]*RSA-OAEP[\s\S]*AES-GCM/,'RSA-OAEP/AES-GCM verifier decryption remains present.');
need(/function parseTxt\(txt\)[\s\S]*SECURE-ANSWERS-V1/,'SECURE-ANSWERS-V1 parser remains present.');
need(/function effectiveResults\(\)[\s\S]*exactDuplicate[\s\S]*ATTEMPT_DECISIONS/,'Effective results still exclude exact duplicates and require explicit attempt decisions.');
need(/function downloadResultsCsv\(\)[\s\S]*unresolvedAttemptConflicts\(\)[\s\S]*Nejdřív vyber pokus/,'Results CSV remains blocked on unresolved attempt conflicts.');
need(/function renderTable\(\)[\s\S]*METADATA MISMATCH/,'Metadata mismatch remains visible in results.');
need(/function analysisHtml\(forExport\)\{var ok=effectiveResults\(\)[\s\S]*Diskriminace[\s\S]*Obtížnost/,'Item analysis remains available and uses effective results.');
need(/function distributionStats\(\)\{var ok=effectiveResults\(\)/,'Distribution analytics use effective results.');
need(/function itemAnalysisRows\(\)\{var ok=effectiveResults\(\)/,'Item analytics use effective results.');
need(/function renderSecuritySignals\(\)[\s\S]*VERIFIER_SECURITY_QUERY/,'Security filtering is display-only over existing signals.');
forbid(/function\s+scoreSubmissionV2|function\s+decryptPayloadV2/,'Stage B did not introduce a parallel scoring/decryption authority.');
if (ui.includes('function scoreItemSecure') || ui.includes('async function decryptPayload')) fail('V2 UI module nesmí obsahovat scoring/decryption authority.');
else pass('V2 UI module contains presentation/orchestration only.');

if(failed) process.exit(1);
console.log('Teacher Verifier 2.0 contract PASS.');
