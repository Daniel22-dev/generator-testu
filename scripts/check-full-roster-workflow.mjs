#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
const shell=fs.readFileSync('src/shell.html','utf8');
const lab=fs.readFileSync('src/js/10-testlab.js','utf8');
const form=fs.readFileSync('src/js/05-form-fields.js','utf8');
const manual=fs.readFileSync('src/js/08-manual-editor.js','utf8');
const ui=fs.readFileSync('src/js/03-ui-render.js','utf8');
const core=fs.readFileSync('src/js/01-core.js','utf8');
const gate=fs.readFileSync('src/js/09-selftest-keycheck.js','utf8');
let fail=0;const ck=(ok,msg)=>{console.log((ok?'PASS ':'FAIL ')+msg);if(!ok)fail++;};
ck(!/id="participantMode"|id="participantSearch"|id="participantList"/.test(shell),'UI nemá operativní výběr účastníků');
ck(!/rosterSelectedEmails|rosterSetParticipantMode|rosterToggleParticipant/.test(lab),'odstraněn stav a handlery výběru účastníků');
// Stage08 retains the full original email list; the canonical link may only enrich
// identities and labels, never drop or reorder members (including stale projections).
const chosenDefinition=lab.match(/function rosterChosenParticipants\(\)\{[\s\S]*?\n\}/)?.[0]||'';
function chooseWithProjection(transform){
  const emails=[{email:'alpha@example.edu',label:'alpha'},{email:'beta@example.edu',label:'beta'}];
  let observed='';
  const env={
    val:()=>emails.map(x=>x.email).join('\n'),
    rosterParseEmails:()=>emails.map(x=>({...x})),
    globalThis:{GHRAB_GENERATOR_GROUPS:{onRosterInput:raw=>{observed=raw;},mapRoster:transform}}
  };
  const picked=vm.runInNewContext(chosenDefinition+'\nrosterChosenParticipants()',env,{timeout:1500});
  return {picked,emails,observed};
}
ck(!!chosenDefinition && /const parsed=rosterParseEmails\(raw\)/.test(chosenDefinition),
  'výchozím rosterem zůstávají všechny platné e-maily z pole');
const enriched=chooseWithProjection(entries=>entries.map((e,i)=>({...e,memberId:'mem_'+String(i+1).padStart(12,'0')})));
ck(enriched.picked.length===2 && enriched.picked[0].email===enriched.emails[0].email &&
  enriched.picked[1].email===enriched.emails[1].email &&
  enriched.picked.every(x=>/^mem_/.test(x.memberId)) && !!enriched.observed,
  'kanonická projekce obohacuje pouze identity, ale zachovává celé členství');
const incomplete=chooseWithProjection(entries=>entries.slice(0,1));
ck(incomplete.picked.length===2 && incomplete.picked.every((e,i)=>e.email===incomplete.emails[i].email),
  'ani částečná kanonická projekce nemůže odebrat studenta');
const reordered=chooseWithProjection(entries=>entries.slice().reverse());
ck(reordered.picked.length===2 && reordered.picked.every((e,i)=>e.email===reordered.emails[i].email),
  'kanonická projekce nemůže změnit pořadí celé skupiny');
ck(!/participantMode/.test(lab+form+manual+ui+core),'produkční workflow nemá historický participantMode');
ck(!/participantsDeferredOk|outputParticipantsPending/.test(form+gate+lab),'odstraněny deferred/pending větve');
ck(/email,student,code,test_id,odeslat/.test(lab)&&/'FALSE'/.test(lab),'CSV pro Sheets obsahuje nezaškrtnuté odeslat');
ck(/function downloadTargetContext\([\s\S]*window\.top\.location\.origin===window\.location\.origin/.test(lab),'CSV download podporuje same-origin embedded AI Studio');
ck(/Roster a kódy zůstávají jen v paměti právě otevřené relace GIT/.test(shell),'UI vysvětluje nepřenášení citlivého rosteru do nové relace');
if(fail)process.exit(1);console.log('PASS full-roster workflow contract');
