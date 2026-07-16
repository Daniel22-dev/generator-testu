// ═══ Normalizace načteného stavu ══════════════════════════════════════════════
// Voláno při loadSnapshot / loadTemplate / loadFromHistory.
// Synchronizuje appMode ↔ workPreset a zajistí, že overeni=NE (panel odstraněn).
function normalizeLoadedState(s) {
  if (!s.appMode) s.appMode = 'simple';
  if (!s.workPreset || s.workPreset === 'safe') {
    s.workPreset = (s.appMode !== 'advanced') ? 'quick' : 'advanced';
  }
  // Udrž appMode a workPreset v lockstepu — jsou ekvivalentní.
  if (s.workPreset === 'quick')    s.appMode = 'simple';
  else if (s.workPreset === 'advanced') s.appMode = 'advanced';
  // Ověřovací panel byl odebrán z UI; hodnota je vždy NE.
  s.overeni = 'NE';
  // Tolerance překlepů: starší snapshoty/šablony field nemají → bezpečné Vypnuto.
  if (s.fuzzyTolerance !== 'mild' && s.fuzzyTolerance !== 'strict') s.fuzzyTolerance = 'off';
  // „Jiné/kombinace" bylo zrušeno — starší snapshot s touto volbou nech znovu vybrat.
  if (s.jazyk === '__jine__') s.jazyk = '';
  // ── Pedagogicko-didaktická vrstva: doplň bezpečné defaulty pro starší data ──
  if (typeof s.ageGroup !== 'string') s.ageGroup = '';
  if (typeof s.ageGroupCustom !== 'string') s.ageGroupCustom = '';
  if (typeof s.testPurpose !== 'string') s.testPurpose = '';
  if (typeof s.pedagogicalPreset !== 'string') s.pedagogicalPreset = '';
  // Sjednocená šablona: platí v obou režimech. Musí být platné ID.
  if (typeof s.simpleTemplate !== 'string') s.simpleTemplate = '';
  if (s.simpleTemplate && !(SIMPLE_TEMPLATES.fl[s.simpleTemplate] || SIMPLE_TEMPLATES.cs[s.simpleTemplate])) s.simpleTemplate = '';
  if (typeof s.screenGuard !== 'boolean') s.screenGuard = false;
  if (['none','brief','learning'].indexOf(s.feedbackMode) === -1) s.feedbackMode = 'brief';
  if (['basic','standard','challenge'].indexOf(s.differentiationLevel) === -1) s.differentiationLevel = 'standard';
  if (s.exercisePedagogyMap === undefined) s.exercisePedagogyMap = null;
  if (s.didacticReview === undefined) s.didacticReview = null;
  if (s.splitGenerate === undefined) s.splitGenerate = false;
  if (s.manualMode === undefined) s.manualMode = false;
  if (Array.isArray(s.exerciseConfig)) s.exerciseConfig.forEach(function(ex){ if (ex.manualMode === undefined) ex.manualMode = false; });
  return s;
}

// ═══ Křížové závislosti mezi poli stavu ═══════════════════════════════════════
// Veškerá pravidla „jedno pole vynutí jiné" na jednom místě.
// Voláno z pick(), pickDiff(), setAppMode().
function enforceModeConstraints() {
  // Ověřovací panel odebrán z UI; vždy NE.
  state.overeni = 'NE';
  // Modul ČJ řídí exerciseConfig, bodování i typy — vyžaduje pokročilý mód,
  // jinak applySimpleDefaults() jeho nastavení při každé validaci přepisuje.
  // VÝJIMKA: pokud je aktivní jednoduchá šablona, čeština smí zůstat v jednoduchém
  // módu — šablona řídí režim/hodnocení a volby jsou skryté, takže nehrozí konflikt.
  if (String(state.jazyk || '').toLowerCase() === 'čeština' && isSimpleMode() && !state.simpleTemplate) {
    state.appMode = 'advanced'; state.workPreset = 'advanced';
  }
  // Přísný test → bezpečný offline verifier je povinný.
  if (state.testMode === 'prisny') {
    state.resultMode = 'secureOffline';
    state.odevzdavani = 'B';
  }
  // Procvičovací mód → okamžitý výsledek a skutečně formativní chování.
  // Žolík je klasifikační výjimka, proto v procvičování nedává smysl.
  if (state.testMode === 'procviceci') {
    state.resultMode = 'instant';
    state.feedbackMode = 'learning';
    state.zolicek = 'NE';
  }
  // Bezpečný offline → celkové odevzdání. Normálně by v jednoduchém módu přepnul do
  // pokročilého, ALE pokud offline nastavila jednoduchá šablona, smí zůstat v simple
  // (volby jsou skryté, řídí je šablona — to je celý smysl šablon na známku/přísných).
  if ((state.resultMode || 'instant') === 'secureOffline') {
    state.odevzdavani = 'B';
    state.feedbackMode = 'none';
    if (isSimpleMode() && !state.simpleTemplate) { state.appMode = 'advanced'; state.workPreset = 'advanced'; }
  }
  // Bez okamžité zpětné vazby nelze použít průběžné odevzdávání: cvičení by se
  // nevratně uzamklo bez jakékoli informace pro studenta.
  if (state.feedbackMode === 'none') state.odevzdavani = 'B';
  // Okamžitá známka + přísný test jsou navzájem neslučitelné → vrátit na secureOffline.
  if (state.resultMode === 'instant' && state.testMode === 'prisny') {
    state.resultMode = 'secureOffline';
    state.odevzdavani = 'B';
  }
  // Diferenciace → vyžaduje pokročilý mód (skupiny + podmínky jsou advanced-only).
  if (state.diferencovany === 'ANO' && isSimpleMode()) {
    state.appMode = 'advanced';
    state.workPreset = 'advanced';
  }
  // Jednoduchý mód → vynuť výchozí nastavení (přepisuje případné nesoulady z load).
  if (isSimpleMode()) applySimpleDefaults();
}

