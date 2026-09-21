from harness import Harness,TESTS
import json,time
h=Harness();start=time.time()
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 result=p.evaluate('''()=>{
 const checks=[],failures=[];let modeCount=0,pairCount=0,boundaryCount=0;
 const check=(ok,label,detail)=>{if(!ok)failures.push({label,detail});};
 auditConfigure(['multiple choice'],'instant','en');const original=JSON.parse(JSON.stringify(state));
 for(const mode of ['simple','advanced'])for(const tm of ['bezny','prisny','procviceci'])for(const rm of ['instant','secureOffline'])for(const fb of ['none','brief','learning'])for(const sub of ['A','B'])for(const diff of ['NE','ANO'])for(const random of ['NE','ANO'])for(const identity of ['name','oneTimeCode']){
  Object.assign(state,original,{appMode:mode,testMode:tm,resultMode:rm,feedbackMode:fb,odevzdavani:sub,diferencovany:diff,randomizace:random,identityMode:identity});enforceModeConstraints();const snap=JSON.stringify(state);enforceModeConstraints();
  const label=[mode,tm,rm,fb,sub,diff,random,identity].join('/');modeCount++;
  check(snap===JSON.stringify(state),'mode-idempotence',label);
  check(state.testMode!=='prisny'||state.resultMode==='secureOffline'&&state.odevzdavani==='B','strict',label);
  check(state.testMode!=='procviceci'||state.resultMode==='instant'&&state.feedbackMode==='learning'&&state.zolicek==='NE','practice',label);
  check(state.resultMode!=='secureOffline'||state.odevzdavani==='B'&&state.feedbackMode==='none','secure',label);
  check(state.feedbackMode!=='none'||state.odevzdavani==='B','feedback',label);
 }
 for(let i=0;i<ALL_TYPES.length;i++)for(let j=i;j<ALL_TYPES.length;j++)for(const groups of [1,3]){
  const types=[ALL_TYPES[i],ALL_TYPES[j]];auditConfigure(types,'instant','en');if(groups>1){state.diferencovany='ANO';state.skupiny=Array.from({length:groups},(_,i)=>({nazev:'G'+i,podminky:'Use group-specific difficulty '+i,studenti:['P'+i]}));}
  try{const plan=generationPlan(state),st=Object.assign({},state,{exerciseConfig:plan.config});const parts=plan.batches.map(indices=>{const slice=exerciseSliceState(st,indices);return {indices,data:auditFixtures(slice,'en')};});const merged=mergeExerciseSlices(st,parts);const norm=normalizeAllVariants(st,merged,getApiDiffGroups(st));check(Object.values(norm).every(xs=>xs.length===2&&xs.every((x,k)=>x.type===scoringTypeFor(types[k]))),'pair-content',types);pairCount++;}
  catch(e){failures.push({label:'pair-exception',types,groups,error:e.message});}
 }
 const thresholds=[];
 for(const type of ALL_TYPES){const maxima=[];for(const groups of [1,2,3]){let allowed=[];for(let n=1;n<=30;n++){
   auditConfigure([type],'instant','en',undefined,n);if(groups>1){state.diferencovany='ANO';state.skupiny=Array.from({length:groups},(_,i)=>({nazev:'G'+i,podminky:'Variation',studenti:['P'+i]}));}
   try{const plan=generationPlan(state);allowed.push({count:plan.specs[0].count,cost:plan.costs[0]});}catch(_){}boundaryCount++;
  }maxima.push({groups,min:allowed.length?Math.min(...allowed.map(x=>x.count)):null,max:allowed.length?Math.max(...allowed.map(x=>x.count)):null});}thresholds.push({type,mechanism:scoringTypeFor(type),maxima});}
 return {modeCount,pairCount,boundaryCount,thresholds,failures};
}''')
 result['seconds']=round(time.time()-start,2);(TESTS.parent/'evidence/config-matrix.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items()if k!='thresholds'},indent=2))
finally:h.close()
