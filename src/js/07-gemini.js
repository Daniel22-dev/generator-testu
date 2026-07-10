// ═══ Gemini Integration ════════════════════════════════════════════════════════

const GEMINI_KEY_SK = 'sestavovac_gemini_key';
const GEMINI_KEY_SESSION_SK = 'sestavovac_gemini_key_session';
// Model NENÍ napevno: drží se v poli vedle API klíče, aby životnost nástroje
// nezávisela na jednom Google stringu. Když Google model zruší, kdokoli (i kolega
// bez přístupu ke kódu) jej tu přepíše — viz poznámka pod polem v UI.
const GEMINI_MODEL_SK = 'sestavovac_gemini_model';
// Produkční výchozí modely: pevné názvy stabilních (GA) modelů. Aktivní limity
// nejsou v kódu napevno — liší se podle projektu, účtu, modelu a usage tieru.
const GEMINI_MODEL_DEFAULT = 'gemini-3.5-flash';
// Při 429 nebo dočasné nedostupnosti zkusíme jednou odlišný stabilní model.
// Fallback může pomoci, ale neznamená garantovanou samostatnou nebo volnou kvótu.
const GEMINI_FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
const GEMINI_DATA_NOTICE_SESSION_SK = 'sestavovac_gemini_data_notice_v1';
let geminiApiKey = '';
let geminiKeyScope = '';
let geminiModel = GEMINI_MODEL_DEFAULT; // vždy obsahuje jen platný, normalizovaný název
let generatedTestHtml = '';
let generatedPackage = null;
let generatedIntegrity = null;
let lastGenData = null;
let lastAssembled = null; // {cfg, variants} z posledního sestavení — vstup pro self-test bodování
let variantSeq = 0;     // 0 = původní test; každá „další skupina" zvýší o 1 (B, C, …)
let variantSlug = '';   // doplněk do názvu souboru pro variantu (skupina-b, skupina-c…)
let rosterEntries = []; // [{email,label,code}] — roster jednorázových kódů; jen v paměti generátoru

