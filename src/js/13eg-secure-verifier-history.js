// Private, informational history assessment. No automatic classification authority.
const SECURE_VERIFIER_HISTORY_JS=String.raw`
function verifierSecurityEvents(r){
  const routine=Array.isArray(r&&r.securityEvents)?r.securityEvents:[],critical=Array.isArray(r&&r.criticalEvents)?r.criticalEvents:[];
  const stable=value=>{if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>k!=='criticalSeq').sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);};
  const routineKeys=routine.map(stable),matched=new Set(),merged=routine.map((event,index)=>({event,index}));
  critical.forEach((event,criticalIndex)=>{
    const key=stable(event);let match=-1;
    for(let index=0;index<routine.length;index++)if(!matched.has(index)&&routineKeys[index]===key){match=index;break;}
    if(match>=0){matched.add(match);merged[match]={event:Object.assign({},routine[match],event),index:match};}
    else merged.push({event,index:routine.length+criticalIndex});
  });
  const time=event=>{const value=Date.parse(String(event&&((event.t||event.ts))||''));return Number.isFinite(value)?value:Number.POSITIVE_INFINITY;};
  return merged.sort((a,b)=>time(a.event)-time(b.event)||a.index-b.index).map(item=>item.event);
}
function verifierTelemetryState(r){
  if(!r||!Object.prototype.hasOwnProperty.call(r,'securityEvents'))return 'ABSENT';
  return Array.isArray(r.securityEvents)?'PRESENT':'INVALID';
}
function verifierSplitWindowPct(e){
  const raw=e&&e.pct;
  if(raw==null||typeof raw==='string'&&!raw.trim())return null;
  if(typeof raw!=='number'&&typeof raw!=='string')return null;
  const value=Number(raw);return Number.isFinite(value)&&value>=0&&value<=100?value:null;
}
function verifierSecuritySummary(r){
  const events=verifierSecurityEvents(r),type=e=>String(e&&e.type||'');
  const split=events.filter(e=>type(e)==='split-window');
  const splitShadow=events.filter(e=>type(e)==='split-shadow');
  const fullscreen=events.filter(e=>['fullscreen-enforced','fullscreen-fallback','fullscreen-unsupported','fullscreen-denied'].includes(type(e)));
  const splitPcts=split.map(verifierSplitWindowPct),validSplitPcts=splitPcts.filter(n=>n!=null);
  const lastShadow=splitShadow.length?String(splitShadow[splitShadow.length-1].splitState||'').toUpperCase():'';
  const fullscreenMode=fullscreen.some(e=>type(e)==='fullscreen-enforced')?'enforced':(fullscreen.some(e=>type(e)==='fullscreen-fallback')?'fallback':(fullscreen.some(e=>type(e)==='fullscreen-unsupported')?'unsupported':(fullscreen.some(e=>type(e)==='fullscreen-denied')?'denied':'unknown')));
  return {
    telemetryState:verifierTelemetryState(r),events,
    lockedCount:events.filter(e=>type(e)==='locked'||type(e)==='lock').length,
    recoveryCount:events.filter(e=>type(e)==='recovery-unlock').length,
    badRecoveryCount:events.filter(e=>type(e)==='bad-unlock').length,
    splitWindowEvents:split.length,
    splitWindowMaxPct:validSplitPcts.length?Math.max.apply(null,validSplitPcts):null,
    splitWindowUnknownPctCount:splitPcts.filter(n=>n==null).length,
    splitWindowSamples:split.map((e,index)=>({t:String(e&&((e.t||e.ts))||''),pct:splitPcts[index],detail:String(e&&e.detail||'')})),
    fullscreenMode,fullscreenEvents:fullscreen.length,
    splitShadowEvents:splitShadow.length,splitShadowState:/^(NORMAL|SUSPECTED|CONFIRMED|AMBIGUOUS|EXEMPT)$/.test(lastShadow)?lastShadow:'unknown',
    splitShadowLockApplied:splitShadow.some(e=>e&&e.lockApplied===true)
  };
}
function splitWindowCsvHeaders(){return ['split_window_events','split_window_max_pct'];}
function splitWindowCsvValues(r){
  const s=verifierSecuritySummary(r);
  if(s.telemetryState!=='PRESENT')return ['',''];
  return [s.splitWindowEvents,s.splitWindowMaxPct==null?'':s.splitWindowMaxPct];
}
function splitWindowSecuritySignal(r){const s=verifierSecuritySummary(r);if(!s.splitWindowEvents)return null;return {label:'zjištěno malé / rozdělené okno — klientská heuristika',detail:'záznamů: '+s.splitWindowEvents+'; '+(s.splitWindowMaxPct==null?'maximum Nezjištěno':('maximum '+s.splitWindowMaxPct+' %'))+(s.splitWindowUnknownPctCount?'; bez měření: '+s.splitWindowUnknownPctCount:'')+'. Nejde o důkaz podvodu ani pravidlo automatického zámku.'};}
function criticalHistoryRequired(){const v=String(CONFIG.generatorVersion||'').split('.').map(Number);return v[0]>7||v[0]===7&&(v[1]>1||v[1]===1&&v[2]>=92);}
function criticalHistoryAssessment(r){
  if(!Array.isArray(r&&r.criticalEvents)||!r.criticalCounters)return {legacy:true,mismatch:false,missingRequired:criticalHistoryRequired()};
  const count={locks:0,unlocks:0,resumes:0,badUnlocks:0};r.criticalEvents.forEach(e=>{const k=({locked:'locks','recovery-unlock':'unlocks','attempt-resumed-after-reload':'resumes','bad-unlock':'badUnlocks'})[e.type];if(k)count[k]++;});
  const types=['locked','recovery-authorized','recovery-unlock','bad-unlock','persistence-integrity','attempt-resumed-after-reload','page-discarded','page-restored','left-window','large-paste','paste-blocked','critical-events-overflow'];
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
