# GIT 7.1.100 V7 – Sprint 03.1 bounded remediation

Datum: 2026-10-11

Rozsah: pouze náprava S3-F01 až S3-F03 z nezávislého auditu Sprintu 03. Bez změny AI Studia, bez Sprintu 04, bez push/merge do `candidate` nebo `main` a bez deploymentu.

## 1. Původ, integrita a checkpoint

- Auditorský balíček `GIT-7.1.100-V7-KOMPLETNI-PRECHOD-AKTUALIZACE-S3-AUDIT-2026-10-11`: **PASS 47/47 SHA-256**, bez chybějícího souboru.
- Požadovaný výchozí HEAD: `d85d118e27ec83fcabe1d35c90b5a7db114b9e98`.
- Historický schválený S2 checkpoint v ancestry: `b410424f5884f26ec28b1bdb0df186046cbf9712`.
- `merge-base(d85d118,b410424)` je přesně `b410424f5884f26ec28b1bdb0df186046cbf9712`.
- Izolovaná větev: `codex/sprint-03.1-remediation`.
- Implementační commit: `e0587722b979d73e24c4999b0a4cdc178c9d008a` (`fix(s3.1): close workflow acceptance gaps`).
- Testovací fixture commit: `5e9cd34397cf3750dd5ac823e0535714393e593c` (`test(s3.1): supply listening source evidence`).
- Funkční, bezpečnostní a browser důkazy jsou vázané na čistý tracked strom a SHA `5e9cd34397cf3750dd5ac823e0535714393e593c`.
- Tento report je následný dokumentační commit; finální checkpoint je uveden v předávacím manifestu a závěrečném předání.

Dokumenty auditu byly použity jako důkaz a reprodukční podklad. Oprávnění k implementaci vychází z výslovného zadání vlastníka.

## 2. Failing-before reprodukce

Nezměněný auditorský `29-S3-INDEPENDENT-EDGE-CASE-PROBE.mjs` byl spuštěn na přesném `d85d118e27ec83fcabe1d35c90b5a7db114b9e98`.

- Výsledek podle jednotlivých assertions: **1 PASS, 4 FAIL**.
- Procesní exit probe byl `0` i při FAIL; původní probe tedy není sám o sobě fail-closed. Nový trvalý gate tento nedostatek nemá.
- **S3-F01 FAIL:** About-dialog obsahoval `<a href="./manual/">` bez `target="_blank"` a `rel="noopener"`; hlavní odkaz i Apps Script návod už byly správně.
- **S3-F02 FAIL ×2:** Reading i Listening hlavní `<select>` nabízely jen `3–8`, zatímco detailní plán a runtime podporovaly `1–30`.
- **S3-F03 FAIL:** `syncExercisePoints('29.7')` vrátil `true`, zkrátil vstup na 29 a změnil plán `4+4+4+4+4` na `6+6+6+6+5`.

Audit správně klasifikoval všechny tři kořeny jako starší mezery, které Sprint 03 plně neuzavřel; nejde o nové změny scoringu studentského testu.

## 3. Implementované řešení

### S3-F01 – všechny manuálové entry points

- About-dialog nyní používá stejnou trasu `./manual/?from=app`, `target="_blank"` a `rel="noopener"` jako hlavní odkaz.
- V repozitáři jsou tři skutečné veřejné manual entry points: hlavička, About-dialog a Apps Script návod. Trvalý source gate vyžaduje u všech nový noopener tab.
- Chromium gate všechny tři cesty skutečně klikne, ověří očekávané URL, `window.opener === null`, původní URL generátoru a nezměněný runtime.
- AI Studio ani jiný repozitář nebyly upraveny.

### S3-F02 – jednotný rozsah Reading/Listening 1–30

- Oba hlavní selecty nyní explicitně obsahují celý kanonický rozsah `1..30`; není nutná dočasná nebo skrytá option.
- Existující politika zůstala zachována: hlavní ovladač řídí první odpovídající cvičení, sekundární řádky mají vlastní hodnoty.
- Source a Chromium testy procházejí hodnoty `1,2,3,8,9,30` pro Reading i Listening.
- Sekundární hodnoty nezmění hlavní ovladač a změna hlavního ovladače nepřepíše sekundární řádek.
- Prompt specs i instant, secure a Teacher Verifier renderery byly ověřeny na počtech `1,30,2,9` a celkových 84 bodech.

### S3-F03 – striktní celé body bez mutace

