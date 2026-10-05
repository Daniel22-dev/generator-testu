#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [outArg='security/evidence/ai-assurance-fingerprint.json', mode=''] = process.argv.slice(2);
const files = [
  'src/js/01-core.js',
  'src/js/03-ui-render.js',
  'src/js/05-form-fields.js',
  'src/js/05b-workflow-context.js',
  'src/js/05c-exercise-suitability.js',
  'src/js/07-gemini.js',
  'src/js/07z-ai-core-integration.js',
  'src/js/08-manual-editor.js',
  'src/js/09-selftest-keycheck.js',
  'src/js/12-prompt-builder.js',
  'src/js/13a-secure-helpers.js',
  'src/js/50-cs-module.js',
  'src/features/preview-editor.js',
  'src/features/testlab.js',
  'public/ai-operations.json',
  'ghrab-ai-core.consumer.json',
  'vendor/ghrab-ai-core-1.0.0/ghrab-ai-core-manifest-1.0.0.json',
  'security/garp23-ai-red-corpus.json'
];
const boundaryTokens = [
  'callGeminiJSON', 'buildContentPrompt', 'wrapUntrustedSource', 'wrapUntrustedField',
  'wrapUntrustedMetadata', 'aiTrustedSystemInstruction', 'stripAiBoundaryTokens', 'aiSafeLabel',
  'generativelanguage.googleapis.com', 'x-goog-api-key'
];
function walkAiBoundarySources(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walkAiBoundarySources(full):(entry.isFile()&&/\.(?:js|mjs)$/.test(entry.name)?[full]:[]);
  });
}
const tracked = new Set(files);
const discoveredBoundaryFiles = ['src','public'].flatMap(walkAiBoundarySources).map(f=>f.replaceAll('\\','/')).filter(file=>{
  const text=fs.readFileSync(file,'utf8');
  return boundaryTokens.some(token=>text.includes(token));
}).sort();
const untrackedBoundaryFiles = discoveredBoundaryFiles.filter(file=>!tracked.has(file));
if(untrackedBoundaryFiles.length){
  console.error('❌ AI assurance fingerprint scope is incomplete. Untracked boundary files: '+untrackedBoundaryFiles.join(', '));
  process.exit(1);
}
const sha = data => createHash('sha256').update(data).digest('hex');
const rows = files.map(file => {
  const data=fs.readFileSync(file);
  return {path:file,size:data.length,sha256:sha(data)};
});
const combined = sha(Buffer.from(rows.map(r=>`${r.path}\0${r.sha256}\0${r.size}\n`).join(''),'utf8'));
const aiOps = JSON.parse(fs.readFileSync('public/ai-operations.json','utf8'));
const coreConsumer = JSON.parse(fs.readFileSync('ghrab-ai-core.consumer.json','utf8'));
const out = {
  schema:'ghrab-ai-assurance-fingerprint-v1',
  appId:'generator',
  appVersion:aiOps.appVersion,
  coreVersion:aiOps.coreVersion,
  providerBoundary:'deployment-profile-controlled',
  aiCoreContract:coreConsumer.core?.contract || coreConsumer.contract || coreConsumer.contractVersion || null,
  fingerprintAlgorithm:'SHA-256(path\\0sha256\\0size\\n)',
  fingerprint:combined,
  files:rows,
  scopeDetection:{tokens:boundaryTokens,discoveredSourceFiles:discoveredBoundaryFiles,untrackedSourceFiles:untrackedBoundaryFiles},
  invalidationRule:'Any change to a listed file invalidates inherited behavioral AIR evidence until reviewed/re-executed. The generator also fails if a .js/.mjs source under src/ or public/ uses an AI/prompt-boundary token or direct Gemini transport token and is not listed. Model/provider/system-instruction changes must never remain current by version label alone.'
};
const text=JSON.stringify(out,null,2)+'\n';
const target=path.resolve(outArg);
if(mode==='--check'){
  if(!fs.existsSync(target)){console.error(`❌ AI assurance fingerprint chybí: ${target}`);process.exit(1);}
  if(fs.readFileSync(target,'utf8')!==text){console.error('❌ AI assurance fingerprint je zastaralý: změnila se model/provider/system-instruction/operation/corpus evidence boundary.');process.exit(1);}
  console.log(`✅ AI assurance fingerprint current: ${combined}`);
}else{
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,text,'utf8');
  console.log(`✅ AI assurance fingerprint vytvořen: ${combined}`);
}
