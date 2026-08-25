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
  toks.forEach(function(tok){ if(tok.indexOf('@')<0)return; var low=tok.toLowerCase(); if(seen[low])return; seen[low]=1; out.push({email:low,label:low.split('@')[0]}); });
  return out;
}
function rosterMakeCode(){
  var ab='ABCDEFGHJKMNPQRSTUVWXYZ23456789',n=6,o='';
  try{var a=new Uint32Array(n);crypto.getRandomValues(a);for(var i=0;i<n;i++)o+=ab[a[i]%ab.length];}
  catch(e){for(var j=0;j<n;j++)o+=ab[Math.floor(Math.random()*ab.length)];}
  return o;
}
function rosterForVerifier(){ return (rosterEntries||[]).map(function(e){ return {code:e.code,label:e.label}; }); }
function rosterRender(msg){
  var box=document.getElementById('rosterResult'); if(!box)return;
  if(msg){ box.innerHTML='<span style="color:var(--err)">'+rosterEscHtml(msg)+'</span>'; return; }
  if(!rosterEntries.length){ box.innerHTML='Zatím žádné kódy. Vlep e-maily a klikni na „Vygenerovat kódy".'; return; }
  var rows=rosterEntries.map(function(e){ return '<tr><td style="padding:3px 8px 3px 0">'+rosterEscHtml(e.label)+'</td><td style="padding:3px 10px;font-family:monospace;font-weight:700">'+rosterEscHtml(e.code)+'</td><td style="padding:3px 0;color:var(--t3)">'+rosterEscHtml(e.email)+'</td></tr>'; }).join('');
  box.innerHTML='<div style="margin-bottom:6px"><b>'+rosterEntries.length+'</b> studentů, kódy vygenerované. Zapečou se do verifieru až při vygenerování testu — při změně kódů test vygeneruj znovu.</div><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="text-align:left;color:var(--t3)"><th style="padding-right:8px">Označení</th><th style="padding-right:10px">Kód</th><th>E-mail</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function rosterGenerate(){
  var ta=document.getElementById('rosterEmails'); var raw=ta?ta.value:'';
  var parsed=rosterParseEmails(raw);
  if(!parsed.length){ rosterEntries=[]; rosterRender('Vlož aspoň jeden e-mail ve tvaru prijmeni@domena.'); return; }
  var used={};
  parsed.forEach(function(e){ var c; do{ c=rosterMakeCode(); }while(used[c]); used[c]=1; e.code=c; });
  rosterEntries=parsed; rosterRender('');
}
function rosterDownloadCsv(){
  if(!rosterEntries.length){ rosterRender('Nejdřív vygeneruj kódy.'); return; }
  var lines=['email,student,code'];
  rosterEntries.forEach(function(e){ lines.push([e.email,e.label,e.code].map(function(x){ var v=String(x==null?'':x); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }).join(',')); });
  try{ downloadBlobFile(lines.join('\n'),'kody_'+outputSlug()+'.csv','text/csv;charset=utf-8'); }
  catch(e){ rosterRender('Stažení CSV selhalo: '+(e&&e.message||e)); }
}
function outputSlug(extra='') {
  const slug = (trim('nazev') || 'test').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'test';
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
  catch(_) {
    const w = window.open('', '_blank');
    if (w) { w.document.write(generatedTestHtml); w.document.close(); }
    else setGenErr('Stažení se nezdařilo. Zkus otevřít stránku v aktuálním Chrome/Edge/Safari.');
  }
}
async function downloadGeneratedStudentTest() {
  if (!generatedPackage || !generatedPackage.studentHtml) return;
  if (!enforceSecureGate()) return;
  // Finální kontrola bajtů: nesmí to být omylem učitelský verifier / answer key.
  if (!(await guardExport(outputSlug('student_test')+'.html', generatedPackage.studentHtml, 'student', 'studentský test'))) return;
  try { downloadBlobFile(generatedPackage.studentHtml, outputSlug('student_test')+'.html'); }
  catch(e){ setGenErr('Stažení studentského testu se nezdařilo: '+(e&&e.message?e.message:e)); }
}
function teacherVerifierFileName(){ return 'DO_NOT_SEND_TEACHER_VERIFIER_contains_answers_'+outputSlug()+'_'+(generatedPackage&&generatedPackage.testId?generatedPackage.testId:'test')+'.html'; }
async function makeVariantForNextGroup(){
  if(!lastGenData){ uiAlert('Nejdřív vygeneruj test, pak z něj můžeš udělat variantu pro další skupinu.'); return; }
  variantSeq = (variantSeq||0) + 1;
  var letter = String.fromCharCode(65 + variantSeq); // B, C, D…
  variantSlug = 'skupina-' + letter.toLowerCase();
  // Varianta = jiné pořadí: zapni randomizaci (bere se až při sestavení), pak přesestav z týchž dat.
  if(typeof pick==='function') pick('randomizace','ANO'); else state.randomizace='ANO';
  var note=document.getElementById('variantNote');
  if(note){ note.classList.remove('hidden'); note.innerHTML='Připravuji variantu pro skupinu '+letter+'…'; }
  try{
    var built=await assembleTestHtml(state, lastGenData);
    if(built && typeof built==='object' && built.mode==='secureOffline'){ await validateSecurePackageSmoke(built); generatedPackage=built; generatedTestHtml=''; }
    else { var html=String(built||''); await validateGeneratedHtmlSmoke(html); generatedTestHtml=html; generatedPackage=null; }
    lastSelfTest=null; secureGapsAcknowledged=false; keyDiffsAcknowledged=false;
    if(typeof renderQualityDiagnostics==='function') renderQualityDiagnostics();
    if(typeof updateSecureDownloadGate==='function') updateSecureDownloadGate();
    var tid=(generatedPackage&&generatedPackage.testId)||(lastAssembled&&lastAssembled.cfg&&lastAssembled.cfg.testId)||'(nové)';
    if(note){ note.classList.remove('hidden'); note.innerHTML='✅ Varianta pro skupinu '+letter+' připravena: nové Test ID <b>'+tid+'</b>, nový název souboru (<code>'+outputSlug('student_test')+'.html</code>) a zapnuté promíchané pořadí. Stejná látka i body. Před stažením znovu spusť 🧪 self-test, pak stáhni nahoře jako obvykle. Správné odpovědi posílej studentům až po skončení všech skupin.'; }
  }catch(e){
    if(note){ note.classList.remove('hidden'); note.innerHTML='⚠️ Vytvoření varianty selhalo: '+((e&&e.message)?e.message:String(e)); }
  }
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
  try { downloadBlobFile(generatedPackage.teacherHtml, teacherVerifierFileName()); }
  catch(e){ setGenErr('Stažení učitelského verifieru se nezdařilo: '+(e&&e.message?e.message:e)); }
}
