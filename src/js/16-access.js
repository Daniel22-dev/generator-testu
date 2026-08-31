// Centrální přístup AI Studio GHRAB — kompatibilní vrstva Generátoru v7.0.6.
// Kryptografické ověření probíhá PŘED spuštěním tohoto souboru v app-guard.js.
// Zde se pouze promítne již ověřený permit do auditní stopy a stávajícího UI.
'use strict';

const GHRAB_DEPLOYMENT = window.__GHRAB_DEPLOYMENT_CONFIG__ || null;
const STUDIO_ROOT = GHRAB_DEPLOYMENT?.studioBaseUrl || '/AI-Studio-GHRAB/';
const STUDIO_ACCESS_KEY = 'ghrab.access.permit.v2';
const CONFIGURED_APP_URL = new URL(GHRAB_DEPLOYMENT?.appBaseUrl || '/generator-testu/', location.href);
const OFFICIAL_ORIGIN = CONFIGURED_APP_URL.origin;
const OFFICIAL_ORIGINS = Array.from(new Set(
  (GHRAB_DEPLOYMENT?.allowedOrigins || ['self', OFFICIAL_ORIGIN])
    .map((value) => value === 'self' ? location.origin : value)
));
const OFFICIAL_PATH = CONFIGURED_APP_URL.pathname;
const OFFICIAL_PATH_PREFIXES = [OFFICIAL_PATH];

function centralPermit(){
  const bridge = window.__GHRAB_STUDIO_ACCESS__;
  return bridge && bridge.permit && typeof bridge.permit === 'object' ? bridge.permit : null;
}
function accessEnvironment(){
  if (location.protocol === 'file:') return 'local';
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'local';
  const allowedOrigin = OFFICIAL_ORIGINS.includes(location.origin);
  const configuredPath = location.pathname.startsWith(OFFICIAL_PATH);
  return allowedOrigin && configuredPath ? 'official' : 'unofficialCopy';
}
function profileFromPermit(p){
  if (!p) return null;
  return {
    userId: String(p.sub || p.userId || p.jti || 'UNKNOWN'),
    displayName: String(p.displayName || p.name || p.sub || 'Uživatel AI Studia'),
    role: String(p.role || 'trainedTeacher'),
    status: 'active',
    issuedAt: p.iat || null,
    expiresAt: p.exp || null,
    jti: String(p.jti || ''),
    apps: Array.isArray(p.apps) ? p.apps.slice() : []
  };
}

var Access = {
  granted: Boolean(centralPermit()),
  profile: profileFromPermit(centralPermit()),
  envKind: accessEnvironment(),
  envOfficial: location.protocol === 'http:' || location.protocol === 'https:',
  manifestSource: 'ai-studio-signed-permit',
  workingManifest: null,
  blockAllGeneration: !centralPermit(),
  warnLevel: 'none'
};
Access.blockAllGeneration = !Access.granted || Access.envKind === 'unofficialCopy';
Access.warnLevel = Access.envKind === 'unofficialCopy' ? 'block' : (Access.envKind === 'local' ? 'soft' : 'none');

function accIsAdmin(){ return !!(Access.profile && Access.profile.role === 'admin'); }
function accValidManifest(){ return false; }
function accSetAppGated(){ /* centrální brána běží před aplikačním JS */ }
function accEnsureGate(){ /* kompatibilita se staršími testy */ }
function accStartBootWatchdog(){ /* kompatibilita se staršími testy */ }
function runAccessBootSafely(){ accOnGranted(); }
function accTryActivate(){ location.href = STUDIO_ROOT + 'access/'; }
function accResetPinFlow(){ location.href = STUDIO_ROOT + 'access/'; }
function accAdminAddTeacher(){ openAdminPanel(); }
function accAdminAction(){ openAdminPanel(); }
function accAdminExport(){ openAdminPanel(); }

