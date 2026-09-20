import fs from 'node:fs';

const read = f => fs.readFileSync(f,'utf8');
const core = read('src/js/01-core.js');
const shell = read('src/shell.html');
const ai = read('src/js/07z-ai-core-integration.js');
const gemini = read('src/js/07-gemini.js');
let fail = 0;
const ok = (cond,msg) => { if(cond) console.log('PASS',msg); else { fail++; console.error('FAIL',msg); } };

ok(/'generator-help-answer':\{[^}]*defaultModelProfile:'balanced'/.test(ai),'Poradce používá balanced AI Core profil');
ok(core.includes('gaRelevantKbEntries') && core.includes('generatorAssistantContext') && core.includes('gaValidateAiAnswer'),'Poradce má lokální retrieval, aktuální kontext a validaci opor');
ok(core.includes('currentContext') && core.includes('má vyšší prioritu než obecný popis'),'Dotazy na právě sestavovaný test používají aktuální stav');
ok(core.includes("id:'google-forms-secure'") && core.includes('SECURE-ANSWERS-V1') && core.includes('importFormsCsvFile()'),'KB zná Google Forms secure workflow');
ok(!/Model lze změnit v závěrečném kroku|⚡ Silný|🪶 Lite|quickModel\(/.test(core),'KB nenabádá k ruční volbě konkrétního modelu');
ok(!/geminiModelInput|qmStrong|qmLite|quickModel\(/.test(shell),'UI neobsahuje volbu konkrétního modelu');
ok(/GEMINI_PROFILE_MODELS/.test(gemini) && /resolveGeminiModel\(profile='quality'\)/.test(gemini),'Direct transport mapuje interní AI Core profily');
ok(!/modelOverride/.test(gemini),'Provider credential/UI už nepřepisuje AI Core profil konkrétním modelem');
ok(!/id="bezpKod"|generatorSettingsSecurityInput|securityWorkplaceField/.test(shell),'Legacy týmový bezpečnostní kód není v UI');

if(fail) process.exit(1);
console.log('Generator Assistant / AI Core invariants: PASS');
