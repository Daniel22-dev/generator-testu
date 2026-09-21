// Deterministic test data. These fixtures replace ONLY the AI provider boundary.
// They do not claim to validate a live model's linguistic or didactic quality.
window.auditFixtureItem=function(type,index,language){
 const lex={en:['water','river'],es:['agua','r\u00edo'],de:['Wasser','Fluss'],fr:['eau','rivi\u00e8re'],la:['aqua','flumen'],cs:['voda','\u0159eka']};
 const [a,b]=lex[language]||lex.en, explain='Audit fixture '+index;
 const map={
 'multiple choice':{question:'Select '+a,options:[b,a,'XYZ'],correct:1},
 'multi-select':{question:'Select '+a+' and '+b,options:[a,'XYZ',b],correct:[0,2]},
 'fill-in-the-blank':{sentence:'Word: ___',answer:a,alt_answers:[a+' ALT']},
 'matching':{left:'L'+index,right:'R'+index},
 'word order':{prompt:'Order these words',words:[b,a],correct_sentence:a+' '+b},
 'ordering':{question:'Order 1, 2, 3',items:['2','3','1'],correct_order:[2,0,1]},
 'highlight-evidence':{question:'Select '+b,sentences:[a,b,'XYZ'],correct:1},
 'categorisation-board':{question:'Put A into category A and B into category B',categories:['A','B'],entries:[{text:'B',category:'B'},{text:'A',category:'A'}]},
 'table-completion':{question:'Complete the table',columns:['Word','Answer'],rows:[[a,{answer:a,alt_answers:[a+' ALT']}],[b,{answer:b,alt_answers:[]}]]},
 'transformation-chain':{base_sentence:a+' '+b,transformations:[{instruction:'Write the first word',answer:a,alt_answers:[a+' ALT']},{instruction:'Write the second word',answer:b,alt_answers:[]}]},
 'translation':{prompt:'Translate water',answer:a,alt_answers:[a+' ALT']},
 'true/false':{statement:a+' equals '+a,correct:true},
 'error correction':{sentence:'X'+a,correction:a,alt_answers:[a+' ALT']},
 'error-tagging':{sentence:'A X B',tokens:['A','X','B'],error_token_index:1,error_type_options:['A','B'],error_type:'B',correction:a,alt_answers:[a+' ALT']},
 'cloze text':{text:'Words: ___ and ___',answers:[a,b],alt_answers:[[a+' ALT'],[b+' ALT']]},
 'sentence transformation':{prompt:'Write '+a,keyword:a,answer:a,alt_answers:[a+' ALT']},
 'reading comprehension':{question:'Select '+a,options:[a,b],correct:0},
 'dialogue completion':{dialogue:'A: '+a+'\nB: ___',question:'Repeat '+a,options:[b,a],correct:1},
 'categorization':{text:a,categories:[a,b],correct_category:a},
 'word formation':{sentence:'___',base_word:a,answer:a,alt_answers:[a+' ALT']},
 'listening comprehension':{transcript:a+' '+b,question:'Select the first word',options:[a,b],correct:0}
 };
 if(!map[type])throw new Error('No fixture for '+type);
 return Object.assign({explanation:explain},JSON.parse(JSON.stringify(map[type])));
};
window.auditFixtures=function(st,language){
 const specs=buildExerciseSpecs(st);
 const make=()=>({exercises:specs.map(s=>Object.assign({type:s.type,style:s.style,title:s.style,points_total:s.pts,items:Array.from({length:s.count},(_,i)=>auditFixtureItem(s.type,i,language||'en'))},s.type==='reading comprehension'?{passage:'Shared reading passage: water river. '+('Useful source text. '.repeat(15))}:{}))});
 const groups=getApiDiffGroups(st);if(!groups.length)return make();
 return {group_variants:Object.fromEntries(groups.map(g=>[g.key,make()]))};
};
window.auditConfigure=function(types,mode,lang,instr,count){
 Object.assign(state,{appMode:'advanced',simpleTemplate:'',jazyk:({en:'angli\u010dtina',es:'\u0161pan\u011bl\u0161tina',de:'n\u011bm\u010dina',fr:'francouz\u0161tina',la:'latina',cs:'\u010de\u0161tina'})[lang||'en'],instrJazyk:instr||'target',uroven:['B1'],kombinovat:false,pocet:types.length,typyCviceni:types,cas:30,odevzdavani:'B',randomizace:'NE',testMode:'bezny',layout:'scroll',resultMode:mode||'instant',identityMode:'name',body:types.length*12,feedbackMode:'brief',screenGuard:false,tema:'examBlue',zolicek:'NE',diferencovany:'NE',skupiny:[],overeni:'NE',anonymizace:'ANO',fuzzyTolerance:'off',exerciseDetail:true,exerciseConfig:types.map(t=>({typ:t,pocetOtazek:scoringTypeFor(t)==='categorisation-board'?1:(count||2),body:12})),splitGenerate:false,formsSubmissionUrl:''});
 for(const [id,val] of Object.entries({nazev:'AUDIT TEST',proKoho:'QA',latka:'Language fixture test',ucitelJmeno:'Audit Teacher',ucitelPin:'AUDIT-TEACH-482957',heslo:'AUDIT-TEACH-482957',vlastniSkala:'',vlastniTyp:'',listeningTranscript:'water river'})){const el=$(id);if(el)el.value=val;}
 state.listeningTranscript='water river';
};
window.auditBuild=async function(types,mode,lang,instr,count){
 auditConfigure(types,mode,lang,instr,count);
 const data=auditFixtures(state,lang||'en');lastGenData=data;
 const built=await assembleTestHtml(state,data);
 generatedPackage=mode==='secureOffline'?built:null;generatedTestHtml=generatedPackage?'':built;
 generatedIntegrity=null;lastSelfTest=null;exportChecklist={};resetKeyCheckState();setGenUI('done');renderExportChecklist(true);
 return {html:generatedPackage?built.studentHtml:built,teacher:generatedPackage?built.teacherHtml:null,cfg:lastAssembled.cfg,variants:lastAssembled.variants};
};
