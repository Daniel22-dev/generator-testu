// Owner-confirmed, private Forms import policy. Never serialized to the student.
function verifierFormsStatusHtml(){return '<div class="forms-verify-summary" id="formsVerifySummary"><div><b>Ověření Google Forms</b><span id="formsVerifySummaryText">Není nastaveno. Před prvním importem CSV nastav školní účet a čas zveřejnění testu.</span></div><button type="button" class="secondary" id="formsVerifySummaryBtn" onclick="openFormsVerificationSettings()">Nastavit ověření</button></div>';}
function verifierAnchorSettingsHtml(){return '<section class="card forms-verify-settings" id="formsAnchorSettings"><h2>Ověření Google Forms</h2><p class="small"><strong>K čemu to je?</strong> Jde o bezpečnostní nastavení importu. Verifier díky němu kontroluje, že řádek v CSV patří ke správnému školnímu účtu a vznikl až po skutečném zveřejnění testu. Nastavuje se pro konkrétní test před prvním importem výsledků.</p><div class="forms-verify-step"><b>1. Identita školy a začátek testu</b><div class="row"><label>Doména školních e-mailů<small>Část za @ u školních účtů, např. ghrabuvka.cz.</small><input id="formsSchoolDomain" placeholder="např. ghrabuvka.cz" autocomplete="off"></label><label>Skutečný čas zveřejnění testu<small>Zadej okamžik, kdy jsi třídě zpřístupnil startovní kód/test. Ne čas vytvoření HTML. Formát např. 2026-10-05T10:15:00+02:00.</small><input id="formsPublishedAt" placeholder="2026-10-05T10:15:00+02:00" autocomplete="off"></label></div></div><div class="forms-verify-step"><b>2. Časové okno příjmu</b><div class="row"><label>Tolerance po zveřejnění (min)<small>Bezpečnostní rezerva pro drobný rozdíl časových razítek. Doporučená výchozí hodnota: 2 min.</small><input id="formsToleranceMinutes" type="number" min="0" max="1440" step="0.1" value="2"></label><label>Konec příjmu výsledků<small>Volitelné. Pokud ho zadáš, verifier odmítne pozdější odevzdání; individuální prodloužení času zohlední automaticky.</small><input id="formsReceptionEndsAt" placeholder="volitelné, ISO s pásmem" autocomplete="off"></label></div></div><div class="forms-verify-step"><b>3. Potvrď nastavení školního Formuláře</b><label class="forms-check"><input type="checkbox" id="formsVerifiedEmailConfirmed"> Form sbírá ověřený e-mail přihlášeného uživatele.</label><label class="forms-check"><input type="checkbox" id="formsDomainRestrictedConfirmed"> Form je omezen na školní doménu.</label><label class="forms-check"><input type="checkbox" id="formsOneResponseConfirmed"> Form povoluje jednu odpověď na účet a načítám vlastní nezměněný CSV export.</label></div><details class="forms-verify-advanced"><summary>Pokročilé nastavení CSV — obvykle není třeba měnit</summary><div class="row"><label>Časové pásmo CSV<input id="formsCsvTimezone" value="Europe/Prague" autocomplete="off"></label><label>Sloupec ověřeného e-mailu<input id="formsEmailHeader" value="E-mailová adresa" autocomplete="off"></label><label>Sloupec času odpovědi<input id="formsTimestampHeader" value="Časové razítko" autocomplete="off"></label></div><p class="small">Měň jen tehdy, pokud má export z Google Forms jiné názvy systémových sloupců nebo jiné časové pásmo.</p></details><div class="forms-verify-note"><strong>Důležité:</strong> verifier neumí nahlédnout do živého Formuláře, proto tato tři nastavení potvrzuješ ty. Bez nich import z Forms zůstane z bezpečnostních důvodů zablokovaný.</div><div class="row"><button type="button" onclick="applyFormsAnchorSettings()">Uložit nastavení ověření</button><button type="button" class="ghost" onclick="returnToVerifierResults()">Zpět k načtení výsledků</button></div><div id="formsAnchorStatus" class="warn" role="status">Ověření Forms zatím není nastaveno.</div></section>';}
const SECURE_VERIFIER_ANCHORS_JS=String.raw`
let FORMS_ANCHOR_POLICY=null;
let FORMS_VERIFY_RETURN_PANEL=null;
function refreshFormsVerificationSummary(){
  if(typeof document==='undefined')return;
  const text=document.getElementById('formsVerifySummaryText'),btn=document.getElementById('formsVerifySummaryBtn'),box=document.getElementById('formsVerifySummary');
  if(!text||!btn||!box)return;
  const ready=!!FORMS_ANCHOR_POLICY;
  box.classList.toggle('ready',ready);
  if(ready){
    text.textContent='Nastaveno pro '+FORMS_ANCHOR_POLICY.schoolDomain+' · zveřejnění '+FORMS_ANCHOR_POLICY.publishedAt+'.';
    btn.textContent='Upravit ověření';
  }else{
    text.textContent='Není nastaveno. Před prvním importem CSV nastav školní účet a čas zveřejnění testu.';
    btn.textContent='Nastavit ověření';
  }
}
function openFormsVerificationSettings(){
  FORMS_VERIFY_RETURN_PANEL='results';
  if(typeof showVerifierPanel==='function')showVerifierPanel('security');
  requestAnimationFrame(()=>document.getElementById('formsAnchorSettings')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function returnToVerifierResults(){
  FORMS_VERIFY_RETURN_PANEL=null;
  if(typeof showVerifierPanel==='function')showVerifierPanel('results');
  requestAnimationFrame(()=>document.getElementById('formsVerifySummary')?.scrollIntoView({behavior:'smooth',block:'start'}));
}

function e3Email(value){const email=typeof value==='string'?value.trim().toLowerCase():'';return /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(email)&&email.length<=254?email:'';}
function e3Header(value){return String(value||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');}
function clearVerifierResults(){RESULTS=[];ATTEMPT_DECISIONS.clear();LAST_FORMS_IMPORT=null;duplicateWarnShown=false;afterResultsChanged();renderFormsImportSummary(null);}
function setFormsAnchorPolicy(input){
  const domain=String(input&&input.schoolDomain||'').trim().toLowerCase();
  e3Require(domain.length<=253&&domain.includes('.')&&domain.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)),'anchors.config-domain','Zadej platnou školní doménu.');
  e3Require(Number.isFinite(e3Iso(input.publishedAt)),'anchors.config-publication','Publikace vyžaduje ISO čas s explicitním pásmem.');
  const zone=String(input.csvTimezone||'');try{new Intl.DateTimeFormat('en-GB',{timeZone:zone}).format();}catch{throw e3Error('anchors.config-zone','Neplatné IANA časové pásmo CSV.');}
  e3Require(zone&&typeof input.emailHeader==='string'&&input.emailHeader.trim()&&typeof input.timestampHeader==='string'&&input.timestampHeader.trim()&&e3Header(input.emailHeader)!==e3Header(input.timestampHeader),'anchors.config-headers','Zadej rozdílné systémové sloupce e-mailu a času.');
  e3Require(input.verifiedEmailConfirmed===true&&input.domainRestrictedConfirmed===true&&input.oneResponseConfirmed===true,'anchors.config-confirmation','Potvrď všechny tři položky nastavení a původu CSV.');
  const toleranceMinutes=input.toleranceMinutes===undefined?2:Number(input.toleranceMinutes);
  e3Require(input.toleranceMinutes!==''&&Number.isFinite(toleranceMinutes)&&toleranceMinutes>=0&&toleranceMinutes<=1440,'anchors.config-tolerance','Tolerance musí být číslo od 0 do 1440 minut.');
  const receptionEndsAt=String(input.receptionEndsAt||'').trim();
  e3Require(!receptionEndsAt||Number.isFinite(e3Iso(receptionEndsAt))&&e3Iso(receptionEndsAt)>=e3Iso(input.publishedAt),'anchors.config-deadline','Konec příjmu vyžaduje ISO čas s pásmem, nejdříve v čase publikace.');
  FORMS_ANCHOR_POLICY=Object.freeze({toleranceMinutes,receptionEndsAt,schoolDomain:domain,publishedAt:input.publishedAt,csvTimezone:zone,emailHeader:input.emailHeader.trim(),timestampHeader:input.timestampHeader.trim(),verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true});
  clearVerifierResults();const box=$('formsAnchorStatus');if(box){box.className='ok';box.textContent='Ověření nastaveno: '+domain+' · zveřejnění '+input.publishedAt+'.';}refreshFormsVerificationSummary();return FORMS_ANCHOR_POLICY;
}
function applyFormsAnchorSettings(){try{setFormsAnchorPolicy({schoolDomain:$('formsSchoolDomain').value,publishedAt:$('formsPublishedAt').value,toleranceMinutes:$('formsToleranceMinutes').value,receptionEndsAt:$('formsReceptionEndsAt').value,csvTimezone:$('formsCsvTimezone').value,emailHeader:$('formsEmailHeader').value,timestampHeader:$('formsTimestampHeader').value,verifiedEmailConfirmed:$('formsVerifiedEmailConfirmed').checked,domainRestrictedConfirmed:$('formsDomainRestrictedConfirmed').checked,oneResponseConfirmed:$('formsOneResponseConfirmed').checked});vToast('Ověření Google Forms uloženo.','ok');if(FORMS_VERIFY_RETURN_PANEL==='results')returnToVerifierResults();}catch(error){const box=$('formsAnchorStatus');if(box){box.className='danger';box.textContent=error.message;}}}
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
