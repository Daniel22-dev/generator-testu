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
async function verifyText(name,txt,meta){
  const sm=verifierSourceMeta(meta),fullYear=!!(meta&&meta.fullYearCsv);let pack=null,payload=null,digest='';
  try{
    if(sm.submissionSource==='google-forms-csv')e3Require(meta&&typeof meta.formIdentity==='string'&&meta.formIdentity.trim().length<=254&&typeof meta.formTimestamp==='string'&&meta.formTimestamp.trim().length<=120,'anchors.source-shape','Systémová Forms identita nebo čas mají neplatný typ/velikost.');
    pack=parseTxt(txt);validateSecureEnvelope(pack);digest=await sha256HexText(txt);
    payload=await decryptPayload(pack);validateSecurePayload(payload);
    if(fullYear&&payload.testId!==CONFIG.testId)return {classification:'other-test',verifiedTestId:payload.testId};
    e3Require(payload.testId===CONFIG.testId&&pack.testId===CONFIG.testId,'binding.test','Výsledek patří k jinému testu.');
    e3Require(payload.manifestHash===CONFIG.manifestHash&&pack.manifestHash===CONFIG.manifestHash,'binding.manifest','Payload nebo obal má jiný manifest testu.');
    e3Require(!payload.studentHtmlSha256||!CONFIG.studentHtmlSha256||payload.studentHtmlSha256===CONFIG.studentHtmlSha256,'binding.hash','Payload uvádí jiný SHA-256 studentského HTML.');
    e3Require(!pack.studentHtmlSha256||!CONFIG.studentHtmlSha256||pack.studentHtmlSha256===CONFIG.studentHtmlSha256,'binding.hash','Obal uvádí jiný SHA-256 studentského HTML.');
    const bindingError=await payloadBindingError(payload);e3Require(!bindingError,'binding.identity-variant',bindingError);
    const metadataMismatch=metadataMismatchFor(sm);e3Require(!metadataMismatch.length,'binding.forms-metadata',metadataMismatch.join('; '));
    const anchors=evaluateFormsAnchors(payload,sm),semanticDigest=await semanticSubmissionDigest(payload);
    const replay=anchors.diagnosticOnly?null:await observeVerifierReplay(payload,semanticDigest,digest),scored=scorePayload(payload);
    const row=Object.assign({file:name,status:anchors.diagnosticOnly?'DIAGNOSTIC_ONLY':'OK',rawTxt:txt,submissionDigest:digest,semanticDigest,replayIdentityDigest:replay&&replay.identityDigest||'',replayKnown:!!(replay&&replay.known),expectedStudentHtmlSha256:CONFIG.studentHtmlSha256||'',answerStudentHtmlSha256:payload.studentHtmlSha256||'',metadataMismatch,envelopeMismatch:[],validationCodes:anchors.codes,error:anchors.diagnosticOnly?'Záloha bez Forms kotev — pouze diagnostika, mimo klasifikaci.':''},sm,scored);
    const trust=submissionTrust(payload,sm,anchors);PRIVATE_SUBMISSION_TRUST.set(row,trust);row.trustAssessment=trust;row.anchorAssessment=anchors;
    RESULTS.push(row);rebuildDuplicateState();
    return {classification:anchors.diagnosticOnly?'diagnostic-only':'current',row};
  }catch(error){
    if(fullYear&&pack&&pack.testId!==CONFIG.testId&&!payload&&!error.validationCode)return {classification:'other-test',hintTestId:pack.testId};
    const code=error.validationCode||'crypto.parse-decrypt',message=String(error&&error.message?error.message:error);
    const row=Object.assign({file:name,status:'CHYBA',error:message,validationCodes:[code],student:payload&&typeof payload.student==='string'?payload.student.slice(0,180):'?',attemptId:payload&&typeof payload.attemptId==='string'?payload.attemptId.slice(0,100):'',earned:0,total:0,pct:0,grade:'?',rawTxt:typeof txt==='string'&&txt.length<=E3_MAX_TXT?txt:'',submissionDigest:digest},sm);
    RESULTS.push(row);return {classification:'invalid-current',error:message,code,row};
  }
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
  const identityIndex=policy?normalized.indexOf(e3Header(policy.emailHeader)):-1,timestampIndex=policy?normalized.indexOf(e3Header(policy.timestampHeader)):-1;
  if(policy)e3Require(identityIndex>=0&&timestampIndex>=0,'csv.anchor-columns','CSV nemá zvolené systémové sloupce ověřeného e-mailu a času.');
  const testIdIndex=hnorm.findIndex(h=>h==='test id'||h==='id testu'),testNameIndex=hnorm.findIndex(h=>h==='test name'||h==='nazev testu'),groupIndex=hnorm.findIndex(h=>['group','class','skupina','trida','trida skupina'].includes(h));
  return {headers,data,delimiter:best.delimiter,delimiterLabel:best.delimiterLabel,identityIndex,timestampIndex,testIdIndex,testNameIndex,groupIndex};
}
function formsPushRowError(rowNo,message,meta){RESULTS.push(Object.assign({file:'forms_radek_'+rowNo+'.txt',status:'CHYBA',error:String(message||'Neplatný řádek CSV.'),validationCodes:['csv.row'],student:'?',earned:0,total:0,pct:0,grade:'?',rawTxt:''},verifierSourceMeta(meta)));}
function setFormsProgress(done,total){const box=$('formsImportProgress');if(box)box.textContent=total?'Zpracování CSV: '+done+' / '+total+' ('+Math.round(done/Math.max(1,total)*100)+' %)':'';}
function renderFormsImportSummary(summary){const box=$('formsImportSummary');if(!box)return;if(!summary){box.className='muted';box.textContent='Zatím nebyl importován žádný CSV export z formuláře.';return;}const n=k=>Number(summary[k]||0),dup=summary.duplicates||{},problems=n('invalid')+n('missing')+n('ambiguous')+n('metadataMismatch');box.className='warn';box.textContent='CSV '+(summary.fileName||'')+': načteno '+n('rows')+', opravené výsledky tohoto testu (původ neprokázán) '+n('ok')+' (včetně následně vyloučených replayů), aktuálně návrhů k posouzení '+n('eligibleProposals')+', replay odmítnutí '+n('replayRejected')+', jiné testy '+n('otherTests')+', neplatné/poškozené '+n('invalid')+', bez payloadu '+n('missing')+', nejednoznačné '+n('ambiguous')+', metadata mismatch '+n('metadataMismatch')+'. Duplicity: '+Number(dup.exact||0)+' identických, '+Number(dup.conflicts||0)+' studentů s více různými pokusy. Oddělovač: '+(summary.delimiterLabel||'?')+'.';}
async function importFormsCsvText(text,fileName){
  parseFormsCsvText(text);
  e3Require(FORMS_CSV_BATCHES.length<20&&FORMS_CSV_BATCHES.reduce((n,b)=>n+b.text.length,0)+text.length<=FORMS_CSV_MAX_BYTES,'csv.batch-limit','Na\u010dten\u00e1 CSV p\u0159ekra\u010duj\u00ed limit. Ulo\u017e v\u00fdsledky a za\u010dni novou sadu.');
  const batch={id:'forms-'+(++FORMS_BATCH_SEQUENCE),text,fileName:String(fileName||'forms.csv').slice(0,180)};FORMS_CSV_BATCHES.push(batch);
  try{return await queueFormsReevaluation();}catch(error){FORMS_CSV_BATCHES=FORMS_CSV_BATCHES.filter(b=>b!==batch);throw error;}
}
async function importFormsCsvFile(file){if(!file){vToast('Nebyl vybrán žádný CSV soubor.','warn');return;}try{const fn=String(file.name||'');if(/\.zip$/i.test(fn))throw new Error('ZIP nejdřív rozbal a vlož .csv soubor uvnitř.');if(fn&&/\.[^.]+$/.test(fn)&&!/\.csv$/i.test(fn))throw new Error('Podporuji CSV export z Google Forms (.csv). Soubor není potřeba otevírat ani převádět v Excelu.');if(Number(file.size)>FORMS_CSV_MAX_BYTES)throw new Error('CSV je příliš velké (maximum 20 MB).');const text=await file.text();const summary=await importFormsCsvText(text,file.name||'forms.csv');if(summary.waitingForWindow){vToast('CSV na\u010dteno. Zadej skute\u010dn\u00fd \u010das hodiny.','warn');return;}vToast('CSV import dokončen: '+Number(summary&&summary.ok||0)+' opravených výsledků tohoto testu; původ vyžaduje kontrolu.','ok');}catch(e){renderFormsImportSummary({fileName:file.name||'forms.csv',rows:0,ok:0,invalid:1,missing:0,ambiguous:0,delimiterLabel:'?',duplicates:{exact:0,conflicts:0}});vToast('Import CSV selhal: '+String(e&&e.message?e.message:e),'err');}}
`;
