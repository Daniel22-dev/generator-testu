#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const results=[];
function record(id,ok,detail=''){
  const status=ok?'PASS':'FAIL';
  results.push({id,status,detail});
  console.log(`${status.padEnd(5)} ${id}${detail?` - ${detail}`:''}`);
  if(!ok)process.exitCode=1;
}
function check(id,fn){
  try{const detail=fn();record(id,true,detail||'');}
  catch(error){record(id,false,String(error?.message||error));}
}
function must(value,message){if(!value)throw new Error(message);}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const dependencyFiles=[
  'src/js/13b-secure-shared-scoring.js',
  'src/js/13ea-secure-verifier-forms.js',
  'src/js/13eb-secure-teacher-verifier-v2-ui.js',
  'src/js/13ec-secure-verifier-trust.js',
  'src/js/13ed-secure-verifier-validation.js',
  'src/js/13ee-secure-verifier-anchors.js',
  'src/js/13ef-secure-verifier-replay.js',
  'src/js/13eg-secure-verifier-history.js',
  'src/js/13eh-secure-teacher-verifier-s4.js',
  'src/js/13ez-secure-teacher-config.js',
  'src/js/13fa-secure-teacher-verifier-pdf.js',
];
const context=vm.createContext({
  console,
  H:value=>String(value??''),
  secureCss:()=>'',
  auditCommentHtml:()=>'',
  safeJsonForScript:value=>JSON.stringify(value).replace(/</g,'\\u003c'),
  verifierLessonHtml:()=>'',
  verifierFormsStatusHtml:()=>'',
  verifierAnchorSettingsHtml:()=>'',
});
for(const file of dependencyFiles){
  if(!fs.existsSync(file))continue;
  new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}).runInContext(context);
}
new vm.Script(fs.readFileSync('src/js/13f-secure-teacher-verifier.js','utf8'),{filename:'src/js/13f-secure-teacher-verifier.js'}).runInContext(context);

const cfg={
  generatorVersion:'7.1.99',buildHash:'s4-source',releaseDate:'2026-10-12',releaseStatus:'qa',generatedAt:'2026-10-12T04:00:00.000Z',
  creatorId:'synthetic-owner',creatorName:'Synthetic teacher',creatorRole:'teacher',testId:'S4-SYNTHETIC',manifestHash:'a'.repeat(64),
  studentHtmlSha256:'b'.repeat(64),nazev:'Synthetic S04 verifier',proKoho:'QA',isSpanish:false,isCzech:false,csScoringPolicy:{},
  cefr:'B1',cefrLevels:['B1'],cefrCombined:false,totalBody:10,gradeTyp:'cz',gradeScale:[],gradeScaleRaw:'',fuzzyTolerance:'off',cas:45,
  identityMode:'name',roster:[],diffGroups:[],zolicek:'ANO',randomizace:false,schoolLogoDataUri:'',privateKey:{kty:'RSA'},formsAnchorPolicy:null,
};
const variants={__default:[{style:'multiple choice',type:'multiple choice',title:'Synthetic topic',points_total:1,points_each:1,items:[{question:'Q',options:['A','B'],correct:0}]}]};
const html=context.buildSecureTeacherVerifierHtml(cfg,variants);
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://qa.invalid/private-verifier.html',pretendToBeVisual:true,beforeParse(window){
  window.matchMedia=window.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  window.scrollTo=()=>{};
  window.HTMLElement.prototype.scrollIntoView=()=>{};
  if(window.HTMLAnchorElement)window.HTMLAnchorElement.prototype.click=()=>{};
  window.URL.createObjectURL=()=> 'blob:s4';
  window.URL.revokeObjectURL=()=>{};
  window.fetch=async()=>{throw new Error('S04 offline verifier attempted network access');};
}});
await sleep(40);
const w=dom.window;

