import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { webcrypto } from 'node:crypto';

const target = process.argv[2] || 'dist/index.html';
let html = fs.readFileSync(target, 'utf8');
html = html
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/, '')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g, '')
  .replace('<body>', '<body><script>window.__GHRAB_STUDIO_ACCESS__={appId:"generator",permit:{sub:"TEST",displayName:"Test",role:"admin",apps:["*"],iat:1,exp:4102444800,jti:"workflow"}};<\/script>');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'https://daniel22-dev.github.io/generator-testu/',
  pretendToBeVisual: true,
  beforeParse(w) {
    if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
    w.matchMedia = w.matchMedia || (q => ({ matches:false, media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    if (w.HTMLAnchorElement) w.HTMLAnchorElement.prototype.click = () => {};
    w.URL.createObjectURL = () => 'blob:workflow';
    w.URL.revokeObjectURL = () => {};
    w.fetch = async () => { throw new Error('network disabled'); };
  }
});
const w = dom.window;
await new Promise(r => setTimeout(r, 1200));
let failed = 0, passed = 0;
function ok(name, fn){
  try { const detail=fn(); passed++; console.log('PASS', name, detail===undefined?'':'→ '+detail); }
  catch(e){ failed++; console.log('FAIL', name, '—', e.message); }
}
async function okAsync(name, fn){
  try { const detail=await fn(); passed++; console.log('PASS', name, detail===undefined?'':'→ '+detail); }
  catch(e){ failed++; console.log('FAIL', name, '—', e.message); }
}
function assert(cond,msg){ if(!cond) throw new Error(msg); }
function setVal(id,v){ const el=w.document.getElementById(id); if(!el) throw new Error('chybí #'+id); el.value=v; }
function resetBase(){
  w.eval(`Object.assign(state,{appMode:'advanced',workPreset:'advanced',simpleTemplate:'',jazyk:'angličtina',instrJazyk:'target',uroven:['B1'],kombinovat:false,pocet:3,typyCviceni:['multiple choice'],exerciseDetail:false,exerciseConfig:[],body:30,gradeTyp:'skola',odevzdavani:'B',testMode:'bezny',resultMode:'instant',feedbackMode:'brief',identityMode:'name',randomizace:'NE',layout:'tabs',zolicek:'NE',diferencovany:'NE',skupiny:[],screenGuard:false,cas:30,fileNames:[],urls:[''],aiGradeScale:null,aiGradeRaw:''}); rosterEntries=[];`);
  setVal('nazev','Workflow test'); setVal('proKoho','1.A'); setVal('latka','Present simple');
  setVal('vlastniTyp',''); setVal('vlastniSkala','');
  setVal('listeningTranscript',''); setVal('ucitelJmeno','Daniel Teacher');
  setVal('ucitelPin','X8p!Teacher'); setVal('heslo','Strong-Unlock-2026!'); setVal('bezpKod','');
  w.eval("Access.profile={role:'admin',userId:'TEST',displayName:'Test',status:'active'}; Access.granted=true;");
  w.enforceModeConstraints(); w.applyVisualState(); w.validate();
}

console.log('=== workflow-matrix-check:', target, '===');

// 1) Úplný kartézský součin režimových voleb. Každý vstup se normalizuje a musí splnit invarianty.
const domains={
  appMode:['simple','advanced'], testMode:['bezny','procviceci','prisny'], resultMode:['instant','secureOffline'],
  feedbackMode:['none','brief','learning'], odevzdavani:['A','B'], zolicek:['NE','ANO'], screenGuard:[false,true], diferencovany:['NE','ANO']
};
let matrixCount=0;
for(const appMode of domains.appMode)for(const testMode of domains.testMode)for(const resultMode of domains.resultMode)
for(const feedbackMode of domains.feedbackMode)for(const odevzdavani of domains.odevzdavani)for(const zolicek of domains.zolicek)
for(const screenGuard of domains.screenGuard)for(const diferencovany of domains.diferencovany){
  w.eval(`Object.assign(state,${JSON.stringify({appMode,workPreset:appMode==='simple'?'quick':'advanced',simpleTemplate:'',testMode,resultMode,feedbackMode,odevzdavani,zolicek,screenGuard,diferencovany,jazyk:'angličtina'})});`);
  w.enforceModeConstraints();
  const s=JSON.parse(w.eval('JSON.stringify(state)'));
  assert(!(s.testMode==='prisny'&&s.resultMode!=='secureOffline'),'přísný bez verifieru');
  assert(!(s.resultMode==='secureOffline'&&s.odevzdavani!=='B'),'secureOffline + průběžné odevzdání');
  assert(!(s.resultMode==='secureOffline'&&s.feedbackMode!=='none'),'secureOffline + aktivní okamžitá ZV');
  assert(!(s.testMode==='procviceci'&&s.resultMode!=='instant'),'procvičování bez instant výsledku');
  assert(!(s.testMode==='procviceci'&&s.feedbackMode!=='learning'),'procvičování bez učící ZV');
  assert(!(s.testMode==='procviceci'&&s.zolicek==='ANO'),'procvičování se žolíkem');
  assert(!(s.feedbackMode==='none'&&s.odevzdavani==='A'),'průběžné uzamčení bez ZV');
  assert(!(s.diferencovany==='ANO'&&s.appMode==='simple'),'diferenciace zůstala v simple');
  matrixCount++;
}
ok('kartézská matice režimů bez rozporu',()=>matrixCount+' kombinací');

// 2) Všech sedm šablon v obou režimech.
let tplCount=0;
for(const mode of ['simple','advanced']){
  for(const [lang,ids] of [['angličtina',['fl_practice','fl_homework','fl_graded_quick','fl_strict']],['čeština',['cs_practice','cs_text','cs_strict']]]){
    for(const id of ids){
      w.eval(`Object.assign(state,{appMode:'${mode}',workPreset:'${mode==='simple'?'quick':'advanced'}',jazyk:'${lang}',simpleTemplate:''}); chooseSimpleTemplate('${id}');`);
      const s=JSON.parse(w.eval('JSON.stringify(state)'));
      assert(s.simpleTemplate===id,'šablona se neaktivovala: '+id);
      assert(!(s.testMode==='prisny'&&s.resultMode!=='secureOffline'),'šablona '+id+' porušila strict invariant');
      assert(!(s.testMode==='procviceci'&&(s.feedbackMode!=='learning'||s.resultMode!=='instant')),'šablona '+id+' porušila practice invariant');
      tplCount++;
    }
  }
}
ok('šablony v simple i advanced',()=>tplCount+' průchodů');

// 3) Karta Bez šablony musí opravdu otevřít ruční režim.
resetBase();
w.eval("state.appMode='simple';state.workPreset='quick';state.simpleTemplate='fl_practice';applyTemplateValues('fl_practice');");
w.clearSimpleTemplate();
ok('Bez šablony přepne simple → advanced',()=>{assert(w.eval("state.appMode==='advanced'&&state.simpleTemplate===''"),'nepřepnuto');});

// 4) Vizuální aktivace/deaktivace pro všechny zásadní závislosti.
let uiCases=0;
for(const testMode of domains.testMode)for(const resultMode of domains.resultMode)for(const feedbackMode of domains.feedbackMode){
  resetBase(); w.eval(`Object.assign(state,${JSON.stringify({testMode,resultMode,feedbackMode})}); enforceModeConstraints(); applyVisualState();`);
  const s=JSON.parse(w.eval('JSON.stringify(state)'));
  const varA=w.document.getElementById('varA');
  assert(varA.disabled===((s.resultMode==='secureOffline')||s.feedbackMode==='none'),'nesedí disabled varA');
  const instant=w.document.querySelector('#resultModeBtns [data-val="instant"]');
  assert(instant.disabled===(s.testMode==='prisny'),'nesedí disabled instant');
  const jokerYes=w.document.querySelector('#zolicekBtns [data-val="ANO"]');
  assert(jokerYes.disabled===(s.testMode==='procviceci'),'nesedí disabled žolík');
  uiCases++;
}
ok('UI závislosti režim × výsledek × feedback',()=>uiCases+' stavů');

// 5) Kapacita typů a listening source gate.
resetBase();
const eleven=['multiple choice','true/false','matching','fill-in-the-blank','word order','translation','error correction','word formation','sentence transformation','reading comprehension','dialogue completion'];
w.eval(`state.typyCviceni=${JSON.stringify(eleven)};state.pocet=10;`); w.validate();
ok('11 různých typů je zablokováno',()=>{assert(w.document.getElementById('next1').disabled,'next1 není disabled');assert(/nejvýše 10/.test(w.document.getElementById('validHint1').textContent),'chybí vysvětlení');});
resetBase(); w.eval("state.typyCviceni=['listening comprehension'];state.pocet=1;"); w.validate();
ok('listening bez zdroje je zablokován',()=>{assert(w.document.getElementById('next1').disabled,'bez zdroje prošel');});
setVal('listeningTranscript','This is the listening script.'); w.validate();
ok('listening s transkriptem projde',()=>{assert(!w.document.getElementById('next1').disabled,'transkript nebyl uznán');});

// 6) Vlastní stupnice: plné pokrytí ano, mezera/překryv ne.
function gradeCase(text){resetBase();w.eval("state.gradeTyp='vlastni';state.odevzdavani='B';state.body=100;");setVal('vlastniSkala',text);w.validate();return !w.document.getElementById('next2').disabled;}
ok('úplná vlastní stupnice projde',()=>{assert(gradeCase('1 = 88-100 %\n2 = 74-87 %\n3 = 59-73 %\n4 = 44-58 %\n5 = 0-43 %'),'úplná stupnice blokována');});
ok('mezera ve stupnici je zablokována',()=>{assert(!gradeCase('1 = 88-100 %\n2 = 74-87 %\n4 = 44-58 %\n5 = 0-43 %'),'mezera prošla');});
ok('překryv stupnice je zablokován',()=>{assert(!gradeCase('1 = 88-100 %\n2 = 74-90 %\n3 = 59-73 %\n4 = 44-58 %\n5 = 0-43 %'),'překryv prošel');});

// 7) Diferenciace: úplnost, duplicity a 1:1 vazba na roster.
function setGroups(groups,identity='name',roster=[]){resetBase();w.eval(`state.diferencovany='ANO';state.identityMode='${identity}';state.skupiny=${JSON.stringify(groups)};rosterEntries=${JSON.stringify(roster)};`);w.validate();return {enabled:!w.document.getElementById('next3').disabled,hint:w.document.getElementById('validHint3').textContent};}
const g1={id:1,nazev:'A',podminky:'Více opory',studenti:['STU-1']},g2={id:2,nazev:'B',podminky:'Vyšší náročnost',studenti:['STU-2']};
ok('unikátní identifikátory skupin projdou',()=>{assert(setGroups([g1,g2]).enabled,'platné skupiny blokovány');});
ok('duplicitní student ve skupinách je zablokován',()=>{const r=setGroups([g1,{...g2,studenti:['STU-1']}]);assert(!r.enabled,'duplicita prošla');assert(/více skupin/.test(r.hint),'chybí zpráva');});
const roster=[{email:'a@school.cz',label:'a',code:'ABC234'},{email:'b@school.cz',label:'b',code:'DEF567'}];
ok('oneTimeCode + přesná 1:1 vazba rosteru projde',()=>{assert(setGroups([{...g1,studenti:['ABC234']},{...g2,studenti:['DEF567']}],'oneTimeCode',roster).enabled,'platný roster blokován');});
ok('oneTimeCode + neznámý nebo chybějící kód je zablokován',()=>{const r=setGroups([{...g1,studenti:['ABC234']},{...g2,studenti:['UNKNOWN']}],'oneTimeCode',roster);assert(!r.enabled,'nesoulad rosteru prošel');assert(/nejsou mezi|nejsou přiřazeny/.test(r.hint),'chybí zpráva');});

// 8) Všechny podporované typy samostatně i ve všech dvojicích.
const supportedTypes=Array.from(w.eval('ALL_TYPES'));
let singleTypes=0,pairTypes=0;
for(const t of supportedTypes){
  resetBase();
  w.eval(`state.typyCviceni=${JSON.stringify([t])};state.pocet=1;`);
  if(t==='listening comprehension') setVal('listeningTranscript','Listening source.');
  w.validate();
  assert(!w.document.getElementById('next1').disabled,'typ '+t+' neprošel samostatně');
  const specs=w.buildExerciseSpecs(w.eval('state'));
  assert(specs.length===1&&w.isAllowedExerciseType(specs[0].type),'typ '+t+' nemá validní bodovací kanál');
  singleTypes++;
}
resetBase();
for(let i=0;i<supportedTypes.length;i++)for(let j=i+1;j<supportedTypes.length;j++){
  const types=[supportedTypes[i],supportedTypes[j]];
  w.eval(`Object.assign(state,{exerciseDetail:false,typyCviceni:${JSON.stringify(types)},pocet:2,body:20});`);
  const specs=w.buildExerciseSpecs(w.eval('state'));
  assert(specs.length===2,'dvojice nevytvořila dvě cvičení');
  assert(specs.every(x=>w.isAllowedExerciseType(x.type)),'dvojice nemá podporovaný bodovací kanál: '+types.join(' + '));
  pairTypes++;
}
ok('všechny typy a všechny jejich dvojice',()=>singleTypes+' samostatně / '+pairTypes+' dvojic');
resetBase();setVal('vlastniTyp','esej s ručním hodnocením');w.eval('state.typyCviceni=[];state.pocet=1;');w.validate();
ok('nepodporovaný vlastní typ je zablokován',()=>{assert(w.document.getElementById('next1').disabled,'nepodporovaný typ prošel');assert(/není technicky podporován/.test(w.document.getElementById('validHint1').textContent),'chybí vysvětlení');});
resetBase();setVal('vlastniTyp','gap fill');w.eval('state.typyCviceni=[];state.pocet=1;');w.validate();
ok('podporovaný synonymní typ projde',()=>{assert(!w.document.getElementById('next1').disabled,'alias gap fill byl blokován');});

// 9) Všechny neprázdné kombinace CEFR ve všech pěti cizích jazycích a sekundární volby.
let cefrCases=0;
const levels=['A1','A2','B1','B2','C1','C2'];
const foreignLanguages=['angličtina','němčina','španělština','francouzština','latina'];
for(const language of foreignLanguages)for(let mask=1;mask<(1<<levels.length);mask++){
  resetBase();const chosen=levels.filter((_,i)=>mask&(1<<i));
  w.eval(`state.jazyk=${JSON.stringify(language)};state.uroven=${JSON.stringify(chosen)};state.kombinovat=${chosen.length>1};`);w.validate();
  assert(!w.document.getElementById('next1').disabled,language+' CEFR '+chosen.join('/')+' byl blokován');cefrCases++;
}
ok('všechny neprázdné kombinace CEFR ve všech cizích jazycích',()=>cefrCases+' kombinací');
let secondaryCases=0;
for(const instrJazyk of ['target','mixed','czech'])for(const layout of ['tabs','scroll'])for(const randomizace of ['NE','ANO'])
for(const identityMode of ['name','oneTimeCode'])for(const fuzzyTolerance of ['off','mild','strict']){
  resetBase();w.eval(`Object.assign(state,${JSON.stringify({instrJazyk,layout,randomizace,identityMode,fuzzyTolerance})});if(state.identityMode==='oneTimeCode')rosterEntries=[{email:'a@school.cz',label:'a',code:'ABC234'}];enforceModeConstraints();`);
  const prompt=w.buildPrompt();assert(prompt.length>500,'sekundární kombinace nevytvořila prompt');secondaryCases++;
}
ok('sekundární volby bez skrytých kolizí',()=>secondaryCases+' kombinací');

// 10) Povinná pole každého kroku reagují jako logická brána.
let step0Cases=0;
for(let mask=0;mask<16;mask++){
  resetBase();setVal('nazev',mask&1?'N':'');setVal('proKoho',mask&2?'T':'');setVal('latka',mask&4?'L':'');w.eval(`state.jazyk=${mask&8?"'angličtina'":"''"}`);w.validate();
  const shouldPass=mask===15;assert((!w.document.getElementById('next0').disabled)===shouldPass,'step0 mask '+mask);step0Cases++;
}
ok('všechny kombinace povinných polí kroku 1',()=>step0Cases+' kombinací');

// 11) Všechny cizí jazyky v simple/advanced a se všemi jazyky instrukcí.
let languageModeCases=0;
for(const appMode of ['simple','advanced'])for(const language of foreignLanguages)for(const instrJazyk of ['target','mixed','czech']){
  resetBase();
  w.eval(`Object.assign(state,${JSON.stringify({appMode,workPreset:appMode==='simple'?'quick':'advanced',jazyk:language,instrJazyk,simpleTemplate:''})});enforceModeConstraints();applyVisualState();validate();`);
  assert(!w.document.getElementById('next0').disabled,'krok 0 blokuje '+language+'/'+appMode+'/'+instrJazyk);
  assert(!w.document.getElementById('next1').disabled,'krok 1 blokuje '+language+'/'+appMode+'/'+instrJazyk);
  assert(!w.document.getElementById('next2').disabled,'krok 2 blokuje '+language+'/'+appMode+'/'+instrJazyk);
  assert(!w.document.getElementById('next3').disabled,'krok 3 blokuje '+language+'/'+appMode+'/'+instrJazyk);
  const prompt=w.buildPrompt(); assert(prompt.length>500,'prompt je prázdný: '+language+'/'+appMode+'/'+instrJazyk);
  languageModeCases++;
}
ok('všechny cizí jazyky × simple/advanced × jazyk instrukcí',()=>languageModeCases+' průchodů');

// 12) Všech 13 oborových šablon českého jazyka.
const csPresetGoals={
  pravopis_rychle:'practice',pravopis_oprava_chyb:'practice',mluvnice:'graded',skladba:'graded',
  interpunkce:'practice',interpunkce_doplneni:'practice',interpunkce_oprava:'practice',text:'diagnostic',
  slovni_zasoba:'practice',stylistika:'practice',literatura:'practice',prijimacky:'practice',maturita:'graded'
};
const csSecure=new Set(['mluvnice','skladba','maturita']);
let csPresetCases=0;
for(const [id,goal] of Object.entries(csPresetGoals)){
  resetBase();
  w.eval("Object.assign(state,{jazyk:'čeština',appMode:'advanced',workPreset:'advanced',simpleTemplate:''});");
  w.csChoosePreset(id); w.validate();
  const st=JSON.parse(w.eval('JSON.stringify(state)'));
  assert(st.csModule&&st.csModule.preset===id,'ČJ preset se neaktivoval: '+id);
  assert(st.testMode===(goal==='practice'?'procviceci':'bezny'),'ČJ preset má chybný testMode: '+id+' → '+st.testMode);
  assert(st.resultMode===(csSecure.has(id)?'secureOffline':'instant'),'ČJ preset má chybný resultMode: '+id);
  assert(st.feedbackMode===(csSecure.has(id)?'none':'learning'),'ČJ preset má chybný feedback: '+id);
  assert(st.exerciseDetail===true&&st.exerciseConfig.length===st.pocet,'ČJ preset nemá úplný detail cvičení: '+id);
  assert(st.exerciseConfig.every(ex=>w.isAllowedExerciseType(ex.typ)&&ex.pocetOtazek>0&&ex.body>0),'ČJ preset obsahuje nefunkční cvičení: '+id);
  assert(!w.document.getElementById('next1').disabled,'ČJ preset neprojde krokem cvičení: '+id);
  assert(w.buildPrompt().includes('MODUL ČESKÝ JAZYK'),'ČJ preset nevytvořil oborový prompt: '+id);
  csPresetCases++;
}
ok('všechny oborové šablony českého jazyka',()=>csPresetCases+' presetů');

// 13) Nezávislé viditelnosti a blokace polí nesmějí reagovat na nesouvisející volby.
let visibilityCases=0;
for(const identityMode of ['name','oneTimeCode'])for(const diferencovany of ['NE','ANO'])for(const gradeTyp of ['skola','vlastni'])for(const exerciseDetail of [false,true]){
  resetBase();
  w.eval(`Object.assign(state,${JSON.stringify({identityMode,diferencovany,gradeTyp,exerciseDetail})});if(state.exerciseDetail){state.pocet=1;state.exerciseConfig=[{typ:'multiple choice',pocetOtazek:1,body:10}];}enforceModeConstraints();applyVisualState();`);
  assert(w.document.getElementById('rosterField').classList.contains('hidden')===(identityMode!=='oneTimeCode'),'roster visibility');
  assert(w.document.getElementById('groupBuilder').classList.contains('hidden')===(diferencovany!=='ANO'),'group visibility');
  assert(w.document.getElementById('vlastniSkala').classList.contains('hidden')===(gradeTyp!=='vlastni'),'grade scale visibility');
  assert(w.document.getElementById('exConfigList').classList.contains('hidden')===(!exerciseDetail),'detail visibility');
  assert(w.document.getElementById('globalTypesField').classList.contains('hidden')===exerciseDetail,'global type visibility detail='+exerciseDetail+' actualHidden='+w.document.getElementById('globalTypesField').classList.contains('hidden')+' appMode='+w.eval('state.appMode')+' jazyk='+w.eval('state.jazyk'));
  visibilityCases++;
}
for(const types of [[],['listening comprehension'],['reading comprehension'],['listening comprehension','reading comprehension']]){
  resetBase();w.eval(`state.typyCviceni=${JSON.stringify(types.length?types:['multiple choice'])};state.pocet=${Math.max(1,types.length)};applyVisualState();`);
  const listening=types.includes('listening comprehension'),reading=types.includes('reading comprehension');
  assert(w.document.getElementById('listeningBlock').classList.contains('hidden')===(!listening),'listening visibility');
  assert(w.document.getElementById('readingBlock').classList.contains('hidden')===(!reading),'reading visibility');
  visibilityCases++;
}
ok('nezávislé aktivace/deaktivace a viditelnosti polí',()=>visibilityCases+' stavů');

// 14) Staré/rozporné uložené stavy se při obnově musí bezpečně normalizovat.
let snapshotCases=0;
const invalidSnapshots=[
  {appMode:'advanced',workPreset:'advanced',testMode:'prisny',resultMode:'instant',feedbackMode:'learning',odevzdavani:'A'},
  {appMode:'advanced',workPreset:'advanced',testMode:'procviceci',resultMode:'secureOffline',feedbackMode:'none',zolicek:'ANO'},
  {appMode:'simple',workPreset:'quick',simpleTemplate:'',diferencovany:'ANO',testMode:'bezny',resultMode:'instant'},
  {appMode:'advanced',workPreset:'advanced',testMode:'bezny',resultMode:'secureOffline',feedbackMode:'learning',odevzdavani:'A'}
];
for(const bad of invalidSnapshots){
  resetBase();
  const snap={state:{...JSON.parse(w.eval('JSON.stringify(state)')),...bad},currentStep:0,maxStep:0,dom:{nazev:'Workflow test',proKoho:'1.A',latka:'Present simple'}};
  w.localStorage.setItem(w.eval('SAVE_KEY'),JSON.stringify(snap));
  assert(w.loadSnapshot(),'snapshot se nenačetl');
  const st=JSON.parse(w.eval('JSON.stringify(state)'));
  assert(!(st.testMode==='prisny'&&st.resultMode!=='secureOffline'),'obnoven strict/instant');
  assert(!(st.testMode==='procviceci'&&(st.resultMode!=='instant'||st.feedbackMode!=='learning'||st.zolicek==='ANO')),'obnoven rozbitý practice');
  assert(!(st.diferencovany==='ANO'&&st.appMode==='simple'),'obnovena diferenciace v simple');
  assert(!(st.resultMode==='secureOffline'&&(st.odevzdavani!=='B'||st.feedbackMode!=='none')),'obnoven rozbitý secure');
  snapshotCases++;
}
ok('migrace rozporných uložených stavů',()=>snapshotCases+' historické stavy');

// 15) Skutečný průchod tlačítky od prvního kroku po výsledný prompt.
resetBase();
w.eval('currentStep=0;maxStep=0;showOnlyStep(0);validate();');
for(let step=0;step<4;step++){
  const next=w.document.getElementById('next'+step);
  assert(next&&!next.disabled,'krok '+step+' nemá aktivní pokračování');
  next.click();
  assert(w.eval('currentStep')===step+1,'tlačítko next'+step+' neposunulo na krok '+(step+1));
  for(let i=0;i<=4;i++)assert(w.document.getElementById('step'+i).classList.contains('hidden')===(i!==step+1),'viditelnost kroku '+i);
}
ok('souvislý průchod krok 1 → finální prompt',()=>{assert(w.document.getElementById('promptText').textContent.length>500,'výsledný prompt je prázdný');return '4 návazné přechody';});

// Kryptografickou sílu PBKDF2 ověřuje standardní headless test. Workflow matice
// testuje logiku a přenos konfigurace opakovaně, proto zde nahrazuje pouze nákladný
// generátorový KDF deterministickou testovací hodnotou. Hashování rosteru, RSA secure
// balík a oba studentské runtime zůstávají skutečné.
w.eval("deriveSecretHash=async function(kind,secret,testId){return 'pbkdf2-test$'+kind+'$'+testId;};");

// 16) Public studentský HTML ověřuje jednorázový kód i bez diferenciace.
await okAsync('instant runtime odmítne cizí jednorázový kód', async()=>{
  resetBase();
  w.eval("Object.assign(state,{identityMode:'oneTimeCode',exerciseDetail:true,pocet:1,exerciseConfig:[{typ:'multiple choice',pocetOtazek:1,body:1}]});rosterEntries=[{email:'a@school.cz',label:'a',code:'ABC234'}];");
  const gen={exercises:[{title:'MC',type:'multiple choice',points_total:1,points_each:1,items:[{question:'Q?',options:['A','B'],correct:0}]}]};
  const out=await w.assembleTestHtml(w.eval('state'),gen);
  assert(!/a@school\.cz/.test(out),'studentský HTML obsahuje e-mail');
  assert(!/ABC234/.test(out),'studentský HTML obsahuje čitelný kód');
  const sd=new JSDOM(out,{runScripts:'dangerously',url:'https://school.example/test.html',pretendToBeVisual:true,beforeParse(x){if(!x.crypto||!x.crypto.subtle)Object.defineProperty(x,'crypto',{value:webcrypto});x.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});x.scrollTo=()=>{};x.HTMLElement.prototype.scrollIntoView=()=>{};}});
  await new Promise(r=>setTimeout(r,60));
  try{
    sd.window.document.getElementById('studentName').value='WRONG1';
    await sd.window.startTest();
    assert(!sd.window.document.getElementById('introScreen').classList.contains('hidden'),'cizí kód odemkl test');
    sd.window.document.getElementById('studentName').value='ABC234';
    await sd.window.startTest();
    assert(sd.window.document.getElementById('introScreen').classList.contains('hidden'),'platný kód neodemkl test');
  }finally{sd.window.close();}
  return 'invalid blocked / valid accepted';
});

