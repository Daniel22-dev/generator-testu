// Nezávislý behaviorální adversarial harness pro GIT 7.1.75 (auditor, není součástí balíčku).
// Spuštění z kořene repozitáře: npm ci && npm run build && node GIT-7_1_75-adversarial-harness.mjs
// Spouští SKUTEČNÝ generátor z dist/index.html a SKUTEČNĚ vygenerované instant/secure/verifier HTML v jsdom.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import * as acorn from 'acorn';

const TEACH = 'TEACH-ABCDEF-123456', REC = 'REC-AB12-CD34', TEACHER_NAME = 'Daniel Teacher';
const results = [];
function rec(id, status, detail) { results.push({ id, status, detail }); console.log(`${status.padEnd(9)} ${id} — ${detail}`); }
async function T(id, fn) { try { const d = await fn(); rec(id, 'PASS', d || ''); } catch (e) { rec(id, e.isFinding ? 'FAIL' : 'ERROR', e.message); } }
function must(c, m) { if (!c) { const e = new Error(m); e.isFinding = true; throw e; } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

let html = fs.readFileSync('dist/index.html', 'utf8')
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
  .replace('<body>', '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"ADV",displayName:"Adv",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"adv"}};<\/script>');
const blobs = [];
const gdom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://daniel22-dev.github.io/generator-testu/', pretendToBeVisual: true,
  beforeParse(w) {
    w.acorn = acorn;
    w.__GHRAB_DEPLOYMENT_CONFIG__ = Object.freeze({ schema: 'ghrab-deployment-config-v1', version: 1, environmentId: 'adv', profile: 'github-pages', authMode: 'signed-permit', aiTransport: 'direct-gemini', apiBaseUrl: '', features: Object.freeze({ allowLocalProviderKeys: true, serverSessionReady: false, schoolGatewayReady: false, schoolServerConnected: false }) });
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = b => { blobs.push(b); return 'blob:adv'; }; w.URL.revokeObjectURL = () => {};
    w.fetch = async () => { throw new Error('network disabled'); };
  }
});
const w = gdom.window;
await sleep(1500);
const setVal = (id, v) => { const el = w.document.getElementById(id); if (!el) throw new Error('chybí #' + id); el.value = v; };
const GEN = { exercises: [{ title: 'MC', type: 'multiple choice', points_total: 5, points_each: 1, items: [1,2,3,4,5].map(i => ({ question: 'Q'+i+'?', options: ['A', 'B'], correct: i%2 })) }] };
function configure(over, t = TEACH, r = REC) {
  w.eval(`Object.assign(state,{appMode:'advanced',jazyk:'angličtina',instrJazyk:'cs',uroven:['B1'],kombinovat:false,pocet:1,typyCviceni:['multiple choice'],cas:15,odevzdavani:'B',randomizace:'NE',layout:'classic',tema:'default',zolicek:'NE',diferencovany:'NE',overeni:'NE',anonymizace:'ANO',body:5,identityMode:'name'},${JSON.stringify(over)});rosterEntries=[];`);
  setVal('nazev', 'ADV test'); setVal('proKoho', '1.A'); setVal('latka', 'x'); setVal('ucitelJmeno', TEACHER_NAME);
  setVal('ucitelPin', t); setVal('recoveryCode', r);
}
const build = async () => w.assembleTestHtml(w.eval('state'), JSON.parse(JSON.stringify(GEN)));
function genDom(h, storage) {
  const d = new JSDOM(h, {
    runScripts: 'dangerously', url: 'https://school.example/t.html', pretendToBeVisual: true,
    beforeParse(x) {
      if (!x.crypto || !x.crypto.subtle) Object.defineProperty(x, 'crypto', { value: webcrypto });
      x.matchMedia = x.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      x.scrollTo = () => {}; x.HTMLElement.prototype.scrollIntoView = () => {};
      if (x.HTMLAnchorElement) x.HTMLAnchorElement.prototype.click = () => {};
      x.URL.createObjectURL = () => 'blob:g'; x.URL.revokeObjectURL = () => {};
      if (storage) for (const [k, v] of Object.entries(storage)) x.localStorage.setItem(k, v);
    }
  });
  return d.window;
}
const dumpStorage = x => { const o = {}; for (let i = 0; i < x.localStorage.length; i++) { const k = x.localStorage.key(i); o[k] = x.localStorage.getItem(k); } return o; };
const rawVariants = s => [s, s.toLowerCase()];
const containsRaw = (txt, s) => rawVariants(s).some(v => txt.includes(v));