- Přidán jediný striktní parser `strictIntegerValue()` pro bodové vstupy. Řetězce s desetinnou tečkou nebo exponentem se nepovažují za celé vstupy.
- `syncExercisePoints()` už nepoužívá `parseInt`; nejprve získá kompletní validní distribuci a teprve potom atomicky změní plán.
- `exercisePointsDistribution()` je fail-closed a samostatně auditovatelná i v izolovaném VM auditorského probe.
- `onCustomBody()` odmítne prázdné, desetinné, nulové, záporné a nadlimitní hodnoty bez změny `state.body`, `exerciseConfig` nebo snapshotu; nastaví `aria-invalid`, native validation message a zablokuje pokračování.
- Detailní body cvičení používají stejné celočíselné pravidlo `1–999`; neplatný commit pole obnoví původní renderovaný plán.
- Detailní bodové pole se potvrzuje událostí `change`, aby vymazání mezihodnoty při psaní nebylo považováno za nový plán.
- Platné `29/5` nadále dává přesně `6+6+6+6+5`; horní platná mez pro pět řádků `4995` dává `999` každému a `4996` je odmítnuto.

## 4. Trvalé regrese a CI

- Nový `scripts/check-s31-remediation.mjs`: 8 fail-closed scénářů pro všechny tři nálezy, pozitivní hranice a no-mutation kontrakty.
- `check:s3-workflow-fidelity` nyní povinně spouští původní S3 10-case gate i S3.1 gate.
- `scripts/check-s3-ci-wiring.mjs` kontroluje přesné povinné zapojení obou source skriptů.
- `scripts/check-s3-workflow-browser.mjs` je rozšířen na tři manual entry points, Reading/Listening 1–30, striktní body a čtyři renderer fixtures.
- P5 a P5-CI nadále používají tentýž povinný S3 Chromium gate; workflow soubor ani release logika nebyly změněny.

## 5. Změněné soubory proti `d85d118`

Rozdíl `d85d118..5e9cd34`: 9 souborů, 344 vložených a 54 odstraněných řádků.

- `src/js/14d-generator-release-guides.js` – bezpečný About manual link.
- `src/shell.html` – úplné Reading/Listening volby 1–30 a explicitní celočíselný bodový input.
- `src/js/05-form-fields.js` – striktní celočíselné body a no-mutation validace.
- `scripts/check-s31-remediation.mjs` – nový 8-case source/runtime gate.
- `scripts/check-s3-workflow-fidelity.mjs` – comprehension prompt matice Reading i Listening na hranicích.
- `scripts/check-s3-workflow-browser.mjs` – rozšířený skutečný Chromium gate.
- `scripts/check-s3-ci-wiring.mjs` – fail-closed zapojení S3.1.
- `package.json` – S3.1 source gate součást povinného S3 řetězce.
- `eslint-globals.generated.mjs` – regenerovaný seznam globálů.

Tento report je desátý, čistě dokumentační soubor. Nebyly změněny `security/garp27`, `tools/ci-standard/consumers`, `vendor`, `.github/workflows`, kryptografie, Forms, Recovery ani studentský scoring.

## 6. Passing-after výsledky na `5e9cd34397cf3750dd5ac823e0535714393e593c`

| Kontrola | Exit | Stav | Výsledek |
|---|---:|---|---|
| Nezměněný nezávislý S3 edge probe | 0 | **PASS** | 5/5 assertions; SHA v JSON odpovídá `5e9cd34...` |
| Trvalý S3.1 remediation gate | 0 | **PASS** | 8/8 |
| Původní S3 workflow gate | 0 | **PASS** | 10/10 |
| S3 CI wiring | 0 | **PASS** | S3 + S3.1 source a Chromium brány povinné |
| Build `node scripts/build.mjs` | 0 | **PASS** | platform postbuild PASS |
| ESLint | 0 | **PASS** | 0 errors; 9 existujících warningů mimo změny |
| Source structure | 0 | **PASS** | 19 split modulů |
| S1 credential E1/E2/E3 | 0/0/0 | **PASS** | UX, doménová separace, runtime privilege boundary |
| S1 forensics/secret/adversarial E4/E5/E6 | 0/0/0 | **PASS** | audit, secret scanner 23/23, izolace |
| S1 Recovery R4 + CI wiring | 0/0 | **PASS** | stav pokusu, cleanup, audit eventy |
| S2 pedagogická matice | 0 | **PASS** | T01–T04 a T55–T63 |
| S2 R2 adversarial | 0 | **PASS** | 9/9 |
| S2 visible fingerprint + renderer fidelity | 0/0 | **PASS** | 6+6 a 57/57 |
| S2 mutation + CI wiring | 0/0 | **PASS** | všechny mutace zachyceny |
| Forms F1–F9 | 0 | **PASS** | 59/59 source/unit |
| Full roster workflow | 0 | **PASS** | celý roster a stabilní CSV kontrakt |
| Randomization numbering | 0 | **PASS** | determinismus a verifier parity |
| Teacher Verifier V2 / IA / syntax | 0/0/0 | **PASS** | bez paralelní scoring autority |
| Sensitive-data scan | 0 | **PASS** | 79 veřejných zdrojových souborů |

