from harness import Harness,TESTS
from browser_matrix import answer,click_attr
import json,time,traceback,itertools
h=Harness();rows=[];out=TESTS.parent/'evidence/runtime-suite.json'
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 configs=p.evaluate('''()=>{auditConfigure(['ordering','translation','matching','multi-select'],'instant','es');const base=JSON.parse(JSON.stringify(state)),out=new Map();for(const layout of ['tabs','scroll'])for(const randomizace of ['ANO','NE'])for(const testMode of ['bezny','prisny','procviceci'])for(const resultMode of ['instant','secureOffline'])for(const feedbackMode of ['none','brief','learning'])for(const odevzdavani of ['A','B']){Object.assign(state,base,{layout,randomizace,testMode,resultMode,feedbackMode,odevzdavani});enforceModeConstraints();const s=Object.fromEntries(['layout','randomizace','testMode','resultMode','feedbackMode','odevzdavani'].map(k=>[k,state[k]]));out.set(JSON.stringify(s),s)}return [...out.values()] }''')
 for cfg in configs:
  row={'config':cfg};s=v=None;beg=time.time()
  try:
   x=p.evaluate('async c=>{auditConfigure(["ordering","translation","matching","multi-select"],c.resultMode,"es");Object.assign(state,c);const b=await assembleTestHtml(state,auditFixtures(state,"es"));return {html:b.studentHtml||b,teacher:b.teacherHtml,variants:lastAssembled.variants}}',cfg)
   mode=cfg['resultMode'];s=h.new_page(x['html']);s.locator('#studentName').fill('QA');click_attr(s,'onclick','startTest()');s.wait_for_function('started' if mode=='instant' else 'STARTED_AT!==""')
   for ei,ex in enumerate(x['variants']['__default']):
    if cfg['layout']=='tabs':s.locator(f'.tab-btn[onclick="switchTab({ei})"]' if mode=='instant' else f'.secure-tab[data-ex="{ei}"]').click()
    answer(s,ex,ei,mode,'es')
    if mode=='instant' and cfg['odevzdavani']=='A':s.locator('#btnSubmitEx'+str(ei)).click();assert s.locator('#btnSubmitEx'+str(ei)).is_disabled()
   if mode=='instant':
    sc=s.evaluate('calcScore()');assert sc['earned']==sc['total']==48,sc
    click_attr(s,'onclick','finishVariantA()' if cfg['odevzdavani']=='A' else 'confirmSubmit()')
    if cfg['odevzdavani']=='B':click_attr(s,'onclick','doSubmit()')
    s.wait_for_function('submitted')
   else:
    click_attr(s,'onclick','submitSecureTest()');s.wait_for_function('ANSWER_TXT.startsWith("SECURE-ANSWERS-V1")');v=h.new_page(x['teacher']);sc=v.evaluate('async txt=>scorePayload(await decryptPayload(parseTxt(txt)))',s.locator('#answerBackup').input_value());assert sc['earned']==sc['total']==48,sc
   assert s.evaluate('__errors')==[],s.evaluate('__errors');row.update(ok=True,score={'earned':sc['earned'],'total':sc['total']})
  except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
  finally:
   if s:s.close()
   if v:v.close()
  row['seconds']=round(time.time()-beg,2);rows.append(row);out.write_text(json.dumps(rows,indent=2));print(json.dumps({k:v for k,v in row.items() if k!='trace'}),flush=True)
finally:h.close()
