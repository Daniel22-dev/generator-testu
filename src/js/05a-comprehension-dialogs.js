// Reuse the real Reading/Listening controls: no cloned fields or second source of truth.
let compDraft = null;
function ensureComprehensionDialogs(){
  if($('comprehensionSummary'))return;
  const summary=document.createElement('div');summary.id='comprehensionSummary';summary.className='comp-summary';
  const anchor=$('ageGroupField');
  (anchor||$('globalTypesField')).insertAdjacentElement(anchor?'beforebegin':'afterend',summary);
  ['reading','listening'].forEach(kind=>{
    const dialog=document.createElement('dialog');dialog.id=kind+'SettingsDialog';dialog.className='comp-dialog';
    dialog.setAttribute('aria-labelledby',kind+'SettingsTitle');
    dialog.append($('compDialogTemplate').content.cloneNode(true));
    const title=dialog.querySelector('h2');title.id=kind+'SettingsTitle';title.textContent=kind==='reading'?'📖 Reading comprehension':'🎧 Listening comprehension';
    dialog.querySelector('.comp-content').appendChild($(kind+'Block'));
    const count=dialog.querySelector('#'+kind+'QuestionCount');
    count.replaceChildren(...Array.from({length:30},(_,i)=>new Option((i+1)+' otázek',i+1)));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeComprehensionDialog(false);});
    document.body.appendChild(dialog);
  });
}
function renderComprehensionSummaries(){
  ensureComprehensionDialogs();
  const kinds=['reading','listening'].filter(kind=>kind==='reading'?usesReadingComprehension():usesListeningComprehension());
  $('comprehensionSummary').replaceChildren(...kinds.map(kind=>{
    const configured=!!state[kind+'Configured']&&(kind!=='listening'||hasListeningSource());
    const count=state[kind+'QuestionCount']||4;
    const card=$('compSummaryTemplate').content.firstElementChild.cloneNode(true),[body,button]=card.children;
    body.children[0].textContent=(kind==='reading'?'📖 Reading':'🎧 Listening')+' comprehension';
    body.children[1].textContent=(configured?'✓ Nastaveno':'Nastavení k potvrzení')+' · '+count+' otázek'+(kind==='reading'?' · '+rcLenWords()+' slov':'');
    button.textContent=configured?'Upravit':'Nastavit';button.onclick=()=>openComprehensionDialog(kind+' comprehension');return card;
  }));
}
function openComprehensionDialog(type){
  ensureComprehensionDialogs();
  if(compDraft)closeComprehensionDialog(false);
  const kind=normalizeType(type)==='listening comprehension'?'listening':'reading';
  const dialog=$(kind+'SettingsDialog');
  const ids=kind==='reading'?['readingText','readingQuestions','readingTopicCustom']:['listeningFocus','listeningQuestions','listeningTranscript'];
  const keys=kind==='reading'?['rcLength','rcTopic','readingQuestionCount','readingConfigured']:['listeningQuestionCount','listeningConfigured'];
  compDraft={kind,dialog,focus:document.activeElement,values:Object.fromEntries(ids.map(id=>[id,$(id).value])),state:Object.fromEntries(keys.map(key=>[key,state[key]])),config:JSON.parse(JSON.stringify(state.exerciseConfig)),source:{tab:state.zadaniTab,urls:state.urls.slice(),names:state.fileNames.slice(),files:fileObjects.slice()}};
  dialog.querySelector('.comp-error').textContent='';
  dialog.querySelector('.comp-context').textContent='Úroveň: '+(compCefrForPrompt()||'zvolíš v dalším kroku')+' · Věková skupina: '+(ageGroupLabel()||'zvolíš v dalším kroku')+'. AI návrh použije aktuální volby.';
  if(kind==='listening'){
    $('compListeningUrl').value=state.zadaniTab==='url'?(state.urls.find(u=>String(u).trim())||''):'';
    renderComprehensionSources();
  }
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  document.body.classList.add('comp-dialog-open');
  const first=dialog.querySelector('select,textarea,input,button');if(first)first.focus({preventScroll:true});
}
function renderComprehensionSources(){
  const el=$('compListeningSources');if(!el)return;
  el.textContent=state.zadaniTab==='file'&&fileObjects.length?'Přiložené soubory: '+fileObjects.map(f=>f.displayName).join(', '):state.zadaniTab==='url'?'Aktivní odkazy: '+state.urls.filter(Boolean).join(', '):'Vlož transkript, odkaz nebo nahrávku; zdroj uvidí jen učitel.';
}
function comprehensionAddListeningFiles(input){
  if(!input.files||!input.files.length)return;
  state.zadaniTab='file';handleFiles(input);$('compListeningUrl').value='';renderComprehensionSources();
}
function closeComprehensionDialog(save){
  const draft=compDraft;if(!draft)return;
  const {kind,dialog}=draft;
  if(save){
    const count=Number(state[kind+'QuestionCount']);
    let error='';
    if(!Number.isInteger(count)||count<1||count>30)error='Počet otázek musí být celé číslo od 1 do 30.';
    if(kind==='listening'){
      const url=trim('compListeningUrl');
      if(url){
        try{const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))throw new Error();}
        catch(_){error='Vlož platný odkaz začínající https:// nebo http://.';}
      }
      if(!error&&url){state.urls=[url];state.zadaniTab='url';}
      if(!error&&!hasListeningSource())error='Doplň nahrávku, odkaz nebo transkript poslechu.';
      if(!error&&areFileReadsPending())error='Počkej na dokončení načítání souboru.';
    }
    if(error){dialog.querySelector('.comp-error').textContent=error;return;}
    state[kind+'Configured']=true;
  }else{
    Object.assign(state,draft.state);state.exerciseConfig=draft.config;
    Object.entries(draft.values).forEach(([id,value])=>setVal(id,value));
    state.zadaniTab=draft.source.tab;state.urls=draft.source.urls;state.fileNames=draft.source.names;fileObjects=draft.source.files;
    (kind==='reading'?rcAiDismiss:liAiDismiss)();
  }
  compDraft=null;
  if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  document.body.classList.remove('comp-dialog-open');
  applyVisualState();validate();saveSnapshot();
  if(draft.focus&&draft.focus.isConnected)draft.focus.focus({preventScroll:true});
}
