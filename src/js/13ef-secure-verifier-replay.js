// Canonical decrypted digests detect re-encryption; one working set spans CSV imports.
const SECURE_VERIFIER_REPLAY_JS=String.raw`
// Private owner workstation only. These observations are never an authenticity
// proof and contain no answer key, roster, ciphertext or trusted score.
let VERIFIER_REPLAY_HISTORY=[],VERIFIER_REPLAY_CHAIN=Promise.resolve();
function verifierReplayStorageKey(){return 'git-verifier-replay-v1_'+CONFIG.testId+'_'+CONFIG.manifestHash;}
function readVerifierReplayHistory(){
  const raw=localStorage.getItem(verifierReplayStorageKey());if(raw===null)return [];
  e3Require(raw.length<=2097152,'replay.storage-size','Soukromá replay evidence překročila limit.');
  const data=e3Json(raw,'replay.storage');
  e3Require(data&&data.v===1&&data.testId===CONFIG.testId&&data.manifestHash===CONFIG.manifestHash&&Object.keys(data).length===4&&Array.isArray(data.records)&&data.records.length<=5000,'replay.storage-shape','Poškozená nebo cizí soukromá replay evidence.');
  const seen=new Set();for(const r of data.records){e3Require(r&&Object.keys(r).length===4&&['semanticDigest','submissionDigest','identityDigest'].every(k=>typeof r[k]==='string'&&/^[a-f0-9]{64}$/.test(r[k]))&&typeof r.attemptId==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(r.attemptId)&&!seen.has(r.semanticDigest),'replay.storage-record','Neplatný záznam soukromé replay evidence.');seen.add(r.semanticDigest);}return data.records;
}
async function observeVerifierReplay(payload,semanticDigest,submissionDigest){
  const identityDigest=await sha256HexText(normStudentKey(payload.student));
  const job=async()=>{const history=readVerifierReplayHistory(),prior=history.find(r=>r.semanticDigest===semanticDigest);
    if(prior)e3Require(prior.identityDigest===identityDigest&&prior.attemptId===payload.attemptId,'replay.storage-binding','Replay evidence má jinou vazbu identity/pokusu.');
    else{e3Require(history.length<5000,'replay.storage-full','Soukromá replay evidence je plná; import zastaven.');history.push({semanticDigest,submissionDigest,identityDigest,attemptId:payload.attemptId});}
    const value=JSON.stringify({v:1,testId:CONFIG.testId,manifestHash:CONFIG.manifestHash,records:history});localStorage.setItem(verifierReplayStorageKey(),value);e3Require(localStorage.getItem(verifierReplayStorageKey())===value,'replay.storage-write','Replay evidenci nelze trvale uložit.');VERIFIER_REPLAY_HISTORY=history;return {identityDigest,known:!!prior};};
  const run=()=>navigator.locks&&navigator.locks.request?navigator.locks.request(verifierReplayStorageKey(),job):job();
  const pending=VERIFIER_REPLAY_CHAIN.then(run,run);VERIFIER_REPLAY_CHAIN=pending.catch(()=>{});try{return await pending;}catch(error){if(error.validationCode)throw error;throw e3Error('replay.storage-unavailable','Soukromá replay evidence není dostupná: '+String(error&&error.message||error));}
}
function normStudentKey(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function rebuildDuplicateState(){
  const firstByDigest=new Map(),byStudent=new Map(),byAttempt=new Map();
  RESULTS.forEach((r,i)=>{
    if(r.status!=='OK')return;
    r.exactDuplicate=false;r.exactDuplicateOf=-1;r.attemptConflict=false;r.hardReplayConflict=false;r.replayStatus='CLEAR';
    const digest=String(r.semanticDigest||r.submissionDigest||'');
    if(digest&&firstByDigest.has(digest)){const first=firstByDigest.get(digest);r.exactDuplicate=true;r.exactDuplicateOf=first;r.replayStatus=r.submissionDigest===RESULTS[first].submissionDigest?'EXACT_DUPLICATE':'SEMANTIC_DUPLICATE';}
    else if(digest)firstByDigest.set(digest,i);
    if(r.semanticDigest&&r.replayIdentityDigest&&typeof VERIFIER_REPLAY_HISTORY!=='undefined'&&VERIFIER_REPLAY_HISTORY.some(h=>h.semanticDigest!==r.semanticDigest&&(h.identityDigest===r.replayIdentityDigest||h.attemptId===r.attemptId))){r.hardReplayConflict=true;r.attemptConflict=true;r.replayStatus='PERSISTED_REPLAY_CONFLICT';}
    const sk=normStudentKey(r.student);if(sk&&!r.exactDuplicate){if(!byStudent.has(sk))byStudent.set(sk,[]);byStudent.get(sk).push(i);}
    const ak=String(r.attemptId||'');if(ak&&!r.exactDuplicate){if(!byAttempt.has(ak))byAttempt.set(ak,[]);byAttempt.get(ak).push(i);}
  });
  for(const rows of byStudent.values())if(rows.length>1){const strict=rows.some(i=>!!RESULTS[i].semanticDigest);for(const i of rows){RESULTS[i].attemptConflict=true;if(strict){RESULTS[i].hardReplayConflict=true;RESULTS[i].replayStatus='IDENTITY_REPLAY';}}}
  for(const rows of byAttempt.values())if(rows.length>1&&rows.some(i=>RESULTS[i].semanticDigest))for(const i of rows){RESULTS[i].hardReplayConflict=true;RESULTS[i].attemptConflict=true;RESULTS[i].replayStatus='ATTEMPT_CONFLICT';}
}
function duplicateInfo(){rebuildDuplicateState();const byStudent={},byAttempt={},byDigest={};let exactDuplicateCount=0;RESULTS.forEach((r,i)=>{if(r.status!=='OK')return;const sk=normStudentKey(r.student);if(sk)(byStudent[sk]||(byStudent[sk]=[])).push(i);const ak=String(r.attemptId||'').trim();if(ak)(byAttempt[ak]||(byAttempt[ak]=[])).push(i);const d=String(r.semanticDigest||r.submissionDigest||'');if(d)(byDigest[d]||(byDigest[d]=[])).push(i);if(r.exactDuplicate)exactDuplicateCount++;});const dupStudentKeys=Object.keys(byStudent).filter(k=>byStudent[k].length>1);const dupAttemptKeys=Object.keys(byAttempt).filter(k=>byAttempt[k].length>1);const conflictStudentKeys=Object.keys(byStudent).filter(k=>byStudent[k].some(i=>RESULTS[i].attemptConflict));return {byStudent,byAttempt,byDigest,dupStudentKeys,dupAttemptKeys,conflictStudentKeys,exactDuplicateCount};}
function chooseAttemptByDigest(digest){const r=RESULTS.find(x=>x.status==='OK'&&!x.exactDuplicate&&!x.hardReplayConflict&&x.submissionDigest===digest);if(!r)return;ATTEMPT_DECISIONS.set(normStudentKey(r.student),digest);afterResultsChanged();vToast('Pro studenta '+displayStudent(r)+' byl zvolen tento pokus.','ok');}
function resolvedResults(){rebuildDuplicateState();return RESULTS.filter(r=>{if(r.status!=='OK'||r.exactDuplicate||r.hardReplayConflict)return false;const sk=normStudentKey(r.student);if(!r.attemptConflict)return true;return ATTEMPT_DECISIONS.get(sk)===r.submissionDigest;});}
function effectiveResults(){return resolvedResults().filter(r=>!r.jokerUsed);}
function unresolvedAttemptConflicts(){const info=duplicateInfo();return info.conflictStudentKeys.filter(sk=>info.byStudent[sk].some(i=>!RESULTS[i].hardReplayConflict&&!RESULTS[i].exactDuplicate)&&!ATTEMPT_DECISIONS.has(sk));}
function duplicateWarningsFor(r,info){if(!r||r.status!=='OK')return [];info=info||duplicateInfo();const out=[];if(r.replayStatus&&r.replayStatus!=='CLEAR')out.push('ODMÍTNUTO: '+r.replayStatus);const sk=normStudentKey(r.student);if(sk&&info.byStudent[sk]&&info.byStudent[sk].length>1)out.push('duplicitní jméno/kód '+info.byStudent[sk].length+'×');const ak=String(r.attemptId||'').trim();if(ak&&info.byAttempt[ak]&&info.byAttempt[ak].length>1)out.push('duplicitní ID pokusu');return out;}
`;
