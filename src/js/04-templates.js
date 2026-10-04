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
      desc:'Student po odevzdání hned vidí výsledek, správné řešení a vysvětlení chyb.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'learning', fuzzyTolerance:'mild', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    fl_standard: {
      icon:'✅', label:'Běžný test', purpose:'běžné ověření znalostí',
      desc:'Student po odevzdání hned vidí body, procenta a známku; zpětná vazba zůstává stručná.',
      locks:{ testMode:'bezny', resultMode:'instant', feedbackMode:'brief', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    fl_strict: {
      icon:'🔒', label:'Ostrý test pod dohledem', purpose:'ostrý test pod dohledem',
      desc:'Student nevidí okamžitou známku. Opuštění testu uzamkne pokus a výsledek zpracuje učitel ve verifieru.',
      locks:{ testMode:'prisny', resultMode:'secureOffline', feedbackMode:'none', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    }
  },
  cs: {
    cs_practice: {
      icon:'✍️', label:'Procvičení pravopisu / mluvnice', purpose:'procvičení pravopisu a mluvnice',
      desc:'Student po odevzdání hned vidí výsledek, správné řešení a vysvětlení chyb.',
      locks:{ testMode:'procviceci', resultMode:'instant', feedbackMode:'learning', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    cs_standard: {
      icon:'✅', label:'Běžný test', purpose:'běžné ověření znalostí',
      desc:'Student po odevzdání hned vidí body, procenta a známku; zpětná vazba zůstává stručná.',
      locks:{ testMode:'bezny', resultMode:'instant', feedbackMode:'brief', fuzzyTolerance:'off', differentiationLevel:'standard', gradeTyp:'skola' }
    },
    cs_strict: {
      icon:'🔒', label:'Ostrý test pod dohledem', purpose:'ostrý test pod dohledem',
      desc:'Student nevidí okamžitou známku. Opuštění testu uzamkne pokus a výsledek zpracuje učitel ve verifieru.',
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
// Historické mapy zachováváme kvůli kompatibilitě starších snapshotů a pomocných
// funkcí. Od 7.1.47 ale společný účel testu v pokročilém režimu nic nezamyká —
// pouze předvyplní doporučené technické hodnoty.
const TEMPLATE_LOCK_FIELD_MAP = {
  testMode:'testModeBtns', resultMode:'resultModeBtns', feedbackMode:'feedbackModeBtns',
  fuzzyTolerance:'fuzzyBtns', differentiationLevel:'diffLevelBtns', gradeTyp:'gradeOptions', screenGuard:'screenGuardBtns'
};
function templateLockActive(){ return false; }
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
// typy a čas zůstávají na učiteli; počet cvičení se odvozuje 1:1 od zvolených typů. V jednoduchém režimu se volby šablony
// skryjí, v pokročilém zůstanou viditelné a editovatelné. Staré wrappery choosePreset/
// applyPreset/clearPreset byly odstraněny v 6.11.70 (nic je nevolalo).
// ═══ PROFILY ÚČELU TESTU — aktivní obslužné funkce ═══════════════════════════
// UI používá tři společné účely přes chooseSimplePurpose(). Staré interní ID se
// migrují při načtení uloženého stavu v normalizeLoadedState().
function clearSimpleTemplate(){
  const wasSimple = isSimpleMode();
  state.simpleTemplate = '';
  // Karta „Bez šablony“ v jednoduchém režimu výslovně znamená ruční nastavení,
  // proto skutečně přepne do pokročilého režimu. V pokročilém pouze odepne šablonu.
  if (wasSimple) {
    state.appMode = 'advanced';
    state.workPreset = 'advanced';
    try { uiToast('Přepnuto do pokročilého režimu. Aktuální hodnoty zůstaly zachované a můžeš je ručně upravit.', 'ok', 4200); } catch(_){}
  }
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
  renderSimpleTemplates();
}
// Vykreslí karty jednoduchých šablon podle aktuálního jazyka. Volá se při změně
// jazyka i při výběru šablony (kvůli zvýraznění aktivní karty).
function getSimplePurposeKey(){
  const id = String(state.simpleTemplate || '');
  if (/strict/.test(id)) return 'strict';
  if (/practice|homework|cs_text/.test(id)) return 'practice';
  if (/standard|graded_quick/.test(id)) return 'standard';
  if (state.testMode === 'prisny') return 'strict';
  if (state.testMode === 'procviceci') return 'practice';
  return 'standard';
}
function simplePurposeTemplateId(key){
  const cs = String(state.jazyk || '').toLowerCase() === 'čeština';
  if (key === 'practice') return cs ? 'cs_practice' : 'fl_practice';
  if (key === 'strict') return cs ? 'cs_strict' : 'fl_strict';
  return cs ? 'cs_standard' : 'fl_standard';
}
function chooseSimplePurpose(key){
  const id = simplePurposeTemplateId(key);
  const t = simpleTemplateById(id);
  if (!t) return;
  state.simpleTemplate = id;
  state.testPurpose = t.purpose || '';
  applyTemplateValues(id);
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
  renderSimpleTemplates();
  const labels = {practice:'Procvičování', standard:'Běžný test', strict:'Přísný test'};
  const tail = isSimpleMode()
    ? ' Technické volby nastavil Generátor automaticky.'
    : ' Výchozí technické volby byly předvyplněny; další nastavení můžeš upravit níže.';
  try { uiToast('Účel nastaven: ' + (labels[key] || key) + '.' + tail, 'ok', 4200); } catch(_){}
}
function renderSimpleTemplates(){
  const wrap = $('simpleTemplateBtns');
  if (!wrap) return;
  const active = getSimplePurposeKey();
  const cards = [
    {key:'practice', icon:'💬', title:'Procvičování', desc:'Výsledek hned. Student u chyb vidí správné řešení a vysvětlení; vhodné pro nácvik a opakování.', badge:'Výsledek + vysvětlení'},
    {key:'standard', icon:'✅', title:'Běžný test', desc:'Výsledek hned. Student vidí body, procenta a známku; zpětná vazba je stručná, bez učícího rozboru.', badge:'Body + známka hned'},
    {key:'strict', icon:'🔒', title:'Přísný test', desc:'Bez okamžité známky. Opuštění testu pokus uzamkne; výsledek zpracuje učitel ve verifieru.', badge:'Zámek + verifier'}
  ];
  let html = '';
  cards.forEach(function(c){
    const isActive = active === c.key;
    html += '<button type="button" class="tag-btn preset-card simple-purpose-card' + (isActive?' active':'') + '" '
      + 'data-purpose="' + c.key + '" onclick="chooseSimplePurpose(\'' + c.key + '\')">'
      + '<span class="preset-card-top"><span class="preset-card-emoji">' + c.icon + '</span>'
      + '<span class="preset-card-text"><span class="preset-card-title">' + esc(c.title) + '</span>'
      + '<span class="preset-card-desc">' + esc(c.desc) + '</span></span></span>'
      + '<span class="preset-card-mode ' + (c.key === 'strict' ? 'strict' : (c.key === 'practice' ? 'instant' : 'flex')) + '">' + esc(c.badge) + '</span>'
      + '</button>';
  });
  if (isSimpleMode()) {
    html += '<button type="button" class="simple-advanced-link" onclick="setAppMode(\'advanced\')">⚙️ Přepnout do pokročilého nastavení</button>';
  } else {
    html += '<div class="purpose-profile-note">ℹ️ Účel testu je společný pro oba režimy. V pokročilém režimu předvyplní bezpečné výchozí hodnoty; podrobnosti upravíš v dalších sekcích.</div>';
  }
  wrap.innerHTML = html;
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
    note.innerHTML = '🛡️ <strong>Bezpečný offline režim:</strong> student po odevzdání nevidí známku ani zpětnou vazbu — předá šifrovaný výsledek přes nastavený Google Form nebo answers.txt a o úrovni zpětné vazby rozhoduješ ty až při opravě ve verifieru (volba „úroveň feedbacku"). Tato volba se proto na studentský test neprojeví.';
    return;
  }
  note.innerHTML = FEEDBACK_MODE_NOTE[fm] || '';
}
// ── BOD 7: Úroveň diferenciace (míra podpory / náročnost) ─────────────────────
const DIFF_LEVEL_NOTE = {
  basic:'🤝 <strong>Základní podpora:</strong> stejné učivo, CEFR, typy cvičení, počty položek i body; uvnitř této stejné struktury jsou jasnější instrukce, více podpůrného kontextu a méně záludné distraktory. <strong>Odstraňují se bariéry, nemění se rozsah ani měřená látka.</strong>',
  standard:'⚖️ <strong>Standard:</strong> běžná verze pro většinu třídy — standardní délka i bodování.',
  challenge:'🚀 <strong>Challenge:</strong> stejné učivo, CEFR, typy cvičení, počty položek i body; uvnitř této stejné struktury jsou bližší distraktory, méně scaffoldingu, více inference a syntakticky bohatší formulace. <strong>Náročnější je hloubka zpracování, ne jiné učivo ani jiná struktura testu.</strong>'
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

// ── Měřič délky zdroje + transparentní long-document workflow ────────────────
// Učitel vidí, zda jde do AI celý text, nebo reprezentativní průřez napříč
// dlouhým dokumentem. Už nenabízíme zavádějící volbu „začátek / konec".
function csNum(n){ try{ return Number(n).toLocaleString('cs-CZ'); }catch(_){ return String(n); } }
function joinedFileCharsForAI(){
  const emb=fileObjects.filter(f=>f&&f.textContent&&(f.embedStatus==='embedded'||f.embedStatus==='embedded-partial'));
  if(!emb.length) return 0;
  return emb.map(f=>'['+(f.displayName||f.name)+']\n'+f.textContent).join('\n\n').length;
}
function fileSourceLocalLimitNote(){
  const partial=fileObjects.filter(f=>f&&f.embedStatus==='embedded-partial');
  if(!partial.length)return '';
  const names=partial.map(f=>esc(f.displayName||f.file?.name||'soubor')).join(', ');
  return '<div class="meter-warn" style="margin-top:7px"><strong>⚠️ Velmi rozsáhlý soubor:</strong> '
    +'u '+names+' byl dosažen lokální bezpečnostní limit načtení. Generátor zpracuje celý dostupný text, '
    +'ale část za tímto limitem není v prohlížeči načtena. Nic se nezahazuje potichu.</div>';
}
function sourceMeterHtml(total){
  const lim=MAX_SOURCE_CHARS_FOR_AI;
  if(total<=lim) return '<div class="meter-ok">✅ Do AI půjde celý dostupný text ('+csNum(total)+' znaků).</div>';
  return '<div class="meter-long"><strong>📚 Delší zdroj — zpracuje se automaticky po částech.</strong><br>'
    +'Generátor projde celý dostupný text ('+csNum(total)+' znaků), rozdělí ho na překrývající se části '
    +'a do jednoho AI požadavku sestaví průřez do '+csNum(lim)+' znaků: tematicky relevantní pasáže '
    +'+ části rozprostřené od začátku do konce. Zdroj se už neřeže jen na začátek nebo konec.</div>';
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
    if(state.zadaniTab==='file' && f>0){
      fEl.classList.remove('hidden');
      fEl.innerHTML=sourceMeterHtml(f)+fileSourceLocalLimitNote();
    } else { fEl.classList.add('hidden'); fEl.innerHTML=''; }
  }
}

function toggleType(t) {
  const currentTypes = uniqueExerciseTypes(state.typyCviceni || []);
  const wasSelected = currentTypes.includes(normalizeType(t));
  if (!wasSelected && currentTypes.length >= 10) {
    try { uiToast('Jeden test může mít nejvýše 10 cvičení. Odeber některý typ nebo použij podrobné nastavení.', 'warn', 5000); } catch(_){}
    return;
  }

  // V běžném výběru platí 1 vybraný typ = 1 cvičení. Tím zůstává počet,
  // kartičky typů i skrytá detailní konfigurace vždy ve stejném stavu.
  state.typyCviceni = wasSelected
    ? currentTypes.filter(x => x !== normalizeType(t))
    : [...currentTypes, normalizeType(t)];
  syncExerciseConfigFromGlobalTypes();

  applyVisualState(); renderSmartTimeTip(); validate(); saveSnapshot();
  // Comprehension typy vyžadují další nastavení — když je učitel nově zaškrtne,
  // upozorni: doroluj na blok a krátce ho zvýrazni, ať si doladění nikdo nepřehlédne.
  if (!wasSelected && (normalizeType(t) === 'listening comprehension' || normalizeType(t) === 'reading comprehension')) {
    openComprehensionDialog(normalizeType(t));
  }
}

function flashCompBlock(id){ openComprehensionDialog(id === 'listeningBlock' ? 'listening comprehension' : 'reading comprehension'); }

function pickVariant(v) {
  // Varianta A vyžaduje okamžitý režim A současně alespoň stručnou zpětnou vazbu.
  // Jinak by se cvičení uzamklo bez informace, proč student uspěl/neuspěl.
  if ((state.resultMode || 'instant') === 'secureOffline' || state.feedbackMode === 'none') v = 'B';
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

