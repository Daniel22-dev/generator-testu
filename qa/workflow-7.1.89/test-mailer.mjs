import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const file=process.argv[2]||new URL('../../public/tools/GIT-ROZESILANI-KODU.gs',import.meta.url);
const source=fs.readFileSync(file,'utf8');const results=[];
function fixture(){
 const env={matrix:[['email','student','code','test_id','odeslat','odeslano','stav'],['a@example.invalid','A','AAAAAA','TEST-123',false,'',''],['b@example.invalid','B','BBBBBB','TEST-123',false,'',''],['c@example.invalid','C','CCCCCC','TEST-123',false,'','']],formulas:[],messages:[],alerts:[],props:new Map(),quota:100,busy:false,prompts:[],confirm:true};
 const clone=v=>JSON.parse(JSON.stringify(v));
 const range=(r,c,n=1,m=1)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>env.matrix[r+i-1]?.[c+j-1]??'')),getFormulas:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>env.formulas[r+i-1]?.[c+j-1]??'')),setValue:v=>{env.matrix[r-1]??=[];env.matrix[r-1][c-1]=v;return range(r,c,n,m);},insertCheckboxes:()=>range(r,c,n,m),setNumberFormat:()=>range(r,c,n,m),clearContent:()=>range(r,c).setValue('')});
 const sheet={getSheetId:()=>12,getDataRange:()=>range(1,1,env.matrix.length,env.matrix[0].length),getRange:range,setFrozenRows:()=>{}};
 const menu={addItem(){return this},addSeparator(){return this},addToUi(){}};
 const ui={ButtonSet:{YES_NO:'YES_NO',OK_CANCEL:'OK_CANCEL'},Button:{YES:'YES',NO:'NO',OK:'OK',CANCEL:'CANCEL'},createMenu:()=>menu,alert:(...args)=>{env.alerts.push(args);if(args[2]==='YES_NO'){if(env.onConfirm)env.onConfirm();return env.confirm?'YES':'NO';}},prompt:()=>{const value=env.prompts.shift();return {getSelectedButton:()=>value===null?'CANCEL':'OK',getResponseText:()=>value||''};}};
 const properties={getProperty:k=>env.props.get(k)||null,setProperty:(k,v)=>{env.props.set(k,String(v));return properties;},deleteProperty:k=>env.props.delete(k)};
 const context={console,Date,Map,Set,Array,JSON,Error,SpreadsheetApp:{getUi:()=>ui,getActiveSheet:()=>sheet,flush:()=>{}},PropertiesService:{getDocumentProperties:()=>properties},LockService:{getDocumentLock:()=>({tryLock:()=>!env.busy,hasLock:()=>!env.busy,releaseLock:()=>{}})},MailApp:{getRemainingDailyQuota:()=>env.quota,sendEmail:m=>{if(env.sendFailure)throw new Error('SYNTHETIC DELIVERY UNKNOWN');env.messages.push(clone(m));if(env.afterSend)env.afterSend();}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,value)=>Array.from(crypto.createHash('sha256').update(value).digest())}};
 vm.createContext(context);vm.runInContext(source,context);env.api=context;
 env.props.set('GIT_CONFIG_12',JSON.stringify({testId:'TEST-123',url:'https://school.example/test.html',subject:'Synthetic test'}));
 return env;
}
function test(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
function recipients(e){return e.messages.map(m=>m.to);}
test('Menu never sends mail',()=>{let e=fixture();e.api.onOpen();assert.equal(e.messages.length,0);});
test('No checkbox selection sends nobody',()=>{let e=fixture();e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Only B receives own code; no cc/bcc/other codes',()=>{let e=fixture();e.matrix[2][4]=true;e.api.gitCodesSendSelected();assert.deepEqual(recipients(e),['b@example.invalid']);assert(e.messages[0].body.includes('BBBBBB'));assert(!e.messages[0].body.includes('AAAAAA'));assert(!('cc' in e.messages[0]));assert(!('bcc' in e.messages[0]));assert.equal(e.matrix[2][4],false);});
test('Repeated click does not resend',()=>{let e=fixture();e.matrix[2][4]=true;e.api.gitCodesSendSelected();e.api.gitCodesSendSelected();assert.equal(e.messages.length,1);});
test('Late arrival C alone; existing codes unchanged',()=>{let e=fixture();e.matrix[1][4]=true;e.api.gitCodesSendSelected();e.matrix[3][4]=true;e.api.gitCodesSendSelected();assert.deepEqual(recipients(e),['a@example.invalid','c@example.invalid']);assert.deepEqual(e.matrix.slice(1).map(r=>r[2]),['AAAAAA','BBBBBB','CCCCCC']);});
test('FALSE string is never selected',()=>{let e=fixture();e.matrix[1][4]='FALSE';e.matrix[2][4]='TRUE';e.api.gitCodesSendSelected();assert.deepEqual(recipients(e),['b@example.invalid']);});
test('Cancelled confirmation sends nobody',()=>{let e=fixture();e.matrix[1][4]=true;e.confirm=false;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Selection changed during confirmation aborts',()=>{let e=fixture();e.matrix[1][4]=true;e.onConfirm=()=>{e.matrix[1][4]=false;e.matrix[2][4]=true;};e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Code changed during confirmation aborts',()=>{let e=fixture();e.matrix[1][4]=true;e.onConfirm=()=>e.matrix[1][2]='ZZZZZZ';e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Editing recipient during batch stops remainder',()=>{let e=fixture();e.matrix[1][4]=e.matrix[2][4]=true;e.afterSend=()=>e.matrix[2][0]='changed@example.invalid';e.api.gitCodesSendSelected();assert.deepEqual(recipients(e),['a@example.invalid']);});
test('Quota failure sends nobody',()=>{let e=fixture();e.matrix[1][4]=true;e.quota=0;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Lock busy sends nobody',()=>{let e=fixture();e.matrix[1][4]=true;e.busy=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Duplicate email is rejected',()=>{let e=fixture();e.matrix[2][0]=e.matrix[1][0];e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Duplicate code is rejected',()=>{let e=fixture();e.matrix[2][2]=e.matrix[1][2];e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Address list injection is rejected',()=>{let e=fixture();e.matrix[1][0]='a@example.invalid,b@example.invalid';e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Newline address injection is rejected',()=>{let e=fixture();e.matrix[1][0]='a@example.invalid\nBcc:bad@example.invalid';e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Formula in routing cell is rejected',()=>{let e=fixture();e.formulas[1]=['=IMPORTDATA("x")'];e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Mixed test IDs rejected',()=>{let e=fixture();e.matrix[3][3]='OTHER-TEST';e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Unknown send outcome retained; no automatic retry',()=>{let e=fixture();e.matrix[1][4]=true;e.sendFailure=true;e.api.gitCodesSendSelected();const key=e.api.gitCodesLogKey('TEST-123','a@example.invalid');assert.equal(JSON.parse(e.props.get(key)).status,'pending');e.sendFailure=false;e.api.gitCodesSendSelected();assert.equal(e.messages.length,0);});
test('Clearing visible sent status cannot bypass journal',()=>{let e=fixture();e.matrix[1][4]=true;e.api.gitCodesSendSelected();e.matrix[1][4]=true;e.matrix[1][5]=e.matrix[1][6]='';e.api.gitCodesSendSelected();assert.equal(e.messages.length,1);});
test('Explicit manual retry never changes code or sends on its own',()=>{let e=fixture();e.matrix[1][4]=true;e.api.gitCodesSendSelected();e.prompts=['a@example.invalid'];e.api.gitCodesAllowRetry();assert.equal(e.messages.length,1);assert.equal(e.matrix[1][2],'AAAAAA');e.matrix[1][4]=true;e.api.gitCodesSendSelected();assert.equal(e.messages.length,2);});
test('Column order is resolved by header name',()=>{let e=fixture();e.matrix=e.matrix.map(r=>[r[2],r[0],r[1],...r.slice(3)]);e.matrix[2][4]=true;e.api.gitCodesSendSelected();assert.deepEqual(recipients(e),['b@example.invalid']);});
test('Setup retains FALSE selections and sends nothing',()=>{let e=fixture();e.props.clear();e.prompts=['TEST-123','https://school.example/test.html','Synthetic test'];e.api.gitCodesSetup();assert.equal(e.messages.length,0);assert(e.matrix.slice(1).every(r=>r[4]===false));assert(e.props.has('GIT_CONFIG_12'));});
test('Private verifier link rejected',()=>{let e=fixture();assert.throws(()=>e.api.gitCodesHttps('https://school.example/DO_NOT_SEND_TEACHER_VERIFIER.html'));});
console.log(JSON.stringify({scope:'Node VM, fake Sheets/MailApp only; zero real messages',passed:results.filter(r=>r.status==='PASS').length,total:results.length,results},null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
