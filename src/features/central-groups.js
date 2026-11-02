/* Stage 08A: teacher-only, local-first groups import into GIT 7.1.101.
   No direct storage access, no student submission or answer-key changes. */
(function () {
  'use strict';
  const META_CONSUMER = 'generator';
  const ROSTER_CONSUMER = 'generator-forms';
  const GROUP_ID = /^grp_[A-Za-z0-9-]{12,}$/;
  const MEMBER_ID = /^mem_[A-Za-z0-9-]{12,}$/;
  const META_KEYS = new Set(['schema','groupId','revision','displayName','schoolYear','subject','grade','status','updatedAt']);
  const PROJECTION_KEYS = new Set(['contract','consumerAppId','group','members']);
  const MEMBER_KEYS = new Set(['memberId','name','schoolEmail']);
  let servicePromise = null;
  let pendingLegacyMigration = false;
  let dialog = null;
  let sequence = 0;
  let preview = null;
  let linked = null;
  let expectedInput = null;
  let memberByEmail = new Map();

  function error(code) { const e = new Error(code); e.code = code; return e; }
  function permitted() {
    if (document.documentElement.dataset.ghrabAccess !== 'granted' ||
        globalThis.__GHRAB_STUDIO_ACCESS__?.appId !== 'generator' ||
        globalThis.__GHRAB_GENERATOR_SUITE_SESSION__?.isLocked?.()) {
      throw error('CENTRAL_ACCESS_DENIED');
    }
  }
  function safeObject(x, permittedKeys) {
    return !!x && typeof x === 'object' && !Array.isArray(x) &&
      Object.keys(x).every(key => permittedKeys.has(key));
  }
  function checkMetadata(group) {
    if (!safeObject(group, META_KEYS) || group.schema !== 'ghrab-teaching-group-v1' ||
        !GROUP_ID.test(group.groupId || '') || !Number.isSafeInteger(group.revision) || group.revision < 1 ||
        !['active','archived'].includes(group.status) ||
        typeof group.displayName !== 'string' || group.displayName.trim().length < 1 || group.displayName.length > 120 ||
        /[<>\u0000-\u001f]/.test(group.displayName) ||
        !/^\d{4}\/\d{2,4}$/.test(group.schoolYear || '') ||
        typeof group.updatedAt !== 'string' || !Number.isFinite(Date.parse(group.updatedAt))) {
      throw error('CENTRAL_METADATA_INVALID');
    }
    return group;
  }
  function checkList(list) {
    if (!Array.isArray(list) || list.length > 200) throw error('CENTRAL_LIST_INVALID');
    const ids = new Set();
    for (const group of list) {
      checkMetadata(group);
      if (ids.has(group.groupId)) throw error('CENTRAL_DUPLICATE_GROUP');
      ids.add(group.groupId);
    }
    return list;
  }
  function checkProjection(value, requestedId) {
    if (!safeObject(value, PROJECTION_KEYS) || value.contract !== 'ghrab-roster-projection-v1' ||
        value.consumerAppId !== ROSTER_CONSUMER ||
        JSON.stringify(value).length > 300000 || !Array.isArray(value.members) || value.members.length > 500) {
      throw error('CENTRAL_PROJECTION_INVALID');
    }
    const group = checkMetadata(value.group);
    if (group.groupId !== requestedId || group.status !== 'active') throw error('CENTRAL_GROUP_MISMATCH');
    const emails = new Set();
    const members = new Set();
    for (const m of value.members) {
      if (!safeObject(m, MEMBER_KEYS) || !MEMBER_ID.test(m.memberId || '') || members.has(m.memberId) ||
          typeof m.name !== 'string' || m.name.trim().length < 1 || m.name.length > 120 ||
          /[<>\u0000-\u001f]/.test(m.name) ||
          !(m.schoolEmail == null || typeof m.schoolEmail === 'string')) throw error('CENTRAL_MEMBER_INVALID');
      members.add(m.memberId);
      if (m.schoolEmail) {
        const email = m.schoolEmail.trim().toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || emails.has(email)) {
          throw error('CENTRAL_EMAIL_INVALID');
        }
        emails.add(email);
      }
    }
    return value;
  }
  function planImport(value) {
    const available = value.members.filter(m => !!m.schoolEmail);
    return Object.freeze({
      groupId: value.group.groupId, revision: value.group.revision,
      total: value.members.length, withEmail: available.length,
      missing: value.members.length - available.length,
      rows: available.map(m => ({memberId:m.memberId,name:m.name,email:m.schoolEmail.trim().toLowerCase()}))
    });
  }
  function currentStudioBase() {
    const configured = globalThis.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl ||
      globalThis.__GHRAB_STUDIO_URL__ || '/AI-Studio-GHRAB/';
    const base = new URL(String(configured), location.href);
    if (!['http:','https:'].includes(base.protocol) || base.origin !== location.origin ||
        base.username || base.password || base.search || base.hash) throw error('CENTRAL_ORIGIN_DENIED');
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const src = new URL('groups/verified-client.js',base);
    if (src.origin !== location.origin || !src.pathname.startsWith(base.pathname)) throw error('CENTRAL_SERVICE_PATH_DENIED');
    return src.href;
  }
  async function getService() {
    permitted();
    if (!servicePromise) {
      servicePromise = (async () => {
        const mod = await import(currentStudioBase());
        if (typeof mod.openVerifiedGroupsV2 !== 'function') throw error('CENTRAL_VERIFIED_CLIENT_REQUIRED');
        const verified = await mod.openVerifiedGroupsV2('generator');
        permitted();
        if (verified?.schema !== 'ghrab-groups-verified-consumer-v2' ||
            verified.consumerAppId !== 'generator' ||
            typeof verified.legacyStorePresent !== 'boolean') {
          throw error('CENTRAL_V2_CONTRACT_MISMATCH');
        }
        const service = verified.service;
        if (service?.schema !== 'ghrab-groups-service-v1' || service.contractVersion !== 1 ||
            typeof service.listGroupMetadata !== 'function' || typeof service.getRosterProjection !== 'function') {
          throw error('CENTRAL_SERVICE_CONTRACT_MISMATCH');
        }
        pendingLegacyMigration = verified.legacyStorePresent;
        return service;
      })().catch(e => {servicePromise = null; throw e;});
    }
    const result = await servicePromise;
    permitted();
    return result;
  }
  function element(tag, value) {
    const n = document.createElement(tag);
    if (value != null) n.textContent = String(value);
    return n;
  }
  function button(label, handler) {
    const b = element('button',label); b.type = 'button'; b.className = 'btn-edit';
    b.addEventListener('click', () => { void handler(); });
    return b;
  }
  function status(message) {
    const node = document.getElementById('centralGroupsStatus');
    if (node) node.textContent = message;
  }
  function modalStatus(message) {
    const node = document.getElementById('centralGroupsPreview');
    if (node) node.textContent = message;
  }
  function ensureDialog() {
    if (dialog) return dialog;
    dialog = element('dialog'); dialog.id = 'centralGroupsDialog';
    dialog.setAttribute('aria-label','Moje skupiny: na\u010dten\u00ed do GIT');
    dialog.style.maxWidth = 'min(92vw, 34rem)';
    dialog.style.width = '100%';
    dialog.append(element('h3','Moje skupiny \u2013 p\u0159evzet\u00ed seznamu'));
    const hint = element('p','Na\u010d\u00edt\u00e1n\u00ed je pouze pro u\u010ditele. Studentsk\u00e9 k\u00f3dy vzniknou a\u017e samostatnou akc\u00ed v GIT.');
    hint.className = 'small-muted'; dialog.append(hint);
    const label = element('label','Skupina'); label.setAttribute('for','centralGroupsSelect');
    const select = element('select'); select.id = 'centralGroupsSelect'; select.style.width = '100%';
    label.append(select);dialog.append(label);
    const details = element('p'); details.id = 'centralGroupsPreview';
    details.className = 'small-muted'; details.setAttribute('role','status');
    dialog.append(details);
    const controls = element('div'); controls.className = 'btn-row';
    const refresh = button('Zobrazit n\u00e1hled',previewSelection);
    const apply = button('Pou\u017e\u00edt tuto skupinu',applySelection); apply.id = 'centralGroupsApply';apply.disabled = true;
    const close = button('Zav\u0159\u00edt', async () => {dialog.close();});
    controls.append(refresh,apply,close);dialog.append(controls);
    select.addEventListener('change',() => { preview = null;apply.disabled = true;modalStatus('Vyber skupinu a otev\u0159i n\u00e1hled.'); });
    dialog.addEventListener('close',() => { ++sequence;preview=null;apply.disabled=true; });
    document.body.append(dialog);
    return dialog;
  }
  function readableError(e) {
    if (e?.code === 'CENTRAL_ACCESS_DENIED') return 'P\u0159\u00edstup do Moje skupiny je uzam\u010den. Otev\u0159i GIT p\u0159es ofici\u00e1ln\u00ed AI Studio.';
    if (e?.code === 'CENTRAL_EMAIL_INVALID' || e?.code === 'CENTRAL_MEMBER_INVALID') return 'Seznam obsahuje neplatn\u00e9 nebo duplicitn\u00ed \u00fadaje. Uprav ho v AI Studiu.';
    return 'Centr\u00e1ln\u00ed seznam nelze bezpe\u010dn\u011b na\u010d\u00edst. Ru\u010dn\u00ed import funguje d\u00e1l.';
  }
  async function open() {
    const ticket=++sequence; preview = null;
    try {permitted();} catch (e) {status(readableError(e));return;}
    const d=ensureDialog(),select=document.getElementById('centralGroupsSelect');
    document.getElementById('centralGroupsApply').disabled = true;
    modalStatus('Na\u010d\u00edt\u00e1m pouze metadata skupin...');
    if (!d.open) d.showModal();
    try {
      const service=await getService();
      const groups=checkList(service.listGroupMetadata(META_CONSUMER,{status:'active'}));
      permitted();
      if (ticket!==sequence || !d.open) return;
      select.replaceChildren();
      for (const group of groups) {
        if (group.status !== 'active') continue;
        const opt=element('option',group.displayName+' \u00b7 revize '+group.revision);
        opt.value=group.groupId;select.append(opt);
      }
      if (linked?.groupId && groups.some(g=>g.groupId===linked.groupId))select.value=linked.groupId;
      modalStatus(groups.length ? 'Vyber skupinu a zobraz n\u00e1hled.' :
        pendingLegacyMigration
          ? 'Star\u0161\u00ed skupiny jsou ve spole\u010dn\u00e9m \u00falo\u017ei\u0161ti. Opr\u00e1vn\u011bn\u00fd p\u0159evod do tv\u00e9ho \u00fa\u010dtu je nutn\u00fd; automatick\u00fd import nen\u00ed povolen.'
          : 'Nem\u00e1\u0161 v AI Studiu \u017e\u00e1dnou aktivn\u00ed skupinu.');
    } catch(e) {modalStatus(readableError(e));}
  }
  async function previewSelection() {
    const ticket = ++sequence;
    preview = null;document.getElementById('centralGroupsApply').disabled = true;
    const id=document.getElementById('centralGroupsSelect').value;
    if (!GROUP_ID.test(id)) {modalStatus('Vyber platnou skupinu.');return;}
    modalStatus('Kontroluji \u010dleny skupiny...');
    try {
      const service=await getService();
      const projection=checkProjection(service.getRosterProjection(id,ROSTER_CONSUMER),id);
      if (linked?.groupId === id) {
        if (projection.group.revision < linked.revision) throw error('CENTRAL_REVISION_ROLLBACK');
        if (projection.group.revision === linked.revision &&
            linked.fingerprint !== JSON.stringify(projection)) throw error('CENTRAL_REVISION_CONTENT_CONFLICT');
      }
      permitted();
      if (ticket!==sequence || document.getElementById('centralGroupsSelect').value!==id) return;
      const plan=planImport(projection);
      preview={id,revision:plan.revision,fingerprint:JSON.stringify(projection),plan};
      const missing=plan.missing ? ' \u00b7 chyb\u011bj\u00edc\u00ed e-maily: '+plan.missing : '';
      modalStatus('Revize '+plan.revision+' \u00b7 student\u016f '+plan.total+' \u00b7 s e-mailem '+plan.withEmail+missing +
        (plan.missing ? '. Dopl\u0148 chyb\u011bj\u00edc\u00ed e-maily v AI Studiu; \u010d\u00e1ste\u010dn\u00fd import nen\u00ed povolen.' : ' \u00b7 p\u0159ipraveno ke schv\u00e1len\u00ed.'));
      document.getElementById('centralGroupsApply').disabled = !!plan.missing || !plan.total;
    } catch(e) {modalStatus(readableError(e));}
  }
  async function applySelection() {
    const selected=preview;
    preview=null;document.getElementById('centralGroupsApply').disabled = true;
    if (!selected || document.getElementById('centralGroupsSelect').value!==selected.id) return;
    try {
      const service=await getService();
      const latest=checkProjection(service.getRosterProjection(selected.id,ROSTER_CONSUMER),selected.id);
      if (latest.group.revision!==selected.revision || JSON.stringify(latest)!==selected.fingerprint) {
        throw error('CENTRAL_STALE_PREVIEW');
      }
      const plan=planImport(latest);
      if (plan.missing || !plan.total) throw error('CENTRAL_ROSTER_INCOMPLETE');
      if (typeof lastAssembled !== 'undefined' && lastAssembled?.sourceState?.__roster?.length) {
        modalStatus('Hotov\u00fd test ji\u017e obsahuje soukrom\u00fd seznam k\u00f3d\u016f. Za\u010dni novou p\u0159\u00edpravu; star\u00fd export nesm\u00ed b\u00fdt ti\u0161e p\u0159eps\u00e1n.');return;
      }
      const current=document.getElementById('rosterEmails').value.trim();
      if ((current || (typeof rosterIssuedCodes !== 'undefined' && rosterIssuedCodes.size)) &&
          !(await globalThis.uiConfirm?.('Nahradit dosavadn\u00ed e-maily skupinou z AI Studia? Lok\u00e1ln\u00ed nerozeslan\u00e9 k\u00f3dy se vyma\u017eou; nov\u00e9 vytvo\u0159\u00ed\u0161 samostatn\u011b.','Na\u010d\u00edst skupinu'))) return;
      // The teacher confirmation is asynchronous. Read again to close the TOCTOU window.
      permitted();
      const confirmed=checkProjection(service.getRosterProjection(selected.id,ROSTER_CONSUMER),selected.id);
      if (confirmed.group.revision!==selected.revision || JSON.stringify(confirmed)!==selected.fingerprint) {
        throw error('CENTRAL_STALE_PREVIEW');
      }
      const target=document.getElementById('rosterEmails');
      if (!target) throw error('CENTRAL_ROSTER_UI_MISSING');
      target.value=plan.rows.map(r=>r.email).join('\n');
      memberByEmail=new Map(plan.rows.map(r=>[r.email,Object.freeze({memberId:r.memberId,name:r.name})]));
      linked=Object.freeze({groupId:plan.groupId,revision:plan.revision,memberCount:plan.total,fingerprint:JSON.stringify(latest)});
      expectedInput=target.value;
      if (typeof rosterIssuedCodes !== 'undefined') rosterIssuedCodes.clear();
      if (typeof rosterEntries !== 'undefined') rosterEntries=[];
      if (typeof globalThis.rosterRefreshParticipants==='function') globalThis.rosterRefreshParticipants();
      status('Napojeno na Moje skupiny \u00b7 revize '+plan.revision+' \u00b7 '+plan.total+' student\u016f. K\u00f3dy teprve p\u0159iprav pomoc\u00ed st\u00e1vaj\u00edc\u00edho tla\u010d\u00edtka.');
      dialog.close();
    } catch(e) {modalStatus(e?.code==='CENTRAL_STALE_PREVIEW'?'Skupina se od n\u00e1hledu zm\u011bnila. Obnov n\u00e1hled.':readableError(e));}
  }
  function onRosterInput(text) {
    if (linked && String(text)!==expectedInput) {
      linked=null;expectedInput=null;memberByEmail.clear();
      status('Ru\u010dn\u00ed \u00faprava odpojila cent\u00e1ln\u00ed vazbu. E-maily v poli z\u016fstaly zachov\u00e1ny.');
    }
  }
  function mapRoster(entries) {
    if (!linked || !Array.isArray(entries)) return entries;
    return entries.map(entry=>{
      const record=memberByEmail.get(entry.email);
      return record ? {...entry,label:record.name,memberId:record.memberId}:entry;
    });
  }
  globalThis.GHRABGeneratorFeatures=globalThis.GHRABGeneratorFeatures||{};
  function clear(){
    ++sequence;servicePromise=null;preview=null;linked=null;expectedInput=null;
    memberByEmail.clear();
    try{if(dialog?.open)dialog.close();}catch(_){}
    status('Centrální skupina odpojena.');
  }
  function displayMemberName(memberId){
    if(!linked)return null;
    for(const record of memberByEmail.values())if(record.memberId===memberId)return record.name;
    return null;
  }
  globalThis.GHRABGeneratorFeatures.centralGroups=Object.freeze({open,mapRoster,onRosterInput,clear,displayMemberName,
    getLinkMetadata:()=>linked?{groupId:linked.groupId,revision:linked.revision,memberCount:linked.memberCount}:null});
})();