function iso(offset){return new Date(Date.parse('2026-10-12T05:00:00.000Z')+offset*1000).toISOString();}
function event(type,index,extra={}){return {t:iso(index+1),type,detail:`synthetic-${type}-${index}`,...extra};}
function row(id,events,overrides={}){
  return {
    status:'OK',student:`Synthetic ${id}`,file:`synthetic-${id}.txt`,earned:8,total:10,pct:80,grade:2,groupKey:'__default',jokerUsed:false,
    attemptId:`ATT-${id}`,submissionDigest:`digest-${id}`,semanticDigest:`semantic-${id}`,securityEvents:events,details:[],answerChangeStats:{},
    totalAnswerChanges:0,metadataMismatch:[],envelopeMismatch:[],anchorNotes:[],startedAt:iso(0),submittedAt:iso(2000),
    formIdentity:`synthetic-${String(id).toLowerCase()}@example.invalid`,formTimestamp:iso(2001),submissionSource:'google-forms-csv',
    ...overrides,
  };
}
function setRows(rows){w.eval(`RESULTS=${JSON.stringify(rows)};ATTEMPT_DECISIONS.clear();`);}
function render(){w.renderTable();w.renderSecuritySignals();}
function text(selector){return w.document.querySelector(selector)?.textContent||'';}

check('T118-TV-T01-empty-state',()=>{
  setRows([]);render();
  must(/Zatím|žádn/i.test(text('#summary')+text('#resultTable')),'empty state není srozumitelný');
  must(!/NaN|undefined/.test(text('#resultTable')),'empty state obsahuje neplatnou hodnotu');
  return '0 výsledků bez výjimky';
});

const quiet=row('ONE',[event('attempt-start',0,{detail:'ATT-ONE'})]);
check('T119-TV-T02-one-compact-row',()=>{
  setRows([quiet]);render();
  must(w.document.querySelectorAll('#resultTable tr.s4-result-main').length===1,'chybí jeden kompaktní hlavní řádek');
  must(w.document.querySelector('.s4-detail-toggle'),'chybí ovládání Detail');
  must(/8\/10/.test(text('#resultTable'))&&/80/.test(text('#resultTable')),'chybí body nebo procenta');
  return '1 student, detail dostupný';
});

const distribution=[8,8,8,7,7,5];
const badDistribution=[3,3,2,2,2,1];
const splitPct=[7,49,96,null,null,null];
const six=distribution.map((count,i)=>{
  const events=[event('attempt-start',i*100,{detail:`ATT-SIX-${i}`})];
  for(let n=0;n<count;n++)events.push(event('locked',i*100+n+1),event('recovery-unlock',i*100+n+40,{lockReason:`synthetic-lock-${n}`}));
  for(let n=0;n<badDistribution[i];n++)events.push(event('bad-unlock',i*100+n+80));
  if(splitPct[i]!=null){const pct=splitPct[i],totalMs=10000,smallMs=pct*100;events.push(event('split-window',i*100+90,{pct,totalMs,smallMs}));}
  return row(`S${i+1}`,events,{attemptId:`ATT-SIX-${i}`,submissionDigest:`digest-six-${i}`,semanticDigest:`semantic-six-${i}`});
});

check('T120-TV-T03-6a8-compact-43-43-13',()=>{
  setRows(six);render();
  const mains=[...w.document.querySelectorAll('#resultTable tr.s4-result-main')];
  must(mains.length===6,'hlavní tabulka nemá 6 kompaktních řádků');
  must(mains.every(el=>!el.textContent.includes('2026-10-12T')),'hlavní řádek obsahuje chronologii');
  const aggregate=six.map(r=>w.verifierSecuritySummary(r)).reduce((a,s)=>({
    locks:a.locks+s.lockedCount,
    recovery:a.recovery+s.recoveryCount,
    bad:a.bad+s.badRecoveryCount
  }),{locks:0,recovery:0,bad:0});
  must(aggregate.locks===43&&aggregate.recovery===43&&aggregate.bad===13,`nesedí 43/43/13: ${JSON.stringify(aggregate)}`);
  return '6 pokusů; 43/43/13';
});

