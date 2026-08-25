import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'acorn';

let failed=0;
const fail=message=>{failed++;console.error(`❌ ${message}`);};
const pass=message=>console.log(`✅  ${message}`);
const read=file=>fs.readFileSync(file,'utf8');

function cspFromMeta(html){
  const tag=html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0]||'';
  return tag.match(/\bcontent="([^"]*)"/i)?.[1]||tag.match(/\bcontent='([^']*)'/i)?.[1]||'';
}

function collectJs(dir,out=[]){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())collectJs(full,out);
    else if(entry.isFile()&&entry.name.endsWith('.js'))out.push(full);
  }
  return out;
}

function walk(node,file){
  if(!node||typeof node!=='object')return;
  const callee=node.callee;
  const directName=callee?.type==='Identifier'?callee.name:'';
  const memberName=callee?.type==='MemberExpression'&&!callee.computed&&callee.property?.type==='Identifier'?callee.property.name:'';
  if((node.type==='NewExpression'||node.type==='CallExpression')&&(directName==='Function'||memberName==='Function')){
    fail(`${file}: runtime používá Function konstruktor, což vyžaduje unsafe-eval.`);
  }
  if(node.type==='CallExpression'&&(directName==='eval'||memberName==='eval')){
    fail(`${file}: runtime používá eval(), což vyžaduje unsafe-eval.`);
  }
  if(node.type==='CallExpression'&&(directName==='setTimeout'||directName==='setInterval')&&node.arguments?.[0]?.type==='Literal'&&typeof node.arguments[0].value==='string'){
    fail(`${file}: runtime předává řetězec do ${directName}(), což vyžaduje unsafe-eval.`);
  }
  for(const value of Object.values(node)){
    if(Array.isArray(value))value.forEach(item=>walk(item,file));
    else if(value&&typeof value==='object'&&typeof value.type==='string')walk(value,file);
  }
}

const shell=read('src/shell.html');
const manual=read('public/manual/index.html');
const headers=JSON.parse(read('public/config/security-headers.json'));
const sw=read('public/sw.js');
const build=read('scripts/build.mjs');
const gemini=read('src/js/07-gemini.js');

const shellCsp=cspFromMeta(shell);
const manualCsp=cspFromMeta(manual);
if(!shellCsp)fail('src/shell.html nemá aktivní meta CSP.');
if(!manualCsp)fail('public/manual/index.html nemá aktivní meta CSP.');
if(shellCsp&&shellCsp!==headers.staticProfile?.contentSecurityPolicy)fail('Meta CSP aplikace se liší od staticProfile v security-headers.json.');
for(const [label,policy] of [['aplikace',shellCsp],['manuál',manualCsp],['statický profil',headers.staticProfile?.contentSecurityPolicy||''],['školní profil',headers.schoolServerProfile?.headers?.['Content-Security-Policy']||'']]){
  if(/'unsafe-eval'/.test(policy))fail(`CSP ${label} obsahuje unsafe-eval.`);
  for(const directive of ["default-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'"]){
    if(!policy.includes(directive))fail(`CSP ${label} postrádá ${directive}.`);
  }
}
if(shell.indexOf('http-equiv="Content-Security-Policy"')>shell.indexOf('<script'))fail('Meta CSP musí být před prvním skriptem.');
if(/src=["']\.\/vendor\/acorn\.js["']/.test(shell))fail('Acorn parser se nesmí načítat při startu aplikace.');
if(sw.includes('"./vendor/acorn.js"'))fail('Acorn parser nesmí zvětšovat povinnou PWA precache.');
if(!build.includes("node_modules','acorn")||!build.includes("'vendor','acorn.js'"))fail('Build nekopíruje lokální Acorn parser do dist.');
if(!/function\s+ensureJavascriptParser\s*\(/.test(gemini)||!/["']\.\/vendor\/acorn\.js["']/.test(gemini))fail('Smoke validátor nemá lokální lazy loader Acorn parseru.');
if(!/async\s+function\s+parseGeneratedJavascriptSyntax\s*\(/.test(gemini)||!/parser\.parse\(/.test(gemini))fail('Smoke validátor nepoužívá asynchronní CSP-safe parser.');

for(const file of collectJs('src')){
  try{walk(parse(read(file),{ecmaVersion:'latest',sourceType:'script',allowHashBang:true}),file);}
  catch(error){fail(`${file}: zdroj nelze analyzovat pro CSP (${error.message}).`);}
}
for(const file of collectJs('public')){
  try{walk(parse(read(file),{ecmaVersion:'latest',sourceType:'module',allowHashBang:true}),file);}
  catch(error){fail(`${file}: zdroj nelze analyzovat pro CSP (${error.message}).`);}
}

if(!failed)pass('Aktivní CSP je synchronní, bez unsafe-eval; Acorn je lazy a runtime neobsahuje eval/new Function.');
process.exit(failed?1:0);
