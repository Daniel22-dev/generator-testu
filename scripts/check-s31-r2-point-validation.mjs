#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const formSource=fs.readFileSync(path.join(root,'src/js/05-form-fields.js'),'utf8');
const uiSource=fs.readFileSync(path.join(root,'src/js/03-ui-render.js'),'utf8');
const results=[];

function extractFunction(source,name){
  const from=source.indexOf(`function ${name}(`);
  if(from<0)throw new Error(`Missing function ${name}`);
  const brace=source.indexOf('{',from);
  let depth=0,quote='',escaped=false,line=false,block=false;
  for(let i=brace;i<source.length;i++){
    const char=source[i],next=source[i+1]||'';
    if(line){if(char==='\n')line=false;continue;}
    if(block){if(char==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(char===quote)quote='';continue;}
    if(char==='/'&&next==='/'){line=true;i++;continue;}
    if(char==='/'&&next==='*'){block=true;i++;continue;}
    if('"\'`'.includes(char)){quote=char;continue;}
    if(char==='{')depth++;
    if(char==='}'&&--depth===0)return source.slice(from,i+1);
  }
  throw new Error(`Unclosed function ${name}`);
}

function harness(configured=true){
  const state={body:20,exerciseDetail:configured,exerciseConfigSaved:configured,
    exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),
    pocet:5,odevzdavani:'B',jazyk:'angličtina',uroven:['B2'],testMode:'normal',screenGuard:false,
    typyCviceni:[],gradeTyp:'standard',skupiny:[],diferencovany:'NE',identityMode:'name'};
  const elements=new Map(),counters={saved:0};
  const element=id=>{
    if(!elements.has(id)){
      const attributes=new Map();
      elements.set(id,{value:'',disabled:false,attributes,validationMessage:'',innerHTML:'',textContent:'',style:{},
        classList:{add(){},remove(){},toggle(){}},
        setAttribute(name,value){attributes.set(name,String(value));},removeAttribute(name){attributes.delete(name);},
        getAttribute(name){return attributes.get(name)??null;},setCustomValidity(message){this.validationMessage=String(message||'');}});
    }
    return elements.get(id);
  };
  const context=vm.createContext({state,$:element,setVal(id,value){element(id).value=String(value);},
    document:{querySelectorAll(){return[];}},normalizeType:value=>value,isDisabledExerciseType(){return false;},
    isAllowedExerciseType(){return true;},hasConfiguredExercises(st){return !!(st.exerciseDetail||st.exerciseConfigSaved);},
    scoringTypeFor:value=>value,workflowTypeStats(){return{count:5};},hasListeningSource(){return true;},
    readingNeedsReview(){return false;},enforceModeConstraints(){},refreshWorkflowContext(){},trim(){return'';},
    parseCustomGradeScale(){return[];},gradeScaleGaps(){return[];},gradeScaleOverlaps(){return[];},
    renderGenerationEstimate(){},requiresTeacherAccessCode(){return false;},credentialPolicyErrors(){return[];},
    updateSimpleSecretsHelper(){},workflowGroupValidation(){return{ok:true,messages:[]};},plainText:value=>value,
    rosterSelectionReady(){return true;},saveSnapshot(){counters.saved++;},applyVisualState(){},renderExerciseConfig(){},
    renderSmartTimeTip(){},sanitizeExerciseTypeList(){return[];},renderHybridBanner(){},renderExTotals(){},uiToast(){},
    window:{scrollTo(){}},currentStep:2,maxStep:2,outputMutationBusy:false,updateProgress(){},renderResult(){}});
  for(const name of ['strictIntegerValue','exercisePointsDistribution','syncExercisePoints','onCustomBody','validate'])
    vm.runInContext(extractFunction(formSource,name),context);
  for(const name of ['pickNum','goTo'])vm.runInContext(extractFunction(uiSource,name),context);
  vm.runInContext('validate()',context);
  return{context,state,elements,counters,element};
}

async function check(id,run){
  try{await run();results.push({id,status:'PASS'});console.log(`PASS ${id}`);}
  catch(error){results.push({id,status:'FAIL',detail:error.message});console.error(`FAIL ${id}: ${error.message}`);}
}

