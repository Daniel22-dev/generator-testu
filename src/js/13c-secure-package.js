// ─── Secure offline package (student without answer key + bulk teacher verifier) ──
function stripItemForStudent(item, type) {
  const out = {};
  if (type === 'matching') {
    if (item && item.left != null) out.left = item.left;
    return out;
  }
  const keep = ['question','prompt','sentence','statement','options','words','text','passage','dialogue','categories','item','source','keyword','base_word','media_note','items','columns','base_sentence','sentences'];
  keep.forEach(k => { if (item && item[k] != null) out[k] = item[k]; });
  // Teacher-only material must not go to the student file.
  delete out.transcript;
  delete out.explanation;
  if (type === 'listening comprehension') {
    // Audio, transkript i jakýkoli alternativní zdroj zůstávají pouze učiteli.
    delete out.source;
    delete out.text;
    delete out.passage;
    delete out.source_url;
    delete out.audio_url;
    out.audio_source_note = '__TEACHER_PLAYS_AUDIO__';
  }
  if (type === 'categorisation-board' && Array.isArray(item.entries)) {
    // Klíč je entry.category — student smí vidět jen text položek, NIKDY jejich kategorii.
    out.entries = item.entries.map(e => ({ text: (e && e.text != null) ? String(e.text) : '' }));
  }
  if (type === 'error-tagging') {
    // Klíčem jsou error_token_index/error_type/correction/explanation — student vidí jen větu, tokeny a možnosti typu chyby.
    if (Array.isArray(item && item.tokens)) out.tokens = item.tokens.map(x => String(x));
    if (Array.isArray(item && item.error_type_options)) out.error_type_options = item.error_type_options.map(x => String(x));
    delete out.error_token_index;
    delete out.error_type;
    delete out.correction;
    delete out.answer;
    delete out.alt_answers;
  }
  if (type === 'table-completion' && Array.isArray(item.rows)) {
    // Klíčem jsou cell.answer/alt_answers — student smí vidět jen pevné buňky a pozice inputů.
    out.rows = item.rows.map(row => Array.isArray(row) ? row.map(cell => (cell && typeof cell === 'object' && !Array.isArray(cell)) ? { input:true } : cell) : []);
  }
  if (type === 'transformation-chain' && Array.isArray(item.transformations)) {
    // Klíčem jsou transformation.answer/alt_answers — student smí vidět jen instrukce.
    out.transformations = item.transformations.map(tr => ({ instruction: (tr && tr.instruction != null) ? String(tr.instruction) : '' }));
  }
  return out;
}
function stripVariantsForStudent(variants) {
  const out = {};
  Object.keys(variants || {}).forEach(key => {
    out[key] = (variants[key] || []).map(ex => {
      const cleanEx = {
        title: ex.title || ex.type,
        type: ex.type,
        points_total: ex.points_total,
        points_each: ex.points_each,
        item_points: ex.item_points,
        items: (ex.items || []).map(it => stripItemForStudent(it, ex.type))
      };
      // Reading comprehension: sdílený text patří na úroveň cvičení (jeden text, víc otázek).
      // Student ho smí vidět (není to klíč), proto ho přeneseme do studentského balíčku.
      if (ex.type === 'reading comprehension') {
        const sp = ex.passage || ex.source_text || ex.text || ex.source || '';
        if (sp && String(sp).trim()) cleanEx.passage = String(sp);
      }
      if (ex.type === 'matching') {
        // Student smí vidět pravé možnosti, ale nikdy spárované s levými položkami.
        // Hodnota odpovědi je text vybrané možnosti; teacher verifier porovnává s teacher-only answer key.
        cleanEx.match_options = shuffled((ex.items || []).map(it => String(it && it.right != null ? it.right : '')).filter(Boolean));
      }
      return cleanEx;
    });
  });
  return out;
}
async function generateSecureKeyPair() {
  try {
    if (!(window.crypto && crypto.subtle)) throw new Error('WebCrypto unavailable');
    const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'}, true, ['encrypt','decrypt']);
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    return { publicJwk, privateJwk };
  } catch(e) {
    throw new Error('Bezpečný offline test: nepodařilo se vytvořit šifrovací klíče (RSA-OAEP). Test NEBYL sestaven. Detail: ' + String(e && e.message ? e.message : e));
  }
}
function securePublicCfg(cfg, keyInfo) {
  return {
    v:1,
    mode:'secureOffline',
    generatorVersion:cfg.generatorVersion,
    buildHash:cfg.buildHash,
    releaseDate:cfg.releaseDate,
    releaseStatus:cfg.releaseStatus,
    resultMode:'secureOffline',
    creatorId:cfg.creatorId,
    creatorRole:cfg.creatorRole,
    appMode:cfg.appMode||'',
    testId:cfg.testId,
    manifestHash:cfg.manifestHash,
    nazev:cfg.nazev,
    proKoho:cfg.proKoho,
    jazyk:cfg.jazyk,
    uiLang:cfg.uiLang,
    cefr:cfg.cefr || '',
    cefrLevels:cfg.cefrLevels || [],
    cefrCombined:!!cfg.cefrCombined,
    secureLabels:getSecureStudentLabels(cfg.uiLang),
    identityMode:cfg.identityMode||'name',
    identityCodeScheme:cfg.identityCodeScheme||'sha256-v1',
    identityCodeHashes:Array.isArray(cfg.identityCodeHashes)?cfg.identityCodeHashes.slice():[],
    labels:cfg.labels || getLabels(cfg.uiLang),
    isCzech:!!cfg.isCzech,
    csScoringPolicy:cfg.csScoringPolicy||{},
    cas:cfg.cas,
    tema:cfg.tema,
    testMode:cfg.testMode,
    layout:cfg.layout,
    odevzdavani:'B',
    fuzzyTolerance:cfg.fuzzyTolerance||'off',
    randomizace:cfg.randomizace,
    zolicek:cfg.zolicek,
    ucitelJmeno:cfg.ucitelJmeno || '',
    ucitelPinHash:cfg.ucitelPinHash || '',
    hesloHash:cfg.hesloHash || '',
    hasUnlock:!!cfg.hasUnlock,
    diffRosterSalt:cfg.diffRosterSalt||'',
    diffRosterScheme:cfg.diffRosterScheme||'sha256-v1',
    diffGroups:(cfg.diffGroups||[]).map(g=>({key:g.key,name:g.name,studentHashes:Array.isArray(g.studentHashes)?g.studentHashes.slice():[],a11y:g.a11y||null})),
    publicKey:keyInfo.publicJwk
  };
}
async function assembleSecureOfflinePackage(st, cfg, variants) {
  const keyInfo = await generateSecureKeyPair();
  const studentVariants = stripVariantsForStudent(variants);
  const publicCfg = securePublicCfg(cfg, keyInfo);
  const studentHtml = buildSecureStudentHtml(publicCfg, studentVariants);
  const studentHtmlSha256 = await sha256HexText(studentHtml);
  const teacherCfg = Object.assign({}, cfg, { privateKey:keyInfo.privateJwk, publicKey:keyInfo.publicJwk, roster:((((typeof st!=='undefined'&&st&&st.identityMode)||cfg.identityMode)==='oneTimeCode')?rosterForVerifier():[]), studentHtmlSha256 });
  const teacherHtml = buildSecureTeacherVerifierHtml(teacherCfg, variants);
  const teacherHtmlSha256 = await sha256HexText(teacherHtml);
  return {
    mode:'secureOffline',
    studentHtml,
    teacherHtml,
    testId:cfg.testId,
    manifestHash:cfg.manifestHash,
    buildHash:cfg.buildHash,
    generatorVersion:cfg.generatorVersion,
    releaseDate:cfg.releaseDate,
    releaseStatus:cfg.releaseStatus||'',
    generatedAt:cfg.generatedAt||'',
    creatorId:cfg.creatorId||'',
    creatorName:cfg.creatorName||'',
    creatorRole:cfg.creatorRole||'',
    studentHtmlSha256,
    teacherHtmlSha256
  };
}

