"""User-journey / task-completion regressions (workflow audit 2026-09-29).

Every case drives the REAL UI by clicks. Only the AI provider HTTP boundary
(fetch to generativelanguage.googleapis.com) is replaced, so callGeminiJSON,
HTTP error handling, retries, commitAnswerData and all download gates run as in
production. Each assertion checks what the teacher/student actually sees or can
do next, not only internal state.
"""
from harness import Harness,TESTS
import json,re,time,traceback

FETCH_MOCK=r'''
(()=>{
 window.__aiLog=[];window.__aiScript=[];
 const orig=buildContentPrompt;buildContentPrompt=function(st,notes){window.__requestState=JSON.parse(JSON.stringify(st));return orig(st,notes);};
 const realFetch=window.fetch.bind(window);
 const gem=o=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(o)}]},finishReason:'STOP'}]}),{status:200,headers:{'content-type':'application/json'}});
 window.fetch=async function(url,opts){
  const u=String(url&&url.url||url);
  if(!/generativelanguage\.googleapis\.com/.test(u))return realFetch(url,opts);
  const body=JSON.parse(opts&&opts.body||'{}');
  const prompt=(body.contents||[]).flatMap(c=>c.parts||[]).map(p=>p.text||'').join('\n');
  const kind=/Independently solve every task/.test(prompt)?'keycheck':(/ACCEPTABLE ANSWER PROPOSALS/.test(prompt)?'enrich':'gen');
  const m=prompt.match(/BEGIN_UNTRUSTED_SOURCE\n\([^\n]*\)\n([\s\S]*?)\nEND_UNTRUSTED_SOURCE/);let block=null;try{block=m?JSON.parse(m[1]):null}catch(e){}
  const beh=__aiScript.length?__aiScript.shift():'ok';__aiLog.push({kind,beh:typeof beh==='object'?'HTTP '+beh.status:beh});
  if(typeof beh==='object'&&beh.status)return new Response(JSON.stringify({error:{code:beh.status,message:beh.message||'mock',status:beh.apiStatus||''}}),{status:beh.status,headers:{'content-type':'application/json'}});
  if(beh==='malformed')return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"exercises": [ {"type": oops'}]},finishReason:'STOP'}]}),{status:200,headers:{'content-type':'application/json'}});
  if(kind==='keycheck')return gem({answers:window.__aiKeyAnswers(block||[])});
  if(kind==='enrich')return gem(window.__aiEnrichPayload?window.__aiEnrichPayload(block||[]):{items:(block||[]).map(x=>({id:x.id,alts:[]}))});
  return gem(auditFixtures(__requestState,getUiLang('target',__requestState.jazyk)));
 };
 window.__setKeyAnswers=function(diffs){window.__aiKeyAnswers=function(items){return items.map(x=>{let a=x.type==='multiple choice'?1:x.type==='true/false'?true:x.type==='fill-in-the-blank'?['water']:'water';if(diffs&&diffs[String(x.i)]!==undefined)a=diffs[String(x.i)];return {i:x.i,a};});};};
})()
'''

class Journey:
 def __init__(s,h):
  s.h=h;s.p=h.app()
  s.p.add_script_tag(content=(TESTS/'fixtures.js').read_text());s.p.evaluate(FETCH_MOCK)
 def ev(s,js,arg=None):return s.p.evaluate(js) if arg is None else s.p.evaluate(js,arg)
 def text(s,sel):return s.ev("(q)=>{const e=document.querySelector(q);if(!e)return null;return (e.offsetWidth||e.offsetHeight||e.getClientRects().length)?e.innerText:''}",sel)
 def modal(s):return s.ev("()=>{const m=document.getElementById('uiModal');return m&&!m.classList.contains('hidden')&&m.offsetWidth?m.innerText:null}")
 def ok(s):s.p.locator('#uiModal [data-ui-ok]').click()
 def cancel(s):s.p.locator('#uiModal [data-ui-cancel]').click()
 def to_step3(s,purpose='Běžný test'):
  p=s.p;p.fill('#geminiKeyInput','AIzaTEST-journey-000000000000000000');p.click('#btnUseKeySession')
  p.fill('#nazev','Journey test');p.fill('#proKoho','3.A')
  p.locator('#jazykBtns').get_by_role('button',name=re.compile('Angličtina')).click()
  p.fill('#latka','Present perfect');p.click('#next0')
  p.locator('#simpleTemplateBtns').get_by_role('button',name=re.compile(purpose)).click()
  for t in ('multiple choice','fill-in-the-blank','true/false'):p.locator('#typyBtns').get_by_role('button',name=t,exact=True).first.click()
  p.locator('#cefrBtns').get_by_role('button',name='B1',exact=True).click()
  p.fill('#zadaniText','Present perfect: have/has + past participle; past simple for finished time.')
  p.click('#next1');p.click('#next2')
  if not p.input_value('#ucitelJmeno'):p.fill('#ucitelJmeno','Jana Učitelová')
 def generate(s,accept=True,timeout=40):
  s.p.click('#btnGenerate');t0=time.time();seen=[]
  while time.time()-t0<timeout:
   m=s.modal()
   if m:
    seen.append(m.split('\n')[0])
    if accept:s.ok()
    else:s.cancel();return seen
   st=s.ev("()=>({busy:!!window.__GHRAB_GENERATOR_WORKFLOW_ID__,res:!document.getElementById('genResult').classList.contains('hidden'),err:!document.getElementById('genError').classList.contains('hidden')&&!!document.getElementById('genError').innerText.trim()})")
   if not st['busy'] and (st['res'] or st['err']) and time.time()-t0>0.5:return seen
   s.p.wait_for_timeout(150)
  raise AssertionError('generation timeout '+str(seen))
 def ensure_teacher_secret(s):
  if not s.p.input_value('#ucitelPin'):
   s.p.get_by_role('button',name=re.compile('Vygenerovat tajný učitelský kód')).click()
  assert len(s.p.input_value('#ucitelPin'))>=12,'Teacher/Admin secret must satisfy current policy'
 def ensure_recovery_if_required(s):
  required=s.ev("()=>state.testMode==='prisny'||!!state.screenGuard")
  if required and not s.p.input_value('#recoveryCode'):
   s.p.get_by_role('button',name=re.compile('Vygenerovat náhodný Recovery kód')).click()
  if required:
   assert len(s.p.input_value('#recoveryCode'))>=8,'Recovery code is required for the active lock mode'
   assert s.p.input_value('#recoveryCode')!=s.p.input_value('#ucitelPin'),'Teacher/Admin and Recovery credentials must stay distinct'
 def new_test(s,purpose='Běžný test'):
  s.to_step3(purpose)
  s.ensure_teacher_secret();s.ensure_recovery_if_required()
  s.p.click('#next3');s.generate()
  assert s.text('#genResult'),'result panel not visible'
 def selftest(s):
  s.p.click('#resultTab2');s.p.click('#btnSelfTest');s.p.wait_for_function("!document.getElementById('btnSelfTest').disabled&&!!lastSelfTest",timeout=30000)
 def checklist(s):
  s.p.click('#resultTab1');box=s.p.locator('#exportChecklist')
  if box.get_attribute('open') is None:box.locator('summary').click()
  for i in range(box.locator('input[type=checkbox]').count()):box.locator('input[type=checkbox]').nth(i).check()
 def keycheck(s,diffs):
  s.ev("(d)=>__setKeyAnswers(d)",diffs);s.p.click('#resultTab3');s.p.click('#btnKeyCheck');s.p.wait_for_function('!akvBusy',timeout=30000);s.p.wait_for_timeout(300)
 def gate(s):return s.ev("()=>({allowed:secureDownloadAllowed(),banner:(document.getElementById('secureGateBanner')||{}).innerText||'',steps:[...document.querySelectorAll('[data-result-step]')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())})")
 def download(s,sel):
  n=s.ev('()=>__downloads.length');s.p.click('#resultTab4');s.p.click(sel)
  for _ in range(60):
   if s.modal():s.ok()
   if s.ev('()=>__downloads.length')>n:break
   s.p.wait_for_timeout(150)
  return s.ev("async()=>{const d=__downloads.at(-1);return {name:d.name,text:await __readDownloadText(-1)}}")

