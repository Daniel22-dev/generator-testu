/* ===================== GHRAB AI CORE 1.0.0 · GENERÁTOR P1 ===================== */
const GEN_AI_APP=Object.freeze({id:'generator',version:'7.1.13'});
const GEN_AI_SCHEMA_ID='generator.object.v1';
const GEN_AI_SCHEMAS=Object.freeze({[GEN_AI_SCHEMA_ID]:{type:'object',additionalProperties:true}});
const GEN_AI_OPERATIONS=Object.freeze({schema:'ghrab-ai-operations-v1',appId:GEN_AI_APP.id,operations:Object.freeze({
  'test-generation':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'quality',allowedModelProfiles:['balanced','quality'],inputTypes:['text','image','document'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:32768},
  'exercise-generation':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'balanced',allowedModelProfiles:['balanced','quality'],inputTypes:['text','image','document'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:32768},
  'generation-repair':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'balanced',allowedModelProfiles:['balanced','quality'],inputTypes:['text','image','document'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:32768},
  'listening-question-suggestions':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'balanced',allowedModelProfiles:['balanced','quality'],inputTypes:['text','document'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:16384},
  'reading-package-suggestion':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'balanced',allowedModelProfiles:['balanced','quality'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:16384},
  'grading-scale-parse':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'economy',allowedModelProfiles:['economy','balanced'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:4096},
  'answer-key-verification':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'economy',allowedModelProfiles:['economy','balanced'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:8192},
  'acceptable-answer-enrichment':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'economy',allowedModelProfiles:['economy','balanced'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:8192},
  'generator-help-answer':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'economy',allowedModelProfiles:['economy','balanced'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:8192},
  'diagnostic-ping':{outputSchemaId:GEN_AI_SCHEMA_ID,defaultModelProfile:'economy',allowedModelProfiles:['economy','balanced'],inputTypes:['text'],streaming:false,requiredCapabilities:[],expectedOutputs:1,maxOutputTokensHint:1024}
})});
function genSchoolMode(){return Boolean(window.GHRAB_PLATFORM?.isSchoolProfile?.())}
function genAiAvailable(){return genSchoolMode()||Boolean(geminiApiKey)}
function genCoreParts(prompt,extraParts){const out=[{type:'text',text:String(prompt||'')}];for(const part of(Array.isArray(extraParts)?extraParts:[])){if(part&&typeof part.text==='string'){out.push({type:'text',text:part.text});continue}const inline=part?.inline_data||part?.inlineData;if(inline?.data){const mime=inline.mime_type||inline.mimeType||'application/octet-stream';out.push({type:String(mime).startsWith('image/')?'image':'document',mimeType:mime,name:inline.name||'attachment',source:{kind:'inline-base64',data:inline.data}})}}return out}
function genPreflight(parts){const text=parts.filter(part=>part.type==='text').map(part=>part.text).join('\n');if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text)||/\b(?:\+?420\s*)?(?:\d[\s-]*){9}\b/.test(text)){const error=new Error('V zadání je možný osobní kontakt. Před odesláním do AI jej nahraď anonymním kódem.');error.code='PREFLIGHT_BLOCKED';throw error}return true}
function genModelProfile(operation){const registration=GEN_AI_OPERATIONS.operations[operation];return registration?.defaultModelProfile||'balanced'}
function genEnsureAiCore(){
  if(!window.GHRAB_AI||!window.GHRAB_PLATFORM)throw Object.assign(new Error('Společná AI vrstva se nenačetla. Obnov stránku přes AI Studio.'),{code:'CONFIGURATION_ERROR'});
  const state=window.GHRAB_AI.getState?.();if(state?.configured&&state.app?.id===GEN_AI_APP.id)return;
  window.GHRAB_AI.configure({app:GEN_AI_APP,runtimeConfig:window.GHRAB_PLATFORM.createAiRuntimeConfig({timeoutMs:GEMINI_TIMEOUT_MS,maxRequestBytes:18*1024*1024,maxPartBytes:14*1024*1024,models:{balanced:resolveGeminiModel(),economy:GEMINI_FALLBACK_MODELS[0],quality:resolveGeminiModel()}}),operations:GEN_AI_OPERATIONS,outputSchemas:GEN_AI_SCHEMAS,credentialProvider:async({mode})=>mode==='direct-gemini'?{apiKey:String(geminiApiKey||''),modelOverride:resolveGeminiModel()}:null,authProvider:async()=>window.GHRAB_PLATFORM.authProvider(),telemetrySink:event=>window.GHRAB_PLATFORM.recordTelemetry({type:'ai-usage',appId:GEN_AI_APP.id,appVersion:GEN_AI_APP.version,...event})});
}
function genWorkflowId(opts={}){return opts.workflowId||window.__GHRAB_GENERATOR_WORKFLOW_ID__||undefined}
async function callGeminiJSONCore(prompt,extraParts=[],opts={}){
  if(!(await ensureGeminiDataNotice()))throw new Error('AI požadavek byl zrušen před odesláním dat.');
  if(genSchoolMode()&&opts.urlContext)throw Object.assign(new Error('URL Context zatím školní AI brána nepodporuje. Vlož obsah stránky jako text nebo soubor, případně použij přímý GitHub režim.'),{code:'FEATURE_UNSUPPORTED'});
  const mediaParts=Array.isArray(extraParts)?extraParts:[];
  if(genSchoolMode()&&mediaParts.some(part=>{const inline=part?.inline_data||part?.inlineData;const mime=String(inline?.mime_type||inline?.mimeType||'');return mime.startsWith('audio/')||mime.startsWith('video/')}))throw Object.assign(new Error('Školní AI brána v P1 nepřijímá zvuk ani video. Použij přepis, PDF, dokument nebo obrázek.'),{code:'FEATURE_UNSUPPORTED'});
  genEnsureAiCore();const operation=opts.operation||'test-generation';const registration=GEN_AI_OPERATIONS.operations[operation];if(!registration)throw Object.assign(new Error('Neznámá AI operace: '+operation),{code:'UNREGISTERED_OPERATION'});
  const inputParts=genCoreParts(prompt,extraParts);genPreflight(inputParts);geminiCancelRequested=false;
  const response=await window.GHRAB_AI.generate({operation,modelProfile:genModelProfile(operation),instructions:'Vrať pouze validní JSON bez markdownu. Dodrž přesně strukturu, názvy polí a omezení uvedené v zadání.',inputParts,outputSchemaId:GEN_AI_SCHEMA_ID,options:{reasoningHint:genModelProfile(operation)==='economy'?'minimal':'medium',maxOutputTokensHint:registration.maxOutputTokensHint},privacy:{clientAnonymized:true,preflightPassed:true},usageContext:{expectedOutputs:1,userActions:1},workflowId:genWorkflowId(opts),signal:currentGeminiAbortController?.signal});
  lastGeminiRawResponse=JSON.stringify(response.result);lastGeminiJsonRepaired=false;return response.result;
}
const genLegacyCallGeminiJSON=callGeminiJSON;
callGeminiJSON=async function callGeminiJSONThroughCore(prompt,extraParts=[],opts={}){
  if(opts.__legacyTest===true||window.__TEST_USE_LEGACY_GEMINI__)return genLegacyCallGeminiJSON(prompt,extraParts,opts);
  // GHRAB AI Core 1.0.0 nemá kontrakt pro providerové nástroje. URL Context proto
  // zůstává pouze v přímém Gemini režimu; školní brána jej výše výslovně odmítne.
  if(!genSchoolMode()&&opts.urlContext)return genLegacyCallGeminiJSON(prompt,extraParts,opts);
  try{return await callGeminiJSONCore(prompt,extraParts,opts)}catch(error){if(window.GHRAB_AI?.formatUserError)throw new Error(window.GHRAB_AI.formatUserError(error,'cs-CZ'));throw error}
};
function genBeginAiWorkflow(){window.__GHRAB_GENERATOR_WORKFLOW_ID__=window.GHRAB_PLATFORM?.uuid?.('generator-workflow')||`generator-workflow-${Date.now()}`;return window.__GHRAB_GENERATOR_WORKFLOW_ID__}
function genEndAiWorkflow(){window.__GHRAB_GENERATOR_WORKFLOW_ID__=''}
function genApplyServerKeyPolicy(){if(!genSchoolMode())return;window.GHRAB_PLATFORM.enforceLocalKeyPolicy({localStorageKeys:[GEMINI_KEY_SK],sessionStorageKeys:[GEMINI_KEY_SESSION_SK],onRemoved:()=>{geminiApiKey='';geminiKeyScope='server';}});const input=$('geminiKeyInput');if(input){input.value='';input.disabled=true;input.placeholder='Klíč je uložen na školním serveru'}for(const id of ['btnUseKeySession','btnSaveKeyPermanent','btnClearKey','toggleKey']){const el=$(id);if(el)el.hidden=true}const note=$('geminiNote');if(note)note.innerHTML='<strong>Školní režim:</strong> AI požadavky zpracovává školní server. Osobní provider klíč se do prohlížeče neukládá ani neposílá.';try{updateGeminiStatus()}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',genApplyServerKeyPolicy,{once:true});else genApplyServerKeyPolicy();
