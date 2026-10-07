// Google Forms / full-year CSV verifier helpers are kept separate to preserve the source-size gate.
// They are injected into the generated teacher verifier script; no runtime/network module is added.
const SECURE_VERIFIER_FORMS_JS=String.raw`
function verifierSourceMeta(meta){meta=meta&&typeof meta==='object'?meta:{};return {submissionSource:meta.source==='google-forms-csv'?'google-forms-csv':'',formIdentity:String(meta.formIdentity||'').trim().slice(0,320),formTimestamp:String(meta.formTimestamp||'').trim().slice(0,120),formRow:Number.isFinite(Number(meta.formRow))?Number(meta.formRow):0,formFile:String(meta.formFile||'').trim().slice(0,180),formTestId:String(meta.formTestId||'').trim().slice(0,180),formTestName:String(meta.formTestName||'').trim().slice(0,320),formGroup:String(meta.formGroup||'').trim().slice(0,320)};}
async function sha256HexText(text){const bytes=new TextEncoder().encode(String(text||''));const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function normMeta(s){return String(s||'').trim().normalize('NFC').replace(/\s+/g,' ').toLowerCase();}
function metadataMismatchFor(sm){const out=[];if(sm.formTestId&&normMeta(sm.formTestId)!==normMeta(CONFIG.testId))out.push('Test ID ve formuláři: '+sm.formTestId+'; ověřeno: '+CONFIG.testId);if(sm.formTestName&&normMeta(sm.formTestName)!==normMeta(CONFIG.nazev))out.push('název ve formuláři neodpovídá ověřenému testu');if(sm.formGroup&&normMeta(sm.formGroup)!==normMeta(CONFIG.proKoho||''))out.push('skupina ve formuláři: '+sm.formGroup+'; ověřeno: '+(CONFIG.proKoho||'—'));return out;}
function normBindingIdentity(value){var raw=String(value==null?'':value);try{raw=raw.normalize('NFKD');}catch(_){}return raw.toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function b64UrlVerifier(buf){var bin='',bytes=new Uint8Array(buf);for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function verifierRosterHash(value){if(!(crypto&&crypto.subtle&&window.TextEncoder))throw new Error('Verifier nema WebCrypto pro kontrolu varianty.');var input='GIT-DIFF-ROSTER-V1|'+String(CONFIG.diffRosterSalt||'')+'|'+normBindingIdentity(value);var dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return b64UrlVerifier(dig);}
function verifierRosterCodeExists(value){if((CONFIG.identityMode||'name')!=='oneTimeCode'||!(CONFIG.roster||[]).length)return true;var code=String(value||'').trim().toUpperCase();return (CONFIG.roster||[]).some(function(e){return e&&String(e.code||'').trim().toUpperCase()===code;});}
async function payloadBindingError(payload){if(String(payload.identityMode||CONFIG.identityMode||'name')!==String(CONFIG.identityMode||'name'))return 'Payload ma jiny rezim identity nez tento test.';var claimed=String(payload.groupKey||'__default');if(!Object.prototype.hasOwnProperty.call(VARIANTS_FULL,claimed))return 'Payload uvadi neexistujici variantu: '+claimed+'.';var ident=(CONFIG.identityMode==='oneTimeCode')?String(payload.code||payload.student||''):String(payload.student||'');if(CONFIG.identityMode==='oneTimeCode'&&!verifierRosterCodeExists(ident))return 'Jednorazovy kod neni v rosteru tohoto testu.';var groups=CONFIG.diffGroups||[];if(!groups.length)return claimed==='__default'?'':'Payload uvadi variantu, ale tento test neni diferencovany.';if(!ident)return 'Payload nema identitu potrebnou pro overeni varianty.';var h=await verifierRosterHash(ident);var matches=groups.filter(function(g){return g&&Array.isArray(g.studentHashes)&&g.studentHashes.indexOf(h)!==-1;});if(matches.length!==1)return matches.length?'Identita je nejednoznacne prirazena k vice variantam.':'Identita neni prirazena k zadne variante tohoto testu.';if(String(matches[0].key)!==claimed)return 'Nesedi vazba student-varianta: ocekavano '+String(matches[0].key)+', payload uvadi '+claimed+'.';return '';}
const PRIVATE_IDENTITY_REVIEWS=new WeakMap(),PRIVATE_CONFIRMED_IDENTITIES=new Map();
function manualIdentityKey(digest,email,code){return digest+'|'+email+'|'+code;}
function proposeManualIdentity(payload,sm,error){
  // Only malformed codes are recoverable, never valid codes of other students.
  if(error.validationCode!=='schema.code'||CONFIG.identityMode!=='oneTimeCode'||payload.identityMode!=='oneTimeCode'||sm.submissionSource!=='google-forms-csv')throw error;
  // Not a recoverable shape (e.g. code and identity disagree): keep the original schema rejection.
  if(!(e3String(payload.code,180)&&e3String(payload.student,180)&&payload.code.toUpperCase()===payload.student.toUpperCase()&&!/^[A-Z0-9]{6}$/i.test(payload.code)))throw error;
  e3Require(CONFIG.studentHtmlSha256&&payload.studentHtmlSha256===CONFIG.studentHtmlSha256,'identity.recovery-hash','Ru\u010dn\u00ed p\u0159i\u0159azen\u00ed vy\u017eaduje shodn\u00fd hash studentsk\u00e9ho HTML.');
  const email=e3Email(sm.formIdentity),policy=FORMS_ANCHOR_POLICY;
  e3Require(policy&&email&&email.split('@')[1]===policy.schoolDomain,'anchors.identity-domain','Forms \u00fa\u010det nen\u00ed z nastaven\u00e9 \u0161koln\u00ed dom\u00e9ny.');
  const roster=(CONFIG.roster||[]).filter(r=>e3Email(r.email)===email);
  e3Require(roster.length===1,'identity.recovery-roster','Forms \u00fa\u010det nem\u00e1 pr\u00e1v\u011b jednu identitu v rosteru.');
  const code=String(roster[0].code||'').toUpperCase(),candidate=Object.assign({},payload,{student:code,code});
  validateSecurePayload(candidate);
  return {candidate,proof:{originalCode:payload.code,assignedCode:code,email}};
}
async function verifyText(name,txt,meta){
  const sm=verifierSourceMeta(meta),fullYear=!!(meta&&meta.fullYearCsv);let pack=null,payload=null,digest='';
  try{
    if(sm.submissionSource==='google-forms-csv')e3Require(meta&&typeof meta.formIdentity==='string'&&meta.formIdentity.trim().length<=254&&typeof meta.formTimestamp==='string'&&meta.formTimestamp.trim().length<=120,'anchors.source-shape','Neplatn\u00fd typ nebo velikost Forms e-mailu/\u010dasu.');
    pack=parseTxt(txt);validateSecureEnvelope(pack);digest=await sha256HexText(txt);payload=await decryptPayload(pack);
    e3Require(e3Object(payload),'schema.shape','Payload nen\u00ed objekt.');e3SafeTree(payload);e3Require(e3String(payload.testId,180)&&payload.testId.trim(),'schema.testId','Payload has no valid test identifier.');
    if(fullYear&&payload.testId!==CONFIG.testId)return {classification:'other-test',verifiedTestId:payload.testId};
    e3Require(payload.testId===CONFIG.testId&&pack.testId===CONFIG.testId,'binding.test','V\u00fdsledek pat\u0159\u00ed k jin\u00e9mu testu.');
    e3Require(payload.manifestHash===CONFIG.manifestHash&&pack.manifestHash===CONFIG.manifestHash,'binding.manifest','Payload nebo obal m\u00e1 jin\u00fd manifest testu.');
    let checked=payload,review=null;
    try{validateSecurePayload(payload);}catch(error){const proposal=proposeManualIdentity(payload,sm,error);checked=proposal.candidate;review=proposal.proof;}
    // Schema errors keep priority (as before 7.1.97); the build-hash binding then applies to every accepted payload.
    e3Require(!payload.studentHtmlSha256||!CONFIG.studentHtmlSha256||payload.studentHtmlSha256===CONFIG.studentHtmlSha256,'binding.hash','Payload uv\u00e1d\u00ed jin\u00fd SHA-256 studentsk\u00e9ho HTML.');
    e3Require(!pack.studentHtmlSha256||!CONFIG.studentHtmlSha256||pack.studentHtmlSha256===CONFIG.studentHtmlSha256,'binding.hash','Obal uv\u00e1d\u00ed jin\u00fd SHA-256 studentsk\u00e9ho HTML.');
    const bindingError=await payloadBindingError(checked);e3Require(!bindingError,'binding.identity-variant',bindingError);
    const metadataMismatch=metadataMismatchFor(sm),anchors=evaluateFormsAnchors(checked,sm),semanticDigest=await semanticSubmissionDigest(payload);
    const replay=anchors.diagnosticOnly?null:await observeVerifierReplay(checked,semanticDigest,digest),scored=scorePayload(checked);
    const confirmation=review&&PRIVATE_CONFIRMED_IDENTITIES.get(manualIdentityKey(semanticDigest,review.email,review.assignedCode));
    const status=anchors.diagnosticOnly?'DIAGNOSTIC_ONLY':(review&&!confirmation?'IDENTITY_REVIEW':'OK');
    const row=Object.assign({file:name,status,rawTxt:txt,submissionDigest:digest,semanticDigest,replayIdentityDigest:replay&&replay.identityDigest||'',replayKnown:!!(replay&&replay.known),expectedStudentHtmlSha256:CONFIG.studentHtmlSha256||'',answerStudentHtmlSha256:payload.studentHtmlSha256||'',metadataMismatch,anchorNotes:Array.isArray(anchors.notes)?anchors.notes.slice():[],envelopeMismatch:[],validationCodes:anchors.codes,error:anchors.diagnosticOnly?'Z\u00e1loha bez Forms kotev - pouze diagnostika.':'',manualIdentityAssigned:!!confirmation,identityConfirmationAt:confirmation||'',originalIdentityCode:review?review.originalCode:'',proposedIdentityCode:review?review.assignedCode:''},sm,scored);
    if(review)PRIVATE_IDENTITY_REVIEWS.set(row,Object.freeze(Object.assign({},review,{semanticDigest})));
    const assessed=review?Object.assign({},anchors,{identity:confirmation?'MANUALLY_CONFIRMED_FORMS_ROSTER':'AWAITING_TEACHER_CONFIRMATION'}):anchors;
    const trust=submissionTrust(payload,sm,assessed);PRIVATE_SUBMISSION_TRUST.set(row,trust);row.trustAssessment=trust;row.anchorAssessment=assessed;
    RESULTS.push(row);rebuildDuplicateState();
    return {classification:anchors.diagnosticOnly?'diagnostic-only':(status==='IDENTITY_REVIEW'?'identity-review':'current'),row};
  }catch(error){
    if(fullYear&&pack&&pack.testId!==CONFIG.testId&&!payload&&!error.validationCode)return {classification:'other-test',hintTestId:pack.testId,unverifiedOtherTest:true};
    const code=error.validationCode||'crypto.parse-decrypt',message=String(error&&error.message?error.message:error);
    const row=Object.assign({file:name,status:'CHYBA',error:message,validationCodes:[code],student:payload&&typeof payload.student==='string'?payload.student.slice(0,180):'?',attemptId:payload&&typeof payload.attemptId==='string'?payload.attemptId.slice(0,100):'',earned:0,total:0,pct:0,grade:'?',rawTxt:typeof txt==='string'&&txt.length<=E3_MAX_TXT?txt:'',submissionDigest:digest},sm);
    RESULTS.push(row);return {classification:'invalid-current',error:message,code,row};
  }
}
function formsIdentityReviewAction(r){return (r.status==='IDENTITY_REVIEW'&&!r.exactDuplicate&&!r.hardReplayConflict)?'<div class="forms-review-action">Forms '+esc(r.formIdentity)+' &rarr; '+esc(r.proposedIdentityCode)+'<br><button type="button" onclick="confirmFormsIdentity('+RESULTS.indexOf(r)+')">Potvrdit identitu</button></div>':'';}
async function confirmFormsIdentity(index){
  const row=RESULTS[Number(index)],proof=row&&PRIVATE_IDENTITY_REVIEWS.get(row);
  if(!proof||row.status!=='IDENTITY_REVIEW')return false;
  rebuildDuplicateState();if(row.exactDuplicate||row.hardReplayConflict){vToast('Duplicitu nebo replay nelze potvrdit.','err');return false;}
  if(!await vConfirm('Potvrdit ru\u010dn\u00ed p\u0159i\u0159azen\u00ed: Forms \u00fa\u010det '+proof.email+' \u2192 k\u00f3d '+proof.assignedCode+'? P\u016fvodn\u00ed k\u00f3d: '+proof.originalCode+'. P\u016fvod v\u00fdsledku t\u00edm nen\u00ed prok\u00e1z\u00e1n.','Identita k ru\u010dn\u00edmu potvrzen\u00ed'))return false;
  rebuildDuplicateState();if(!RESULTS.includes(row)||row.status!=='IDENTITY_REVIEW'||row.exactDuplicate||row.hardReplayConflict)return false;
  const at=new Date().toISOString();PRIVATE_CONFIRMED_IDENTITIES.set(manualIdentityKey(proof.semanticDigest,proof.email,proof.assignedCode),at);
  row.status='OK';row.manualIdentityAssigned=true;row.identityConfirmationAt=at;
  row.anchorAssessment=Object.assign({},row.anchorAssessment,{identity:'MANUALLY_CONFIRMED_FORMS_ROSTER'});
  const trust=Object.freeze(Object.assign({},PRIVATE_SUBMISSION_TRUST.get(row),{externalIdentity:'MANUALLY_CONFIRMED_FORMS_ROSTER'}));PRIVATE_SUBMISSION_TRUST.set(row,trust);row.trustAssessment=trust;
  afterResultsChanged();renderFormsImportSummary(LAST_FORMS_IMPORT);return true;
}
async function bulkVerifyFiles(files){const arr=Array.from(files||[]);if(!arr.length){vToast('Nebyl vybrán žádný answers.txt soubor.','warn');return;}for(const f of arr){if(Number(f.size)>E3_MAX_TXT)await verifyText(f.name,'');else await verifyText(f.name,await f.text());}afterResultsChanged();vToast('Nouzový import dokončen. Zálohy bez Forms jsou pouze diagnostické a nezapočítávají se do klasifikace.','warn');}
async function bulkVerifyPasted(){const txt=($('pasteBox').value||'').trim();if(!txt){vToast('Nejdřív vlož celý záložní blok SECURE-ANSWERS-V1.','warn');return;}await verifyText('vlozena_zaloha_'+(RESULTS.length+1)+'.txt',txt);$('pasteBox').value='';afterResultsChanged();vToast('Záloha načtena pro diagnostiku; stav a důvody jsou v tabulce.','warn');}
const FORMS_CSV_MAX_BYTES=20*1024*1024;
const FORMS_CSV_MAX_ROWS=5000;
function csvParseDelimited(text,delimiter){
  text=String(text==null?'':text).replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',i=0,inQuotes=false,closed=false;
  while(i<text.length){const ch=text[i];if(inQuotes){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i+=2;continue;}inQuotes=false;closed=true;i++;continue;}cell+=ch;i++;continue;}
    if(ch==='"'){if(cell||closed)throw e3Error('csv.quote','Uvozovka uvnitř neuzavřeného pole CSV.');inQuotes=true;i++;continue;}
    if(ch===delimiter){row.push(cell);cell='';closed=false;i++;continue;}
    if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);e3Require(rows.length<=FORMS_CSV_MAX_ROWS+2,'csv.rows','CSV překračuje limit řádků.');row=[];cell='';closed=false;i++;continue;}
    if(closed)throw e3Error('csv.quote','Text za uzavřenými uvozovkami CSV.');cell+=ch;i++;
  }
  if(inQuotes)throw e3Error('csv.quote','CSV obsahuje neukončené uvozovky.');row.push(cell);if(row.length>1||row[0]!==''||!rows.length)rows.push(row);return rows;
}
function csvRowNonEmpty(row){return Array.isArray(row)&&row.some(v=>String(v||'').trim()!=='');}
function csvCandidateScore(rows){if(!Array.isArray(rows)||!rows.length)return -1e9;const cols=rows[0].length;if(cols<2)return -10000+cols;const data=rows.slice(1,31).filter(csvRowNonEmpty);const consistent=data.filter(r=>r.length===cols).length;let payloadHits=0;data.forEach(r=>r.forEach(v=>{if(String(v||'').trim().startsWith('SECURE-ANSWERS-V1'))payloadHits++;}));return payloadHits*1000+consistent*40+Math.min(cols,30);}
function parseFormsCsvText(text){
  e3Require(typeof text==='string'&&new TextEncoder().encode(text).byteLength<=FORMS_CSV_MAX_BYTES,'csv.size','CSV překračuje 20 MB.');
  const src=text;if(!src.trim())throw e3Error('csv.empty','CSV je prázdné.');let best=null;
  [[',','čárka'],[';','středník'],['\t','tabulátor']].forEach(pair=>{try{const rows=csvParseDelimited(src,pair[0]),score=csvCandidateScore(rows);if(!best||score>best.score)best={delimiter:pair[0],delimiterLabel:pair[1],rows,score};}catch(_e){}});
  e3Require(best&&best.rows.length&&best.rows[0].length>=2,'csv.parse','CSV nelze jednoznačně načíst s hlavičkou.');
  const headers=best.rows[0].map(v=>String(v||'').trim()),data=best.rows.slice(1),normalized=headers.map(e3Header);
  e3Require(headers.length<=100&&headers.every(Boolean)&&new Set(normalized).size===headers.length,'csv.headers','Prázdné, duplicitní nebo nadlimitní hlavičky CSV.');
  e3Require(data.filter(csvRowNonEmpty).length<=FORMS_CSV_MAX_ROWS,'csv.rows','CSV překračuje limit 5000 řádků.');
  e3Require(data.filter(csvRowNonEmpty).every(row=>row.length===headers.length),'csv.width','Počet polí řádku neodpovídá hlavičce CSV.');
  const normHeader=v=>e3Header(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(),hnorm=headers.map(normHeader);
  const policy=FORMS_ANCHOR_POLICY;
  function anchorColumn(setting,aliases){
    if(setting&&setting!=='auto'){const idx=normalized.indexOf(e3Header(setting));e3Require(idx>=0,'csv.anchor-columns','CSV nem\u00e1 zvolen\u00fd syst\u00e9mov\u00fd sloupec: '+setting);return idx;}
    const hits=normalized.map((h,i)=>aliases.includes(h)?i:-1).filter(i=>i>=0);
    e3Require(hits.length===1,'csv.anchor-columns','CSV mus\u00ed obsahovat pr\u00e1v\u011b jeden syst\u00e9mov\u00fd sloupec '+aliases.join(' / ')+'. Exportuj p\u016fvodn\u00ed odpov\u011bdi z Forms.');return hits[0];
  }
  const identityIndex=anchorColumn(policy?.emailHeader,['username','e-mailov\u00e1 adresa','email address','e-mail address']),timestampIndex=anchorColumn(policy?.timestampHeader,['timestamp','\u010dasov\u00e1 zna\u010dka','\u010dasov\u00e9 raz\u00edtko']);
  const testIdIndex=hnorm.findIndex(h=>h==='test id'||h==='id testu'),testNameIndex=hnorm.findIndex(h=>h==='test name'||h==='nazev testu'),groupIndex=hnorm.findIndex(h=>['group','class','skupina','trida','trida skupina'].includes(h));
  return {headers,data,delimiter:best.delimiter,delimiterLabel:best.delimiterLabel,identityIndex,timestampIndex,testIdIndex,testNameIndex,groupIndex};
}
function formsPushRowError(rowNo,message,meta){RESULTS.push(Object.assign({file:'forms_radek_'+rowNo+'.txt',status:'CHYBA',error:String(message||'Neplatný řádek CSV.'),validationCodes:['csv.row'],student:'?',earned:0,total:0,pct:0,grade:'?',rawTxt:''},verifierSourceMeta(meta)));}
function setFormsProgress(done,total){const box=$('formsImportProgress');if(box)box.textContent=total?'Zpracování CSV: '+done+' / '+total+' ('+Math.round(done/Math.max(1,total)*100)+' %)':'';}
let FORMS_CSV_BATCHES=[],FORMS_IMPORT_CHAIN=Promise.resolve(),FORMS_BATCH_SEQUENCE=0;
function formsMetaFor(parsed,row,rowNo,batch){return {source:'google-forms-csv',fullYearCsv:true,formIdentity:row[parsed.identityIndex].trim(),formTimestamp:row[parsed.timestampIndex].trim(),formRow:rowNo,formFile:batch.fileName,formBatchId:batch.id,formTestId:parsed.testIdIndex>=0?row[parsed.testIdIndex].trim():'',formTestName:parsed.testNameIndex>=0?row[parsed.testNameIndex].trim():'',formGroup:parsed.groupIndex>=0?row[parsed.groupIndex].trim():''};}
function formsMarkerCells(row){return row.map(v=>String(v||'').trim()).filter(v=>/^GIT-LESSON-(?:START|END)-V1(?:\s|$)/.test(v));}
function collectFormsLessonWindows(batches){
  const markers=[],seen=new Set();FORMS_LESSON_NOTICES=[];
  for(const batch of batches){const p=batch.parsed;for(let i=0;i<p.data.length;i++){
    const row=p.data[i],cells=formsMarkerCells(row);if(!cells.length)continue;
    const label=batch.fileName+', \u0159\u00e1dek '+(i+2);
    try{
      e3Require(cells.length===1&&!row.some(v=>String(v).trim().startsWith('SECURE-ANSWERS-V1')),'lesson.mixed','Zna\u010dka je sm\u00edchan\u00e1 s odevzd\u00e1n\u00edm.');
      const match=cells[0].match(/^GIT-LESSON-(START|END)-V1\s+([\s\S]+)$/);e3Require(match&&match[2].length<=2000,'lesson.shape','Neplatn\u00fd tvar zna\u010dky hodiny.');
      const data=e3Json(match[2]);e3Require(e3Object(data)&&Object.keys(data).every(k=>['testId','manifestHash','group'].includes(k))&&e3String(data.testId,180)&&e3String(data.manifestHash,180),'lesson.shape','Neplatn\u00e1 zna\u010dka hodiny.');
      if(data.testId!==CONFIG.testId)continue;
      e3Require(data.manifestHash===CONFIG.manifestHash,'lesson.manifest','Zna\u010dka m\u00e1 jin\u00fd manifest.');
      const email=e3Email(row[p.identityIndex]),policy=FORMS_ANCHOR_POLICY;
      e3Require(policy&&email&&policy.teacherEmails.includes(email),'lesson.teacher','Podvr\u017een\u00e1 nebo nepovolen\u00e1 zna\u010dka hodiny od '+String(row[p.identityIndex]).slice(0,254)+' - ignorov\u00e1na.');
      const time=e3FormsTime(row[p.timestampIndex]),id=match[1]+'|'+time.lower+'|'+email+'|'+data.testId;
      if(seen.has(id))continue;seen.add(id);markers.push({kind:match[1],ms:time.lower,teacherEmail:email,group:String(data.group||'').slice(0,180)});
    }catch(error){FORMS_LESSON_NOTICES.push(label+': '+String(error.message||error));}
  }}
  markers.sort((a,b)=>a.ms-b.ms||(a.kind===b.kind?0:(a.kind==='START'?-1:1)));
  const windows=[];
  for(const m of markers){if(m.kind==='START'){
      if(windows.some(w=>w.startMs===m.ms)){FORMS_LESSON_NOTICES.push('Duplicitn\u00ed za\u010d\u00e1tek ve stejn\u00e9m okam\u017eiku byl slou\u010den.');continue;}
      windows.push({startMs:m.ms,endMs:null,teacherEmail:m.teacherEmail,source:'lesson-csv',group:m.group});
    }else{const w=[...windows].reverse().find(x=>x.startMs<=m.ms);if(w&&w.endMs===null)w.endMs=m.ms;else if(!w)FORMS_LESSON_NOTICES.push('Zna\u010dka konce bez p\u0159edchoz\u00edho za\u010d\u00e1tku - ignorov\u00e1na.');}}
  FORMS_LESSON_WINDOWS=windows;return windows;
}
function formsSummaryRefresh(summary){
  if(!summary)return summary;
  const rows=RESULTS.filter(r=>r.formBatchId===summary.batchId),bad=r=>r.status==='CHYBA'||r.exactDuplicate||r.hardReplayConflict;
  summary.ok=rows.filter(r=>r.status==='OK'&&!bad(r)).length;
  summary.pending=rows.filter(r=>r.status==='IDENTITY_REVIEW'&&!bad(r)).length;
  summary.invalid=rows.filter(bad).length;summary.current=rows.length;
  summary.metadataMismatch=rows.filter(r=>r.status==='OK'&&!bad(r)&&r.metadataMismatch?.length).length;
  summary.eligibleProposals=effectiveResults().length;summary.replayRejected=rows.filter(r=>r.exactDuplicate||r.hardReplayConflict).length;
  summary.duplicates={exact:rows.filter(r=>r.exactDuplicate).length,conflicts:rows.filter(r=>r.hardReplayConflict).length};return summary;
}
function renderFormsImportSummary(summary){
  const box=$('formsImportSummary');if(!box)return;
  if(!summary){box.className='muted';box.textContent='Zat\u00edm nebyl importov\u00e1n CSV export z formul\u00e1\u0159e.';return;}
  box.className='forms-summary-card';
  if(summary.waitingForWindow){box.innerHTML='<h3>CSV na\u010dteno - dopl\u0148 \u010das hodiny</h3><p>CSV neobsahuje platnou zna\u010dku za\u010d\u00e1tku od u\u010ditele. Zadej skute\u010dn\u00e9 datum a \u010das podle rozvrhu; data z\u016fst\u00e1vaj\u00ed na\u010dten\u00e1.</p><button onclick="openFormsVerificationSettings()">Zadat \u010das hodiny</button>';return;}
  formsSummaryRefresh(summary);
  const counts=[summary.ok?'<span class="forms-good">'+summary.ok+' v po\u0159\u00e1dku</span>':'',summary.pending?'<span class="forms-review">'+summary.pending+' k ru\u010dn\u00edmu potvrzen\u00ed</span>':'',summary.invalid?'<span class="forms-bad">'+summary.invalid+' chyb/odm\u00edtnut\u00ed</span>':''].filter(Boolean).join(' \u00b7 ');
  let html='<h3>Tento test: '+Number(summary.current||0)+' odevzd\u00e1n\u00ed</h3><div class="forms-counts">'+(counts||'\u017d\u00e1dn\u00e9 odevzd\u00e1n\u00ed tohoto testu.')+'</div>';
  if(summary.metadataMismatch)html+='<p class="forms-warning">'+summary.metadataMismatch+' platn\u00fdch v\u00fdsledk\u016f m\u00e1 upozorn\u011bn\u00ed na popisn\u00e1 metadata. Odpov\u011bdi a body t\u00edm nejsou zm\u011bn\u011bny.</p>';
  if(summary.otherTests)html+='<p class="muted">Jin\u00e9 testy v souboru: '+summary.otherTests+' (ignorov\u00e1no).</p>';
  if(summary.otherTestsUnverified)html+='<p class="muted">Z toho '+summary.otherTestsUnverified+' ob\u00e1lek pat\u0159\u00ed podle vn\u011bj\u0161\u00edho ID k jin\u00fdm test\u016fm. Tento verifier je nem\u016f\u017ee de\u0161ifrovat; nejde o kryptograficky ov\u011b\u0159en\u00e9 za\u0159azen\u00ed.</p>';
  if(summary.markers)html+='<p class="muted">Zna\u010dky hodiny: '+summary.markers+' \u0159\u00e1dk\u016f (nejsou to odevzd\u00e1n\u00ed).</p>';
  const grouped=new Map();for(const r of RESULTS.filter(r=>r.formBatchId===summary.batchId&&(r.status==='CHYBA'||r.exactDuplicate||r.hardReplayConflict))){const code=r.exactDuplicate||r.hardReplayConflict?'replay.duplicate':r.validationCodes?.[0]||'unknown';if(!grouped.has(code))grouped.set(code,{count:0,message:r.exactDuplicate||r.hardReplayConflict?'Opakovan\u00e9 odevzd\u00e1n\u00ed je vy\u0159azeno. Zkontroluj p\u016fvodn\u00ed \u0159\u00e1dek CSV.':r.error});grouped.get(code).count++;}
  for(const [code,g] of grouped)html+='<details class="forms-bad"><summary>'+g.count+'\u00d7 '+esc(g.message)+'</summary><code>'+esc(code)+'</code></details>';
  const received=new Set(RESULTS.filter(r=>r.status==='OK'||r.status==='IDENTITY_REVIEW').map(r=>String(r.code||r.student||'').toUpperCase()));
  const missing=(CONFIG.roster||[]).filter(r=>!received.has(String(r.code||'').toUpperCase()));
  summary.missingStudents=missing.map(r=>String(r.name||r.label||r.email||r.code));
  if(missing.length)html+='<p><b>Neodevzdali:</b> '+summary.missingStudents.map(esc).join(', ')+'.</p>';
  if(FORMS_LESSON_NOTICES.length)html+='<details class="forms-warning" open><summary>Upozorn\u011bn\u00ed ke zna\u010dk\u00e1m hodiny</summary>'+FORMS_LESSON_NOTICES.map(esc).join('<br>')+'</details>';
  html+='<p class="muted small">Kontrola duplicit uvnit\u0159 CSV funguje i na nov\u00e9m PC. Evidence opakovan\u00e9ho pou\u017eit\u00ed nap\u0159\u00ed\u010d importy plat\u00ed pouze v tomto prohl\u00ed\u017ee\u010di. P\u0159epo\u010det ani Forms kotvy neprokazuj\u00ed, \u017ee student pou\u017eil p\u016fvodn\u00ed test (p\u016fvod neprok\u00e1z\u00e1n).</p>';
  box.innerHTML=html;
}
function queueFormsReevaluation(){const pending=FORMS_IMPORT_CHAIN.then(reevaluateFormsBatches,reevaluateFormsBatches);FORMS_IMPORT_CHAIN=pending.catch(()=>{});return pending;}
async function reevaluateFormsBatches(){
  // Parse before replacing results: a wrong header setting must not erase data.
  const batches=FORMS_CSV_BATCHES.map(b=>Object.assign({},b,{parsed:parseFormsCsvText(b.text)}));
  collectFormsLessonWindows(batches);refreshFormsVerificationSummary();
  if(!FORMS_ANCHOR_POLICY||!FORMS_LESSON_WINDOWS.length&&!FORMS_ANCHOR_POLICY.publishedAt){
    LAST_FORMS_IMPORT={fileName:batches.at(-1)?.fileName||'',batchId:batches.at(-1)?.id,waitingForWindow:true,rows:batches.at(-1)?.parsed.data.filter(csvRowNonEmpty).length||0};
    RESULTS=RESULTS.filter(r=>r.submissionSource!=='google-forms-csv');rebuildDuplicateState();afterResultsChanged();renderFormsImportSummary(LAST_FORMS_IMPORT);if($('formsManualWindowNote'))$('formsManualWindowNote').hidden=false;openFormsVerificationSettings();return LAST_FORMS_IMPORT;
  }
  if($('formsManualWindowNote'))$('formsManualWindowNote').hidden=true;RESULTS=RESULTS.filter(r=>r.submissionSource!=='google-forms-csv');ATTEMPT_DECISIONS.clear();
  let last=null;
  for(const batch of batches){
    const parsed=batch.parsed,summary={fileName:batch.fileName,batchId:batch.id,rows:0,current:0,ok:0,pending:0,otherTests:0,otherTestsUnverified:0,invalid:0,missing:0,ambiguous:0,metadataMismatch:0,markers:0,delimiterLabel:parsed.delimiterLabel,waitingForWindow:false};
    const nonempty=parsed.data.filter(csvRowNonEmpty);let processed=0;setFormsProgress(0,nonempty.length);
    for(let i=0;i<parsed.data.length;i++){
      const row=parsed.data[i];if(!csvRowNonEmpty(row))continue;summary.rows++;const rowNo=i+2,meta=formsMetaFor(parsed,row,rowNo,batch);
      const payloads=row.map(v=>String(v||'').trim()).filter(v=>v.startsWith('SECURE-ANSWERS-V1')),markers=formsMarkerCells(row);
      if(markers.length&&!payloads.length){summary.markers++;}
      else if(markers.length&&payloads.length){summary.ambiguous++;formsPushRowError(rowNo,'Zna\u010dka hodiny a odevzd\u00e1n\u00ed jsou ve stejn\u00e9m \u0159\u00e1dku. Zkontroluj p\u016fvodn\u00ed odpov\u011b\u010f ve Forms.',meta);}
      else if(!payloads.length){summary.missing++;formsPushRowError(rowNo,'Chyb\u00ed odevzd\u00e1vac\u00ed k\u00f3d SECURE-ANSWERS-V1. Zkontroluj odpov\u011b\u010f ve Forms.',meta);}
      else if(payloads.length>1){summary.ambiguous++;formsPushRowError(rowNo,'V\u00edce odevzd\u00e1vac\u00edch k\u00f3d\u016f v jednom \u0159\u00e1dku. Ov\u011b\u0159 p\u016fvodn\u00ed odpov\u011b\u010f ve Forms.',meta);}
      else{const outcome=await verifyText('forms_radek_'+rowNo+'.txt',payloads[0],meta);if(outcome.classification==='other-test'){summary.otherTests++;if(outcome.unverifiedOtherTest)summary.otherTestsUnverified++;}}
      if(++processed%20===0){setFormsProgress(processed,nonempty.length);await new Promise(r=>setTimeout(r,0));}
    }
    rebuildDuplicateState();formsSummaryRefresh(summary);last=summary;setFormsProgress(nonempty.length,nonempty.length);
  }
  LAST_FORMS_IMPORT=last;afterResultsChanged();renderFormsImportSummary(last);return last;
}
async function importFormsCsvText(text,fileName){
  parseFormsCsvText(text);
  e3Require(FORMS_CSV_BATCHES.length<20&&FORMS_CSV_BATCHES.reduce((n,b)=>n+b.text.length,0)+text.length<=FORMS_CSV_MAX_BYTES,'csv.batch-limit','Na\u010dten\u00e1 CSV p\u0159ekra\u010duj\u00ed limit. Ulo\u017e v\u00fdsledky a za\u010dni novou sadu.');
  const batch={id:'forms-'+(++FORMS_BATCH_SEQUENCE),text,fileName:String(fileName||'forms.csv').slice(0,180)};FORMS_CSV_BATCHES.push(batch);
  try{return await queueFormsReevaluation();}catch(error){FORMS_CSV_BATCHES=FORMS_CSV_BATCHES.filter(b=>b!==batch);throw error;}
}
async function importFormsCsvFile(file){if(!file){vToast('Nebyl vybrán žádný CSV soubor.','warn');return;}try{const fn=String(file.name||'');if(/\.zip$/i.test(fn))throw new Error('ZIP nejdřív rozbal a vlož .csv soubor uvnitř.');if(fn&&/\.[^.]+$/.test(fn)&&!/\.csv$/i.test(fn))throw new Error('Podporuji CSV export z Google Forms (.csv). Soubor není potřeba otevírat ani převádět v Excelu.');if(Number(file.size)>FORMS_CSV_MAX_BYTES)throw new Error('CSV je příliš velké (maximum 20 MB).');const text=await file.text();const summary=await importFormsCsvText(text,file.name||'forms.csv');if(summary.waitingForWindow){vToast('CSV na\u010dteno. Zadej skute\u010dn\u00fd \u010das hodiny.','warn');return;}vToast('CSV import dokončen: '+Number(summary&&summary.ok||0)+' opravených výsledků tohoto testu; původ vyžaduje kontrolu.','ok');}catch(e){renderFormsImportSummary({fileName:file.name||'forms.csv',rows:0,ok:0,invalid:1,missing:0,ambiguous:0,delimiterLabel:'?',duplicates:{exact:0,conflicts:0}});vToast('Import CSV selhal: '+String(e&&e.message?e.message:e),'err');}}
`;