def answer_instant(fr,good=lambda k:True):
 k=0
 for ei in range(fr.evaluate("document.querySelectorAll('.ex-panel').length")):
  fr.evaluate(f"switchTab({ei})")
  for qid in fr.evaluate(f"[...document.querySelectorAll('#exPanel{ei} .question')].map(q=>q.id)"):
   g=good(k);k+=1;q=fr.locator('#'+qid)
   if q.locator('.mc-opt').count():q.locator('.mc-opt',has_text='water' if g else 'river').first.click()
   elif q.locator('.fib-inp').count():q.locator('.fib-inp').first.fill('water' if g else 'wrong')
   else:q.locator(f'.tf-btn[data-val="{"true" if g else "false"}"]').click()
def submit_instant(fr):
 fr.locator('button:visible',has_text=re.compile('Submit')).last.click();fr.wait_for_timeout(300)
 y=fr.locator('button:visible',has_text=re.compile('Yes, submit'))
 if y.count():y.first.click()
 fr.wait_for_timeout(500);return fr.evaluate('document.body.innerText')
def answer_secure(sp):
 for ei in range(sp.evaluate("document.querySelectorAll('.ex-panel').length")):
  sp.locator(f'.secure-tab[data-ex="{ei}"]').click();panel=sp.locator(f'.ex-panel[data-ex="{ei}"]')
  for qi in range(panel.locator('.q').count()):
   q=panel.locator('.q').nth(qi)
   if q.locator('.opt').count():
    texts=[t.strip() for t in q.locator('.opt').all_inner_texts()]
    q.locator('.opt',has_text=re.compile('^True$' if 'True' in texts else r'\bwater\b')).first.click()
   else:q.locator('input').first.fill('water')

h=Harness();rows=[];out=TESTS.parent/'evidence/journey-suite.json'
def record(name,fn):
 row={'case':name}
 try:
  j=Journey(h)
  try:row.update(fn(j)or{},ok=True)
  finally:
   errs=j.ev('()=>window.__errors.slice()');j.p.close()
   if errs and row.get('ok'):row.update(ok=False,error='page errors: '+str(errs))
 except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
 rows.append(row);out.write_text(json.dumps(rows,indent=2,ensure_ascii=False));print(json.dumps({k:v for k,v in row.items()if k!='trace'},ensure_ascii=False),flush=True)