// ───────────── Kryptografie (generátor) ─────────────
await T('Q-crypto: stejný plaintext v obou rolích → různé hashe', async () => {
  const a = await w.deriveSecretHash('teacher-pin', 'SAME-SECRET-123456', 'T1');
  const b = await w.deriveSecretHash('recovery-code', 'SAME-SECRET-123456', 'T1');
  must(a !== b, 'teacher/recovery hash shodné'); return 'domény oddělené';
});
await T('P-crypto: stejný Recovery plaintext, jiný testId → jiný hash', async () => {
  const a = await w.deriveSecretHash('recovery-code', REC, 'TEST-A');
  const b = await w.deriveSecretHash('recovery-code', REC, 'TEST-B');
  must(a !== b, 'hash nezávisí na testId'); return 'testId je součástí soli';
});

// ───────────── Q: validace v generátoru ─────────────
await T('Q-ui: Teacher == Recovery blokuje krok 3', async () => {
  configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true });
  setVal('ucitelPin', 'SAME-SECRET-123456'); setVal('recoveryCode', 'same-secret-123456'); w.validate();
  must(w.document.getElementById('next3').disabled, 'next3 povolen'); return 'next3 disabled + hláška';
});
await T('R: přísný test bez Recovery kódu se nesestaví (fail-closed)', async () => {
  configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true }, TEACH, '');
  // ensureRecoveryCodeForGuard by kód doplnil přes validate(); sestavujeme přímo bez validate
  let threw = false, msg=''; try { await build(); } catch (e) { msg=e.message; threw = /Recovery/.test(e.message); }
  must(threw, 'sestavení neselhalo na Recovery: '+msg.slice(0,80)); return 'assembleTestHtml vyhodí chybu';
});