function currentCreator(){
  var p = Access.profile;
  if (p && p.userId) return { id: p.userId, name: p.displayName || '', role: p.role || 'trainedTeacher' };
  return { id: 'UNKNOWN', name: '', role: 'trainedTeacher' };
}
function auditMetaObject(cfg){
  cfg = cfg || {};
  return {
    audit: 'GHR-AUDIT-V1', creatorId: cfg.creatorId || '', creatorRole: cfg.creatorRole || '',
    testId: cfg.testId || '', manifestHash: cfg.manifestHash || '', generatorVersion: cfg.generatorVersion || '',
    buildHash: cfg.buildHash || '', releaseStatus: cfg.releaseStatus || '', releaseDate: cfg.releaseDate || '',
    resultMode: cfg.resultMode || '', appMode: cfg.appMode || '', secureOffline: cfg.resultMode === 'secureOffline',
    generatedAt: new Date().toISOString()
  };
}
function auditCommentHtml(cfg){
  try { return '\n<!-- GHR-AUDIT-META ' + JSON.stringify(auditMetaObject(cfg)).replace(/--/g, '—') + ' -->\n'; }
  catch (_e) { return ''; }
}

function formatExpiry(seconds){
  if (!seconds) return 'neuvedena';
  try { return new Date(Number(seconds) * 1000).toLocaleString('cs-CZ'); } catch (_e) { return 'neuvedena'; }
}
function closeCentralAccountModal(){
  const old = document.getElementById('centralAccessAccountModal');
  if (old) old.remove();
}
function openAccountModal(){
  closeCentralAccountModal();
  const p = Access.profile || {};
  const modal = document.createElement('div');
  modal.id = 'centralAccessAccountModal';
  modal.className = 'ui-modal-backdrop';
  modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-label','Přístup AI Studio GHRAB');
  modal.innerHTML = '<div class="ui-modal" style="max-width:620px">'
    + '<div class="ui-modal-head"><div><b>Přístup AI Studio GHRAB</b><div class="muted" style="font-size:12px">Centrálně ověřené oprávnění</div></div><button type="button" class="ui-modal-x" data-close aria-label="Zavřít">✕</button></div>'
    + '<div class="ui-modal-body"><div class="ok"><b>'+esc(p.displayName||'Uživatel')+'</b><br>Role: '+esc(p.role||'—')+' · ID: '+esc(p.userId||'—')+'<br>Platnost do: '+esc(formatExpiry(p.expiresAt))+'</div>'
    + '<p class="muted">Přístup byl aktivován jednou v AI Studiu a je sdílen se všemi dílčími aplikacemi na této doméně.</p>'
    + '<div class="actions"><a class="btn-primary" href="'+STUDIO_ROOT+'">Otevřít AI Studio</a>'
    + (accIsAdmin()?'<a class="btn-outline" href="'+STUDIO_ROOT+'tools/access-issuer/">Vydat přístup</a>':'')
    + '<button type="button" class="btn-outline" data-lock>Odebrat přístup z tohoto zařízení</button>'
    + '<button type="button" class="btn-outline" data-end-work>Ukončit práci a smazat místní data</button></div>'
    + '<p class="muted" style="margin-top:10px">Na sdíleném zařízení použij po práci druhé tlačítko. Smaže data Generátoru, lokální/session AI klíč a centrální permit; nesmaže data jiných aplikací AI Studia.</p></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', async function(e){
    if (e.target === modal || e.target.closest('[data-close]')) { closeCentralAccountModal(); return; }
    const lock = e.target.closest('[data-lock]');
    if (lock) { accLockNow(); return; }
    const endWork = e.target.closest('[data-end-work]');
    if (endWork) {
      const ok = typeof uiConfirm === 'function'
        ? await uiConfirm('Smazat z tohoto prohlížeče rozpracovaný stav, šablony, historii, lokální bezpečnostní hodnoty, AI klíč pro tuto relaci a centrální permit? Data jiných aplikací AI Studia se nesmažou.', 'Ukončit práci na sdíleném zařízení?', true)
        : window.confirm('Ukončit práci a smazat místní data Generátoru?');
      if (ok) generatorEndWork();
    }
  });
}
function openAdminPanel(){
  if (!accIsAdmin()) { if (typeof uiAlert === 'function') uiAlert('Správa přístupů je dostupná pouze správci.', 'AI Studio GHRAB'); return; }
  location.href = STUDIO_ROOT + 'tools/access-issuer/';
}
function accLockNow(){
  try { localStorage.removeItem(STUDIO_ACCESS_KEY); } catch (_e) {}
  location.href = STUDIO_ROOT + 'access/';
}

