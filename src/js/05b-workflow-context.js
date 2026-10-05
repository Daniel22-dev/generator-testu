// Change fingerprints are only for UI provenance, never authentication or integrity.
const workflowFileIds = new WeakMap();
let workflowFileSequence = 0;
let comprehensionTask = null;
let readingOwnLoadSequence = 0;
function workflowFingerprint(value){
  const text=JSON.stringify(value);let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return text.length+':'+(h>>>0).toString(16);
}
function workflowSharedSource(){
  if(state.zadaniTab==='text')return {kind:'text',text:trim('zadaniText')};
  if(state.zadaniTab==='url')return {kind:'url',urls:state.urls,note:trim('zadaniUrlNote')};
  return {kind:'file',note:trim('zadaniFileNote'),files:(fileObjects||[]).map(f=>{
    const obj=f.file||f;
    if(!workflowFileIds.has(obj))workflowFileIds.set(obj,++workflowFileSequence);
    return {id:workflowFileIds.get(obj),name:f.displayName||f.name,size:obj.size,lastModified:obj.lastModified,status:f.embedStatus,text:f.textContent||''};
  })};
}
function readingSourceIsOwn(){return state.readingSourceScope==='own';}
function readingSourcePresent(){return readingSourceIsOwn()?!!trim('readingSourceText'):activeSourceMaterialPresent();}
function readingPlainSource(){
  if(readingSourceIsOwn())return trim('readingSourceText');
  if(state.zadaniTab==='text')return trim('zadaniText');
  if(state.zadaniTab==='file'&&fileObjects.length===1){
    const f=fileObjects[0];if(f.embedStatus==='embedded'&&f.textContent)return String(f.textContent).trim();
  }
  return '';
}
function readingContextFingerprint(){
  return workflowFingerprint({cefr:state.uroven,language:state.jazyk,age:ageGroupLabel(),topic:rcEffectiveTopic(),lesson:trim('latka'),
    source:readingSourceIsOwn()?{kind:'own',text:trim('readingSourceText')}:workflowSharedSource(),
    use:state.sourceUseMode,scope:state.readingSourceScope,action:state.readingSourceAction,length:state.rcLength,count:state.readingQuestionCount});
}
function comprehensionContextFingerprint(kind){
  return kind==='reading'?readingContextFingerprint():workflowFingerprint({cefr:state.uroven,source:workflowSharedSource(),
    url:trim('compListeningUrl'),focus:trim('listeningFocus'),transcript:trim('listeningTranscript'),count:state.listeningQuestionCount,language:state.jazyk});
}
function readingNeedsReview(){
  return usesReadingComprehension()&&!!state.readingConfigured&&(!state.readingProvenance||state.readingProvenance.context!==readingContextFingerprint());
}
function approveReadingContext(reason){
  state.readingProvenance={context:readingContextFingerprint(),cefr:compCefrForPrompt(),action:state.readingSourceAction,reason:reason||'teacher-approved',
    passage:workflowFingerprint(trim('readingText')),questions:workflowFingerprint(trim('readingQuestions'))};
}
function setReadingSourceOption(key,value){
  const values={readingSourceScope:['shared','own'],readingSourceAction:['generate','adapt','verbatim']};
  if(!values[key]?.includes(value))return;
  state[key]=value;renderReadingContext();validate();saveSnapshot();
}
async function loadReadingOwnSource(input){
  const file=input.files?.[0];if(!file)return;
  const seq=++readingOwnLoadSequence,dialogDraft=compDraft;
  try{
    if(file.size>5*1024*1024)throw new Error('Soubor je p\u0159\u00edli\u0161 velk\u00fd (maximum 5 MB).');
    const ext=String(file.name).split('.').pop().toLowerCase();
    if(!['txt','md','docx'].includes(ext))throw new Error('Zde pou\u017eij TXT, MD nebo DOCX. Ostatn\u00ed form\u00e1ty vlo\u017e do spole\u010dn\u00e9ho zdroje.');
    const text=ext==='docx'?await extractDocxText(file):await readBlobAsText(file);
    if(seq!==readingOwnLoadSequence||compDraft!==dialogDraft)return;
    const clean=cleanEmbeddedSourceText(text);
    if(!clean.trim())throw new Error('Soubor neobsahuje \u010diteln\u00fd text.');
    if(clean.length>100000)throw new Error('Text p\u0159esahuje 100 000 znak\u016f. Vlo\u017e krat\u0161\u00ed pas\u00e1\u017e; nic nebylo potichu zkr\u00e1ceno.');
    if(trim('readingSourceText')&&!(await uiConfirm('Nahradit dosavadn\u00ed vlastn\u00ed podklad Readingu? Schv\u00e1len\u00e1 pas\u00e1\u017e se t\u00edm sama nep\u0159ep\u00ed\u0161e.','Nahr\u00e1t podklad')))return;
    if(seq!==readingOwnLoadSequence||compDraft!==dialogDraft)return;
    setVal('readingSourceText',clean);state.readingSourceScope='own';onInput();
  }catch(err){uiToast(String(err.message||err),'warn');}finally{input.value='';}
}
function keepReadingForOtherExercises(){
  // Freeze the approved passage as the private source for this exercise only.
  if(!trim('readingText')){uiToast('Nejd\u0159\u00edv vlo\u017e nebo vytvo\u0159 \u010dtec\u00ed pas\u00e1\u017e.','warn');return;}
  setVal('readingSourceText',trim('readingText'));state.readingSourceScope='own';state.readingSourceAction='verbatim';
  approveReadingContext('keep-passage-independent');renderReadingContext();validate();saveSnapshot();
}
function keepApprovedReading(){
  if(!trim('readingText')){uiToast('Chyb\u00ed text ke schv\u00e1len\u00ed.','warn');return;}
  approveReadingContext('keep-verbatim-after-change');renderReadingContext();validate();saveSnapshot();
}
function renderReadingContext(){
  if(!$('readingSourceScope'))return;
  $('readingSourceScope').value=state.readingSourceScope||'shared';
  $('readingSourceAction').value=state.readingSourceAction||'generate';
  $('readingOwnSourceWrap').classList.toggle('hidden',!readingSourceIsOwn());
  const hint=state.readingSourceAction==='verbatim'
    ? 'AI text nep\u0159episuje. Pou\u017eije ho p\u0159esn\u011b tak, jak je, a vytvo\u0159\u00ed k n\u011bmu ot\u00e1zky. CEFR ovlivn\u00ed jen obt\u00ed\u017enost ot\u00e1zek.'
    : state.readingSourceAction==='adapt'
    ? 'AI zachov\u00e1 obsah podkladu, ale uprav\u00ed slovn\u00ed z\u00e1sobu a v\u011btnou stavbu na zvolenou \u00farove\u0148 CEFR. V\u00fdsledek p\u0159ed pou\u017eit\u00edm uvid\u00ed\u0161.'
    : 'AI vytvo\u0159\u00ed nov\u00fd souvisl\u00fd text podle podkladu. M\u016f\u017ee vyu\u017e\u00edt jeho slovn\u00ed z\u00e1sobu, fakta nebo t\u00e9ma podle nastaven\u00ed cel\u00e9ho testu.';
  $('readingSourceHint').textContent=hint;
  const notice=$('readingReviewNotice');notice.replaceChildren();notice.classList.toggle('hidden',!readingNeedsReview());
  if(readingNeedsReview()){
    const p=document.createElement('p');p.textContent='Zm\u011bnila se \u00farove\u0148 nebo podklad. Dosavadn\u00ed Reading nebyl aktualizov\u00e1n. Uprav jej, nebo v\u00fdslovn\u011b zachovej p\u016fvodn\u00ed text (nemus\u00ed odpov\u00eddat nov\u00e9 CEFR).';notice.append(p);
    for(const [label,fn] of [['Aktualizovat pomoc\u00ed AI',aiSuggestReading],['Zachovat p\u016fvodn\u00ed text',keepApprovedReading],['Nov\u00fd podklad jen pro ostatn\u00ed cvi\u010den\u00ed',keepReadingForOtherExercises]]){
      const b=document.createElement('button');b.type='button';b.className='ghost';b.textContent=label;b.onclick=fn;notice.append(b);
    }
  }
  const dialog=$('readingSettingsDialog');
  if(dialog)dialog.querySelector('.comp-context').textContent='CEFR: '+(compCefrForPrompt()||'nezvoleno')+' \u00b7 '+(readingSourceIsOwn()?'Samostatn\u00fd podklad Readingu':'Podklad z Konkr\u00e9tn\u00edho zad\u00e1n\u00ed')+' \u00b7 '+hint;
}
function refreshWorkflowSummary(){
  const box=$('exerciseWorkflowTotals');if(!box)return;
  const detailed=hasConfiguredExercises(state),ex=Array.isArray(state.exerciseConfig)?state.exerciseConfig:[];
  const count=detailed?ex.length:Number(state.pocet)||0;
  const points=detailed?ex.reduce((s,e)=>s+(Number(e.body)||0),0):Number(state.body)||0;
  const questions=detailed?ex.reduce((s,e)=>s+(Number(e.pocetOtazek)||0),0):null;
  box.textContent=count+' cvi\u010den\u00ed \u00b7 '+(questions===null?'Po\u010dty ot\u00e1zek up\u0159esni v podrobnostech':questions+' ot\u00e1zek')+' \u00b7 '+points+' bod\u016f';
}
function refreshWorkflowContext(){
  refreshWorkflowSummary();renderReadingContext();
  if($('comprehensionSummary'))renderComprehensionSummaries();
  if(typeof renderSuitabilityLocal==='function')renderSuitabilityLocal();
}
function beginComprehensionTask(kind,button){
  if(comprehensionTask||suitabilityPending||currentGeminiAbortController){uiToast('Jin\u00fd AI po\u017eadavek je\u0161t\u011b b\u011b\u017e\u00ed. Nejprve jej dokon\u010di nebo zru\u0161.','warn');return null;}
  const task={kind,button,label:button?.textContent,draft:compDraft,context:comprehensionContextFingerprint(kind),controller:new AbortController(),locked:[]};
  const dialog=compDraft?.dialog;
  if(dialog){for(const el of dialog.querySelectorAll('input,textarea,select')){task.locked.push([el,el.disabled]);el.disabled=true;}}
  if(button){button.disabled=true;button.textContent='\u010cek\u00e1m na potvrzen\u00ed\u2026';}
  comprehensionTask=task;return task;
}
function comprehensionTaskCurrent(task){return comprehensionTask===task&&!task.controller.signal.aborted&&compDraft===task.draft;}
function assertComprehensionTask(task){
  if(!comprehensionTaskCurrent(task))throw Object.assign(new Error('Po\u017eadavek byl zru\u0161en.'),{name:'AbortError'});
  if(task.context!==comprehensionContextFingerprint(task.kind))throw new Error('Kontext se zm\u011bnil. Spus\u0165 n\u00e1vrh znovu s aktu\u00e1ln\u00edm podkladem.');
}
function finishComprehensionTask(task){
  if(comprehensionTask!==task)return;
  for(const [el,disabled] of task.locked)el.disabled=disabled;
  if(task.button){task.button.disabled=false;task.button.textContent=task.label;}
  if(comprehensionTask===task)comprehensionTask=null;
}
function cancelComprehensionTask(){
  ++readingOwnLoadSequence;
  if(!comprehensionTask)return;
  const task=comprehensionTask;geminiCancelRequested=true;task.controller.abort();
  if(currentGeminiAbortController)currentGeminiAbortController.abort();
  finishComprehensionTask(task);
}

