#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const checks=[];
const check=(ok,id,detail='')=>checks.push({id,ok:!!ok,detail:String(detail)});
const builder=read('src/js/14a-test-html-builders.js');
const student=read('src/js/13e-secure-student-runtime.js');
const teacher=read('src/js/13f-secure-teacher-verifier.js');
const instantCss=read('src/js/14c-test-css.js');
const secureCss=read('src/js/13d-secure-student-shell.js');
const core=read('src/js/01-core.js');
const limitsPath=path.join(root,'docs','SECURITY-BROWSER-LIMITS.md');

check(/reading-passage[^']*white-space:pre-line[^']*text-align:justify/.test(instantCss),'ID13-01','instant LF/CRLF preservation and justify CSS');
check(/reading-passage[^']*white-space:pre-line[^']*text-align:justify/.test(secureCss),'ID13-02','secure student and teacher preview LF/CRLF preservation and justify CSS');
check(/H\(sp\)(?!\.replace)/.test(builder)&&/reading-passage[^\n]+H\(item\.passage\)/.test(builder),'ID13-03','instant shared and per-item paths escape content and preserve raw line endings for CSS');
check(/reading-passage[^\n]+esc\(sp\)(?!\.replace)/.test(student)&&/reading-passage[^\n]+esc\(it\.passage\)/.test(student),'ID13-04','secure student shared and per-item paths escape content and preserve raw line endings');
check(/rcShared=ex\.type==='reading comprehension'\?readingSource\(ex\):''/.test(teacher)&&/reading-passage[^\n]+esc\(rcShared\)/.test(teacher)&&/!rcShared&&it\.passage/.test(teacher),'ID13-05','teacher preview renders shared or per-item passage once');
check(/\.src\{[^']*white-space:pre-line[^']*text-align:justify/.test(teacher),'ID13-06','teacher print preserves line endings and justification');
check(!/H\(sp\)\.replace\(\/\\n\/g/.test(builder)&&!/esc\(sp\)\.replace\(\/\\n\/g/.test(student),'ID13-07','no LF-only conversion remains in Reading paths');

check(fs.existsSync(limitsPath),'C34-01','canonical browser limitation document');
const limits=fs.existsSync(limitsPath)?fs.readFileSync(limitsPath,'utf8'):'';
for(const phrase of ['SHADOW/AUDIT-ONLY','klient','druhé zařízení','DevTools','Slide Over','Stage Manager','notifik','automatický důkaz','automatický zámek']){
  check(limits.toLocaleLowerCase('cs').includes(phrase.toLocaleLowerCase('cs')),`C34-DOC-${phrase}`,phrase);
}
check(!/vzorkuje každé 2 s|menší než 60 %|1–3 signály mohou|10\+ je podezřelé/.test(core),'C34-02','no obsolete deterministic thresholds/normality claims');
check(/status:'castecne'[\s\S]{0,450}SHADOW\/AUDIT-ONLY/.test(core),'C34-03','assistant labels split detection as partial audit-only telemetry');
check(/client-controlled|klientem ovladateln/i.test(core),'C34-04','assistant states client control');
check(/DevTools/.test(core)&&/same-origin/.test(core),'C34-05','assistant threat model names DevTools and same-origin boundary');

for(const row of checks)console.log(`${row.ok?'PASS':'FAIL'} ${row.id}${row.detail?`: ${row.detail}`:''}`);
const failed=checks.filter(row=>!row.ok);
console.log(JSON.stringify({status:failed.length?'FAIL':'PASS',checks:checks.length,failed:failed.map(row=>row.id)},null,2));
if(failed.length)process.exit(1);
