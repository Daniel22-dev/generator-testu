// Private teacher settings are copied into each verifier, never into student HTML.
// This storage is a convenience for the generator, not a dependency of verification.
const GOOGLE_FORMS_ANCHOR_PROFILE_KEY='sestavovac_google_forms_anchor_profile_v1';
function formsTeacherEmails(value){
  const list=Array.isArray(value)?value:String(value||'').split(/[\s,;]+/);
  const emails=[...new Set(list.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean))];
  if(!emails.length||emails.length>12||emails.some(e=>e.length>254||! /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(e)))throw new TypeError('Vypl\u0148 platn\u00fd \u0161koln\u00ed e-mail u\u010ditele (lze v\u00edce adres ze stejn\u00e9 dom\u00e9ny).');
  return emails;
}
function normalizeGoogleFormsAnchorProfile(value){
  const raw=value&&typeof value==='object'?value:{};
  const teacherEmails=formsTeacherEmails(raw.teacherEmails),domains=[...new Set(teacherEmails.map(e=>e.split('@')[1]))];
  const schoolDomain=String(raw.schoolDomain||domains[0]).trim().toLowerCase();
  if(domains.length!==1||schoolDomain!==domains[0]||!schoolDomain.includes('.')||schoolDomain.length>253||!schoolDomain.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw new TypeError('E-maily u\u010ditel\u016f mus\u00ed pat\u0159it do potvrzen\u00e9 \u0161koln\u00ed dom\u00e9ny.');
  if(raw.verifiedEmailConfirmed!==true||raw.domainRestrictedConfirmed!==true||raw.csvOriginalConfirmed!==true||raw.lessonMarkersConfirmed!==true)throw new TypeError('Potvr\u010f dom\u00e9nu a nastaven\u00ed formul\u00e1\u0159e: ov\u011b\u0159en\u00e9 \u0161koln\u00ed e-maily, opakovan\u00e9 odpov\u011bdi, povolen\u00e9 zna\u010dky hodiny a p\u016fvodn\u00ed CSV.');
  const toleranceMinutes=raw.toleranceMinutes===undefined?2:Number(raw.toleranceMinutes);
  if(raw.toleranceMinutes===''||!Number.isFinite(toleranceMinutes)||toleranceMinutes<0||toleranceMinutes>1440)throw new TypeError('Tolerance mus\u00ed b\u00fdt 0 a\u017e 1440 minut.');
  const csvTimezone=String(raw.csvTimezone||'Europe/Prague');
  try{new Intl.DateTimeFormat('en-GB',{timeZone:csvTimezone}).format(new Date());}catch(_){throw new TypeError('Neplatn\u00e1 \u010dasov\u00e1 z\u00f3na CSV.');}
  const emailHeader=String(raw.emailHeader||'auto').trim(),timestampHeader=String(raw.timestampHeader||'auto').trim();
  if(!emailHeader||!timestampHeader||emailHeader.length>120||timestampHeader.length>120||(emailHeader!=='auto'&&emailHeader.toLowerCase()===timestampHeader.toLowerCase()))throw new TypeError('Neplatn\u00e9 syst\u00e9mov\u00e9 sloupce CSV.');
  return {v:1,teacherEmails,schoolDomain,csvTimezone,emailHeader,timestampHeader,toleranceMinutes,verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:true};
}
function configuredGoogleFormsAnchorProfile(){
  try{const raw=localStorage.getItem(GOOGLE_FORMS_ANCHOR_PROFILE_KEY);return raw?normalizeGoogleFormsAnchorProfile(JSON.parse(raw)):null;}catch(_){return null;}
}
function sameGoogleForm(a,b){try{const x=new URL(a),y=new URL(b);return x.origin===y.origin&&x.pathname.replace(/\/$/,'')===y.pathname.replace(/\/$/,'');}catch(_){return false;}}
function requireFormsExportConfiguration(st){
  if(st.resultMode!=='secureOffline'||!st.__formsSubmissionUrl)return null;
  let metadata;try{metadata=normalizeStoredGoogleFormsMetadata(st.__formsMetadata);}catch(_){throw new Error('Export zastaven: chyb\u00ed mapov\u00e1n\u00ed Google Forms. Otev\u0159i Nastaven\u00ed Gener\u00e1toru \u2192 Google Forms \u2192 p\u0159edvypln\u011bn\u00fd odkaz s hodnotami TESTID / NAZEV / TRIDA / KOD.');}
  if(!metadata.entries.submission)throw new Error('Export zastaven: pro zna\u010dku hodiny chyb\u00ed pole odevzd\u00e1vac\u00edho k\u00f3du. Do stejn\u00e9ho p\u0159edvypln\u011bn\u00e9ho odkazu p\u0159idej hodnotu KOD v tomto poli a odkaz znovu ulo\u017e.');
  if(!sameGoogleForm(st.__formsSubmissionUrl,metadata.responderUrl))throw new Error('Export zastaven: odkaz a mapov\u00e1n\u00ed pat\u0159\u00ed k jin\u00fdm formul\u00e1\u0159\u016fm. V Nastaven\u00ed Gener\u00e1toru ulo\u017e jeden spr\u00e1vn\u00fd p\u0159edvypln\u011bn\u00fd odkaz.');
  const profile=normalizeGoogleFormsAnchorProfile(st.__formsAnchorProfile||configuredGoogleFormsAnchorProfile());
  if(st.identityMode!=='oneTimeCode')throw new Error('Export p\u0159es Forms vy\u017eaduje Individu\u00e1ln\u00ed k\u00f3d studenta a roster se \u0161koln\u00edmi e-maily.');
  const roster=st.__roster||[];
  if(!roster.length)throw new Error('Export zastaven: chyb\u00ed seznam student\u016f s osobn\u00edmi k\u00f3dy a e-maily.');
  const codes=new Set(),emails=new Set();
  for(const row of roster){const c=String(row.code||'').trim().toUpperCase(),e=String(row.email||'').trim().toLowerCase();if(!/^[A-Z0-9]{6}$/.test(c)||! /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@[a-z0-9.-]+$/.test(e)||e.split('@')[1]!==profile.schoolDomain||codes.has(c)||emails.has(e))throw new Error('Export zastaven: roster obsahuje neplatn\u00fd/duplicitn\u00ed k\u00f3d nebo e-mail mimo \u0161koln\u00ed dom\u00e9nu.');codes.add(c);emails.add(e);}
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
  try{const e=formsTeacherEmails($('generatorFormsTeacherEmails')?.value),d=[...new Set(e.map(x=>x.split('@')[1]))];box.textContent=d.length===1?'Dom\u00e9na \u0161koly: '+d[0]:'Adresy musej\u00ed m\u00edt stejnou \u0161koln\u00ed dom\u00e9nu.';}catch(_){box.textContent='Dom\u00e9nu odvod\u00edm ze \u0161koln\u00edho e-mailu.';}
}
function formsProfileFromSettingsUi(){
  const confirmed=$('generatorFormsTeacherConfirmed')?.checked===true;
  return normalizeGoogleFormsAnchorProfile({teacherEmails:$('generatorFormsTeacherEmails')?.value,toleranceMinutes:$('generatorFormsTolerance')?.value??2,verifiedEmailConfirmed:confirmed,domainRestrictedConfirmed:confirmed,csvOriginalConfirmed:confirmed,lessonMarkersConfirmed:confirmed});
}
async function saveFormsTeacherProfile(){
  try{const profile=formsProfileFromSettingsUi();if(!generatorPersistenceAllowed())return;localStorage.setItem(GOOGLE_FORMS_ANCHOR_PROFILE_KEY,JSON.stringify(profile));updateGeneratorSettingsMetadataStatus();uiToast('Nastaven\u00ed u\u010ditele ulo\u017eeno. P\u0159enese se do ka\u017ed\u00e9ho nov\u00e9ho verifieru.','ok');}catch(e){await uiAlert(String(e.message||e),'Nastaven\u00ed Google Forms');}
}
function formsSubmissionRule(lang){return ({cs:'Po dokon\u010den\u00ed zkop\u00edruj odevzd\u00e1vac\u00ed k\u00f3d do \u0161koln\u00edho formul\u00e1\u0159e.',en:'After finishing, copy the submission code into the school form.',es:'Al terminar, copia el c\u00f3digo de entrega en el formulario del centro.',de:'Kopiere nach dem Abschluss den Abgabecode in das Schulformular.'})[lang]||'After finishing, copy the submission code into the school form.';}
