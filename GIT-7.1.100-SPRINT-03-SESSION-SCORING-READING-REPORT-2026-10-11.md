# GIT 7.1.100 V7 – Sprint 03: session, scoring and Reading fidelity

Datum: 2026-10-11

Rozsah: výhradně Sprint 03 podle původního MASTER PROMPTU V7 – zachování rozpracované relace a rosteru, autorita bodování v globálním/podrobném režimu a synchronizace počtů Reading/Listening. Bez merge/push do `candidate` nebo `main`, bez deploymentu a bez zahájení Sprintu 04.

## 1. Checkpoint, větev a commity

- Schválený výchozí checkpoint Sprintu 02: `b410424f5884f26ec28b1bdb0df186046cbf9712`.
- Izolovaná větev: `codex/sprint-03-session-scoring-reading`.
- Implementační commit: `3f8d2f5b9ab7dd8716f5185b1c3cbdbd3e16489f` (`fix(s3): preserve session scoring and reading fidelity`).
- Testovací/CI commit: `2abd65089b2bada5855c277a9e12205f3bae6e10` (`test(s3): activate generator browser harness`).
- `merge-base(b410424, 2abd650)` je přesně `b410424f5884f26ec28b1bdb0df186046cbf9712`.
- Produktové a browser důkazy v tomto reportu jsou vázané na čistý tracked strom a přesný SHA `2abd65089b2bada5855c277a9e12205f3bae6e10`.
- Tento report je následný dokumentační commit; z principu neobsahuje vlastní SHA. Finální SHA checkpointu je uveden v předávacím checksum manifestu a v závěrečném předání.

## 2. Reprodukce na schváleném baseline

Nový regresní harness `scripts/check-s3-workflow-fidelity.mjs` byl před opravou spuštěn proti přesnému baseline `b410424f5884f26ec28b1bdb0df186046cbf9712` (harness byl do čistého baseline pouze přenesen jako testovací vstup, produktový strom nebyl upraven).

- Výsledek: **FAIL**, exit `1`, **3/10 PASS, 7/10 FAIL**.
- PASS už na baseline: přesné rozdělení 29 bodů jako `6 + 6 + 6 + 6 + 5`, zachování per-exercise počtů/body v prompt specs a stabilní 28členný roster při opakovaném CSV exportu.
- Potvrzené závady:
  1. manuál nahrazoval běžící generátor (`target="_self"`), takže rozpracovaná runtime relace nebyla zachována;
  2. v podrobném režimu zůstal globální počet bodů `29`, i když součet řádků byl `13`;
  3. rovnoměrné přerozdělení nevyžadovalo vědomé potvrzení;
  4. cíl nižší než počet cvičení nebyl bezpečně odmítnut a mohl vytvořit nulové body;
  5. globální Reading ovladač přepsal všechny Reading řádky;
  6. změna sekundárního Reading řádku přepsala primární ovladač;
  7. načtený stav nesynchronizoval primární Reading ovladač z detailního plánu.

Tato reprodukce odpovídá oblastem T04–T11 a přijímacím podmínkám P0-02, P1-03, P1-04 a P1-05 z MASTER PROMPTU V7.

## 3. Implementované řešení

### 3.1 Zachování rozpracované relace, rosteru a studentských kódů

- Odkaz na manuál se otevírá v nové kartě pomocí `target="_blank"` a `rel="noopener"`; původní generátor a jeho paměťový runtime zůstávají otevřené.
- Browser gate ověřuje, že po otevření manuálu zůstávají beze změny rozpracovaný název, krok wizardu, všech 28 syntetických příjemců, jejich kódy a session-scoped API klíč.
- Opakovaný CSV export ze stejné relace je byte-identický; není vytvořena druhá konfliktní sada kódů.
- API klíč z testu zůstává pouze v paměti/session storage a není zapsán do `localStorage`.
- Produkční logika rosteru nebyla přepisována; Sprint 03 chrání její lifecycle a dokládá jej browser testem se syntetickými adresami `example.invalid`.

### 3.2 Autorita bodování

- V globálním režimu zůstává `state.body` cílový celkový počet bodů.
- V podrobném nebo uloženém detailním režimu je autoritativní součet `exerciseConfig[].body`; `state.body` a UI se z něj okamžitě promítají.
- Ruční změna bodů jednoho cvičení už není tiše přepsána při změně počtu řádků.
- Čistá funkce `exercisePointsDistribution(total,count)` vrací deterministické přesné rozdělení; například `29/5 → 6 + 6 + 6 + 6 + 5`.
- Neplatné cíle (`0`, necelé číslo, méně bodů než cvičení nebo více než povolených 999 bodů na řádek) jsou odmítnuty bez mutace a bez nulových bodů.
- Přerozdělení zobrazuje cílový součet a preview, nemění počty položek, vyžaduje explicitní potvrzení a zrušení zachová původní hodnoty.
- Opakované přerozdělení již rovnoměrného plánu je idempotentní.

