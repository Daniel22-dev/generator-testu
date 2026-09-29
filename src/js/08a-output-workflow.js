// Canonical generation plan and transactional output helpers.
// Budgets are conservative application estimates, NOT a provider/model guarantee.
const GENERATION_ITEM_TOKENS=Object.freeze({'multiple choice':180,'multi-select':240,'matching':100,'ordering':250,'highlight-evidence':420,'categorisation-board':900,'table-completion':650,'transformation-chain':650,'error-tagging':330,'cloze text':650,'reading comprehension':220,'listening comprehension':350});
let outputMutationBusy=false;
let generationUiLocked=[];
function generationPlan(st){
  const specs=buildExerciseSpecs(st), groups=getApiDiffGroups(st), factor=Math.max(1,groups.length);
  if(!specs.length||specs.length>10)throw new Error('Test mus\u00ed obsahovat 1 a\u017e 10 cvi\u010den\u00ed.');
  if(!st.exerciseDetail&&sanitizeExerciseTypeList(st.typyCviceni||[]).length!==specs.length)throw new Error('Po\u010det cvi\u010den\u00ed se neshoduje s po\u010dtem vybran\u00fdch typ\u016f.');
  if(!st.exerciseDetail&&Number(st.body)<specs.length)throw new Error('Celkov\u00fd po\u010det bod\u016f mus\u00ed b\u00fdt alespo\u0148 po\u010det cvi\u010den\u00ed.');
  const config=specs.map((s,i)=>{
    const old=st.exerciseDetail&&st.exerciseConfig?st.exerciseConfig[i]:null;
    const rawCount=old?Number(old.pocetOtazek):s.count;
    if(!Number.isInteger(rawCount)||rawCount<1||rawCount>30)throw new Error('Cvi\u010den\u00ed '+(i+1)+': podporov\u00e1no je 1 a\u017e 30 polo\u017eek.');
    if(s.type==='matching'&&s.count<2)throw new Error('P\u00e1rov\u00e1n\u00ed pot\u0159ebuje alespo\u0148 dva p\u00e1ry.');
    if(old&&(!Number.isInteger(Number(old.body))||Number(old.body)<1||Number(old.body)>999))throw new Error('Cvi\u010den\u00ed '+(i+1)+': body mus\u00ed b\u00fdt v rozsahu 1\u2013999.');
    return Object.assign({},old||{},{typ:s.style,pocetOtazek:s.count,body:s.pts,manualMode:!!(old&&old.manualMode&&isManualSupported(s.style))});
  });
  const costs=specs.map(s=>factor*(300+s.count*(GENERATION_ITEM_TOKENS[s.type]||180)+(s.type==='reading comprehension'?900:0)));
  const batches=[];let pending=[],cost=0;
  const flush=()=>{if(pending.length)batches.push(pending);pending=[];cost=0;};
  specs.forEach((s,i)=>{
    if(config[i].manualMode)return;
    if(costs[i]>12000)throw new Error('Cvi\u010den\u00ed '+(i+1)+' ('+s.style+') je p\u0159\u00edli\u0161 rozs\u00e1hl\u00e9 pro jeden bezpe\u010dn\u011b pl\u00e1novan\u00fd po\u017eadavek. Sni\u017e po\u010det polo\u017eek nebo skupin. Odhad '+costs[i]+' v\u00fdstupn\u00edch token\u016f; aplika\u010dn\u00ed rozpo\u010det je 12000.');
    const batchBudget=6000,complex=['reading comprehension','listening comprehension','cloze text'].includes(s.type);
    if(st.splitGenerate||complex||costs[i]>batchBudget){flush();batches.push([i]);}
    else {if(cost+costs[i]>batchBudget)flush();pending.push(i);cost+=costs[i];}
  });flush();
  const sourceAnalysisCalls = specs.some(s=>s.type==='reading comprehension')
    && typeof activeSourceMaterialPresent==='function' && activeSourceMaterialPresent() ? 1 : 0;
  const plannedAiCalls = batches.length + sourceAnalysisCalls;
  return {specs,config,batches,costs,estimatedTokens:costs.reduce((a,b)=>a+b,0),groups:factor,manual:config.filter(x=>x.manualMode).length,sourceAnalysisCalls,plannedAiCalls,maxLogicalCalls:plannedAiCalls*2,maxCalls:plannedAiCalls*8};
}
function lockGenerationInputs(lock){
  if(lock){generationUiLocked=[];document.querySelectorAll('main button, main input, main select, main textarea').forEach(el=>{if(el.id==='btnCancelGen')return;generationUiLocked.push([el,el.disabled]);el.disabled=true;});}
  else {generationUiLocked.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;});generationUiLocked=[];if(typeof validate==='function')validate();if(typeof updateSecureDownloadGate==='function')updateSecureDownloadGate();}
}
function outputStamp(){return lastAssembled;}
function requireOutputStamp(stamp){if(!stamp||lastAssembled!==stamp)throw new Error('Test se mezit\u00edm zm\u011bnil. Spus\u0165 kontrolu znovu nad aktu\u00e1ln\u00ed verz\u00ed.');}
function outputEditState(){return JSON.parse(JSON.stringify(lastAssembled&&lastAssembled.sourceState||state));}
// Jediné místo, kde se mění hotový test. Pravidla stavu:
// • učitelská kontrola (exportChecklist) se u téhož testu zachovává;
// • technické výsledky (self-test, potvrzené mezery) se invalidují a učitel vidí proč;
// • nevyřešené rozdíly z AI ověření klíče se NEZAHAZUJÍ, dokud se klíč dotčené položky
//   nezmění nebo o nich učitel výslovně nerozhodne (opts.keyResolution);
// • opts.freshArtifact (nová varianta) = nový test, nic se nepřenáší.
async function commitAnswerData(data,stamp,sourceState,opts){
  opts=opts||{};
  requireOutputStamp(stamp);
  if(outputMutationBusy)throw new Error('Pr\u00e1v\u011b prob\u00edh\u00e1 jin\u00e1 \u00faprava testu.');
  outputMutationBusy=true;
  const previous={assembled:lastAssembled,data:lastGenData,html:generatedTestHtml,pack:generatedPackage,integrity:generatedIntegrity,checklist:exportChecklist,selfTest:lastSelfTest,gaps:secureGapsAcknowledged,diffs:keyDiffsAcknowledged,keyCheck:lastKeyCheck,stale:selfTestStaleReason},keepChecklist=exportChecklist;
  try{
    const review=previous.keyCheck&&!opts.freshArtifact?await ghrabGeneratorFeatureLoader('previewEditor','./features/preview-editor.js'):null;
    const built=await assembleTestHtml(sourceState||outputEditState(),data);
    if(built&&built.mode==='secureOffline')await validateSecurePackageSmoke(built);else await validateGeneratedHtmlSmoke(String(built||''));
    generatedPackage=built&&built.mode==='secureOffline'?built:null;
    generatedTestHtml=generatedPackage?'':String(built||'');lastGenData=data;
    generatedIntegrity=null;generatedIntegrity=integrityDataForCurrentOutput();
    if(generatedIntegrity&&generatedTestHtml)generatedIntegrity.studentHtmlSha256=await sha256HexText(generatedTestHtml);
    exportChecklist=keepChecklist;lastSelfTest=null;secureGapsAcknowledged=false;
    resetKeyCheckState();
    if(review){const next=review.keyCheckAfterCommit(previous.keyCheck,previous.diffs,previous.data,data,opts.keyResolution);lastKeyCheck=next.check;keyDiffsAcknowledged=next.ack;}
    selfTestStaleReason=previous.selfTest||previous.stale?(opts.reason||'Test se změnil.'):'';
    resetVerificationReports();renderSelfTestStaleNote();renderExportChecklist(true);renderQualityDiagnostics();updateSecureDownloadGate();
    if(review)review.renderKeyCheckAfterCommit(opts.note||'');
    const stale=document.querySelectorAll('#answerProposalReport .en-pick:not(:disabled),#btnAcceptProposals');
    if(stale.length){stale.forEach(e=>e.disabled=true);const st=$('enApplyStatus');if(st)st.textContent='Test se změnil; tyto návrhy už nejde použít. Požádej o nové.';}
    return true;
  }catch(error){lastAssembled=previous.assembled;lastGenData=previous.data;generatedTestHtml=previous.html;generatedPackage=previous.pack;generatedIntegrity=previous.integrity;exportChecklist=previous.checklist;lastSelfTest=previous.selfTest;secureGapsAcknowledged=previous.gaps;keyDiffsAcknowledged=previous.diffs;lastKeyCheck=previous.keyCheck;selfTestStaleReason=previous.stale;throw error;}
  finally{outputMutationBusy=false;}
}
function resultStep(n,focus){
  document.querySelectorAll('[data-result-step]').forEach(b=>{const selected=Number(b.dataset.resultStep)===n;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected&&focus)b.focus();});
  document.querySelectorAll('[data-result-panel]').forEach(p=>p.classList.toggle('hidden',Number(p.dataset.resultPanel)!==n));
}
function resultStepKey(event,n){let next=n;if(event.key==='ArrowRight')next=n%4+1;else if(event.key==='ArrowLeft')next=(n+2)%4+1;else if(event.key==='Home')next=1;else if(event.key==='End')next=4;else return;event.preventDefault();resultStep(next,true);}
function renderResultSteps(){
  renderSettingsDrift();
  const secure=isSecurePackage(), complete=[secure?teacherReviewSatisfied():!!exportChecklist.preview,!!(lastSelfTest&&lastSelfTest.ok),!!lastKeyCheck,secureDownloadAllowed()];
  const heading=$('genResultTitle');if(heading)heading.textContent=secure&&!secureDownloadAllowed()?'Test vytvořen — dokončete povinné kontroly':'Test vytvořen — zkontrolujte obsah a stáhněte soubory';
  const keyPending=!!(lastKeyCheck&&lastKeyCheck.closedDiffs>0&&!keyDiffsAcknowledged);
  complete[2]=!!lastKeyCheck&&!keyPending&&!lastKeyCheck.olderVersion&&!lastKeyCheck.incomplete;
  const stepStatus=i=>{
    if(i===2)return keyPending?'\u010cek\u00e1 na tv\u00e9 rozhodnut\u00ed':(lastKeyCheck&&lastKeyCheck.olderVersion?'Voliteln\u00e9 \u00b7 star\u0161\u00ed verze':lastKeyCheck&&lastKeyCheck.incomplete?'Voliteln\u00e9 \u00b7 ne\u00fapln\u00e9':'Voliteln\u00e9'+(complete[2]?' \u00b7 hotovo':''));
    if(i===3)return complete[3]?'Lze st\u00e1hnout':'Zat\u00edm uzam\u010deno';
    if(i===1&&!complete[1]&&selfTestStaleReason)return (secure?'Povinn\u00e9':'Doporu\u010den\u00e9')+' \u00b7 spustit znovu';
    return (secure?'Povinn\u00e9':'Doporu\u010den\u00e9')+(complete[i]?' \u00b7 hotovo':'');
  };
  document.querySelectorAll('[data-result-step]').forEach(b=>{const i=Number(b.dataset.resultStep)-1;const status=b.querySelector('.result-step-status');if(!status)return;status.textContent=stepStatus(i);b.classList.toggle('is-complete',complete[i]);b.classList.toggle('is-attention',i===2&&keyPending);});
}
function renderGenerationEstimate(){
  const el=$('generationEstimate');if(!el)return;
  try{const p=generationPlan(state);el.textContent=p.specs.length+' cvi\u010den\u00ed \u00b7 '+p.specs.reduce((n,s)=>n+s.count,0)+' polo\u017eek \u00b7 '+p.groups+' variant(a) \u00b7 '+p.plannedAiCalls+' pl\u00e1novan\u00fdch AI po\u017eadavk\u016f'+(p.sourceAnalysisCalls?' (v\u010detn\u011b anal\u00fdzy zdroje pro Reading)':'')+(p.manual?' + '+p.manual+' ru\u010dn\u00edch cvi\u010den\u00ed':'')+'. Nejv\u00fd\u0161e '+p.maxCalls+' vol\u00e1n\u00ed v\u010detn\u011b opravy obsahu a transportn\u00edch opakov\u00e1n\u00ed (p\u0159\u00edm\u00e9 API). Jde o pl\u00e1n, nikoli z\u00e1ruku v\u00fdsledku AI.';el.className='small-muted';}
  catch(error){el.textContent=error.message;el.className='warn-box';}
}

