// Validate decrypted client data before any scoring. This is not runtime attestation.
const SECURE_VERIFIER_VALIDATION_JS=String.raw`
const E3_MAX_TXT=2*1024*1024;
function e3Error(code,message){const error=new Error(message);error.validationCode=code;return error;}
function e3Require(ok,code,message){if(!ok)throw e3Error(code,message);}
function e3Object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
function e3String(x,max){return typeof x==='string'&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);}
function e3SafeTree(x,depth=0,budget={n:0}){
  e3Require(depth<=12&&++budget.n<=50000,'schema.limit','Payload překračuje limit hloubky nebo počtu hodnot.');
  if(x&&typeof x==='object')for(const key of Object.keys(x)){
    e3Require(!['__proto__','prototype','constructor'].includes(key),'schema.prototype','Zakázané strukturální pole: '+key+'.');
    e3SafeTree(x[key],depth+1,budget);
  }
}
function e3Json(text){
  e3Require(typeof text==='string'&&text.length<=E3_MAX_TXT,'schema.size','JSON překračuje velikostní limit.');
  const value=JSON.parse(text),stack=[];let i=0;
  while(i<text.length){const ch=text[i];
    if(ch==='"'){const begin=i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')break;}
      let next=i;while(/\s/.test(text[next]||'')&&next<text.length)next++;
      if(text[next]===':'){const key=JSON.parse(text.slice(begin,i)),keys=stack[stack.length-1];e3Require(keys instanceof Set&&!keys.has(key),'schema.duplicate-key','Duplicitní JSON pole: '+key+'.');keys.add(key);}continue;
    }
    if(ch==='{')stack.push(new Set());else if(ch==='[')stack.push(null);else if(ch==='}'||ch===']')stack.pop();i++;
  }
  e3SafeTree(value);return value;
}
function e3Iso(value){
  if(typeof value!=='string')return NaN;
  const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/);
  if(!m)return NaN;
  const [y,mo,d,h,mi,s]=m.slice(1,7).map(Number),ms=Number((m[7]||'').padEnd(3,'0'));
  if(y<2000||y>2200||mo<1||mo>12||d<1||h>23||mi>59||s>59)return NaN;
  const raw=Date.UTC(y,mo-1,d,h,mi,s,ms),date=new Date(raw);
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==mo-1||date.getUTCDate()!==d)return NaN;
  const offset=m[8]==='Z'?0:Number(m[8].slice(1,3))*60+Number(m[8].slice(4));
  if(offset>840||Number(m[8].slice(4))>59)return NaN;
  return raw-(m[8][0]==='-'?-offset:offset)*60000;
}
function validateSecureEnvelope(pack){
  e3Require(e3Object(pack),'envelope.shape','Obal výsledku musí být objekt.');e3SafeTree(pack);
  e3Require(e3String(pack.testId,180)&&pack.testId&&e3String(pack.manifestHash,180)&&pack.manifestHash,'envelope.binding','Obal nemá Test ID nebo manifest.');
  e3Require(Object.keys(pack).every(k=>['testId','manifestHash','studentHtmlSha256','payload','creatorId','generatorVersion','buildStatus','resultMode','createdAt'].includes(k)),'envelope.fields','Nepodporovaná pole obalu.');
  e3Require(pack.studentHtmlSha256===undefined||pack.studentHtmlSha256===''||typeof pack.studentHtmlSha256==='string'&&/^[a-f0-9]{64}$/.test(pack.studentHtmlSha256),'envelope.hash','Neplatný hash obalu.');
  for(const k of ['creatorId','generatorVersion','buildStatus','resultMode','createdAt'])if(pack[k]!==undefined)e3Require(e3String(pack[k],180),'envelope.metadata','Neplatná metadata obalu.');
  const p=pack.payload;e3Require(e3Object(p)&&p.mode==='encrypted'&&p.alg==='RSA-OAEP+AES-GCM','envelope.crypto','Výsledek musí používat RSA-OAEP+AES-GCM.');
  e3Require(Object.keys(p).every(k=>['mode','alg','key','iv','data'].includes(k)),'envelope.fields','Nepodporovaná pole šifrovaného obalu.');
  for(const [key,max] of [['key',1024],['iv',32],['data',E3_MAX_TXT]])e3Require(typeof p[key]==='string'&&p[key].length>0&&p[key].length<=max&&/^[A-Za-z0-9+/_-]+={0,2}$/.test(p[key]),'envelope.base64','Neplatné šifrované pole '+key+'.');
  e3Require(b64ToBytes(p.iv).length===12&&b64ToBytes(p.key).length>=256&&b64ToBytes(p.data).length>=16,'envelope.crypto-size','Nesprávná velikost IV, klíče nebo ciphertextu.');
}
function e3AnswerSpec(group){
  const specs=new Map();(VARIANTS_FULL[group]||[]).forEach((ex,ei)=>(ex.items||[]).forEach((it,qi)=>specs.set(ei+(ex.type==='matching'?'_match_':'_')+qi,{ex,it})));return specs;
}
function e3AnswerValid(ex,it,value){
  const t=ex.type,blank=v=>v===null||v===undefined||v==='',text=v=>blank(v)||e3String(v,12000);
  if(blank(value))return true;
  const index=(v,n)=>Number.isInteger(v)&&v>=0&&v<n;
  const list=(v,n,pred)=>Array.isArray(v)&&v.length<=n&&v.every(pred);
  if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].includes(t)&&Array.isArray(it.options))return index(value,it.options.length);
  if(t==='true/false')return typeof value==='boolean';
  if(t==='highlight-evidence')return index(value,(it.sentences||[]).length);
  if(t==='multi-select'||t==='ordering'){const n=(t==='multi-select'?it.options:it.items)||[];return list(value,n.length,v=>index(v,n.length))&&new Set(value).size===value.length;}
  if(t==='categorization')return text(value)&&(blank(value)||(it.categories||[]).includes(value));
  if(t==='matching')return text(value)&&(blank(value)||(ex.items||[]).some(i=>i.right===value));
  if(t==='fill-in-the-blank'||t==='cloze text'){const prompt=String(t==='cloze text'?(it.text||it.passage||''):(it.sentence||it.prompt||'')),n=Math.max(1,(prompt.match(/___/g)||[]).length);return (n===1&&text(value))||list(value,n,text);}
  if(t==='transformation-chain')return list(value,(it.transformations||[]).length,text);
  if(t==='categorisation-board')return list(value,(it.entries||[]).length,v=>text(v)&&(blank(v)||(it.categories||[]).includes(v)));
  if(t==='table-completion')return list(value,(it.rows||[]).length,(row,ri)=>blank(row)||list(row,(it.rows[ri]||[]).length,(cell,ci)=>{const ref=it.rows[ri][ci];return e3Object(ref)?text(cell):blank(cell);}));
  if(t==='error-tagging'){
    if(!e3Object(value)||Object.keys(value).some(k=>!['token','etype','corr'].includes(k)))return false;
    const tokens=Array.isArray(it.tokens)?it.tokens:String(it.sentence||'').split(/\s+/).filter(Boolean);
    return (value.token===undefined||blank(value.token)||index(value.token,tokens.length))&&text(value.corr)&&text(value.etype)&&(blank(value.etype)||(it.error_type_options||[]).includes(value.etype));
  }
  return ['error correction','word order','translation','sentence transformation','word formation'].includes(t)&&text(value);
}
function validateSecurePayload(p){
  e3Require(e3Object(p),'schema.shape','Payload musí být objekt.');e3SafeTree(p);
  const fields=['v','testId','manifestHash','studentHtmlSha256','attemptId','student','identityMode','code','groupKey','startedAt','submittedAt','jokerUsed','jokerSelectedAt','resp','answerChangeStats','totalAnswerChanges','securityEvents','routineHistoryTruncated','criticalEvents','criticalCounters','criticalOverflow','criticalHistoryLegacy','userAgent','pct','grade'];
  e3Require(Object.keys(p).every(k=>fields.includes(k)),'schema.fields','Payload obsahuje nepodporovaná pole.');
  e3Require(p.v===1,'schema.version','Nepodporovaná verze payloadu.');
  for(const key of ['testId','manifestHash','attemptId','student','identityMode','groupKey'])e3Require(e3String(p[key],180)&&p[key].trim().length>0,'schema.identity','Chybějící nebo neplatné pole '+key+'.');
  e3Require(/^[A-Za-z0-9_-]{1,100}$/.test(p.attemptId),'schema.attempt','Neplatné ID pokusu.');
  e3Require(p.identityMode==='name'||p.identityMode==='oneTimeCode','schema.identity','Neplatný režim identity.');
  if(p.identityMode==='oneTimeCode')e3Require(typeof p.code==='string'&&/^[A-Z0-9]{6}$/i.test(p.code)&&p.student.toUpperCase()===p.code.toUpperCase(),'schema.code','Kód a identita studenta si odporují.');
  else e3Require(p.code===undefined||p.code==='','schema.code','Jmenná identita nesmí uvádět studentský kód.');
  e3Require(p.studentHtmlSha256===undefined||p.studentHtmlSha256===''||typeof p.studentHtmlSha256==='string'&&/^[a-f0-9]{64}$/.test(p.studentHtmlSha256),'schema.hash','Neplatný klientský hash HTML.');
  const start=e3Iso(p.startedAt),end=e3Iso(p.submittedAt);e3Require(Number.isFinite(start)&&Number.isFinite(end)&&end>=start,'time.order','Neplatné nebo nemožné pořadí klientských časů.');
  e3Require(Object.prototype.hasOwnProperty.call(VARIANTS_FULL,p.groupKey),'binding.variant','Neexistující varianta.');
  e3Require(e3Object(p.resp),'schema.answers','Odpovědi musí být objekt.');const specs=e3AnswerSpec(p.groupKey);
  for(const [key,value] of Object.entries(p.resp)){const spec=specs.get(key);e3Require(spec&&e3AnswerValid(spec.ex,spec.it,value),'schema.answer','Neplatná struktura nebo rozsah odpovědi '+key+'.');}
  e3Require(p.jokerUsed===undefined||typeof p.jokerUsed==='boolean','schema.joker','Neplatná volba žolíka.');
  if(p.jokerUsed){const at=e3Iso(p.jokerSelectedAt);e3Require(Number.isFinite(at)&&at<=start,'schema.joker','Volba žolíka musí předcházet startu.');e3Require(CONFIG.zolicek==='ANO'||CONFIG.zolicek===true,'schema.joker','Tento test nepovoluje žolíka.');}
  else e3Require(p.jokerSelectedAt===undefined||p.jokerSelectedAt==='','schema.joker','Nezvolený žolík nesmí mít čas volby.');
  let changes=0;
  if(p.answerChangeStats!==undefined){e3Require(e3Object(p.answerChangeStats),'schema.changes','Neplatná statistika změn.');for(const [key,n] of Object.entries(p.answerChangeStats)){e3Require(specs.has(key)&&Number.isInteger(n)&&n>=0&&n<=100000,'schema.changes','Neplatný počet změn '+key+'.');changes+=n;}}
  if(p.totalAnswerChanges!==undefined)e3Require(Number.isInteger(p.totalAnswerChanges)&&p.totalAnswerChanges===changes,'schema.changes','Součet změn odpovědí nesedí.');
  e3Require(Array.isArray(p.securityEvents)&&p.securityEvents.length>0&&p.securityEvents.length<=2048,'schema.telemetry','Prázdná, chybějící nebo neplatná telemetrie.');
  e3Require(p.routineHistoryTruncated===undefined||typeof p.routineHistoryTruncated==='boolean','schema.telemetry','Neplatné označení běžné historie.');
  if(p.criticalEvents!==undefined||p.criticalCounters!==undefined||p.criticalOverflow!==undefined||p.criticalHistoryLegacy!==undefined){
    e3Require(Array.isArray(p.criticalEvents)&&p.criticalEvents.length<=902&&e3Object(p.criticalCounters)&&typeof p.criticalOverflow==='boolean'&&typeof p.criticalHistoryLegacy==='boolean','schema.critical-history','Neplatná struktura kritické historie.');
    e3Require(Object.keys(p.criticalCounters).sort().join(',')==='badUnlocks,locks,resumes,unlocks'&&Object.values(p.criticalCounters).every(n=>Number.isInteger(n)&&n>=0&&n<=902),'schema.critical-counters','Neplatné čítače kritické historie.');
    e3Require(p.securityEvents.length+p.criticalEvents.length<=2048,'schema.telemetry','Součet běžné a kritické historie překračuje 2048 událostí.');
    e3Require(p.criticalEvents.every((e,i)=>e3Object(e)&&['locked','recovery-unlock','bad-unlock','persistence-integrity','attempt-resumed-after-reload','page-discarded','page-restored','left-window','large-paste','paste-blocked','critical-events-overflow'].includes(e.type)&&e.criticalSeq===i+1),'schema.critical-history','Neplatné pořadí nebo typ kritické události.');
  }
  for(const event of p.securityEvents.concat(p.criticalEvents||[])){
    e3Require(e3Object(event)&&e3String(event.type,64)&&/^[a-z0-9-]+$/.test(event.type),'schema.event','Neplatný bezpečnostní záznam.');
    const at=e3Iso(event.t);e3Require(Number.isFinite(at)&&at<=end&&(at>=start||event.type==='joker-used'&&at===e3Iso(p.jokerSelectedAt)),'time.event','Událost je mimo klientem uvedený pokus.');
    for(const [key,value] of Object.entries(event))e3Require(e3String(value,2000)||typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e12||typeof value==='boolean','schema.event','Nepodporovaná hodnota události '+key+'.');
    if(event.type==='split-window')e3Require(Number.isInteger(event.smallMs)&&Number.isInteger(event.totalMs)&&event.totalMs>0&&event.smallMs<=event.totalMs&&event.pct===Math.round(event.smallMs/event.totalMs*100),'telemetry.split','Rozporná statistika malého okna.');
  }
  const starts=p.securityEvents.filter(e=>e.type==='attempt-start'),jokers=p.securityEvents.filter(e=>e.type==='joker-used');
  e3Require(starts.length===1&&e3Iso(starts[0].t)===start&&(!starts[0].detail||starts[0].detail===p.attemptId),'telemetry.start','Záznam startu neodpovídá pokusu.');
  e3Require(p.jokerUsed?jokers.length===1&&e3Iso(jokers[0].t)===e3Iso(p.jokerSelectedAt):jokers.length===0,'telemetry.joker','Záznam žolíka neodpovídá uvedené volbě.');
  if(p.userAgent!==undefined)e3Require(e3String(p.userAgent,2000),'schema.agent','Neplatný user agent.');
  if(p.pct!==undefined)e3Require(typeof p.pct==='number'&&p.pct>=0&&p.pct<=100,'schema.score','Neplatné informativní skóre.');
  if(p.grade!==undefined)e3Require(typeof p.grade==='number'&&Number.isInteger(p.grade)&&p.grade>=1&&p.grade<=5,'schema.score','Neplatná informativní známka.');
  return {start,end};
}
function e3Canonical(value){if(Array.isArray(value))return '['+value.map(e3Canonical).join(',')+']';if(e3Object(value))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+e3Canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
async function semanticSubmissionDigest(p){const copy=Object.assign({},p);delete copy.pct;delete copy.grade;copy.code=String(copy.code||'').toUpperCase();copy.student=p.identityMode==='oneTimeCode'?copy.code:p.student;return sha256HexText(e3Canonical(copy));}
`;