// ───────────── INSTANT runtime ─────────────
configure({ testMode: 'bezny', resultMode: 'instant', screenGuard: true, feedbackMode: 'brief' });
const instantHtml = await build();
const instCfg = JSON.parse(instantHtml.match(/const CFG=(\{.*?\});\nconst VARIANTS=/s)[1]);
await T('S/T instant: raw credentialy nejsou v HTML', async () => {
  must(!containsRaw(instantHtml, TEACH), 'raw Teacher v instant HTML'); must(!containsRaw(instantHtml, REC), 'raw Recovery v instant HTML');
  return `lockOnLeave=${instCfg.lockOnLeave}, hasRecoveryUnlock=${instCfg.hasRecoveryUnlock}`;
});
{
  const x = genDom(instantHtml); await sleep(150);
  x.document.getElementById('studentName').value = 'Student'; await x.startTest(); await sleep(50);
  const panelHidden = () => x.document.getElementById('t-panel').classList.contains('hidden');
  const lockShown = () => !x.document.getElementById('lockScreen').classList.contains('hidden');
  const unlock = async v => { x.document.getElementById('unlockInp').value = v; await x.tryUnlock(); };
  await T('C instant: Recovery neotevře učitelský panel', async () => {
    x.openTeacherModal(); x.document.getElementById('t-name').value = TEACHER_NAME; x.document.getElementById('t-pin').value = REC;
    await x.doTeacherLogin(); must(panelHidden(), 'Recovery otevřel teacher panel'); x.closeTeacherModal(); return 'panel zůstal skrytý';
  });
  await T('F instant: Teacher/Admin otevře učitelský panel', async () => {
    x.openTeacherModal(); x.document.getElementById('t-name').value = TEACHER_NAME; x.document.getElementById('t-pin').value = TEACH.toLowerCase();
    await x.doTeacherLogin(); must(!panelHidden(), 'teacher login selhal'); x.closeTeacherModal(); return 'OK (i lowercase)';
  });
  x.eval("ANSWERS['0_0']=0;");
  const att0 = x.eval('attemptId');
  x.dispatchEvent(new x.Event('pagehide')); await sleep(20);
  await T('instant: pagehide zamkne', async () => { must(lockShown(), 'nezamčeno'); return 'lockScreen'; });
  await T('H instant: Teacher/Admin neodemkne zámek', async () => { await unlock(TEACH); must(lockShown(), 'Teacher odemkl'); return 'zůstává zamčeno'; });
  await T('B instant: špatný Recovery neodemkne', async () => { await unlock('REC-WRNG-0000'); must(lockShown(), 'špatný kód odemkl'); return 'zůstává zamčeno'; });
  await T('A instant: správný Recovery odemkne', async () => { await unlock(REC.toLowerCase()); must(!lockShown(), 'neodemčeno'); return 'odemčeno (i lowercase)'; });
  await T('I/N instant: attemptId a odpovědi zachovány', async () => {
    must(x.eval('attemptId') === att0, 'attemptId změněn'); must(x.eval("ANSWERS['0_0']") === 0, 'odpověď ztracena'); return att0;
  });
  x.dispatchEvent(new x.Event('pagehide')); await sleep(20); await unlock(REC);
  await T('O instant: LOCK→UNLOCK→LOCK→UNLOCK uspořádané a provázané', async () => {
    const ev = x.eval('securityEvents').filter(e => ['lock', 'recovery-unlock'].includes(e.type));
    const seq = ev.map(e => e.type).join('>');
    must(seq === 'lock>recovery-unlock>lock>recovery-unlock', 'sekvence ' + seq);
    must(ev[1].lockAt === ev[0].ts && ev[3].lockAt === ev[2].ts, 'lockAt neodkazuje na předchozí lock');
    return seq;
  });
  await T('AB instant: dvojklik / unlock bez zámku nevytvoří falešný audit', async () => {
    const before = x.eval("securityEvents.filter(e=>e.type==='recovery-unlock').length");
    await unlock(REC); // test NENÍ zamčen
    const after = x.eval("securityEvents.filter(e=>e.type==='recovery-unlock').length");
    must(after === before, `recovery-unlock zaznamenán i bez zámku (${before}→${after})`); return 'beze změny';
  });
  await T('instant: recovery-unlock nezvyšuje počet varování v OVR4', async () => {
    const counts = x.eval('securityCounts()'); const wc = x.eval('warningCount');
    must(wc === counts.warnings, `warningCount=${wc}, securityCounts.warnings=${counts.warnings}, events=${counts.total}`); return 'shoda';
  });
}

// ───────────── P: přenositelnost mezi testy ─────────────
configure({ testMode: 'bezny', resultMode: 'instant', screenGuard: true, feedbackMode: 'brief' }, TEACH, 'REC-ZZZZ-9999');
const instantB = await build();
await T('P instant: Recovery z testu A neodemkne test B', async () => {
  const x = genDom(instantB); await sleep(150);
  x.document.getElementById('studentName').value = 'S'; await x.startTest(); x.dispatchEvent(new x.Event('pagehide')); await sleep(20);
  x.document.getElementById('unlockInp').value = REC; await x.tryUnlock();
  must(!x.document.getElementById('lockScreen').classList.contains('hidden'), 'kód z A odemkl B'); return 'B zůstal zamčen';
});

