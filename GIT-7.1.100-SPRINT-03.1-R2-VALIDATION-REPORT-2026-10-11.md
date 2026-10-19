# GIT 7.1.100 V7 — Sprint 03.1 R2 Validation Report

Datum: 2026-10-11

Rozsah: výhradně cílená náprava validace bodů Sprintu 03.1 R2

Výchozí commit: `7d8187eea7680b42be9ff25b3a0b9a703f564c95`

Otestovaný implementační checkpoint: `cdaa8d8b1ae490e9a64aec4e5998a1033462df18`

Větev: `codex/sprint-03.1-r2-validation`

## 1. Rozhodnutí implementátora

Lokální vývojové ověření Sprintu 03.1 R2 je **PASS**. Potvrzené tři nálezy původní pětiscénářové matice jsou opraveny a původní matice se změnila z `2 PASS / 3 FAIL` na `5 PASS / 0 FAIL`.

Toto není produkční certifikace ani GO pro Sprint 04. Kód čeká na nezávislý audit vlastníka/koordinátora.

## 2. Reprodukce před opravou

Na přesném výchozím commitu `7d8187eea7680b42be9ff25b3a0b9a703f564c95`:

| Scénář | Stav |
|---|---|
| Neplatné `29.7` okamžitě blokuje pokračování | PASS |
| Následné `validate()` zachová blokaci a chybu | FAIL |
| Přímé `goTo(3)` je fail-closed | FAIL |
| Platná předvolba 30 vyčistí stale validity | FAIL |
| Ručně zadané platné celé číslo 29 vyčistí chybu | PASS |

Přesný výsledek: `2 PASS / 3 FAIL`, návratový kód 1.

Rozšířený trvalý test navíc na baseline prokázal čtvrtý problém: implicitní synchronizace přepsala neplatnou rozepsanou hodnotu `29.7`. Proto jeho baseline je přísnější: `1 PASS / 4 FAIL`.

## 3. Příčina a oprava

Příčinou byly tři nesjednocené autority:

- `onCustomBody()` uměl vstup odmítnout, ale `validate()` jeho vlastní validační stav nerespektoval;
- `pickNum()` měnil body bez jednotného vyčištění native validity a ARIA stavu;
- `goTo()` neměl fail-closed kontrolu při přímém programovém přechodu;
- překreslení/synchronizace mohla přepsat neplatnou rozepsanou hodnotu uloženým součtem.

Implementace:

- `onCustomBody()` nastavuje native `customValidity`, `aria-invalid`, zachová stav a neukládá neplatný vstup;
- `validate()` považuje `validationMessage`/`aria-invalid` za globální blokující invariant;
- `pickNum('body', value)` používá striktní celočíselnou a rozsahovou kontrolu, neplatná hodnota nemutuje stav a platná hodnota vyčistí chybu;
- `goTo(n)` při dopředné navigaci znovu validuje a vrací `false`, pokud aktuální krok nesmí pokračovat;
- implicitní synchronizace a `applyVisualState()` zachovají nevyřešený rozepsaný neplatný vstup; explicitní platná oprava jej naopak nahradí a vyčistí;
- CI wiring nyní vyžaduje trvalý test `check:s31-r2-point-validation` přes existující povinnou větev `check:s3-workflow-fidelity`.

Scoringový algoritmus nebyl změněn. Pro validní 29 bodů zůstává rozdělení `6+6+6+6+5`.

## 4. Implementační commity

1. `5fe5afb5b2e2f49db7b6c5a97db3d49f0f9b59ae` — `fix(s3.1-r2): unify point input validation`
2. `dc8bb2b89b04c6b2289b24754cd441f91e76e778` — `test(s3.1-r2): use visible chromium revalidation control`
3. `1b64699bc392fe933ec4b83df770abc4b2015428` — `test(s3.1-r2): expose chromium revalidation control`
4. `cdaa8d8b1ae490e9a64aec4e5998a1033462df18` — `fix(s3.1-r2): preserve unresolved point input on redraw`

Commity 2–4 zachycují iterativní browser ověření: Chromium nejdřív odhalilo nevhodně skrytý testovací ovladač a následně skutečný produktový problém, kdy překreslení mazalo `29.7`. Finální browser běh je na `cdaa8d8…` PASS.

## 5. Změněné zdrojové soubory vůči baseline

- `src/js/05-form-fields.js`
- `src/js/03-ui-render.js`
- `scripts/check-s31-r2-point-validation.mjs` (nový)
- `scripts/check-s3-workflow-browser.mjs`
- `scripts/check-s3-ci-wiring.mjs`
- `package.json`

Rozsah implementace: 6 souborů, 252 vložených a 12 odstraněných řádků. Chráněné oblasti `.github`, `security`, `vendor` a `tools/ci-standard` jsou proti baseline beze změny.

## 6. Testy na `cdaa8d8b1ae490e9a64aec4e5998a1033462df18`

### PASS

