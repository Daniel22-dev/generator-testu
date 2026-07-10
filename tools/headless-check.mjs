// tools/headless-check.mjs
// Headless verifikace Generátoru testů (jsdom). Používá se jako "definition of done"
// v každém vlákně modularizace: soubor musí projít 100% stejně před úpravou i po ní.
//
// Instalace:  npm i -D jsdom
// Spuštění:   node tools/headless-check.mjs [cesta/k/index.html]
//             (výchozí: dist/index.html — spusť nejdřív `node scripts/build.mjs`)
// Exit code:  0 = vše OK, 1 = jakýkoli FAIL nebo JS chyba

import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

const target = process.argv[2] || 'dist/index.html';
const html = fs.readFileSync(target, 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://daniel22-dev.github.io/generator-testu/',
  pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches: false, media: q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = () => 'blob:fake';
    w.URL.revokeObjectURL = () => {};
    w.__errors = [];
    w.addEventListener('error', e => w.__errors.push(String(e.message || e.error)));
    w.fetch = async (u) => { throw new Error('network disabled in harness: ' + u); };
  }
});

const w = dom.window;
await new Promise(r => setTimeout(r, 1500));

let failed = 0;
const check = (name, fn) => {
  try { const v = fn(); console.log('PASS', name, v !== undefined ? '→ ' + String(v).slice(0, 80) : ''); }
  catch (e) { failed++; console.log('FAIL', name, '—', e.message); }
};
const checkAsync = async (name, fn) => {
  try { const v = await fn(); console.log('PASS', name, v !== undefined ? '→ ' + String(v).slice(0, 80) : ''); }
  catch (e) { failed++; console.log('FAIL', name, '—', e && e.message ? e.message : String(e)); }
};

console.log('=== headless-check:', target, '===');
check('boot bez JS chyb', () => { if (w.__errors.length) throw new Error(w.__errors.join(' | ')); });
check('RELEASE definován', () => w.eval('RELEASE.version + " · " + RELEASE.date'));
check('čerstvé zařízení je fail-closed a zobrazuje aktivační bránu', () => {
  const gate = w.document.getElementById('accessGate');
  const input = w.document.getElementById('accCodeInp');
  if (!w.document.body.classList.contains('acc-locked')) throw new Error('body není zamčené');
  if (!gate || !input) throw new Error('aktivační brána nebo pole chybí');
  return 'access code gate';
});
check('session odemčení je svázané s aktuální verzí', () => {
  w.eval("Access.profile={userId:'ADMIN',role:'admin',displayName:'Admin'}; accSetSessionUnlock();");
  const token = w.sessionStorage.getItem('ghr_access_session_unlocked_v2');
  if (token !== 'ADMIN|' + w.eval('RELEASE.version')) throw new Error('neočekávaný token: ' + token);
  w.eval('accClearSessionUnlock(); Access.profile=null;');
  return token;
});

