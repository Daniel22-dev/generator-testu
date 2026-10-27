// ═══ Result ════════════════════════════════════════════════════════════════════

const QUALITY_SCORE_LABELS = { ok:'OK', warn:'Pozor', bad:'Riziko' };
let exportChecklist = {};
function getAllGeneratedExerciseSets(data){
  const sets = [];
  if (data && Array.isArray(data.exercises)) sets.push({ label:'základní varianta', exercises:data.exercises });
  const variants = data && data.group_variants;
  if (variants && typeof variants === 'object') {
    Object.keys(variants).forEach(k => {
      const v = variants[k];
      if (Array.isArray(v)) sets.push({ label:'varianta '+k, exercises:v });
      else if (v && Array.isArray(v.exercises)) sets.push({ label:'varianta '+k, exercises:v.exercises });
    });
  }
  return sets;
}
function exerciseType(ex){ return normalizeType(ex && (ex.type || ex.typ || ex.exercise_type || ex.kind || '')); }
function exerciseItems(ex){ return Array.isArray(ex && ex.items) ? ex.items : (Array.isArray(ex && ex.questions) ? ex.questions : []); }
function hasAltAnswers(it){ return Array.isArray(it && it.alt_answers) && it.alt_answers.flat ? it.alt_answers.flat(2).filter(Boolean).length > 0 : Array.isArray(it && it.accepted_answers) && it.accepted_answers.length > 0; }
function analyzeGeneratedTestQuality(st, data){
  const checks = [];
  const add = (level, title, detail) => checks.push({ level, title, detail });
  const sets = getAllGeneratedExerciseSets(data);
  const base = sets[0] ? sets[0].exercises : [];
  const exercises = base.length ? base : (data && Array.isArray(data.exercises) ? data.exercises : []);
  const allExercises = sets.length ? sets.flatMap(s => s.exercises || []) : exercises;
  const expected = Number(st.pocet || 0);
  const exCount = exercises.length;
  const itemCount = allExercises.reduce((sum, ex) => sum + exerciseItems(ex).length, 0);
  const types = allExercises.map(exerciseType).filter(Boolean);
  const uniqueTypes = Array.from(new Set(types));
  const mcItems = allExercises.flatMap(exerciseItems).filter(it => Array.isArray(it.options));
  const weakOptions = mcItems.filter(it => (it.options || []).filter(Boolean).length < 3).length;
  const textTypes = new Set(['fill-in-the-blank','translation','sentence transformation','word formation','error correction','cloze text']);
  const textItems = allExercises.flatMap(ex => exerciseItems(ex).map(it => ({ it, type: exerciseType(ex) }))).filter(x => textTypes.has(x.type));
  const noAlts = textItems.filter(x => !hasAltAnswers(x.it)).length;
  const missingExpl = allExercises.flatMap(exerciseItems).filter(it => !plainText(it.explanation || it.feedback || it.comment)).length;
  let score = 10;
  if (!data) { add('warn','Diagnostika zatím čeká na vygenerovaný test','Po vygenerování testu se zde zobrazí kontrola položek, typů cvičení, bodování a rizik.'); return { score:0, checks, sets, itemCount:0, uniqueTypes:[] }; }
  if (expected && exCount === expected) add('ok','Počet cvičení sedí',`V základní variantě je ${exCount} / ${expected} cvičení.`);
  else { add('bad','Počet cvičení nesedí',`V základní variantě je ${exCount}, očekáváno ${expected || 'neurčeno'}.`); score -= 2; }
  if (itemCount >= Math.max(6, expected * 3)) add('ok','Test má rozumný počet položek',`Celkem nalezeno ${itemCount} položek napříč variantami.`);
  else { add('warn','Test může být příliš krátký',`Nalezeno jen ${itemCount} položek. Zvaž víc položek nebo cvičení.`); score -= 1; }
  if (uniqueTypes.length >= Math.min(3, Math.max(1, expected))) add('ok','Typy cvičení jsou pestré',`Použité typy: ${uniqueTypes.join(', ') || 'nezjištěno'}.`);
  else { add('warn','Nízká pestrost cvičení',`Použité typy: ${uniqueTypes.join(', ') || 'nezjištěno'}. U vyšších úrovní je vhodné nekončit jen u jednoho typu.`); score -= 1; }
  if (weakOptions === 0) add('ok','Volby u uzavřených úloh vypadají použitelně','U položek s možnostmi nebyly nalezeny otázky s méně než 3 možnostmi.');
  else { add('bad','Některé multiple-choice položky mají málo možností',`${weakOptions} položek má méně než 3 možnosti.`); score -= 1.5; }
  if (textItems.length && noAlts > Math.ceil(textItems.length * 0.5)) { add('warn','Málo alternativních přijatelných odpovědí',`${noAlts}/${textItems.length} textových položek nemá variantní odpovědi. Použij „Rozšířit přijatelné odpovědi“ nebo editor.`); score -= 1; }
  else if (textItems.length) add('ok','Textové odpovědi mají aspoň částečně varianty','U produkčních položek jsou zohledněny přijatelné varianty odpovědí.');
  if (missingExpl > Math.ceil(Math.max(1,itemCount) * 0.6)) { add('warn','Slabší zpětná vazba',`${missingExpl} položek nemá krátké vysvětlení/feedback.`); score -= 0.75; }
  else add('ok','Feedback je většinově přítomen','Většina položek má vysvětlení nebo komentář.');
  if ((st.uroven || []).some(l => ['B2','C1','C2'].includes(l)) && uniqueTypes.length <= 1) { add('warn','Vyšší úroveň potřebuje víc než mechanické úlohy','Pro B2+ doporučuji kombinovat rozpoznávání, transformaci, práci s textem a přesnost odpovědi.'); score -= 1; }
  if (usesListeningComprehension() && !(state.fileNames.length || (state.urls || []).some(u=>String(u||'').trim()) || trim('listeningTranscript'))) { add('bad','Listening bez spolehlivého zdroje','Je zvolen listening, ale není vidět soubor, URL ani transkript.'); score -= 2; }
  {
    const srcChars = st.zadaniTab==='text' ? trim('zadaniText').length : (st.zadaniTab==='file' ? joinedFileCharsForAI() : 0);
    if (srcChars > MAX_SOURCE_CHARS_FOR_AI) {
      add('warn','Zdroj byl delší než kontext jednoho AI požadavku',`Generátor z ${csNum(srcChars)} znaků sestavil reprezentativní průřez do ${csNum(MAX_SOURCE_CHARS_FOR_AI)} znaků: tematicky relevantní pasáže a části rozprostřené napříč celým zdrojem. Nejde o prosté uříznutí začátku nebo konce; u velmi dlouhých materiálů přesto zvaž zúžení tématu nebo rozdělení na více testů.`);
      score -= 1;
    }
  }
  if (st.diferencovany === 'ANO') {
    const variantCount = sets.filter(s => s.label !== 'základní varianta').length;
    if (variantCount >= st.skupiny.length) add('ok','Diferenciace má varianty',`Nalezeno ${variantCount} variant pro ${st.skupiny.length} skupin.`);
    else { add('warn','Zkontroluj diferenciaci',`Nalezeno ${variantCount} variant, skupin je ${st.skupiny.length}.`); score -= 1; }
  }
  const fidelitySpecs = buildExerciseSpecs(st);
  const fidelityIssues = [];
  (sets.length ? sets : [{label:'základní varianta',exercises}]).forEach(set => {
    collectPedagogicalFidelityIssues(set.exercises || [], fidelitySpecs).forEach(issue => fidelityIssues.push(Object.assign({variant:set.label}, issue)));
  });
  if (!fidelityIssues.length) {
    add('ok','Pedagogické typy a kontexty jsou oddělené','Zvolený styl, bodovací typ a tematický podtitulek nejsou zaměněné; nebyla nalezena mezicvičební duplicita ani skrytý Reading kontext.');
  } else {
    fidelityIssues.forEach(issue => {
      const level=issue.level==='bad'?'bad':'warn';
      add(level,level==='bad'?'Neshoda pedagogického typu nebo kontextu':'Možná vysoká podobnost mezi cvičeními',`${issue.variant}: ${issue.detail}`);
      score -= level==='bad'?2:0.75;
    });
  }
  score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  return { score, checks, sets, itemCount, uniqueTypes };
}
function renderQualityDiagnostics(){
  const panel = $('qualityPanel'); if (!panel) return;
  const q = analyzeGeneratedTestQuality(state, lastGenData);
  panel.classList.remove('hidden');
  panel.removeAttribute('open');
  const verdict = q.score >= 8.5 ? 'výborné' : (q.score >= 7 ? 'dobré' : (q.score >= 5 ? 'potřebuje kontrolu' : 'rizikové'));
  panel.innerHTML = `<summary><div class="quality-title">🧪 Diagnostika kvality vygenerovaného testu</div><div class="quality-score">${q.score}/10 · ${esc(verdict)}</div></summary>` +
    `<div class="quality-list">${q.checks.map(c => `<div class="quality-item ${esc(c.level)}"><span>${c.level==='ok'?'✅':(c.level==='bad'?'❌':'⚠️')}</span><div><strong>${esc(c.title)}</strong><br>${esc(c.detail)}</div></div>`).join('')}</div>`;
  renderStartCode();
  renderDidacticReview();
}
let handoffLessonCodeRevealed=false;
function handoffLessonAllowed(){return !!(generatedPackage?.mode==='secureOffline'&&generatedPackage.startCode&&secureDownloadAllowed());}
function handoffLessonUrl(kind){
  if(!handoffLessonAllowed())return '';
  try{return normalizeGoogleFormsResponderUrl(generatedPackage[kind==='END'?'lessonEndUrl':'lessonStartUrl']||'');}catch(_){return '';}
}
function handoffLessonStatus(text,tone=''){const el=$('handoffLessonStatus');if(el){el.textContent=text;el.className='handoff-lesson-status '+tone;}}
function c29El(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function c29Button(text,fn,secondary=false){const el=c29El('button','handoff-lesson-button'+(secondary?' secondary':''),text);el.type='button';el.addEventListener('click',fn);return el;}
function selectHandoffText(el){if(!el)return false;try{const r=document.createRange(),s=getSelection();r.selectNodeContents(el);s.removeAllRanges();s.addRange(r);el.tabIndex=0;el.focus();return true;}catch(_){return false;}}
function toggleHandoffStartCode(button){
  if(!handoffLessonAllowed()){handoffLessonCodeRevealed=false;renderStartCode();return false;}
  const value=$('handoffStartCodeValue');if(!value)return false;
  handoffLessonCodeRevealed=!handoffLessonCodeRevealed;
  value.textContent=handoffLessonCodeRevealed?generatedPackage.startCode:'';
  value.classList.toggle('hidden',!handoffLessonCodeRevealed);
  if(button){button.textContent=handoffLessonCodeRevealed?'Skrýt kód':'Zobrazit kód';button.setAttribute('aria-expanded',String(handoffLessonCodeRevealed));}
  handoffLessonStatus(handoffLessonCodeRevealed?'Kód je zobrazen. Ukaž jej studentům až po skutečném odeslání formuláře START.':'Kód je znovu skrytý.','');
  return true;
}
async function copyHandoffStartCode(){
  if(!handoffLessonAllowed()){handoffLessonCodeRevealed=false;renderStartCode();return false;}
  const code=generatedPackage.startCode;if(!code)return false;
  try{await navigator.clipboard.writeText(code);handoffLessonStatus('Startovní kód byl zkopírován.','ok');return true;}
  catch(_){if(!handoffLessonCodeRevealed)toggleHandoffStartCode($('handoffStartCodeToggle'));selectHandoffText($('handoffStartCodeValue'));handoffLessonStatus('Kód je zobrazený a označený; zkopíruj jej ručně.','warn');return false;}
}
function openHandoffLesson(kind){
  const url=handoffLessonUrl(kind);if(!url){renderStartCode();return false;}
  let opened;try{opened=open(url,'_blank','noopener,noreferrer');if(opened)opened.opener=null;}catch(_){}
  handoffLessonStatus('Formulář '+(kind==='END'?'END':'START')+' byl otevřen. Časová kotva vznikne až po kliknutí na Odeslat a přijetí záznamu ve Forms/CSV.','');
  return !!opened;
}
async function copyHandoffLessonValue(kind){
  const url=handoffLessonUrl(kind);if(!url){renderStartCode();return false;}
  try{await navigator.clipboard.writeText(url);handoffLessonStatus(kind+' odkaz byl zkopírován.','ok');return true;}
  catch(_){const details=$('handoffLessonPhoneDetails');if(details)details.open=true;selectHandoffText($(kind==='END'?'handoffLessonEndValue':'handoffLessonStartValue'));handoffLessonStatus('Odkaz je rozbalený a označený; zkopíruj jej ručně.','warn');return false;}
}
function renderStartCode(){
  let box=$('privateStartCode');if(box)box.remove();
  handoffLessonCodeRevealed=false;
  if(!generatedPackage||generatedPackage.mode!=='secureOffline'||!generatedPackage.startCode)return;
  const mount=$('lessonHandoffSlot')||$('resultPanel4');if(!mount)return;
  const allowed=handoffLessonAllowed(),start=handoffLessonUrl('START'),end=handoffLessonUrl('END');
  box=c29El('section','handoff-lesson-card');box.id='privateStartCode';box.setAttribute('aria-labelledby','handoffLessonTitle');
  const head=c29El('div','handoff-lesson-head'),title=c29El('h4','', 'Zahájení a ukončení hodiny');title.id='handoffLessonTitle';head.append(title,c29El('span','handoff-lesson-badge',allowed?'Připraveno k předání':'Čeká na bezpečnostní kontroly'));box.append(head,c29El('p','handoff-lesson-intro','Nejdříve otevři START formulář pod školním účtem a skutečně klikni na Odeslat. Potom studentům ukaž startovní kód.'));
  if(!allowed){const el=c29El('div','handoff-lesson-locked','Startovní kód a odkazy se zpřístupní až po dokončení stejné bezpečnostní brány jako stažení klasifikovaného testu.');el.role='status';box.append(el);mount.append(box);return;}
  const codeBox=c29El('div','handoff-lesson-code'),value=c29El('output','handoff-lesson-code-value hidden',''),codeActions=c29El('div','handoff-lesson-code-actions'),reveal=c29Button('Zobrazit kód',()=>toggleHandoffStartCode(reveal),true);value.id='handoffStartCodeValue';value.setAttribute('aria-live','polite');reveal.id='handoffStartCodeToggle';reveal.setAttribute('aria-controls',value.id);reveal.setAttribute('aria-expanded','false');codeActions.append(reveal,c29Button('Kopírovat kód',copyHandoffStartCode,true));codeBox.append(c29El('strong','', 'Startovní kód pro studenty'),value,codeActions);box.append(codeBox);
  const actions=c29El('div','handoff-lesson-actions');
  for(const item of [{kind:'START',url:start,text:'Otevřít formulář START'},{kind:'END',url:end,text:'Otevřít formulář END'}]){
    const card=c29El('div','handoff-lesson-action');card.append(c29El('strong','',item.kind),c29El('p','', 'Předvyplněný formulář — je nutné jej odeslat.'));
    if(item.url){const link=c29El('a','handoff-lesson-button',item.text);link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.addEventListener('click',event=>{if(!handoffLessonUrl(item.kind)){event.preventDefault();renderStartCode();return;}handoffLessonStatus('Formulář '+item.kind+' byl otevřen. Časová kotva vznikne až po kliknutí na Odeslat a přijetí záznamu ve Forms/CSV.');});card.append(link);}
    else{const disabled=c29Button(item.text,()=>{});disabled.disabled=true;card.append(disabled,c29El('span','handoff-lesson-diagnostic',item.kind+' odkaz není dostupný nebo nemá bezpečný Google Forms formát.'));}actions.append(card);
  }
  box.append(actions,c29El('p','handoff-lesson-warning','Samotné otevření odkazu nic nezahajuje ani neukončuje. Záznam časové kotvy musí pocházet z přijatého formuláře/CSV.'));
  if(start||end){const details=c29El('details','handoff-lesson-phone');details.id='handoffLessonPhoneDetails';details.append(c29El('summary','', 'Odkazy pro telefon'));for(const item of [{kind:'START',url:start,id:'handoffLessonStartValue'},{kind:'END',url:end,id:'handoffLessonEndValue'}]){if(!item.url)continue;const row=c29El('div','handoff-lesson-phone-row'),url=c29El('code','handoff-lesson-url',item.url);url.id=item.id;row.append(c29El('strong','',item.kind),url,c29Button('Kopírovat '+item.kind+' odkaz',()=>copyHandoffLessonValue(item.kind),true));details.append(row);}box.append(details);}else box.append(c29El('p','handoff-lesson-diagnostic','Odkazy START/END nejsou dostupné. Zkontroluj bezpečné nastavení Google Forms; startovní kód lze přesto předat po dokončení kontrol.'));
  const status=c29El('div','handoff-lesson-status');status.id='handoffLessonStatus';status.role='status';status.setAttribute('aria-live','polite');box.append(status);mount.append(box);
}
// ── Didaktická kontrola po vygenerování (pravidlová, BOD 5–8 + 15) ─────────────
function analyzeDidactics(st, data){
  const sets = getAllGeneratedExerciseSets(data);
  const base = sets[0] ? sets[0].exercises : (data && Array.isArray(data.exercises) ? data.exercises : []);
  const fnAgg = { recognition:{pts:0,items:0}, controlled:{pts:0,items:0}, freer:{pts:0,items:0}, comprehension:{pts:0,items:0}, other:{pts:0,items:0} };
  let totalPts = 0, totalItems = 0;
  // Body ber ze sestaveného testu (stejné item_points jako ve studentském souboru).
  const assembledBase = (typeof lastAssembled !== 'undefined' && lastAssembled && lastAssembled.variants && data === lastGenData)
    ? (Object.values(lastAssembled.variants)[0] || null) : null;
  (base || []).forEach((ex, ei) => {
    const fn = pedagogyOf(exerciseType(ex));
    const items = exerciseItems(ex);
    const aex = assembledBase && assembledBase[ei];
    const src = aex && Array.isArray(aex.item_points) && aex.item_points.length === items.length ? aex : ex;
    items.forEach((it, i) => {
      const pts = stPointOf(src, i);
      fnAgg[fn].pts += pts; fnAgg[fn].items += 1;
      totalPts += pts; totalItems += 1;
    });
  });
  const pct = fn => totalPts > 0 ? Math.round(fnAgg[fn].pts / totalPts * 100) : 0;
  const ratios = { recognition:pct('recognition'), controlled:pct('controlled'), freer:pct('freer'), comprehension:pct('comprehension'), other:pct('other') };
  const productionPct = ratios.controlled + ratios.freer;
  const checks = [];
  const add = (level, text) => checks.push({ level, text });
  const purpose = (function(){ const t=simpleTemplateById(st.simpleTemplate||''); return (t&&t.purpose)||st.testPurpose||''; })();
  const isGraded = (st.resultMode || 'instant') === 'secureOffline';

  // Jednostrannost
  const dominant = Object.keys(ratios).filter(k=>k!=='other').sort((a,b)=>ratios[b]-ratios[a])[0];
  if (totalPts === 0) {
    add('warn','Zatím nelze spočítat poměr funkcí — test nemá bodované položky nebo se nenačetla data.');
  } else if (ratios[dominant] >= 70) {
    add('warn','Test je silně zaměřený na „'+PEDAGOGY_FN[dominant].label.toLowerCase()+'": '+ratios[dominant]+' % bodů. Zvaž vyváženější rozložení napříč funkcemi.');
  } else {
    add('ok','Rozložení pedagogických funkcí je přiměřeně vyvážené.');
  }
  // Bodování vs. náročnost / účel
  if (isGraded && productionPct < 25 && ratios.recognition >= 50) {
    add('warn','Klasifikovaný test je převážně rozpoznávací ('+ratios.recognition+' % bodů). Pro známkování doporučuji přidat aspoň jednu řízenou produkční úlohu (např. sentence transformation, translation nebo error correction).');
  }
  if ((purpose.indexOf('klasifik')>=0) && productionPct === 0 && totalPts>0) {
    add('warn','Cíl je klasifikace, ale test neobsahuje žádnou produkční úlohu — ověřuje jen pasivní znalost. Zvaž doplnění produkce.');
  }
  // Vhodnost podle ZV/režimu
  const fm = st.feedbackMode || 'brief';
  let suited;
  if (isGraded) suited = 'klasifikaci (bezpečný offline verifier, bez okamžité ZV studentovi)';
  else if (fm === 'learning') suited = 'procvičení / formativní ověření (učící zpětná vazba)';
  else suited = 'rychlé ověření nebo procvičení (okamžitá známka)';
  add('ok','Podle nastavení se test hodí spíš na: '+suited+'.');

  return { ratios, fnAgg, totalPts, totalItems, checks, purpose, isGraded };
}
function renderDidacticReview(){
  const panel = $('didacticPanel'); if (!panel) return;
  if (!lastGenData) { panel.classList.add('hidden'); panel.innerHTML=''; return; }
  const d = analyzeDidactics(state, lastGenData);
  state.didacticReview = { ratios:d.ratios, totalPts:d.totalPts, totalItems:d.totalItems };
  panel.classList.remove('hidden');
  panel.removeAttribute('open');
  const presetLbl = (function(){ const t=activeTemplateDef(); return (t&&t.label)||'bez šablony'; })();
  const ageLbl = ageGroupLabel() || 'neurčena';
  const rOrder = ['recognition','controlled','freer','comprehension'];
  const ratioRow = rOrder.filter(k=>d.ratios[k]>0).map(k=>PEDAGOGY_FN[k].label+' '+d.ratios[k]+' %').join(' · ') || '—';
  const head = [
    ['Účel / preset', presetLbl + (d.purpose? ' (' + d.purpose + ')' : '')],
    ['Věková skupina', ageLbl],
    ['Zpětná vazba', SIMPLE_LOCK_LABELS.feedbackMode[state.feedbackMode||'brief'] || (state.feedbackMode||'brief')],
    ['Diferenciace', SIMPLE_LOCK_LABELS.differentiationLevel[state.differentiationLevel||'standard'] || (state.differentiationLevel||'standard')],
    ['Poměr funkcí (podle bodů)', ratioRow]
  ];
  panel.innerHTML = '<summary><div class="quality-title">🎯 Didaktická kontrola</div><div class="quality-score">'+d.totalItems+' položek · '+d.totalPts+' b</div></summary>'
    + '<div class="quality-list">'
    + '<div class="quality-item ok"><span>🧭</span><div>'
      + head.map(r=>'<strong>'+esc(r[0])+':</strong> '+esc(r[1])).join('<br>')
    + '</div></div>'
    + d.checks.map(c=>'<div class="quality-item '+esc(c.level)+'"><span>'+(c.level==='ok'?'✅':(c.level==='bad'?'❌':'⚠️'))+'</span><div>'+esc(c.text)+'</div></div>').join('')
    + '<div class="quality-item"><span>ℹ️</span><div class="small" style="color:var(--t4)">Kontrola je pravidlová a orientační — upozorňuje na zjevnou nevyváženost, nenahrazuje pedagogický úsudek.</div></div>'
    + '</div>';
}
function exportChecklistItems(){
  const secure = !!(generatedPackage && generatedPackage.mode === 'secureOffline');
  // U okamžitého/cvičného testu checklist nic neblokuje a jen zahlcoval UI, proto se
  // vůbec nezobrazuje. U klasifikovaného secure testu ponecháváme pouze čtyři
  // skutečně důležité lidské kontroly. Technické věci hlídá self-test a SecretScanner.
  if (!secure) return [];
  return [
    ['content','Prošel/a jsem náhled a zadání odpovídá probírané látce.', true],
    ['answers','Prošel/a jsem správné odpovědi a přijatelné varianty (včetně ručně hodnocených položek a případné tolerance překlepů).', true],
    ['grading','Zkontroloval/a jsem bodování a klasifikační stupnici.', true],
    ['distribution','Studentům zpřístupním pouze student_test.html / jeho HTTPS odkaz; teacher_verifier.html zůstává jen učiteli.', true]
  ];
}
function toggleChecklistItem(key, checked){ exportChecklist[key] = !!checked; renderExportChecklist(); updateSecureDownloadGate(); }
function teacherReviewSatisfied(){
  const items = exportChecklistItems();
  return items.filter(it => it[2]).every(it => !!exportChecklist[it[0]]);
}
function renderExportChecklist(collapse){
  const box = $('exportChecklist'); if (!box) return;
  const items = exportChecklistItems();
  if (!items.length) {
    box.classList.add('hidden');
    box.removeAttribute('open');
    box.textContent = '';
    return;
  }
  box.classList.remove('hidden');
  const done = items.filter(([k]) => exportChecklist[k]).length;
  const ready = done === items.length;
  const reqCount = items.filter(it => it[2]).length;
  const reqDone = items.filter(it => it[2] && exportChecklist[it[0]]).length;
  const reqNote = reqCount ? `<div class="check-required-note">Položky označené <span class="check-req-tag">povinné</span> jsou potřeba zaškrtnout pro odemčení stažení klasifikovaného testu (${reqDone}/${reqCount}).</div>` : '';
  // Zaškrtnutí položky NESMÍ sbalit checklist. Překreslení obsahu nemění atribut
  // `open` na elementu details, takže stav rozbalení zůstane zachovaný. Sbalíme jen tehdy,
  // když to volající výslovně chce (čerstvě vygenerovaný / přesestavený test).
  if (collapse) box.toggleAttribute('open', !ready);
  box.innerHTML = `<summary><div class="check-title">✅ Krátká učitelská kontrola</div><div class="check-status ${ready?'ready':''}">${done}/${items.length} hotovo</div></summary>` +
    reqNote +
    `<div class="check-list">${items.map(([k,t,req]) => `<label class="check-item ${req?'check-item-req':''}"><input type="checkbox" ${exportChecklist[k]?'checked':''} onchange="toggleChecklistItem('${esc(k)}', this.checked)"><span>${esc(t)}${req?' <span class="check-req-tag" title="Povinné pro klasifikovaný test: stroj umí ověřit, že bodování počítá podle klíče správně, ale jestli klíč obsahově sedí, musí potvrdit učitel (AI může vyrobit hezký test s chybnou správnou odpovědí).">povinné</span>':''}</span></label>`).join('')}</div>`;
}
function renderResult() {
  if (state.zadaniTab === 'file' && areFileReadsPending()) {
    $('promptText').textContent = 'Načítám obsah textových příloh do promptu…';
    const warn = $('fileWarn');
    if (warn) { warn.classList.remove('hidden'); warn.innerHTML = '⏳ Načítám textové soubory. Prompt se obnoví automaticky.'; }
    Promise.allSettled(fileReadPromises).then(() => { if (currentStep === 4) renderResult(); });
    return;
  }
  const jazyk = state.jazyk;
  const jazykEmoji = {'angličtina':'🇬🇧','španělština':'🇪🇸','němčina':'🇩🇪','čeština':'🇨🇿'}[jazyk]||'🌍';
  const themeEmoji = {'modern':'🌈','examBlue':'🔵','dark':'🌙','nature':'🌿','akademicky':'📚','minimal':'⚪','pastel':'🌸','terakota':'🏺'}[state.tema]||'🎨';
  const prompt = buildPrompt();
  const stats = getPromptStats(prompt);

  const chips = [
    ['📘',trim('nazev')],['👥',trim('proKoho')],[jazykEmoji,jazyk],['🗣',getInstructionLanguageLabel()],
    ['🎯',cefrLabel()],['🧭',getTestModeLabel(state.testMode)],['🧩',getLayoutLabel()],['🔐',getResultModeLabel(state.resultMode)],['📱','Device-aware safe'],['⏱',state.cas+' min'],
    ['📝',state.pocet+' cv.'],
    ...((() => {
      if (hasConfiguredExercises(state) && state.exerciseConfig.length) {
        const sum = state.exerciseConfig.reduce((s,e)=>s+(e.body||0),0);
        return sum > 0 ? [['🏆', sum+' b']] : [];
      }
      return state.body > 0 ? [['🏆', state.body+' b']] : [];
    })()),
    [themeEmoji,THEME_SPECS[state.tema]?.nazev||state.tema],
    ...(state.randomizace==='ANO'?[['🔀','náh. pořadí']]:[]),
    ...(state.diferencovany==='ANO'?[['📊',state.skupiny.length+' skupiny']]:[]),
    ...(state.zolicek==='ANO'?[['🃏','žolík']]:[]),
    ...(state.overeni==='ANO'?[['🔐','ověření .txt']]:[]),
    [isSimpleMode() ? '⚡' : '🛠️', isSimpleMode() ? 'jednoduchý režim' : 'pokročilý režim'],
    [stats.warn ? '⚠️' : '📏', promptStatsLabel(prompt)],
  ];
  $('chips').innerHTML = chips.map(([i,v])=>`<div class="chip">${i} ${esc(v)}</div>`).join('');

  $('promptText').textContent = prompt;
  pushHistory(prompt);
  renderHistory();

  const warn = $('fileWarn');
  const hasFiles = state.zadaniTab==='file' && state.fileNames.length>0;
  if (hasFiles) {
    warn.classList.remove('hidden');
    warn.innerHTML = fileTransferWarningHtml();
    const externalCount = getExternalFileObjects().length;
    const embeddedCount = getEmbeddedTextObjects().length;
    $('tipBody').innerHTML = externalCount
      ? `1. Klikni „Kopírovat prompt"<br>2. Otevři Claude nebo ChatGPT<br>3. Vlož prompt a ručně přilož ${externalCount} soubor(ů), které nejsou v promptu`
      : `1. Klikni „Kopírovat prompt"<br>2. Otevři Claude nebo ChatGPT<br>3. Vlož prompt — obsah ${embeddedCount} textových souborů už je uvnitř`;
  } else {
    warn.classList.add('hidden');
    $('tipBody').innerHTML='1. Klikni „Kopírovat prompt"<br>2. Otevři Claude nebo ChatGPT<br>3. Vlož prompt a očekávej odkaz na .html soubor';
  }

  if (stats.warn) {
    const lenNote = `⚠️ Prompt je velmi dlouhý (${Math.round(stats.chars/100)/10}k znaků). Obvykle za to mohou vložené textové přílohy nebo dlouhé poznámky — to je v pořádku. Pokud přílohy nepoužíváš a délka přesto roste, něco se do promptu duplikuje.`;
    warn.classList.remove('hidden');
    warn.innerHTML = warn.innerHTML ? warn.innerHTML + '<br>' + lenNote : lenNote;
  }
}

// ═══ Copy ══════════════════════════════════════════════════════════════════════
function showCopied(btn) {
  btn.textContent = '✓ Zkopírováno!'; btn.classList.add('done');
  setTimeout(()=>{ btn.textContent='📋 Kopírovat prompt'; btn.classList.remove('done'); }, 3000);
}
function fallbackCopy(text) {
  const ta=document.createElement('textarea'); ta.value=text;
  ta.style.cssText='position:fixed;top:0;left:0;opacity:0;';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); showCopied($('copyBtn')); }
  catch(e){ uiAlert('Kopírování selhalo — označ text ručně (Ctrl+A) a stiskni Ctrl+C.'); }
  document.body.removeChild(ta);
}
function copyPrompt() {
  const text = $('promptText').textContent;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(()=>showCopied($('copyBtn'))).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
}
async function newTest() {
  const ok = await uiConfirm('Opravdu začít nový test? Aktuální data budou ztracena.', 'Začít nový test?', true);
  if (!ok) return;
  discardSaved();
}


