import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {webcrypto} from 'node:crypto';
import * as acorn from 'acorn';
const html=fs.readFileSync('dist/index.html','utf8')
  .replace(/<script type="module" data-ghrab-access-bootstrap>[\s\S]*?<\/script>/,'')
  .replace(/type="application\/ghrab-protected"\s+data-ghrab-protected\s*/g,'');
let scrolls=0;
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://daniel22-dev.github.io/generator-testu/',pretendToBeVisual:true,beforeParse(w){
  w.acorn=acorn;Object.defineProperty(w,'crypto',{value:webcrypto});
  w.__GHRAB_STUDIO_ACCESS__={appId:'generator',permit:{sub:'QA',displayName:'QA',role:'admin',apps:['*'],iat:1,exp:4102444800,jti:'workflow'}};
  w.__GHRAB_DEPLOYMENT_CONFIG__={profile:'github-pages',authMode:'signed-permit',aiTransport:'direct-gemini',features:{allowLocalProviderKeys:true}};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{scrolls++};w.HTMLElement.prototype.scrollIntoView=()=>{scrolls++};
  w.URL.createObjectURL=()=> 'blob:qa';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
  w.addEventListener('error',e=>errors.push(e.error?.message||e.message));
}});
const w=dom.window;
const read=expr=>JSON.parse(w.eval('JSON.stringify('+expr+')'));
const set=(id,value)=>{w.document.getElementById(id).value=value;};
let passes=0;
async function check(label,fn){try{await fn();passes++;console.log('PASS '+label);}catch(error){console.error('FAIL '+label);throw error;}}
function reset(){
  w.closeComprehensionDialog(false);
  w.eval("state=JSON.parse(JSON.stringify(DEFAULT));Object.assign(state,{appMode:'advanced',workPreset:'advanced',jazyk:'angličtina',uroven:['B1'],body:50,cas:30});rosterEntries=[];generatedPackage=null;lastAssembled=null;lastGenData=null;generatedTestHtml='';fileObjects=[];fileReadPromises=[];");
  ['nazev','proKoho','latka','listeningTranscript','rosterEmails'].forEach(id=>set(id,''));
  set('nazev','Workflow QA');set('proKoho','QA');set('latka','Grammar');set('recoveryCode','REC-AB12-CD34');set('ucitelPin','TEACH-ABCDEF-123456');
  w.applyVisualState();w.validate();
}
try{
  reset();
  await check('5 zvolených typů = 5 řádků = 5 specifikací = 5 AI zadání',()=>{
    w.eval("state.exerciseConfig=[{typ:'ordering',pocetOtazek:20,body:30}];state.pocet=10");w.pickNum('pocet',5);
    ['multiple choice','true/false','fill-in-the-blank','word order','error-tagging'].forEach(t=>w.toggleType(t));
    assert.equal(read('state.pocet'),5);w.toggleExDetail();
    assert.equal(read('state.exerciseConfig').length,5);assert.equal(read('buildExerciseSpecs(state)').length,5);
    assert.deepEqual(read('generationPlan(state).specs.map(s=>s.style)'),read('state.typyCviceni'));
    assert.equal(w.document.querySelectorAll('.ex-row').length,5);
  });
  await check('sbalení detailu zachová položky, body a ruční režim',()=>{
    w.updateExField(4,'manualMode',true);w.updateExField(4,'pocetOtazek',2);w.updateExField(4,'body',7);
    const before=read('generationPlan(state).config');w.toggleExDetail();
    assert.deepEqual(read('generationPlan(state).config'),before);w.toggleExDetail();assert.deepEqual(read('generationPlan(state).config'),before);
  });
  await check('zmenšení počtu odstraní i konfiguraci; zvýšení nevymyslí typ',()=>{
    w.pickNum('pocet',3);assert.equal(read('state.exerciseConfig').length,3);
    w.pickNum('pocet',4);assert.equal(read('state.exerciseConfig[3].typ'),'');assert(w.document.getElementById('next1').disabled);
    w.updateExField(3,'typ','reading comprehension');assert.equal(read('state.exerciseConfig[3].manualMode'),false);
    assert.equal(read('state.exerciseConfig[3].pocetOtazek'),4);
  });
  await check('prázdný detailní řádek nikdy nepřidá implicitní multiple choice',()=>{
    w.eval("Object.assign(state,{exerciseDetail:true,exerciseConfigSaved:false,pocet:1,typyCviceni:['translation'],exerciseConfig:[{typ:'translation',pocetOtazek:3,body:5}]})");
    w.pickNum('pocet',2);assert.deepEqual(read('state.typyCviceni'),['translation']);assert.equal(read('state.exerciseConfig[1].typ'),'');
    assert.throws(()=>w.generationPlan(read('state')),/vyber podporovaný typ/);
  });
  await check('duplicitní globální typy a starý skrytý stav se normalizují',()=>{
    const normalized=read("normalizeLoadedState({typyCviceni:['multiple choice','multiple choice','reading comprehension'],pocet:10,exerciseDetail:false,exerciseConfig:[{typ:'ordering'}]})");
    assert.equal(normalized.pocet,2);assert.deepEqual(normalized.typyCviceni,['multiple choice','reading comprehension']);assert.equal(normalized.exerciseConfig.length,0);
  });
  reset();
  await check('Reading: modal, uložení, návrat bez scrollu a opětovná editace',()=>{
    const before=scrolls;w.toggleType('reading comprehension');assert(w.document.getElementById('readingSettingsDialog').hasAttribute('open'));
    w.pickRcLength('long');w.setComprehensionQuestionCount('reading comprehension',5);set('readingTopicCustom','Travel');set('readingText','A teacher-provided passage.');
    w.closeComprehensionDialog(true);assert.equal(scrolls,before);assert.match(w.document.getElementById('comprehensionSummary').textContent,/Nastaveno/);
    w.openComprehensionDialog('reading comprehension');assert.equal(w.document.getElementById('readingText').value,'A teacher-provided passage.');
    assert.equal(w.document.getElementById('readingQuestionCount').value,'5');set('readingText','Discard this draft');w.pickRcLength('short');w.closeComprehensionDialog(false);
    assert.equal(read('state.rcLength'),'long');assert.equal(w.document.getElementById('readingText').value,'A teacher-provided passage.');
    assert.equal(read('buildExerciseSpecs(state)[0].count'),5);
  });
  await check('Listening: chybějící zdroj blokuje uložení; URL se propíše do skutečného requestu',()=>{
    w.toggleType('listening comprehension');w.closeComprehensionDialog(true);assert(w.document.getElementById('listeningSettingsDialog').hasAttribute('open'));
    assert.match(w.document.querySelector('#listeningSettingsDialog [role=alert]').textContent,/Doplň/);
    set('compListeningUrl','javascript:alert(1)');w.closeComprehensionDialog(true);assert(w.document.getElementById('listeningSettingsDialog').hasAttribute('open'));
    set('compListeningUrl','https://www.youtube.com/watch?v=QA');w.setComprehensionQuestionCount('listening comprehension',6);w.closeComprehensionDialog(true);
    assert.equal(read('state.zadaniTab'),'url');assert.equal(read('state.listeningConfigured'),true);
    assert.match(JSON.stringify(read('buildGeminiUrlPartsForApi(state)')),/QA/);
    w.openComprehensionDialog('listening comprehension');assert.equal(w.document.getElementById('listeningQuestionCount').value,'6');w.closeComprehensionDialog(false);
  });
  await check('sdílené bodování: plná věta i přesný fragment, alternativy, záporné případy a ČJ',()=>{
    const api=w.createSharedScoringDiagnosticApi({fuzzyMode:'off'}),it={sentence:'She go to school every day.',correction:'She goes to school every day.',alt_answers:[]};
    for(const answer of ['goes',' She GOES to school every day! ','  GOES.  '])assert.equal(api.correctionScore(answer,it,'error correction'),1);
    for(const answer of ['go','school','goes to school','She goes','goes now','',"doesn't go"])assert.equal(api.correctionScore(answer,it,'error correction'),0);
    const multi={sentence:'She go to school and he have a car.',correction:'She goes to school and he has a car.'};
    assert.equal(api.correctionScore('goes',multi,'error correction'),0);assert.equal(api.correctionScore('goes to school and he has',multi,'error correction'),1);
    assert.equal(api.correctionScore("didn't go",{sentence:'She not went to school.',correction:'She did not go to school.',alt_answers:["She didn't go to school."]},'error correction'),1);
    assert.equal(api.correctionScore('She goes to school.',{sentence:'She go to school.',tokens:['She','go','to','school.'],error_token_index:1,correction:'goes'},'error-tagging'),1);
    const cs=w.createSharedScoringDiagnosticApi({isCzech:true,csScoringPolicy:{enabled:true,capitalization:true,punctuation:true}});
    assert.equal(cs.correctionScore('jde',{sentence:'On jdu domů.',correction:'On jde domů.'},'error correction'),0);
    assert.equal(cs.textScore('Praha','praha',[],'translation'),0);
    assert.equal(api.textScore('its',"it's",[],'translation'),0);
  });
  reset();
  await check('účastníci: GIT vždy připraví kódy a CSV celé skupině',()=>{
    set('rosterEmails','a@example.invalid\nb@example.invalid\na@example.invalid\nc@example.invalid');w.rosterRefreshParticipants();w.rosterGenerate();
    assert.equal(read('rosterEntries').length,3);
    assert.deepEqual(read('rosterEntries.map(x=>x.email)'),['a@example.invalid','b@example.invalid','c@example.invalid']);
    let csv='';w.downloadBlobFile=value=>{csv=value;};w.rosterDownloadCsv();
    assert.match(csv,/email,student,code,test_id,odeslat/);assert.match(csv,/a@example.invalid/);assert.match(csv,/b@example.invalid/);assert.match(csv,/c@example.invalid/);
    assert(csv.split('\n').slice(1).every(line=>line.endsWith(',FALSE')));
    assert.equal(w.document.getElementById('participantMode'),null);assert.equal(w.document.getElementById('participantList'),null);
  });
  await check('oneTimeCode bez kódů celé skupiny je fail-closed',()=>{
    reset();set('rosterEmails','a@example.invalid\nb@example.invalid');
    w.eval("Object.assign(state,{testMode:'prisny',resultMode:'secureOffline',identityMode:'oneTimeCode',diferencovany:'NE'});rosterEntries=[];enforceModeConstraints()");
    w.validate();assert.equal(w.document.getElementById('next3').disabled,true);
    w.rosterGenerate();w.validate();assert.equal(read('rosterEntries').length,2);assert.equal(w.document.getElementById('next3').disabled,false);
  });
  reset();
  await check('ruční editor: zadání + klíč se dostanou do hotového testu bez AI',async()=>{
    const st=read('state');Object.assign(st,{exerciseDetail:true,pocet:1,body:2,exerciseConfig:[{typ:'ordering',pocetOtazek:1,body:2,manualMode:true}],typyCviceni:['ordering']});
    w.callGeminiJSON=()=>{throw new Error('Manual exercise must not call AI');};
    const pending=w.generateTestWithManual(st,{parts:[],notes:[]},false);
    set('mfQuestion0','Put the steps in order.');
    const inputs=w.document.querySelectorAll('#mfSteps0 input');['Wake up','Have breakfast','Go to school'].forEach((value,i)=>inputs[i].value=value);
    w.document.getElementById('btnMfOk').click();
    const built=await pending;assert.equal(typeof built,'string');
    const exercise=read('lastGenData.exercises[0]');assert.deepEqual(exercise.items[0].correct_order,[0,1,2]);
    assert(built.includes('Wake up'));const api=w.createSharedScoringDiagnosticApi();assert.equal(api.orderingScore([0,1,2],exercise.items[0].correct_order,2),2);assert.equal(api.orderingScore([1,0,2],exercise.items[0].correct_order,2),0);
  });
  await check('žádná neošetřená runtime chyba',()=>assert.deepEqual(errors,[]));
  fs.writeFileSync('qa-results/workflow-update.json',JSON.stringify({status:'passed',checks:passes,version:read('RELEASE.version'),liveAi:false,physicalMobile:false},null,2)+'\n');
  console.log('Workflow update: '+passes+' PASS / 0 FAIL');
}finally{w.closeComprehensionDialog(false);dom.window.close();}
