#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto, {webcrypto} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve('.'),checks=[];
function check(id,condition,detail){const status=condition?'PASS':'FAIL';checks.push({id,status,detail});console.log(`${status} ${id} - ${detail}`);}
function template(file,marker='String.raw`'){
  const source=fs.readFileSync(path.join(root,'src/js',file),'utf8'),start=source.indexOf(marker)+marker.length,end=source.lastIndexOf('`;');
  assert.ok(start>=marker.length&&end>start,`missing verifier template ${file}`);return source.slice(start,end);
}

// S07-AF01: a decrypted but rejected non-identity payload must not acquire a
// synthetic 0/0 grade. This is the same class of payload reported by the
// independent Sprint 06.2 probe; identity quarantine remains separate.
const verifier=vm.createContext({
  console,Date,JSON,Map,Set,WeakMap,TextEncoder,crypto:webcrypto,window:{TextEncoder},
  CONFIG:{testId:'T-S07',manifestHash:'H-S07',studentHtmlSha256:'',identityMode:'name',roster:[],diffGroups:[],nazev:'synthetic',proKoho:'synthetic',generatorVersion:'7.1.100'},
  RESULTS:[],VARIANTS_FULL:{__default:[]},FORMS_ANCHOR_POLICY:{schoolDomain:'example.invalid'},LAST_FORMS_IMPORT:null,ATTEMPT_DECISIONS:new Map(),
  afterResultsChanged:()=>{},renderFormsImportSummary:()=>{},vToast:()=>{}
});
for(const file of ['13ed-secure-verifier-validation.js','13ec-secure-verifier-trust.js','13ef-secure-verifier-replay.js','13eg-secure-verifier-history.js','13ea-secure-verifier-forms.js'])vm.runInContext(template(file),verifier,{filename:file});
vm.runInContext(`
  validateSecureEnvelope=function(){};
  parseTxt=function(txt){return JSON.parse(txt)};
  decryptPayload=async function(pack){return pack.payload};
  validateSecurePayload=function(){throw e3Error('schema.answers','synthetic non-identity rejection')};
  payloadBindingError=async function(){return ''};
`,verifier);
const rejectedPayload={v:1,testId:'T-S07',manifestHash:'H-S07',student:'Synthetic Student',identityMode:'name',groupKey:'__default',attemptId:'S07-REJECTED',resp:'invalid'};
verifier.__txt=JSON.stringify({testId:'T-S07',manifestHash:'H-S07',payload:rejectedPayload});
await vm.runInContext(`verifyText('rejected.txt',__txt,{source:'google-forms-csv',formIdentity:'synthetic@example.invalid',formTimestamp:'2026-10-14T08:00:00Z',formRow:2})`,verifier);
const rejected=vm.runInContext(`RESULTS[0]`,verifier);
const scoreKeys=['earned','total','pct','grade'];
check('S07-AF01-R01',rejected.status==='CHYBA'&&scoreKeys.every(key=>!Object.prototype.hasOwnProperty.call(rejected,key)),'rejected non-identity payload has no grade, points or percentage fields');
const rejectedView=vm.runInContext(`typeof verifierScoreValues==='function'?verifierScoreValues(RESULTS[0]):null`,verifier);
check('S07-AF01-R02',!!rejectedView&&rejectedView.pointsText==='—'&&rejectedView.percentText==='—'&&rejectedView.gradeText==='—','central score view renders rejected results as unscored');
vm.runInContext(`RESULTS.push({status:'OK',earned:7,total:10,pct:70,grade:'3'})`,verifier);
const validView=vm.runInContext(`typeof verifierScoreValues==='function'?verifierScoreValues(RESULTS[1]):null`,verifier);
check('S07-AF01-R03',!!validView&&validView.pointsText==='7/10'&&validView.percentText==='70 %'&&validView.gradeText==='3','central score view preserves valid scoring');

// Google Apps Script is executed in a deterministic in-memory Sheets/MailApp
// model. No network, real mailbox, or student data are used.
const appsSource=fs.readFileSync(path.join(root,'public/tools/GIT-ROZESILANI-KODU.gs'),'utf8');
const appsManual=fs.readFileSync(path.join(root,'public/manual/rozesilani-kodu.html'),'utf8');
const shell=fs.readFileSync(path.join(root,'src/shell.html'),'utf8');
const formsSource=fs.readFileSync(path.join(root,'src/js/13ea-secure-verifier-forms.js'),'utf8');
const anchorsSource=fs.readFileSync(path.join(root,'src/js/13ee-secure-verifier-anchors.js'),'utf8');
const teacherSource=fs.readFileSync(path.join(root,'src/js/13f-secure-teacher-verifier.js'),'utf8');
const geminiSource=fs.readFileSync(path.join(root,'src/js/07-gemini.js'),'utf8');
const outputWorkflow=fs.readFileSync(path.join(root,'src/js/08a-output-workflow.js'),'utf8');

