# GIT 7.1.100 V7 — Sprint 02 Pedagogical Fidelity

Technický implementační a ověřovací report, 2026-10-10.

## 1. Identita a rozsah

- Výchozí stav dokončeného Sprintu 01: `1ca24f1f281c62c9969dfd6b0d958d60d2f8b5e1`.
- Izolovaná větev: `codex/sprint-02-pedagogical-fidelity`.
- Ověřený implementační HEAD: `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12`.
- Rozsah: výhradně pedagogická věrnost, její regresní testy a nezbytná testovací infrastruktura.
- Nebyl proveden merge do `candidate` ani `main`, produkční deployment ani změna GARP trust pinů.
- Testovací data a přístupové údaje jsou pouze syntetické. V repozitáři nejsou reálná studentská data, reálné Recovery/Teacher kódy ani soukromý verifier.

## 2. Ověřená příčina

Generační kontrakt směšoval tři různé pojmy:

1. učitelem zvolený pedagogický styl,
2. kanonický typ rendereru/skórování,
3. tematický název vytvořený AI.

Tím mohl tematický název nahradit zvolený styl v UI, speciální styly se zobrazovaly jen jako jejich technický skórovací typ a Reading Comprehension mohl nést kontext na úrovni položek. Neexistoval ani společný fail-closed kontrakt pro chybějící Reading passage, skrytou závislost Multiple Choice na Reading kontextu a zjevnou mezicvičební duplicitu.

Negativní reprodukční commit `08ce73903d36a9a51c38c6dac66e77f4167cb243` před opravou doložil sedm selhávajících oblastí: MC/Reading izolaci, zachování stylu v secure balíčku, primární štítky v obou studentských formátech, učitelský štítek, verifier/print štítek a promptovou izolaci Reading.

## 3. Implementované opravy

### Datový a validační kontrakt

- `style` je zachován jako učitelem zvolený pedagogický typ.
- `type` zůstává kanonický technický typ pro renderer a skórování.
- `title` je pouze tematický podtitulek a nemůže přepsat pedagogický styl.
- Strict normalizace odmítá:
  - nesoulad explicitního stylu s požadovanou specifikací,
  - nesoulad stylu s jeho kanonickým skórovacím typem,
  - Reading bez jednoho viditelného passage na úrovni cvičení,
  - Reading context skrytý nebo opakovaný v jednotlivých otázkách,
  - nezávislé Multiple Choice odkazující na Reading context,
  - doslovnou mezicvičební duplicitu.
- Vysoce podobný obsah je uveden jako učitelský review warning. Krátké generické instrukce se za duplicitu nepovažují.
- Legacy test bez pole `style` používá kompatibilní fallback na kanonický `type`.

### Prompt, studentské formáty a učitelské výstupy

- Prompt schema odděluje `style`, `type` a tematický `title`.
- Reading passage a jeho otázky jsou v promptu výslovně izolovány od nezávislého Multiple Choice.
- Instant i secure studentský HTML používají pedagogický styl jako primární label a tematický název jako sekundární podtitulek.
- Stejná terminologie je použita v náhledu, výsledcích, učitelském verifieru a print/PDF zdroji.
- Secure studentský balíček přenáší `style`; teacher config obsahuje omezený pedagogický review přehled.
- Počty otázek, body, skórovací typy, varianty a randomizace zůstávají zachovány.

### Povinné testovací sekvence

- `check:s2-pedagogical-fidelity` je fail-closed součástí `prebuild`.
- `check:s2-pedagogical-browser` je fail-closed součástí `qa:p5` i `qa:p5:ci`.
- `check:s2-ci-wiring` negativní mutací ověřuje, že odstranění gate z prebuild/P5 certifikaci skutečně zablokuje.
- P5 workflow archivuje `qa-results/pedagogical-fidelity-browser-s2.json`.
- Windows test verifieru používá systémový temp adresář a korektní graceful `Browser.close` s omezeným process-tree fallbackem; dva souběžné běhy prošly.
- Randomization source check normalizuje CRLF před porovnáním, aniž by měnil produkční algoritmus.

## 4. Commity

- `08ce73903d36a9a51c38c6dac66e77f4167cb243` — negativní reprodukční testy.
- `9c4a2d2c3be76b7a3acc2ec0745f7b41fa34cbd6` — implementace pedagogické věrnosti, rendererů, verifieru a CI gate.
- `973d45cb2737e823b5ecb1b60414cea0d196d379` — browser gate kontroluje i skryté exercise tabs.
- `0caa5b1d14e6d80b1759d4e082af09345648b456` — Reading passage assertion je vázána na skutečně renderovaný DOM.
- `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` — přenositelné a souběhově bezpečné ukončení Chromium verifier gate.

