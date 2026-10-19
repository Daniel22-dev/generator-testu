import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const AI_ASSURANCE_FILES = [
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

export const AI_BOUNDARY_TOKENS = [
  'callGeminiJSON', 'buildContentPrompt', 'wrapUntrustedSource', 'wrapUntrustedField',
  'wrapUntrustedMetadata', 'aiTrustedSystemInstruction', 'stripAiBoundaryTokens', 'aiSafeLabel',
  'generativelanguage.googleapis.com', 'x-goog-api-key'
];

const sha256=data=>createHash('sha256').update(data).digest('hex');

export function canonicalTextBytes(data){
  const text=Buffer.isBuffer(data)?data.toString('utf8'):String(data);
  return Buffer.from(text.replace(/\r\n?/g,'\n'),'utf8');
}

function walkAiBoundarySources(rootDir,relativeDir){
  const absolute=path.join(rootDir,relativeDir);
  if(!fs.existsSync(absolute))return [];
  return fs.readdirSync(absolute,{withFileTypes:true}).flatMap(entry=>{
    const relative=path.posix.join(relativeDir.replaceAll('\\','/'),entry.name);
    return entry.isDirectory()?walkAiBoundarySources(rootDir,relative):(entry.isFile()&&/\.(?:js|mjs)$/.test(entry.name)?[relative]:[]);
  });
}

export function buildAiAssuranceFingerprint({rootDir=process.cwd(),overrides=new Map()}={}){
  const tracked=new Set(AI_ASSURANCE_FILES);
  const discoveredSourceFiles=['src','public'].flatMap(relative=>walkAiBoundarySources(rootDir,relative)).filter(file=>{
    const text=fs.readFileSync(path.join(rootDir,...file.split('/')),'utf8');
    return AI_BOUNDARY_TOKENS.some(token=>text.includes(token));
  }).sort();
  const untrackedSourceFiles=discoveredSourceFiles.filter(file=>!tracked.has(file));
  if(untrackedSourceFiles.length)throw new Error('AI assurance fingerprint scope is incomplete. Untracked boundary files: '+untrackedSourceFiles.join(', '));

  const rows=AI_ASSURANCE_FILES.map(file=>{
    const source=overrides.has(file)?overrides.get(file):fs.readFileSync(path.join(rootDir,...file.split('/')));
    const data=canonicalTextBytes(source);
    return {path:file,size:data.length,sha256:sha256(data)};
  });
  const fingerprint=sha256(Buffer.from(rows.map(row=>`${row.path}\0${row.sha256}\0${row.size}\n`).join(''),'utf8'));
  const aiOps=JSON.parse(canonicalTextBytes(overrides.has('public/ai-operations.json')?overrides.get('public/ai-operations.json'):fs.readFileSync(path.join(rootDir,'public','ai-operations.json'))).toString('utf8'));
  const coreConsumer=JSON.parse(canonicalTextBytes(overrides.has('ghrab-ai-core.consumer.json')?overrides.get('ghrab-ai-core.consumer.json'):fs.readFileSync(path.join(rootDir,'ghrab-ai-core.consumer.json'))).toString('utf8'));
  return {
    schema:'ghrab-ai-assurance-fingerprint-v1',
    appId:'generator',
    appVersion:aiOps.appVersion,
    coreVersion:aiOps.coreVersion,
    providerBoundary:'deployment-profile-controlled',
    aiCoreContract:coreConsumer.core?.contract||coreConsumer.contract||coreConsumer.contractVersion||null,
    fingerprintAlgorithm:'SHA-256(path\\0sha256(canonical-UTF8-LF)\\0canonical-size\\n)',
    fingerprint,
    files:rows,
    scopeDetection:{tokens:AI_BOUNDARY_TOKENS,discoveredSourceFiles,untrackedSourceFiles},
    invalidationRule:'Any semantic change to a listed file invalidates inherited behavioral AIR evidence until reviewed/re-executed. Text inputs are canonicalized to UTF-8/LF so checkout line endings alone do not alter the fingerprint. The generator also fails if a .js/.mjs source under src/ or public/ uses an AI/prompt-boundary token or direct Gemini transport token and is not listed. Model/provider/system-instruction changes must never remain current by version label alone.'
  };
}
