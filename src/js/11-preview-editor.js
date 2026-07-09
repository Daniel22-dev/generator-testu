// ═══ Náhled testu před stažením ════════════════════════════════════════════════
function getPreviewHtml(){
  if (generatedPackage && generatedPackage.mode === 'secureOffline' && generatedPackage.studentHtml) {
    return { html: generatedPackage.studentHtml, secure: true };
  }
  if (generatedTestHtml) return { html: generatedTestHtml, secure: false };
  return null;
}
function previewEscHandler(e){ if (e && e.key === 'Escape') closeTestPreview(); }
function previewBackdrop(e){ if (e && e.target && e.target.id === 'previewModal') closeTestPreview(); }
function setPreviewWidth(w){
  const frame = $('previewFrame');
  const map = { '360':'pvW360', '768':'pvW768', '0':'pvWfull' };
  Object.keys(map).forEach(k => { const b = $(map[k]); if (b) b.classList.toggle('active', Number(k) === Number(w)); });
  if (!frame) return;
  if (Number(w) === 0) { frame.classList.add('full'); frame.style.width = ''; }
  else { frame.classList.remove('full'); frame.style.width = w + 'px'; }
}
function openTestPreview(){
  const pv = getPreviewHtml();
  const modal = $('previewModal'), frame = $('previewFrame'), note = $('previewNote');
  if (!pv || !pv.html) { uiAlert('Nejdřív vygeneruj test, pak ho můžeš zobrazit v náhledu.'); return; }
  if (note) note.textContent = pv.secure
    ? 'Studentský test (bez správných odpovědí). Vidíš zadání, otázky, nabídku odpovědí i design přesně jako studenti. Správnost klíče zkontroluješ v učitelském verifieru.'
    : 'Hotový test tak, jak ho uvidí studenti. Náhled je interaktivní — můžeš si projít cvičení.';
  setPreviewWidth(360);
  if (frame) frame.srcdoc = pv.html;
  exportChecklist.preview = true;
  renderExportChecklist();
  if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  document.addEventListener('keydown', previewEscHandler);
}
function closeTestPreview(){
  const modal = $('previewModal'), frame = $('previewFrame');
  if (frame) frame.srcdoc = '';
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', previewEscHandler);
}

// ═══ Vizuální editor otázek a odpovědí ═════════════════════════════════════════
const ED = { genData:null, variantKey:'__default', variants:[], banner:'' };
const ED_CHOICE = ['multiple choice','reading comprehension','listening comprehension','dialogue completion'];
const ED_TEXTALT = ['fill-in-the-blank','error correction','translation','sentence transformation','word formation'];

function edExercises(){
  if(!ED.genData) return [];
  if(ED.variantKey==='__default'){ if(!Array.isArray(ED.genData.exercises)) ED.genData.exercises=[]; return ED.genData.exercises; }
  if(!ED.genData.group_variants || typeof ED.genData.group_variants!=='object') ED.genData.group_variants={};
  let v=ED.genData.group_variants[ED.variantKey];
  if(Array.isArray(v)){ v={exercises:v}; ED.genData.group_variants[ED.variantKey]=v; }
  if(!v || !Array.isArray(v.exercises)){ v={exercises:[]}; ED.genData.group_variants[ED.variantKey]=v; }
  return v.exercises;
}
function edIsDiff(){ return ED.variants.length>0; }
function edVariantName(){ const g=ED.variants.find(x=>x.key===ED.variantKey); return g?g.name:''; }

function edGetVal(it, keys){ for(const k of keys){ if(it[k]!=null && String(it[k]).length) return String(it[k]); } for(const k of keys){ if(k in it) return String(it[k]==null?'':it[k]); } return ''; }
function edKey(it, keys){ for(const k of keys){ if(k in it) return k; } return keys[0]; }

function openTestEditor(){
  if(!lastGenData){ uiAlert('Nejdřív vygeneruj test, pak můžeš upravovat otázky.'); return; }
  openEditorFromData(lastGenData, '');
}
function openEditorFromData(srcGenData, banner){
  ED.genData = JSON.parse(JSON.stringify(srcGenData));
  const groups = (typeof getApiDiffGroups==='function') ? getApiDiffGroups(state) : [];
  ED.variants = Array.isArray(groups)?groups:[];
  ED.variantKey = ED.variants.length ? ED.variants[0].key : '__default';
  ED.banner = banner || '';
  const er=$('editorError'); if(er){ er.classList.add('hidden'); er.textContent=''; }
  renderEditor();
  const m=$('editorModal'); if(m){ m.classList.remove('hidden'); document.body.style.overflow='hidden'; }
}
function closeTestEditor(){ const m=$('editorModal'); if(m) m.classList.add('hidden'); document.body.style.overflow=''; ED.genData=null; ED.banner=''; }
function edSwitchVariant(key){ ED.variantKey=key; renderEditor(); }

function renderEditor(){
  const host=$('editorBody'); if(!host) return;
  let html='';
  if(ED.banner) html+='<div class="ed-banner">'+H(ED.banner)+'</div>';
  if(edIsDiff()){
    html+='<div class="ed-tabs">'+ED.variants.map(g=>'<button class="ed-tab'+(g.key===ED.variantKey?' active':'')+'" onclick="edSwitchVariant(\''+H(g.key)+'\')">'+H(g.name)+'</button>').join('')+'</div>';
    html+='<div class="ed-note">Diferencovaný test: všechny skupiny musí mít stejný počet cvičení i položek, takže přidávání/odebírání položek je zde vypnuté. Upravuješ obsah varianty „'+H(edVariantName())+'“.</div>';
  }
  const exs=edExercises();
  if(!exs.length){ host.innerHTML=html+'<div class="ed-note">Žádná cvičení k úpravě.</div>'; return; }
  exs.forEach((ex,ei)=>{ html+=edExerciseHtml(ex,ei); });
  host.innerHTML=html;
}

