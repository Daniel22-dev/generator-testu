# GIT 7.1.100 V7 — Sprint 04 Teacher Verifier 2.0

Datum: 2026-10-12

Výchozí HEAD: `8812b454cd4bc00dac3bedbc6d98f24501184b69`

Otestovaný implementační checkpoint: `1d2634bc1b6ed05c2d9b186ecaeeb6021474491d`

Větev: `codex/sprint-04-teacher-verifier-2.0`

## 1. Výsledek

Implementace Sprintu 04 je lokálně dokončena a cílené akceptační požadavky T118–T135 jsou **18/18 PASS**. Skutečně nově vygenerovaný soukromý učitelský verifier prošel v headless Chromium 21 kontrolami v obou motivech a ve čtyřech viewportechn.

Jde o vývojový checkpoint k nezávislému GO/NO-GO auditu, nikoli o produkční certifikaci. Nebyl proveden push, merge, deployment ani Sprint 05.

## 2. Implementace

Teacher Verifier nyní používá jeden sdílený výklad telemetrie pro hlavní tabulku, detail, bezpečnostní panel a CSV:

- hlavní tabulka je kompaktní a chronologie neroste uvnitř řádku;
- plný detail obsahuje score, Forms/identitu, technické údaje a úplnou scrollovatelnou časovou osu;
- `locked`, úspěšné `recovery-unlock` a `bad-unlock` mají samostatná počítadla a filtry;
- legitimní Recovery je auditní informace, nikoli automatický incident;
- všechny uložené `split-window` události jsou viditelné bez dřívější 25% brány;
- 7 %, 49 % a 96 % se interpretují jako klientská heuristika, nikoli důkaz podvodu nebo lock policy;
- chybějící/neplatná telemetrie se zobrazuje jako `Data nejsou k dispozici`, zatímco platná nula jako `Nezaznamenáno`;
- časová osa ukazuje Europe/Prague i původní timestamp a bezpečně escapuje student/form/event data;
- přepínač detailu a filtry mají nativní keyboard ovládání a ARIA stav;
- výsledkové CSV zachovalo původní sloupce a přidalo přesně na konec `split_window_events`, `split_window_max_pct`;
- nový teacher HTML má offline CSP bez CDN a síťových závislostí;
- renderer nemění skóre, klasifikaci, identity binding, replay rozhodnutí, Forms import ani studentskou lock policy.

Nový prezentační modul je teacher-only. Scoring, kryptografie, Recovery runtime, studentské odevzdání, Google Forms a GARP autority nebyly přesunuty ani zdvojeny.

## 3. Commit a změněné soubory

Implementační commit:

- `1d2634bc1b6ed05c2d9b186ecaeeb6021474491d` — `feat(verifier): complete Sprint 04 teacher telemetry UX`

Změny proti baseline: 11 souborů, 536 vložení, 10 odstranění.

- `.github/workflows/p5-release-gate.yml`
- `eslint-globals.generated.mjs`
- `package.json`
- `scripts/check-s4-ci-wiring.mjs` (nový)
- `scripts/check-s4-teacher-verifier-browser.mjs` (nový)
- `scripts/check-s4-teacher-verifier.mjs` (nový)
- `scripts/check-verifier-generated-script-syntax-r1.mjs`
- `src/js/13eb-secure-teacher-verifier-v2-ui.js`
- `src/js/13eg-secure-verifier-history.js`
- `src/js/13eh-secure-teacher-verifier-s4.js` (nový)
- `src/js/13f-secure-teacher-verifier.js`

## 4. T118–T135