// ───────────── SECURE runtime ─────────────
configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true, feedbackMode: 'none', zolicek: 'ANO' });
const pack = await build();
const secCfg = JSON.parse(JSON.stringify(w.eval('lastAssembled.cfg')));
await T('S/T secure: raw credentialy nejsou ve student HTML', async () => {
  must(!containsRaw(pack.studentHtml, TEACH), 'raw Teacher'); must(!containsRaw(pack.studentHtml, REC), 'raw Recovery');
  return `student ${Math.round(pack.studentHtml.length / 1024)} kB`;
});
await T('secure: raw credentialy nejsou ani ve Verifieru', async () => {
  must(!containsRaw(pack.teacherHtml, TEACH) && !containsRaw(pack.teacherHtml, REC), 'raw credential ve Verifieru'); return 'OK';
});
let submissionTxt = '', aliceStorage = null;
{
  const x = genDom(pack.studentHtml); await sleep(200);
  const S = k => x.eval(k);
  x.document.getElementById('studentName').value = 'Alice';
  x.document.getElementById('jokerNo').click(); await x.startTest(); await sleep(50);
  const seal = () => JSON.parse(x.localStorage.getItem(S("storageKey('activeAttempt')")));
  const s0 = seal();
  await T('secure: test běží a pečeť existuje', async () => { must(s0 && s0.attemptId, 'bez pečeti'); return s0.attemptId; });
  x.eval("setResp('0_0',0)");
  const lockShown = () => !x.document.getElementById('lockScreen').classList.contains('hidden');
  const unlock = async v => { x.document.getElementById('unlockInp').value = v; await x.tryUnlock(); };
  x.eval("lockTest('adv-lock-1')"); await sleep(20);
  await T('C secure: Recovery neotevře teacher panel', async () => {
    x.document.getElementById('teacherName').value = TEACHER_NAME; x.document.getElementById('teacherPin').value = REC;
    await x.teacherLogin(); must(x.document.getElementById('teacherPanel').classList.contains('hidden'), 'Recovery otevřel panel'); return 'skrytý';
  });
  await T('F secure: Teacher/Admin otevře teacher panel', async () => {
    x.document.getElementById('teacherPin').value = TEACH; await x.teacherLogin();
    must(!x.document.getElementById('teacherPanel').classList.contains('hidden'), 'login selhal'); x.teacherLogout(); return 'OK';
  });
  await T('H secure: Teacher/Admin neodemkne zámek', async () => { await unlock(TEACH); must(S('LOCKED') === true, 'Teacher odemkl'); return 'LOCKED=true'; });
  await T('B secure: špatný Recovery neodemkne', async () => { await unlock('REC-WRNG-0000'); must(S('LOCKED') === true, 'odemčeno'); return 'LOCKED=true + bad-unlock'; });
  await T('A secure: správný Recovery odemkne', async () => { await unlock(REC); must(S('LOCKED') === false && !lockShown(), 'neodemčeno'); return 'LOCKED=false'; });
  await T('I–N secure: odemčení nevytvoří nový pokus', async () => {
    const s1 = seal(); const keys = ['attemptId', 'startedAt', 'timerDeadline', 'identityHash', 'activeKey', 'jokerUsed', 'jokerSelectedAt'];
    const diff = keys.filter(k => JSON.stringify(s0[k]) !== JSON.stringify(s1[k]));
    must(!diff.length, 'změněno: ' + diff.join(',')); must(S("RESP['0_0']") === 0, 'odpověď ztracena');
    const types = s1.securityEvents.map(e => e.type); must(types.includes('attempt-start') && types.includes('locked') || types.includes('lock'), 'chybí předchozí události');
    const ru = s1.securityEvents.find(e => e.type === 'recovery-unlock'); must(ru && ru.lockReason, 'recovery-unlock bez lockReason');
    return `${keys.length} polí beze změny; lockReason="${ru.lockReason}"`;
  });
  await T('AB secure: dvojité odeslání / unlock bez zámku', async () => {
    const n = () => S("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length");
    const before = n(); await unlock(REC); const after = n();
    must(after === before, `recovery-unlock zaznamenán bez zámku (${before}→${after})`); return 'beze změny';
  });
  x.eval("lockTest('adv-lock-2')"); await sleep(20);
  await T('AB secure: souběžné dvojité odemčení jednoho zámku', async () => {
    const before = S("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length");
    x.document.getElementById('unlockInp').value = REC; await Promise.all([x.tryUnlock(), x.tryUnlock()]);
    const after = S("SEC_EVENTS.filter(e=>e.type==='recovery-unlock').length");
    must(after - before === 1, `jeden zámek → ${after - before} recovery-unlock záznamů`); return '1 záznam';
  });
  aliceStorage = dumpStorage(x);
  // reload uprostřed zamčeného stavu
  x.eval("lockTest('adv-lock-3')"); await sleep(20);
  const lockedStorage = dumpStorage(x);
  await T('AA secure: reload po recovery unlocku nevytvoří nový pokus ani nový deadline', async () => {
    const y = genDom(pack.studentHtml, aliceStorage); await sleep(200);
    y.document.getElementById('studentName').value = 'Alice'; await y.startTest(); await sleep(50);
    const s = s0;
    must(y.eval('ATTEMPT_ID') === s.attemptId, 'nový attemptId'); must(Number(y.eval('TIMER_DEADLINE')) === s.timerDeadline, 'nový deadline');
    must(y.eval('LOCKED') === false, 'stav zámku nesedí'); return 'attemptId + deadline zachovány';
  });
  await T('AA secure: reload zamčeného pokusu zámek neobejde', async () => {
    const y = genDom(pack.studentHtml, lockedStorage); await sleep(200);
    y.document.getElementById('studentName').value = 'Alice'; await y.startTest(); await sleep(50);
    must(y.eval('LOCKED') === true && !y.document.getElementById('lockScreen').classList.contains('hidden'), 'reload odemkl'); return 'zůstává zamčeno';
  });
  await T('E secure: Recovery nezruší rozpracovaný pokus jiné identity; Teacher ano', async () => {
    const y = genDom(pack.studentHtml, aliceStorage); await sleep(200);
    y.document.getElementById('studentName').value = 'Bob'; y.document.getElementById('jokerNo').click(); await y.startTest(); await sleep(50);
    const box = () => y.document.querySelector('.s-modal-bd input[type=password]');
    must(box(), 'modal reset se neobjevil');
    box().value = REC; y.document.querySelector('.s-modal-bd .s-modal-btn.primary').click(); await sleep(900);
    const k = y.eval("storageKey('activeAttempt')");
    must(y.localStorage.getItem(k) !== null, 'Recovery zrušil cizí pokus');
    box().value = TEACH; y.document.querySelector('.s-modal-bd .s-modal-btn.primary').click(); await sleep(900);
    must(y.localStorage.getItem(k) === null, 'Teacher reset nefunguje'); return 'Recovery ne, Teacher ano';
  });
  // odevzdání pro Verifier + retry
  x.document.getElementById('unlockInp').value = REC; await x.tryUnlock();
  await x.submitSecureTest(); await sleep(300);
  submissionTxt = x.document.getElementById('answerBackup').value;
  await T('D/G secure: retry po odevzdání — Recovery ne, Teacher ano', async () => {
    must(S("submittedLocked()") === true, 'není submitted');
    x.document.getElementById('studentName').value = 'Alice'; await x.startTest(); await sleep(50);
    const inp = () => x.document.querySelector('[data-retry-code]');
    must(inp(), 'retry modal chybí');
    inp().value = REC; x.document.querySelector('[data-retry-ok]').click(); await sleep(900);
    must(S("submittedLocked()") === true, 'Recovery povolil retry');
    inp().value = TEACH; x.document.querySelector('[data-retry-ok]').click(); await sleep(900);
    must(S("submittedLocked()") === false, 'Teacher retry nefunguje'); return 'Recovery ne, Teacher ano';
  });
}

