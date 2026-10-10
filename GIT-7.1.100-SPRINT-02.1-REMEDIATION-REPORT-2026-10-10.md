# GIT 7.1.100 V7 — Sprint 02.1 targeted remediation

Technický implementační a ověřovací report, 2026-10-10.

## 1. Identita a hranice

- Auditovaný výchozí HEAD Sprintu 02: `8ad7a6e9b9a551b1b4c246d2bacacba0f9def84e`.
- Izolovaná větev: `codex/sprint-02.1-remediation`.
- Ověřený implementační HEAD Sprintu 02.1: `a39a731dcb435240194684c2480058eb4464296a`.
- Rozsah: pouze nálezy S2-R1 až S2-R3, přímo související negativní/mutační testy a jejich CI wiring.
- Beze změny zůstaly scoring, manifest, GARP trust data, kryptografie, identity, roster, Forms a Recovery.
- Nebyl proveden push/merge do `candidate` nebo `main`, produkční deployment ani zahájen Sprint 03.

## 2. Reprodukce před opravou

Dodáný `S2-INDEPENDENT-NEGATIVE-CASES.mjs` byl spuštěn beze změny proti přesnému HEAD `8ad7a6e9b9a551b1b4c246d2bacacba0f9def84e`.

- Návratový kód: `1`.
- Souhrn: 1 PASS / 3 FAIL.
- S2-R1 `short-content-specific-identical`: očekáván `literal-cross-exercise-duplicate`, skutečnost `[]`.
- S2-R2 `english-demonstrative-passage`: očekáván `independent-mc-hidden-context`, skutečnost `[]`.
- S2-R3 `spanish-reading-reference`: očekáván `independent-mc-hidden-context`, skutečnost `[]`.
- Generická kontrola `Choose the correct answer.`: PASS bez duplicate/similarity nálezu.

Tím byly všechny tři auditorské nálezy potvrzeny před zásahem.

## 3. Implementovaná oprava

### S2-R1 — krátká věcná doslovná duplicita

- Doslovná mezicvičební duplicita již není podmíněna minimálně pěti content tokeny.
- Krátká věcná otázka `Which device broke first?` je nyní blokující `literal-cross-exercise-duplicate`.
- Výjimku tvoří explicitní, auditovatelná sada přesných generických instrukcí. Pokrývá běžné anglické, české, španělské a německé instrukce.
- Obecné instrukce `Choose the correct answer.`, `Vyber správnou odpověď.`, `Selecciona la respuesta correcta.` a `Wähle die richtige Antwort.` zůstávají false-positive kontrolami.

### S2-R2 — anglické demonstrativní odkazy

- Hidden-context detekce rozpoznává `the/this/that text|passage|article|story|extract|reading`.
- Pokryty jsou vazby `according to`, `based on`, `in` a `from`.
- Samostatné otázky typu `Which word means passage?` nebo `In which tense is this sentence written?` nejsou blokovány.

### S2-R3 — španělské a měřené vícejazyčné odkazy

- Španělština rozpoznává ohraničené vazby `según`, `de acuerdo con`, `basado en`, `en`, `del` s demonstrativy a názvy Reading zdroje.
- Normalizace zachovává shodu akcentovaných i neakcentovaných forem.
- Současně byly přidány měřené české a německé explicitní vazby.
- Pouhé použití slova `texto`, `text` nebo `passage` bez relační vazby není blokováno.

### Regresní a mutační ochrana

- Povinný S2 source gate nyní spouští původní regresní matici a nový `check-s2-remediation-mutations.mjs`.
- Mutační gate cíleně:
  1. obnoví starý cutoff `tokens.length >= 5`,
  2. odstraní anglické demonstrativy,
  3. odstraní španělský pattern.
- U každé mutace dokládá, že se příslušná auditorská mezera znovu otevře.
- `check-s2-ci-wiring.mjs` odmítne konfiguraci, která by S2.1 mutační gate vynechala.

## 4. Změněné cesty

- `src/js/13a-secure-helpers.js`
- `scripts/check-pedagogical-fidelity-s2.mjs`
- `scripts/check-s2-remediation-mutations.mjs`
- `scripts/check-s2-ci-wiring.mjs`
- `package.json`
- tento report.

Implementační diff před reportem: 5 souborů, 138 vložených a 5 odstraněných řádků.

## 5. Commity

- `a39a731dcb435240194684c2480058eb4464296a` — `fix: close sprint 02 fidelity validation gaps`.

Report je zapsán samostatným následným commitem; jeho SHA je uvedeno v historii větve a v předávacím bundle, aby nevznikla kruhová sebe-reference.

## 6. Výsledky po opravě

Všechny níže uvedené implementační testy jsou vázány na `a39a731dcb435240194684c2480058eb4464296a`.

### Zaměřené S2.1 kontroly — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| Dodaný `S2-INDEPENDENT-NEGATIVE-CASES.mjs` | 0 | 4/4 PASS; S2-R1, S2-R2, S2-R3 i generická kontrola |
| `check-pedagogical-fidelity-s2.mjs` | 0 | Původní T01–T04/T55–T63 + nové věcné, vícejazyčné a false-positive případy |
| `check-s2-remediation-mutations.mjs` | 0 | 3/3 cílených mutací znovu otevírá odpovídající nález |
| `check-s2-ci-wiring.mjs` | 0 | Prebuild/P5 wiring blokuje vynechání zdrojového, browser i S2.1 mutation gate |

