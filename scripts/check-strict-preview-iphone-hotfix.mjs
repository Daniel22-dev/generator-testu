#!/usr/bin/env node
// Focused zero-dependency gate: fullscreen start policy. Browser/Safari UAT is separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/js/13di-secure-strict-mode-runtime.js','utf8');
const runtime=new Function(source+';return SECURE_STRICT_MODE_RUNTIME_JS;')();
new vm.Script(runtime);
assert.equal(runtime.includes('__GHRAB_TEACHER_PREVIEW__'),false,'public strict runtime must exclude the legacy preview marker');
assert.equal(runtime.includes('strictTeacherPreview'),false,'public strict runtime must exclude the legacy preview helper');
assert.equal(runtime.includes('about:srcdoc'),false,'public strict runtime must not privilege about:srcdoc');
let pass=0;
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
const ipad=iphone.replaceAll('iPhone','iPad');
function make({ua=iphone,iphoneAllowed=false,general=false,api=false,denied=false,embedded=false,protocol='https:',preview=false,href='https://school.example/t.html'}={}){
 const nodes={};function el(){const flags=new Set(['hidden']);return {classList:{toggle:(key,on)=>on?flags.add(key):flags.delete(key),contains:key=>flags.has(key)},textContent:'',className:'',style:{cssText:''},value:'',firstChild:null,insertBefore(x){this.firstChild=x}};}
 for(const id of ['strictVerifyBtn','strictFullscreenStartBtn','strictFallbackStartBtn','strictStartStatus','test','studentName','studentVariant'])nodes[id]=el();
 nodes.studentName.value='SYNTHETIC';
 const document={documentElement:{},fullscreenElement:null,getElementById:id=>nodes[id]||null,createElement:el};
 if(api)document.documentElement.requestFullscreen=denied?()=>Promise.reject(Object.assign(new Error('denied'),{name:'NotAllowedError'})):async()=>{document.fullscreenElement=document.documentElement;};
 const window={location:{href},frameElement:embedded?{}:null};window.self=window;window.top=embedded?{}:window;if(preview)window.__GHRAB_TEACHER_PREVIEW__=true;
 const ctx={document,window,location:{protocol},navigator:{userAgent:ua},CFG:{testMode:'prisny',strictIPhoneCompatibilityAllowed:iphoneAllowed,strictFullscreenFallbackAllowed:general},STRICT_PREFLIGHT:null,STRICT_PREFLIGHT_BUSY:false,STRICT_START_BUSY:false,STRICT_PRESTART_EVENTS:[],STRICT_FULLSCREEN_MODE:'none',STRICT_FULLSCREEN_CAPABILITY:'unknown',JOKER_CHOICE:null,started:0,active:false,isTestActive:()=>ctx.active,releaseAttemptTabLock:()=>{},acquireAttemptTabLock:async()=>true,startTestAttempt:async()=>{ctx.started++;ctx.active=true;},captureStrictFullscreenBaseline:()=>{},$:id=>nodes[id],t:(k,f)=>f||k,Promise,setTimeout,clearTimeout,console};
 vm.createContext(ctx);vm.runInContext(runtime,ctx);ctx.strictPreflightChecks=async()=>({signature:ctx.strictPreflightSignature()});
 return {ctx,nodes,async verify(){await ctx.verifyStrictTest();},allowed(){return !nodes.strictFallbackStartBtn.classList.contains('hidden')}};
}
async function check(name,fn){try{await fn();console.log('PASS',name);pass++;}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}
await check('blocked iPhone default',async()=>{const x=make();await x.verify();assert.equal(x.allowed(),false);await x.ctx.startStrictFallback();assert.equal(x.ctx.started,0);});
await check('approved iPhone',async()=>{const x=make({iphoneAllowed:true});await x.verify();assert.equal(x.allowed(),true);await x.ctx.startStrictFallback();assert.equal(x.ctx.STRICT_FULLSCREEN_MODE,'fallback');assert.ok(x.ctx.STRICT_PRESTART_EVENTS.some(e=>e.fallbackReason==='iphone-ipod-element-fullscreen-api-missing'));});
await check('iPad separate authorization',async()=>{const a=make({ua:ipad,iphoneAllowed:true}),b=make({ua:ipad,general:true});await a.verify();await b.verify();assert.equal(a.allowed(),false);assert.equal(b.allowed(),true);});
await check('native confirmed fullscreen',async()=>{const x=make({api:true,iphoneAllowed:true});await x.verify();assert.equal(x.allowed(),false);await x.ctx.startStrictFullscreen();assert.equal(x.ctx.STRICT_FULLSCREEN_MODE,'enforced');});
await check('denied API cannot fall back',async()=>{const x=make({api:true,denied:true,iphoneAllowed:true,general:true});await x.verify();await x.ctx.startStrictFullscreen();assert.equal(x.ctx.started,0);assert.equal(x.allowed(),false);});
await check('embedded and file contexts denied',async()=>{for(const opts of [{embedded:true},{protocol:'file:',href:'file:///t.html'},{protocol:'http:',href:'http://school/t.html'}]){const x=make({...opts,iphoneAllowed:true});await x.verify();assert.equal(x.allowed(),false);}});
await check('legacy marker cannot authorize foreign srcdoc',async()=>{const a=make({embedded:true,preview:true,protocol:'about:',href:'about:srcdoc'});a.ctx.strictTeacherPreview=()=>true;await a.verify();assert.equal(a.allowed(),false);await a.ctx.startStrictFallback();assert.equal(a.ctx.started,0);assert.equal(a.ctx.STRICT_FULLSCREEN_MODE,'none');});
await check('stale preflight',async()=>{const x=make({iphoneAllowed:true});await x.verify();x.nodes.studentName.value='OTHER';await x.ctx.startStrictFallback();assert.equal(x.ctx.started,0);});
console.log('Strict hotfix policy checks:',pass,'/ 8');
