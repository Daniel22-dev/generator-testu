from harness import Harness,TESTS,ROOT
from browser_matrix import click_attr
import re,json,traceback,time
src=(ROOT/'src/js/50-cs-module.js').read_text()
keys=re.findall(r'^    (cs_\w+):\{label:',src,re.M)
pre=re.findall(r'^    (\w+):\{label:',src.split('const CS_PRESETS = {')[1].split('\n  };')[0],re.M)
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.add_script_tag(content=(TESTS/'pipeline_fixtures.js').read_text());p.evaluate('auditProviderInstall()')
 # Real entry modal and three pages.
 p.evaluate('()=>{auditReset(["multiple choice"],"instant","en");goTo(0)}');p.locator('#jazykBtns .flag-cz').click();p.locator('[data-cs-open]').click();assert p.evaluate('csModule().csPage')==0
 p.locator('#next1').click();assert p.evaluate('csModule().csPage')==1;p.locator('#next1').click();assert p.evaluate('csModule().csPage')==2
 rows.append({'test':'czech-entry-three-pages','ok':True})
 for scope,values in [('exercise',keys),('preset',pre)]:
  for key in values:
   row={'scope':scope,'key':key}
   try:
    p.evaluate('()=>{auditReset(["multiple choice"],"instant","cs");state.simpleTemplate="";state.appMode="advanced";Object.assign(csModule(),{domain:"kombinovane",exerciseTypes:["cs_spell_choice"],correctionMode:"auto",preset:"",csPage:1});csGoPage(1)}')
    if scope=='exercise':
     click_attr(p,'onclick',"csToggleExercise('"+key+"')")
     if key!='cs_spell_choice':click_attr(p,'onclick',"csToggleExercise('cs_spell_choice')")
    else:click_attr(p,'onclick',"csChoosePreset('"+key+"')")
    exp=p.evaluate('state.exerciseConfig.map(x=>({key:x.csExerciseKey,type:x.typ,count:x.pocetOtazek}))');assert exp
    p.evaluate('goTo(4)');p.locator('#btnGenerate').click();p.wait_for_function('!window.__GHRAB_GENERATOR_WORKFLOW_ID__',timeout=30000)
    d=p.evaluate('({error:$("genError").classList.contains("hidden")?"":$("genError").textContent,cfg:lastAssembled?.cfg,ex:lastAssembled?.variants.__default,state:lastAssembled?.sourceState,calls:__calls.map(c=>({ex:c.state.exerciseConfig.map(x=>x.csExerciseKey),keys:c.state.csModule.exerciseTypes}))})')
    assert not d['error'],d['error'];assert d['cfg']['uiLang']=='cs'and d['cfg']['isCzech'];assert len(d['ex'])==len(exp)
    assert [e['type']for e in d['ex']]==[e['type']for e in exp]
    assert all(c['ex']==c['keys']for c in d['calls']),d['calls']
    assert [e['csExerciseKey']for e in d['state']['exerciseConfig']]==[e['key']for e in exp]
    st=p.evaluate('async()=>await runScoringSelfTest()');assert st['ok'] and not st['hasGaps'],st
    row.update(ok=True,exerciseCount=len(exp),types=[e['type']for e in exp],correction=d['cfg']['csScoringPolicy']['correctionMode'],mode=d['cfg']['resultMode'],calls=len(d['calls']),selfTest=st)
   except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('closeUiModal(null)')
   rows.append(row);print(json.dumps({k:v for k,v in row.items()if k not in ['trace','selfTest']}),flush=True);(TESTS.parent/'evidence/czech-suite.json').write_text(json.dumps(rows,indent=2))
 row={'test':'czech-max10-and-topic-persistence'}
 try:
  p.evaluate('()=>{auditReset(["multiple choice"],"instant","cs");Object.assign(csModule(),{domain:"kombinovane",exerciseTypes:["cs_spell_choice"],correctionMode:"auto"});$("latka").value="CUSTOM TOPIC PRESERVED";csGoPage(1)}')
  for key in keys[1:11]:click_attr(p,'onclick',"csToggleExercise('"+key+"')")
  assert p.evaluate('state.exerciseConfig.length')==10
  assert p.evaluate('$("latka").value')=='CUSTOM TOPIC PRESERVED';row.update(ok=True)
 except Exception as e:row.update(ok=False,error=str(e))
 rows.append(row);print(row,flush=True);(TESTS.parent/'evidence/czech-suite.json').write_text(json.dumps(rows,indent=2))
finally:h.close()