check('T121-TV-T04-split-all-percentages',()=>{
  setRows(six);render();
  const table=text('#resultTable'),security=text('#securitySignals');
  for(const pct of [7,49,96])must(table.includes(`${pct} %`)&&security.includes(`${pct} %`),`${pct} % není viditelné v obou přehledech`);
  must(!/prokázan(?:ý|é).*podvod/i.test(table+security),'UI tvrdí prokázaný podvod');
  return '7/49/96 % bez severity brány';
});

check('T122-TV-T05-missing-vs-zero',()=>{
  const missing=row('MISSING',undefined);delete missing.securityEvents;
  setRows([missing,quiet]);render();
  const states=[...w.document.querySelectorAll('[data-s4-split-state]')].map(el=>({state:el.dataset.s4SplitState,text:el.textContent}));
  must(states.some(x=>x.state==='absent'&&/Data nejsou k dispozici/.test(x.text)),'chybějící telemetrie není odlišena');
  must(states.some(x=>x.state==='none'&&/Nezaznamenáno/.test(x.text)),'platná telemetrie bez split události není odlišena');
  return 'ABSENT != validní nula';
});

const stressEvents=[event('attempt-start',0,{detail:'ATT-STRESS'})];
for(let i=0;i<301;i++)stressEvents.push(event(i%3===0?'focus-transition':'keyboard-focus-return',i+1,{awayMs:i}));
const stress=row('STRESS',stressEvents);
check('T123-TV-T06-300-complete-timeline',()=>{
  setRows([stress]);render();
  const main=w.document.querySelector('#resultTable tr.s4-result-main');
  const detail=w.document.querySelector('#resultTable tr.s4-result-detail');
  must(main&&!main.textContent.includes('synthetic-focus-transition'),'hlavní řádek roste s chronologií');
  must(detail?.hidden===true,'chronologie není ve výchozím stavu skrytá');
  must(detail.querySelectorAll('[data-s4-event]').length===stressEvents.length,'chronologie není kompletní');
  must(detail.querySelector('.s4-timeline-viewport'),'chronologie nemá omezený scrollovatelný viewport');
  return `${stressEvents.length} událostí dostupných v detailu`;
});

check('T124-TV-T07-heuristic-not-lock-policy',()=>{
  setRows([six[0]]);render();
  const rendered=text('#resultTable')+text('#securitySignals');
  must(/heuristik/i.test(rendered),'split není označen jako klientská heuristika');
  must(/nejde o důkaz podvodu ani pravidlo automatického zámku/i.test(rendered),'chybí neobviňující heuristická interpretace');
  return 'interpretace je auditní, nikoli lock policy';
});

check('T125-TV-T08-separated-lock-recovery',()=>{
  setRows(six);render();
  const head=text('#resultTable tr');
  must(/Zámky/i.test(head)&&/Recovery OK/i.test(head)&&/chybné/i.test(head),'počítadla nejsou oddělena');
  const options=[...w.document.querySelectorAll('#v2SecurityKind option')].map(x=>x.value);
  must(['locked','recovery','bad-recovery','split'].every(x=>options.includes(x)),'chybí samostatné bezpečnostní filtry');
  must(!w.securitySignalsFor(six[0]).some(x=>x.code==='recovery-unlock'&&x.sev!=='info'),'legitimní recovery je incident');
  return 'lock / recovery OK / bad recovery odděleny';
});

