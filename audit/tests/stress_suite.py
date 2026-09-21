from harness import Harness,TESTS
import json,time,traceback
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());data=json.loads((TESTS.parent/'evidence/config-matrix.json').read_text());seen=set()
 for spec in data['thresholds']:
  typ=spec['mechanism']
  if typ in seen:continue
  seen.add(typ)
  for bound in spec['maxima']:
   g=bound['groups'];n=bound['max'];r={'type':typ,'groups':g,'maxItems':n};t=time.time()
   try:
    detail=p.evaluate('''async a=>{auditConfigure([a.typ],'secureOffline','en','target',a.n);if(a.g>1){state.diferencovany='ANO';state.skupiny=Array.from({length:a.g},(_,i)=>({nazev:'G'+i,podminky:'Specific group',studenti:['QA'+i]}));}const plan=generationPlan(state),d=auditFixtures(state,'en'),b=await assembleTestHtml(state,d);generatedPackage=b;lastGenData=d;lastSelfTest=null;const result=await runScoringSelfTest();return {selfTest:result,estimatedTokens:plan.estimatedTokens,studentBytes:new TextEncoder().encode(b.studentHtml).length,teacherBytes:new TextEncoder().encode(b.teacherHtml).length}}''',{'typ':typ,'n':n,'g':g});assert detail['selfTest']['ok'] and not detail['selfTest']['hasGaps'],detail;r.update(ok=True,**detail)
   except Exception as e:r.update(ok=False,error=str(e),trace=traceback.format_exc())
   r['seconds']=round(time.time()-t,2);rows.append(r);(TESTS.parent/'evidence/stress-suite.json').write_text(json.dumps(rows,indent=2));print(json.dumps({k:v for k,v in r.items()if k not in ['selfTest','trace']}),flush=True)
finally:h.close()