await check('S31-R2-UX-01-invalid-input-blocks-immediate-continue',()=>{
  const h=harness();h.element('bodyCustom').value='29.7';
  assert.equal(vm.runInContext('onCustomBody()',h.context),false);
  assert.equal(h.state.body,20);assert.deepEqual(h.state.exerciseConfig.map(ex=>ex.body),[4,4,4,4,4]);
  assert.equal(h.element('next2').disabled,true);assert.equal(h.counters.saved,0);
});

await check('S31-R2-UX-02-invalid-input-survives-unrelated-revalidation',()=>{
  const h=harness();h.element('bodyCustom').value='29.7';vm.runInContext('onCustomBody()',h.context);
  vm.runInContext('validate()',h.context);
  assert.equal(h.element('next2').disabled,true);assert.equal(h.element('bodyCustom').value,'29.7');
  assert.notEqual(h.element('bodyCustom').validationMessage,'');
});

await check('S31-R2-UX-03-forward-navigation-is-fail-closed',()=>{
  const h=harness();h.element('bodyCustom').value='29.7';vm.runInContext('onCustomBody()',h.context);
  assert.equal(vm.runInContext('goTo(3)',h.context),false);
  assert.equal(h.context.currentStep,2);
});

await check('S31-R2-UX-04-valid-preset-clears-error-in-simple-and-detailed-modes',()=>{
  for(const configured of [false,true]){
    const h=harness(configured);h.element('bodyCustom').value='29.7';vm.runInContext('onCustomBody()',h.context);
    assert.equal(vm.runInContext("pickNum('body',30)",h.context),true);
    assert.equal(h.state.body,30);assert.equal(h.element('bodyCustom').value,'30');
    assert.equal(h.element('bodyCustom').validationMessage,'');
    assert.equal(h.element('bodyCustom').attributes.has('aria-invalid'),false);
    assert.equal(h.element('next2').disabled,false);
    assert.deepEqual(h.state.exerciseConfig.map(ex=>ex.body),[6,6,6,6,6]);
  }
});

await check('S31-R2-UX-05-valid-typed-and-programmatic-contract-remains-strict',()=>{
  const h=harness();h.element('bodyCustom').value='29.7';vm.runInContext('onCustomBody()',h.context);
  h.element('bodyCustom').value='29';assert.equal(vm.runInContext('onCustomBody()',h.context),true);
  assert.equal(h.state.body,29);assert.deepEqual(h.state.exerciseConfig.map(ex=>ex.body),[6,6,6,6,5]);
  assert.equal(h.element('bodyCustom').validationMessage,'');assert.equal(h.element('next2').disabled,false);
  h.element('bodyCustom').value='29.7';vm.runInContext('onCustomBody()',h.context);
  assert.equal(vm.runInContext('syncExercisePoints()',h.context),true);
  assert.equal(h.element('bodyCustom').value,'29.7','background synchronization erased dirty invalid input');
  assert.notEqual(h.element('bodyCustom').validationMessage,'');
  assert.equal(vm.runInContext('syncExercisePoints(30)',h.context),true);
  assert.equal(h.element('bodyCustom').value,'30');assert.equal(h.element('bodyCustom').validationMessage,'');
  assert.equal(h.element('bodyCustom').attributes.has('aria-invalid'),false);
  const validState=structuredClone(h.state),saved=h.counters.saved;
  for(const invalid of ['29.7','29.0','2e1','',0,-1,4996]){
    h.context.__candidate=invalid;
    assert.equal(vm.runInContext("pickNum('body',__candidate)",h.context),false,`accepted ${String(invalid)}`);
    assert.deepEqual(h.state,validState,`mutated state for ${String(invalid)}`);
  }
  assert.equal(h.counters.saved,saved);
});

const summary={sprint:'03.1-r2-point-input-validation',passed:results.filter(result=>result.status==='PASS').length,
  failed:results.filter(result=>result.status==='FAIL').length,total:results.length,results};
console.log(JSON.stringify(summary,null,2));
if(summary.failed)process.exitCode=1;