function getSecurityGuideState(){
  const secure = (state.resultMode || 'instant') === 'secureOffline';
  const strict = state.testMode === 'prisny';
  if (secure) {
    return {
      profile:'secure',
      label: strict ? '🔒 Aktuálně: přísný test + bezpečný offline verifier' : '🛡️ Aktuálně: bezpečný offline + učitelský verifier',
      help: strict
        ? '<strong>Přísný test + bezpečný offline:</strong> okamžitá známka je vypnutá. Studentský soubor neobsahuje správné odpovědi; student po dokončení stáhne zakódovaný answers.txt a učitel vše opraví v teacher_verifier.html.'
        : '<strong>Bezpečný offline:</strong> nejbezpečnější volba pro klasifikaci. Studentský soubor neobsahuje správné odpovědi; student po dokončení stáhne zakódovaný answers.txt a učitel vše opraví v teacher_verifier.html.',
      note: strict
        ? '<strong>Logika přísného režimu:</strong> test se může zamknout při opuštění okna/karty a zároveň se opravuje až ve verifieru. Studentům posílej pouze HTTPS odkaz na publikovaný student_test.html, ne HTML soubor jako přílohu.'
        : '<strong>Co poslat studentům:</strong> pouze HTTPS odkaz na publikovaný student_test.html. <strong>Co nechat u učitele:</strong> teacher_verifier.html se správnými odpověďmi, soukromým klíčem a exporty.'
    };
  }
  return {
    profile:'instant',
    label: state.testMode === 'procviceci' ? '💬 Aktuálně: procvičování s okamžitou zpětnou vazbou' : '⚡ Aktuálně: okamžitá známka + screenshot',
    help:'<strong>Okamžitá známka:</strong> student po odevzdání hned vidí body, procenta a známku. Je to nejpohodlnější režim, ale studentský HTML musí obsahovat hodnoticí logiku.',
    note:'<strong>Doporučení:</strong> vhodné pro procvičení, domácí práci nebo menší orientační test. Pro klasifikovaný test použij raději bezpečný offline režim.'
  };
}
function updateSecurityGuideUI(){
  const st = getSecurityGuideState();
  const current = $('securityCurrent');
  if (current) current.innerHTML = '<strong>Aktuálně:</strong> ' + esc(st.label.replace(/^(.+?:\s*)/, ''));
  const help = $('resultModeHelp');
  if (help) help.innerHTML = st.help + (state.testMode === 'prisny' ? ' <strong>Okamžitá známka není v přísném režimu dostupná.</strong>' : '');
  const note = $('securityActionNote');
  if (note) note.innerHTML = st.note + (state.zolicek === 'ANO' ? ' <strong>Poznámka:</strong> pokud student použije žolíka, výsledek je označen jako ŽOLÍK POUŽIT.' : '');
  document.querySelectorAll('[data-security-card]').forEach(card => {
    const k = card.dataset.securityCard;
    const active = (k === st.profile) || (k === 'strict' && state.testMode === 'prisny');
    card.classList.toggle('active', active);
  });
}
function markAdvancedSections(){
  const ids = ['instrJazykBtns','testModeBtns','layoutBtns','resultModeBtns','randomBtns','gradeSkola','themeGrid','zolicekBtns','diffBtns','diffLevelBtns','fuzzyBtns','feedbackModeBtns','identityModeBtns'];
  const rosterF = $('rosterField'); if (rosterF) rosterF.classList.add('advanced-only');
  ids.forEach(id => { const el = $(id); const f = el && el.closest ? el.closest('.field') : null; if (f) f.classList.add('advanced-only'); });
  const varA = $('varA'); const subField = varA && varA.closest ? varA.closest('.field') : null; if (subField) subField.classList.add('advanced-only');
  const btnEx = $('btnExDetail'); if (btnEx) btnEx.classList.add('advanced-only');
  const secCode = $('bezpKod'); const secField = secCode && secCode.closest ? secCode.closest('.field') : null; if (secField) secField.classList.add('advanced-only');
}

function updateAppModeUI(){
  // markAdvancedSections() se volá jednou při startu v init() — DOM prvky se nemění.
  const simple = isSimpleMode();
  document.body.classList.toggle('simple-mode', simple);
  document.body.classList.toggle('advanced-mode', !simple);
  document.querySelectorAll('#appModeBtns .mode-pill').forEach(b => b.classList.toggle('active', b.dataset.val === (simple ? 'simple' : 'advanced')));
  const summary = $('appModeSummary');
  if (summary) {
    if (simple) {
      const t = simpleTemplateById(state.simpleTemplate || '');
      summary.textContent = t
        ? ('Jednoduchý režim se šablonou „' + t.label + '“: režim testu a hodnocení nastavuje šablona. Doplň jen látku, typy a počet.')
        : 'Jednoduchý režim: vyber šablonu podle cíle, nebo nech výchozí (běžný test, okamžitá známka). Šablona umí nastavit i offline/přísný test.';
    } else {
      summary.textContent = 'Pokročilý režim: zvol doporučené nastavení pro známkování, nebo si všechny volby nastav ručně.';
    }
  }
  const helper = $('simpleSecretsHelper'); if (helper) helper.classList.toggle('hidden', !simple);
  renderSimpleTemplates();
}

