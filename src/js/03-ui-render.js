// ═══ Visual state sync ════════════════════════════════════════════════════════
function applyVisualState() {
  // Tato funkce POUZE čte state a překresluje DOM.
  // Mutace stavu patří do enforceModeConstraints() nebo normalizeLoadedState().
  [['#jazykBtns',state.jazyk],['#instrJazykBtns',state.instrJazyk || 'target'],['#pocetBtns',String(state.pocet)],
   ['#randomBtns',state.randomizace],['#testModeBtns',state.testMode],['#layoutBtns',state.layout || 'tabs'],['#resultModeBtns',state.resultMode || 'instant'],['#identityModeBtns',state.identityMode||'name'],['#zolicekBtns',state.zolicek],
   ['#diffBtns',state.diferencovany],
   ['#diffLevelBtns',state.differentiationLevel || 'standard'],
   ['#feedbackModeBtns',state.feedbackMode || 'brief'],
   ['#anonBtns',state.anonymizace],['#fuzzyBtns',state.fuzzyTolerance || 'off']
  ].forEach(([sel,val]) => {
    document.querySelectorAll(sel+' .tag-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  });

  document.querySelectorAll('#typyBtns .tag-btn').forEach(b =>
    b.classList.toggle('active', state.typyCviceni.includes(b.dataset.val)));
  document.querySelectorAll('#ageGroupBtns .tag-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.val === state.ageGroup));
  setVal('ageGroupCustom', state.ageGroupCustom || '');
  renderAgeGroupNote();
  renderSimpleTemplates();
  // Filtr pedagogických funkcí je jen pokročilý; v jednoduchém režimu drž vše viditelné.
  if (isSimpleMode() && pedFilterActive !== 'all') filterPedagogy('all');
  document.querySelectorAll('#timeBtns .tag-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.val,10) === state.cas));
  document.querySelectorAll('#bodyBtns .tag-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.val,10) === state.body));
  document.querySelectorAll('.theme-card').forEach(c =>
    c.classList.toggle('active', c.dataset.theme === state.tema));

  setVal('casCustom', state.cas);
  updateAppModeUI();
  updateSecurityGuideUI();
  if (state.body) setVal('bodyCustom', state.body);

  const fuzzyNote = $('fuzzyNote');
  if (fuzzyNote) {
    const fm = state.fuzzyTolerance || 'off';
    fuzzyNote.innerHTML = fm === 'off'
      ? '🔒 <strong>Vypnuto:</strong> psaná odpověď musí přesně sednout (u španělštiny se toleruje jen diakritika). Pravopis se hodnotí. Doporučeno pro klasifikaci.'
      : (fm === 'mild'
        ? '≈ <strong>Mírná:</strong> drobný překlep (1 znak) u psané odpovědi dostane 0,85 bodu; gramaticky citlivé typy (oprava chyb, transformace, slovotvorba) jen 0,5. Zapnutí je viditelné a vědomé.'
        : '± <strong>Přísná:</strong> drobný překlep (1 znak) u psané odpovědi dostane jednotně 0,5 bodu u všech psaných typů. Zapnutí je viditelné a vědomé.');
  }
  $('varA').classList.toggle('active', state.odevzdavani === 'A');
  $('varB').classList.toggle('active', state.odevzdavani === 'B');
  renderFeedbackModeNote();
  renderResultModeNote();
  renderDiffLevelNote();
  $('varA').disabled = (state.resultMode || 'instant') === 'secureOffline';
  $('varA').title = $('varA').disabled ? 'V bezpečném offline režimu je dostupné pouze celkové odevzdání.' : '';
  $('groupBuilder').classList.toggle('hidden', state.diferencovany !== 'ANO');
  const instantResultBtn = document.querySelector('#resultModeBtns .tag-btn[data-val="instant"]');
  const secureResultBtn = document.querySelector('#resultModeBtns .tag-btn[data-val="secureOffline"]');
  if (instantResultBtn) {
    const strict = state.testMode === 'prisny';
    instantResultBtn.disabled = strict;
    instantResultBtn.title = strict ? 'V přísném testu nejde použít okamžitá známka. Použije se bezpečný offline verifier.' : '';
  }
  if (secureResultBtn) {
    secureResultBtn.title = state.testMode === 'prisny' ? 'V přísném testu je bezpečný offline verifier povinný.' : '';
  }
  // Režim zpětné vazby řídí, co student uvidí HNED. V bezpečném offline režimu student
  // hned nevidí nic (odevzdá answers.txt) a zpětnou vazbu sestaví učitel ve verifieru,
  // takže tato volba tam nemá okamžitý efekt — zašedneme ji, ať nevzniká falešné očekávání
  // („zvolil jsem Učící, ale student nic nevidí"). Logiku nepřepisujeme, jen vizuál + popisek.
  const fbOffline = (state.resultMode || 'instant') === 'secureOffline';
  const fbField = $('feedbackModeField');
  if (fbField) fbField.classList.toggle('feedback-mode-na', fbOffline);
  document.querySelectorAll('#feedbackModeBtns .tag-btn').forEach(function(b){
    b.disabled = fbOffline;
    b.title = fbOffline ? 'V bezpečném offline režimu o zpětné vazbě rozhoduje učitel až při opravě ve verifieru — tato volba se na studentský test neprojeví.' : '';
  });
  const strictRiskField = $('strictRiskField');
  if (strictRiskField) strictRiskField.classList.toggle('hidden', state.testMode !== 'prisny');
  // Hlídání obrazovky: aktivní tlačítko + skrytí pole v přísném režimu (tam je zámek vždy).
  document.querySelectorAll('#screenGuardBtns .tag-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.val === (state.screenGuard ? 'on' : 'off'));
  });
  const screenGuardField = $('screenGuardField');
  if (screenGuardField) screenGuardField.classList.toggle('hidden', state.testMode === 'prisny');
  // Roster jednorázových kódů má smysl jen v režimu identity „jednorázový kód".
  const rosterField = $('rosterField');
  if (rosterField) rosterField.classList.toggle('hidden', (state.identityMode || 'name') !== 'oneTimeCode');
  if (state.diferencovany === 'ANO') renderGroups();
  renderTeacherMapping();
  renderSourceMeters();

  // CEFR
  document.querySelectorAll('.cefr-btn').forEach(b => {
    b.classList.toggle('active', state.uroven.includes(b.dataset.val));
    b.classList.toggle('multi-mode', state.kombinovat);
  });
  $('btnKombinovat').classList.toggle('active', state.kombinovat);
  renderCefrInfo();

  // Grade scale
  $('gradeSkola').classList.toggle('active', state.gradeTyp === 'skola');
  $('gradeVlastni').classList.toggle('active', state.gradeTyp === 'vlastni');
  // table lives inside gradeSkola — visible via CSS when parent is active
  const vs = $('vlastniSkala');
  if (vs) vs.classList.toggle('hidden', state.gradeTyp !== 'vlastni');
  const aiWrap = $('aiScaleWrap');
  if (aiWrap) aiWrap.classList.toggle('hidden', state.gradeTyp !== 'vlastni');

  // Exercise detail
  const btnEd = $('btnExDetail');
  if (btnEd) btnEd.classList.toggle('active', state.exerciseDetail);
  $('exConfigList') && $('exConfigList').classList.toggle('hidden', !state.exerciseDetail);
  $('exTotals') && $('exTotals').classList.toggle('hidden', !state.exerciseDetail);
  const gtf = $('globalTypesField');
  if (gtf) gtf.classList.toggle('hidden', state.exerciseDetail);
  const gbf2 = $('globalBodyField');
  if (gbf2) gbf2.classList.toggle('hidden', state.exerciseDetail);
  if (state.exerciseDetail) renderExerciseConfig();

  switchTabVisuals(state.zadaniTab);
  renderUrlList();
  renderFileList();
  renderSmartTimeTip();
  const lb = $('listeningBlock');
  if (lb) lb.classList.toggle('hidden', !usesListeningComprehension());
  const rb = $('readingBlock');
  if (rb) rb.classList.toggle('hidden', !usesReadingComprehension());
  document.querySelectorAll('#rcLenBtns .tag-btn').forEach(b => b.classList.toggle('active', b.dataset.val === (state.rcLength || 'medium')));
  renderRcTopics();

  // ── Šablona jako autorita: zamkni (zašedni) volby, které šablona řídí ──────────
  // V pokročilém režimu s aktivní šablonou jsou režim/bezpečnost/hodnocení zamčené
  // a viditelně zašedlé; banner nabídne odepnutí. V jednoduchém režimu jsou tyto
  // volby skryté jinou cestou, takže zde nic nezamykáme.
  const tplLock = templateLockActive();
  const tplDef = tplLock ? simpleTemplateById(state.simpleTemplate) : null;
  Object.keys(TEMPLATE_LOCK_FIELD_MAP).forEach(function(key){
    const el = $(TEMPLATE_LOCK_FIELD_MAP[key]);
    if (el) el.classList.toggle('tpl-locked', tplLock);
  });
  const tplBanner = $('tplLockBanner');
  if (tplBanner) {
    tplBanner.classList.toggle('hidden', !tplLock);
    const nm = $('tplLockBannerName');
    if (nm && tplDef) nm.textContent = tplDef.label || '';
  }

  // ── Poctivý popisek karet „Běžný test"/„Procvičovací" podle hlídání obrazovky ──
  // Hlídání obrazovky (screenGuard) povyšuje běžný i procvičovací režim na zámkové
  // chování. Karta proto nesmí slibovat „bez zámku", když je guard zapnutý.
  const guardOn = !!state.screenGuard && state.testMode !== 'prisny';
  const setModeCardText = function(val, descOn, modeOn, modeClsOn, descOff, modeOff, modeClsOff){
    const card = document.querySelector('#testModeBtns .preset-card[data-val="' + val + '"]');
    if (!card) return;
    const d = card.querySelector('.preset-card-desc');
    const m = card.querySelector('.preset-card-mode');
    if (d) d.textContent = guardOn ? descOn : descOff;
    if (m){
      m.textContent = guardOn ? modeOn : modeOff;
      m.classList.remove('flex','strict','instant');
      m.classList.add(guardOn ? modeClsOn : modeClsOff);
    }
  };
  setModeCardText('bezny',
    'Standardní známkovaný režim. 🛡️ Hlídání obrazovky je zapnuté: opuštění testu uzamkne pokus (odemyká učitel).', 'Zámek z hlídání obrazovky', 'strict',
    'Standardní známkovaný režim. Opuštění testu se jen zapíše do bezpečnostního záznamu a do výsledku.', 'Bez zámku, se záznamem', 'flex');
  setModeCardText('procviceci',
    'Učící režim s měkčími pravidly a přívětivější zpětnou vazbou. 🛡️ Hlídání obrazovky je zapnuté: opuštění testu uzamkne pokus (odemyká učitel).', 'Zámek z hlídání obrazovky', 'strict',
    'Učící režim s měkčími pravidly, přívětivější zpětnou vazbou a bez stresujících bezpečnostních zásahů.', 'Tréninkový režim', 'instant');
}

// ═══ Navigation ═══════════════════════════════════════════════════════════════
function showOnlyStep(n) {
  for (let i = 0; i <= 4; i++) {
    const el = $('step' + i);
    if (el) el.classList.toggle('hidden', i !== n);
  }
  currentStep = n;
  updateProgress();
}

function goTo(n) {
  $('step'+currentStep).classList.add('hidden');
  $('step'+n).classList.remove('hidden');
  currentStep = n;
  if (n > maxStep) maxStep = n;
  updateProgress();
  if (n === 4) renderResult();
  saveSnapshot();
  window.scrollTo({top:0,behavior:'smooth'});
}

function jumpTo(n) {
  if (n > maxStep) return;
  goTo(n);
}

function updateProgress() {
  const modePanel = $('appModePanel');
  if (modePanel) modePanel.classList.toggle('hidden', currentStep !== 0);

  const segNames = ['seg0','seg1','seg2','seg3'];
  const lblNames = ['lbl0','lbl1','lbl2','lbl3'];
  segNames.forEach((id, i) => {
    const s = $(id);
    if (i < currentStep && i <= maxStep) s.className = 'progress-seg done';
    else if (i === currentStep) s.className = 'progress-seg active';
    else s.className = 'progress-seg';
    s.onclick = (i < currentStep && i <= maxStep) ? () => jumpTo(i) : null;
  });
  lblNames.forEach((id, i) => {
    const l = $(id);
    if (i < currentStep && i <= maxStep) l.className = 'prog-label done';
    else if (i === currentStep) l.className = 'prog-label active';
    else l.className = 'prog-label';
  });
  if (currentStep < 4) {
    $('progressArea').classList.remove('hidden');
  } else {
    $('progressArea').classList.add('hidden');
  }
}

// ═══ Pickers ══════════════════════════════════════════════════════════════════
function pick(key, value) {
  // Aktivní šablona je v pokročilém režimu autoritativní: volby, které řídí (režim,
  // bezpečnost, hodnocení), nejdou proklikat. Pro ruční úpravu musí učitel nejdřív
  // odepnout šablonu. (Ovládací prvky jsou navíc zašedlé/neklikatelné — tohle je pojistka.)
  if (templateLockActive() && TEMPLATE_GOVERNED_KEYS.indexOf(key) !== -1) {
    const t = simpleTemplateById(state.simpleTemplate);
    try { uiToast('Tuto volbu určuje šablona „' + ((t&&t.label)||'') + '". Pro ruční úpravu klikni na „✖ Bez šablony".', 'warn', 4200); } catch(_){}
    return;
  }
  state[key] = value;
  // Speciální případ: procvičovací + bezpečný offline jsou neslučitelné.
  if (key === 'resultMode' && value === 'secureOffline' && state.testMode === 'procviceci') {
    state.testMode = 'bezny';
    try { uiToast('Bezpečný offline verifier se s procvičovacím režimem neslučuje — režim testu přepnut na běžný.', 'warn', 5200); } catch(_){}
  }
  enforceModeConstraints();
  unmarkTemplateIfDiverged(key);
  applyVisualState(); validate(); saveSnapshot();
}

// Když uživatel v pokročilém režimu ručně změní režimovou volbu tak, že už
// neodpovídá aktivní šabloně, zrušíme zvýraznění šablony — byla jen startem a teď
// si učitel jede po svém. V jednoduchém režimu k tomu nedojde (volby jsou skryté).
// Ruční přepínač hlídání obrazovky (pokročilý režim). Funguje nezávisle na šabloně
// i režimu testu. Při zapnutí zajistí odemykací heslo (jinak by se zámek neaktivoval).
function setScreenGuard(on){
  // Šablona řídí i hlídání obrazovky — když je aktivní (pokročilý režim), guard nejde
  // přepnout ručně (pro úpravu odepni šablonu). Pojistka k zašedlému ovládacímu prvku.
  if (templateLockActive()) {
    const t = simpleTemplateById(state.simpleTemplate);
    try { uiToast('Hlídání obrazovky určuje šablona „' + ((t&&t.label)||'') + '". Pro ruční úpravu klikni na „✖ Bez šablony".', 'warn', 4200); } catch(_){}
    return;
  }
  state.screenGuard = !!on;
  if (on) ensureUnlockPasswordForGuard();
  // Ruční změna guardu odznačí šablonu jen pokud guard přestane odpovídat její definici.
  if (state.simpleTemplate){
    const t = simpleTemplateById(state.simpleTemplate);
    const want = !!(t && t.locks && t.locks.screenGuard);
    if (want !== !!on) state.simpleTemplate = '';
  }
  enforceModeConstraints();
  applyVisualState(); validate(); saveSnapshot();
}
function unmarkTemplateIfDiverged(key){
  if (!state.simpleTemplate) return;
  if (isSimpleMode()) return;
  const t = simpleTemplateById(state.simpleTemplate);
  if (!t || !t.locks) return;
  if (!Object.prototype.hasOwnProperty.call(t.locks, key)) return;
  if (state[key] !== t.locks[key]) {
    state.simpleTemplate = '';
    try { renderSimpleTemplates(); } catch(_){}
  }
}

function pickNum(key, value) {
  state[key] = value;
  if (key==='cas') setVal('casCustom', value);
  if (key==='body') { setVal('bodyCustom', value); syncExercisePoints(); }
  if (key==='pocet') { syncExerciseConfig(); renderSmartTimeTip(); }
  applyVisualState(); validate(); saveSnapshot();
}

function pickJazyk(v) {
  const wasCzech = String(state.jazyk||'').toLowerCase()==='čeština';
  state.jazyk = v;
  const isCzech = String(v||'').toLowerCase()==='čeština';
  // Výchozí chování: test v cílovém jazyce = i pokyny/UI v cílovém jazyce.
  // Češtinu pro pokyny lze stále ručně zvolit v druhém panelu.
  if (!state.instrJazyk || state.instrJazyk === 'cs') state.instrJazyk = 'target';
  // Šablony mají oddělené sady pro češtinu (cs) a cizí jazyky (fl). Při přepnutí
  // mezi skupinami zruším aktivní šablonu, aby nezůstala viset šablona z druhé sady.
  if (wasCzech !== isCzech && state.simpleTemplate){
    const stillValid = isCzech ? !!SIMPLE_TEMPLATES.cs[state.simpleTemplate] : !!SIMPLE_TEMPLATES.fl[state.simpleTemplate];
    if (!stillValid) state.simpleTemplate = '';
  }
  applyVisualState();
  validate(); saveSnapshot();
  renderSimpleTemplates();
}

function pickTheme(t) { state.tema=t; applyVisualState(); saveSnapshot(); }
function pickRcLength(v){ state.rcLength = v; applyVisualState(); saveSnapshot(); }

// ═══ READING COMPREHENSION — téma dle CEFR + AI návrh ══════════════════════════
// Témata se škálují podle nejvyšší zvolené úrovně CEFR: konkrétní → šířeji → abstraktně.
const RC_TOPIC_TIERS = {
  beginner: ['Rodina a domov','Jídlo a nákupy','Škola a volný čas','Počasí a roční období','Zvířata a příroda','Cestování a dovolená','Zdraví a tělo','Život ve městě'],
  intermediate: ['Technologie a sociální sítě','Životní prostředí','Kultura a tradice','Práce a kariéra','Média a zprávy','Sport a zdravý životní styl','Historie a osobnosti','Věda v běžném životě'],
  advanced: ['Globalizace a ekonomika','Etika a společenská dilemata','Umělá inteligence a budoucnost práce','Politika a lidská práva','Psychologie a chování','Vědecký výzkum','Klimatická změna','Literatura a umění']
};
function rcTier(){
  const order = ['A1','A2','B1','B2','C1','C2'];
  let max = -1;
  (state.uroven || []).forEach(l => { const i = order.indexOf(l); if (i > max) max = i; });
  if (max < 0) return 'intermediate';   // úroveň nezvolena → střední pásmo
  if (max <= 1) return 'beginner';      // A1–A2
  if (max <= 3) return 'intermediate';  // B1–B2
  return 'advanced';                    // C1–C2
}
function renderRcTopics(){
  const host = document.getElementById('rcTopicBtns');
  if (!host) return;
  const topics = RC_TOPIC_TIERS[rcTier()] || RC_TOPIC_TIERS.intermediate;
  const sel = state.rcTopic || '';
  host.innerHTML = topics.map(tp =>
    '<button type="button" class="tag-btn' + (sel === tp ? ' active' : '') + '" data-val="' + esc(tp) + '">' + esc(tp) + '</button>'
  ).join('');
  host.querySelectorAll('.tag-btn').forEach(b => b.addEventListener('click', () => pickRcTopic(b.dataset.val)));
}
function pickRcTopic(tp){
  state.rcTopic = (state.rcTopic === tp) ? '' : tp;
  if (state.rcTopic){ const c = document.getElementById('readingTopicCustom'); if (c) c.value = ''; }
  renderRcTopics(); validate(); saveSnapshot();
}
function onReadingTopicCustomInput(){
  const c = document.getElementById('readingTopicCustom');
  if (c && c.value.trim() && state.rcTopic){ state.rcTopic = ''; renderRcTopics(); }
  onInput();
}
function rcEffectiveTopic(){ const custom = trim('readingTopicCustom'); return custom || state.rcTopic || ''; }
function rcLenWords(){ return ({short:'60–100', medium:'130–190', long:'240–340'})[state.rcLength] || '130–190'; }
function compCefrForPrompt(){ return (state.uroven && state.uroven.length) ? cefrLabel() : 'B1'; }

// Doplňující blok pro READING do promptu: téma, délka a (pokud učitel dodal) pevný text/otázky.
function buildReadingUserBlock(){
  if (!usesReadingComprehension()) return '';
  const topic = rcEffectiveTopic();
  const passage = trim('readingText');
  const questions = trim('readingQuestions');
  const lines = [
    'READING COMPREHENSION — DOPLŇUJÍCÍ POKYNY OD UČITELE:',
    '• Jeden souvislý text na cvičení; otázky se vážou na tento text (text se u každé otázky neopakuje).',
    '• Přibližná délka textu: ' + rcLenWords() + ' slov.'
  ];
  if (topic) lines.push('• Téma / obor textu: ' + topic + '. Drž se tohoto tématu.');
  if (passage) lines.push('• POUŽIJ PŘESNĚ TENTO TEXT (neměň ho, nepřepisuj, nepřekládej; jen z něj udělej čtecí pasáž):\n' + passage);
  if (questions) lines.push('• POUŽIJ PŘESNĚ TYTO OTÁZKY a nepřidávej žádné další ani jejich alternativní znění — jen je převeď do interaktivní podoby a doplň správné odpovědi podle textu:\n' + questions);
  if (!passage && !topic) lines.push('• Učitel nedodal vlastní text ani téma; vyber přiměřené téma podle úrovně a věkové skupiny.');
  return lines.join('\n');
}

// ── AI návrh otázek k POSLECHU (vkládá se do editovatelného pole) ──
let _liAiDraft = null;
async function aiSuggestListeningQuestions(){
  const btn = document.getElementById('liAiBtn');
  if (!(typeof geminiApiKey !== 'undefined' && geminiApiKey)){
    renderLiAiPreview({ err:'Potřebuješ Gemini API klíč — zadej ho ve žluté sekci a zkus to znovu.' });
    return;
  }
  const focus = trim('listeningFocus');
  const transcript = trim('listeningTranscript');
  const latka = trim('latka');
  const jazyk = state.jazyk || 'angličtina';
  const lvl = compCefrForPrompt();
  let fileParts = [];
  try { const fp = await buildGeminiFilePartsForApi(); fileParts = (fp && fp.parts) || []; } catch(_){ fileParts = []; }
  const old = btn ? btn.textContent : '';
  if (btn){ btn.disabled = true; btn.textContent = '⏳ Generuji…'; }
  renderLiAiPreview({ loading:true });
  const n = 5;
  const prompt =
    'Jsi pomocník učitele jazyků. Navrhni ' + n + ' otázek k poslechu s porozuměním pro školní test.\n' +
    'Jazyk otázek: ' + jazyk + '. Úroveň CEFR: ' + lvl + '.\n' +
    (transcript ? 'Transkript / zdroj poslechu:\n' + transcript + '\n' : '') +
    (focus ? 'Zaměření otázek od učitele: ' + focus + '\n' : '') +
    (latka ? 'Probírané učivo / téma: ' + latka + '\n' : '') +
    (fileParts.length ? 'Poslechová nahrávka je přiložena jako soubor — vycházej z jejího skutečného obsahu.\n' : '') +
    'Otázky musí být auto-opravitelné (krátká, jednoznačná odpověď), přiměřené úrovni a vhodné pro školu. Piš je v jazyce ' + jazyk + '.\n' +
    'Vrať POUZE JSON: {"questions":[{"q":"...","a":"..."}]} bez dalšího textu.';
  try {
    const out = await callGeminiJSON(prompt, fileParts);
    const qs = (out && Array.isArray(out.questions))
      ? out.questions.map(x => ({ q:String(x && x.q || '').trim(), a:String(x && x.a || '').trim() })).filter(x => x.q)
      : [];
    if (!qs.length) throw new Error('AI nevrátila použitelné otázky.');
    _liAiDraft = qs;
    renderLiAiPreview({ questions:qs });
  } catch(err){
    _liAiDraft = null;
    renderLiAiPreview({ err:'AI se nepodařilo zavolat: ' + (err && err.message ? err.message : err) });
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = old; }
  }
}
function renderLiAiPreview(s){
  const box = document.getElementById('liAiPreview');
  if (!box) return;
  box.classList.remove('hidden');
  if (s.loading){ box.innerHTML = '<div class="ai-prev-loading">⏳ AI připravuje návrh otázek…</div>'; return; }
  if (s.err){ box.innerHTML = '<div class="ai-prev-err">⚠ ' + esc(s.err) + '</div>'; return; }
  const qs = s.questions || [];
  box.innerHTML =
    '<div class="ai-prev-head">Návrh AI — přečti, po vložení můžeš upravit:</div>' +
    '<ol class="ai-prev-list">' + qs.map(x => '<li><b>' + esc(x.q) + '</b>' + (x.a ? '<span class="ai-prev-a"> → ' + esc(x.a) + '</span>' : '') + '</li>').join('') + '</ol>' +
    '<div class="ai-prev-actions">' +
    '<button type="button" class="btn-modal-ok" onclick="liAiInsert()">✅ Vložit do otázek</button>' +
    '<button type="button" class="ghost" onclick="aiSuggestListeningQuestions()">🔄 Jiný návrh</button>' +
    '<button type="button" class="ghost" onclick="liAiDismiss()">Zavřít</button></div>' +
    '<div class="req-note">Každé „Jiný návrh“ = další 1 AI požadavek z denní kvóty.</div>';
}
function liAiInsert(){
  if (!_liAiDraft || !_liAiDraft.length) return;
  const txt = _liAiDraft.map((x,i) => (i+1) + '. ' + x.q + (x.a ? '  [' + x.a + ']' : '')).join('\n');
  const ta = document.getElementById('listeningQuestions');
  if (ta) ta.value = txt;
  onInput();
  liAiDismiss();
  uiToast('Otázky vloženy. Můžeš je upravit.','ok');
}
function liAiDismiss(){ const b = document.getElementById('liAiPreview'); if (b){ b.classList.add('hidden'); b.innerHTML = ''; } }

// ── AI návrh TEXTU + otázek k ČTENÍ (náhled ke schválení, pevný zdroj) ──
let _rcAiDraft = null;
async function aiSuggestReading(){
  const btn = document.getElementById('rcAiBtn');
  if (!(typeof geminiApiKey !== 'undefined' && geminiApiKey)){
    renderRcAiPreview({ err:'Potřebuješ Gemini API klíč — zadej ho ve žluté sekci a zkus to znovu.' });
    return;
  }
  const topic = rcEffectiveTopic();
  const jazyk = state.jazyk || 'angličtina';
  const lvl = compCefrForPrompt();
  const words = rcLenWords();
  const nQ = state.rcLength === 'short' ? 3 : state.rcLength === 'long' ? 5 : 4;
  const latka = trim('latka');
  const old = btn ? btn.textContent : '';
  if (btn){ btn.disabled = true; btn.textContent = '⏳ Generuji…'; }
  renderRcAiPreview({ loading:true });
  const prompt =
    'Jsi pomocník učitele jazyků. Napiš souvislý čtecí text (reading comprehension) a otázky k němu pro školní test.\n' +
    'Jazyk textu i otázek: ' + jazyk + '. Úroveň CEFR: ' + lvl + '.\n' +
    'Délka textu přibližně ' + words + ' slov.\n' +
    (topic ? 'Téma / obor textu: ' + topic + '.\n' : 'Téma zvol přiměřené úrovni a věku.\n') +
    (latka ? 'Zohledni probírané učivo: ' + latka + '.\n' : '') +
    'Napiš ' + nQ + ' otázek s porozuměním, auto-opravitelných (krátká, jednoznačná odpověď).\n' +
    'Text musí být originální, přiměřený úrovni a vhodný pro školu (žádná nevhodná témata).\n' +
    'Vrať POUZE JSON: {"passage":"...","questions":[{"q":"...","a":"..."}]} bez dalšího textu.';
  try {
    const out = await callGeminiJSON(prompt);
    const passage = String(out && out.passage || '').trim();
    const qs = (out && Array.isArray(out.questions))
      ? out.questions.map(x => ({ q:String(x && x.q || '').trim(), a:String(x && x.a || '').trim() })).filter(x => x.q)
      : [];
    if (!passage || !qs.length) throw new Error('AI nevrátila text nebo otázky.');
    _rcAiDraft = { passage, questions:qs };
    renderRcAiPreview({ passage, questions:qs });
  } catch(err){
    _rcAiDraft = null;
    renderRcAiPreview({ err:'AI se nepodařilo zavolat: ' + (err && err.message ? err.message : err) });
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = old; }
  }
}
function renderRcAiPreview(s){
  const box = document.getElementById('rcAiPreview');
  if (!box) return;
  box.classList.remove('hidden');
  if (s.loading){ box.innerHTML = '<div class="ai-prev-loading">⏳ AI připravuje text a otázky…</div>'; return; }
  if (s.err){ box.innerHTML = '<div class="ai-prev-err">⚠ ' + esc(s.err) + '</div>'; return; }
  box.innerHTML =
    '<div class="ai-prev-head">Návrh AI — přečti a schval, nebo nech navrhnout jiný:</div>' +
    '<div class="ai-prev-passage">' + esc(s.passage) + '</div>' +
    '<ol class="ai-prev-list">' + s.questions.map(x => '<li><b>' + esc(x.q) + '</b>' + (x.a ? '<span class="ai-prev-a"> → ' + esc(x.a) + '</span>' : '') + '</li>').join('') + '</ol>' +
    '<div class="ai-prev-actions">' +
    '<button type="button" class="btn-modal-ok" onclick="rcAiInsert()">✅ Použít tento text</button>' +
    '<button type="button" class="ghost" onclick="aiSuggestReading()">🔄 Navrhnout jiný</button>' +
    '<button type="button" class="ghost" onclick="rcAiDismiss()">Zavřít</button></div>' +
    '<div class="req-note">Každé „Navrhnout jiný“ = další 1 AI požadavek z denní kvóty.</div>';
}
function rcAiInsert(){
  if (!_rcAiDraft) return;
  const t = document.getElementById('readingText');
  if (t) t.value = _rcAiDraft.passage;
  const q = document.getElementById('readingQuestions');
  if (q) q.value = _rcAiDraft.questions.map((x,i) => (i+1) + '. ' + x.q + (x.a ? '  [' + x.a + ']' : '')).join('\n');
  onInput();
  rcAiDismiss();
  uiToast('Text a otázky vloženy jako pevný zdroj.','ok');
}
function rcAiDismiss(){ const b = document.getElementById('rcAiPreview'); if (b){ b.classList.add('hidden'); b.innerHTML = ''; } }

// ── BOD 15: Věková skupina / ročník ──────────────────────────────────────────
const AGE_GROUPS = {
  lower:    { label:'nižší gymnázium (11–15 let; prima–kvarta)',
              hint:'Konkrétní, blízká témata (škola, rodina, koníčky, kamarádi). Kratší věty, minimum abstrakce. Žádná dospělácká témata (práce, finance, politika, vztahy). Pokyny krátké a názorné.' },
  upper:    { label:'vyšší gymnázium (15–19 let; kvinta–oktáva / 1.–4. ročník SŠ)',
              hint:'Témata pro dospívající (studium, technologie, společnost, kultura, cestování). Lze střední míru abstrakce a názor. Formulace ne dětské, ale ani úředně dospělácké.' },
  maturita: { label:'maturitní ročník',
              hint:'Náročnější jazyk a kontext blízký maturitním okruhům, ale stále školně přiměřený. Vhodné delší texty, argumentace, srovnání; vyhni se zbytečně specializovaným odborným nebo citlivým tématům.' },
  adult:    { label:'dospělí',
              hint:'Témata relevantní dospělým (práce, bydlení, finance, služby, aktuální dění). Plně dospělé formulace a kontext; bez školácké infantilizace.' },
  custom:   { label:'', hint:'' }
};
function ageGroupLabel(){
  if (state.ageGroup === 'custom') return (state.ageGroupCustom || '').trim();
  const g = AGE_GROUPS[state.ageGroup];
  return g ? g.label : '';
}
function ageGroupHint(){
  if (state.ageGroup === 'custom') return '';
  const g = AGE_GROUPS[state.ageGroup];
  return g ? g.hint : '';
}
function pickAgeGroup(v){
  state.ageGroup = (state.ageGroup === v && v !== 'custom') ? '' : v;
  applyVisualState(); saveSnapshot();
}
function onAgeCustomInput(){
  state.ageGroupCustom = trim('ageGroupCustom');
  renderAgeGroupNote(); saveSnapshot();
}
function renderAgeGroupNote(){
  const customInput = $('ageGroupCustom');
  if (customInput) customInput.classList.toggle('hidden', state.ageGroup !== 'custom');
  const note = $('ageGroupNote');
  if (!note) return;
  if (!state.ageGroup) {
    note.innerHTML = '<span style="color:var(--t4)">⚠️ Pozor: CEFR úroveň není totéž co věková přiměřenost. A2 v primě nemá stejná témata jako A2 pro dospělé — proto doplň věkovou skupinu.</span>';
    return;
  }
  const lbl = ageGroupLabel();
  const hint = ageGroupHint();
  note.innerHTML = '<strong>Pro AI:</strong> ' + (lbl ? esc(lbl) : '(vlastní skupina nezadána)')
    + (hint ? '<br>' + esc(hint) : '')
    + '<br><span style="color:var(--t4)">CEFR ≠ věk: úroveň řídí jazykovou náročnost, věková skupina řídí témata a formulace.</span>';
}

// ── BOD 5: Pedagogická funkce typů cvičení ────────────────────────────────────
// Mapuje KANONICKÉ (normalizované) názvy typů na pedagogickou funkci.
// Nepřejmenovává typy; jen je kategorizuje pro UI a prompt.
const EXERCISE_PEDAGOGY = {
  // Rozpoznání
  'multiple choice':'recognition', 'true/false':'recognition', 'odd one out':'recognition', 'matching':'recognition', 'multi-select':'recognition', 'categorisation-board':'recognition',
  'synonym choice':'recognition', 'antonym choice':'recognition', 'choose the correct response':'recognition', 'match word to definition':'recognition',
  // Řízená produkce
  'fill-in-the-blank':'controlled', 'word formation':'controlled', 'sentence transformation':'controlled',
  'key word transformation':'controlled', 'word order':'controlled', 'table-completion':'controlled', 'transformation-chain':'controlled', 'error correction':'controlled', 'error-tagging':'controlled',
  'verb form':'controlled', 'preposition gap-fill':'controlled', 'question formation':'controlled', 'word family':'controlled',
  // Volnější produkce
  'translation':'freer',
  'short answer':'freer', 'paraphrase the sentence':'freer',
  // Porozumění
  'reading comprehension':'comprehension', 'listening comprehension':'comprehension', 'multiple matching':'comprehension',
  'banked cloze':'comprehension', 'cloze text':'comprehension', 'dialogue completion':'comprehension', 'categorization':'comprehension', 'ordering':'comprehension', 'highlight-evidence':'comprehension',
  'heading matching':'comprehension', 'gist question':'comprehension', 'summary cloze':'comprehension'
};
const PEDAGOGY_FN = {
  recognition:   { label:'Rozpoznání', desc:'žák vybírá nebo přiřazuje; rychlá kontrola porozumění, slabší pro aktivní použití jazyka' },
  controlled:    { label:'Řízená produkce', desc:'žák tvoří odpověď v omezeném rámci; vhodné pro gramatiku a přesnost' },
  freer:         { label:'Volnější produkce', desc:'žák sám formuluje jazyk; vyšší náročnost, nutná kontrola alternativ' },
  comprehension: { label:'Porozumění', desc:'žák pracuje s textem/poslechem a prokazuje pochopení obsahu' },
  other:         { label:'Vlastní / nezařazené', desc:'typ mimo standardní pedagogické kategorie' }
};
function pedagogyOf(type){
  const t = normalizeType(type);
  return EXERCISE_PEDAGOGY[t] || 'other';
}
// Filtr v pokročilém režimu — pouze vizuální, neukládá se do stavu testu.
let pedFilterActive = 'all';
function filterPedagogy(fn){
  pedFilterActive = fn || 'all';
  document.querySelectorAll('#pedFilter .ped-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.fn === pedFilterActive));
  document.querySelectorAll('#typyBtns .type-group').forEach(g =>
    g.classList.toggle('ped-hidden', pedFilterActive !== 'all' && g.dataset.fn !== pedFilterActive));
}
// Seskupí aktuálně vybrané typy (+ vlastní) podle pedagogické funkce.
function selectedTypesByFunction(){
  const vlastni = trim('vlastniTyp');
  const all = [...state.typyCviceni, ...(vlastni ? [vlastni] : [])].filter(Boolean);
  const groups = {};
  all.forEach(t => {
    const fn = pedagogyOf(t);
    (groups[fn] = groups[fn] || []).push(t);
  });
  return groups;
}
// Podklad pro prompt: které funkce test pokrývá a v jakém poměru.
function pedagogySummaryForPrompt(){
  const groups = selectedTypesByFunction();
  const order = ['recognition','controlled','freer','comprehension','other'];
  const lines = [];
  order.forEach(fn => {
    if (groups[fn] && groups[fn].length) {
      lines.push(`• ${PEDAGOGY_FN[fn].label} (${PEDAGOGY_FN[fn].desc}): ${groups[fn].join(', ')}`);
    }
  });
  if (!lines.length) return '';
  return 'Pedagogická funkce vybraných typů úloh — sestav test cíleně podle těchto funkcí, ne náhodně:\n'
    + lines.join('\n')
    + '\nVyvažuj test podle těchto funkcí: rozpoznání ověřuje pasivní znalost, produkce ověřuje aktivní použití jazyka, porozumění ověřuje práci s obsahem.';
}

