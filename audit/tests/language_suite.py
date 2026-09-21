from harness import Harness,TESTS
import json,traceback
h=Harness();rows=[]
try:
 p=h.app();p.add_script_tag(content=(TESTS/'fixtures.js').read_text())
 for lang in ['en','es','de','fr','la','cs']:
  for instr in ['target','cs','mixed']:
   for mode in ['instant','secureOffline']:
    r={'language':lang,'instructionMode':instr,'mode':mode}
    try:
     x=p.evaluate('async a=>{const x=await auditBuild(["error-tagging","ordering"],a.mode,a.lang,a.instr);return {lang:x.cfg.uiLang,labels:x.cfg.labels,htmlLang:x.html.match(/<html lang="([^"]+)/)?.[1]}}',{'mode':mode,'lang':lang,'instr':instr});exp=lang if instr=='target' else 'cs';assert x['lang']==x['htmlLang']==exp,x;assert x['labels']['errorWord'] and x['labels']['unassignedIdentity'],x;r.update(ok=True,resolved=exp)
    except Exception as e:r.update(ok=False,error=str(e))
    rows.append(r)
 # Scoring policy, not pedagogical verification by native speakers.
 cases=[('en','Water','water',1),('en','river!','river',1),('en','don\u2019t',"don't",1),('es','rio','r\u00edo',.5),('es','ano','a\u00f1o',0),('es','pinguino','ping\u00fcino',.5),('es','ri\u0301o','r\u00edo',1),('de','wasser','Wasser',1),('de','schon','sch\u00f6n',0),('de','strasse','stra\u00dfe',0),('fr','riviere','rivi\u00e8re',0),('fr','e\u0301te\u0301','\u00e9t\u00e9',1),('la','malum','m\u0101lum',0),('la','aqua','aqua',1),('cs','rada','\u0159ada',0),('cs','praha','Praha',0),('cs','A B','A, B',0)]
 for lang,g,c,expected in cases:
  got=p.evaluate('a=>createSharedScoringDiagnosticApi({isSpanish:a.lang==="es",isCzech:a.lang==="cs",csScoringPolicy:{enabled:true,diacritics:true,punctuation:true,capitalization:true},fuzzyMode:"off"}).textScore(a.g,a.c,[],"translation")',{'lang':lang,'g':g,'c':c});rows.append({'language':lang,'given':g,'correct':c,'expected':expected,'actual':got,'ok':got==expected})
 (TESTS.parent/'evidence/language-suite.json').write_text(json.dumps(rows,indent=2));print(json.dumps({'runs':len(rows),'failures':[r for r in rows if not r['ok']]}))
finally:h.close()
