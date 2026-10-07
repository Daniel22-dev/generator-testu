// Synthetic fixtures only; private generated HTML/JWK remain in memory.
import {webcrypto,createHash} from 'node:crypto';
import {w,configure,build,genDom,GEN} from './redteam-harness-utils.mjs';
export const policy={schoolDomain:'example.invalid',publishedAt:'2026-10-04T11:59:00Z',csvTimezone:'Europe/Prague',emailHeader:'Email Address',timestampHeader:'Timestamp',verifiedEmailConfirmed:true,domainRestrictedConfirmed:true,csvOriginalConfirmed:true};
export const source={source:'google-forms-csv',fullYearCsv:false,formIdentity:'synthetic-a@example.invalid',formTimestamp:'2026-10-04T12:36:00Z'};
export const clone=x=>structuredClone(x);
export const b64=x=>Buffer.from(x).toString('base64url');
export async function publicEncrypt(publicKey,raw){
  const aes=await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']),iv=webcrypto.getRandomValues(new Uint8Array(12));
  const bytes=typeof raw==='string'?new TextEncoder().encode(raw):raw;
  const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},aes,bytes),pub=await webcrypto.subtle.importKey('jwk',publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const key=await webcrypto.subtle.encrypt({name:'RSA-OAEP'},pub,await webcrypto.subtle.exportKey('raw',aes));
  return {mode:'encrypted',alg:'RSA-OAEP+AES-GCM',key:b64(key),iv:b64(iv),data:b64(data)};
}
export async function packet(f,p,raw){return {testId:f.cfg.testId,manifestHash:f.cfg.manifestHash,payload:await publicEncrypt(f.cfg.publicKey,raw??JSON.stringify(p))};}
export const text=pack=>'SECURE-ANSWERS-V1\n'+JSON.stringify(pack);
export function reset(f){const v=f.v;v.localStorage.removeItem(v.verifierReplayStorageKey());v.eval('VERIFIER_REPLAY_HISTORY=[];VERIFIER_REPLAY_CHAIN=Promise.resolve();');/* 7.1.97: a policy change re-evaluates instead of clearing */if(v.clearVerifierResults)v.clearVerifierResults();v.setFormsAnchorPolicy(policy);}
export async function createFixtures(){
  const fixtures={};
  for(const kind of ['default','joker','variant']){
    configure({testMode:'prisny',resultMode:'secureOffline',screenGuard:true,identityMode:'oneTimeCode',cas:40,zolicek:kind==='joker'?'ANO':'NE',diferencovany:kind==='variant'?'ANO':'NE',skupiny:kind==='variant'?[{nazev:'Variant A',podminky:'Synthetic A only',studenti:['A7B9C2']},{nazev:'Variant B',podminky:'Synthetic B only',studenti:['D4E6F8']}]:[]});
    w.eval("rosterEntries=[{code:'A7B9C2',label:'Synthetic A',email:'synthetic-a@example.invalid'},{code:'D4E6F8',label:'Synthetic B',email:'synthetic-b@example.invalid'}];");
    const data=kind==='variant'?{group_variants:{g1:clone(GEN),g2:clone(GEN)}}:clone(GEN);
    const pkg=kind==='variant'?await w.assembleTestHtml(w.eval('state'),data):await build();
    const x=genDom(pkg.studentHtml),v=genDom(pkg.teacherHtml);await new Promise(r=>setTimeout(r,0));
    const cfg=x.eval('CFG');
    const base={v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:pkg.studentHtmlSha256,attemptId:'E8-BASE',identityMode:'oneTimeCode',code:'A7B9C2',student:'A7B9C2',groupKey:kind==='variant'?'g1':'__default',startedAt:'2026-10-04T12:00:00Z',submittedAt:'2026-10-04T12:35:00Z',jokerUsed:false,jokerSelectedAt:'',resp:{'0_0':1,'0_1':0,'0_2':1,'0_3':0,'0_4':1},answerChangeStats:{},totalAnswerChanges:0,securityEvents:[{t:'2026-10-04T12:00:00Z',type:'attempt-start'}],userAgent:'SYNTHETIC-E8-HARNESS'};
    fixtures[kind]={kind,pkg,cfg,base,x,v};reset(fixtures[kind]);
  }
  return fixtures;
}
export const evidenceHash=x=>createHash('sha256').update(x).digest('hex');