function edRow(label, inner, hint){ return '<div class="ed-f"><label class="ed-lbl">'+H(label)+(hint?' <span class="ed-hint">'+H(hint)+'</span>':'')+'</label>'+inner+'</div>'; }
function edInput(key,ei,ii,val,ph,extra){ return '<input class="ed-in'+(extra||'')+'" value="'+H(val)+'" oninput="edSetField('+ei+','+ii+',\''+key+'\',this.value)" placeholder="'+H(ph||'')+'">'; }
function edTextarea(key,ei,ii,val,ph){ return '<textarea class="ed-ta" oninput="edSetField('+ei+','+ii+',\''+key+'\',this.value)" placeholder="'+H(ph||'')+'">'+H(val)+'</textarea>'; }

function edExerciseHtml(ex,ei){
  const type=normalizeType(ex.type||'');
  let h='<div class="ed-ex"><div class="ed-ex-head"><span class="ed-ex-num">'+(ei+1)+'</span>'+
    '<input class="ed-title" value="'+H(ex.title||type)+'" oninput="edSetTitle('+ei+',this.value)" placeholder="Název cvičení">'+
    '<span class="ed-type">'+H(type)+'</span></div>';
  const items=Array.isArray(ex.items)?ex.items:[];
  items.forEach((it,ii)=>{ h+=edItemHtml(type,it,ei,ii,items.length); });
  if(!edIsDiff()) h+='<button class="ed-add" onclick="edAddItem('+ei+')">+ Přidat položku</button>';
  h+='</div>';
  return h;
}

