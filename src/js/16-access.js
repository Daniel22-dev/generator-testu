// ===== INSERTED: ACCESS + AUDIT MODULE (start) =====
// ═══════════════════════════════════════════════════════════════════════════
// PŘÍSTUPOVÝ A AUDITNÍ SYSTÉM (serverless) — v1
// Cíl: řízený přístup pro proškolené učitele + auditní stopa ve výstupech.
// HRANICE: tohle je ORGANIZAČNÍ kontrola, ne kryptografická ochrana aplikace.
//   - Brání NECHTĚNÉMU použití a umožňuje správu proškolených kolegů.
//   - NECHRÁNÍ proti záměrnému technickému obcházení klientského kódu (profil/PIN
//     jsou v localStorage, session unlock v sessionStorage, manifest v souboru —
//     kdo ovládá prohlížeč nebo zdroj, bránu obejde).
//   - Skutečné řízení přístupu = server: školní login, serverové ověření role,
//     serverové volání AI, logování generování. To zde záměrně NENÍ (pro sbor zbytečné).
// Vše běží offline; volitelný externí access-manifest.json umožní správu bez
// vydání nové verze. Odvolání přístupů platí jen v aktuální oficiální verzi.
// ═══════════════════════════════════════════════════════════════════════════
const ACCESS_PROFILE_KEY = 'ghr_access_profile_v1';
// Příznak „v této relaci (tabu) už byl zadán PIN". Drží jen userId a žije v sessionStorage,
// takže přežije reload (např. po „Sestavit nový test"), ale po zavření tabu zmizí —
// nová relace i jiný tab tedy PIN zase vyžadují. Bezpečnost zůstává, mizí jen otravné
// opakované zadávání PINu při návratu na začátek ve stejné relaci.
const ACCESS_SESSION_KEY = 'ghr_access_session_unlocked_v2';
const ACCESS_LEGACY_SESSION_KEYS = ['ghr_access_session_unlocked_v1'];
const ADMIN_WORKING_MANIFEST_KEY = 'ghr_admin_working_manifest_v1';
const ACCESS_KDF_ITER = 200000;
const ACCESS_POLICY_VERSION = 1;
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // bez matoucích 0/O/1/I/L

// Vestavěný (výchozí) přístupový seznam. Funguje offline i bez externího souboru.
// Ukládají se jen otisky (hash) kódů + sůl, nikdy čitelný kód.
const EMBEDDED_MANIFEST = Object.freeze({
  manifestVersion: 1,
  policyVersion: 1,
  issuedAt: '2026-05-30',
  entries: [
    Object.freeze({
      userId: 'ADMIN',
      displayName: 'Správce aplikace',
      role: 'admin',
      status: 'active',
      accessCodeHash: 'pbkdf2-v1$yeYMLdvhsnuoXQ2Rpj2i_qmyUfQc7PQV652ssgeLV7E',
      salt: '9BCdvYJy-Aam6rfusGYkWQ',
      issuedAt: '2026-05-30',
      revokedAt: null,
      note: 'Správce aplikace'
    })
  ]
});

const Access = {
  manifest: null,
  manifestSource: 'embedded', // 'embedded' | 'external'
  envOfficial: false,         // http(s) = webové prostředí
  envKind: 'unknown',         // 'official' | 'unofficialCopy' | 'local' | 'unverified' | 'unknown'
  blockAllGeneration: false,  // true = neoficiální kopie → generování zakázáno
  warnLevel: 'none',          // 'none' | 'soft' | 'block'
  profile: null,
  granted: false,
  workingManifest: null
};

// ── Oficiální umístění aplikace ─────────────────────────────────────────────
// FAIL-OPEN: dokud je OFFICIAL_ORIGINS PRÁZDNÉ, blokace neoficiálních kopií je
// VYPNUTÁ a appka funguje všude jako dřív. Je to schválně — aby ses nikdy
// nezamkl sám sebe (kdyby byla adresa špatně, přišel bys o svůj denní nástroj).
// Jakmile sem doplníš SVOU skutečnou adresu, appka začne rozlišovat „tvou
// oficiální verzi" od cizích forků/kopií a na NEOFICIÁLNÍ kopii ZNEMOŽNÍ
// generování testu.
//   • Stačí origin (schéma+doména), např. 'https://daniel22-dev.github.io'.
//   • OFFICIAL_PATH_PREFIXES nech prázdné = jakákoli cesta na tom originu je
//     oficiální (hodí se, když máš víc repozitářů pod stejným github.io).
//     Když chceš omezit na konkrétní repo, přidej třeba '/interaktivni-testy/'.
//   • Porovnává se přesná shoda originu (malými písmeny). file:// (místní soubor)
//     je samostatný stav „local" a řídí se dosavadní logikou (varování + u
//     klasifikovaného testu potvrzení).
const OFFICIAL_ORIGINS = [
  'https://daniel22-dev.github.io',
];
const OFFICIAL_PATH_PREFIXES = [
  '/generator-testu/',
];
function isOfficialOriginConfigured(){ return OFFICIAL_ORIGINS.length > 0; }
function isOfficialDeployment(){
  // Nenakonfigurováno → nic neblokujeme (fail-open).
  if (!isOfficialOriginConfigured()) return true;
  var origin = String(location.origin || '').toLowerCase();
  if (OFFICIAL_ORIGINS.map(function(o){return String(o||'').toLowerCase();}).indexOf(origin) === -1) return false;
  if (!OFFICIAL_PATH_PREFIXES.length) return true; // origin stačí
  // Cesta se porovnává bez ohledu na velikost písmen — názvy repozitářů na GitHubu
  // mají často velká písmena a cesty jsou jinak case-sensitive; tím se vyhneme tomu,
  // aby tě jiná velikost písmen omylem označila za neoficiální kopii.
  var path = String(location.pathname || '').toLowerCase();
  return OFFICIAL_PATH_PREFIXES.some(function(p){ return path.indexOf(String(p||'').toLowerCase()) === 0; });
}

// ── Pomocné: kódování / normalizace ────────────────────────────────────────
function accB64urlToBytes(s){
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  var bin = atob(s);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function accNormCode(s){ return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function accNormPin(s){ return String(s == null ? '' : s).trim(); }
async function accDeriveKdf(kind, secret, saltBytes){
  // Přístupový kód / lokální PIN jsou bezpečnostní hranice → bez WebCrypto se nehashuje vůbec.
  // Dřív se tu tiše uložil slabý FNV hash (triviálně reverzibilní); teď to tvrdě selže a
  // volající (vytvoření i ověření) chybu zachytí jako fail-closed.
  requireWebCrypto('Přístupový kód');
  var enc = new TextEncoder();
  var key = await crypto.subtle.importKey('raw', enc.encode(kind + '\u0000' + secret), { name: 'PBKDF2' }, false, ['deriveBits']);
  var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: ACCESS_KDF_ITER, hash: 'SHA-256' }, key, 256);
  return 'pbkdf2-v1$' + b64UrlFromBuffer(bits);
}
async function hashAccessCode(code, saltB64){ return await accDeriveKdf('access-code-v1', accNormCode(code), accB64urlToBytes(saltB64)); }
async function hashLocalPin(pin, saltB64){ return await accDeriveKdf('local-pin-v1', accNormPin(pin), accB64urlToBytes(saltB64)); }
function newSaltB64(){
  if (!(window.crypto && crypto.getRandomValues))
    throw new Error('WebCrypto není dostupné — generování soli pro přístupový kód selhalo.');
  var a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return b64UrlFromBuffer(a);
}
function accCodeSeg(n){
  if (!(window.crypto && crypto.getRandomValues))
    throw new Error('WebCrypto není dostupné — generování přístupového kódu selhalo.');
  var a = new Uint8Array(n);
  crypto.getRandomValues(a);
  var out = '';
  for (var j = 0; j < n; j++) out += ACCESS_CODE_ALPHABET[a[j] % ACCESS_CODE_ALPHABET.length];
  return out;
}
function newAccessCode(userId){
  var uid = accNormCode(userId) || 'USER';
  return 'GHR-' + uid + '-' + accCodeSeg(4) + '-' + accCodeSeg(4);
}

