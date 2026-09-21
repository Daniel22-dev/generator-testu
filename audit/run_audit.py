#!/usr/bin/env python3
"""Run fixture-based audit suites; fail on incomplete or failed JSON evidence."""
from pathlib import Path
import argparse,json,subprocess,sys,time
BASE=Path(__file__).resolve().parent
SPECS={
 'config_matrix':('config-matrix.json',None),
 'config_extra_suite':('config-extra-suite.json',301),
 'wizard_suite':('wizard-suite.json',16),
 'czech_suite':('czech-suite.json',39),
 'manual_suite':('manual-suite.json',9),
 'pipeline_matrix':('pipeline-matrix.json',380),
 'browser_matrix':('browser-matrix.json',48),
 'editor_suite':('editor-suite.json',76),
 'feature_suite':('feature-suite.json',15),
 'integration_suite':('integration-suite.json',17),
 'runtime_suite':('runtime-suite.json',36),
 'language_suite':('language-suite.json',53),
 'stress_suite':('stress-suite.json',63),
 'identity_suite':('identity-suite.json',8),
 'accessibility_forms_suite':('accessibility-forms-suite.json',12),
 'visual_suite':('visual-suite.json',4),
}
def validate(name: str) -> dict:
 filename,expected=SPECS[name]
 data=json.loads((BASE/'evidence'/filename).read_text())
 if name=='config_matrix':
  assert not data['failures'],data['failures']
  for k,v in [('modeCount',576),('pairCount',1482),('boundaryCount',3420)]:
   assert data[k]==v,(k,data[k],v)
  return {'suite':name,'ok':True,'contracts':5478}
 rows=data if isinstance(data,list) else data['runs']
 assert len(rows)==expected,('Incomplete suite',len(rows),expected)
 failures=[r for r in rows if r.get('ok') is not True]
 assert not failures,failures
 return {'suite':name,'ok':True,'scenarios':len(rows)}
def main() -> int:
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--validate-only',action='store_true',help='Check stored JSON without running tests.')
 parser.add_argument('--suite',action='append',choices=list(SPECS),help='Run selected suite(s) only.')
 args=parser.parse_args();selected=args.suite or list(SPECS)
 (BASE/'evidence').mkdir(exist_ok=True);results=[]
 for name in selected:
  start=time.monotonic()
  try:
   if not args.validate_only:
    (BASE/'evidence'/SPECS[name][0]).unlink(missing_ok=True)
    with (BASE/'evidence'/(name+'.log')).open('w') as log:
     process=subprocess.run([sys.executable,str(BASE/'tests'/(name+'.py'))],cwd=BASE.parent,stdout=log,stderr=subprocess.STDOUT,timeout=1800)
    if process.returncode:raise RuntimeError(f'Process exited {process.returncode}; inspect {name}.log')
   result=validate(name)
  except Exception as error:
   result={'suite':name,'ok':False,'error':str(error)}
  result['seconds']=round(time.monotonic()-start,2);results.append(result)
  print(json.dumps(result,ensure_ascii=True),flush=True)
 (BASE/'evidence'/'runner-result.json').write_text(json.dumps({'validateOnly':args.validate_only,'results':results},indent=2))
 return 0 if all(r['ok']for r in results) else 1
if __name__=='__main__':sys.exit(main())
