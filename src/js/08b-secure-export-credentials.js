// Recovery export identity stays only in this generator session.
let lastSecureRecoveryExportHash='';
let recoveryCodeEditedByTeacher=false;
const secureRecoveryExportHashes=new WeakMap();
async function recoveryExportHash(value){return await sha256HexText(normalizeCredentialInput(value));}
async function prepareSecureRecoveryExport(st){
  if((st.resultMode||'instant')!=='secureOffline'||!(st.testMode==='prisny'||st.screenGuard))return;
  const value=syncRecoveryCode();
  if(!value||!lastSecureRecoveryExportHash||await recoveryExportHash(value)!==lastSecureRecoveryExportHash)return;
  if(recoveryCodeEditedByTeacher){
    const replace=await uiConfirm('Tento Recovery kód už patří k předchozímu exportu v této relaci. Export je zablokovaný. Vygenerovat nový kód?','Nový Recovery kód');
    if(replace)replaceRecoveryCode();
    throw new Error(replace?'Nový Recovery kód je připraven. Spusť vytvoření exportu znovu.':'Použitý Recovery kód nelze zopakovat. Klikni na Vygenerovat odemykací kód třídy.');
  }
  let hash;
  do{replaceRecoveryCode();hash=await recoveryExportHash(syncRecoveryCode());}while(hash===lastSecureRecoveryExportHash);
}
async function registerSecureRecoveryExport(pkg,value){
  if(value)secureRecoveryExportHashes.set(pkg,await recoveryExportHash(value));
}
function rememberSecureRecoveryExport(pkg){
  const hash=secureRecoveryExportHashes.get(pkg);
  if(hash){lastSecureRecoveryExportHash=hash;recoveryCodeEditedByTeacher=false;}
}

function replaceRecoveryCode(){setVal('recoveryCode','');fillRecoveryCode();}