// ── Lokální profil ─────────────────────────────────────────────────────────
function loadProfileRaw(){
  try { var raw = localStorage.getItem(ACCESS_PROFILE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
function saveProfile(p){
  try { localStorage.setItem(ACCESS_PROFILE_KEY, JSON.stringify(p)); return true; }
  catch (e) { return false; }
}
function wipeProfile(){
  try { localStorage.removeItem(ACCESS_PROFILE_KEY); } catch (e) {}
  accClearSessionUnlock();
  Access.profile = null;
}

// ── Odemčení v rámci relace (přežije reload, ne zavření tabu) ─────────────────
function accSessionToken(p){
  return p && p.userId ? String(p.userId) + '|' + String(RELEASE.version) : '';
}
function accSetSessionUnlock(){
  try {
    var p = Access.profile;
    if (p && p.userId) sessionStorage.setItem(ACCESS_SESSION_KEY, accSessionToken(p));
    ACCESS_LEGACY_SESSION_KEYS.forEach(function(key){ sessionStorage.removeItem(key); });
  } catch (e) {}
}
function accClearSessionUnlock(){
  try {
    sessionStorage.removeItem(ACCESS_SESSION_KEY);
    ACCESS_LEGACY_SESSION_KEYS.forEach(function(key){ sessionStorage.removeItem(key); });
  } catch (e) {}
}
function accSessionUnlockValid(p){
  try { return !!(p && p.userId && sessionStorage.getItem(ACCESS_SESSION_KEY) === accSessionToken(p)); }
  catch (e) { return false; }
}
function accConsumeBootCommand(){
  var out = { forceLock:false, resetAccess:false };
  try {
    var u = new URL(location.href);
    out.forceLock = u.searchParams.get('lock') === '1';
    out.resetAccess = u.searchParams.get('reset-access') === '1';
    if (out.forceLock || out.resetAccess){
      u.searchParams.delete('lock');
      u.searchParams.delete('reset-access');
      if (history && history.replaceState) history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || ''));
    }
  } catch (e) {}
  return out;
}
// Rerevalidace proti aktuálnímu manifestu (zdroj pravdy pro odvolání / rotaci kódu).
// Vrací true, když je profil pořád platný; jinak false (a volající vyžádá PIN/blokaci).
function accProfileStillValid(p){
  var m = Access.manifest || EMBEDDED_MANIFEST;
  var e = accFindEntry(m, p.userId);
  if (!e) return false;
  if (String(e.status).toLowerCase() === 'revoked') return false;
  if (e.accessCodeHash !== p.activationCodeHashRef) return false;
  p.role = e.role; p.displayName = e.displayName || p.displayName;
  return true;
}

// ── Manifest ────────────────────────────────────────────────────────────────
function accValidManifest(m){
  if (!m || typeof m !== 'object') return false;
  if (!Array.isArray(m.entries)) return false;
  for (var i = 0; i < m.entries.length; i++){
    var e = m.entries[i];
    if (!e || !e.userId || !e.role || !e.status) return false;
  }
  return true;
}
function accFindEntry(m, userId){
  if (!m || !Array.isArray(m.entries)) return null;
  var uid = accNormCode(userId);
  for (var i = 0; i < m.entries.length; i++){
    if (accNormCode(m.entries[i].userId) === uid) return m.entries[i];
  }
  return null;
}
async function loadEffectiveManifest(){
  var proto = (location.protocol || '').toLowerCase();
  Access.envOfficial = (proto === 'http:' || proto === 'https:');
  var manifest = EMBEDDED_MANIFEST;
  var source = 'embedded';
  if (Access.envOfficial){
    try {
      var url = new URL('access-manifest.json', location.href);
      var resp = await fetch(url.href, { cache: 'no-store' });
      if (resp && resp.ok){
        var ext = await resp.json();
        if (accValidManifest(ext)){ manifest = ext; source = 'external'; }
      }
    } catch (e) { /* offline / 404 / blokováno → vestavěný */ }
  }
  Access.manifest = manifest;
  Access.manifestSource = source;
  // Jemnější rozlišení prostředí + tvrdá blokace pro neoficiální kopie.
  if (!Access.envOfficial){
    Access.envKind = 'local';            // file:// — dosavadní chování (varování, u ostrého testu potvrzení)
  } else if (!isOfficialOriginConfigured()){
    Access.envKind = 'unverified';       // web, ale oficiální adresa zatím nenastavena → jako dřív
  } else if (isOfficialDeployment()){
    Access.envKind = 'official';
  } else {
    Access.envKind = 'unofficialCopy';   // web, ale cizí origin/cesta → neoficiální kopie
  }
  Access.blockAllGeneration = (Access.envKind === 'unofficialCopy');
  if (!Access.envOfficial) Access.warnLevel = 'block';
  else if (Access.envKind === 'unofficialCopy') Access.warnLevel = 'block';
  else if (source === 'external') Access.warnLevel = 'none';
  else Access.warnLevel = 'soft';
  return manifest;
}
function updateAccessEnvBanner(){
  var b = document.getElementById('accessEnvBanner');
  if (!b) return;
  if (Access.envKind === 'unofficialCopy'){
    b.className = 'banner red';
    var expected = OFFICIAL_ORIGINS.join(', ') + (OFFICIAL_PATH_PREFIXES.length ? (' (cesta: ' + OFFICIAL_PATH_PREFIXES.join(', ') + ')') : '');
    b.textContent = '⛔ Tohle je NEOFICIÁLNÍ kopie aplikace — generování testu je zakázané. Běží z „' + (location.origin || '?') + location.pathname + '", ale oficiální umístění je „' + expected + '". Otevři nástroj z oficiální adresy. (Pokud je tahle adresa ve skutečnosti tvoje oficiální, uprav OFFICIAL_ORIGINS ve zdroji.)';
  } else if (Access.warnLevel === 'block'){
    b.className = 'banner red';
    b.textContent = '⚠️ Tato kopie neběží z oficiálního školního umístění (otevřeno jako místní soubor). Odvolání přístupů ani aktuálnost seznamu nelze ověřit. Pro klasifikované (ostré) použití spusť aplikaci z oficiální školní adresy.';
  } else if (Access.warnLevel === 'soft'){
    b.className = 'banner amber';
    b.textContent = 'ℹ️ Používá se vestavěný přístupový seznam (verze uložená v souboru). Pro správu přístupů bez vydání nové verze můžeš vedle souboru umístit access-manifest.json.';
  } else {
    b.className = 'banner hidden';
    b.textContent = '';
  }
}

// ── Identita pro audit (volá se z build funkcí za běhu) ─────────────────────
function currentCreator(){
  var p = (typeof Access !== 'undefined' && Access && Access.profile) ? Access.profile : null;
  if (p && p.userId) return { id: p.userId, name: p.displayName || '', role: p.role || 'trainedTeacher' };
  return { id: 'UNKNOWN', name: '', role: 'trainedTeacher' };
}
function auditMetaObject(cfg){
  cfg = cfg || {};
  return {
    audit: 'GHR-AUDIT-V1',
    creatorId: cfg.creatorId || '',
    creatorRole: cfg.creatorRole || '',
    testId: cfg.testId || '',
    manifestHash: cfg.manifestHash || '',
    generatorVersion: cfg.generatorVersion || '',
    buildHash: cfg.buildHash || '',
    releaseStatus: cfg.releaseStatus || '',
    releaseDate: cfg.releaseDate || '',
    resultMode: cfg.resultMode || '',
    appMode: cfg.appMode || '',
    secureOffline: (cfg.resultMode === 'secureOffline'),
    generatedAt: new Date().toISOString()
  };
}
function auditCommentHtml(cfg){
  try {
    var json = JSON.stringify(auditMetaObject(cfg), null, 0).replace(/--/g, '—');
    return '\n<!-- GHR-AUDIT-META ' + json + ' -->\n';
  } catch (e) { return ''; }
}

// ── Brána (overlay) ──────────────────────────────────────────────────────────
function accSetAppGated(on){
  var wrap = document.querySelector('.wrap');
  var header = document.querySelector('.header');
  if (on){
    document.body.classList.add('acc-locked');
    if (wrap) wrap.setAttribute('inert', '');
    if (header) header.setAttribute('inert', '');
  } else {
    document.body.classList.remove('acc-locked');
    if (wrap) wrap.removeAttribute('inert');
    if (header) header.removeAttribute('inert');
  }
}
function accGateEl(){ return document.getElementById('accessGate'); }
function accRemoveGate(){ var g = accGateEl(); if (g) g.remove(); }
function accEnsureGate(){
  var g = accGateEl();
  if (!g){
    g = document.createElement('div');
    g.id = 'accessGate';
    g.className = 'access-gate';
    g.setAttribute('role', 'dialog');
    g.setAttribute('aria-modal', 'true');
    document.body.appendChild(g);
  }
  return g;
}
function accVersionFootHtml(){
  var warn = '';
  if (Access.warnLevel === 'block') warn = '<div class="acc-warn">Neoficiální umístění (místní soubor) — odvolání přístupů nelze ověřit.</div>';
  else if (Access.warnLevel === 'soft') warn = '<div class="acc-hint">Vestavěný přístupový seznam.</div>';
  return '<div class="acc-foot">v' + esc(RELEASE.version) + ' · ' + esc(RELEASE.date) + ' · ' + esc(BUILD_HASH) + ' · ' + esc(RELEASE.status) + '</div>' + warn;
}

// ── Obrazovka: aktivace ──────────────────────────────────────────────────────
function accShowActivate(msg, isErr){
  var g = accEnsureGate();
  g.innerHTML =
    '<div class="acc-box">'
    + '<div class="acc-title">🔐 Přístup pro proškolené učitele</div>'
    + '<div class="acc-sub">Zadej svůj osobní aktivační kód. Kód dostaneš od správce a je vázaný jen na tebe — nesdílej ho.</div>'
    + (msg ? '<div class="' + (isErr ? 'acc-err' : 'acc-ok') + '">' + esc(msg) + '</div>' : '')
    + '<div class="acc-field"><label class="acc-label" for="accCodeInp">Aktivační kód</label>'
    +   '<input class="acc-input" id="accCodeInp" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="GHR-PRIJMENI-XXXX-XXXX"></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accActivateBtn">Aktivovat</button></div>'
    + '<div class="acc-hint">Kód se ověří proti přístupovému seznamu. Po aktivaci si na tomto zařízení nastavíš místní PIN.</div>'
    + accVersionFootHtml()
    + '</div>';
  var inp = document.getElementById('accCodeInp');
  var btn = document.getElementById('accActivateBtn');
  var go = function(){ accTryActivate(inp.value); };
  btn.addEventListener('click', go);
  inp.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); go(); } });
  setTimeout(function(){ inp.focus(); }, 0);
}
async function accTryActivate(codeRaw){
  var code = String(codeRaw || '').trim();
  if (!code){ accShowActivate('Zadej aktivační kód.', true); return; }
  try { requireWebCrypto('Ověření přístupu'); }
  catch(e){ accShowActivate('Tento prohlížeč nemá dostupné WebCrypto, takže přístupový kód nelze bezpečně ověřit. Otevři aplikaci v běžném prohlížeči (Chrome, Edge, Firefox, Safari) přes https://, ne ve vestavěném náhledu/WebView.', true); return; }
  var btn = document.getElementById('accActivateBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'Ověřuji…'; }
  var m = Access.manifest || EMBEDDED_MANIFEST;
  var seg = String(code).split('-');
  var guessId = seg.length >= 2 ? seg[1] : '';
  var candidates = [];
  var direct = guessId ? accFindEntry(m, guessId) : null;
  if (direct) candidates.push(direct);
  for (var i = 0; i < m.entries.length; i++){
    if (candidates.indexOf(m.entries[i]) === -1) candidates.push(m.entries[i]);
  }
  var matched = null;
  for (var k = 0; k < candidates.length; k++){
    var e = candidates[k];
    if (!e || !e.accessCodeHash || !e.salt) continue;
    try {
      var h = await hashAccessCode(code, e.salt);
      if (h === e.accessCodeHash){ matched = e; break; }
    } catch (err) {}
  }
  if (!matched){
    accShowActivate('Kód nesouhlasí s žádným platným záznamem. Zkontroluj přepis (na velikosti písmen ani pomlčkách nezáleží).', true);
    return;
  }
  if (String(matched.status).toLowerCase() === 'revoked'){
    accShowActivate('Tento přístup byl odvolán. Kontaktuj správce.', true);
    return;
  }
  accShowSetPin(matched, code);
}

// ── Obrazovka: nastavení PINu ────────────────────────────────────────────────
function accShowSetPin(entry, code, msg, isErr){
  var g = accEnsureGate();
  g.innerHTML =
    '<div class="acc-box">'
    + '<div class="acc-title">🔑 Nastav místní PIN</div>'
    + '<div class="acc-sub">Vítej, ' + esc(entry.displayName || entry.userId) + '. Na tomto zařízení si nastav PIN (min. 6 znaků). PIN se ukládá jen jako otisk (hash) v tomto prohlížeči — nikdy jako čitelný text.</div>'
    + '<div class="acc-role' + (entry.role === 'admin' ? ' admin' : '') + '">' + (entry.role === 'admin' ? 'admin' : 'proškolený učitel') + '</div>'
    + (msg ? '<div class="' + (isErr ? 'acc-err' : 'acc-ok') + '">' + esc(msg) + '</div>' : '')
    + '<div class="acc-field"><label class="acc-label" for="accPin1">Nový PIN</label><input class="acc-input" id="accPin1" type="password" autocomplete="new-password" inputmode="numeric"></div>'
    + '<div class="acc-field"><label class="acc-label" for="accPin2">PIN znovu</label><input class="acc-input" id="accPin2" type="password" autocomplete="new-password" inputmode="numeric"></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accSetPinBtn">Uložit PIN a pokračovat</button></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accSetPinBack">Zpět</button></div>'
    + accVersionFootHtml()
    + '</div>';
  var p1 = document.getElementById('accPin1'), p2 = document.getElementById('accPin2');
  var btn = document.getElementById('accSetPinBtn');
  document.getElementById('accSetPinBack').addEventListener('click', function(){ accShowActivate(); });
  var go = function(){ accDoSetPin(entry, code, p1.value, p2.value); };
  btn.addEventListener('click', go);
  p2.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); go(); } });
  setTimeout(function(){ p1.focus(); }, 0);
}
async function accDoSetPin(entry, code, pin1, pin2){
  pin1 = String(pin1 || ''); pin2 = String(pin2 || '');
  if (pin1.trim().length < 6){ accShowSetPin(entry, code, 'PIN musí mít aspoň 6 znaků.', true); return; }
  if (pin1 !== pin2){ accShowSetPin(entry, code, 'PINy se neshodují.', true); return; }
  var btn = document.getElementById('accSetPinBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'Ukládám…'; }
  var salt = newSaltB64();
  var pinHash;
  try { pinHash = await hashLocalPin(pin1, salt); }
  catch (e){ accShowSetPin(entry, code, 'PIN se nepodařilo zpracovat (WebCrypto nedostupné).', true); return; }
  var now = new Date().toISOString();
  var profile = {
    v: 1,
    userId: entry.userId,
    role: entry.role,
    displayName: entry.displayName || '',
    activated: true,
    pinSalt: salt,
    pinHash: pinHash,
    activationCodeHashRef: entry.accessCodeHash,
    activatedAt: now,
    lastUsedAt: now,
    acceptedPolicyVersion: 0
  };
  saveProfile(profile);
  Access.profile = profile;
  await accAfterUnlock();
}

// ── Obrazovka: zadání PINu (návrat) ──────────────────────────────────────────
var accPinAttempts = 0;
function accShowPin(msg, isErr){
  var g = accEnsureGate();
  var p = Access.profile || {};
  g.innerHTML =
    '<div class="acc-box">'
    + '<div class="acc-title">🔒 Odemkni přístup</div>'
    + '<div class="acc-sub">' + esc(p.displayName || p.userId || '') + (p.role === 'admin' ? ' · admin' : '') + '</div>'
    + (msg ? '<div class="' + (isErr ? 'acc-err' : 'acc-ok') + '">' + esc(msg) + '</div>' : '')
    + '<div class="acc-field"><label class="acc-label" for="accPinInp">PIN</label><input class="acc-input" id="accPinInp" type="password" autocomplete="current-password" inputmode="numeric"></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accPinBtn">Odemknout</button></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accPinReset">Reset PINu</button><button type="button" class="acc-btn" id="accPinForget">Zapomenout zařízení</button></div>'
    + accVersionFootHtml()
    + '</div>';
  var inp = document.getElementById('accPinInp');
  var btn = document.getElementById('accPinBtn');
  document.getElementById('accPinReset').addEventListener('click', accResetPinFlow);
  document.getElementById('accPinForget').addEventListener('click', accForgetDeviceFlow);
  var go = function(){ accTryPin(inp.value); };
  btn.addEventListener('click', go);
  inp.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); go(); } });
  setTimeout(function(){ inp.focus(); }, 0);
}
async function accTryPin(pinRaw){
  var p = Access.profile;
  if (!p){ accShowActivate(); return; }
  var btn = document.getElementById('accPinBtn');
  if (btn){ btn.disabled = true; btn.textContent = 'Ověřuji…'; }
  var h;
  try { h = await hashLocalPin(pinRaw, p.pinSalt); } catch (e){ h = null; }
  if (h !== p.pinHash){
    accPinAttempts++;
    var hint = accPinAttempts >= 5 ? ' Pokud si PIN nepamatuješ, použij Reset PINu a zadej znovu aktivační kód.' : '';
    accShowPin('Nesprávný PIN.' + hint, true);
    return;
  }
  accPinAttempts = 0;
  // Re-validace proti aktuálnímu manifestu (zdroj pravdy pro odvolání).
  var m = Access.manifest || EMBEDDED_MANIFEST;
  var e = accFindEntry(m, p.userId);
  if (!e){ accShowBlocked('Tvůj záznam v přístupovém seznamu chybí. Přístup byl odebrán nebo se seznam změnil.'); return; }
  if (String(e.status).toLowerCase() === 'revoked'){ accShowBlocked('Tvůj přístup byl odvolán správcem.'); return; }
  if (e.accessCodeHash !== p.activationCodeHashRef){
    accShowActivate('Tvůj aktivační kód byl změněn (rotace). Zadej nový kód pro opětovnou aktivaci.', true);
    return;
  }
  p.role = e.role; p.displayName = e.displayName || p.displayName;
  p.lastUsedAt = new Date().toISOString();
  saveProfile(p);
  Access.profile = p;
  await accAfterUnlock();
}

