#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/js/05-form-fields.js'),'utf8');

function extractFunction(name){
  const from=source.indexOf(`function ${name}(`);
  if(from<0)throw new Error(`Missing function ${name}`);
  const brace=source.indexOf('{',from);
  let depth=0,quote='',escaped=false,line=false,block=false;
  for(let index=brace;index<source.length;index++){
    const char=source[index],next=source[index+1]||'';
    if(line){if(char==='\n')line=false;continue;}
    if(block){if(char==='*'&&next==='/'){block=false;index++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(char===quote)quote='';continue;}
    if(char==='/'&&next==='/'){line=true;index++;continue;}
    if(char==='/'&&next==='*'){block=true;index++;continue;}
    if('"\'`'.includes(char)){quote=char;continue;}
    if(char==='{')depth++;
    if(char==='}'&&--depth===0)return source.slice(from,index+1);
  }
  throw new Error(`Unclosed function ${name}`);
}

function harness(){
  const attributes=new Map();
  const input={value:'20',validationMessage:'',setAttribute(name,value){attributes.set(name,String(value));},
    getAttribute(name){return attributes.get(name)??null;},removeAttribute(name){attributes.delete(name);},
    setCustomValidity(value){this.validationMessage=String(value||'');}};
  const elements=new Map([['bodyCustom',input]]);
  const element=id=>{
    if(!elements.has(id))elements.set(id,{disabled:false,classList:{add(){},remove(){},toggle(){}},style:{},
      setAttribute(){},getAttribute(){return null;},textContent:'',innerHTML:''});
    return elements.get(id);
  };
  const state={body:20,exerciseDetail:false,exerciseConfigSaved:true,
    exerciseConfig:Array.from({length:5},()=>({body:4,typ:'multiple choice',pocetOtazek:4})),pocet:5,
    odevzdavani:'B',jazyk:'English',uroven:['B2'],testMode:'normal',screenGuard:false,typyCviceni:[],
    gradeTyp:'standard',diferencovany:'NE',skupiny:[]};
  const context=vm.createContext({state,$:element,setVal(id,value){element(id).value=String(value);},trim(){return'';},
    hasConfiguredExercises(st){return !!(st.exerciseDetail||st.exerciseConfigSaved);},normalizeType:value=>value,
    isAllowedExerciseType(){return true;},isDisabledExerciseType(){return false;},scoringTypeFor:value=>value,
    workflowTypeStats(){return{count:5};},hasListeningSource(){return true;},readingNeedsReview(){return false;},
    enforceModeConstraints(){},refreshWorkflowContext(){},parseCustomGradeScale(){return[];},gradeScaleGaps(){return[];},
    gradeScaleOverlaps(){return[];},renderGenerationEstimate(){},requiresTeacherAccessCode(){return false;},
    credentialPolicyErrors(){return[];},updateSimpleSecretsHelper(){},workflowGroupValidation(){return{ok:true,messages:[]};},
    rosterSelectionReady(){return true;},renderExerciseConfig(){},renderHybridBanner(){},applyVisualState(){},saveSnapshot(){},
    syncComprehensionCountsFromConfig(){},renderSmartTimeTip(){},renderExTotals(){},plainText:value=>value,
    document:{querySelectorAll(){return[];}},window:{scrollTo(){}}});
  for(const name of ['strictIntegerValue','exercisePointsDistribution','exercisePointsTotal','syncDetailedPointsTotal',
    'syncExercisePoints','onCustomBody','validate','toggleExDetail']){
    vm.runInContext(extractFunction(name),context);
  }
  return{context,state,input,element,attributes};
}

const h=harness(),results=[];
async function check(id,run){
  try{await run();results.push({id,status:'PASS'});console.log(`PASS ${id}`);}
  catch(error){results.push({id,status:'FAIL',detail:error.message});console.error(`FAIL ${id}: ${error.message}`);}
}

await check('S31R2-D01-global-invalid-remains-blocking',()=>{
  h.input.value='29.7';assert.equal(vm.runInContext('onCustomBody()',h.context),false);
  vm.runInContext('validate()',h.context);
  assert.equal(h.input.value,'29.7');assert.notEqual(h.input.validationMessage,'');
  assert.equal(h.element('next2').disabled,true);assert.equal(h.state.body,20);
});

await check('S31R2-D02-explicit-switch-to-valid-detail-clears-hidden-error',()=>{
  vm.runInContext('toggleExDetail()',h.context);
  assert.equal(h.state.exerciseDetail,true);assert.equal(h.input.value,'20');
  assert.equal(h.input.validationMessage,'');assert.equal(h.attributes.has('aria-invalid'),false);
  assert.equal(h.element('next2').disabled,false);
});

await check('S31R2-D03-valid-detail-point-edit-allows-continuation',()=>{
  h.state.exerciseConfig[0].body=5;
  assert.equal(vm.runInContext('syncDetailedPointsTotal(state)',h.context),21);
  vm.runInContext('validate()',h.context);
  assert.equal(h.state.body,21);assert.equal(h.input.value,'21');
  assert.equal(h.input.validationMessage,'');assert.equal(h.attributes.has('aria-invalid'),false);
  assert.equal(h.element('next2').disabled,false);
  h.state.exerciseConfig[0].body=4.5;
  vm.runInContext('syncDetailedPointsTotal(state);validate()',h.context);
  assert.equal(h.element('next1').disabled,true,'invalid detail points must remain blocking');
});

const summary={sprint:'03.1-r2-detail-point-authority',passed:results.filter(result=>result.status==='PASS').length,
  failed:results.filter(result=>result.status==='FAIL').length,total:results.length,results};
console.log(JSON.stringify(summary,null,2));
if(summary.failed)process.exitCode=1;