### Transparentně zaznamenaný meziběh browser testu

První rozšířený Chromium běh na `e058772...` skončil **FAIL**, exit `1`, ještě před posouzením produktu: syntetické Listening položky neměly povinný teacher-only transcript/source note a bezpečnostní validátor je správně odmítl. Kontrola nebyla oslabena. Commit `5e9cd34...` doplnil pouze syntetický teacher-only transcript do fixture; následný plný gate PASS.

## 7. Chromium evidence na `5e9cd34...`

Provenance: Windows x64, Node `v24.19.0`, Playwright `1.61.1`, Chromium `149.0.7827.55`, čistý tracked strom. Package-lock SHA-256 `7eafe8ed887c908d5b34c41d18a57b2f5a9a2ccffce414325498d947407cc994`.

### S3.1/S3 gate

- Stav: **PASS**, exit `0`; JSON SHA-256 `052ca87f6bde1405d1d8fc5565c547027ab771bd62cd0841fcdeb9191ffff010`.
- Gate script SHA-256 `3dd4766ef5e5aae9dcaef9cf8f57d8b2c4f2425e39e76f45b23d4cc3982b0513`.
- Tři manual routes: hlavička, About, Apps Script; všechny popup/noopener, původní runtime beze změny.
- 28 syntetických příjemců a opakované CSV stabilní; CSV SHA-256 `ef3c77131b3da4ca5f15e62a3df57b6e0d6d9c19247d098e9f903b4a65ce59dd`.
- Syntetický API klíč session-only; `localStorage` bez klíče.
- Reading i Listening select obsahují přesně `1..30`; interakční matice `1,2,3,8,9,30` PASS.
- Primární/sekundární výsledné počty `[30,1,30,2]`, hlavní hodnoty `[30,30]`.
- Neplatné `29.7`, `29.0`, `2e1`, prázdné, `0`, `-1`, `4996` odmítnuty bez mutace; validní 29 dává `[6,6,6,6,5]`.
- Instant HTML SHA-256 `a820e8ee72d4d45fa03d22e55eb1ff44d51aec86febbd9a627d490090b0bd3ff`.
- Secure student HTML SHA-256 `ef17c6aee5663801829d5ffbdd91741cc9a382e9a938c190d249a9a21e717cbc`.
- Teacher Verifier SHA-256 `70aeed91554ba9abf6071cb2684522c38b0f354ecdf9d72669a4658db8e8524b`.
- Instant, secure a verifier zachovaly přesné počty `[1,30,2,9]` a 84 bodů.

### S1 browser regrese

- Stav: **PASS**, exit `0`; JSON SHA-256 `9e49ccadf45c6c930dc62617dd27d95f53562423f14f92019406c7ed5c2dcf06`.
- Teacher close-race, Recovery/Teacher hranice, cleanup a zachování attempt state PASS.
- Instant `1c5c06fe7d2fe608487015dd7b069a58e046fdf7c16f0fd09efb08373f4466de`; secure student `3c251a5a416f08762a756fbcab83b081e9711ca622cb9d22047f3d248b3cb8bf`; verifier `c0455b0836b077304091ec9d7118b170f946c21f23002083fd766605c71885d3`.

### S2 browser regrese

- Stav: **PASS**, exit `0`; JSON SHA-256 `d1836245085bfd318553e29714b0527148d9c5949f15acaa9fca3e1966b355a8`.
- Instant `cfed0c89f090dfa097a9f56e04cc88d066de5b231d3b4617a0d8bae0fca6d412`; secure student `dd06ae477bb8237c944c9a682c57cb2f646a9344c4c1d7fb5cc40232285c2a22`; verifier `1cfe643c624e072a3c390e56714a0950a877e9a67556758aedbf3b403a75f10d`.

