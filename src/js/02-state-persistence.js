// Normalizace načteného stavu.
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
  if (s.fuzzyTolerance !== 'mild' && s.fuzzyTolerance !== 'strict') s.fuzzyTolerance = 'off';
  if (s.jazyk === '__jine__') s.jazyk = '';
  // ── Pedagogicko-didaktická vrstva: doplň bezpečné defaulty pro starší data ──
  if (typeof s.ageGroup !== 'string') s.ageGroup = '';
  if (typeof s.ageGroupCustom !== 'string') s.ageGroupCustom = '';
  if (typeof s.testPurpose !== 'string') s.testPurpose = '';
  if (typeof s.simpleTemplate !== 'string') s.simpleTemplate = '';
  const legacyPurposeMap = { fl_homework:'fl_practice', fl_graded_quick:'fl_standard', cs_text:'cs_practice' };
  if (legacyPurposeMap[s.simpleTemplate]) s.simpleTemplate = legacyPurposeMap[s.simpleTemplate];
  if (s.simpleTemplate && !(SIMPLE_TEMPLATES.fl[s.simpleTemplate] || SIMPLE_TEMPLATES.cs[s.simpleTemplate])) s.simpleTemplate = '';
  if (['auto','content','vocabulary','grammar','model','combined'].indexOf(s.sourceUseMode) === -1) s.sourceUseMode = 'auto';
  if (s.appMode !== 'advanced') s.sourceUseMode = 'auto';
  if (typeof s.screenGuard !== 'boolean') s.screenGuard = false;
  if (['none','brief','learning'].indexOf(s.feedbackMode) === -1) s.feedbackMode = 'brief';
  if (['basic','standard','challenge'].indexOf(s.differentiationLevel) === -1) s.differentiationLevel = 'standard';
  s.readingQuestionCount = Math.max(1, Math.min(30, parseInt(s.readingQuestionCount,10) || 4));
  s.listeningQuestionCount = Math.max(1, Math.min(30, parseInt(s.listeningQuestionCount,10) || 4));
  if (s.exercisePedagogyMap === undefined) s.exercisePedagogyMap = null;
  if (s.didacticReview === undefined) s.didacticReview = null;
  if (s.splitGenerate === undefined) s.splitGenerate = false;
  if (s.manualMode === undefined) s.manualMode = false;
  if (Array.isArray(s.exerciseConfig)) s.exerciseConfig.forEach(function(ex){ if (ex.manualMode === undefined) ex.manualMode = false; });

  if (s.exerciseDetail && Array.isArray(s.exerciseConfig) && s.exerciseConfig.length) {
    s.pocet = Math.min(10, s.exerciseConfig.length);
    s.exerciseConfig = s.exerciseConfig.slice(0, s.pocet);
  } else {
    const loadedTypes = sanitizeExerciseTypeList(s.typyCviceni || []).slice(0, 10);
    if (loadedTypes.length) {
      s.typyCviceni = loadedTypes;
      s.pocet = loadedTypes.length;
    }
  }
  return s;
}

// Křížové závislosti stavu.
function enforceModeConstraints() {
  // Ověřovací panel odebrán z UI; vždy NE.
  state.overeni = 'NE';
  // ČJ vyžaduje advanced, pokud skryté volby neřídí jednoduchá šablona.
  if (String(state.jazyk || '').toLowerCase() === 'čeština' && isSimpleMode() && !state.simpleTemplate) {
    state.appMode = 'advanced'; state.workPreset = 'advanced';
  }
  // Přísný test → bezpečný offline verifier je povinný.
  if (state.testMode === 'prisny') {
    state.resultMode = 'secureOffline';
    state.odevzdavani = 'B';
  }
  if (state.testMode === 'procviceci') {
    state.resultMode = 'instant';
    state.feedbackMode = 'learning';
    state.zolicek = 'NE';
  }
  if ((state.resultMode || 'instant') === 'secureOffline') {
    state.odevzdavani = 'B';
    state.feedbackMode = 'none';
    if (isSimpleMode() && !state.simpleTemplate) { state.appMode = 'advanced'; state.workPreset = 'advanced'; }
  }
  // Bez okamžité zpětné vazby nelze použít průběžné odevzdávání.
  if (state.feedbackMode === 'none') state.odevzdavani = 'B';
  if (state.resultMode === 'instant' && state.testMode === 'prisny') {
    state.resultMode = 'secureOffline';
    state.odevzdavani = 'B';
  }
  if (state.diferencovany === 'ANO' && isSimpleMode()) {
    state.appMode = 'advanced';
    state.workPreset = 'advanced';
  }
  if (isSimpleMode()) applySimpleDefaults();
}

