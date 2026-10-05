// P3 lazy loader: Test Lab is downloaded only when an administrator opens it.
function ghrabGeneratorFeatureLoader(name, url) {
  window.GHRABGeneratorFeatures = window.GHRABGeneratorFeatures || {};
  const ready = window.GHRABGeneratorFeatures[name];
  if (ready) return Promise.resolve(ready);
  window.__GHRAB_GENERATOR_FEATURE_PROMISES = window.__GHRAB_GENERATOR_FEATURE_PROMISES || {};
  if (!window.__GHRAB_GENERATOR_FEATURE_PROMISES[name]) {
    const load = window.GHRAB_PLATFORM && window.GHRAB_PLATFORM.modules && window.GHRAB_PLATFORM.modules.loadScript
      ? window.GHRAB_PLATFORM.modules.loadScript(url, { name: 'generator:' + name })
      : new Promise(function(resolve, reject){
          const script=document.createElement('script'); script.src=url; script.async=false;
          script.onload=resolve; script.onerror=function(){ reject(new Error('Lazy feature failed: '+url)); };
          document.head.appendChild(script);
        });
    window.__GHRAB_GENERATOR_FEATURE_PROMISES[name] = load.then(function(){
      const api=window.GHRABGeneratorFeatures[name]; if(!api) throw new Error('Lazy feature did not register: '+name); return api;
    }).catch(function(error){ delete window.__GHRAB_GENERATOR_FEATURE_PROMISES[name]; throw error; });
  }
  return window.__GHRAB_GENERATOR_FEATURE_PROMISES[name];
}
function openTestLab(){
  return ghrabGeneratorFeatureLoader('testLab','./features/testlab.js')
    .then(function(api){ return api.open(); })
    .catch(function(error){ try{ uiAlert('Test Lab se nepoda\u0159ilo na\u010d\u00edst: '+error.message,'Test Lab'); }catch(_){} });
}
function downloadBlobFile(content, filename, mime='text/html;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function rosterEscHtml(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function rosterParseEmails(raw){
  var toks=String(raw||'').split(/[\s,;]+/).map(function(x){return x.trim();}).filter(Boolean);
  var seen={},out=[];
  toks.forEach(function(tok){ if(!/^[^\s@]+@[^\s@]+$/.test(tok))return; var low=tok.toLowerCase(); if(seen[low])return; seen[low]=1; out.push({email:low,label:low.split('@')[0]}); });
  return out;
}