const seededAccessProfile = {
  userId: 'ADMIN',
  displayName: 'Správce aplikace',
  role: 'admin',
  pinHash: 'pbkdf2-v1$headless-pin-hash',
  pinSalt: 'headless-pin-salt',
  activationCodeHashRef: 'pbkdf2-v1$yeYMLdvhsnuoXQ2Rpj2i_qmyUfQc7PQV652ssgeLV7E',
  acceptedPolicyVersion: 1,
  activatedAt: '2026-07-10T00:00:00.000Z'
};
async function accessScenario(url, withSession = true){
  const d = new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    pretendToBeVisual: true,
    beforeParse(x) {
      if (!x.crypto || !x.crypto.subtle) Object.defineProperty(x, 'crypto', { value: webcrypto });
      x.matchMedia = x.matchMedia || (q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
      x.scrollTo = () => {};
      x.HTMLElement.prototype.scrollIntoView = () => {};
      if (x.HTMLAnchorElement) x.HTMLAnchorElement.prototype.click = () => {};
      x.URL.createObjectURL = () => 'blob:access-test';
      x.URL.revokeObjectURL = () => {};
      x.fetch = async u => { throw new Error('network disabled in access scenario: ' + u); };
      x.localStorage.setItem('ghr_access_profile_v1', JSON.stringify(seededAccessProfile));
      if (withSession) x.sessionStorage.setItem('ghr_access_session_unlocked_v2', 'ADMIN|7.0.2');
    }
  });
  await new Promise(r => setTimeout(r, 500));
  return d;
}
await checkAsync('stejná verze může obnovit již odemčenou relaci', async () => {
  const d = await accessScenario('https://daniel22-dev.github.io/generator-testu/');
  try {
    if (d.window.document.body.classList.contains('acc-locked')) throw new Error('relace zůstala zamčená');
    if (d.window.document.getElementById('accessGate')) throw new Error('brána nebyla odstraněna');
    return 'session restored';
  } finally { d.window.close(); }
});
await checkAsync('?lock=1 vždy vynutí místní PIN', async () => {
  const d = await accessScenario('https://daniel22-dev.github.io/generator-testu/?lock=1');
  try {
    if (!d.window.document.body.classList.contains('acc-locked')) throw new Error('stránka není zamčená');
    if (!d.window.document.getElementById('accPinInp')) throw new Error('PIN pole chybí');
    if (d.window.sessionStorage.getItem('ghr_access_session_unlocked_v2')) throw new Error('session token nebyl smazán');
    return 'PIN gate';
  } finally { d.window.close(); }
});
await checkAsync('?reset-access=1 smaže profil a vyžádá aktivaci', async () => {
  const d = await accessScenario('https://daniel22-dev.github.io/generator-testu/?reset-access=1');
  try {
    if (!d.window.document.getElementById('accCodeInp')) throw new Error('aktivační pole chybí');
    if (d.window.localStorage.getItem('ghr_access_profile_v1')) throw new Error('profil nebyl smazán');
    return 'activation gate';
  } finally { d.window.close(); }
});
check('changelog max 10 záznamů', () => { const n = w.eval('RELEASE.changes.length'); if (n > 10) throw new Error(n + ' záznamů'); return n; });
check('buildPrompt() > 500 znaků', () => { const n = w.buildPrompt().length; if (n < 500) throw new Error('jen ' + n); return n; });
check('exportZadani() bez výjimky', () => w.exportZadani());
check('privacy regression: skutečná jména se nikdy nedostanou do promptu', () => {
  const original = w.eval('JSON.stringify({diferencovany:state.diferencovany,anonymizace:state.anonymizace,skupiny:state.skupiny})');
  try {
    w.eval("state.diferencovany='ANO'; state.anonymizace='NE'; state.skupiny=[{id:9382,nazev:'Podpora',podminky:'Stejny cil, vice opory.',studenti:['PRIVATE_JAN_9382','PRIVATE_EVA_9382']}];");
    const prompt = w.buildPrompt();
    if (/PRIVATE_(JAN|EVA)_9382/.test(prompt)) throw new Error('prompt obsahuje skutecne jmeno');
    if (!/Student A1/.test(prompt) || !/Student A2/.test(prompt)) throw new Error('chybi anonymni kody');
    return 'Student A1/A2 bez jmen';
  } finally {
    w.eval(`Object.assign(state, JSON.parse(${JSON.stringify(original)}))`);
  }
});
await checkAsync('privacy regression: roster ve výstupním HTML obsahuje jen solené hashe', async () => {
  const salt = '0123456789abcdef0123456789abcdef';
  const groups = await w.buildPublicDiffGroups([{key:'g1',name:'Podpora',conditions:'Více opory',students:['PRIVATE_JAN_9382','PRIVATE_EVA_9382'],a11y:null}], salt);
  const serialized = JSON.stringify(groups);
  if (/PRIVATE_(JAN|EVA)_9382/.test(serialized)) throw new Error('veřejná konfigurace obsahuje čitelné jméno');
  if (!Array.isArray(groups[0].studentHashes) || groups[0].studentHashes.length !== 2) throw new Error('chybí dva hashe');
  if (groups[0].studentHashes.some(x => !/^[A-Za-z0-9_-]{43}$/.test(x))) throw new Error('neočekávaný formát SHA-256 base64url');
  return '2 salted SHA-256 hashe';
});
check('setAppMode advanced/simple', () => { w.setAppMode('advanced'); w.setAppMode('simple'); });
check('validate + applyVisualState', () => { w.validate(); w.applyVisualState(); });
check('přepnutí jazyka čeština↔angličtina', () => { w.pickJazyk('čeština'); w.pickJazyk('angličtina'); });
check('appModeSummary element existuje a má text', () => {
  const el = w.document.getElementById('appModeSummary');
  if (!el || !el.textContent.trim()) throw new Error('chybí nebo prázdný');
});

