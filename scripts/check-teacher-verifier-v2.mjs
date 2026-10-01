#!/usr/bin/env node
import fs from 'node:fs';

const file='src/js/13f-secure-teacher-verifier.js';
const s=fs.readFileSync(file,'utf8');
let failed=0;
const pass=m=>console.log('✅  '+m);
const fail=m=>{failed++;console.error('❌ '+m);};
const need=(re,m)=>re.test(s)?pass(m):fail(m);
const forbid=(re,m)=>re.test(s)?fail(m):pass(m);

need(/Teacher Verifier 2\.0/,'Teacher Verifier 2.0 shell exists.');
for (const id of ['dashboard','results','analysis','security','test','export','tech']) {
  need(new RegExp('data-v2-panel=["\\\']'+id+'["\\\']'),'Navigation contains '+id+'.');
  need(new RegExp('aria-controls=["\\\']v2-'+id+'["\\\']'),'Navigation '+id+' has aria-controls.');
}
need(/function showVerifierPanel\([\s\S]*aria-current/,'Panel switching marks the active navigation item.');
need(/function showVerifierPanel\([\s\S]*aria-hidden/,'Panel switching exposes hidden/visible regions to accessibility APIs.');
need(/function setupVerifierNavigationKeyboard\([\s\S]*ArrowRight[\s\S]*ArrowLeft[\s\S]*Home[\s\S]*End/,'Keyboard navigation is present.');
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
need(/function analysisHtml\(forExport\)[\s\S]*Diskriminace[\s\S]*Obtížnost/,'Item analysis remains available.');
need(/function renderSecuritySignals\(\)[\s\S]*VERIFIER_SECURITY_QUERY/,'Security filtering is display-only over existing signals.');
forbid(/function\s+scoreSubmissionV2|function\s+decryptPayloadV2/,'Stage B did not introduce a parallel scoring/decryption authority.');

if(failed) process.exit(1);
console.log('Teacher Verifier 2.0 contract PASS.');