| Oblast | Výsledek |
|---|---|
| Auditorská pětice Sprint 03.1 R2 | 5/5 |
| Rozšířená trvalá Sprint 03.1 R2 regrese | 5/5 |
| Původní Sprint 03.1 | 8/8 |
| Původní Sprint 03 | 10/10 |
| S3 CI wiring + mutation chybějící R2 brány | PASS |
| Chromium Sprint 03/03.1/R2 | PASS, Chromium 149.0.7827.55, Playwright 1.61.1 |
| Chromium Sprint 01 | PASS |
| Chromium Sprint 02 | PASS |
| Credential E1/E2/E3, E4 forensics, E5 hygiene, E6 adversarial | PASS |
| Recovery R4, credential policy R2, R5 adversarial | R5 39/39, ostatní PASS |
| Pedagogická sada Sprint 02 včetně R2, rendererů a mutací | PASS |
| Google Forms F1–F9 | 59/59 (source/unit kontrakty) |
| Full roster, randomizace, Teacher Verifier V2, verifier syntax/IA | PASS |
| Sensitive-data scan | 79 veřejných zdrojových souborů, PASS |
| Source structure | 19 modulů, PASS |
| Build přes `node scripts/build.mjs` | PASS |
| Lint | návratový kód 0; 0 errors, 9 existujících warnings |

Chromium R2 důkaz ověřuje skutečné DOM akce: vyplnění `29.7`, nesouvisející kliknutí, běžné kliknutí na Další i přímé `goTo(3)`, opravu předvolbou 30 a opravu ruční hodnotou 29. Stav po platné 29 je `[6,6,6,6,5]`.

### F0 a GARP 2.7 — čistý LF checkout

Pro stejný commit `cdaa8d8…`, Windows checkout s `core.autocrlf=false`, Node `v24.19.0`:

- F0 trust-pin: PASS, návratový kód 0, všech 8 workflow pinů odpovídá;
- build: PASS, návratový kód 0;
- platform conformance: 119/119 PASS;
- GARP contract gate: 6/6 PASS;
- GARP architecture integrity: 41/41 PASS;
- policy admission mutations: 6/6 PASS;
- architecture mutation tests: 10/10 PASS;
- auto-patch contract: PASS;
- local CI standard diagnostic: `STRUCTURAL_MATCH_NOT_CERTIFIED`, návratový kód 0 (diagnostika, nikoli release certifikace).

Otisky v LF checkoutu:

- `security/garp27/trust-anchor.json`: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`
- `tools/ci-standard/consumers/generator-testu.json`: `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`

Ve standardním Windows pracovním stromu s CRLF skončí F0 očekávaně FAIL (`reviewed consumer profile does not match trust anchor`, návratový kód 1). Lokální byte hash anchoru je `9908c887…` a profilu `2a57d31f…`. Rozdíl je line-ending drift; chráněné soubory ani piny nebyly změněny. Test v konzistentním LF checkoutu je PASS.

## 7. Browserové otisky

Všechny následující JSON důkazy uvádějí `sourceHead=cdaa8d8b1ae490e9a64aec4e5998a1033462df18`:

- S3 browser evidence SHA-256: `df597ee5cd8c45a17b54636bd2be2474ba3d0182b11d30f624a3eacba090cd8c`
- S1 browser evidence SHA-256: `045284549ebfff14a9bd8449ac39bb84af06d288f24c10fd7f80bb1cc3216223`
- S2 browser evidence SHA-256: `b9be189e5eee4663c51d95318f7391fcd237f9408687858c4eb8f866aca0c48c`

S3 renderer artefakty:

- instant HTML: `cb1075336f2de0772881f879bfa94754d0bdb25e2f210610839d44650a4a70f5`
- secure student HTML: `9b81f7934bc0c15c5f7ac13f37d27d9374847d3cca0925e0283579cf94161558`
- verifier HTML: `483753142e49548c44f63444e820c62f5b5f298241f936a246cb7b97aeb062d9`

## 8. FAIL a NOT VERIFIED

### FAIL

- F0 v hlavním CRLF checkoutu: očekávaný lokální line-ending mismatch; čistý LF checkout stejného SHA je PASS. Piny nebyly přepsány ani kontroly oslabeny.

### NOT VERIFIED

- Node.js 22: hostitel poskytl Node.js `v24.19.0`;
- kompletní `npm run ...` wrapper: příkaz `npm` není na hostiteli dostupný; odpovídající Node gate skripty byly spuštěny přímo;
- fyzický iPad/iPadOS/Safari;
- skutečné embedded prostředí AI Studia;
- živé Google Forms odevzdání;
- GitHub Pages/staging/produkční deployment;
- produkční GARP/live auto-patch chování.

## 9. Bezpečnostní a provozní hranice

- Nebyl proveden push ani merge do `candidate` nebo `main`.
- Nebyl proveden žádný deployment.
- Nebyl změněn zdroj AI Studia.
- Nebyly změněny GARP piny, Recovery, kryptografie ani Forms.
- V repozitáři ani handoff balíčku nejsou reálná studentská data, učitelské klíče ani soukromé verifiery.
- Sprint 04 nebyl zahájen.

## 10. Doporučení pro nezávislý audit

1. Ověřit bundle a SHA-256 manifest.
2. Checkoutnout finální handoff větev a potvrdit, že implementační strom odpovídá `cdaa8d8…` plus pouze tento report.
3. Spustit `node scripts/check-s31-r2-point-validation.mjs`, původní S3.1/S3 matice a Chromium S3 gate.
4. F0/GARP spustit v LF checkoutu; neměnit důvěryhodné piny kvůli CRLF.
5. Teprve po nezávislém GO rozhodnout o Sprintu 04.
