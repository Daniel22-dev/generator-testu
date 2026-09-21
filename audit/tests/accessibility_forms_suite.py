from harness import Harness,TESTS
from browser_matrix import click_attr,answer
import json,itertools,traceback
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 for lang in ['en','es','de','fr','la','cs']:
  for mode in ['instant','secureOffline']:
   r={'language':lang,'mode':mode};s=None
   try:
    x=p.evaluate('''async a=>{auditConfigure(['translation'],a.mode,a.lang);state.diferencovany='ANO';state.skupiny=[{nazev:'QA',podminky:'Review group',studenti:['QA'],a11y:{time:'150',font:'large',dys:true}}];state.__formsSubmissionUrl='https://docs.google.com/forms/d/e/AUDIT/viewform';const b=await assembleTestHtml(state,auditFixtures(state,a.lang));return {html:b.studentHtml||b,variants:lastAssembled.variants,cfg:lastAssembled.cfg}}''',{'mode':mode,'lang':lang})
    s=h.new_page(x['html']);s.locator('#studentName').fill('QA');click_attr(s,'onclick','startTest()');s.wait_for_function('started' if mode=='instant' else 'STARTED_AT!==""')
    timing=s.evaluate('({a:A11Y,time:'+('timerVal' if mode=='instant' else '(TIMER_DEADLINE-Date.now())/1000')+',text:document.getElementById("a11yNote").textContent})');assert 2690<timing['time']<=2700,timing;assert x['cfg']['labels']['a11yActive'] in timing['text'],timing
    for t,f,d in itertools.product(['normal','125','150','200','none'],['normal','large','xlarge'],[False,True]):
     got=s.evaluate('a=>{CFG.diffGroups[0].a11y=a;'+('applyA11yInstant' if mode=='instant' else 'applyA11y')+'("g1");return {a:A11Y,classes:document.body.className}}',{'time':t,'font':f,'dys':d});assert got['a']['timeMult']=={'125':1.25,'150':1.5,'200':2}.get(t,1) and got['a']['noLimit']==(t=='none');assert ('a11y-large' in got['classes'])==(f=='large') and ('a11y-xlarge' in got['classes'])==(f=='xlarge') and ('a11y-dys' in got['classes'])==d
    r['supportConfigurations']=30
    if mode=='secureOffline':
     answer(s,x['variants']['g1'][0],0,mode,lang);click_attr(s,'onclick','submitSecureTest()');s.wait_for_function('ANSWER_TXT.startsWith("SECURE-ANSWERS-V1")');assert s.locator('#formsSubmissionBox').is_visible()
     s.evaluate('()=>{window.__copied="";copyTextSafe=async text=>{window.__copied=text;return true};window.__opened="";window.open=url=>{window.__opened=url;return {opener:null}};}');click_attr(s,'onclick','copySubmissionPayload()');s.wait_for_function('__copied===ANSWER_TXT');click_attr(s,'onclick','openSubmissionForm()');assert s.evaluate('__opened')==x['cfg']['formsSubmissionUrl']
     urls=['https://docs.google.com/forms/d/e/AUDIT/viewform','https://forms.gle/AUDIT','http://forms.gle/AUDIT','https://evil.example.invalid/forms/d/e/a/viewform','https://docs.google.com/forms/d/e/a/edit','javascript:alert(1)']
     for url,ok in zip(urls,[True,True,False,False,False,False]):assert s.evaluate('url=>{CFG.formsSubmissionUrl=url;return !!safeFormsSubmissionUrl()}',url)==ok
     s.evaluate('url=>{CFG.formsSubmissionUrl=url;ANSWER_TXT="x".repeat(formsPayloadLimit()+1);refreshSubmissionOptions()}',x['cfg']['formsSubmissionUrl']);assert not s.locator('#formsSubmissionBox').is_visible() and s.locator('#formsPayloadWarning').is_visible() and s.locator('#answersFallback').evaluate('(e)=>e.open');r.update(formsCopyAndOpen=True,urlCases=6,oversizeFallback=True)
    r['ok']=True
   except Exception as e:r.update(ok=False,error=str(e),trace=traceback.format_exc())
   finally:
    if s:s.close()
   rows.append(r);(TESTS.parent/'evidence/accessibility-forms-suite.json').write_text(json.dumps(rows,indent=2));print(json.dumps({k:v for k,v in r.items()if k!='trace'}),flush=True)
finally:h.close()