// ── Obrazovka: blokace ───────────────────────────────────────────────────────
function accShowBlocked(reason){
  var g = accEnsureGate();
  g.innerHTML =
    '<div class="acc-box">'
    + '<div class="acc-title">⛔ Přístup není povolen</div>'
    + '<div class="acc-err">' + esc(reason || 'Tento přístup nelze ověřit.') + '</div>'
    + '<div class="acc-sub">Pokud jde o omyl, kontaktuj správce. Chybu vyřeší nový aktivační kód.</div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accBlkActivate">Zadat nový aktivační kód</button></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accBlkForget">Zapomenout toto zařízení</button></div>'
    + accVersionFootHtml()
    + '</div>';
  document.getElementById('accBlkActivate').addEventListener('click', function(){ accShowActivate(); });
  document.getElementById('accBlkForget').addEventListener('click', accForgetDeviceFlow);
}

// ── Reset PINu / zapomenout zařízení (z brány) ───────────────────────────────
async function accResetPinFlow(){
  var ok = await uiConfirm('Reset místního PINu smaže lokální profil na tomto zařízení. Pro další přístup budeš muset znovu zadat svůj aktivační kód. Pokračovat?', 'Reset lokálního PINu', true);
  if (!ok) return;
  wipeProfile();
  accShowActivate('Lokální profil byl smazán. Zadej aktivační kód pro novou aktivaci.', false);
}
async function accForgetDeviceFlow(){
  var ok = await uiConfirm('„Zapomenout toto zařízení“ smaže lokální profil (userId, roli, otisk PINu). Citlivá data testů tím nemizí — na to slouží „Vymazat citlivé údaje“. Pokračovat?', 'Zapomenout toto zařízení', true);
  if (!ok) return;
  wipeProfile();
  accShowActivate('Zařízení zapomenuto. Pro přístup zadej aktivační kód.', false);
}

