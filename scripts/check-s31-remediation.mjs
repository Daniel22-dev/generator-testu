#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const formSource=read('src/js/05-form-fields.js');
const uiSource=read('src/js/03-ui-render.js');
const shellSource=read('src/shell.html');
const aboutSource=read('src/js/14d-generator-release-guides.js');
const results=[];

function extractFunction(source,name){
  const functionStart=source.indexOf(`function ${name}(`);
  if(functionStart<0)throw new Error(`Missing function ${name}`);
  const start=source.slice(Math.max(0,functionStart-6),functionStart)==='async '?functionStart-6:functionStart;
  const brace=source.indexOf('{',functionStart);
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
    if(char==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`Unclosed function ${name}`);
}

async function check(id,run){
  try{await run();results.push({id,status:'PASS'});console.log(`PASS ${id}`);}
  catch(error){results.push({id,status:'FAIL',detail:error.message});console.error(`FAIL ${id}: ${error.message}`);}
}

function selectValues(id){
  const match=shellSource.match(new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/select>`));
  return [...(match?.[1]||'').matchAll(/<option\s+value="(\d+)"/g)].map(item=>Number(item[1]));
}

function workflowContext(initialState){
  const elements=new Map(),counters={saved:0,validated:0,rendered:0};
  const element=id=>{
    if(!elements.has(id)){
      const attributes=new Map();
      elements.set(id,{value:'',innerHTML:'',textContent:'',validationMessage:'',attributes,
        classList:{add(){},remove(){},toggle(){}},querySelector(){return null;},
        setAttribute(name,value){attributes.set(name,String(value));},removeAttribute(name){attributes.delete(name);},
        setCustomValidity(message){this.validationMessage=String(message||'');}});
    }
    return elements.get(id);
  };
  const context=vm.createContext({
    console,state:structuredClone(initialState),Number,Array,Set,Map,
    document:{getElementById:element,querySelectorAll(){return[];}},
    $:element,setVal(id,value){element(id).value=value==null?'':String(value);},
    normalizeType(value){return String(value||'').trim().toLowerCase();},
    sanitizeExerciseTypeList(values){return values||[];},isAllowedExerciseType(){return true;},
    specialStyleKey(){return'';},isManualSupported(){return false;},
    defaultItemCount(type,st){const key=String(type).toLowerCase()==='reading comprehension'?'readingQuestionCount':'listeningQuestionCount';return Math.max(1,Math.min(30,Number(st?.[key]??context.state[key])||4));},
    renderExerciseConfig(){counters.rendered++;},renderExTotals(){},renderSmartTimeTip(){},applyVisualState(){},renderHybridBanner(){},
    validate(){counters.validated++;},saveSnapshot(){counters.saved++;},initTooltips(){},
    uiToast(){},uiAlert(){},async uiConfirm(){return true;}
  });
  for(const name of [
    'hasConfiguredExercises','strictIntegerValue','exercisePointsTotal','syncDetailedPointsTotal','exercisePointsDistribution',
    'syncExercisePoints','onCustomBody','updateExField','comprehensionCountKey','configuredComprehensionIndexes',
    'effectiveComprehensionQuestionCount','syncComprehensionCountsFromConfig','syncComprehensionControl'
  ])vm.runInContext(extractFunction(formSource,name),context);
  vm.runInContext(extractFunction(uiSource,'setComprehensionQuestionCount'),context);
  return{context,elements,counters};
}

await check('S3.1-F01-all-public-manual-links-preserve-runtime',()=>{
  const anchors=[...shellSource.matchAll(/<a\s+[^>]*href="\.\/manual\/[^\"]*"[^>]*>/g),...aboutSource.matchAll(/<a\s+[^>]*href="\.\/manual\/[^\"]*"[^>]*>/g)].map(match=>match[0]);
  assert.equal(anchors.length,3,'expected header, Apps Script guide and About manual entry points');
  for(const anchor of anchors){assert.match(anchor,/target="_blank"/);assert.match(anchor,/rel="[^"]*noopener/);}
  assert.equal(anchors.filter(anchor=>/href="\.\/manual\/\?from=app"/.test(anchor)).length,2);
  assert.equal(anchors.filter(anchor=>/href="\.\/manual\/rozesilani-kodu\.html"/.test(anchor)).length,1);
});

const supported=Array.from({length:30},(_,index)=>index+1);
for(const id of ['readingQuestionCount','listeningQuestionCount']){
  await check(`S3.1-F02-${id}-covers-1-through-30`,()=>assert.deepEqual(selectValues(id),supported));
}

await check('S3.1-F03-invalid-total-targets-never-mutate-plan',()=>{
  const {context}=workflowContext({body:20,exerciseDetail:true,exerciseConfigSaved:true,exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),typyCviceni:[]});
  const invalid=['29.7','29.0','2e1','',0,-1,4996,Number.NaN,Number.POSITIVE_INFINITY,null,undefined];
  for(const value of invalid){
    const before=structuredClone(context.state);
    context.__candidate=value;
    assert.equal(vm.runInContext('syncExercisePoints(__candidate)',context),false,`accepted ${String(value)}`);
    assert.deepEqual(context.state,before,`mutated state for ${String(value)}`);
  }
});

await check('S3.1-F03-valid-and-boundary-totals-remain-exact',()=>{
  const {context}=workflowContext({body:20,exerciseDetail:true,exerciseConfigSaved:true,exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),typyCviceni:[]});
  assert.equal(vm.runInContext("syncExercisePoints('29')",context),true);
  assert.deepEqual(Array.from(context.state.exerciseConfig,ex=>ex.body),[6,6,6,6,5]);
  assert.equal(context.state.body,29);
  assert.equal(vm.runInContext('syncExercisePoints(4995)',context),true);
  assert.deepEqual(Array.from(context.state.exerciseConfig,ex=>ex.body),[999,999,999,999,999]);
});

await check('S3.1-F03-custom-total-invalid-input-does-not-save-or-mutate',()=>{
  const {context,elements,counters}=workflowContext({body:20,exerciseDetail:true,exerciseConfigSaved:true,exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),typyCviceni:[]});
  vm.runInContext("$('bodyCustom')",context);
  for(const value of ['29.7','', '0','-1','4996']){
    const before=structuredClone(context.state),saved=counters.saved;
    elements.get('bodyCustom')?.setCustomValidity('');
    elements.get('bodyCustom')?.removeAttribute('aria-invalid');
    elements.get('bodyCustom').value=value;
    assert.equal(vm.runInContext('onCustomBody()',context),false);
    assert.deepEqual(context.state,before);
    assert.equal(counters.saved,saved);
    assert.equal(elements.get('bodyCustom').attributes.get('aria-invalid'),'true');
    assert.equal(elements.get('next2').disabled,true);
  }
  elements.get('bodyCustom').value='29';
  assert.equal(vm.runInContext('onCustomBody()',context),true);
  assert.deepEqual(Array.from(context.state.exerciseConfig,ex=>ex.body),[6,6,6,6,5]);
  assert.equal(counters.saved,1);
});

await check('S3.1-F03-detail-points-reject-non-integers-without-mutation',()=>{
  const {context}=workflowContext({body:20,exerciseDetail:true,exerciseConfigSaved:true,exerciseConfig:Array.from({length:5},()=>({typ:'multiple choice',pocetOtazek:4,body:4})),typyCviceni:[]});
  for(const value of ['4.5','',0,-1,1000]){
    const before=structuredClone(context.state);
    context.__candidate=value;
    assert.equal(vm.runInContext("updateExField(0,'body',__candidate)",context),false);
    assert.deepEqual(context.state,before);
  }
  assert.notEqual(vm.runInContext("updateExField(0,'body','5')",context),false);
  assert.equal(context.state.exerciseConfig[0].body,5);
  assert.equal(context.state.body,21);
});

await check('S3.1-F02-reading-and-listening-primary-controls-cover-boundaries',()=>{
  const {context,elements}=workflowContext({
    readingQuestionCount:4,listeningQuestionCount:4,exerciseDetail:true,exerciseConfigSaved:true,typyCviceni:[],
    exerciseConfig:[
      {typ:'reading comprehension',pocetOtazek:4,body:4},{typ:'reading comprehension',pocetOtazek:17,body:17},
      {typ:'listening comprehension',pocetOtazek:4,body:4},{typ:'listening comprehension',pocetOtazek:19,body:19}
    ]
  });
  for(const value of [1,2,3,8,9,30]){
    context.__candidate=String(value);
    vm.runInContext("setComprehensionQuestionCount('reading comprehension',__candidate)",context);
    assert.equal(context.state.exerciseConfig[0].pocetOtazek,value);
    assert.equal(context.state.exerciseConfig[1].pocetOtazek,17);
    assert.equal(elements.get('readingQuestionCount').value,String(value));
    vm.runInContext("setComprehensionQuestionCount('listening comprehension',__candidate)",context);
    assert.equal(context.state.exerciseConfig[2].pocetOtazek,value);
    assert.equal(context.state.exerciseConfig[3].pocetOtazek,19);
    assert.equal(elements.get('listeningQuestionCount').value,String(value));
  }
  vm.runInContext("updateExField(1,'pocetOtazek','30');updateExField(3,'pocetOtazek','1')",context);
  assert.equal(context.state.readingQuestionCount,30);
  assert.equal(context.state.listeningQuestionCount,30);
  assert.deepEqual(Array.from(context.state.exerciseConfig,ex=>ex.pocetOtazek),[30,30,30,1]);
});

const summary={sprint:'03.1-bounded-remediation',passed:results.filter(result=>result.status==='PASS').length,failed:results.filter(result=>result.status==='FAIL').length,total:results.length,results};
console.log(JSON.stringify(summary,null,2));
if(summary.failed)process.exitCode=1;