| Požadavek | Výsledek | Důkaz |
|---|---:|---|
| T118 empty state | PASS | bez výjimky a falešného závěru |
| T119 jeden pokus | PASS | jeden kompaktní řádek, body/%/známka/detail |
| T120 6A8 43/43/13 | PASS | šest řádků; agregace přesně 43/43/13 |
| T121 split 7/49/96 | PASS | tabulka i security panel, bez severity brány |
| T122 missing vs zero | PASS | `Data nejsou k dispozici` != `Nezaznamenáno` |
| T123 300+ událostí | PASS | 302 úplných událostí v omezeném scroll detailu |
| T124 iPad/orientation heuristika | PASS | žádný nový auto-lock, neobviňující text |
| T125 lock/Recovery/bad | PASS | oddělené počty, záznamy a filtry |
| T126 replay/duplicate/identity/joker | PASS | všechny stavy i volba platného pokusu zachovány |
| T127 parity scoring/import | PASS | score, známka, binding a resolved/effective populace beze změny |
| T128 studentské/Forms chování | PASS | source security + S1/S3/Forms browser regrese |
| T129 responzivita/motivy | PASS | 1440×900, 1024×768, 768×1024, 390×844; dark/light |
| T130 keyboard/ARIA/kontrast | PASS | Tab/Enter, aria-expanded/controls, kontrast 14.33:1–16.24:1 |
| T131 CSV kompatibilita | PASS | 45 sloupců; dva nové pouze na konci; missing není 0 |
| T132 XSS | PASS | identity, e-mail a event payload zůstaly textem |
| T133 offline/CSP/oddělení | PASS | single-file CSP, bez externích zdrojů; secret hygiene PASS |
| T134 skutečná generace | PASS | nový verifier 261525 B, fixture SHA-256 níže |
| T135 běžný workflow | PASS | pedagogické/scoring/Forms regrese PASS |

Zdrojový gate: `18/18 PASS`, návratový kód 0.

Chromium gate: `21/21 PASS`, návratový kód 0.

## 5. Skutečně generovaný verifier a browser evidence

Pro checkpoint `1d2634bc…` byl proveden čerstvý `build`, následně skutečná generace `teacher_verifier.html` z GIT a teprve potom browser test.

- Node.js `v24.19.0`, Windows x64;
- Playwright `1.61.1`;
- Chromium `149.0.7827.55`;
- teacher fixture SHA-256: `4469c05bcbc11dab035e79bf5b93406192a2e8a1029c68ef3fee298d1b478cc3`;
- S04 source evidence SHA-256: `91cbef5f48bdf6eb3f9a0a5246a8c2da2660c30f10f7f97bbe11b21609c3e6d0`;
- S04 Chromium evidence SHA-256: `009939778365a833e26f41a342362d89ff00581884145653877e5f75f8322176`;
- V2 theme/fullscreen evidence SHA-256: `250f951d3a4152c9cb85e84630ed1ce7675efb636b30e4e161b9bb969d050a11`.

Chromium navíc ověřil úplnou 302-event osu, XSS negativní payload, filtry, Tab/Enter, ARIA, nulový body overflow, viditelné akce a kontrast v osmi kombinacích viewport/motiv.

## 6. Regrese Sprintů 01–03 a Forms

Všechny následující běhy používají stejný zdrojový checkpoint `1d2634bc…`:

- Sprint 01 source/security: PASS — E1/E2/E3 credentials, E4 forensics, E5 secret hygiene, E6 adversarial, R2/R3/R4/R5;
- Sprint 01 Chromium: PASS; evidence SHA-256 `b6fe3697cea6e8d3cb92855edc024b120be7c14186222f00e5d961e9a10ad2d0`;
- Sprint 02 source/render/fingerprint/mutations: PASS;
- Sprint 02 Chromium: PASS; evidence SHA-256 `84bbd0012532d713061e3dd083ea2673945c31fd35b9fbd7a810ae7e08758f45`;
- Sprint 03 source: `10/10 PASS`;
- Sprint 03.1: `8/8 PASS`;
- Sprint 03.1 R2: `5/5 + 3/3 PASS`;
- Sprint 03 Chromium: PASS; evidence SHA-256 `aa6dba0374868a9ebceca954a18e02ac11b7a0bbc8cdd902e4e4ffdb0fcc76dd`;
- Forms F1–F9 source: `59/59 PASS`;
- Forms Chromium: `24/24 PASS` (syntetický browser workflow);
- productive answer contract: `62/62 PASS`;
- roster, randomizace, Teacher Verifier V2, effective analytics, IA/security, generated-script syntax: PASS;
- sken citlivých dat: PASS, 80 veřejných zdrojových souborů;
- source structure: PASS, 19 split modulů;
- lint: návratový kód 0, 0 errors, 9 existujících warnings;
- build: PASS.

## 7. CI/release zapojení

Nové povinné sekvence:

- `check:s4-teacher-verifier` je přesně jednou v `prebuild`;
- `check:s4-teacher-verifier-browser` nejdřív generuje nový verifier a je po buildu přesně jednou v `qa:p5` i `qa:p5:ci`;
- `check:s4-ci-wiring` je součástí `check:ci-orchestration`;
- P5 workflow uchovává source JSON, browser JSON a screenshoty;
- mutation kontroly odpojeného source/browser/generation/evidence kroku jsou PASS.