function getInstructionLanguageLabel() {
  const target = languageText() || 'cílový jazyk';
  if (state.instrJazyk === 'target') return 'celý test v cílovém jazyce (' + target + ')';
  if (state.instrJazyk === 'mixed') return 'UI a technické pokyny česky, zadání cvičení v cílovém jazyce (' + target + ')';
  return 'pokyny a ovládání česky, jazykový obsah v cílovém jazyce (' + target + ')';
}
function shortHash(str){ let h=2166136261; for (let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0).toString(36); }
function makeVerifySecret(){
  if (!(window.crypto && window.crypto.getRandomValues))
    throw new Error('WebCrypto není dostupné — generování bezpečnostního kódu testu selhalo.');
  const bytes = new Uint8Array(32);
  (crypto || window.crypto).getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
}
function toggleSecret(id, btn){ const el=$(id); if(!el) return; const show = el.type === 'password'; el.type = show ? 'text' : 'password'; if(btn) btn.textContent = show ? '🙈' : '👁'; }
function makeHumanSecurityCode(len=36){
  if (!(window.crypto && window.crypto.getRandomValues))
    throw new Error('WebCrypto není dostupné — generování přístupového kódu selhalo.');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(len);
  (crypto || window.crypto).getRandomValues(bytes);
  let raw = '';
  for (let i=0;i<len;i++) raw += alphabet[bytes[i] % alphabet.length];
  return 'GHR-' + raw.match(/.{1,6}/g).join('-');
}
function setSecurityCodeAndRefresh(code){
  setVal('bezpKod', code || '');
  validate();
  saveSnapshot();
}
async function generateSchoolSecurityCode(){
  if (typeof accIsAdmin === 'function' && !accIsAdmin()) {
    await uiAlert('Nový týmový bezpečnostní kód může vygenerovat jen správce. Vlož kód, který ti správce předal bezpečnou cestou.', 'Vyhrazeno správci');
    return;
  }
  if (trim('bezpKod')) {
    const replace = await uiConfirm('Pole už obsahuje bezpečnostní kód. Nahradit ho novým?', 'Nahradit bezpečnostní kód?', true);
    if (!replace) return;
  }
  const code = makeHumanSecurityCode(36);
  setSecurityCodeAndRefresh(code);
  await uiAlert('Byl vygenerován NOVÝ týmový bezpečnostní kód. Pokud ho mají používat kolegové, zkopíruj právě tento kód a předej ho bezpečnou cestou. Každý kolega ho musí vložit ručně nebo si ho uložit lokálně na svém zařízení.', 'Nový týmový kód');
}
function copySecurityCode(){
  const code = trim('bezpKod');
  if (!code) { uiAlert('Nejdřív vygeneruj nebo napiš bezpečnostní kód.'); return; }
  const done = () => uiToast('Bezpečnostní kód zkopírován. Pošli ho jen oprávněným kolegům bezpečnou cestou. Studentům nikdy.', 'warn', 5200);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code));
  else fallbackCopy(code);
}
async function saveSecurityCodeLocal(){
  const code = trim('bezpKod');
  if (!code) { await uiAlert('Nejdřív vygeneruj nebo napiš bezpečnostní kód.'); return; }
  const ok = await uiConfirm('Uložit bezpečnostní kód do tohoto prohlížeče? Používej pouze na vlastním učitelském zařízení. Na sdíleném školním počítači neukládej.', 'Uložit lokálně?', true);
  if (!ok) return;
  try { localStorage.setItem(SCHOOL_SECURITY_CODE_KEY, code); uiToast('Bezpečnostní kód je uložen lokálně v tomto prohlížeči. Na sdíleném školním počítači tento postup nepoužívej.', 'warn', 5200); }
  catch(_) { await uiAlert('Kód se nepodařilo uložit. Prohlížeč možná blokuje localStorage.'); }
}
async function loadSecurityCodeLocal(){
  try {
    const code = localStorage.getItem(SCHOOL_SECURITY_CODE_KEY) || '';
    if (!code) { await uiAlert('V tomto prohlížeči není uložen žádný školní bezpečnostní kód.'); return; }
    setSecurityCodeAndRefresh(code);
    uiToast('Uložený týmový bezpečnostní kód byl načten. Zkontroluj, že používáš aktuální kód týmu.', 'warn', 5200);
  } catch(_) { await uiAlert('Kód se nepodařilo načíst. Prohlížeč možná blokuje localStorage.'); }
}
async function forgetSecurityCodeLocal(){
  const ok = await uiConfirm('Smazat lokálně uložený bezpečnostní kód z tohoto prohlížeče?', 'Smazat lokální kód?', true);
  if (!ok) return;
  try { localStorage.removeItem(SCHOOL_SECURITY_CODE_KEY); uiToast('Lokálně uložený bezpečnostní kód byl z tohoto zařízení smazán. Samotný týmový kód v bezpečném školním úložišti tím smazán není.', 'warn', 5200); }
  catch(_) { await uiAlert('Lokální kód se nepodařilo smazat.'); }
}
// Na vlastním (důvěryhodném) zařízení: pokud je týmový bezpečnostní kód lokálně uložen,
// doplň ho do pole automaticky a tiše. Uložení kódu = vědomé označení zařízení za vlastní
// (ukládání i varuje před sdíleným počítačem), takže auto-doplnění je bezpečné. Nepřepisuje
// už vyplněné pole. Voláno po startu (accOnGranted) i po importu zadání.
function autoApplyStoredSecurityCode(){
  try {
    if (trim('bezpKod')) return;
    const code = localStorage.getItem(SCHOOL_SECURITY_CODE_KEY) || '';
    if (!code) return;
    setVal('bezpKod', code);
    if (typeof validate === 'function') validate();
  } catch(_){}
}
function anonymizeGroupsForStorage(groups){
  return (Array.isArray(groups) ? groups : []).map((g, gi) => ({
    ...g,
    studenti: Array.isArray(g.studenti)
      ? g.studenti.map((_, i) => `Student ${String.fromCharCode(65 + gi)}${i + 1}`)
      : []
  }));
}
function getStoredState(){
  const clean = JSON.parse(JSON.stringify(state));
  clean.fileNames = [];
  if (Array.isArray(clean.skupiny)) clean.skupiny = anonymizeGroupsForStorage(clean.skupiny);
  // V prohlížeči nikdy neukládáme reálné přílohy, hesla/PINy ani skutečná jména studentů.
  return clean;
}
function sanitizePromptForStorage(prompt){
  let out = String(prompt || '');
  // Starší i nové názvy polí; historie nikdy nesmí obsahovat odemykací heslo ani učitelský PIN.
  out = out.replace(
    /(?:Heslo pro odemčení(?: bezpečnostního zámku)?|Odemykací heslo(?: zámkové obrazovky)?)\s*:\s*.*$/gm,
    'Odemykací heslo zámkové obrazovky: [NEULOŽENO]'
  );
  out = out.replace(
    /(?:PIN pro učitelský mód|PIN učitele)\s*:\s*.*$/gm,
    'PIN učitele: [NEULOŽENO]'
  );
  out = out.replace(/Učitelský přístup\s*:\s*.*$/gm, 'Učitelský přístup: [NEULOŽENO]');
  const secretValues = [trim('heslo'), trim('ucitelPin')].filter(v => v && v.length > 0);
  secretValues.forEach(secret => { out = out.split(secret).join('[NEULOŽENO]'); });
  // Jména studentů jsou v historii vždy anonymizovaná — viz pushHistory()
  return out;
}
function clearOldUnsafeStorage(){
  const active = new Set([SAVE_KEY, TPL_KEY, HIST_KEY]);
  try { OLD_KEYS_TO_CLEAR.forEach(k => { if (!active.has(k)) localStorage.removeItem(k); }); } catch(_){}
}

