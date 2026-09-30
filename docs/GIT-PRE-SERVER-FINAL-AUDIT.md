# GIT – závěrečný audit poslední předserverové etapy

## Stav auditu
- Audited implementation SHA: `86d0500503137d617feda12a9d430d8c0c5fdd5e`
- Baseline main SHA: `49392b573078b21174d777cb1ef900ad7c26d4b2`
- Baseline version: `7.1.59`
- Release version bump: zatím neproveden; patří až do FÁZE 12.
- Live classroom pilot: **LIVE CLASSROOM TEST REQUIRED**. Automatické a browser E2E testy jej nenahrazují.

## Executive summary
Poslední předserverová etapa implementuje jeden univerzální Google Form / celoroční Response Sheet, automatické předání metadata bez ruční práce studenta, import nezměněného celoročního CSV do verifieru konkrétního testu, explicitní řešení duplicit a oddělené exporty výsledků a odevzdání. Teacher verifier zůstává autoritou a výsledky vybírá podle kryptograficky ověřeného `SECURE-ANSWERS-V1`, nikoli podle editovatelných Forms metadata.

## Architecture decision
Zvolena byla nejmenší serverless změna:
- existující Google Forms responder workflow zůstává;
- metadata entry IDs se jednorázově odvodí z předvyplněného Google Forms odkazu;
- validovaná metadata konfigurace se vloží do secure public configu nově generovaného testu;
- student runtime otevře tentýž Form s Test ID, názvem testu a skupinou předvyplněnými;
- secure payload se nadále vkládá do Formu samostatně;
- verifier importuje celý Forms CSV a kryptograficky určí, které submissions patří jeho testu;
- žádný nový backend, databáze ani serverová závislost nebyly přidány.

## Implemented behavior
- Povinná metadata: Test ID, název testu, skupina.
- Volitelná metadata: verze Generátoru, datum generování.
- Unicode, diakritika, mezery a speciální znaky se zachovávají přes URLSearchParams.
- Chybný host, neplatná URL, chybějící placeholder nebo neplatné entry ID selžou fail-closed.
- Bez metadata konfigurace pokračuje původní Forms/answers.txt workflow.
- Celoroční CSV se nemusí ručně filtrovat.
- Cizí Test ID se klasifikuje jako jiný test a nevstupuje do výsledků.
- Metadata mismatch je viditelný, ale metadata nejsou autorita.
- Identický secure payload se započítá jednou.
- Dva různé validní pokusy stejného studenta vyžadují explicitní volbu učitele.
- Export výsledků obsahuje pouze efektivní výsledky aktuálního testu.
- Export submissions obsahuje pouze kryptograficky ověřené submissions aktuálního testu.

## Security review
Ověřeno:
- žádný teacher private key nebyl přesunut do studentského buildu;
- answer key zůstává pouze v teacher verifieru;
- RSA-OAEP / AES-GCM / WebCrypto workflow nebylo oslabeno;
- CSP a stávající security gates zůstávají aktivní;
- metadata Google Forms nemají autoritu nad výsledkem;
- pozměněný vnější secure envelope failuje;
- poškozený ciphertext je odmítnut;
- žádný studentský secret nebyl přidán;
- výsledky se neukládají na GitHub;
- nebyla přidána serverová závislost;
- teacher verifier se nestal součástí studentského HTML.

## Backward compatibility
Zachováno:
- `SECURE-ANSWERS-V1`;
- individuální one-time kódy;
- `answers.txt` fallback;
- test bez Forms metadata konfigurace;
- starší Forms CSV bez metadata sloupců;
- stávající teacher verifier workflow v podporovaném rozsahu;
- stávající roster / Apps Script workflow pro rozesílání URL + kódů.

## Automated QA
Aktuální HEAD `86d0500...`:
- P5 R2 pre-production release gate: **SUCCESS**
- Workflow journeys E2E: **SUCCESS**
- journey_suite: 17/17 scenarios PASS
- state_transition_suite: 8/8 PASS
- feature_suite: 19/19 PASS
- integration_suite: 17/17 PASS
- identity_suite: 8/8 PASS
- wizard_suite: 16/16 PASS
- AI assurance fingerprint: current
- GARP foundation/contract regressions: PASS

## Browser E2E – full-year Forms workflow
Reálný Chromium + skutečný verifier + WebCrypto:
- 100 rows: 1.431 s, event-loop heartbeat 56
- 1,000 rows: 14.530 s, heartbeat 569
- 3,000 rows: 38.401 s, heartbeat 1507
- 5,000 rows: 67.266 s, heartbeat 2631

Heap hlášený Chromium testem: 14.5 MiB ve všech čtyřech scénářích. Import při všech velikostech yieldoval event loopu; UI tedy nezůstalo trvale zablokované.

Poznámka: samostatný syntetický parser benchmark je výrazně rychlejší, ale není zaměňován za browser/WebCrypto benchmark.

## Build budgets
Aktuální P5:
- distBytes: 2,430,561 / 2,450,000 PASS
- entryHtmlBytes: 1,453,904 / 1,480,000 PASS
- entryCriticalBytes: 1,624,867 / 1,655,000 PASS
- largestInlineScriptBytes: 153,817 / 170,000 PASS
- precacheBytes: 2,049,227 / 2,130,000 PASS
- largestFileBytes: 1,453,904 / 1,480,000 PASS

Limity nebyly zvyšovány.

## Manual classroom acceptance
Samostatný plán je v `docs/GIT-LIVE-CLASSROOM-ACCEPTANCE-TEST.md`.
Pilot musí ověřit minimálně:
- standard submission;
- invalid student code;
- identical duplicate;
- dva různé validní pokusy;
- metadata mismatch;
- answers.txt fallback;
- mobilní browser;
- dvě skupiny a dvě Test ID ve stejný den;
- jeden společný Forms CSV;
- import téhož CSV do verifieru A i B bez ručního filtrování.

## Known limitations / release readiness
Neznám žádný automatickým QA zachycený release blocker na audited SHA.

Zbývá:
1. FÁZE 12 – vytvořit jeden kompletní release candidate a provést jediný version bump;
2. synchronizovat version/release metadata/changelog/build metadata/artefakty;
3. znovu spustit kompletní release gates nad finálním SHA;
4. live classroom pilot zůstane samostatnou provozní akceptací a nesmí být vydáván za již provedený test.