Samostatné S1, S2, S3 a S4 wiring kontrakty: **PASS**, návratový kód 0.

Celý historický Windows příkaz `node --test scripts/ci/...`: **FAIL**, návratový kód 1, `180/205 PASS`. Konkrétní viditelné příčiny jsou zákaz vytváření symlinků na hostiteli (`EPERM`), CRLF otisk trust anchoru a textové/topologické kontroly citlivé na Windows checkout. Tento běh není vydáván za PASS. Kompletní Linux/GitHub Actions orchestrace je proto **NOT VERIFIED**; Sprint 04 neoslabuje žádnou z těchto kontrol.

## 8. F0, GARP 2.7 a platforma

Čistý snapshot commitu `1d2634bc…` vytvořený s `core.autocrlf=false`:

- F0 trust-pin: PASS, 8 workflow pinů, návratový kód 0;
- build: PASS, návratový kód 0;
- GARP 2.7 contract: PASS;
- GARP 2.7 architecture: `41/41 PASS`;
- policy mutations: `6/6 PASS`;
- architecture mutations: `10/10 PASS`;
- auto-patch contract: PASS (syntetický/statický, žádný live auto-patch claim);
- GHRAB platform: `119/119 PASS`;
- lokální CI standard: návratový kód 0, `STRUCTURAL_MATCH_NOT_CERTIFIED`, releaseEligible=false;
- GARP 2.5 service-worker freeze: PASS;
- offline failsafe: `9/9 PASS`;
- vendored consistency a deployment leak scan: PASS.

LF trust-anchor SHA-256: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.

Hlavní Windows checkout s `core.autocrlf=true` dává F0 FAIL, protože CRLF byte hash anchoru je `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`. Trust anchor, consumer profil ani workflow piny nebyly změněny.

## 9. Předfinální neúspěšné běhy

Pro úplnost:

1. Nový akceptační gate na původním `8812b454…` skončil `2/18 PASS`, čímž reprodukoval chybějící S04 chování.
2. První implementační průchod skončil `14/18`; čtyři selhání byla v novém testovacím fixture/assertech, ne v produkčním scoringu. Po opravě testovacího modelu vznikl stabilní `18/18 PASS`.
3. Po rozšíření T126 test nejprve ručně nastavoval replay příznaky, které kanonický `rebuildDuplicateState()` správně přepočítal. Fixture byl změněn na skutečné duplicate/replay vstupy; následně PASS.
4. S1/S2/S3 browser gate spuštěný před prvním commitem správně odmítl nečistý tracked strom. Po commitu a čistém stromu všechny tři self-bound gate prošly na `1d2634bc…`.
5. F0/GARP nad Windows CRLF checkoutem selhal na byte hashi. Stejný commit v kanonickém LF snapshotu prošel beze změny pinů.
6. Kompletní Windows CI-orchestration zůstává FAIL 180/205; viz sekce 7.

## 10. NOT VERIFIED

- Node.js 22 (hostitel poskytl Node.js 24.19.0);
- fyzický iPad/iPadOS/Safari a skutečné split-screen/klávesnicové chování;
- embedded AI Studio iframe/WebView;
- živý AI provider;
- skutečný Google Forms submit/import se školním účtem;
- GitHub Pages nebo jiné staging prostředí;
- Linux/GitHub Actions kompletní orchestrace a produkční GARP/live auto-patch;
- produkční deployment.

## 11. Bezpečnostní hranice

- Nebyl proveden push ani merge do `candidate` nebo `main`.
- Nebyl proveden deployment.
- Nebyly změněny GARP trust piny.
- Nebyla implementována žádná nová studentská lock policy.
- Handoff neobsahuje reálné studenty, učitelské/recovery kódy, private key, answer key ani soukromý vygenerovaný verifier; browser fixture a syntetické klíče zůstávají pouze v ignorovaných lokálních QA podkladech.
- Sprint 05 nebyl zahájen.

## 12. Doporučení pro nezávislý audit

Ověřit bundle a manifest, checkoutnout `1d2634bc…`, spustit T118–T135 a po čerstvé generaci Chromium gate. F0/GARP spouštět v LF checkoutu. Samostatně provést fyzický iPad/Safari a živý Forms test; teprve poté vydat GO/NO-GO pro Sprint 04.