function edItemHtml(type,it,ei,ii,count){
  let h='<div class="ed-item"><div class="ed-item-head"><span class="ed-item-num">'+(ii+1)+'.</span>';
  if(!edIsDiff() && count>1) h+='<button class="ed-del" onclick="edDelItem('+ei+','+ii+')" title="Smazat položku">✕ položka</button>';
  h+='</div>';

  if(ED_CHOICE.includes(type)){
    if(type==='reading comprehension'){ const pk=edKey(it,['passage','text','source','prompt']); h+=edRow('Text k úloze (passage)', edTextarea(pk,ei,ii,edGetVal(it,['passage','text','source','prompt']),'Text, ke kterému se otázka vztahuje')); }
    if(type==='listening comprehension'){ const tk=edKey(it,['transcript','audio_source_note','audio_prompt','source_url','text']); h+=edRow('Transkript / audio (jen pro učitele)', edTextarea(tk,ei,ii,edGetVal(it,['transcript','audio_source_note','audio_prompt','source_url','text']),'Studentům se nezobrazí')); }
    const qk=edKey(it,['question','prompt']);
    h+=edRow('Otázka', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt']),'Znění otázky'));
    h+=edOptionsBlock(it,ei,ii);
  } else if(type==='dialogue completion'){
    const dk=edKey(it,['dialogue','prompt','question']);
    h+=edRow('Dialog / zadání', edTextarea(dk,ei,ii,edGetVal(it,['dialogue','prompt','question']),'Replika dialogu s vynechaným místem'));
    h+=edOptionsBlock(it,ei,ii);
  } else if(type==='matching'){
    const lk=edKey(it,['left']), rk=edKey(it,['right']);
    h+=edRow('Vlevo', edInput(lk,ei,ii,edGetVal(it,['left']),'Levá strana páru'));
    h+=edRow('Vpravo (správné spárování)', edInput(rk,ei,ii,edGetVal(it,['right']),'Pravá strana páru'));
  } else if(type==='true/false'){
    const sk=edKey(it,['statement','question','prompt']);
    h+=edRow('Tvrzení', edTextarea(sk,ei,ii,edGetVal(it,['statement','question','prompt']),'Tvrzení, které student posoudí'));
    const isT = it.correct===true;
    h+=edRow('Správně', '<div class="ed-tf"><label><input type="radio" name="tf_'+ei+'_'+ii+'" '+(isT?'checked':'')+' onclick="edSetTF('+ei+','+ii+',true)"> Pravda</label><label><input type="radio" name="tf_'+ei+'_'+ii+'" '+(!isT?'checked':'')+' onclick="edSetTF('+ei+','+ii+',false)"> Nepravda</label></div>');
  } else if(type==='cloze text'){
    const ck=edKey(it,['text','passage']);
    h+=edRow('Text s mezerami', edTextarea(ck,ei,ii,edGetVal(it,['text','passage']),'Použij ___ pro každou vynechanou mezeru'),'každé ___ = jedna mezera');
    h+=edClozeBlock(it,ei,ii);
  } else if(type==='categorization'){
    const ik=edKey(it,['text','item','prompt']);
    h+=edRow('Položka k zařazení', edInput(ik,ei,ii,edGetVal(it,['text','item','prompt']),'Co student zařazuje'));
    h+=edCatBlock(it,ei,ii);
  } else if(type==='word order'){
    h+=edRow('Zamíchaná slova', edWordsBlock(it,ei,ii));
    const ak=edKey(it,['correct_sentence','answer']);
    h+=edRow('Správná věta', edInput(ak,ei,ii,edGetVal(it,['correct_sentence','answer']),'Správné pořadí slov',' ed-correct'));
    h+=edAltBlock(it,ei,ii,'Přijatelné varianty věty');
  } else if(type==='fill-in-the-blank' && (((String(it.sentence||it.prompt||'').split('___').length-1)>=2) || (Array.isArray(it.answers)&&it.answers.length>1))){
    // Vícemezerové fill-in: edituje se per-mezera jako cloze (každé ___ má vlastní klíč).
    const fk=edKey(it,['sentence','prompt']);
    h+=edRow('Věta s mezerami', edTextarea(fk,ei,ii,edGetVal(it,['sentence','prompt']),'Každé ___ = jedna mezera'),'každé ___ = jedna mezera');
    if(!Array.isArray(it.answers)){ it.answers = it.answer!=null?[String(it.answer)]:['']; }
    h+=edClozeBlock(it,ei,ii);
  } else if(ED_TEXTALT.includes(type)){
    const promptKeys = ({'fill-in-the-blank':['sentence','prompt'],'error correction':['sentence','prompt'],'translation':['prompt','source','sentence','question'],'sentence transformation':['prompt','sentence','question'],'word formation':['sentence','prompt','question']})[type]||['sentence','prompt','question'];
    const answerKeys = ({'fill-in-the-blank':['answer'],'error correction':['correction','answer'],'translation':['answer','translation','model_answer'],'sentence transformation':['answer','correct_sentence','model_answer'],'word formation':['answer']})[type]||['answer'];
    const pk=edKey(it,promptKeys), ak=edKey(it,answerKeys);
    const plabel = type==='translation'?'Věta k překladu':(type==='error correction'?'Věta s chybou':(type==='word formation'?'Věta (___ a výchozí slovo)':(type==='fill-in-the-blank'?'Věta s mezerou ___':'Zadání')));
    h+=edRow(plabel, edTextarea(pk,ei,ii,edGetVal(it,promptKeys),''));
    h+=edRow('Správná odpověď', edInput(ak,ei,ii,edGetVal(it,answerKeys),'',' ed-correct'));
    h+=edAltBlock(it,ei,ii,'Přijatelné alternativy');
  } else if(type==='multi-select'){
    const qk=edKey(it,['question','prompt']);
    h+=edRow('Otázka', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt']),'Znění otázky'));
    h+=edMultiOptionsBlock(it,ei,ii);
  } else if(type==='ordering'){
    const qk=edKey(it,['question','prompt']);
    h+=edRow('Otázka / zadání', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt']),'Co má student seřadit'));
    h+=edOrderBlock(it,ei,ii);
  } else if(type==='highlight-evidence'){
    const qk=edKey(it,['question','prompt']);
    h+=edRow('Otázka / zadání', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt']),'Co hledá student jako důkaz'));
    h+=edEvidenceBlock(it,ei,ii);
  } else if(type==='categorisation-board'){
    const qk=edKey(it,['question','prompt']);
    h+=edRow('Otázka / zadání', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt']),'Co má student roztřídit'));
    h+=edBoardBlock(it,ei,ii);
  } else {
    const qk=edKey(it,['question','prompt','sentence','text']), ak=edKey(it,['answer','model_answer']);
    h+=edRow('Zadání', edTextarea(qk,ei,ii,edGetVal(it,['question','prompt','sentence','text']),''));
    h+=edRow('Odpověď', edInput(ak,ei,ii,edGetVal(it,['answer','model_answer']),'',' ed-correct'));
    h+=edAltBlock(it,ei,ii,'Přijatelné alternativy');
  }
  h+=edRow('Vysvětlení (nepovinné)', edInput('explanation',ei,ii,edGetVal(it,['explanation']),'Krátké vysvětlení správné odpovědi'));
  h+='</div>';
  return h;
}

function edOptionsBlock(it,ei,ii){
  if(!Array.isArray(it.options)) it.options=[];
  const ci=resolveCorrectIndex(it);
  let h='<div class="ed-f"><label class="ed-lbl">Možnosti <span class="ed-hint">(zaškrtni správnou)</span></label><div class="ed-opts">';
  it.options.forEach((o,oi)=>{
    h+='<div class="ed-opt"><input type="radio" name="opt_'+ei+'_'+ii+'" '+(oi===ci?'checked':'')+' onclick="edSetCorrect('+ei+','+ii+','+oi+')">'+
       '<input class="ed-in" value="'+H(o==null?'':o)+'" oninput="edSetOption('+ei+','+ii+','+oi+',this.value)">'+
       (it.options.length>2?'<button class="ed-del sm" onclick="edDelOption('+ei+','+ii+','+oi+')" title="Smazat možnost">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddOption('+ei+','+ii+')">+ Možnost</button></div>';
  return h;
}
function edAltBlock(it,ei,ii,label){
  if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
  let h='<div class="ed-f"><label class="ed-lbl lbl-alt">'+H(label)+' <span class="ed-hint">(uznané navíc ke správné odpovědi)</span></label>'+
    '<div class="ed-alt-legend"><span><span class="swatch ok"></span>zeleně = oficiální správná odpověď</span><span><span class="swatch alt"></span>oranžově = uznávané alternativy</span></div>'+
    '<div class="ed-alts">';
  it.alt_answers.forEach((a,ai)=>{ h+='<div class="ed-alt"><input class="ed-in" value="'+H(a==null?'':a)+'" oninput="edSetAlt('+ei+','+ii+','+ai+',this.value)" placeholder="další uznaná odpověď"><button class="ed-del sm" onclick="edDelAlt('+ei+','+ii+','+ai+')" title="Smazat">✕</button></div>'; });
  h+='</div><button class="ed-add sm" onclick="edAddAlt('+ei+','+ii+')">+ Alternativa</button></div>';
  return h;
}
function edClozeBlock(it,ei,ii){
  if(!Array.isArray(it.answers)) it.answers=[];
  if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
  let h='<div class="ed-f"><label class="ed-lbl">Odpovědi do mezer <span class="ed-hint">(pořadí = pořadí ___)</span></label><div class="ed-cloze">';
  it.answers.forEach((a,bi)=>{
    const alts=Array.isArray(it.alt_answers[bi])?it.alt_answers[bi]:[];
    h+='<div class="ed-blank"><div class="ed-blank-row"><span class="ed-blank-n">'+(bi+1)+'.</span>'+
       '<input class="ed-in" value="'+H(a==null?'':a)+'" oninput="edSetClozeAnswer('+ei+','+ii+','+bi+',this.value)">'+
       (it.answers.length>1?'<button class="ed-del sm" onclick="edDelClozeBlank('+ei+','+ii+','+bi+')">✕</button>':'')+'</div><div class="ed-alts ed-sub">';
    alts.forEach((al,ai)=>{ h+='<div class="ed-alt"><input class="ed-in sm" value="'+H(al==null?'':al)+'" oninput="edSetClozeAlt('+ei+','+ii+','+bi+','+ai+',this.value)" placeholder="alternativa"><button class="ed-del sm" onclick="edDelClozeAlt('+ei+','+ii+','+bi+','+ai+')">✕</button></div>'; });
    h+='<button class="ed-add sm" onclick="edAddClozeAlt('+ei+','+ii+','+bi+')">+ alt</button></div></div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddClozeBlank('+ei+','+ii+')">+ Mezera</button></div>';
  return h;
}
function edCatBlock(it,ei,ii){
  if(!Array.isArray(it.categories)) it.categories=[];
  const cur=it.correct_category||it.category||it.answer||'';
  let h='<div class="ed-f"><label class="ed-lbl">Kategorie <span class="ed-hint">(zaškrtni správnou)</span></label><div class="ed-opts">';
  it.categories.forEach((c,ci)=>{
    h+='<div class="ed-opt"><input type="radio" name="cat_'+ei+'_'+ii+'" '+((c===cur && c!=='')?'checked':'')+' onclick="edSetCatCorrect('+ei+','+ii+','+ci+')">'+
       '<input class="ed-in" value="'+H(c==null?'':c)+'" oninput="edSetCatLabel('+ei+','+ii+','+ci+',this.value)">'+
       (it.categories.length>2?'<button class="ed-del sm" onclick="edDelCat('+ei+','+ii+','+ci+')">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddCat('+ei+','+ii+')">+ Kategorie</button></div>';
  return h;
}
function edWordsBlock(it,ei,ii){
  if(!Array.isArray(it.words)) it.words=[];
  let h='<div class="ed-words">';
  it.words.forEach((w,wi)=>{ h+='<div class="ed-word"><input class="ed-in sm" value="'+H(w==null?'':w)+'" oninput="edSetWord('+ei+','+ii+','+wi+',this.value)"><button class="ed-del sm" onclick="edDelWord('+ei+','+ii+','+wi+')">✕</button></div>'; });
  h+='</div><button class="ed-add sm" onclick="edAddWord('+ei+','+ii+')">+ Slovo</button>';
  return h;
}

function edSetTitle(ei,val){ const ex=edExercises()[ei]; if(ex) ex.title=val; }
function edSetField(ei,ii,key,val){ const ex=edExercises()[ei]; const it=ex&&ex.items?ex.items[ii]:null; if(it) it[key]=val; }
function edSetOption(ei,ii,oi,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.options)) it.options[oi]=val; }
function edSetCorrect(ei,ii,oi){ const it=edExercises()[ei].items[ii]; if(it) it.correct=oi; }
function edAddOption(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ if(!Array.isArray(it.options))it.options=[]; it.options.push(''); renderEditor(); } }
function edDelOption(ei,ii,oi){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.options)&&it.options.length>2){ let ci=resolveCorrectIndex(it); it.options.splice(oi,1); ci = ci===oi?0:(ci>oi?ci-1:ci); it.correct=Math.max(0,ci); renderEditor(); } }
function edMultiOptionsBlock(it,ei,ii){
  if(!Array.isArray(it.options)) it.options=[];
  if(!Array.isArray(it.correct)){ const n=Number(it.correct); it.correct = (it.correct!=null && !isNaN(n)) ? [n] : []; }
  const cor={}; it.correct.forEach(ix=>{cor[Number(ix)]=1;});
  let h='<div class="ed-f"><label class="ed-lbl">Možnosti <span class="ed-hint">(zaškrtni VŠECHNY správné)</span></label><div class="ed-opts">';
  it.options.forEach((o,oi)=>{
    h+='<div class="ed-opt"><input type="checkbox" '+(cor[oi]?'checked':'')+' onclick="edToggleMultiCorrect('+ei+','+ii+','+oi+')">'+
       '<input class="ed-in" value="'+H(o==null?'':o)+'" oninput="edSetOption('+ei+','+ii+','+oi+',this.value)">'+
       (it.options.length>2?'<button class="ed-del sm" onclick="edMultiDelOption('+ei+','+ii+','+oi+')" title="Smazat možnost">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddOption('+ei+','+ii+')">+ Možnost</button></div>';
  return h;
}
function edToggleMultiCorrect(ei,ii,oi){ const it=edExercises()[ei].items[ii]; if(!it)return; if(!Array.isArray(it.correct))it.correct=[]; const arr=it.correct.map(Number); const p=arr.indexOf(oi); if(p>=0)arr.splice(p,1); else arr.push(oi); it.correct=Array.from(new Set(arr)).sort((a,b)=>a-b); }
function edMultiDelOption(ei,ii,oi){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.options)&&it.options.length>2){ it.options.splice(oi,1); if(!Array.isArray(it.correct))it.correct=[]; it.correct=it.correct.map(Number).filter(n=>n!==oi).map(n=>n>oi?n-1:n); renderEditor(); } }
function edOrderBlock(it,ei,ii){
  if(!Array.isArray(it.items)) it.items=[];
  const n=it.items.length;
  if(!Array.isArray(it.correct_order) || it.correct_order.length!==n) it.correct_order=it.items.map((_,i)=>i);
  const posOf={}; it.correct_order.forEach((origIdx,pos)=>{ posOf[Number(origIdx)]=pos+1; });
  let h='<div class="ed-f"><label class="ed-lbl">Položky k seřazení <span class="ed-hint">(text + správná pozice 1–'+n+')</span></label><div class="ed-opts">';
  it.items.forEach((o,oi)=>{
    h+='<div class="ed-opt"><input class="ed-in" value="'+H(o==null?'':o)+'" oninput="edSetOrderItem('+ei+','+ii+','+oi+',this.value)" placeholder="Položka">'+
       '<input class="ed-in" type="number" min="1" max="'+n+'" value="'+(posOf[oi]||'')+'" oninput="edSetOrderPos('+ei+','+ii+','+oi+',this.value)" title="Správná pozice" style="max-width:72px">'+
       (n>2?'<button class="ed-del sm" onclick="edDelOrderItem('+ei+','+ii+','+oi+')" title="Smazat položku">✕</button>':'')+'</div>';
  });
  const seqTxt=it.correct_order.map(ix=>{const tt=it.items[Number(ix)];return tt!=null?String(tt):('#'+ix);}).join(' → ');
  h+='</div><button class="ed-add sm" onclick="edAddOrderItem('+ei+','+ii+')">+ Položka</button><div class="ed-hint" style="margin-top:6px">Správné pořadí: '+H(seqTxt)+'</div></div>';
  return h;
}
function edEvidenceBlock(it,ei,ii){
  if(!Array.isArray(it.sentences)) it.sentences=[];
  const ci=Number(it.correct)||0;
  let h='<div class="ed-f"><label class="ed-lbl">Věty <span class="ed-hint">(zaškrtni správnou)</span></label><div class="ed-opts">';
  it.sentences.forEach((s,si)=>{
    h+='<div class="ed-opt"><input type="radio" name="ev_'+ei+'_'+ii+'" '+(si===ci?'checked':'')+' onclick="edSetEvidenceCorrect('+ei+','+ii+','+si+')">'+
       '<input class="ed-in" value="'+H(s==null?'':s)+'" oninput="edSetEvidenceSentence('+ei+','+ii+','+si+',this.value)" placeholder="Věta '+( si+1)+'">'+
       (it.sentences.length>2?'<button class="ed-del sm" onclick="edDelEvidenceSentence('+ei+','+ii+','+si+')" title="Smazat větu">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddEvidenceSentence('+ei+','+ii+')">+ Věta</button></div>';
  return h;
}
function edSetEvidenceCorrect(ei,ii,si){ const it=edExercises()[ei].items[ii]; if(it) it.correct=si; }
function edSetEvidenceSentence(ei,ii,si,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.sentences)) it.sentences[si]=val; }
function edAddEvidenceSentence(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ if(!Array.isArray(it.sentences))it.sentences=[]; it.sentences.push(''); renderEditor(); } }
function edDelEvidenceSentence(ei,ii,si){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.sentences)&&it.sentences.length>2){ const wasCorrect=(it.correct===si); it.sentences.splice(si,1); if(wasCorrect)it.correct=0; else if(Number(it.correct)>si)it.correct=Number(it.correct)-1; renderEditor(); } }

function edSetOrderItem(ei,ii,oi,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.items)) it.items[oi]=val; }
function edSetOrderPos(ei,ii,oi,val){ const it=edExercises()[ei].items[ii]; if(!it||!Array.isArray(it.items))return; const n=it.items.length; let p=parseInt(val,10); if(isNaN(p))return; p=Math.max(1,Math.min(n,p)); let order=Array.isArray(it.correct_order)?it.correct_order.map(Number).filter(x=>x>=0&&x<n):[]; order=order.filter(x=>x!==oi); order.splice(p-1,0,oi); for(let k=0;k<n;k++){ if(order.indexOf(k)<0) order.push(k); } it.correct_order=order.slice(0,n); renderEditor(); }
function edAddOrderItem(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ if(!Array.isArray(it.items))it.items=[]; it.items.push(''); if(!Array.isArray(it.correct_order))it.correct_order=[]; it.correct_order.push(it.items.length-1); renderEditor(); } }
function edDelOrderItem(ei,ii,oi){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.items)&&it.items.length>2){ it.items.splice(oi,1); if(!Array.isArray(it.correct_order))it.correct_order=[]; it.correct_order=it.correct_order.map(Number).filter(x=>x!==oi).map(x=>x>oi?x-1:x); renderEditor(); } }
function edBoardBlock(it,ei,ii){
  if(!Array.isArray(it.categories)) it.categories=[];
  if(!Array.isArray(it.entries)) it.entries=[];
  let h='<div class="ed-f"><label class="ed-lbl">Kategorie <span class="ed-hint">(koše pro třídění)</span></label><div class="ed-opts">';
  it.categories.forEach((c,ci)=>{
    h+='<div class="ed-opt"><input class="ed-in" value="'+H(c==null?'':c)+'" oninput="edSetBoardCat('+ei+','+ii+','+ci+',this.value)" placeholder="Kategorie">'+
       (it.categories.length>2?'<button class="ed-del sm" onclick="edDelBoardCat('+ei+','+ii+','+ci+')" title="Smazat kategorii">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddBoardCat('+ei+','+ii+')">+ Kategorie</button></div>';
  h+='<div class="ed-f"><label class="ed-lbl">Položky <span class="ed-hint">(text + správná kategorie)</span></label><div class="ed-opts">';
  it.entries.forEach((e,en)=>{
    const curCat=e&&e.category!=null?String(e.category):'';
    h+='<div class="ed-opt"><input class="ed-in" value="'+H(e&&e.text!=null?e.text:'')+'" oninput="edSetBoardEntryText('+ei+','+ii+','+en+',this.value)" placeholder="Položka">'+
       '<select class="ed-in" onchange="edSetBoardEntryCat('+ei+','+ii+','+en+',this.value)"><option value="">— kategorie —</option>'+
       it.categories.map(c=>'<option value="'+H(c)+'"'+(String(c)===curCat?' selected':'')+'>'+H(c)+'</option>').join('')+'</select>'+
       (it.entries.length>2?'<button class="ed-del sm" onclick="edDelBoardEntry('+ei+','+ii+','+en+')" title="Smazat položku">✕</button>':'')+'</div>';
  });
  h+='</div><button class="ed-add sm" onclick="edAddBoardEntry('+ei+','+ii+')">+ Položka</button></div>';
  return h;
}
function edSetBoardCat(ei,ii,ci,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.categories)){ const old=it.categories[ci]; it.categories[ci]=val; if(Array.isArray(it.entries))it.entries.forEach(e=>{ if(e&&e.category===old)e.category=val; }); renderEditor(); } }
function edAddBoardCat(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ if(!Array.isArray(it.categories))it.categories=[]; it.categories.push(''); renderEditor(); } }
function edDelBoardCat(ei,ii,ci){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.categories)&&it.categories.length>2){ it.categories.splice(ci,1); renderEditor(); } }
function edSetBoardEntryText(ei,ii,en,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.entries)&&it.entries[en])it.entries[en].text=val; }
function edSetBoardEntryCat(ei,ii,en,val){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.entries)&&it.entries[en])it.entries[en].category=val; }
function edAddBoardEntry(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ if(!Array.isArray(it.entries))it.entries=[]; it.entries.push({text:'',category:''}); renderEditor(); } }
function edDelBoardEntry(ei,ii,en){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.entries)&&it.entries.length>2){ it.entries.splice(en,1); renderEditor(); } }
function edAlts(it){ if(!Array.isArray(it.alt_answers)) it.alt_answers=[]; return it.alt_answers; }
function edSetAlt(ei,ii,ai,val){ const it=edExercises()[ei].items[ii]; if(it) edAlts(it)[ai]=val; }
function edAddAlt(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ edAlts(it).push(''); renderEditor(); } }
function edDelAlt(ei,ii,ai){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.alt_answers)){ it.alt_answers.splice(ai,1); renderEditor(); } }
function edSetTF(ei,ii,val){ const it=edExercises()[ei].items[ii]; if(it) it.correct=!!val; }
function edClozeAnswers(it){ if(!Array.isArray(it.answers)) it.answers=[]; return it.answers; }
function edSetClozeAnswer(ei,ii,bi,val){ const it=edExercises()[ei].items[ii]; if(it) edClozeAnswers(it)[bi]=val; }
function edAddClozeBlank(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ edClozeAnswers(it).push(''); if(!Array.isArray(it.alt_answers))it.alt_answers=[]; it.alt_answers.push([]); renderEditor(); } }
function edDelClozeBlank(ei,ii,bi){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.answers)&&it.answers.length>1){ it.answers.splice(bi,1); if(Array.isArray(it.alt_answers)) it.alt_answers.splice(bi,1); renderEditor(); } }
function edClozeAlts(it,bi){ if(!Array.isArray(it.alt_answers)) it.alt_answers=[]; if(!Array.isArray(it.alt_answers[bi])) it.alt_answers[bi]=[]; return it.alt_answers[bi]; }
function edSetClozeAlt(ei,ii,bi,ai,val){ const it=edExercises()[ei].items[ii]; if(it) edClozeAlts(it,bi)[ai]=val; }
function edAddClozeAlt(ei,ii,bi){ const it=edExercises()[ei].items[ii]; if(it){ edClozeAlts(it,bi).push(''); renderEditor(); } }
function edDelClozeAlt(ei,ii,bi,ai){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.alt_answers)&&Array.isArray(it.alt_answers[bi])){ it.alt_answers[bi].splice(ai,1); renderEditor(); } }
function edCats(it){ if(!Array.isArray(it.categories)) it.categories=[]; return it.categories; }
function edSetCatCorrect(ei,ii,ci){ const it=edExercises()[ei].items[ii]; const cats=edCats(it); it.correct_category=cats[ci]==null?'':cats[ci]; }
function edSetCatLabel(ei,ii,ci,val){ const it=edExercises()[ei].items[ii]; const cats=edCats(it); const cur=it.correct_category||it.category||it.answer; const wasCorrect=(cur===cats[ci]); cats[ci]=val; if(wasCorrect) it.correct_category=val; }
function edAddCat(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ edCats(it).push(''); renderEditor(); } }
function edDelCat(ei,ii,ci){ const it=edExercises()[ei].items[ii]; const cats=edCats(it); if(cats.length>2){ const wasCorrect=(it.correct_category===cats[ci]); cats.splice(ci,1); if(wasCorrect) it.correct_category=cats[0]||''; renderEditor(); } }
function edWords(it){ if(!Array.isArray(it.words)) it.words=[]; return it.words; }
function edSetWord(ei,ii,wi,val){ const it=edExercises()[ei].items[ii]; if(it) edWords(it)[wi]=val; }
function edAddWord(ei,ii){ const it=edExercises()[ei].items[ii]; if(it){ edWords(it).push(''); renderEditor(); } }
function edDelWord(ei,ii,wi){ const it=edExercises()[ei].items[ii]; if(it&&Array.isArray(it.words)&&it.words.length>1){ it.words.splice(wi,1); renderEditor(); } }