// ── Pravidla (jednorázové potvrzení) ─────────────────────────────────────────
function accPolicyText(){
  return [
    'Tvůj aktivační kód je osobní a vázaný jen na tebe. Nesdílej ho s nikým — ani se studenty, ani s kolegy (každý má vlastní kód).',
    'Studentům nikdy neposílej teacher_verifier.html, ověřovací .txt, archivy, odpovědní klíče ani API klíče. Studentům patří pouze student_test.html.',
    'Výstupy obsahují tvé Creator ID kvůli auditní stopě. Neupravuj je tak, abys identitu skryl.',
    'Osobní údaje studentů (jména, výsledky, odpovědi) ukládej jen do zabezpečeného školního úložiště.',
    'Pro klasifikované (ostré) testy používej bezpečný offline režim a spouštěj aplikaci z oficiální školní adresy v aktuální schválené verzi.'
  ];
}
function accShowPolicy(){
  return new Promise(function(resolve){
    var g = accEnsureGate();
    var items = accPolicyText().map(function(s){ return '<li style="margin:6px 0">' + esc(s) + '</li>'; }).join('');
    g.innerHTML =
      '<div class="acc-box">'
      + '<div class="acc-title">📜 Pravidla používání</div>'
      + '<div class="acc-sub">Než budeš pokračovat, potvrď prosím pravidla pro bezpečné a odpovědné používání nástroje.</div>'
      + '<ul style="text-align:left;font-size:14px;line-height:1.5;padding-left:20px;margin:10px 0">' + items + '</ul>'
      + '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accPolicyOk">Rozumím a souhlasím</button></div>'
      + '<div class="acc-actions"><button type="button" class="acc-btn" id="accPolicyOut">Odhlásit / zamknout</button></div>'
      + accVersionFootHtml()
      + '</div>';
    document.getElementById('accPolicyOk').addEventListener('click', function(){
      if (Access.profile){ Access.profile.acceptedPolicyVersion = ACCESS_POLICY_VERSION; saveProfile(Access.profile); }
      resolve(true);
    });
    document.getElementById('accPolicyOut').addEventListener('click', function(){ resolve(false); });
  });
}

