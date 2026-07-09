// ═══ SDÍLENÉ ŠABLONY TESTU (jednoduchý i pokročilý režim) ═════════════════════
// Plochá, snadno auditovatelná struktura. Šablona nastaví hodnoty v `locks`:
//  • V JEDNODUCHÉM režimu se tyto volby skryjí (učitel je nevidí ani nemění).
//  • V POKROČILÉM režimu se předvyplní, ale zůstanou viditelné a editovatelné.
// Co v `locks` NENÍ, učitel vyplní vždy sám (látka, typy, počet, čas, body, CEFR).
// `purpose` = krátký pedagogický záměr do AI promptu. `desc` = popis do karty/detailu.
// Oddělené sady: FL = cizí jazyky (EN/ES/FR/LA), CS = čeština.
// POZOR: hodnoty musí být vzájemně kompatibilní (viz enforceModeConstraints).
const SIMPLE_TEMPLATES = {
  fl: {
    fl_practice: {
      icon:'⚡', label:'Procvičení (okamžitá známka)', purpose:'procvičení a upevnění látky',
      desc:'Učení za pochodu. Student vidí známku i vysvětlení hned po odevzdání.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'learning', fuzzyTolerance:'mild', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    fl_homework: {
      icon:'🏠', label:'Domácí procvičení', purpose:'samostatné domácí procvičení',
      desc:'Samostatná práce doma. Měkčí tolerance překlepů, učící zpětná vazba.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'learning', fuzzyTolerance:'mild', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    fl_graded_quick: {
      icon:'🧾', label:'Test na známku (jen screenshot)', purpose:'klasifikace (rychlá, bez verifieru)',
      desc:'Jednodušší klasifikace. Student dostane známku, skóre a screenshot hned — bez souboru a verifieru. Méně bezpečné, ale rychlé.',
      locks:{ testMode:'bezny', resultMode:'instant', feedbackMode:'brief', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola', screenGuard:true }
    },
    fl_strict: {
      icon:'🔒', label:'Ostrý test pod dohledem', purpose:'ostrý test pod dohledem',
      desc:'Kontrolované psaní. Opuštění testu uzamkne pokus; odemkne jen učitel.',
      locks:{ testMode:'prisny', resultMode:'secureOffline', feedbackMode:'none', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    }
  },
  cs: {
    cs_practice: {
      icon:'✍️', label:'Procvičení pravopisu / mluvnice', purpose:'procvičení pravopisu a mluvnice',
      desc:'Učení za pochodu. Automatické opravování, učící zpětná vazba s vysvětlením.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'learning', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    cs_text: {
      icon:'📖', label:'Práce s textem', purpose:'čtenářská gramotnost a porozumění textu',
      desc:'Čtenářská gramotnost a porozumění. Stručná zpětná vazba po odevzdání.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'brief', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    cs_strict: {
      icon:'🔒', label:'Ostrý test pod dohledem', purpose:'ostrý test pod dohledem',
      desc:'Kontrolované psaní. Opuštění testu uzamkne pokus; odemkne jen učitel.',
      locks:{ testMode:'prisny', resultMode:'secureOffline', feedbackMode:'none', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    }
  }
};
const SIMPLE_LOCK_LABELS = {
  testMode:      { bezny:'Běžný test', prisny:'Přísný test (zámek při opuštění)', procviceci:'Procvičovací režim' },
  resultMode:    { instant:'Okamžitá známka', secureOffline:'Bezpečný offline verifier' },
  feedbackMode:  { none:'Bez okamžité zpětné vazby', brief:'Stručná zpětná vazba', learning:'Učící zpětná vazba (vysvětlení)' },
  fuzzyTolerance:{ off:'Tolerance překlepů vypnutá (přesná shoda)', mild:'Mírná tolerance překlepů', strict:'Přísná tolerance překlepů' },
  differentiationLevel:{ basic:'Základní podpora', standard:'Standardní obtížnost', challenge:'Challenge (náročnější)' },
  gradeTyp:      { skola:'Školní známkování 1–5', vlastni:'Vlastní stupnice' }
};
const SIMPLE_LOCK_ORDER = ['testMode','resultMode','feedbackMode','fuzzyTolerance','differentiationLevel','gradeTyp'];
// Volby, které ŠABLONA plně řídí. Když je v pokročilém režimu aktivní jakákoli
// šablona, tyto volby jsou zamčené (zašedlé) a nejdou proklikat — bez ohledu na to,
// zda je konkrétní hodnota uvedená v `locks` (např. screenGuard u procvičení je
// implicitně OFF a stejně zamčený, aby nešlo zapnout hlídání u procvičovací šablony).
// Pro ruční úpravu musí učitel šablonu nejdřív odepnout („✖ Bez šablony").
const TEMPLATE_GOVERNED_KEYS = ['testMode','resultMode','feedbackMode','fuzzyTolerance','differentiationLevel','gradeTyp','screenGuard'];
const TEMPLATE_LOCK_FIELD_MAP = {
  testMode:'testModeBtns', resultMode:'resultModeBtns', feedbackMode:'feedbackModeBtns',
  fuzzyTolerance:'fuzzyBtns', differentiationLevel:'diffLevelBtns', gradeTyp:'gradeOptions', screenGuard:'screenGuardBtns'
};
// True, když je v pokročilém režimu aktivní šablona (= režim a bezpečnost jsou zamčené).
function templateLockActive(){ return !!state.simpleTemplate && !isSimpleMode(); }
function simpleTemplateSet(){
  return (String(state.jazyk||'').toLowerCase()==='čeština') ? SIMPLE_TEMPLATES.cs : SIMPLE_TEMPLATES.fl;
}
function simpleTemplateById(id){
  return (SIMPLE_TEMPLATES.fl[id]) || (SIMPLE_TEMPLATES.cs[id]) || null;
}
// Vrátí definici aktivní šablony (sjednoceno pro oba režimy) nebo null.
function activeTemplateDef(){
  return simpleTemplateById(state.simpleTemplate || '');
}

// ── BOD 6: Šablony testu — sjednocené napříč jednoduchým i pokročilým režimem ──
// Dřívější samostatné systémové presety (PEDAGOGICAL_PRESETS) byly nahrazeny jednou
// sdílenou sadou SIMPLE_TEMPLATES (viz výše). Šablona nastavuje jen režim/hodnocení;
// typy, počet a čas zůstávají vždy na učiteli. V jednoduchém režimu se volby šablony
// skryjí, v pokročilém zůstanou viditelné a editovatelné. Staré wrappery choosePreset/
// applyPreset/clearPreset byly odstraněny v 6.11.70 (nic je nevolalo).
// ═══ JEDNODUCHÉ ŠABLONY — výběr, zrušení, detail ══════════════════════════════
// Výběr jednoduché šablony: zapne zamčené hodnoty, ostatní nechá na učiteli.
// Druhý klik na stejnou šablonu otevře detail (co přesně zapíná). Klik na jinou
// přepne. Zamčené volby se v jednoduchém módu nezobrazují (renderSimpleTemplates).
function chooseSimpleTemplate(id){
  const t = simpleTemplateById(id);
  if (!t) return;
  if (state.simpleTemplate === id){ openSimpleTemplateDetail(id); return; }
  state.simpleTemplate = id;
  applyTemplateValues(id);          // zapíše hodnoty (funguje v obou režimech)
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
  renderSimpleTemplates();
  const msg = isSimpleMode()
    ? ('Šablona: ' + t.label + '. Režim a hodnocení jsou nastavené — doplň jen látku, typy a počet.')
    : ('Šablona: ' + t.label + '. Režim a bezpečnost jsou nastavené a zamčené (zašedlé). Doplň látku, typy a počet; pro ruční úpravu šablonu odepni.');
  uiToast(msg, 'ok', 4200);
}
function clearSimpleTemplate(){
  state.simpleTemplate = '';
  // V jednoduchém módu se vrátí výchozí nastavení (bezny/instant…). V pokročilém
  // necháme aktuální hodnoty být — uživatel je vidí a může s nimi dál pracovat.
  if (isSimpleMode()) applySimpleDefaults();
  applyVisualState(); validate(); saveSnapshot();
  renderSimpleTemplates();
}
// Sestaví výčet zamčených hodnot pro detail karty (lidsky čitelně).
function simpleTemplateLockList(t){
  const L = t.locks || {};
  const out = [];
  SIMPLE_LOCK_ORDER.forEach(function(k){
    if (!Object.prototype.hasOwnProperty.call(L,k)) return;
    const dict = SIMPLE_LOCK_LABELS[k]; if (!dict) return;
    const lab = dict[L[k]]; if (!lab) return;
    out.push(lab);
  });
  // Hlídání obrazovky (zámek při opuštění testu) — přidáme do výčtu, ať je viditelné.
  if (L.screenGuard) out.push('Hlídání obrazovky: zámek při opuštění testu (odemyká učitel)');
  // Přísný režim zamyká vždy ze své podstaty — u něj guard neuvádíme zvlášť.
  return out;
}
// Vykreslí karty jednoduchých šablon podle aktuálního jazyka. Volá se při změně
// jazyka i při výběru šablony (kvůli zvýraznění aktivní karty).
function renderSimpleTemplates(){
  const wrap = $('simpleTemplateBtns');
  if (!wrap) return;
  const set = simpleTemplateSet();
  const active = state.simpleTemplate || '';
  let html = '';
  for (const id in set){
    if (!Object.prototype.hasOwnProperty.call(set,id)) continue;
    const t = set[id];
    const isActive = (active === id);
    html += '<button type="button" class="tag-btn preset-card simple-tpl-card' + (isActive?' active':'') + '" '
      + 'data-val="' + id + '" onclick="chooseSimpleTemplate(\'' + id + '\')">'
      + '<span class="preset-card-top"><span class="preset-card-emoji">' + t.icon + '</span>'
      + '<span class="preset-card-text"><span class="preset-card-title">' + esc(t.label) + '</span>'
      + '<span class="preset-card-desc">' + esc(t.desc) + '</span></span></span>'
      + '<span class="simple-tpl-detaillink">' + (isActive ? 'Klikni znovu pro detail ▸' : (isSimpleMode() ? 'Co šablona zapne ▸' : 'Detail ▸')) + '</span>'
      + '</button>';
  }
  // Karta „bez šablony" — popis závisí na režimu
  const clearDesc = isSimpleMode()
    ? 'Nastav si režim i hodnocení ručně (přepne do pokročilého režimu).'
    : 'Zruší označení šablony, tvoje ruční nastavení ale ponechá.';
  html += '<button type="button" class="tag-btn preset-card clear-card simple-tpl-card' + (active===''?' active':'') + '" '
    + 'data-val="" onclick="clearSimpleTemplate()">'
    + '<span class="preset-card-top"><span class="preset-card-text">'
    + '<span class="preset-card-title">✖ Bez šablony</span>'
    + '<span class="preset-card-desc">' + clearDesc + '</span>'
    + '</span></span></button>';
  wrap.innerHTML = html;
}
function openSimpleTemplateDetail(id){
  const t = simpleTemplateById(id);
  if (!t) return;
  const simple = isSimpleMode();
  const locks = simpleTemplateLockList(t);
  let body = '<div class="stpl-detail">';
  body += '<p class="stpl-detail-desc">' + esc(t.desc) + '</p>';
  body += '<div class="stpl-detail-h">' + (simple ? 'Tato šablona automaticky nastaví:' : 'Tato šablona nastaví a zamkne (pro úpravu šablonu odepni):') + '</div><ul class="stpl-detail-list">';
  locks.forEach(function(l){ body += '<li>' + esc(l) + '</li>'; });
  body += '</ul>';
  body += '<div class="stpl-detail-h">Doplníš sám:</div><ul class="stpl-detail-list stpl-detail-open">'
    + '<li>Látku / téma testu</li><li>Typy cvičení</li><li>Počet otázek</li><li>Čas a body</li>'
    + (String(state.jazyk||'').toLowerCase()==='čeština' ? '' : '<li>Úroveň CEFR</li>')
    + '</ul>';
  body += '<p class="stpl-detail-foot">' + (simple
      ? 'Tyto volby se v jednoduchém režimu neukazují, aby nešlo nic omylem rozladit. Chceš-li je měnit ručně, přepni nahoře na <strong>Pokročilý režim</strong>.'
      : 'V pokročilém režimu jsou tyto volby viditelné, ale <strong>zamčené (zašedlé)</strong> — šablona je řídí. Chceš-li je měnit, klikni na <strong>„✖ Bez šablony"</strong>; tím šablonu odepneš a vše se odemkne (tvoje aktuální hodnoty zůstanou).')
    + '</p>';
  body += '</div>';
  uiModal({ title: t.icon + ' ' + t.label, message: body, html:true, okText:'Rozumím', cancelText:null }).then(function(){});
}
// ── BOD 8: Režim zpětné vazby ─────────────────────────────────────────────────
const FEEDBACK_MODE_NOTE = {
  none:'🔒 <strong>Bez okamžité zpětné vazby:</strong> student vidí jen to, co určuje režim výsledků; u klasifikace doporučeno. Vhodné pro známkovaný test.',
  brief:'✓ <strong>Stručná:</strong> u okamžitého režimu student vidí správně/špatně, skóre a známku. Bez vysvětlení chyb.',
  learning:'🎓 <strong>Učící:</strong> u okamžitého režimu student vidí navíc vysvětlení a doporučení, co si zopakovat. Vhodné pro procvičování a formativní test. Vše offline, žádná AI v testu.'
};
function renderFeedbackModeNote(){
  const note = $('feedbackModeNote');
  if (!note) return;
  const fm = state.feedbackMode || 'brief';
  // V bezpečném offline režimu tato volba neřídí, co student uvidí (hned nevidí nic).
  // Dáme to najevo zřetelně hned nahoře, ne jen drobnou poznámkou za popisem.
  if ((state.resultMode || 'instant') === 'secureOffline') {
    note.innerHTML = '🛡️ <strong>Bezpečný offline režim:</strong> student po odevzdání nevidí známku ani zpětnou vazbu — odevzdá answers.txt a o úrovni zpětné vazby rozhoduješ ty až při opravě ve verifieru (volba „úroveň feedbacku"). Tato volba se proto na studentský test neprojeví.';
    return;
  }
  note.innerHTML = FEEDBACK_MODE_NOTE[fm] || '';
}
// ── BOD 7: Úroveň diferenciace (míra podpory / náročnost) ─────────────────────
const DIFF_LEVEL_NOTE = {
  basic:'🤝 <strong>Základní podpora:</strong> méně/kratší položky, jednodušší instrukce, více kontextu, méně distraktorů, volitelně delší čas. <strong>Cíl testu i měřená látka zůstávají stejné</strong> — odstraňují se bariéry, netestuje se jiné učivo.',
  standard:'⚖️ <strong>Standard:</strong> běžná verze pro většinu třídy — standardní délka i bodování.',
  challenge:'🚀 <strong>Challenge:</strong> náročnější distractory, méně nápovědy, vyšší podíl produkčních úloh, delší/komplexnější věty. <strong>Měřená látka je stejná jako u standardu</strong> — náročnější je forma zpracování, ne jiné učivo.'
};
function renderResultModeNote(){
  var note = $('resultModeNote');
  if (!note) return;
  var tm = state.testMode || 'bezny';
  if (tm === 'prisny') {
    note.innerHTML = '\u{1F512} <strong>P\u0159\u00edsn\u00fd test &rarr; bezpe\u010dn\u00fd verifier nastaven automaticky.</strong> Okam\u017eit\u00e1 zn\u00e1mka nen\u00ed v p\u0159\u00edsn\u00e9m testu dostupn\u00e1 &mdash; student neuvid\u00ed v\u00fdsledek a odevzd\u00e1 answers.txt.';
    note.style.display = '';
  } else if (tm === 'procviceci') {
    note.innerHTML = '\u{1F4AC} <strong>Procvi\u010dovac\u00ed m\u00f3d &rarr; okam\u017eit\u00e1 zn\u00e1mka nastavena automaticky.</strong> Bezpe\u010dn\u00fd verifier se u procvi\u010dovac\u00edho m\u00f3du nepou\u017e\u00edv\u00e1.';
    note.style.display = '';
  } else {
    note.innerHTML = '';
    note.style.display = 'none';
  }
}
function renderDiffLevelNote(){
  const note = $('diffLevelNote');
  if (!note) return;
  const dl = state.differentiationLevel || 'standard';
  let html = DIFF_LEVEL_NOTE[dl] || '';
  if (dl !== 'standard' && (state.resultMode || 'instant') === 'secureOffline') {
    html += '<br><span style="color:var(--t4)">⚠️ U klasifikovaného (bezpečného offline) testu musí být diferenciace pedagogicky obhajitelná: stejná měřená látka a srovnatelná stupnice, jinak hrozí nespravedlivé hodnocení.</span>';
  }
  note.innerHTML = html;
}

// ── Měřič délky zdroje + volba začátek/konec ─────────────────────────────────
// Učitel musí vidět, z čeho AI skutečně tvořila test. Když je zdroj delší než limit
// pro AI, hlásíme přesně „použito X / Y znaků" a nabídneme přepnutí výřezu.
function csNum(n){ try{ return Number(n).toLocaleString('cs-CZ'); }catch(_){ return String(n); } }
function joinedFileCharsForAI(){
  const emb=fileObjects.filter(f=>f&&f.textContent&&(f.embedStatus==='embedded'||f.embedStatus==='embedded-partial'));
  if(!emb.length) return 0;
  return emb.map(f=>'['+(f.displayName||f.name)+']\n'+f.textContent).join('\n\n').length;
}
function sliceToggleHtml(){
  const m=(state.sourceSliceMode==='end')?'end':'start';
  return '<div class="slice-toggle">Část pro AI:'
    +'<button type="button" class="slice-btn'+(m==='start'?' active':'')+'" onclick="pickSourceSlice(\'start\')">začátek</button>'
    +'<button type="button" class="slice-btn'+(m==='end'?' active':'')+'" onclick="pickSourceSlice(\'end\')">konec</button></div>';
}
function sourceMeterHtml(total){
  const lim=MAX_SOURCE_CHARS_FOR_AI;
  if(total<=lim) return '<div class="meter-ok">✅ Do AI půjde celý zdroj ('+csNum(total)+' znaků).</div>';
  const where=(state.sourceSliceMode==='end')?'konec':'začátek';
  return '<div class="meter-warn"><strong>⚠️ Zdroj je delší, než se vejde do AI.</strong><br>'
    +'Použito '+csNum(lim)+' / '+csNum(total)+' znaků ('+where+'). Zbytek ('+csNum(total-lim)+' znaků) se do Gemini neodešle '
    +'— test se tvoří jen z této části.</div>'+sliceToggleHtml();
}
function renderSourceMeters(){
  const tEl=$('textSourceMeter');
  if(tEl){
    const t=trim('zadaniText').length;
    if(state.zadaniTab==='text' && t>0){ tEl.classList.remove('hidden'); tEl.innerHTML=sourceMeterHtml(t); }
    else { tEl.classList.add('hidden'); tEl.innerHTML=''; }
  }
  const fEl=$('fileSourceMeter');
  if(fEl){
    const f=joinedFileCharsForAI();
    if(state.zadaniTab==='file' && f>0){ fEl.classList.remove('hidden'); fEl.innerHTML=sourceMeterHtml(f); }
    else { fEl.classList.add('hidden'); fEl.innerHTML=''; }
  }
}
function pickSourceSlice(v){ state.sourceSliceMode=(v==='end')?'end':'start'; renderSourceMeters(); saveSnapshot(); }

function toggleType(t) {
  const custom = trim('vlastniTyp');
  // Stav PŘED změnou: kolik různých typů a zda počet cvičení „seděl na podlaze"
  // (počet == počtu typů → počet byl řízený výběrem typů, ne ručně nastavený výš).
  const prevDistinct = new Set(sanitizeExerciseTypeList([...(state.typyCviceni||[]), ...(custom?[custom]:[])])).size;
  const wasFloorBound = (state.pocet||0) === prevDistinct;

  const wasSelected = state.typyCviceni.includes(t);
  state.typyCviceni = wasSelected
    ? state.typyCviceni.filter(x=>x!==t)
    : [...state.typyCviceni, t];
  // Počet cvičení musí být aspoň počet vybraných typů (každý typ se dostane do cvičení).
  // Když počet sledoval výběr typů (byl na podlaze), drž ho na nové podlaze v OBOU směrech —
  // po odebrání typu se tak počet sníží (dřív v něm zůstávalo staré vyšší číslo). Když měl
  // uživatel záměrně víc cvičení než typů (ruční volba tlačítkem), počet jen hlídáme zespodu
  // a nesnižujeme ho. Strop 10, minimum 1.
  const distinctTypes = new Set(sanitizeExerciseTypeList([...(state.typyCviceni||[]), ...(custom?[custom]:[])])).size;
  let newPocet = state.pocet || 0;
  if (wasFloorBound) newPocet = distinctTypes;
  else if (distinctTypes > newPocet) newPocet = distinctTypes;
  newPocet = Math.min(10, Math.max(1, newPocet));
  if (newPocet !== (state.pocet||0)) {
    state.pocet = newPocet;
    syncExerciseConfig();
    renderSmartTimeTip();
  }
  applyVisualState(); renderSmartTimeTip(); validate(); saveSnapshot();
  // Comprehension typy vyžadují další nastavení — když je učitel nově zaškrtne,
  // upozorni: doroluj na blok a krátce ho zvýrazni, ať si doladění nikdo nepřehlédne.
  if (!wasSelected && (t === 'listening comprehension' || t === 'reading comprehension')) {
    flashCompBlock(t === 'listening comprehension' ? 'listeningBlock' : 'readingBlock');
  }
}

function flashCompBlock(id){
  const el = document.getElementById(id);
  if (!el || el.classList.contains('hidden')) return;
  setTimeout(() => {
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.remove('comp-flash');
    void el.offsetWidth; // restart animace
    el.classList.add('comp-flash');
    setTimeout(() => el.classList.remove('comp-flash'), 3000);
  }, 60);
}

function pickVariant(v) {
  // Varianta A (průběžné odevzdávání) je kompatibilní jen s okamžitým režimem.
  // V bezpečném offline režimu studentský soubor nemá answer key, proto musí být celkové odevzdání.
  if ((state.resultMode || 'instant') === 'secureOffline') v = 'B';
  state.odevzdavani=v; applyVisualState(); validate(); saveSnapshot();
}

function pickGrade(v) {
  if (templateLockActive()) {
    const t = simpleTemplateById(state.simpleTemplate);
    try { uiToast('Typ stupnice určuje šablona „' + ((t&&t.label)||'') + '". Pro ruční úpravu klikni na „✖ Bez šablony".', 'warn', 4200); } catch(_){}
    return;
  }
  state.gradeTyp=v; applyVisualState(); validate(); saveSnapshot();
}

async function pickDiff(v) {
  // Při vypnutí diferenciace, pokud máme studenty se jmény, zeptáme se a vymažeme.
  if (v === 'NE' && state.skupiny.some(g => Array.isArray(g.studenti) && g.studenti.length > 0)) {
    const ok = await uiConfirm('Vypnutí diferenciace odstraní všechny skupiny a jména studentů z paměti prohlížeče. Pokračovat?', 'Vypnout diferenciaci?', true);
    if (!ok) return;
    state.skupiny = [];
  }
  state.diferencovany = v;
  if (v==='ANO' && !state.skupiny.length) { addGroupSilent(); addGroupSilent(); }
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
}