function edBlankItem(type){
  if(ED_CHOICE.includes(type)) return {question:'',options:['','',''],correct:0,explanation:''};
  if(type==='matching') return {left:'',right:'',explanation:''};
  if(type==='true/false') return {statement:'',correct:true,explanation:''};
  if(type==='cloze text') return {text:'___',answers:[''],alt_answers:[[]],explanation:''};
  if(type==='categorization') return {text:'',categories:['',''],correct_category:'',explanation:''};
  if(type==='word order') return {words:[''],correct_sentence:'',alt_answers:[],explanation:''};
  if(type==='fill-in-the-blank') return {sentence:'___',answer:'',alt_answers:[],explanation:''};
  if(type==='error correction') return {sentence:'',correction:'',alt_answers:[],explanation:''};
  if(type==='translation') return {prompt:'',answer:'',alt_answers:[],explanation:''};
  if(type==='sentence transformation') return {prompt:'',answer:'',alt_answers:[],explanation:''};
  if(type==='word formation') return {sentence:'___',answer:'',alt_answers:[],explanation:''};
  return {question:'',answer:'',alt_answers:[],explanation:''};
}
function edAddItem(ei){ if(edIsDiff()) return; const ex=edExercises()[ei]; if(!ex) return; if(!Array.isArray(ex.items)) ex.items=[]; ex.items.push(edBlankItem(normalizeType(ex.type||''))); renderEditor(); }
function edDelItem(ei,ii){ if(edIsDiff()) return; const ex=edExercises()[ei]; if(ex&&Array.isArray(ex.items)&&ex.items.length>1){ ex.items.splice(ii,1); renderEditor(); } }