// Model si uživatel může napsat i jako "models/gemini-…"; vedoucí "models/" zahodíme,
// protože koncový URL už /models/ obsahuje. Povolujeme jen bezpečné znaky názvu modelu.
function normalizeModelName(s){ return String(s||'').trim().replace(/^models\//i,''); }
function isValidModelName(s){ return /^[A-Za-z0-9][A-Za-z0-9._-]{1,80}$/.test(normalizeModelName(s)); }
function migrateLegacyModelName(s){
  const n = normalizeModelName(s);
  if (n === 'gemini-2.5-flash') return GEMINI_MODEL_DEFAULT;
  if (n === 'gemini-2.5-flash-lite') return GEMINI_FALLBACK_MODELS[0];
  return n;
}
// Pořadí priority: živá hodnota v poli → uložený model → výchozí. Vždy vrátí platný název.
function resolveGeminiModel(){
  const fromInput = normalizeModelName($('geminiModelInput')?.value || '');
  if (fromInput && isValidModelName(fromInput)) return fromInput;
  return (geminiModel && isValidModelName(geminiModel)) ? normalizeModelName(geminiModel) : GEMINI_MODEL_DEFAULT;
}
function setGeminiModel(m){
  const norm = normalizeModelName(m);
  if (norm && isValidModelName(norm)) {
    geminiModel = norm;
    try { localStorage.setItem(GEMINI_MODEL_SK, geminiModel); } catch(_){}
    const inp = $('geminiModelInput'); if (inp && norm !== inp.value.trim()) inp.value = norm;
  }
  // Při neplatném vstupu necháme text v poli (ať ho uživatel vidí a opraví) a
  // resolveGeminiModel() spadne na poslední platný/výchozí — status to označí.
  updateGeminiModelUI();
  var splitChk = document.getElementById('chkSplitGen');
  if (splitChk) splitChk.checked = !!state.splitGenerate;
}
function loadGeminiModel(){
  let stored = '';
  try { stored = localStorage.getItem(GEMINI_MODEL_SK) || ''; } catch(_){}
  const migrated = migrateLegacyModelName(stored);
  geminiModel = (migrated && isValidModelName(migrated)) ? migrated : GEMINI_MODEL_DEFAULT;
  if (stored && geminiModel !== normalizeModelName(stored)) { try { localStorage.setItem(GEMINI_MODEL_SK, geminiModel); } catch(_){} }
  const inp = $('geminiModelInput'); if (inp) inp.value = geminiModel;
  updateGeminiModelUI();
}
function resetGeminiModel(){ const inp=$('geminiModelInput'); if(inp) inp.value=GEMINI_MODEL_DEFAULT; setGeminiModel(GEMINI_MODEL_DEFAULT); }
// Rychlý přepínač mezi „silným" (výchozí) a „lehkým" (první záložní) modelem.
// Žádné duplicitní názvy — bere se z GEMINI_MODEL_DEFAULT a GEMINI_FALLBACK_MODELS[0].

function toggleTypeCard(el){
  const wasOpen=el.classList.contains('open');
  document.querySelectorAll('.type-card.open').forEach(c=>c.classList.remove('open'));
  if(!wasOpen) el.classList.add('open');
}
function buildTypeGuide(){
  var D=[
    ['multiple choice','r','Otázka s v\u00edce mo\u017enostmi, jedna spr\u00e1vn\u00e1. Nejrychlej\u0161\u00ed na vypln\u011bn\u00ed, vhodn\u00e9 na gramatiku i slovn\u00ed z\u00e1sobu.','She ___ to school every day. \u2192 goes / go / went / gone'],
    ['multi-select','r','V\u00edce spr\u00e1vn\u00fdch odpov\u011bd\u00ed \u2014 student ozna\u010d\u00ed V\u0160ECHNY. Hodnotit se p\u0159\u00edsn\u011b jako celek.','Zak\u0159\u00ed\u017ekni v\u0161echny spr\u00e1vn\u00e9 tvary: \u2611 goes \u00b7 \u2610 go \u00b7 \u2611 is going \u00b7 \u2610 goed'],
    ['true/false','r','Student rozhodne, zda tvrzen\u00ed plat\u00ed.','She goes to school by bus. \u2192 Pravda \u2713 / Nepravda'],
    ['matching','r','P\u0159i\u0159azen\u00ed dvojic: slovo\u2194p\u0159eklad, p\u016flky v\u011bt, obr\u00e1zek\u2194popis.','go \u2192 \u0161el \u00b7 run \u2192 b\u011b\u017eel \u00b7 see \u2192 vid\u011bl'],
    ['odd one out','r','Najdi slovo, kter\u00e9 do \u0159ady nepat\u0159\u00ed.','go / run / beautiful / walk \u2192 beautiful nepat\u0159\u00ed'],
    ['categorization','r','Za\u0159azen\u00ed jedn\u00e9 polo\u017eky do kategorie (v\u00fdber z menu).','play \u2192 Regular / Irregular? \u2192 Regular \u2713'],
    ['categorisation-board','r','T\u0159\u00edd\u00edc\u00ed tabule: 6\u201310 slov/v\u011bt \u2192 kategorie. Partial scoring. 1 polo\u017eka = 1 tabulka.','Rozt\u0159i\u010f 8 v\u011bt: Defining / Non-defining relative clause'],
    ['highlight-evidence','r','Student vybere v\u011btu jako d\u016fkaz odpov\u011bdi.','Which sentence explains why Mark was late? \u2192 B: He missed the bus. \u2713'],
    ['fill-in-the-blank','c','Dopln\u011bn\u00ed chyb\u011bj\u00edc\u00edho slova do mezery ve v\u011bt\u011b.','She ___ to school yesterday. \u2192 went'],
    ['word order','c','Se\u0159azen\u00ed rozh\u00e1zen\u00fdch slov do spr\u00e1vn\u00e9 v\u011bty.','every / she / day / goes \u2192 She goes to school every day.'],
    ['translation','c','P\u0159elo\u017een\u00ed v\u011bty do c\u00edlov\u00e9ho jazyka. Hodnotit se jako cel\u00e1 v\u011bta nebo p\u0159ijateln\u00e9 alternativy.','Ona \u0161la do \u0161koly v\u010dera. \u2192 She went to school yesterday. \u2713'],
    ['error correction','c','Najdi a oprav chybu ve v\u011bt\u011b.','She go to school every day. \u2192 goes'],
    ['word formation','c','Vytvo\u0159en\u00ed spr\u00e1vn\u00e9ho tvaru slova ze slovn\u00edho z\u00e1kladu.','beauty \u2192 ___ \u2192 beautiful \u2713'],
    ['sentence transformation','c','P\u0159eps\u00e1n\u00ed v\u011bty se zachov\u00e1n\u00edm smyslu.','She is too tired to study. \u2192 She is not energetic enough to study.'],
    ['key word transformation','c','P\u0159eps\u00e1n\u00ed v\u011bty pomoc\u00ed kl\u00ed\u010dov\u00e9ho slova (2\u20135 slov).','It was too cold. + ENOUGH \u2192 It wasn\'t warm enough.'],
    ['table-completion','c','Dopln\u011bn\u00ed chyb\u011bj\u00edc\u00edch pol\u00ed\u010dek v tabulce (tvary sloves, gramatika).','go | went | ___ \u2192 gone \u2713'],
    ['transformation-chain','c','V\u00fdchoz\u00ed v\u011bta + s\u00e9rie transformac\u00ed. Partial scoring po kroc\u00edch.','She goes. \u2192 negative \u2192 question \u2192 past simple'],
    ['error-tagging','c','Student ozna\u010d\u00ed chybn\u00fd token, vybere typ chyby a nap\u00ed\u0161e opravu. Partial scoring.','She go to school. \u2192 token: go \u00b7 typ: verb form \u00b7 oprava: goes'],
    ['reading comprehension','p','Text a MC ot\u00e1zky ov\u011b\u0159uj\u00edc\u00ed porozum\u011bn\u00ed. V\u0161echny ot\u00e1zky sd\u00edlej\u00ed jeden text.','Text o Lond\u00fdnu \u2192 What is the main topic? \u2192 A) History \u2713'],
    ['dialogue completion','p','Dopln\u011bn\u00ed chyb\u011bj\u00edc\u00ed repliky v dialogu v\u00fdb\u011brem z mo\u017enost\u00ed.','A: What did you do? B: ___ \u2192 I went shopping \u2713'],
    ['listening comprehension','p','MC ot\u00e1zky k poslechu \u2014 audio p\u0159ehr\u00e1v\u00e1 u\u010ditel, student\u016fm se nezobrazuje.','U\u010ditel pust\u00ed nahr\u00e1vku \u2192 Where did she go? \u2192 A) School \u2713'],
    ['cloze text','p','Souvot\u00e1n\u00ed text s v\u00edce mezery k dopln\u011bn\u00ed.','She ___(1) to school every ___(2). \u2192 goes, day'],
    ['banked cloze','p','Text s mezerami + z\u00e1sobn\u00edk slov, student vybere spr\u00e1vn\u00e1 slova.','Z\u00e1sobn\u00edk: however/although/because \u2192 ___ it was late, she stayed.'],
    ['ordering','p','Se\u0159azen\u00ed v\u011bt, krok\u016f nebo ud\u00e1lost\u00ed do spr\u00e1vn\u00e9ho po\u0159ad\u00ed tla\u010d\u00edtky.','Se\u0159a\u010f kroky receptu: p\u0159idej vejce \u2192 ml\u00e9ko \u2192 upec \u2192 pod\u00e1vej'],
    ['multiple matching','p','P\u0159i\u0159azen\u00ed nadpis\u016f nebo tvrzen\u00ed k odstavc\u016fm (MCM form\u00e1t).','P\u0159i\u0159a\u010f nadpisy 1\u20135 k odstavc\u016fm A\u2013E v \u010dl\u00e1nku'],
    ['synonym choice','r','Vyber nejbli\u017e\u0161\u00ed synonymum. Boduje se jako multiple choice.','happy \u2192 glad / sad / tired / fast \u2192 glad \u2713'],
    ['antonym choice','r','Vyber opak (antonymum). Boduje se jako multiple choice.','big \u2192 small / huge / wide / tall \u2192 small \u2713'],
    ['choose the correct response','r','Vyber vhodnou reakci v dialogu. Boduje se jako multiple choice.','"Thanks a lot!" \u2192 You\u2019re welcome \u2713 / Yes, I do'],
    ['match word to definition','r','P\u0159i\u0159a\u010f slovo k jeho definici. Boduje se jako matching.','generous \u2192 ochotn\u00fd d\u00e1vat \u00b7 brave \u2192 nebojácn\u00fd'],
    ['verb form','c','Dopl\u0148 spr\u00e1vn\u00fd tvar slovesa do mezery. Boduje se jako fill-in-the-blank.','She ___ (go) home yesterday. \u2192 went \u2713'],
    ['preposition gap-fill','c','Dopl\u0148 spr\u00e1vnou p\u0159edlo\u017eku. Boduje se jako fill-in-the-blank.','I\u2019m good ___ math. \u2192 at \u2713'],
    ['question formation','c','Vytvo\u0159 ot\u00e1zku k zadan\u00e9 v\u011bt\u011b/odpov\u011bdi. Boduje se jako sentence transformation.','Odpov\u011b\u010f: To London. \u2192 Where did she go? \u2713'],
    ['word family','c','Vytvo\u0159 odvozen\u00fd tvar slova (podst./p\u0159\u00edd./p\u0159\u00edsl.). Boduje se jako word formation.','Her ___ (decide) was final. \u2192 decision \u2713'],
    ['short answer','c','Kr\u00e1tk\u00e1 odpov\u011b\u010f (1\u20135 slov) s uzav\u0159enou mno\u017einou \u0159e\u0161en\u00ed. Boduje se jako fill-in-the-blank.','What is the capital of France? \u2192 Paris \u2713'],
    ['paraphrase the sentence','c','P\u0159eformuluj v\u011btu se zachov\u00e1n\u00edm smyslu. Boduje se jako sentence transformation (v\u00edce alternativ).','It\u2019s very cold. \u2192 It isn\u2019t warm at all.'],
    ['heading matching','p','P\u0159i\u0159a\u010f nadpis k odstavci textu. Boduje se jako matching.','Odstavec o po\u010das\u00ed \u2192 nadpis "Climate" \u2713'],
    ['gist question','p','Ot\u00e1zka na hlavn\u00ed my\u0161lenku textu (ne detail). Boduje se jako multiple choice.','What is the text mainly about? \u2192 A) Recycling \u2713'],
    ['summary cloze','p','Dopl\u0148 mezery v souhrnu textu. Boduje se jako cloze text.','The author argues that ___(1) helps the ___(2). \u2192 reading, brain']
  ];
  var CAT={r:'rozpozn\u00e1v\u00e1n\u00ed',c:'\u0159\u00edzen\u00e1 produkce',p:'porozum\u011bn\u00ed'};
  var CLS={r:'tc-recog',c:'tc-ctrl',p:'tc-comp'};
  // Seskup karty podle kategorie (r -> c -> p), aby barevné skupiny šly za sebou.
  // Stabilní řazení zachová původní pořadí uvnitř každé skupiny.
  var ORD={r:0,c:1,p:2};
  D=D.slice().sort(function(a,b){return (ORD[a[1]]==null?9:ORD[a[1]])-(ORD[b[1]]==null?9:ORD[b[1]]);});
  return D.map(function(d){
    return '<div class="type-card" onclick="toggleTypeCard(this)">'
      +'<div class="type-card-name">'+d[0]+'</div>'
      +'<span class="type-card-cat '+CLS[d[1]]+'">'+CAT[d[1]]+'</span>'
      +'<div class="type-card-body">'
      +'<div class="type-card-desc">'+d[2]+'</div>'
      +'<div class="type-card-ex">'+d[3]+'</div>'
      +'</div></div>';
  }).join('');
}

async function ensureGeminiDataNotice(){
  try { if (sessionStorage.getItem(GEMINI_DATA_NOTICE_SESSION_SK) === 'accepted') return true; } catch(_){}
  const ok = await uiConfirm(
    'Do služby Google Gemini budou odeslány text zadání, zvolené URL a přiložené soubory. Jména studentů v diferenciaci generátor vždy převádí na anonymní kódy, ale obsah textů a příloh neumí spolehlivě anonymizovat. Potvrď, že jsi odstranil(a) osobní, zdravotní, kázeňské a jiné citlivé údaje. Pokračovat?',
    'Kontrola dat před odesláním do AI',
    true
  );
  if (ok) { try { sessionStorage.setItem(GEMINI_DATA_NOTICE_SESSION_SK, 'accepted'); } catch(_){} }
  return ok;
}

function quickModel(which){ setGeminiModel(which==='lite' ? GEMINI_FALLBACK_MODELS[0] : GEMINI_MODEL_DEFAULT); }
// Vrátí první záložní model, který je platný a LIŠÍ se od aktuálního (jinak by
// fallback na limitu nedával smysl). Prázdný řetězec = není kam přepnout.
function pickGeminiFallbackModel(currentModel){
  const cur = normalizeModelName(currentModel).toLowerCase();
  for(const m of GEMINI_FALLBACK_MODELS){
    const n = normalizeModelName(m);
    if(isValidModelName(n) && n.toLowerCase() !== cur) return n;
  }
  return '';
}
function updateGeminiModelUI(){
  const el = $('geminiModelStatus');
  const live = normalizeModelName($('geminiModelInput')?.value || '');
  // Zvýrazni aktivní rychlé tlačítko podle skutečně použitého modelu (custom název = žádné).
  const strongEl=$('qmStrong'), liteEl=$('qmLite');
  if(strongEl&&liteEl){
    const cur=(live && isValidModelName(live) ? live : resolveGeminiModel()).toLowerCase();
    strongEl.classList.toggle('active', cur===normalizeModelName(GEMINI_MODEL_DEFAULT).toLowerCase());
    liteEl.classList.toggle('active', cur===normalizeModelName(GEMINI_FALLBACK_MODELS[0]).toLowerCase());
  }
  if (!el) return;
  if (live && !isValidModelName(live)) { el.textContent = 'neplatný název — používá se ' + resolveGeminiModel(); el.style.color = 'var(--err)'; return; }
  const m = resolveGeminiModel();
  el.textContent = (m === GEMINI_MODEL_DEFAULT) ? 'výchozí (' + GEMINI_MODEL_DEFAULT + ')' : 'vlastní: ' + m;
  el.style.color = (m === GEMINI_MODEL_DEFAULT) ? 'var(--t4)' : 'var(--ok)';
}

// Detekce interního prohlížeče v aplikaci (FB/IG/Teams/Outlook/WebView…), kde je
// trvalé uložení klíče do localStorage nespolehlivé a riskantnější. Sdílené školní
// PC takto detekovat nelze, proto u nich zůstává varování v textové poznámce.
function isEmbeddedBrowserEnv(){
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line|wv|Documents|Teams|Outlook|GSA/i.test(ua);
}
function applyKeyEnvUI(){
  if (!isEmbeddedBrowserEnv()) return;
  const adv = $('keyAdvanced');
  if (adv) { adv.classList.add('hidden'); adv.open = false; } // celá pokročilá sekce pryč — trvalé uložení tu stejně nedrží
  const btn = $('btnSaveKeyPermanent');
  if (btn) { btn.disabled = true; }
  const note = $('geminiNote');
  if (note) note.innerHTML = 'Jsi pravděpodobně ve <strong>vestavěném prohlížeči aplikace</strong>, kde je trvalé uložení nespolehlivé — klíč proto použij <strong>jen pro relaci</strong>, nebo otevři generátor v běžném Chrome/Safari. Zdarma: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a> → Get API key.';
}

function getGeminiInputKey() { return ($('geminiKeyInput')?.value || '').trim(); }
function setGeminiKey(key, scope) {
  geminiApiKey = String(key || '').trim();
  geminiKeyScope = geminiApiKey ? scope : '';
  const inp = $('geminiKeyInput');
  if (inp) inp.value = geminiApiKey;
  updateGeminiStatus();
}
function loadGeminiKey() {
  let sessionKey = '', storedKey = '';
  try { sessionKey = sessionStorage.getItem(GEMINI_KEY_SESSION_SK) || ''; } catch(_){}
  try { storedKey = localStorage.getItem(GEMINI_KEY_SK) || ''; } catch(_){}
  setGeminiKey(sessionKey || storedKey, sessionKey ? 'session' : (storedKey ? 'permanent' : ''));
}
function useGeminiKeyForSession() {
  const key = getGeminiInputKey();
  try {
    if (key) sessionStorage.setItem(GEMINI_KEY_SESSION_SK, key);
    else sessionStorage.removeItem(GEMINI_KEY_SESSION_SK);
  } catch(_){}
  setGeminiKey(key, key ? 'session' : '');
}
async function saveGeminiKeyPermanent() {
  // Pojistka: ve vestavěném prohlížeči je trvalé uložení nespolehlivé → použij relaci.
  if (isEmbeddedBrowserEnv()) { useGeminiKeyForSession(); return; }
  const key = getGeminiInputKey();
  if (key) {
    // Trvalé uložení = klíč zůstane v localStorage tohoto prohlížeče i po zavření.
    // Vědomá pojistka proti omylu na sdíleném/školním PC (který z prohlížeče nepoznáme):
    // místo prostého „Ano" musí uživatel OPSAT větu. Porovnání je tolerantní k diakritice
    // a velikosti písmen, ať jde opsání i na mobilní klávesnici.
    const PHRASE = 'UKLÁDÁM NA OSOBNÍM ZAŘÍZENÍ';
    const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
    const typed = await uiModal({
      title: 'Trvalé uložení API klíče',
      message: 'Klíč zůstane v tomto prohlížeči i po zavření a restartu — dokud ho ručně nesmažeš. Dělej to JEN na svém osobním zařízení; na školním nebo sdíleném zvol „Použít jen pro relaci“.\n\nPro potvrzení opiš přesně tuto větu:\n' + PHRASE,
      input: true, defaultValue: '', okText: 'Uložit trvale', cancelText: 'Zrušit', danger: true
    });
    if (typed == null) return; // zrušeno
    if (norm(typed) !== norm(PHRASE)) {
      uiToast('Věta nesouhlasí — klíč NEbyl uložen trvale. Použij „Použít jen pro relaci“, nebo zkus opis znovu.', 'warn', 5200);
      return;
    }
  }
  try {
    if (key) localStorage.setItem(GEMINI_KEY_SK, key);
    else localStorage.removeItem(GEMINI_KEY_SK);
  } catch(_){}
  setGeminiKey(key, key ? 'permanent' : '');
}
function clearGeminiKey() {
  try { sessionStorage.removeItem(GEMINI_KEY_SESSION_SK); } catch(_){}
  try { localStorage.removeItem(GEMINI_KEY_SK); } catch(_){}
  setGeminiKey('', '');
}

function updateGeminiStatus() {
  const b = $('geminiStatus');
  if (b) {
    if (geminiApiKey) {
      b.textContent = geminiKeyScope === 'permanent' ? '✓ Klíč uložen trvale' : '✓ Klíč jen v této relaci';
      b.style.color = geminiKeyScope === 'permanent' ? 'var(--acc)' : 'var(--ok)';
    } else {
      b.textContent = 'Klíč není nastaven'; b.style.color = 'var(--acc)';
    }
  }
  // Zvýrazni tlačítko podle toho, kam je klíč právě uložený (relace / trvale / nikam).
  // Tím je vidět, která volba je aktivní — ne jen text statusu nahoře.
  const sBtn = $('btnUseKeySession'), pBtn = $('btnSaveKeyPermanent');
  if (sBtn) sBtn.classList.toggle('key-btn-active', !!geminiApiKey && geminiKeyScope === 'session');
  if (pBtn) pBtn.classList.toggle('key-btn-active', !!geminiApiKey && geminiKeyScope === 'permanent');
  // Když je klíč skutečně uložený trvale, rozbal pokročilou sekci, ať je zvýrazněná
  // aktivní volba vidět (jinak by zůstala schovaná pod sbaleným „Pokročilé").
  const adv = $('keyAdvanced');
  if (adv && !adv.classList.contains('hidden') && geminiApiKey && geminiKeyScope === 'permanent') adv.open = true;
}

function readBlobAsDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Soubor se nepodařilo přečíst.'));r.readAsDataURL(blob);});}
function dataUrlToBase64(u){const i=String(u||'').indexOf(',');return i>=0?String(u).slice(i+1):String(u||'');}
function apiMimeForFile(f){const ext=fileExt(f?.name);if(ext==='pdf')return'application/pdf';if(f?.type)return f.type;return({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',heic:'image/heic',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg',aac:'audio/aac',flac:'audio/flac',mp4:'video/mp4',mov:'video/quicktime',m4v:'video/mp4',webm:'video/webm'}[ext]||'application/octet-stream');}
// ── Nativní extrakce textu z .docx — BEZ externí knihovny a BEZ CDN ───────────
// .docx je ZIP; pro tvorbu úloh potřebujeme jen čistý text z word/document.xml.
// ZIP rozbalíme vestavěným DecompressionStream('deflate-raw') — funguje offline
// i na školní síti, která blokuje CDN. Dřív se sem kvůli pouhému extractRawText
// tahal Mammoth (642 kB) z cdn.jsdelivr.net; to byla zbytečná křehkost.
async function inflateRawBytes(bytes){
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Response(bytes).body.pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function findZipEntry(buf, dv, wantName){
  // End Of Central Directory hledáme od konce (kvůli případnému ZIP komentáři).
  let eocd = -1;
  const minI = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= minI; i--){ if (dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; } }
  if (eocd < 0) throw new Error('Soubor není platný .docx (chybí ZIP struktura).');
  const cdCount = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder('utf-8');
  for (let n = 0; n < cdCount; n++){
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true); // velikost bereme z central directory (vždy správná)
    const fnLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + fnLen));
    if (name === wantName) return { method, compSize, localOff };
    p += 46 + fnLen + extraLen + commentLen;
  }
  return null;
}
async function readZipEntryBytes(buf, dv, e){
  if (dv.getUint32(e.localOff, true) !== 0x04034b50) throw new Error('Poškozená ZIP položka v .docx.');
  const fnLen = dv.getUint16(e.localOff + 26, true);
  const extraLen = dv.getUint16(e.localOff + 28, true);
  const start = e.localOff + 30 + fnLen + extraLen;
  const data = buf.subarray(start, start + e.compSize);
  if (e.method === 0) return data;                        // uloženo bez komprese
  if (e.method === 8) return await inflateRawBytes(data); // deflate
  throw new Error('Nepodporovaná komprese v .docx (metoda ' + e.method + ').');
}
function decodeXmlEntities(s){
  return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
          .replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCodePoint(parseInt(h,16)))
          .replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(parseInt(d,10)))
          .replace(/&amp;/g,'&'); // &amp; až nakonec, ať se nedekóduje dvakrát
}
function docxDocumentXmlToText(xml){
  let s = xml
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/g, '') // kódy polí (PAGE/TOC) pryč
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')   // konec odstavce = nový řádek
    .replace(/<[^>]+>/g, '');    // zbytek značek pryč
  return decodeXmlEntities(s).replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}
