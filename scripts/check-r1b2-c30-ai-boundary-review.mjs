import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../src/js/08-manual-editor.js',import.meta.url),'utf8');
const repairedBlock=source.slice(source.indexOf('if (lastGeminiJsonRepaired)'),source.indexOf('generationResumeCheckpoint=null',source.indexOf('if (lastGeminiJsonRepaired)')));
const checks=[];
function check(id,title,fn){try{fn();checks.push({id,title,status:'PASS'});console.log(`PASS ${id} - ${title}`)}catch(error){checks.push({id,title,status:'FAIL',detail:error.message});console.error(`FAIL ${id} - ${title}: ${error.message}`)}}

check('C30-AI-01','secure repaired-JSON warning explains possible content change and requires teacher preview before release',()=>{
  assert.match(repairedBlock,/mohla změnit obsah/i);
  assert.match(repairedBlock,/KLASIFIKOVANÝ test[\s\S]*PŘED ZVEŘEJNĚNÍM[\s\S]*Teacher preview/i);
});
check('C30-AI-02','secure repaired-JSON warning explains the discard decision',()=>{
  assert.match(source,/(?:Zahodit|zahodíš)[\s\S]{0,240}(?:gener|odstran)/i);
});
check('C30-AI-03','instant repaired-JSON warning requires answer review and preserves the second-pass option',()=>{
  assert.match(repairedBlock,/mohla změnit obsah[\s\S]*učitelském náhledu[\s\S]*Ověřit klíč druhým průchodem/i);
});
check('C30-AI-04','legacy hybrid helper retains its five-argument contract instead of an incompatible alias',()=>{
  assert.match(source,/async function runHybridGeneration\s*\(\s*st\s*,\s*filePack\s*,\s*useUrlContext\s*,\s*complexIdxs\s*,\s*simpleIdxs(?:\s*,\s*progressId)?\s*\)/);
  assert.doesNotMatch(source,/const\s+runHybridGeneration\s*=\s*generateTestWithManual/);
});
check('C30-AI-05','telemetry failure remains observable without changing the generation result',()=>{
  assert.match(source,/function recordGeneratorTelemetry[\s\S]{0,700}catch\s*\(\s*error\s*\)\s*\{[\s\S]{0,160}console\.warn/);
});
check('C30-AI-06','AI-unavailable guidance distinguishes session-key and school-session recovery',()=>{
  assert.match(source,/AI služba není dostupná[\s\S]{0,300}GitHub[\s\S]{0,300}klíč jen pro relaci[\s\S]{0,300}(?:škol|škola)[\s\S]{0,300}serverovou relaci/i);
});
check('C30-AI-07','quota guidance retains a concrete retry delay and warns against repeated requests',()=>{
  assert.match(source,/limit Gemini API[\s\S]{0,200}geminiFormatWait[\s\S]{0,240}(?:Neklikej|opakuj)/i);
});

const failed=checks.filter(x=>x.status==='FAIL');
if(failed.length){console.error(`FAIL R1-B2 C30 AI-boundary review (${checks.length-failed.length}/${checks.length})`);process.exitCode=1}else console.log(`PASS R1-B2 C30 AI-boundary review (${checks.length}/${checks.length})`);
