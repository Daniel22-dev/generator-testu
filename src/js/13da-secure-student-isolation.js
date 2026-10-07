// Parse legacy runtime; omit teacher and retry capabilities.
function isolatedSecureStudentLabels(labels, lang){
  const clean=Object.assign({},labels);
  ['teacher','teacherLogin','teacherPanel','teacherHint','name','pin','login','logout','retryCode','retryAllow','retryGranted','retryBad','teacherStatus','teacherNoAnswers','activeAttemptReset','activeAttemptResetDone'].forEach(k=>delete clean[k]);
  const text={
    cs:['Odemykací kód třídy','Test už byl odevzdán. Kontaktuj učitele. Další pokus tento soubor nepovoluje.','Na tomto zařízení už existuje rozpracovaný pokus jiné identity nebo poškozený stav. Kontaktuj učitele.'],
    en:['Classroom unlock code','This test was already submitted. Contact your teacher. This file cannot allow another attempt.','An attempt with another identity or damaged state exists on this device. Contact your teacher.'],
    es:['Código de desbloqueo de la clase','La prueba ya fue entregada. Contacta con el profesor. Este archivo no permite otro intento.','Ya existe un intento con otra identidad o un estado dañado. Contacta con el profesor.'],
    de:['Entsperrcode der Klasse','Der Test wurde bereits abgegeben. Wende dich an die Lehrkraft. Diese Datei erlaubt keinen weiteren Versuch.','Ein Versuch mit anderer Identität oder beschädigtem Zustand existiert bereits. Wende dich an die Lehrkraft.']
  };
  const l=text[lang]||text.en;
  const start={cs:['Startovní kód','Kód dostaneš od učitele při zahájení. Po obnovení stránky jej zadej znovu.','Nesprávný startovní kód nebo poškozené zadání. Test nebyl zahájen.'],en:['Start code','Your teacher gives you the code at the start. Enter it again after reloading.','Incorrect start code or damaged content. The test has not started.'],es:['Código de inicio','El profesor da el código al empezar. Introdúcelo de nuevo tras recargar.','Código incorrecto o contenido dañado. La prueba no ha empezado.'],de:['Startcode','Die Lehrkraft gibt den Code zum Beginn. Nach dem Neuladen erneut eingeben.','Falscher Startcode oder beschädigter Inhalt. Der Test hat nicht begonnen.']}[lang]||['Start code','Your teacher gives you the code at the start. Enter it again after reloading.','Incorrect start code or damaged content. The test has not started.'];
  [clean.contentCodeLabel,clean.contentCodeHint,clean.contentCodeError]=start;
  clean.unlockPh=l[0];clean.retryHint=l[1];clean.activeAttemptHint=l[2];
  clean.badLogin=({cs:'Nesprávný odemykací kód.',en:'Incorrect classroom unlock code.',es:'Código de desbloqueo incorrecto.',de:'Falscher Entsperrcode.'})[lang]||'Incorrect classroom unlock code.';
  const codeMessages={
    cs:['Tohle je ID testu, ne tv\u016fj k\u00f3d. Tv\u016fj k\u00f3d m\u00e1 6 znak\u016f a p\u0159i\u0161el ti e-mailem.','Tohle je startovn\u00ed k\u00f3d nebo jeho \u010d\u00e1st. Zadej sv\u016fj osobn\u00ed k\u00f3d z e-mailu.','Tv\u016fj osobn\u00ed k\u00f3d mus\u00ed m\u00edt p\u0159esn\u011b 6 p\u00edsmen A\u2013Z nebo \u010d\u00edslic. Najde\u0161 ho ve sv\u00e9m e-mailu.','ID testu \u2013 nevypl\u0148uje\u0161','P\u0159edvypln\u011bn\u00e9 ID testu, n\u00e1zev a t\u0159\u00eddu ve formul\u00e1\u0159i nem\u011b\u0148.'],
    en:['This is the test ID, not your personal code. Your code has 6 characters and was sent by email.','This is the start code or part of it. Enter your personal code from your email.','Your personal code must have exactly 6 letters A\u2013Z or digits. Check your email.','Test ID \u2013 do not enter this','Do not change the prefilled test ID, title or class in the form.'],
    es:['Este es el ID del test, no tu c\u00f3digo personal. Tu c\u00f3digo tiene 6 caracteres y lo recibiste por correo.','Este es el c\u00f3digo de inicio o parte de \u00e9l. Usa tu c\u00f3digo personal del correo.','Tu c\u00f3digo personal debe tener exactamente 6 letras A\u2013Z o d\u00edgitos. Revisa tu correo.','ID del test \u2013 no lo introduzcas','No cambies el ID, el t\u00edtulo ni el grupo ya rellenados.'],
    de:['Das ist die Test-ID, nicht dein pers\u00f6nlicher Code. Dein Code hat 6 Zeichen und kam per E-Mail.','Das ist der Startcode oder ein Teil davon. Nutze deinen pers\u00f6nlichen Code aus der E-Mail.','Dein pers\u00f6nlicher Code muss genau 6 Buchstaben A\u2013Z oder Ziffern haben.','Test-ID \u2013 nicht eingeben','\u00c4ndere die vorausgef\u00fcllte Test-ID, den Titel und die Klasse nicht.']
  }[lang]||[];
  [clean.codeLooksLikeTestId,clean.codeLooksLikeStart,clean.invalidIdentityCode,clean.testIdNotCode,clean.formsMetadataHint]=codeMessages.length?codeMessages:['Use your 6-character personal code.','Use your personal code, not the start code.','Your code must have 6 letters or digits.','Test ID - do not enter this','Do not change the prefilled metadata.'];
  clean.codePlaceholder='A1B2C3';
  return clean;
}
function isolatedSecureStudentScript(){
  const source=secureStudentScript();
  const parser=window.acorn;
  if(!parser||typeof parser.parse!=='function')throw new Error('Studentský export nebyl vytvořen: chybí parser pro oddělení učitelských funkcí.');
  const remove=new Set(['teacherSecretMatches','normLoginName','openTeacherModal','closeTeacherModal','teacherLogout','teacherLogin','renderTeacherRuntimeInfo','clearSubmittedLocked','clearSealedJokerUi','rosterHash','identityCodeHash']);
  const replacements={
    showSubmittedLocked:"function showSubmittedLocked(){sModal(t('retryHint'),t('retryTitle'));}",
    showActiveAttemptLocked:"function showActiveAttemptLocked(){sModal(t('activeAttemptHint'),t('activeAttemptTitle'));}",
    identityAllowed:"async function identityAllowed(value){if((CFG.identityMode||'name')!=='oneTimeCode')return true;return !identityCodeProblem(value);}",
    chooseVariant:"async function chooseVariant(){var groups=CFG.diffGroups||[];if(!groups.length)return '__default';if(groups.length===1)return groups[0].key;var el=$('studentVariant');var key=String(el&&el.value||'');return groups.some(g=>g.key===key)?key:'';}",
    deriveSecretHash:"async function deriveSecretHash(_kind,secret,testId){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))throw new Error(t('cryptoFail'));var enc=new TextEncoder();var key=await crypto.subtle.importKey('raw',enc.encode(String(secret||'').trim().toUpperCase()),{name:'PBKDF2'},false,['deriveBits']);var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode('classroom-unlock|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);return 'pbkdf2-v1$'+b64UrlFromBufferLocal(bits);}",
    recoveryCodeMatches:"async function unlockCodeMatches(secret){if(!secret||!CFG.unlockCodeHash)return false;return await deriveSecretHash('classroom-unlock',secret,CFG.testId)===CFG.unlockCodeHash;}"
  };
  const ast=parser.parse(source,{ecmaVersion:'latest',sourceType:'script'});
  let out='',cursor=0;
  for(const node of ast.body){
    if(node.type!=='FunctionDeclaration')continue;
    const name=node.id.name;
    if(!remove.has(name)&&!Object.prototype.hasOwnProperty.call(replacements,name))continue;
    out+=source.slice(cursor,node.start)+(remove.has(name)?'':replacements[name]);cursor=node.end;
  }
  out+=source.slice(cursor);
  out=out.replace(/recoveryCodeMatches\(v\)/g,'unlockCodeMatches(v)').replace(/CFG\.hasRecoveryUnlock/g,'CFG.hasUnlockCode');
  parser.parse(out,{ecmaVersion:'latest',sourceType:'script'});
  if(/ucitelPinHash|recoveryCodeHash|teacherSecretMatches|teacherLogin|identityCodeHashes|studentHashes|CFG\.diffRosterSalt/.test(out))throw new Error('Studentský export nebyl vytvořen: zůstala učitelská nebo rosterová funkce.');
  return out;
}
function assertSecureStudentIsolation(publicCfg,studentVariants,html){
  function walk(value,forbidden){
    if(!value||typeof value!=='object')return;
    for(const [key,child] of Object.entries(value)){
      if(forbidden.test(key)||/^(?:answer(?:key|hash(?:es)?|checksum|seed)|encryptedanswerkey|normalizedanswers?|correct(?:hash|checksum|position)|originalcorrectposition|shuffleseed|teacher(?:config(?:uration)?|secret(?:hash)?|pin(?:hash)?)|recoverycode(?:hash)?|identitycodehashes|studenthashes|diffroster(?:salt|scheme)|private(?:key|jwk)|roster|debugconfig)$/i.test(key.replace(/[^a-z0-9]/gi,'')))throw new Error('Studentský export obsahuje zakázané učitelské pole: '+key);
      walk(child,forbidden);
    }
  }
  walk(publicCfg,/^(?:startCode|ucitelPin|ucitelPinHash|ucitelJmeno|teacherSecret|teacherPinHash|recoveryCode|recoveryCodeHash|hasRecoveryUnlock|identityCodeHashes|studentHashes|diffRosterSalt|privateKey|roster|formsAnchorPolicy|teacherEmails)$/i);
  walk(studentVariants,/^(?:answer|answers|alt_answers|correct|correct_order|correct_category|correct_sentence|model_answer|right|transcript|explanation|error_token_index|error_type|correction)$/i);
  if(['d','p','q','dp','dq','qi','oth'].some(k=>Object.prototype.hasOwnProperty.call(publicCfg.publicKey||{},k)))throw new Error('Studentský export obsahuje privátní RSA materiál.');
  if(/(?:function\s+(?:teacherLogin|teacherSecretMatches|openTeacherModal|clearSubmittedLocked)\b|id="teacherModal"|ucitelPinHash|recoveryCodeHash|identityCodeHashes|studentHashes)/.test(html))throw new Error('Studentský export obsahuje zakázanou učitelskou nebo rosterovou funkci.');
  return true;
}
