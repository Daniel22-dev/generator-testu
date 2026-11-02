/* GIT Stage08B - teacher-private, local-session result ledger.
 * This module never touches Studio browser storage, student runtime, teacher verifier,
 * material bridge, network, telemetry or browser persistence.
 * Results from a teacher-imported CSV are explicitly NOT cryptographically verified here.
 * Future school-server backend implements the same adapter contract.
 */
const GROUP_ID = /^grp_[A-Za-z0-9-]{12,}$/;
const MEMBER_ID = /^mem_[A-Za-z0-9-]{12,}$/;
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const MAX_ROWS = 500;
const MAX_RECORDS = 10000;
const MAX_CSV_CHARS = 10_000_000;
const MAX_MAP_CHARS = 100_000;
const mappingFields = new Set(['schema','groupId','revision','testId','createdAt','entries']);
const recordFields = new Set(['schema','groupId','memberId','groupRevision','testId','attemptId','points','total','percentage','grade','classificationStatus','jokerUsed','securitySignalCount','recordedAt','source']);
const entryFields = new Set(['memberId','code']);
const archiveFields = new Set(['schema','createdAt','records']);
const REQUIRED_CSV = Object.freeze(['student_code','points','total','percentage','grade','classification_status','joker_used','attempt_id','security_signal_count']);
const ADAPTER_CONTRACT='ghrab-git-result-adapter-v1';
function err(code) {const e=new Error(code);e.code=code;return e;}
function plain(x,keys){
  return !!x && typeof x==='object' && !Array.isArray(x) && (Object.getPrototypeOf(x)===Object.prototype || Object.getPrototypeOf(x)===null) &&
    Object.keys(x).every(k=>keys.has(k));
}
function tidy(v,max=180){return typeof v==='string'&&v.length>0&&v.length<=max&& !/[\u0000-\u001f\u007f<>]/.test(v);}
function stamp(v){return typeof v==='string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));}
function numeric(v,min,max){return Number.isFinite(v)&&v>=min&&v<=max;}
function safeClone(x){return JSON.parse(JSON.stringify(x));}

export function validatePrivateMapping(input){
  if (!plain(input,mappingFields) || input.schema!=='ghrab-git-private-map-v1' ||
      !GROUP_ID.test(input.groupId||'') || !Number.isSafeInteger(input.revision)||input.revision<1||
      !tidy(input.testId,180) || !/^[A-Za-z0-9][\w.\-]{0,179}$/.test(input.testId) ||
      !stamp(input.createdAt) || !Array.isArray(input.entries) ||
      input.entries.length<1 || input.entries.length>MAX_ROWS || JSON.stringify(input).length>MAX_MAP_CHARS)
    throw err('PRIVATE_MAPPING_INVALID');
  const ids=new Set(),codes=new Set();
  for(const item of input.entries){
    if(!plain(item,entryFields)||!MEMBER_ID.test(item.memberId||'')||!CODE.test(item.code||'')||
        ids.has(item.memberId)||codes.has(item.code))throw err('PRIVATE_MAPPING_ENTRY_INVALID');
    ids.add(item.memberId);codes.add(item.code);
  }
  return safeClone(input);
}
export function createPrivateMapping({link,participants,testId,createdAt=new Date().toISOString()}){
  if(!link||!GROUP_ID.test(link.groupId||'') || !Number.isSafeInteger(link.revision)||link.revision<1 ||
      !Array.isArray(participants)||participants.length<1||participants.length>MAX_ROWS)
    throw err('PRIVATE_MAPPING_LINK_INVALID');
  // Data minimization: export only the identity needed to join verifier codes with
  // canonical group membership. Name, email, password and grades NEVER in mapping.
  const entries=participants.map(p=>({memberId:p.memberId,code:p.code}));
  return validatePrivateMapping({schema:'ghrab-git-private-map-v1',groupId:link.groupId,
    revision:link.revision,testId:String(testId||''),createdAt,entries});
}

export function parseVerifierResultsCsv(csv){
  if(typeof csv!=='string'||csv.length>MAX_CSV_CHARS||csv.length<10)throw err('VERIFIER_CSV_SIZE_INVALID');
  const source=csv.charCodeAt(0)===0xfeff?csv.slice(1):csv;
  let rows=[],row=[],cell='',quoted=false,closedQuote=false;
  for(let i=0;i<source.length;i++){
    const ch=source[i];
    if(quoted){
      if(ch==='"'&&source[i+1]==='"'){cell+='"';i++;continue;}
      if(ch==='"'){quoted=false;closedQuote=true;continue;}
      cell+=ch;if(cell.length>30000)throw err('VERIFIER_CSV_CELL_TOO_LONG');continue;
    }
    if(ch==='"'&&!cell&&!closedQuote){quoted=true;continue;}
    if(ch==='"')throw err('VERIFIER_CSV_QUOTING_INVALID');
    if(ch===';'){row.push(cell);cell='';closedQuote=false;continue;}
    if(ch==='\r'||ch==='\n'){
      if(ch==='\r'&&source[i+1]==='\n')i++;
      row.push(cell);cell='';closedQuote=false;
      if(row.some(v=>v!=='')){rows.push(row);if(rows.length>MAX_ROWS+1)throw err('VERIFIER_CSV_TOO_MANY_ROWS');}
      row=[];continue;
    }
    if(closedQuote)throw err('VERIFIER_CSV_TRAILING_GARBAGE');
    cell+=ch;if(cell.length>30000)throw err('VERIFIER_CSV_CELL_TOO_LONG');
  }
  if(quoted)throw err('VERIFIER_CSV_QUOTING_INVALID');
  if(cell||row.length){row.push(cell);if(row.some(v=>v!==''))rows.push(row);}
  if(rows.length<2)throw err('VERIFIER_CSV_EMPTY');
  const names=rows[0];
  if(names.length>90 || new Set(names).size!==names.length || REQUIRED_CSV.some(key=>!names.includes(key)))
    throw err('VERIFIER_CSV_HEADERS_INVALID');
  const ix=Object.fromEntries(REQUIRED_CSV.map(k=>[k,names.indexOf(k)]));
  const out=[],codes=new Set(),attempts=new Set();
  for(const r of rows.slice(1)){
    if(r.length!==names.length)throw err('VERIFIER_CSV_COLUMN_COUNT');
    const read=k=>r[ix[k]];
    const code=read('student_code').trim().toUpperCase();
    const attemptId=read('attempt_id').trim();
    if(!CODE.test(code)||!tidy(attemptId,180)||codes.has(code)||attempts.has(attemptId))
      throw err('VERIFIER_CSV_IDENTITY_CONFLICT');
    codes.add(code);attempts.add(attemptId);
    // Empty numeric cells must never silently coerce to zero.
    const numericCell=k=>{const v=read(k).trim();
      if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v))throw err('VERIFIER_CSV_SCORE_INVALID');
      return Number(v);
    };
    const points=numericCell('points'),total=numericCell('total'),pct=numericCell('percentage');
    const signals=numericCell('security_signal_count');
    if(!numeric(points,0,100000)||!numeric(total,0.001,100000)||points>total||
       !numeric(pct,0,100)||Math.abs(100*points/total-pct)>1.05||
       !Number.isSafeInteger(signals)||signals<0||signals>100000)throw err('VERIFIER_CSV_SCORE_INVALID');
    const grade=read('grade'),classificationStatus=read('classification_status');
    const joker=read('joker_used').trim().toUpperCase();
    if(!tidy(grade,32)||!tidy(classificationStatus,120)||!['YES','NO'].includes(joker))throw err('VERIFIER_CSV_STATUS_INVALID');
    out.push({code,attemptId,points,total,percentage:pct,grade,classificationStatus,
      jokerUsed:joker==='YES',securitySignalCount:signals});
  }
  if(!out.length)throw err('VERIFIER_CSV_EMPTY');
  return out;
}
export function validateResultRecord(input){
  if(!plain(input,recordFields)||input.schema!=='ghrab-git-result-v1'||!GROUP_ID.test(input.groupId||'')||
      !MEMBER_ID.test(input.memberId||'')||!Number.isSafeInteger(input.groupRevision)||input.groupRevision<1||
      !tidy(input.testId,180)||!tidy(input.attemptId,180)||!stamp(input.recordedAt)||
      !numeric(input.points,0,100000)||!numeric(input.total,0.001,100000)||input.points>input.total||
      !numeric(input.percentage,0,100)||Math.abs(100*input.points/input.total-input.percentage)>1.05||
      !tidy(input.grade,32)||!tidy(input.classificationStatus,120)||typeof input.jokerUsed!=='boolean'||
      !Number.isSafeInteger(input.securitySignalCount)||input.securitySignalCount<0||input.securitySignalCount>100000||
      !['teacher-acknowledged-verifier-csv','teacher-archive-import'].includes(input.source))throw err('PRIVATE_RESULT_INVALID');
  return safeClone(input);
}
export function planResultsImport({mapping,csv,recordedAt=new Date().toISOString()}){
  const verifiedMap=validatePrivateMapping(mapping);
  if(!stamp(recordedAt))throw err('PRIVATE_TIMESTAMP_INVALID');
  const rows=parseVerifierResultsCsv(csv);
  const codeToMember=new Map(verifiedMap.entries.map(r=>[r.code,r.memberId]));
  const records=rows.map(row=>{
    const memberId=codeToMember.get(row.code);
    // No implicit fuzzy name/email join: unknown or archived codes from an
    // unrelated test are a hard STOP, not a partially imported result.
    if(!memberId)throw err('VERIFIER_CSV_CODE_NOT_IN_MAPPING');
    return validateResultRecord({schema:'ghrab-git-result-v1',groupId:verifiedMap.groupId,
      memberId,groupRevision:verifiedMap.revision,testId:verifiedMap.testId,
      attemptId:row.attemptId,points:row.points,total:row.total,percentage:row.percentage,
      grade:row.grade,classificationStatus:row.classificationStatus,jokerUsed:row.jokerUsed,
      securitySignalCount:row.securitySignalCount,recordedAt,
      source:'teacher-acknowledged-verifier-csv'});
  });
  return {mapping:verifiedMap,records,codeCount:verifiedMap.entries.length,
    missingCodes:verifiedMap.entries.length-records.length};
}
function stableKey(r){return [r.groupId,r.memberId,r.testId,r.attemptId].join('|');}
function identityEqual(a,b){
  // Audit provenance timestamps are NOT part of scored content; an already
  // imported identical result is idempotent even when imported on a later day.
  const fields=['schema','groupId','memberId','groupRevision','testId','attemptId','points','total',
    'percentage','grade','classificationStatus','jokerUsed','securitySignalCount'];
  return fields.every(k=>a[k]===b[k]);
}
export function createMemoryResultAdapter(){
  const store=new Map();
  return Object.freeze({
    contract:ADAPTER_CONTRACT,kind:'ephemeral-teacher-only',
    async commitBatch(records){
      if(!Array.isArray(records)||!records.length||records.length>MAX_RECORDS)throw err('PRIVATE_BATCH_INVALID');
      const pending=new Map();let inserted=0,unchanged=0;
      for(const raw of records){
        const rec=validateResultRecord(raw),key=stableKey(rec);
        const prior=pending.get(key)||store.get(key);
        if(prior){if(!identityEqual(prior,rec))throw err('PRIVATE_ATTEMPT_CONFLICT');unchanged++;}
        else {
          // Limit applies to the WHOLE session, not only one incoming batch.
          // Refuse atomically before committing any partial import.
          if(store.size+pending.size>=MAX_RECORDS)throw err('PRIVATE_LEDGER_CAPACITY_EXCEEDED');
          pending.set(key,rec);inserted++;
        }
      }
      for(const [key,record] of pending)store.set(key,record);
      return {inserted,unchanged};
    },
    async listGroupResults(groupId){
      if(!GROUP_ID.test(groupId||''))throw err('PRIVATE_GROUP_ID_INVALID');
      return [...store.values()].filter(r=>r.groupId===groupId).map(safeClone);
    },
    async listAll(){return [...store.values()].map(safeClone);},
    async clear(){store.clear();}
  });
}
export function createResultLedger(adapter=createMemoryResultAdapter()){
  if(!adapter||adapter.contract!==ADAPTER_CONTRACT||
      typeof adapter.commitBatch!=='function'||typeof adapter.listGroupResults!=='function')throw err('PRIVATE_ADAPTER_CONTRACT_INVALID');
  return Object.freeze({
    contract:'ghrab-git-result-ledger-v1',adapterKind:adapter.kind||'external',
    async importResults({mapping,csv,teacherAcknowledged,recordedAt}){
      if(teacherAcknowledged!==true)throw err('PRIVATE_TEACHER_ACK_REQUIRED');
      const plan=planResultsImport({mapping,csv,recordedAt});
      const result=await adapter.commitBatch(plan.records);
      return {groupId:plan.mapping.groupId,testId:plan.mapping.testId,groupRevision:plan.mapping.revision,
        ...result,missingCodes:plan.missingCodes};
    },
    async listGroupResults(groupId){return adapter.listGroupResults(groupId);},
    async exportPrivateArchive(groupId){
      const records=(await adapter.listGroupResults(groupId)).map(validateResultRecord);
      return {schema:'ghrab-git-private-history-v1',createdAt:new Date().toISOString(),records};
    },
    async importPrivateArchive(archive,teacherAcknowledged){
      if(teacherAcknowledged!==true)throw err('PRIVATE_TEACHER_ACK_REQUIRED');
      if(!plain(archive,archiveFields)||archive.schema!=='ghrab-git-private-history-v1'||
         !stamp(archive.createdAt)||!Array.isArray(archive.records)||archive.records.length>MAX_RECORDS||
         JSON.stringify(archive).length>10_000_000)throw err('PRIVATE_ARCHIVE_INVALID');
      const records=archive.records.map(r=>{
        // Validate the original provenance enum before recording this import.
        // A forged / unknown source marker must not be silently overwritten.
        const original=validateResultRecord(r);
        return validateResultRecord({...original,source:'teacher-archive-import'});
      });
      if(!records.length)return {inserted:0,unchanged:0};
      // Archive import remains one transactional batch, including old archived members.
      return adapter.commitBatch(records);
    }
  });
}
