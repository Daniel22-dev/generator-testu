from harness import Harness,TESTS
import json,traceback
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.evaluate('async()=>{await auditBuild(["translation","ordering","table-completion"],"secureOffline","es");goTo(4);resultStep(1)}')
 for width in [1400,768,390,320]:
  r={'width':width}
  try:
   p.set_viewport_size({'width':width,'height':920});p.wait_for_timeout(80)
   sw=p.evaluate('({scroll:document.documentElement.scrollWidth,viewport:innerWidth})');r['layout']=sw;assert sw['scroll']<=width+1,sw
   for n in [1,2,3,4]:p.locator('#resultTab'+str(n)).click();assert p.locator(f'[data-result-panel="{n}"]').is_visible()
   p.locator('#resultTab1').click()
   if width in [1400,390]:p.locator('#genResult').screenshot(path=str(TESTS.parent/f'evidence/result-cards-{width}.png'))
   p.evaluate('()=>{let b=document.createElement("button");b.id="auditStudioBubble";b.textContent="Soukromi a ukonceni prace";b.style.cssText="position:fixed;bottom:12px;left:12px;width:190px;height:38px;z-index:2147483647";document.body.append(b)}')
   p.locator('#btnEdit').click();p.wait_for_selector('#editorModal:not(.hidden)')
   box=p.locator('#btnEditorApply').bounding_box();bubble=p.locator('#auditStudioBubble').bounding_box();overlap=box['x']<bubble['x']+bubble['width'] and box['x']+box['width']>bubble['x'] and box['y']<bubble['y']+bubble['height'] and box['y']+box['height']>bubble['y'];assert not overlap,(box,bubble)
   hit=p.evaluate('()=>{const b=$("btnEditorApply"),r=b.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return b===e||b.contains(e)}');assert hit,(box,bubble)
   if width in [1400,390]:p.screenshot(path=str(TESTS.parent/f'evidence/editor-overlay-{width}.png'))
   p.locator('#btnEditorApply').click();p.wait_for_function('!outputMutationBusy && $("editorModal").classList.contains("hidden")');p.evaluate('$("auditStudioBubble").remove()');r.update(ok=True,saveButtonUncovered=True)
  except Exception as e:r.update(ok=False,error=str(e),trace=traceback.format_exc());p.evaluate('try{closeTestEditor()}catch{};$("auditStudioBubble")?.remove()')
  rows.append(r);print(json.dumps({k:v for k,v in r.items() if k!='trace'}),flush=True);(TESTS.parent/'evidence/visual-suite.json').write_text(json.dumps(rows,indent=2))
finally:h.close()