async function extractDocxText(file){
  if (typeof DecompressionStream === 'undefined')
    throw new Error('Tento prohlížeč neumí rozbalit .docx (chybí DecompressionStream). Ulož soubor jako PDF nebo TXT (Word → Soubor → Uložit jako → PDF/TXT) — ty jdou Geminimu napřímo.');
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const entry = findZipEntry(buf, dv, 'word/document.xml');
  if (!entry) throw new Error('V .docx chybí word/document.xml — nejde o platný Word dokument. Ulož ho jako PDF nebo TXT.');
  const xmlBytes = await readZipEntryBytes(buf, dv, entry);
  return normalizeFileText(docxDocumentXmlToText(new TextDecoder('utf-8').decode(xmlBytes))).trim();
}
async function waitForFileReads(){if(fileReadPromises.length)await Promise.allSettled(fileReadPromises);}
function canDownscaleImage(f){var t=((f&&f.type)||'').toLowerCase();return t==='image/jpeg'||t==='image/png'||t==='image/webp'||t==='image/gif';}
async function downscaleImageForApi(file,maxDim,quality){try{if(!canDownscaleImage(file))return null;const dataUrl=await readBlobAsDataUrl(file);const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('decode'));im.src=dataUrl;});const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!w||!h)return null;const scale=Math.min(1,maxDim/Math.max(w,h));const tw=Math.max(1,Math.round(w*scale)),th=Math.max(1,Math.round(h*scale));const canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,tw,th);ctx.drawImage(img,0,0,tw,th);const out=canvas.toDataURL('image/jpeg',quality);if(!out||out.length<32)return null;const b64=dataUrlToBase64(out);if(b64.length>=dataUrlToBase64(dataUrl).length)return null;return{mimeType:'image/jpeg',base64:b64};}catch(_){return null;}}
async function buildGeminiFilePartsForApi(){const parts=[],notes=[];if(state.zadaniTab!=='file'||!fileObjects.length)return{parts,notes};for(const obj of fileObjects){const f=obj.file;if(!f)continue;const ext=fileExt(f.name);if(obj.textContent&&(obj.embedStatus==='embedded'||obj.embedStatus==='embedded-partial'))continue;if((f.type||'').startsWith('image/')){const ds=await downscaleImageForApi(f,2000,0.82);if(ds){parts.push({inlineData:{mimeType:ds.mimeType,data:ds.base64}});notes.push(`${obj.displayName||f.name}: attached as image/jpeg (auto-zmenšeno)`);}else{const dataUrl=await readBlobAsDataUrl(f);parts.push({inlineData:{mimeType:apiMimeForFile(f),data:dataUrlToBase64(dataUrl)}});notes.push(`${obj.displayName||f.name}: attached as ${apiMimeForFile(f)}`);}continue;}if((f.type||'').startsWith('audio/')||(f.type||'').startsWith('video/')||ext==='pdf'){const dataUrl=await readBlobAsDataUrl(f);parts.push({inlineData:{mimeType:apiMimeForFile(f),data:dataUrlToBase64(dataUrl)}});notes.push(`${obj.displayName||f.name}: attached as ${apiMimeForFile(f)}`);continue;}if(ext==='docx'){const text=await extractDocxText(f);if(!text)throw new Error(`${obj.displayName||f.name}: DOCX neobsahuje čitelný text.`);parts.push({text:`\n\n[DOCX SOURCE: ${obj.displayName||f.name}]\n${text.slice(0,50000)}`});notes.push(`${obj.displayName||f.name}: DOCX converted to text`);continue;}if(ext==='doc')throw new Error(`${obj.displayName||f.name}: .doc není podporovaný. Ulož ho jako DOCX, PDF nebo TXT.`);throw new Error(`${obj.displayName||f.name}: tento typ souboru zatím nejde v API režimu zpracovat.`);}return{parts,notes};}
function buildGeminiRequestBody(prompt, extraParts=[], opts={}) {
  const useTools = !!(opts && opts.urlContext);
  const generationConfig = { temperature:0.45, maxOutputTokens:32000 };
  // POZOR: responseMimeType:'application/json' NELZE kombinovat s nástrojem
  // (url_context) — Gemini to odmítne (HTTP 400 INVALID_ARGUMENT: "Tool use with a
  // response mime type 'application/json' is unsupported"). Když je tedy zapnutý URL
  // Context, JSON mime type vynecháme a spolehneme se na systemInstruction ("Return
  // ONLY valid JSON") + záchrannou repairGeminiJson, která ```fence / uvozovky / prózu
  // okolo dočistí. Bez nástroje necháme JSON mime type jako tvrdší pojistku formátu.
  if (!useTools) generationConfig.responseMimeType = 'application/json';
  const body = {
    contents: [{ role:'user', parts:[{ text:prompt }, ...(extraParts || [])] }],
    systemInstruction: { parts:[{ text:'You are an expert language teacher. Return ONLY valid JSON. No markdown, no backticks, no explanation outside the JSON.' }] },
    generationConfig
  };
  if (useTools) body.tools = [{ url_context:{} }];
  return body;
}