check('T126-TV-T09-review-and-attempt-controls',()=>{
  const a=row('CONFLICT',[event('attempt-start',0)],{student:'Synthetic conflict',attemptConflict:true,submissionDigest:'conflict-a',semanticDigest:''});
  const b=row('CONFLICT-B',[event('attempt-start',1)],{student:'Synthetic conflict',attemptConflict:true,submissionDigest:'conflict-b',semanticDigest:''});
  const identity=row('IDENTITY',[event('attempt-start',2)],{status:'IDENTITY_REVIEW',proposedIdentityCode:'ABC234'});
  const diagnostic=row('DIAG',[event('attempt-start',3)],{status:'DIAGNOSTIC_ONLY'});
  const exactA=row('EXACT-A',[event('attempt-start',4)],{semanticDigest:'same-exact',submissionDigest:'same-exact'});
  const exactB=row('EXACT-B',[event('attempt-start',5)],{semanticDigest:'same-exact',submissionDigest:'same-exact'});
  const hardA=row('HARD-A',[event('attempt-start',6)],{student:'Synthetic hard replay',semanticDigest:'hard-a'});
  const hardB=row('HARD-B',[event('attempt-start',7)],{student:'Synthetic hard replay',semanticDigest:'hard-b'});
  const joker=row('JOKER',[event('attempt-start',8)],{jokerUsed:true});
  setRows([a,b,identity,diagnostic,exactA,exactB,hardA,hardB,joker]);render();
  const rendered=text('#resultTable');
  must((rendered.match(/Použít tento pokus/g)||[]).length===2,'zmizela volba více platných pokusů');
  must(/Identita|IDENTITY/i.test(rendered),'zmizel identity review stav');
  must(/Diagnost/i.test(rendered),'zmizel diagnostický stav');
  must(/Identická duplicita/i.test(rendered),'zmizel exact duplicate stav');
  must(/Hard replay konflikt/i.test(rendered),'zmizel hard replay stav');
  must(/informativně/i.test(rendered),'zmizel stav žolíku mimo klasifikaci');
  return 'conflict, duplicate/replay, identity, joker a diagnostika zachovány';
});

check('T127-TV-T10-render-score-parity',()=>{
  setRows(six);
  const before=w.eval(`JSON.stringify({rows:RESULTS.map(({student,earned,total,pct,grade,attemptId,formIdentity})=>({student,earned,total,pct,grade,attemptId,formIdentity})),resolved:resolvedResults().map(r=>r.attemptId),effective:effectiveResults().map(r=>r.attemptId)})`);
  render();
  const after=w.eval('JSON.stringify(RESULTS.map(({student,earned,total,pct,grade,attemptId,formIdentity})=>({student,earned,total,pct,grade,attemptId,formIdentity})))');
  const afterAll=w.eval(`JSON.stringify({rows:RESULTS.map(({student,earned,total,pct,grade,attemptId,formIdentity})=>({student,earned,total,pct,grade,attemptId,formIdentity})),resolved:resolvedResults().map(r=>r.attemptId),effective:effectiveResults().map(r=>r.attemptId)})`);
  must(before===afterAll,'renderer změnil score/identity/binding nebo populaci resolved/effective výsledků');
  must(JSON.parse(after).every((r,i)=>r.attemptId===six[i].attemptId&&r.formIdentity===six[i].formIdentity),'renderer změnil importní binding');
  return 'score, známka, identity/binding a resolved/effective populace beze změny';
});

