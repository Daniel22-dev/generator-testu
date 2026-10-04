import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const helpers = read('src/js/13a-secure-helpers.js');
const pkg = read('src/js/13c-secure-package.js');
const secureRuntime = (fs.readFileSync('src/js/13de-secure-student-guard.js','utf8')+'\n'+read('src/js/13e-secure-student-runtime.js'));
const assemble = read('src/js/13g-assemble-test-html.js');
const builders = read('src/js/14a-test-html-builders.js');
const instantRuntime = read('src/js/14b-instant-test-runtime.js');
const scanner = read('src/js/07-gemini.js');

function assert(cond, msg){
  if(!cond){ console.error('FAIL', msg); process.exitCode = 1; }
  else console.log('PASS', msg);
}

function derive(kind, secret, testId){
  const norm = ['teacher-pin','recovery-code'].includes(kind) ? String(secret||'').trim().toUpperCase() : String(secret||'').trim();
  const bits = crypto.pbkdf2Sync(norm, `${kind}|${testId}`, 120000, 32, 'sha256');
  return 'pbkdf2-v1$' + bits.toString('base64url');
}

// Assembly/data-path separation.
assert(/field\('ucitelPin'\)/.test(assemble) && /field\('recoveryCode'\)/.test(assemble), 'E2: assembly reads Teacher/Admin and Recovery from separate inputs');
assert(/deriveSecretHash\('teacher-pin',\s*teacherAccessCode,\s*testId\)/.test(assemble), 'E2: teacher hash is derived only from Teacher/Admin secret');
assert(/deriveSecretHash\('recovery-code',\s*classroomRecoveryCode,\s*testId\)/.test(assemble), 'E2: recovery hash is derived only from Classroom Recovery Code');
assert(/recoveryCodeHash/.test(assemble) && /hasRecoveryUnlock/.test(assemble), 'E2: output CFG uses explicit recovery names');
assert(!/hesloHash|hasUnlock|unlock-password/.test(assemble), 'E2: new assembly no longer emits legacy unlock hash/domain names');
assert(/credentialPolicyErrors\(teacherAccessCode,classroomRecoveryCode,configForHash\.lockOnLeave/.test(assemble), 'E2: guarded test assembly fails closed through shared credential policy');

// Secure output path.
assert(/unlockCodeHash:cfg\.unlockCodeHash/.test(pkg) && !/ucitelPinHash|recoveryCodeHash|identityCodeHashes/.test(pkg), 'E2: secure public CFG has only a procedural classroom unlock hash');
assert(!/hesloHash|hasUnlock\b|unlock-password/.test(pkg), 'E2: secure package has no legacy unlock output field');
assert(/async function recoveryCodeMatches\(secret\)/.test(secureRuntime) && /deriveSecretHash\('recovery-code',secret,CFG\.testId\)/.test(secureRuntime) && /tryUnlock\(\).*recoveryCodeMatches/s.test(secureRuntime), 'E2: secure runtime unlock uses recovery-code branch');
assert(/async function teacherSecretMatches\(secret\)/.test(secureRuntime) && /deriveSecretHash\('teacher-pin',secret,CFG\.testId\)/.test(secureRuntime) && /teacherLogin\(\).*teacherSecretMatches/s.test(secureRuntime), 'E2: secure runtime teacher login remains teacher-pin only');
assert(!/hesloHash|unlock-password/.test(secureRuntime), 'E2: secure runtime no longer accepts legacy unlock branch');

// Instant output path.
assert(/cfg\.hasRecoveryUnlock/.test(builders) && !/cfg\.hasUnlock/.test(builders), 'E2: instant lock-screen builder uses recovery capability flag');
assert(/async function recoveryCodeMatches\(raw\)/.test(instantRuntime) && /deriveSecretHashClient\('recovery-code',raw,CFG\.testId\)/.test(instantRuntime) && /tryUnlock\(\).*recoveryCodeMatches/s.test(instantRuntime), 'E2: instant runtime unlock uses recovery-code branch');
assert(/async function teacherSecretMatches\(raw\)/.test(instantRuntime) && /deriveSecretHashClient\('teacher-pin',raw,CFG\.testId\)/.test(instantRuntime) && /doTeacherLogin\(\).*teacherSecretMatches/s.test(instantRuntime), 'E2: instant runtime teacher login remains teacher-pin only');
assert(/CFG\.hasRecoveryUnlock/.test(instantRuntime) && !/CFG\.hasUnlock/.test(instantRuntime), 'E2: instant runtime uses recovery capability flag');
assert(!/hesloHash|unlock-password/.test(instantRuntime), 'E2: instant runtime no longer accepts legacy unlock branch');

// No raw output credential fields in serialized student config paths.
const cfgTail = assemble.split('const cfg=')[1] || '';
assert(!/^\s*teacherAccessCode\s*[:,]/m.test(cfgTail), 'E2: raw Teacher/Admin secret is not a CFG property');
assert(!/^\s*classroomRecoveryCode\s*[:,]/m.test(cfgTail), 'E2: raw Recovery Code is not a CFG property');
assert(scanner.includes('\\"recoveryCode\\"') && scanner.includes('CFG\\.recoveryCode'), 'E2: generated-output scanner rejects raw recoveryCode field/reference');


// Synthetic instant-output assembly: proves the raw values are not serialized into student HTML.
{
  const fields = {
    nazev:'E2 synthetic', proKoho:'', vlastniSkala:'', ucitelPin:'TEACH-RAW-SHOULD-NOT-LEAK',
    recoveryCode:'REC-RAW-SHOULD-NOT-LEAK', ucitelJmeno:'Teacher', latka:'', zadaniText:'', poznamky:''
  };
  const context = {
    console,
    trim:id => fields[id] || '',
    CEFR_LEVELS:['B2'],
    requireWebCrypto(){},
    requiresTeacherAccessCode:st=>(st.resultMode||'instant')!=='secureOffline',
    getApiDiffGroups:()=>[],
    normalizeAllVariants:()=>({__default:[{title:'Synthetic',type:'multiple choice',points_total:1,points_each:1,items:[{question:'Q',options:['A','B'],correct:0}]}]}),
    getUiLang:()=> 'cs',
    getLabels:()=>({}),
    variantSummary:()=>({totalBody:1,totalQ:1,exCount:1}),
    currentCreator:()=>({id:'T',name:'Teacher',role:'trainedTeacher'}),
    randomHex:()=> 'A1B2C3D4',
    buildPublicDiffGroups:async()=>[],
    buildPublicIdentityCodeHashes:async()=>[],
    sha256Text:async()=> 'HASH',
    stableStringify:JSON.stringify,
    makeVerifySecret:()=> 'VERIFY-SECRET',
    deriveSecretHash:async kind => `DERIVED-${kind}`,
    credentialPolicyErrors:(teacher,recovery,required)=>{const e=[];if(!teacher)e.push('teacher');if(required&&!recovery)e.push('recovery');if(teacher&&recovery&&String(teacher).trim().toUpperCase()===String(recovery).trim().toUpperCase())e.push('same');return e;},
    isSpanishLike:()=>false,
    RELEASE:{version:'7.1.74',date:'2026-10-02',status:'checkpoint',sourceAuditPending:false},
    BUILD_HASH:'E2',
    parseCustomGradeScale:()=>[],
    buildVariantHtmls:()=>({}),
    H:x=>String(x||''),
    getTestBaseCSS:()=>'', getTestThemeCSS:()=>'', auditCommentHtml:()=>'',
    buildIntroHtml:()=>'<div id="introScreen"></div>', buildTestScreenHtml:()=>'<div id="testScreen"></div>',
    buildResultHtml:()=>'<div id="resultScreen"></div>', buildTeacherHtml:()=>'<div id="teacherModal"></div>',
    buildModalsHtml:()=>'', safeJsonForScript:JSON.stringify, getTestScript:()=>'',
    rosterForVerifier:()=>[], configuredGoogleFormsUrl:()=>'', configuredGoogleFormsMetadata:()=>null,
    normalizeStoredGoogleFormsMetadata:x=>x
  };
  vm.runInNewContext(assemble + '\nthis.__assembleTestHtml = assembleTestHtml;', context);
  const html = await context.__assembleTestHtml({
    __outputFields:fields, __roster:[], resultMode:'instant', testMode:'prisny', screenGuard:true,
    uroven:['B2'], jazyk:'angličtina', instrJazyk:'cs', cas:45, tema:'examBlue', randomizace:'NE', overeni:'NE',
    identityMode:'name', zolicek:'NE', layout:'tabs', odevzdavani:'B', gradeTyp:'skola', fuzzyTolerance:'off',
    feedbackMode:'brief', appMode:'', kombinovat:false
  }, {});
  assert(!html.includes(fields.ucitelPin), 'E2: synthetic instant student HTML does not contain raw Teacher/Admin secret');
  assert(!html.includes(fields.recoveryCode), 'E2: synthetic instant student HTML does not contain raw Recovery Code');
  assert(html.includes('DERIVED-teacher-pin') && html.includes('DERIVED-recovery-code'), 'E2: synthetic instant student HTML contains only the two derived credential hashes');
}

// Secure public config serialization: only the two derived hashes may cross into student_test.html config.
{
  const context = {getSecureStudentLabels:()=>({}), getLabels:()=>({}), isolatedSecureStudentLabels:x=>x, console};
  vm.runInNewContext(pkg + '\nthis.__securePublicCfg = securePublicCfg;', context);
  const rawTeacher = 'TEACH-RAW-SHOULD-NOT-LEAK';
  const rawRecovery = 'REC-RAW-SHOULD-NOT-LEAK';
  const publicCfg = context.__securePublicCfg({
    generatorVersion:'7.1.74', buildHash:'E2', releaseDate:'2026-10-02', releaseStatus:'checkpoint',
    creatorId:'T', creatorRole:'trainedTeacher', testId:'TEST-A', manifestHash:'M', nazev:'Synthetic', proKoho:'',
    jazyk:'angličtina', uiLang:'cs', labels:{}, cas:45, tema:'examBlue', testMode:'prisny', screenGuard:true,
    layout:'tabs', fuzzyTolerance:'off', randomizace:false, zolicek:false, ucitelJmeno:'Teacher',
    ucitelPinHash:'DERIVED-teacher-pin', recoveryCodeHash:'DERIVED-recovery-code', hasRecoveryUnlock:true,
    ucitelPin:rawTeacher, recoveryCode:rawRecovery
  }, {publicJwk:{kty:'RSA'}});
  const serialized = JSON.stringify(publicCfg);
  assert(!serialized.includes(rawTeacher) && !serialized.includes(rawRecovery), 'E2: secure student public CFG drops raw Teacher/Admin and Recovery values');
  assert(!('ucitelPinHash' in publicCfg) && !('recoveryCodeHash' in publicCfg), 'E2: secure student public CFG drops both legacy credential hashes');
}

// Cryptographic domain/test binding properties (independent reference implementation).
const teacher = 'TEACH-Alpha-2026';
const recovery = 'REC-AB12-CD34';
const testA = 'TEST-A';
const testB = 'TEST-B';
const teacherHash = derive('teacher-pin', teacher, testA);
const recoveryHashA = derive('recovery-code', recovery, testA);
assert(teacherHash !== recoveryHashA, 'E2: Teacher/Admin and Recovery hashes are cryptographically domain-separated');
assert(derive('recovery-code', recovery, testA) !== derive('recovery-code', recovery, testB), 'E2: same Recovery Code is bound to testId and not portable between tests');
assert(derive('teacher-pin', recovery, testA) !== recoveryHashA, 'E2: Recovery Code hash cannot equal teacher credential hash even for identical plaintext');
assert(derive('teacher-pin', teacher.toLowerCase(), testA) === teacherHash, 'E2: Teacher/Admin normalization is stable');
assert(derive('recovery-code', recovery.toLowerCase(), testA) === recoveryHashA, 'E2: Recovery normalization is stable');

// Helper contract.
assert(/kind==='teacher-pin'\|\|kind==='recovery-code'/.test(helpers), 'E2: generator PBKDF2 helper explicitly recognizes only the two current credential domains');
assert(!/unlock-password/.test(helpers), 'E2: legacy unlock-password domain removed from new generator helper');

if(process.exitCode) process.exit(process.exitCode);
console.log('PASS E2 cryptographic credential separation gate');
