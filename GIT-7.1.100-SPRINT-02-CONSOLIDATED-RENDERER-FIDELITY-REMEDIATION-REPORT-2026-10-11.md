# GIT 7.1.100 V7 – Sprint 02 consolidated renderer-fidelity remediation

Datum: 2026-10-11

Rozsah: pouze nápravná iterace Sprintu 02; bez merge/push do `candidate`/`main`, bez deploymentu a bez Sprintu 03.

## 1. Checkpoint a původ změn

- Požadovaný baseline: `05c264e08fe640d5aca1150bfbbfccf90a7a3085`.
- Izolovaná větev: `codex/sprint-02-renderer-fidelity-consolidated`.
- Implementační commit: `46ca783016472599b0aa2420f331d86300016d6f` (`fix(s2): align duplicate identity with student renderers`).
- `merge-base(05c264e, 46ca783)` je přesně `05c264e08fe640d5aca1150bfbbfccf90a7a3085`.
- Výchozí tracked strom i implementační checkpoint byly čisté.

Přiložený auditní balíček byl před použitím ověřen proti `SHA256SUMS.txt`: 8/8 souborů souhlasilo. Dokumenty byly použity jako auditní podklady; oprávnění k implementaci pochází z výslovného zadání uživatele.

## 2. Reprodukce před opravou

Nezměněný `S2-INDEPENDENT-RENDERER-FIDELITY-CASES.mjs` byl spuštěn na přesném baseline `05c264e08fe640d5aca1150bfbbfccf90a7a3085` pomocí Node `v24.19.0` na Windows x64.

- Výsledek: **FAIL**, exit `1`, **1/10 PASS, 9/10 FAIL**.
- Selhaly RF-01 až RF-08 a RF-10: falešné duplicity pro odlišný renderovaný obsah a přehlédnuté duplicity při rozdílných nerenderovaných metadatech.
- Jediný PASS: identická Fill-in-the-Blank položka.

## 3. Příčina a implementované řešení

Původní `fidelityItemStem()` používal univerzální prioritu `question || prompt || statement || sentence ...`. Instantní i secure student renderery ale vybírají obsah podle kanonického typu. Obecný `prompt`/`question` tak mohl překrýt skutečně viditelnou větu, statement nebo text. Otisk navíc neznal kontext celého Reading/Matching cvičení.

Oprava v `src/js/13a-secure-helpers.js`:

1. `fidelityItemStem(item,type)` nyní používá typově specifickou prioritu shodnou s canonicalizerem a oběma renderery.
2. Viditelný otisk je omezen na pole, která student skutečně vidí nebo vybírá; skrytý klíč se do něj nemíchá.
3. Fill-in-the-Blank a Cloze uchovávají pozice `___`, protože umístění vstupního pole je viditelná struktura.
4. Matching zahrnuje celý zobrazený pool pravých možností, ne skryté párování jedné položky.
5. Error Tagging sjednocuje explicitní tokeny s tokeny odvozenými z věty ve viditelném i hodnoticím otisku.
6. Reading passage se porovnává jen pro dvojici Reading–Reading. Při porovnání MC–Reading passage nesmí zamaskovat kopii otázky; původní T02 a kontrola skrytého MC kontextu zůstávají aktivní.
7. Rozporný hodnoticí klíč se nadále hlásí samostatně jako `cross-exercise-answer-key-conflict` pouze u skutečně shodné viditelné úlohy.

Scoring, kryptografie, Recovery, Forms, GARP, studentské renderery a verifier nebyly funkčně měněny.

## 4. Auditovaná mapa rendererů

| Kanonické typy | Studentovi viditelná identita | Skrytý hodnoticí klíč |
|---|---|---|
| Multiple Choice, Multi-select | `question/prompt`, možnosti jako významově neuspořádaný pool | správná možnost / množina možností |
| Reading Comprehension | exercise-level passage, `question/prompt`, možnosti; passage rozlišuje jen Reading–Reading | správná možnost |
| Listening Comprehension | `question/prompt`, možnosti, konstantní informace o přehrání učitelem; transcript/source nejsou součástí studentského obsahu | správná možnost |
| Dialogue Completion | dialog podle fallbacku `dialogue/prompt/question`, otázka, možnosti | správná možnost / odpověď |
| Fill-in-the-Blank | `sentence/prompt/question` včetně pozice mezer | `answer/answers/alt_answers` |
| Cloze Text | `text/passage` včetně pořadí a pozice mezer | odpovědi k mezerám |
| True/False | `statement/question/prompt` | boolean `correct` |
| Error Correction | `sentence/prompt/question` | `correction/answer` |
| Word Formation | `sentence/prompt/question`, `base_word/base` | `answer/alt_answers` |
| Translation | `prompt/source/sentence/question` | `answer/translation/model_answer` |
| Sentence Transformation | `prompt/sentence/question`, `keyword` | `answer/correct_sentence/model_answer` |
| Word Order | instrukce a významově neuspořádaný word bank | `correct_sentence/answer` |
| Ordering | otázka a významově neuspořádaný pool položek | uspořádaná `correct_order` |
| Highlight Evidence | otázka a volitelné věty jako pool | správná věta/index |
| Matching | `left` a celý neuspořádaný pool pravých možností cvičení | konkrétní `right` párování |
| Categorization | `text/item/prompt`, kategorie jako pool | `correct_category/category/answer` |
| Categorisation Board | otázka, kategorie a texty entries jako pool | přiřazení entry → category |
| Error Tagging | věta, tokeny v pořadí, nabídka typů chyby jako pool | token, typ chyby a oprava |
| Table Completion | otázka, sloupce a řádky v pořadí; objektová buňka je viditelný prázdný slot | odpovědi objektových buněk |
| Transformation Chain | `base_sentence`, instrukce kroků v pořadí | odpovědi jednotlivých kroků |