// Seznam VŠECH historických klíčů (od nejnovějšího po nejstarší), z nichž se při startu
// přenášejí šablony a historie do aktuálního klíče — DŘÍV, než cokoli smaže clearOldUnsafeStorage.
const LEGACY_TPL_KEYS = ['sestavovac_tpl_v5_12_0','sestavovac_tpl_v5_11_1','sestavovac_tpl_v5_11_0','sestavovac_tpl_v5_10_6','sestavovac_tpl_v5_9_6','sestavovac_tpl_v5_9_5','sestavovac_tpl_v5_9_4','sestavovac_tpl_v5_9_3','sestavovac_tpl_v5_9_1','sestavovac_tpl_v5_9_0','sestavovac_tpl_v5_8_6','sestavovac_tpl_v5_8_5','sestavovac_tpl_v5_8_4','sestavovac_tpl_v5_8_3','sestavovac_tpl_v5_8_2','sestavovac_tpl_v5_8_1','sestavovac_tpl_v5_8_0','sestavovac_tpl_v5_7_4','sestavovac_tpl_v5_7_3','sestavovac_tpl_v5_7_2','sestavovac_tpl_v5_7_1','sestavovac_tpl_v5_6','sestavovac_tpl_v5_4','sestavovac_tpl_v5'];
const LEGACY_HIST_KEYS = ['sestavovac_hist_v5_12_0','sestavovac_hist_v5_11_1','sestavovac_hist_v5_11_0','sestavovac_hist_v5_10_6','sestavovac_hist_v5_9_6','sestavovac_hist_v5_9_5','sestavovac_hist_v5_9_4','sestavovac_hist_v5_9_3','sestavovac_hist_v5_9_1','sestavovac_hist_v5_9_0','sestavovac_hist_v5_8_6','sestavovac_hist_v5_8_5','sestavovac_hist_v5_8_4','sestavovac_hist_v5_8_3','sestavovac_hist_v5_8_2','sestavovac_hist_v5_8_1','sestavovac_hist_v5_8_0','sestavovac_hist_v5_7_4','sestavovac_hist_v5_7_3','sestavovac_hist_v5_7_2','sestavovac_hist_v5_7_1','sestavovac_hist_v5_7','sestavovac_hist_v5_6','sestavovac_hist_v5_4','sestavovac_hist_v5'];

