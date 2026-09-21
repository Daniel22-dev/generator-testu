from harness import Harness,TESTS
from browser_matrix import click_attr
import json,time,traceback
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.add_script_tag(content=(TESTS/'pipeline_fixtures.js').read_text());p.evaluate('auditProviderInstall()')
 for lang in ['en','es','de','fr','la']:
  for purpose in ['practice','standard','strict']:
   row={'scope':'simple-wizard','language':lang,'purpose':purpose}
   try:
    p.evaluate('(lang)=>{auditReset(["multiple choice","translation"],"instant",lang);state.appMode="simple";state.simpleTemplate="";state.pocet=2;state.body=24;applySimpleDefaults();applyVisualState();validate();goTo(0)}',lang)
    jaz=p.evaluate('state.jazyk');p.locator('#jazykBtns [data-val='+json.dumps(jaz,ensure_ascii=False)+']').click();p.locator('#nazev').fill('Wizard '+lang);p.locator('#proKoho').fill('QA students');p.locator('#latka').fill('Water and rivers')
    p.locator('#next0').click();click_attr(p,'onclick',f"chooseSimplePurpose('{purpose}')");assert p.evaluate('state.appMode')=='simple';p.locator('#next1').click();assert not p.locator('#next2').is_disabled();p.locator('#next2').click();p.locator('#ucitelJmeno').fill('QA Teacher');p.locator('#ucitelPin').fill('AUDIT-TEACHER-482957');p.locator('#next3').click();p.locator('#btnGenerate').click();p.wait_for_function('!window.__GHRAB_GENERATOR_WORKFLOW_ID__',timeout=25000)
    d=p.evaluate('({error:$("genError").classList.contains("hidden")?"":$("genError").textContent,cfg:lastAssembled?.cfg,ex:lastAssembled?.variants.__default.length,calls:__calls.length,errors:__errors})');assert not d['error'] and d['ex']==2,d
    assert d['cfg']['uiLang']==lang and d['cfg']['resultMode']==('secureOffline'if purpose=='strict'else'instant'),d['cfg'];row.update(ok=True,calls=d['calls'],mode=d['cfg']['resultMode'],layout=d['cfg']['layout'])
   except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('closeUiModal(null)')
   rows.append(row);print(json.dumps({k:v for k,v in row.items()if k!='trace'}),flush=True);(TESTS.parent/'evidence/wizard-suite.json').write_text(json.dumps(rows,indent=2))
 # Actual confirmation on switching advanced settings away.
 row={'scope':'mode-switch-confirmation'}
 try:
  p.evaluate('()=>{auditReset(["translation"],"instant","en");state.identityMode="oneTimeCode";state.diferencovany="ANO";state.splitGenerate=true;state.layout="scroll";state.instrJazyk="mixed";state.exerciseConfig[0].pocetOtazek=7;applyVisualState();goTo(0)}')
  before=p.evaluate('JSON.stringify(state)');click_attr(p,'onclick',"setAppMode('simple')");p.locator('#uiModal [data-ui-cancel]').click();assert p.evaluate('JSON.stringify(state)')==before
  click_attr(p,'onclick',"setAppMode('simple')");p.locator('#uiModal [data-ui-ok]').click();p.wait_for_function('state.appMode==="simple"');d=p.evaluate('({identity:state.identityMode,diff:state.diferencovany,split:state.splitGenerate,layout:state.layout,instr:state.instrJazyk,detail:state.exerciseDetail,topic:$("latka").value})');assert d['identity']=='name'and d['diff']=='NE'and not d['split']and d['layout']=='tabs'and d['instr']=='target'and not d['detail'],d
  click_attr(p,'onclick',"setAppMode('advanced')");assert p.evaluate('state.appMode')=='advanced';row.update(ok=True,defaults=d)
 except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
 rows.append(row);print(row,flush=True);(TESTS.parent/'evidence/wizard-suite.json').write_text(json.dumps(rows,indent=2))
finally:h.close()
