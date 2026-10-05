// Private, informational history assessment. No automatic classification authority.
const SECURE_VERIFIER_HISTORY_JS=String.raw`
function verifierSecurityEvents(r){
  const events=Array.isArray(r&&r.securityEvents)?r.securityEvents:[];
  if(!Array.isArray(r&&r.criticalEvents))return events;
  const types=['locked','recovery-unlock','bad-unlock','persistence-integrity','attempt-resumed-after-reload','page-discarded','page-restored','left-window','large-paste','paste-blocked','critical-events-overflow'];
  return events.filter(e=>!types.includes(e.type)).concat(r.criticalEvents).sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
}
function criticalHistoryRequired(){const v=String(CONFIG.generatorVersion||'').split('.').map(Number);return v[0]>7||v[0]===7&&(v[1]>1||v[1]===1&&v[2]>=92);}
function criticalHistoryAssessment(r){
  if(!Array.isArray(r&&r.criticalEvents)||!r.criticalCounters)return {legacy:true,mismatch:false,missingRequired:criticalHistoryRequired()};
  const count={locks:0,unlocks:0,resumes:0,badUnlocks:0};r.criticalEvents.forEach(e=>{const k=({locked:'locks','recovery-unlock':'unlocks','attempt-resumed-after-reload':'resumes','bad-unlock':'badUnlocks'})[e.type];if(k)count[k]++;});
  const types=['locked','recovery-unlock','bad-unlock','persistence-integrity','attempt-resumed-after-reload','page-discarded','page-restored','left-window','large-paste','paste-blocked','critical-events-overflow'];
  const projected=(r.securityEvents||[]).filter(e=>types.includes(e.type));
  const listed=r.criticalEvents,ordered=es=>es.slice().sort((a,b)=>a.criticalSeq-b.criticalSeq);
  const overflow=listed.filter(e=>e.type==='critical-events-overflow');
  const overflowOk=r.criticalOverflow?listed.length===902&&overflow.length===1&&listed[900].type==='critical-events-overflow'&&listed[901].type==='locked':listed.length<=900&&overflow.length===0;
  const mismatch=!overflowOk||Object.keys(count).some(k=>r.criticalCounters[k]!==count[k])||e3Canonical(ordered(projected))!==e3Canonical(ordered(listed));
  return {legacy:!!r.criticalHistoryLegacy,mismatch,overflow:!!r.criticalOverflow,count};
}
function historyCompletenessAssessment(r){
  const critical=criticalHistoryAssessment(r);
  if(critical.missingRequired)return {possiblyIncomplete:true,label:'CHYBÍ POVINNÁ KRITICKÁ HISTORIE',detail:'Tento export již vyžaduje samostatný seznam a čítače kritických událostí. Chybějící pole vyžadují ruční posouzení.'};
  if(critical.mismatch)return {possiblyIncomplete:true,label:'NESOULAD KRITICKÉ HISTORIE',detail:'Čítače, seznam nebo výsledková historie si odporují. Průběh vyžaduje ruční posouzení.'};
  if(r&&r.routineHistoryTruncated&&!critical.overflow)return {possiblyIncomplete:true,label:'BĚŽNÁ HISTORIE BYLA ZKRÁCENA',detail:'Výsledkový limit ponechal úvodní a nejnovější běžné události. Kritická historie je uložena samostatně.'};
  if(!critical.legacy)return {possiblyIncomplete:!!critical.overflow,label:critical.overflow?'KAPACITA KRITICKÉ HISTORIE DOSAŽENA':'',detail:critical.overflow?'Pokus byl uzamčen při dosažení kapacity. Další události nejsou plně evidovány.':''};
  const events=Array.isArray(r&&r.securityEvents)?r.securityEvents:[];
  const positions=[];events.forEach((e,i)=>{if(e.type==='attempt-resumed-after-reload'&&i>=120)positions.push(i);});
  return {possiblyIncomplete:positions.length>0,label:positions.length?'HISTORIE MŮŽE BÝT NEÚPLNÁ':'historie bez ochrany kritických událostí',detail:positions.length?'Před obnovením bylo nejméně 120 uložených událostí; starší běhový formát mohl historii zkrátit. Chybějící záznamy nelze rekonstruovat.':''};
}
function lockHistoryText(r){
  const events=verifierSecurityEvents(r);
  const locks=events.filter(e=>e.type==='locked'||e.type==='lock'),unlocks=events.filter(e=>e.type==='recovery-unlock');
  const rows=locks.concat(unlocks).sort((a,b)=>Date.parse(a.t)-Date.parse(b.t)).map(e=>e.t+' '+e.type+(e.detail?' — '+e.detail:'')+(e.lockReason?' (důvod: '+e.lockReason+')':''));
  return 'Zámky: '+locks.length+'; recovery odemčení: '+unlocks.length+'.'+(rows.length?' '+rows.join(' | '):'');
}
function historyReviewHtml(r){
  const a=historyCompletenessAssessment(r),notice=r&&r.anchorAssessment&&r.anchorAssessment.deadlineNotice;
  return '<div class="archive-note"><b>'+esc(lockHistoryText(r))+'</b>'+(a.label?'<p class="warn"><b>'+esc(a.label)+'</b> '+esc(a.detail)+'</p>':'')+(notice?'<p>'+esc(notice)+'</p>':'')+'</div>';
}
function historyCsvHeaders(){return ['locked_count','locked_times','locked_reasons','recovery_unlock_times','history_completeness','critical_locks','critical_unlocks','critical_resumes','critical_bad_unlocks'];}
function historyCsvValues(r){const ev=verifierSecurityEvents(r),locks=ev.filter(e=>e.type==='locked'||e.type==='lock');return [locks.length,locks.map(e=>e.t).join(' | '),locks.map(e=>e.detail||'').join(' | '),ev.filter(e=>e.type==='recovery-unlock').map(e=>e.t).join(' | '),historyCompletenessAssessment(r).label,...['locks','unlocks','resumes','badUnlocks'].map(k=>r&&r.criticalCounters?r.criticalCounters[k]:'')];}
function securityResultsReportHtml(){return '<h1>Bezpečnostní přehled výsledků</h1>'+trustNoticeHtml()+resolvedResults().map(r=>'<section class="q"><h2>'+esc(displayStudent(r))+'</h2><p>'+esc(classificationStatus(r))+' · '+esc(resultStateText(r))+'</p>'+historyReviewHtml(r)+'<p>'+esc(securitySignalText(r,duplicateInfo()).join(' | '))+'</p></section>').join('');}
`;