// ───────────── Verifier (vyžaduje opravený 13f) ─────────────
await T('Verifier: hlavní skript se naparsuje', async () => {
  const code = [...pack.teacherHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const c of code) acorn.parse(c, { ecmaVersion: 'latest' });
  return code.length + ' inline skript(ů) OK';
});
await T('AC/AD + export: Verifier zachová lock jako signál, recovery jako audit, CSV nese údaje', async () => {
  const v = genDom(pack.teacherHtml); await sleep(300);
  must(typeof v.bulkVerifyPasted === 'function', 'Verifier nemá funkce (skript nenaběhl)');
  v.document.getElementById('pasteBox').value = submissionTxt; await v.bulkVerifyPasted(); await sleep(300);
  const r = v.eval('RESULTS[0]'); must(r && r.status === 'OK', 'výsledek není OK: ' + (r && r.error));
  const sig = v.eval('securitySignalsFor(RESULTS[0],duplicateInfo())');
  const lock = sig.find(s => s.key === 'locked' || /uzamkl/.test(s.label)); const ru = sig.find(s => /recovery/.test(s.label));
  must(lock && lock.sev === 'hard', 'lock signál potlačen'); must(ru && ru.sev === 'info', 'recovery není audit/info');
  const issues = v.eval('securityIssueCount(RESULTS[0])'); const nonInfo = sig.filter(s => s.sev !== 'info').length;
  must(issues === nonInfo, 'recovery se započítává do problémů');
  let csv = ''; v.downloadText = (c) => { csv = c; }; v.downloadResultsCsv();
  must(/recovery/i.test(csv.split('\n')[0]), 'CSV hlavička bez recovery sloupce');
  return `lock=hard, recovery=info, issues=${issues}; CSV: ${csv.split('\n')[0].split(';').filter(h => /recovery|security|lock/i.test(h)).join(',')}`;
});

