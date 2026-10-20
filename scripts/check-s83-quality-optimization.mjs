#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parse} from 'acorn';

const BASE='156b8ba3157a13aa5f8b711e3173cb9518cb8469';
const root=path.resolve('.');
const sourceCore=path.join(root,'src','js','01-core.js');
const sourceAcorn=path.join(root,'node_modules','acorn','dist','acorn.js');
const builtHtml=path.join(root,'dist','index.html');
const builtFeature=path.join(root,'dist','features','generator-assistant.js');
const builtAcorn=path.join(root,'dist','vendor','acorn.js');
const output=path.join(root,'qa-results','s83-quality-optimization.json');
const markerStart='/* Generator Assistant — lokální poradce ke generátoru (KB + UI + volitelné AI). */';
const markerEnd='/* konec Generator Assistant */';
const read=file=>fs.readFileSync(file,'utf8');
const bytes=value=>Buffer.byteLength(value,'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(text,needle)=>text.split(needle).length-1;
const checks=[];
function check(condition,id,detail){assert.ok(condition,`${id}: ${detail}`);checks.push({id,status:'PASS',detail});console.log(`PASS ${id} - ${detail}`);}

for(const [index,file] of [sourceCore,sourceAcorn,builtHtml,builtFeature,builtAcorn].entries())check(fs.existsSync(file),`S83-Q01${String.fromCharCode(97+index)}`,`${path.relative(root,file)} exists`);
const core=read(sourceCore),html=read(builtHtml),feature=read(builtFeature),acornSource=read(sourceAcorn),acornBuilt=read(builtAcorn);
check(count(core,markerStart)===1&&count(core,markerEnd)===1,'S83-Q02','assistant boundaries are unique and auditable in canonical source');
const section=core.slice(core.indexOf(markerStart),core.indexOf(markerEnd)+markerEnd.length);
check(bytes(section)>100000,'S83-Q03','the large optional assistant section is identified structurally, not by individual phrases');
check(html.includes("ghrabGeneratorFeatureLoader('generatorAssistant','./features/generator-assistant.js')"),'S83-Q04','release shell loads the assistant only through the existing feature loader');
check(!html.includes('const GENERATOR_ASSISTANT_KB=[')&&feature.includes('const GENERATOR_ASSISTANT_KB=['),'S83-Q05','assistant knowledge/UI code moved from critical HTML into its lazy feature');
check(feature.includes('GHRABGeneratorFeatures.generatorAssistant={open:window.openGeneratorAssistant,verify:window.verifyGeneratorAssistantKB}'),'S83-Q06','lazy feature registers the same public open and verification operations');
check(!/<script\b[^>]*src=["'][^"']*generator-assistant\.js/i.test(html),'S83-Q07','assistant feature is not eagerly fetched by a release-shell script tag');
check(bytes(feature)>100000&&bytes(feature)<bytes(section),'S83-Q08','assistant feature is present and compacted without a duplicate inline copy');
parse(feature,{ecmaVersion:'latest',sourceType:'script'});
parse(acornBuilt,{ecmaVersion:'latest',sourceType:'script'});
check(bytes(acornBuilt)<bytes(acornSource)-50000,'S83-Q09','vendored Acorn is syntax-checked and compacted by more than 50 kB');
const baseCore=execFileSync('git',['show',`${BASE}:src/js/01-core.js`],{encoding:'utf8',maxBuffer:20*1024*1024});
const splitAroundAssistant=value=>{
  const start=value.indexOf(markerStart),end=value.indexOf(markerEnd);
  assert.ok(start>=0&&end>=start,'Generator Assistant boundaries must exist');
  return {before:value.slice(0,start),after:value.slice(end+markerEnd.length)};
};
const baseParts=splitAroundAssistant(baseCore),currentParts=splitAroundAssistant(core);
const releaseBlock=value=>value.match(/const RELEASE = Object\.freeze\(\{[\s\S]*?\n\}\);\n/)?.[0]||'';
const baseRelease=releaseBlock(baseParts.before),currentRelease=releaseBlock(currentParts.before);
assert.ok(baseRelease&&currentRelease,'release metadata block must remain structurally identifiable');
const releaseVersion=JSON.parse(read(path.join(root,'package.json'))).version;
const reviewedReleasePattern=releaseVersion==='7.1.101'
  ? /version:\s*'7\.1\.101'[\s\S]*date:\s*'2026-10-20'[\s\S]*HOTFIX \(7\.1\.101, 20\. 10\. 2026\)[\s\S]*VELKÁ AKTUALIZACE V7 \(7\.1\.100\)/
  : releaseVersion==='7.1.100'
    ? /version:\s*'7\.1\.100'[\s\S]*date:\s*'2026-10-18'[\s\S]*VELKÁ AKTUALIZACE V7 \(7\.1\.100\)/
    : null;
assert.ok(reviewedReleasePattern,'unreviewed metadata version');
assert.match(currentRelease,reviewedReleasePattern,'only the exact reviewed 7.1.100 or 7.1.101 release metadata is allowed outside the assistant section');
const normalizedCurrentBefore=currentParts.before.replace(currentRelease,baseRelease);
check(baseParts.before===normalizedCurrentBefore&&baseParts.after===currentParts.after,'S83-Q10a','canonical core changes stay confined to the auditable Generator Assistant section plus reviewed 7.1.100 release metadata');
const acornDiff=execFileSync('git',['diff','--name-only',BASE,'--','node_modules/acorn/dist/acorn.js'],{encoding:'utf8'}).trim();
check(acornDiff==='','S83-Q10b','third-party Acorn source bytes remain unchanged');
const scripts=JSON.parse(read(path.join(root,'package.json'))).scripts||{};
check(scripts.postbuild?.includes('check:s83-quality-optimization')&&scripts['preqa:p5']?.includes('check:s83-quality-browser')&&scripts['preqa:p5:ci']?.includes('check:s83-quality-browser'),'S83-Q11','source and Chromium regressions are mandatory build/release-sequence gates');

const result={schema:'git-s83-quality-optimization-v1',status:'PASS',gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base:BASE,metrics:{entryHtmlBytes:bytes(html),assistantFeatureBytes:bytes(feature),assistantSourceSectionBytes:bytes(section),acornSourceBytes:bytes(acornSource),acornBuiltBytes:bytes(acornBuilt)},sha256:{entryHtml:sha(html),assistantFeature:sha(feature),acornBuilt:sha(acornBuilt)},checks};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(`PASS Sprint 08.3 quality optimization (${checks.length} checks)`);
