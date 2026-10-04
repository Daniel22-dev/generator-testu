// Private observations never grant runtime authenticity or automatic classification.
const SECURE_VERIFIER_TRUST_JS=String.raw`
const PRIVATE_SUBMISSION_TRUST=new WeakMap();
function isScoredResult(r){return !!r&&(r.status==='OK'||r.status==='DIAGNOSTIC_ONLY');}
function submissionTrust(payload,source,anchors){
  const hasEvents=Object.prototype.hasOwnProperty.call(payload,'securityEvents'),events=Array.isArray(payload.securityEvents)?payload.securityEvents:null;
  const claimed=String(payload.studentHtmlSha256||''),expected=String(CONFIG.studentHtmlSha256||'');
  return Object.freeze({
    schema:'git-submission-trust-v1',encryption:'DECRYPTED_NOT_AUTHENTICATED',buildBinding:'CHECKED_AGAINST_PRIVATE_VERIFIER',scoreSource:'TEACHER_ANSWER_KEY',runtimeAuthenticity:'CLIENT-CONTROLLED',
    clientHtmlHash:!claimed?'MISSING':(!expected?'NO_REFERENCE':(claimed===expected?'CLAIM_MATCHES_REFERENCE':'CLAIM_MISMATCH')),
    clientTelemetry:!hasEvents?'MISSING':(!events?'INVALID_SHAPE':(events.length?'PRESENT_UNVERIFIED':'EMPTY')),clientTimes:'CLIENT-CONTROLLED',
    externalIdentity:anchors?anchors.identity:'NOT_VALIDATED',externalTimeWindow:anchors?anchors.timeWindow:'NOT_VALIDATED',
    externalSource:source.submissionSource==='google-forms-csv'?'TEACHER_IMPORTED_FORMS_CSV':'NO_FORMS_ANCHORS',
    classificationAuthorization:anchors&&anchors.diagnosticOnly?'DIAGNOSTIC_ONLY':'REVIEW_REQUIRED'
  });
}
function resultTrust(r){
  if(!isScoredResult(r))return {schema:'git-submission-trust-v1',encryption:'NOT_VERIFIED',buildBinding:'NOT_VERIFIED',scoreSource:'NOT_SCORED',runtimeAuthenticity:'CLIENT-CONTROLLED',clientHtmlHash:'NOT_EVALUATED',clientTelemetry:'NOT_EVALUATED',clientTimes:'CLIENT-CONTROLLED',externalIdentity:'NOT_VALIDATED',externalTimeWindow:'NOT_VALIDATED',externalSource:r&&r.submissionSource==='google-forms-csv'?'TEACHER_IMPORTED_FORMS_CSV':'NO_FORMS_ANCHORS',classificationAuthorization:'REJECTED'};
  // Serialized rows and caller-supplied trusted bits cannot restore private observations.
  const measured=PRIVATE_SUBMISSION_TRUST.get(r);
  const fixed=submissionTrust({securityEvents:r.securityEvents,studentHtmlSha256:r.answerStudentHtmlSha256},r||{});
  return Object.assign({},fixed,measured||{},{classificationAuthorization:classificationStatus(r)});
}
function classificationStatus(r){return !isScoredResult(r)||r.exactDuplicate||r.hardReplayConflict?'REJECTED':(r.status==='DIAGNOSTIC_ONLY'?'DIAGNOSTIC_ONLY':(r.jokerUsed?'JOKER_EXCLUDED':'REVIEW_REQUIRED'));}
function trustNoticeText(){return 'Přepočet odpovědí neprokazuje původ výsledku. Hash HTML, časy a události uvádí studentův prohlížeč. Shoda hashe ani úspěšné dešifrování neprokazuje běh původního testu. Forms kotvy se kontrolují podle soukromého rosteru, potvrzeného nastavení a času publikace; ani jejich shoda neprokazuje původ runtime. Záloha bez Forms je pouze diagnostická.';}
function trustNoticeHtml(){return '<div class="warn verifier-trust-notice"><b>Původ výsledku není prokázán.</b> '+esc(trustNoticeText())+'</div>';}
function resultStateText(r){return !isScoredResult(r)?String(r&&r.error||'Odmítnuto'):(r.exactDuplicate||r.hardReplayConflict?'ODMÍTNUTO — '+String(r.replayStatus||'REPLAY')+'; PŮVOD NEPROKÁZÁN':(r.status==='DIAGNOSTIC_ONLY'?'DIAGNOSTICKÁ ZÁLOHA — MIMO KLASIFIKACI; PŮVOD NEPROKÁZÁN':'OPRAVENO — PŮVOD NEPROKÁZÁN; vyžaduje kontrolu'));}
function trustCsvHeaders(){return ['runtime_authenticity','client_html_hash_status','client_telemetry_status','client_times_trust','external_identity_status','external_time_window_status','score_source','classification_authorization'];}
function trustCsvValues(r){const t=resultTrust(r);return [t.runtimeAuthenticity,t.clientHtmlHash,t.clientTelemetry,t.clientTimes,t.externalIdentity,t.externalTimeWindow,t.scoreSource,classificationStatus(r)];}
function archiveTrustContract(){return {schema:'git-archive-trust-v1',statusSemantics:'OK means schema/build/Forms anchors checked and privately scored; DIAGNOSTIC_ONLY has no Forms anchors. Neither means runtime authenticated or classification authorized.',scoreSource:'TEACHER_ANSWER_KEY',runtimeAuthenticity:'CLIENT-CONTROLLED',externalIdentity:'PER_RESULT_PRIVATE_OBSERVATION',externalTimeWindow:'PER_RESULT_PRIVATE_OBSERVATION',classificationAuthorization:'REVIEW_REQUIRED',notice:trustNoticeText()};}
`;
