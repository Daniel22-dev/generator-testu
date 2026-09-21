from harness import Harness,TESTS
from browser_matrix import answer,click_attr
import json,time,traceback
OUT=TESTS.parent/'evidence'
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());types=p.evaluate('ALL_TYPES')
 for mode in ['instant','secureOffline']:
  for t in types:
   row={'type':t,'mode':mode};s=None
   try:
    p.evaluate('async a=>await auditBuild([a.t],a.mode,"en","target",2)',{'t':t,'mode':mode});p.evaluate('goTo(4);resultStep(1)')
    p.locator('#btnEdit').click();p.wait_for_function('!$("editorModal").classList.contains("hidden")')
    assert p.evaluate('typeof GHRABGeneratorFeatures.previewEditor.openEditor')=='function'
    p.locator('#editorBody .ed-title').first.fill('AUDITED '+t)
    field=p.locator('#editorBody [oninput*="explanation"]').first;field.fill('Updated explanation')
    p.locator('#btnEditorApply').click();p.wait_for_function('!outputMutationBusy && !$("btnEditorApply").disabled')
    assert not p.locator('#editorModal').is_visible(),p.locator('#editorError').text_content()
    result=p.evaluate('({html:generatedPackage?generatedPackage.studentHtml:generatedTestHtml,teacher:generatedPackage?.teacherHtml,ex:lastAssembled.variants.__default[0],self:lastSelfTest,gates:exportChecklist})')
    assert result['ex']['title']=='AUDITED '+t
    assert result['ex']['items'][0]['explanation']=='Updated explanation'
    assert result['self'] is None and result['gates']=={}
    st=p.evaluate('async()=>await runScoringSelfTest()');assert st['ok'] and not st['hasGaps'],st
    row.update(ok=True,roundTrip=True,selfTest=st)
   except Exception as e:row.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('try{closeTestEditor()}catch{};closeUiModal(null)')
   rows.append(row);print(json.dumps({k:v for k,v in row.items()if k not in ['trace','selfTest']}),flush=True)
   (OUT/'editor-suite.json').write_text(json.dumps(rows,indent=2))
finally:h.close()
