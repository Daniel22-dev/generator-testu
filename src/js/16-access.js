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

// Privacy/shared-device control. Suite cleanup is owned by the unprotected
// lifecycle bootstrap, which runs even when the central Studio permit has already
// been revoked. Manual local end-work reuses the same ownership rules.
const GENERATOR_LEGACY_EXACT_KEYS = new Set(['genOnboardingDone_v1','genWelcomeShown_session']);
const GENERATOR_LIFECYCLE_RESERVED_KEYS = new Set(['ghrab.generator.suite-session-seen.v1','ghrab.generator.suite-session-status.v1']);
function generatorSuiteSessionApi(){ return window.__GHRAB_GENERATOR_SUITE_SESSION__ || null; }
function generatorOwnsStorageKey(key){
  const api=generatorSuiteSessionApi();
  if(api&&typeof api.ownsStorageKey==='function') return api.ownsStorageKey(key);
  const k=String(key||'');
  if(GENERATOR_LIFECYCLE_RESERVED_KEYS.has(k)) return false;
  return k.startsWith('ghrab.generator.') || k.startsWith('sestavovac_') || GENERATOR_LEGACY_EXACT_KEYS.has(k);
}
function generatorClearOwnedStorage(store, options={}){
  const removed=[]; const failures=[];
  if(!store) return {removed,failures};
  let keys=[];
  try { for(let i=0;i<store.length;i++){ const key=store.key(i); if(key) keys.push(String(key)); } }
  catch(_e){ failures.push('enumeration'); return {removed,failures}; }
  for(const key of keys){
    const permit=options.includeSharedPermit===true && key===STUDIO_ACCESS_KEY;
    if(!generatorOwnsStorageKey(key) && !permit) continue;
    try { store.removeItem(key); if(store.getItem(key)===null) removed.push(key); else failures.push(key); }
    catch(_e){ failures.push(key); }
  }
  return {removed,failures};
}
function generatorClearRuntimeState(){
  // Stop late asynchronous work before clearing references so an in-flight AI
  // response cannot repopulate the just-ended shared-device session.
  try { geminiCancelRequested=true; } catch(_e) {}
  try { if(currentGeminiAbortController) currentGeminiAbortController.abort(); } catch(_e) {}
  try { currentGeminiAbortController=null; } catch(_e) {}
  try { clearTimeout(geminiCooldownTimer); geminiCooldownTimer=null; geminiCooldownUntil=0; } catch(_e) {}
  try { clearTimeout(saveTimer); saveTimer=null; } catch(_e) {}
  try { clearTimeout(indicatorTimer); indicatorTimer=null; } catch(_e) {}
  try { geminiApiKey=''; } catch(_e) {}
  try { geminiKeyScope='none'; } catch(_e) {}
  try { lastGeminiRawResponse=null; } catch(_e) {}
  try { lastGeminiJsonRepaired=false; } catch(_e) {}
  try { fileObjects=[]; } catch(_e) {}
  try { fileReadPromises=[]; } catch(_e) {}
  try { generatedTestHtml=''; generatedPackage=null; generatedIntegrity=null; lastGenData=null; lastAssembled=null; } catch(_e) {}
  try { rosterEntries=[]; variantSeq=0; variantSlug=''; } catch(_e) {}
  try { lastSelfTest=null; secureGapsAcknowledged=false; } catch(_e) {}
  try { akvWeakRows=[]; lastKeyCheck=null; keyDiffsAcknowledged=false; } catch(_e) {}
  try { _liAiDraft=null; _rcAiDraft=null; } catch(_e) {}
  try { exportChecklist={}; } catch(_e) {}
  try { if(typeof gaState==='object'&&gaState){ gaState.ai=null; gaState.loading=false; gaState.query=''; } } catch(_e) {}
  try { state=JSON.parse(JSON.stringify(DEFAULT)); currentStep=0; maxStep=0; groupIdCounter=0; } catch(_e) {}
  try { if(typeof Access==='object'&&Access) Access.profile=null; } catch(_e) {}

  // Fail closed visually as well. No stale form, preview, answer-key or roster DOM
  // remains available while the suite acknowledgement is being completed.
  try {
    if(document.body){
      const main=document.createElement('main');
      main.className='ghrab-access-gate';
      const h=document.createElement('h1'); h.textContent='Práce na tomto zařízení byla ukončena';
      const p=document.createElement('p'); p.className='ghrab-access-gate-message'; p.textContent='Místní data Generátoru byla uzamčena pro úklid společné relace. Pro další práci otevři aplikaci znovu přes AI Studio.';
      main.append(h,p); document.body.replaceChildren(main); document.body.style.visibility='visible';
    }
  } catch(_e) {}
  return {ok:true};
}
function generatorEndWork(options={}){
  const suite=generatorSuiteSessionApi();
  let report;
  if(suite&&typeof suite.manualEndWork==='function'){
    const result=suite.manualEndWork({includeSharedPermit:true});
    report={localRemoved:result.localRemoved?.length||0,sessionRemoved:result.sessionRemoved?.length||0,sharedHandoffRemoved:result.sharedHandoffRemoved?.length||0,failures:result.failures||[]};
  }else{
    const local=generatorClearOwnedStorage(typeof localStorage!=='undefined'?localStorage:null,{includeSharedPermit:true});
    const session=generatorClearOwnedStorage(typeof sessionStorage!=='undefined'?sessionStorage:null);
    report={localRemoved:local.removed.length,sessionRemoved:session.removed.length,sharedHandoffRemoved:0,failures:[...local.failures,...session.failures]};
  }
  generatorClearRuntimeState();
  if(options.navigate!==false){
    try { location.replace(STUDIO_ROOT+'access/'); } catch(_e) { location.href=STUDIO_ROOT+'access/'; }
  }
  return report;
}

const _generatorSuiteLifecycle=generatorSuiteSessionApi();
if(_generatorSuiteLifecycle&&typeof _generatorSuiteLifecycle.registerRuntimeCleanup==='function'){
  _generatorSuiteLifecycle.registerRuntimeCleanup(generatorClearRuntimeState);
  document.addEventListener('ghrab:generator-suite-session-acknowledged',function(){
    try { location.replace(STUDIO_ROOT+'access/'); } catch(_e) { location.href=STUDIO_ROOT+'access/'; }
  });
  if(_generatorSuiteLifecycle.isLocked?.()){
    generatorClearRuntimeState();
    setTimeout(function(){ try { location.replace(STUDIO_ROOT+'access/'); } catch(_e) {} },0);
  }
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
