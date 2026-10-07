// Private teacher settings are copied into each verifier, never into student HTML.
// This storage is a convenience for the generator, not a dependency of verification.
const GOOGLE_FORMS_ANCHOR_PROFILE_KEY='sestavovac_google_forms_anchor_profile_v1';
function formsTeacherEmails(value){
  const list=Array.isArray(value)?value:String(value||'').split(/[\s,;]+/);
  const emails=[...new Set(list.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean))];
  if(!emails.length||emails.length>12||emails.some(e=>e.length>254||! /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(e)))throw new TypeError('Vyplň platný školní e-mail učitele (lze více adres ze stejné domény).');
  return emails;
}
function normalizeGoogleFormsAnchorProfile(value){
  const raw=value&&typeof value==='object'?value:{};
  const teacherEmails=formsTeacherEmails(raw.teacherEmails),domains=[...new Set(teacherEmails.map(e=>e.split('@')[1]))];
  const schoolDomain=String(raw.schoolDomain||domains[0]).trim().toLowerCase();
  if(domains.length!==1||schoolDomain!==domains[0]||!schoolDomain.includes('.')||schoolDomain.length>253||!schoolDomain.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw new TypeError('E-maily učitelů musí patřit do potvrzené školní domény.');
  if(raw.verifiedEmailConfirmed!==true||raw.domainRestrictedConfirmed!==true||raw.csvOriginalConfirmed!==true||raw.lessonMarkersConfirmed!==true)throw new TypeError('Potvrď doménu a nastavení formuláře: ověřené školní e-maily, opakované odpovědi, povolené značky hodiny a původní CSV.');
  const toleranceMinutes=raw.toleranceMinutes===undefined?2:Number(raw.toleranceMinutes);
  if(raw.toleranceMinutes===''||!Number.isFinite(toleranceMinutes)||toleranceMinutes<0||toleranceMinutes>1440)throw new TypeError('Tolerance musí být 0 až 1440 minut.');
  const csvTimezone=String(raw.csvTimezone||'Europe/Prague');
  try{new Intl.DateTimeFormat('en-GB',{timeZone:csvTimezone}).format(new Date());}catch(_){throw new TypeError('Neplatná časová zóna CSV.');}
  const emailHeader=String(raw.emailHeader||'auto').trim(),timestampHeader=String(raw.timestampHeader||'auto').trim();
  if(!emailHeader||!timestampHeader||emailHeader.length>120||timestampHeader.length>120||(emailHeader!=='auto'&&emailHeader.toLowerCase()===timestampHeader.toLowerCase()))throw new TypeError('Neplatné systémové sloupce CSV.');
  return {v:1,teacherEmails,schoolDomain,csvTimezone,emailHeader,timestampHeader,toleranceMinutes,verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:true};
}
function configuredGoogleFormsAnchorProfile(){
  try{const raw=localStorage.getItem(GOOGLE_FORMS_ANCHOR_PROFILE_KEY);return raw?normalizeGoogleFormsAnchorProfile(JSON.parse(raw)):null;}catch(_){return null;}
}
function sameGoogleForm(a,b){try{const x=new URL(a),y=new URL(b);return x.origin===y.origin&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'');}catch(_){return false;}}
function requireFormsExportConfiguration(st){
  if(st.resultMode!=='secureOffline'||!st.__formsSubmissionUrl)return null;
  let metadata;try{metadata=normalizeStoredGoogleFormsMetadata(st.__formsMetadata);}catch(_){throw new Error('Export zastaven: chybí mapování Google Forms. Otevři Nastavení Generátoru → Google Forms → předvyplněný odkaz s hodnotami TESTID / NAZEV / TRIDA / KOD.');}
  if(!metadata.entries.submission)throw new Error('Export zastaven: pro značku hodiny chybí pole odevzdávacího kódu. Do stejného předvyplněného odkazu přidej hodnotu KOD v tomto poli a odkaz znovu ulož.');
  if(!sameGoogleForm(st.__formsSubmissionUrl,metadata.responderUrl))throw new Error('Export zastaven: odkaz a mapování patří k jiným formulářům. V Nastavení Generátoru ulož jeden správný předvyplněný odkaz.');
  const profile=normalizeGoogleFormsAnchorProfile(st.__formsAnchorProfile||configuredGoogleFormsAnchorProfile());
  if(st.identityMode!=='oneTimeCode')throw new Error('Export přes Forms vyžaduje Individuální kód studenta a roster se školními e-maily.');
  const roster=st.__roster||[];
  if(!roster.length)throw new Error('Export zastaven: chybí seznam studentů s osobními kódy a e-maily.');
  const codes=new Set(),emails=new Set();
  for(const row of roster){const c=String(row.code||'').trim().toUpperCase(),e=String(row.email||'').trim().toLowerCase();if(!/^[A-Z0-9]{6}$/.test(c)||! /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9.-]+$/.test(e)||e.split('@')[1]!==profile.schoolDomain||codes.has(c)||emails.has(e))throw new Error('Export zastaven: roster obsahuje neplatný/duplicitní kód nebo e-mail mimo školní doménu.');codes.add(c);emails.add(e);}
  return profile;
}
function syncFormsTeacherProfileFields(){
  const p=configuredGoogleFormsAnchorProfile();
  if($('generatorFormsTeacherEmails'))$('generatorFormsTeacherEmails').value=p?p.teacherEmails.join(', '):'';
  if($('generatorFormsTeacherConfirmed'))$('generatorFormsTeacherConfirmed').checked=!!p;
  if($('generatorFormsTolerance'))$('generatorFormsTolerance').value=p?p.toleranceMinutes:2;
  updateFormsTeacherDomain();
}
function updateFormsTeacherDomain(){
  const box=$('generatorFormsTeacherDomain');if(!box)return;
  try{const e=formsTeacherEmails($('generatorFormsTeacherEmails')?.value),d=[...new Set(e.map(x=>x.split('@')[1]))];box.textContent=d.length===1?'Doména školy: '+d[0]:'Adresy musejí mít stejnou školní doménu.';}catch(_){box.textContent='Doménu odvodím ze školního e-mailu.';}
}
function formsProfileFromSettingsUi(){
  const confirmed=$('generatorFormsTeacherConfirmed')?.checked===true;
  return normalizeGoogleFormsAnchorProfile({teacherEmails:$('generatorFormsTeacherEmails')?.value,toleranceMinutes:$('generatorFormsTolerance')?.value??2,verifiedEmailConfirmed:confirmed,domainRestrictedConfirmed:confirmed,csvOriginalConfirmed:confirmed,lessonMarkersConfirmed:confirmed});
}
async function saveFormsTeacherProfile(){
  try{const profile=formsProfileFromSettingsUi();if(!generatorPersistenceAllowed())return;localStorage.setItem(GOOGLE_FORMS_ANCHOR_PROFILE_KEY,JSON.stringify(profile));updateGeneratorSettingsMetadataStatus();uiToast('Nastavení učitele uloženo. Přenese se do každého nového verifieru.','ok');}catch(e){await uiAlert(String(e.message||e),'Nastavení Google Forms');}
}
function formsSubmissionRule(lang){return ({cs:'Po dokončení zkopíruj odevzdávací kód do školního formuláře.',en:'After finishing, copy the submission code into the school form.',es:'Al terminar, copia el código de entrega en el formulario del centro.',de:'Kopiere nach dem Abschluss den Abgabecode in das Schulformular.'})[lang]||'After finishing, copy the submission code into the school form.';}