let storageWarnShown = false;
function safeSetItem(key, value){
  try { localStorage.setItem(key, value); return true; }
  catch(e){
    console.warn('Uložení do localStorage selhalo:', e);
    if(!storageWarnShown){
      storageWarnShown = true;
      const msg = 'Úložiště prohlížeče je plné nebo blokované — poslední změny se NEULOŽILY. Smaž staré šablony/historii nebo použij „Vymazat citlivé údaje“.';
      if(typeof uiToast === 'function') uiToast(msg, 'err', 9000);
      else if(typeof uiAlert === 'function') uiAlert(msg, 'Uložení selhalo');
    }
    return false;
  }
}

function readArr(key){
  try { const a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; }
  catch(_){ return []; }
}

// Přenese šablony a historii ze starých klíčů do aktuálních. Sloučí a deduplikuje podle id,
// novější (z dřívějšího klíče v seznamu) má přednost. Bezpečné spustit opakovaně (idempotentní).
function migrateStorage(){
  try {
    // ŠABLONY: aktuální + všechny legacy, dedup podle id
    const seenTpl = new Set();
    const mergedTpl = [];
    for (const arr of [readArr(TPL_KEY), ...LEGACY_TPL_KEYS.map(readArr)]) {
      for (const t of arr) {
        const id = t && t.id != null ? String(t.id) : null;
        if (id && seenTpl.has(id)) continue;
        if (id) seenTpl.add(id);
        mergedTpl.push(t);
      }
    }
    if (mergedTpl.length) safeSetItem(TPL_KEY, JSON.stringify(mergedTpl));

    // HISTORIE: aktuální + všechny legacy, dedup podle hash (jinak ts), nejnovější nahoře, limit 50
    const seenHist = new Set();
    const mergedHist = [];
    for (const arr of [readArr(HIST_KEY), ...LEGACY_HIST_KEYS.map(readArr)]) {
      for (const h of arr) {
        const key = h && (h.hash != null ? 'h:'+h.hash : (h.ts != null ? 't:'+h.ts : null));
        if (key && seenHist.has(key)) continue;
        if (key) seenHist.add(key);
        mergedHist.push(h);
      }
    }
    if (mergedHist.length) {
      mergedHist.sort((a,b) => (b && b.ts || 0) - (a && a.ts || 0));
      safeSetItem(HIST_KEY, JSON.stringify(mergedHist.slice(0, 50)));
    }
  } catch(_){}
}

// ═══ Light / Dark mode ════════════════════════════════════════════════════════
function toggleMode() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  $('btnMode').textContent = isLight ? '🌙' : '☀️';
  try { localStorage.setItem('sestavovac_mode', isLight ? 'light' : 'dark'); } catch(_){}
}
function applyMode() {
  try {
    const m = localStorage.getItem('sestavovac_mode');
    if (m === 'light') { document.body.classList.add('light'); $('btnMode').textContent = '🌙'; }
  } catch(_){}
}

// ═══ Persistence ══════════════════════════════════════════════════════════════
function saveSnapshot() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const dom = {};
      DOM_FIELDS.forEach(id => { dom[id] = val(id); });
      const snap = { dom, state: getStoredState(), currentStep, maxStep, ts: Date.now() };
      if (safeSetItem(SAVE_KEY, JSON.stringify(snap))) flashSave();
    } catch(e){ console.warn('Sestavení snapshotu selhalo:', e); }
  }, 400);
}

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const snap = JSON.parse(raw);
    if (!snap?.state) return false;
    Object.assign(state, snap.state);
    if (!state.urls?.length) state.urls = [''];
    normalizeLoadedState(state);
    if (!state.exerciseConfig) state.exerciseConfig = [];
    if (typeof state.exerciseDetail !== 'boolean') state.exerciseDetail = false;
    if (!state.tema) state.tema = 'modern';
    if (!state.randomizace) state.randomizace = 'NE';
    if (!state.testMode) state.testMode = 'bezny';
    if (!state.layout) state.layout = 'tabs';
    if (!state.resultMode) state.resultMode = 'instant';
    if (!state.gradeTyp) state.gradeTyp = 'skola';
    // Od v7 je anonymizace komunikace s AI povinná; staré volby 'NE' migrujeme.
    state.anonymizace = 'ANO';
    if (!Array.isArray(state.fileNames)) state.fileNames = [];
    state.fileNames = [];
    maxStep = Math.max(0, Math.min(4, snap.maxStep || snap.currentStep || 0));
    currentStep = Math.max(0, Math.min(4, snap.currentStep || 0)); // 4 = výsledek/generování; smí se obnovit
    if (state.skupiny?.length) groupIdCounter = Math.max(...state.skupiny.map(g => Number(g.id)||0)) + 1;
    Object.entries(snap.dom || {}).forEach(([id, v]) => setVal(id, v));
    SENSITIVE_FIELD_IDS.forEach(id => setVal(id, ''));
    enforceModeConstraints();
    return true;
  } catch(_) { try { localStorage.removeItem(SAVE_KEY); } catch(__){} return false; }
}

function discardSaved() { try { localStorage.removeItem(SAVE_KEY); } catch(_){} location.reload(); }