// 17) Secure veřejná konfigurace nese pouze solené hashe roster kódů.
await okAsync('secure konfigurace používá pouze hashované jednorázové kódy', async()=>{
  resetBase();
  w.eval("Object.assign(state,{identityMode:'oneTimeCode',testMode:'bezny',resultMode:'secureOffline',feedbackMode:'none',odevzdavani:'B'});rosterEntries=[{email:'a@school.cz',label:'a',code:'ABC234'}];enforceModeConstraints();");
  const salt='0123456789abcdef0123456789abcdef';
  const hashes=await w.buildPublicIdentityCodeHashes(w.eval('state'),salt);
  assert(hashes.length===1&&/^[A-Za-z0-9_-]{43}$/.test(hashes[0]),'secure roster nemá SHA-256 hash');
  const publicCfg=w.securePublicCfg({identityMode:'oneTimeCode',identityCodeScheme:'sha256-v1',identityCodeHashes:hashes,diffGroups:[],diffRosterSalt:salt,uiLang:'cs',resultMode:'secureOffline'},{publicJwk:{kty:'RSA'},crypto:'RSA-OAEP-256'});
  const serialized=JSON.stringify(publicCfg);
  assert(publicCfg.identityMode==='oneTimeCode'&&publicCfg.identityCodeHashes.length===1,'secure config ztratil roster');
  assert(!serialized.includes('ABC234')&&!serialized.includes('a@school.cz'),'secure config obsahuje čitelný kód/e-mail');
  return '1 salted SHA-256 hash';
});

