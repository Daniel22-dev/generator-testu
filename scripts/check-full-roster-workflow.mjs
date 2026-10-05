#!/usr/bin/env node
import fs from 'node:fs';
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
ck(/function rosterChosenParticipants\(\)\{return rosterParseEmails\(val\('rosterEmails'\)\);\}/.test(lab),'aktivní roster = celá vložená skupina');
ck(!/participantMode/.test(lab+form+manual+ui+core),'produkční workflow nemá historický participantMode');
ck(!/participantsDeferredOk|outputParticipantsPending/.test(form+gate+lab),'odstraněny deferred/pending větve');
ck(/email,student,code,test_id,odeslat/.test(lab)&&/'FALSE'/.test(lab),'CSV pro Sheets obsahuje nezaškrtnuté odeslat');
if(fail)process.exit(1);console.log('PASS full-roster workflow contract');