function getSecurityGuideState(){
  const secure = (state.resultMode || 'instant') === 'secureOffline';
  const strict = state.testMode === 'prisny';
  const forms = secure && typeof configuredGoogleFormsUrl === 'function' && !!configuredGoogleFormsUrl();
  if (secure) {
    const handoff = forms
      ? 'student po dokončení zkopíruje šifrovaný SECURE-ANSWERS-V1 blok do školního Google Formu; answers.txt zůstává nouzová záloha'
      : 'student po dokončení odevzdá šifrovaný answers.txt';
    return {
      profile:'secure',
      label: strict ? '🔒 Aktuálně: přísný test + bezpečný offline verifier' : '🛡️ Aktuálně: bezpečný offline + učitelský verifier',
      help: (strict ? '<strong>Přísný test + bezpečný offline:</strong> ' : '<strong>Bezpečný offline:</strong> ')
        + 'studentský soubor neobsahuje správné odpovědi; ' + handoff + '. Známku spočítá teacher_verifier.html.',
      note: (strict
        ? '<strong>Logika přísného režimu:</strong> test se může zamknout při opuštění okna/karty. '
        : '<strong>Distribuce:</strong> studentům posílej pouze studentský test. ')
        + (forms
          ? '<strong>Předání výsledků:</strong> Google Forms je pouze sběrná schránka; opravuje až teacher_verifier.html z CSV. '
          : '<strong>Předání výsledků:</strong> student odevzdá answers.txt. ')
        + '<strong>Teacher verifier zůstává jen učiteli.</strong>'
    };
  }
  return {
    profile:'instant',
    label: state.testMode === 'procviceci' ? '💬 Aktuálně: procvičování s okamžitou zpětnou vazbou' : '⚡ Aktuálně: okamžitý výsledek + screenshot',
    help:'<strong>Okamžitý výsledek:</strong> student po odevzdání hned vidí body, procenta a známku. Je to nejpohodlnější režim, ale studentský HTML obsahuje hodnoticí logiku.',
    note:'<strong>Předání výsledku učiteli:</strong> prakticky screenshot výsledkové karty. Pro bezpečnější klasifikaci použij secure režim.'
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
  const ids = ['instrJazykBtns','layoutBtns','resultModeBtns','randomBtns','gradeSkola','themeGrid','zolicekBtns','diffBtns','diffLevelBtns','fuzzyBtns','feedbackModeBtns','identityModeBtns'];
  const rosterF = $('rosterField'); if (rosterF) rosterF.classList.add('advanced-only');
  ids.forEach(id => { const el = $(id); const f = el && el.closest ? el.closest('.field') : null; if (f) f.classList.add('advanced-only'); });
  const varA = $('varA'); const subField = varA && varA.closest ? varA.closest('.field') : null; if (subField) subField.classList.add('advanced-only');
  // Počet položek/body zůstávají dostupné i v Simple.
  const btnEx = $('btnExDetail'); if (btnEx) btnEx.classList.remove('advanced-only');
}

// Advanced UI přesouvá existující .field uzly; nekopíruje je.
const ADVANCED_SETTINGS_GROUPS = [
  { id:'advancedGroupTest', icon:'🧪', title:'Test', desc:'Čas, odevzdávání, body a stupnice hodnocení. Účel/režim testu se volí společně už v předchozím kroku.', fields:['timeField','strictRiskField','submissionModeField','globalBodyField','gradeField'] },
  { id:'advancedGroupStudent', icon:'🧑‍🎓', title:'Student', desc:'Identita, roster, diferenciace a pořadí otázek.', fields:['identityModeField','rosterField','diffLevelField','diffField','randomField'] },
  { id:'advancedGroupFeedback', icon:'💬', title:'Zpětná vazba', desc:'Kolik student uvidí po odevzdání a jak přísně se hodnotí překlepy.', fields:['feedbackModeField','fuzzyField'] },
  { id:'advancedGroupSecurity', icon:'🛡️', title:'Bezpečnost', desc:'Zpracování výsledků, hlídání obrazovky a ochrana opakovaného pokusu.', fields:['resultModeField','screenGuardField','attemptProtectionInfo'] },
  { id:'advancedGroupAppearance', icon:'🎨', title:'Vzhled', desc:'Rozložení a vizuální téma výsledného studentského testu.', fields:['layoutField','themeField'] }
];

function ensureAdvancedLayoutPlaceholders(){
  ADVANCED_SETTINGS_GROUPS.forEach(group => group.fields.forEach(id => {
    const el=$(id); if(!el || el.dataset.advancedLayoutBound==='1') return;
    const ph=document.createElement('span');
    ph.hidden=true;
    ph.dataset.advancedLayoutPlaceholder=id;
    ph.setAttribute('aria-hidden','true');
    el.parentNode.insertBefore(ph,el);
    el.dataset.advancedLayoutBound='1';
  }));
}

function ensureAdvancedSettingsRoot(){
  let root=$('advancedSettingsGroups');
  if(root) return root;
  const step2=$('step2'); if(!step2) return null;
  root=document.createElement('div');
  root.id='advancedSettingsGroups';
  root.className='advanced-settings-groups';

  const intro=document.createElement('div');
  intro.className='advanced-settings-intro';
  const title=document.createElement('div'); title.className='advanced-settings-intro-title'; title.textContent='Pokročilá nastavení';
  const text=document.createElement('div'); text.className='advanced-settings-intro-text'; text.textContent='Stejné volby jako dosud, jen seskupené podle toho, co skutečně řídí.';
  const nav=document.createElement('div'); nav.className='advanced-settings-nav'; nav.setAttribute('aria-label','Sekce pokročilých nastavení');
  intro.appendChild(title); intro.appendChild(text); intro.appendChild(nav); root.appendChild(intro);

  ADVANCED_SETTINGS_GROUPS.forEach(group => {
    const section=document.createElement('section'); section.id=group.id; section.className='advanced-config-group';
    const head=document.createElement('div'); head.className='advanced-config-group-head';
    const label=document.createElement('div'); label.className='advanced-config-group-title'; label.textContent=group.icon+' '+group.title;
    const desc=document.createElement('div'); desc.className='advanced-config-group-desc'; desc.textContent=group.desc;
    head.appendChild(label); head.appendChild(desc); section.appendChild(head); root.appendChild(section);

    const btn=document.createElement('button'); btn.type='button'; btn.className='advanced-settings-nav-btn'; btn.textContent=group.icon+' '+group.title;
    btn.addEventListener('click',()=>section.scrollIntoView({behavior:'smooth',block:'start'}));
    nav.appendChild(btn);
  });
  const stepNav=step2.querySelector(':scope > .nav');
  if(stepNav) step2.insertBefore(root,stepNav); else step2.appendChild(root);
  return root;
}

function restoreSimpleSettingsLayout(){
  ADVANCED_SETTINGS_GROUPS.forEach(group => group.fields.forEach(id => {
    const el=$(id); if(!el) return;
    const ph=document.querySelector('[data-advanced-layout-placeholder="'+id+'"]');
    if(ph && ph.parentNode) ph.parentNode.insertBefore(el,ph.nextSibling);
  }));
  const root=$('advancedSettingsGroups'); if(root) root.classList.add('hidden');
}

function organizeAdvancedSettings(){
  ensureAdvancedLayoutPlaceholders();
  const root=ensureAdvancedSettingsRoot(); if(!root) return;
  if(isSimpleMode()){ restoreSimpleSettingsLayout(); return; }
  root.classList.remove('hidden');
  ADVANCED_SETTINGS_GROUPS.forEach(group => {
    const section=$(group.id); if(!section) return;
    group.fields.forEach(id => { const el=$(id); if(el) section.appendChild(el); });
  });
}

function updateAppModeUI(){
  const simple = isSimpleMode();
  document.body.classList.toggle('simple-mode', simple);
  document.body.classList.toggle('advanced-mode', !simple);
  organizeAdvancedSettings();
  document.querySelectorAll('#appModeBtns .mode-pill').forEach(b => b.classList.toggle('active', b.dataset.val === (simple ? 'simple' : 'advanced')));
  const summary = $('appModeSummary');
  if (summary) {
    summary.textContent = simple
      ? 'Vyber jen účel testu. Režim, zpětnou vazbu a bezpečnostní chování nastaví Generátor automaticky.'
      : 'Pokročilá nastavení: technické volby jsou viditelné a můžeš je řídit ručně.';
  }
  const tplLabel = $('simpleTemplateLabelText');
  const tplHint = $('simpleTemplateHint');
  const tplTip = $('simpleTemplateTip');
  if (tplLabel) tplLabel.textContent = 'K čemu má test sloužit?';
  if (tplHint) tplHint.textContent = simple
    ? 'Vyber jednu ze tří možností. Ostatní technické nastavení udělá Generátor za tebe.'
    : 'Stejná volba jako v jednoduchém režimu. Nastaví výchozí chování testu; podrobnosti níže můžeš dál upravit.';
  if (tplTip) tplTip.dataset.tip = simple
    ? 'Vyber účel: procvičování, běžný test nebo přísný test. Generátor podle toho automaticky nastaví technické volby, které se zde nezobrazují.'
    : 'Účel testu je společný pro oba režimy. V pokročilém režimu pouze předvyplní technické volby; další nastavení zůstávají dostupná níže.';
  const exDetailBtn = $('btnExDetail');
  if (exDetailBtn) {
    const label = exDetailBtn.querySelector('span:first-child');
    if (label) label.textContent = simple ? '⚙️ Upravit položky a body' : '⚙️ Nastavit cvičení podrobně';
    exDetailBtn.title = simple
      ? 'Volitelné: nastav u každého cvičení počet položek a body. Ostatní technické volby zůstávají automatické.'
      : 'Nastav jednotlivá cvičení podrobně včetně typu, počtu úloh, bodů a případného ručního zadání.';
  }
  updateSimpleSecretsHelper();
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
function normalizeGoogleFormsResponderUrl(raw){
  const text = String(raw || '').trim();
  if (!text) return '';
  let u;
  try { u = new URL(text); }
  catch(_) { throw new TypeError('Odkaz na Google Form není platná URL.'); }
  if (u.protocol !== 'https:') throw new TypeError('Google Form musí používat zabezpečený odkaz https://.');
  const host = String(u.hostname || '').toLowerCase();
  if (host === 'forms.gle') {
    if (!u.pathname || u.pathname === '/') throw new TypeError('Zkrácený odkaz forms.gle není úplný.');
    return u.toString();
  }
  if (host === 'docs.google.com') {
    if (!/^\/forms\/(?:u\/\d+\/)?d(?:\/e)?\/[^/]+\/viewform\/?$/i.test(u.pathname || '')) {
      if (/\/forms\/.*\/edit\/?$/i.test(u.pathname || '')) throw new TypeError('Tohle je editor formuláře. V Google Forms zkopíruj odkaz určený respondentům (viewform / Publikovat → odkaz pro respondenty).');
      throw new TypeError('Použij responder odkaz Google Forms končící /viewform.');
    }
    return u.toString();
  }
  throw new TypeError('Z bezpečnostních důvodů lze použít pouze docs.google.com/forms nebo forms.gle.');
}
function storedGoogleFormsUrlValue(){
  try { return localStorage.getItem(GOOGLE_FORMS_SUBMISSION_URL_KEY) || ''; }
  catch(_) { return ''; }
}
function configuredGoogleFormsUrl(){
  try { return normalizeGoogleFormsResponderUrl(storedGoogleFormsUrlValue()); }
  catch(_) { return ''; }
}
const GOOGLE_FORMS_METADATA_PLACEHOLDERS = Object.freeze({
  testId:'GIT_TEST_ID',
  testName:'GIT_TEST_NAME',
  group:'GIT_GROUP',
  generatorVersion:'GIT_GENERATOR_VERSION',
  generatedAt:'GIT_GENERATED_AT'
});
function validGoogleFormsEntryId(value){ return /^\d{1,20}$/.test(String(value||'')); }
function storedGoogleFormsMetadataValue(){
  try { return localStorage.getItem(GOOGLE_FORMS_METADATA_CONFIG_KEY) || ''; }
  catch(_) { return ''; }
}
function normalizeStoredGoogleFormsMetadata(value){
  const raw = value && typeof value === 'object' ? value : {};
  const responderUrl = normalizeGoogleFormsResponderUrl(raw.responderUrl || '');
  if (!responderUrl || !/^https:\/\/docs\.google\.com\/forms\//i.test(responderUrl)) throw new TypeError('Metadata vyžadují plný responder odkaz docs.google.com/forms.');
  const entries = raw.entries && typeof raw.entries === 'object' ? raw.entries : {};
  const cleanEntries = {};
  for (const key of Object.keys(GOOGLE_FORMS_METADATA_PLACEHOLDERS)) {
    const id = String(entries[key] || '');
    if (id) {
      if (!validGoogleFormsEntryId(id)) throw new TypeError('Neplatné Google Forms entry ID pro '+key+'.');
      cleanEntries[key] = id;
    }
  }
  for (const required of ['testId','testName','group']) {
    if (!cleanEntries[required]) throw new TypeError('Chybí povinné metadata pole '+required+'.');
  }
  return {v:1,responderUrl,entries:cleanEntries};
}
function configuredGoogleFormsMetadata(){
  try {
    const raw = storedGoogleFormsMetadataValue();
    if (!raw) return null;
    return normalizeStoredGoogleFormsMetadata(JSON.parse(raw));
  } catch(_) { return null; }
}
function parseGoogleFormsPrefilledMetadataUrl(raw){
  const text=String(raw||'').trim();
  if(!text) throw new TypeError('Vlož předvyplněný odkaz z Google Forms.');
  let u; try{u=new URL(text);}catch(_){throw new TypeError('Předvyplněný Google Forms odkaz není platná URL.');}
  if(u.protocol!=='https:'||String(u.hostname||'').toLowerCase()!=='docs.google.com') throw new TypeError('Pro načtení metadata polí použij plný předvyplněný odkaz z docs.google.com/forms.');
  if(!/^\/forms\/(?:u\/\d+\/)?d(?:\/e)?\/[^/]+\/viewform\/?$/i.test(u.pathname||'')) throw new TypeError('Použij předvyplněný responder odkaz Google Forms končící /viewform.');
  const found={};
  for(const [param,value] of u.searchParams.entries()){
    const m=/^entry\.(\d{1,20})$/.exec(param);
    if(!m) continue;
    const clean=String(value||'').trim();
    for(const [key,placeholder] of Object.entries(GOOGLE_FORMS_METADATA_PLACEHOLDERS)){
      if(clean===placeholder){
        if(found[key]&&found[key]!==m[1]) throw new TypeError('Placeholder '+placeholder+' je v odkazu vícekrát.');
        found[key]=m[1];
      }
    }
  }
  for(const required of ['testId','testName','group']){
    if(!found[required]) throw new TypeError('V předvyplněném odkazu chybí placeholder '+GOOGLE_FORMS_METADATA_PLACEHOLDERS[required]+'.');
  }
  const base=new URL(u.toString());
  [...base.searchParams.keys()].forEach(k=>{ if(/^entry\.\d+$/.test(k)) base.searchParams.delete(k); });
  base.searchParams.delete('usp');
  return normalizeStoredGoogleFormsMetadata({v:1,responderUrl:base.toString(),entries:found});
}
function syncGeneratorSettingsFormsInput(){
  const input = $('generatorSettingsFormsInput');
  if (input) input.value = storedGoogleFormsUrlValue();
  const metaInput = $('generatorSettingsPrefilledInput');
  if (metaInput) metaInput.value = '';
  updateGeneratorSettingsMetadataStatus();
}
function updateGeneratorSettingsFormsStatus(){
  const status = $('generatorSettingsFormsStatus');
  if (!status) return;
  const input = $('generatorSettingsFormsInput');
  const raw = input ? input.value : storedGoogleFormsUrlValue();
  if (!String(raw || '').trim()) {
    status.textContent = '🟢 Předání výsledku: answers.txt. Google Forms nejsou na tomto zařízení zapnuté.';
    return;
  }
  try {
    const clean = normalizeGoogleFormsResponderUrl(raw);
    const stored = storedGoogleFormsUrlValue();
    status.textContent = stored && clean === configuredGoogleFormsUrl()
      ? '🟢 Primární předání: Google Forms. answers.txt zůstává nouzová záloha.'
      : '🟡 Responder odkaz je platný, ale změna ještě není uložena.';
  } catch(e) {
    status.textContent = '🔴 ' + String(e && e.message ? e.message : e);
  }
}
function updateGeneratorSettingsMetadataStatus(){
  const status=$('generatorSettingsMetadataStatus');
  if(!status) return;
  const cfg=configuredGoogleFormsMetadata();
  if(cfg){
    const optional=['generatorVersion','generatedAt'].filter(k=>cfg.entries[k]).length;
    status.textContent='🟢 Automatická metadata jsou nastavena: Test ID, název testu, skupina'+(optional?' + '+optional+' volitelné pole/pole.':'.');
    status.className='secure-mode-box';
    return;
  }
  status.textContent='⚪ Automatická metadata nejsou nastavena. Secure test použije současný Forms workflow bez metadata.';
  status.className='secure-mode-box';
}
async function saveGoogleFormsUrlLocal(){
  const input = $('generatorSettingsFormsInput');
  const raw = input ? input.value : '';
  let clean;
  try { clean = normalizeGoogleFormsResponderUrl(raw); }
  catch(e) { await uiAlert(String(e && e.message ? e.message : e), 'Neplatný Google Forms odkaz'); updateGeneratorSettingsFormsStatus(); return; }
  if (!clean) { await uiAlert('Vlož responder odkaz na Google Form. Pokud chceš používat answers.txt, zvol „Používat jen answers.txt“.', 'Chybí odkaz'); return; }
  try {
    if(!generatorPersistenceAllowed()) return;
    const oldMeta=configuredGoogleFormsMetadata();
    localStorage.setItem(GOOGLE_FORMS_SUBMISSION_URL_KEY, clean);
    if(oldMeta&&oldMeta.responderUrl!==clean) localStorage.removeItem(GOOGLE_FORMS_METADATA_CONFIG_KEY);
    if (input) input.value = clean;
    updateGeneratorSettingsFormsStatus();
    updateGeneratorSettingsMetadataStatus();
    if (typeof updateSecurityGuideUI === 'function') updateSecurityGuideUI();
    uiToast('Google Forms jsou nastavené jako primární cesta pro nově generované secure testy. answers.txt zůstává záloha.', 'ok', 5200);
  } catch(_) { await uiAlert('Odkaz se nepodařilo uložit. Prohlížeč možná blokuje localStorage.'); }
}
async function saveGoogleFormsMetadataFromPrefilledUrl(){
  const input=$('generatorSettingsPrefilledInput');
  let cfg;
  try{cfg=parseGoogleFormsPrefilledMetadataUrl(input?input.value:'');}
  catch(e){await uiAlert(String(e&&e.message?e.message:e),'Metadata Google Forms');updateGeneratorSettingsMetadataStatus();return;}
  try{
    if(!generatorPersistenceAllowed()) return;
    localStorage.setItem(GOOGLE_FORMS_METADATA_CONFIG_KEY,JSON.stringify(cfg));
    localStorage.setItem(GOOGLE_FORMS_SUBMISSION_URL_KEY,cfg.responderUrl);
    const urlInput=$('generatorSettingsFormsInput'); if(urlInput) urlInput.value=cfg.responderUrl;
    if(input) input.value='';
    updateGeneratorSettingsFormsStatus();
    updateGeneratorSettingsMetadataStatus();
    if(typeof updateSecurityGuideUI==='function') updateSecurityGuideUI();
    uiToast('Metadata Google Forms jsou nastavena jednorázově pro další secure testy.','ok',5200);
  }catch(_){await uiAlert('Nastavení metadata polí se nepodařilo uložit.');}
}
async function forgetGoogleFormsMetadataLocal(){
  try{
    localStorage.removeItem(GOOGLE_FORMS_METADATA_CONFIG_KEY);
    updateGeneratorSettingsMetadataStatus();
    uiToast('Automatická metadata Google Forms byla vypnuta. Základní Forms workflow zůstává aktivní.','ok',4200);
  }catch(_){await uiAlert('Nastavení metadata polí se nepodařilo změnit.');}
}
async function forgetGoogleFormsUrlLocal(){
  try {
    localStorage.removeItem(GOOGLE_FORMS_SUBMISSION_URL_KEY);
    localStorage.removeItem(GOOGLE_FORMS_METADATA_CONFIG_KEY);
    syncGeneratorSettingsFormsInput();
    updateGeneratorSettingsFormsStatus();
    if (typeof updateSecurityGuideUI === 'function') updateSecurityGuideUI();
    uiToast('Google Forms byly vypnuté. Nové secure testy použijí answers.txt.', 'ok', 4200);
  } catch(_) { await uiAlert('Nastavení se nepodařilo změnit.'); }
}
function openGeneratorSettings(){
  const modal = $('generatorSettingsModal');
  if (!modal) return;
  syncGeneratorSettingsFormsInput();
  updateGeneratorSettingsFormsStatus();
  modal.classList.remove('hidden');
  const input = $('generatorSettingsFormsInput');
  if (input) setTimeout(() => input.focus(), 0);
}
function closeGeneratorSettings(){
  const modal = $('generatorSettingsModal');
  if (modal) modal.classList.add('hidden');
}
function generatorSettingsBackdropClick(event){
  const modal = $('generatorSettingsModal');
  if (modal && event && event.target === modal) closeGeneratorSettings();
}
function updateSimpleSecretsHelper(){
  const helper = $('simpleSecretsHelper');
  if (!helper) return;
  const missing = !teacherAccessCodeValue();
  helper.classList.toggle('hidden', !isSimpleMode() || !missing);
}
function clearLegacySchoolSecurityCode(){
  try { localStorage.removeItem(LEGACY_SCHOOL_SECURITY_CODE_KEY); } catch(_){}
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
  return clean;
}
const MAX_ZADANI_IMPORT_BYTES = 512 * 1024;
const MAX_STORED_STRING_CHARS = 300 * 1024;
const MAX_STORED_ARRAY_ITEMS = 5000;
const MAX_STORED_OBJECT_KEYS = 1000;
const MAX_STORED_NODES = 10000;
const MAX_STORED_DEPTH = 10;
const FORBIDDEN_DATA_KEYS = new Set(['__proto__','prototype','constructor']);
const LOADABLE_STATE_KEYS = new Set([
  ...Object.keys(DEFAULT),
  'csModule','csDifficulty','csDifficultyLabel','splitGenerate','manualMode',
  '__csGenericBackup','__csSplitForced'
]);
function cloneSafeStoredValue(value, depth=0, budget={nodes:0}){
  budget.nodes++;
  if (budget.nodes > MAX_STORED_NODES) throw new TypeError('Uložená data jsou příliš složitá.');
  if (depth > MAX_STORED_DEPTH) throw new TypeError('Uložená data jsou příliš hluboce vnořená.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Uložená data obsahují neplatné číslo.');
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_STORED_STRING_CHARS) throw new TypeError('Uložený text překračuje bezpečný limit.');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_STORED_ARRAY_ITEMS) throw new TypeError('Uložené pole překračuje bezpečný limit.');
    return value.map(item => cloneSafeStoredValue(item, depth + 1, budget));
  }
  if (typeof value !== 'object') throw new TypeError('Uložená data obsahují nepodporovanou hodnotu.');
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) throw new TypeError('Uložená data nemají bezpečný objektový tvar.');
  const entries = Object.entries(value);
  if (entries.length > MAX_STORED_OBJECT_KEYS) throw new TypeError('Uložený objekt překračuje bezpečný limit.');
  const out = {};
  for (const [key, item] of entries) {
    if (FORBIDDEN_DATA_KEYS.has(key)) throw new TypeError('Uložená data obsahují zakázaný klíč.');
    out[key] = cloneSafeStoredValue(item, depth + 1, budget);
  }
  return out;
}
function sanitizeStateForLoad(raw){
  const source = cloneSafeStoredValue(raw);
  if (!source || Array.isArray(source) || typeof source !== 'object') throw new TypeError('Uložený stav musí být objekt.');
  const clean = {};
  for (const [key, value] of Object.entries(source)) if (LOADABLE_STATE_KEYS.has(key)) clean[key] = value;
  return clean;
}
function replaceStateFromUntrusted(raw){
  state = Object.assign(JSON.parse(JSON.stringify(DEFAULT)), sanitizeStateForLoad(raw));
  return state;
}
const LEGACY_DEFAULT_TEACHER_NAME = 'Daniel Baláž';
function safeDomEntries(raw){
  const source = cloneSafeStoredValue(raw || {});
  if (!source || Array.isArray(source) || typeof source !== 'object') throw new TypeError('Uložená pole formuláře musí být objekt.');
  return DOM_FIELDS.filter(id => Object.hasOwn(source, id)).map(id => {
    const value = source[id];
    if (value !== null && !['string','number','boolean'].includes(typeof value)) throw new TypeError('Uložené pole formuláře má neplatný tvar.');
    // Do 7.1.58 bylo jméno pro učitelský mód předvyplněné jménem autora aplikace.
    // Taková uložená hodnota nebyla volbou učitele – vyprázdni ji, ať si každý vyplní své jméno.
    if (id === 'ucitelJmeno' && String(value || '').trim() === LEGACY_DEFAULT_TEACHER_NAME) return [id, ''];
    return [id, value];
  });
}
function sanitizePromptForStorage(prompt){
  let out = String(prompt || '');
  out = out.replace(
    /(?:Heslo pro odemčení(?: bezpečnostního zámku)?|Odemykací heslo(?: zámkové obrazovky)?|Učitelský přístupový kód)\s*:\s*.*$/gm,
    'Učitelský přístupový kód: [NEULOŽENO]'
  );
  out = out.replace(
    /(?:PIN pro učitelský mód|PIN učitele)\s*:\s*.*$/gm,
    'Učitelský přístupový kód: [NEULOŽENO]'
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

// Legacy klíče pro migraci šablon a historie.
const LEGACY_STORAGE_SUFFIXES='12_0 11_1 11_0 10_6 9_6 9_5 9_4 9_3 9_1 9_0 8_6 8_5 8_4 8_3 8_2 8_1 8_0 7_4 7_3 7_2 7_1 7 6 4'.split(' ');
function legacyStorageKeys(kind,skip7=false){return LEGACY_STORAGE_SUFFIXES.filter(v=>!skip7||v!=='7').map(v=>'sestavovac_'+kind+'_v5_'+v).concat('sestavovac_'+kind+'_v5')}
const LEGACY_TPL_KEYS=legacyStorageKeys('tpl',true),LEGACY_HIST_KEYS=legacyStorageKeys('hist');

let storageWarnShown = false;
function safeSetItem(key, value){
  if(!generatorPersistenceAllowed()) return false;
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

// Idempotentní migrace starých šablon a historie.
function migrateStorage(){
  try {
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
  try { if(generatorPersistenceAllowed()) localStorage.setItem('sestavovac_mode', isLight ? 'light' : 'dark'); } catch(_){}
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
    replaceStateFromUntrusted(snap.state);
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
    safeDomEntries(snap.dom).forEach(([id, v]) => setVal(id, v));
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
function loadTemplates(){return readArr(TPL_KEY)}
function saveTemplates(t){return safeSetItem(TPL_KEY,JSON.stringify(t))}
const TEMPLATE_PREFILL_KEYS='appMode workPreset jazyk instrJazyk uroven kombinovat pocet typyCviceni zadaniTab urls rcLength rcTopic readingQuestionCount listeningQuestionCount sourceUseMode cas odevzdavani randomizace testMode layout resultMode identityMode body gradeTyp exerciseDetail exerciseConfig fuzzyTolerance tema zolicek diferencovany overeni anonymizace ageGroup ageGroupCustom testPurpose simpleTemplate screenGuard feedbackMode differentiationLevel'.split(' ');
function getTemplatePrefill(){const p={};TEMPLATE_PREFILL_KEYS.forEach(k=>p[k]=cloneSafeStoredValue(state[k]));p.skupinyCount=(state.skupiny||[]).length;p.skupinyNazvy=(state.skupiny||[]).map(g=>g.nazev||'');return p}
function getTemplateDomPrefill(){const dom={};DOM_FIELDS.forEach(id=>{if(!SENSITIVE_FIELD_IDS.includes(id))dom[id]=cloneSafeStoredValue(val(id))});return dom}
function applyTemplatePrefill(p){if(!p)return;TEMPLATE_PREFILL_KEYS.forEach(k=>{if(p[k]!==undefined)state[k]=cloneSafeStoredValue(p[k])});const n=Math.max(0,Math.min(12,Number(p.skupinyCount)||0)),names=Array.isArray(p.skupinyNazvy)?p.skupinyNazvy:[];state.skupiny=[];if((state.diferencovany||'NE')==='ANO')for(let i=0;i<n;i++)state.skupiny.push({id:groupIdCounter++,nazev:names[i]||('Skupina '+(i+1)),podminky:'',studenti:[]})}
function clearTemplateTransientFiles(){fileObjects=[];fileReadPromises=[];state.fileNames=[];if(typeof showFileError==='function')showFileError('')}
function finishTemplateLoad(msg,type='ok'){normalizeLoadedState(state);enforceModeConstraints();maxStep=0;goTo(0);applyVisualState();if(typeof renderGroups==='function')renderGroups();if(typeof renderTeacherMapping==='function')renderTeacherMapping();validate();saveSnapshot();uiToast(msg,type,5000)}
async function saveTemplate(){const name=await uiPrompt('Název šablony',trim('nazev')||'Moje šablona');if(!name)return;const why=await uiPrompt('K čemu šablona slouží (nepovinné)','','Krátce popiš použití, nebo nech prázdné a ulož.'),t=loadTemplates(),attachmentWasPresent=state.zadaniTab==='file'&&((Array.isArray(state.fileNames)&&state.fileNames.length>0)||fileObjects.length>0);t.push({id:Date.now(),name,why:why||'',format:'prefill_v3',prefill:getTemplatePrefill(),dom:getTemplateDomPrefill(),attachmentWasPresent,ts:Date.now()});if(!saveTemplates(t))return;renderTemplates();flashSave();uiToast('Šablona uložena včetně vyplněných polí; přílohy a citlivé údaje se neukládají.','ok',5000)}
function loadTemplate(id){const t=loadTemplates().find(x=>x.id===id);if(!t)return;if(t.format==='prefill_v3'){const attachmentWasPresent=t.attachmentWasPresent===true||(t.attachmentWasPresent==null&&t.prefill?.zadaniTab==='file');applyTemplatePrefill(cloneSafeStoredValue(t.prefill));safeDomEntries(t.dom).forEach(([k,v])=>setVal(k,v));clearTemplateTransientFiles();SENSITIVE_FIELD_IDS.forEach(x=>setVal(x,''));finishTemplateLoad(attachmentWasPresent?'Šablona „'+esc(t.name)+'“ načtena a formulář předvyplněn. Původní příloha se do šablony neukládá — připoj ji znovu.':'Šablona „'+esc(t.name)+'“ načtena a formulář předvyplněn.',attachmentWasPresent?'warn':'ok');return}if(t.format==='prefill_v2'){applyTemplatePrefill(cloneSafeStoredValue(t.prefill));clearTemplateTransientFiles();finishTemplateLoad('Starší šablona „'+esc(t.name)+'“ načtena. Textová pole v tomto formátu uložena nebyla.','warn');return}if(t.format==='profile_v1'){applyTemplatePrefill(cloneSafeStoredValue(t.profile));clearTemplateTransientFiles();finishTemplateLoad('Starší profil načten. Pro plné předvyplnění jej ulož znovu.','warn');return}replaceStateFromUntrusted(t.state);if(!state.urls?.length)state.urls=[''];clearTemplateTransientFiles();if(state.zadaniTab==='file')state.zadaniTab='text';if(!state.layout)state.layout='tabs';if(!state.resultMode)state.resultMode='instant';safeDomEntries(t.dom).forEach(([k,v])=>setVal(k,v));SENSITIVE_FIELD_IDS.forEach(x=>setVal(x,''));finishTemplateLoad('Starší šablona načtena; citlivá pole byla vyčištěna.')}
// Přenos očištěného zadání mezi kolegy.
function buildZadaniExport(){const dom={};DOM_FIELDS.forEach(id=>dom[id]=val(id));return{__type:'generator-testu-zadani',formatVersion:1,appVersion:RELEASE.version,exportedAt:new Date().toISOString(),dom,state:getStoredState()}}
function exportZadani(){try{const data=buildZadaniExport(),slug=(trim('nazev')||'zadani').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'zadani',ts=new Date().toISOString().slice(0,10);downloadBlobFile(JSON.stringify(data,null,2),'zadani_'+slug+'_'+ts+'.json','application/json;charset=utf-8');const files=Array.isArray(state.fileNames)&&state.fileNames.length>0;uiToast(files?'Zadání exportováno. Přílohy pošli zvlášť.':'Zadání exportováno. Pošli JSON kolegovi.',files?'warn':'ok',5500)}catch(err){uiToast('Export zadání selhal: '+(err?.message||err),'warn')}}
async function importZadaniFile(inp){const f=inp?.files?.[0];if(!f)return;try{if(f.size>MAX_ZADANI_IMPORT_BYTES)throw new Error('Soubor zadání je větší než 512 kB.');const data=JSON.parse(await readBlobAsText(f));if(!data||data.__type!=='generator-testu-zadani'||data.formatVersion!==1||!data.state){uiToast('Tento soubor není platné exportované zadání.','warn',5500);return}if(!await uiConfirm('Načíst zadání a přepsat aktuální formulář?','Načíst zadání od kolegy?',true))return;applyImportedZadani(data);uiToast('Zadání načteno'+(data.appVersion?' (verze '+esc(String(data.appVersion))+')':'')+'. Přístupový kód ani přílohy se nepřenášejí.','ok',6500)}catch(err){uiToast('Soubor se nepodařilo načíst: '+(err?.message||err),'warn',5500)}finally{if(inp)inp.value=''}}
function applyImportedZadani(data){replaceStateFromUntrusted(data.state);if(!state.urls?.length)state.urls=[''];fileObjects=[];fileReadPromises=[];state.fileNames=[];if(state.zadaniTab==='file')state.zadaniTab='text';if(!state.exerciseConfig)state.exerciseConfig=[];if(typeof state.exerciseDetail!=='boolean')state.exerciseDetail=false;if(!state.tema)state.tema='modern';if(!state.resultMode)state.resultMode='instant';if(!state.layout)state.layout='tabs';normalizeLoadedState(state);enforceModeConstraints();safeDomEntries(data.dom).forEach(([k,v])=>setVal(k,v));SENSITIVE_FIELD_IDS.forEach(id=>setVal(id,''));if(typeof showFileError==='function')showFileError('');maxStep=0;goTo(0);applyVisualState();if(typeof renderGroups==='function')renderGroups();if(typeof renderTeacherMapping==='function')renderTeacherMapping();validate();saveSnapshot()}
async function deleteTemplate(id){if(!await uiConfirm('Smazat šablonu?','Smazat šablonu?',true))return;saveTemplates(loadTemplates().filter(t=>t.id!==id));renderTemplates()}
function renderTemplates(){const t=loadTemplates(),s=$('templatesStrip'),l=$('tplList'),c=$('tplCount');if(!t.length){s.classList.add('hidden');return}s.classList.remove('hidden');c.textContent='('+t.length+')';const R={instant:'⚡ okamžitá známka',secureOffline:'🔒 verifier'},F={none:'bez zpět. vazby',brief:'stručná zpět. vazba',learning:'učící zpět. vazba'},D={basic:'podpora',challenge:'challenge'};l.innerHTML=t.map(x=>{const a=x.format==='prefill_v3'||x.format==='prefill_v2',p=x.format==='profile_v1',n=a||p,v=(a?x.prefill:x.profile)||{},bad=[];if(n){if(R[v.resultMode])bad.push(R[v.resultMode]);if(F[v.feedbackMode])bad.push(F[v.feedbackMode]);if(D[v.differentiationLevel])bad.push(D[v.differentiationLevel]);if(v.diferencovany==='ANO'&&v.skupinyCount>0)bad.push(v.skupinyCount+' skupiny')}return '<div class="tpl-card"><div class="tpl-card-head"><span class="tpl-card-name">'+esc(x.name)+'</span><div class="tpl-card-btns"><button class="tpl-load" onclick="loadTemplate('+x.id+')" title="Načíst šablonu">'+(a?'📄 Načíst':p?'📄 Načíst profil':'📄 Načíst starou')+'</button><button class="tpl-del" onclick="deleteTemplate('+x.id+')" title="Smazat šablonu">✕</button></div></div>'+(bad.length?'<div class="tpl-badges">'+bad.map(y=>'<span class="tpl-badge">'+esc(y)+'</span>').join('')+'</div>':'')+(x.why?'<div class="preset-modal-why" style="margin-top:7px"><strong>Logika šablony:</strong> '+esc(x.why)+'</div>':'')+(p?'<div class="tpl-old-note">Starší profil — ulož znovu pro plné předvyplnění.</div>':!n?'<div class="tpl-old-note">Starý formát — po načtení ulož znovu.</div>':'')+'</div>'}).join('')}
// ═══ History ══════════════════════════════════════════════════════════════════
function loadHistory() {
  return readArr(HIST_KEY);
}
function pushHistory(prompt) {
  try {
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
  replaceStateFromUntrusted(h.state);
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
  safeDomEntries(h.dom).forEach(([k, v]) => setVal(k, v));
  SENSITIVE_FIELD_IDS.forEach(id => setVal(id, ''));
  maxStep = 4;            // vše už vyplněné → povol skákání po krocích nahoře
  goTo(1);               // rovnou do úprav (zadání / cvičení)
  applyVisualState();
  validate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