// 18) Reprezentativní výstupová matice přes obě rozložení, odevzdávání, randomizaci,
// guard, žolík a diferenciaci. Secure kombinace testuje stávající headless check.
let outputCases=0;
for(const layout of ['tabs','scroll'])for(const odevzdavani of ['A','B'])for(const randomizace of ['NE','ANO'])for(const screenGuard of [false,true]){
  resetBase();
  w.eval(`Object.assign(state,${JSON.stringify({layout,odevzdavani,randomizace,screenGuard,feedbackMode:'brief',resultMode:'instant',exerciseDetail:true,pocet:1,exerciseConfig:[{typ:'multiple choice',pocetOtazek:2,body:2}]})});enforceModeConstraints();`);
  const gen={exercises:[{title:'MC',type:'multiple choice',points_total:2,points_each:1,items:[{question:'Q1?',options:['A','B'],correct:0},{question:'Q2?',options:['A','B'],correct:1}]}]};
  const out=await w.assembleTestHtml(w.eval('state'),gen);
  assert(out.includes('const CFG='),'výstup nemá CFG');
  assert(out.includes('const VARIANTS='),'výstup nemá varianty');
  const od=JSON.parse(out.match(/const CFG=(\{.*?\});\nconst VARIANTS=/s)[1]);
  assert(od.layout===layout,'layout se nepřenesl');
  assert(od.odevzdavani===odevzdavani,'odevzdávání se nepřeneslo');
  assert(od.randomizace===(randomizace==='ANO'),'randomizace se nepřenesla');
  assert(od.screenGuard===screenGuard,'guard se nepřenesl');
  outputCases++;
}
ok('reprezentativní výstupová matice instant HTML',()=>outputCases+' sestavených testů');

console.log(`\nWorkflow audit: ${passed} PASS / ${failed} FAIL`);
dom.window.close();
process.exit(failed?1:0);
