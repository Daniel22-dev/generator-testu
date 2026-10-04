#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const verifier=(fs.readFileSync('src/js/13f-secure-teacher-verifier.js','utf8')+'\n'+fs.readFileSync('src/js/13ef-secure-verifier-replay.js','utf8'));
const ui=fs.readFileSync('src/js/13eb-secure-teacher-verifier-v2-ui.js','utf8');
function extractFunction(source,name){const marker=`function ${name}(`,start=source.indexOf(marker);if(start<0)throw new Error(`Chybí funkce ${name}`);const open=source.indexOf('{',start);let depth=0,quote='',escaped=false,line=false,block=false;for(let i=open;i<source.length;i++){const c=source[i],n=source[i+1]||'';if(line){if(c==='\n')line=false;continue}if(block){if(c==='*'&&n==='/'){block=false;i++}continue}if(quote){if(escaped){escaped=false;continue}if(c==='\\'){escaped=true;continue}if(c===quote)quote='';continue}if(c==='/'&&n==='/'){line=true;i++;continue}if(c==='/'&&n==='*'){block=true;i++;continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1)}throw new Error(`Neukončená funkce ${name}`)}
const names=['normStudentKey','rebuildDuplicateState','duplicateInfo','effectiveResults','unresolvedAttemptConflicts','duplicateWarningsFor','eventCount','eventTime','eventDetails','recoveryUnlockEvents','legacyUnlockEvents','securityEventTimelineText','durationMinutes','answerChangeTotal','rosterMap','submittedCode','rosterIsCodeMode','rosterLabel','rosterHasCode','displayStudent','securitySignalsFor','securityIssueCount','securitySignalText'];
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync('src/js/13ec-secure-verifier-trust.js','utf8'),ctx);
vm.runInContext(vm.runInContext('SECURE_VERIFIER_TRUST_JS',ctx),ctx);
vm.runInContext(`var CONFIG={identityMode:'oneTimeCode',roster:[{code:'ABC234',label:'QA student'}],cas:40};var RESULTS=[];var ATTEMPT_DECISIONS=new Map();\n${names.map(n=>extractFunction(verifier,n)).join('\n')}`,ctx);
function assert(cond,msg){if(!cond)throw new Error(msg);console.log(`PASS ${msg}`)}
const row={status:'OK',student:'ABC234',code:'ABC234',submissionDigest:'d5-meta-1',attemptId:'ATT-D5-1',earned:1,total:2,pct:50,grade:'4',groupKey:'__default',securityEvents:[],answerChangeStats:{},totalAnswerChanges:0,details:[],metadataMismatch:['název ve formuláři neodpovídá ověřenému testu'],envelopeMismatch:[]};
ctx.RESULTS.push(row);
const signals=ctx.securitySignalsFor(row,ctx.duplicateInfo()).filter(s=>s.code==='metadata-mismatch');
assert(signals.length===1,'metadata mismatch vytváří právě jeden security signál');
assert(signals[0].code==='metadata-mismatch','metadata mismatch používá samostatný signal code');
assert(signals[0].sev==='soft','Google Forms metadata mismatch je měkký, nikoli tvrdý signál');
assert(signals[0].label.includes('METADATA MISMATCH'),'security label zachovává jasné označení METADATA MISMATCH');
assert(signals[0].detail.includes('název ve formuláři neodpovídá ověřenému testu'),'security detail zachovává konkrétní důvod nesouladu');
assert(ctx.securityIssueCount(row)===3,'security KPI počítá metadata mismatch, prázdnou telemetrii a neověřené kotvy odděleně');
assert(ctx.securitySignalText(row,ctx.duplicateInfo()).join(' ').includes('METADATA MISMATCH'),'Results/CSV text čerpá metadata mismatch ze sjednoceného signal modelu');

const buildFn=extractFunction(verifier,'buildSecureTeacherVerifierHtml');
const introStart=buildFn.indexOf("auditCommentHtml(safeCfg)+'<div class=\"wrap\"");
const introEnd=buildFn.indexOf('<details class=\"card teacher-preview-details\"');
assert(introStart>0&&introEnd>introStart,'nalezen dashboard intro segment');
const intro=buildFn.slice(introStart,introEnd);
for(const forbidden of ['Creator ID:','Kontrola integrity:','studentHtmlSha256','manifestHash'])assert(!intro.includes(forbidden),`Dashboard intro neobsahuje low-level údaj ${forbidden}`);
assert(intro.includes('Technické údaje'),'Dashboard vysvětluje, kde jsou technická metadata');
assert(/I\('tech',[\s\S]*Creator ID[\s\S]*Manifest SHA-256[\s\S]*Student HTML SHA-256[\s\S]*Kontrola integrity/.test(ui),'Technické údaje obsahují autora, build a integrity metadata');
assert(/m=\[\['⌂','Dashboard'\][\s\S]*\['⚙','Technické údaje'\]\]/.test(ui),'navigace používá ikonovou a textovou hierarchii všech sedmi panelů');
assert(/\.v2-nav \.active[\s\S]*box-shadow:inset 3px 0 0 var\(--v2-accent\)/.test(ui),'aktivní desktop panel má jednoznačný vizuální marker');
assert(/@media\(max-width:760px\)[\s\S]*\.v2-nav \.active\{box-shadow:inset 0 -3px 0 var\(--v2-accent\)/.test(ui),'aktivní mobilní panel má jednoznačný spodní marker');
assert(/function refreshVerifierDashboard\(\)[\s\S]*w=r\.reduce/.test(ui),'Dashboard security KPI používá stejnou resolvedResults populaci jako Security panel');
const renderTable=extractFunction(verifier,'renderTable');
assert(renderTable.includes('securitySignalText(r,info)'),'Results status používá sjednocený security signal text');
assert(!renderTable.includes("if(mm.length)status+='; METADATA MISMATCH"),'Results už neduplikuje metadata mismatch druhým paralelním varováním');
console.log('PASS D5 Teacher Verifier IA/security regression');
