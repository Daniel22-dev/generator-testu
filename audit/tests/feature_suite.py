from harness import Harness,TESTS
from browser_matrix import click_attr
import json,time,traceback
h=Harness();rows=[]
def record(name,fn):
 row={'test':name}
 try:row.update(ok=True,detail=fn())
 except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('try{closeTestEditor()}catch{};try{closeTestPreview()}catch{};closeUiModal(null)')
 rows.append(row);print(json.dumps({k:v for k,v in row.items() if k!='trace'}),flush=True);(TESTS.parent/'evidence/feature-suite.json').write_text(json.dumps(rows,indent=2))
def build(types=['translation'],mode='instant'):
 p.evaluate('async a=>{await auditBuild(a.types,a.mode,"en");goTo(4);resultStep(1)}',{'types':types,'mode':mode})
def wait_edit():p.wait_for_function('!outputMutationBusy && !$("btnEditorApply").disabled')
try:
 p=h.app();_evaluate=p.evaluate
 def safe_evaluate(expr,arg=None):
  if isinstance(expr,str) and not expr.lstrip().startswith(('async','(', 'function', 'JSON.', 'generated', 'last', 'typeof', 'secure', '__errors')) and '=>' in expr and '=' in expr:expr='()=>{'+expr+';return null;}'
  return _evaluate(expr,arg)
 p.evaluate=safe_evaluate
 p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 def preview():
  build();p.locator('#btnPreview').click();p.wait_for_function('!$("previewModal").classList.contains("hidden")')
  assert 'hotovo' in p.locator('#resultTab1 .result-step-status').text_content().lower()
  for key in ['pvW360','pvW768','pvWfull']:p.locator('#'+key).click();assert p.locator('#'+key).get_attribute('class').find('active')>=0
  p.keyboard.press('Escape');assert not p.locator('#previewModal').is_visible();return '3 widths and Escape'
 record('lazy-preview',preview)
 def preview_code():
  for mode in ['secureOffline','instant']:
   p.evaluate("""async mode=>{auditConfigure(['multiple choice'],mode,'en');state.identityMode='oneTimeCode';rosterEntries.length=0;rosterEntries.push({name:'QA Student',code:'QA-CODE-7'});const data=auditFixtures(state,'en');lastGenData=data;const built=await assembleTestHtml(state,data);generatedPackage=mode==='secureOffline'?built:null;generatedTestHtml=generatedPackage?'':String(built);generatedIntegrity=null;lastSelfTest=null;exportChecklist={};resetKeyCheckState();setGenUI('done');renderExportChecklist(true);goTo(4)}""",mode)
   artifact=p.evaluate('generatedPackage?generatedPackage.studentHtml:generatedTestHtml');assert 'QA-CODE-7' not in artifact
   p.locator('#btnPreview').click();p.wait_for_function('!$("previewModal").classList.contains("hidden")');f=p.frame_locator('#previewFrame');f.locator('#studentName').wait_for();assert f.locator('#studentName').input_value()=='QA-CODE-7';assert f.locator('#studentName').get_attribute('type')=='password';p.evaluate('closeTestPreview()')
  return 'one-time code works in secure + instant teacher preview and never enters student artefact'
 record('preview-one-time-code',preview_code)
 def edit_counts():
  build(['fill-in-the-blank']);p.locator('#btnEdit').click();p.wait_for_function('!$("editorModal").classList.contains("hidden")');click_attr(p,'onclick','edAddItem(0)');assert p.locator('.ed-item').count()==3
  p.locator('.ed-item').nth(2).locator('textarea').fill('Write ___');p.locator('.ed-item').nth(2).locator('.ed-correct').fill('water');p.locator('#btnEditorApply').click();wait_edit();assert not p.locator('#editorModal').is_visible(),p.locator('#editorError').text_content();assert p.evaluate('lastAssembled.variants.__default[0].items.length')==3
  p.locator('#btnEdit').click();click_attr(p,'onclick','edDelItem(0,2)');p.locator('#btnEditorApply').click();wait_edit();assert p.evaluate('lastAssembled.variants.__default[0].items.length')==2
  return '2 -> 3 -> 2'
 record('editor-add-remove',edit_counts)
 def checklist_survives_same_test_rebuild():
  build(['translation']);p.evaluate('exportChecklist={content:true,answers:true,grading:true,distribution:true}')
  checks=p.evaluate('async()=>{await commitAnswerData(JSON.parse(JSON.stringify(lastGenData)),outputStamp());return exportChecklist}')
  assert all(checks.get(k) is True for k in ['content','answers','grading','distribution']),checks;return checks
 record('teacher-checklist-persists-on-rebuild',checklist_survives_same_test_rebuild)
 def invalid_editor():
  build(['matching']);old=p.evaluate('generatedTestHtml');p.locator('#btnEdit').click();click_attr(p,'onclick','edDelItem(0,1)');p.locator('#btnEditorApply').click();wait_edit();assert p.locator('#editorError').is_visible();assert p.evaluate('generatedTestHtml')==old;p.locator('[onclick="closeTestEditor()"]').first.click();return '1-pair rejected; original package unchanged'
 record('editor-invalid-rollback',invalid_editor)
 def proposals():
  build();p.locator('#resultTab3').click();p.evaluate('genAiAvailable=()=>true;callGeminiJSON=async()=>({items:[{id:0,alts:["water NEW","water OTHER"]},{id:1,alts:["water THIRD"]}]})')
  p.locator('#btnEnrich').click();p.wait_for_function('document.querySelectorAll(".en-pick").length===3');before=p.evaluate('JSON.stringify(lastGenData)');p.locator('#btnAcceptProposals').click();assert p.evaluate('JSON.stringify(lastGenData)')==before
  p.locator('.en-pick').nth(1).check();p.locator('#btnAcceptProposals').click();p.wait_for_function('!outputMutationBusy && lastGenData.exercises[0].items[0].alt_answers.includes("water OTHER")');d=p.evaluate('lastGenData');assert 'water NEW' not in d['exercises'][0]['items'][0]['alt_answers'];assert 'water THIRD' not in d['exercises'][0]['items'][1]['alt_answers'];assert p.evaluate('lastSelfTest') is None
  return 'none does nothing; only the selected of 3 proposals is added'
 record('proposal-check-and-accept',proposals)
 def stale_proposal():
  build();p.locator('#resultTab3').click();p.evaluate('callGeminiJSON=async()=>({items:[{id:0,alts:["water STALE"]}]})');p.locator('#btnEnrich').click();p.wait_for_function('document.querySelectorAll(".en-pick").length===1');p.locator('.en-pick').check()
  p.evaluate('async()=>{const st=outputStamp();await commitAnswerData(JSON.parse(JSON.stringify(lastGenData)),st)}')
  # Since 7.1.59 (F-28) stale proposals are disabled right after the change; the stamp guard still refuses a direct call.
  assert p.locator('#btnAcceptProposals').is_disabled() and 'nejde použít' in p.evaluate("document.getElementById('enApplyStatus').innerText")
  p.evaluate('()=>{document.querySelectorAll(".en-pick").forEach(c=>{c.disabled=false;c.checked=true})}');p.evaluate('async()=>{try{await enAcceptSelected()}catch(e){}}');p.wait_for_timeout(300)
  assert 'STALE' not in p.evaluate('JSON.stringify(lastGenData)');return 'stale proposal disabled and refused'
 record('stale-proposals',stale_proposal)
 # Correct solutions are supplied only across the AI boundary; real comparison/UI are retained.
 p.add_script_tag(content='''window.auditKeyAnswer=(ex,it)=>{const t=ex.type;if(t==='matching')return ex.items.map(x=>x.right);if(['multiple choice','dialogue completion','reading comprehension','listening comprehension','multi-select','true/false','highlight-evidence'].includes(t))return it.correct;if(t==='ordering')return it.correct_order;if(t==='categorisation-board')return it.entries.map(x=>x.category);if(t==='table-completion')return it.rows.map(r=>r.map(c=>typeof c==='object'?c.answer:c));if(t==='transformation-chain')return it.transformations.map(x=>x.answer);if(t==='error-tagging')return {token:it.error_token_index,etype:it.error_type,corr:it.correction};if(t==='categorization')return it.correct_category;if(t==='fill-in-the-blank'||t==='cloze text')return it.answers||[it.answer];return it.correction||it.correct_sentence||it.answer;};window.__keyPrompt=akvBuildPrompt;akvBuildPrompt=function(units){window.__keyUnits=units;return __keyPrompt(units)};''')
 types=p.evaluate('ALL_TYPES')
 for bi in range(0,38,10):
  chunk=types[bi:bi+10]
  def key_match(chunk=chunk):
   build(chunk);p.locator('#resultTab3').click();p.evaluate('genAiAvailable=()=>true;callGeminiJSON=async()=>({answers:__keyUnits.map(u=>({i:u.i,a:auditKeyAnswer(u.exObj,u.itObj)}))})');p.locator('#btnKeyCheck').click();p.wait_for_function('!akvBusy');d=p.evaluate('lastKeyCheck');assert d and not any(d[k]for k in ['missing','invalid','closedDiffs','openWeaks']),d;return d
  record('key-all-types-'+str(bi),key_match)
 def weak_key():
  build();p.locator('#resultTab3').click();p.evaluate('callGeminiJSON=async()=>({answers:__keyUnits.map(u=>({i:u.i,a:"water KEYALTERNATIVE"}))})');p.locator('#btnKeyCheck').click();p.wait_for_function('!akvBusy');assert p.evaluate('lastKeyCheck.openWeaks')==2
  p.locator('#keyCheckReport summary').click() if not p.locator('.akv-pick').first.is_visible() else None
  click_attr(p,'onclick','akvApplySelected()');assert 'KEYALTERNATIVE' not in p.evaluate('JSON.stringify(lastGenData)');p.locator('.akv-pick').first.check();click_attr(p,'onclick','akvApplySelected()');p.wait_for_function('!outputMutationBusy && lastGenData.exercises[0].items[0].alt_answers.includes("water KEYALTERNATIVE")');assert 'KEYALTERNATIVE' not in json.dumps(p.evaluate('lastGenData.exercises[0].items[1]'));return 'checked one of two alternatives applied'
 record('key-weak-accept',weak_key)
 def closed_key_decision():
  build(['true/false']);p.locator('#resultTab3').click();p.evaluate('callGeminiJSON=async()=>({answers:__keyUnits.map(u=>({i:u.i,a:false}))})');p.locator('#btnKeyCheck').click();p.wait_for_function('!akvBusy')
  if not p.locator('input[name="akvDiff0"]').first.is_visible():p.locator('#keyCheckReport summary').click()
  assert p.locator('input[name="akvDiff0"]').count()==2 and p.locator('input[name="akvDiff1"]').count()==2
  p.locator('input[name="akvDiff0"][value="ai"]').check();p.locator('input[name="akvDiff1"][value="keep"]').check();click_attr(p,'onclick','akvApplyClosedReview()');p.wait_for_function('!outputMutationBusy')
  vals=p.evaluate('[lastGenData.exercises[0].items[0].correct,lastGenData.exercises[0].items[1].correct]');assert vals==[False,True],vals;return vals
 record('key-closed-diff-actionable',closed_key_decision)
 def incomplete():
  build(['multiple choice']);p.locator('#resultTab3').click();p.evaluate('callGeminiJSON=async()=>({answers:[]})');p.locator('#btnKeyCheck').click();p.wait_for_function('!akvBusy');d=p.evaluate('lastKeyCheck');assert d['missing']==2 and d['checked']==0;return d
 record('key-missing-not-green',incomplete)
 def key_failure():
  build(['multiple choice']);p.locator('#resultTab3').click();p.evaluate('()=>{lastKeyCheck={checked:2};callGeminiJSON=async()=>{throw new Error("provider failed") };}');p.locator('#btnKeyCheck').click();p.wait_for_function('!akvBusy');assert p.evaluate('lastKeyCheck') is None;return 'old verification cleared'
 record('key-error-clears-old-green',key_failure)
 def quota_error_help():
  build(['translation']);p.locator('#resultTab3').click();p.evaluate('genAiAvailable=()=>true;callGeminiJSON=async()=>{throw new Error("Kvóta AI služby byla vyčerpána. Technicky: HTTP 429 · QUOTA_EXCEEDED")}')
  p.locator('#btnEnrich').click();b=p.locator('#answerProposalReport button');b.wait_for();assert b.count()==1 and b.text_content()=='429';b.click();p.wait_for_selector('#uiModal');assert p.locator('#uiModal .ui-modal-head').text_content()=='HTTP 429';p.locator('#uiModal [data-ui-ok]').click();return '429 is clickable and explained'
 record('quota-429-clickable-help',quota_error_help)
 def frozen_variant():
  build(['translation']);p.evaluate('window.__beforeVariant=outputStamp();state.jazyk="latina";state.body=900;$("nazev").value="OTHER TEST";$("ucitelPin").value="OTHER-ACCESS-CODE";lastSelfTest={ok:true};exportChecklist={content:true,answers:true,grading:true,distribution:true}')
  p.evaluate('async()=>await makeVariantForNextGroup()');d=p.evaluate('({same:lastAssembled===__beforeVariant,id:lastAssembled.cfg.testId,prev:__beforeVariant.cfg.testId,lang:lastAssembled.cfg.uiLang,total:lastAssembled.variants.__default[0].points_total,self:lastSelfTest,checks:exportChecklist,slug:variantSlug})');assert not d['same'] and d['id']!=d['prev'] and d['lang']=='en' and d['self'] is None and d['checks']=={} and d['slug'];return d
 record('variant-frozen-transaction',frozen_variant)
 def rollback():
  build(['translation']);p.evaluate('window.__snapshot={a:lastAssembled,h:generatedTestHtml,d:lastGenData,i:generatedIntegrity};window.__originalSmoke=validateGeneratedHtmlSmoke;validateGeneratedHtmlSmoke=async()=>{throw new Error("injected smoke failure")}')
  try:d=p.evaluate('async()=>{let failed=false;try{await commitAnswerData(JSON.parse(JSON.stringify(lastGenData)),outputStamp())}catch{failed=true}return {failed,sameA:lastAssembled===__snapshot.a,sameH:generatedTestHtml===__snapshot.h,sameD:lastGenData===__snapshot.d,sameI:generatedIntegrity===__snapshot.i}}');assert all(d.values()),d;return d
  finally:p.evaluate('()=>{validateGeneratedHtmlSmoke=__originalSmoke}')
 record('injected-commit-failure-rollback',rollback)
 def gate():
  build(['multiple choice'],'secureOffline');assert not p.evaluate('secureDownloadAllowed()')
  if not p.locator('#exportChecklist input').first.is_visible():p.locator('#exportChecklist summary').click()
  for i in range(4):p.locator('#exportChecklist input').nth(i).check()
  assert not p.evaluate('secureDownloadAllowed()');p.locator('#resultTab2').click();p.locator('#btnSelfTest').click();p.wait_for_function('lastSelfTest!==null');assert p.evaluate('secureDownloadAllowed()');p.locator('#resultTab4').click();assert not p.locator('#btnDownloadStudent').is_disabled();p.locator('#resultTab1').focus();p.keyboard.press('End');assert p.locator('#resultTab4').get_attribute('aria-selected')=='true';p.keyboard.press('Home');assert p.locator('#resultTab1').get_attribute('aria-selected')=='true'
  return '4 required checks + self-test; keyboard Home/End; gate releases'
 record('secure-gate-and-keyboard',gate)
finally:h.close()