// ─── Smoke-test pomocníci ────────────────────────────────────────────────────
// Cíl: kontroly typu „native dialog" a „externí závislost" se mají dívat jen na
// SKUTEČNÝ JS kód uvnitř <script>, ne na text úloh. Jinak věta „What does alert()
// do in JavaScript?" nebo ukázka fetch('https://…') v zadání test falešně zablokuje.
function smokeExtractScripts(text){ const s=[]; String(text||'').replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(_,c)=>{s.push(c);return '';}); return s; }
// Odstraní řetězce ('…', "…", `…`) i komentáře (// a /* */), aby v kódu zbyla jen
// jeho struktura. Tím se z detekce vyřadí názvy funkcí zmíněné v datech/textu.
function smokeStripCode(code){
  let out=''; let i=0; const s=String(code||''); const n=s.length;
  while(i<n){ const c=s[i], d=s[i+1];
    if(c==='/'&&d==='/'){ while(i<n&&s[i]!=='\n')i++; continue; }
    if(c==='/'&&d==='*'){ i+=2; while(i<n&&!(s[i]==='*'&&s[i+1]==='/'))i++; i+=2; continue; }
    if(c==='"'||c==="'"||c==='`'){ const q=c; i++; while(i<n&&s[i]!==q){ if(s[i]==='\\')i++; i++; } i++; out+=' '; continue; }
    out+=c; i++;
  }
  return out;
}
// Skutečné volání native dialogu v kódu (ne v textu/datech).
function smokeHasNativeDialog(text){ return smokeExtractScripts(text).some(code => /\b(alert|confirm|prompt)\s*\(/.test(smokeStripCode(code))); }
// Skutečná externí závislost: strukturální tagy nad celým HTML + síťová volání v kódu.
function smokeHasExternalDep(text){
  const t=String(text||'');
  if(/<script\b[^>]+\bsrc\s*=|<link\b[^>]+\bhref\s*=\s*["']https?:|@import\s+url/i.test(t)) return true;
  return smokeExtractScripts(t).some(code => { const s=smokeStripCode(code); return /\bfetch\s*\(/.test(s)||/\bXMLHttpRequest\b/.test(s)||/\bimportScripts\s*\(/.test(s)||/\bnavigator\.sendBeacon\s*\(/.test(s); });
}

function validateGeneratedHtmlSmoke(html) {
  const text = String(html || '');
  const errors = [];
  if (!/^<!DOCTYPE html>/i.test(text.trim())) errors.push('chybí <!DOCTYPE html>');
  ['id="introScreen"','id="testScreen"','id="resultScreen"','id="teacherModal"','buildVerify','buildReportSeal','parseVerifyText','doTeacherLogin','closeTeacherModal'].forEach(needle => {
    if (!text.includes(needle)) errors.push('chybí povinný prvek/funkce: ' + needle);
  });
  if (smokeHasNativeDialog(text)) errors.push('obsahuje native alert/confirm/prompt místo vlastních HTML modalů');
  if (smokeHasExternalDep(text)) errors.push('obsahuje externí závislost; studentský test má být offline bez CDN/API');
  if (/\"type\"\s*:\s*\"(?:open answer|image description)\"/i.test(text)) errors.push('obsahuje vypnutý ručně hodnotitelný typ cvičení');
  if (/\"type\"\s*:\s*\"listening comprehension\"/i.test(text) && !/(transcript|audio_prompt|audio_source_note)/i.test(text)) errors.push('listening comprehension nemá transcript/audio_prompt/audio_source_note pro učitelskou kontrolu');
  if (/\"ucitelPin\"\s*:|\"heslo\"\s*:|CFG\.ucitelPin\b|CFG\.heslo\b/.test(text)) errors.push('v HTML zůstalo staré raw pole pro PIN/heslo; má se používat pouze hash');
  const scripts = [];
  text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, code) => { scripts.push(code); return ''; });
  if (!scripts.length) errors.push('chybí <script> s logikou testu');
  scripts.forEach((code, i) => {
    try { new Function(code); }
    catch (e) { errors.push('JavaScript syntax error ve scriptu #' + (i + 1) + ': ' + (e && e.message ? e.message : e)); }
  });
  if (errors.length) throw new Error('Vygenerované HTML neprošlo interním smoke testem:\n- ' + errors.join('\n- '));
  return true;
}

function validateHtmlSyntaxOnly(html, label) {
  const errors=[];
  const text=String(html||'');
  if(!/^<!DOCTYPE html>/i.test(text.trim())) errors.push(label+': chybí <!DOCTYPE html>');
  // Native dialogy mají být ve VŠECH secure souborech (student i verifier) nahrazené
  // vlastními HTML modaly/toasty. Důvod: na mobilu, školních zařízeních a v některých
  // prohlížečích se chovají nekonzistentně. Bez této kontroly se by se mohl alert()
  // potichu znovu objevit a unikl by — jako se to stalo ve secure studentu.
  if (smokeHasNativeDialog(text)) errors.push(label+': obsahuje native alert/confirm/prompt místo vlastních HTML modalů');
  const scripts=[];
  text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,(_,code)=>{scripts.push(code);return '';});
  if(!scripts.length) errors.push(label+': chybí <script>');
  scripts.forEach((code,i)=>{try{new Function(code);}catch(e){errors.push(label+': JavaScript syntax error ve scriptu #'+(i+1)+': '+(e&&e.message?e.message:e));}});
  if(errors.length) throw new Error('Secure offline balíček neprošel smoke testem:\n- '+errors.join('\n- '));
  return true;
}
function extractJsonConstFromHtml(html, constName) {
  // Najde deklaraci `const NAME =` a pak přečte vyvážený JSON literál ({…} nebo […])
  // počítáním závorek mimo řetězce. Odolné vůči odřádkování, mezerám i minifikaci —
  // nevyžaduje přesný tvar `…;\n` jako dřív (ten by se rozbil při změně formátu embedu).
  const s = String(html || '');
  const decl = new RegExp('const\\s+' + constName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*');
  const dm = decl.exec(s);
  if (!dm) throw new Error('Studentský HTML neobsahuje datovou konstantu ' + constName + '.');
  let i = dm.index + dm[0].length;
  while (i < s.length && s[i] !== '{' && s[i] !== '[') i++;
  if (i >= s.length) throw new Error('Datová konstanta ' + constName + ' nemá očekávaný JSON literál.');
  const open = s[i], close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, q = '', j = i;
  for (; j < s.length; j++) {
    const ch = s[j];
    if (inStr) { if (ch === '\\') { j++; continue; } if (ch === q) inStr = false; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; q = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { j++; break; } }
  }
  if (depth !== 0) throw new Error('Datová konstanta ' + constName + ' má neuzavřený JSON literál.');
  try { return JSON.parse(s.slice(i, j)); }
  catch (e) { throw new Error('Datová konstanta ' + constName + ' nejde načíst jako JSON: ' + (e && e.message ? e.message : e)); }
}
function assertNoStudentAnswerKeys(obj, path='STUDENT_VARIANTS') {
  const forbidden = new Set(['correct','answer','answers','alt_answers','model_answer','correction','correct_sentence','translation','correct_category','category','right']);
  if (Array.isArray(obj)) {
    obj.forEach((v,i) => assertNoStudentAnswerKeys(v, path + '[' + i + ']'));
    return;
  }
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(k => {
      if (forbidden.has(k)) throw new Error('Studentský HTML obsahuje answer-key pole: ' + path + '.' + k);
      assertNoStudentAnswerKeys(obj[k], path + '.' + k);
    });
  }
}
function validateSecurePackageSmoke(pkg) {
  if(!pkg || pkg.mode !== 'secureOffline') throw new Error('Chybí bezpečný offline balíček.');
  if(!pkg.studentHtml || !pkg.teacherHtml) throw new Error('Secure offline režim musí obsahovat studentHtml i teacherHtml.');

  // Nekontrolujeme celý HTML prostým regexem na slova typu „answers“, protože studentský
  // soubor je musí používat ve funkcích secureAnswers/downloadAnswers a v názvu answers.txt.
  // Kontrolujeme pouze datovou konstantu STUDENT_VARIANTS, kde nesmí být answer key.
  // Studentský HTML nesmí obsahovat skutečné učitelské datové konstanty/privátní klíč.
  // Nekontrolujeme řetězec "teacher_verifier": může se objevit jen jako uživatelská instrukce
  // nebo název učitelského souboru, což není únik učitelských dat.
  if(/PRIVATE_KEY|VARIANTS_FULL/i.test(pkg.studentHtml)) {
    throw new Error('Studentský HTML v bezpečném režimu obsahuje skutečná učitelská data.');
  }
  const studentVariants = extractJsonConstFromHtml(pkg.studentHtml, 'STUDENT_VARIANTS');
  assertNoStudentAnswerKeys(studentVariants);

  ['secureAnswers','downloadAnswers','encryptPayloadForTeacher','openTeacherModal','lockTest','switchExercise'].forEach(n=>{ if(!pkg.studentHtml.includes(n)) throw new Error('Studentský HTML nemá povinnou funkci: '+n); });
  if(/"uiLang"\s*:\s*"es"/.test(pkg.studentHtml) && /(Bezpečný offline režim|Nejdřív vyber zařízení|Začít test|Cvičení |Otázka |Pravda|Nepravda|Poslech)/.test(pkg.studentHtml)) {
    throw new Error('Španělský secure student HTML obsahuje české UI texty.');
  }
  ['bulkVerifyFiles','downloadCsv','downloadFeedbackHtml','downloadArchiveHtml','downloadArchiveJson','downloadIndexCsv','renderTeacherPreview','teacherPreview','copySelectedFeedback','downloadIndividualFeedbacks','renderProblemSummary','openPrint','buildPrintableHtml','PRIVATE_KEY','VARIANTS_FULL'].forEach(n=>{ if(!pkg.teacherHtml.includes(n)) throw new Error('Verifier nemá povinnou funkci: '+n); });
  if(!/<html\s+lang=["']cs["']/.test(pkg.teacherHtml) || !/Učitelský verifier/.test(pkg.teacherHtml)) {
    throw new Error('Učitelský verifier musí zůstat česky bez ohledu na jazyk studentského testu.');
  }
  validateHtmlSyntaxOnly(pkg.studentHtml,'studentský test');
  validateHtmlSyntaxOnly(pkg.teacherHtml,'učitelský verifier');
  return true;
}


let currentGeminiAbortController = null;
let geminiCancelRequested = false;
let genUiPhase = 'idle';
let geminiCooldownUntil = 0;
let geminiCooldownTimer = null;
const GEMINI_TIMEOUT_MS = 180000;
const GEMINI_MAX_ATTEMPTS = 4; // u dočasných chyb (bad JSON, prázdná odpověď, timeout…): 1. pokus + až 3 opakování
const GEMINI_MAX_ATTEMPTS_503 = 2; // Google UNAVAILABLE (503/overload): max 2 pokusy celkem — každý retry pálí denní kvótu
const GEMINI_RETRY_DELAYS_MS = [5000, 15000, 30000];
const GEMINI_QUOTA_DEFAULT_COOLDOWN_MS = 60000;
const GEMINI_GENERATE_BUTTON_TEXT = '✨ Vytvořit test přímo';

function geminiSeconds(ms){ return Math.round(Number(ms || 0) / 1000); }
function geminiSleep(ms){ return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0))); }
function geminiFormatWait(ms){
  const sec = Math.max(1, Math.ceil((Number(ms) || 0) / 1000));
  if(sec < 60) return sec + ' s';
  const min = Math.floor(sec / 60), rest = sec % 60;
  return rest ? (min + ' min ' + rest + ' s') : (min + ' min');
}
function geminiParseDurationMs(raw){
  const s = String(raw || '').trim();
  if(!s) return 0;
  const m = s.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
  if(m){
    const n = Number(m[1]);
    if(!Number.isFinite(n) || n < 0) return 0;
    const unit = (m[2] || 's').toLowerCase();
    if(unit === 'ms') return n;
    if(unit === 'm') return n * 60000;
    return n * 1000;
  }
  return 0;
}
function geminiRetryAfterMs(res, data){
  let best = 0;
  const raw = res && res.headers && typeof res.headers.get === 'function' ? res.headers.get('Retry-After') : '';
  if(raw){
    const asNum = Number(raw);
    if(Number.isFinite(asNum) && asNum >= 0) best = Math.max(best, asNum * 1000);
    else {
      const asDate = Date.parse(raw);
      if(Number.isFinite(asDate)) best = Math.max(best, asDate - Date.now());
    }
  }
  const details = data && data.error && Array.isArray(data.error.details) ? data.error.details : [];
  for(const d of details){
    if(d && typeof d === 'object' && d.retryDelay){
      best = Math.max(best, geminiParseDurationMs(String(d.retryDelay).replace(/s$/,'s')));
    }
  }
  const msg = data && data.error && data.error.message ? String(data.error.message) : '';
  const mm = msg.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i) || msg.match(/zkus(?:it)?\s+znovu\s+za\s+(\d+(?:\.\d+)?)\s*s/i);
  if(mm) best = Math.max(best, Number(mm[1]) * 1000);
  return Math.max(0, Math.min(30 * 60 * 1000, Math.ceil(best)));
}
function geminiCooldownRemainingMs(){ return Math.max(0, geminiCooldownUntil - Date.now()); }
function geminiUpdateCooldownUI(){
  const btn = $('btnGenerate');
  if(!btn) return;
  const blockedCopy = (typeof Access !== 'undefined' && Access.blockAllGeneration);
  if(blockedCopy){
    btn.disabled = true;
    btn.textContent = '⛔ Neoficiální kopie — generování zakázáno';
    btn.title = 'Otevři generátor z oficiální adresy.';
    return;
  }
  const rem = geminiCooldownRemainingMs();
  if(rem > 0){
    btn.disabled = true;
    btn.textContent = '⏳ Limit API – zkuste za ' + geminiFormatWait(rem);
    btn.title = 'Gemini API dočasně omezuje požadavky. Počkej na konec odpočtu.';
    return;
  }
  if(geminiCooldownTimer){ clearInterval(geminiCooldownTimer); geminiCooldownTimer = null; }
  geminiCooldownUntil = 0;
  if(genUiPhase !== 'loading'){
    btn.disabled = false;
    btn.textContent = GEMINI_GENERATE_BUTTON_TEXT;
    btn.title = '';
  }
}
function geminiStartCooldown(ms){
  const delay = Math.max(1000, Number(ms) || GEMINI_QUOTA_DEFAULT_COOLDOWN_MS);
  geminiCooldownUntil = Math.max(geminiCooldownUntil, Date.now() + delay);
  if(geminiCooldownTimer) clearInterval(geminiCooldownTimer);
  geminiCooldownTimer = setInterval(geminiUpdateCooldownUI, 1000);
  geminiUpdateCooldownUI();
}
function geminiClearCooldown(){
  geminiCooldownUntil = 0;
  if(geminiCooldownTimer){ clearInterval(geminiCooldownTimer); geminiCooldownTimer = null; }
  geminiUpdateCooldownUI();
}
function geminiRetryDelayMs(attempt, res, data, reason){
  const retryAfter = geminiRetryAfterMs(res, data);
  if(retryAfter) return retryAfter;
  const http = res && res.status ? Number(res.status) : 0;
  const apiStatus = data && data.error && data.error.status ? String(data.error.status) : String(reason || '');
  if([500,502,503,504].includes(http) || /UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|timeout|síť/i.test(apiStatus)){
    return GEMINI_RETRY_DELAYS_MS[Math.max(0, Math.min(GEMINI_RETRY_DELAYS_MS.length - 1, attempt - 1))];
  }
  return GEMINI_RETRY_DELAYS_MS[Math.max(0, Math.min(GEMINI_RETRY_DELAYS_MS.length - 1, attempt - 1))];
}
function geminiIsRetryableStatus(httpStatus, apiStatus){
  const code = Number(httpStatus) || 0;
  return [408, 429, 500, 502, 503, 504].includes(code) || /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|INTERNAL|ABORTED/i.test(String(apiStatus || ''));
}
function geminiAttemptsText(attempts, errorType){
  const n = Math.max(1, Math.round(Number(attempts) || 1));
  if (n <= 1) return 'Automatické opakování požadavku se nespustilo.';
  if (errorType === '503') return `Generátor požadavek zkusil ${n}×, ale Gemini servery stále neodpovídaly.`;
  return `Generátor požadavek zkusil ${n}×. U 429/kvóty se další opakování okamžitě nespouští, aby se limit dál nespaloval.`;
}
function geminiTechLine(model, attempts, extra=''){
  return `Technicky: model=${model || 'neznámý'}, timeout=${geminiSeconds(GEMINI_TIMEOUT_MS)} s, pokusy=${attempts}${extra ? ', ' + extra : ''}.`;
}
function geminiActionHint(){
  return 'Co zkusit: zmenšit počet cvičení/položek, zkrátit vstupní text nebo přílohy, případně spustit generování znovu později.';
}
function geminiCancelledMessage(){
  return 'Generování bylo zrušeno uživatelem. Můžeš upravit zadání a spustit ho znovu.';
}
function geminiTimeoutErrorMessage(model, attempts){
  return 'Gemini neodpověděl do ' + geminiSeconds(GEMINI_TIMEOUT_MS) + ' s.\n\n'
    + 'Co to znamená: prohlížeč čekal na odpověď API, ale v nastaveném limitu nepřišla žádná použitelná HTTP odpověď. Nejde o chybu bodování ani o rozbitý test; požadavek se nestihl zpracovat nebo vrátit přes síť.\n\n'
    + 'Nejčastější příčiny: příliš velký prompt, dlouhé zdrojové materiály/přílohy, hodně cvičení najednou, pomalé připojení nebo dočasně zatížený model/API.\n\n'
    + geminiAttemptsText(attempts) + '\n'
    + geminiActionHint() + '\n\n'
    + geminiTechLine(model, attempts, 'ukončeno přes AbortController/fetch timeout');
}
function geminiNetworkErrorMessage(err, model, attempts){
  const detail = err && err.message ? err.message : String(err || 'neznámá chyba');
  return 'Spojení s Gemini selhalo ještě před získáním odpovědi API.\n\n'
    + 'Co to znamená: prohlížeč nedokončil síťový požadavek. Může jít o výpadek internetu, blokaci požadavku v prohlížeči/síti nebo dočasnou nedostupnost služby.\n\n'
    + geminiAttemptsText(attempts) + '\n'
    + geminiActionHint() + '\n\n'
    + geminiTechLine(model, attempts, 'síťová chyba fetch: ' + detail);
}
function geminiApiErrorMessage(res, data, model, attempts, retryMs=0){
  const msg = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
  const apiStatus = data && data.error && data.error.status ? String(data.error.status) : '';
  const statusText = `HTTP ${res.status}` + (apiStatus ? ` / ${apiStatus}` : '');
  const modelGone = res.status === 404 || /not found|is not found|not supported|unsupported|NOT_FOUND/i.test(msg + ' ' + apiStatus);
  let why = 'Google API požadavek odmítlo nebo ho nedokázalo zpracovat.';
  let action = geminiActionHint();
  if(res.status === 400 || /INVALID_ARGUMENT/i.test(apiStatus)){
    why = 'Požadavek má pro API neplatný tvar nebo obsahuje nepodporovanou kombinaci parametrů/modelu/příloh.';
    action = 'Zkontroluj zvolený model, URL/přílohy a zkus jednodušší zadání.';
  } else if(res.status === 401 || res.status === 403 || /PERMISSION_DENIED|UNAUTHENTICATED/i.test(apiStatus)){
    why = 'API klíč není platný, nemá oprávnění, nebo není omezený na Gemini API.';
    action = 'Zkontroluj Gemini API klíč ve žluté sekci. Od 19. 6. 2026 Google vyžaduje, aby byl klíč omezený na Gemini API — neomezené klíče vrací chybu 403. Zkontroluj nastavení klíče na aistudio.google.com → API Keys nebo vytvoř nový omezený klíč.';
  } else if(modelGone){
    why = `Zvolený model „${model}" pravděpodobně není dostupný nebo není podporovaný pro tento endpoint.`;
    action = `Změň název modelu v poli „Model" ve žluté sekci, např. na ${GEMINI_MODEL_DEFAULT} nebo gemini-flash-latest.`;
  } else if(res.status === 429 || /RESOURCE_EXHAUSTED/i.test(apiStatus)){
    why = 'Byl překročen limit požadavků nebo kvóta pro API klíč / Google projekt.';
    action = retryMs
      ? ('Překročen limit. Generátor tlačítko dočasně vypnul; zkus to znovu nejdříve za ' + geminiFormatWait(retryMs) + '. Neklikej opakovaně, další kliknutí by zbytečně spotřebovávalo limit.')
      : 'Překročen limit. Počkej alespoň 1 minutu, neklikej opakovaně a případně ověř limity/quótu u API klíče.';
  } else if(res.status === 504 || /DEADLINE_EXCEEDED/i.test(apiStatus)){
    why = 'Server požadavek nestihl dopočítat v interním limitu Google API. To typicky souvisí s velkým vstupem nebo náročným výstupem.';
    action = geminiActionHint();
  } else if(res.status === 503 || /UNAVAILABLE/i.test(apiStatus)){
    why = 'Služba nebo zvolený model je dočasně nedostupný či přetížený. Samotná chyba 503 spolehlivě neurčuje stav kvóty.';
    action = 'Počkej několik minut a zkus to znovu. Zkontroluj stav služby a aktivní limity projektu v Google AI Studiu; případně přepni na stabilní Lite model.';
  } else if([500,502,504].includes(Number(res.status)) || /INTERNAL/i.test(apiStatus)){
    why = 'Chyba je na straně služby nebo její dostupnosti; často pomůže zopakování později.';
    action = 'Zkus generování znovu za chvíli; pokud problém trvá, zmenši test nebo přepni model.';
  }
  const errType503 = (res.status === 503 || /UNAVAILABLE/i.test(apiStatus)) ? '503' : '';
  return `Gemini API vrátilo chybu: ${msg}` + (apiStatus ? ` (${apiStatus})` : '') + '\n\n'
    + `Typ chyby: ${statusText}.\n`
    + `Co to znamená: ${why}\n\n`
    + geminiAttemptsText(attempts, errType503) + '\n'
    + action + '\n\n'
    + geminiTechLine(model, attempts, statusText);
}
async function geminiWaitBeforeRetry(attempt, maxAttempts, res, reason, data){
  const delay = geminiRetryDelayMs(attempt, res, data, reason);
  try{
    if(typeof setGenMsg === 'function') {
      setGenMsg(`Gemini vrátilo neúplný výstup — opakuji (pokus ${attempt + 1}/${maxAttempts}, za ${geminiFormatWait(delay)})…`);
    }
  }catch(_){ }
  await geminiSleep(delay);
}

// Oprava typicky vadného JSON z LLM. responseMimeType:'application/json' většinou stačí,
// ale model občas vrátí neescapovanou " uvnitř textu (např. v "explanation"), doslovný
// konec řádku ve stringu, ```fence, prózu okolo nebo koncovou čárku. Tahle funkce to
// konzervativně opraví; volá se až jako záchrana, když JSON.parse selže.
let lastGeminiJsonRepaired = false; // true, pokud poslední parse musel sáhnout po repairGeminiJson
let lastGeminiRawResponse = null;   // surový text z poslední Gemini odpovědi (pro diagnostiku při opravě)
function repairGeminiJson(raw){
  lastGeminiJsonRepaired = true; // jakmile se sem dostaneme, JSON byl opravován → učitel ať zkontroluje
  let s=String(raw||'');
  s=s.replace(/^\uFEFF/,'');
  s=s.replace(/```(?:json)?\s*/gi,'').replace(/```/g,'');
  const first=s.indexOf('{'), last=s.lastIndexOf('}');
  if(first>=0&&last>first) s=s.slice(first,last+1);
  s=s.replace(/[\u201C\u201D\u201E\u201F]/g,'"').replace(/[\u2018\u2019\u201A\u201B]/g,"'");
  let out='', inStr=false, esc=false, strIsKey=false, lastStruct='';
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(esc){ out+=c; esc=false; continue; }
    if(c==='\\'){ out+=c; esc=true; continue; }
    if(inStr){
      if(c==='"'){
        let j=i+1; while(j<s.length&&(s[j]===' '||s[j]==='\t'||s[j]==='\r'||s[j]==='\n'))j++;
        const nx=s[j];
        const closesValue=(nx===undefined||nx===','||nx==='}'||nx===']');
        const closesKey=(nx===':'&&strIsKey);
        if(closesValue||closesKey){ inStr=false; out+='"'; }
        else { out+='\\"'; }
        continue;
      }
      if(c==='\n'){ out+='\\n'; continue; }
      if(c==='\r'){ out+='\\r'; continue; }
      if(c==='\t'){ out+='\\t'; continue; }
      const code=c.charCodeAt(0);
      if(code<0x20){ out+='\\u'+code.toString(16).padStart(4,'0'); continue; }
      out+=c; continue;
    } else {
      if(c==='"'){ inStr=true; strIsKey=(lastStruct==='{'||lastStruct===','); out+='"'; continue; }
      if(c==='{'||c===','||c===':'||c==='['||c==='}'||c===']'){ lastStruct=c; }
      out+=c; continue;
    }
  }
  s=out;
  s=s.replace(/,(\s*[}\]])/g,'$1');
  // Uzavřeme případné neuzavřené { nebo [ (např. Gemini usekl odpověď).
  // Procházíme výsledný řetězec a sledujeme stack; string-aware, aby nás uvozovky nespletly.
  {
    const stack=[]; let inStr2=false, esc2=false;
    for(const c of s){
      if(esc2){esc2=false;continue;} if(c==='\\'){esc2=true;continue;}
      if(c==='"'){inStr2=!inStr2;continue;} if(inStr2)continue;
      if(c==='{'||c==='[') stack.push(c==='{' ? '}' : ']');
      else if((c==='}'||c===']')&&stack.length&&stack[stack.length-1]===c) stack.pop();
    }
    while(stack.length) s+=stack.pop();
  }
  return s;
}