check('T128-TV-T11-student-policy-isolation',()=>{
  const s4=fs.readFileSync('src/js/13eh-secure-teacher-verifier-s4.js','utf8');
  must(!/lockTest\s*\(|recordSec\s*\(|recordSecurityEvent\s*\(/.test(s4),'S04 modul zasahuje do studentské lock policy');
  return 'S04 modul je teacher-only';
});

check('T129-TV-T12-responsive-theme-contract',()=>{
  const s4=fs.readFileSync('src/js/13eh-secure-teacher-verifier-s4.js','utf8');
  must(/@media\(max-width:900px\)/.test(s4)&&/max-height:/.test(s4)&&/overflow:auto/.test(s4),'chybí responzivní/scroll kontrakt');
  must(/var\(--v2-/.test(s4),'S04 UI nepoužívá oba motivy verifieru');
  return 'browser měření provádí samostatný gate';
});

check('T130-TV-T13-keyboard-aria',()=>{
  setRows([quiet]);render();
  const button=w.document.querySelector('.s4-detail-toggle');
  must(button?.tagName==='BUTTON'&&button.type==='button','Detail není nativní button');
  must(button.getAttribute('aria-expanded')==='false'&&button.hasAttribute('aria-controls'),'Detail nemá aria stav/vazbu');
  must(w.document.querySelector('#v2SecurityKind')?.getAttribute('aria-label'),'security filtr nemá accessible name');
  return 'button, aria-expanded, aria-controls, filter label';
});

check('T131-TV-T14-results-csv-append-only',()=>{
  const missing=row('CSV-MISSING',undefined);delete missing.securityEvents;
  setRows([quiet,missing]);
  w.eval('downloadText=function(txt,fn,mime){window.__s4Csv={txt:txt,fn:fn,mime:mime};}');
  w.downloadResultsCsv();
  const csv=w.__s4Csv?.txt||'';
  const lines=csv.split('\n');
  const parse=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:;|$)/g)].map(m=>m[1].replace(/""/g,'"'));
  const header=parse(lines[0]);
  must(header.at(-2)==='split_window_events'&&header.at(-1)==='split_window_max_pct','nové sloupce nejsou přesně na konci');
  const first=parse(lines[1]),second=parse(lines[2]);
  must(first.at(-2)==='0'&&first.at(-1)==='','platná nula/missing max mají chybnou semantiku');
  must(second.at(-2)===''&&second.at(-1)==='','chybějící telemetrie byla převedena na nulu');
  return `${header.length} sloupců; poslední dva stabilní`;
});

check('T132-TV-T15-xss',()=>{
  const payload='<img src=x onerror="window.__s4Xss=1">';
  const xss=row('XSS',[event('attempt-start',0),event('locked',1,{detail:payload})],{student:payload,formIdentity:`${payload}@example.invalid`});
  setRows([xss]);render();
  must(w.__s4Xss!==1,'XSS payload se spustil');
  must(!w.document.querySelector('#resultTable img'),'XSS vytvořil HTML element');
  must(text('#resultTable').includes('<img src=x'),'payload není bezpečně zobrazen jako text');
  return 'identity/e-mail/event jsou text';
});

check('T133-TV-T16-offline-csp',()=>{
  const csp=new JSDOM(html).window.document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content||'';
  must(/default-src 'none'/.test(csp)&&/connect-src 'none'/.test(csp),'generated verifier nemá offline CSP');
  must(!/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html),'generated verifier má externí script/style');
  return 'single-file CSP; bez CDN/fetch dependency';
});

check('T134-TV-T17-generated-verifier',()=>{
  must(/Teacher Verifier 2\.0/.test(html)&&typeof w.verifierSecuritySummary==='function','skutečně generovaný verifier neobsahuje S04 runtime');
  must(w.document.body.dataset.verifierTheme==='dark','generated verifier se neinicializoval');
  return `${Buffer.byteLength(html)} bytes generated output`;
});

check('T135-TV-T18-normal-practice-isolation',()=>{
  const s4=fs.readFileSync('src/js/13eh-secure-teacher-verifier-s4.js','utf8');
  must(!/testMode\s*=|screenGuard\s*=|lockOnLeave\s*=/.test(s4),'S04 modul mění režim/guard');
  return 'žádná nová studentská zamykací pravidla';
});

fs.mkdirSync('qa-results',{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
fs.writeFileSync('qa-results/s4-teacher-verifier-source.json',JSON.stringify({schema:'git-s4-teacher-verifier-source-v1',head,status:results.every(x=>x.status==='PASS')?'passed':'failed',passed:results.filter(x=>x.status==='PASS').length,total:results.length,results},null,2)+'\n');
dom.window.close();
if(process.exitCode)process.exit(process.exitCode);
console.log(`PASS Sprint 04 Teacher Verifier source gate ${results.length}/${results.length}`);