### 3.3 Reading/Listening počty

- Přidána jednotná sada helperů pro nalezení a efektivní počet primárního Reading/Listening cvičení.
- Hlavní Reading/Listening ovladač je synchronizován pouze s prvním odpovídajícím detailním řádkem.
- Další Reading/Listening řádky si zachovávají vlastní počty a změna sekundárního řádku neovlivní primární ovladač.
- UI obsahuje živou informaci o rozsahu ovladače, aby učitel věděl, který řádek právě řídí.
- Načtený detailní stav se sjednotí z primárního řádku, nikoli ze zastaralé globální hodnoty.
- Prompt builder, AI návrhy a workflow fingerprint používají stejný efektivní primární počet.
- Browser gate ověřuje dvě Reading cvičení s 5 a 7 otázkami v instant HTML, secure student HTML i Teacher Verifieru; celkové body zůstávají 24.

### 3.4 Povinné regresní brány

- Zdrojová matice Sprintu 03 je povinná v `prebuild`.
- Chromium gate Sprintu 03 je povinný v `qa:p5` i `qa:p5:ci` a jeho selhání blokuje řetězec.
- Wiring test kontroluje všechny tři vazby a přítomnost browser evidence v release artefaktech.
- `.github/workflows/p5-release-gate.yml` pouze přidává upload souboru `qa-results/workflow-fidelity-browser-s3.json`; trust piny ani promotion/deployment logika nebyly změněny.

## 4. Změněné soubory proti `b410424`

Produkt a konfigurace:

- `src/shell.html` – manuál v samostatné noopener kartě; vysvětlení rozsahu Reading/Listening ovladače.
- `src/js/05-form-fields.js` – autorita detailního součtu, bezpečné/konfirmované rozdělení bodů a per-exercise synchronizace porozumění.
- `src/js/03-ui-render.js` – hlavní ovladač mění pouze primární Reading/Listening řádek; AI návrhy používají efektivní počet.
- `src/js/02-state-persistence.js` – reconciliation detailního součtu a primárních comprehension počtů při načtení.
- `src/js/05b-workflow-context.js` – fingerprint Reading/Listening kontextu z efektivního počtu.
- `src/js/12-prompt-builder.js` – defaultní počet z jednotného efektivního helperu.
- `eslint-globals.generated.mjs` – regenerované globály pro nové browser helpery.
- `package.json` – S3 source/browser/wiring skripty a povinné gate vazby.
- `.github/workflows/p5-release-gate.yml` – archivace S3 browser JSON evidence.

Testy:

- `scripts/check-s3-workflow-fidelity.mjs` – 10 zdrojových/runtime scénářů včetně negativních hranic.
- `scripts/check-s3-workflow-browser.mjs` – skutečný headless Chromium nad generátorem, oběma studentskými kanály a verifierem.
- `scripts/check-s3-ci-wiring.mjs` – fail-closed kontrola povinného zapojení.

Rozdíl implementačního checkpointu `b410424..2abd650`: 12 souborů, 686 vložených a 37 odstraněných řádků. Tento report je třináctý, čistě dokumentační soubor.

## 5. Testy na přesném SHA `2abd65089b2bada5855c277a9e12205f3bae6e10`

| Kontrola | Exit | Stav | Důkaz / výsledek |
|---|---:|---|---|
| S3 workflow fidelity T04–T11 | 0 | **PASS** | 10/10 |
| S3 CI wiring | 0 | **PASS** | source gate v `prebuild`, browser gate v P5/P5-CI, evidence upload |
| Přímý build `node scripts/build.mjs` | 0 | **PASS** | `dist/index.html` 1 761 236 B, SHA-256 `df2d244ed8af7d91f67f9c9ab974d5be13c72de234b2eb75c88cd06747742f4d` |
| S1 Recovery runtime R4 | 0 | **PASS** | stav pokusu, cleanup vstupu, přesné audit eventy |
| S1 CI wiring | 0 | **PASS** | Recovery/auth Chromium evidence zůstává povinná |
| S2 pedagogical fidelity | 0 | **PASS** | T01–T04 a T55–T63 |
| S2 R2 adversarial | 0 | **PASS** | 9/9 |
| S2 visible fingerprint | 0 | **PASS** | 6/6 audit + 6/6 structural |
| S2 renderer fidelity | 0 | **PASS** | 57/57 včetně 21 kanonických typů |
| S2 remediation mutations | 0 | **PASS** | všechny původní i renderer-fidelity mutace zachyceny |
| S2 CI wiring | 0 | **PASS** | pedagogická brána zůstává povinná |
| Forms F1–F9 source/unit | 0 | **PASS** | 59/59; nejde o živý Google Forms test |
| Full-roster workflow | 0 | **PASS** | celý vložený roster, žádné deferred/pending větve |
| Randomization numbering | 0 | **PASS** | úplná deterministická permutace a verifier parity |
| Generated verifier syntax R1 | 0 | **PASS** | inline script parsuje, klíčové funkce přítomné |
| Sensitive-data scan | 0 | **PASS** | 79 veřejných zdrojových souborů |
| Source structure | 0 | **PASS** | 19 split modulů |
| ESLint | 0 | **PASS** | 0 errors; 9 existujících warningů mimo změněný rozsah |

