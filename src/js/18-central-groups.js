/* Stage08A/B: protected, lazy teacher-only integration with canonical groups.
   Secure student, test and verifier artifacts do not receive any canonical IDs. */
(function () {
  'use strict';
  const featureName = 'centralGroups';
  function allowed() {
    return document.documentElement.dataset.ghrabAccess === 'granted' &&
      globalThis.__GHRAB_STUDIO_ACCESS__?.appId === 'generator' &&
      !globalThis.__GHRAB_GENERATOR_SUITE_SESSION__?.isLocked?.();
  }
  function loaded() {return globalThis.GHRABGeneratorFeatures?.[featureName] || null;}
  async function load(name,url) {
    if (!allowed()) throw new Error('CENTRAL_ACCESS_DENIED');
    if (typeof ghrabGeneratorFeatureLoader !== 'function') throw new Error('CENTRAL_LOADER_MISSING');
    const feature = await ghrabGeneratorFeatureLoader(name,url);
    if (!allowed() || !feature || typeof feature.open !== 'function') throw new Error('CENTRAL_LOADER_DENIED');
    return feature;
  }
  async function open() {
    try {const feature=await load(featureName,'./features/central-groups.js');await feature.open();}
    catch (_) {
      const node=document.getElementById('centralGroupsStatus');
      if (node) node.textContent='Moje skupiny momentálně nejsou bezpečně dostupné. Ruční import zůstává k dispozici.';
    }
  }
  async function openResults() {
    try {const feature=await load('centralResults','./features/central-results.js');await feature.open();}
    catch (_) {
      const node=document.getElementById('centralGroupsResultsStatus');
      if(node)node.textContent='Soukromou evidenci nelze bezpečně otevřít. Zkus to znovu po ověření přístupu.';
    }
  }
  function getPrivateCodeBindings() {
    if (!allowed()) throw new Error('CENTRAL_ACCESS_DENIED');
    const link=loaded()?.getLinkMetadata?.();
    if(!link)throw new Error('CENTRAL_GROUP_NOT_LINKED');
    if(typeof rosterEntries==='undefined'||typeof rosterForVerifier!=='function'||
       typeof lastAssembled==='undefined')throw new Error('CENTRAL_CODES_UNAVAILABLE');
    const sealed=lastAssembled?.sourceState?.__roster;
    if(!Array.isArray(sealed)||!sealed.length||
       JSON.stringify(sealed)!==JSON.stringify(rosterForVerifier())||
       !Array.isArray(rosterEntries)||rosterEntries.length!==sealed.length)
      throw new Error('CENTRAL_TEST_NOT_SEALED');
    const testId=lastAssembled?.cfg?.testId;
    if(!testId)throw new Error('CENTRAL_TEST_ID_MISSING');
    const participants=rosterEntries.map(e=>({memberId:e.memberId,code:e.code}));
    if(participants.some(p=>typeof p.memberId!=='string'||!p.memberId.startsWith('mem_')))
      throw new Error('CENTRAL_MAPPING_INCOMPLETE');
    return {link:{groupId:link.groupId,revision:link.revision},testId,participants};
  }
  function clearPrivateState() {
    try {loaded()?.clear?.();} catch (_) {}
    try {globalThis.GHRABGeneratorFeatures?.centralResults?.clear?.();} catch (_) {}
  }
  globalThis.GHRAB_GENERATOR_GROUPS = Object.freeze({
    open,openResults,getPrivateCodeBindings,clearPrivateState,
    mapRoster(entries) {return allowed()?(loaded()?.mapRoster?.(entries)||entries):entries;},
    onRosterInput(text) {if(allowed())loaded()?.onRosterInput?.(text);},
    getLinkMetadata() {return allowed()?(loaded()?.getLinkMetadata?.()||null):null;},
    displayMemberName(memberId) {return allowed()?(loaded()?.displayMemberName?.(memberId)||null):null;}
  });
})();