Tento report je dokumentační commit následující po uvedeném implementačním HEAD; jeho SHA je nutné číst z historie větve, aby nevznikla kruhová sebe-reference.

## 5. Změněné soubory vůči baseline

- `.github/workflows/p5-release-gate.yml`
- `eslint-globals.generated.mjs`
- `package.json`
- `scripts/check-pedagogical-fidelity-browser-s2.mjs`
- `scripts/check-pedagogical-fidelity-s2.mjs`
- `scripts/check-randomization-numbering.mjs`
- `scripts/check-s2-ci-wiring.mjs`
- `scripts/check-verifier-ui-runtime.mjs`
- `src/features/preview-editor.js`
- `src/js/06-result-didactics.js`
- `src/js/12-prompt-builder.js`
- `src/js/13a-secure-helpers.js`
- `src/js/13c-secure-package.js`
- `src/js/13d-secure-student-shell.js`
- `src/js/13e-secure-student-runtime.js`
- `src/js/13eb-secure-teacher-verifier-v2-ui.js`
- `src/js/13f-secure-teacher-verifier.js`
- `src/js/14a-test-html-builders.js`
- `src/js/14b-instant-test-runtime.js`
- `src/js/14c-test-css.js`
- tento report.

Souhrn před přidáním reportu: 20 souborů, 624 vložených a 39 odstraněných řádků.

## 6. Výsledky testů

### PASS — `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12`

| Kontrola | Exit | Výsledek |
|---|---:|---|
| `node scripts/check-pedagogical-fidelity-s2.mjs` | 0 | T01–T04 a T55–T63; 5-style fixture, celá registrovaná style matrix, počty, body, legacy fallback, varianty, prompt a renderery |
| `node scripts/check-pedagogical-fidelity-browser-s2.mjs` | 0 | Chromium 149, instant + secure + verifier/print, 5 cvičení / 18 otázek, právě jeden Reading passage |
| `node scripts/check-recovery-browser-s1.mjs` | 0 | Sprint 01 auth-close race, Recovery/Teacher/Admin oddělení a zachování pokusu |
| `node scripts/check-verifier-ui-runtime.mjs` | 0 | Verifier UI v reálném headless Chromium; samostatně i dva souběžné procesy |
| `node scripts/check-security-credential-e3.mjs` | 0 | Privilege boundary a auth-close race, včetně out-of-order async dokončení |
| `node scripts/check-redteam-isolation.mjs` | 0 | Student artifact bez učitelských tajemství; verifier zachovává privátní scoring data |
| `node scripts/check-redteam-verifier-e3.mjs` | 0 | RSA-OAEP/AES-GCM, přímý import, CSV, identity/time/replay |
| `node scripts/check-redteam-runtime-e5.mjs` | 0 | Runtime lock/reload/lifecycle model; syntetický DOM/IndexedDB |
| `node scripts/check-s2-ci-wiring.mjs` | 0 | Prebuild a P5/CI jsou blokující; negativní mutace detekována |
| `node scripts/check-randomization-numbering.mjs` | 0 | Deterministická úplná permutace, secure/instant/verifier shoda |
| `node scripts/check-sensitive-data.mjs` | 0 | 79 veřejných zdrojových souborů bez citlivých údajů |

Browser provenance pro Sprint 02:

- Node `v24.19.0`, Windows x64, Playwright `1.61.1`, Chromium `149.0.7827.55`.
- Gate SHA-256 `0beae652f6474cef6a74e8a8a40efd77874f293cc8b72f4e161fa6a5dd3ea971`.
- `package-lock.json` SHA-256 `7eafe8ed887c908d5b34c41d18a57b2f5a9a2ccffce414325498d947407cc994`.
- Instant HTML SHA-256 `8a4533fce7a8b1bd79fceb875817873df82d4c453c9d7063ff34025209dff56d`.
- Secure student SHA-256 `53a7c78ad4794460dcc86d8fd753aa8450b32f69e4e0ad9082675396ad614d9b`.
- Teacher verifier SHA-256 `594479acbf5913d89ed7a09dbf89e4b8a3b5c377c96ee8b8d8600f1694d40543`.

### PASS — relevantní kompatibilita na `0caa5b1d14e6d80b1759d4e082af09345648b456`

Následující kontroly proběhly před čistě test-infrastrukturním commitem `bd4f6ea`; produkční zdroje mezi SHA změněny nebyly:

