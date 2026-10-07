// Owner-confirmed private Forms policy. Never serialized to the student.
function verifierFormsStatusHtml(){return '<div class="forms-verify-summary" id="formsVerifySummary"><div><b>Ověření Google Forms</b><span id="formsVerifySummaryText">Není nastaveno.</span></div><button type="button" class="secondary" id="formsVerifySummaryBtn" onclick="openFormsVerificationSettings()">Nastavit</button></div>';}
function verifierAnchorSettingsHtml(){return '<section class="card forms-verify-settings" id="formsAnchorSettings"><h2>Ověření Google Forms</h2><p class="small">Jde o bezpečnostní nastavení importu.</p><div class="forms-verify-step"><b>1. Test</b><div class="row"><label>Doména školy<input id="formsSchoolDomain"></label><label>Datum zveřejnění<input id="formsPublishedDate" type="date"></label><label>Čas zveřejnění<input id="formsPublishedTime" type="time" step="60"></label></div></div><div class="forms-verify-step"><b>2. Čas</b><div class="row"><label>Tolerance (min)<input id="formsToleranceMinutes" type="number" min="0" max="1440" step="0.1" value="2"></label><label>Konec – datum<input id="formsReceptionEndsDate" type="date"></label><label>Konec – čas<input id="formsReceptionEndsTime" type="time" step="60" oninput="ensureFormsReceptionDate()"></label></div></div><div class="forms-verify-step"><b>3. Potvrď</b><label class="forms-check"><input type="checkbox" id="formsVerifiedEmailConfirmed"> Ověřený e-mail.</label><label class="forms-check"><input type="checkbox" id="formsDomainRestrictedConfirmed"> Školní doména.</label><label class="forms-check"><input type="checkbox" id="formsCsvOriginalConfirmed"> Původní nezměněné CSV z Google Forms.</label></div><details class="forms-verify-advanced"><summary>CSV sloupce</summary><div class="row"><label>Časové pásmo<input id="formsCsvTimezone" value="Europe/Prague" readonly></label><label>Ověřený e-mail<input id="formsEmailHeader" value="E-mailová adresa"></label><label>Čas odpovědi<input id="formsTimestampHeader" value="Časové razítko"></label></div></details><div class="forms-verify-note">Čas např. 13:20; Limit 1 response: OFF.</div><div class="row"><button type="button" onclick="applyFormsAnchorSettings()">Uložit nastavení ověření</button><button type="button" class="ghost" onclick="returnToVerifierResults()">Zpět k výsledkům</button></div><div id="formsAnchorStatus" class="warn" role="status">Nenastaveno.</div></section>';}
const SECURE_VERIFIER_ANCHORS_JS=String.raw`
let FORMS_ANCHOR_POLICY=null;const FORMS_LOCAL_TIMEZONE='Europe/Prague',FORMS_DTF=new Intl.DateTimeFormat('en-GB',{timeZone:FORMS_LOCAL_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});function e3ZoneParts(ms){const p={};for(const v of FORMS_DTF.formatToParts(new Date(ms)))if(v.type!=='literal')p[v.type]=+v.value;return p;}
function e3TodayInZone(){const p=e3ZoneParts(Date.now()),z=n=>String(n).padStart(2,'0');return p.year+'-'+z(p.month)+'-'+z(p.day);}
function e3CivilEpoch(y,mo,d,h,mi,s){
  const g=Date.UTC(y,mo-1,d,h,mi,s),q=new Date(g);
  if(y<2000||y>2200||mo<1||mo>12||d<1||h<0||h>23||mi<0||mi>59||s<0||s>59||q.getUTCFullYear()!==y||q.getUTCMonth()!==mo-1||q.getUTCDate()!==d)return NaN;
  return g;
}
function e3WallCandidates(y,mo,d,h,mi,s,zone){
  const g=e3CivilEpoch(y,mo,d,h,mi,s);if(!Number.isFinite(g))return [];
  const offsets=new Set();for(const k of [-36,0,36]){const t=g+k*3600000,p=e3ZoneParts(t,zone);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-t);}
  const hits=[];for(const o of offsets){const t=g-o,p=e3ZoneParts(t,zone);if(p.year===y&&p.month===mo&&p.day===d&&p.hour===h&&p.minute===mi&&p.second===s)hits.push(t);}
  return [...new Set(hits)];
}
function e3WallTimestamp(t,z){
  const m=String(t||'').trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);if(!m)return NaN;
  const[d,mo,y,h,mi,s]=m.slice(1).map(Number);try{const a=e3WallCandidates(y,mo,d,h,mi,s,z||FORMS_LOCAL_TIMEZONE);return a.length===1?a[0]:NaN;}catch(_){return NaN;}
}
function e3FormsTime(value){
  const raw=String(value??'').trim().replace(/\u00a0/g,' '),bad=reason=>e3Error('anchors.timestamp-format','\u010cas Forms "'+raw.slice(0,120)+'": '+reason+' Pou\u017eij p\u016fvodn\u00ed CSV nebo jednozna\u010dn\u00fd ISO \u010das s posunem; bez uveden\u00e9 z\u00f3ny plat\u00ed '+(FORMS_ANCHOR_POLICY?.csvTimezone||FORMS_LOCAL_TIMEZONE)+'.');
  if(!raw||raw.length>120)throw bad('pr\u00e1zdn\u00e1 nebo p\u0159\u00edli\u0161 dlouh\u00e1 hodnota.');
  const iso=e3Iso(raw);if(Number.isFinite(iso)){const f=raw.match(/\.(\d{1,3})(?:Z|[+-])/);return {lower:iso,upper:iso+(f?10**(3-f[1].length):1000)-1};}
  let text=raw,offset=null;
  const zm=text.match(/\s+(Z|[A-Za-z]{2,10}|(?:GMT|UTC)[+-]\d{1,2}(?::\d{2})?|[+-]\d{2}:\d{2})$/i);
  if(zm&&!/^(am|pm)$/i.test(zm[1])){
    const zone=zm[1].toUpperCase(),fixed={Z:0,CET:60,CEST:120,EET:120,EEST:180,WET:0,WEST:60,UTC:0,GMT:0};
    if(Object.prototype.hasOwnProperty.call(fixed,zone))offset=fixed[zone];
    else{const n=zone.match(/^(?:(?:GMT|UTC))?([+-])(\d{1,2})(?::(\d{2}))?$/);if(!n||+n[2]>14||+(n[3]||0)>59||+n[2]===14&&+(n[3]||0)!==0)throw e3Error('anchors.timestamp-zone','Nezn\u00e1m\u00e1 nebo neplatn\u00e1 z\u00f3na "'+zone+'" v \u010dase Forms "'+raw+'". Pou\u017eij CET/CEST, EET/EEST, WET/WEST, UTC/GMT, GMT\u00b1H:MM nebo ISO s posunem.');offset=(+n[2]*60+(+(n[3]||0)))*(n[1]==='-'?-1:1);}
    text=text.slice(0,zm.index).trim();
  }
  let meridian='',am=text.match(/\s+(am|pm)$/i);if(am){meridian=am[1].toLowerCase();text=text.slice(0,am.index).trim();}
  let m,y,mo,d,h,mi,s,precision;
  if((m=text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/))){[y,mo,d,h,mi]=m.slice(1,6).map(Number);s=+(m[6]||0);precision=m[6]===undefined?60000:1000;}
  else if((m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/))){[mo,d,y,h,mi]=m.slice(1,6).map(Number);s=+(m[6]||0);precision=m[6]===undefined?60000:1000;}
  else if((m=text.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/))){[d,mo,y,h,mi]=m.slice(1,6).map(Number);s=+(m[6]||0);precision=m[6]===undefined?60000:1000;}
  else throw bad('nepodporovan\u00fd form\u00e1t (YYYY/MM/DD, americk\u00e9 M/D/YYYY, \u010desk\u00e9 D. M. YYYY nebo ISO).');
  if(meridian){if(h<1||h>12)throw bad('hodina s AM/PM mus\u00ed b\u00fdt 1\u201312.');h=h%12+(meridian==='pm'?12:0);}
  const civil=e3CivilEpoch(y,mo,d,h,mi,s);if(!Number.isFinite(civil))throw bad('neexistuj\u00edc\u00ed datum nebo \u010das.');
  let lower;
  if(offset!==null)lower=civil-offset*60000;
  else{
    const hits=e3WallCandidates(y,mo,d,h,mi,s,FORMS_ANCHOR_POLICY?.csvTimezone||FORMS_LOCAL_TIMEZONE);
    if(hits.length!==1)throw e3Error('anchors.timestamp-ambiguous','\u010cas Forms "'+raw+'" je '+(hits.length?'nejednozna\u010dn\u00fd p\u0159i p\u0159echodu na zimn\u00ed \u010das.':'neexistuj\u00edc\u00ed p\u0159i p\u0159echodu na letn\u00ed \u010das.')+' Uve\u010f explicitn\u00ed z\u00f3nu (CET/CEST) nebo ISO s posunem.');
    lower=hits[0];
  }
  return {lower,upper:lower+precision-1};
}
function e3PragueLocalIso(d,t){const a=String(d||'').match(/^(\d{4})-(\d{2})-(\d{2})$/),b=String(t||'').match(/^(\d{2}):(\d{2})$/);if(!a||!b)return '';const ms=e3WallTimestamp(+a[3]+'.'+ +a[2]+'.'+ +a[1]+' '+ +b[1]+':'+b[2]+':00',FORMS_LOCAL_TIMEZONE);return Number.isFinite(ms)?new Date(ms).toISOString():'';}
function e3PolicyTimestamp(i,k){
  const first=k==='publication',raw=String(i?.[first?'publishedAt':'receptionEndsAt']||'').trim();
  if(raw){e3Require(Number.isFinite(e3Iso(raw)),first?'anchors.config-publication':'anchors.config-deadline','Neplatn\u00fd ISO \u010das hodiny.');return raw;}
  const d=String(i?.[first?'publishedDate':'receptionEndsDate']||''),t=String(i?.[first?'publishedTime':'receptionEndsTime']||'');
  if(!t)return '';e3Require(d,'anchors.config-time','Vypl\u0148 datum i \u010das hodiny.');const x=e3PragueLocalIso(d,t);e3Require(x,'anchors.config-time','Neplatn\u00fd nebo nejednozna\u010dn\u00fd \u010das Europe/Prague.');return x;
}
function e3Email(v){const e=typeof v==='string'?v.trim().toLowerCase():'';return /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(e)&&e.length<=254?e:'';}
function e3Header(v){return String(v||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');}
function normalizeVerifierFormsPolicy(input){
  const i=input&&typeof input==='object'?input:{},d=String(i.schoolDomain||'').trim().toLowerCase();
  e3Require(d.length<=253&&d.includes('.')&&d.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)),'anchors.config-domain','Neplatn\u00e1 dom\u00e9na \u0161koly.');
  e3Require(i.verifiedEmailConfirmed===true&&i.domainRestrictedConfirmed===true&&i.csvOriginalConfirmed===true,'anchors.config-confirmation','Potvr\u010f ov\u011b\u0159en\u00fd e-mail, \u0161koln\u00ed dom\u00e9nu a p\u016fvodn\u00ed CSV.');
  const emailHeader=String(i.emailHeader||'auto').trim(),timestampHeader=String(i.timestampHeader||'auto').trim();
  e3Require(emailHeader.length<=120&&timestampHeader.length<=120&&(emailHeader==='auto'||timestampHeader==='auto'||e3Header(emailHeader)!==e3Header(timestampHeader)),'anchors.config-headers','Neplatn\u00e9 syst\u00e9mov\u00e9 sloupce CSV.');
  const zone=String(i.csvTimezone||FORMS_LOCAL_TIMEZONE);try{e3ZoneParts(Date.now(),zone);}catch(_){throw e3Error('anchors.config-zone','Neplatn\u00e1 \u010dasov\u00e1 z\u00f3na CSV.');}
  const m=i.toleranceMinutes===undefined?2:Number(i.toleranceMinutes);e3Require(i.toleranceMinutes!==''&&Number.isFinite(m)&&m>=0&&m<=1440,'anchors.config-tolerance','Neplatn\u00e1 tolerance (0\u20131440 minut).');
  const teachers=Array.isArray(i.teacherEmails)?[...new Set(i.teacherEmails.map(e3Email))]:[];
  e3Require(teachers.length<=12&&teachers.every(e=>e&&e.split('@')[1]===d),'anchors.config-teachers','E-maily u\u010ditel\u016f musej\u00ed b\u00fdt ze \u0161koln\u00ed dom\u00e9ny.');
  const p=e3PolicyTimestamp(i,'publication'),r=e3PolicyTimestamp(i,'deadline');e3Require(!r||p&&e3Iso(r)>=e3Iso(p),'anchors.config-deadline','Konec p\u0159\u00edjmu je p\u0159ed za\u010d\u00e1tkem hodiny.');
  return Object.freeze({schoolDomain:d,teacherEmails:Object.freeze(teachers),csvTimezone:zone,emailHeader,timestampHeader,toleranceMinutes:m,publishedAt:p,receptionEndsAt:r,windowSource:p?'manual':'lesson-csv',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:i.lessonMarkersConfirmed===true});
}
function ensureFormsAnchorDefaults(){
  if(typeof document==='undefined')return;const p=FORMS_ANCHOR_POLICY,baked=!!CONFIG.formsAnchorPolicy;
  for(const el of document.querySelectorAll('.forms-fixed-settings'))el.hidden=baked;
  const d=$('formsPublishedDate');if(d&&!d.value)d.value=e3TodayInZone();
  if(p){for(const [id,key] of [['formsSchoolDomain','schoolDomain'],['formsEmailHeader','emailHeader'],['formsTimestampHeader','timestampHeader'],['formsCsvTimezone','csvTimezone'],['formsToleranceMinutes','toleranceMinutes']])if($(id)&&!$(id).dataset.edited)$(id).value=p[key];for(const id of ['formsVerifiedEmailConfirmed','formsDomainRestrictedConfirmed','formsCsvOriginalConfirmed'])if(baked&&$(id))$(id).checked=true;}
}
function ensureFormsReceptionDate(){const d=$('formsReceptionEndsDate'),t=$('formsReceptionEndsTime');if(d&&t&&t.value&&!d.value)d.value=$('formsPublishedDate')?.value||e3TodayInZone();}
function refreshFormsVerificationSummary(){
  if(typeof document==='undefined')return;ensureFormsAnchorDefaults();const p=FORMS_ANCHOR_POLICY,t=$('formsVerifySummaryText'),b=$('formsVerifySummaryBtn'),x=$('formsVerifySummary');
  if(x)x.classList.toggle('ready',!!p);if(t)t.textContent=p?'Nastaveno: '+p.schoolDomain+'. '+(p.publishedAt?'\u010casov\u00e9 okno zadan\u00e9 ru\u010dn\u011b'+(FORMS_LESSON_WINDOWS.length?' \u2013 p\u0159episuje zna\u010dky z CSV.':'.'):(FORMS_LESSON_WINDOWS.length?'Okno z CSV \u2013 '+FORMS_LESSON_WINDOWS.length+' hodina/hodin.':'\u010cas hodiny se na\u010dte z CSV.')):'Chyb\u00ed pevn\u00e9 nastaven\u00ed. Pou\u017eij nov\u00fd verifier nebo Nastavit.';
  if(b)b.textContent=p?'Ru\u010dn\u00ed \u010das / nastaven\u00ed':'Nastavit';
  const ls=$('formsLessonStatus');if(ls)ls.textContent=(p?.publishedAt&&FORMS_LESSON_WINDOWS.length?'Ru\u010dn\u00ed okno p\u0159episuje zna\u010dky z CSV. ':'')+(FORMS_LESSON_WINDOWS.length?FORMS_LESSON_WINDOWS.map(w=>'Hodina zah\u00e1jena '+formatReceptionTime(w.startMs)+(w.endMs!=null?', ukon\u010dena '+formatReceptionTime(w.endMs):' (bez zna\u010dky konce: limit testu + tolerance)')+' \u2013 '+w.teacherEmail).join(' | '):(p?.publishedAt?'\u010casov\u00e9 okno zadan\u00e9 ru\u010dn\u011b: '+formatReceptionTime(e3Iso(p.publishedAt))+(p.receptionEndsAt?' \u2013 '+formatReceptionTime(e3Iso(p.receptionEndsAt)):'.'):'\u010cas hodiny se na\u010dte z p\u016fvodn\u00edho CSV. Samotn\u00e9 otev\u0159en\u00ed odkazu hodinu nezahajuje.'));
}
function openFormsVerificationSettings(){showVerifierPanel?.('security');ensureFormsAnchorDefaults();requestAnimationFrame(()=>$('formsAnchorSettings')?.scrollIntoView({behavior:'smooth',block:'start'}));}
function returnToVerifierResults(){showVerifierPanel?.('results');requestAnimationFrame(()=>$('formsVerifySummary')?.scrollIntoView({behavior:'smooth',block:'start'}));}
function openFormsLesson(kind){const link=formsLessonLink(CONFIG,kind);if(!link){vToast('Chyb\u00ed mapov\u00e1n\u00ed pole zna\u010dky hodiny. U star\u0161\u00edho testu pou\u017eij ru\u010dn\u00ed \u010dasov\u00e9 okno.','warn');return;}window.open(link,'_blank','noopener,noreferrer');}
async function copyFormsLessonLink(){const link=formsLessonLink(CONFIG,'START');if(!link)return;try{await navigator.clipboard.writeText(link);vToast('Odkaz zkop\u00edrov\u00e1n. Na telefonu jej otev\u0159i a formul\u00e1\u0159 ode\u0161li.','ok');}catch(_){const el=$('formsLessonStartLink');el?.focus();el?.select();vToast('Odkaz je ozna\u010den\u00fd; zkop\u00edruj jej ru\u010dn\u011b.','warn');}}
function clearVerifierResults(){RESULTS=[];ATTEMPT_DECISIONS.clear();PRIVATE_CONFIRMED_IDENTITIES.clear();LAST_FORMS_IMPORT=null;FORMS_CSV_BATCHES=[];FORMS_LESSON_WINDOWS=[];FORMS_LESSON_NOTICES=[];duplicateWarnShown=false;afterResultsChanged();renderFormsImportSummary(null);refreshFormsVerificationSummary();}
async function setFormsAnchorPolicy(i){
  const base=Object.assign({},CONFIG.formsAnchorPolicy||{},FORMS_ANCHOR_POLICY||{},i||{});if(i&&('publishedDate' in i||'publishedTime' in i))delete base.publishedAt;if(i&&('receptionEndsDate' in i||'receptionEndsTime' in i))delete base.receptionEndsAt;if(CONFIG.formsAnchorPolicy)for(const key of ['teacherEmails','schoolDomain','verifiedEmailConfirmed','domainRestrictedConfirmed','csvOriginalConfirmed','lessonMarkersConfirmed'])base[key]=CONFIG.formsAnchorPolicy[key];const next=normalizeVerifierFormsPolicy(base);
  const previous=FORMS_ANCHOR_POLICY;FORMS_ANCHOR_POLICY=next;
  const b=$('formsAnchorStatus');if(b){b.className='ok';b.textContent='Nastaveno: '+next.schoolDomain+(next.publishedAt?' \u2013 \u010dasov\u00e9 okno zadan\u00e9 ru\u010dn\u011b.':'.');}
  try{if(typeof queueFormsReevaluation==='function'&&FORMS_CSV_BATCHES.length)await queueFormsReevaluation();}catch(error){FORMS_ANCHOR_POLICY=previous;refreshFormsVerificationSummary();throw error;}
  refreshFormsVerificationSummary();return next;
}
async function applyFormsAnchorSettings(){
  try{ensureFormsReceptionDate();await setFormsAnchorPolicy({schoolDomain:$('formsSchoolDomain').value,publishedDate:$('formsPublishedDate').value,publishedTime:$('formsPublishedTime').value,toleranceMinutes:$('formsToleranceMinutes').value,receptionEndsDate:$('formsReceptionEndsDate').value,receptionEndsTime:$('formsReceptionEndsTime').value,csvTimezone:FORMS_ANCHOR_POLICY?.csvTimezone||FORMS_LOCAL_TIMEZONE,emailHeader:$('formsEmailHeader').value,timestampHeader:$('formsTimestampHeader').value,verifiedEmailConfirmed:$('formsVerifiedEmailConfirmed').checked,domainRestrictedConfirmed:$('formsDomainRestrictedConfirmed').checked,csvOriginalConfirmed:$('formsCsvOriginalConfirmed').checked});vToast('Nastaven\u00ed ulo\u017eeno; na\u010dten\u00e1 CSV byla znovu ov\u011b\u0159ena.','ok');returnToVerifierResults();}catch(e){const b=$('formsAnchorStatus');if(b){b.className='danger';b.textContent=e.message;}}
}
function formatReceptionTime(ms){return new Intl.DateTimeFormat('cs-CZ',{timeZone:FORMS_LOCAL_TIMEZONE,dateStyle:'short',timeStyle:'long'}).format(new Date(ms))+' (Europe/Prague)';}
function privatePlannedMinutes(p){const g=(CONFIG.diffGroups||[]).find(x=>x.key===p.groupKey),t=g?.a11y?.time;if(t==='none'||!(+CONFIG.cas>0))return null;return +CONFIG.cas*({'125':1.25,'150':1.5,'200':2}[t]||1);}
// A START marker is sent by a human; client-reported start/telemetry may precede it slightly.
// The Google Forms server timestamp itself must never precede the trusted START marker.
const FORMS_START_GRACE_MS=10*60000;
function formsManualWindow(){const p=FORMS_ANCHOR_POLICY;return p?.publishedAt?{startMs:e3Iso(p.publishedAt),endMs:p.receptionEndsAt?e3Iso(p.receptionEndsAt):null,source:'manual',teacherEmail:''}:null;}
function formsWindowFor(ms,startedMs){
  // An explicit manual window is the teacher's correction and overrides CSV markers (wrong, late, repeated or early END).
  const manual=formsManualWindow();if(manual)return manual;
  const candidates=FORMS_LESSON_WINDOWS.filter(w=>w.startMs<=ms).sort((a,b)=>b.startMs-a.startMs);
  if(!candidates.length)return null;
  // A repeated START must not invalidate attempts that began in the earlier window.
  if(Number.isFinite(startedMs)){for(const w of candidates)if(startedMs>=w.startMs)return w;for(const w of candidates)if(startedMs>=w.startMs-FORMS_START_GRACE_MS)return w;}
  return candidates[0];
}
function formsWindowAt(ms){return formsWindowFor(ms,NaN);}
function evaluateFormsAnchors(p,source){
  if(source.submissionSource!=='google-forms-csv')return {identity:'MISSING_FORMS',timeWindow:'MISSING_FORMS',diagnosticOnly:true,codes:['anchors.missing-forms']};
  e3Require(FORMS_ANCHOR_POLICY,'anchors.missing-policy','Chyb\u00ed nastaven\u00ed ov\u011b\u0159en\u00ed Forms. Otev\u0159i Nastavit.');
  e3Require(CONFIG.identityMode==='oneTimeCode'&&Array.isArray(CONFIG.roster)&&CONFIG.roster.length,'anchors.roster','Verifier nem\u00e1 roster s osobn\u00edmi k\u00f3dy.');
  const codes=new Set(),emails=new Set();let target=null;
  for(const row of CONFIG.roster){const c=String(row?.code||'').trim().toUpperCase(),e=e3Email(row?.email);e3Require(/^[A-Z0-9]{6}$/.test(c)&&e&&e.split('@')[1]===FORMS_ANCHOR_POLICY.schoolDomain&&!codes.has(c)&&!emails.has(e),'anchors.roster','Roster obsahuje neplatn\u00fd nebo duplicitn\u00ed k\u00f3d/e-mail.');codes.add(c);emails.add(e);if(c===p.code.toUpperCase())target=e;}
  const a=e3Email(source.formIdentity);e3Require(a&&a.split('@')[1]===FORMS_ANCHOR_POLICY.schoolDomain,'anchors.email','Forms \u00fa\u010det nen\u00ed ov\u011b\u0159en\u00fdm e-mailem ze \u0161koln\u00ed dom\u00e9ny.');
  e3Require(target===a,'anchors.identity-mismatch','Forms \u00fa\u010det pat\u0159\u00ed jin\u00e9mu studentovi ne\u017e osobn\u00ed k\u00f3d. Zkontroluj \u00fa\u010det a roster; automatick\u00e9 uzn\u00e1n\u00ed je blokov\u00e1no.');
  const t=e3FormsTime(source.formTimestamp),w=formsWindowFor(t.lower,e3Iso(p.startedAt)),notes=[];
  e3Require(w,'anchors.missing-window','Pro toto odevzd\u00e1n\u00ed chyb\u00ed p\u0159edchoz\u00ed zna\u010dka hodiny. U CSV bez zna\u010dek zadej datum, za\u010d\u00e1tek a konec ru\u010dn\u011b.');
  const grace=w.source==='manual'?0:FORMS_START_GRACE_MS;
  const pub=w.startMs,plan=privatePlannedMinutes(p);
  // Preserve the legacy manual baseline + private accommodation; an explicit teacher END closes the entire lesson.
  const end=w.source==='manual'?(plan===null?null:(w.endMs!=null?w.endMs+(plan-Number(CONFIG.cas))*60000:pub+(plan+FORMS_ANCHOR_POLICY.toleranceMinutes)*60000)):(w.endMs!=null?w.endMs:(plan===null?null:pub+(plan+FORMS_ANCHOR_POLICY.toleranceMinutes)*60000));
  e3Require(t.upper>=pub,'anchors.timestamp','Forms odevzd\u00e1n\u00ed p\u0159edch\u00e1z\u00ed za\u010d\u00e1tku hodiny. Pokud byla zna\u010dka START odesl\u00e1na pozd\u011b, otev\u0159i \u201eRu\u010dn\u00ed \u010das / nastaven\u00ed\u201c a zadej skute\u010dn\u00fd za\u010d\u00e1tek hodiny.');
  e3Require(end===null||t.lower<=end,'anchors.after-deadline','Odevzd\u00e1n\u00ed dorazilo po konci p\u0159\u00edjmu: '+(end===null?'':formatReceptionTime(end))+'.'+(w.source==='manual'?' Zkontroluj ru\u010dn\u011b zadan\u00fd \u010das hodiny.':' Pokud byl konec ozna\u010den omylem p\u0159\u00edli\u0161 brzy, otev\u0159i \u201eRu\u010dn\u00ed \u010das / nastaven\u00ed\u201c a zadej skute\u010dn\u00fd za\u010d\u00e1tek a konec hodiny.'));
  const start=e3Iso(p.startedAt),finish=e3Iso(p.submittedAt);
  e3Require(start>=pub-grace,'anchors.time-window','Za\u010d\u00e1tek p\u0159\u00edjmu '+formatReceptionTime(pub)+' je po zah\u00e1jen\u00ed testu '+formatReceptionTime(start)+'. \u010cas studenta je jen n\u00e1pov\u011bda z jeho za\u0159\u00edzen\u00ed; okno se podle n\u011bj nem\u011bn\u00ed.'+(w.source==='manual'?' Posu\u0148 ru\u010dn\u00ed za\u010d\u00e1tek d\u0159\u00edv.':' Pokud byla zna\u010dka START odesl\u00e1na pozd\u011b, otev\u0159i \u201eRu\u010dn\u00ed \u010das / nastaven\u00ed\u201c a zadej skute\u010dn\u00fd za\u010d\u00e1tek hodiny.'));
  if(start<pub)notes.push('Test zah\u00e1jen '+Math.max(1,Math.round((pub-start)/60000))+' min p\u0159ed odesl\u00e1n\u00edm zna\u010dky START (v toleranci 10 min).');
  e3Require(finish<=t.upper,'anchors.time-window','Klientsk\u00e9 odevzd\u00e1n\u00ed je a\u017e po serverov\u00e9m \u010dase Forms. Zkontroluj hodiny za\u0159\u00edzen\u00ed a p\u016fvodn\u00ed CSV.');
  for(const e of p.securityEvents.concat(p.criticalEvents||[]))e3Require(e3Iso(e.t)>=pub-grace&&e3Iso(e.t)<=t.upper,'anchors.event-window','Ud\u00e1lost le\u017e\u00ed mimo \u010dasov\u00e9 okno hodiny.');
  if(p.jokerUsed)e3Require(e3Iso(p.jokerSelectedAt)>=pub-grace,'anchors.joker-window','\u017dol\u00edk byl zvolen p\u0159ed za\u010d\u00e1tkem p\u0159\u00edjmu.');
  return Object.freeze({identity:'MATCHED_FORMS_ROSTER',timeWindow:plan===null&&end===null?'NO_TIME_LIMIT':'WITHIN_PUBLICATION_FORMS_WINDOW',plannedMinutes:plan,deadlineMs:end,deadlineNotice:end===null?'Bez limitu.':'Konec p\u0159\u00edjmu: '+formatReceptionTime(end),formsEmail:a,publishedAt:new Date(pub).toISOString(),formsLowerMs:t.lower,formsUpperMs:t.upper,windowSource:w.source,lessonTeacherEmail:w.teacherEmail||'',diagnosticOnly:false,codes:[],notes:Object.freeze(notes)});
}
if(CONFIG.formsAnchorPolicy)FORMS_ANCHOR_POLICY=normalizeVerifierFormsPolicy(CONFIG.formsAnchorPolicy);
`;