async function applyEditorChanges(){
  const er=$('editorError'); if(er){ er.classList.add('hidden'); er.textContent=''; }
  if(!ED.genData) return;
  const btn=$('btnEditorApply'); if(btn) btn.disabled=true;
  const prevDetail=state.exerciseDetail, prevCfg=JSON.parse(JSON.stringify(state.exerciseConfig||[])), prevPocet=state.pocet;
  try{
    const edited = JSON.parse(JSON.stringify(ED.genData));
    if(!edIsDiff()){
      const exs=Array.isArray(edited.exercises)?edited.exercises:[];
      const specs0=buildExerciseSpecs(state);
      const countsChanged = exs.length!==specs0.length || exs.some((ex,i)=> (Array.isArray(ex.items)?ex.items.length:0) !== (specs0[i]?specs0[i].count:-1) );
      if(countsChanged){
        state.exerciseDetail=true;
        state.pocet=exs.length;
        state.exerciseConfig=exs.map(ex=>({ typ: normalizeType(ex.type||''), pocetOtazek: (Array.isArray(ex.items)?ex.items.length:1), body: Math.max(1, Math.round(exerciseTotalPoints(ex))|| (Array.isArray(ex.items)?ex.items.length:1)) }));
      }
    }
    let built;
    try{ built=await assembleTestHtml(state, edited); }
    catch(e){ state.exerciseDetail=prevDetail; state.exerciseConfig=prevCfg; state.pocet=prevPocet; throw e; }
    if (built && typeof built === 'object' && built.mode === 'secureOffline') {
      validateSecurePackageSmoke(built);
      generatedPackage=built; generatedTestHtml='';
    } else {
      const html=String(built||'');
      validateGeneratedHtmlSmoke(html);
      generatedTestHtml=html; generatedPackage=null;
    }
    lastGenData = edited;
    exportChecklist = {};
    // Po úpravě otázek/odpovědí je předchozí self-test i ověření klíče neplatné —
    // shodí se gating, aby se před stažením musel self-test spustit znovu. Klíč se mohl
    // právě opravit, takže staré AI rozdíly i jejich potvrzení zahazujeme úplně.
    lastSelfTest = null; secureGapsAcknowledged = false; resetKeyCheckState();
    resetVerificationReports();
    setGenUI('done');
    renderQualityDiagnostics();
    renderExportChecklist(true);
    const t=$('genResultTitle'); if(t) t.textContent='✅ Změny uložené — test přesestaven. Zkontroluj ho v náhledu.';
    closeTestEditor();
  }catch(e){
    if(er){ er.textContent='⚠️ '+(e&&e.message?e.message:String(e)); er.classList.remove('hidden'); er.scrollIntoView({block:'nearest'}); }
  }finally{ if(btn) btn.disabled=false; }
}

