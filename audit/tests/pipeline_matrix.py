from harness import Harness,TESTS
import json,time,traceback
h=Harness();rows=[];started=time.time();out=TESTS.parent/'evidence/pipeline-matrix.json'
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.add_script_tag(content=(TESTS/'pipeline_fixtures.js').read_text());p.evaluate('auditProviderInstall()');types=p.evaluate('ALL_TYPES')
 for lang in ['en','es','de','fr','la']:
  for mode in ['instant','secureOffline']:
   for typ in types:
    r={'language':lang,'mode':mode,'type':typ};st=time.time()
    try:
     gates=p.evaluate('a=>auditReset(["multiple choice"],a.mode,a.lang).gates',{'mode':mode,'lang':lang});assert not any(gates),gates
     p.evaluate('goTo(1)');p.locator('#exConfigList .ex-row select').first.select_option(typ)
     assert p.evaluate('state.exerciseConfig[0].typ')==typ
     p.evaluate('goTo(4)');p.locator('#btnGenerate').click();p.wait_for_function('!window.__GHRAB_GENERATOR_WORKFLOW_ID__',timeout=30000)
     r.update(p.evaluate('({error:$("genError").textContent,calls:__calls.length,hasOutput:!!(generatedTestHtml||generatedPackage),actual:lastAssembled?.variants.__default.map(e=>({type:e.type,style:e.style,items:e.items.length})),uiLang:lastAssembled?.cfg.uiLang,errors:__errors.slice()})'))
     assert r['hasOutput'] and not r['error'] and not r['errors'],r
     assert r['actual'][0]['type']==p.evaluate('(t)=>scoringTypeFor(t)',typ),r
     assert r['uiLang']==lang,r
     r['ok']=True
    except Exception as e:r.update(ok=False,error=str(e));print(json.dumps(r),flush=True)
    r['seconds']=round(time.time()-st,2);rows.append(r)
    out.write_text(json.dumps({'scope':'Actual type-dropdown + generate-button + request validator + assembly/smoke. Provider is deterministic fixture; not live AI.','runs':rows,'seconds':round(time.time()-started,2)},indent=2))
   print(lang,mode,'completed',len(rows),'failed',sum(not x['ok']for x in rows),flush=True)
finally:h.close()