function flashSave() {
  const el = $('saveIndicator');
  el.classList.add('visible');
  clearTimeout(indicatorTimer);
  indicatorTimer = setTimeout(() => el.classList.remove('visible'), 1300);
}

// ═══ Templates ════════════════════════════════════════════════════════════════
function loadTemplates() {
  // migrateStorage() při startu sloučí všechny staré klíče do TPL_KEY, takže stačí číst aktuální.
  return readArr(TPL_KEY);
}
function saveTemplates(tpls) {
  return safeSetItem(TPL_KEY, JSON.stringify(tpls));
}

// Klíče pedagogického profilu — to jediné, co šablona ukládá.
// Záměrně NEOBSAHUJE exerciseConfig, cas, jazyk, nazev testu, téma.
const PROFILE_KEYS = ['testMode','resultMode','feedbackMode','differentiationLevel','fuzzyTolerance','gradeTyp'];

function getTemplateProfile() {
  const p = {};
  PROFILE_KEYS.forEach(function(k){ p[k] = state[k]; });
  p.diferencovany = state.diferencovany || 'NE';
  p.skupinyCount = (state.skupiny || []).length;
  p.skupinyNazvy = (state.skupiny || []).map(function(g){ return g.nazev || ''; });
  return p;
}

function applyTemplateProfile(p) {
  if (!p) return;
  PROFILE_KEYS.forEach(function(k){ if (p[k] !== undefined) state[k] = p[k]; });
  state.diferencovany = p.diferencovany || 'NE';
  if (state.diferencovany === 'NE') {
    state.skupiny = [];
  } else if (p.skupinyCount > 0) {
    state.skupiny = [];
    const names = p.skupinyNazvy || [];
    for (let i = 0; i < p.skupinyCount; i++) {
      state.skupiny.push({ id: groupIdCounter++, nazev: names[i] || ('Skupina ' + (i + 1)), podminky: '', studenti: [] });
    }
  }
}

async function saveTemplate() {
  const name = await uiPrompt('Název šablony', trim('nazev') || 'Moje šablona');
  if (!name) return;
  const why = await uiPrompt('Logika šablony (nepovinné — krátký popis účelu šablony)', '');
  const tpls = loadTemplates();
  tpls.push({ id: Date.now(), name, why: why || '', format: 'profile_v1', profile: getTemplateProfile(), ts: Date.now() });
  if (!saveTemplates(tpls)) return;
  renderTemplates();
  flashSave();
  uiToast('Šablona uložena — ukládá pedagogický profil (mód, zpětná vazba, hodnocení, diferenciace). Cvičení, čas a jazyk zůstávají na tobě.', 'ok', 5000);
}

function loadTemplate(id) {
  const tpls = loadTemplates();
  const tpl = tpls.find(t => t.id === id);
  if (!tpl) return;
  if (tpl.format === 'profile_v1') {
    // Nový selektivní formát — aplikuje jen pedagogický profil, nedotkne se cvičení, času ani jazyka.
    applyTemplateProfile(tpl.profile);
    enforceModeConstraints();
    normalizeLoadedState(state);
    applyVisualState();
    if (typeof renderGroups === 'function') renderGroups();
    if (typeof renderTeacherMapping === 'function') renderTeacherMapping();
    validate();
    saveSnapshot();
    uiToast('Šablona „' + esc(tpl.name) + '“ aplikována — cvičení, čas a jazyk jsou beze změny.', 'ok', 3500);
  } else {
    // Starý plný formát — zpětná kompatibilita: obnoví vše jako dřív.
    Object.assign(state, tpl.state);
    if (!state.urls?.length) state.urls = [''];
    fileObjects = [];
    fileReadPromises = [];
    state.fileNames = [];
    showFileError('');
    if (state.zadaniTab === 'file' && state.fileNames.length === 0) state.zadaniTab = 'text';
    if (!state.layout) state.layout = 'tabs';
    if (!state.resultMode) state.resultMode = 'instant';
    normalizeLoadedState(state);
    enforceModeConstraints();
    Object.entries(tpl.dom || {}).forEach(([k,v]) => setVal(k, v));
    SENSITIVE_FIELD_IDS.forEach(id => setVal(id, ''));
    maxStep = 0;
    goTo(0);
    applyVisualState();
    validate();
  }
}

