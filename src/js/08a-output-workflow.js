// Canonical generation plan and transactional output helpers.
// Budgets are conservative application estimates, NOT a provider/model guarantee.
const GENERATION_ITEM_TOKENS=Object.freeze({'multiple choice':180,'multi-select':240,'matching':100,'ordering':250,'highlight-evidence':420,'categorisation-board':900,'table-completion':650,'transformation-chain':650,'error-tagging':330,'cloze text':650,'reading comprehension':220,'listening comprehension':350});
let outputMutationBusy=false;
let generationUiLocked=[];
function generationPlan(st){
  const specs=buildExerciseSpecs(st), groups=getApiDiffGroups(st), factor=Math.max(1,groups.length);
  if(!specs.length||specs.length>10)throw new Error('Test mus\u00ed obsahovat 1 a\u017e 10 cvi\u010den\u00ed.');
  if(!st.exerciseDetail&&sanitizeExerciseTypeList(st.typyCviceni||[]).length>specs.length)throw new Error('Po\u010det cvi\u010den\u00ed je men\u0161\u00ed ne\u017e po\u010det vybran\u00fdch typ\u016f.');
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
    const complex=isManualSupported(s.style)||s.type==='reading comprehension'||s.type==='listening comprehension'||s.type==='cloze text';
    if(st.splitGenerate||complex||costs[i]>3500){flush();batches.push([i]);}
    else {if(cost+costs[i]>3500)flush();pending.push(i);cost+=costs[i];}
  });flush();
  return {specs,config,batches,costs,estimatedTokens:costs.reduce((a,b)=>a+b,0),groups:factor,manual:config.filter(x=>x.manualMode).length,maxLogicalCalls:batches.length*2,maxCalls:batches.length*8};
}
function lockGenerationInputs(lock){
  if(lock){generationUiLocked=[];document.querySelectorAll('main button, main input, main select, main textarea').forEach(el=>{if(el.id==='btnCancelGen')return;generationUiLocked.push([el,el.disabled]);el.disabled=true;});}
  else {generationUiLocked.forEach(([el,disabled])=>{if(el.isConnected)el.disabled=disabled;});generationUiLocked=[];if(typeof validate==='function')validate();if(typeof updateSecureDownloadGate==='function')updateSecureDownloadGate();}
}
function outputStamp(){return lastAssembled;}
function requireOutputStamp(stamp){if(!stamp||lastAssembled!==stamp)throw new Error('Test se mezit\u00edm zm\u011bnil. Spus\u0165 kontrolu znovu nad aktu\u00e1ln\u00ed verz\u00ed.');}
function outputEditState(){return JSON.parse(JSON.stringify(lastAssembled&&lastAssembled.sourceState||state));}
async function commitAnswerData(data,stamp,sourceState){
  requireOutputStamp(stamp);
  if(outputMutationBusy)throw new Error('Pr\u00e1v\u011b prob\u00edh\u00e1 jin\u00e1 \u00faprava testu.');
  outputMutationBusy=true;
  const previous={assembled:lastAssembled,data:lastGenData,html:generatedTestHtml,pack:generatedPackage,integrity:generatedIntegrity,checklist:exportChecklist,selfTest:lastSelfTest,gaps:secureGapsAcknowledged,diffs:keyDiffsAcknowledged};
  try{
    const built=await assembleTestHtml(sourceState||outputEditState(),data);
    if(built&&built.mode==='secureOffline')await validateSecurePackageSmoke(built);else await validateGeneratedHtmlSmoke(String(built||''));
    generatedPackage=built&&built.mode==='secureOffline'?built:null;
    generatedTestHtml=generatedPackage?'':String(built||'');lastGenData=data;
    generatedIntegrity=null;generatedIntegrity=integrityDataForCurrentOutput();
    if(generatedIntegrity&&generatedTestHtml)generatedIntegrity.studentHtmlSha256=await sha256HexText(generatedTestHtml);
    exportChecklist={};lastSelfTest=null;secureGapsAcknowledged=false;keyDiffsAcknowledged=false;
    resetKeyCheckState();resetVerificationReports();renderExportChecklist(true);renderQualityDiagnostics();updateSecureDownloadGate();
    return true;
  }catch(error){lastAssembled=previous.assembled;lastGenData=previous.data;generatedTestHtml=previous.html;generatedPackage=previous.pack;generatedIntegrity=previous.integrity;exportChecklist=previous.checklist;lastSelfTest=previous.selfTest;secureGapsAcknowledged=previous.gaps;keyDiffsAcknowledged=previous.diffs;throw error;}
  finally{outputMutationBusy=false;}
}
function resultStep(n,focus){
  document.querySelectorAll('[data-result-step]').forEach(b=>{const selected=Number(b.dataset.resultStep)===n;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected&&focus)b.focus();});
  document.querySelectorAll('[data-result-panel]').forEach(p=>p.classList.toggle('hidden',Number(p.dataset.resultPanel)!==n));
}
function resultStepKey(event,n){let next=n;if(event.key==='ArrowRight')next=n%4+1;else if(event.key==='ArrowLeft')next=(n+2)%4+1;else if(event.key==='Home')next=1;else if(event.key==='End')next=4;else return;event.preventDefault();resultStep(next,true);}
function renderResultSteps(){
  const secure=isSecurePackage(), complete=[secure?teacherReviewSatisfied():!!exportChecklist.preview,!!(lastSelfTest&&lastSelfTest.ok),!!lastKeyCheck,secureDownloadAllowed()];
  const heading=$('genResultTitle');if(heading)heading.textContent=secure&&!secureDownloadAllowed()?'Test vytvořen — dokončete povinné kontroly':'Test vytvořen — zkontrolujte obsah a stáhněte soubory';
  document.querySelectorAll('[data-result-step]').forEach(b=>{const i=Number(b.dataset.resultStep)-1;const status=b.querySelector('.result-step-status');if(!status)return;status.textContent=i===2?'Voliteln\u00e9':i===3?(complete[i]?'Lze st\u00e1hnout':'Zat\u00edm uzam\u010deno'):((secure?'Povinn\u00e9':'Doporu\u010den\u00e9')+(complete[i]?' \u00b7 hotovo':''));b.classList.toggle('is-complete',complete[i]);});
}
function renderGenerationEstimate(){
  const el=$('generationEstimate');if(!el)return;
  try{const p=generationPlan(state);el.textContent=p.specs.length+' cvi\u010den\u00ed \u00b7 '+p.specs.reduce((n,s)=>n+s.count,0)+' polo\u017eek \u00b7 '+p.groups+' variant(a) \u00b7 '+p.batches.length+' pl\u00e1novan\u00fdch AI po\u017eadavk\u016f'+(p.manual?' + '+p.manual+' ru\u010dn\u00edch cvi\u010den\u00ed':'')+'. Nejv\u00fd\u0161e '+p.maxCalls+' vol\u00e1n\u00ed v\u010detn\u011b opravy obsahu a transportn\u00edch opakov\u00e1n\u00ed (p\u0159\u00edm\u00e9 API). Jde o pl\u00e1n, nikoli z\u00e1ruku v\u00fdsledku AI.';el.className='small-muted';}
  catch(error){el.textContent=error.message;el.className='warn-box';}
}

function boundedReviewBatches(items,lengthOf){
  const out=[];let batch=[],size=0;
  for(const item of items){const length=lengthOf(item);if(length>24000)throw new Error('Jedna \u00faloha je pro dopl\u0148kovou AI kontrolu p\u0159\u00edli\u0161 dlouh\u00e1. Zkontroluj ji ru\u010dn\u011b v editoru.');if(batch.length&&(batch.length>=12||size+length>24000)){out.push(batch);batch=[];size=0;}batch.push(item);size+=length;}
  if(batch.length)out.push(batch);return out;
}
