from harness import Harness,TESTS
from manual_suite import fill_form
from browser_matrix import answer,click_attr
import json,traceback,time
h=Harness();rows=[];out=TESTS.parent/'evidence/integration-suite.json'
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.add_script_tag(content=(TESTS/'pipeline_fixtures.js').read_text());p.evaluate('auditProviderInstall()')
 def reset(types,mode='instant',lang='en'):
  p.evaluate('a=>{auditReset(a.types,a.mode,a.lang);generatedTestHtml="";generatedPackage=null;lastAssembled=null;lastGenData=null;lastSelfTest=null;geminiCancelRequested=false;setGenUI("idle");setGenErr("");}',{'types':types,'mode':mode,'lang':lang})
 def start():p.locator('#btnGenerate').click()
 def done():p.wait_for_function('!window.__GHRAB_GENERATOR_WORKFLOW_ID__',timeout=40000)
 def status():return p.evaluate('({error:$("genError").classList.contains("hidden")?"":$("genError").textContent,output:!!lastAssembled,calls:__calls.length,types:lastAssembled?Object.entries(lastAssembled.variants).filter(([k])=>Object.keys(lastAssembled.variants).length===1||k!=="__default").map(([,xs])=>xs.map(x=>x.style)):[],disabled:$("btnGenerate").disabled})')
 def case(name,fn):
  row={'case':name};t=time.time()
  try:row.update(fn()or{},ok=True)
  except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
  row['seconds']=round(time.time()-t,2);rows.append(row);out.write_text(json.dumps(rows,indent=2));print(json.dumps({k:v for k,v in row.items()if k!='trace'}),flush=True)
 def hybrid(groups,mode):
  types=['ordering','translation','table-completion'];reset(types,mode)
  p.evaluate('g=>{if(g>1){state.diferencovany="ANO";state.skupiny=Array.from({length:g},(_,i)=>({nazev:"G"+i,podminky:"Group-specific difficulty "+i,studenti:["QA"+i]}));}goTo(1);renderExerciseConfig();}',groups)
  p.locator('[onclick="updateExField(0,\'manualMode\',true)"]').click();p.locator('[onclick="updateExField(2,\'manualMode\',true)"]').click();p.evaluate('validate();goTo(4)');start()
  for t in ['ordering','table-completion']:
   for _ in range(groups):p.wait_for_selector('#manualEditorBackdrop');fill_form(p,t)
  done();s=status();assert s['output'] and not s['error'] and s['calls']==1,s;assert len(s['types'])==groups and all(x==types for x in s['types']),s
  result=p.evaluate('async()=>await runScoringSelfTest()');assert result['ok'] and not result['hasGaps'],result
  return {'groups':groups,'mode':mode,'AIcalls':s['calls'],'selfTest':result}
 for g in [1,2]:
  for m in ['instant','secureOffline']:case('hybrid-manual-AI-'+str(g)+'-'+m,lambda g=g,m=m:hybrid(g,m))
 def manualonly():
  reset(['ordering']);p.evaluate('state.exerciseConfig[0].manualMode=true;genAiAvailable=()=>false;validate()');start();p.wait_for_selector('#manualEditorBackdrop');fill_form(p,'ordering');done();s=status();p.evaluate('genAiAvailable=()=>true');assert s['output'] and s['calls']==0 and not s['error'],s;return s
 case('all-manual-no-AI',manualonly)
 def fallback(abort):
  reset(['ordering']);p.evaluate('state.exerciseConfig[0].manualMode=true;validate()');start();p.wait_for_selector('#manualEditorBackdrop');p.locator('#btnMfAbort' if abort else '#btnMfCancel').click();done();s=status();assert s['output']!=abort and s['calls']==(0 if abort else 1),s;assert not s['disabled'],s;return s
 case('manual-cancel-falls-back-to-AI',lambda:fallback(False));case('manual-abort-whole-generation',lambda:fallback(True))
 def provider(behavior,expected_calls,ok):
  reset(['multiple choice']);p.evaluate('b=>{__providerBehavior=b}',behavior);start();done();s=status();assert s['calls']==expected_calls and s['output']==ok,s;assert not s['disabled'],s;return s
 for b,c,o in [('repair',2,True),('invalid',2,False),('throw',1,False),('cancel',1,False)]:case('provider-'+b,lambda b=b,c=c,o=o:provider(b,c,o))
 def retry():
  p.evaluate('__providerBehavior="valid";__calls=[]');start();done();s=status();assert s['output'] and not s['error'],s;return s
 case('retry-after-cancel',retry)
 def preserve():
  prev=p.evaluate('({html:generatedTestHtml,id:lastAssembled.cfg.testId})');p.evaluate('__providerBehavior="throw";__calls=[]');start();done();s=status();now=p.evaluate('({html:generatedTestHtml,id:lastAssembled.cfg.testId})');assert prev==now and s['output'] and not s['disabled'],s;return {'oldOutputUnchanged':True}
 case('failed-regeneration-preserves-output',preserve)
 def mixed(lang,groups,split):
  types=['translation','listening comprehension','cloze text','matching','ordering','word formation','table-completion','reading comprehension'];reset(types,'secureOffline',lang)
  p.evaluate('a=>{state.exerciseConfig.forEach(e=>e.pocetOtazek=5);state.splitGenerate=a.split;if(a.groups>1){state.diferencovany="ANO";state.skupiny=Array.from({length:a.groups},(_,i)=>({nazev:"G"+i,podminky:"Specific group "+i,studenti:["QA"+i]}));}validate();}',{'groups':groups,'split':split})
  planned=p.evaluate('generationPlan(state)');start();done();s=status();assert s['output'] and not s['error'] and len(s['types'])==groups and all(x==types for x in s['types']),s;assert s['calls']==len(planned['batches']),s
  st=p.evaluate('async()=>await runScoringSelfTest()');assert st['ok'] and not st['hasGaps'],st
  return {'lang':lang,'groups':groups,'itemsEach':5,'split':split,'calls':s['calls'],'selfTest':st}
 for lang,groups,split in [('es',1,False),('fr',3,False),('la',2,True)]:case('eight-mixed-'+lang,lambda l=lang,g=groups,s=split:mixed(l,g,s))
 def huge():
  reset(['table-completion']*8);p.evaluate('state.exerciseConfig.forEach(e=>e.pocetOtazek=30);validate()');assert p.locator('#btnGenerate').is_disabled() or p.evaluate('()=>{try{generationPlan(state);return false}catch{return true}}');assert p.evaluate('__calls.length')==0;return {'blockedBeforeAI':True}
 case('oversized-eight-complex-blocked-before-AI',huge)
finally:h.close()
