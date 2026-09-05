/* GHRAB Generator · suite-session lifecycle cleanup for Platform 1.1.2.
 * This script is deliberately loaded before the Platform runtime so it can retain
 * native Storage methods even after the platform installs legacy-key aliases.
 * It owns only Generator data plus target-scoped handoff packets; it never rotates
 * the global suite tombstone and never acknowledges another child application.
 */
(function generatorSuiteSessionBootstrap(){
  'use strict';
  if (window.__GHRAB_GENERATOR_SUITE_SESSION__) return;

  const APP_ID = 'generator';
  const CONTRACT = 'ghrab-suite-session-v1';
  const GENERATION_KEY = 'ghrab.platform.suite-session-generation.v1';
  const SEEN_KEY = 'ghrab.generator.suite-session-seen.v1';
  const STATUS_KEY = 'ghrab.generator.suite-session-status.v1';
  const ACCESS_PERMIT_KEY = 'ghrab.access.permit.v2';
  const HANDOFF_V2_KEY = 'ghrab.platform.handoff.v2';
  const HANDOFF_V1_KEY = 'ghrab.handoff.v1';
  const LEGACY_EXACT_KEYS = new Set(['genOnboardingDone_v1', 'genWelcomeShown_session']);
  const RESERVED_GENERATOR_KEYS = new Set([SEEN_KEY, STATUS_KEY]);

  const storagePrototype = window.Storage && window.Storage.prototype;
  const nativeStorage = Object.freeze({
    getItem: storagePrototype && storagePrototype.getItem,
    setItem: storagePrototype && storagePrototype.setItem,
    removeItem: storagePrototype && storagePrototype.removeItem,
    key: storagePrototype && storagePrototype.key,
  });

  function storage(name){
    try { return window[name] || null; } catch (_) { return null; }
  }
  function rawGet(store, key){
    try {
      if (!store) return null;
      const fn = nativeStorage.getItem || store.getItem;
      return fn.call(store, key);
    } catch (_) { return null; }
  }
  function rawSet(store, key, value){
    try {
      if (!store) return false;
      const fn = nativeStorage.setItem || store.setItem;
      fn.call(store, key, String(value));
      return rawGet(store, key) === String(value);
    } catch (_) { return false; }
  }
  function rawRemove(store, key){
    try {
      if (!store) return false;
      const fn = nativeStorage.removeItem || store.removeItem;
      fn.call(store, key);
      return rawGet(store, key) === null;
    } catch (_) { return false; }
  }
  function rawKeys(store){
    const keys = [];
    if (!store) return { ok: false, keys };
    try {
      const fn = nativeStorage.key || store.key;
      for (let index = 0; index < store.length; index += 1) {
        const key = fn.call(store, index);
        if (key !== null && key !== undefined) keys.push(String(key));
      }
      return { ok: true, keys };
    } catch (_) { return { ok: false, keys }; }
  }
  function parseJson(value){
    try { return value ? JSON.parse(value) : null; } catch (_) { return null; }
  }
  function now(){ return new Date().toISOString(); }
  function dispatch(name, detail){
    try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (_) {}
  }

  function ownsGeneratorStorageKey(key){
    const value = String(key || '');
    if (RESERVED_GENERATOR_KEYS.has(value)) return false;
    return value.startsWith('ghrab.generator.') || value.startsWith('sestavovac_') || LEGACY_EXACT_KEYS.has(value);
  }
  function handoffTargetsGenerator(raw, key){
    const packet = parseJson(raw);
    if (!packet || typeof packet !== 'object') return false;
    if (key === HANDOFF_V2_KEY) return String(packet.target && packet.target.appId || '') === APP_ID;
    return String(packet.target || packet.targetAppId || '') === APP_ID;
  }

  function clearStore(store, options){
    const removed = [];
    const failures = [];
    const listed = rawKeys(store);
    if (!listed.ok) return { removed, failures: ['storage-enumeration'] };
    for (const key of listed.keys) {
      const owned = ownsGeneratorStorageKey(key);
      const permit = options && options.includeSharedPermit === true && key === ACCESS_PERMIT_KEY;
      if (!owned && !permit) continue;
      if (rawRemove(store, key)) removed.push(key);
      else failures.push(`remove:${key}`);
    }
    return { removed, failures };
  }

  function clearTargetedHandoffs(local){
    const removed = [];
    const failures = [];
    for (const key of [HANDOFF_V2_KEY, HANDOFF_V1_KEY]) {
      const value = rawGet(local, key);
      if (value === null || !handoffTargetsGenerator(value, key)) continue;
      if (rawRemove(local, key)) removed.push(key);
      else failures.push(`remove:${key}`);
    }
    return { removed, failures };
  }

  function clearOwnedStorage(options){
    const local = storage('localStorage');
    const session = storage('sessionStorage');
    const localResult = clearStore(local, { includeSharedPermit: options && options.includeSharedPermit === true });
    const sessionResult = clearStore(session, { includeSharedPermit: false });
    const handoffResult = clearTargetedHandoffs(local);
    return {
      localRemoved: localResult.removed,
      sessionRemoved: sessionResult.removed,
      sharedHandoffRemoved: handoffResult.removed,
      failures: [...localResult.failures, ...sessionResult.failures, ...handoffResult.failures],
    };
  }

  function generation(){ return String(rawGet(storage('localStorage'), GENERATION_KEY) || ''); }
  function seen(){ return String(rawGet(storage('localStorage'), SEEN_KEY) || ''); }
  function readStatus(){
    const value = parseJson(rawGet(storage('localStorage'), STATUS_KEY));
    return value && value.schema === 'ghrab-generator-suite-session-ack-v1' ? value : null;
  }
  function writeStatus(value){
    return rawSet(storage('localStorage'), STATUS_KEY, JSON.stringify(value));
  }

  let pageGeneration = generation();
  let locked = false;
  let lockReason = '';
  let runtimeCleaner = null;
  let registeredWithPlatform = false;
  let unsubscribePlatform = null;
  let inFlightGeneration = '';
  let inFlightPromise = null;

  function lockPage(reason){
    locked = true;
    lockReason = String(reason || 'suite-session-end');
    try { document.documentElement.dataset.ghrabSuiteSession = 'ended'; } catch (_) {}
    return true;
  }

  async function runRuntimeCleaner(detail){
    if (typeof runtimeCleaner !== 'function') return { ok: true, present: false };
    try {
      const result = await runtimeCleaner(detail);
      if (result === false || (result && result.ok === false)) return { ok: false, present: true, failure: 'runtime-cleanup' };
      return { ok: true, present: true };
    } catch (_) { return { ok: false, present: true, failure: 'runtime-cleanup-exception' }; }
  }

  async function acknowledgeGeneration(targetGeneration){
    const sessionApi = window.GHRAB_PLATFORM && window.GHRAB_PLATFORM.session;
    if (!sessionApi || sessionApi.contract !== CONTRACT || typeof sessionApi.acknowledge !== 'function') return false;
    let acknowledged = false;
    try { acknowledged = sessionApi.acknowledge(targetGeneration) !== false; } catch (_) { acknowledged = false; }
    return acknowledged && String(sessionApi.seen ? sessionApi.seen() : seen()) === String(targetGeneration);
  }

  async function processGeneration(detail, options){
    const targetGeneration = String(detail && detail.generation || generation() || '');
    if (!targetGeneration) return { ok: false, reason: 'missing-generation' };
    lockPage((options && options.source) || (detail && detail.reason) || 'suite-session-end');

    if (inFlightPromise && inFlightGeneration === targetGeneration) return inFlightPromise;
    inFlightGeneration = targetGeneration;
    inFlightPromise = (async () => {
      const prior = readStatus();
      const forceDocumentCleanup = options && options.forceDocumentCleanup === true;
      const cleanupAlreadyCompleted = prior && prior.generation === targetGeneration && Boolean(prior.cleanupCompletedAt) && !prior.cleanupFailedAt;

      if (cleanupAlreadyCompleted && !forceDocumentCleanup) {
        if (seen() === targetGeneration) {
          pageGeneration = targetGeneration;
          return { ok: true, generation: targetGeneration, replayed: false, idempotent: true };
        }
        const ackOnly = await acknowledgeGeneration(targetGeneration);
        if (ackOnly) {
          pageGeneration = targetGeneration;
          dispatch('ghrab:generator-suite-session-acknowledged', { generation: targetGeneration, replay: true, ackOnly: true });
          return { ok: true, generation: targetGeneration, replayed: true, ackOnly: true };
        }
        return { ok: false, generation: targetGeneration, reason: 'acknowledgement-failed' };
      }

      const startedAt = now();
      const status = {
        schema: 'ghrab-generator-suite-session-ack-v1',
        appId: APP_ID,
        generation: targetGeneration,
        seenAt: prior && prior.generation === targetGeneration && prior.seenAt ? prior.seenAt : startedAt,
        cleanupStartedAt: startedAt,
        cleanupCompletedAt: null,
        cleanupFailedAt: null,
        acknowledgementFailedAt: null,
        acknowledgedAt: null,
        source: String((options && options.source) || (detail && detail.reason) || 'suite-session'),
        removed: { local: 0, session: 0, handoff: 0 },
        failures: [],
      };
      const statusStarted = writeStatus(status);
      dispatch('ghrab:generator-suite-session-seen', { generation: targetGeneration });

      const cleared = clearOwnedStorage({ includeSharedPermit: false });
      const runtime = await runRuntimeCleaner({
        schema: CONTRACT,
        generation: targetGeneration,
        reason: detail && detail.reason || 'suite-session-end',
        replay: Boolean(detail && detail.replay),
      });
      status.removed.local = cleared.localRemoved.length;
      status.removed.session = cleared.sessionRemoved.length;
      status.removed.handoff = cleared.sharedHandoffRemoved.length;
      status.failures = [...cleared.failures];
      if (!statusStarted) status.failures.push('status-write:seen');
      if (!runtime.ok) status.failures.push(runtime.failure || 'runtime-cleanup');

      if (status.failures.length) {
        status.cleanupFailedAt = now();
        writeStatus(status);
        pageGeneration = targetGeneration;
        dispatch('ghrab:generator-suite-session-cleanup-failed', { generation: targetGeneration, failures: status.failures.slice() });
        return { ok: false, generation: targetGeneration, failures: status.failures.slice() };
      }

      status.cleanupCompletedAt = now();
      if (!writeStatus(status)) {
        pageGeneration = targetGeneration;
        dispatch('ghrab:generator-suite-session-cleanup-failed', { generation: targetGeneration, failures: ['status-write:completed'] });
        return { ok: false, generation: targetGeneration, failures: ['status-write:completed'] };
      }
      dispatch('ghrab:generator-suite-session-cleanup-complete', { generation: targetGeneration, removed: { ...status.removed } });

      const acked = await acknowledgeGeneration(targetGeneration);
      if (!acked) {
        const failed = { ...status, acknowledgementFailedAt: now(), failures: ['acknowledgement-failed'] };
        writeStatus(failed);
        pageGeneration = targetGeneration;
        return { ok: false, generation: targetGeneration, failures: failed.failures.slice() };
      }

      pageGeneration = targetGeneration;
      const finalStatus = { ...status, acknowledgedAt: now() };
      writeStatus(finalStatus); // best-effort audit timestamp; SEEN_KEY is the authoritative acknowledgement.
      dispatch('ghrab:generator-suite-session-acknowledged', { generation: targetGeneration, replay: Boolean(detail && detail.replay) });
      return { ok: true, generation: targetGeneration, removed: { ...status.removed } };
    })().finally(() => {
      inFlightGeneration = '';
      inFlightPromise = null;
    });
    return inFlightPromise;
  }

  function bindPlatform(){
    const platform = window.GHRAB_PLATFORM;
    const sessionApi = platform && platform.session;
    if (!sessionApi || sessionApi.contract !== CONTRACT || typeof sessionApi.onEnd !== 'function') return false;
    if (!registeredWithPlatform) {
      unsubscribePlatform = sessionApi.onEnd(async (detail) => {
        const result = await processGeneration(detail, { source: detail && detail.replay ? 'platform-replay' : 'platform-onEnd' });
        return result && result.ok === true;
      });
      registeredWithPlatform = true;
    }
    const current = generation();
    if (current && current !== seen()) {
      void processGeneration({ schema: CONTRACT, generation: current, reason: 'pending-suite-end', clearApplicationData: true, appId: APP_ID, replay: true }, { source: 'bootstrap-replay' });
    }
    return true;
  }

  function checkForStaleDocument(source){
    const current = generation();
    if (!current) return true;
    if (current !== pageGeneration) {
      lockPage(source || 'stale-document');
      void processGeneration({ schema: CONTRACT, generation: current, reason: source || 'stale-document', clearApplicationData: true, appId: APP_ID, replay: true }, { source: source || 'stale-document', forceDocumentCleanup: true });
      return false;
    }
    if (current !== seen()) {
      lockPage(source || 'pending-suite-end');
      void processGeneration({ schema: CONTRACT, generation: current, reason: source || 'pending-suite-end', clearApplicationData: true, appId: APP_ID, replay: true }, { source: source || 'pending-suite-end' });
      return false;
    }
    return !locked;
  }

  function persistenceAllowed(){
    if (locked) return false;
    return checkForStaleDocument('persistence-guard');
  }

  function registerRuntimeCleanup(cleaner){
    if (typeof cleaner !== 'function') throw new TypeError('Generator runtime cleanup must be a function.');
    runtimeCleaner = cleaner;
    if (locked) {
      try { void Promise.resolve(runtimeCleaner({ schema: CONTRACT, generation: generation(), reason: lockReason || 'already-locked', replay: true })); } catch (_) {}
    }
    return () => { if (runtimeCleaner === cleaner) runtimeCleaner = null; };
  }

  function manualEndWork(options){
    lockPage('manual-generator-end-work');
    const result = clearOwnedStorage({ includeSharedPermit: options && options.includeSharedPermit !== false });
    return { ok: result.failures.length === 0, ...result };
  }

  const api = Object.freeze({
    contract: CONTRACT,
    generationKey: GENERATION_KEY,
    seenKey: SEEN_KEY,
    statusKey: STATUS_KEY,
    generation,
    seen,
    status: readStatus,
    isLocked: () => locked,
    lockReason: () => lockReason,
    persistenceAllowed,
    ownsStorageKey: ownsGeneratorStorageKey,
    clearOwnedStorage,
    manualEndWork,
    registerRuntimeCleanup,
    processGeneration: (detail) => processGeneration(detail, { source: 'explicit' }),
    bindPlatform,
    dispose: () => { try { if (typeof unsubscribePlatform === 'function') unsubscribePlatform(); } catch (_) {} },
  });
  Object.defineProperty(window, '__GHRAB_GENERATOR_SUITE_SESSION__', { configurable: false, enumerable: false, writable: false, value: api });

  document.addEventListener('ghrab:platform-ready', () => { bindPlatform(); }, { once: false });
  window.addEventListener('storage', (event) => {
    if (event && event.key === GENERATION_KEY && event.newValue && String(event.newValue) !== pageGeneration) {
      lockPage('cross-context');
      void processGeneration({ schema: CONTRACT, generation: String(event.newValue), reason: 'cross-context', clearApplicationData: true, appId: APP_ID }, { source: 'cross-context', forceDocumentCleanup: true });
    }
  });
  window.addEventListener('pageshow', () => { checkForStaleDocument('pageshow'); });
  window.addEventListener('focus', () => { checkForStaleDocument('focus'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForStaleDocument('visibilitychange'); });

  bindPlatform();
})();
