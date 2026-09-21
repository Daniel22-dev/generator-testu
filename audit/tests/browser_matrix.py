from harness import Harness,TESTS
import json,time,traceback
OUT=TESTS.parent/'evidence'
def click_attr(p,attr,val):p.locator('['+attr+'='+json.dumps(val)+']').click()
def answer(p,ex,ei,mode,language):
 t=ex['type']
 for qi,it in enumerate(ex['items']):
  q=f'{ei}_{qi}'
  if t=='matching':p.locator('[onchange='+json.dumps(f'updateMatch({ei},{qi},this.value)')+']').select_option(label=it['right']);continue
  if t in ['multiple choice','reading comprehension','listening comprehension','dialogue completion']:click_attr(p,'onclick',f"selectChoice('{q}',{it['correct']})")
  elif t=='true/false':click_attr(p,'onclick',f"{'selectTF' if mode=='instant' else 'selectChoice'}('{q}',{str(it['correct']).lower()})")
  elif t=='multi-select':
   for n in it['correct']:click_attr(p,'onclick',f"toggleMulti('{q}',{n})")
  elif t=='highlight-evidence':click_attr(p,'onclick',f"selectEvidence('{q}',{it['correct']})")
  elif t=='ordering':
   for n in it['correct_order']:
    if mode=='instant':p.locator('#ordlist_'+q+' [onclick$='+json.dumps(','+str(n)+')')+']').click()
    else:click_attr(p,'onclick',f"clickOrd('{q}',{n})")
  elif t=='categorization':
   fn='updateCategory' if mode=='instant' else 'setResp';p.locator('[onchange='+json.dumps(f"{fn}('{q}',this.value)")+']').select_option(label=it['correct_category'])
  elif t=='categorisation-board':
   for bi,en in enumerate(it['entries']):p.locator('[onchange='+json.dumps(f"setBoard('{q}',{bi},this.value)")+']').select_option(label=en['category'])
  elif t=='error-tagging':
   click_attr(p,'onclick',f"setErrorTagToken('{q}',{it['error_token_index']})");p.locator('[onchange='+json.dumps(f"setErrorTagType('{q}',this.value)")+']').select_option(label=it['error_type']);p.locator('[oninput='+json.dumps(f"setErrorTagCorrection('{q}',this.value)")+']').fill(it['correction'])
  else:
   inputs=p.locator('[oninput*='+json.dumps("'"+q+"'")+']')
   if t=='table-completion':vals=[c['answer'] for r in it['rows'] for c in r if isinstance(c,dict)]
   elif t=='transformation-chain':vals=[r['answer'] for r in it['transformations']]
   elif t in ['fill-in-the-blank','cloze text']:vals=it.get('answers',[it.get('answer')])
   else:vals=[it.get('correction') or it.get('correct_sentence') or it.get('answer') or it.get('translation')]
   assert inputs.count()==len(vals),(t,q,inputs.count(),vals)
   for i,v in enumerate(vals):inputs.nth(i).fill(v)
def run():
 h=Harness();rows=[];beg=time.time()
 try:
  p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());types=p.evaluate('ALL_TYPES');assert len(types)==38
  for language in ['en','es','de','fr','la','cs']:
   for mode in ['instant','secureOffline']:
    for bi in range(0,len(types),10):
     chunk=types[bi:bi+10];row={'language':language,'mode':mode,'types':chunk,'countPerExercise':2};s=v=None;start=time.time()
     try:
      x=p.evaluate('async a=>await auditBuild(a.types,a.mode,a.lang,"target",2)',{'types':chunk,'mode':mode,'lang':language});assert x['cfg']['uiLang']==language,(language,x['cfg']['uiLang']);exs=x['variants']['__default'];assert len(exs)==len(chunk)
      s=h.new_page(x['html']);s.locator('#studentName').fill('QA');click_attr(s,'onclick','startTest()');s.wait_for_timeout(80)
      for ei,ex in enumerate(exs):answer(s,ex,ei,mode,language)
      if mode=='instant':
       sc=s.evaluate('calcScore()');assert sc['earned']==sc['total']==12*len(chunk),sc
       click_attr(s,'onclick','confirmSubmit()');click_attr(s,'onclick','doSubmit()');s.wait_for_function('!document.getElementById("resultScreen").classList.contains("hidden")')
      else:
       click_attr(s,'onclick','submitSecureTest()');s.wait_for_function('typeof ANSWER_TXT==="string" && ANSWER_TXT.startsWith("SECURE-ANSWERS-V1")');txt=s.locator('#answerBackup').input_value();v=h.new_page(x['teacher']);sc=v.evaluate('async txt=>scorePayload(await decryptPayload(parseTxt(txt)))',txt);assert sc['earned']==sc['total']==12*len(chunk),sc
       v.locator('#pasteBox').fill(txt);click_attr(v,'onclick','bulkVerifyPasted()');v.wait_for_function('document.getElementById("resultTable").textContent.includes("QA")')
      assert s.evaluate('__errors')==[],s.evaluate('__errors')
      st=p.evaluate('async()=>await runScoringSelfTest()');assert st['ok'] and not st['hasGaps'],st
      row.update(ok=True,score={'earned':sc['earned'],'total':sc['total']},selfTest=st)
     except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
     finally:
      if s:s.close()
      if v:v.close()
     row['seconds']=round(time.time()-start,2);rows.append(row);print(json.dumps({k:v for k,v in row.items() if k not in ['trace','selfTest']},ensure_ascii=True),flush=True)
     (OUT/'browser-matrix.json').write_text(json.dumps({'scope':'UI input + submission + secure paste import; deterministic AI fixtures, isolated Chromium and Node crypto bridge','runs':rows,'seconds':round(time.time()-beg,2)},indent=2))
  return rows
 finally:h.close()
if __name__=='__main__':run()
