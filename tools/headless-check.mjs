// tools/headless-check.mjs — central access edition
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';
import * as acorn from 'acorn';

const target = process.argv[2] || 'dist/index.html';
const protectedHtml = fs.readFileSync(target, 'utf8');
function executableHtml(html = protectedHtml){
  return html
    .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
    .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
    .replace('<body>', '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"HEADLESS",displayName:"Headless Admin",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"headless"}};window.__GHRAB_DEPLOYMENT_CONFIG__={profile:"github-pages",authMode:"signed-permit",aiTransport:"direct-gemini",telemetryMode:"local",apiBaseUrl:"",endpoints:{aiGenerate:"ai/generate",aiHealth:"ai/health"},features:{allowLocalProviderKeys:true,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false}};<\/script>');
}
const html = executableHtml();
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://daniel22-dev.github.io/generator-testu/',
  pretendToBeVisual: true,
  beforeParse(w) {
    w.acorn = acorn;
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
check('importované a lokálně uložené stavy jsou omezené schématem', () => {
  const original = w.eval('JSON.stringify(state)');
  try {
    w.eval("replaceStateFromUntrusted({jazyk:'angličtina',neznamyKlic:'nesmí projít'})");
    if (w.eval("Object.hasOwn(state,'neznamyKlic')")) throw new Error('neznámý klíč prošel do stavu');
    if (w.eval('Object.getPrototypeOf(state) !== Object.prototype')) throw new Error('stav nemá čistý prototyp');
    let rejected = false;
    try { w.eval("replaceStateFromUntrusted(JSON.parse('{\"__proto__\":{\"polluted\":true}}'))"); } catch { rejected = true; }
    if (!rejected) throw new Error('zakázaný prototypový klíč nebyl odmítnut');
    if (w.eval('({}).polluted === true')) throw new Error('došlo ke znečištění prototypu');
    return 'allowlist + limity + zákaz prototypových klíčů';
  } finally {
    w.eval(`replaceStateFromUntrusted(JSON.parse(${JSON.stringify(original)}))`);
  }
});
check('AI runtime mapuje veřejný a školní profil bez automatického fallbacku', () => {
  const publicConfig = w.__GHRAB_DEPLOYMENT_CONFIG__;
  try {
    const direct = w.genCreateAiRuntimeConfig({models:{balanced:'gemini-balanced',economy:'gemini-economy',quality:'gemini-quality'}});
    if (direct.ai.defaultMode !== 'direct-gemini' || direct.ai.allowedModes.join(',') !== 'direct-gemini' || direct.ai.automaticFallback !== false) throw new Error('veřejný profil není direct-only');
    w.__GHRAB_DEPLOYMENT_CONFIG__ = {profile:'school-server',authMode:'server-session',aiTransport:'school-gateway',apiBaseUrl:'https://daniel22-dev.github.io/api/v1/',endpoints:{aiGenerate:'ai/generate',aiHealth:'ai/health'},features:{allowLocalProviderKeys:false,serverSessionReady:true,schoolGatewayReady:true,schoolServerConnected:true}};
    const school = w.genCreateAiRuntimeConfig();
    if (school.ai.defaultMode !== 'school-gateway' || school.ai.allowedModes.join(',') !== 'school-gateway' || school.ai.automaticFallback !== false) throw new Error('školní profil není gateway-only');
    if (new URL(school.ai.gatewayUrl).origin !== w.location.origin) throw new Error('gateway není same-origin');
    w.__GHRAB_DEPLOYMENT_CONFIG__ = {...publicConfig,authMode:'server-session'};
    let rejected = false;
    try { w.genCreateAiRuntimeConfig(); } catch (error) { rejected = error?.code === 'CONFIGURATION_ERROR'; }
    if (!rejected) throw new Error('hybridní konfigurace nebyla odmítnuta');
    return 'direct-only / gateway-only / hybrid fail-closed';
  } finally {
    w.__GHRAB_DEPLOYMENT_CONFIG__ = publicConfig;
  }
});
check('školní profil odstraní lokální provider klíče', () => {
  const publicConfig = w.__GHRAB_DEPLOYMENT_CONFIG__;
  try {
    w.localStorage.setItem('sestavovac_gemini_key','LOCAL_SECRET');
    w.sessionStorage.setItem('sestavovac_gemini_key_session','SESSION_SECRET');
    w.__GHRAB_DEPLOYMENT_CONFIG__ = {profile:'school-server',authMode:'server-session',aiTransport:'school-gateway',apiBaseUrl:'https://daniel22-dev.github.io/api/v1/',features:{allowLocalProviderKeys:false,serverSessionReady:false,schoolGatewayReady:false,schoolServerConnected:false}};
    w.genApplyServerKeyPolicy();
    if (w.localStorage.getItem('sestavovac_gemini_key') || w.sessionStorage.getItem('sestavovac_gemini_key_session')) throw new Error('provider klíč zůstal v úložišti');
    return 'localStorage + sessionStorage vyčištěny';
  } finally {
    w.__GHRAB_DEPLOYMENT_CONFIG__ = publicConfig;
  }
});
await checkAsync('Gemini request contract: stabilní model, API key header a validní JSON', async () => {
  const oldFetch = w.fetch;
  let seen = null;
  try {
    w.sessionStorage.setItem('sestavovac_gemini_data_notice_v1', 'accepted');
    w.eval("geminiApiKey='FAKE_GEMINI_KEY_12345678901234567890';");
    w.fetch = async (url, options) => {
      seen = {url:String(url), options};
      return {ok:true,status:200,headers:{get(){return null;}},json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'{\"ok\":true}'}]}}]})};
    };
    const result = await w.callGeminiJSON('Return JSON only.', [], {noRetry:true,noFallback:true,__legacyTest:true});
    if (!result || result.ok !== true) throw new Error('odpověď se neparsovala');
    if (!seen || !seen.url.includes('/models/gemini-3.6-flash:generateContent')) throw new Error('neočekávaný model/URL');
    if (seen.options?.headers?.['x-goog-api-key'] !== 'FAKE_GEMINI_KEY_12345678901234567890') throw new Error('API klíč není v x-goog-api-key');
    const body = JSON.parse(seen.options.body);
    if (!Array.isArray(body.contents) || !body.contents.length) throw new Error('chybí contents');
    return 'gemini-3.6-flash + x-goog-api-key';
  } finally {
    w.fetch = oldFetch;
    w.eval("geminiApiKey='';");
  }
});
let stage3Fixture = null;
await checkAsync('secureOffline: student + teacher verifier se sestaví', async () => {
  const labels = w.getLabels('cs');
  const rosterSalt = 'fedcba9876543210fedcba9876543210';
  w.eval("rosterEntries=[{email:'student@example.com',label:'student',code:'ABC234'}];");
  const identityCodeHashes = await w.buildPublicIdentityCodeHashes({identityMode:'oneTimeCode'}, rosterSalt);
  const cfg = {
    generatorVersion: 'headless', buildHash: 'testhash1', releaseDate: '2026-07-09', releaseStatus: 'test', generatedAt: '2026-07-09T00:00:00Z',
    creatorId: 'TEST', creatorName: 'Test', creatorRole: 'admin', appMode: 'headless', testId: 'HEADLESS-1', manifestHash: 'manifest-hash',
    nazev: 'Headless test', proKoho: '1.A', jazyk: 'angličtina', uiLang: 'cs', cefr: 'B1', cefrLevels: ['B1'], cefrCombined: false,
    cas: 15, tema: 'default', testMode: 'prisny', layout: 'classic', odevzdavani: 'B', resultMode: 'secureOffline', formsSubmissionUrl: 'https://docs.google.com/forms/d/e/TESTFORM/viewform',
    fuzzyTolerance: 'off', randomizace: false, zolicek: false, ucitelJmeno: 'Teacher',
    ucitelPinHash: await w.deriveSecretHash('teacher-pin', 'TEACH-ABCDEF-123456', 'HEADLESS-1'),
    hesloHash: await w.deriveSecretHash('unlock-password', 'TEACH-ABCDEF-123456', 'HEADLESS-1'),
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
    const payload = {v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:pkg.studentHtmlSha256,attemptId:'ATT-STAGE3-001',student:'ABC234',identityMode:'oneTimeCode',code:'ABC234',groupKey:'g1',startedAt:'2026-09-15T17:00:00Z',submittedAt:'2026-09-15T17:05:00Z',jokerUsed:false,jokerSelectedAt:'',resp:{'0_0':1},answerChangeStats:{},totalAnswerChanges:0,securityEvents:[],userAgent:'headless-stage3'};
    const packed = await studentDom.window.encryptPayloadForTeacher(payload);
    const answerTxt = 'SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:pkg.studentHtmlSha256,payload:packed},null,2);
    let copied='';
    Object.defineProperty(studentDom.window.navigator,'clipboard',{configurable:true,value:{writeText:async value=>{copied=String(value||'');}}});
    let opened='';
    studentDom.window.open=(url)=>{opened=String(url||'');return {opener:null};};
    studentDom.window.eval('ANSWER_TXT='+JSON.stringify(answerTxt));
    if(studentDom.window.formsSubmissionReady()!==true) throw new Error('Stage 4 Forms cesta není připravená pro platný payload');
    if(studentDom.window.refreshSubmissionOptions()!==true) throw new Error('Stage 4 Forms UI se neaktivovalo');
    const formsBox=studentDom.window.document.getElementById('formsSubmissionBox');
    const fallback=studentDom.window.document.getElementById('answersFallback');
    if(!formsBox||formsBox.classList.contains('hidden')) throw new Error('Stage 4 Forms panel není viditelný');
    if(!fallback||fallback.open) throw new Error('Stage 4 nouzová answers.txt záloha je při běžném Forms workflow otevřená');
    await studentDom.window.copySubmissionPayload();
    if(copied!==answerTxt) throw new Error('Stage 4 nekopíruje přesný SECURE-ANSWERS-V1 payload');
    studentDom.window.openSubmissionForm();
    if(opened!=='https://docs.google.com/forms/d/e/TESTFORM/viewform') throw new Error('Stage 4 neotevřel očekávaný responder URL');
    studentDom.window.eval("CFG.formsSubmissionUrl='https://forms.gle/TestShortLink'");
    if(!/^https:\/\/forms\.gle\//.test(studentDom.window.safeFormsSubmissionUrl())) throw new Error('Stage 4 odmítl platný forms.gle responder URL');
    studentDom.window.eval("CFG.formsSubmissionUrl='https://evil.example/forms/d/e/TESTFORM/viewform'");
    if(studentDom.window.safeFormsSubmissionUrl()!=='') throw new Error('Stage 4 propustil nepovolenou doménu');
    studentDom.window.eval("CFG.formsSubmissionUrl='https://docs.google.com/forms/d/e/TESTFORM/viewform';ANSWER_TXT='X'.repeat(24001)");
    if(studentDom.window.refreshSubmissionOptions()!==false) throw new Error('Stage 4 neaktivoval fallback nad limitem');
    if(!fallback.open) throw new Error('Stage 4 nad limitem neotevřel answers.txt fallback');
    const warning=studentDom.window.document.getElementById('formsPayloadWarning');
    if(!warning||warning.classList.contains('hidden')) throw new Error('Stage 4 nad limitem nezobrazil varování');
    stage3Fixture={teacherHtml:pkg.teacherHtml,studentHtml:pkg.studentHtml,answerTxt};
  } finally {
    studentDom.window.close();
  }
  const legacyCfg={...cfg,testId:'HEADLESS-LEGACY-NOFORMS',formsSubmissionUrl:''};
  const legacyPkg=await w.assembleSecureOfflinePackage({},legacyCfg,variants);
  if(/id=\"formsSubmissionBox\"/.test(legacyPkg.studentHtml)) throw new Error('Stage 4 Forms UI pronikl do legacy testu bez konfigurace');
  if(!/Odevzdat a vytvořit answers\.txt/.test(legacyPkg.studentHtml)) throw new Error('Stage 4 změnil legacy answers.txt primární workflow');
  return `${Math.round(pkg.studentHtml.length/1024)} kB student / ${Math.round(pkg.teacherHtml.length/1024)} kB verifier + roster + Stage 4 Forms/fallback OK`;
});
check('stage4 settings: Google Forms responder URL fail-closed validace', () => {
  const ok1=w.normalizeGoogleFormsResponderUrl('https://docs.google.com/forms/d/e/TESTFORM/viewform');
  const ok2=w.normalizeGoogleFormsResponderUrl('https://forms.gle/TestShortLink');
  if(!/^https:\/\/docs\.google\.com\/forms\//.test(ok1)||!/^https:\/\/forms\.gle\//.test(ok2)) throw new Error('platný responder URL odmítnut');
  for(const bad of ['http://docs.google.com/forms/d/e/TESTFORM/viewform','https://docs.google.com/forms/d/e/TESTFORM/edit','https://evil.example/forms/d/e/TESTFORM/viewform']){
    let rejected=false;try{w.normalizeGoogleFormsResponderUrl(bad);}catch(_){rejected=true;}if(!rejected)throw new Error('neplatný URL nebyl odmítnut: '+bad);
  }
  return 'docs.google.com/viewform + forms.gle accepted; http/edit/cizí doména rejected';
});
await checkAsync('stage3 verifier: Google Forms CSV importuje, dešifruje a hlásí chyby/duplicity', async () => {
  if(!stage3Fixture) throw new Error('chybí secure fixture');
  const teacherDom = new JSDOM(stage3Fixture.teacherHtml, {
    runScripts:'dangerously',
    url:'https://school.example/test/teacher_verifier.html',
    pretendToBeVisual:true,
    beforeParse(tw){
      if (!tw.crypto || !tw.crypto.subtle) Object.defineProperty(tw, 'crypto', { value: webcrypto });
      tw.matchMedia = tw.matchMedia || (q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
      tw.scrollTo=()=>{};
      tw.HTMLElement.prototype.scrollIntoView=()=>{};
      if(tw.HTMLAnchorElement)tw.HTMLAnchorElement.prototype.click=()=>{};
      tw.URL.createObjectURL=()=> 'blob:teacher-verifier';
      tw.URL.revokeObjectURL=()=>{};
    }
  });
  await new Promise(r=>setTimeout(r,80));
  try{
    const tw=teacherDom.window;
    if(!tw.document.getElementById('formsCsvFile')) throw new Error('chybí CSV import ovladač');
    const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
    const bad='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:'WRONG',manifestHash:'WRONG',payload:{mode:'encrypted',key:'x',iv:'x',data:'x'}});
    const csv=['Časové razítko,E-mailová adresa,Odevzdávací kód,Poznámka',
      [q('15. 9. 2026 19:20:00'),q('student-one'),q(stage3Fixture.answerTxt),q('valid')].join(','),
      [q('15. 9. 2026 19:21:00'),q('student-one'),q(stage3Fixture.answerTxt),q('duplicate')].join(','),
      [q('15. 9. 2026 19:22:00'),q('missing-one'),q(''),q('missing')].join(','),
      [q('15. 9. 2026 19:23:00'),q('bad-one'),q(bad),q('bad')].join(',')].join('\r\n');
    const parsed=tw.parseFormsCsvText(csv);
    if(parsed.delimiter!==','||parsed.identityIndex!==1||parsed.timestampIndex!==0||parsed.payloadIndex!==2) throw new Error('detekce Google Forms CSV');
    const summary=await tw.importFormsCsvText(csv,'forms-export.csv');
    const results=tw.eval('RESULTS');
    if(summary.rows!==4||summary.ok!==2||summary.missing!==1||summary.invalid!==1||summary.ambiguous!==0) throw new Error('špatný import summary '+JSON.stringify(summary));
    if(summary.duplicates.students!==1||summary.duplicates.attempts!==1) throw new Error('duplicity nebyly zachyceny');
    if(results.length!==4||results[0].status!=='OK'||results[0].earned!==1||results[0].formIdentity!=='student-one'||results[0].submissionSource!=='google-forms-csv') throw new Error('validní řádek se neověřil');
    if(results[2].status!=='CHYBA'||!/chybí celý odevzdávací blok/.test(results[2].error||'')) throw new Error('chybějící payload není explicitně označen');
    if(results[3].status!=='CHYBA') throw new Error('poškozený/cizí payload nebyl odmítnut');
    const semi='Timestamp;Email Address;Result\n'+[q('x'),q('student-two'),q(stage3Fixture.answerTxt)].join(';')+'\n';
    const p2=tw.parseFormsCsvText(semi);
    if(p2.delimiter!==';'||p2.identityIndex!==1||p2.payloadIndex!==2) throw new Error('středníkový CSV export');
    return '4 řádky: 2 OK / 1 chybí / 1 neplatný + duplicity + CSV ,/;';
  } finally { teacherDom.window.close(); }
});

// Etapa 1 — jednoduchý workflow musí být redukovaný na tři pedagogické účely.
w.eval("Object.assign(state,{appMode:'simple',workPreset:'quick',simpleTemplate:'',jazyk:'angličtina'});enforceModeConstraints();renderSimpleTemplates();");
check('stage1 simple: právě tři účely', () => {
  const cards=[...w.document.querySelectorAll('#simpleTemplateBtns [data-purpose]')];
  if(cards.length!==3) throw new Error('nalezeno '+cards.length);
  if(cards.map(x=>x.dataset.purpose).join(',')!=='practice,standard,strict') throw new Error('špatné účely');
  if(w.document.querySelector('#simpleTemplateBtns .clear-card')) throw new Error('v simple zůstala technická karta Bez šablony');
  return cards.map(x=>x.textContent.trim().replace(/\s+/g,' ')).join(' | ');
});
check('stage1 simple: účely nastavují deterministické profily', () => {
  w.chooseSimplePurpose('practice');
  let st=w.eval('state');
  if(st.testMode!=='procviceci'||st.resultMode!=='instant'||st.feedbackMode!=='learning') throw new Error('practice profil');
  w.chooseSimplePurpose('standard');
  st=w.eval('state');
  if(st.testMode!=='bezny'||st.resultMode!=='instant'||st.feedbackMode!=='brief'||st.screenGuard!==false) throw new Error('standard profil');
  w.chooseSimplePurpose('strict');
  st=w.eval('state');
  if(st.testMode!=='prisny'||st.resultMode!=='secureOffline'||st.feedbackMode!=='none'||st.odevzdavani!=='B') throw new Error('strict profil');
  return 'practice / standard / strict';
});
w.setAppMode('advanced');
w.renderSimpleTemplates();
check('stage5 advanced: pět skupin a přesné členství', () => {
  const expected={
    advancedGroupTest:['timeField','strictRiskField','submissionModeField','globalBodyField','gradeField'],
    advancedGroupStudent:['identityModeField','rosterField','diffLevelField','diffField','randomField'],
    advancedGroupFeedback:['feedbackModeField','fuzzyField'],
    advancedGroupSecurity:['resultModeField','screenGuardField','attemptProtectionInfo'],
    advancedGroupAppearance:['layoutField','themeField']
  };
  const root=w.document.getElementById('advancedSettingsGroups');
  if(!root||root.classList.contains('hidden')) throw new Error('advanced root není viditelný');
  for(const [groupId,ids] of Object.entries(expected)){
    const group=w.document.getElementById(groupId); if(!group) throw new Error('chybí '+groupId);
    for(const id of ids){ const el=w.document.getElementById(id); if(!el||el.parentElement!==group) throw new Error(id+' není v '+groupId); }
  }
  return Object.keys(expected).length+' skupin';
});
check('stage5 advanced: reorganizace nemění state', () => {
  const before=w.eval('JSON.stringify(state)');
  w.organizeAdvancedSettings();
  const after=w.eval('JSON.stringify(state)');
  if(before!==after) throw new Error('layout změnil aplikační state');
  return 'state byte-for-byte shodný';
});
await checkAsync('stage5 simple: původní kroky se obnoví', async () => {
  const originalConfirm = w.uiConfirm;
  try {
    // JSDOM nemá uživatele, který by klikl na vlastní potvrzovací modal.
    // Potvrzení proto v tomto explicitním QA scénáři deterministicky schválíme.
    w.uiConfirm = async () => true;
    await w.setAppMode('simple');
    if(w.document.getElementById('timeField').parentElement.id!=='step2') throw new Error('Délka testu se nevrátila do step2');
    if(w.document.getElementById('diffField').parentElement.id!=='step3') throw new Error('Diferenciace se nevrátila do step3');
    if(!w.document.getElementById('advancedSettingsGroups').classList.contains('hidden')) throw new Error('advanced skupiny zůstaly v Simple viditelné');
    await w.setAppMode('advanced');
    return 'restore → advanced OK';
  } finally {
    w.uiConfirm = originalConfirm;
  }
});
check('stage5 security: jeden pokus je pouze vysvětlení existujícího chování', () => {
  const el=w.document.getElementById('attemptProtectionInfo');
  const text=String(el?.textContent||'');
  if(!el||!/bezpečném offline režimu/i.test(text)||!/další pokus na tomto zařízení automaticky uzamčen/i.test(text)) throw new Error('chybí přesné vysvětlení secure-offline ochrany opakovaného pokusu');
  if(el.querySelector('input,select,textarea,button')) throw new Error('Etapa 5 přidala nový ovladač pokusu');
  return 'read-only secure-offline explanation';
});
check('stage1 advanced: stejné tři účely jako v simple', () => {
  const cards=[...w.document.querySelectorAll('#simpleTemplateBtns [data-purpose]')];
  if(cards.length!==3) throw new Error('advanced má mít stejné 3 účely, nalezeno '+cards.length);
  if(cards.map(x=>x.dataset.purpose).join(',')!=='practice,standard,strict') throw new Error('advanced účely se liší od simple');
  if(!w.document.getElementById('testModeField').classList.contains('hidden')) throw new Error('duplicitní Režim testu je stále viditelný');
  return cards.length;
});
check('stage1 advanced: účel předvyplní, ale technické volby nezamkne', () => {
  w.chooseSimplePurpose('standard');
  w.pick('feedbackMode','learning');
  const st=w.eval('state');
  if(st.simpleTemplate!=='fl_standard'||st.feedbackMode!=='learning') throw new Error('advanced profil není editovatelný');
  return 'fl_standard + ručně změněný feedback';
});

// Legacy ID zůstávají načitatelné kvůli starým snapshotům, ale nové UI je nenabízí.
for (const [lang, ids] of [['angličtina', ['fl_practice','fl_homework','fl_graded_quick','fl_strict']], ['čeština', ['cs_practice','cs_text','cs_strict']]]) {
  w.eval(`pickJazyk('${lang}')`);
  for (const id of ids) check('legacy profil ' + id, () => { w.eval(`chooseSimpleTemplate('${id}')`); return w.eval('state.testMode+"/"+state.resultMode+"/"+state.feedbackMode'); });
}

// Zdrojový materiál + Reading: CEFR musí být explicitní a podklad musí projít až do promptu.
check('reading source: bez zvolené CEFR není skrytý fallback B1', () => {
  w.eval("state.uroven=[]");
  if(w.compCefrForPrompt()!=='') throw new Error('Reading má stále skrytý CEFR fallback');
  w.eval("state.uroven=['B1']");
  if(w.compCefrForPrompt()!=='B1') throw new Error('B1 se nepropaguje do Readingu');
  return 'explicitní CEFR';
});
check('reading source: režim zdroje + poznámka + preanalýza jsou v hlavním promptu', () => {
  w.eval("Object.assign(state,{jazyk:'angličtina',uroven:['B1'],zadaniTab:'file',sourceUseMode:'vocabulary',typyCviceni:['reading comprehension'],pocet:1,body:5,exerciseDetail:false,readingSourceAnalysis:{target_vocabulary:['boarding pass','luggage'],content_points:['airport trip']}});fileObjects.length=0;fileObjects.push({displayName:'unit5.txt',textContent:'Unit 5: boarding pass, luggage, delayed flight.',embedStatus:'embedded'});");
  w.document.getElementById('zadaniFileNote').value='Use the vocabulary from Unit 5.';
  const prompt=w.buildContentPrompt(w.eval('state'),['unit5.txt']);
  for(const needle of ['SOURCE MATERIAL USE POLICY','Slovní zásoba','CEFR B1','TEACHER NOTE ABOUT ATTACHED FILES','PRE-ANALYZED READING SOURCE INVENTORY','boarding pass']){
    if(!prompt.includes(needle)) throw new Error('v promptu chybí '+needle);
  }
  if(!/passage AS A WHOLE must match CEFR B1/.test(prompt)) throw new Error('chybí explicitní CEFR pravidlo Readingu');
  w.eval("fileObjects.length=0;delete state.readingSourceAnalysis;state.zadaniTab='text';state.sourceUseMode='auto';");
  w.document.getElementById('zadaniFileNote').value='';
  return 'source policy + note + analysis + CEFR';
});
check('reading source: advanced má šest vysvětlených karet', () => {
  w.eval("setAppMode('advanced')");
  w.renderSourceUseNote();
  const cards=[...w.document.querySelectorAll('#sourceUseCards .source-use-card')];
  const vals=cards.map(c=>c.dataset.sourceUse).join(',');
  if(vals!=='auto,content,vocabulary,grammar,model,combined') throw new Error(vals);
  if(cards.some(c=>!c.querySelector('.source-use-card-desc')||!String(c.title||'').trim())) throw new Error('některá karta nemá inline popis nebo tooltip');
  w.pickSourceUse('vocabulary');
  if(w.eval('state.sourceUseMode')!=='vocabulary'||!w.document.querySelector('#sourceUseCards [data-source-use="vocabulary"]').classList.contains('active')) throw new Error('sourceUseMode se nesynchronizuje');
  return vals;
});
check('reading source: simple vynutí pouze Automaticky', () => {
  w.eval("state.appMode='simple';state.workPreset='quick';enforceModeConstraints();applyVisualState()");
  const cards=[...w.document.querySelectorAll('#sourceUseCards .source-use-card')];
  if(cards.length!==1||cards[0].dataset.sourceUse!=='auto') throw new Error('simple zobrazuje víc než Automaticky');
  if(w.eval('state.sourceUseMode')!=='auto') throw new Error('simple zachoval advanced sourceUseMode');
  return 'auto only';
});
check('reading source: explicitní Reading téma má prioritu před tématem zdroje', () => {
  w.eval("Object.assign(state,{appMode:'advanced',workPreset:'full',jazyk:'angličtina',uroven:['B2'],zadaniTab:'text',sourceUseMode:'content',typyCviceni:['reading comprehension'],pocet:1,body:5,exerciseDetail:false,rcTopic:'Práce a kariéra'});");
  w.document.getElementById('zadaniText').value='Environment test: recycling, pollution, renewable energy, carbon footprint.';
  const prompt=w.buildContentPrompt(w.eval('state'),[]);
  for(const needle of ['READING TOPIC PRIORITY','mandatory thematic frame','Práce a kariéra','supporting material INSIDE the selected Reading topic']){
    if(!prompt.includes(needle)) throw new Error('topic-priority prompt missing '+needle);
  }
  if(prompt.includes('Use source topics, facts and content as the primary content basis')) throw new Error('source content still overrides explicit Reading topic');
  return 'Reading topic > source topic';
});

// Test Lab jako admin: lazy feature se v JSDOM nenačte přes dynamický import automaticky.
const testLabFeature = path.join(path.dirname(target), 'features', 'testlab.js');
w.eval(fs.readFileSync(testLabFeature, 'utf8'));
w.eval("Access.profile={role:'admin',userId:'BALAZ',displayName:'Admin',status:'active'};Access.granted=true;");
const checks = w.GHRABGeneratorFeatures?.testLab?.checks?.();
if (!Array.isArray(checks)) throw new Error('Test Lab QA API není dostupné');
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
