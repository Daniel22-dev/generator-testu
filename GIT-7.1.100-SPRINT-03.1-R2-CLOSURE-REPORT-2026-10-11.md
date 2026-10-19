# GIT 7.1.100 V7 — Sprint 03.1 R2 Closure Report

Datum: 2026-10-11

Rozsah: výhradně nález `S31R2-F01`

Výchozí HEAD: `fc27dafee92f5266019653240af7cb203782842b`

Otestovaný implementační checkpoint: `2984baa2867e67135806efa461d0ff35fbc42509`

Větev: `codex/sprint-03.1-r2-closure`

## 1. Výsledek

Lokální implementační ověření je **PASS**. Přiložený nezměněný auditorský test se změnil z `1/3 PASS` na `3/3 PASS`. Původní ochrana aktivního neplatného globálního vstupu zůstává fail-closed.

Jde pouze o podklad k nezávislému GO/NO-GO. Sprint 04 nebyl zahájen a nebyl proveden deployment.

## 2. Integrita vstupu a reprodukce

- Kontrolní součty auditorského balíčku: `88/88 PASS`.
- Reprodukce na `fc27dafee92f5266019653240af7cb203782842b`: `1 PASS / 2 FAIL`, návratový kód 1.
- Selhával přechod na platné detailní bodování i následná platná změna detailního součtu na 21.
- Globální neplatné `29.7` správně zůstávalo blokující.

## 3. Kořenová oprava

`syncDetailedPointsTotal()` nyní rozlišuje autoritu bodů podle skutečného režimu:

- v globálním režimu nečistí žádnou existující native validity;
- v aktivním detailním režimu ověří, že každý detailní bod je striktní celé číslo `1–999`;
- pouze pokud je detailní plán celý platný, synchronizuje součet a odstraní stale `customValidity`/`aria-invalid` ze skrytého globálního pole;
- neplatný detailní plán stale chybu nevyčistí a zůstává blokující.

Samotné `validate()`, redraw, nesouvisející kliknutí nebo implicitní synchronizace v globálním režimu chybu nemažou. Scoring a distribuce 29 bodů zůstávají `6+6+6+6+5`.

## 4. Commit a změněné soubory

Implementační commit:

- `2984baa2867e67135806efa461d0ff35fbc42509` — `fix(s3.1-r2): transfer detail scoring validity authority`

Změny proti baseline:

- `src/js/05-form-fields.js`
- `scripts/check-s31-r2-detail-authority.mjs` (nový trvalý gate)
- `scripts/check-s3-workflow-browser.mjs`
- `scripts/check-s3-ci-wiring.mjs`
- `package.json`

Rozsah: 5 souborů, 204 vložení a 7 odstranění. `.github`, `security`, `vendor`, `tools/ci-standard`, Recovery, kryptografie, Forms a scoringové renderery nebyly změněny.

## 5. Povinné cílené testy na `2984baa…`

| Test | Výsledek |
|---|---|
| Nezměněný auditorský S31R2-F01 reproducer | 3/3 PASS |
| Trvalý `check-s31-r2-detail-authority` | 3/3 PASS |
| Dosavadní Sprint 03.1 R2 | 5/5 PASS |
| Původní Sprint 03.1 | 8/8 PASS |
| Původní Sprint 03 | 10/10 PASS |
| S3 CI wiring včetně mutation kontroly nové brány | PASS |

## 6. Chromium

Po čerstvém sestavení stejného SHA:

- headless Chromium `149.0.7827.55`;
- Playwright `1.61.1`;
- Node.js `v24.19.0`, Windows x64;
- provenance `sourceHead=2984baa2867e67135806efa461d0ff35fbc42509`;
- výsledek S3/R2 browser gate: **PASS**.

Reálné DOM kroky ověřené browser testem:

1. krok 2: `29.7` nastaví chybu a blokuje pokračování;
2. nesouvisející kliknutí a přímé `goTo(3)` chybu neobejdou;
3. návrat na krok 1 a kliknutí na detailní režim přepne bodovou autoritu;
4. skryté globální pole se synchronizuje na 20 a jeho stale chyba se vyčistí;
5. návrat na krok 2 je povolen;
6. detailní změna na 21 se korektně synchronizuje;
7. detailní `4.5` je odmítnuto bez mutace platného plánu;
8. detailní plán 29 zůstává `[6,6,6,6,5]` a krok 2 je průchozí.