// Privacy/shared-device control. Deliberately clears only Generator-owned keys plus
// the shared access permit; it must not call storage.clear(), which would wipe data
// belonging to other AI Studio applications on the same origin.
const GENERATOR_LEGACY_EXACT_KEYS = new Set(['genOnboardingDone_v1','genWelcomeShown_session']);
function generatorOwnsStorageKey(key){
  const k=String(key||'');
  return k.startsWith('ghrab.generator.') || k.startsWith('sestavovac_') || GENERATOR_LEGACY_EXACT_KEYS.has(k);
}
function generatorClearOwnedStorage(store){
  const removed=[]; const failures=[];
  if(!store) return {removed,failures};
  let keys=[];
  try { for(let i=0;i<store.length;i++){ const key=store.key(i); if(key) keys.push(String(key)); } }
  catch(e){ failures.push('enumeration'); return {removed,failures}; }
  for(const key of keys){
    if(!generatorOwnsStorageKey(key) && key!==STUDIO_ACCESS_KEY) continue;
    try { store.removeItem(key); removed.push(key); }
    catch(_e){ failures.push(key); }
  }
  return {removed,failures};
}
function generatorEndWork(options={}){
  const local=generatorClearOwnedStorage(typeof localStorage!=='undefined'?localStorage:null);
  const session=generatorClearOwnedStorage(typeof sessionStorage!=='undefined'?sessionStorage:null);
  // In-memory copies disappear on navigation; clear them immediately as defence in depth
  // and to make non-navigating regression tests truthful.
  try { geminiApiKey=''; } catch(_e) {}
  try { geminiKeyScope='none'; } catch(_e) {}
  try { lastGeminiRawResponse=null; } catch(_e) {}
  try { lastGeminiJsonRepaired=false; } catch(_e) {}
  try { fileObjects=[]; } catch(_e) {}
  try { fileReadPromises=[]; } catch(_e) {}
  try { generatedTestHtml=''; generatedPackage=null; generatedIntegrity=null; lastGenData=null; lastAssembled=null; } catch(_e) {}
  try { rosterEntries=[]; variantSeq=0; variantSlug=''; } catch(_e) {}
  try { state=JSON.parse(JSON.stringify(DEFAULT)); groupIdCounter=0; } catch(_e) {}
  try { if(typeof Access==='object'&&Access) Access.profile=null; } catch(_e) {}
  const report={localRemoved:local.removed.length,sessionRemoved:session.removed.length,failures:[...local.failures,...session.failures]};
  if(options.navigate!==false) location.href=STUDIO_ROOT+'access/';
  return report;
}
function accOnGranted(){
  Access.profile = profileFromPermit(centralPermit());
  const chip = document.getElementById('accChip');
  if (chip) { chip.classList.remove('hidden'); chip.textContent = '👤 ' + (Access.profile?.displayName || 'AI Studio'); chip.title = 'Centrální přístup AI Studio GHRAB'; }
  const admin = document.getElementById('accAdminChip');
  if (admin) admin.classList.toggle('hidden', !accIsAdmin());
  const lab = document.getElementById('accTestLabChip');
  if (lab) lab.classList.toggle('hidden', !accIsAdmin());
  const banner = document.getElementById('accessEnvBanner');
  if (banner) {
    if (Access.envKind === 'unofficialCopy') {
      banner.className='banner red';
      banner.textContent='⛔ Toto umístění Generátoru není povoleno deployment konfigurací. Generování je z bezpečnostních důvodů zablokováno.';
    } else if (Access.envKind === 'local') {
      banner.className='banner amber';
      banner.textContent='ℹ️ Místní vývojová kopie: centrální odvolání přístupu nemusí být dostupné.';
    } else { banner.className='banner hidden'; banner.textContent=''; }
  }
}