Výběrové pooly se porovnávají jako multisety; tabulky, tokeny a transformační kroky zachovávají pořadí, kde má pořadí význam.

## 5. Změněné zdrojové soubory

Rozdíl `05c264e..46ca783` obsahuje přesně pět souborů, 380 vložených a 19 odstraněných řádků:

- `src/js/13a-secure-helpers.js` – typově věrná viditelná identita a oddělený key fingerprint.
- `scripts/check-s2-renderer-fidelity.mjs` – přesných 10 auditních scénářů, 21 kanonických typů a strukturální kontroly; celkem 57 scénářů.
- `scripts/check-s2-remediation-mutations.mjs` – aktualizované původní mutace a pět nových renderer-priority/context/pool mutací.
- `scripts/check-s2-ci-wiring.mjs` – fail-closed kontrola zapojení nové matice.
- `package.json` – nový renderer-fidelity gate je součástí `check:s2-pedagogical-fidelity`, který blokuje `prebuild`.

Tento report je samostatný dokumentační soubor přidaný až po implementačním checkpointu.

## 6. Výsledky testů na `46ca783016472599b0aa2420f331d86300016d6f`

| Kontrola | Exit | Stav | Výsledek |
|---|---:|---|---|
| Nezměněný nezávislý 10-case reproducer | 0 | **PASS** | 10/10 |
| Trvalý renderer-fidelity gate | 0 | **PASS** | audit 10/10; 21 typů; celkem 57/57 |
| Původní R2 adversarial | 0 | **PASS** | 9/9 |
| Původní visible fingerprint | 0 | **PASS** | 6/6 audit + 6/6 structural |
| Pedagogical fidelity T01–T04, T55–T63 | 0 | **PASS** | kompletní gate PASS |
| Mutační gate | 0 | **PASS** | původních 11 + 5 nových mutací odhaleno |
| S2 CI wiring | 0 | **PASS** | source gate je povinný v prebuild/P5 řetězci |
| S1 CI wiring | 0 | **PASS** | Recovery browser gate zůstává povinný |
| Recovery R4 | 0 | **PASS** | stav pokusu, cleanup a audit eventy |
| Credential E1/E2/E3 | 0/0/0 | **PASS** | oprávnění, kryptografická doménová separace, runtime hranice |
| Security E4/E5/E6 | 0/0/0 | **PASS** | forenzní stopa, secret hygiene, adversarial izolace |
| Security R5 | 0 | **PASS** | 39 PASS, 0 FAIL, 0 ERROR |
| Forms F1–F9 | 0 | **PASS** | 59/59 zdrojových/unit kontrol |
| Teacher Verifier V2 / syntax / IA | 0/0/0 | **PASS** | všechny tři kontrakty PASS |
| Randomization numbering | 0 | **PASS** | determinismus, úplná permutace, verifier parity |
| Sensitive-data scan | 0 | **PASS** | 79 veřejných zdrojových souborů |
| ESLint | 0 | **PASS** | 0 errors; 9 existujících warningů mimo změněný rozsah |

### F0 trust pin a line endings

Žádný trust pin nebyl změněn.

- Windows pracovní checkout (`w/crlf`): **FAIL**, exit `1`; worktree trust-anchor SHA-256 `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`, consumer `2a57d31f70e258933c7c390fd77e6f4cb6a5703a55eccb5a3e8abd4d1fa0c093`.
- Čistý LF clone stejného SHA `46ca783...`: **PASS**, exit `0`, 8/8 workflow pinů; trust-anchor `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`, consumer `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`.

Závěr: nejde o obsahový drift Sprintu 02 ani o důvod k přepisu pinu; je to reprodukovatelný CRLF/LF rozdíl lokálního checkoutu.

