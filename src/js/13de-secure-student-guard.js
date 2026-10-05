// Local guard; viewport/keyboard heuristics and events remain CLIENT-CONTROLLED.
// Je to MĚKKÝ signál: druhé zařízení ani každý split-screen layout nelze odhalit.
const SECURE_STUDENT_GUARD_JS=String.raw`
var IOS_KBD_EDITABLE_AT=0,IOS_KBD_VIEWPORT_AT=0,IOS_KBD_GAP_AT=0;
function runtimeEditable(el){return !!(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable));}
// iPadOS (i s desktopovým UA) a od 7.1.88 také iPhone/iPod: stejný WebKit, stejný falešný blur při zavření softwarové klávesnice.
function isIPadOSWebKitRuntime(){try{var ua=String(navigator.userAgent||'');return /iPad|iPhone|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&Number(navigator.maxTouchPoints||0)>1);}catch(_){return false;}}
function noteIosEditable(el){if(runtimeEditable(el))IOS_KBD_EDITABLE_AT=Date.now();}
function noteIosViewport(){IOS_KBD_VIEWPORT_AT=Date.now();}
function shouldIgnoreIPadKeyboardBlur(){if(!isIPadOSWebKitRuntime()||document.visibilityState!=='visible')return false;var now=Date.now();return (now-IOS_KBD_EDITABLE_AT<2600)||(now-IOS_KBD_VIEWPORT_AT<1800);}
document.addEventListener('focusin',function(e){noteIosEditable(e.target);},true);
document.addEventListener('focusout',function(e){noteIosEditable(e.target);},true);
if(window.visualViewport&&window.visualViewport.addEventListener)window.visualViewport.addEventListener('resize',noteIosViewport);
var LEFT_AT=0,GUARD_EPOCH=0,FULLSCREEN_WAS_ACTIVE=false;
var SOFT_AWAY_MS=8000; // odchod kratší než ~8 s bereme jako měkký (běžné mobilní vyrušení)
function markLeftNow(){if(!LEFT_AT)LEFT_AT=Date.now();}
function awayMsSinceLeft(){ if(!LEFT_AT) return null; var d=Date.now()-LEFT_AT; LEFT_AT=0; return d>=0?d:null; }
function applyGuardUi(block){var test=$('test'),screen=$('lockScreen');if(test){test.inert=!!block;test.setAttribute('aria-hidden',block?'true':'false');}if(screen){screen.setAttribute('role','dialog');screen.setAttribute('aria-label',t('locked','Locked'));screen.setAttribute('aria-modal','true');screen.setAttribute('tabindex','-1');if(block){screen.classList.remove('hidden');try{screen.focus({preventScroll:true});}catch(_){}}}}
function handleLeave(kind,reason){if(window.__GHRAB_TEACHER_PREVIEW__===true)return;if(!isTestActive())return;GUARD_EPOCH++;IOS_KBD_GAP_AT=0;markLeftNow();var why=reason||t('lockedEvent','left window');recordSec(kind||'left-window',why);if(CFG.lockOnLeave&&!LOCKED)lockTest(why);}
function handleReturn(){if(!isTestActive())return;var ms=awayMsSinceLeft();if(ms!=null)recordSec('returned','',{awayMs:ms,severity:ms>=SOFT_AWAY_MS?'hard':'soft'});}
function restoreRuntimeAudit(seal){var a=seal&&seal.runtimeAudit||{};LEFT_AT=Math.max(0,Number(a.leftAt)||0);splitTotalMs=Math.max(0,Number(a.splitTotalMs)||0);splitSmallMs=Math.min(splitTotalMs,Math.max(0,Number(a.splitSmallMs)||0));splitRunMs=Math.max(0,Number(a.splitRunMs)||0);}
function runtimeAuditState(){return {leftAt:LEFT_AT,splitTotalMs:splitTotalMs,splitSmallMs:splitSmallMs,splitRunMs:splitRunMs};}
async function handlePageRestore(event){if(!isTestActive()||!event.persisted)return;LOCKED=true;applyGuardUi(true);if(!(await acquireAttemptTabLock())){blockAttemptPersistence();return;}if(await restoreSubmissionOutbox()){releaseAttemptTabLock();return;}if(await submittedLocked()){SUBMITTED=true;$('test').classList.add('hidden');showSubmittedLocked();releaseAttemptTabLock();return;}var seal=await loadActiveAttemptSeal();if(!seal||seal.__integrityFailure||seal.attemptId!==ATTEMPT_ID||seal.identityHash!==ACTIVE_IDENTITY_HASH||seal.activeKey!==ACTIVE_KEY){blockAttemptPersistence();return;}RESP=seal.resp||{};ANSWER_CHANGE_STATS=seal.answerChangeStats||{};LAST_RESP_SERIAL=seal.lastRespSerial||{};LAST_CHANGE_TS=seal.lastChangeTs||{};SEC_EVENTS=Array.isArray(seal.securityEvents)?seal.securityEvents.slice():[];restoreCriticalAudit(seal);if(seal.timerDeadline)TIMER_DEADLINE=TIMER_DEADLINE?Math.min(TIMER_DEADLINE,seal.timerDeadline):seal.timerDeadline;restoreRuntimeAudit(seal);LOCKED=!!(CFG.lockOnLeave||seal.locked);LOCK_REASON=LOCKED?'pageshow / restored page':'';restoreResponseUi();handleReturn();recordSec('page-restored','pageshow',{persisted:true});if(CFG.lockOnLeave&&!seal.locked)recordSec('locked',LOCK_REASON);applyGuardUi(LOCKED);if(!LOCKED)$('lockScreen').classList.add('hidden');refreshSecureTimer();}

var LOCK_TAPS=0,LOCK_TAP_TIMER=null;
function lockTap(){LOCK_TAPS++;clearTimeout(LOCK_TAP_TIMER);LOCK_TAP_TIMER=setTimeout(function(){LOCK_TAPS=0;},2000);if(LOCK_TAPS>=5){LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.remove('hidden');var inp=$('unlockInp');if(inp){try{inp.focus();}catch(_){}}}}
function lockTest(reason){if(!isTestRunning())return;if(!CFG.lockOnLeave){recordSec('left-window',reason||t('lockedEvent','left window'));return;}LOCKED=true;LOCK_REASON=reason||t('lockedEvent','left window');recordSec('locked',LOCK_REASON);const r=$('lockReasonBox');if(r)r.textContent=(t('lockReason','Reason')+': '+LOCK_REASON);LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.add('hidden');$('lockScreen').classList.remove('hidden');applyGuardUi(true);persistActiveAttemptSeal();}
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'&&isTestActive())handleLeave('visibility-hidden',t('lockedEvent','left window'));
  if(document.visibilityState==='visible'&&isTestActive()){handleReturn();refreshSecureTimer();}
});
window.addEventListener('pagehide',()=>{if(isTestActive())handleLeave('pagehide','pagehide');releaseAttemptTabLock();});
window.addEventListener('beforeunload',()=>{if(isTestActive())handleLeave('beforeunload','beforeunload');});
window.addEventListener('blur',()=>{if(!isTestActive())return;GUARD_EPOCH++;markLeftNow();recordSec('focus-transition','blur; pending focus check');if(LOCKED)return;setTimeout(()=>{if(typeof document==='undefined'||!document||!isTestRunning()||document.hasFocus())return;if(shouldIgnoreIPadKeyboardBlur()){LEFT_AT=0;IOS_KBD_GAP_AT=Date.now();recordSec('keyboard-dismiss-ios','iPadOS soft keyboard dismissal ignored');return;}handleLeave('blur-away',t('lockedEvent','left window'));},900);});
window.addEventListener('focus',()=>{if(isTestActive()){if(IOS_KBD_GAP_AT){var kg=Date.now()-IOS_KBD_GAP_AT;IOS_KBD_GAP_AT=0;recordSec('keyboard-focus-return','focus returned after ignored keyboard blur',{awayMs:Math.max(0,kg)});}handleReturn();refreshSecureTimer();}});
window.addEventListener('pageshow',event=>{handlePageRestore(event).catch(()=>blockAttemptPersistence());});
window.addEventListener('popstate',()=>{if(isTestActive())handleLeave('history-navigation','popstate');});
document.addEventListener('freeze',()=>{if(isTestActive())handleLeave('page-freeze','freeze');});
document.addEventListener('resume',()=>{if(isTestActive()){handleReturn();recordSec('page-resumed','resume');refreshSecureTimer();}});
// iPadOS může při otevření softwarové klávesnice ukončit režim celé obrazovky. Takový odchod se jen zapíše;
// skutečné opuštění (jiná karta/aplikace, Slide Over mimo okno klávesnice) dál hlídá visibilitychange/blur.
function keyboardFullscreenExitLikely(){return isIPadOSWebKitRuntime()&&document.visibilityState==='visible'&&(runtimeEditable(document.activeElement)||(Date.now()-IOS_KBD_EDITABLE_AT<2600));}
function monitorFullscreen(){var active=!!(document.fullscreenElement||document.webkitFullscreenElement);if(isTestActive()){recordSec(active?'fullscreen-enter':'fullscreen-exit','fullscreenchange');if(FULLSCREEN_WAS_ACTIVE&&!active){if(keyboardFullscreenExitLikely())recordSec('fullscreen-exit-keyboard-ios','fullscreen exit while editing on iOS/iPadOS; leave guards remain active');else handleLeave('fullscreen-left','fullscreen exit');}}FULLSCREEN_WAS_ACTIVE=active;}
document.addEventListener('fullscreenchange',monitorFullscreen);
document.addEventListener('webkitfullscreenchange',monitorFullscreen);
var SPLIT_RATIO=0.60;        // pod tímto poměrem k displeji bereme okno jako malé/rozdělené
var SPLIT_SAMPLE_MS=2000;    // jak často vzorkujeme
var SPLIT_MIN_RUN_MS=10000;  // souvislé „malé okno" se počítá až od ~10 s (filtr falešných poplachů)
var splitTotalMs=0, splitSmallMs=0, splitRunMs=0, splitTimer=null;
// Softwarová klávesnice zmenšuje jen VÝŠKU viditelné plochy; split screen / Split View zmenšuje ŠÍŘKU.
// Na dotykovém zařízení se proto při psaní ignoruje samotné zmenšení výšky (šířka se hodnotí vždy).
function softKeyboardLikely(){try{if(Number(navigator.maxTouchPoints||0)<1&&!isIPadOSWebKitRuntime())return false;return runtimeEditable(document.activeElement)||(Date.now()-IOS_KBD_EDITABLE_AT<2600);}catch(_){return false;}}
function deviceLandscape(iw,ih){try{var wo=Number(window.orientation);if(window.orientation!=null&&isFinite(wo))return Math.abs(wo)===90;var so=screen.orientation&&screen.orientation.type;if(so)return /landscape/i.test(so);}catch(_){}return iw>ih;}
function windowIsSmall(){
  try{
    var sw=(screen&&screen.width)||0, sh=(screen&&screen.height)||0;
    var iw=window.innerWidth||0, ih=window.innerHeight||0;
    if(sw<=0||sh<=0||iw<=0||ih<=0) return false;
    // iOS/iPadOS hlásí screen.width/height vždy na výšku — přepočti je podle skutečné orientace zařízení
    // (window.orientation / screen.orientation; tvar okna jen jako záloha, ve Split View neplatí).
    if(isIPadOSWebKitRuntime()){var land=deviceLandscape(iw,ih),lo=Math.min(sw,sh),hi=Math.max(sw,sh);sw=land?hi:lo;sh=land?lo:hi;}
    var widthSmall=iw/sw<SPLIT_RATIO, heightSmall=ih/sh<SPLIT_RATIO;
    if(heightSmall&&!widthSmall&&softKeyboardLikely()) return false;
    return widthSmall||heightSmall;
  }catch(_){ return false; }
}
function splitSampleTick(){
  if(!isTestRunning()||document.visibilityState!=='visible'){ splitRunMs=0; return; }
  splitTotalMs+=SPLIT_SAMPLE_MS;
  if(windowIsSmall()){
    splitRunMs+=SPLIT_SAMPLE_MS;
    if(splitRunMs>=SPLIT_MIN_RUN_MS) splitSmallMs+=SPLIT_SAMPLE_MS; // počítej až souvislý běh
  } else { splitRunMs=0; }
  queuePersistActiveAttemptSeal();
}
function startSplitMonitor(){ if(splitTimer)clearInterval(splitTimer); splitTimer=setInterval(splitSampleTick,SPLIT_SAMPLE_MS); }
function stopSplitMonitor(){ if(splitTimer){clearInterval(splitTimer); splitTimer=null;} }
function recordSplitSummary(){
  if(splitTotalMs<=0) return;
  var pct=Math.round((splitSmallMs/splitTotalMs)*100);
  if(splitSmallMs>0) recordSec('split-window','podil='+pct+'%',{smallMs:splitSmallMs,totalMs:splitTotalMs,pct:pct});
}
async function enterFullscreen(){try{var d=document,el=d.documentElement,fs=d.fullscreenElement||d.webkitFullscreenElement,fn=fs?(d.exitFullscreen||d.webkitExitFullscreen):(el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen);if(typeof fn!=='function')throw new Error('Fullscreen unavailable');await fn.call(fs?d:el);}catch(_){if(isTestActive())recordSec('fullscreen-unavailable','fullscreen API rejected/unavailable');sModal(t('fullscreen')+': '+t('unavailable','Unavailable'),t('fullscreen'));return false;}return true;}

function installPasteMonitor(){if(window.__pasteMonitorInstalled)return;window.__pasteMonitorInstalled=true;
  function insideTest(e){var box=$('test');return !!(box&&e.target&&box.contains(e.target));}
  function block(e,type){if(!isTestActive()||!insideTest(e)||(!LOCKED&&!CFG.lockOnLeave))return false;e.preventDefault();e.stopImmediatePropagation();var node=e.target.closest?e.target.closest('[data-qid]'):null;recordSec(type,'ordinary clipboard/drop blocked',{qid:node&&node.getAttribute('data-qid')||''});return true;}
  document.addEventListener('paste',function(e){if(block(e,'paste-blocked')||!isTestRunning()||!insideTest(e))return;var el=e.target;if(!el||!(/^(INPUT|TEXTAREA)$/i.test(el.tagName)))return;var txt='';try{txt=(e.clipboardData||window.clipboardData).getData('text')||'';}catch(_){txt='';}var words=(txt.trim().match(/\S+/g)||[]).length;if(txt.length>=120||words>=20)recordSec('large-paste','delka='+txt.length+', slova='+words,{qid:el.getAttribute('data-qid')||'',chars:txt.length,words:words});},true);
  document.addEventListener('drop',function(e){block(e,'drop-blocked');},true);
  document.addEventListener('beforeinput',function(e){if(/^(insertFromPaste|insertFromDrop)$/.test(e.inputType||''))block(e,'clipboard-input-blocked');else if(isTestActive()&&LOCKED&&insideTest(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',function(e){if(isTestActive()&&LOCKED&&insideTest(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
}
installPasteMonitor();
`;
