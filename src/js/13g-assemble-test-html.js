async function assembleTestHtml(st, genData) {
  // Ostrý (klasifikovaný) balíček = secureOffline. Veškerá jeho kryptografie (salt, manifest
  // hash, per-test secret, PIN/heslo, RSA klíč verifieru) se počítá níž; tvrdou bránou hned na
  // vstupu zajistíme, že nic z toho nespadne na slabý fallback. Instant režim (neostrý) tady
  // záměrně neblokujeme — používá orientační ověření, kde je fallback přijatelný.
  if((st.resultMode||'instant')==='secureOffline') requireWebCrypto('Bezpečný offline test');
  const diffGroups=getApiDiffGroups(st);
  const variants=normalizeAllVariants(st,genData,diffGroups);
  // Randomizace se aplikuje až při startu testu podle studenta/attemptId; všichni tak nemají stejný pořádek.
  const defaultExercises=variants.__default||[];
  if(!defaultExercises.length)throw new Error('Žádná cvičení k sestavení.');
  const groupNotes=(genData&&typeof genData.group_notes==='object'&&genData.group_notes)?genData.group_notes:{};

  const jazyk=st.jazyk||'angličtina';
  const uiLang=getUiLang(st.instrJazyk,jazyk);
  const labels=getLabels(uiLang);
  const customScaleRaw=trim('vlastniSkala');
  const summary=variantSummary(defaultExercises);
  const testId='T'+Date.now().toString(36).toUpperCase().slice(-6);
  const generatorVersion=RELEASE.version;
  const generatedAt=new Date().toISOString();
  const cr=currentCreator(); // přihlášený proškolený učitel / admin → auditní stopa do výstupů
  const securitySalt=randomHex(16);
  const publicDiffGroups=await buildPublicDiffGroups(diffGroups,securitySalt);
  const identityCodeHashes=await buildPublicIdentityCodeHashes(st,securitySalt);
  const configForHash={
    generatorVersion,buildHash:BUILD_HASH,releaseDate:RELEASE.date,releaseStatus:RELEASE.status,testId,generatedAt,
    creatorId:cr.id, creatorRole:cr.role,
    nazev: trim('nazev')||'Test', proKoho: trim('proKoho')||'', jazyk, uiLang,
    cefr: (String(jazyk||'').toLowerCase()==='čeština' ? '' : cefrLabel()), cefrLevels: (String(jazyk||'').toLowerCase()==='čeština' ? [] : CEFR_LEVELS.filter(l => st.uroven.includes(l))), cefrCombined: (String(jazyk||'').toLowerCase()==='čeština' ? false : !!(st.kombinovat && st.uroven.length > 1)),
    cas: st.cas||45, tema: st.tema||'examBlue', testMode: st.testMode||'bezny',
    randomizace: st.randomizace==='ANO', overeni: st.overeni==='ANO', identityMode: st.identityMode||'name',
    zolicek: st.zolicek==='ANO', layout: st.layout||'tabs', odevzdavani: st.odevzdavani||'B', resultMode: st.resultMode || 'instant',
    gradeTyp: st.gradeTyp||'skola', gradeScaleRaw: customScaleRaw,
    fuzzyTolerance: (st.fuzzyTolerance==='mild'||st.fuzzyTolerance==='strict')?st.fuzzyTolerance:'off',
    feedbackMode: (['none','brief','learning'].indexOf(st.feedbackMode)!==-1)?st.feedbackMode:'brief',
    screenGuard: !!st.screenGuard,
    lockOnLeave: (st.testMode==='prisny') || !!st.screenGuard,
    isCzech: String(jazyk||'').toLowerCase()==='čeština',
    csScoringPolicy: (function(){ const cm=(st&&st.csModule)||{}; const ch=(cm&&cm.checks)||{}; return { enabled:String(jazyk||'').toLowerCase()==='čeština', domain:cm.domain||'', phenomenon:cm.phenomenon||'', correctionMode:cm.correctionMode||'', difficulty:cm.difficulty||'', diacritics:ch.diacritics!==false, punctuation:!!ch.punctuation, capitalization:!!ch.capitalization, exactShape:ch.exactShape!==false, requireTeacherReview: cm.correctionMode==='semi'||cm.correctionMode==='manual'||cm.domain==='stylistika'||cm.domain==='literatura' }; })(),
    csFeedbackPolicy: (function(){ const cm=(st&&st.csModule)||{}; return { enabled:String(jazyk||'').toLowerCase()==='čeština', structured:true, domain:cm.domain||'', phenomenon:cm.phenomenon||'', difficulty:cm.difficulty||'', studentLabels:{phenomenon:'Jev',rule:'Pravidlo',why:'Proč',repeat:'Co zopakovat'} }; })(),
    totalBody: summary.totalBody, totalQ: summary.totalQ, exCount: summary.exCount,
    diffRosterSalt: securitySalt,
    diffRosterScheme: 'sha256-v1',
    identityCodeScheme: 'sha256-v1',
    identityCodeHashes,
    diffGroups: publicDiffGroups,
    groupNotes, variantKeys: Object.keys(variants).filter(k=>k!=='__default')
  };
  const contentHash=await sha256Text(stableStringify(variants));
  const configHash=await sha256Text(stableStringify(configForHash));
  const manifestBase={v:1,security:'B+C-offline',salt:securitySalt,contentHash,configHash,...configForHash};
  const manifestHash=await sha256Text(stableStringify(manifestBase));
  const teacherSecurityCode=trim('bezpKod');
  const verifySecret=teacherSecurityCode
    ? await derivePerTestSecret(teacherSecurityCode, securitySalt, manifestHash)
    : makeVerifySecret();
  const teacherPinHash=await deriveSecretHash('teacher-pin', trim('ucitelPin')||'', testId);
  const unlockHash=await deriveSecretHash('unlock-password', trim('heslo')||'', testId);
  const cfg={
    nazev: configForHash.nazev,
    proKoho: configForHash.proKoho,
    jazyk,uiLang,labels,
    isSpanish: isSpanishLike(jazyk),
    isCzech: !!configForHash.isCzech,
    csScoringPolicy: configForHash.csScoringPolicy || {},
    csFeedbackPolicy: configForHash.csFeedbackPolicy || {},
    cefr: configForHash.cefr,
    cefrLevels: configForHash.cefrLevels,
    cefrCombined: configForHash.cefrCombined,
    cas: configForHash.cas,
    tema: configForHash.tema,
    testMode: configForHash.testMode,
    randomizace: configForHash.randomizace,
    overeni: configForHash.overeni,
    identityMode: configForHash.identityMode,
    zolicek: configForHash.zolicek,
    ucitelJmeno: trim('ucitelJmeno')||'',
    ucitelPinHash: teacherPinHash,
    hesloHash: unlockHash,
    hasUnlock: !!trim('heslo'),
    verifySecret,
    securityMode: teacherSecurityCode ? 'teacher-code-derived' : 'random-per-test',
    securitySalt,
    manifest:{...manifestBase,hash:manifestHash},
    manifestHash,
    layout: configForHash.layout,
    odevzdavani: configForHash.odevzdavani,
    resultMode: configForHash.resultMode,
    gradeTyp: configForHash.gradeTyp,
    fuzzyTolerance: configForHash.fuzzyTolerance,
    feedbackMode: configForHash.feedbackMode,
    screenGuard: configForHash.screenGuard,
    lockOnLeave: configForHash.lockOnLeave,
    gradeScale: st.gradeTyp==='vlastni'?((st.aiGradeScale&&st.aiGradeScale.length&&st.aiGradeRaw===customScaleRaw)?st.aiGradeScale.slice():parseCustomGradeScale(customScaleRaw, summary.totalBody)):[],
    gradeScaleRaw: customScaleRaw,
    generatorVersion,
    buildHash: BUILD_HASH,
    releaseDate: RELEASE.date,
    releaseStatus: RELEASE.status,
    generatedAt,
    creatorId: cr.id,
    creatorName: cr.name,
    creatorRole: cr.role,
    appMode: state.appMode || '',
    testId,
    totalBody: summary.totalBody,
    totalQ: summary.totalQ,
    exCount: summary.exCount,
    diffRosterSalt: configForHash.diffRosterSalt,
    diffRosterScheme: configForHash.diffRosterScheme,
    identityCodeScheme: configForHash.identityCodeScheme,
    identityCodeHashes: configForHash.identityCodeHashes,
    diffGroups: publicDiffGroups,
    groupNotes,
    variantKeys: configForHash.variantKeys
  };
  lastAssembled = { cfg, variants }; // vstup pro self-test bodování (skutečná data testu)
  const variantHtmls=buildVariantHtmls(cfg,variants);
  if ((st.resultMode || 'instant') === 'secureOffline') {
    return await assembleSecureOfflinePackage(st, cfg, variants);
  }
  return '<!DOCTYPE html>\n<html lang="'+H(uiLang)+'">\n<head>\n'+
    '<meta charset="UTF-8">\n'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'+
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'+
    '<title>'+H(cfg.nazev)+'</title>\n'+
    '<style>\n'+getTestBaseCSS()+'\n'+getTestThemeCSS(cfg.tema)+'\n</style>\n'+
    '</head>\n<body>\n'+
    auditCommentHtml(cfg)+
    buildIntroHtml(cfg,defaultExercises)+
    buildTestScreenHtml(cfg,defaultExercises)+
    buildResultHtml(cfg)+
    buildTeacherHtml(cfg,defaultExercises)+
    buildModalsHtml(cfg)+
    '\n<script>\n\'use strict\';\n'+
    'const CFG='+safeJsonForScript(cfg)+';\n'+
    'const VARIANTS='+safeJsonForScript(variants)+';\n'+
    'const VARIANT_HTMLS='+safeJsonForScript(variantHtmls)+';\n'+
    'var EXS=VARIANTS.__default||[];\n'+
    'const LABELS=CFG.labels||{};\n'+
    getTestScript()+
    '\n<\/'+'script>\n</body>\n</html>';
}
