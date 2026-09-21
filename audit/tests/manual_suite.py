from harness import Harness,TESTS
from browser_matrix import answer,click_attr
import json,time,traceback
TYPES=['categorisation-board','ordering','multi-select','highlight-evidence','transformation-chain','error-tagging','banked cloze','multiple matching','table-completion']
def fill_form(p,t):
 count=1 if t=='categorisation-board' else 2
 if t=='categorisation-board':
  p.locator('#mfQuestion0').fill('Sort A and B')
  for i,x in enumerate(['A','B']):p.locator('.mf-cat-inp').nth(i).fill(x)
  for i in range(p.locator('.mf-entry-text').count()):p.locator('.mf-entry-text').nth(i).fill('Item '+str(i));p.locator('.mf-entry-cat').nth(i).select_option(label=['A','B'][i%2])
 else:
  for k in range(count):
   q=p.locator('#mfQuestion'+str(k))
   if q.count():q.fill('Task '+str(k))
   if t=='ordering':
    for i in range(3):p.locator(f'#mfSteps{k} input').nth(i).fill('Step '+str(i))
   elif t=='multi-select':
    for i in range(4):p.locator(f'#mfOptions{k} input:not([type=checkbox])').nth(i).fill('Option '+str(i))
    p.locator(f'#mfOptions{k} .mf-chk').nth(0).check();p.locator(f'#mfOptions{k} .mf-chk').nth(2).check()
   elif t=='highlight-evidence':
    for i in range(3):p.locator(f'#mfSentences{k} input:not([type=radio])').nth(i).fill('Sentence '+str(i))
    p.locator(f'#mfSentences{k} input[type=radio]').nth(1).check()
   elif t=='transformation-chain':
    for i in range(2):
     row=p.locator(f'#mfChain{k} .mf-chain-step').nth(i)
     row.locator('[data-field=instruction]').fill('Write word '+str(i));row.locator('[data-field=answer]').fill(['water','river'][i]);row.locator('[data-field=alts]').fill(['WATER ALT','RIVER ALT'][i])
   elif t=='error-tagging':
    for field,v in {'Sentence':'A X B','ErrIdx':'1','ErrType':'grammar','ErrOptions':'grammar | spelling','ErrCorr':'water'}.items():p.locator(f'#mf{field}{k}').fill(v)
   elif t=='banked cloze':
    for field,v in {'Text':'Words ___ and ___.','Bank':'water, river, moon','Answers':'water, river'}.items():p.locator(f'#mf{field}{k}').fill(v)
   elif t=='multiple matching':
    p.locator('#mfLeft'+str(k)).fill('Left '+str(k));p.locator('#mfRight'+str(k)).fill('Right '+str(k))
   elif t=='table-completion':
    p.locator('#mfHeaders'+str(k)).fill('Base | Past | Participle');p.locator(f'#mfTableRows{k} input').nth(0).fill('go | | gone');p.locator(f'#mfTableRows{k} input').nth(1).fill('write | wrote | ');p.locator('#mfTableAnswers'+str(k)).fill('went | written')
 modal=p.locator('#manualEditorBackdrop').element_handle();p.locator('#btnMfOk').click();modal.wait_for_element_state('hidden',timeout=5000)

def run():
 h=Harness();rows=[]
 try:
  p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
  for t in TYPES:
   row={'type':t};s=None
   try:
    p.evaluate('(t)=>{auditConfigure([t],"instant","en");window.__manualResult=null;showManualExerciseForm(state.exerciseConfig[0],0).then(x=>window.__manualResult=x)}',t)
    p.locator('#btnMfOk').click();assert p.locator('.mf-validation-error').is_visible()
    fill_form(p,t)
    built=p.evaluate('async()=>{const d={exercises:[__manualResult]};lastGenData=d;const html=await assembleTestHtml(state,d);generatedTestHtml=html;setGenUI("done");return {html,ex:lastAssembled.variants.__default[0]}}')
    s=h.new_page(built['html']);s.locator('#studentName').fill('QA');click_attr(s,'onclick','startTest()');s.wait_for_function('started');answer(s,built['ex'],0,'instant','en');sc=s.evaluate('calcScore()');assert sc['earned']==sc['total']==12,sc
    st=p.evaluate('async()=>await runScoringSelfTest()');assert st['ok'] and not st['hasGaps'],st
    row.update(ok=True,score=sc,invalidBlocked=True,selfTest=st)
   except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('document.getElementById("manualEditorBackdrop")?.remove()')
   finally:
    if s:s.close()
   rows.append(row);print(json.dumps({k:v for k,v in row.items()if k not in ['selfTest','score','trace']}),flush=True)
   (TESTS.parent/'evidence/manual-suite.json').write_text(json.dumps(rows,indent=2))
 finally:h.close()
if __name__=='__main__':run()