| Kontrola | Exit | Výsledek |
|---|---:|---|
| `node scripts/check-teacher-verifier-v2.mjs` | 0 | Verifier V2 kontrakt |
| `node scripts/check-verifier-generated-script-syntax-r1.mjs` | 0 | Vygenerovaný inline verifier script parsuje |
| `node scripts/check-forms-workflow-f1-f9.mjs` | 0 | 59/59 unit/source Forms kontraktů |
| `node scripts/check-forms-lesson-windows-browser.mjs` | 0 | 24/24 syntetických browser scénářů Forms/lesson window |
| `node scripts/check-stage3-pdf-runtime.mjs` | 0 | Přímý studentský a učitelský PDF export |
| `node scripts/check-stage3-pdf-quality.mjs` | 0 | 6stránkový student + 7stránkový učitel, 0 nežádoucích pagination cuts |
| `node scripts/check-verifier-ia-security.mjs` | 0 | Verifier IA/security signal model |
| `node scripts/check-security-adversarial-e6.mjs` | 0 | Recovery/Teacher role separation a testId binding |
| `node scripts/check-security-behavior-r3.mjs` | 0 | Instant/secure privilege boundary a fail-closed drift |
| `node scripts/lint.mjs` | 0 | 0 chyb; 9 existujících warnings mimo Sprint 02 |

### PASS — GARP 2.7 a F0 v čistém LF checkoutu

Stejný implementační commit byl testován v čistém klonu s `core.autocrlf=false`.

| SHA | Kontrola | Exit | Výsledek |
|---|---|---:|---|
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | F0 trust pin | 0 | 8/8 workflow pinů odpovídá trust anchoru |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | `node scripts/build.mjs` | 0 | Build PASS |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | GARP architecture integrity | 0 | 41/41 |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | GARP contract gate | 0 | 6/6 |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | policy admission mutations | 0 | 6/6 |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | architecture mutations | 0 | 10/10 |
| `bd4f6ea9fb771d09ab5a7381c73ace07ab864b12` | auto-patch contract | 0 | 9/9, bez live auto-patch claim |

- Důvěryhodný LF trust-anchor SHA-256: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.
- Primární Windows checkout s `core.autocrlf=true` má CRLF working-file SHA-256 `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1` a lokální F0 proto správně failne.
- Vůči baseline není změněn trust anchor, GARP policy ani capability inventory. Žádný pin nebyl přepsán ani oslaben.

## 7. FAIL

- Na finálním implementačním stavu nezůstal žádný potvrzený produktový FAIL v provedené matici.
- Úvodní negativní test na `08ce739` záměrně selhal v sedmi oblastech a prokázal reprodukci opravené vady.
- Verifier UI gate během vývoje odhalil Windows temp/process cleanup závadu testu. Po opravě prošel samostatně i ve dvou souběžných instancích; nejde o otevřený FAIL.

## 8. NOT VERIFIED / zbývající rizika

- Fyzický iPadOS/Safari a nativní password-manager dialogy: NOT VERIFIED.
- Skutečný GitHub Pages staging/production a cache chování nasazené stránky: NOT VERIFIED; deployment nebyl autorizován.
- Live AI generování a kvalita odpovědi reálného modelu: NOT VERIFIED; browser fixture je syntetická.
- Live Google Forms účet, nastavení formuláře a reálný export: NOT VERIFIED; provedeny byly unit a syntetické browser scénáře.
- Kompletní `npm run qa:p5:ci` jako jeden orchestrace run: NOT VERIFIED; dostupný runtime obsahoval Node, nikoli příkaz `npm`. Nové blokující wiring kontrakty a relevantní pod-gates byly spuštěny přímo.
- Node.js 22 a Linux: NOT VERIFIED. Provedeno na Node `v24.19.0` / Windows; LF klon odstranil line-ending drift, ale není náhradou Linux runtime.
- Interaktivní historická navigace všech starších draftů nebyla samostatně browser-testována; kompatibilita legacy objektů bez `style` a zachování diferencovaných variant PASS.
- Statický GitHub Pages klient nemůže garantovat důvěryhodnost zařízení, zabránit DevTools/extension capture, screenshotům, editaci vlastníkem klienta nebo koordinovat tajemství mezi zařízeními. Tyto limity nelze odstranit klientským JavaScriptem.
- Interní build metadata baseline nadále uvádějí `7.1.99`; Sprint 02 je neměnil, protože release/version bump ani produkční vydání nebyly autorizovány.

## 9. Závěr

Implementace Sprintu 02 je připravena pro nezávislé code review na izolované větvi. Výsledek není prohlášen za produkční release a neznamená GO pro vydání; o GO/NO-GO rozhodne hlavní koordinátor po nezávislé kontrole.