// Validate provider output, rather than relying only on a "verbatim" instruction.
// This gate applies to AI generation, not later explicit teacher edits of a test.
function validateApprovedReadingContent(st,data){
  const expected=trim('readingText')||((st.readingSourceAction||state.readingSourceAction)==='verbatim'?readingPlainSource():'');
  if(!expected)return;
  const canonical=x=>String(x||'').replace(/\r\n?/g,'\n').trim();
  const groups=getApiDiffGroups(st);
  const sets=groups.length?groups.map(g=>getGroupVariantExercisesRaw(data,g.key)): [data];
  for(const set of sets){
    for(const ex of (Array.isArray(set?.exercises)?set.exercises:[])){
      if(normalizeType(ex?.type||'')!=='reading comprehension')continue;
      const shared=ex.passage||ex.source_text||ex.text||ex.source||'';
      const passages=[];if(shared)passages.push(shared);
      for(const it of (Array.isArray(ex.items)?ex.items:[])){
        const own=it?.passage||it?.text||it?.source||'';
        if(own)passages.push(own);else if(!shared)passages.push('');
      }
      if(passages.some(p=>canonical(p)!==canonical(expected))){
        const error=new Error('AI zm\u011bnila schv\u00e1lenou \u010dtec\u00ed pas\u00e1\u017e. Text nebyl p\u0159ijat; p\u016fvodn\u00ed zad\u00e1n\u00ed z\u016fstalo zachov\u00e1no.');
        error.isExerciseValidation=true;error.validationDetails='Reading passage differs from the fixed approved passage. Return the exact supplied passage without rewriting it.';throw error;
      }
    }
  }
}
