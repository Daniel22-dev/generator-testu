// Owner-confirmed, private Forms import policy. Never serialized to the student.
function verifierFormsStatusHtml(){return '<div class="forms-verify-summary" id="formsVerifySummary"><div><b>Ověření Google Forms</b><span id="formsVerifySummaryText">Není nastaveno.</span></div><button type="button" class="secondary" id="formsVerifySummaryBtn" onclick="openFormsVerificationSettings()">Nastavit ověření</button></div>';}
function verifierAnchorSettingsHtml(){return '<section class="card forms-verify-settings" id="formsAnchorSettings"><h2>Ověření Google Forms</h2><p class="small">Jde o bezpečnostní nastavení importu: verifier porovná školní účet a čas odpovědi s tímto testem.</p><div class="forms-verify-step"><b>1. Test a škola</b><div class="row"><label>Doména školních e-mailů<small>Část za @, např. ghrabuvka.cz.</small><input id="formsSchoolDomain" placeholder="např. ghrabuvka.cz" autocomplete="off"></label><label>Datum zveřejnění<small>Automaticky dnešní datum v Europe/Prague.</small><input id="formsPublishedDate" type="date" autocomplete="off"></label><label>Čas zveřejnění<small>Stačí běžný český čas, např. 13:20.</small><input id="formsPublishedTime" type="time" step="60" autocomplete="off"></label></div></div><div class="forms-verify-step"><b>2. Časové okno</b><div class="row"><label>Tolerance (min)<small>Výchozí 2 min.</small><input id="formsToleranceMinutes" type="number" min="0" max="1440" step="0.1" value="2"></label><label>Konec příjmu – datum<small>Volitelné; vyplň společně s časem.</small><input id="formsReceptionEndsDate" type="date" autocomplete="off"></label><label>Konec příjmu – čas<small>Volitelné; pozdější odevzdání se odmítne.</small><input id="formsReceptionEndsTime" type="time" step="60" autocomplete="off" oninput="ensureFormsReceptionDate()"></label></div></div><div class="forms-verify-step"><b>3. Potvrzení Formuláře</b><label class="forms-check"><input type="checkbox" id="formsVerifiedEmailConfirmed"> Sbírá ověřený e-mail.</label><label class="forms-check"><input type="checkbox" id="formsDomainRestrictedConfirmed"> Je omezen na školní doménu.</label><label class="forms-check"><input type="checkbox" id="formsCsvOriginalConfirmed"> CSV je původní nezměněný export z Google Forms.</label></div><details class="forms-verify-advanced"><summary>Pokročilé: CSV sloupce</summary><div class="row"><label>Časové pásmo<input id="formsCsvTimezone" value="Europe/Prague" readonly aria-readonly="true"></label><label>Ověřený e-mail<input id="formsEmailHeader" value="E-mailová adresa" autocomplete="off"></label><label>Čas odpovědi<input id="formsTimestampHeader" value="Časové razítko" autocomplete="off"></label></div></details><div class="forms-verify-note">Verifier živý Form nevidí. Potvrzuješ proto ověřený e-mail, omezení na školní doménu a původní nezměněný CSV export. „Limit to 1 response“ může zůstat vypnutý.</div><div class="row"><button type="button" onclick="applyFormsAnchorSettings()">Uložit nastavení ověření</button><button type="button" class="ghost" onclick="returnToVerifierResults()">Zpět k výsledkům</button></div><div id="formsAnchorStatus" class="warn" role="status">Ověření není nastaveno.</div></section>';}
const SECURE_VERIFIER_ANCHORS_JS=String.raw`
let FORMS_ANCHOR_POLICY=null;
const FORMS_LOCAL_TIMEZONE='Europe/Prague';
function e3ZoneParts(ms,zone){const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}),p={};for(const v of formatter.formatToParts(new Date(ms)))if(v.type!=='literal')p[v.type]=Number(v.value);return p;}
function e3TodayInZone(zone=FORMS_LOCAL_TIMEZONE){const p=e3ZoneParts(Date.now(),zone);return String(p.year).padStart(4,'0')+'-'+String(p.month).padStart(2,'0')+'-'+String(p.day).padStart(2,'0');}
function e3PragueLocalIso(dateValue,timeValue){
  const dm=String(dateValue||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/),tm=String(timeValue||'').trim().match(/^(\d{2}):(\d{2})$/);if(!dm||!tm)return '';
  const y=Number(dm[1]),mo=Number(dm[2]),d=Number(dm[3]),h=Number(tm[1]),mi=Number(tm[2]);if(h>23||mi>59)return '';
  const wall=e3WallTimestamp(d+'.'+mo+'.'+y+' '+h+':'+String(mi).padStart(2,'0')+':00',FORMS_LOCAL_TIMEZONE);if(!Number.isFinite(wall))return '';
  const p=e3ZoneParts(wall,FORMS_LOCAL_TIMEZONE),localUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second),offsetMinutes=Math.round((localUtc-wall)/60000),sign=offsetMinutes>=0?'+':'-',abs=Math.abs(offsetMinutes),oh=String(Math.floor(abs/60)).padStart(2,'0'),om=String(abs%60).padStart(2,'0');
  return dm[1]+'-'+dm[2]+'-'+dm[3]+'T'+tm[1]+':'+tm[2]+':00'+sign+oh+':'+om;
}
function e3PolicyTimestamp(input,kind){
  const isPublication=kind==='publication',direct=String(input&&input[isPublication?'publishedAt':'receptionEndsAt']||'').trim();
  if(direct){e3Require(Number.isFinite(e3Iso(direct)),isPublication?'anchors.config-publication':'anchors.config-deadline',isPublication?'Zadej platné datum a čas zveřejnění.':'Konec příjmu má neplatné datum nebo čas.');return direct;}
  const date=String(input&&input[isPublication?'publishedDate':'receptionEndsDate']||'').trim(),time=String(input&&input[isPublication?'publishedTime':'receptionEndsTime']||'').trim();
  if(!isPublication&&!date&&!time)return '';
  e3Require(date&&time,isPublication?'anchors.config-publication':'anchors.config-deadline',isPublication?'Vyplň datum i čas zveřejnění.':'Konec příjmu vyplň jako datum i čas, nebo nech obě pole prázdná.');
  const iso=e3PragueLocalIso(date,time);e3Require(!!iso,isPublication?'anchors.config-publication':'anchors.config-deadline',isPublication?'Zadej platné datum a čas zveřejnění v Europe/Prague.':'Konec příjmu má neplatné nebo nejednoznačné datum/čas v Europe/Prague.');return iso;
}
function ensureFormsAnchorDefaults(){if(typeof document==='undefined')return;const date=document.getElementById('formsPublishedDate'),zone=document.getElementById('formsCsvTimezone');if(date&&!date.value)date.value=e3TodayInZone();if(zone)zone.value=FORMS_LOCAL_TIMEZONE;}
function ensureFormsReceptionDate(){if(typeof document==='undefined')return;const date=document.getElementById('formsReceptionEndsDate'),time=document.getElementById('formsReceptionEndsTime'),published=document.getElementById('formsPublishedDate');if(date&&time&&time.value&&!date.value)date.value=(published&&published.value)||e3TodayInZone();}
function refreshFormsVerificationSummary(){
  if(typeof document==='undefined')return;ensureFormsAnchorDefaults();
  const t=document.getElementById('formsVerifySummaryText'),b=document.getElementById('formsVerifySummaryBtn'),x=document.getElementById('formsVerifySummary');if(!t||!b||!x)return;
  const ready=!!FORMS_ANCHOR_POLICY;x.classList.toggle('ready',ready);t.textContent=ready?'Nastaveno pro '+FORMS_ANCHOR_POLICY.schoolDomain+'.':'Není nastaveno.';b.textContent=ready?'Upravit ověření':'Nastavit ověření';
}
function openFormsVerificationSettings(){if(typeof showVerifierPanel==='function')showVerifierPanel('security');ensureFormsAnchorDefaults();requestAnimationFrame(()=>document.getElementById('formsAnchorSettings')?.scrollIntoView({behavior:'smooth',block:'start'}));}
function returnToVerifierResults(){if(typeof showVerifierPanel==='function')showVerifierPanel('results');requestAnimationFrame(()=>document.getElementById('formsVerifySummary')?.scrollIntoView({behavior:'smooth',block:'start'}));}

function e3Email(value){const email=typeof value==='string'?value.trim().toLowerCase():'';return /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(email)&&email.length<=254?email:'';}
function e3Header(value){return String(value||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');}
function clearVerifierResults(){RESULTS=[];ATTEMPT_DECISIONS.clear();LAST_FORMS_IMPORT=null;duplicateWarnShown=false;afterResultsChanged();renderFormsImportSummary(null);}
function setFormsAnchorPolicy(input){
  input=input&&typeof input==='object'?input:{};const domain=String(input.schoolDomain||'').trim().toLowerCase();
  e3Require(domain.length<=253&&domain.includes('.')&&domain.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)),'anchors.config-domain','Zadej platnou školní doménu.');
  const publishedAt=e3PolicyTimestamp(input,'publication'),receptionEndsAt=e3PolicyTimestamp(input,'deadline');
  if(input.csvTimezone!==undefined&&String(input.csvTimezone||'').trim())e3Require(String(input.csvTimezone).trim()===FORMS_LOCAL_TIMEZONE,'anchors.config-zone','Časové pásmo verifieru je pevně Europe/Prague.');
  const zone=FORMS_LOCAL_TIMEZONE;
  e3Require(typeof input.emailHeader==='string'&&input.emailHeader.trim()&&typeof input.timestampHeader==='string'&&input.timestampHeader.trim()&&e3Header(input.emailHeader)!==e3Header(input.timestampHeader),'anchors.config-headers','Zadej rozdílné systémové sloupce e-mailu a času.');
  e3Require(input.verifiedEmailConfirmed===true&&input.domainRestrictedConfirmed===true&&input.csvOriginalConfirmed===true,'anchors.config-confirmation','Potvrď ověřený e-mail, školní doménu a původní nezměněný CSV export.');
  const toleranceMinutes=input.toleranceMinutes===undefined?2:Number(input.toleranceMinutes);
  e3Require(input.toleranceMinutes!==''&&Number.isFinite(toleranceMinutes)&&toleranceMinutes>=0&&toleranceMinutes<=1440,'anchors.config-tolerance','Tolerance musí být číslo od 0 do 1440 minut.');
  e3Require(!receptionEndsAt||e3Iso(receptionEndsAt)>=e3Iso(publishedAt),'anchors.config-deadline','Konec příjmu musí být nejdříve v čase zveřejnění.');
  FORMS_ANCHOR_POLICY=Object.freeze({toleranceMinutes,receptionEndsAt,schoolDomain:domain,publishedAt,csvTimezone:zone,emailHeader:input.emailHeader.trim(),timestampHeader:input.timestampHeader.trim(),verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true});
  clearVerifierResults();const box=$('formsAnchorStatus');if(box){box.className='ok';box.textContent='Ověření nastaveno: '+domain+' · zveřejnění '+formatReceptionTime(e3Iso(publishedAt))+'.';}refreshFormsVerificationSummary();return FORMS_ANCHOR_POLICY;
}
function applyFormsAnchorSettings(){try{setFormsAnchorPolicy({schoolDomain:$('formsSchoolDomain').value,publishedDate:$('formsPublishedDate').value,publishedTime:$('formsPublishedTime').value,toleranceMinutes:$('formsToleranceMinutes').value,receptionEndsDate:$('formsReceptionEndsDate').value,receptionEndsTime:$('formsReceptionEndsTime').value,csvTimezone:FORMS_LOCAL_TIMEZONE,emailHeader:$('formsEmailHeader').value,timestampHeader:$('formsTimestampHeader').value,verifiedEmailConfirmed:$('formsVerifiedEmailConfirmed').checked,domainRestrictedConfirmed:$('formsDomainRestrictedConfirmed').checked,csvOriginalConfirmed:$('formsCsvOriginalConfirmed').checked});vToast('Ověření Google Forms uloženo.','ok');returnToVerifierResults();}catch(error){const box=$('formsAnchorStatus');if(box){box.className='danger';box.textContent=error.message;}}}
function e3WallTimestamp(text,zone){
  const m=String(text||'').trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);if(!m)return NaN;
  const [d,mo,y,h,mi,s]=m.slice(1).map(Number),guess=Date.UTC(y,mo-1,d,h,mi,s),date=new Date(guess);
  if(y<2000||y>2200||date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d||h>23||mi>59||s>59)return NaN;
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const parts=ms=>{const p={};for(const v of formatter.formatToParts(new Date(ms)))if(v.type!=='literal')p[v.type]=Number(v.value);return p;};
  const offsets=new Set();for(const shift of [-36,0,36]){const at=guess+shift*3600000,p=parts(at);offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-at);}
  const hits=[];for(const offset of offsets){const at=guess-offset,p=parts(at);if(p.year===y&&p.month===mo&&p.day===d&&p.hour===h&&p.minute===mi&&p.second===s)hits.push(at);}
  // Missing DST wall times and repeated ambiguous wall times fail closed.
  return hits.length===1?hits[0]:NaN;
}
function e3FormsTime(text){
  const iso=e3Iso(text);if(Number.isFinite(iso)){const frac=String(text).match(/\.(\d{1,3})(?:Z|[+-])/);return {lower:iso,upper:iso+(frac?10**(3-frac[1].length):1000)-1};}
  const wall=e3WallTimestamp(text,FORMS_ANCHOR_POLICY.csvTimezone);return {lower:wall,upper:wall+999};
}
function formatReceptionTime(ms){return new Intl.DateTimeFormat('cs-CZ',{timeZone:'Europe/Prague',dateStyle:'short',timeStyle:'long'}).format(new Date(ms))+' (Europe/Prague)';}
function privatePlannedMinutes(p){
  const group=(CONFIG.diffGroups||[]).find(g=>g.key===p.groupKey),time=group&&group.a11y&&group.a11y.time;
  if(time==='none'||!(Number(CONFIG.cas)>0))return null;
  return Number(CONFIG.cas)*({'125':1.25,'150':1.5,'200':2}[time]||1);
}
function evaluateFormsAnchors(p,source){
  if(source.submissionSource!=='google-forms-csv')return {identity:'MISSING_FORMS',timeWindow:'MISSING_FORMS',diagnosticOnly:true,codes:['anchors.missing-forms']};
  e3Require(FORMS_ANCHOR_POLICY,'anchors.missing-policy','Nejsou nastaveny soukromé Forms kotvy.');
  e3Require(CONFIG.identityMode==='oneTimeCode'&&Array.isArray(CONFIG.roster)&&CONFIG.roster.length>0,'anchors.roster','Forms ověření vyžaduje jednorázové kódy a soukromý roster s e-maily.');
  const codes=new Set(),emails=new Set();let target=null;
  for(const row of CONFIG.roster){const code=String(row&&row.code||'').trim().toUpperCase(),email=e3Email(row&&row.email);
    e3Require(/^[A-Z0-9]{6}$/.test(code)&&email&&email.split('@')[1]===FORMS_ANCHOR_POLICY.schoolDomain&&!codes.has(code)&&!emails.has(email),'anchors.roster','Roster má chybějící/cizí e-mail nebo duplicitní kód/účet.');codes.add(code);emails.add(email);if(code===p.code.toUpperCase())target=email;
  }
  const account=e3Email(source.formIdentity);e3Require(account&&account.split('@')[1]===FORMS_ANCHOR_POLICY.schoolDomain,'anchors.email','Chybějící nebo cizí školní Forms e-mail.');
  e3Require(target===account,'anchors.identity-mismatch','Forms e-mail neodpovídá kódu v soukromém rosteru.');
  const time=e3FormsTime(source.formTimestamp),publication=e3Iso(FORMS_ANCHOR_POLICY.publishedAt);
  e3Require(Number.isFinite(time.lower)&&time.upper>=publication,'anchors.timestamp','Neplatný, nejednoznačný nebo předpublikační čas Forms.');
  const plannedMinutes=privatePlannedMinutes(p),deadlineMs=plannedMinutes===null?null:(FORMS_ANCHOR_POLICY.receptionEndsAt?e3Iso(FORMS_ANCHOR_POLICY.receptionEndsAt)+(plannedMinutes-Number(CONFIG.cas))*60000:publication+(plannedMinutes+FORMS_ANCHOR_POLICY.toleranceMinutes)*60000);
  e3Require(deadlineMs===null||time.lower<=deadlineMs,'anchors.after-deadline','Odpověď Google Forms přišla po konci příjmu '+(deadlineMs===null?'':formatReceptionTime(deadlineMs))+'.');
  const start=e3Iso(p.startedAt),end=e3Iso(p.submittedAt);
  e3Require(start>=publication&&end<=time.upper,'anchors.time-window','Klientské časy jsou mimo okno publikace → Forms.');
  for(const event of p.securityEvents.concat(p.criticalEvents||[]))e3Require(e3Iso(event.t)>=publication&&e3Iso(event.t)<=time.upper,'anchors.event-window','Čas události je mimo externí okno.');
  if(p.jokerUsed)e3Require(e3Iso(p.jokerSelectedAt)>=publication,'anchors.joker-window','Volba žolíka je před publikací.');
  return Object.freeze({identity:'MATCHED_FORMS_ROSTER',timeWindow:plannedMinutes===null?'NO_TIME_LIMIT':'WITHIN_PUBLICATION_FORMS_WINDOW',plannedMinutes,deadlineMs,deadlineNotice:plannedMinutes===null?'Student bez časového limitu — horní mez se neuplatňuje.':'Konec příjmu: '+formatReceptionTime(deadlineMs),formsEmail:account,publishedAt:FORMS_ANCHOR_POLICY.publishedAt,formsLowerMs:time.lower,formsUpperMs:time.upper,diagnosticOnly:false,codes:[]});
}
`;