// One code set per test preparation. Distribution choices live only in Sheets.
let rosterIssuedCodes = new Map();
let rosterIssuedState = null;
function rosterEnsureCodeRegistry(){
  if(rosterIssuedState!==state){rosterIssuedCodes=new Map();rosterIssuedState=state;rosterEntries=[];}
  for(const entry of rosterEntries)if(entry.email&&entry.code)rosterIssuedCodes.set(entry.email,{...entry});
}
function rosterMakeCode(){
  if(!globalThis.crypto?.getRandomValues)throw new Error('Bezpečný generátor kódů není dostupný. Otevři aplikaci přes HTTPS.');
  const ab='ABCDEFGHJKMNPQRSTUVWXYZ23456789',limit=Math.floor(0x100000000/ab.length)*ab.length;
  let out='';
  while(out.length<6){const values=new Uint32Array(12);crypto.getRandomValues(values);for(const n of values){if(n<limit)out+=ab[n%ab.length];if(out.length===6)break;}}
  return out;
}
function rosterSyncActiveCodes(){
  rosterEnsureCodeRegistry();
  rosterEntries=rosterChosenParticipants().filter(e=>rosterIssuedCodes.has(e.email)).map(e=>({...rosterIssuedCodes.get(e.email),label:e.label}));
}
function rosterSelectionReady(){
  const chosen=rosterChosenParticipants();
  return chosen.length>0&&chosen.length===rosterEntries.length&&chosen.every(e=>rosterEntries.some(r=>r.email===e.email&&r.code));
}
function rosterForVerifier(){return rosterEntries.map(e=>({code:e.code,label:e.label,email:e.email}));}
function rosterRender(msg){
  const box=$('rosterResult');if(!box)return;
  box.replaceChildren();
  if(msg){box.textContent=msg;return;}
  const head=document.createElement('p');
  head.textContent=rosterEntries.length
    ? rosterEntries.length+' kódů připraveno. Doplnění zachová stávající kódy. Kdo e-mail skutečně obdrží, určíš až v Sheets.'
    : 'Vlož skupinu a připrav kódy. Tato akce nic neodesílá.';
  box.append(head);
  if(!rosterEntries.length)return;
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Zobrazit soukromý seznam kódů';details.append(summary);
  const table=document.createElement('table');table.style.width='100%';
  for(const e of rosterEntries){const row=document.createElement('tr');for(const value of [e.label,e.code,e.email]){const cell=document.createElement('td');cell.textContent=value;cell.style.overflowWrap='anywhere';row.append(cell);}table.append(row);}
  details.append(table);box.append(details);
}
function rosterGenerate(){
  rosterEnsureCodeRegistry();const parsed=rosterChosenParticipants();
  if(!parsed.length){rosterSyncActiveCodes();rosterRender('Vlož celou skupinu z IS. GIT připravuje kódy vždy všem; příjemce vybereš až v Sheets.');validate();return;}
  const used=new Set(Array.from(rosterIssuedCodes.values(),e=>e.code));
  try{for(const entry of parsed){if(rosterIssuedCodes.has(entry.email))continue;let code;do{code=rosterMakeCode();}while(used.has(code));used.add(code);rosterIssuedCodes.set(entry.email,{...entry,code});}}
  catch(error){rosterRender(error.message);return;}
  rosterSyncActiveCodes();rosterRender();validate();
}
async function rosterNewCodeSet(){
  if(!(await uiConfirm('Vytvořit novou sadu kódů pro NOVÝ test? Již rozeslané soubory ani kódy tím nezneplatníš. Pokud už existuje hotový test, bude nutný nový export a verifier.','Nový test — nové kódy',true)))return;
  rosterIssuedCodes.clear();rosterEntries=[];rosterGenerate();
}
function rosterDownloadCsv(){
  rosterSyncActiveCodes();
  if(!rosterSelectionReady()){rosterRender('Nejdřív připrav / doplň kódy pro celý aktuální výběr.');return;}
  const sealed=lastAssembled&&lastAssembled.sourceState&&lastAssembled.sourceState.__roster;
  if(sealed&&JSON.stringify(sealed)!==JSON.stringify(rosterForVerifier())){rosterRender('Seznam kódů se liší od hotového testu. Vytvoř novou exportní verzi s těmito kódy. Pro pouhou změnu příjemců ponech skupinu zde a vybírej v Sheets.');return;}
  const testId=lastAssembled?.cfg?.testId||'';
  const cell=x=>{let v=String(x??'');if(/^[=+@-]/.test(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const lines=['email,student,code,test_id,odeslat'];
  rosterEntries.forEach(e=>lines.push([e.email,e.label,e.code,testId,'FALSE'].map(cell).join(',')));
  try{downloadBlobFile(lines.join('\n'),'kody_'+outputSlug()+'.csv','text/csv;charset=utf-8');}
  catch(error){rosterRender('Stažení CSV selhalo: '+error.message);}
}
function outputSlug(extra='') {
  const slug = ((lastAssembled&&lastAssembled.sourceState&&lastAssembled.sourceState.__outputFields&&lastAssembled.sourceState.__outputFields.nazev)||trim('nazev') || 'test').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'test';
  const v = (typeof variantSlug === 'string' && variantSlug) ? '_' + variantSlug : '';
  return extra ? slug + v + '_' + extra : slug + v;
}
async function downloadGeneratedTest() {
  if (generatedPackage && generatedPackage.mode === 'secureOffline') {
    if (!enforceSecureGate()) return;
    await downloadGeneratedStudentTest();
    await downloadGeneratedTeacherVerifier();
    return;
  }
  if (!generatedTestHtml) return;
  // I instant test projde scannerem (nesmí v něm být private key/master key/externí token).
  if (!(await guardExport(outputSlug()+'.html', generatedTestHtml, 'student-instant', 'studentský test'))) return;
  try { downloadBlobFile(generatedTestHtml, outputSlug()+'.html'); }
  catch(_) { setGenErr('Stažení se nezdařilo. Zkus otevřít stránku v aktuálním Chrome/Edge/Safari. Generátor z bezpečnostních důvodů nespouští vygenerované HTML jako same-origin náhradní náhled.'); }
}
async function downloadGeneratedStudentTest() {
  if (!generatedPackage || !generatedPackage.studentHtml) return;
  if (!enforceSecureGate()) return;
  // Finální kontrola bajtů: nesmí to být omylem učitelský verifier / answer key.
  if (!(await guardExport(outputSlug('student_test')+'.html', generatedPackage.studentHtml, 'student', 'studentský test'))) return;
  try { downloadBlobFile(generatedPackage.studentHtml, outputSlug('student_test')+'.html'); rememberSecureRecoveryExport(generatedPackage); }
  catch(e){ setGenErr('Stažení studentského testu se nezdařilo: '+(e&&e.message?e.message:e)); }
}
function teacherVerifierFileName(){ return 'DO_NOT_SEND_TEACHER_VERIFIER_contains_answers_'+outputSlug()+'_'+(generatedPackage&&generatedPackage.testId?generatedPackage.testId:'test')+'.html'; }
async function makeVariantForNextGroup(){
  if(!lastGenData||outputMutationBusy)return;
  const stamp=outputStamp(),snapshot=outputEditState(),seq=(variantSeq||0)+1;
  const letter=seq<26?String.fromCharCode(65+seq):String(seq+1);
  snapshot.randomizace='ANO';
  const note=$('variantNote');if(note){note.classList.remove('hidden');note.textContent='Připravuji variantu pro skupinu '+letter+'…';}
  try{
    await commitAnswerData(JSON.parse(JSON.stringify(lastGenData)),stamp,snapshot,{freshArtifact:true,reason:'Nová varianta je nový test.'});
    // A real new variant is a new test artefact: human review must not be inherited.
    exportChecklist={};
    renderExportChecklist(true);
    updateSecureDownloadGate();
    variantSeq=seq;variantSlug='skupina-'+letter.toLowerCase();
    if(note)note.textContent='Varianta '+letter+' je připravena: nové Test ID, stejný obsah a body, promíchané pořadí. Znovu projděte kontrolu obsahu a self-test. Pro tuto variantu stáhněte také její vlastní učitelský soubor.';
    resultStep(1,true);
  }catch(error){if(note)note.textContent='Varianta nebyla vytvořena, původní test zůstal zachován: '+error.message;}
}

async function downloadGeneratedTeacherVerifier() {
  if (!generatedPackage || !generatedPackage.teacherHtml) return;
  if (!enforceSecureGate()) return;
  // Poslední pojistka u rizikové akce: učitelský verifier obsahuje správné odpovědi
  // i soukromý dešifrovací klíč. Krátké vědomé potvrzení, ať se nestáhne omylem do
  // sdílené složky spolu se studentským souborem.
  const ok = await uiConfirm(
    'Tento soubor obsahuje SPRÁVNÉ ODPOVĚDI a soukromý dešifrovací klíč. Je určen POUZE učiteli.\n\nNikdy ho neposílej studentům ani neukládej do sdílené složky, odkud berou test. Studentům jde jen student_test.html.\n\nStáhnout učitelský verifier?',
    'Stažení učitelského verifieru', true);
  if (!ok) return;
  // Scanner v režimu 'teacher': private key i answer key jsou tu OČEKÁVANÉ a neblokují se;
  // blokuje jen master key nebo externí token (GitHub/API) — ty sem nepatří.
  if (!(await guardExport(teacherVerifierFileName(), generatedPackage.teacherHtml, 'teacher', 'učitelský verifier'))) return;
  // Varování přímo v názvu souboru — přežije i mimo aplikaci (ve složce stažených,
  // při přeposílání), kde UI hlášku nikdo nevidí.
  try { downloadBlobFile(generatedPackage.teacherHtml, teacherVerifierFileName()); rememberSecureRecoveryExport(generatedPackage); }
  catch(e){ setGenErr('Stažení učitelského verifieru se nezdařilo: '+(e&&e.message?e.message:e)); }
}

// GIT full-roster workflow: operativní výběr příjemců patří výhradně do Sheets.
function rosterRefreshParticipants(){
  rosterSyncActiveCodes();rosterRender();validate();saveSnapshot();
}
function rosterRenderParticipants(){}
function rosterChosenParticipants(){return rosterParseEmails(val('rosterEmails'));}
async function rosterApplyToOutput(){
  if(!lastAssembled||!lastGenData){rosterRender('Nejdřív vytvoř obsah testu.');return;}
  if(!rosterEntries.length){rosterRender('Nejdřív připrav kódy celé skupině.');return;}
  if(outputMutationBusy||window.__GHRAB_GENERATOR_WORKFLOW_ID__)return;
  rosterSyncActiveCodes();
  if(!rosterSelectionReady()){rosterRender('Doplň kódy celé skupině.');return;}
  const st=outputEditState();
  if(st.diferencovany==='ANO'){rosterRender('U diferencovaného testu nejprve uprav také kódy ve skupinách a vytvoř test znovu.');return;}
  st.identityMode='oneTimeCode';st.__roster=rosterForVerifier();
  try{
    await commitAnswerData(lastGenData,outputStamp(),st,{freshArtifact:true,reason:'Změnili se účastníci testu. Spusť self-test nového balíčku.'});
    exportChecklist={};renderExportChecklist(true);updateSecureDownloadGate();
    goTo(4);
    uiToast('Kódy použity bez AI. Zopakuj kontroly a stáhni nový pár souborů.','ok',6500);
    rosterRender('Proveď kontroly a nahraď studentský soubor i verifier novým párem. Staré soubory na zařízeních studentů zůstanou platné.');
  }catch(error){rosterRender('Účastníky se nepodařilo použít: '+error.message);}
}
