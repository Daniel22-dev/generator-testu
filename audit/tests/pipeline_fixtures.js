window.auditProviderInstall=function(){
 const original=buildContentPrompt;
 buildContentPrompt=function(st,notes){window.__requestState=JSON.parse(JSON.stringify(st));const prompt=original(st,notes);window.__lastPrompt=prompt;return prompt;};
 window.__calls=[];window.__providerBehavior='valid';
 genAiAvailable=()=>true;
 callGeminiJSON=async function(prompt,parts,options){
   __calls.push({state:JSON.parse(JSON.stringify(__requestState)),prompt,options});
   if(__providerBehavior==='throw')throw new Error('Audit provider failure');
   if(__providerBehavior==='invalid'||__providerBehavior==='repair'&&__calls.length===1)return {exercises:[]};
   if(__providerBehavior==='cancel'){geminiCancelRequested=true;throw new Error('cancelled');}
   return auditFixtures(__requestState,getUiLang('target',__requestState.jazyk));
 };
};
window.auditReset=function(types,mode,lang){
 auditConfigure(types||['multiple choice'],mode||'instant',lang||'en');
 Object.assign(state,{zadaniTab:'text',zadaniText:'Use the supplied language topic. '+('Source sentence. '.repeat(10)),urls:[],fileNames:[],gradeTyp:'skola'});
 for(const id of ['ageGroupCustom','testPurpose','vlastniTyp','vlastniSkala'])if($(id))$(id).value='';
 if($('zadaniText'))$('zadaniText').value=state.zadaniText;
 __calls=[];__providerBehavior='valid';
 applyVisualState();validate();goTo(4);
 return {gates:[0,1,2,3].map(n=>$('next'+n).disabled),state};
};