### Build a generované artefakty — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| `node scripts/build.mjs` | 0 | Build PASS |
| Sprint 02 browser gate | 0 | Instant + secure student + teacher verifier/print; 5 cvičení / 18 otázek |
| Sprint 01 recovery browser gate | 0 | Auth-close race, Recovery/Teacher/Admin hranice a zachování pokusu |
| Verifier UI browser gate | 0 | Theme/fullscreen/runtime PASS |
| Forms lesson browser gate | 0 | 24/24 syntetických scénářů |

Browser prostředí:

- Node `v24.19.0`, Windows x64, Playwright `1.61.1`, Chromium `149.0.7827.55`.
- S2 gate SHA-256: `0beae652f6474cef6a74e8a8a40efd77874f293cc8b72f4e161fa6a5dd3ea971`.
- `package-lock.json` SHA-256: `7eafe8ed887c908d5b34c41d18a57b2f5a9a2ccffce414325498d947407cc994`.
- Instant artifact SHA-256: `49d2b37060ad4639e620743eec8823ab6457e91bcb6ac30e61ef41edfb401be3`.
- Secure student SHA-256: `9ebe27bcfd43084e2379a12ceaf71a325f35779fff38f7b6c4e625906c08e912`.
- Teacher verifier SHA-256: `2dcfe6c6c02c2dd8fe918b266613d24b15c2ece2e44b3e2d29c04b42315fccc8`.

### Zachování Sprintu 01 a kompatibility — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| R4 recovery runtime | 0 | Recovery serializace, cleanup a audit |
| E1 remediation | 0 | Podepsaná persistence a teacher verifier binding |
| E3 credential boundary | 0 | Recovery/Teacher/Admin, async auth-close race a cleanup |
| E6 adversarial security | 0 | Oddělené credential domény a persistence deny policy |
| Red-team isolation | 0 | Student artifact bez učitelských tajemství |
| Forms F1–F9 | 0 | 59/59 source/contract kontrol |
| Teacher Verifier V2 | 0 | UI/decryption/scoring authority kontrakt |
| Generated verifier syntax | 0 | Inline verifier script parsuje |
| Randomization/numbering | 0 | Deterministická úplná permutace a secure/instant/verifier shoda |
| Sensitive-data scan | 0 | 79 veřejných zdrojových souborů |
| Lint | 0 | 0 chyb; 9 dříve existujících warnings mimo S2.1 |

### F0 a GARP 2.7 v čistém LF checkoutu — PASS

- Checkout: stejný SHA `a39a731dcb435240194684c2480058eb4464296a`, `core.autocrlf=false`.
- Trust anchor SHA-256: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.
- F0: 8/8 workflow pinů, exit 0.
- Build: exit 0.
- GARP contract gate: 6/6, exit 0.
- GARP architecture integrity: 41/41, exit 0.
- Policy-admission mutations: 6/6, exit 0.
- Architecture mutations: 10/10, exit 0.
- Auto-patch contract: 9/9, exit 0; žádný live auto-patch claim.
- GARP trust anchor, policy ani capability inventory nebyly změněny.

## 7. FAIL

- Na implementačním HEAD nezůstal žádný potvrzený FAIL v provedené matici.
- Před-opravový exit 1 na `8ad7a6e…` je požadovaný reprodukční důkaz, nikoli výsledek po opravě.

## 8. NOT VERIFIED a zbývající rizika

- Fyzický iPadOS/Safari a nativní password-manager dialogy: NOT VERIFIED.
- Skutečný GitHub Pages staging/production: NOT VERIFIED; deployment nebyl autorizován.
- Live AI generování: NOT VERIFIED.
- Live Google Forms účet a reálný export: NOT VERIFIED; unit a syntetické browser scénáře PASS.
- Úplný `npm run qa:p5:ci` jako jediný orchestrace run: NOT VERIFIED; dostupný runtime nemá příkaz `npm`. Relevantní pod-gates byly spuštěny přímo.
- Node.js 22/Linux: NOT VERIFIED; testováno na Node `v24.19.0` / Windows a samostatném LF checkoutu.
- Neproběhla plná browser/scoring certifikace všech 38 veřejně popsaných formátů.
- Podobnostní kontrola je heuristická. Nemůže zaručit zachycení všech sémantických parafrází s malým lexikálním překryvem; učitelský review zůstává nutný.
- Explicitní seznam generických instrukcí a vícejazyčných Reading vazeb je záměrně měřený, nikoli neomezený jazykový model. Nové formulace mohou vyžadovat další auditované příklady.
- Statický klient nemůže garantovat důvěryhodnost zařízení ani zabránit DevTools/extension capture, screenshotům nebo editaci vlastníkem klienta.
- Baseline build metadata nadále uvádějí `7.1.99`; release/version bump nebyl součástí autorizace.

## 9. Závěr

S2-R1 až S2-R3 jsou reprodukovány před opravou a uzavřeny po opravě testy i cílenými mutacemi. Sprint 02.1 je připraven k nezávislému GO/NO-GO auditu. Tento report není produkční release autorizace.
