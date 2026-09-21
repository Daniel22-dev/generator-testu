from harness import Harness,TESTS
from browser_matrix import click_attr
import json
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text());p.add_script_tag(content=(TESTS/'pipeline_fixtures.js').read_text());levels=p.evaluate('CEFR_LEVELS')
 for level in levels:
  p.evaluate('auditReset(["translation"],"instant","en");goTo(1)');click_attr(p,'onclick',"toggleCefr('"+level+"')");assert p.evaluate('state.uroven')==[level];x=p.evaluate('async()=>{const b=await assembleTestHtml(state,auditFixtures(state,"en"));return lastAssembled.cfg.cefr}');rows.append({'case':'CEFR-select-assemble','level':level,'ok':x==level})
 combos=p.evaluate('''()=>{const result=[];for(let mask=1;mask<(1<<CEFR_LEVELS.length);mask++){state.kombinovat=true;state.uroven=CEFR_LEVELS.filter((_,i)=>mask&(1<<i));const expected=state.uroven.join('/');const label=cefrLabel();toggleKombinovat();result.push({mask,expected,label,kept:state.uroven[0],ok:label===expected&&state.uroven.length===1&&state.uroven[0]===expected.split('/').at(-1)});}return result}''');rows+=combos
 checks=p.evaluate('''()=>{const out=[];for(const typ of ALL_TYPES)for(const points of [0,-1,0.5,1,999,1000]){auditConfigure([typ],'instant','en');state.exerciseConfig[0].body=points;let allowed=true;try{generationPlan(state)}catch{allowed=false}out.push({case:'points-boundary',type:typ,points,ok:allowed===(Number.isInteger(points)&&points>=1&&points<=999)})}return out}''');rows+=checks
 for label,scale,expected in [('complete','A = 90-100 %\nB = 0-89 %',True),('gap','A = 90-100 %\nB = 0-80 %',False),('overlap','A = 80-100 %\nB = 0-90 %',False)]:
  got=p.evaluate('s=>{auditReset(["translation"],"instant","en");state.gradeTyp="vlastni";$("vlastniSkala").value=s;validate();return !$("next2").disabled}',scale);rows.append({'case':'custom-scale-'+label,'ok':got==expected,'allowed':got})
 # A transcript on an inactive source tab cannot silently validate an absent listening source.
 got=p.evaluate('()=>{auditConfigure(["listening comprehension"],"instant","en");state.listeningTranscript="";$("listeningTranscript").value="";state.zadaniTab="text";state.zadaniText="";state.urls=["https://example.invalid/source"];return hasListeningSource()}');rows.append({'case':'inactive-URL-not-listening-source','ok':not got})
 (TESTS.parent/'evidence/config-extra-suite.json').write_text(json.dumps(rows,indent=2));print(json.dumps({'runs':len(rows),'failures':[r for r in rows if not r['ok']]}))
finally:h.close()