`dist/sw.js` po buildu má SHA-256 `e3f4653b733c4e2b0edbcd686a37f4f8ee5220133ca95e01db4cfd91f6a16231` a velikost 5 781 B. Build artefakty zůstávají ignorované a nejsou součástí commitu.

## 6. Browser evidence

Provenance: čistý tracked strom na `2abd65089b2bada5855c277a9e12205f3bae6e10`, Windows x64, Node `v24.19.0`, Playwright `1.61.1`, Chromium `149.0.7827.55`, package-lock SHA-256 `7eafe8ed887c908d5b34c41d18a57b2f5a9a2ccffce414325498d947407cc994`.

### Sprint 03 – relace, scoring a Reading

- Stav: **PASS**, exit `0`; evidence JSON SHA-256 `103df7aed812e5c04882ded5dfba8cac389671feb3076764df142081b5574116`.
- Gate script SHA-256: `e2e05f83c9ba903072511d202c0e04300f30aaf17f1019a54f73d1b3fde298e1`.
- Manuál se otevřel jako nový popup/noopener a původní generátor zůstal na stejné URL se stejným runtime stavem.
- 28 syntetických adres: stejné kódy před/po otevření manuálu; opakované CSV SHA-256 `57f71a171ff3a2629b3dde3145082f5a34f794dd4ee89691c342c8914d03b743`.
- Syntetický API klíč zůstal session-only; `localStorage` byl `null`.
- Body `29 → 6 + 6 + 6 + 6 + 5`; Reading řádky zůstaly nezávislé.
- Instant HTML SHA-256 `c156e1d8719bb6cfb2af9ada683e10cd9f2d43b5eedcd6eb126e43543cdc91f4`.
- Secure student HTML SHA-256 `199817542d0861328694fe9742cd41e77dcdf843714e109359677e14bf912ca2`.
- Teacher Verifier HTML SHA-256 `304184ce4a62dc7efbc3aee5f4ee6613d2cb56a4b7ae899bb047676e83addaf1`.
- Všechny tři renderované kanály zachovaly dvě Reading cvičení o 5 a 7 otázkách.

### Zachování Sprintu 01

- `scripts/check-recovery-browser-s1.mjs`: **PASS**, exit `0`, stejný SHA `2abd650...`.
- Ověřena teacher-modal close race, oddělení Recovery/Teacher oprávnění, cleanup credential inputů a zachování stavu pokusu v instant i secure výstupu.
- Instant SHA-256 `82dd80aaeeff875feb0b8b01d328b7776ac9fec7af6224ee4bcfcc8412022552`.
- Secure student SHA-256 `d7967670e90c779f987727d65432329d07e78c5a5d845dafdcb2d43f7306b237`.
- Verifier SHA-256 `5666ecc074473803f5c601385b35dda83b0339c7a6841d5b38865cd450289e9c`.

### Zachování Sprintu 02

- `scripts/check-pedagogical-fidelity-browser-s2.mjs`: **PASS**, exit `0`, stejný SHA `2abd650...`.
- Instant SHA-256 `6ead6caa36d834e5ce381a866dd0b388d05206eac31efd24a9c226c0b2e50b4c`.
- Secure student SHA-256 `8a5e8358b797f918a404e2ee501a4d4b5f659727c9f4fd98b285f04fcd26ae1c`.
- Verifier SHA-256 `6e24b4df51803e1a32f84b0151c4e7464768bc202042691b5aa3314cd70e87cb`.

## 7. F0 trust pin, GARP 2.7 a line endings

Sprint 03 nezměnil `security/garp27`, `tools/ci-standard/consumers` ani `vendor`; rozdíl proti `b410424` je v těchto cestách prázdný. Žádný trust pin nebyl přepsán.

### Windows CRLF checkout

- `node scripts/check-ci-trust-pin-f0.mjs`: exit `1`, **FAIL**.
- Hlášení: `reviewed consumer profile does not match trust anchor`.
- Worktree trust-anchor SHA-256: `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`.
- Worktree consumer profile SHA-256: `2a57d31f70e258933c7c390fd77e6f4cb6a5703a55eccb5a3e8abd4d1fa0c093`.

