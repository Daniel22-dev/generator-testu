#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {AI_ASSURANCE_FILES,buildAiAssuranceFingerprint} from './lib/ai-assurance-fingerprint.mjs';

const root=path.resolve('.');
const storedPath=path.join(root,'security','evidence','ai-assurance-fingerprint.json');
const storedBefore=fs.readFileSync(storedPath);
const baseline=buildAiAssuranceFingerprint({rootDir:root});
const crlfOverrides=new Map(AI_ASSURANCE_FILES.map(file=>{
  const bytes=fs.readFileSync(path.join(root,...file.split('/')));
  return [file,Buffer.from(bytes.toString('utf8').replace(/\r\n?|\n/g,'\r\n'),'utf8')];
}));
const crlf=buildAiAssuranceFingerprint({rootDir:root,overrides:crlfOverrides});
if(crlf.fingerprint!==baseline.fingerprint)throw new Error('CRLF/LF checkout drift changes the canonical AI fingerprint');

const mutatedOverrides=new Map(crlfOverrides);
const mutationFile='src/js/07-gemini.js';
mutatedOverrides.set(mutationFile,Buffer.concat([mutatedOverrides.get(mutationFile),Buffer.from('\n// assurance-negative-mutation\n','utf8')]));
const mutated=buildAiAssuranceFingerprint({rootDir:root,overrides:mutatedOverrides});
if(mutated.fingerprint===baseline.fingerprint)throw new Error('Semantic negative mutation did not invalidate the AI fingerprint');
if(!fs.readFileSync(storedPath).equals(storedBefore))throw new Error('Normalization check changed the approved stored fingerprint');

const stored=JSON.parse(storedBefore.toString('utf8'));
const storedRows=new Map((stored.files||[]).map(row=>[row.path,row]));
const changedFiles=baseline.files.filter(row=>storedRows.get(row.path)?.sha256!==row.sha256||storedRows.get(row.path)?.size!==row.size).map(row=>row.path);
const result={
  schema:'git-s81-ai-fingerprint-normalization-v1',
  status:'PASS',
  storedFingerprint:stored.fingerprint,
  candidateFingerprint:baseline.fingerprint,
  crlfCandidateFingerprint:crlf.fingerprint,
  negativeMutationFingerprint:mutated.fingerprint,
  negativeMutationFile:mutationFile,
  changedFiles,
  storedFingerprintUpdated:false
};
fs.mkdirSync(path.join(root,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(root,'qa-results','s81-ai-fingerprint-normalization.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