// ═══ Accessibility helpers ═══════════════════════════════════════════════════
function enhanceA11y() {
  const progress = $('progressArea');
  if (progress) progress.setAttribute('aria-label', 'Postup sestavením testu');
  document.querySelectorAll('.tt-icon').forEach((btn, i) => {
    btn.setAttribute('type', 'button');
    // Konkrétní aria-label podle prvních ~50 znaků tipu, ne generický
    const tip = (btn.dataset.tip || '').replace(/\s+/g, ' ').trim();
    const short = tip.length > 60 ? tip.slice(0, 57) + '…' : tip;
    btn.setAttribute('aria-label', short ? 'Nápověda: ' + short : 'Zobrazit nápovědu');
    if (!btn.id) btn.id = 'tt_' + i;
  });
  document.querySelectorAll('button:not([type])').forEach(btn => btn.setAttribute('type', 'button'));
  document.querySelectorAll('.progress-seg, .prog-label').forEach((el, i) => {
    const stepName = STEP_LABELS[i % 4] || ('Krok ' + ((i % 4) + 1));
    el.setAttribute('aria-label', 'Krok ' + ((i % 4) + 1) + ': ' + stepName);
  });
}

// ═══ Fullscreen ════════════════════════════════════════════════════════════════
function toggleFullscreen() {
  const d=document, el=d.documentElement;
  const fs=d.fullscreenElement||d.webkitFullscreenElement||d.msFullscreenElement;
  if (!fs) (el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen||function(){}).call(el);
  else (d.exitFullscreen||d.webkitExitFullscreen||d.msExitFullscreen||function(){}).call(d);
}
['fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(evt=>
  document.addEventListener(evt,()=>{
    const fs=document.fullscreenElement||document.webkitFullscreenElement;
    const btn=$('btnFs'); if(btn){ btn.style.color=fs?'var(--acc)':''; btn.style.borderColor=fs?'var(--acc)':''; }
  })
);

// ═══ Init ══════════════════════════════════════════════════════════════════════


