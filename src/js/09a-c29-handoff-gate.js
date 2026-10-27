// C29 keeps the lesson handoff synchronized with existing gate and generation state
// without changing either authority. These wrappers only refresh the derived UI.
const c29UpdateSecureDownloadGate=updateSecureDownloadGate;
updateSecureDownloadGate=function(){
  const result=c29UpdateSecureDownloadGate.apply(this,arguments);
  if(typeof renderStartCode==='function')renderStartCode();
  return result;
};
const c29SetGenUI=setGenUI;
setGenUI=function(mode){
  const result=c29SetGenUI.apply(this,arguments);
  if(mode==='loading'&&typeof renderStartCode==='function')renderStartCode();
  return result;
};