Další browserové brány:

- Sprint 01 Recovery/Credential: PASS;
- Sprint 02 Pedagogical Fidelity: PASS.

SHA-256 browser důkazů:

- S3/R2: `a5c13f9e892c5295d5513056085913bfe93b503582efad0be27e6ba2340adbd8`
- S1: `aa6a10c3f320207b088a61c2959f6c3f87e60454febded1a2bbf0f8d09810ae1`
- S2: `e30b7e090622ba9459f9d08e8ccfd6298d838bdf1b58c35239fb50eeaf284752`

## 7. Úplná dostupná regresní matice

- 29/29 zdrojových bran PASS;
- Credential E1/E2/E3, E4 forensics, E5 hygiene, E6 adversarial: PASS;
- Recovery R4, credential policy R2, R5 adversarial: PASS (`39/39`);
- Sprint 02 pedagogické, renderer a mutation brány: PASS;
- Forms F1–F9: `59/59 PASS` (source/unit kontrakty);
- roster, randomizace, Teacher Verifier V2, verifier syntax/IA: PASS;
- sken citlivých dat: PASS, 79 veřejných zdrojových souborů;
- source structure: PASS, 19 modulů;
- lint: návratový kód 0, 0 errors, 9 existujících warnings;
- build přes `node scripts/build.mjs`: PASS.

## 8. F0 a GARP 2.7

Čistý oddělený checkout commitu `2984baa…` s `core.autocrlf=false`:

- F0 trust-pin: PASS, 8 workflow pinů;
- build: PASS;
- platform conformance: 119/119 PASS;
- GARP contract gate: PASS;
- GARP architecture integrity: PASS;
- policy mutations: PASS;
- architecture mutations: PASS;
- auto-patch contract: PASS;
- local CI standard diagnostic: návratový kód 0.

LF otisky:

- trust anchor: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`
- consumer profile: `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`

Hlavní Windows checkout s CRLF dává očekávaný F0 FAIL (`reviewed consumer profile does not match trust anchor`, návratový kód 1). Jde o line-ending drift; stejné zdroje a SHA v LF checkoutu jsou PASS. Trust piny nebyly upraveny.

## 9. Předfinální neúspěšné běhy

Pro úplnost:

1. První návrh používal pomocnou funkci mimo `syncDetailedPointsTotal()`. Nový vlastní test prošel, ale nezměněný izolovaný auditorský harness skončil `ReferenceError`; logika byla před commitem přesunuta dovnitř testované funkce. Následně všechny source harnessy prošly.
2. První Chromium běh na `2984baa…` skončil FAIL, protože browser gate servíroval stale `dist` z předchozího buildu. Po povinném novém buildu stejného SHA browser prošel. Zdroj mezi těmito dvěma browser běhy změněn nebyl.

## 10. NOT VERIFIED

- Node.js 22 (hostitel poskytl Node.js 24.19.0);
- kompletní `npm run ...` wrapper (příkaz `npm` není na hostiteli dostupný; Node skripty byly spuštěny přímo);
- fyzický iPad/iPadOS/Safari;
- embedded AI Studio iframe/WebView;
- živý AI provider;
- skutečný Google Forms submit/import;
- GitHub Pages, staging, produkční CI a deployment;
- produkční GARP/live auto-patch.

## 11. Bezpečnostní hranice

- Nebyl proveden push ani merge do `candidate` nebo `main`.
- Nebyl proveden deployment.
- Nebyl čten ani kopírován důvěrný teacher-only H4A4 soubor.
- Handoff neobsahuje reálná studentská data, kódy, klíče ani soukromý verifier.
- Sprint 04 nebyl zahájen.

## 12. Doporučení pro nezávislý audit

Ověřit bundle a SHA-256, zopakovat nezměněný 3-case reproducer, trvalé 3/3 + 5/5 + 8/8 + 10/10 gate a Chromium trasu po čerstvém buildu. F0/GARP spouštět v LF checkoutu a nepřepisovat piny kvůli CRLF.