// ═══ PŘENOS ZADÁNÍ MEZI KOLEGY ════════════════════════════════════════════════
// Export/import celé konfigurace formuláře do .json souboru. Stejný tvar jako snapshot
// (dom + state), bez hesel/PINů (nejsou v DOM_FIELDS) a bez nahraných souborů (binárky
// se neukládají). Použití: kolega bez volných AI requestů vyplní zadání, exportuje ho a
// pošle, druhý učitel ho načte a vygeneruje test na svém klíči/kvótě.
function buildZadaniExport(){
  const dom = {};
  DOM_FIELDS.forEach(id => { dom[id] = val(id); });
  return {
    __type: 'generator-testu-zadani',
    formatVersion: 1,
    appVersion: RELEASE.version,
    exportedAt: new Date().toISOString(),
    dom,
    state: getStoredState()
  };
}
function exportZadani(){
  try{
    const data = buildZadaniExport();
    const slug = (trim('nazev') || 'zadani').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'zadani';
    const ts = new Date().toISOString().slice(0,10);
    downloadBlobFile(JSON.stringify(data, null, 2), 'zadani_' + slug + '_' + ts + '.json', 'application/json;charset=utf-8');
    const hasFiles = Array.isArray(state.fileNames) && state.fileNames.length > 0;
    uiToast(hasFiles
      ? 'Zadání exportováno. POZOR: nahrané soubory (audio/PDF/obrázky) se do souboru nepřenášejí — pošli je kolegovi zvlášť.'
      : 'Zadání exportováno do souboru. Pošli ho kolegovi (e-mailem / Teams), který má volné AI požadavky.', hasFiles ? 'warn' : 'ok', 6500);
  }catch(err){
    uiToast('Export zadání selhal: ' + (err && err.message ? err.message : err), 'warn');
  }
}
async function importZadaniFile(inp){
  const f = inp && inp.files && inp.files[0];
  if (!f){ return; }
  try{
    const raw = await readBlobAsText(f);
    const data = JSON.parse(raw);
    if (!data || data.__type !== 'generator-testu-zadani' || !data.state){
      uiToast('Tento soubor není exportované zadání generátoru (.json). Zkontroluj, že posíláš správný soubor.', 'warn', 6000);
      return;
    }
    const ok = await uiConfirm('Načíst zadání ze souboru? Přepíše tvoje aktuální rozpracované nastavení formuláře.', 'Načíst zadání od kolegy?', true);
    if (!ok) return;
    applyImportedZadani(data);
    uiToast('Zadání načteno' + (data.appVersion ? ' (verze ' + esc(String(data.appVersion)) + ')' : '') + '. Hesla a učitelský PIN se nepřenášejí — nastav je před generováním. Týmový bezpečnostní kód se na tomto zařízení doplnil sám, pokud ho tu máš uložený (jinak ho vlož / načti). Nahrané soubory případně přilož ručně.', 'ok', 8000);
  }catch(err){
    uiToast('Soubor se nepodařilo načíst: ' + (err && err.message ? err.message : err), 'warn', 6000);
  }finally{
    if (inp) inp.value = '';
  }
}
function applyImportedZadani(data){
  Object.assign(state, data.state || {});
  if (!state.urls || !state.urls.length) state.urls = [''];
  fileObjects = [];
  fileReadPromises = [];
  state.fileNames = [];
  if (state.zadaniTab === 'file') state.zadaniTab = 'text';  // nahrané soubory se nepřenášejí
  if (!state.exerciseConfig) state.exerciseConfig = [];
  if (typeof state.exerciseDetail !== 'boolean') state.exerciseDetail = false;
  if (!state.tema) state.tema = 'modern';
  if (!state.resultMode) state.resultMode = 'instant';
  if (!state.layout) state.layout = 'tabs';
  normalizeLoadedState(state);
  enforceModeConstraints();
  Object.entries(data.dom || {}).forEach(([k,v]) => setVal(k, v));
  SENSITIVE_FIELD_IDS.forEach(id => setVal(id, ''));
  autoApplyStoredSecurityCode();   // na vlastním zařízení vrať uložený týmový kód
  if (typeof showFileError === 'function') showFileError('');
  maxStep = 0;
  goTo(0);
  applyVisualState();
  if (typeof renderGroups === 'function') renderGroups();
  if (typeof renderTeacherMapping === 'function') renderTeacherMapping();
  validate();
  saveSnapshot();
}

async function deleteTemplate(id) {
  const ok = await uiConfirm('Smazat šablonu?', 'Smazat šablonu?', true);
  if (!ok) return;
  saveTemplates(loadTemplates().filter(t => t.id !== id));
  renderTemplates();
}

function renderTemplates() {
  const tpls = loadTemplates();
  const strip = $('templatesStrip');
  const list = $('tplList');
  const count = $('tplCount');
  if (!tpls.length) { strip.classList.add('hidden'); return; }
  strip.classList.remove('hidden');
  count.textContent = '(' + tpls.length + ')';
  const RL = { instant:'\u26a1 okamžitá zn\u00e1mka', secureOffline:'\ud83d\udd12 verifier' };
  const FL = { none:'bez zpět. vazby', brief:'stručná zpět. vazba', learning:'učící zpět. vazba' };
  const DL = { basic:'podpora', challenge:'challenge' };
  list.innerHTML = tpls.map(function(t) {
    const isNew = t.format === 'profile_v1';
    const p = t.profile || {};
    const badges = [];
    if (isNew) {
      if (RL[p.resultMode]) badges.push(RL[p.resultMode]);
      if (FL[p.feedbackMode]) badges.push(FL[p.feedbackMode]);
      if (DL[p.differentiationLevel]) badges.push(DL[p.differentiationLevel]);
      if (p.diferencovany === 'ANO' && p.skupinyCount > 0) badges.push(p.skupinyCount + '\u00a0skupiny');
    }
    return '<div class="tpl-card">'
      + '<div class="tpl-card-head">'
      + '<span class="tpl-card-name">' + esc(t.name) + '</span>'
      + '<div class="tpl-card-btns">'
      + '<button class="tpl-load" onclick="loadTemplate(' + t.id + ')" title="Aplikovat šablonu">' + (isNew ? 'Aplikovat' : '\ud83d\udcc4 Načíst (starý formát)') + '</button>'
      + '<button class="tpl-del" onclick="deleteTemplate(' + t.id + ')" title="Smazat šablonu">\u2715</button>'
      + '</div>'
      + '</div>'
      + (badges.length ? '<div class="tpl-badges">' + badges.map(function(b){ return '<span class="tpl-badge">' + esc(b) + '</span>'; }).join('') + '</div>' : '')
      + (t.why ? '<div class="preset-modal-why" style="margin-top:7px"><strong>Logika šablony:</strong> ' + esc(t.why) + '</div>' : '')
      + (!isNew ? '<div class="tpl-old-note">Starý formát (obnoví vše vč. cvičení). Ulož znovu pro nový selektivní formát.</div>' : '')
      + '</div>';
  }).join('');
}

