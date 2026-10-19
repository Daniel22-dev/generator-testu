// Strict Mode Guard V2 start gate. This string is embedded only in secure student HTML.
// Split-screen enforcement remains SHADOW/AUDIT-ONLY; no split signal calls lockTest().
const SECURE_STRICT_MODE_RUNTIME_JS=String.raw`
function strictModeRuntime(){return String(CFG.testMode||'')==='prisny';}
function strictFullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement||null;}
function strictFullscreenRequestFunction(){var el=document.documentElement;return el&&(el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen)||null;}
function strictFullscreenSupport(){return typeof strictFullscreenRequestFunction()==='function'?'supported':'unsupported';}
function strictTeacherPreview(){
  try{return window.__GHRAB_TEACHER_PREVIEW__===true&&window.self!==window.top&&/^about:srcdoc(?:[?#]|$)/i.test(String(window.location.href||''));}
  catch(_){return false;}
}
function strictFallbackAuthorization(){
  if(strictFullscreenSupport()==='supported')return {allowed:false,reason:'element-fullscreen-api-present'};
  try{
    if(window.self!==window.top)return {allowed:false,reason:'embedded-test'};
    if(String(location.protocol||'')!=='https:')return {allowed:false,reason:'not-top-level-https'};
    var ua=String(navigator.userAgent||'');
    var inApp=/(?:; wv\)|\bWebView\b|\bFBAN\b|\bFBAV\b|\bInstagram\b|\bGSA\/|\bMicroMessenger\b|\bTikTok\b|\bLine\/)/i.test(ua);
    if(inApp||navigator.standalone===true)return {allowed:false,reason:'embedded-app-or-standalone'};
    if(/\b(?:iPhone|iPod)\b/i.test(ua)){
      if(!/AppleWebKit\/\d/i.test(ua)||!/Safari\/\d/i.test(ua))return {allowed:false,reason:'unrecognized-ios-webview'};
      return {allowed:CFG.strictIPhoneCompatibilityAllowed===true,reason:'iphone-ipod-element-fullscreen-api-missing'};
    }
    return {allowed:CFG.strictFullscreenFallbackAllowed===true,reason:'teacher-approved-element-fullscreen-api-missing'};
  }catch(_){return {allowed:false,reason:'unverified-device-context'};}
}
function strictReadyState(){
  if(!STRICT_PREFLIGHT)return 'verify';
  if(strictTeacherPreview())return 'preview-ready';
  return strictFullscreenSupport()==='supported'?'supported-ready':(strictFallbackAuthorization().allowed?'unsupported-ready':'unsupported-blocked');
}
function strictRuntimeNotice(mode,reason){
  if(mode!=='preview'&&mode!=='fallback')return;
  var test=$('test');if(!test)return;
  var note=document.createElement('div');note.id='strictRuntimeModeNotice';note.className='archive-note';
  note.style.cssText='padding:10px 14px;margin:10px auto;border:2px solid #d97706;border-radius:10px;max-width:900px;font-weight:700;';
  note.textContent=mode==='preview'
    ?'UČITELSKÝ NÁHLED — IZOLOVANÁ SIMULACE. Bez Fullscreen API, bez časového limitu a bez skutečného odevzdání.'
    :'KOMPATIBILNÍ START: Bez vynucené celé obrazovky; ostatní ochrany zůstávají. Důvod: '+String(reason||'nepodporované Fullscreen API')+'.';
  test.insertBefore(note,test.firstChild);
}
function strictStartStatus(message,kind){var box=$('strictStartStatus');if(!box)return;box.textContent=String(message||'');box.className='small '+(kind==='error'?'danger':(kind==='ok'?'ok':'muted'));}
function strictSetStartButtons(state){var verify=$('strictVerifyBtn'),fs=$('strictFullscreenStartBtn'),fallback=$('strictFallbackStartBtn');if(verify)verify.disabled=STRICT_PREFLIGHT_BUSY||STRICT_START_BUSY;if(fs)fs.classList.toggle('hidden',state!=='supported-ready');if(fallback){fallback.classList.toggle('hidden',state!=='unsupported-ready'&&state!=='preview-ready');if(strictTeacherPreview())fallback.textContent='2. Spustit simulaci náhledu';}}
function strictPreflightSignature(){return JSON.stringify({student:String($('studentName')&&$('studentName').value||'').trim(),variant:String($('studentVariant')&&$('studentVariant').value||''),joker:JOKER_CHOICE});}
function strictQueuePrestart(type,detail,extra){var ev={t:new Date().toISOString(),type:String(type),detail:String(detail||'')};if(extra&&typeof extra==='object')Object.keys(extra).forEach(function(k){ev[k]=extra[k];});STRICT_PRESTART_EVENTS.push(ev);}
function strictConsumePrestartEvents(){var out=STRICT_PRESTART_EVENTS.slice();STRICT_PRESTART_EVENTS=[];return out;}
function strictInvalidatePreflight(message){STRICT_PREFLIGHT=null;strictSetStartButtons('verify');if(message)strictStartStatus(message,'error');if(!isTestActive())releaseAttemptTabLock();}
async function strictPreflightChecks(){
  const name=(CFG.identityMode==='oneTimeCode'?$('studentName').value.replace(/\s/g,'').toUpperCase():$('studentName').value.trim());$('studentName').value=name;
  if(!name){$('studentName').focus();return null;}
  try{if(!(await identityAllowed(name))){sModal(identityCodeProblem(name)||t('invalidIdentityCode'),t('codeVerification'));$('studentName').focus();return null;}}catch(err){sModal(String(err&&err.message?err.message:err),t('codeVerification'));return null;}
  var identityHash='';try{identityHash=await activeAttemptIdentityHash(name);}catch(err){sModal(String(err&&err.message?err.message:err),t('codeVerification'));return null;}
  if(!(await unlockTestContent()))return null;
  if(await restoreSubmissionOutbox(name,identityHash))return null;
  if(await submittedLocked()){showSubmittedLocked();return null;}
  var seal=await loadActiveAttemptSeal();
  if(seal&&seal.__integrityFailure){showActiveAttemptLocked();return null;}
  if(seal&&seal.identityHash&&seal.identityHash!==identityHash){showActiveAttemptLocked();return null;}
  if(!seal&&CFG.zolicek&&JOKER_CHOICE===null){sModal(t('jokerChoiceHint','Vyber před začátkem testu, zda píšeš test, nebo bereš žolíka.'),t('jokerChoiceTitle'));return null;}
  if(!checkDevice(false))return null;
  var activeKey='';try{activeKey=await chooseVariant(name);}catch(err){sModal(String(err&&err.message?err.message:err),t('differentiatedTest'));return null;}
  if((CFG.diffGroups||[]).length&&!activeKey){sModal(t('unassignedIdentity'),t('differentiatedTest'));$('studentName').focus();return null;}
  if(seal&&seal.activeKey&&seal.activeKey!==activeKey){showActiveAttemptLocked();return null;}
  return {signature:strictPreflightSignature(),identityHash:identityHash,activeKey:activeKey,sealAttemptId:String(seal&&seal.attemptId||''),verifiedAt:Date.now()};
}
async function verifyStrictTest(){
  if(!strictModeRuntime())return startTest();if(STRICT_PREFLIGHT_BUSY||STRICT_START_BUSY||isTestActive())return;STRICT_PREFLIGHT_BUSY=true;strictSetStartButtons('verify');strictStartStatus(t('strictVerifying','Verifying test…'),'');
  try{if(!(await acquireAttemptTabLock())){sModal(t('anotherTab','Tento test je otevřený v jiné kartě. Zavři ji a pokračuj zde.'),t('activeAttemptTitle'));return;}var prepared=await strictPreflightChecks();if(!prepared){strictInvalidatePreflight();return;}STRICT_PREFLIGHT=prepared;var support=strictFullscreenSupport();if(strictTeacherPreview()){strictSetStartButtons('preview-ready');strictStartStatus('UČITELSKÝ NÁHLED — simulace bez celé obrazovky, časovače a skutečného odevzdání.','ok');}else if(support==='supported'){strictSetStartButtons('supported-ready');strictStartStatus(t('strictVerified','Test verified. Use the second button to enter fullscreen and start.'),'ok');}else if(strictFallbackAuthorization().allowed){strictSetStartButtons('unsupported-ready');strictStartStatus(t('strictUnsupportedAllowed','Fullscreen API is not supported. The teacher-authorized compatibility path is available and will be recorded.'),'error');}else{strictSetStartButtons('unsupported-blocked');strictStartStatus(t('strictUnsupportedBlocked','Fullscreen API is unavailable or compatibility is not authorized. Use an approved device or browser.'),'error');}}
  finally{STRICT_PREFLIGHT_BUSY=false;strictSetStartButtons(strictReadyState());if(!STRICT_PREFLIGHT&&!isTestActive())releaseAttemptTabLock();}
}
function strictPreflightStillValid(){return !!(STRICT_PREFLIGHT&&STRICT_PREFLIGHT.signature===strictPreflightSignature());}
function strictFullscreenRequestNow(){var el=document.documentElement,fn=strictFullscreenRequestFunction();if(typeof fn!=='function')return null;try{return Promise.resolve(fn.call(el));}catch(err){return Promise.reject(err);}}
function strictClassifyFullscreenError(_err){return strictFullscreenSupport()==='unsupported'?'unsupported':'denied';}
async function strictFinishStarted(mode,reason){STRICT_FULLSCREEN_MODE=mode;if(mode!=='preview')strictQueuePrestart(mode==='enforced'?'fullscreen-enforced':'fullscreen-fallback',mode==='enforced'?'Fullscreen API state confirmed before strict start':'Teacher-authorized compatibility: '+String(reason||'element-fullscreen-api-missing'),{fullscreenMode:mode,fallbackReason:mode==='fallback'?String(reason||'element-fullscreen-api-missing'):''});await startTestAttempt();if(isTestActive()){STRICT_PREFLIGHT=null;strictSetStartButtons('started');if(mode==='enforced'&&typeof captureStrictFullscreenBaseline==='function')captureStrictFullscreenBaseline('start');strictRuntimeNotice(mode,reason);return true;}STRICT_FULLSCREEN_MODE='none';strictInvalidatePreflight(t('strictStartFailed','The test did not start. Verify it again.'));return false;}
async function startStrictFullscreen(){
  if(!strictModeRuntime()||STRICT_START_BUSY||isTestActive())return;if(!strictPreflightStillValid()){strictInvalidatePreflight(t('strictPreflightStale','Inputs changed. Verify the test again.'));return;}var request=strictFullscreenRequestNow();if(!request){strictSetStartButtons(strictReadyState());strictStartStatus(t('strictUnsupportedBlocked','Fullscreen API is unavailable. Use the authorized compatibility path or another device.'),'error');return;}STRICT_START_BUSY=true;strictSetStartButtons('supported-ready');
  try{await request;if(!strictFullscreenElement()){await new Promise(function(resolve){setTimeout(resolve,0);});}if(!strictFullscreenElement())throw Object.assign(new Error('fullscreen state not acquired'),{name:'NotAllowedError'});STRICT_FULLSCREEN_CAPABILITY='supported';FULLSCREEN_WAS_ACTIVE=true;await strictFinishStarted('enforced');}
  catch(err){var kind=strictClassifyFullscreenError(err);if(kind==='unsupported')STRICT_FULLSCREEN_CAPABILITY='unsupported';strictQueuePrestart(kind==='unsupported'?'fullscreen-unsupported':'fullscreen-denied',kind==='unsupported'?'Fullscreen API reported unsupported':'Fullscreen request denied or failed',{fullscreenMode:kind});if(kind==='unsupported'&&strictFallbackAuthorization().allowed){strictSetStartButtons('unsupported-ready');strictStartStatus(t('strictUnsupportedAllowed','Fullscreen is unsupported. Use the separately authorized compatibility button.'),'error');}else{strictSetStartButtons(strictReadyState());strictStartStatus(kind==='unsupported'?t('strictUnsupportedBlocked','Fullscreen is unsupported and compatibility mode is not authorized.'):t('strictFullscreenDenied','Fullscreen request was denied. No attempt or timer started; retry with the same button.'),'error');}}
  finally{STRICT_START_BUSY=false;strictSetStartButtons(strictReadyState());}
}
async function startStrictFallback(){
  if(!strictModeRuntime()||STRICT_START_BUSY||isTestActive())return;
  if(!strictPreflightStillValid()){strictInvalidatePreflight(t('strictPreflightStale','Inputs changed. Verify the test again.'));return;}
  if(strictTeacherPreview()){
    STRICT_START_BUSY=true;
    try{await strictFinishStarted('preview','isolated-teacher-srcdoc');}
    finally{STRICT_START_BUSY=false;}
    return;
  }
  var decision=strictFallbackAuthorization();
  if(!decision.allowed){
    strictSetStartButtons(strictReadyState());
    strictStartStatus(t('strictFallbackDenied','Compatibility mode requires teacher permission, a top-level HTTPS browser and an absent Element Fullscreen API.'),'error');return;
  }
  STRICT_START_BUSY=true;
  strictQueuePrestart('fullscreen-unsupported','Element Fullscreen API unavailable: '+decision.reason,{fullscreenMode:'unsupported',fallbackReason:decision.reason});
  try{await strictFinishStarted('fallback',decision.reason);}
  finally{STRICT_START_BUSY=false;}
}
`;