// ───────────── U/X/Y: persistence, export, prompt ─────────────
configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true, feedbackMode: 'none' });
await T('U: snapshot / stav pro uložení bez raw credentialů', async () => {
  w.saveSnapshot(); await sleep(600);
  const all = JSON.stringify(dumpStorage(w)) + JSON.stringify(w.getStoredState()) + JSON.stringify(w.getTemplateDomPrefill());
  must(!containsRaw(all, TEACH) && !containsRaw(all, REC), 'raw credential v localStorage/snapshot/šabloně'); return 'čisté';
});
await T('U: export zadání (JSON) bez raw credentialů', async () => {
  blobs.length = 0; await w.exportZadani(); await sleep(200);
  must(blobs.length, 'export nevytvořil soubor'); const txt = await blobs[blobs.length - 1].text();
  must(!containsRaw(txt, TEACH) && !containsRaw(txt, REC), 'raw credential v exportu'); return `${txt.length} B čistých`;
});
await T('U: historie (sanitizeStoredRecord) odstraní klíče i hodnoty', async () => {
  const dirty = { state: { nested: { TeacherAccessCode: TEACH, recovery_code: REC, unlockPassword: 'X' } }, prompt: `Učitelský / administrátorský kód: ${TEACH}\nRecovery kód pro odemknutí testu: ${REC}\nPoznámka ${TEACH}` };
  const out = JSON.stringify(w.sanitizeStoredRecord(w.JSON.parse(JSON.stringify(dirty))));
  must(!containsRaw(out, TEACH) && !containsRaw(out, REC), 'únik: ' + out.slice(0, 160)); return 'klíče i hodnoty pryč';
});
await T('W: import legacy záznamu s jedním „heslo" nevyrobí dva credentialy', async () => {
  setVal('ucitelPin', ''); setVal('recoveryCode', '');
  w.applyImportedZadani(w.JSON.parse(JSON.stringify({ state: { heslo: 'LEGACY-ONE-CODE', ucitelPin: 'LEGACY-ONE-CODE', unlockPassword:'LEGACY-ONE-CODE', jazyk: 'angličtina' }, dom: { heslo: 'LEGACY-ONE-CODE', ucitelPin: 'LEGACY-ONE-CODE', recoveryCode:'LEGACY-ONE-CODE' } })));
  await sleep(50);
  const t = w.document.getElementById('ucitelPin').value, r = w.document.getElementById('recoveryCode').value;
  must(!/LEGACY/i.test(t) && !/LEGACY/i.test(r), `ucitelPin="${t}", recoveryCode="${r}"`); return `po importu Teacher="${t}", Recovery="${r ? '(nový náhodný)' : ''}"`;
});
await T('X: AI prompt neobsahuje raw credentialy', async () => {
  configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true, feedbackMode: 'none' });
  const p = String(w.buildPrompt()) + String(w.buildContentPrompt(w.eval('state'), []));
  must(!containsRaw(p, TEACH) && !containsRaw(p, REC), 'raw credential v promptu'); return 'jen placeholdery';
});