### Čistý LF clone téhož SHA

- `node scripts/check-ci-trust-pin-f0.mjs`: exit `0`, **PASS**, 8/8 workflow pinů.
- Trust-anchor SHA-256: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.
- Consumer profile SHA-256: `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`.
- GARP 2.7 contracts: exit `0`, **PASS 6/6**.
- GARP 2.7 architecture integrity: exit `0`, **PASS 41/41**, bez critical/high findingů.
- Policy-admission mutations: exit `0`, **PASS 6/6**.
- GARP mutation tests: exit `0`, **PASS 10/10**.
- Auto-patch contract: exit `0`, **PASS**, `liveAutoPatchClaim:false`.
- Platform conformance po buildu: exit `0`, **PASS 119/119**.

Závěr: F0 FAIL ve Windows checkoutu je reprodukovatelný CRLF/LF rozdíl, nikoli obsahový drift Sprintu 03. Neexistuje důvod měnit důvěryhodný pin nebo oslabovat kontrolu.

Agregovaný `node --test scripts/ci/*.test.mjs` ve Windows CRLF checkoutu skončil **FAIL** (180 PASS, 25 FAIL): část testů vyžaduje unixové symlinky a část porovnává LF-sensitive trust/workflow data. Proto tento běh není vydáván za release PASS. Jednotlivé relevantní S1/S2/S3 wiring gate a F0/GARP kontroly v odpovídajícím LF prostředí prošly; kompletní Node 22/Linux CI zůstává **NOT VERIFIED**.

## 8. PASS / FAIL / NOT VERIFIED

**PASS:** implementace a 10/10 S3 source scénářů; skutečný headless Chromium pro živou relaci, scoring a instant/secure/verifier Reading; S1 a S2 browser regrese; build; Forms source kontrakt; roster; randomizace; verifier syntax; sensitive-data scan; F0 a GARP v čistém LF checkoutu.

**FAIL (vysvětlený, neopravený přepisem pinů):** přímý F0 a agregovaná CI sada ve Windows CRLF checkoutu. Stejný obsah na stejném SHA v LF clone projde F0/GARP; unixové symlink testy nejsou na tomto hostu reprezentativní.

**NOT VERIFIED:**

- Node.js 22 a Linux runner; dostupné prostředí bylo Node `v24.19.0` / Windows x64.
- Fyzický iPad/iPadOS Safari, Android a embedded AI Studio WebView.
- Skutečné chování manuálu v publikovaném GitHub Pages originu; ověřen byl lokální same-origin browser harness.
- Živý AI provider; použit byl pouze syntetický klíč a syntetický obsah, bez síťového požadavku.
- Reálné Google Forms odeslání a následný import; ověřen byl source/unit kontrakt 59/59.
- GitHub Actions, staging, GitHub Pages a produkční deployment.
- `npm run ...` wrappery, protože `npm` nebylo v lokálním runtime dostupné; jejich podkladové Node gate byly spuštěny přímo a zapojení je kryté fail-closed wiring testem.

## 9. Zbývající rizika

1. Otevření manuálu v nové kartě chrání paměťovou relaci pouze po dobu, kdy uživatel původní kartu nezavře nebo ji prohlížeč/OS neukončí. Roster a klíče se záměrně nepersistují do trvalého úložiště.
2. Primární globální Reading/Listening ovladač řídí první odpovídající cvičení; další řádky jsou záměrně individuální. UI tuto politiku vysvětluje, ale vyžaduje ještě fyzický mobilní UX test.
3. Statický GitHub Pages hosting neposkytuje serverovou relaci ani tajný backend. Session-scoped klíč je lepší než trvalé uložení, ale zůstává v klientském runtime; pro školní server/gateway je potřebný samostatný budoucí schválený návrh.
4. Generator, instant renderer, secure renderer a verifier jsou oddělené implementační vrstvy. Nový browser gate kryje přesné počty 5/7, ale každá budoucí změna rendereru musí zachovat tento gate.

## 10. Bezpečnostní a release hranice

- Nebyl proveden push ani merge do `candidate` nebo `main`.
- Nebyl proveden produkční ani staging deployment.
- Nebyla změněna kryptografie, Recovery, Forms, GARP policy ani trust piny.
- Nebyla použita skutečná studentská data, reálné studentské kódy, skutečný API klíč ani soukromý verifier.
- Generované studentské testy a `qa-results` nejsou commitnuté.
- Sprint 04 nebyl zahájen. Výsledek je připraven pouze jako izolovaný auditní checkpoint pro nezávislé rozhodnutí GO / NO-GO.
