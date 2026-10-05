async function runWorkflowComponentTests(){
  const results=[];const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const must=(value,message)=>{if(!value)throw new Error(message||'Assertion failed');};
  async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message,stack:e.stack});}}
  function reset(){
    closeComprehensionDialog(false);closeUiModal(null);
    state=JSON.parse(JSON.stringify(DEFAULT));
    Object.assign(state,{appMode:'advanced',workPreset:'advanced',jazyk:'angli\u010dtina',instrJazyk:'cs',uroven:['B1'],pocet:1,typyCviceni:['reading comprehension'],body:8,exerciseDetail:false,exerciseConfigSaved:false,zadaniTab:'text',readingQuestionCount:4,readingConfigured:false,readingSourceScope:'shared',readingSourceAction:'generate'});
    DOM_FIELDS.forEach(id=>{if($(id))setVal(id,'');});
    setVal('nazev','Synthetic QA');setVal('proKoho','Synthetic group');setVal('latka','School vocabulary');setVal('zadaniText','A school library lends books.');
    fileObjects=[];fileReadPromises=[];currentGeminiAbortController=null;rosterEntries=[];rosterIssuedCodes.clear();rosterIssuedState=state;rosterSelectedEmails.clear();rosterKnownEmails.clear();lastAssembled=null;
    geminiApiKey='synthetic-not-real';geminiDataNoticeAcceptedInMemory=true;applyVisualState();validate();
  }
  const questions=()=>[1,2,3,4].map(n=>({q:'Question '+n,a:'Answer '+n}));
  let calls=[];
  function mockProvider(){calls=[];callGeminiJSON=async(p,parts,opts)=>{calls.push({p,parts,opts});return opts.operation==='reading-source-analysis'?{summary:'Library',target_vocabulary:['library']}:opts.operation==='exercise-suitability'?{assessments:suitabilityTypes().map(type=>({type,status:'adapt',reason:'Vocabulary can be reused.',suggestion:'Use a new passage.'})),recommendations:['matching','unknown invented type']}:{passage:'AI NEW PASSAGE',questions:questions()};};}
  reset();
  await test('CEFR and source precede exercise selection',()=>{
    must($('cefrField').compareDocumentPosition($('sourceMaterialField'))&Node.DOCUMENT_POSITION_FOLLOWING);
    must($('sourceMaterialField').compareDocumentPosition($('globalTypesField'))&Node.DOCUMENT_POSITION_FOLLOWING);
    must($('exerciseDetailField').compareDocumentPosition($('globalTypesField'))&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  await test('Detail toggle preserves counts and points and hides type list',()=>{
    toggleExDetail();updateExField(0,'pocetOtazek',7);updateExField(0,'body',14);const before=JSON.stringify(state.exerciseConfig);
    must($('globalTypesField').classList.contains('hidden'));toggleExDetail();must(!$('globalTypesField').classList.contains('hidden'));
    must(JSON.stringify(state.exerciseConfig)===before);must($('exerciseWorkflowTotals').textContent.includes('14'));toggleExDetail();must(JSON.stringify(state.exerciseConfig)===before);
  });
  reset();mockProvider();
  await test('Missing CEFR prevents Reading AI',async()=>{state.uroven=[];await aiSuggestReading();must(calls.length===0);state.uroven=['B1'];});
  await test('Reading preview analyses source, then generates and adopts only after click',async()=>{
    openComprehensionDialog('reading comprehension');await aiSuggestReading();must(calls.length===2);must(!_rcAiDraft===false);must(trim('readingText')==='');rcAiInsert();must(trim('readingText')==='AI NEW PASSAGE');closeComprehensionDialog(true);must(state.readingConfigured&&!readingNeedsReview());
  });
  await test('Changing CEFR marks approved Reading stale and blocks prompt',()=>{
    state.uroven=['C2'];validate();must(readingNeedsReview());must($('next1').disabled);must($('comprehensionSummary').textContent.includes('Vy\u017eaduje kontrolu'));
    let threw=false;try{buildReadingUserBlock();}catch{threw=true;}must(threw);must(trim('readingText')==='AI NEW PASSAGE');
  });
  await test('Keeping original after level change preserves text explicitly',()=>{keepApprovedReading();must(!readingNeedsReview());must(buildReadingUserBlock().includes('DOSLOVN'));});
  await test('Shared source change also marks stale',()=>{setVal('zadaniText','A different subject: marine ecosystems.');onInput();must(readingNeedsReview());});
  await test('New shared source only for other exercises freezes Reading source',()=>{keepReadingForOtherExercises();must(readingSourceIsOwn());must(!readingNeedsReview());setVal('zadaniText','Other exercises changed again.');onInput();must(!readingNeedsReview());});
  await test('Cancel Reading restores all new source controls and text',()=>{
    const before=JSON.stringify([state.readingSourceScope,state.readingSourceAction,state.readingProvenance,trim('readingSourceText')]);openComprehensionDialog('reading comprehension');setReadingSourceOption('readingSourceScope','shared');setReadingSourceOption('readingSourceAction','adapt');setVal('readingSourceText','Discard');closeComprehensionDialog(false);
    must(before===JSON.stringify([state.readingSourceScope,state.readingSourceAction,state.readingProvenance,trim('readingSourceText')]));
  });
  reset();mockProvider();
  await test('Verbatim source cannot be rewritten by AI response',async()=>{
    state.readingSourceScope='own';state.readingSourceAction='verbatim';setVal('readingSourceText','EXACT supplied original source.');openComprehensionDialog('reading comprehension');await aiSuggestReading();must(calls.length===1);must(_rcAiDraft.passage==='EXACT supplied original source.');rcAiInsert();closeComprehensionDialog(true);must(buildReadingUserBlock().includes('EXACT supplied original source.'));
  });
  await test('Main AI generation rejects rewritten approved passage',()=>{
    let rejected=false;try{validateApprovedReadingContent(state,{exercises:[{type:'reading comprehension',passage:'REWRITTEN WRONG PASSAGE',items:[]}]});}catch(e){rejected=e.isExerciseValidation;}
    must(rejected);must(trim('readingText')==='EXACT supplied original source.');
  });
  await test('Main AI generation accepts exact approved passage',()=>{validateApprovedReadingContent(state,{exercises:[{type:'reading comprehension',passage:'EXACT supplied original source.',items:[{question:'Test'}]}]});});
  await test('Own-source Reading request excludes unrelated shared source',()=>{must(!calls[0].p.includes('A school library lends books.'));});
  reset();mockProvider();
  await test('Adapt source has a distinct adaptation instruction',async()=>{state.readingSourceAction='adapt';openComprehensionDialog('reading comprehension');await aiSuggestReading();must(calls.length===1);must(calls[0].p.includes('ADAPT SOURCE'));closeComprehensionDialog(false);});
  reset();
  await test('Closing dialog discards late AI response; reopened dialog is unchanged',async()=>{
    state.readingSourceScope='own';setVal('readingSourceText','');setVal('readingText','ORIGINAL');
    let resolve;callGeminiJSON=()=>new Promise(r=>{resolve=r;});openComprehensionDialog('reading comprehension');const job=aiSuggestReading();
    for(let n=0;n<30&&!resolve;n++)await new Promise(r=>setTimeout(r,5));must(resolve);closeComprehensionDialog(false);openComprehensionDialog('reading comprehension');
    resolve({passage:'LATE WRONG TEXT',questions:questions()});await job;must(_rcAiDraft===null);must(trim('readingText')==='ORIGINAL');must($('rcAiBtn').disabled===false);closeComprehensionDialog(false);
  });
  reset();
  await test('Wrong AI question count rejected without adopting partial output',async()=>{callGeminiJSON=async()=>({passage:'x',questions:[{q:'Only one',a:'one'}]});state.readingSourceScope='own';openComprehensionDialog('reading comprehension');await aiSuggestReading();must(_rcAiDraft===null);must(trim('readingText')==='');closeComprehensionDialog(false);});
  reset();mockProvider();
  await test('Suitability uses explicit request; repeated unchanged request is cached',async()=>{
    await assessExerciseSuitability();must(calls.length===1);must(calls[0].opts.operation==='exercise-suitability');await assessExerciseSuitability();must(calls.length===1);must(!$('suitabilityResult').textContent.includes('unknown invented type'));
  });
  await test('Suitability request excludes private roster codes and teacher credentials',()=>{const all=JSON.stringify(calls);must(!all.includes('rosterEntries'));must(!all.includes('ucitelPin'));must(!all.includes('recoveryCode'));});
  await test('Suitability cache invalidates on material change',()=>{setVal('zadaniText','New material');onInput();must(suitabilityDisplayedKey==='');});
  await test('Suitability rejects malformed/duplicate/unknown types and renders hostile text inert',()=>{
    let rejected=0;for(const raw of [{assessments:[]},{assessments:[{type:'invented',status:'suitable',reason:'x'}]},{assessments:[{type:'reading comprehension',status:'green',reason:'x'}]}])try{validateSuitabilityResponse(raw,['reading comprehension'],ALL_TYPES);}catch{rejected++;}
    must(rejected===3);renderSuitabilityResult({assessments:[{type:'reading comprehension',status:'unknown',reason:'<img src=x onerror=alert(1)>',suggestion:''}],recommendations:[]},suitabilityKey());must(!$('suitabilityResult').querySelector('img'));
  });
  reset();
  await test('Adding student preserves previously issued codes',()=>{
    setVal('rosterEmails','a@example.invalid\nb@example.invalid');rosterRefreshParticipants();rosterGenerate();must(rosterEntries.length===2);const before=rosterEntries.map(x=>x.code);setVal('rosterEmails','a@example.invalid\nb@example.invalid\nc@example.invalid');rosterRefreshParticipants();rosterGenerate();must(rosterEntries.length===3);must(equal(before,rosterEntries.slice(0,2).map(x=>x.code)));
  });
  await test('Unselecting participant removes them from CSV, preserving issued-code registry',()=>{
    state.participantMode='selected';rosterSelectedEmails=new Set(['a@example.invalid','b@example.invalid','c@example.invalid']);const c=rosterEntries[1].code;rosterToggleParticipant(1,false);let csv='';downloadBlobFile=value=>csv=value;rosterDownloadCsv();must(!csv.includes('b@example.invalid'));must(csv.includes('a@example.invalid'));must(csv.includes('odeslat'));must(csv.includes('FALSE'));rosterToggleParticipant(1,true);must(rosterEntries[1].code===c);
  });
  await test('CSV for entire group defaults every recipient OFF',()=>{state.participantMode='all';rosterRefreshParticipants();let csv='';downloadBlobFile=value=>csv=value;rosterDownloadCsv();const lines=csv.split('\n');must(lines.length===4);must(lines.slice(1).every(l=>l.endsWith(',FALSE')));});
  await test('Private verifier is explained instead of adding admin secret to secure student',()=>{state.resultMode='secureOffline';updateSimpleSecretsHelper();must(!$('secureTeacherAccessInfo').classList.contains('hidden'));must($('teacherAccessCodeField').classList.contains('hidden'));});
  return {scope:'Actual source modules, Chromium about:blank, synthetic signed access, in-memory storage and mocked AI. No production transport/build/mobile certification.',total:results.length,passed:results.filter(r=>r.status==='PASS').length,results};
}
