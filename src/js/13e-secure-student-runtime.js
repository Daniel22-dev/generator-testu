function buildSecureStudentHtml(publicCfg, studentVariants) {
  const S = publicCfg.secureLabels || getSecureStudentLabels(publicCfg.uiLang);
  const L = publicCfg.labels || {};
  const htmlLang = H(publicCfg.uiLang || 'cs');
  return '<!DOCTYPE html>\n<html lang="'+htmlLang+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+H(publicCfg.nazev)+' — student</title><style>'+secureCss()+secureStudentExtraCss()+secureStudentThemeCss(publicCfg.tema)+'</style></head><body>'+auditCommentHtml(publicCfg)+
    '<div class="wrap"><section id="intro" class="card"><h1>'+H(publicCfg.nazev)+'</h1><div class="muted">'+H(publicCfg.proKoho||'')+' · Test ID: '+H(publicCfg.testId)+(publicCfg.cefr?' · CEFR: '+H(publicCfg.cefr):'')+((publicCfg.creatorName||publicCfg.creatorId)?' · '+H(S.author||'Autor')+': '+H(publicCfg.creatorName||publicCfg.creatorId):'')+'</div>'+ 
    '<div class="warn"><b>'+H(S.secureMode)+':</b> '+H(S.secureModeText)+'</div>'+ 
    '<div class="archive-note"><b>'+H(S.chooseDevice)+':</b> '+H(S.chooseDeviceText)+'</div>'+ 
    '<div class="env-block hidden" id="envWarning"><b>'+H(S.envBlockTitle)+'</b><br>'+H(S.envBlockText)+'</div>'+ 
    '<div class="device-detected-tag" id="deviceDetectedTag"></div>'+
    '<div class="device-choice" id="deviceChoice">'+
      '<button class="device-btn" type="button" data-device="apple" onclick="pickDevice(\'apple\')">🍎 '+H(S.apple)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="android" onclick="pickDevice(\'android\')">🤖 '+H(S.android)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="desktop" onclick="pickDevice(\'desktop\')">💻 '+H(S.desktop)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="auto" onclick="pickDevice(\'auto\')">❔ '+H(S.auto)+'</button>'+ 
    '</div>'+ 
    '<div class="device-panel" id="deviceInstructions"></div>'+ 
    '<div class="device-list" id="deviceStatus"><div>'+H(S.notChecked)+'</div></div><div class="row"><button class="secondary" type="button" onclick="checkDevice(true)">'+H(S.testDevice)+'</button><button class="ghost" type="button" onclick="testDownload()">'+H(S.tryDownload)+'</button></div>'+ 
    '<button class="ghost btn-fullscreen" type="button" onclick="enterFullscreen()"><span class="fs-ico" aria-hidden="true"></span> '+H(S.fullscreen || 'Fullscreen')+'</button>'+ 
    (publicCfg.zolicek ? '<div class="joker-choice" id="jokerChoice"><div class="joker-title">🃏 '+H(S.jokerChoiceTitle || 'Volba žolíka')+'</div><div class="small">'+H(S.jokerChoiceHint || 'Vyber před začátkem testu. Volba je nevratná.')+'</div><div class="row" style="margin-top:8px"><button type="button" class="joker-btn" id="jokerNo" onclick="chooseJokerStart(false)">'+H(S.jokerDoTest || 'Dělám test')+'</button><button type="button" class="joker-btn joker-risk" id="jokerYes" onclick="chooseJokerStart(true)">'+H(S.jokerTake || 'Beru si žolíka')+'</button></div><div class="joker-confirm" id="jokerChoiceConfirm" style="display:none"></div><div class="small muted" style="margin-top:6px">'+H(S.jokerSecureHint || 'I při žolíkovi odešli answers.txt; učitel uvidí označení ve verifieru.')+'</div></div>' : '')+
    '<label>'+(publicCfg.identityMode==='oneTimeCode'?'Tvůj jednorázový kód':H(S.studentName))+'</label><input id="studentName" autocomplete="off" autocorrect="off" placeholder="'+(publicCfg.identityMode==='oneTimeCode'?'kód od učitele':'')+'"><div class="row" style="margin-top:12px"><button onclick="startTest()">'+H(S.start)+'</button></div>'+ 
    '<button class="ghost teacher-open" type="button" onclick="openTeacherModal()">🔒 '+H(S.teacher)+'</button></section>'+ 
    '<section id="test" class="hidden"><div class="bar"><b>'+H(publicCfg.nazev)+'</b><span id="timer">--:--</span></div><div id="a11yNote" class="a11y-note hidden"></div><div id="jokerWatermark" class="joker-watermark hidden"></div><div class="wrap"><div id="exerciseArea"></div><div class="card"><div id="submitError" class="danger hidden"></div><button onclick="submitSecureTest()">'+H(S.submitSecure)+'</button></div></div></section>'+ 
    '<section id="done" class="card hidden"><h1>'+H(S.done)+'</h1><div class="ok">'+H(S.doneText)+'</div><div id="jokerDoneBox" class="joker-result hidden"></div><div class="row"><button onclick="downloadAnswers()">'+H(S.download)+'</button><button class="secondary" onclick="shareAnswers()">'+H(S.share)+'</button><button class="ghost" onclick="copyAnswers()">'+H(S.copyBackup)+'</button></div><textarea id="answerBackup" class="backup" readonly></textarea><button class="ghost teacher-open" type="button" onclick="openTeacherModal()">🔒 '+H(S.teacher)+'</button></section>'+ 
    '<div id="teacherModal" class="modal hidden"><div class="modalbox"><h2>'+H(S.teacherLogin)+'</h2><div id="teacherLoginBox"><input id="teacherName" placeholder="'+H(S.name)+'" autocomplete="off"><input id="teacherPin" type="password" placeholder="'+H(S.pin)+'" autocomplete="off"><div id="teacherErr" class="danger small hidden"></div><div class="row"><button onclick="teacherLogin()">'+H(S.login)+'</button><button class="ghost" onclick="closeTeacherModal()">'+H(S.close)+'</button></div></div><div id="teacherPanel" class="hidden"><h2>'+H(S.teacherPanel)+'</h2><div class="archive-note">'+H(S.teacherHint)+'</div><div id="teacherRuntimeInfo" class="device-list"></div><div class="row"><button class="ghost" onclick="teacherLogout()">'+H(S.logout)+'</button><button onclick="closeTeacherModal()">'+H(S.close)+'</button></div></div></div></div>'+ 
    '<div id="lockScreen" class="lockscreen hidden"><div class="lockbox"><h1 id="lockIcon" onclick="lockTap()" style="cursor:pointer;user-select:none;-webkit-user-select:none">🔒</h1><p><b>'+H(S.locked)+'</b></p><p id="lockContactMsg">'+H(S.lockContact||'Kontaktuj učitele.')+'</p><div id="unlockReveal" class="hidden"><p>'+H(S.lockedStrict)+'</p><div class="danger" id="lockReasonBox"></div><input id="unlockInp" type="password" placeholder="'+H(S.unlockPh)+'" autocomplete="off"><div class="row"><button onclick="tryUnlock()">'+H(S.unlock)+'</button><button class="ghost" onclick="openTeacherModal()">'+H(S.teacher)+'</button></div></div></div></div>'+ 
    '</div>'+ 
    '<script>\n\'use strict\';\nconst CFG='+safeJsonForScript(publicCfg)+';\nconst STUDENT_VARIANTS='+safeJsonForScript(studentVariants)+';\n'+secureStudentScript()+'\n<\/script></body></html>';
}
function secureStudentScript(){return String.raw`
let EXS=[],ACTIVE_KEY='__default',RESP={},STARTED_AT='',SUBMITTED_AT='',ANSWER_TXT='',SEC_EVENTS=[],CURRENT_DEVICE='auto',TIMER_ID=null,TIMER_DEADLINE=0,LOCKED=false,SUBMITTED=false,JOKER_CHOICE=null,JOKER_USED=false,JOKER_SELECTED_AT='',ATTEMPT_ID='',ANSWER_CHANGE_STATS={},LAST_RESP_SERIAL={},LAST_CHANGE_TS={};
let A11Y=null;
function applyA11y(key){A11Y=null;var b=document.body;if(b)b.classList.remove('a11y-large','a11y-xlarge','a11y-dys');var groups=CFG.diffGroups||[];var gg=null;for(var i=0;i<groups.length;i++){if(groups[i].key===key){gg=groups[i];break;}}if(!gg||!gg.a11y)return;var a=gg.a11y;var mult=({'125':1.25,'150':1.5,'200':2})[a.time]||1;A11Y={timeMult:mult,noLimit:a.time==='none',font:a.font||'normal',dys:!!a.dys};if(b){if(a.font==='large')b.classList.add('a11y-large');if(a.font==='xlarge')b.classList.add('a11y-xlarge');if(a.dys)b.classList.add('a11y-dys');}var bar=document.getElementById('a11yNote');if(bar){var parts=[];if(mult>1)parts.push('prodloužený čas ('+(mult===2?'2\u00d7':'+'+Math.round((mult-1)*100)+' %')+')');if(A11Y.noLimit)parts.push('bez časového limitu');if(a.font==='large')parts.push('větší písmo');if(a.font==='xlarge')parts.push('největší písmo');if(a.dys)parts.push('dyslexie-friendly');if(parts.length){bar.textContent='♿ Aktivní úpravy: '+parts.join(', ');bar.classList.remove('hidden');}}}
const $=id=>document.getElementById(id);
const SL=CFG.secureLabels||{};
const GL=CFG.labels||{};
function t(k,f){return (SL&&SL[k]!=null)?String(SL[k]):(GL&&GL[k]!=null?String(GL[k]):String(f||k));}
function arr(k){return Array.isArray(SL[k])?SL[k]:[];}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(s){return String(s==null?'':s).trim().toLowerCase();}
function chooseJokerStart(use){JOKER_CHOICE=!!use;var no=$('jokerNo'),yes=$('jokerYes');if(no)no.classList.toggle('selected',!use);if(yes)yes.classList.toggle('selected',!!use);var box=$('jokerChoiceConfirm');if(box){box.style.display='block';box.textContent=use?'✅ Zvoleno: BERU SI ŽOLÍKA — test psát nebudeš.':'✅ Zvoleno: DĚLÁM TEST.';box.className='joker-confirm '+(use?'joker-confirm-risk':'joker-confirm-ok');}}
function jokerText(){return (t('jokerReport','ŽOLÍK POUŽIT'))+' · '+(($('studentName')&&$('studentName').value.trim())||'—')+' · '+CFG.testId;}
function updateJokerUi(){var wm=$('jokerWatermark');if(wm){wm.textContent=jokerText();wm.classList.toggle('hidden',!JOKER_USED);}var db=$('jokerDoneBox');if(db){db.textContent='🃏 '+jokerText();db.classList.toggle('hidden',!JOKER_USED);}document.body.classList.toggle('joker-mode',!!JOKER_USED);}

function detectDevice(){const ua=navigator.userAgent||'';if(/iPad|iPhone|iPod|Macintosh/.test(ua)&&navigator.maxTouchPoints>1)return 'apple';if(/Android/i.test(ua))return 'android';if(/Windows|Macintosh|Linux|CrOS/i.test(ua))return 'desktop';return 'auto';}
// Rozpozná nespolehlivé prostředí: lokální HTML soubor, content://, náhled souboru
// nebo vestavěný WebView (Gmail, Teams, Documents, Drive, Facebook…). Ostrý test má běžet
// jako webová stránka z HTTPS odkazu v Safari/Chrome, ne jako stažený HTML soubor.
function envInfo(){
  try{
    var ua=navigator.userAgent||'';
    var href=String(location&&location.href||'');
    var protocol=String(location&&location.protocol||'');
    var contentUri=/^content:\/\//i.test(href);
    var localFile=protocol==='file:'||/^file:/i.test(href);
    var webview=/\bwv\b|FBAN|FBAV|Instagram|Line\/|Documents|Outlook|Teams|GSA|MicroMessenger|FB_IAB|FB4A/i.test(ua);
    var noCrypto=!(window.crypto&&crypto.subtle);
    var noBlob=!(typeof Blob!=='undefined'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function');
    var previewOk=/^about:/i.test(href)||/^blob:/i.test(href); // náhled v generátoru může běžet přes about:srcdoc/blob
    var broken=(contentUri||localFile||webview||noCrypto||noBlob)&&!previewOk;
    return {href:href,protocol:protocol,contentUri:contentUri,localFile:localFile,webview:webview,noCrypto:noCrypto,noBlob:noBlob,previewOk:previewOk,broken:broken};
  }catch(e){return {broken:true,error:String(e&&e.message?e.message:e)};}
}
function isBrokenEnv(){return !!envInfo().broken;}
function updateEnvWarning(){var el=$('envWarning');if(!el)return;if(isBrokenEnv()){var title=String(t('envBlockTitle',''));var text=String(t('envBlockText',''));el.innerHTML='<b>'+esc(title)+'</b><br>'+esc(text);el.classList.remove('hidden');}else{el.classList.add('hidden');}}
function enterFullscreen(){try{var d=document,el=d.documentElement,fs=d.fullscreenElement||d.webkitFullscreenElement;if(fs){(d.exitFullscreen||d.webkitExitFullscreen||function(){}).call(d);}else{(el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen||function(){}).call(el);}}catch(_){}}
function deviceLabel(d){return d==='apple'?t('apple','iPhone / iPad'):d==='android'?t('android','Android'):d==='desktop'?t('desktop','PC / Mac'):t('auto','I don\'t know / automatic');}
function pickDevice(device){CURRENT_DEVICE=device||'auto';renderDeviceInstructions();checkDevice(false);updateEnvWarning();}
function tipsHtml(titleKey,tipsKey,fallbackTitle){const tips=arr(tipsKey);return '<b>'+esc(t(titleKey,fallbackTitle))+'</b><ul>'+tips.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';}
function renderDeviceInstructions(){const selected=CURRENT_DEVICE==='auto'?detectDevice():CURRENT_DEVICE;document.querySelectorAll('.device-btn').forEach(b=>b.classList.toggle('selected',b.dataset.device===CURRENT_DEVICE));var tag=$('deviceDetectedTag');if(tag){var det=detectDevice();tag.textContent=CURRENT_DEVICE==='auto'?('🔎 Automaticky rozpoznáno: '+deviceLabel(det)+' (klepni pro změnu)'):('✓ Ručně zvoleno: '+deviceLabel(CURRENT_DEVICE));}const box=$('deviceInstructions');if(!box)return;let html='';if(selected==='apple')html=tipsHtml('appleTitle','appleTips','iPhone/iPad');else if(selected==='android')html=tipsHtml('androidTitle','androidTips','Android');else if(selected==='desktop')html=tipsHtml('desktopTitle','desktopTips','PC/Mac');else html=tipsHtml('autoTitle','autoTips','General');box.innerHTML=html;}
window.addEventListener('DOMContentLoaded',()=>{CURRENT_DEVICE=detectDevice();renderDeviceInstructions();checkDevice(false);updateEnvWarning();});
function deviceLine(ok,label,extra){return '<div>'+(ok?'✓':'✕')+' '+esc(label)+(extra?' — '+esc(extra):'')+'</div>';}
function checkDevice(manual){const selected=CURRENT_DEVICE==='auto'?detectDevice():CURRENT_DEVICE;const info=envInfo();const hasCrypto=!!(CFG.publicKey&&window.crypto&&crypto.subtle);const hasBlob=typeof Blob!=='undefined'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function';const hasText=typeof TextEncoder!=='undefined'&&typeof TextDecoder!=='undefined';let envMsg=t('ok','OK');if(info.localFile)envMsg='lokální HTML soubor';else if(info.contentUri)envMsg='náhled souboru / content://';else if(info.webview)envMsg='náhled aplikace / WebView';else if(info.noCrypto)envMsg=t('unavailable','unavailable');else if(info.noBlob)envMsg=t('unsupported','unsupported');const usable=hasCrypto&&hasBlob&&hasText&&!info.broken;let html='';html+=deviceLine(true,t('deviceSelected','Device'),deviceLabel(selected));html+=deviceLine(hasText,t('textEncoding','Text encoding'),hasText?t('ok','OK'):t('unsupported','unsupported'));html+=deviceLine(hasBlob,t('txtCreation','TXT file creation'),hasBlob?t('ok','OK'):t('unsupported','unsupported'));html+=deviceLine(hasCrypto,t('crypto','WebCrypto'),hasCrypto?t('ok','OK'):t('unavailable','unavailable'));html+=deviceLine(!info.broken,t('env','Environment'),info.broken?envMsg:t('ok','OK'));const box=$('deviceStatus');if(box)box.innerHTML=html+(usable?'<div class="ok">'+esc(t('usable','Device looks usable.'))+'</div>':(hasCrypto&&hasBlob&&hasText?'<div class="danger">'+esc(t('risky','This environment may be unreliable.'))+'</div>':'<div class="danger">'+esc(t('unusable','This environment is not suitable.'))+'</div>'));updateEnvWarning();return usable;}
function testDownload(){try{const blob=new Blob([t('downloadTestText','TEST DOWNLOAD OK')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='test_download_'+CFG.testId+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);const box=$('deviceStatus');if(box)box.innerHTML+='<div class="ok">'+esc(t('downloadStarted','Test download was triggered.'))+'</div>';return true;}catch(e){const box=$('deviceStatus');if(box)box.innerHTML+='<div class="danger">'+esc(t('downloadFailed','Test download failed'))+': '+esc(e.message||e)+'</div>';return false;}}


function seedHash(str){let h=2166136261;str=String(str||'');for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seed){let x=seed>>>0;return function(){x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffleElementChildren(parent, selector, seed){if(!parent)return;const nodes=[...parent.querySelectorAll(':scope > '+selector)];if(nodes.length<2)return;const rnd=seededRandom(seed);for(let i=nodes.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[nodes[i],nodes[j]]=[nodes[j],nodes[i]];}nodes.forEach(n=>parent.appendChild(n));}
function shuffleOptionButtons(box, seed){if(!box)return;const nodes=[...box.children];if(nodes.length<2)return;const rnd=seededRandom(seed);for(let i=nodes.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[nodes[i],nodes[j]]=[nodes[j],nodes[i]];}nodes.forEach((n,idx)=>{const b=n.querySelector('b');if(b)b.textContent=String.fromCharCode(65+idx)+'.';box.appendChild(n);});}
function shuffleSelectOptions(sel, seed){if(!sel)return;const first=sel.querySelector('option[value=""]');const opts=[...sel.querySelectorAll('option')].filter(o=>o!==first);if(opts.length<2)return;const rnd=seededRandom(seed);for(let i=opts.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}if(first)sel.appendChild(first);opts.forEach(o=>sel.appendChild(o));}
function applyRuntimeRandomization(){
  if(!CFG.randomizace)return;
  const base=seedHash([CFG.testId,$('studentName')&&$('studentName').value,ACTIVE_KEY,STARTED_AT].join('|'));
  document.querySelectorAll('.ex-panel .card, #exerciseArea > .card').forEach((card,ei)=>{
    shuffleElementChildren(card,'.q',base+ei*101);
    // Míchání otázek je přesouvá appendem na konec karty. navrow (Další/Předchozí) je
    // přímým dítětem karty hned za otázkami, takže by skončil NAD nimi → tlačítka by
    // vyskočila pod nadpis. Po zamíchání proto navrow vrátíme na konec, aby zůstal dole.
    const nav=card.querySelector(':scope > .navrow'); if(nav) card.appendChild(nav);
  });
  document.querySelectorAll('.opts').forEach((box,i)=>shuffleOptionButtons(box,base+i*307));
  document.querySelectorAll('select').forEach((sel,i)=>shuffleSelectOptions(sel,base+i*401));
}
function storageKey(kind){return 'testgen_'+kind+'_'+String(CFG.testId||'test')+'_'+String(CFG.manifestHash||'manifest');}
function storageGet(kind){try{return localStorage.getItem(storageKey(kind));}catch(e){return null;}}
function storageSet(kind,val){try{localStorage.setItem(storageKey(kind),String(val));}catch(e){}}
function makeAttemptId(){try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return 'A'+Date.now().toString(36).toUpperCase()+Array.from(a).map(x=>x.toString(36).toUpperCase().padStart(6,'0')).join('').slice(0,10);}}catch(_){}return 'A'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,10).toUpperCase();}
function currentAttemptId(){if(!ATTEMPT_ID)ATTEMPT_ID=makeAttemptId();return ATTEMPT_ID;}
// Vlastní modal místo nativních prohlížečových dialogů — stejně jako ve verifieru
// a generátoru. Důvod: nativní dialogy se na mobilu a školních zařízeních chovají
// nekonzistentně.
// Tento modal je BLOKUJÍCÍ z hlediska UI (overlay zachytí klik a Esc/Enter),
// ale technicky neblokuje JS běh; volající nečeká na zavření (informativní funkce).
function sModal(msg,title){var bd=document.createElement('div');bd.className='s-modal-bd';bd.setAttribute('role','dialog');bd.setAttribute('aria-modal','true');bd.innerHTML='<div class="s-modal-box"><div class="s-modal-head">'+esc(title||'Upozornění')+'</div><div class="s-modal-body">'+esc(msg||'')+'</div><div class="s-modal-act"><button type="button" class="s-modal-btn primary" data-ok>OK</button></div></div>';document.body.appendChild(bd);function done(){document.removeEventListener('keydown',onkey);bd.remove();}function onkey(e){if(e.key==='Escape'||e.key==='Enter')done();}bd.querySelector('[data-ok]').addEventListener('click',done);bd.addEventListener('click',function(e){if(e.target===bd)done();});document.addEventListener('keydown',onkey);setTimeout(function(){var o=bd.querySelector('[data-ok]');if(o)o.focus();},0);}
function submittedLocked(){return storageGet('submitted')==='1';}
function setSubmittedLocked(){storageSet('submitted','1');}
function showSubmittedLocked(){sModal('Tento test už byl v tomto prohlížeči na tomto zařízení odevzdán. Pokud má student psát znovu, učitel musí poslat novou verzi testu nebo je nutné použít jiné zařízení/prohlížeč.','Test je již odevzdán');}
function normRosterIdentity(value){var raw=String(value==null?'':value);try{raw=raw.normalize('NFKD');}catch(_){}return raw.toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function b64UrlRoster(buf){var bin='',bytes=new Uint8Array(buf);for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function rosterHash(value){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))throw new Error('Tento diferencovaný test vyžaduje moderní prohlížeč s WebCrypto.');var input='GIT-DIFF-ROSTER-V1|'+String(CFG.diffRosterSalt||'')+'|'+normRosterIdentity(value);var dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return b64UrlRoster(dig);}
async function identityCodeHash(value){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))throw new Error('Ověření jednorázového kódu vyžaduje moderní prohlížeč s WebCrypto.');var input='GIT-IDENTITY-CODE-V1|'+String(CFG.diffRosterSalt||'')+'|'+normRosterIdentity(value);var dig=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return b64UrlRoster(dig);}
async function identityAllowed(value){if((CFG.identityMode||'name')!=='oneTimeCode')return true;var hashes=CFG.identityCodeHashes||[];if(!hashes.length)return false;return hashes.indexOf(await identityCodeHash(value))!==-1;}
async function chooseVariant(name){const groups=CFG.diffGroups||[];if(!groups.length)return STUDENT_VARIANTS.__default?'__default':Object.keys(STUDENT_VARIANTS)[0];const h=await rosterHash(name);for(const g of groups){if((g.studentHashes||[]).includes(h))return g.key;}return ''; }
async function startTest(){const name=$('studentName').value.trim();if(!name){$('studentName').focus();return;}if(submittedLocked()){showSubmittedLocked();return;}try{if(!(await identityAllowed(name))){sModal('Zadaný jednorázový kód není platný pro tento test. Zkontroluj přesný kód od učitele.','Neplatný kód');$('studentName').focus();return;}}catch(err){sModal(String(err&&err.message?err.message:err),'Ověření kódu');return;}if(CFG.zolicek&&JOKER_CHOICE===null){sModal(t('jokerChoiceHint','Vyber před začátkem testu, zda píšeš test, nebo bereš žolíka.'),'Vyber volbu');return;}if(!checkDevice(false))return;JOKER_USED=!!JOKER_CHOICE;JOKER_SELECTED_AT=JOKER_USED?new Date().toISOString():'';try{ACTIVE_KEY=await chooseVariant(name);}catch(err){sModal(String(err&&err.message?err.message:err),'Diferencovaný test');return;}if((CFG.diffGroups||[]).length&&!ACTIVE_KEY){sModal('Zadané jméno nebo kód není v žádné skupině. Zkontroluj přesný zápis podle pokynů učitele.','Diferencovaný test');$('studentName').focus();return;}EXS=STUDENT_VARIANTS[ACTIVE_KEY]||STUDENT_VARIANTS.__default||[];applyA11y(ACTIVE_KEY);STARTED_AT=new Date().toISOString();ATTEMPT_ID=makeAttemptId();RESP={};ANSWER_CHANGE_STATS={};LAST_RESP_SERIAL={};LAST_CHANGE_TS={};SEC_EVENTS=[{t:STARTED_AT,type:'attempt-start',detail:currentAttemptId()}];if(JOKER_USED)SEC_EVENTS.push({t:JOKER_SELECTED_AT,type:'joker-used'});LOCKED=false;SUBMITTED=false;renderTest();applyRuntimeRandomization();$('intro').classList.add('hidden');$('test').classList.remove('hidden');updateJokerUi();startTimer();startSplitMonitor();}
function refreshSecureTimer(){if(SUBMITTED)return false;const el=$('timer');if(A11Y&&A11Y.noLimit){if(el)el.textContent='∞';return true;}const remain=Math.max(0,Math.ceil((TIMER_DEADLINE-Date.now())/1000));if(el){const m=Math.floor(remain/60),sec=remain%60;el.textContent=String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}if(remain<=0){submitSecureTest();return false;}return true;}
function startTimer(){const base=Math.max(1,Number(CFG.cas)||45)*60;const limit=A11Y&&A11Y.timeMult>1?Math.round(base*A11Y.timeMult):base;TIMER_DEADLINE=(A11Y&&A11Y.noLimit)?0:(Date.now()+limit*1000);clearTimeout(TIMER_ID);const tick=()=>{if(!refreshSecureTimer())return;TIMER_ID=setTimeout(tick,1000);};tick();}
function isTestActive(){return $('test')&&!$('test').classList.contains('hidden')&&!SUBMITTED;}
function isTestRunning(){return isTestActive()&&!LOCKED;}
function recordSec(type,detail,extra){var ev={t:new Date().toISOString(),type:String(type||'event'),detail:detail||''};if(extra&&typeof extra==='object'){Object.keys(extra).forEach(function(k){ev[k]=extra[k];});}SEC_EVENTS.push(ev);}
// Měření délky odchodu: zaznamenáme okamžik odchodu a při návratu doplníme, jak dlouho byl
// student pryč. Krátký odchod (notifikace, systémová lišta, příchozí hovor na chvíli) je
// MĚKKÝ signál; dlouhý odchod je TVRDŠÍ. Stará answers.txt tento údaj nemají — verifier si
// poradí i bez něj (klasifikuje podle typu události).
var LEFT_AT=0;
var SOFT_AWAY_MS=8000; // odchod kratší než ~8 s bereme jako měkký (běžné mobilní vyrušení)
function markLeftNow(){ LEFT_AT=Date.now(); }
function awayMsSinceLeft(){ if(!LEFT_AT) return null; var d=Date.now()-LEFT_AT; LEFT_AT=0; return d>=0?d:null; }
function handleLeave(kind,reason){if(!isTestRunning())return;var why=reason||t('lockedEvent','left window');if(CFG.lockOnLeave){lockTest(why);return;}recordSec(kind||'left-window',why);}
var LOCK_TAPS=0,LOCK_TAP_TIMER=null;
function lockTap(){LOCK_TAPS++;clearTimeout(LOCK_TAP_TIMER);LOCK_TAP_TIMER=setTimeout(function(){LOCK_TAPS=0;},2000);if(LOCK_TAPS>=5){LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.remove('hidden');var inp=$('unlockInp');if(inp){try{inp.focus();}catch(_){}}}}
function lockTest(reason){if(!isTestRunning())return;if(!CFG.lockOnLeave){recordSec('left-window',reason||t('lockedEvent','left window'));return;}LOCKED=true;recordSec('locked',reason||t('lockedEvent','left window'));const r=$('lockReasonBox');if(r)r.textContent=(t('lockReason','Reason')+': '+(reason||t('lockedEvent','left window')));LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.add('hidden');$('lockScreen').classList.remove('hidden');}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&isTestActive())refreshSecureTimer();
  if(!isTestRunning())return;
  if(document.visibilityState==='hidden'){ markLeftNow(); handleLeave('visibility-hidden',t('lockedEvent','left window')); }
  else if(document.visibilityState==='visible'){ var ms=awayMsSinceLeft(); if(ms!=null) recordSec('returned','',{awayMs:ms,severity:(ms>=SOFT_AWAY_MS?'hard':'soft')}); }
});
window.addEventListener('pagehide',()=>{if(isTestRunning())handleLeave('pagehide','pagehide');});
window.addEventListener('beforeunload',()=>{if(isTestRunning())recordSec('beforeunload','');});
window.addEventListener('blur',()=>{setTimeout(()=>{if(isTestRunning()&&!document.hasFocus()){markLeftNow();handleLeave('blur-away',t('lockedEvent','left window'));}},900);});
window.addEventListener('focus',()=>{ if(isTestActive())refreshSecureTimer(); if(isTestRunning()){ var ms=awayMsSinceLeft(); if(ms!=null) recordSec('returned','',{awayMs:ms,severity:(ms>=SOFT_AWAY_MS?'hard':'soft')}); } });
// ── Indikátor rozdělené obrazovky (měkký signál) ─────────────────────────────
// Split screen (test na půl displeje, vedle prohlížeč/překladač) NESPUSTÍ blur ani
// visibilitychange — okno zůstává viditelné a má fokus. Měřitelně ale ZMENŠÍ okno.
// Vzorkujeme poměr okna k displeji a sčítáme čas, kdy je okno „malé" (pod 60 % šířky
// NEBO výšky). Počítá se jen TRVÁNÍ (ne jednorázové zmenšení), takže otočení telefonu
// nebo plovoucí klávesnice signál nevyvolá. Je to MĚKKÝ signál pro učitele — nikdy zámek
// a nikdy obvinění. Cílenou snahu (rozdělení 70/30, druhé zařízení) nechytí; chytí
// nedbalé rozdělení obrazovky a dává učiteli vodítko k posouzení.
var SPLIT_RATIO=0.60;        // pod tímto poměrem k displeji bereme okno jako malé/rozdělené
var SPLIT_SAMPLE_MS=2000;    // jak často vzorkujeme
var SPLIT_MIN_RUN_MS=10000;  // souvislé „malé okno" se počítá až od ~10 s (filtr falešných poplachů)
var splitTotalMs=0, splitSmallMs=0, splitRunMs=0, splitTimer=null;
function windowIsSmall(){
  try{
    var sw=(screen&&screen.width)||0, sh=(screen&&screen.height)||0;
    var iw=window.innerWidth||0, ih=window.innerHeight||0;
    if(sw<=0||sh<=0||iw<=0||ih<=0) return false;
    return (iw/sw < SPLIT_RATIO) || (ih/sh < SPLIT_RATIO);
  }catch(_){ return false; }
}
function splitSampleTick(){
  if(!isTestRunning()||document.visibilityState!=='visible'){ splitRunMs=0; return; }
  splitTotalMs+=SPLIT_SAMPLE_MS;
  if(windowIsSmall()){
    splitRunMs+=SPLIT_SAMPLE_MS;
    if(splitRunMs>=SPLIT_MIN_RUN_MS) splitSmallMs+=SPLIT_SAMPLE_MS; // počítej až souvislý běh
  } else { splitRunMs=0; }
}
function startSplitMonitor(){ splitTotalMs=0; splitSmallMs=0; splitRunMs=0; if(splitTimer)clearInterval(splitTimer); splitTimer=setInterval(splitSampleTick,SPLIT_SAMPLE_MS); }
function stopSplitMonitor(){ if(splitTimer){clearInterval(splitTimer); splitTimer=null;} }
// Při odevzdání uložíme souhrn jako jednu událost (podíl času v malém okně).
function recordSplitSummary(){
  if(splitTotalMs<=0) return;
  var pct=Math.round((splitSmallMs/splitTotalMs)*100);
  if(splitSmallMs>0) recordSec('split-window','podil='+pct+'%',{smallMs:splitSmallMs,totalMs:splitTotalMs,pct:pct});
}
function b64UrlFromBufferLocal(buf){let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function hexFromBufferLocal(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256Text(str){const data=new TextEncoder().encode(String(str));const digest=await crypto.subtle.digest('SHA-256',data);return b64UrlFromBufferLocal(digest);}
async function sha256HexTextLocal(str){const data=new TextEncoder().encode(String(str));const digest=await crypto.subtle.digest('SHA-256',data);return hexFromBufferLocal(digest);}
async function currentStudentHtmlSha256(){
  try{
    if(!(window.crypto&&crypto.subtle&&typeof TextEncoder!=='undefined'))return '';
    const href=String(location&&location.href||'');
    if(!/^https?:/i.test(href))return '';
    const res=await fetch(href,{cache:'no-store',credentials:'same-origin'});
    if(!res||!res.ok)return '';
    const txt=await res.text();
    return await sha256HexTextLocal(txt);
  }catch(_){return '';}
}
// Stejná PBKDF2 derivace jako v generátoru — hash PINu/hesla musí sednout. Prefix
// 'pbkdf2-v1$' je součástí uložené hodnoty v CFG; tady počítáme stejně a porovnáváme.
async function deriveSecretHash(kind, secret, testId){
  const norm = (kind==='teacher-pin') ? String(secret||'').trim().toUpperCase() : String(secret||'').trim();
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)) return 'fnv$'+seedHash(kind+'|'+norm+'|'+testId).toString(36);
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(norm),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(kind+'|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);
  return 'pbkdf2-v1$'+b64UrlFromBufferLocal(bits);
}
function normLoginName(s){return String(s||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
async function tryUnlock(){const v=($('unlockInp').value||'').trim();if(!v)return;const h=await deriveSecretHash('unlock-password',v,CFG.testId);if(CFG.hesloHash&&h===CFG.hesloHash){LOCKED=false;recordSec('unlocked',t('unlocked','unlocked'));$('lockScreen').classList.add('hidden');$('unlockInp').value='';LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.add('hidden');}else{recordSec('bad-unlock','');$('lockReasonBox').textContent=t('badLogin','Incorrect login.');}}
function openTeacherModal(){const m=$('teacherModal');if(m)m.classList.remove('hidden');renderTeacherRuntimeInfo();}
function closeTeacherModal(){const m=$('teacherModal');if(m)m.classList.add('hidden');}
function teacherLogout(){const l=$('teacherLoginBox'),p=$('teacherPanel');if(l)l.classList.remove('hidden');if(p)p.classList.add('hidden');const pin=$('teacherPin');if(pin)pin.value='';}
async function teacherLogin(){const name=($('teacherName').value||'').trim();const pin=($('teacherPin').value||'').trim();const expected=normLoginName(CFG.ucitelJmeno||'');let okName=!expected||normLoginName(name)===expected;let okSecret=false;if(pin&&CFG.ucitelPinHash){const h=await deriveSecretHash('teacher-pin',pin,CFG.testId);okSecret=okSecret||h===CFG.ucitelPinHash;}if(pin&&CFG.hesloHash){const u=await deriveSecretHash('unlock-password',pin,CFG.testId);okSecret=okSecret||u===CFG.hesloHash;}if(okName&&okSecret){$('teacherErr').classList.add('hidden');$('teacherLoginBox').classList.add('hidden');$('teacherPanel').classList.remove('hidden');renderTeacherRuntimeInfo();}else{$('teacherErr').textContent=t('badLogin','Incorrect PIN, password or name.');$('teacherErr').classList.remove('hidden');}}
function renderTeacherRuntimeInfo(){const box=$('teacherRuntimeInfo');if(!box)return;box.innerHTML='<div><b>'+esc(t('teacherStatus','Test status'))+'</b></div><div>Creator ID — '+esc(CFG.creatorId||'—')+(CFG.creatorName?' · '+esc(CFG.creatorName):'')+' ('+esc(CFG.creatorRole||'trainedTeacher')+')</div><div>Generátor — v'+esc(CFG.generatorVersion||'')+' · '+esc(CFG.releaseStatus||'')+'</div><div>Test ID — '+esc(CFG.testId)+'</div><div>Manifest — '+esc(CFG.manifestHash||'')+'</div><div>Attempt ID — '+esc(ATTEMPT_ID||'—')+'</div><div>'+esc(t('student','Student'))+' — '+esc($('studentName')?$('studentName').value:'')+'</div><div>'+esc(t('group','Group'))+' — '+esc(ACTIVE_KEY)+'</div><div>'+esc(t('started','Started'))+' — '+esc(STARTED_AT||'—')+'</div><div>'+esc(t('submitted','Submitted'))+' — '+esc(SUBMITTED_AT||'—')+'</div><div>'+esc(t('teacherNoAnswers','Correct answers are only in the teacher verifier.'))+'</div>';}

function qid(ei,qi){return ei+'_'+qi;}
function respSerial(v){try{return JSON.stringify(v);}catch(e){return String(v);}}
function totalAnswerChanges(){return Object.values(ANSWER_CHANGE_STATS||{}).reduce(function(a,b){return a+(Number(b)||0);},0);}
function setResp(id,val){RESP[id]=val;var key=String(id);var ser=respSerial(val);if(LAST_RESP_SERIAL[key]!==ser){var now=Date.now();if(LAST_RESP_SERIAL[key]!==undefined){if(!LAST_CHANGE_TS[key]||now-LAST_CHANGE_TS[key]>1500)ANSWER_CHANGE_STATS[key]=(ANSWER_CHANGE_STATS[key]||0)+1;}else ANSWER_CHANGE_STATS[key]=ANSWER_CHANGE_STATS[key]||0;LAST_RESP_SERIAL[key]=ser;LAST_CHANGE_TS[key]=now;}}
function installPasteMonitor(){if(window.__pasteMonitorInstalled)return;window.__pasteMonitorInstalled=true;document.addEventListener('paste',function(e){if(!isTestRunning())return;var el=e.target;if(!el||!(/^(INPUT|TEXTAREA)$/i.test(el.tagName)))return;var txt='';try{txt=(e.clipboardData||window.clipboardData).getData('text')||'';}catch(_){txt='';}var words=(txt.trim().match(/\S+/g)||[]).length;if(txt.length>=120||words>=20){recordSec('large-paste','delka='+txt.length+', slova='+words,{qid:el.getAttribute('data-qid')||'',chars:txt.length,words:words});}});}
installPasteMonitor();
function selectChoice(id,val){setResp(id,val);document.querySelectorAll('[data-qid="'+id+'"]').forEach(b=>b.classList.toggle('selected',String(b.dataset.val)===String(val)));}
function selectEvidence(id,val){setResp(id,val);document.querySelectorAll('[data-qid="'+id+'"]').forEach(function(b){b.classList.toggle('selected',String(b.dataset.val)===String(val));});}
function updateText(id,el){setResp(id,el.value);}
function updateCloze(id){setResp(id,Array.from(document.querySelectorAll('[data-qid="'+id+'"]')).map(x=>x.value));}
function updateMatch(ei,li,val){setResp(ei+'_match_'+li,val);}
function toggleMulti(id,idx){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];var p=cur.indexOf(idx);if(p>=0)cur.splice(p,1);else cur.push(idx);cur.sort(function(a,b){return a-b;});setResp(id,cur);document.querySelectorAll('[data-qid="'+id+'"]').forEach(function(b){var v=parseInt(b.dataset.val,10);b.classList.toggle('selected',cur.indexOf(v)>=0);});}
function ordBadgeHtml(id,texts,picks){
  // picks = pole origIdx v pořadí jak je student seřadil (nebo výchozí pořadí)
  // pickOf[origIdx] = pořadová pozice (1-based) nebo 0 = ještě nezadaná
  var pickOf={};
  picks.forEach(function(origIdx,pos){ pickOf[Number(origIdx)]=pos+1; });
  return texts.map(function(txt,origIdx){
    var pos=pickOf[origIdx]||0;
    var picked=pos>0;
    return '<div class="ord-row'+(picked?' ord-picked':'')+'" onclick="clickOrd(\''+id+'\','+origIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')clickOrd(\''+id+'\','+origIdx+')">'+
      '<div class="ord-badge">'+(picked?String(pos):'')+'</div>'+
      '<span class="ord-txt">'+esc(txt!=null?txt:'')+'</span>'+
    '</div>';
  }).join('');
}
function ordTexts(id){var p=id.split('_');var it=((EXS[+p[0]]||{}).items||[])[+p[1]]||{};return Array.isArray(it.items)?it.items:[];}
function ordCurOrder(id){var texts=ordTexts(id);return Array.isArray(RESP[id])&&RESP[id].length===texts.length?RESP[id]:texts.map(function(_,i){return i;});}
function renderOrdList(id){var el=document.getElementById('ordlist_'+id);if(el)el.innerHTML=ordBadgeHtml(id,ordTexts(id),ordCurPicks(id));}
function ordCurPicks(id){
  // Vrátí pole origIdx v pořadí kliků (0 = nic, n = vše nakliknuto)
  // RESP[id] je undefined dokud student poprvé neklikne — to je validní prázdný stav
  var stored=RESP[id];
  if(Array.isArray(stored)) return stored;
  return [];
}
function clickOrd(id,origIdx){
  var texts=ordTexts(id);
  var n=texts.length;
  var picks=Array.isArray(RESP[id])&&RESP[id].length===n?RESP[id].slice():[];
  var alreadyAt=picks.indexOf(origIdx);
  if(alreadyAt>=0){
    // Zrušit výběr — odeber z picks a přečísluj
    picks.splice(alreadyAt,1);
  } else if(picks.length<n){
    // Přidat na konec
    picks.push(origIdx);
  }
  setResp(id,picks.length===n?picks:picks); // uložit průběžně
  renderOrdList(id);
}
function setBoard(id,idx,val){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];cur[idx]=val;setResp(id,cur);}
function setTable(id,r,c,val){var grid=Array.isArray(RESP[id])?RESP[id].map(function(row){return Array.isArray(row)?row.slice():[];}):[];if(!Array.isArray(grid[r]))grid[r]=[];grid[r][c]=val;setResp(id,grid);}
function setChain(id,idx,val){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];cur[idx]=val;setResp(id,cur);}
function errorTagCur(id){var cur=(RESP[id]&&typeof RESP[id]==='object'&&!Array.isArray(RESP[id]))?Object.assign({},RESP[id]):{};return cur;}
function setErrorTagToken(id,idx){var cur=errorTagCur(id);cur.token=idx;setResp(id,cur);document.querySelectorAll('[data-qid="'+id+'"].et-token').forEach(function(b){b.classList.toggle('selected',String(b.dataset.val)===String(idx));});}
function setErrorTagType(id,val){var cur=errorTagCur(id);cur.etype=val;setResp(id,cur);}
function setErrorTagCorrection(id,val){var cur=errorTagCur(id);cur.corr=val;setResp(id,cur);}
function switchExercise(i){document.querySelectorAll('.secure-tab').forEach(b=>b.classList.toggle('active',String(b.dataset.ex)===String(i)));document.querySelectorAll('.ex-panel').forEach(p=>p.classList.toggle('hidden',String(p.dataset.ex)!==String(i)));try{window.scrollTo({top:0,behavior:'smooth'});}catch(_){window.scrollTo(0,0);}}
function renderTest(){const box=$('exerciseArea');if(CFG.layout==='tabs'){const tabs='<div class="secure-tabs">'+EXS.map((ex,ei)=>'<button type="button" class="secure-tab '+(ei===0?'active':'')+'" data-ex="'+ei+'" onclick="switchExercise('+ei+')">'+esc(t('exercise','Exercise'))+' '+(ei+1)+'</button>').join('')+'</div>';const panels=EXS.map((ex,ei)=>'<div class="ex-panel '+(ei===0?'':'hidden')+'" data-ex="'+ei+'"><div class="card"><h2>'+esc(t('exercise','Exercise'))+' '+(ei+1)+': '+esc(ex.title||ex.type)+'</h2>'+renderItems(ex,ei)+'<div class="navrow">'+(ei>0?'<button type="button" class="ghost" onclick="switchExercise('+(ei-1)+')">'+esc(t('prev','Previous'))+'</button>':'')+(ei<EXS.length-1?'<button type="button" class="secondary" onclick="switchExercise('+(ei+1)+')">'+esc(t('next','Next'))+'</button>':'')+'</div></div></div>').join('');box.innerHTML=tabs+panels;}else{box.innerHTML=EXS.map((ex,ei)=>'<div class="card"><h2>'+esc(t('exercise','Exercise'))+' '+(ei+1)+': '+esc(ex.title||ex.type)+'</h2>'+renderItems(ex,ei)+'</div>').join('');}}
function rcSharedPassage(ex){if(!ex)return '';var p=ex.passage||ex.source_text||ex.text||ex.source||'';if(p&&String(p).trim())return String(p);var items=ex.items||[],first='';for(var i=0;i<items.length;i++){var ip=String((items[i]&&(items[i].passage||items[i].text||items[i].source))||'').trim();if(i===0)first=ip;else if(ip!==first)return '';}return first;}
function renderItems(ex,ei){if(ex.type==='matching'){const opts=Array.isArray(ex.match_options)?ex.match_options:[];return '<div class="src">'+esc(t('choose','choose'))+'</div>'+((ex.items||[]).map((it,li)=>'<div class="q"><div class="qhead"><b>'+(li+1)+'</b><span></span></div><div>'+esc(it.left||'')+'</div><select onchange="updateMatch('+ei+','+li+',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+opts.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select></div>').join(''));}var rcHead='',skipP=false;if(ex.type==='reading comprehension'){var sp=rcSharedPassage(ex);if(sp){rcHead='<div class="src reading-passage">'+esc(sp).replace(/\n/g,'<br>')+'</div>';skipP=true;}}return rcHead+(ex.items||[]).map((it,qi)=>renderQ(ex.type,it,ei,qi,skipP)).join('');}
function choiceBlock(id,opts){return '<div class="opts">'+(opts||[]).map((o,i)=>'<button type="button" class="opt" data-qid="'+id+'" data-val="'+i+'" onclick="selectChoice(\''+id+'\','+i+')"><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o)+'</button>').join('')+'</div>';}
function renderQ(type,it,ei,qi,skipP){const id=qid(ei,qi),pts=(EXS[ei].item_points&&EXS[ei].item_points[qi])||EXS[ei].points_each||1;let h='<div class="q"><div class="qhead"><b>'+esc(t('question','Question'))+' '+(qi+1)+'</b><span>'+pts+' '+esc((CFG.labels&&CFG.labels.points)||'b')+'</span></div>';if(type==='multiple choice')return h+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='true/false')return h+'<div>'+esc(it.statement||it.question||it.prompt||'')+'</div><div class="opts"><button type="button" class="opt" data-qid="'+id+'" data-val="true" onclick="selectChoice(\''+id+'\',true)">'+esc(t('trueTxt','True'))+'</button><button type="button" class="opt" data-qid="'+id+'" data-val="false" onclick="selectChoice(\''+id+'\',false)">'+esc(t('falseTxt','False'))+'</button></div></div>';if(type==='reading comprehension')return h+((!skipP&&it.passage)?'<div class="src">'+esc(it.passage)+'</div>':'')+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='listening comprehension')return h+'<div class="src"><b>'+esc(t('listening','Audio'))+':</b> '+esc(t('teacherAudio','The teacher will play the listening.'))+'</div><div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='dialogue completion')return h+(it.dialogue?'<div class="src">'+esc(it.dialogue).replace(/\n/g,'<br>')+'</div>':'')+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='categorization')return h+'<div>'+esc(it.text||it.item||it.prompt||'')+'</div><select onchange="setResp(\''+id+'\',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+((it.categories||[]).map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join(''))+'</select></div>';if(type==='cloze text'){const parts=String(it.text||it.passage||'').split('___');let inner='';for(let i=0;i<Math.max(1,parts.length);i++){inner+=esc(parts[i]||'');if(i<parts.length-1)inner+='<input data-qid="'+id+'" oninput="updateCloze(\''+id+'\')" placeholder="'+(i+1)+'">';}return h+'<div>'+inner+'</div></div>';}if(type==='fill-in-the-blank'){const parts=String(it.sentence||it.prompt||'').split('___');let inner='';for(let i=0;i<parts.length;i++){inner+=esc(parts[i]||'');if(i<parts.length-1)inner+='<input data-qid="'+id+'" oninput="updateCloze(\''+id+'\')" placeholder="…">';}return h+'<div>'+inner+'</div></div>';}if(type==='word order')return h+'<div>'+esc((it.words||[]).join(' / ')||it.prompt||it.sentence||'')+'</div><input oninput="updateText(\''+id+'\',this)" autocomplete="off" spellcheck="false"></div>';if(type==='multi-select'){var mso=Array.isArray(it.options)?it.options:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="ms-hint">'+esc(t('chooseAll','Vyber všechny správné možnosti (může jich být víc).'))+'</div><div class="opts">'+mso.map(function(o,i){return '<button type="button" class="opt ms-opt" role="checkbox" aria-checked="false" data-qid="'+id+'" data-val="'+i+'" onclick="toggleMulti(\''+id+'\','+i+')"><span class="ms-box" aria-hidden="true"></span><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o)+'</button>';}).join('')+'</div></div>';}if(type==='ordering'){var oTexts=Array.isArray(it.items)?it.items:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="ms-hint">'+esc(t('reorderHint','Klikej na položky v pořadí, v jakém mají jít (1., 2., 3…). Klikni znovu pro zrušení.'))+'</div><div class="ord-list" id="ordlist_'+id+'">'+ordBadgeHtml(id,Array.isArray(it.items)?it.items:[],[])+'</div></div>';}if(type==='highlight-evidence'){var hs=Array.isArray(it.sentences)?it.sentences:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="he-list">'+hs.map(function(sent,i){return '<button type="button" class="opt he-sent" data-qid="'+id+'" data-val="'+i+'" onclick="selectEvidence(\''+id+'\','+i+')"><b>'+String.fromCharCode(65+i)+'.</b> '+esc(sent)+'</button>';}).join('')+'</div></div>';}if(type==='table-completion'){var tcCols=Array.isArray(it.columns)?it.columns:[];var tcRows=Array.isArray(it.rows)?it.rows:[];var tcHead='<thead><tr>'+tcCols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead>';var tcBody='<tbody>'+tcRows.map(function(row,ri){row=Array.isArray(row)?row:[];return '<tr>'+row.map(function(cell,ci){if(cell&&typeof cell==='object'&&!Array.isArray(cell)){return '<td><input class="tc-inp" data-qid="'+id+'" oninput="setTable(\''+id+'\','+ri+','+ci+',this.value)" autocomplete="off" spellcheck="false"></td>';}return '<td><span class="tc-fixed">'+esc(cell)+'</span></td>';}).join('')+'</tr>';}).join('')+'</tbody>';return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="tc-wrap"><table class="tc-table">'+tcHead+tcBody+'</table></div></div>';}if(type==='transformation-chain'){var trs=Array.isArray(it.transformations)?it.transformations:[];return h+'<div class="trch-base">'+esc(it.base_sentence||'')+'</div><div class="trch-list">'+trs.map(function(tr,ti){return '<div class="trch-row"><div class="trch-instr">'+(ti+1)+'. '+esc(tr&&tr.instruction!=null?tr.instruction:'')+'</div><input class="trch-inp" data-qid="'+id+'" oninput="setChain(\''+id+'\','+ti+',this.value)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';}).join('')+'</div></div>';}if(type==='error-tagging'){var etoks=Array.isArray(it.tokens)?it.tokens:String(it.sentence||'').split(/\s+/).filter(Boolean);var eopts=Array.isArray(it.error_type_options)?it.error_type_options:[];return h+'<div>'+esc(it.sentence||etoks.join(' '))+'</div><div class="ms-hint">Vyber chybný token, typ chyby a napiš opravu.</div><div class="opts et-list">'+etoks.map(function(tok,i){return '<button type="button" class="opt et-token" data-qid="'+id+'" data-val="'+i+'" onclick="setErrorTagToken(\''+id+'\','+i+')">'+esc(tok)+'</button>';}).join('')+'</div><select class="cb-sel" onchange="setErrorTagType(\''+id+'\',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+eopts.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('')+'</select><input class="trch-inp" data-qid="'+id+'" oninput="setErrorTagCorrection(\''+id+'\',this.value)" placeholder="oprava" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';}if(type==='categorisation-board'){var cbCats=Array.isArray(it.categories)?it.categories:[];var cbEntries=Array.isArray(it.entries)?it.entries:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="cb-list">'+cbEntries.map(function(en,bi){return '<div class="cb-row"><span class="cb-txt">'+esc(en&&en.text!=null?en.text:'')+'</span><select class="cb-sel" onchange="setBoard(\''+id+'\','+bi+',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+cbCats.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('')+'</select></div>';}).join('')+'</div></div>';}return h+'<div>'+esc(it.prompt||it.sentence||it.question||it.source||'')+(it.keyword?' <b>('+esc(it.keyword)+')</b>':'')+'</div><input oninput="updateText(\''+id+'\',this)" autocomplete="off" spellcheck="false"></div>';}
function b64FromBytes(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function encryptPayloadForTeacher(payload){const json=JSON.stringify(payload);if(!(CFG.publicKey&&window.crypto&&crypto.subtle))throw new Error(t('cryptoFail','WebCrypto not available.'));try{const enc=new TextEncoder();const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,enc.encode(json));const raw=await crypto.subtle.exportKey('raw',aes);const pub=await crypto.subtle.importKey('jwk',CFG.publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,raw);return {mode:'encrypted',alg:'RSA-OAEP+AES-GCM',key:b64FromBytes(new Uint8Array(wrapped)),iv:b64FromBytes(iv),data:b64FromBytes(new Uint8Array(cipher))};}catch(e){throw new Error(t('encryptFail','Could not create secure answers.txt')+': '+(e&&e.message?e.message:e));}}
async function secureAnswers(){SUBMITTED_AT=new Date().toISOString();stopSplitMonitor();recordSplitSummary();const pageHash=await currentStudentHtmlSha256();return {v:1,testId:CFG.testId,manifestHash:CFG.manifestHash,studentHtmlSha256:pageHash||'',attemptId:currentAttemptId(),student:$('studentName').value.trim(),identityMode:CFG.identityMode||'name',code:(CFG.identityMode==='oneTimeCode'?$('studentName').value.trim():''),groupKey:ACTIVE_KEY,startedAt:STARTED_AT,submittedAt:SUBMITTED_AT,jokerUsed:!!JOKER_USED,jokerSelectedAt:JOKER_SELECTED_AT||'',resp:RESP,answerChangeStats:ANSWER_CHANGE_STATS,totalAnswerChanges:totalAnswerChanges(),securityEvents:SEC_EVENTS,userAgent:navigator.userAgent};}
async function submitSecureTest(){if($('test').classList.contains('hidden')||SUBMITTED)return;try{SUBMITTED=true;clearTimeout(TIMER_ID);const payload=await secureAnswers();const packed=await encryptPayloadForTeacher(payload);ANSWER_TXT='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:CFG.testId,creatorId:CFG.creatorId||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',resultMode:'secureOffline',manifestHash:CFG.manifestHash,studentHtmlSha256:payload.studentHtmlSha256||'',createdAt:new Date().toISOString(),payload:packed},null,2);setSubmittedLocked();$('answerBackup').value=ANSWER_TXT;$('test').classList.add('hidden');$('lockScreen').classList.add('hidden');$('done').classList.remove('hidden');updateJokerUi();downloadAnswers();}catch(e){SUBMITTED=false;const el=$('submitError');if(el){el.textContent=String(e&&e.message?e.message:e);el.classList.remove('hidden');}else{console.error(e);}}}
function downloadAnswers(){if(!ANSWER_TXT)return;const name=($('studentName').value.trim()||'student').replace(/[^a-z0-9_-]+/gi,'-');const att=(ATTEMPT_ID||'').replace(/[^a-z0-9_-]+/gi,'-');const blob=new Blob([ANSWER_TXT],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='answers_'+CFG.testId+'_'+name+(att?'_'+att:'')+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function shareAnswers(){if(!ANSWER_TXT)return;const name=($('studentName').value.trim()||'student').replace(/[^a-z0-9_-]+/gi,'-');const att=(ATTEMPT_ID||'').replace(/[^a-z0-9_-]+/gi,'-');try{if(navigator.share&&typeof File!=='undefined'){const file=new File([ANSWER_TXT],'answers_'+CFG.testId+'_'+name+(att?'_'+att:'')+'.txt',{type:'text/plain'});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'answers.txt'});return;}}}catch(e){}copyAnswers();}
function copyAnswers(){const ta=$('answerBackup');ta.select();try{navigator.clipboard.writeText(ta.value);}catch(_){document.execCommand('copy');}}
`;}

