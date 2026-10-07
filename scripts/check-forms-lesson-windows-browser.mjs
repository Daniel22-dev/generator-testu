// Browser regression for the Forms lesson workflow (synthetic data only, real generated HTML, clean verifier profile).
// Covers: export gate, 6-char code, prefill, justified reading, START/END markers, late/double START, manual override.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {enterStartCode,w,gdom,configure} from './redteam-harness-utils.mjs';
const FORM='https://docs.google.com/forms/d/e/SYNTHETIC-FORM-ID/viewform',PREFILL=FORM+'?usp=pp_url&entry.111=TESTID&entry.222=NAZEV&entry.333=TRIDA&entry.444=KOD';
const TEACHER='teacher@school.example',A='student.a@school.example',B='student.b@school.example';
const GEN={exercises:[{title:'MC',type:'multiple choice',points_total:5,points_each:1,items:[1,2,3,4,5].map(i=>({question:'Q'+i+'?',options:['A','B'],correct:i%2}))},
 {title:'Reading',type:'reading comprehension',points_total:4,points_each:1,passage:'Long ago, in a small seaside village, an old fisherman repaired his nets every morning while the children watched carefully and listened to his extraordinary stories about storms, whales and lighthouses.',items:[['Who repaired nets?',0],['Where?',1],['When?',0],['Who watched?',0]].map(([q,c])=>({question:q,options:['First','Second'],correct:c}))}]};
configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',pocet:2,typyCviceni:['multiple choice','reading comprehension'],body:9});
w.eval(`rosterEntries=[{code:'A7B9C2',label:'Student A',email:'${A}'},{code:'K4M8P2',label:'Student B',email:'${B}'}];`);
const setForms=meta=>w.eval(`state.__formsSubmissionUrl=${JSON.stringify(FORM)};state.__formsMetadata=${meta?`parseGoogleFormsPrefilledMetadataUrl(${JSON.stringify(PREFILL)})`:'null'};state.__formsAnchorProfile={teacherEmails:['${TEACHER}'],verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true,lessonMarkersConfirmed:true};`);
const checks=[];const ok=n=>{checks.push(n);console.log('PASS | '+n);};
let browser;
try{
  setForms(false);await assert.rejects(()=>w.assembleTestHtml(w.eval('state'),structuredClone(GEN)),/mapov/);ok('export blocked without Forms mapping');
  setForms(true);const pkg=await w.assembleTestHtml(w.eval('state'),structuredClone(GEN)),S=pkg.studentHtml,T=pkg.teacherHtml;
  for(const secret of [TEACHER,A,'A7B9C2'])assert.ok(!S.includes(secret),'student HTML leaks '+secret);ok('student HTML has no teacher e-mail, roster e-mail or code');
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});const errors=[];
  const sctx=await browser.newContext({viewport:{width:390,height:844}}),student=await sctx.newPage();student.on('pageerror',e=>errors.push(e.message));
  await student.route('http://127.0.0.1:18781/s.html',r=>r.fulfill({status:200,contentType:'text/html',body:S}));await student.goto('http://127.0.0.1:18781/s.html');
  for(const bad of [pkg.testId,'A1','A7B9C2X']){await student.locator('#studentName').fill(bad);await enterStartCode(student,pkg);await student.evaluate(()=>startTest());await student.waitForTimeout(250);assert.equal(await student.locator('#test').isVisible(),false,'accepted '+bad);await student.evaluate(()=>document.querySelectorAll('.s-modal-bd').forEach(x=>x.remove()));}
  ok('test ID / short / long codes rejected');
  await student.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await student.locator('#studentName').fill('a7b9c2');await enterStartCode(student,pkg);await student.evaluate(()=>startTest());await student.locator('#test').waitFor({state:'visible'});ok('lower-case valid code accepted');
  assert.equal(await student.locator('#done').isVisible(),false,'fresh start jumped directly to submitted/Forms screen');
  await student.waitForTimeout(80);assert.ok((await student.evaluate(()=>window.scrollY))<20,'fresh start did not reset scroll to the beginning of the test');
  const firstAnswer=student.locator('[data-qid]').first();if(await firstAnswer.count()){await firstAnswer.click({force:true});await student.waitForTimeout(50);assert.equal(await student.evaluate(()=>Object.keys(RESP).length),0,'start-transition click-through changed an answer');}
  const submitButton=student.locator('#secureSubmitCard button');assert.equal(await submitButton.isDisabled(),true,'submit must be briefly disarmed after the start transition');
  await submitButton.click({force:true});await student.waitForTimeout(100);assert.equal(await student.locator('#done').isVisible(),false,'start-transition click-through submitted the test');
  await student.waitForTimeout(1300);assert.equal(await submitButton.isDisabled(),false,'submit did not re-arm after the start transition');
  await submitButton.click();await student.locator('.s-modal-bd').waitFor({state:'visible'});assert.equal(await student.locator('#done').isVisible(),false,'manual submit bypassed explicit confirmation');
  await student.locator('[data-confirm-cancel]').click();assert.equal(await student.locator('#test').isVisible(),true,'cancelling submit confirmation left the active test');
  ok('fresh start cannot jump to Forms; scroll reset, click-through guard and explicit submit confirmation enforced');
  const reading=await student.evaluate(()=>[...document.querySelectorAll('.reading-passage')].map(e=>{const c=getComputedStyle(e);return {lang:e.getAttribute('lang'),align:c.textAlign,last:c.textAlignLast,hyph:c.hyphens,overflow:e.scrollWidth>e.clientWidth+1};}));
  assert.ok(reading.length&&reading.every(r=>r.lang==='en'&&r.align==='justify'&&r.last==='left'&&r.hyph==='auto'&&!r.overflow),JSON.stringify(reading));ok('reading passage justified, hyphenated, lang=en at 390 px');
  const startedAtMs=Date.now();
  await student.evaluate(()=>{for(let i=0;i<5;i++)setResp('0_'+i,i%2);for(let i=0;i<4;i++)setResp('1_'+i,0);});
  await student.evaluate(()=>submitSecureTest());await student.locator('#done').waitFor({state:'visible'});const txt=await student.locator('#answerBackup').inputValue();
  const formsUrl=new URL(await student.evaluate(()=>formsOpenUrl()));assert.equal(formsUrl.searchParams.get('entry.111'),pkg.testId);assert.ok(formsUrl.searchParams.get('entry.222'));assert.ok(formsUrl.searchParams.get('entry.333'));assert.equal(formsUrl.searchParams.get('entry.444'),null);ok('student Forms link prefilled with test ID, name, class only');
  await student.reload();await student.locator('#studentName').fill('K4M8P2');await enterStartCode(student,pkg);await student.evaluate(()=>startTest());await student.waitForTimeout(250);
  assert.equal(await student.locator('#done').isVisible(),false,'foreign identity saw completed submission screen');
  assert.equal(await student.locator('#test').isVisible(),false,'foreign identity started a new attempt over completed outbox');
  const conflictText=await student.locator('.s-modal-bd').innerText();assert.match(conflictText,/another student|jiného studenta/i);
  assert.equal(await student.locator('#answerBackup').inputValue(),'','foreign identity received previous encrypted payload');
  ok('shared profile: completed outbox is not exposed to a different student code');
  await student.evaluate(()=>document.querySelectorAll('.s-modal-bd').forEach(x=>x.remove()));
  await student.reload();await student.locator('#studentName').fill('A7B9C2');await enterStartCode(student,pkg);await student.evaluate(()=>startTest());await student.locator('#done').waitFor({state:'visible'});
  assert.equal(await student.locator('#answerBackup').inputValue(),txt,'same student could not recover its completed outbox');
  ok('same student can recover its own encrypted outbox after reload');
  await sctx.close();
  const startMarker=new URL(T.match(/https:\/\/docs\.google\.com\/forms[^"']*/)[0].replace(/&amp;/g,'&')).searchParams.get('entry.444');assert.match(startMarker,/^GIT-LESSON-START-V1\n/);ok('verifier START link carries marker');
  const HDR=['Timestamp','Username','Total score','Secure výsledek z testu ','  Test ID  ','  Název testu  ','Skupina'];
  const g=ms=>{const d=new Date(ms+3*3600000),h=d.getUTCHours(),p=n=>String(n).padStart(2,'0');return `${d.getUTCFullYear()}/${p(d.getUTCMonth()+1)}/${p(d.getUTCDate())} ${h%12||12}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} ${h<12?'am':'pm'} EEST`;};
  const q=s=>'"'+String(s).replaceAll('"','""')+'"',row=(ms,email,value,tid=pkg.testId)=>[g(ms),email,'0.00 / 0',value,tid,'ADV test','1.A'].map(q).join(',');
  const END=startMarker.replace('START','END'),now=Date.now(),min=60000;
  const P=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Prague',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(startedAtMs-5*min)).reduce((a,p)=>(a[p.type]=p.value,a),{});
  const manual={publishedDate:`${P.year}-${P.month}-${P.day}`,publishedTime:`${P.hour}:${P.minute}`};
  async function verify(rows,manualWindow){const ctx=await browser.newContext(),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://127.0.0.1:18781/v.html',r=>r.fulfill({status:200,contentType:'text/html',body:T}));await page.goto('http://127.0.0.1:18781/v.html');
    const r=await page.evaluate(async([csv,m])=>{const s=await importFormsCsvText(csv,'forms.csv');if(m)await setFormsAnchorPolicy(m);return {wait:!!s.waitingForWindow,rows:RESULTS.map(x=>({st:x.status,codes:x.validationCodes,notes:x.anchorNotes||[],meta:x.metadataMismatch||[]})),notices:FORMS_LESSON_NOTICES.slice()};},[HDR.map(q).join(',')+'\n'+rows.join('\n'),manualWindow||null]);await ctx.close();return r;}
  let r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(startedAtMs-60*min,B,startMarker),row(now+min,A,txt,pkg.testId.replace('-',''))]);
  assert.deepEqual(r.rows.map(x=>x.st),['OK']);assert.deepEqual(r.rows[0].meta,[]);assert.equal(r.notices.length,1);ok('clean profile: teacher START from CSV, EEST time, ID without hyphen, forged START ignored');
  r=await verify([row(startedAtMs+min,TEACHER,startMarker),row(now+2*min,A,txt)]);assert.equal(r.rows[0].st,'OK');assert.equal(r.rows[0].notes.length,1);ok('START sent 1 min late: OK with note');
  r=await verify([row(now+5*min,TEACHER,startMarker),row(now+2*min,A,txt)]);assert.ok(r.rows[0].codes.includes('anchors.timestamp'));ok('submission before trusted START: rejected');
  r=await verify([row(startedAtMs+11*min,TEACHER,startMarker),row(now+12*min,A,txt)]);assert.ok(r.rows[0].codes.includes('anchors.time-window'));ok('START 11 min late: rejected');
  r=await verify([row(startedAtMs+11*min,TEACHER,startMarker),row(now+2*min,A,txt)],manual);assert.equal(r.rows[0].st,'OK');ok('late START corrected by manual window');
  r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(startedAtMs+30000,TEACHER,startMarker),row(now+min,A,txt)]);assert.equal(r.rows[0].st,'OK');assert.deepEqual(r.rows[0].notes,[]);ok('repeated START keeps the earlier window');
  r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(startedAtMs-min,TEACHER,END),row(now+min,A,txt)]);assert.ok(r.rows[0].codes.includes('anchors.after-deadline'));ok('early END closes reception');
  r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(startedAtMs-min,TEACHER,END),row(now+min,A,txt)],manual);assert.equal(r.rows[0].st,'OK');ok('early END corrected by manual window');
  r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(startedAtMs-2*min,B,END),row(now+min,A,txt)]);assert.equal(r.rows[0].st,'OK');ok('student END marker ignored');
  r=await verify([row(startedAtMs-3*min,TEACHER,startMarker),row(now+min,B,txt)]);assert.ok(r.rows[0].codes.includes('anchors.identity-mismatch'));ok('wrong Forms account rejected');
  r=await verify([row(now+min,A,txt)]);assert.equal(r.wait,true);ok('CSV without marker asks for lesson time');
  assert.deepEqual(errors,[]);console.log('SUMMARY: '+checks.length+' passed. Synthetic browser regression; real Google Forms and physical devices are separate.');
}finally{await browser?.close();gdom.window.close();}
