// v7.0.6: aplikační start probíhá až po kryptografickém ověření AI Studiem.
window.__ACCESS_INIT_REACHED__ = true;

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

function safeInitStep(name, fn){
  try { return fn(); }
  catch (e) { console.error('Inicializační krok selhal: ' + name, e); return undefined; }
}
(function init(){
  safeInitStep('accOnGranted', accOnGranted);

  safeInitStep('applyMode', applyMode);
  safeInitStep('applyReleaseBadge', applyReleaseBadge);
  safeInitStep('updateDeviceBadge', updateDeviceBadge);
  window.addEventListener('resize', (function(){ let tmr; return function(){ clearTimeout(tmr); tmr=setTimeout(function(){ safeInitStep('updateDeviceBadge resize', updateDeviceBadge); }, 200); }; })());
  safeInitStep('loadGeminiKey', loadGeminiKey);
  safeInitStep('loadGeminiModel', loadGeminiModel);
  safeInitStep('applyKeyEnvUI', applyKeyEnvUI);
  safeInitStep('migrateStorage', migrateStorage);
  safeInitStep('clearOldUnsafeStorage', clearOldUnsafeStorage);
  safeInitStep('markAdvancedSections', markAdvancedSections);
  safeInitStep('setupDragDrop', setupDragDrop);
  const restored = safeInitStep('loadSnapshot', loadSnapshot);
  if (restored) safeInitStep('restoredBanner', function(){ $('restoredBanner').classList.remove('hidden'); });
  safeInitStep('showOnlyStep', function(){ showOnlyStep(currentStep); });
  if (currentStep === 4) safeInitStep('renderResult', renderResult);
  safeInitStep('renderTemplates', renderTemplates);
  safeInitStep('applyVisualState', applyVisualState);
  safeInitStep('validate', validate);
  safeInitStep('updateProgress', updateProgress);
  safeInitStep('enhanceA11y', enhanceA11y);
  setTimeout(function(){ safeInitStep('initTooltips', initTooltips); }, 100);
})();