// ── Orchestrace odemčení → pravidla → vpuštění ───────────────────────────────
async function accAfterUnlock(){
  var p = Access.profile;
  if (!p){ accShowActivate(); return; }
  if ((p.acceptedPolicyVersion || 0) < ACCESS_POLICY_VERSION){
    var agreed = await accShowPolicy();
    if (!agreed){ accShowPin('Pro pokračování je potřeba potvrdit pravidla.', false); return; }
  }
  accOnGranted();
}
function accOnGranted(){
  Access.granted = true;
  accSetSessionUnlock();
  accSetAppGated(false);
  accRemoveGate();
  var p = Access.profile || {};
  var chip = document.getElementById('accChip');
  if (chip){
    chip.textContent = (p.displayName || p.userId || 'účet') + ' · ' + (p.role === 'admin' ? 'admin' : 'učitel');
    chip.classList.remove('hidden');
  }
  var aChip = document.getElementById('accAdminChip');
  if (aChip){
    if (p.role === 'admin') aChip.classList.remove('hidden');
    else aChip.classList.add('hidden');
  }
  var tlChip = document.getElementById('accTestLabChip');
  if (tlChip){
    if (p.role === 'admin') tlChip.classList.remove('hidden');
    else tlChip.classList.add('hidden');
  }
  var isAdminNow = (p.role === 'admin');
  ['btnGenSecCode','btnCopySecCode'].forEach(function(id){
    var b = document.getElementById(id);
    if (b){ if (isAdminNow) b.classList.remove('hidden'); else b.classList.add('hidden'); }
  });
  // Přenos zadání: horní panel (export+import) jen admin; tlačítko exportu pod generováním jen neadmin (kolega).
  var shareTop = document.getElementById('shareZadani');
  if (shareTop){ if (isAdminNow) shareTop.classList.remove('hidden'); else shareTop.classList.add('hidden'); }
  var shareGen = document.getElementById('exportZadaniGen');
  if (shareGen){ if (isAdminNow) shareGen.classList.add('hidden'); else shareGen.classList.remove('hidden'); }
  // Na vlastním zařízení doplň uložený týmový bezpečnostní kód rovnou (bez klikání na „Načíst").
  if (typeof autoApplyStoredSecurityCode === 'function') autoApplyStoredSecurityCode();
  updateAccessEnvBanner();
  // showWelcomeModal rozhodne podle ONBOARDING_DONE_KEY:
  // první spuštění → celý průvodce (4 kroky), opakované → krátké uvítání
  if (typeof showWelcomeModal === 'function') { setTimeout(function(){ showWelcomeModal(p); }, 80); }
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function accessBoot(){
  try { await loadEffectiveManifest(); }
  catch (e){
    Access.manifest = EMBEDDED_MANIFEST; Access.manifestSource = 'embedded';
    if (!Access.envOfficial){ Access.envKind = 'local'; }
    else if (!isOfficialOriginConfigured()){ Access.envKind = 'unverified'; }
    else if (isOfficialDeployment()){ Access.envKind = 'official'; }
    else { Access.envKind = 'unofficialCopy'; }
    Access.blockAllGeneration = (Access.envKind === 'unofficialCopy');
    if (!Access.envOfficial) Access.warnLevel = 'block';
    else if (Access.envKind === 'unofficialCopy') Access.warnLevel = 'block';
    else Access.warnLevel = 'soft';
  }
  updateAccessEnvBanner();
  try { if (typeof setGenUI === 'function') setGenUI('idle'); } catch(_){}
  var bootCommand = accConsumeBootCommand();
  if (bootCommand.resetAccess) wipeProfile();
  else if (bootCommand.forceLock) accClearSessionUnlock();
  Access.profile = loadProfileRaw();
  var p = Access.profile;
  // Pokud uživatel už v této relaci (tomto tabu) PIN zadal a profil je pořád platný
  // (nebyl odvolán / kód nerotoval), pusť ho rovnou — žádné opakované zadávání PINu
  // při reloadu po „Sestavit nový test". Nová relace nebo jiný tab PIN zase vyžadují.
  if (p && p.pinHash && accSessionUnlockValid(p)){
    if (accProfileStillValid(p)){
      saveProfile(p); Access.profile = p;
      // Uzamkni pro jistotu (kdyby accAfterUnlock zobrazil pravidla); když se vpustí
      // rovnou, accOnGranted bránu synchronně odstraní ještě před vykreslením — bez bliknutí.
      accSetAppGated(true); accEnsureGate();
      await accAfterUnlock();
      return;
    }
    accClearSessionUnlock(); // profil mezitím přestal platit → zpět na PIN/blokaci
  }
  accSetAppGated(true);
  accEnsureGate();
  if (p && p.pinHash) accShowPin();
  else accShowActivate();
}

// ── Účet (chip v záhlaví) ────────────────────────────────────────────────────
function accIsAdmin(){ return !!(Access.profile && Access.profile.role === 'admin'); }
function accLockNow(){
  Access.granted = false;
  accClearSessionUnlock();
  var chip = document.getElementById('accChip'); if (chip) chip.classList.add('hidden');
  var aChip = document.getElementById('accAdminChip'); if (aChip) aChip.classList.add('hidden'); var tlChip = document.getElementById('accTestLabChip'); if (tlChip) tlChip.classList.add('hidden');
  accSetAppGated(true);
  accEnsureGate();
  if (Access.profile && Access.profile.pinHash) accShowPin('Zamčeno. Zadej PIN.', false);
  else accShowActivate();
}
function accShowPolicyReadonly(){
  var items = accPolicyText().map(function(s){ return '• ' + s; }).join('\n\n');
  uiAlert(items, 'Pravidla používání');
}
async function accResetPinFlowFromApp(){
  var ok = await uiConfirm('Reset místního PINu smaže lokální profil. Pro další přístup budeš muset znovu zadat aktivační kód. Pokračovat?', 'Reset lokálního PINu', true);
  if (!ok) return;
  wipeProfile(); Access.granted = false;
  var chip = document.getElementById('accChip'); if (chip) chip.classList.add('hidden');
  var aChip = document.getElementById('accAdminChip'); if (aChip) aChip.classList.add('hidden'); var tlChip = document.getElementById('accTestLabChip'); if (tlChip) tlChip.classList.add('hidden');
  accSetAppGated(true); accEnsureGate();
  accShowActivate('Lokální profil byl smazán. Zadej aktivační kód.', false);
}
async function accForgetDeviceFlowFromApp(){
  var ok = await uiConfirm('„Zapomenout toto zařízení“ smaže lokální profil. Citlivá data testů tím nemizí. Pokračovat?', 'Zapomenout toto zařízení', true);
  if (!ok) return;
  wipeProfile(); Access.granted = false;
  var chip = document.getElementById('accChip'); if (chip) chip.classList.add('hidden');
  var aChip = document.getElementById('accAdminChip'); if (aChip) aChip.classList.add('hidden'); var tlChip = document.getElementById('accTestLabChip'); if (tlChip) tlChip.classList.add('hidden');
  accSetAppGated(true); accEnsureGate();
  accShowActivate('Zařízení zapomenuto. Zadej aktivační kód.', false);
}
function openAccountModal(){
  if (!Access.granted || !Access.profile){ return; }
  var p = Access.profile;
  var srcLabel = Access.manifestSource === 'external' ? 'externí soubor (ověřeno)' : 'vestavěný';
  var warnLabel = Access.warnLevel === 'block' ? 'neoficiální umístění' : (Access.warnLevel === 'soft' ? 'vestavěný seznam' : 'oficiální');
  var bd = document.createElement('div');
  bd.className = 'ui-modal-backdrop';
  bd.id = 'accAccountModal';
  bd.setAttribute('role', 'dialog'); bd.setAttribute('aria-modal', 'true');
  var adminBtns = accIsAdmin()
    ? '<button type="button" class="acc-btn" id="accmSprava">🔐 Správa přístupů</button><button type="button" class="acc-btn" id="accmTestLab">🧪 Test Lab</button><button type="button" class="acc-btn" id="accmIncident">🚨 Bezpečnostní incident</button>'
    : '';
  bd.innerHTML =
    '<div class="ui-modal-box">'
    + '<div class="ui-modal-head">Účet a přístup</div>'
    + '<div class="ui-modal-body">'
    +   '<div><b>' + esc(p.displayName || '') + '</b> (' + esc(p.userId) + ')</div>'
    +   '<div>Role: ' + esc(p.role) + '</div>'
    +   '<div>Aktivováno: ' + esc((p.activatedAt || '').slice(0, 10)) + '</div>'
    +   '<div>Naposledy: ' + esc((p.lastUsedAt || '').slice(0, 16).replace('T', ' ')) + '</div>'
    +   '<div>Pravidla potvrzena: verze ' + esc(String(p.acceptedPolicyVersion || 0)) + '</div>'
    +   '<div>Přístupový seznam: ' + esc(srcLabel) + ' · ' + esc(warnLabel) + '</div>'
    +   '<div>Verze: v' + esc(RELEASE.version) + ' (' + esc(RELEASE.status) + ')</div>'
    +   '<div class="acc-note" style="margin-top:10px;margin-bottom:0">Přístup pro proškolené učitele je organizační kontrola (kdo smí tvořit klasifikované testy) + auditní stopa, ne kryptografická ochrana aplikace.</div>'
    + '</div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accmLock">Zamknout</button><button type="button" class="acc-btn" id="accmClear">Vymazat citlivé údaje z této relace</button></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accmResetPin">Reset lokálního PINu</button><button type="button" class="acc-btn" id="accmForget">Zapomenout toto zařízení</button></div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accmPolicy">Zobrazit pravidla</button>' + adminBtns + '</div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accmClose">Zavřít</button></div>'
    + '</div>';
  document.body.appendChild(bd);
  var close = function(){ bd.remove(); };
  bd.addEventListener('click', function(e){ if (e.target === bd) close(); });
  document.getElementById('accmClose').addEventListener('click', close);
  document.getElementById('accmLock').addEventListener('click', function(){ close(); accLockNow(); });
  document.getElementById('accmClear').addEventListener('click', function(){ close(); clearSensitiveSession(); });
  document.getElementById('accmResetPin').addEventListener('click', function(){ close(); accResetPinFlowFromApp(); });
  document.getElementById('accmForget').addEventListener('click', function(){ close(); accForgetDeviceFlowFromApp(); });
  document.getElementById('accmPolicy').addEventListener('click', function(){ close(); accShowPolicyReadonly(); });
  if (accIsAdmin()){
    var s = document.getElementById('accmSprava'); if (s) s.addEventListener('click', function(){ close(); openAdminPanel(); });
    var tl = document.getElementById('accmTestLab'); if (tl) tl.addEventListener('click', function(){ close(); openTestLab(); });
    var inc = document.getElementById('accmIncident'); if (inc) inc.addEventListener('click', function(){ close(); openIncidentChecklist(); });
  }
}

// ── Vymazání citlivých dat relace ────────────────────────────────────────────
async function clearSensitiveSession(){
  var ok = await uiConfirm('Vymaže z této relace: Gemini API klíč, učitelské PINy/hesla/bezpečnostní kód, nahrané podklady i jejich obsah, zadání, transkript, jména studentů ve skupinách a zadané URL. Smazaný školní bezpečnostní kód i API klíč bude nutné zadat znovu. Tvoje přihlášení (identita) zůstává. Pokračovat?', 'Vymazat citlivé údaje z této relace', true);
  if (!ok) return;
  try { if (typeof clearGeminiKey === 'function') clearGeminiKey(); } catch (e) {}
  try { ['ucitelPin', 'heslo', 'bezpKod', 'zadaniText', 'listeningTranscript'].forEach(function(id){ setVal(id, ''); }); } catch (e) {}
  try {
    if (typeof fileObjects !== 'undefined' && fileObjects) fileObjects.length = 0;
    if (typeof state !== 'undefined' && state) state.fileNames = [];
    var fi = document.getElementById('fileInput'); if (fi) fi.value = '';
    if (typeof renderFileList === 'function') renderFileList();
  } catch (e) {}
  try {
    if (typeof state !== 'undefined' && state && Array.isArray(state.skupiny)) state.skupiny.forEach(function(g){ if (g) g.studenti = []; });
    if (typeof renderGroups === 'function') renderGroups();
    if (typeof renderTeacherMapping === 'function') renderTeacherMapping();
  } catch (e) {}
  try { if (typeof state !== 'undefined' && state) state.urls = ['']; if (typeof renderUrlList === 'function') renderUrlList(); } catch (e) {}
  try { lastAssembled = null; generatedTestHtml = ''; generatedPackage = null; lastGenData = null; lastSelfTest = null; resetKeyCheckState(); } catch (e) {}
  try { localStorage.removeItem(SCHOOL_SECURITY_CODE_KEY); } catch (e) {}
  try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch (e) {}
  try { if (typeof validate === 'function') validate(); } catch (e) {}
  try { if (typeof applyVisualState === 'function') applyVisualState(); } catch (e) {}
  try { uiToast('Citlivé údaje této relace byly vymazány.', 'ok', 4200); } catch (e) {}
}

// ── Správa přístupů (admin) ──────────────────────────────────────────────────
function accLoadWorkingManifest(){
  var wm = null;
  try { var raw = localStorage.getItem(ADMIN_WORKING_MANIFEST_KEY); if (raw) wm = JSON.parse(raw); } catch (e) {}
  if (!accValidManifest(wm)) wm = JSON.parse(JSON.stringify(Access.manifest || EMBEDDED_MANIFEST));
  Access.workingManifest = wm;
  return wm;
}
function accSaveWorkingManifest(){
  try { localStorage.setItem(ADMIN_WORKING_MANIFEST_KEY, JSON.stringify(Access.workingManifest)); return true; }
  catch (e) { return false; }
}
function accCounts(m){
  var a = 0, r = 0;
  (m.entries || []).forEach(function(e){ if (String(e.status).toLowerCase() === 'revoked') r++; else a++; });
  return { active: a, revoked: r };
}
function openAdminPanel(){
  if (!accIsAdmin()){ try { uiAlert('Správa přístupů je dostupná jen pro roli admin.', 'Správa přístupů'); } catch (e) {} return; }
  accLoadWorkingManifest();
  var bd = document.getElementById('accAdminModal');
  if (!bd){
    bd = document.createElement('div');
    bd.className = 'ui-modal-backdrop';
    bd.id = 'accAdminModal';
    bd.setAttribute('role', 'dialog'); bd.setAttribute('aria-modal', 'true');
    document.body.appendChild(bd);
    bd.addEventListener('click', function(e){ if (e.target === bd) bd.remove(); });
  }
  accRenderAdmin();
}
function accRenderAdmin(){
  var bd = document.getElementById('accAdminModal'); if (!bd) return;
  var m = Access.workingManifest || accLoadWorkingManifest();
  var c = accCounts(m);
  var warn = Access.warnLevel === 'block'
    ? '<div class="acc-warn">Pozor: aplikace běží z neoficiálního umístění. Zde upravený seznam je jen pracovní kopie.</div>'
    : '';
  var rows = (m.entries || []).map(function(e, idx){
    var revoked = String(e.status).toLowerCase() === 'revoked';
    var st = revoked
      ? '<span class="acc-status revoked">odvolán</span>'
      : (e.role === 'admin' ? '<span class="acc-status role-admin">admin</span>' : '<span class="acc-status active">aktivní</span>');
    var hashShort = e.accessCodeHash ? esc(String(e.accessCodeHash).slice(0, 18) + '…') : '—';
    var actions =
      '<button type="button" class="acc-mini" data-act="rename" data-i="' + idx + '">Přejmenovat</button>'
      + '<button type="button" class="acc-mini" data-act="newcode" data-i="' + idx + '">Nový kód</button>'
      + (revoked
          ? '<button type="button" class="acc-mini" data-act="reactivate" data-i="' + idx + '">Obnovit</button>'
          : '<button type="button" class="acc-mini" data-act="revoke" data-i="' + idx + '">Odvolat</button>');
    return '<tr><td>' + esc(e.userId) + '</td><td>' + esc(e.displayName || '') + '</td><td>' + esc(e.role) + '</td><td>' + st + '</td><td>' + esc((e.issuedAt || '').slice(0, 10)) + '</td><td>' + (e.revokedAt ? esc(String(e.revokedAt).slice(0, 10)) : '—') + '</td><td style="font-family:monospace;font-size:11px">' + hashShort + '</td><td>' + esc(e.note || '') + '</td><td>' + actions + '</td></tr>';
  }).join('');
  bd.innerHTML =
    '<div class="ui-modal-box access-admin-box">'
    + '<div class="acc-admin-headbar"><span class="acc-admin-title">🔐 Správa přístupů</span><button type="button" class="acc-admin-x" id="accAdminX" aria-label="Zavřít" title="Zavřít">✕</button></div>'
    + '<div class="acc-admin-scroll">'
    +   '<div class="acc-counts">Aktivních: <b>' + c.active + '</b> · Odvolaných: <b>' + c.revoked + '</b> · Seznam: ' + esc(Access.manifestSource === 'external' ? 'externí (ověřeno)' : 'vestavěný') + '</div>'
    +   '<div class="acc-note">Co tato brána je a co není: řízený přístup pro proškolené kolegy + auditní stopa ve výstupech. Brání nechtěnému použití a umožňuje spravovat, kdo smí tvořit klasifikované testy. <b>Nechrání proti záměrnému technickému obcházení</b> — vše běží v prohlížeči, takže kdo ovládá zdrojový kód, bránu obejde. Skutečné řízení přístupu by vyžadovalo server (školní přihlášení, ověření role i volání AI na serveru, logování). Pro provoz v rámci sboru je tahle organizační kontrola přiměřená.</div>'
    +   '<div class="acc-warn">Změny se projeví až po EXPORTU manifestu a jeho nahrání na oficiální školní úložiště. Zde upravuješ PRACOVNÍ KOPII — přihlašování ostatních se řídí oficiálním (staženým/vestavěným) seznamem, dokud nový nenahraješ.</div>'
    +   warn
    +   '<div style="overflow:auto"><table class="acc-admin-tbl"><thead><tr><th>userId</th><th>Jméno</th><th>Role</th><th>Stav</th><th>Vydáno</th><th>Odvoláno</th><th>Hash kódu</th><th>Pozn.</th><th>Akce</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    +   '<div class="acc-admin-section"><b>Přidat učitele</b>'
    +     '<div class="acc-field"><label class="acc-label">userId (bez diakritiky, např. NOVAKOVA)</label><input class="acc-input" id="accNewUid" type="text" autocomplete="off"></div>'
    +     '<div class="acc-field"><label class="acc-label">Jméno (zobrazované)</label><input class="acc-input" id="accNewName" type="text" autocomplete="off"></div>'
    +     '<div class="acc-actions"><button type="button" class="acc-btn primary" id="accAddBtn">Přidat a vygenerovat kód</button></div>'
    +   '</div>'
    +   '<div class="acc-admin-section"><b>Manifest</b>'
    +     '<div class="acc-actions"><button type="button" class="acc-btn" id="accExportBtn">Export access-manifest.json</button><button type="button" class="acc-btn" id="accImportBtn">Import manifestu</button></div>'
    +     '<input type="file" id="accImportFile" accept="application/json,.json" style="display:none">'
    +     '<div class="acc-actions"><button type="button" class="acc-btn" id="accSaveWork">Uložit pracovní kopii</button><button type="button" class="acc-btn" id="accDiscardWork">Zahodit pracovní kopii</button></div>'
    +   '</div>'
    +   '<div id="accCodeRevealBox"></div>'
    + '</div>'
    + '<div class="acc-admin-footbar"><button type="button" class="acc-btn" id="accTestLabBtn">🧪 Test Lab</button><button type="button" class="acc-btn" id="accIncidentBtn">🚨 Bezpečnostní incident</button><button type="button" class="acc-btn primary" id="accAdminClose">Zavřít</button></div>'
    + '</div>';
  bd.querySelectorAll('.acc-mini').forEach(function(btn){
    btn.addEventListener('click', function(){
      accAdminAction(btn.getAttribute('data-act'), parseInt(btn.getAttribute('data-i'), 10));
    });
  });
  document.getElementById('accAddBtn').addEventListener('click', accAdminAddTeacher);
  document.getElementById('accExportBtn').addEventListener('click', accAdminExport);
  document.getElementById('accImportBtn').addEventListener('click', function(){ document.getElementById('accImportFile').click(); });
  document.getElementById('accImportFile').addEventListener('change', accAdminImport);
  document.getElementById('accSaveWork').addEventListener('click', function(){ if (accSaveWorkingManifest()) uiToast('Pracovní kopie uložena lokálně.', 'ok', 3600); });
  document.getElementById('accDiscardWork').addEventListener('click', accAdminDiscard);
  document.getElementById('accTestLabBtn').addEventListener('click', openTestLab);
  document.getElementById('accIncidentBtn').addEventListener('click', openIncidentChecklist);
  document.getElementById('accAdminClose').addEventListener('click', function(){ bd.remove(); });
  document.getElementById('accAdminX').addEventListener('click', function(){ bd.remove(); });
}
async function accAdminAction(act, i){
  var m = Access.workingManifest; if (!m || !m.entries[i]) return;
  var e = m.entries[i];
  if (act === 'rename'){
    var nn = await uiPrompt('Nové zobrazované jméno', e.displayName || '');
    if (nn != null && String(nn).trim()){ e.displayName = String(nn).trim(); accSaveWorkingManifest(); accRenderAdmin(); }
    return;
  }
  if (act === 'revoke'){
    var ok = await uiConfirm('Odvolat přístup pro ' + (e.displayName || e.userId) + '? Projeví se po exportu a nahrání seznamu.', 'Odvolat přístup', true);
    if (ok){ e.status = 'revoked'; e.revokedAt = new Date().toISOString(); accSaveWorkingManifest(); accRenderAdmin(); }
    return;
  }
  if (act === 'reactivate'){
    var ok2 = await uiConfirm('Obnovit přístup pro ' + (e.displayName || e.userId) + '?', 'Obnovit přístup', false);
    if (ok2){ e.status = 'active'; e.revokedAt = null; accSaveWorkingManifest(); accRenderAdmin(); }
    return;
  }
  if (act === 'newcode'){
    var ok3 = await uiConfirm('Vygenerovat nový kód pro ' + (e.displayName || e.userId) + '? Starý kód přestane platit po nahrání seznamu. Nový kód uvidíš jen jednou.', 'Nový kód', true);
    if (!ok3) return;
    var code = newAccessCode(e.userId);
    var salt = newSaltB64();
    var hash;
    try { hash = await hashAccessCode(code, salt); } catch (err){ uiAlert('Kód se nepodařilo zašifrovat (WebCrypto).', 'Chyba'); return; }
    e.accessCodeHash = hash; e.salt = salt; e.issuedAt = new Date().toISOString();
    accSaveWorkingManifest(); accRenderAdmin();
    accShowCodeReveal(e, code);
    return;
  }
}
async function accAdminAddTeacher(){
  var uid = accNormCode(document.getElementById('accNewUid').value);
  var name = String(document.getElementById('accNewName').value || '').trim();
  if (!uid){ uiAlert('Zadej userId (jen písmena/číslice).', 'Přidat učitele'); return; }
  if (accFindEntry(Access.workingManifest, uid)){ uiAlert('userId již existuje.', 'Přidat učitele'); return; }
  var code = newAccessCode(uid);
  var salt = newSaltB64();
  var hash;
  try { hash = await hashAccessCode(code, salt); } catch (e){ uiAlert('Kód se nepodařilo zašifrovat (WebCrypto).', 'Chyba'); return; }
  var entry = { userId: uid, displayName: name || uid, role: 'trainedTeacher', status: 'active', accessCodeHash: hash, salt: salt, issuedAt: new Date().toISOString(), revokedAt: null, note: '' };
  Access.workingManifest.entries.push(entry);
  accSaveWorkingManifest(); accRenderAdmin();
  accShowCodeReveal(entry, code);
}
function accShowCodeReveal(entry, code){
  var box = document.getElementById('accCodeRevealBox'); if (!box) return;
  box.innerHTML =
    '<div class="acc-admin-section">'
    + '<div class="acc-warn">⚠️ Tento kód se zobrazí jen jednou. Předej ho učiteli bezpečným kanálem (osobně / šifrovaně). Aplikace si ukládá jen jeho otisk, ne kód.</div>'
    + '<div>Kód pro <b>' + esc(entry.displayName || entry.userId) + '</b>:</div>'
    + '<div class="acc-code-reveal">' + esc(code) + '</div>'
    + '<div class="acc-actions"><button type="button" class="acc-btn" id="accCopyCode">Kopírovat kód</button><button type="button" class="acc-btn" id="accHideCode">Skrýt</button></div>'
    + '</div>';
  document.getElementById('accCopyCode').addEventListener('click', function(){ try { navigator.clipboard.writeText(code); uiToast('Kód zkopírován.', 'ok', 3000); } catch (e) {} });
  document.getElementById('accHideCode').addEventListener('click', function(){ box.innerHTML = ''; });
}
function accAdminExport(){
  try {
    var m = Access.workingManifest || EMBEDDED_MANIFEST;
    var out = { manifestVersion: m.manifestVersion || 1, policyVersion: m.policyVersion || ACCESS_POLICY_VERSION, issuedAt: new Date().toISOString().slice(0, 10), entries: m.entries };
    var txt = JSON.stringify(out, null, 2);
    var blob = new Blob([txt], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'access-manifest.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    uiToast('Manifest exportován. Nahraj ho na oficiální úložiště, aby změny platily.', 'ok', 5200);
  } catch (e){ uiAlert('Export se nezdařil: ' + (e && e.message ? e.message : e), 'Chyba'); }
}
function accAdminImport(ev){
  var f = ev.target.files && ev.target.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = async function(){
    try {
      var obj = JSON.parse(String(r.result || ''));
      if (!accValidManifest(obj)){ uiAlert('Soubor není platný manifest.', 'Import'); return; }
      var ok = await uiConfirm('Nahradit pracovní kopii importovaným manifestem (' + obj.entries.length + ' záznamů)?', 'Import manifestu', true);
      if (!ok) return;
      Access.workingManifest = obj; accSaveWorkingManifest(); accRenderAdmin();
      uiToast('Manifest naimportován do pracovní kopie.', 'ok', 4200);
    } catch (e){ uiAlert('Import se nezdařil: ' + (e && e.message ? e.message : e), 'Chyba'); }
  };
  r.readAsText(f, 'utf-8');
  ev.target.value = '';
}
async function accAdminDiscard(){
  var ok = await uiConfirm('Zahodit pracovní kopii a začít znovu od oficiálního (staženého/vestavěného) seznamu?', 'Zahodit pracovní kopii', true);
  if (!ok) return;
  try { localStorage.removeItem(ADMIN_WORKING_MANIFEST_KEY); } catch (e) {}
  Access.workingManifest = JSON.parse(JSON.stringify(Access.manifest || EMBEDDED_MANIFEST));
  accRenderAdmin();
  uiToast('Pracovní kopie zahozena.', 'ok', 3600);
}
async function openIncidentChecklist(){
  var steps = [
    '1) Zjisti rozsah: co uniklo (kód, PIN, verifier, klíč, API klíč) a koho se to týká.',
    '2) Ve Správě přístupů odvolej dotčené účty (Odvolat) a vygeneruj nové kódy.',
    '3) Exportuj manifest a nahraj ho na oficiální úložiště — bez nahrání se odvolání neprojeví.',
    '4) Zkontroluj Creator ID ve výstupech, kterých se incident týká (kdo a čím je vytvořil).',
    '5) Pokud unikl ověřovací (verifier) soubor, ber test jako kompromitovaný — vygeneruj nový test (nový manifest / Test ID).',
    '6) Pokud byl sdílen týmový/školní bezpečnostní kód, rotuj ho a znovu rozešli jen oprávněným.',
    '7) Pokud unikl Gemini API klíč, okamžitě ho zneplatni v Google AI Studio / Cloud konzoli a vytvoř nový.',
    '8) Zaznamenej incident (kdy, co, kdo, opatření) a informuj vedení/správce dle školních pravidel.'
  ];
  const want = await uiModal({ title:'🚨 Bezpečnostní incident — postup', message: steps.join('\n\n'), okText:'📄 Vytvořit incident report', cancelText:'Zavřít' });
  if (want) openIncidentReport();
}
// ── Incident report (z auditu, bod 4) — čistě lokální generátor reportu ────────
const INCIDENT_TYPES = {
  verifier: { label:'Únik učitelského verifieru',
    steps:['Ber dotčený test jako kompromitovaný — správné odpovědi i privátní klíč mohly uniknout.','Zjisti, kde verifier ležel (sdílená složka, odkaz, příloha) a odstraň ho odtud.','Vygeneruj nový test s novým Test ID / manifestem a starou verzi přestaň používat.','U klasifikovaného testu zvaž náhradní/opravný test pro dotčené žáky.'],
    invalidate:'starý Test ID / manifest dotčeného testu', regenerate:'nový student_test.html + teacher_verifier.html s novým Test ID', notify:'vedení/správce dle školních pravidel (kompromitovaný klasifikovaný test)' },
  apikey: { label:'Únik Gemini API klíče',
    steps:['Okamžitě zneplatni klíč v Google AI Studio / Cloud konzoli.','Vytvoř nový klíč a ulož ho jen lokálně do generátoru.','Zkontroluj fakturaci a limity, jestli klíč někdo nezneužil.','Klíč nikdy nevkládej do sdílených souborů ani do AI promptů.'],
    invalidate:'uniklý Gemini API klíč', regenerate:'nový API klíč (test se přegenerovávat nemusí — klíč v testu není)', notify:'správce účtu Google / IT, pokud klíč patří škole' },
  schoolcode: { label:'Únik školního / týmového kódu',
    steps:['Rotuj školní/týmový bezpečnostní kód.','Ve Správě přístupů vygeneruj nový kód a rozešli ho jen oprávněným.','Exportuj manifest a nahraj na oficiální úložiště — bez nahrání se odvolání neprojeví.','Starý kód přestaň používat pro nové testy.'],
    invalidate:'starý školní/týmový kód', regenerate:'nový kód + aktualizovaný access manifest', notify:'kolegové, kteří kód používali; vedení dle pravidel' },
  accesspin: { label:'Únik přístupového účtu / PINu',
    steps:['Ve Správě přístupů odvolej dotčený účet (Odvolat).','Vygeneruj nový přístupový kód a manifest, manifest nahraj na úložiště.','Zkontroluj Creator ID ve výstupech dotčeného účtu.','Na zařízení nastav nový PIN profilu (min. 6 znaků).'],
    invalidate:'dotčený účet / přístupový kód', regenerate:'nový přístupový kód + manifest', notify:'správce přístupů / vedení' },
  other: { label:'Jiný / neznámý rozsah',
    steps:['Zjisti rozsah: co uniklo (kód, PIN, verifier, klíč, API klíč) a koho se to týká.','Odvolej dotčené účty a vygeneruj nové kódy ve Správě přístupů.','Exportuj manifest a nahraj na oficiální úložiště.','Zkontroluj Creator ID v dotčených výstupech.','Pokud unikl verifier, ber test jako kompromitovaný a vygeneruj nový.','Pokud unikl API klíč, zneplatni ho a vytvoř nový.','Zaznamenej incident a informuj vedení/správce.'],
    invalidate:'vše dotčené (kódy, účty, klíče, testy) podle zjištěného rozsahu', regenerate:'dotčené testy a kódy podle rozsahu', notify:'vedení/správce dle školních pravidel' }
};
function buildIncidentReport(type){
  const it = INCIDENT_TYPES[type] || INCIDENT_TYPES.other;
  const now = new Date();
  const env = ({official:'oficiální adresa',unofficialCopy:'neoficiální kopie',local:'lokální soubor (file://)',unverified:'web (oficiální adresa nenastavena)',unknown:'neurčeno'})[(typeof Access!=='undefined'&&Access)?Access.envKind:'unknown'] || 'neurčeno';
  let testId = '—';
  try { if (typeof generatedPackage !== 'undefined' && generatedPackage && generatedPackage.testId) testId = generatedPackage.testId; } catch(_){}
  const L = [];
  L.push('BEZPEČNOSTNÍ INCIDENT — REPORT');
  L.push('==================================');
  L.push('Datum a čas: ' + now.toLocaleString('cs-CZ'));
  L.push('Verze generátoru: v' + RELEASE.version + ' (build ' + BUILD_HASH + ', ' + RELEASE.date + ')');
  L.push('Prostředí: ' + env);
  L.push('Test ID (poslední vygenerovaný): ' + testId);
  L.push('');
  L.push('TYP INCIDENTU: ' + it.label);
  L.push('');
  L.push('DOPORUČENÉ KROKY:');
  it.steps.forEach((s,i)=>L.push('  ' + (i+1) + ') ' + s));
  L.push('');
  L.push('CO ZNEPLATNIT: ' + it.invalidate);
  L.push('CO ZNOVU VYGENEROVAT: ' + it.regenerate);
  L.push('CO OZNÁMIT VEDENÍ/SPRÁVCI: ' + it.notify);
  L.push('');
  L.push('DOPLŇ RUČNĚ:');
  L.push('  - Rozsah úniku (komu/jak se to dostalo): ');
  L.push('  - Provedená opatření a čas: ');
  L.push('  - Stav (otevřeno / vyřešeno): ');
  return L.join('\n');
}
function openIncidentReport(){
  if (document.getElementById('incidentReportBackdrop')) return;
  const bd = document.createElement('div');
  bd.id = 'incidentReportBackdrop'; bd.className = 'ui-modal-backdrop';
  bd.setAttribute('role','dialog'); bd.setAttribute('aria-modal','true'); bd.setAttribute('aria-label','Vytvořit incident report');
  const box = document.createElement('div'); box.className = 'ui-modal-box'; box.style.maxWidth = '660px'; box.style.width = '100%';
  const head = document.createElement('div'); head.className = 'ui-modal-head'; head.textContent = '🚨 Vytvořit incident report'; box.appendChild(head);
  const hint = document.createElement('div'); hint.className = 'ui-modal-body'; hint.style.marginBottom = '8px';
  hint.textContent = 'Vyber typ incidentu. Report je čistě lokální — nic se nikam neodesílá. Pak ho zkopíruj nebo stáhni a doplň poznámky.';
  box.appendChild(hint);
  const btnRow = document.createElement('div'); btnRow.className = 'btn-row'; btnRow.style.marginBottom = '10px';
  const ta = document.createElement('textarea');
  ta.readOnly = true; ta.id = 'incidentReportText';
  ta.style.cssText = 'width:100%;min-height:240px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;white-space:pre;overflow:auto;padding:10px;border-radius:8px;border:1px solid var(--bdr);background:var(--bg3);color:var(--t2)';
  Object.keys(INCIDENT_TYPES).forEach((k, idx) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tag-btn' + (idx === Object.keys(INCIDENT_TYPES).length - 1 ? ' active' : '');
    b.textContent = INCIDENT_TYPES[k].label;
    b.addEventListener('click', () => {
      ta.value = buildIncidentReport(k);
      btnRow.querySelectorAll('.tag-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    btnRow.appendChild(b);
  });
  box.appendChild(btnRow);
  box.appendChild(ta);
  ta.value = buildIncidentReport('other');
  const actions = document.createElement('div'); actions.className = 'ui-modal-actions'; actions.style.marginTop = '12px';
  const close = () => { document.removeEventListener('keydown', escClose); bd.remove(); };
  const escClose = (e) => { if (e.key === 'Escape') close(); };
  const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.className = 'ui-modal-btn'; copyBtn.textContent = '📋 Zkopírovat';
  copyBtn.addEventListener('click', () => {
    const txt = ta.value;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => uiToast('Incident report zkopírován.','ok')).catch(() => fallbackCopy(txt));
    else fallbackCopy(txt);
  });
  const dlBtn = document.createElement('button'); dlBtn.type = 'button'; dlBtn.className = 'ui-modal-btn'; dlBtn.textContent = '⬇ Stáhnout .txt';
  dlBtn.addEventListener('click', () => {
    const d = new Date();
    const pad = n => String(n).padStart(2,'0');
    const name = 'incident_report_' + d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + '.txt';
    downloadBlobFile(ta.value, name, 'text/plain;charset=utf-8');
  });
  const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'ui-modal-btn primary'; closeBtn.textContent = 'Zavřít';
  closeBtn.addEventListener('click', close);
  actions.appendChild(copyBtn); actions.appendChild(dlBtn); actions.appendChild(closeBtn);
  box.appendChild(actions);
  bd.appendChild(box);
  bd.addEventListener('click', e => { if (e.target === bd) close(); });
  document.addEventListener('keydown', escClose);
  document.body.appendChild(bd);
}

// ===== INSERTED: ACCESS + AUDIT MODULE (end) =====

// ── Jednotné zavírání informačních modalů klávesou Escape ────────────────────
// Dříve měl každý modal vlastní keydown listener na backdropu — ten ale dostane
// událost jen když je fokus UVNITŘ modalu (po otevření typicky není), takže
// Escape často nefungoval. Tento jediný listener na document funguje vždy.
// Pravidlo: rozhoduje NEJVRCHNĚJŠÍ viditelný backdrop (poslední v <body>, brány
// se přidávají na konec — řeší i guide otevřený z jiného guidu).
//   - je-li ve whitelistu → zavře se (stejně jako klik mimo modal),
//   - není-li (uiModal s promise, accessGate, firstRunGate, welcome, incident
//     report s vlastní obsluhou Escape…) → neděláme NIC, aby Escape nezavřel
//     modal schovaný POD blokujícím dialogem (uiModal si Escape řeší sám
//     v uiModalKeyHandler jako cancel).
const ESC_CLOSABLE_MODALS = ['changelogGate','secGuideGate','strictSitGate','usageGuideGate','apiKeyGuideGate','testLabModal','accAdminModal'];
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape') return;
  const kids = document.body.children;
  for (let i = kids.length - 1; i >= 0; i--) {
    const el = kids[i];
    if (!el || !el.classList || !el.classList.contains('ui-modal-backdrop')) continue;
    if (el.classList.contains('hidden')) continue; // perzistentní skryté backdropy ignoruj
    if (el.id && ESC_CLOSABLE_MODALS.indexOf(el.id) !== -1) {
      el.remove();
      e.stopPropagation();
    }
    return; // první viditelný backdrop rozhodl — ať tak či tak končíme
  }
});

(function init(){
  applyMode();
  applyReleaseBadge();
  updateDeviceBadge();
  window.addEventListener('resize', (function(){ let tmr; return function(){ clearTimeout(tmr); tmr=setTimeout(updateDeviceBadge, 200); }; })());
  loadGeminiKey();
  loadGeminiModel();
  applyKeyEnvUI();
  migrateStorage();
  clearOldUnsafeStorage();
  markAdvancedSections(); // Jednou: označí advanced-only prvky, CSS pak řídí viditelnost.
  setupDragDrop();
  const restored = loadSnapshot();
  if (restored) $('restoredBanner').classList.remove('hidden');
  showOnlyStep(currentStep);
  if (currentStep === 4) renderResult(); // obnova relace na kroku 4 — přestaví prompt a chips ze stavu
  renderTemplates();
  applyVisualState();
  validate();
  updateProgress();
  enhanceA11y();
  setTimeout(initTooltips, 100);
  // Přístupová brána (aktivace/PIN) se spustí jako první. Po vpuštění
  // accessBoot → onGranted znovu vyvolá stávající úvodní průvodce „jak používat ostře“.
  setTimeout(accessBoot, 120);
})();