check('PWA soubory existují v dist', () => {
  const required = ['dist/manifest.webmanifest', 'dist/sw.js', 'dist/icons/icon-192.png', 'dist/icons/icon-512.png', 'dist/access-manifest.json'];
  const missing = required.filter(f => !fs.existsSync(f));
  if (missing.length) throw new Error('chybí: ' + missing.join(', '));
  return required.length + ' souborů';
});
check('safeJsonForScript neutralizuje </script>', () => {
  const out = w.safeJsonForScript({ bad: '</script><img src=x onerror=1>' });
  if (out.toLowerCase().includes('</script')) throw new Error('obsahuje literal </script>');
  if (!out.includes('\\u003C')) throw new Error('neočekávaný escape formát');
  return 'OK';
});
await checkAsync('Gemini request contract: stabilní model, API key header a validní JSON', async () => {
  const oldFetch = w.fetch;
  let seen = null;
  try {
    w.sessionStorage.setItem('sestavovac_gemini_data_notice_v1', 'accepted');
    w.eval("geminiApiKey='AIza_HEADLESS_FAKE_KEY'; geminiModel=GEMINI_MODEL_DEFAULT;");
    w.fetch = async (url, options) => {
      seen = {url:String(url), options};
      return {ok:true,status:200,headers:{get(){return null;}},json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'{\"ok\":true}'}]}}]})};
    };
    const result = await w.callGeminiJSON('Return JSON only.', [], {noRetry:true,noFallback:true});
    if (!result || result.ok !== true) throw new Error('odpověď se neparsovala');
    if (!seen || !seen.url.includes('/models/gemini-3.5-flash:generateContent')) throw new Error('neočekávaný model/URL');
    if (seen.options?.headers?.['x-goog-api-key'] !== 'AIza_HEADLESS_FAKE_KEY') throw new Error('API klíč není v x-goog-api-key');
    const body = JSON.parse(seen.options.body);
    if (!Array.isArray(body.contents) || !body.contents.length) throw new Error('chybí contents');
    return 'gemini-3.5-flash + x-goog-api-key';
  } finally {
    w.fetch = oldFetch;
    w.eval("geminiApiKey='';");
  }
});
await checkAsync('secureOffline: student + teacher verifier se sestaví', async () => {
  const labels = w.getLabels('cs');
  const rosterSalt = 'fedcba9876543210fedcba9876543210';
  w.eval("rosterEntries=[{email:'student@example.invalid',label:'student',code:'ABC234'}];");
  const identityCodeHashes = await w.buildPublicIdentityCodeHashes({identityMode:'oneTimeCode'}, rosterSalt);
  const cfg = {
    generatorVersion: 'headless', buildHash: 'testhash1', releaseDate: '2026-07-09', releaseStatus: 'test', generatedAt: '2026-07-09T00:00:00Z',
    creatorId: 'TEST', creatorName: 'Test', creatorRole: 'admin', appMode: 'headless', testId: 'HEADLESS-1', manifestHash: 'manifest-hash',
    nazev: 'Headless test', proKoho: '1.A', jazyk: 'angličtina', uiLang: 'cs', cefr: 'B1', cefrLevels: ['B1'], cefrCombined: false,
    cas: 15, tema: 'default', testMode: 'prisny', layout: 'classic', odevzdavani: 'B', resultMode: 'secureOffline',
    fuzzyTolerance: 'off', randomizace: false, zolicek: false, ucitelJmeno: 'Teacher',
    ucitelPinHash: await w.deriveSecretHash('teacher-pin', '123456', 'HEADLESS-1'),
    hesloHash: await w.deriveSecretHash('unlock-password', 'LOCK-TEST', 'HEADLESS-1'),
    hasUnlock: true, diffRosterSalt: rosterSalt, diffRosterScheme: 'sha256-v1',
    diffGroups: await w.buildPublicDiffGroups([{key:'g1',name:'Podpora',conditions:'Více opory',students:['ABC234'],a11y:null}], rosterSalt),
    labels, isCzech: false, csScoringPolicy: {}, identityMode: 'oneTimeCode', identityCodeScheme: 'sha256-v1', identityCodeHashes
  };
  const variants = {
    __default: [{ title: 'MC', type: 'multiple choice', points_total: 1, points_each: 1, items: [{ question: 'Choose A.', options: ['A', 'B'], correct: 0 }] }],
    g1: [{ title: 'MC', type: 'multiple choice', points_total: 1, points_each: 1, items: [{ question: 'Choose B.', options: ['A', 'B'], correct: 1 }] }]
  };
  const pkg = await w.assembleSecureOfflinePackage({}, cfg, variants);
  if (!pkg || pkg.mode !== 'secureOffline') throw new Error('nevznikl secureOffline balík');
  if (!pkg.studentHtml || !pkg.teacherHtml) throw new Error('chybí student/teacher HTML');
  if (!/STUDENT_VARIANTS/.test(pkg.studentHtml)) throw new Error('studentský HTML neobsahuje varianty');
  if (/correct\s*:\s*0/.test(pkg.studentHtml)) throw new Error('studentský HTML pravděpodobně obsahuje answer key');
  if (/ABC234|student@example\.invalid/.test(pkg.studentHtml)) throw new Error('studentský HTML obsahuje čitelný kód/e-mail z rosteru');
  if (!/studentHashes/.test(pkg.studentHtml)) throw new Error('studentský HTML neobsahuje hashovaný roster');
  if (!/^([a-f0-9]{64})$/i.test(pkg.studentHtmlSha256 || '') || !/^([a-f0-9]{64})$/i.test(pkg.teacherHtmlSha256 || '')) throw new Error('hash nemá očekávaný SHA-256 hex formát');
  const studentDom = new JSDOM(pkg.studentHtml, {
    runScripts: 'dangerously',
    url: 'https://school.example/test/student_test.html',
    pretendToBeVisual: true,
    beforeParse(sw) {
      if (!sw.crypto || !sw.crypto.subtle) Object.defineProperty(sw, 'crypto', { value: webcrypto });
      sw.matchMedia = sw.matchMedia || (q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
      sw.scrollTo = () => {};
      sw.HTMLElement.prototype.scrollIntoView = () => {};
      if (sw.HTMLAnchorElement) sw.HTMLAnchorElement.prototype.click = () => {};
      sw.URL.createObjectURL = () => 'blob:student-test';
      sw.URL.revokeObjectURL = () => {};
    }
  });
  await new Promise(r => setTimeout(r, 80));
  try {
    if (await studentDom.window.identityAllowed('ABC234') !== true) throw new Error('platný jednorázový kód nebyl přijat');
    if (await studentDom.window.identityAllowed('UNKNOWN1') !== false) throw new Error('neplatný jednorázový kód nebyl odmítnut');
    const validKey = await studentDom.window.chooseVariant('ABC234');
    const invalidKey = await studentDom.window.chooseVariant('UNKNOWN1');
    if (validKey !== 'g1') throw new Error('platný roster kód nevybral variantu g1');
    if (invalidKey !== '') throw new Error('neplatný roster kód nebyl odmítnut');
  } finally {
    studentDom.window.close();
  }
  return `${Math.round(pkg.studentHtml.length/1024)} kB student / ${Math.round(pkg.teacherHtml.length/1024)} kB verifier + runtime oneTimeCode roster OK`;
});

// všech 7 jednoduchých šablon
for (const [lang, ids] of [['angličtina', ['fl_practice','fl_homework','fl_graded_quick','fl_strict']], ['čeština', ['cs_practice','cs_text','cs_strict']]]) {
  w.eval(`pickJazyk('${lang}')`);
  for (const id of ids) check('šablona ' + id, () => { w.eval(`chooseSimpleTemplate('${id}')`); return w.eval('state.testMode+"/"+state.resultMode+"/"+state.feedbackMode'); });
}

// Test Lab jako admin
w.eval("Access.profile={role:'admin',userId:'BALAZ',displayName:'Admin',status:'active'};Access.granted=true;");
const checks = w.tlChecks();
let pass = 0, fail = 0, warn = 0;
for (const c of checks) {
  let r;
  try { r = await c.run(); } catch (e) { r = { status: 'fail', name: c.name, message: String(e && e.message || e) }; }
  if (r.status === 'pass') pass++;
  else if (r.status === 'warn') warn++;
  else { fail++; console.log('TESTLAB FAIL:', r.name, '—', r.message); }
}
console.log(`Test Lab: ${pass} pass / ${warn} warn / ${fail} fail`);
if (fail > 0) failed++;

check('žádné JS chyby po celém běhu', () => { if (w.__errors.length) throw new Error(w.__errors.slice(0, 5).join(' | ')); });

console.log(failed ? `\n❌ ${failed} kontrol selhalo` : '\n✅ Vše prošlo');
process.exit(failed ? 1 : 0);