try:
 def simple_instant_to_student(j):
  j.new_test('Běžný test')
  score=j.ev("()=>document.querySelector('#didacticPanel .quality-score').innerText")
  assert score.endswith('30 b'),('didactic points must match the test (F-03)',score)
  j.p.click('#btnPreview');j.p.wait_for_timeout(700);fr=[f for f in j.p.frames if f!=j.p.main_frame][0]
  fr.fill('#studentName','Jana Nováková');fr.get_by_role('button',name=re.compile('Start')).first.click()
  answer_instant(fr,lambda k:k%2==0);res=submit_instant(fr)
  assert '16/30' in res and '53%' in res,('preview must score like the student test',res[:300])
  j.p.get_by_role('button',name='Zavřít náhled').click()  # Escape uvnitř sandboxovaného iframe náhled nezavře (MINOR, viz report)
  d=j.download('#btnDownloadMain');assert not j.text('#lockUnlockHint'),'no unlock hint for a test without lock'
  sp=h.new_page(d['text']);sp.wait_for_timeout(600)
  label=sp.evaluate("[document.querySelector('label[for=studentName]').innerText,document.getElementById('studentName').placeholder]")
  assert 'A1' not in ' '.join(label),('name identity must not ask for code A1 (F-04)',label)
  pts=sp.evaluate("document.querySelector('.q-pts').textContent")
  assert pts.strip().endswith('pts'),('English test must not show Czech b (F-12)',pts)
  sp.fill('#studentName','Petr Svoboda');sp.get_by_role('button',name=re.compile('Start')).first.click()
  answer_instant(sp.main_frame);res=submit_instant(sp.main_frame);sp.close()
  assert '30/30' in res and '100%' in res,res[:300]
  return {'didactic':score,'label':label,'points':pts}
 record('simple-instant-teacher-to-student',simple_instant_to_student)

 def missing_teacher_name(j):
  j.to_step3();j.ensure_teacher_secret();j.p.fill('#ucitelJmeno','')
  hint=j.text('#validHint3');assert j.p.locator('#next3').is_disabled() and 'jméno' in hint.lower(),('disabled step must say why (F-01)',hint)
  j.p.fill('#ucitelJmeno','Učitel');assert not j.p.locator('#next3').is_disabled()
  return {'hint':hint}
 def empty_teacher_name_by_default(j):
  assert j.p.input_value('#ucitelJmeno')=='',('no preset author name (F-02)',j.p.input_value('#ucitelJmeno'))
  legacy=j.ev("()=>safeDomEntries({ucitelJmeno:'Daniel Baláž',nazev:'X'})")
  assert ['ucitelJmeno','']in legacy,('legacy preset is cleared on restore',legacy)
  return {'placeholder':j.p.get_attribute('#ucitelJmeno','placeholder')}
 record('teacher-name-is-not-preset',empty_teacher_name_by_default)
 record('step3-missing-teacher-name-is-explained',missing_teacher_name)

 def simple_strict_to_verifier(j):
  j.new_test('Přísný test');teacher_code=j.ev("()=>val('ucitelPin')");recovery_code=j.ev("()=>val('recoveryCode')");assert teacher_code and recovery_code and teacher_code!=recovery_code
  g=j.gate();assert not g['allowed'] and 'self-test' in g['banner'],g
  j.selftest();j.checklist();g=j.gate();assert g['allowed'],g
  stu=j.download('#btnDownloadStudent');tea=j.download('#btnDownloadTeacher')
  hint=j.text('#lockUnlockHint');assert hint and '5×' in hint,('teacher must learn how to unlock a locked student (F-25)',hint)
  assert '"privateKey"' not in stu['text'] and '"d":' not in stu['text'] and 'alt_answers' not in stu['text'],'student file leaks key material'
  sp=h.new_page(stu['text']);sp.wait_for_timeout(700)
  sp.fill('#studentName','Jana Nováková');sp.get_by_role('button',name=re.compile('Start')).first.click()
  sp.wait_for_function('STARTED_AT!=="" && !document.getElementById("test").classList.contains("hidden")')
  for hidden in (True,False):
   sp.evaluate("(h)=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>h?'hidden':'visible'});document.dispatchEvent(new Event('visibilitychange',{bubbles:true}))}",hidden)
  sp.wait_for_timeout(300);assert sp.evaluate("!!document.getElementById('lockScreen').offsetWidth"),'strict test must lock after leaving'
  for _ in range(5):sp.locator('#lockIcon').click()
  sp.fill('#unlockInp',teacher_code);sp.locator("[onclick='tryUnlock()']").first.click();sp.wait_for_timeout(900)
  assert sp.evaluate("!!document.getElementById('lockScreen').offsetWidth"),'Teacher/Admin secret must not unlock the student lock'
  sp.fill('#unlockInp',recovery_code);sp.locator("[onclick='tryUnlock()']").first.click();sp.wait_for_timeout(1200)
  assert not sp.evaluate("!!document.getElementById('lockScreen').offsetWidth"),'Recovery code must unlock the current student lock'
  answer_secure(sp)
  sp.locator('[onclick="submitSecureTest()"]').click();sp.wait_for_timeout(300)
  y=sp.locator('.s-modal-bd button:visible',has_text=re.compile('^(Yes|Submit|Confirm)',re.I))
  if y.count():y.first.click()
  sp.wait_for_timeout(900);done=sp.evaluate('document.body.innerText');backup=sp.evaluate("document.getElementById('answerBackup').value");sp.close()
  assert backup.startswith('SECURE-ANSWERS-V1'),backup[:40]
  assert 'Use only if Google Forms' not in done and 'Emergency backup' not in done and 'Download answers.txt' in done,('answers.txt is the only channel without Forms (F-13)',done[:400])
  vp=h.new_page(tea['text']);vp.wait_for_timeout(700)
  assert 'Teacher Verifier 2.0' in vp.locator('.v2-brand').inner_text(), 'Teacher Verifier 2.0 shell missing'
  assert vp.locator('#v2-dashboard').is_visible() and not vp.locator('#v2-results').is_visible(), 'dashboard must be the default panel'
  dt=vp.locator('#v2-dashboard').inner_text();assert 'Technické údaje' in dt and 'Creator ID' not in dt and 'Student HTML SHA-256' not in dt and 'Kontrola integrity:' not in dt,('dashboard must stay task-focused; low-level metadata belongs to tech panel',dt[:500])
  assert vp.locator('.v2-nav .v2-nav-icon').count()==7,'all seven verifier navigation items must expose visual hierarchy icons'
  vp.locator('[data-v2-panel="results"]').click();vp.wait_for_timeout(100)
  assert vp.locator('#v2-results').is_visible() and vp.locator('#fallbackImportDetails').is_visible(), 'results workflow must be reachable from navigation'
  vp.locator('#fallbackImportDetails summary').click();assert vp.locator('#pasteBox').is_visible(),'emergency paste fallback must be explicitly disclosed'
  vp.fill('#pasteBox',backup);vp.get_by_role('button',name='Načíst vloženou zálohu').click();vp.wait_for_timeout(2500)
  t=vp.locator('#v2-results').inner_text()
  cells=vp.locator('#resultTable tr').nth(1).locator('td').all_inner_texts()
  assert len(cells)>=8 and cells[0].startswith('Jana Nováková') and cells[2]=='30/30' and cells[3]=='100 %' and cells[4]=='1',('verifier result cells',cells)
  assert cells[5]!='__default' and 'plánovaných ? min' not in t,('verifier labels/time (F-14/F-15)',cells[5])
  dark_theme=vp.evaluate("""()=>{const c=s=>getComputedStyle(document.querySelector(s)).backgroundColor,m=document.createElement('div');m.className='v-modal-box';document.body.appendChild(m);const out={theme:document.body.dataset.verifierTheme,body:c('body'),card:c('.card'),nav:c('.v2-nav'),input:c('input'),modal:getComputedStyle(m).backgroundColor};m.remove();return out}""")
  assert dark_theme=={'theme':'dark','body':'rgb(11, 18, 32)','card':'rgb(17, 24, 39)','nav':'rgb(16, 24, 39)','input':'rgb(15, 23, 42)','modal':'rgb(17, 24, 39)'},('verifier dark palette must be real',dark_theme)
  vp.get_by_role('button',name='Přepnout na světlý režim').click();vp.wait_for_timeout(180)
  light_theme=vp.evaluate("""()=>{const c=s=>getComputedStyle(document.querySelector(s)).backgroundColor,m=document.createElement('div');m.className='v-modal-box';document.body.appendChild(m);const out={theme:document.body.dataset.verifierTheme,body:c('body'),card:c('.card'),nav:c('.v2-nav'),input:c('input'),modal:getComputedStyle(m).backgroundColor};m.remove();return out}""")
  assert light_theme=={'theme':'light','body':'rgb(244, 246, 251)','card':'rgb(255, 255, 255)','nav':'rgb(243, 244, 246)','input':'rgb(255, 255, 255)','modal':'rgb(255, 255, 255)'},('verifier light palette must cover surfaces',light_theme)
  assert vp.get_by_role('button',name='Přepnout na tmavý režim').get_attribute('aria-pressed')=='true','theme control must expose active light state'
  vp.evaluate("""()=>{window.__qaFullscreen=null;Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>window.__qaFullscreen});Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:async()=>{window.__qaFullscreen=document.documentElement;document.dispatchEvent(new Event('fullscreenchange'))}});Object.defineProperty(document,'exitFullscreen',{configurable:true,value:async()=>{window.__qaFullscreen=null;document.dispatchEvent(new Event('fullscreenchange'))}})}""")
  fs=vp.locator('#v2FullscreenBtn');fs.click();vp.wait_for_timeout(80)
  assert fs.get_attribute('aria-pressed')=='true' and 'Ukončit' in fs.inner_text(),('fullscreen control must show active state',fs.inner_text())
  vp.evaluate("()=>{window.__qaFullscreen=null;document.dispatchEvent(new Event('fullscreenchange'))}");vp.wait_for_timeout(50)
  assert fs.get_attribute('aria-pressed')=='false' and 'Celá obrazovka' in fs.inner_text(),'fullscreenchange/Esc-equivalent must restore inactive state'
  vp.evaluate("""()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:undefined});Object.defineProperty(document.documentElement,'webkitRequestFullscreen',{configurable:true,value:undefined});Object.defineProperty(document.documentElement,'msRequestFullscreen',{configurable:true,value:undefined})}""")
  fs.click();vp.wait_for_timeout(50)
  assert 'není v tomto prohlížeči dostupný' in vp.locator('#v2UiStatus').inner_text(),'unsupported fullscreen must provide feedback'
  vp.get_by_role('button',name='Analýza').click();assert vp.locator('#v2-analysis').is_visible() and vp.locator('#itemAnalysis').is_visible(),'analysis panel missing'
  vp.get_by_role('button',name='Bezpečnost').click();assert vp.locator('#v2SecurityFilter').is_visible(),'security filter missing'
  vp.fill('#v2SecurityFilter','Jana');assert vp.input_value('#v2SecurityFilter')=='Jana','security filter must accept query'
  vp.get_by_role('button',name='Test & PDF').click();assert vp.locator('#teacherPreviewDetails').is_visible(),'teacher preview must live in Test & PDF'
  vp.get_by_role('button',name='Export').click();et=vp.locator('#v2-export').inner_text();assert 'Pro studenty' in et and 'Pouze učitel / školní úložiště' in et,('export routes must separate student and teacher outputs',et[:500])
  vp.get_by_role('button',name='Technické údaje').click();tt=vp.locator('#v2-tech').inner_text();assert all(x in tt for x in ['Creator ID','Generator','Build','Test ID','Manifest SHA-256','Student HTML SHA-256','Kontrola integrity:']),('technical identity/integrity panel missing',tt[:800])
  vp.evaluate("""()=>{const base=RESULTS.find(r=>r&&r.status==='OK');if(!base)throw new Error('missing valid verifier result');RESULTS.splice(0,RESULTS.length,Object.assign({},base,{attemptId:'D5META',submissionDigest:'d5-meta-only',startedAt:'',submittedAt:'',securityEvents:[],answerChangeStats:{},totalAnswerChanges:0,metadataMismatch:['název ve formuláři neodpovídá ověřenému testu'],envelopeMismatch:[]}));ATTEMPT_DECISIONS.clear();afterResultsChanged()}""");vp.get_by_role('button',name='Bezpečnost').click();vp.fill('#v2SecurityFilter','D5META');vp.wait_for_timeout(80);st=vp.locator('#v2-security').inner_text();cards=vp.locator('#v2-security .signal-card');assert cards.count()>=3,('security KPI cards missing',cards.count());hard=cards.nth(0).locator('b').inner_text().strip();soft=cards.nth(1).locator('b').inner_text().strip();assert 'METADATA MISMATCH — metadata Google Forms' in st and 'název ve formuláři neodpovídá ověřenému testu' in st and hard=='0' and soft=='1',('metadata mismatch must be one soft Security signal',{'hard':hard,'soft':soft,'text':st[-900:]})
  vp.set_viewport_size({'width':390,'height':844});vp.wait_for_timeout(100)
  assert vp.evaluate("getComputedStyle(document.querySelector('.v2-nav')).display")=='flex','mobile verifier navigation must become horizontal'
  vp.close()
  return {'verifier':' | '.join(cells[:6]),'teacherVerifier2':True}
 record('simple-strict-teacher-student-verifier',simple_strict_to_verifier)

 def key_decision_is_actionable(j):
  j.new_test('Přísný test');j.selftest();j.checklist();j.keycheck({'2':2,'11':False})
  g=j.gate();assert not g['allowed'] and 'Čeká' in g['steps'][2],('step 3 must show it blocks (F-08)',g['steps'])
  heads=j.ev("()=>[...document.querySelectorAll('#keyCheckReport .akv-item-head')].map(e=>e.innerText)")
  keys=j.ev("()=>[...document.querySelectorAll('#keyCheckReport .akv-cmp-row.key .akv-cmp-val')].map(e=>e.innerText)")
  assert not any('__default' in x for x in heads) and keys[0].startswith('B)'),('readable comparison (F-09)',heads,keys)
  btns=j.ev("()=>[...document.querySelectorAll('#secureGateBanner button')].map(b=>b.innerText)")
  assert btns==['Otevřít rozhodnutí v kroku 3'],('no blanket unlock (F-10)',btns)
  j.p.click('#resultTab4');j.p.get_by_role('button',name='Otevřít rozhodnutí v kroku 3').click()
  r=j.p.locator('#keyCheckReport');r.locator('input[name=akvDiff0][value=keep]').check();r.locator('input[name=akvDiff1][value=ai]').check()
  r.get_by_role('button',name='Použít moje rozhodnutí').click();j.p.wait_for_timeout(1200)
  shown=j.text('#keyCheckReport');assert shown and 'Klíč upraven' in shown,('decision result must stay visible (F-05)',shown)
  assert j.ev('()=>[lastGenData.exercises[0].items[1].correct,lastGenData.exercises[2].items[0].correct]')==[1,False]
  st=j.ev("()=>document.getElementById('selfTestReport').innerText");assert 'neplatí' in st,('self-test invalidation must say why (F-11)',st)
  j.selftest();g=j.gate();assert g['allowed'] and 'nespuštěno' not in g['banner'] and 'vyřešeny' in g['banner'],('resolved AI check is recorded (F-06)',g['banner'])
  return {'banner':g['banner'][-90:]}
 record('ai-key-diffs-decided-per-item',key_decision_is_actionable)

 def pending_diffs_survive_alternatives(j):
  j.new_test('Přísný test');j.selftest();j.checklist();j.keycheck({'2':2,'6':['the water']})
  j.p.locator('#keyCheckReport .akv-pick').first.check();j.p.locator('#keyCheckReport').get_by_role('button',name='Přidat zaškrtnuté alternativy').click();j.p.wait_for_timeout(1200)
  assert 'the water' in j.ev('()=>JSON.stringify(lastGenData.exercises[1].items[0].alt_answers)')
  assert j.ev("()=>document.querySelectorAll('#keyCheckReport input[name=akvDiff0]').length")==2,'unresolved closed diff must stay actionable (F-07)'
  j.selftest();assert not j.gate()['allowed'],'gate must stay closed until the teacher decides (F-07)'
  j.p.click('#resultTab3');j.p.locator('#keyCheckReport input[name=akvDiff0][value=keep]').check();j.p.locator('#keyCheckReport').get_by_role('button',name='Použít moje rozhodnutí').click();j.p.wait_for_timeout(400)
  assert j.gate()['allowed']
  return {'carried':True}
 record('pending-key-diffs-survive-alternatives',pending_diffs_survive_alternatives)

 def edits_and_pending_diffs(j):
  j.new_test('Přísný test');j.selftest();j.checklist();j.keycheck({'2':2})
  j.p.click('#resultTab1');j.p.click('#btnEdit');j.p.wait_for_timeout(300)
  j.p.locator('#editorBody textarea').nth(4).fill('Changed unrelated question');j.p.click('#btnEditorApply');j.p.wait_for_timeout(1200)
  cl=j.ev('()=>exportChecklist');assert all(cl.get(k) for k in ['content','answers','grading','distribution']),('same test keeps teacher review',cl)
  assert j.ev('()=>lastSelfTest')is None and j.ev('()=>lastKeyCheck.closedDiffs')==1,'text edit: self-test invalid, diff still pending'
  j.p.click('#resultTab1');j.p.click('#btnEdit');j.p.wait_for_timeout(300)
  j.p.locator('#editorBody input[type=radio]').nth(5).check();j.p.click('#btnEditorApply');j.p.wait_for_timeout(1200)
  kc=j.ev('()=>({c:lastKeyCheck.closedDiffs,older:lastKeyCheck.olderVersion,mc:lastGenData.exercises[0].items[1].correct})')
  assert kc=={'c':0,'older':True,'mc':2},('teacher key edit resolves that diff',kc)
  j.selftest();assert j.gate()['allowed']
  return kc
 record('editor-changes-keep-review-and-pending-diffs',edits_and_pending_diffs)

 def failed_regeneration_keeps_reviewed_test(j):
  j.new_test('Přísný test');j.selftest();j.checklist();tid=j.ev('()=>lastAssembled.cfg.testId')
  j.p.click('#btnGenerate');j.p.wait_for_timeout(300);m=j.modal();assert m and 'místo hotového' in m,('replace needs confirmation (F-18)',m);j.cancel()
  assert j.ev('()=>__aiLog.length')==1 and j.gate()['allowed'],'cancel must not call AI or touch checks'
  j.ev("()=>{for(let i=0;i<12;i++)__aiScript.push({status:429,apiStatus:'RESOURCE_EXHAUSTED'})}")
  seen=j.generate(accept=True)
  after=j.ev('()=>({id:lastAssembled.cfg.testId,allowed:secureDownloadAllowed()})')
  assert after=={'id':tid,'allowed':True},('failed regeneration must keep test and checks (F-16)',after)
  btn=j.ev("()=>[...document.querySelectorAll('#genError button')].map(b=>b.innerText)");assert btn==['429'],('HTTP code must be clickable (F-17)',btn)
  j.p.locator('#genError button').first.click();j.p.wait_for_timeout(200);m=j.modal();assert m and 'limit' in m.lower(),m;j.ok()
  return {'modals':seen,'httpHelp':m.split('\n')[1][:60]}
 record('failed-regeneration-keeps-reviewed-test',failed_regeneration_keeps_reviewed_test)
 def error_recovery_is_actionable(j):
  j.to_step3()
  j.ensure_teacher_secret();j.ensure_recovery_if_required()
  j.p.click('#next3');out={}
  for beh,expect in [({'status':400,'apiStatus':'INVALID_ARGUMENT'},'uprav zadání'),({'status':413},'přílohy'),({'status':401,'apiStatus':'UNAUTHENTICATED'},'AI připojení'),('malformed','spusť generování znovu')]:
   j.ev("(b)=>{__aiScript.length=0;for(let i=0;i<8;i++)__aiScript.push(b)}",beh if isinstance(beh,dict) else 'malformed')
   j.generate()
   err=j.text('#genError');ui=j.ev("()=>({locked:document.getElementById('nazev').disabled,gen:document.getElementById('btnGenerate').disabled,out:!!lastAssembled})")
   assert 'Co dál:' in err and expect in err,('error must say what to do next (F-24)',beh,err)
   assert ui=={'locked':False,'gen':False,'out':False},('UI must be released after failure',ui)
   out[str(beh.get('status') if isinstance(beh,dict) else beh)]=err.split('Co dál:')[1].strip()[:40]
  j.ev("()=>{__aiScript.length=0}");j.generate()
  assert j.text('#genResult'),'retry after error must succeed'
  return out
 record('error-recovery-is-actionable',error_recovery_is_actionable)

 def advanced_one_time_code_to_verifier(j):
  p=j.p;p.fill('#geminiKeyInput','AIzaTEST-journey-000000000000000000');p.click('#btnUseKeySession')
  p.get_by_role('button',name=re.compile('Pokročilá nastavení')).first.click()
  p.fill('#nazev','OTC');p.fill('#proKoho','3.A');p.locator('#jazykBtns [data-val="angličtina"]').click();p.fill('#latka','Present perfect');p.click('#next0')
  for t in ('multiple choice','fill-in-the-blank','true/false'):p.locator('#typyBtns').get_by_role('button',name=t,exact=True).first.click()
  p.locator('#simpleTemplateBtns').get_by_role('button',name=re.compile('Běžný test')).click()
  p.locator('#cefrBtns [data-val=B1]').click();p.fill('#zadaniText','Present perfect vs past simple.');p.click('#next1')
  p.locator('#resultModeBtns [data-val=secureOffline]').click();p.locator('#identityModeBtns [data-val=oneTimeCode]').click()
  p.fill('#rosterEmails','novak@ghrabuvka, svoboda@ghrabuvka');p.get_by_role('button',name=re.compile('Vygenerovat kódy')).click();p.wait_for_timeout(200)
  codes=j.ev('()=>rosterEntries.map(x=>x.code)');p.click('#next2');p.fill('#ucitelJmeno','Jana Učitelová')
  if not p.input_value('#ucitelPin'):p.fill('#ucitelPin','AUDIT-TEACH-482957')
  p.click('#next3');j.generate();j.selftest();j.checklist()
  p.click('#resultTab1');p.click('#btnPreview');p.wait_for_timeout(700);fr=[f for f in p.frames if f!=p.main_frame][0]
  assert fr.evaluate("document.getElementById('studentName').value")==codes[0],'teacher preview must be usable before handing out codes'
  p.get_by_role('button',name='Zavřít náhled').click()
  stu=j.download('#btnDownloadStudent');tea=j.download('#btnDownloadTeacher')
  assert all(c not in stu['text'] for c in codes),'student file must not contain plain codes'
  sp=h.new_page(stu['text']);sp.wait_for_timeout(700)
  sp.fill('#studentName','ZZZZZZ');sp.get_by_role('button',name=re.compile('Start')).first.click();sp.wait_for_timeout(500)
  msg=sp.evaluate("document.body.innerText");assert 'not valid' in msg and not sp.evaluate("!!document.querySelector('.ex-panel:not(.hidden)')"),'invalid code must be rejected with a message'
  sp.locator('button:visible',has_text=re.compile('^OK$')).first.click()
  sp.fill('#studentName',codes[0]);sp.get_by_role('button',name=re.compile('Start')).first.click();sp.wait_for_function('STARTED_AT!=="" && !document.getElementById("test").classList.contains("hidden")');answer_secure(sp)
  sp.locator('[onclick="submitSecureTest()"]').click();sp.wait_for_timeout(300)
  y=sp.locator('.s-modal-bd button:visible',has_text=re.compile('^(Yes|Submit|Confirm)',re.I))
  if y.count():y.first.click()
  sp.wait_for_timeout(900);backup=sp.evaluate("document.getElementById('answerBackup').value");sp.close()
  vp=h.new_page(tea['text']);vp.wait_for_timeout(700);vp.locator('[data-v2-panel="results"]').click();vp.locator('#fallbackImportDetails summary').click();vp.fill('#pasteBox',backup);vp.get_by_role('button',name='Načíst vloženou zálohu').click();vp.wait_for_timeout(2500)
  t=vp.evaluate('document.body.innerText');vp.close()
  assert re.search(r'novak \(kód '+codes[0]+r'\)\t\S+\t30/30\t100 %\t1\t',t),('verifier resolves the code to the roster e-mail',t[:500])
  import csv,io,tempfile
  buf=io.StringIO();csv.writer(buf).writerows([['Časová značka','E-mailová adresa','Odevzdávací kód'],['29.9.2026 10:00:00','novak@ghrabuvka.cz',backup],['29.9.2026 10:05:00','novak@ghrabuvka.cz',backup.replace('"attemptId"','"attemptId"')]])
  f=tempfile.NamedTemporaryFile('w',suffix='.csv',delete=False);f.write(buf.getvalue());f.close()
  vp=h.new_page(tea['text']);vp.wait_for_timeout(700);vp.locator('[data-v2-panel="results"]').click();vp.set_input_files('#formsCsvFile',f.name);vp.wait_for_timeout(2500)
  t=vp.evaluate('document.body.innerText');vp.close()
  assert 'novak@ghrabuvka.cz' in t and re.search(r'Duplicity: [1-9]',t),('Forms CSV import + repeated code must be flagged',t[t.find('Načteno'):t.find('Načteno')+200])
  return {'codes':len(codes)}
 record('advanced-one-time-code-to-verifier',advanced_one_time_code_to_verifier)

 def pre_server_forms_full_year_workflow(j):
  import csv,io,tempfile,json as pyjson
  p=j.p
  # Actual metadata parser: bad host and missing required placeholder must fail.
  bad=p.evaluate("""()=>({
   host:(()=>{try{parseGoogleFormsPrefilledMetadataUrl('https://evil.example/forms/d/e/X/viewform?entry.1=GIT_TEST_ID&entry.2=GIT_TEST_NAME&entry.3=GIT_GROUP');return false}catch(e){return true}})(),
   missing:(()=>{try{parseGoogleFormsPrefilledMetadataUrl('https://docs.google.com/forms/d/e/X/viewform?entry.1=GIT_TEST_ID&entry.2=GIT_TEST_NAME');return false}catch(e){return true}})()
  })""")
  assert bad['host'] and bad['missing'],('invalid Forms metadata config must fail closed',bad)
  assert p.evaluate("()=>{localStorage.removeItem(GOOGLE_FORMS_METADATA_CONFIG_KEY);return configuredGoogleFormsMetadata()===null}"),'missing metadata config must stay optional'
  pre='https://docs.google.com/forms/d/e/FORM_A/viewform?usp=pp_url&entry.111=GIT_TEST_ID&entry.222=GIT_TEST_NAME&entry.333=GIT_GROUP&entry.444=GIT_GENERATOR_VERSION&entry.555=GIT_GENERATED_AT'
  cfg=p.evaluate("""u=>{const c=parseGoogleFormsPrefilledMetadataUrl(u);localStorage.setItem(GOOGLE_FORMS_METADATA_CONFIG_KEY,JSON.stringify(c));localStorage.setItem(GOOGLE_FORMS_SUBMISSION_URL_KEY,c.responderUrl);return c}""",pre)
  assert cfg['entries']['testId']=='111' and cfg['entries']['testName']=='222' and cfg['entries']['group']=='333',cfg

  def build_secure(jj,name,group):
   q=jj.p;q.fill('#geminiKeyInput','AIzaTEST-forms-000000000000000000');q.click('#btnUseKeySession')
   q.get_by_role('button',name=re.compile('Pokročilá nastavení')).first.click()
   q.fill('#nazev',name);q.fill('#proKoho',group);q.locator('#jazykBtns [data-val="angličtina"]').click();q.fill('#latka','Present perfect');q.click('#next0')
   for typ in ('multiple choice','fill-in-the-blank','true/false'):q.locator('#typyBtns').get_by_role('button',name=typ,exact=True).first.click()
   q.locator('#simpleTemplateBtns').get_by_role('button',name=re.compile('Běžný test')).click();q.locator('#cefrBtns [data-val=B1]').click();q.fill('#zadaniText','Present perfect.');q.click('#next1')
   q.locator('#resultModeBtns [data-val=secureOffline]').click();q.locator('#identityModeBtns [data-val=name]').click();q.click('#next2');q.fill('#ucitelJmeno','Jana Učitelová')
   if not q.input_value('#ucitelPin'):q.fill('#ucitelPin','AUDIT-FORMS-482957')
   q.click('#next3');jj.generate();jj.selftest();jj.checklist()
   return jj.download('#btnDownloadStudent'),jj.download('#btnDownloadTeacher')

  name_a='Přítomný čas – čárky & A+B';group_a='1.A / skupina B'
  stu_a,tea_a=build_secure(j,name_a,group_a)

  def student_submission(stu,student):
   sp=h.new_page(stu['text']);sp.wait_for_timeout(600)
   url=sp.evaluate('formsOpenUrl()')
   sp.fill('#studentName',student);sp.get_by_role('button',name=re.compile('Start')).first.click();sp.wait_for_function('STARTED_AT!=="" && !document.getElementById("test").classList.contains("hidden")');answer_secure(sp)
   sp.locator('[onclick="submitSecureTest()"]').click();sp.wait_for_timeout(250)
   y=sp.locator('.s-modal-bd button:visible',has_text=re.compile('^(Yes|Submit|Confirm)',re.I))
   if y.count():y.first.click()
   sp.wait_for_function('document.getElementById("answerBackup").value.startsWith("SECURE-ANSWERS-V1") && !document.getElementById("done").classList.contains("hidden")',timeout=10000)
   backup=sp.locator('#answerBackup').input_value();sp.close();return url,backup

  url_a,backup_a1=student_submission(stu_a,'Student Alpha')
  _,backup_a2=student_submission(stu_a,'Student Alpha')
  ua=p.evaluate("u=>{const x=new URL(u);return {id:x.searchParams.get('entry.111'),name:x.searchParams.get('entry.222'),group:x.searchParams.get('entry.333')}}",url_a)
  pack_a=pyjson.loads(re.sub(r'^SECURE-ANSWERS-V1\s*','',backup_a1))
  test_a=pack_a['testId']
  assert ua=={'id':test_a,'name':name_a,'group':group_a},('prefilled metadata must preserve Unicode/special chars',ua,test_a)
  assert backup_a1!=backup_a2,'two valid attempts must produce distinct secure payloads'

  # Generate TEST-B with another group but the same universal Form mapping.
  j2=Journey(h)
  try:
   j2.ev("(c)=>{localStorage.setItem(GOOGLE_FORMS_METADATA_CONFIG_KEY,JSON.stringify(c));localStorage.setItem(GOOGLE_FORMS_SUBMISSION_URL_KEY,c.responderUrl)}",cfg)
   name_b='Vocabulary B';group_b='2.B'
   stu_b,tea_b=build_secure(j2,name_b,group_b)
  finally:
   j2.p.close()
  url_b,backup_b=student_submission(stu_b,'Student Beta')
  pack_b=pyjson.loads(re.sub(r'^SECURE-ANSWERS-V1\s*','',backup_b));test_b=pack_b['testId']
  assert test_a!=test_b,'two generated tests must have different Test IDs'
  ub=p.evaluate("u=>{const x=new URL(u);return {id:x.searchParams.get('entry.111'),name:x.searchParams.get('entry.222'),group:x.searchParams.get('entry.333')}}",url_b)
  assert ub=={'id':test_b,'name':name_b,'group':group_b},ub

  corrupt=pyjson.loads(re.sub(r'^SECURE-ANSWERS-V1\s*','',backup_a1));d=corrupt['payload']['data'];corrupt['payload']['data']=('A' if d[:1]!='A' else 'B')+d[1:]
  corrupt_txt='SECURE-ANSWERS-V1\n'+pyjson.dumps(corrupt,separators=(',',':'))
  rows=[
   ['Timestamp','Email Address','Test ID','Test name','Group','Secure submission'],
   ['30.9.2026 08:00:00','alpha@ghrabuvka.cz',test_a,name_a,group_a,backup_a1],
   ['30.9.2026 08:01:00','alpha@ghrabuvka.cz',test_a,name_a,group_a,backup_a1],
   ['30.9.2026 08:02:00','alpha@ghrabuvka.cz',test_a,name_a,group_a,backup_a2],
   ['30.9.2026 08:03:00','alpha@ghrabuvka.cz','EDITED-BY-STUDENT',name_a,'4.Z WRONG',backup_a1],
   ['30.9.2026 08:04:00','beta@ghrabuvka.cz',test_b,name_b,group_b,backup_b],
   ['30.9.2026 08:05:00','alpha@ghrabuvka.cz',test_a,name_a,group_a,corrupt_txt]
  ]
  buf=io.StringIO();csv.writer(buf).writerows(rows);tmp=tempfile.NamedTemporaryFile('w',suffix='.csv',delete=False);tmp.write(buf.getvalue());tmp.close()

  va=h.new_page(tea_a['text']);va.wait_for_timeout(600);va.locator('[data-v2-panel="results"]').click();va.set_input_files('#formsCsvFile',tmp.name);va.wait_for_timeout(3500)
  ta=va.evaluate('document.body.innerText')
  assert 'alpha@ghrabuvka.cz' in ta and 'beta@ghrabuvka.cz' not in va.locator('#resultTable').inner_text(),('verifier A must render only TEST-A results',ta[:800])
  assert 'METADATA MISMATCH' in ta,('tampered Forms metadata must warn, not hide valid payload',ta[:1000])
  assert 'VÍCE RŮZNÝCH POKUSŮ' in ta,('two distinct valid attempts require explicit teacher decision',ta[:1000])
  assert re.search(r'jiné testy\s+1',ta,re.I),('full CSV must classify TEST-B as another test',ta[:1000])
  assert re.search(r'neplatné/poškozené\s+1',ta,re.I),('corrupt current-test payload must be invalid',ta[:1000])
  assert re.search(r'Duplicity:\s*[1-9]',ta),('identical payload must be duplicate',ta[:1000])
  va.evaluate("()=>{const r=RESULTS.find(x=>x.status==='OK'&&!x.exactDuplicate);chooseAttemptByDigest(r.submissionDigest)}")
  va.evaluate('downloadResultsCsv()');res_csv=va.evaluate("async()=>await __readDownloadText(-1)")
  assert res_csv.count('\n')==1,('resolved results export must contain one effective student row',res_csv)
  va.evaluate('downloadSubmissionsCsv()');sub_csv=va.evaluate("async()=>await __readDownloadText(-1)")
  assert test_b not in sub_csv and 'beta@ghrabuvka.cz' not in sub_csv,('submissions export must exclude other tests',sub_csv[:500])
  va.close()

  vb=h.new_page(tea_b['text']);vb.wait_for_timeout(600);vb.locator('[data-v2-panel="results"]').click();vb.set_input_files('#formsCsvFile',tmp.name);vb.wait_for_timeout(3500)
  tb=vb.evaluate('document.body.innerText')
  assert 'beta@ghrabuvka.cz' in tb and 'alpha@ghrabuvka.cz' not in vb.locator('#resultTable').inner_text(),('verifier B must select TEST-B from same full CSV',tb[:800])
  assert re.search(r'jiné testy\s+[1-9]',tb,re.I),('verifier B must classify TEST-A rows as other tests',tb[:1000])
  vb.close()

  # Real-browser long-run benchmark: actual verifier + WebCrypto + yielding UI.
  perf=[]
  va2=h.new_page(tea_a['text']);va2.wait_for_timeout(600);va2.locator('[data-v2-panel="results"]').click()
  try:
   for size in (100,1000,3000,5000):
    big=io.StringIO();w=csv.writer(big);w.writerow(['Timestamp','Email Address','Test ID','Test name','Group','Secure submission'])
    current=0
    for i in range(size):
     is_a=(i%20==0)
     if is_a:current+=1
     w.writerow(['30.9.2026 09:00:00',('alpha'+str(i)+'@ghrabuvka.cz') if is_a else ('beta'+str(i)+'@ghrabuvka.cz'),test_a if is_a else test_b,name_a if is_a else name_b,group_a if is_a else group_b,backup_a1 if is_a else backup_b])
    bf=tempfile.NamedTemporaryFile('w',suffix='.csv',delete=False);bf.write(big.getvalue());bf.close()
    va2.evaluate("()=>{clearInterval(window.__formsHbTimer);window.__formsHb=0;window.__formsHbTimer=setInterval(()=>window.__formsHb++,25)}")
    t0=time.time();va2.set_input_files('#formsCsvFile',bf.name)
    va2.wait_for_function("(n)=>document.getElementById('formsImportSummary').innerText.includes('načteno '+n)",arg=size,timeout=180000)
    elapsed=round(time.time()-t0,3);txt=va2.locator('#formsImportSummary').inner_text()
    hb=va2.evaluate("()=>{clearInterval(window.__formsHbTimer);return window.__formsHb}")
    heap=va2.evaluate("()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576*10)/10:null")
    assert re.search(r'platné výsledky tohoto testu\s+'+str(current)+r'\b',txt,re.I),(size,current,txt)
    assert re.search(r'jiné testy\s+'+str(size-current)+r'\b',txt,re.I),(size,txt)
    assert 'neplatné/poškozené 0' in txt,(size,txt)
    assert hb>0,('large CSV import must yield to browser event loop',size,hb)
    perf.append({'rows':size,'seconds':elapsed,'heartbeat':hb,'heapMiB':heap})
  finally:
   va2.close()
  return {'testA':test_a,'testB':test_b,'unicodePrefill':True,'metadataMismatch':True,'sameCsvTwoVerifiers':True,'browserPerformance':perf}
 record('pre-server-forms-full-year-workflow',pre_server_forms_full_year_workflow)

 def narrow_screen_and_live_regions(j):
  j.p.set_viewport_size({'width':360,'height':740})
  j.new_test('Přísný test');j.selftest();j.checklist();j.keycheck({'2':2})
  over=j.ev("()=>document.documentElement.scrollWidth-document.documentElement.clientWidth")
  assert over<=0,('no horizontal scroll on 360 px in step 3 (F-23)',over)
  live=j.ev("()=>['genProgressMsg','genError','selfTestReport','keyCheckReport','validHint3','secureGateBanner'].map(id=>{const e=document.getElementById(id);return e.getAttribute('aria-live')||e.getAttribute('role')})")
  assert all(live),('long operations and hints must be announced (F-21)',live)
  return {'overflow':over}
 record('narrow-screen-and-live-regions',narrow_screen_and_live_regions)

 def template_save_dialogs_are_clear(j):
  j.new_test('Běžný test');j.p.get_by_role('button',name=re.compile('Uložit jako šablonu')).click();j.p.wait_for_timeout(200)
  j.p.locator('#uiModal input').fill('Moje šablona');j.ok();j.p.wait_for_timeout(200)
  second=j.modal()or'';assert 'Zadej název' not in second and 'nech prázdné' in second,('second dialog must not ask for a name again (F-22)',second)
  j.ok();j.p.wait_for_timeout(200);assert 'Moje šablona' in (j.text('#tplList') or '')
  return {'second':second.split('\n')[0]}
 record('template-save-dialogs-are-clear',template_save_dialogs_are_clear)
 def enrichment_proposals_clear_and_expire(j):
  j.new_test('Přísný test');j.selftest();j.checklist();p=j.p
  def run():
   p.click('#resultTab3');p.click('#btnEnrich')
   for _ in range(60):
    if j.modal():j.ok()
    if not j.ev("()=>document.getElementById('btnEnrich').disabled"):break
    p.wait_for_timeout(150)
   p.wait_for_timeout(200);return j.text('#answerProposalReport') or ''
  none=run();assert 'nenavrhla' in none and 'Zaškrtni' not in none,('zero proposals must not ask to tick anything (F-27)',none)
  j.ev("()=>{window.__aiEnrichPayload=b=>({items:b.map(x=>({id:x.id,alts:x.id===0?['the water','aqua']:[]}))})}")
  multi=run();assert '__default' not in multi and 'původní správná odpověď zůstává' in multi,('readable proposals (F-26)',multi[:200])
  p.locator('.en-pick').first.check();p.click('#btnAcceptProposals');p.wait_for_timeout(1200)
  st=j.text('#enApplyStatus');assert 'self-test' in st and 'zkontroluj obsah' not in st,st
  run();p.click('#resultTab1');p.click('#btnEdit');p.wait_for_timeout(300);p.locator('#editorBody textarea').first.fill('Changed');p.click('#btnEditorApply');p.wait_for_timeout(1200)
  dis=j.ev("()=>[...document.querySelectorAll('.en-pick')].every(c=>c.disabled)&&document.getElementById('btnAcceptProposals').disabled")
  assert dis and 'nejde použít' in (j.ev("()=>document.getElementById('enApplyStatus').innerText") or ''),'stale proposals must not stay actionable (F-28)'
  return {'accepted':True}
 record('enrichment-proposals-clear-and-expire',enrichment_proposals_clear_and_expire)

 def incomplete_key_check_is_not_success(j):
  j.new_test('Přísný test');j.selftest();j.checklist()
  j.ev("()=>{window.__aiKeyAnswers=items=>items.filter(x=>x.type!=='true/false').map(x=>({i:x.i,a:x.type==='multiple choice'?'banana':['water']}))}")
  j.p.click('#resultTab3');j.p.click('#btnKeyCheck');j.p.wait_for_function('!akvBusy');j.p.wait_for_timeout(300)
  g=j.gate();rep=j.text('#keyCheckReport')
  assert 'neúplné' in g['steps'][2] and 'hotovo' not in g['steps'][2],('incomplete AI check must not look done (F-29)',g['steps'][2])
  assert 'neúplné' in g['banner'] and 'shoduje' not in g['banner'],g['banner']
  assert 'cv. 3/1' in rep and 'Co s výsledkem' not in rep,('list unchecked items, no decision text without diffs',rep[:300])
  return {'step3':g['steps'][2]}
 record('incomplete-key-check-is-not-success',incomplete_key_check_is_not_success)

 def settings_changed_after_generation(j):
  j.new_test('Přísný test');j.selftest();j.checklist();p=j.p
  B="()=>{const e=document.getElementById('settingsDriftBanner');return e.classList.contains('hidden')?'':e.innerText}"
  assert j.ev(B)=='','no false drift warning right after generation'
  p.click('#resultTab1');p.click('#btnEdit');p.wait_for_timeout(300);p.locator('#editorBody textarea').first.fill('Edited');p.click('#btnEditorApply');p.wait_for_timeout(1200)
  assert j.ev(B)=='','editor change is not settings drift'
  j.ev("()=>goTo(2)");p.locator('#bodyBtns [data-val=\"50\"]').click();p.locator('#timeBtns [data-val=\"45\"]').click();j.ev("()=>goTo(4)");p.wait_for_timeout(200)
  w=j.ev(B);assert 'body' in w and 'čas' in w,('changed settings must be visible at download (F-30)',w)
  p.get_by_role('button',name=re.compile('Použít nové nastavení')).click();p.wait_for_timeout(1500)
  a=j.ev("()=>({pts:lastAssembled.variants.__default.reduce((s,e)=>s+e.points_total,0),cas:lastAssembled.cfg.cas,q:lastGenData.exercises[0].items[0].question,grading:!!exportChecklist.grading,calls:__aiLog.length})")
  assert a=={'pts':50,'cas':45,'q':'Edited','grading':False,'calls':1},('apply without AI keeps content, resets grading check',a)
  j.ev("()=>goTo(1)");p.fill('#zadaniText','Completely different source text.');j.ev("()=>goTo(4)");p.wait_for_timeout(200)
  w=j.ev(B);assert 'Obsah zadání' in w and not p.get_by_role('button',name=re.compile('Použít nové nastavení')).count(),w
  return a
 record('settings-changed-after-generation',settings_changed_after_generation)

 def student_language_and_small_texts(j):
  j.new_test('Procvičování');d=j.download('#btnDownloadMain');sp=h.new_page(d['text']);sp.wait_for_timeout(600)
  tabs=sp.evaluate("[...document.querySelectorAll('.tab-name')].map(e=>e.textContent)")
  assert 'multiple choice' in tabs,('tab names are not cut to 12 chars (F-12)',tabs)
  sp.fill('#studentName','Jana');sp.get_by_role('button',name=re.compile('Start')).first.click();answer_instant(sp.main_frame,lambda k:k%2==0);t=submit_instant(sp.main_frame);sp.close()
  assert 'Incorrect' in t and 'Explanation' in t and 'Správně' not in t and 'Vysvětlení' not in t,('practice feedback in test language (F-32)',t[t.find('MULTIPLE'):t.find('MULTIPLE')+200])
  p=j.p;j.ev("()=>goTo(0)");p.locator('#jazykBtns [data-val=\"čeština\"]').click();p.wait_for_timeout(300)
  btns=j.ev("()=>[...document.querySelectorAll('#csEntryModal button')].map(b=>b.innerText.trim())");assert 'Zůstat zde' in btns,('dialog button matches its text (F-20)',btns)
  p.locator('#csEntryModal [data-cs-stay]').click()
  j.ev("()=>goTo(4)");p.click('#resultTab1');p.click('#btnEdit');p.wait_for_timeout(300);p.locator("[onclick='edAddItem(0)']").click();p.click('#btnEditorApply');p.wait_for_timeout(600)
  e=j.text('#editorError') or '';assert 'musí být' in e or 'chybí' in e,('editor validation readable Czech (F-31)',e[:160])
  return {'tabs':tabs}
 record('student-language-and-small-texts',student_language_and_small_texts)
finally:h.close()
