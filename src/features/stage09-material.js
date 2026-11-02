/**
 * Stage09 preproduction: teacher-reviewed, pedagogical-only GIT -> AI Studio.
 * This module accepts a generated TEST in memory but deliberately extracts
 * ONLY whitelisted educational text. No student/verifier/secure-runtime data.
 * Answer keys are excluded because Material v1 does not mark a teacher-only
 * downstream context. Unsupported tasks must not be silently reinterpreted.
 */
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const ACTIVE = /<\s*(?:script|iframe|object|embed|img|svg|audio|video|source)\b|\bon\w+\s*=|javascript\s*:|\bdata\s*:/i;
const NONPORTABLE = /\[\[(?:VISUAL_\d+|MEDIA_SOURCE)\]\]|\bblob:|!\[[^\]]*\]\([^)]*\)|https?:\/\/\S+\.(?:png|jpe?g|svg|webp|mp3|mp4|wav|webm)\b/i;
const SECRET = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|BEGIN PRIVATE KEY|\b(?:ghp_|sk-)[a-z0-9_-]{14,}|\bAIza[0-9A-Za-z_-]{20,}|\bBearer\s+[a-z0-9._-]{12,}|\b(?:teacher\s*(?:pin|password)|recovery\s*code|student\s*access\s*code|API\s*key)\s*[:=]/i;
const PRIVATE_FIELD = /\"(?:student|pupil|roster|classList|email|schoolEmail|studentId|memberId|groupId|scores|submissions|teacherPin|recoveryCode|apiKey|accessToken|privateKey)\"\s*:/i;
const ALLOWED = new Set(['multiple choice', 'true/false', 'reading comprehension', 'dialogue completion']);
const ALLOWED_LEVELS = new Set(['A1','A2','B1','B2','C1','C2']);
// Exact language choices of the current GIT builder; no speculative free-text mapping.
const GIT_LANGUAGE_CODES = Object.freeze({
  'angličtina':'en', 'němčina':'de', 'španělština':'es',
  'čeština':'cs', 'francouzština':'fr', 'latina':'la',
});
const LIMIT = Object.freeze({tasks:250, prompt:6000, options:12, option:2000, source:180000, bytes:450000});
const isObject = o => !!o && typeof o === 'object' && !Array.isArray(o);
function stop(code){const err=new Error(code);err.code=code;throw err;}
function safeText(value,max,{required=false}={}){
  if(typeof value!=='string'){if(required)stop('TEXT_REQUIRED');return '';}
  const s=value.trim();
  if(required&&!s)stop('TEXT_REQUIRED');
  if(s.length>max)stop('TEXT_TOO_LONG');
  if(EMAIL.test(s)||ACTIVE.test(s)||NONPORTABLE.test(s)||SECRET.test(s))stop('PRIVATE_OR_ACTIVE_CONTENT');
  return s;
}
function taskFromItem(ex,item,exerciseIndex,itemIndex){
  if(!isObject(item))return null;
  const typ=String(ex.type||'').trim().toLowerCase();
  if(!ALLOWED.has(typ))return null;
  let question='';
  if(typ==='true/false')question=item.statement||item.question||item.prompt||'';
  else question=item.question||item.prompt||'';
  // The dialogue itself is a valid pedagogical prompt even without a separate question.
  if(typeof question!=='string'||(typ!=='dialogue completion'&&!question.trim()))return null;
  let contextual='';
  if(typ==='reading comprehension'){
    contextual=ex.passage||ex.source_text||ex.text||ex.source||item.passage||'';
    if(typeof contextual!=='string'||!contextual.trim())return null;
  }
  if(typ==='dialogue completion'){
    contextual=item.dialogue||ex.dialogue||'';
    if(typeof contextual!=='string'||!contextual.trim())return null;
  }
  // Avoid duplicating the dialogue when a generator also aliases it as question.
  const distinctQuestion=question.trim()&&question.trim()!==contextual.trim()?question:'';
  const prompt=safeText(contextual ? (distinctQuestion?contextual+'\n\n'+distinctQuestion:contextual) : question,LIMIT.prompt,{required:true});
  if(typ==='true/false'){
    // The GIT answer key is intentionally NOT exported to shared Material v1.
    return {id:`git-ex${exerciseIndex}-q${itemIndex}`,type:'truefalse',prompt,options:['True','False']};
  }
  const opts=item.options;
  if(!Array.isArray(opts)||opts.length<2||opts.length>LIMIT.options)return null;
  if(opts.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>LIMIT.option))return null;
  const options=opts.map(x=>safeText(x,LIMIT.option,{required:true}));
  if(new Set(options).size!==options.length)return null;
  return {id:`git-ex${exerciseIndex}-q${itemIndex}`,type:'select',prompt,options};
}
/**
 * Return a deterministic material and explicit exclusions. The caller must
 * confirm privacy and inspect the exact CURRENT generated test before sending.
 */