function boundedReviewBatches(items,lengthOf){
  const out=[];let batch=[],size=0;
  for(const item of items){const length=lengthOf(item);if(length>24000)throw new Error('Jedna \u00faloha je pro dopl\u0148kovou AI kontrolu p\u0159\u00edli\u0161 dlouh\u00e1. Zkontroluj ji ru\u010dn\u011b v editoru.');if(batch.length&&(batch.length>=12||size+length>24000)){out.push(batch);batch=[];size=0;}batch.push(item);size+=length;}
  if(batch.length)out.push(batch);return out;
}

// Nastavení změněné po vygenerování se do hotového testu samo nepropíše. Učitel to musí
// vidět u stažení a u změn bez vlivu na obsah je může použít bez nového AI generování.
const DRIFT_SETTINGS=[['body','body'],['cas','čas'],['gradeTyp','stupnice'],['testMode','účel testu'],['resultMode','způsob výsledku'],['identityMode','identita studenta'],['feedbackMode','zpětná vazba'],['layout','rozložení'],['randomizace','pořadí otázek'],['tema','vzhled'],['zolicek','žolík'],['fuzzyTolerance','tolerance překlepů'],['odevzdavani','odevzdávání'],['screenGuard','hlídání obrazovky']];
const DRIFT_FIELDS=[['nazev','název'],['proKoho','pro koho'],['vlastniSkala','stupnice'],['ucitelJmeno','jméno učitele'],['ucitelPin','učitelský kód']];
const DRIFT_CONTENT=['jazyk','instrJazyk','uroven','kombinovat','diferencovany','skupiny','sourceUseMode'];
function settingsDrift(){
  const src=lastAssembled&&lastAssembled.sourceState;if(!src||!lastGenData||window.__GHRAB_GENERATOR_WORKFLOW_ID__)return null;
  const same=(a,b)=>JSON.stringify(a==null?null:a)===JSON.stringify(b==null?null:b),out=new Set();
  DRIFT_SETTINGS.forEach(([k,l])=>{if(!same(src[k],state[k]))out.add(l);});
  DRIFT_FIELDS.forEach(([id,l])=>{if(String((src.__outputFields||{})[id]||'')!==trim(id))out.add(l);});
  let content=DRIFT_CONTENT.some(k=>!same(src[k],state[k]))||['latka','zadaniText','poznamky'].some(id=>String((src.__outputFields||{})[id]||'')!==trim(id));
  try{const now=generationPlan(state),was=buildExerciseSpecs(src);if(now.specs.map(x=>x.type).join()!==was.map(x=>x.type).join())content=true;else if(now.config.map(c=>c.body).join()!==was.map(x=>x.pts).join())out.add('body');}catch(_){content=true;}
  return out.size||content?{settings:[...out],content}:null;
}
function renderSettingsDrift(){
  const el=$('settingsDriftBanner');if(!el)return;const d=settingsDrift();
  if(!d){el.classList.add('hidden');el.textContent='';return;}
  el.classList.remove('hidden');
  el.innerHTML=d.content?'⚠️ <b>Obsah zadání se od vytvoření testu změnil.</b> Stažený test odpovídá původnímu zadání; pro nový obsah test vytvoř znovu.'
    :'⚠️ <b>Po vytvoření testu jsi změnil(a): '+esc(d.settings.join(', '))+'.</b> Stažený test má zatím původní nastavení. <button type="button" class="gate-run-btn" onclick="applySettingsWithoutAi()">Použít nové nastavení (bez AI)</button>';
}
async function applySettingsWithoutAi(){
  const d=settingsDrift();if(!d||d.content||outputMutationBusy)return;
  const st=JSON.parse(JSON.stringify(state)),plan=generationPlan(st),v=lastGenData.group_variants?Object.values(lastGenData.group_variants)[0]:lastGenData,exs=(Array.isArray(v)?v:v.exercises)||[];
  st.exerciseDetail=true;st.pocet=plan.config.length;st.exerciseConfig=plan.config.map((c,i)=>Object.assign({},c,{pocetOtazek:exs[i]&&exs[i].items?exs[i].items.length:c.pocetOtazek}));
  try{await commitAnswerData(JSON.parse(JSON.stringify(lastGenData)),outputStamp(),st,{reason:'Změnilo se nastavení testu ('+d.settings.join(', ')+').'});
    if(d.settings.some(x=>x==='body'||x==='stupnice')){exportChecklist.grading=false;renderExportChecklist();updateSecureDownloadGate();}
  }catch(e){const g=$('genError');if(g){g.classList.remove('hidden');setErrorTextWithHttpHelp(g,'Nastavení se nepodařilo použít: '+(e&&e.message||e));}}
  renderSettingsDrift();
}