// ═══ Rozšíření přijatelných odpovědí (alt_answers) ═════════════════════════════
const ENRICH_TEXT_TYPES = ['fill-in-the-blank','error correction','word order','translation','sentence transformation','word formation','cloze text'];
const EN_CONTRACTIONS = [
  ['do not',"don't"],['does not',"doesn't"],['did not',"didn't"],['is not',"isn't"],['are not',"aren't"],
  ['was not',"wasn't"],['were not',"weren't"],['have not',"haven't"],['has not',"hasn't"],['had not',"hadn't"],
  ['will not',"won't"],['would not',"wouldn't"],['can not',"can't"],['cannot',"can't"],['could not',"couldn't"],
  ['should not',"shouldn't"],['must not',"mustn't"],['need not',"needn't"],['i am',"i'm"],['you are',"you're"],
  ['we are',"we're"],['they are',"they're"],['he is',"he's"],['she is',"she's"],['it is',"it's"],['that is',"that's"],
  ['there is',"there's"],['who is',"who's"],['what is',"what's"],['i have',"i've"],['you have',"you've"],
  ['we have',"we've"],['they have',"they've"],['i will',"i'll"],['you will',"you'll"],['we will',"we'll"],
  ['they will',"they'll"],['he will',"he'll"],['she will',"she'll"],['i would',"i'd"],['you would',"you'd"],
  ['let us',"let's"]
];
function enNorm(s){return String(s==null?'':s).toLowerCase().normalize('NFC').replace(/[.!?,;:"'()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();}
function enStripDia(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function enLang(){ return state.jazyk||'angličtina'; }
function enIsEnglish(){ const s=String(enLang()).toLowerCase(); return s.includes('anglič')||s.includes('english')||s.includes('inglés'); }

function enContractVariants(ans){
  if(!enIsEnglish()) return [];
  const base=String(ans||''); if(!base.trim()) return [];
  const out=[];
  // plně stažené
  let contracted=base;
  EN_CONTRACTIONS.forEach(([lng,shrt])=>{ contracted=contracted.replace(new RegExp('\\b'+lng.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','gi'), shrt); });
  if(enNorm(contracted)!==enNorm(base)) out.push(contracted);
  // plně rozepsané
  let expanded=base;
  EN_CONTRACTIONS.forEach(([lng,shrt])=>{ expanded=expanded.replace(new RegExp(shrt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), lng); });
  if(enNorm(expanded)!==enNorm(base)) out.push(expanded);
  return out;
}
function enDeterministicAlts(correct){
  const out=[];
  const c=String(correct||'');
  if(!c.trim()) return out;
  // tvar bez diakritiky — NE u španělštiny (tam je půlbodové pravidlo záměrné)
  if(!isSpanishLike(enLang())){ const nd=enStripDia(c); if(enNorm(nd)!==enNorm(c)) out.push(nd); }
  enContractVariants(c).forEach(v=>out.push(v));
  return out;
}
function enMergeAlts(existing, correct, candidates, cap){
  const arr=Array.isArray(existing)?existing.slice():[];
  const seen=new Set(arr.map(enNorm)); seen.add(enNorm(correct));
  let added=0;
  candidates.forEach(cand=>{
    const v=String(cand==null?'':cand).trim();
    if(!v) return;
    const k=enNorm(v);
    if(!k || seen.has(k)) return;
    if(arr.length>=(cap||10)) return;
    arr.push(v); seen.add(k); added++;
  });
  return {arr, added};
}

// Posbírá text-položky napříč variantami; vrací ploché refs s id pro AI i zpětné mapování
function enCollectFlat(gd){
  const flat=[];
  const pushVariant=(exs)=>{
    (exs||[]).forEach((ex,ei)=>{
      const type=normalizeType(ex.type||'');
      if(!ENRICH_TEXT_TYPES.includes(type)) return;
      (ex.items||[]).forEach((it,ii)=>{
        if(type==='cloze text'){
          const ans=Array.isArray(it.answers)?it.answers:[];
          ans.forEach((a,bi)=>{ flat.push({exs,ei,ii,bi,type,prompt:String(it.text||it.passage||''),correct:String(a==null?'':a)}); });
        } else {
          const corr = it.answer||it.correction||it.correct_sentence||it.translation||it.model_answer||'';
          flat.push({exs,ei,ii,bi:-1,type,prompt:String(it.question||it.prompt||it.sentence||it.source||''),correct:String(corr)});
        }
      });
    });
  };
  if(Array.isArray(gd.exercises)) pushVariant(gd.exercises);
  if(gd.group_variants && typeof gd.group_variants==='object'){
    Object.keys(gd.group_variants).forEach(k=>{ let v=gd.group_variants[k]; if(Array.isArray(v)) v={exercises:v}; pushVariant(v&&v.exercises); });
  }
  return flat;
}
function enApplyAlts(ref, candidates){
  const it=ref.exs[ref.ei] && ref.exs[ref.ei].items ? ref.exs[ref.ei].items[ref.ii] : null;
  if(!it) return 0;
  if(ref.bi>=0){
    if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
    while(it.alt_answers.length<=ref.bi) it.alt_answers.push([]);
    if(!Array.isArray(it.alt_answers[ref.bi])) it.alt_answers[ref.bi]=[];
    const r=enMergeAlts(it.alt_answers[ref.bi], ref.correct, candidates, 8);
    it.alt_answers[ref.bi]=r.arr; return r.added;
  } else {
    if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
    const r=enMergeAlts(it.alt_answers, ref.correct, candidates, 10);
    it.alt_answers=r.arr; return r.added;
  }
}

function enBuildPrompt(flat){
  const lang=enLang();
  const list=flat.map((r,i)=>({id:i,type:r.type,context:r.prompt.slice(0,160),correct:r.correct}));
  return 'You expand the list of ACCEPTABLE answers for an auto-graded '+lang+' language test.\n'+
  'For each item, return additional answers that a fair teacher would mark FULLY correct as equivalents of the given correct answer.\n'+
  'Include where applicable: exact synonyms, British/American spelling variants, contractions/expansions, and equivalent phrasings.\n'+
  'STRICT RULES:\n'+
  '- Only fully equivalent answers. NEVER include partially correct, near-miss, broader or narrower answers.\n'+
  '- Do NOT repeat the given correct answer. Do NOT add explanations.\n'+
  '- Keep each alternative short, max 5 per item, often 0 if none truly fit.\n'+
  '- Answers must be in '+lang+'.\n'+
  'Return ONLY valid JSON, no markdown, in this exact shape: {"items":[{"id":0,"alts":["...","..."]}]}\n\n'+
  'ITEMS:\n'+JSON.stringify(list);
}

async function enrichAltAnswers(){
  if(!lastGenData){ await uiAlert('Nejdřív vygeneruj test, pak rozšiřuj odpovědi.'); return; }
  const btn=$('btnEnrich'); const orig=btn?btn.textContent:'';
  const work=JSON.parse(JSON.stringify(lastGenData));
  const flat=enCollectFlat(work);
  if(!flat.length){ await uiAlert('Tenhle test nemá žádná cvičení s textovou odpovědí (rozšiřovat lze fill-in, překlad, transformace, slovotvorbu, slovosled, error correction a cloze).'); return; }

  let detAdded=0;
  flat.forEach(r=>{ detAdded += enApplyAlts(r, enDeterministicAlts(r.correct)); });

  let aiAdded=0, aiFailed=false, aiMsg='';
  if(geminiApiKey){
    if(btn){ btn.disabled=true; btn.textContent='✨ Generuji alternativy…'; }
    try{
      const data=await callGeminiJSON(enBuildPrompt(flat), [], {});
      const items=(data&&Array.isArray(data.items))?data.items:[];
      const byId={}; items.forEach(o=>{ if(o&&typeof o.id==='number'&&Array.isArray(o.alts)) byId[o.id]=o.alts; });
      flat.forEach((r,i)=>{ if(byId[i]) aiAdded += enApplyAlts(r, byId[i]); });
    }catch(e){ aiFailed=true; aiMsg=(e&&e.message?e.message:String(e)); }
    finally{ if(btn){ btn.disabled=false; btn.textContent=orig; } }
  } else {
    aiMsg='Gemini klíč není nastaven — proběhlo jen deterministické rozšíření (bez diakritiky / stažené tvary).';
  }

  const total=detAdded+aiAdded;
  let banner='✨ Rozšíření přijatelných odpovědí — přidáno '+total+' alternativ'+
    ' (deterministicky '+detAdded+(geminiApiKey&&!aiFailed?', AI '+aiAdded:'')+'). '+
    'Zkontroluj je a smaž případné nesprávné — pak ulož a přesestav.';
  if(aiFailed) banner+=' ⚠️ AI rozšíření selhalo: '+aiMsg+' Deterministická část proběhla.';
  else if(!geminiApiKey) banner+=' '+aiMsg;

  openEditorFromData(work, banner);
}



