// Test-only mutations of actual exported artifacts. Never persist private HTML.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as acorn from 'acorn';
export const mutants = [
  {id:'teacher-hash-leak',stage:'E1',script:'check-redteam-isolation.mjs',field:'studentHtml',seam:'const CFG={',prefix:'"ucitelPinHash":"E9_SYNTHETIC_LEAK",'},
  {id:'encryption-as-authenticity',stage:'E2',script:'check-redteam-trust-e2.mjs',env:{GIT_REDTEAM_E2_CASE:'trust'},field:'teacherHtml',seam:'function submissionTrust(payload,source,anchors){',prefix:"return {runtimeAuthenticity:'PREVENTED',classificationAuthorization:'AUTHORIZED'};"},
  {id:'forms-identity-bypass',stage:'E3',script:'check-redteam-verifier-e3.mjs',env:{GIT_REDTEAM_E3_CASE:'identity'},field:'teacherHtml',seam:'function e3Require(ok,code,message){',prefix:"if(code==='anchors.identity-mismatch')return;"},
  {id:'persistence-fail-open',stage:'E4',script:'check-redteam-storage-faults-e4.mjs',env:{GIT_REDTEAM_E4_FAULT:'active-write-failure'},field:'studentHtml',seam:'function blockAttemptPersistence(){',prefix:'return;'},
  {id:'navigation-guard-disabled',stage:'E5',script:'check-redteam-runtime-e5.mjs',env:{GIT_REDTEAM_E5_CASE:'beforeunload-lock'},field:'studentHtml',seam:'function handleLeave(kind,reason){',prefix:'return;'},
  {id:'frozen-guard-disabled',stage:'E5',script:'check-redteam-runtime-e5.mjs',env:{GIT_REDTEAM_E5_CASE:'lifecycle-lock'},field:'studentHtml',seam:'function handleLeave(kind,reason){',prefix:'return;'},
  {id:'publication-answer-leak',stage:'E6',script:'check-redteam-publication-e6.mjs',env:{GIT_REDTEAM_E6_CASE:'generated-student-and-private-pair'},field:'studentHtml',seam:'const CFG={',prefix:'"answerKey":"E9_SYNTHETIC_LEAK",'},
];
export function mutateArtifact(html,seam,prefix){
  assert.equal(html.split(seam).length,2,'E9 mutation seam must occur exactly once: '+seam);
  let broken=html.replace(seam,seam+prefix);
  // Native negative controls must execute; deliberately recertify only the
  // changed test script's CSP hash. Normal artifacts keep their original CSP.
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
    if(!match[1].includes(seam))continue;
    const altered=match[1].replace(seam,seam+prefix);
    acorn.parse(altered,{ecmaVersion:'latest',sourceType:'script'});
    const hash=s=>createHash('sha256').update(s).digest('base64');
    broken=broken.replaceAll("'sha256-"+hash(match[1])+"'","'sha256-"+hash(altered)+"'");
  }
  return broken;
}
export function applyRegressionMutation(pkg,id){
  const m=mutants.find(x=>x.id===id);assert.ok(m,'Unknown E9 mutation '+id);
  return {...pkg,[m.field]:mutateArtifact(pkg[m.field],m.seam,m.prefix)};
}
