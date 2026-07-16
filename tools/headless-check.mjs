// tools/headless-check.mjs — central access edition
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

const target = process.argv[2] || 'dist/index.html';
const protectedHtml = fs.readFileSync(target, 'utf8');
function executableHtml(html = protectedHtml){
  return html
    .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
    .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
    .replace('<body>', '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"HEADLESS",displayName:"Headless Admin",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"headless"}};<\/script>');
}
const html = executableHtml();
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://daniel22-dev.github.io/generator-testu/',
  pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = () => 'blob:fake';
    w.URL.revokeObjectURL = () => {};
    w.__errors = [];
    w.addEventListener('error', e => w.__errors.push(String(e.message || e.error)));
    w.fetch = async u => { throw new Error('network disabled in harness: ' + u); };
  }
});
const w = dom.window;
await new Promise(r => setTimeout(r, 1500));
let failed = 0;
const check = (name, fn) => { try { const v=fn(); console.log('PASS',name,v!==undefined?'→ '+String(v).slice(0,80):''); } catch(e){ failed++; console.log('FAIL',name,'—',e.message); } };
const checkAsync = async (name, fn) => { try { const v=await fn(); console.log('PASS',name,v!==undefined?'→ '+String(v).slice(0,80):''); } catch(e){ failed++; console.log('FAIL',name,'—',e&&e.message?e.message:String(e)); } };
console.log('=== headless-check:', target, '===');
check('veřejný build je fail-closed', () => {
  if (!/data-ghrab-access="checking"/.test(protectedHtml)) throw new Error('chybí checking stav');
  if (!/app-guard\.js/.test(protectedHtml) || !/protectApp\(APP_ID/.test(protectedHtml)) throw new Error('chybí centrální guard');
  const protectedCount=(protectedHtml.match(/application\/ghrab-protected/g)||[]).length;
  if(protectedCount<27) throw new Error('jen '+protectedCount+' chráněných modulů');
  return protectedCount+' inertních modulů';
});
check('aplikační runtime po povolení naběhne bez JS chyb', () => { if(w.__errors.length) throw new Error(w.__errors.join(' | ')); return w.eval('RELEASE.version'); });
check('centrální admin se promítl do Generátoru', () => {
  if(!w.accIsAdmin()) throw new Error('admin role nebyla převzata');
  if(w.currentCreator().id!=='HEADLESS') throw new Error('Creator ID není z permitu');
  if(!w.__ACCESS_INIT_REACHED__) throw new Error('init se nespustil');
  return w.currentCreator().name;
});
check('veřejný build neobsahuje starou PIN bránu', () => {
  if(/access-manifest\.json|ghr_access_profile_v1|id="accCodeInp"/.test(protectedHtml)) throw new Error('zůstal starý přístupový model');
  return 'jen AI Studio permit';
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
  const required = ['dist/manifest.webmanifest', 'dist/sw.js', 'dist/icons/icon-192.png', 'dist/icons/icon-512.png'];
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
let pass = 0, fail = 0, expectedWarn = 0, unexpectedWarn = 0;
for (const c of checks) {
  let r;
  try { r = await c.run(); } catch (e) { r = { status: 'fail', name: c.name, message: String(e && e.message || e) }; }
  if (r.status === 'pass') pass++;
  else if (r.status === 'warn') {
    const expected = r.name === 'Self-test bodování (spuštění)' && /Není vygenerovaný test/.test(String(r.message || ''));
    if (expected) expectedWarn++;
    else { unexpectedWarn++; console.log('TESTLAB WARN:', r.name, '—', r.message); }
  } else { fail++; console.log('TESTLAB FAIL:', r.name, '—', r.message); }
}
console.log(`Test Lab: ${pass} pass / ${unexpectedWarn} neočekávaných warn / ${fail} fail` + (expectedWarn ? ` (${expectedWarn} očekávaný skip: self-test bez vygenerovaného testu)` : ''));
if (fail > 0 || unexpectedWarn > 0) failed++;

check('žádné JS chyby po celém běhu', () => { if (w.__errors.length) throw new Error(w.__errors.slice(0, 5).join(' | ')); });

console.log(failed ? `\n❌ ${failed} kontrol selhalo` : '\n✅ Vše prošlo');
process.exit(failed ? 1 : 0);