### Build a GARP 2.7 v čistém LF checkoutu

- `node scripts/build.mjs`: exit `0`, **PASS**; výsledný `dist/index.html` SHA-256 `e979c2150d753fb8c524b6decbf786cdcf7775416eb2b265ce3c8a473f4acbac` (1,754,618 B).
- Postbuild platform conformance: exit `0`, **PASS**.
- GARP 2.7 contracts: exit `0`, **PASS 6/6**.
- GARP 2.7 architecture: exit `0`, **PASS 41/41**, 0 critical/high findings.
- GARP 2.7 policy mutations, architecture mutations a auto-patch contract: exit `0`, **PASS**.
- `dist/sw.js` SHA-256 `1d63f825b41fe261630f270bb145b24b8157ce23f537933a240b7ad484ffcd86`.

`npm` nebylo v lokálním runtime dostupné; proto jsou uvedené podkladové Node skripty spuštěny přímo. Samotné `npm run ...` orchestrace je **NOT VERIFIED**, její S2 zapojení ale prošlo samostatným fail-closed wiring testem.

## 7. Browser evidence

Provenance obou gate: commit `46ca783016472599b0aa2420f331d86300016d6f`, čistý tracked strom, Windows x64, Node `v24.19.0`, Playwright `1.61.1`, Chromium `149.0.7827.55`.

### Sprint 02 instant / secure / verifier

- Stav: **PASS**, exit `0`.
- Instant HTML SHA-256: `692c78a0f70e149af58d755ae46b1e82aa6e09a939e8c0187d71ef17cc432c71`.
- Secure student HTML SHA-256: `32072f3f6f30cdf50a185486edb2ca60f49f4d072eb05205d5ae0f5ebe09964d`.
- Private Teacher Verifier HTML SHA-256: `307bb22907c2f9a5d064b5c1a4d581c2aeeb1d8a8843b492acdf89ae7e9ed58d`.
- Ověřeno 5 smíšených cvičení / 18 otázek, Reading passage právě jednou, bez úniku do samostatného MC, pedagogické styly a subtitle v obou studentských kanálech i verifier preview/print.

### Sprint 01 Recovery/auth regresní browser gate

- Stav: **PASS**, exit `0`.
- Teacher modal close-race PASS; stale async výsledek neudělil oprávnění.
- Recovery/Teacher hranice, cleanup a zachování attempt state PASS v instant i secure výstupu.
- Instant SHA-256 `9902d458f40d06e9b24fd448e300ec6487348a2aea194683c2abf4f52653f3b3`.
- Secure student SHA-256 `8cb9adcebbd9977268afbdf9d4516ee9f0d5a8efc92dc0624c62c946496e5006`.
- Verifier SHA-256 `6d01e1992b7c87802e7712cb283ecfd02786bb56350193a18597525b2b441853`.

## 8. PASS / FAIL / NOT VERIFIED a zbývající rizika

**PASS:** požadovaná 10-case reprodukce po opravě; všech 21 kanonických typů; původní R2/fingerprint/mutation matice; build; GARP 2.7; Forms source contract; verifier; Recovery/credential/security regrese; skutečný headless Chromium pro instant, secure a verifier.

**FAIL (vysvětlený environmentální běh):** F0 přímo ve Windows CRLF checkoutu. Tentýž commit v LF checkoutu PASS 8/8; piny ani důvěryhodné soubory nebyly měněny.

**NOT VERIFIED:**

- Node.js 22 a Linux v této lokální iteraci (k dispozici byl Node `v24.19.0` / Windows x64).
- Fyzický iPad/iPadOS Safari, nativní password-manager prompt a mobilní WebView.
- Živý AI provider a reálný pedagogický obsah.
- Reálné odeslání do Google Forms; ověřen je zdrojový kontrakt 59/59, nikoli externí služba.
- GitHub Pages staging/produkce a síťová CI orchestrace.
- `npm run` wrapper kvůli chybějícímu `npm`; jednotlivé relevantní Node gate byly spuštěny přímo.

Zbývající technické riziko: validator a oba runtime renderery zůstávají oddělené implementační vrstvy. Nová 21typová fail-closed matice a mutace zachytí známý drift, ale každá budoucí změna rendereru musí současně aktualizovat auditovanou mapu. Normalizace interpunkce/diakritiky v exact-duplicate politice je starší chování a nebyla v tomto sprintu měněna.

## 9. Release boundary

- Nebyl proveden push, merge ani deployment.
- `candidate` a `main` nebyly změněny.
- Nebyla použita reálná studentská data ani skutečné Recovery/Teacher kódy.
- Sprint 03 nebyl zahájen.
- Výsledek je připraven pouze jako izolovaný checkpoint pro nezávislý audit a rozhodnutí GO / NO-GO.