async function callGeminiJSON(prompt, extraParts=[], opts={}){
  if (!(await ensureGeminiDataNotice())) throw new Error('AI požadavek byl zrušen před odesláním dat.');
  lastGeminiJsonRepaired = false;
  lastGeminiRawResponse = null;
  if(!geminiApiKey)throw new Error('Gemini API klíč není nastaven. Zadej ho ve žluté sekci.');
  const model=(opts && opts.modelOverride && isValidModelName(opts.modelOverride)) ? normalizeModelName(opts.modelOverride) : resolveGeminiModel();
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = buildGeminiRequestBody(prompt, extraParts, opts);
  const maxAttempts = (opts && opts.noRetry) ? 1 : Math.max(1, Math.min(4, Math.round(Number((opts && opts.maxAttempts) || GEMINI_MAX_ATTEMPTS) || GEMINI_MAX_ATTEMPTS)));
  geminiCancelRequested = false;
  let lastErr = null;

  for(let attempt=1; attempt<=maxAttempts; attempt++){
    if(geminiCancelRequested) throw new Error(geminiCancelledMessage());
    lastGeminiJsonRepaired = false;
    const ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
    currentGeminiAbortController = ctrl;
    const timer = ctrl ? setTimeout(()=>{ if(!geminiCancelRequested) ctrl.abort(); }, GEMINI_TIMEOUT_MS) : null;
    let res;
    try{
      res=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':geminiApiKey},
        body:JSON.stringify(body),
        signal:ctrl?ctrl.signal:undefined
      });
    }catch(e){
      if(e&&e.name==='AbortError'){
        if(geminiCancelRequested)throw new Error(geminiCancelledMessage());
        lastErr = new Error(geminiTimeoutErrorMessage(model, attempt));
        if(attempt < maxAttempts){ await geminiWaitBeforeRetry(attempt, maxAttempts, null, 'timeout', null); continue; }
        throw lastErr;
      }
      lastErr = new Error(geminiNetworkErrorMessage(e, model, attempt));
      if(attempt < maxAttempts){ await geminiWaitBeforeRetry(attempt, maxAttempts, null, 'síť', null); continue; }
      throw lastErr;
    }finally{
      if(timer)clearTimeout(timer);
      currentGeminiAbortController = null;
    }

    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const apiStatus=data?.error?.status ? String(data.error.status) : '';
      const isQuota = res.status === 429 || /RESOURCE_EXHAUSTED/i.test(apiStatus);
      const retryMs = geminiRetryAfterMs(res, data) || (isQuota ? GEMINI_QUOTA_DEFAULT_COOLDOWN_MS : 0);
      const retryable = geminiIsRetryableStatus(res.status, apiStatus);
      lastErr = new Error(geminiApiErrorMessage(res, data, model, attempt, retryMs));
      if(isQuota){
        // Automatický fallback: primární model na limitu → zkus JEDNOU jiný model.
        // Může pomoci podle aktuálních limitů projektu, ale není to garantovaná nová kvóta.
        // Spustí se jen jednou (_fellBack); lze vypnout přes opts.noFallback.
        if(!(opts && opts.noFallback) && !(opts && opts._fellBack)){
          const fb = pickGeminiFallbackModel(model);
          if(fb){
            try{ if(typeof setGenMsg === 'function') setGenMsg('Model „' + model + '" je na limitu (429). Zkouším záložní model „' + fb + '"…'); }catch(_){ }
            return await callGeminiJSON(prompt, extraParts, Object.assign({}, opts, { modelOverride: fb, _fellBack: true }));
          }
        }
        geminiStartCooldown(retryMs || GEMINI_QUOTA_DEFAULT_COOLDOWN_MS);
        throw lastErr;
      }
      // 503/UNAVAILABLE = dočasná nedostupnost. Než zopakujeme stejný požadavek,
      // zkusíme jednou odlišný stabilní model; dostupnost ani limit tím nejsou garantovány.
      const isOverload = res.status === 503 || /UNAVAILABLE/i.test(apiStatus);
      if(isOverload && !(opts && opts.noFallback) && !(opts && opts._fellBack)){
        const fb = pickGeminiFallbackModel(model);
        if(fb){
          try{ if(typeof setGenMsg === 'function') setGenMsg('Model „' + model + '" je přetížený (503). Zkouším záložní model „' + fb + '"…'); }catch(_){ }
          return await callGeminiJSON(prompt, extraParts, Object.assign({}, opts, { modelOverride: fb, _fellBack: true }));
        }
      }
      // 503 = Google overload: omezíme retry na 2 pokusy celkem, abychom nespálili aktivní limit prázdnými požadavky.
      const maxForThisErr = (res && res.status === 503) ? GEMINI_MAX_ATTEMPTS_503 : maxAttempts;
      if(retryable && attempt < maxForThisErr){ await geminiWaitBeforeRetry(attempt, maxForThisErr, res, apiStatus || ('HTTP '+res.status), data); continue; }
      throw lastErr;
    }

    const pf=data.promptFeedback;
    if(pf?.blockReason){
      const ratings = Array.isArray(pf.safetyRatings) ? pf.safetyRatings.map(r => `${r.category||'SAFETY'}:${r.probability||''}`).join(', ') : '';
      throw new Error('Gemini zablokoval už samotné zadání nebo přílohu (blockReason: '+pf.blockReason+'). Uprav text, URL nebo soubor a zkus to znovu.'+(ratings?' Safety: '+ratings:'')+'\n\n'+geminiTechLine(model,attempt,'HTTP 200, promptFeedback.blockReason'));
    }
    const cand=data.candidates&&data.candidates[0];
    if(!cand){
      lastErr = new Error('Gemini vrátil odpověď bez kandidáta.\n\nCo to znamená: HTTP požadavek doběhl, ale ve vráceném JSONu chybí candidates[0], takže generátor nemá z čeho sestavit test.\n\n'+geminiAttemptsText(attempt)+'\n'+geminiActionHint()+'\n\n'+geminiTechLine(model,attempt,'HTTP 200 bez candidates[0]'));
      if(attempt < maxAttempts){ await geminiWaitBeforeRetry(attempt, maxAttempts, null, 'prázdná odpověď', null); continue; }
      throw lastErr;
    }
    const finish=cand&&cand.finishReason;
    if(finish==='MAX_TOKENS')throw new Error('Odpověď Gemini se nevešla do limitu (MAX_TOKENS) a je oříznutá. Zmenši počet cvičení nebo položek, případně zkrať zdrojové texty, a zkus to znovu.\n\n'+geminiTechLine(model,attempt,'finishReason=MAX_TOKENS'));
    if(finish==='SAFETY' || finish==='PROHIBITED_CONTENT' || finish==='BLOCKLIST' || finish==='SPII'){
      const ratings = Array.isArray(cand.safetyRatings) ? cand.safetyRatings.map(r => `${r.category||'SAFETY'}:${r.probability||''}`).join(', ') : '';
      throw new Error('Gemini odpověď zablokoval bezpečnostním filtrem (finishReason: '+finish+'). Uprav zadání, URL nebo přílohu a zkus to znovu.'+(ratings?' Safety: '+ratings:'')+'\n\n'+geminiTechLine(model,attempt,'finishReason='+finish));
    }
    if(finish&&finish!=='STOP'&&finish!=='MAX_TOKENS')throw new Error('Gemini odpověď nedokončil (důvod: '+finish+'). Zkus zmenšit zadání, upravit přílohy nebo spustit generování znovu.\n\n'+geminiTechLine(model,attempt,'finishReason='+finish));
    const text=cand?.content?.parts?.map(p=>p.text||'').join('\n').trim()||'';
    lastGeminiRawResponse = text; // uložíme vždy; při opravě JSON je to záchranná lana pro diagnostiku
    if(!text){
      lastErr = new Error('Gemini vrátil prázdnou odpověď.\n\nCo to znamená: API sice odpovědělo, ale kandidát neobsahoval žádný text použitelný jako JSON.\n\n'+geminiAttemptsText(attempt)+'\n'+geminiActionHint()+'\n\n'+geminiTechLine(model,attempt,'HTTP 200, prázdný candidates[0].content.parts[].text'));
      if(attempt < maxAttempts){ await geminiWaitBeforeRetry(attempt, maxAttempts, null, 'prázdný text', null); continue; }
      throw lastErr;
    }
    try{return JSON.parse(text);}catch(_){
      // 1) zkus jen vyříznout objekt
      const mm=text.match(/\{[\s\S]*\}/);
      if(mm){ try{return JSON.parse(mm[0]);}catch(e1){} }
      // 2) zkus opravit typicky vadný JSON (neescapované ", fence, próza, koncové čárky…)
      try{ return JSON.parse(repairGeminiJson(text)); }catch(e2){
        lastErr = new Error('Gemini vrátil poškozený JSON, který se nepodařilo automaticky opravit.\n\nCo to znamená: odpověď z API přišla, ale nebyla validní JSON. Často jde o useknutý výstup, příliš dlouhý test nebo model vložil text mimo JSON.\n\n'+geminiAttemptsText(attempt)+'\n'+geminiActionHint()+'\n\nDetail parseru: '+(e2&&e2.message?e2.message:e2)+'\n'+geminiTechLine(model,attempt,'JSON.parse/repair selhal'));
        if(attempt < maxAttempts){ await geminiWaitBeforeRetry(attempt, maxAttempts, null, 'poškozený JSON', null); continue; }
        throw lastErr;
      }
    }
  }
  throw lastErr || new Error('Gemini selhal bez detailu. Zkus generování spustit znovu.');
}

