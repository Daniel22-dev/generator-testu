// Owner-confirmed, private Forms import policy. Never serialized to the student.
function verifierAnchorSettingsHtml(){return '<fieldset class="card" id="formsAnchorSettings"><legend><b>Kotvy školního Google Forms</b></legend><p class="small">Zadej skutečný čas publikace ve třídě. Čas vytvoření HTML jej nenahrazuje. Nastavení a roster zůstávají u učitele.</p><div class="row"><label>Školní doména<input id="formsSchoolDomain" placeholder="skola.cz" autocomplete="off"></label><label>Publikace (ISO s časovým pásmem)<input id="formsPublishedAt" placeholder="2026-10-03T16:00:00+02:00" autocomplete="off"></label></div><div class="row"><label>Časové pásmo CSV<input id="formsCsvTimezone" value="Europe/Prague" autocomplete="off"></label><label>Sloupec ověřeného e-mailu<input id="formsEmailHeader" value="E-mailová adresa" autocomplete="off"></label><label>Sloupec času odpovědi<input id="formsTimestampHeader" value="Časové razítko" autocomplete="off"></label></div><label class="small"><input type="checkbox" id="formsVerifiedEmailConfirmed"> Form sbírá ověřený e-mail přihlášeného účtu; vybraný sloupec je tento systémový údaj.</label><br><label class="small"><input type="checkbox" id="formsDomainRestrictedConfirmed"> Form je omezen na školní doménu.</label><br><label class="small"><input type="checkbox" id="formsOneResponseConfirmed"> Form povoluje jednu odpověď na účet; CSV je vlastní nezměněný export a časové pásmo odpovídá zdroji.</label><p class="small">Checklist potvrzuje vlastník; verifier nastavení živého Formu neověřuje. Chybějící kotvy blokují příjem výsledků z Forms. Změna kotev vyčistí pracovní sadu — CSV potom načti znovu. Replay evidence přetrvá restart i vyčištění sady na stejném soukromém počítači a v témže profilu. Shodný známý záznam obnoví jednu položku; odlišný pokus zůstane konfliktem. Smazání úložiště či jiný profil tuto evidenci obejde a vyžaduje server. Verifier používej pouze na soukromém PC vlastníka mimo školu.</p><div class="row"><button type="button" onclick="applyFormsAnchorSettings()">Použít kotvy</button><button type="button" class="ghost" onclick="clearVerifierResults()">Vyčistit pracovní sadu</button></div><div id="formsAnchorStatus" class="warn" role="status">Kotvy dosud nejsou nastaveny.</div></fieldset>';}
const SECURE_VERIFIER_ANCHORS_JS=String.raw`
let FORMS_ANCHOR_POLICY=null;
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
  FORMS_ANCHOR_POLICY=Object.freeze({schoolDomain:domain,publishedAt:input.publishedAt,csvTimezone:zone,emailHeader:input.emailHeader.trim(),timestampHeader:input.timestampHeader.trim(),verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,oneResponseConfirmed:true});
  clearVerifierResults();const box=$('formsAnchorStatus');if(box){box.className='warn';box.textContent='Kotvy nastaveny: '+domain+'; publikace '+input.publishedAt+'. Původ runtime zůstává neprokázán.';}return FORMS_ANCHOR_POLICY;
}
function applyFormsAnchorSettings(){try{setFormsAnchorPolicy({schoolDomain:$('formsSchoolDomain').value,publishedAt:$('formsPublishedAt').value,csvTimezone:$('formsCsvTimezone').value,emailHeader:$('formsEmailHeader').value,timestampHeader:$('formsTimestampHeader').value,verifiedEmailConfirmed:$('formsVerifiedEmailConfirmed').checked,domainRestrictedConfirmed:$('formsDomainRestrictedConfirmed').checked,oneResponseConfirmed:$('formsOneResponseConfirmed').checked});vToast('Kotvy použity. Načti vlastní CSV export.','warn');}catch(error){const box=$('formsAnchorStatus');if(box){box.className='danger';box.textContent=error.message;}}}
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
  const start=e3Iso(p.startedAt),end=e3Iso(p.submittedAt);
  e3Require(start>=publication&&end<=time.upper,'anchors.time-window','Klientské časy jsou mimo okno publikace → Forms.');
  for(const event of p.securityEvents)e3Require(e3Iso(event.t)>=publication&&e3Iso(event.t)<=time.upper,'anchors.event-window','Čas události je mimo externí okno.');
  if(p.jokerUsed)e3Require(e3Iso(p.jokerSelectedAt)>=publication,'anchors.joker-window','Volba žolíka je před publikací.');
  return Object.freeze({identity:'MATCHED_FORMS_ROSTER',timeWindow:'WITHIN_PUBLICATION_FORMS_WINDOW',formsEmail:account,publishedAt:FORMS_ANCHOR_POLICY.publishedAt,formsLowerMs:time.lower,formsUpperMs:time.upper,diagnosticOnly:false,codes:[]});
}
`;