export function mapGeneratedTestToMaterial({
  assembled, title, subject, yearGroup='', level='', objective='', language='',
  id, now, appVersion, privacyConfirmed=false,
}={}){
  if(privacyConfirmed!==true)stop('ANONYMITY_NOT_CONFIRMED');
  if(!isObject(assembled)||!isObject(assembled.variants)||
      !Array.isArray(assembled.variants.__default))stop('TEST_NOT_READY');
  if(!/^git-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))stop('MATERIAL_ID_INVALID');
  if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))stop('MATERIAL_DATE_INVALID');
  if(!/^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i.test(appVersion||''))stop('APP_VERSION_INVALID');
  const materialTitle=safeText(title,240,{required:true});
  const schoolSubject=safeText(subject,160,{required:true});
  const targetGroup=safeText(yearGroup,120);
  const learningGoal=safeText(objective,800);
  const warnings=['answer-keys-and-explanations-omitted','secure-runtime-and-student-data-omitted'];
  const variants=Object.keys(assembled.variants).filter(x=>x!=='__default');
  if(variants.length)warnings.push('differentiated-variants-omitted');
  const tasks=[];
  let total=0;
  const exercises=assembled.variants.__default;
  for(let i=0;i<exercises.length;i++){
    const ex=exercises[i];
    if(!isObject(ex)||!Array.isArray(ex.items)){
      warnings.push(`exercise-${i+1}-unsupported`);continue;
    }
    const type=String(ex.type||'').trim().toLowerCase();
    total+=ex.items.length;
    if(!ALLOWED.has(type)){
      warnings.push(`exercise-${i+1}-unsupported-${type.replace(/[^a-z0-9-]/g,'').slice(0,32)}`);
      continue;
    }
    for(let j=0;j<ex.items.length;j++){
      if(tasks.length>=LIMIT.tasks)stop('TASK_LIMIT_EXCEEDED');
      const task=taskFromItem(ex,ex.items[j],i+1,j+1);
      if(!task){warnings.push(`exercise-${i+1}-item-${j+1}-unsupported`);continue;}
      tasks.push(task);
    }
  }
  if(!tasks.length)stop('NO_PORTABLE_TASKS');
  // The source text is GENERATED from the whitelisted tasks only. Never copy
  // assembled.cfg, sourceState, HTML, manifest or hidden answer key objects.
  const sourceText=tasks.map((t,i)=>`${i+1}. ${t.prompt}`).join('\n\n');
  if(sourceText.length>LIMIT.source)stop('MATERIAL_OVERSIZED');
  const material={schema:'ghrab-material-v1',id,version:1,title:materialTitle,
    subject:schoolSubject,objectives:learningGoal?[learningGoal]:[],
    content:{sourceText,vocabulary:[],tasks},
    quality:{status:'ai-draft'},
    provenance:{sourceAppId:'generator',sourceAppVersion:appVersion,
      createdAt:now,updatedAt:now,containsPersonalData:false}};
  if(targetGroup)material.yearGroup=targetGroup;
  if(language){
    if(typeof language!=='string')stop('LANGUAGE_UNSUPPORTED');
    const languageCode=GIT_LANGUAGE_CODES[language.trim().toLowerCase()];
    if(!languageCode)stop('LANGUAGE_UNSUPPORTED');
    material.language=languageCode;
  }
  if(ALLOWED_LEVELS.has(level))material.level=level;
  else if(level)warnings.push('cefr-omitted-invalid');
  const json=JSON.stringify(material);
  if(EMAIL.test(json)||ACTIVE.test(json)||NONPORTABLE.test(json)||SECRET.test(json)||PRIVATE_FIELD.test(json))stop('PRIVATE_OR_ACTIVE_CONTENT');
  if(new TextEncoder().encode(json).byteLength>LIMIT.bytes)stop('MATERIAL_OVERSIZED');
  return Object.freeze({material:Object.freeze(material),warnings:Object.freeze([...new Set(warnings)]),
    totalItems:total,exportedItems:tasks.length,excludedItems:Math.max(0,total-tasks.length)});
}

/**
 * Human-auditable display of the exact WHITELISTED outgoing content.
 * Build this exclusively from the mapped Material v1, not the GIT test state.
 * The returned string is text, never HTML. All exported tasks and options
 * must be displayed so the teacher can inspect for contextual personal data.
 */
export function describeMaterialForReview(material){
  if(!isObject(material)||material.schema!=='ghrab-material-v1'||
     !isObject(material.content)||!Array.isArray(material.content.tasks))
    stop('MATERIAL_PREVIEW_INVALID');
  const tasks=material.content.tasks;
  if(!tasks.length||tasks.some(task=>!isObject(task)||
     !['select','truefalse'].includes(task.type)||
     typeof task.prompt!=='string'||!Array.isArray(task.options)))
    stop('MATERIAL_PREVIEW_INVALID');
  const out=[
    `NÁZEV: ${String(material.title||'')}`,
    `PŘEDMĚT: ${String(material.subject||'')}`,
    `JAZYK: ${String(material.language||'(neurceno)')}`,
    `ROČNÍK / SKUPINA: ${String(material.yearGroup||'(nevyplneno)')}`,
    `ÚROVEŇ: ${String(material.level||'(neurceno)')}`,
    `CÍL: ${Array.isArray(material.objectives)?material.objectives.join('; '):''}`,
    '',
    'PŘESNĚ PŘENÁŠENÉ OTÁZKY A MOŽNOSTI (bez správných odpovědí):',
  ];
  tasks.forEach((task,i)=>{
    out.push('',`${i+1}. ${task.prompt}`);
    task.options.forEach((option,j)=>out.push(`   ${j+1}) ${option}`));
  });
  out.push('','POZOR: Tento náhled slouží jen k ověření anonymizace a obsahu před odesláním.');
  return out.join('\n');
}

export function trustedStudioRoot(value,href){
  if(typeof value!=='string'||!value.trim())stop('STUDIO_NOT_CONFIGURED');
  let root,here;
  try{here=new URL(href);root=new URL(value,here);}catch{stop('STUDIO_URL_INVALID');}
  if(root.search||root.hash||root.username||root.password)stop('STUDIO_URL_UNTRUSTED');
  if(!root.pathname.endsWith('/'))root.pathname+='/';
  if(!new Set(['/AI-Studio-GHRAB/','/ai-studio/']).has(root.pathname)||
    root.origin!==here.origin||
    (root.protocol!=='https:'&&!(root.protocol==='http:'&&['localhost','127.0.0.1'].includes(root.hostname))))
    stop('STUDIO_URL_UNTRUSTED');
  return root.href;
}