function appsHarness(rows,options={}){
  const headers=['email','code','test_id','odeslat','odeslano','stav'],values=[headers.slice(),...rows.map(row=>row.slice())],formulas=values.map(row=>row.map(()=>''));
  const props=new Map([['GIT_CONFIG_17',JSON.stringify({testId:'TEST-S07',url:'https://school.example/student.html',subject:'Synthetic Sprint 07'})]]),mails=[],attempts=[],alerts=[];
  const range=(row,col)=>({
    setNumberFormat(){return this;},insertCheckboxes(){return this;},setValue(value){while(values.length<row)values.push([]);values[row-1][col-1]=value;return this;},clearContent(){values[row-1][col-1]='';return this;}
  });
  const sheet={getSheetId:()=>17,getDataRange:()=>({getValues:()=>values.map(row=>row.slice()),getFormulas:()=>formulas.map(row=>row.slice())}),getRange:range,setFrozenRows:()=>{}};
  const ui={
    ButtonSet:{OK_CANCEL:'OK_CANCEL',YES_NO:'YES_NO'},Button:{OK:'OK',CANCEL:'CANCEL',YES:'YES',NO:'NO'},
    createMenu(){return {addItem(){return this;},addSeparator(){return this;},addToUi(){return this;}};},
    alert(...args){alerts.push(args.map(String));if(args.length>=3){if(args[0]==='Potvrdit rozesílku'){options.onPreview?.({values,props});return options.previewAnswer||'YES';}return options.confirmAnswer||'YES';}return 'OK';},
    prompt(){return {getSelectedButton:()=>options.promptCancel?'CANCEL':'OK',getResponseText:()=>options.promptResponse||''};}
  };
  const ctx=vm.createContext({
    console,Date,JSON,Map,Set,Array,Object,String,Number,RegExp,Error,
    SpreadsheetApp:{getUi:()=>ui,getActiveSheet:()=>sheet,flush:()=>{}},
    PropertiesService:{getDocumentProperties:()=>({getProperty:key=>props.get(key)||null,setProperty:(key,value)=>props.set(key,String(value)),deleteProperty:key=>props.delete(key)})},
    Utilities:{DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},computeDigest:(_algo,value)=>Array.from(crypto.createHash('sha256').update(String(value)).digest())},
    LockService:{getDocumentLock:()=>({tryLock:()=>options.lockAvailable!==false,hasLock:()=>true,releaseLock:()=>{}})},
    MailApp:{getRemainingDailyQuota:()=>options.quota??100,sendEmail:message=>{attempts.push({...message});if(options.mailError)throw new Error(options.mailError);mails.push({...message});}}
  });
  vm.runInContext(appsSource,ctx,{filename:'GIT-ROZESILANI-KODU.gs'});
  return {ctx,values,props,mails,attempts,alerts,run:name=>vm.runInContext(`${name}()`,ctx),select:(dataIndex,value=true)=>{values[dataIndex+1][3]=value;}};
}
const baseRows=[
  ['a@example.invalid','A7B9C2','TEST-S07',true,'',''],
  ['b@example.invalid','K4M8P2','TEST-S07',false,'',''],
  ['c@example.invalid','R6T3W9','TEST-S07',true,'','']
];
const mailFlow=appsHarness(baseRows);mailFlow.run('gitCodesSendSelected');
check('S07-FORMS-R01',mailFlow.mails.length===2&&mailFlow.mails.map(item=>item.to).join(',')==='a@example.invalid,c@example.invalid','only checked recipients receive the first send');
check('S07-FORMS-R02',mailFlow.values[1][3]===false&&mailFlow.values[1][5]==='ODESLANO'&&mailFlow.values[2][4]===''&&mailFlow.values[3][5]==='ODESLANO','sent rows are recorded and unchecked while the unselected row is untouched');
mailFlow.select(1,true);mailFlow.run('gitCodesSendSelected');
check('S07-FORMS-R03',mailFlow.mails.length===3&&mailFlow.mails[2].to==='b@example.invalid','latecomer receives the existing code in a later explicit send');
mailFlow.select(0,true);mailFlow.run('gitCodesSendSelected');
check('S07-FORMS-R04',mailFlow.mails.length===3&&mailFlow.alerts.some(args=>args.join(' ').includes('již odesláno')),'duplicate send is blocked by persistent per-test recipient state');

const retry=appsHarness([['a@example.invalid','A7B9C2','TEST-S07',false,'2026-10-14T08:00:00Z','ODESLANO']],{promptResponse:'a@example.invalid'});
const retryKey=retry.ctx.gitCodesLogKey('TEST-S07','a@example.invalid');retry.props.set(retryKey,JSON.stringify({status:'sent'}));retry.run('gitCodesAllowRetry');retry.select(0,true);retry.run('gitCodesSendSelected');
check('S07-FORMS-R05',retry.mails.length===1&&retry.values[1][1]==='A7B9C2'&&retry.values[1][5]==='ODESLANO','deliberate resend requires a separate confirmation and preserves the original code');