function setGenUI(phase) { // 'idle' | 'loading' | 'error' | 'done'
  genUiPhase = phase || 'idle';
  const progress = $('genProgress'), err = $('genError'), result = $('genResult'), btn = $('btnGenerate'), cancelBtn = $('btnCancelGen');
  progress.classList.toggle('hidden', phase !== 'loading');
  err.classList.toggle('hidden', phase !== 'error');
  result.classList.toggle('hidden', phase !== 'done');
  const blockedCopy = (typeof Access !== 'undefined' && Access.blockAllGeneration);
  if (btn) {
    const cooling = geminiCooldownRemainingMs() > 0;
    btn.disabled = phase === 'loading' || blockedCopy || cooling;
    if (blockedCopy) {
      btn.textContent = '⛔ Neoficiální kopie — generování zakázáno';
      btn.title = 'Otevři generátor z oficiální adresy.';
    } else if (phase === 'loading') {
      btn.textContent = '⏳ Generuji…';
      btn.title = '';
    } else if (cooling) {
      geminiUpdateCooldownUI();
    } else {
      btn.textContent = GEMINI_GENERATE_BUTTON_TEXT;
      btn.title = '';
    }
  }
  if (cancelBtn) cancelBtn.classList.toggle('hidden', phase !== 'loading');
  const secure = !!(generatedPackage && generatedPackage.mode === 'secureOffline');
  const title = $('genResultTitle');
  if (title && phase === 'done') title.textContent = secure ? '✅ Balíček je připraven: studentský test + učitelský verifier' : '✅ Test je připraven ke stažení!';
  const main = $('btnDownloadMain'), stBlock = $('dlStudentBlock'), tBlock = $('dlTeacherBlock');
  if (main) { main.classList.toggle('hidden', secure); main.textContent = '⬇ Stáhnout test (.html)'; }
  if (stBlock) stBlock.classList.toggle('hidden', !secure);
  if (tBlock) tBlock.classList.toggle('hidden', !secure);
  if (phase === 'done') { updateSecureDownloadGate(); renderIntegrityPanel(); }
}

