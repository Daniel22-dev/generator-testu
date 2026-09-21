from harness import Harness,TESTS
from browser_matrix import answer,click_attr
import json,traceback,time
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 def record(name,fn):
  row={'case':name}
  try:row.update(ok=True,detail=fn())
  except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc())
  rows.append(row);(TESTS.parent/'evidence/identity-suite.json').write_text(json.dumps(rows,indent=2));print(json.dumps({k:v for k,v in row.items()if k!='trace'}),flush=True)
 def roster():
  p.evaluate('auditConfigure(["translation"],"secureOffline","en");state.identityMode="oneTimeCode";applyVisualState();goTo(2)')
  p.locator('#rosterEmails').fill('qa.one@example.invalid\nQA.ONE@example.invalid\nqa.two@example.invalid\nbad@@example.invalid');click_attr(p,'onclick','rosterGenerate()');r=p.evaluate('rosterEntries');assert len(r)==2 and r[0]['code']!=r[1]['code'] and all(len(x['code'])==6 for x in r),r
  click_attr(p,'onclick','rosterDownloadCsv()');csv=p.evaluate('async()=>await (await fetch(__downloads.at(-1).href)).text()');assert 'email,student,code' in csv and r[0]['code'] in csv;return {'validDistinctEntries':2,'downloadCSV':True}
 record('roster-input-dedupe-invalid-code-csv',roster)
 def student(mode,groups):
  s=v=None
  try:
   x=p.evaluate('''async a=>{auditConfigure(['translation','ordering'],a.mode,'fr');state.identityMode='oneTimeCode';if(a.groups){state.diferencovany='ANO';state.skupiny=rosterEntries.map((r,i)=>({nazev:'G'+i,podminky:'Specific group '+i,studenti:[r.code]}));}const d=auditFixtures(state,'fr'),b=await assembleTestHtml(state,d);return {html:b.studentHtml||b,teacher:b.teacherHtml,code:rosterEntries[0].code,variants:lastAssembled.variants,cfg:lastAssembled.cfg}}''',{'mode':mode,'groups':groups})
   assert 'qa.one@example.invalid' not in x['html'] and x['code'] not in x['html'],'plaintext roster leaked'
   s=h.new_page(x['html']);assert s.evaluate('async()=>await identityAllowed("NOT-A-CODE")')==False
   s.locator('#studentName').fill(x['code']);click_attr(s,'onclick','startTest()');s.wait_for_function('started' if mode=='instant' else 'STARTED_AT!==""');key=s.evaluate('CFG.activeGroupKey' if mode=='instant' else 'ACTIVE_KEY');assert bool(key and key!="__default")==groups,key
   for i,ex in enumerate(x['variants'][key or '__default']):answer(s,ex,i,mode,'fr')
   if mode=='instant':sc=s.evaluate('calcScore()')
   else:
    click_attr(s,'onclick','submitSecureTest()');s.wait_for_function('ANSWER_TXT.startsWith("SECURE-ANSWERS-V1")');txt=s.locator('#answerBackup').input_value();v=h.new_page(x['teacher']);sc=v.evaluate('async txt=>scorePayload(await decryptPayload(parseTxt(txt)))',txt)
    # Real verifier import validates IDs, manifests and encrypted payload; importing twice warns.
    v.locator('#pasteBox').fill(txt);click_attr(v,'onclick','bulkVerifyPasted()');v.wait_for_function('RESULTS.length===1');assert v.evaluate('RESULTS[0].status')=='OK',v.evaluate('RESULTS[0]')
    dup=v.evaluate('async txt=>{await verifyText("second.txt",txt);return duplicateInfo()}',txt);assert len(dup['dupStudentKeys'])==len(dup['dupAttemptKeys'])==1,dup
    bad=v.evaluate('async txt=>{const q=parseTxt(txt);q.testId="WRONG";await verifyText("wrong.txt","SECURE-ANSWERS-V1\\n"+JSON.stringify(q));return RESULTS.at(-1).status}',txt);assert bad!='OK',bad
    corrupt=v.evaluate('async txt=>{const q=parseTxt(txt);q.payload.data=(q.payload.data[0]==="A"?"B":"A")+q.payload.data.slice(1);await verifyText("tamper.txt","SECURE-ANSWERS-V1\\n"+JSON.stringify(q));return RESULTS.at(-1).status}',txt);assert corrupt!='OK',corrupt
   assert sc['earned']==sc['total']==24,sc;return {'mode':mode,'groups':groups,'wrongCodeRefused':True,'goldenScore':24,'rosterNotInStudentFile':True,'duplicateAndTamperChecked':mode=='secureOffline'}
  finally:
   if s:s.close()
   if v:v.close()
 for m in ['instant','secureOffline']:
  for g in [False,True]:record('individual-code-'+m+'-'+str(g),lambda m=m,g=g:student(m,g))
 def teacher():
  x=p.evaluate('async()=>await auditBuild(["translation"],"instant","en")');s=h.new_page(x['html'])
  try:
   s.evaluate('openTeacherModal()');s.locator('#t-name').fill('Audit Teacher');s.locator('#t-pin').fill('WRONG');click_attr(s,'onclick','doTeacherLogin()');s.wait_for_function('!document.getElementById("t-err").classList.contains("hidden")');assert not s.evaluate('teacherLogged');s.locator('#t-pin').fill('AUDIT-TEACH-482957');click_attr(s,'onclick','doTeacherLogin()');s.wait_for_function('teacherLogged');assert s.locator('#t-panel').is_visible()
   hashes=s.evaluate('async()=>({same:CFG.ucitelPinHash===CFG.hesloHash,unlock:await secretMatches("AUDIT-TEACH-482957","unlock-password",CFG.hesloHash)})');assert not hashes['same'] and hashes['unlock'];return {'wrongPinRefused':True,'rightPinLogin':True,'singleCodeSeparatePurposeHashes':True}
  finally:s.close()
 record('teacher-access-code-and-unlock-hash',teacher)
 def joker(mode):
  x=p.evaluate('async m=>{auditConfigure(["translation"],m,"es");state.zolicek="ANO";const b=await assembleTestHtml(state,auditFixtures(state,"es"));return {html:b.studentHtml||b,teacher:b.teacherHtml}}',mode);s=h.new_page(x['html']);v=None
  try:
   s.locator('#studentName').fill('QA');click_attr(s,'onclick','chooseJokerStart(true)');click_attr(s,'onclick','startTest()');s.wait_for_function('started' if mode=='instant' else 'STARTED_AT!==""')
   if mode=='instant':assert s.evaluate('jokerUsed');s.evaluate('timerDeadline=Date.now()-1;refreshInstantTimer()');s.wait_for_function('submitted')
   else:
    assert s.evaluate('JOKER_USED');s.evaluate('TIMER_DEADLINE=Date.now()-1;refreshSecureTimer()');s.wait_for_function('ANSWER_TXT.startsWith("SECURE-ANSWERS-V1")');v=h.new_page(x['teacher']);payload=v.evaluate('async txt=>await decryptPayload(parseTxt(txt))',s.locator('#answerBackup').input_value());assert payload['jokerUsed']
   return {'jokerRecorded':True,'deadlineAutoSubmit':True}
  finally:
   s.close()
   if v:v.close()
 for m in ['instant','secureOffline']:record('joker-and-deadline-'+m,lambda m=m:joker(m))
finally:h.close()