// ───────────── Obejití politiky přes „Použít nové nastavení (bez AI)" ─────────────
await T('Q-bypass: applySettingsWithoutAi nesmí sestavit test s Teacher == Recovery', async () => {
  configure({ testMode: 'bezny', resultMode: 'instant', screenGuard: true, feedbackMode: 'brief' });
  w.validate(); await build(); w.eval('lastGenData=' + JSON.stringify(GEN) + ';generatedTestHtml="x";');
  setVal('ucitelPin', REC); setVal('recoveryCode', REC); w.validate();
  const nextDisabled = w.document.getElementById('next3').disabled;
  const drift = w.eval('settingsDrift()');
  await w.applySettingsWithoutAi(); await sleep(300);
  const cfg = w.eval('lastAssembled.cfg');
  const same = cfg.ucitelPinHash === await w.deriveSecretHash('teacher-pin', REC, cfg.testId) && cfg.recoveryCodeHash === await w.deriveSecretHash('recovery-code', REC, cfg.testId);
  let teacherViaRecovery = false;
  if (same) {
    const x = genDom(w.eval('generatedTestHtml')); await sleep(150);
    x.document.getElementById('studentName').value = 'S'; await x.startTest();
    x.openTeacherModal(); x.document.getElementById('t-name').value = TEACHER_NAME; x.document.getElementById('t-pin').value = REC; await x.doTeacherLogin();
    teacherViaRecovery = !x.document.getElementById('t-panel').classList.contains('hidden');
  }
  must(!same, `next3.disabled=${nextDisabled}, drift=${JSON.stringify(drift)}, přestavěno s Teacher==Recovery=${same}, Recovery otevřel teacher panel=${teacherViaRecovery}`);
  return 'odmítnuto';
});
await T('Q-bypass: slabý Teacher (6 znaků) přes applySettingsWithoutAi', async () => {
  setVal('ucitelPin', '123456'); setVal('recoveryCode', REC); w.validate();
  await w.applySettingsWithoutAi(); await sleep(300);
  const cfg = w.eval('lastAssembled.cfg');
  const weak = cfg.ucitelPinHash === await w.deriveSecretHash('teacher-pin', '123456', cfg.testId);
  must(!weak, 'test přestavěn se slabým 6místným Teacher/Admin kódem'); return 'odmítnuto';
});

fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/adversarial-harness.json', JSON.stringify(results, null, 2));
const c = s => results.filter(r => r.status === s).length;
console.log(`\nSOUHRN: ${c('PASS')} PASS, ${c('FAIL')} FAIL, ${c('ERROR')} ERROR (harness)`);
process.exit(c('FAIL')||c('ERROR')?1:0);
