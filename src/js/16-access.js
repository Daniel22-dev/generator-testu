// Centrální přístup AI Studio GHRAB — kompatibilní vrstva Generátoru v7.0.6.
// Kryptografické ověření probíhá PŘED spuštěním tohoto souboru v app-guard.js.
// Zde se pouze promítne již ověřený permit do auditní stopy a stávajícího UI.
'use strict';

const STUDIO_ROOT = '/AI-Studio-GHRAB/';
const STUDIO_ACCESS_KEY = 'ghrab.access.permit.v2';
const OFFICIAL_ORIGIN = 'https://daniel22-dev.github.io';
const OFFICIAL_ORIGINS = [OFFICIAL_ORIGIN];
const OFFICIAL_PATH = '/generator-testu/';
const OFFICIAL_PATH_PREFIXES = [OFFICIAL_PATH];

function centralPermit(){
  const bridge = window.__GHRAB_STUDIO_ACCESS__;
  return bridge && bridge.permit && typeof bridge.permit === 'object' ? bridge.permit : null;
}
function accessEnvironment(){
  if (location.protocol === 'file:') return 'local';
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'official';
  return location.origin === OFFICIAL_ORIGIN && location.pathname.startsWith(OFFICIAL_PATH) ? 'official' : 'unofficialCopy';
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
  granted: true,
  profile: profileFromPermit(centralPermit()),
  envKind: accessEnvironment(),
  envOfficial: location.protocol === 'http:' || location.protocol === 'https:',
  manifestSource: 'ai-studio-signed-permit',
  workingManifest: null,
  blockAllGeneration: false,
  warnLevel: 'none'
};
Access.blockAllGeneration = Access.envKind === 'unofficialCopy';
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
    + '<button type="button" class="btn-outline" data-lock>Odebrat přístup z tohoto zařízení</button></div></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){
    if (e.target === modal || e.target.closest('[data-close]')) closeCentralAccountModal();
    const lock = e.target.closest('[data-lock]');
    if (lock) accLockNow();
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
      banner.textContent='⛔ Tato kopie Generátoru neběží na oficiální adrese. Generování je z bezpečnostních důvodů zablokováno.';
    } else if (Access.envKind === 'local') {
      banner.className='banner amber';
      banner.textContent='ℹ️ Místní vývojová kopie: centrální odvolání přístupu nemusí být dostupné.';
    } else { banner.className='banner hidden'; banner.textContent=''; }
  }
}
