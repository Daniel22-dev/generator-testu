#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const publicFiles=[
  'src/js/13de-secure-student-guard.js',
  'src/js/13dh-secure-student-submit.js',
  'src/js/13di-secure-strict-mode-runtime.js',
  'src/js/13e-secure-student-runtime.js',
];
const publicSource=publicFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n');
const previewSource=fs.readFileSync('src/features/preview-editor.js','utf8');
const privateAdapterSource=previewSource.slice(
  previewSource.indexOf('function installSecureTeacherPreviewRuntime()'),
  previewSource.indexOf('function privateTeacherPreviewRuntimeHtml()'),
);
const forbidden=[
  '__GHRAB_TEACHER_PREVIEW__',
  'strictTeacherPreview',
  'preview-ready',
  'isolated-teacher-srcdoc',
  'about:srcdoc',
  '__GHRAB_PRIVATE_TEACHER_PREVIEW__',
  'data-ghrab-private-teacher-preview',
];

function publicViolations(source){
  return forbidden.filter(token=>source.includes(token));
}

assert.deepEqual(publicViolations(publicSource),[],'public student runtime must contain no teacher-preview capability or privileged context');
assert.match(previewSource,/function installSecureTeacherPreviewRuntime\(\)/,'private adapter must live in the generator preview feature');
assert.match(previewSource,/data-ghrab-private-teacher-preview="1"/,'transient preview copy must carry an auditable private adapter tag');
assert.match(previewSource,/function createPreviewFrame\([\s\S]*createElement\(['"]iframe['"]\)[\s\S]*previewInstance/,'each open must create a fresh iframe');
assert.match(previewSource,/function destroyPreviewFrame\([\s\S]*removeChild/,'close must destroy the iframe');
assert.match(previewSource,/storageGet=function\(\)\{return null;\}/,'private adapter must use memory-only storage behavior');
assert.match(previewSource,/idbPut=async function\(\)\{return true;\}/,'private adapter must not write IndexedDB');
assert.match(previewSource,/openSubmissionForm=function\(\)\{\}/,'private adapter must not open Forms');
assert.doesNotMatch(privateAdapterSource,/\.innerHTML\s*=/,'private adapter must not introduce a new HTML sink');

const mutations=[
  ['legacy-marker',publicSource+'\nwindow.__GHRAB_TEACHER_PREVIEW__=true;'],
  ['legacy-helper',publicSource+'\nfunction strictTeacherPreview(){return true;}'],
  ['preview-ready',publicSource+'\nconst state="preview-ready";'],
  ['privileged-srcdoc',publicSource+'\nif(location.href==="about:srcdoc")return true;'],
  ['private-adapter-leak',publicSource+'\nwindow.__GHRAB_PRIVATE_TEACHER_PREVIEW__=true;'],
];
for(const [name,mutated] of mutations){
  assert.ok(publicViolations(mutated).length>0,`negative mutation ${name} must be rejected`);
}

const weakenedPreview=previewSource.replace('openSubmissionForm=function(){};','openSubmissionForm=function(){window.open(CFG.formsSubmissionUrl);};');
assert.equal(/openSubmissionForm=function\(\)\{\}/.test(weakenedPreview),false,'Forms-enabling preview mutation must be rejected');

const sinkMutation=privateAdapterSource.replace('box.replaceChildren(ok);','box.innerHTML="<div>preview</div>";');
assert.match(sinkMutation,/\.innerHTML\s*=/,'private-preview HTML-sink mutation must be detected');

console.log(`PASS R1-A2 preview separation: ${publicFiles.length} public modules clean, ${mutations.length+2} negative mutations rejected`);
