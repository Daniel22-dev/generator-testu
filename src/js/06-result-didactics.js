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
      const where = (state.sourceSliceMode==='end') ? 'konec' : 'začátek';
      add('warn','Zdroj byl delší než limit pro AI',`Do AI šlo jen ${csNum(MAX_SOURCE_CHARS_FOR_AI)} z ${csNum(srcChars)} znaků (${where}). Pozdější části materiálu se do testu nepromítly — zvaž přepnutí výřezu (začátek/konec) nad zdrojem, zkrácení textu, nebo rozdělení na víc testů.`);
      score -= 1;
    }
  }
  if (st.diferencovany === 'ANO') {
    const variantCount = sets.filter(s => s.label !== 'základní varianta').length;
    if (variantCount >= st.skupiny.length) add('ok','Diferenciace má varianty',`Nalezeno ${variantCount} variant pro ${st.skupiny.length} skupin.`);
    else { add('warn','Zkontroluj diferenciaci',`Nalezeno ${variantCount} variant, skupin je ${st.skupiny.length}.`); score -= 1; }
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
  renderDidacticReview();
}
// ── Didaktická kontrola po vygenerování (pravidlová, BOD 5–8 + 15) ─────────────
function analyzeDidactics(st, data){
  const sets = getAllGeneratedExerciseSets(data);
  const base = sets[0] ? sets[0].exercises : (data && Array.isArray(data.exercises) ? data.exercises : []);
  const fnAgg = { recognition:{pts:0,items:0}, controlled:{pts:0,items:0}, freer:{pts:0,items:0}, comprehension:{pts:0,items:0}, other:{pts:0,items:0} };
  let totalPts = 0, totalItems = 0;
  (base || []).forEach(ex => {
    const fn = pedagogyOf(exerciseType(ex));
    const items = exerciseItems(ex);
    items.forEach((it, i) => {
      const pts = stPointOf(ex, i);
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
  // Třetí pole `required` (jen u secure): true = blokující pro stažení, false = doporučující.
  // Smysl: self-test ověří, že stroj boduje konzistentně podle KLÍČE, ale jestli ten KLÍČ
  // sám obsahově sedí, musí potvrdit učitel. Tohle je obsahová vrstva nad technickou.
  return [
    ['zadani','Přečetl/a jsem zadání — je srozumitelné a odpovídá probírané látce. (Pomůže panel „🎯 Didaktická kontrola".)', secure],
    ['preview','Otevřel/a jsem náhled testu a zkusil/a aspoň první cvičení.', secure],
    ['answers','Prošel/a jsem všechny správné odpovědi a přijatelné varianty v editoru nebo teacher verifieru — AI může vyrobit krásný test s chybnou správnou odpovědí.', secure],
    ['grade','Ověřil/a jsem celkový počet bodů a bodování položek.', secure],
    ['scale','Zkontroloval/a jsem stupnici hodnocení (kdy je 1, kdy 5).', secure],
    ...(secure ? [
      ['aikey','Spustil/a jsem 🔑 AI ověření klíče (druhý nezávislý průchod) — doporučeno hlavně u prvního ostrého nasazení. Najde-li rozdíl u uzavřených úloh, vyřeším ho nebo vědomě potvrdím.', false]
    ] : []),
    ...((state.jazyk === 'čeština' && state.csModule && (state.csModule.correctionMode === 'semi' || state.csModule.correctionMode === 'manual' || state.csModule.domain === 'stylistika' || state.csModule.domain === 'literatura')) ? [
      ['csReview','ČJ: test obsahuje položky se schválením učitele (poloautomatické nebo ruční hodnocení). Prošel/a jsem navržené alternativy, schválil/a jsem, co se uznává, a vím, které položky hodnotím ručně.', secure]
    ] : []),
    ...((state.fuzzyTolerance==='mild'||state.fuzzyTolerance==='strict') ? [
      ['fuzzy', 'VĚDOMĚ jsem zapnul/a toleranci překlepů ('+(state.fuzzyTolerance==='mild'?'Mírná — překlep = 0,85 b':'Přísná — překlep = 0,5 b')+') a vím, že u psaných odpovědí se za drobný překlep přidávají body. U testu, kde hodnotím pravopis, má být Vypnuto.', secure]
    ] : []),
    ['security', secure ? 'Pro klasifikovaný test používám bezpečný offline režim a vím, že oprava proběhne ve verifieru.' : 'Vím, že okamžitá známka je hlavně pohodlný režim; u důležitější klasifikace bych měl/a zvážit bezpečný offline verifier.', false],
    ['submit', secure ? 'Vím, co mají studenti po dokončení poslat: zakódovaný answers.txt nebo záložní kód.' : 'Vím, co mají studenti po dokončení poslat: screenshot výsledku.', false],
    ...(secure ? [
      ['publish','Studentský test jsem zveřejnil/a jako HTTPS webový odkaz (např. GitHub Pages, Netlify nebo Tiiny.host), neposílám HTML jako přílohu.', false],
      ['onlyStudent','Studentům posílám POUZE student_test.html (resp. odkaz na něj). Učitelský verifier nikdy.', true],
      ['noVerifierShared','Ověřil/a jsem, že ve sdílené složce / odkazu pro studenty NENÍ soubor teacher_verifier.html (obsahuje správné odpovědi a soukromý klíč).', true]
    ] : [])
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
  const done = items.filter(([k]) => exportChecklist[k]).length;
  const ready = done === items.length;
  const reqCount = items.filter(it => it[2]).length;
  const reqDone = items.filter(it => it[2] && exportChecklist[it[0]]).length;
  const reqNote = reqCount ? `<div class="check-required-note">Položky označené <span class="check-req-tag">povinné</span> jsou potřeba zaškrtnout pro odemčení stažení klasifikovaného testu (${reqDone}/${reqCount}).</div>` : '';
  // Zaškrtnutí položky NESMÍ sbalit checklist. Nastavení innerHTML nemění atribut
  // `open` na elementu details, takže stav rozbalení zůstane zachovaný. Sbalíme jen tehdy,
  // když to volající výslovně chce (čerstvě vygenerovaný / přesestavený test).
  if (collapse) box.removeAttribute('open');
  box.innerHTML = `<summary><div class="check-title">✅ Checklist před stažením / odesláním studentům</div><div class="check-status ${ready?'ready':''}">${done}/${items.length} hotovo</div></summary>` +
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
      if (state.exerciseDetail && state.exerciseConfig.length) {
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


