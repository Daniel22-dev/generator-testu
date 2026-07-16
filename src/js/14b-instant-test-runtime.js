// ─── Embedded test JS (returned as string, runs inside generated test) ─────────

function getTestScript() {
  return String.raw`
var ANSWERS={},EX_SUBMITTED={},started=false,submitted=false,locked=false,teacherLogged=false;
var timerVal=CFG.cas*60,timerInterval=null,timerDeadline=0,warningCount=0;
var A11Y=null;
function applyA11yInstant(key){
  A11Y=null;var b=document.body;if(b)b.classList.remove('a11y-large','a11y-xlarge','a11y-dys');
  var groups=CFG.diffGroups||[];var gg=null;for(var i=0;i<groups.length;i++){if(groups[i].key===key){gg=groups[i];break;}}
  if(!gg||!gg.a11y)return;
  var a=gg.a11y;var mult=({'125':1.25,'150':1.5,'200':2})[a.time]||1;
  A11Y={timeMult:mult,noLimit:a.time==='none',font:a.font||'normal',dys:!!a.dys};
  if(b){if(a.font==='large')b.classList.add('a11y-large');if(a.font==='xlarge')b.classList.add('a11y-xlarge');if(a.dys)b.classList.add('a11y-dys');}
  var bar=I('a11yNote');
  if(bar){var parts=[];if(mult>1)parts.push('prodloužený čas ('+(mult===2?'2\u00d7':'+'+Math.round((mult-1)*100)+' %')+')');if(A11Y.noLimit)parts.push('bez časového limitu');if(a.font==='large')parts.push('větší písmo');if(a.font==='xlarge')parts.push('největší písmo');if(a.dys)parts.push('dyslexie-friendly');if(parts.length){bar.textContent='♿ Aktivní úpravy: '+parts.join(', ');bar.classList.remove('hidden');}}
}
var jokerUsed=false,jokerMode=false,jokerStartChoice=null,jokerSelectedAt='';
var generatedTxt='';

function I(id){return document.getElementById(id);}
function T(k){return LABELS[k]||k;}
function show(id){var e=I(id);if(e)e.classList.remove('hidden');}
function hide(id){var e=I(id);if(e)e.classList.add('hidden');}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function showMessage(title,body){I('messageTitle').textContent=title||'';I('messageBody').textContent=body||'';show('messageModal');}
function closeModal(mid){hide(mid);}

function normNameForGroup(s){var raw=String(s||'');try{raw=raw.normalize('NFKD');}catch(_){}return raw.toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function b64UrlRoster(buf){var bin='',bytes=new Uint8Array(buf);for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function hashRosterIdentity(name){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))throw new Error('Tento diferencovaný test vyžaduje moderní prohlížeč s WebCrypto.');var input='GIT-DIFF-ROSTER-V1|'+String(CFG.diffRosterSalt||'')+'|'+normNameForGroup(name);var dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return b64UrlRoster(dig);}
async function hashIdentityCodeClient(name){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))throw new Error('Ověření jednorázového kódu vyžaduje moderní prohlížeč s WebCrypto.');var input='GIT-IDENTITY-CODE-V1|'+String(CFG.diffRosterSalt||'')+'|'+normNameForGroup(name);var dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return b64UrlRoster(dig);}
async function identityAllowed(name){if((CFG.identityMode||'name')!=='oneTimeCode')return true;var hashes=CFG.identityCodeHashes||[];if(!hashes.length)return false;return hashes.indexOf(await hashIdentityCodeClient(name))!==-1;}
async function resolveStudentGroup(name){var groups=CFG.diffGroups||[];if(!groups.length)return null;var h=await hashRosterIdentity(name);for(var i=0;i<groups.length;i++){var hashes=groups[i].studentHashes||[];if(hashes.indexOf(h)!==-1)return groups[i];}return null;}
function enterFullscreen(){var el=document.documentElement;try{if(el.requestFullscreen)el.requestFullscreen();else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();}catch(_){} }
function variantKeyForGroup(g){return g&&g.key&&VARIANTS[g.key]?g.key:'__default';}
function variantByGroupNameOrKey(name,key){if(key&&VARIANTS[key])return VARIANTS[key];var n=normNameForGroup(name);var groups=CFG.diffGroups||[];for(var i=0;i<groups.length;i++){if(normNameForGroup(groups[i].name)===n&&VARIANTS[groups[i].key])return VARIANTS[groups[i].key];}return VARIANTS.__default||[];}
function activateVariant(key){
  key=VARIANTS[key]?key:'__default';
  CFG.activeVariantKey=key;
  EXS=VARIANTS[key]||VARIANTS.__default||[];
  ANSWERS={};EX_SUBMITTED={};jokerMode=false;
  var html=VARIANT_HTMLS[key]||VARIANT_HTMLS.__default||{};
  var area=I('exArea');if(area)area.innerHTML=html.body||'';
  var nav=I('tabsNav');if(nav)nav.innerHTML=html.tabs||'';
  var sum=variantSummaryClient(EXS);CFG.totalBody=sum.totalBody;CFG.totalQ=sum.totalQ;CFG.exCount=sum.exCount;
  var progress=I('progressDisplay');if(progress)progress.textContent='0/'+sum.totalQ;
  var pts=I('resultPts');if(pts)pts.innerHTML='0/'+fmtPtsClient(sum.totalBody)+'&nbsp;b';
}
function variantSummaryClient(exs){var tb=0,tq=0;(exs||[]).forEach(function(ex){tb+=Number(ex.points_total)||0;tq+=(ex.items||[]).length;});return{totalBody:Math.round(tb*100)/100,totalQ:tq,exCount:(exs||[]).length};}
function seedHash(str){var h=2166136261;str=String(str||'');for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seed){var x=seed>>>0;return function(){x+=0x6D2B79F5;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffleNodes(parent, selector, seed){if(!parent)return;var nodes=[].slice.call(parent.querySelectorAll(':scope > '+selector));if(nodes.length<2)return;var rnd=seededRandom(seed);for(var i=nodes.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=nodes[i];nodes[i]=nodes[j];nodes[j]=tmp;}nodes.forEach(function(n){parent.appendChild(n);});}
function shuffleOptionChildren(container, seed){if(!container)return;var nodes=[].slice.call(container.children);if(nodes.length<2)return;var rnd=seededRandom(seed);for(var i=nodes.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=nodes[i];nodes[i]=nodes[j];nodes[j]=tmp;}nodes.forEach(function(n,idx){var l=n.querySelector('.opt-ltr');if(l)l.textContent=String.fromCharCode(65+idx);container.appendChild(n);});}
function shuffleSelectOptions(sel, seed){if(!sel)return;var first=sel.querySelector('option[value=""]');var opts=[].slice.call(sel.querySelectorAll('option')).filter(function(o){return o!==first;});if(opts.length<2)return;var rnd=seededRandom(seed);for(var i=opts.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=opts[i];opts[i]=opts[j];opts[j]=tmp;}if(first)sel.appendChild(first);opts.forEach(function(o){sel.appendChild(o);});}
function applyRuntimeRandomization(){
  if(!CFG.randomizace)return;
  var base=seedHash([CFG.testId,CFG.studentName,CFG.activeGroupKey,attemptId].join('|'));
  document.querySelectorAll('.q-list').forEach(function(list,ei){
    shuffleNodes(list,'.question',base+ei*101);
    var match=list.querySelector('.match-grid');if(match)shuffleNodes(match,'.match-row',base+ei*211);
  });
  document.querySelectorAll('.mc-opts').forEach(function(box,i){shuffleOptionChildren(box,base+i*307);});
  document.querySelectorAll('select.match-sel').forEach(function(sel,i){shuffleSelectOptions(sel,base+i*401);});
}
function fmtPtsClient(n){n=Number(n)||0;return Number.isInteger(n)?String(n):String(Math.round(n*100)/100).replace('.',',');}
function chooseJokerStart(use){jokerStartChoice=!!use;var no=I('jokerChoiceNo'),yes=I('jokerChoiceYes');if(no)no.classList.toggle('selected',!use);if(yes)yes.classList.toggle('selected',!!use);var box=I('jokerChoiceConfirm');if(box){box.style.display='block';box.textContent=use?'✅ Zvoleno: BERU SI ŽOLÍKA — test psát nebudeš.':'✅ Zvoleno: DĚLÁM TEST.';box.className='joker-choice-confirm '+(use?'joker-choice-confirm-risk':'joker-choice-confirm-ok');}}
function jokerWatermarkText(){return T('jokerReport')+' · '+(CFG.studentName||'—')+' · '+CFG.testId+' · '+attemptId;}
function updateJokerWatermark(){var wm=I('jokerWatermark');if(wm){wm.textContent=jokerWatermarkText();wm.classList.toggle('hidden',!jokerUsed);}var rb=I('jokerResultBox');if(rb){rb.textContent='🃏 '+jokerWatermarkText();rb.classList.toggle('hidden',!jokerUsed);}document.body.classList.toggle('joker-mode',!!jokerUsed);}
async function startTest(){
  var n=(I('studentName').value||'').trim();
  if(!n){showMessage(T('name'),T('enterName'));I('studentName').focus();return;}
  if(CFG.zolicek && jokerStartChoice===null){showMessage(T('jokerChoiceTitle'),T('jokerChoiceHint'));return;}
  jokerUsed=!!jokerStartChoice;
  jokerSelectedAt=jokerUsed?new Date().toISOString():'';
  try{if(!(await identityAllowed(n))){showMessage(T('name'),'Zadaný jednorázový kód není platný pro tento test. Zkontroluj přesný kód od učitele.');I('studentName').focus();return;}}catch(err){showMessage('Ověření kódu',String(err&&err.message?err.message:err));return;}
  var g=null;
  try{g=await resolveStudentGroup(n);}catch(err){showMessage('Diferencovaný test',String(err&&err.message?err.message:err));return;}
  if((CFG.diffGroups||[]).length&&!g){showMessage('Diferencovaný test','Zadané jméno/kód není v žádné skupině. Zkontroluj přesný zápis podle pokynů učitele.');I('studentName').focus();return;}
  CFG.studentName=n;CFG.activeGroupKey=g?g.key:'';CFG.activeGroupName=g?g.name:'';
  activateVariant(variantKeyForGroup(g));
  applyA11yInstant(CFG.activeGroupKey);
  var baseSeconds=Math.max(1,Number(CFG.cas)||45)*60;
  timerVal=A11Y&&A11Y.noLimit?Infinity:(A11Y&&A11Y.timeMult>1?Math.round(baseSeconds*A11Y.timeMult):baseSeconds);
  applyRuntimeRandomization();
  hide('introScreen');show('testScreen');updateJokerWatermark();
  if(CFG.activeGroupKey){var note=(CFG.groupNotes||{})[CFG.activeGroupKey]||g.conditions||'';var hdr=document.querySelector('.t-header-title');if(hdr&&!document.querySelector('.group-pill')){hdr.insertAdjacentHTML('afterend','<span class="group-pill">'+esc(CFG.activeGroupName)+'</span>');}if(note){var area=I('exArea');if(area)area.insertAdjacentHTML('afterbegin','<div class="group-warning">'+esc(note)+'</div>');}}
  started=true;
  startTimer();
  if(CFG.lockOnLeave||CFG.testMode==='prisny'||CFG.testMode==='bezny') setupLockDetection();
  var first=document.querySelector('.mc-opt,.he-sent,.et-token,.et-type,.et-corr,.fib-inp,.tf-btn,.match-sel,.err-inp,.open-inp,.tc-inp,.trch-inp');
  if(first)setTimeout(function(){first.focus();},120);
}

function refreshInstantTimer(){
  if(submitted)return false;
  if(timerVal===Infinity){renderTimer();return true;}
  timerVal=Math.max(0,Math.ceil((timerDeadline-Date.now())/1000));
  renderTimer();
  if(timerVal<=0){clearInterval(timerInterval);doSubmit();return false;}
  return true;
}
function startTimer(){
  clearInterval(timerInterval);
  timerDeadline=timerVal===Infinity?0:(Date.now()+timerVal*1000);
  refreshInstantTimer();
  timerInterval=setInterval(refreshInstantTimer,1000);
}
function renderTimer(){
  var el=I('timerDisplay');if(!el)return;
  if(timerVal===Infinity){el.textContent='∞';el.className='timer-badge';return;}
  var m=Math.floor(timerVal/60).toString().padStart(2,'0');
  var s=(timerVal%60).toString().padStart(2,'0');
  el.textContent=m+':'+s;
  el.className='timer-badge'+(timerVal<60?' t-danger':timerVal<300?' t-warn':'');
}

function switchTab(ei){
  if(CFG.layout==='scroll')return;
  document.querySelectorAll('.ex-panel').forEach(function(p,i){p.classList.toggle('hidden',i!==ei);});
  document.querySelectorAll('.tab-btn').forEach(function(b,i){b.classList.toggle('tab-active',i===ei);});
  window.scrollTo({top:0,behavior:'smooth'});
}
function qEi(qid){return parseInt(String(qid).split('_')[0],10);}
function isLockedQid(qid){var ei=qEi(qid);return submitted || (CFG.odevzdavani==='A' && EX_SUBMITTED[ei]);}
function markSelected(qid,val,cls){document.querySelectorAll('.'+cls+'[data-qid="'+qid+'"]').forEach(function(b){b.classList.toggle(cls==='mc-opt'?'mc-sel':'tf-sel',String(b.dataset.val)===String(val));});}

function selectChoice(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'choice',val:val};markSelected(qid,val,'mc-opt');updateProgress();markTabDone(qid);}
function selectEvidence(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'evidence',val:val};markSelected(qid,val,'mc-opt');updateProgress();markTabDone(qid);}
function getErrorTagAns(qid){var a=ANSWERS[qid];return (a&&a.type==='error-tagging')?{token:a.token,etype:a.etype||'',corr:a.corr||''}:{token:null,etype:'',corr:''};}
function setErrorTagToken(qid,idx){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.token=idx;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};document.querySelectorAll('.et-token[data-qid="'+qid+'"]').forEach(function(b){b.classList.toggle('mc-sel',String(b.getAttribute('data-val'))===String(idx));});updateProgress();markTabDone(qid);}
function setErrorTagType(qid,val){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.etype=val;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};updateProgress();markTabDone(qid);}
function setErrorTagCorrection(qid,val){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.corr=val;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};updateProgress();markTabDone(qid);}
function updateFib(qid){if(isLockedQid(qid))return;var inputs=[].slice.call(document.querySelectorAll('.fib-inp[data-qid="'+qid+'"]'));ANSWERS[qid]={type:'fib',vals:inputs.map(function(i){return i.value.trim();})};updateProgress();markTabDone(qid);}
function updateCloze(qid){if(isLockedQid(qid))return;var inputs=[].slice.call(document.querySelectorAll('.fib-inp[data-qid="'+qid+'"]'));ANSWERS[qid]={type:'cloze',vals:inputs.map(function(i){return i.value.trim();})};updateProgress();markTabDone(qid);}
function selectTF(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'tf',val:val};markSelected(qid,String(val),'tf-btn');updateProgress();markTabDone(qid);}
function updateMatch(ei,li,val){if(submitted || (CFG.odevzdavani==='A'&&EX_SUBMITTED[ei]))return;var key='match_'+ei;if(!ANSWERS[key])ANSWERS[key]={type:'match',pairs:{}};if(val!=='')ANSWERS[key].pairs[li]=parseInt(val,10);else delete ANSWERS[key].pairs[li];updateProgress();markTabDone(ei+'_match');}
function updateText(qid,val,kind){if(isLockedQid(qid))return;ANSWERS[qid]={type:kind||'text',val:val};updateProgress();markTabDone(qid);}
function toggleMulti(qid,idx){if(isLockedQid(qid))return;var cur=(ANSWERS[qid]&&ANSWERS[qid].type==='multi'&&Array.isArray(ANSWERS[qid].vals))?ANSWERS[qid].vals.slice():[];var p=cur.indexOf(idx);if(p>=0)cur.splice(p,1);else cur.push(idx);cur.sort(function(a,b){return a-b;});ANSWERS[qid]={type:'multi',vals:cur};document.querySelectorAll('.mc-opt[data-qid="'+qid+'"]').forEach(function(b){var v=parseInt(b.dataset.val,10);b.classList.toggle('mc-sel',cur.indexOf(v)>=0);});updateProgress();markTabDone(qid);}
function ordTexts(qid){var p=qid.split('_');var it=((EXS[+p[0]]||{}).items||[])[+p[1]]||{};return Array.isArray(it.items)?it.items:[];}
function ordCurOrder(qid){var texts=ordTexts(qid);var a=ANSWERS[qid];return (a&&a.type==='order'&&Array.isArray(a.seq)&&a.seq.length===texts.length)?a.seq.slice():texts.map(function(_,i){return i;});}
function ordBadgeHtmlInst(qid,texts,picks){
  var pickOf={};
  picks.forEach(function(origIdx,pos){ pickOf[Number(origIdx)]=pos+1; });
  return texts.map(function(txt,origIdx){
    var pos=pickOf[origIdx]||0;
    var picked=pos>0;
    return '<div class="ord-row'+(picked?' ord-picked':'')+'" onclick="clickOrdInst(\''+qid+'\','+origIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')clickOrdInst(\''+qid+'\','+origIdx+')">'+
      '<div class="ord-badge">'+(picked?String(pos):'')+'</div>'+
      '<span class="ord-txt">'+H(txt!=null?txt:'')+'</span>'+
    '</div>';
  }).join('');
}
function renderOrdList(qid){var el=document.getElementById('ordlist_'+qid);if(el){var texts=ordTexts(qid);var picks=Array.isArray(ANSWERS[qid]&&ANSWERS[qid].seq)?ANSWERS[qid].seq:[];el.innerHTML=ordBadgeHtmlInst(qid,texts,picks);}}
function clickOrdInst(qid,origIdx){if(isLockedQid(qid))return;var texts=ordTexts(qid);var n=texts.length;var cur=ANSWERS[qid]&&Array.isArray(ANSWERS[qid].seq)?ANSWERS[qid].seq.slice():[];var at=cur.indexOf(origIdx);if(at>=0){cur.splice(at,1);}else if(cur.length<n){cur.push(origIdx);}ANSWERS[qid]={type:'order',seq:cur};renderOrdList(qid);updateProgress();markTabDone(qid);}
function clickOrdBuild(qid,origIdx){clickOrdInst(qid,origIdx);}
function setBoard(qid,idx,val){if(isLockedQid(qid))return;var a=(ANSWERS[qid]&&ANSWERS[qid].type==='board'&&Array.isArray(ANSWERS[qid].sel))?ANSWERS[qid].sel.slice():[];a[idx]=val;ANSWERS[qid]={type:'board',sel:a};updateProgress();markTabDone(qid);}
function setTable(qid,r,c,val){if(isLockedQid(qid))return;var g=(ANSWERS[qid]&&ANSWERS[qid].type==='table'&&Array.isArray(ANSWERS[qid].grid))?ANSWERS[qid].grid.map(function(row){return Array.isArray(row)?row.slice():[];}):[];if(!Array.isArray(g[r]))g[r]=[];g[r][c]=val;ANSWERS[qid]={type:'table',grid:g};updateProgress();markTabDone(qid);}
function setChain(qid,idx,val){if(isLockedQid(qid))return;var vals=(ANSWERS[qid]&&ANSWERS[qid].type==='chain'&&Array.isArray(ANSWERS[qid].vals))?ANSWERS[qid].vals.slice():[];vals[idx]=val;ANSWERS[qid]={type:'chain',vals:vals};updateProgress();markTabDone(qid);}
function updateCategory(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'categorization',val:val};updateProgress();markTabDone(qid);}

function countAnswered(){
  var n=0;
  EXS.forEach(function(ex,ei){
    if(ex.type==='matching'){var p=(ANSWERS['match_'+ei]||{}).pairs||{};n+=Object.keys(p).length;}
    else(ex.items||[]).forEach(function(_,qi){var ans=ANSWERS[ei+'_'+qi];if(ans){if(ans.val!==''&&ans.val!=null)n++;else if(ans.vals&&ans.vals.some(function(v){return v!=='';}))n++;else if(ans.grid&&ans.grid.some(function(row){return Array.isArray(row)&&row.some(function(v){return v!==''&&v!=null;});}))n++;else if(ans.type==='error-tagging'&&ans.token!=null&&String(ans.etype||'').trim()&&String(ans.corr||'').trim())n++;}});
  });
  return n;
}
function countTotal(){return EXS.reduce(function(s,ex){return s+(ex.items||[]).length;},0);}
function updateProgress(){var el=I('progressDisplay');if(el)el.textContent=countAnswered()+'/'+countTotal();}
function markTabDone(qid){
  var ei=parseInt(String(qid).split('_')[0],10);
  if(isNaN(ei))return;
  var ex=EXS[ei];if(!ex)return;
  var done=true;
  if(ex.type==='matching'){var p=(ANSWERS['match_'+ei]||{}).pairs||{};done=Object.keys(p).length>=(ex.items||[]).length;}
  else(ex.items||[]).forEach(function(_,qi){if(!ANSWERS[ei+'_'+qi])done=false;});
  if(CFG.odevzdavani==='A')done=!!EX_SUBMITTED[ei];
  var b=I('tabDone'+ei);if(b)b.classList.toggle('hidden',!done);
}


function submitExercise(ei){
  if(submitted||EX_SUBMITTED[ei])return;
  EX_SUBMITTED[ei]=true;
  var panel=I('exPanel'+ei);if(panel)panel.classList.add('ex-submitted');
  var btn=I('btnSubmitEx'+ei);if(btn){btn.disabled=true;btn.textContent=T('submittedExercise');}
  var sc=calcExerciseScore(ei);
  var fb=I('exFeedback'+ei);
  if(fb){fb.innerHTML='<strong>'+T('exerciseScore')+':</strong> '+sc.earned+'/'+sc.total+' b ('+sc.pct+' %)'+exerciseFeedbackHtml(ei);fb.classList.remove('hidden');}
  markTabDone(ei+'_submitted');
  updateProgress();
  if(allExercisesSubmitted()){var f=I('btnFinalSubmit');if(f)f.classList.add('ready');}
}
function allExercisesSubmitted(){for(var i=0;i<EXS.length;i++)if(!EX_SUBMITTED[i])return false;return true;}
function finishVariantA(){if(!allExercisesSubmitted()){showMessage(T('submitTest'),T('notAllSubmitted'));return;}doSubmit();}
function confirmSubmit(){
  if(submitted)return;
  if(CFG.odevzdavani==='A'){finishVariantA();return;}
  var ans=countAnswered(),tot=countTotal(),un=tot-ans;
  var msg=T('answered')+': '+ans+' / '+tot+'.';
  if(un>0)msg+=' <strong>'+un+' '+T('unansweredZero')+'</strong>';
  I('submitBody').innerHTML=msg;show('submitModal');
}
function doSubmit(){
  if(submitted)return;
  submitted=true;hide('submitModal');clearInterval(timerInterval);teardownLockDetection();
  var res=calcScore();showResult(res);
}

function __isSpanish(){return !!(typeof CFG!=='undefined'&&CFG&&CFG.isSpanish);}
function __isCzech(){return !!(typeof CFG!=='undefined'&&CFG&&CFG.isCzech);}
function __csScoringPolicy(){return (typeof CFG!=='undefined'&&CFG&&CFG.csScoringPolicy)||{};}
function __fuzzyMode(){return (typeof CFG!=='undefined'&&CFG&&CFG.fuzzyTolerance)||'off';}
`+SHARED_SCORING_JS+String.raw`
var pointFor=itemPoint; // alias: instant kód historicky volá pointFor; itemPoint je z SHARED_SCORING_JS
function scoreItem(ex,item,ans,pts){
  if(!ans)return 0;
  if(ex.type==='multiple choice'||ex.type==='reading comprehension'||ex.type==='listening comprehension')return ans.val===correctIndex(item)?pts:0;
  if(ex.type==='dialogue completion'){
    if(Array.isArray(item.options))return ans.val===correctIndex(item)?pts:0;
    return pts*textScore(ans.val,item.answer||item.model_answer,item.alt_answers,ex.type);
  }
  if(ex.type==='true/false')return ans.val===!!item.correct?pts:0;
  if(ex.type==='fill-in-the-blank'){var fk=Array.isArray(item.answers)?item.answers:[item.answer];var fv=Array.isArray(ans.vals)?ans.vals:(ans.val!=null?[ans.val]:[]);return scoreBlanks(fk,fv,item.alt_answers,pts,ex.type,true);}
  if(ex.type==='error correction')return pts*textScore(ans.val,item.correction,item.alt_answers,ex.type);
  if(ex.type==='word order')return pts*textScore(ans.val,item.correct_sentence||item.answer,item.alt_answers,ex.type);
  if(ex.type==='translation')return pts*textScore(ans.val,item.answer||item.translation,item.alt_answers,ex.type);
  if(ex.type==='sentence transformation')return pts*textScore(ans.val,item.answer,item.alt_answers,ex.type);
  if(ex.type==='word formation')return pts*textScore(ans.val,item.answer,item.alt_answers,ex.type);
  if(ex.type==='categorization')return norm(ans.val)===norm(item.correct_category||item.category||item.answer)?pts:0;
  if(ex.type==='cloze text'){var ck=Array.isArray(item.answers)?item.answers:[item.answer];var cv=Array.isArray(ans.vals)?ans.vals:(ans.val!=null?[ans.val]:[]);return scoreBlanks(ck,cv,item.alt_answers,pts,ex.type,false);}
  if(ex.type==='multi-select')return multiSelectScore(ans&&ans.vals,item.correct,pts);
  if(ex.type==='ordering')return orderingScore(ans&&ans.seq,item.correct_order,pts);
  if(ex.type==='highlight-evidence')return highlightEvidenceScore(ans&&ans.val,item.correct,pts);
  if(ex.type==='error-tagging')return errorTaggingScore(ans,item,pts,ex.type);
  if(ex.type==='table-completion')return tableCompletionScore(ans&&ans.grid,item.rows,pts,ex.type);
  if(ex.type==='transformation-chain')return transformationChainScore(ans&&ans.vals,item.transformations,pts,ex.type);
  if(ex.type==='categorisation-board')return categoryBoardScore(ans&&ans.sel,item.entries,pts);
  return 0;
}

function csItemFeedbackData(item){
  if(!CFG.isCzech||!item)return null;
  var fb=(item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:{};
  var phenomenon=fb.phenomenon||item.phenomenon||'';
  var rule=fb.rule||item.rule||'';
  var whyCorrect=fb.whyCorrect||fb.why||item.feedback||item.explanation||item.model_answer||'';
  var whyIncorrect=fb.whyIncorrect||fb.whyWrong||'';
  var reviewTip=fb.reviewTip||item.reviewTip||'';
  var focus=fb.errorFocus||item.errorFocus||'';
  if(!phenomenon&&!rule&&!whyCorrect&&!whyIncorrect&&!reviewTip&&!focus)return null;
  return {phenomenon:phenomenon,rule:rule,whyCorrect:whyCorrect,whyIncorrect:whyIncorrect,reviewTip:reviewTip,errorFocus:focus};
}
function csItemFeedbackHtml(item,good,showCorrect){
  var fb=csItemFeedbackData(item); if(!fb)return '';
  var why=good?(fb.whyCorrect||'Odpověď odpovídá uvedenému pravidlu.'):(fb.whyIncorrect||fb.whyCorrect||'Zkontroluj pravidlo a sledovaný jazykový jev.');
  var rows=[];
  if(fb.phenomenon)rows.push('<div><b>Jev:</b> '+esc(fb.phenomenon)+'</div>');
  if(fb.rule)rows.push('<div><b>Pravidlo:</b> '+esc(fb.rule)+'</div>');
  if(why)rows.push('<div><b>'+(good?'Proč je to správně:':'Proč je odpověď problematická:')+'</b> '+esc(why)+'</div>');
  if(fb.reviewTip)rows.push('<div><b>Co zopakovat:</b> '+esc(fb.reviewTip)+'</div>');
  if(fb.errorFocus)rows.push('<div><b>Typ chyby:</b> '+esc(fb.errorFocus)+'</div>');
  return rows.length?'<div class="cs-fb '+(good?'cs-fb-ok':'cs-fb-bad')+'">'+rows.join('')+'</div>':'';
}
function itemFeedbackStatusHtml(ex,item,ans,pts){
  if((CFG.feedbackMode||'brief')==='none')return '';
  var raw=scoreItem(ex,item,ans,pts);
  var got=Math.round(raw*100)/100;
  var good=got>=pts-1e-9;
  var html='<div class="ap-feedback '+(good?'ap-ok':'ap-bad')+'"><b>'+(good?'✓ Správně':'✕ Chyba')+'</b> <span class="small">('+got+'/'+pts+' b)</span></div>';
  if((CFG.feedbackMode||'brief')==='learning')html+=csItemFeedbackHtml(item,good,true)||(item.explanation?'<div class="small"><b>Vysvětlení:</b> '+esc(item.explanation)+'</div>':'');
  return html;
}
function exerciseFeedbackHtml(ei){
  if((CFG.feedbackMode||'brief')==='none')return '';
  var ex=EXS[ei]; if(!ex||ex.type==='matching')return '';
  var h='<div class="ex-feedback-list">';
  (ex.items||[]).forEach(function(item,qi){var qid=ei+'_'+qi,ans=ANSWERS[qid],pts=pointFor(ex,qi);h+='<div class="ex-feedback-item"><b>Otázka '+(qi+1)+':</b> '+itemFeedbackStatusHtml(ex,item,ans,pts)+'</div>';});
  h+='</div>'; return h;
}

function calcExerciseScore(ei){
  var ex=EXS[ei],earned=0,total=0;
  if(ex.type==='matching'){
    var pairs=(ANSWERS['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(_,li){var pts=pointFor(ex,li);total+=pts;if(pairs[li]!==undefined&&parseInt(pairs[li],10)===li)earned+=pts;});
  } else {
    (ex.items||[]).forEach(function(item,qi){var pts=pointFor(ex,qi);total+=pts;earned+=Math.round(scoreItem(ex,item,ANSWERS[ei+'_'+qi],pts)*100)/100;});
  }
  var pct=total>0?Math.round(earned/total*100):0;
  return{earned:Math.round(earned*100)/100,total:total,pct:pct,title:ex.title||ex.type};
}
function calcScore(){
  var earned=0,total=0,breakdown=[];
  EXS.forEach(function(ex,ei){var sc=calcExerciseScore(ei);earned+=sc.earned;total+=sc.total;breakdown.push({title:sc.title,earned:sc.earned,total:sc.total});});
  var pct=total>0?Math.round(earned/total*100):0;
  return{earned:Math.round(earned*100)/100,total:Math.round(total*100)/100,pct:pct,grade:getGrade(pct),breakdown:breakdown};
}
var GRADE_SKOLA=[{min:88,g:'1'},{min:74,g:'2'},{min:59,g:'3'},{min:44,g:'4'},{min:0,g:'5'}];
function getGrade(pct){
  pct=Math.round(Number(pct)||0);
  if(CFG.gradeTyp==='vlastni'){
    if(!(Array.isArray(CFG.gradeScale)&&CFG.gradeScale.length))return T('customGrade');
    for(var i=0;i<CFG.gradeScale.length;i++){var x=CFG.gradeScale[i];if(pct>=x.min&&pct<=x.max)return x.g;}
    return '?';
  }
  for(var j=0;j<GRADE_SKOLA.length;j++)if(pct>=GRADE_SKOLA[j].min)return GRADE_SKOLA[j].g;
  return '5';
}

function showResult(res){
  hide('testScreen');show('resultScreen');var now=new Date();CFG.submittedAt=now.toISOString();
  I('resultGrade').textContent=res.grade;I('resultName').textContent=CFG.studentName||'—';I('resultTs').textContent=now.toLocaleString(CFG.uiLang==='cs'?'cs-CZ':CFG.uiLang);var ra=I('resultAttempt');if(ra)ra.textContent=attemptId;
  I('resultPct').textContent=res.pct+'%';I('resultPts').textContent=res.earned+'/'+res.total+' b';
  updateJokerWatermark();
  I('resultBreakdown').innerHTML=res.breakdown.map(function(b){return '<div class="bdown-row"><span>'+esc(b.title)+'</span><span>'+b.earned+'/'+b.total+' b</span></div>';}).join('');
  var locks=securityEvents.filter(function(e){return e.type==='lock';}).length,unlocks=securityEvents.filter(function(e){return e.type==='unlock';}).length,warns=securityEvents.filter(function(e){return e.type==='warning'||e.type==='heartbeat-gap';}).length;
  if(securityEvents.length){I('resultBreakdown').insertAdjacentHTML('afterend','<div class="security-summary">Bezpečnostní záznam: '+warns+' varování, '+locks+' zámek/zámky, '+unlocks+' odemčení.</div>');}
  buildReportSeal(res).then(function(code){var el=I('reportSeal');if(el)el.textContent=code;res.reportSeal=code;if(CFG.overeni&&!jokerUsed){var ta=I('verifyTa');if(ta)ta.value='Připravuji ověřovací .txt…';buildVerify(res);}else if(jokerUsed){var vs=I('verifySection');if(vs)vs.classList.add('hidden');}}).catch(function(){var el=I('reportSeal');if(el)el.textContent='RPT-NELZE-VYTVOŘIT';var vs=I('verifySection');if(vs&&jokerUsed)vs.classList.add('hidden');});
}
function toggleAnswersPanel(){var p=I('answersPanel'),btn=document.querySelector('.btn-toggle-ans');if(p.classList.contains('hidden')){p.innerHTML=buildAnswersHtml();p.classList.remove('hidden');if(btn)btn.textContent=T('hideAnswers');}else{p.classList.add('hidden');if(btn)btn.textContent=T('resultAnswers');}}
function answerText(ex,item,ans){
  if(!ans)return '—';
  if(ans.type==='choice')return esc((item.options||[])[ans.val]||'—');
  if(ans.type==='fib'||ans.type==='cloze')return esc((ans.vals||[]).join(', '));
  if(ans.type==='table')return esc((ans.grid||[]).map(function(row){return Array.isArray(row)?row.filter(function(v){return v!==''&&v!=null;}).join(', '):'';}).filter(Boolean).join(' | ')||'—');
  if(ans.type==='chain')return esc((ans.vals||[]).filter(function(v){return v!==''&&v!=null;}).join(' | ')||'—');
  if(ans.type==='evidence')return esc((item.sentences||[])[ans.val]||'—');
  if(ans.type==='error-tagging'){var toks=Array.isArray(item.tokens)?item.tokens:[];var ix=Number(ans.token);var tok=(Number.isInteger(ix)&&toks[ix]!=null)?toks[ix]:'—';return esc('token: '+tok+'; typ: '+(ans.etype||'—')+'; oprava: '+(ans.corr||'—'));}
  if(ans.type==='tf')return ans.val?T('true'):T('false');
  return esc(ans.val||'—');
}
function buildAnswersHtml(){
  var h='';EXS.forEach(function(ex,ei){h+='<div class="ap-sec"><div class="ap-ex-title">'+esc(ex.title||ex.type)+'</div>';
    if(ex.type==='matching'){var pairs=(ANSWERS['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(item,li){var right=EXS[ei].items[pairs[li]]||{};var good=(pairs[li]!==undefined&&parseInt(pairs[li],10)===li);var fb=((CFG.feedbackMode||'brief')!=='none'?'<div class="ap-feedback '+(good?'ap-ok':'ap-bad')+'"><b>'+(good?'✓ Správně':'✕ Chyba')+'</b></div>'+(((CFG.feedbackMode||'brief')==='learning')?csItemFeedbackHtml(item,good,true):''):'');h+='<div class="ap-item"><span class="ap-q">'+(li+1)+'. '+esc(item.left)+'</span><span class="ap-a">'+(right.right?esc(right.right):'—')+'</span>'+fb+'</div>';});}
    else{(ex.items||[]).forEach(function(item,qi){var ans=ANSWERS[ei+'_'+qi];h+='<div class="ap-item"><span class="ap-q">'+(qi+1)+'.</span><span class="ap-a">'+answerText(ex,item,ans)+'</span>'+itemFeedbackStatusHtml(ex,item,ans,itemPoint(ex,qi))+'</div>';});}
    h+='</div>';});return h;
}

function b64Url(buf){var bin='';var bytes=new Uint8Array(buf);for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).split('+').join('-').split('/').join('_').replace(/=+$/,'');}
function jsonB64(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}
function hasSubtle(){return !!(window.crypto&&crypto.subtle&&window.TextEncoder);}
function shortHashClient(str){var h=2166136261;str=String(str||'');for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
async function deriveSecretHashClient(kind,secret,testId){var norm=(kind==='teacher-pin')?String(secret||'').trim().toUpperCase():String(secret||'').trim();if(!(window.crypto&&crypto.subtle&&window.TextEncoder))return 'fnv$'+shortHashClient(kind+'|'+norm+'|'+testId);var enc=new TextEncoder();var key=await crypto.subtle.importKey('raw',enc.encode(norm),{name:'PBKDF2'},false,['deriveBits']);var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(kind+'|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);return 'pbkdf2-v1$'+b64Url(bits);}
async function secretMatches(raw,prefix,expectedHash){if(!expectedHash)return false;return await deriveSecretHashClient(prefix,raw,CFG.testId)===expectedHash;}
function verifyKey(){return String(CFG.verifySecret||CFG.testId||'');}
async function hmac256(payload,tag){var enc=new TextEncoder();var key=await crypto.subtle.importKey('raw',enc.encode(verifyKey()),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);var msg=enc.encode(tag+'|'+payload);var sig=await crypto.subtle.sign('HMAC',key,msg);return b64Url(sig);}
async function makeSignedLine(tag,payload){return tag+'|'+payload+'|'+await hmac256(payload,tag);}
var attemptId='A'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,8).toUpperCase();
function securityCounts(){return{warnings:securityEvents.filter(function(e){return e.type==='warning'||e.type==='heartbeat-gap';}).length,locks:securityEvents.filter(function(e){return e.type==='lock';}).length,unlocks:securityEvents.filter(function(e){return e.type==='unlock';}).length,total:securityEvents.length};}
function reportPayload(res){return{v:1,tag:'RPT1',id:CFG.testId,manifestHash:CFG.manifestHash,creatorId:CFG.creatorId||'',creatorRole:CFG.creatorRole||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',resultMode:CFG.resultMode||'instant',attemptId:attemptId,student:CFG.studentName,group:CFG.activeGroupName||'',groupKey:CFG.activeGroupKey||'',variantKey:CFG.activeVariantKey||'',ts:CFG.submittedAt,earned:res.earned,total:res.total,pct:res.pct,grade:res.grade,jokerUsed:!!jokerUsed,jokerSelectedAt:jokerSelectedAt||'',security:securityCounts()};}
function shortCode(sig,prefix){sig=String(sig||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();return (prefix||'RPT')+'-'+sig.slice(0,4)+'-'+sig.slice(4,8)+'-'+sig.slice(8,12)+'-'+sig.slice(12,16);}
async function buildReportSeal(res){if(!hasSubtle())throw new Error('WebCrypto není dostupné');var payload=jsonB64(reportPayload(res));var sig=await hmac256(payload,'RPT1');return shortCode(sig,'RPT');}
async function buildVerify(res){
  var manifestPayload=jsonB64(CFG.manifest||{hash:CFG.manifestHash});
  var pay={v:5,id:CFG.testId,manifestHash:CFG.manifestHash,creatorId:CFG.creatorId||'',creatorRole:CFG.creatorRole||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',attemptId:attemptId,student:CFG.studentName,group:CFG.activeGroupName||'',groupKey:CFG.activeGroupKey||'',variantKey:CFG.activeVariantKey||'',ts:CFG.submittedAt,earned:res.earned,total:res.total,pct:res.pct,grade:res.grade,reportSeal:res.reportSeal||'',jokerUsed:!!jokerUsed,jokerSelectedAt:jokerSelectedAt||'',warnings:warningCount,variant:CFG.odevzdavani,breakdown:res.breakdown||[],securityEvents:securityEvents||[],securityCounts:securityCounts()};
  var review={v:5,id:CFG.testId,manifestHash:CFG.manifestHash,attemptId:attemptId,student:CFG.studentName,answers:ANSWERS};
  var p1=jsonB64(pay),p2=jsonB64(review);
  try{if(!hasSubtle())throw new Error('WebCrypto není dostupné');generatedTxt=await makeSignedLine('OVR4M',manifestPayload)+String.fromCharCode(10)+await makeSignedLine('OVR4',p1)+String.fromCharCode(10)+await makeSignedLine('OVR4R',p2);}catch(e){generatedTxt='# CHYBA: Tento prohlížeč neumí vytvořit platný OVR4/HMAC ověřovací soubor. Použij aktuální Chrome/Edge/Safari/Firefox a stáhni .txt znovu.';}var ta=I('verifyTa');if(ta)ta.value=generatedTxt;
}
function downloadVerifyTxt(){if(jokerUsed){var taJ=I('verifyTa');if(taJ)taJ.value='U žolíka se ověřovací .txt nevyžaduje. Pošli screenshot s kontrolním kódem reportu.';return;}if(!generatedTxt){var ta0=I('verifyTa');if(ta0)ta0.value='Ověřovací .txt se ještě připravuje. Zkus to za okamžik.';return;}var name=(CFG.studentName||'student').replace(/[^a-z0-9]/gi,'-');var ts=new Date().toISOString().slice(0,10);var fn='ovr_'+CFG.testId+'_'+name+'_'+ts+'.txt';try{var b=new Blob([generatedTxt],{type:'text/plain;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=fn;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1000);}catch(_){var ta=I('verifyTa');if(ta)ta.select();}}
function copyVerify(){var ta=I('verifyTa');if(!ta)return;try{navigator.clipboard.writeText(ta.value);}catch(_){ta.select();document.execCommand('copy');}}

function b64Json(s){return JSON.parse(decodeURIComponent(escape(atob(s))));}
async function parseVerifyText(txt){var lines=String(txt||'').split(String.fromCharCode(13)).join('').split(String.fromCharCode(10)).map(function(x){return x.trim();}).filter(Boolean);var out={ok:false,strong:false,meta:null,answers:null,manifest:null,errors:[]};for(var i=0;i<lines.length;i++){var line=lines[i];if(!line||line.charAt(0)==='#')continue;var p=line.split('|');if(p.length<3){out.errors.push('Neplatný řádek ověřovacího souboru.');continue;}var tag=p[0],payload=p[1],sig=p[2];try{if(tag!=='OVR4'&&tag!=='OVR4R'&&tag!=='OVR4M'){out.errors.push(tag+': neplatný formát. Tento test přijímá pouze OVR4M/OVR4/OVR4R s HMAC-SHA-256.');continue;}if(!hasSubtle()){out.errors.push(tag+': tento prohlížeč neumí ověřit HMAC-SHA-256.');continue;}var expected=await hmac256(payload,tag);if(expected!==sig)out.errors.push(tag+': nesedí podpis (HMAC) - soubor byl změněn, nepatří k tomuto testu, nebo byl vyroben jiným klíčem.');else out.strong=true;var obj=b64Json(payload);if(tag==='OVR4M')out.manifest=obj;if(tag==='OVR4')out.meta=obj;if(tag==='OVR4R')out.answers=(obj&&obj.answers)?obj.answers:obj;}catch(e){out.errors.push(tag+': nejde přečíst nebo ověřit data.');}}
  if(!out.manifest)out.errors.push('Chybí řádek OVR4M s manifestem testu.');
  if(out.manifest&&out.manifest.hash&&out.manifest.hash!==CFG.manifestHash)out.errors.push('Manifest neodpovídá tomuto testu: výsledek nepatří k této verzi testu nebo byl test upraven.');
  if(out.meta&&out.meta.manifestHash&&out.meta.manifestHash!==CFG.manifestHash)out.errors.push('Výsledek je podepsán pro jiný manifest testu.');
  if(out.answers&&out.answers.manifestHash&&out.answers.manifestHash!==CFG.manifestHash)out.errors.push('Detail odpovědí je podepsán pro jiný manifest testu.');
  out.ok=!!(out.meta&&out.answers&&out.manifest)&&out.errors.length===0;return out;}
function loadVerifyFile(inp){var f=inp.files&&inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){I('verifyInput').value=String(r.result||'');verifyStudentTxt();};r.readAsText(f,'utf-8');}
function answerRawForTeacher(ex,item,ans){return answerText(ex,item,ans).replace(/<[^>]+>/g,'');}
function buildVerifiedAnswersHtml(ansObj,exs){exs=exs||EXS;var h='';(exs||[]).forEach(function(ex,ei){h+='<div class="student-answer-card"><b>'+esc(ex.title||ex.type)+'</b>';if(ex.type==='matching'){var pairs=(ansObj['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(item,li){var right=ex.items[pairs[li]]||{};h+='<div>'+(li+1)+'. '+esc(item.left||'')+' → <b>'+esc(right.right||'—')+'</b></div>';});}else{(ex.items||[]).forEach(function(item,qi){var a=ansObj[ei+'_'+qi];h+='<div>'+(qi+1)+'. <b>'+answerRawForTeacher(ex,item,a)+'</b></div>';});}h+='</div>';});return h;}
function calcScoreFromAnswers(ansObj,exs){var old=ANSWERS;ANSWERS=ansObj||{};var oldExs=EXS;EXS=exs||EXS;var sc=calcScore();ANSWERS=old;EXS=oldExs;return sc;}
function closeNum(a,b){return Math.abs((Number(a)||0)-(Number(b)||0))<0.11;}
async function verifyStudentTxt(){var txt=(I('verifyInput').value||'').trim();var box=I('verifyResult');if(!txt){box.innerHTML='<span class="t-verify-bad">Vlož nebo nahraj .txt.</span>';return;}box.innerHTML='Ověřuji podpis, manifest a přepočítávám skóre…';var p=await parseVerifyText(txt),meta=p.meta||{};var exs=variantByGroupNameOrKey(meta.group||'',meta.groupKey||meta.variantKey||'');var rec=p.answers?calcScoreFromAnswers(p.answers,exs):null;var scoreOk=!!(rec&&closeNum(rec.earned,meta.earned)&&closeNum(rec.total,meta.total)&&String(rec.grade)===String(meta.grade));var manifestOk=!!(p.manifest&&p.manifest.hash===CFG.manifestHash);var status=(p.ok&&scoreOk)?'<span class="t-verify-ok">✓ Orientační kontrola prošla: podpis, manifest i přepočet skóre sedí. Pozn.: v rychlém režimu je podpisový klíč v souboru u studenta, takže tohle potvrzuje shodu a odhalí náhodnou úpravu, ale není to důkaz neměnnosti vůči samotnému studentovi — pro klasifikaci slouží bezpečný offline režim.</span>':'<span class="t-verify-bad">⚠ Ověření má problém.</span>';var vkey=meta.groupKey||meta.variantKey||'';var att=meta.attemptId?(' | <b>Attempt:</b> '+esc(meta.attemptId)):'';var seal=meta.reportSeal?(' | <b>Report kód:</b> '+esc(meta.reportSeal)):'';var joker=meta.jokerUsed?(' | <b>ŽOLÍK:</b> ANO'):' | <b>ŽOLÍK:</b> ne';var detail=[];if(!manifestOk)detail.push('Manifest testu nesedí nebo chybí.');if(rec&&!scoreOk)detail.push('Přepočet skóre z odpovědí nesedí s hodnotami v .txt: přepočteno '+esc(rec.earned)+'/'+esc(rec.total)+' ('+esc(rec.pct)+' %), známka '+esc(rec.grade)+'.');var info='<div>'+status+'</div>'+(p.errors.length?'<div>'+p.errors.map(esc).join('<br>')+'</div>':'')+(detail.length?'<div>'+detail.join('<br>')+'</div>':'')+'<div><b>Student:</b> '+esc(meta.student||'—')+' | <b>Skupina:</b> '+esc(meta.group||'—')+' '+(vkey?'('+esc(vkey)+')':'')+' | <b>Skóre v .txt:</b> '+esc(meta.earned)+'/'+esc(meta.total)+' ('+esc(meta.pct)+' %), známka '+esc(meta.grade)+att+seal+joker+'</div>';box.innerHTML=info+(p.answers?'<div style="margin-top:8px"><b>Odpovědi ze studentského .txt podle správné skupinové varianty:</b></div>'+buildVerifiedAnswersHtml(p.answers,exs):'');}
function openTeacherModal(){show('teacherModal');I('t-name').focus();}
function closeTeacherModal(){logoutTeacher();hide('teacherModal');}
async function doTeacherLogin(){var n=(I('t-name').value||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var p=(I('t-pin').value||'').trim().toUpperCase();var cn=(CFG.ucitelJmeno||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var err=I('t-err');if(n===cn&&await secretMatches(p,'teacher-pin',CFG.ucitelPinHash)){teacherLogged=true;I('t-pin').value='';hide('t-login');show('t-panel');I('t-body').innerHTML=buildTeacherBody();}else{if(err){err.textContent=T('incorrectLogin');err.classList.remove('hidden');}}}
function logoutTeacher(){teacherLogged=false;hide('t-panel');show('t-login');I('t-pin').value='';var e=I('t-err');if(e)e.classList.add('hidden');}
function csTeacherFeedbackHtml(item){var fb=(item&&item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:null;if(!fb)return '';var rows=[];if(fb.phenomenon)rows.push('<div><b>Jev:</b> '+esc(fb.phenomenon)+'</div>');if(fb.rule)rows.push('<div><b>Pravidlo:</b> '+esc(fb.rule)+'</div>');if(fb.whyCorrect)rows.push('<div><b>Proč:</b> '+esc(fb.whyCorrect)+'</div>');if(fb.reviewTip)rows.push('<div><b>Co zopakovat:</b> '+esc(fb.reviewTip)+'</div>');if(fb.errorFocus)rows.push('<div><b>Typ chyby:</b> '+esc(fb.errorFocus)+'</div>');return rows.length?'<div class="t-expl cs-fb">'+rows.join('')+'</div>':'';}
function correctTextForTeacher(ex,item){if(ex.type==='matching')return item.right||'';if(ex.type==='multiple choice'||ex.type==='reading comprehension'||ex.type==='dialogue completion'||ex.type==='listening comprehension')return (item.options||[])[correctIndex(item)]||item.answer||'';if(ex.type==='true/false')return item.correct?T('true'):T('false');if(ex.type==='fill-in-the-blank'||ex.type==='word formation'||ex.type==='translation'||ex.type==='sentence transformation')return item.answer||'';if(ex.type==='error correction')return item.correction||'';if(ex.type==='error-tagging'){var toks=Array.isArray(item.tokens)?item.tokens:[];var ix=Number(item.error_token_index);return 'token: '+(toks[ix]!=null?toks[ix]:('#'+ix))+'; typ: '+(item.error_type||'')+'; oprava: '+(item.correction||'');}if(ex.type==='word order')return item.correct_sentence||item.answer||'';if(ex.type==='cloze text')return (item.answers||[]).join(', ');if(ex.type==='categorization')return item.correct_category||item.category||item.answer||'';return '['+T('manualReview')+'] '+(item.model_answer||'');}
function questionTextForTeacher(item){return item.question||item.statement||item.sentence||item.prompt||item.text||item.dialogue||item.passage||item.transcript||item.audio_prompt||item.image_description||'';}
function listeningTranscriptForTeacher(ex,item){if(!ex||ex.type!=='listening comprehension')return '';var tr=item.transcript||item.audio_prompt||item.audio_source_note||'';return tr?'<div class="t-expl"><b>Transkript / audio script:</b> '+esc(tr)+'</div>':'';}
function buildTeacherBody(){
  var fzLabel=(CFG.fuzzyTolerance==='mild')?'Mírná (překlep u psaných odpovědí = 0,85 b)':(CFG.fuzzyTolerance==='strict'?'Přísná (překlep u psaných odpovědí = 0,5 b)':'Vypnuto (jen přesná shoda, pravopis se hodnotí)');
  var h='<div class="t-summary"><div class="t-row"><b>Test:</b> '+esc(CFG.nazev)+'</div><div class="t-row"><b>ID:</b> '+CFG.testId+'</div>'+(CFG.cefr?'<div class="t-row"><b>CEFR:</b> '+esc(CFG.cefr)+'</div>':'')+'<div class="t-row"><b>Čas:</b> '+CFG.cas+' min</div><div class="t-row"><b>Body:</b> '+fmtPtsClient(CFG.totalBody)+'</div><div class="t-row"><b>Tolerance překlepů:</b> '+esc(fzLabel)+'</div></div>';
  if((CFG.diffGroups||[]).length){
    h+='<div class="t-sec-title">Diferencované varianty</div><div class="t-verify-box"><div class="small-note">Test obsahuje samostatnou fyzickou variantu pro každou skupinu. Student po zadání kódu uvidí pouze svou variantu.</div>';
    (CFG.diffGroups||[]).forEach(function(g){var exs=VARIANTS[g.key]||[];var sum=variantSummaryClient(exs);h+='<div class="student-answer-card"><b>'+esc(g.name)+' ('+esc(g.key)+')</b><br><span>'+sum.exCount+' cvičení · '+sum.totalQ+' položek · '+fmtPtsClient(sum.totalBody)+' b</span><br><span>'+esc(g.conditions||'')+'</span></div>';});
    h+='</div>';
  }
  h+='<div class="t-sec-title">Ověření studentského .txt</div><div class="t-verify-box"><div class="small-note">Ověřovací soubor musí obsahovat OVR4M/OVR4/OVR4R podepsané přes HMAC-SHA-256. U žolíka se TXT nevyžaduje, kontroluje se screenshot s report kódem.</div><div class="small-note" style="border-left:3px solid #f59e0b;padding-left:8px"><b>Míra důvěry (rychlý režim):</b> podpisový klíč je součástí tohoto testového souboru, který má student k dispozici. Kontrola tedy spolehlivě odhalí náhodnou úpravu a potvrdí, že .txt patří k tomuto testu, ale technicky zdatný student ji umí obejít. Pro klasifikovaný / maturitní test použij <b>Bezpečný offline režim</b> — tam klíč ve studentském souboru není a ověření je neprůstřelné.</div><textarea id="verifyInput" placeholder="Sem vlož obsah studentského ověřovacího .txt (OVR4M / OVR4 / OVR4R)…"></textarea><div class="t-verify-actions"><input type="file" id="verifyFile" accept=".txt,text/plain" onchange="loadVerifyFile(this)"><button class="btn-modal-ok" onclick="verifyStudentTxt()">Ověřit .txt</button></div><div id="verifyResult" class="t-verify-result"></div></div>';
  h+='<div class="t-sec-title">'+T('correctAnswers')+'</div>';
  var keys=(CFG.diffGroups||[]).length?(CFG.diffGroups||[]).map(function(g){return g.key;}):['__default'];
  keys.forEach(function(key){var exs=VARIANTS[key]||VARIANTS.__default||[];var g=(CFG.diffGroups||[]).find(function(x){return x.key===key;});if(g){h+='<div class="t-ex-sec"><div class="t-ex-title">Varianta: '+esc(g.name)+' ('+esc(key)+')</div>';}exs.forEach(function(ex,ei){h+='<div class="t-ex-sec"><div class="t-ex-title">'+esc(ex.title||ex.type)+'</div>';(ex.items||[]).forEach(function(item,qi){var qtxt=questionTextForTeacher(item);h+='<div class="t-item teacher-review-card"><div class="t-qnum">'+(qi+1)+'.</div><div class="t-qtext">'+esc(String(qtxt).slice(0,120))+'</div><div class="t-correct">✓ '+esc(correctTextForTeacher(ex,item))+'</div>'+listeningTranscriptForTeacher(ex,item)+(item.explanation?'<div class="t-expl">'+esc(item.explanation)+'</div>':'')+csTeacherFeedbackHtml(item)+'</div>';});h+='</div>';});if(g){h+='</div>';}});
  return h;
}

var secInstalled=false,blurTimer=null,lastBeat=Date.now(),activeEditable=false,securityEvents=[];
function isModalOpen(){return !I('submitModal')?.classList.contains('hidden')||!I('messageModal')?.classList.contains('hidden')||!I('teacherModal')?.classList.contains('hidden')||!I('lockScreen')?.classList.contains('hidden');}
function isEditable(el){return !!(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable));}
function recordSecurityEvent(type,detail){securityEvents.push({type:type,detail:detail||'',ts:new Date().toISOString()});warningCount=securityEvents.length;}
function lockTest(reason){
  if(!started||submitted||locked)return;
  if(CFG.lockOnLeave){
    recordSecurityEvent('lock',reason);
    if(CFG.hasUnlock){locked=true;I('lockReason').textContent=reason+' ('+warningCount+')';LOCK_TAPS=0;hide('unlockReveal');show('lockScreen');}
    else{recordSecurityEvent('warning','Hlídání obrazovky: zámek nemá nastavené odemykací heslo. '+reason);}
    return;
  }
  if(CFG.testMode==='bezny'){recordSecurityEvent('warning',reason);return;}
  recordSecurityEvent('warning',reason);
}
function guardedBlurCheck(){clearTimeout(blurTimer);blurTimer=setTimeout(function(){if(!started||submitted||locked)return;if(activeEditable||isEditable(document.activeElement)||isModalOpen())return;if(document.visibilityState==='visible'&&!document.hasFocus())lockTest('Stránka ztratila fokus.');},1000);}
function onVisibility(){if(!started||submitted)return;if(document.visibilityState==='visible')refreshInstantTimer();if(locked)return;if(document.visibilityState==='hidden')lockTest('Student opustil okno nebo přepnul aplikaci.');}
function onWindowFocus(){if(started&&!submitted)refreshInstantTimer();}
function onPageHide(){if(!started||submitted||locked)return;lockTest('Pokus o opuštění stránky.');}
function onBeforeUnload(e){if(!started||submitted)return;recordSecurityEvent('warning','Pokus o reload nebo opuštění stránky.');if(CFG.lockOnLeave){e.preventDefault();e.returnValue='';return '';}}
function setupLockDetection(){if(secInstalled)return;secInstalled=true;lastBeat=Date.now();document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',onPageHide);window.addEventListener('blur',guardedBlurCheck);window.addEventListener('beforeunload',onBeforeUnload);window.addEventListener('focus',onWindowFocus);document.addEventListener('focusin',function(e){activeEditable=isEditable(e.target);});document.addEventListener('focusout',function(){setTimeout(function(){activeEditable=isEditable(document.activeElement);},50);});setInterval(function(){if(started&&!submitted&&!locked){var now=Date.now();if(now-lastBeat>45000)lockTest('Podezřelá prodleva aktivity: '+String(now-lastBeat)+' ms.');lastBeat=now;}},15000);}
function teardownLockDetection(){if(!secInstalled)return;secInstalled=false;document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);window.removeEventListener('blur',guardedBlurCheck);window.removeEventListener('beforeunload',onBeforeUnload);window.removeEventListener('focus',onWindowFocus);}
var LOCK_TAPS=0,LOCK_TAP_TIMER=null;
function lockTap(){LOCK_TAPS++;clearTimeout(LOCK_TAP_TIMER);LOCK_TAP_TIMER=setTimeout(function(){LOCK_TAPS=0;},2000);if(LOCK_TAPS>=5){LOCK_TAPS=0;show('unlockReveal');var inp=I('unlockInp');if(inp){try{inp.focus();}catch(_){}}}}
async function tryUnlock(){var v=(I('unlockInp').value||'').trim();if(await secretMatches(v,'unlock-password',CFG.hesloHash)){locked=false;hide('lockScreen');hide('unlockReveal');LOCK_TAPS=0;I('unlockInp').value='';recordSecurityEvent('unlock','teacher password');}else{I('unlockInp').style.borderColor='#ef4444';setTimeout(function(){I('unlockInp').style.borderColor='';},800);}}
`;
}