const empty=appsHarness(baseRows.map(row=>[...row.slice(0,3),false,'','']));empty.run('gitCodesSendSelected');
check('S07-FORMS-R06',empty.mails.length===0&&empty.alerts.some(args=>args.join(' ').includes('Nikdo není zaškrtnut')),'empty selection sends nothing');
const duplicate=appsHarness([baseRows[0],['a@example.invalid','K4M8P2','TEST-S07',true,'','']]);duplicate.run('gitCodesSendSelected');
check('S07-FORMS-R07',duplicate.mails.length===0&&duplicate.alerts.some(args=>args.join(' ').includes('Duplicitní e-mail')),'duplicate roster identity aborts before any message');
const changed=appsHarness(baseRows,{onPreview:({values})=>{values[2][3]=true;}});changed.run('gitCodesSendSelected');
check('S07-FORMS-R08',changed.mails.length===0&&changed.alerts.some(args=>args.join(' ').includes('od náhledu změnily')),'selection mutation after preview aborts the send');
const quota=appsHarness(baseRows,{quota:1});quota.run('gitCodesSendSelected');
check('S07-FORMS-R09',quota.mails.length===0&&quota.attempts.length===0&&quota.alerts.some(args=>args.join(' ').includes('kvóta')),'insufficient quota fails atomically before the first message');
const uncertain=appsHarness([baseRows[0]],{mailError:'synthetic MailApp failure'});uncertain.run('gitCodesSendSelected');uncertain.run('gitCodesSendSelected');
check('S07-FORMS-R10',uncertain.attempts.length===1&&uncertain.values[1][5]==='ODESILANI / NEJISTE'&&String(uncertain.props.get(uncertain.ctx.gitCodesLogKey('TEST-S07','a@example.invalid'))).includes('pending'),'uncertain MailApp outcome is quarantined and never retried automatically');

check('S07-FORMS-R11',/Teprve v Sheets ve třídě zaškrtneš/.test(appsManual)&&/B přijde později/.test(appsManual)&&/Ručně povolit opakování/.test(appsManual),'teacher guide documents checked recipients, latecomers and deliberate resend');
check('S07-FORMS-R12',shell.includes('odešlou se jen zaškrtnuté, dosud neodeslané řádky')&&shell.includes('./tools/GIT-ROZESILANI-KODU.gs')&&shell.includes('./manual/rozesilani-kodu.html'),'generator links the reviewed Apps Script and complete guide at the roster workflow');

check('S07-LESSON-R01',anchorsSource.includes('Samotné otevření odkazu nic nezahájí')&&anchorsSource.includes('Stav zatím nepotvrzen — načte se z CSV.'),'START/END card never presents an opened form as a recorded marker');
check('S07-LESSON-R02',formsSource.includes('GIT-LESSON-(START|END)-V1')&&formsSource.includes("policy.teacherEmails.includes(email)")&&formsSource.includes('markers.sort'),'lesson state is derived from submitted CSV markers, an allowed teacher and chronology');
check('S07-LESSON-R03',anchorsSource.includes("window.open(link,'_blank','noopener,noreferrer')")&&!/function openFormsLesson\([^)]*\)[\s\S]{0,500}(FORMS_LESSON_WINDOWS\s*=|\.push\()/.test(anchorsSource),'opening a START/END link cannot mutate the verified lesson-window state');

check('S07-UX-R01',shell.includes('id="genProgressMsg" role="status" aria-live="polite"')&&!/id="genProgress"[^>]*aria-valuenow/.test(shell),'AI generation exposes an indeterminate accessible status, not invented percentages');
check('S07-UX-R02',geminiSource.includes("function setGenMsg(msg) { const el = $('genProgressMsg'); if (el) el.textContent = msg; }")&&outputWorkflow.includes('Jde o pl\\u00e1n, nikoli z\\u00e1ruku v\\u00fdsledku AI.'),'AI status reflects actual operations and estimates are explicitly labelled as plans');
check('S07-UX-R03',geminiSource.includes('Kontrolní otisky souborů')&&teacherSource.includes('Náhled testu pro učitele')&&shell.includes('data-result-step="1"'),'teacher workflow retains preview, integrity and step-oriented controls');
check('S07-UX-R04',shell.includes('field-hint')&&shell.includes('preset-card-emoji')&&shell.includes('aria-label'),'settings retain explanatory hints, icons and accessible labels');

// The archival surfaces must use the same score policy as the live table.
check('S07-AF01-R04',teacherSource.includes('verifierScoreValues(r)'),'teacher table and archival exports use the central scored/unscored projection');
check('S07-AF01-R05',!formsSource.includes("earned:0,total:0,pct:0,grade:'?'"),'CSV and payload rejection paths do not construct fake zero scores');

const failed=checks.filter(item=>item.status!=='PASS'),evidence={schema:'git-s7-teacher-workflow-source-v1',status:failed.length?'FAIL':'PASS',checks};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});fs.writeFileSync(path.join(root,'qa-results/s7-teacher-workflow-source.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));assert.equal(failed.length,0,`${failed.length} Sprint 07 source checks failed`);