## 8. F0, GARP 2.7 a line endings

Žádný trust pin ani důvěryhodný GARP soubor nebyl změněn.

Windows CRLF checkout:

- `node scripts/check-ci-trust-pin-f0.mjs`: exit `1`, **FAIL** – `reviewed consumer profile does not match trust anchor`.
- Trust anchor SHA-256 `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`.
- Consumer profile SHA-256 `2a57d31f70e258933c7c390fd77e6f4cb6a5703a55eccb5a3e8abd4d1fa0c093`.

Čistý LF clone přesného `5e9cd34...`:

- F0: exit `0`, **PASS 8/8**, trust anchor `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.
- Consumer profile SHA-256 `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`.
- Build: exit `0`, **PASS**; `dist/index.html` SHA-256 `3d8427e02e1bbafa0c678f16f9a6a28686dee1c0559a17eda38f2dca0d2ac942`.
- GARP contracts: **PASS 6/6**.
- Architecture integrity: **PASS 41/41**, bez critical/high findingů.
- Policy mutations: **PASS 6/6**.
- Architecture mutations: **PASS 10/10**.
- Auto-patch contract: **PASS**, `liveAutoPatchClaim:false`.
- Platform conformance: **PASS 119/119**.
- CI standard structural check: exit `0`, `STRUCTURAL_MATCH_NOT_CERTIFIED`; správně neprohlašuje release eligibility.

Závěr: lokální Windows F0 FAIL je stejný známý CRLF/LF rozdíl, nikoli obsahový drift S3.1. Piny nebyly přepisovány ani kontroly oslabeny.

## 9. PASS / FAIL / NOT VERIFIED

**PASS:** failing-before reprodukce; nezměněný auditorský passing-after probe 5/5; trvalý S3.1 8/8; původní S3 10/10; build; S1/S2/S3 Chromium; Forms source; verifier; Recovery/credentials/security; F0 a úplná statická GARP sada v LF clone.

**FAIL (transparentní meziběhy):** Windows CRLF F0; první Chromium běh s neúplnou syntetickou Listening fixture. První je vysvětlen line endings a tentýž SHA v LF PASS; druhý byl opraven doplněním povinného testovacího metadata, nikoliv oslabením validátoru.

**NOT VERIFIED:**

- Node.js 22 a Linux GitHub Actions runner; dostupný host byl Node `v24.19.0` / Windows x64.
- Skutečné chování uvnitř AI Studio iframe/WebView a cross-repository lifecycle původního okna.
- Fyzický iPad/iPadOS Safari, Android a nativní password manager.
- Reálný AI provider; nebyl proveden síťový AI požadavek.
- Živé Google Forms odeslání/import a externí Google služba; 59/59 je source/unit kontrakt.
- GitHub Pages staging, produkční provoz, workflow Actions a deployment.
- `npm run ...` wrappery, protože `npm` nebylo na hostu dostupné; podkladové Node skripty a wiring kontrakty byly spuštěny přímo.

## 10. Zbývající rizika a hranice

1. GIT chrání vlastní klientský runtime otevřením manuálu v noopener kartě. Nemůže zaručit, že hostitelské AI Studio, mobilní WebView nebo OS původní iframe/kartu neukončí. Cross-repository očekávání je: host musí respektovat nové okno a nesmí při návratu remountovat běžící GIT bez výslovné akce uživatele. To vyžaduje samostatný staging/device test; AI Studio nebylo změněno.
2. Statický GitHub Pages nemá serverovou relaci. Roster, kódy a provider key jsou záměrně pouze v klientském runtime/session scope; po skutečném zavření karty se neobnovují.
3. Select s 30 hodnotami je funkčně konzistentní, ale jeho mobilní ergonomie zůstává předmětem fyzického iPad testu.

## 11. Release boundary

- Nebyl proveden push, merge ani deployment.
- `candidate` a `main` nebyly změněny.
- AI Studio zdroj nebyl změněn.
- Nebyla použita reálná studentská data, skutečné Recovery/Teacher kódy, API klíče ani soukromý verifier.
- Generované studentské testy a `qa-results` nejsou commitnuté.
- Sprint 04 nebyl zahájen. Výsledek je určen pouze pro nezávislý GO/NO-GO audit Sprintu 03.1.