function integrityDataForCurrentOutput(){
  if (generatedPackage && generatedPackage.mode === 'secureOffline') {
    return {
      mode:'secureOffline',
      testId:generatedPackage.testId||'',
      manifestHash:generatedPackage.manifestHash||'',
      buildHash:generatedPackage.buildHash||BUILD_HASH,
      generatorVersion:generatedPackage.generatorVersion||RELEASE.version,
      generatedAt:generatedPackage.generatedAt||'',
      creatorId:generatedPackage.creatorId||'',
      creatorName:generatedPackage.creatorName||'',
      creatorRole:generatedPackage.creatorRole||'',
      studentHtmlSha256:generatedPackage.studentHtmlSha256||'',
      teacherHtmlSha256:generatedPackage.teacherHtmlSha256||''
    };
  }
  const cfg=lastAssembled&&lastAssembled.cfg;
  if (generatedIntegrity) return generatedIntegrity;
  if (generatedTestHtml && cfg) return {
    mode:'instant', testId:cfg.testId||'', manifestHash:cfg.manifestHash||'', buildHash:cfg.buildHash||BUILD_HASH,
    generatorVersion:cfg.generatorVersion||RELEASE.version, generatedAt:cfg.generatedAt||'', creatorId:cfg.creatorId||'', creatorName:cfg.creatorName||'', creatorRole:cfg.creatorRole||'',
    studentHtmlSha256:'', teacherHtmlSha256:''
  };
  return null;
}
function integrityJson(){return integrityDataForCurrentOutput()||{};}
function renderIntegrityPanel(){
  const box=$('integrityPanel'); if(!box) return;
  const d=integrityDataForCurrentOutput();
  if(!d){box.classList.add('hidden'); box.innerHTML=''; return;}
  const rows=[
    ['Test ID', d.testId||'—'],
    ['Manifest', d.manifestHash||'—'],
    ['Build hash', d.buildHash||'—'],
    ['Vygenerováno', d.generatedAt||'—'],
    ['Učitel / Creator', (d.creatorId||'—')+(d.creatorName?' · '+d.creatorName:'')+(d.creatorRole?' · '+d.creatorRole:'')],
    ['SHA-256 student HTML', d.studentHtmlSha256||'počítám po vygenerování…'],
    ['SHA-256 verifier', d.teacherHtmlSha256||(d.mode==='secureOffline'?'počítám po vygenerování…':'—')]
  ];
  box.innerHTML='<h3>🔎 Kontrolní otisky souborů</h3><div class="small-muted" style="margin-bottom:8px">Použij pro kontrolu, že na GitHub Pages je správná verze studentského testu a že opravuješ odpovědi správným verifierem. Verifier uvnitř zobrazuje očekávaný SHA-256 hash studentského HTML.</div><div class="integrity-grid">'+rows.map(r=>'<div class="ih-label">'+H(r[0])+'</div><div><code>'+H(r[1])+'</code></div>').join('')+'</div><div class="integrity-actions"><button type="button" onclick="copyIntegrityManifest()">Kopírovat manifest</button><button type="button" onclick="downloadIntegrityManifest()">Stáhnout integrity JSON</button></div>';
  box.classList.remove('hidden');
}
async function copyIntegrityManifest(){
  const txt=JSON.stringify(integrityJson(),null,2);
  try{await navigator.clipboard.writeText(txt);uiToast('Manifest integrity zkopírován.','ok');}catch(_){uiAlert(txt,'Manifest integrity');}
}
function downloadIntegrityManifest(){downloadBlobFile(JSON.stringify(integrityJson(),null,2),'integrity_'+((integrityJson().testId)||'test')+'.json','application/json;charset=utf-8');}

function cancelGeneration(){
  geminiCancelRequested = true;
  if(currentGeminiAbortController){
    try{ currentGeminiAbortController.abort(); }catch(_){ }
    setGenMsg('Ruším generování…');
  } else {
    setGenUI('idle');
  }
}

function setGenMsg(msg) { const el = $('genProgressMsg'); if (el) el.textContent = msg; }
function setGenErr(msg) { const el = $('genError'); if (el) el.textContent = '❌ ' + msg; setGenUI('error'); }

