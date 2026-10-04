import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='redteam/E7';
const matrix=JSON.parse(fs.readFileSync(dir+'/mobile-matrix.json','utf8'));
const script=fs.readFileSync('scripts/e7-checklist-ui.js','utf8');
const scriptHash=crypto.createHash('sha256').update(script).digest('base64');
const html=`<!doctype html><html lang="cs"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>GIT E7 · Mobilní checklist 7.1.83</title>
<style>body{font:17px/1.55 system-ui,sans-serif;color:#182331;background:#f1f4f7;margin:0}main{max-width:900px;margin:auto;padding:24px}h1{font-size:1.8rem}h2{font-size:1.2rem}article,fieldset{border:1px solid #bdc9d4;border-radius:8px;background:white;padding:20px;margin:18px 0}label{display:block;margin:10px 0}input,textarea,select,button{font:inherit;max-width:100%;box-sizing:border-box;border:1px solid #536679;border-radius:4px;padding:8px}input,textarea{display:block;width:100%}textarea{min-height:100px}button{background:#183f63;color:white;cursor:pointer}.notice{border-left:5px solid #9c5010;background:#fff5e9;padding:16px}#message{font-weight:600}details{margin:16px 0}strong{color:#233f58}@media print{button{display:none}article{break-inside:avoid}body{background:white}}</style>
<main><h1>GIT · E7 mobilní checklist</h1><p>Checkpoint ${matrix.version} · 40 scénářů · 4 fyzické profily</p>
<p class="notice"><strong>ANALYZED / NOT TESTED</strong><br>Ostrý experiment: NOT READY – BLOCKING ISSUE. Tento offline záznamník sám žádný telefon netestuje. Ruční záznamy: MANUALLY REPORTED / NOT VERIFIED.</p>
<details open><summary>Jak jej použít</summary><p>Na soukromém PC vlastníka sleduj skutečný telefon/tablet. Použij pouze syntetická data, hard režim a skutečný 40minutový limit. Každý profil i případ má samostatný záznam. Přečti také MOBILE-PROTOCOL.txt.</p><p>PASS vyžaduje pozorování, ID sanitizovaného důkazu a provedenou negativní kontrolu. PASS limitu potvrzuje limit, nikoli zablokovaný útok. Nedostupná funkce = NOT APPLICABLE s důvodem. Headless WebKit není iOS Safari.</p><p>Bez sítě a bez automatického ukládání: před zavřením exportuj JSON. Neukládej zde payload, skutečné emaily, odpovědi, kódy, hesla, privátní klíč nebo roster. Všechny ruční výsledky vyžadují soukromý přezkum vlastníka.</p></details>
<label>Fyzický profil <select id="profile"></select></label><p id="profile-help"></p>
<fieldset><legend>Metadata tohoto profilu</legend>
${[['device','Model zařízení'],['os','OS verze / build'],['browser','Browser produkt / přesná verze'],['locale','Locale'],['origin','Pilotní HTTPS origin bez cesty, např. https://pilot.example.invalid'],['artifactSha256','SHA-256 přesného student HTML'],['runId','Neutajovaný opaque pilot run ID'],['aiFeatures','Skutečně dostupné AI funkce / app verze']].map(([id,label])=>`<label>${label}<input id="${id}" autocomplete="off" maxlength="300"></label>`).join('')}
</fieldset><button id="export" type="button">Exportovat všechny profily do JSON</button><p id="message" role="status" aria-live="polite"></p><div id="cases"></div>
<p>F7, E6 residual/cache/rotation, E8–E10 a reálné mobilní ověření zůstávají otevřené. Druhý telefon: MIMO TECHNICKÝ DOSAH – POUZE DOZOR.</p></main>
<script id="matrix" type="application/json">${JSON.stringify(matrix).replaceAll('<','\\u003c')}</script><script>${script}</script></html>\n`;
fs.writeFileSync(dir+'/MOBILE-CHECKLIST.html',html);
const rows=matrix.cases.map(c=>`${c.id} — ${c.title}\nProfily: ${c.profiles.join(', ')}\nKategorie (analýza): ${c.categories.join(' / ')}\nStav: NOT RUN\n${c.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\nOČEKÁVÁNÍ: ${c.expected}\nHRANICE: ${c.limits}\nNEGATIVNÍ KONTROLA: ${c.negativeControl}\nDŮKAZ: ${c.evidence.join('; ')}\nPozorování: __________________\nNegativní kontrola výsledek: __________________\n`);
fs.writeFileSync(dir+'/MOBILE-MATRIX.txt',`GIT E7 · ${matrix.version}\nANALYZED / NOT TESTED — NOT READY – BLOCKING ISSUE\n40 ručních scénářů. Všechny fyzické výsledky NOT RUN.\nNávod a interpretace PASS: MOBILE-PROTOCOL.txt.\n\n`+rows.join('\n'));
console.log('E7 manual checklist generated; no mobile execution.');