// ═══ History ══════════════════════════════════════════════════════════════════
function loadHistory() {
  return readArr(HIST_KEY);
}
function pushHistory(prompt) {
  try {
    // Prompt je od v7 pseudonymizovaný už při sestavení; sanitizace je druhá pojistka.
    const promptForHistory = prompt;
    const safePrompt = sanitizePromptForStorage(promptForHistory);
    const hash = shortHash(safePrompt);
    let hist = loadHistory().filter(h => h && h.hash !== hash);
    const nazev = trim('nazev') || 'Bez názvu';
    const jazyk = languageText();
    const histDom = {};
    DOM_FIELDS.forEach(id => { histDom[id] = val(id); });
    hist.unshift({ ts: Date.now(), name: nazev, jazyk, uroven: cefrLabel(), prompt: safePrompt, hash, sanitized: true, state: getStoredState(), dom: histDom });
    saveHistory(hist.slice(0, 5));
  } catch(_){ }
}
function saveHistory(hist) {
  return safeSetItem(HIST_KEY, JSON.stringify(hist));
}
async function clearHistory() {
  const ok = await uiConfirm('Vymazat historii promptů v tomto prohlížeči?', 'Vymazat historii?', true);
  if (!ok) return;
  saveHistory([]);
  renderHistory();
}

function renderHistory() {
  const hist = loadHistory();
  const sec = $('historySection');
  if (!sec) return;
  if (!hist.length) { sec.innerHTML = ''; return; }
  const listHtml = hist.map((h, i) => `
    <div class="hist-item">
      <div class="hist-info">
        <div class="hist-name">📄 ${esc(h.name || 'Bez názvu')}</div>
        <div class="hist-meta">${esc(h.jazyk || '')} · ${esc(h.uroven || '')} · ${esc(new Date(h.ts).toLocaleDateString('cs-CZ'))} · očištěno</div>
      </div>
      <div class="hist-actions">
        ${h && h.state ? `<button class="btn-hist-load" type="button" onclick="loadFromHistory(${i})">↻ Načíst do generátoru</button>` : ''}
        <button class="btn-hist-copy" type="button" onclick="copyHistItem(${i})">📋 Kopírovat prompt</button>
      </div>
    </div>`).join('');
  sec.innerHTML = `
    <div class="history-section">
      <button class="history-toggle" type="button" onclick="toggleHistory(this)">
        <span>📋 Nedávné prompty (${hist.length})</span><span>▾</span>
      </button>
      <div class="history-list hidden" id="histList">${listHtml}
        <button class="btn-outline" type="button" onclick="clearHistory()" style="margin-top:4px">🧹 Vymazat historii</button>
      </div>
    </div>`;
}

function toggleHistory(btn) {
  const list = $('histList');
  if (!list) return;
  const isOpen = !list.classList.contains('hidden');
  list.classList.toggle('hidden', isOpen);
  btn.querySelector('span:last-child').textContent = isOpen ? '▾' : '▴';
}

function copyHistItem(i) {
  const h = loadHistory()[i];
  if (!h) return;
  const text = h.prompt || '';
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => uiToast('Očištěný prompt zkopírován. Hesla/PIN nejsou v historii uložené.', 'ok', 4200)).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

async function loadFromHistory(i) {
  const h = loadHistory()[i];
  if (!h || !h.state) {
    await uiAlert('Tato položka historie ještě neobsahuje uložené nastavení (vznikla ve starší verzi). Použij „Kopírovat prompt".');
    return;
  }
  const ok = await uiConfirm('Načíst toto nastavení do generátoru? Aktuální rozpracovaný test bude přepsán.', 'Načíst z historie?', true);
  if (!ok) return;
  Object.assign(state, h.state);
  if (!state.urls?.length) state.urls = [''];
  // Historie neukládá přílohy ani hesla/PIN — vyčistíme runtime stav i UI.
  fileObjects = [];
  fileReadPromises = [];
  state.fileNames = [];
  showFileError('');
  if (state.zadaniTab === 'file' && state.fileNames.length === 0) state.zadaniTab = 'text';
  if (!state.layout) state.layout = 'tabs';
  if (!state.resultMode) state.resultMode = 'instant';
  normalizeLoadedState(state);
  enforceModeConstraints();
  Object.entries(h.dom || {}).forEach(([k, v]) => setVal(k, v));
  SENSITIVE_FIELD_IDS.forEach(id => setVal(id, ''));
  maxStep = 4;            // vše už vyplněné → povol skákání po krocích nahoře
  goTo(1);               // rovnou do úprav (zadání / cvičení)
  applyVisualState();
  validate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

