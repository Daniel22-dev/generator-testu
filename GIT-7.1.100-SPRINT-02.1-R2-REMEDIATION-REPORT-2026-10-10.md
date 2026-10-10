# GIT 7.1.100 V7 — Sprint 02.1 R2 remediation

Technický implementační a ověřovací report, 2026-10-10.

## 1. Identita a rozsah

- Výchozí HEAD dokončeného Sprintu 02.1: `dff3e4977a87438cff437b7ea790da5212aa6d6d`.
- Izolovaná větev: `codex/sprint-02.1-r2-remediation`.
- Ověřený implementační commit R2: `c3ebcd8ef1324e1b65ff9666aa779042e2d965c2`.
- Rozsah: pouze R2 falešné/meškané duplicity, anglické `following passage`, španělské `siguiente texto`, cílené regrese, mutace a jejich povinné CI wiring.
- Zachovány byly předchozí commity Sprintů 01, 02 a 02.1. Beze změny zůstaly scoring, kryptografie, Recovery/Teacher/Admin oprávnění, Forms, GARP trust data a workflow piny.
- Nebyl proveden push/merge do `candidate` nebo `main`, deployment ani práce na Sprintu 03.

## 2. Vstupní audit a reprodukce

Kontrolní součty všech osmi souborů dodaného auditorského balíčku souhlasily s `AUDIT-SHA256SUMS.txt`.

Přiložený `S2-1-INDEPENDENT-ADVERSARIAL-R2.mjs` byl spuštěn beze změny na přesném SHA `dff3e4977a87438cff437b7ea790da5212aa6d6d` v čistém stromu:

- exit `1`, souhrn `3 PASS / 6 FAIL / 9`;
- R2-FP01, FP02 a FP03: falešný `literal-cross-exercise-duplicate` při stejném obecném stemu a různých možnostech;
- R2-TP01: úplná duplicita obecného stemu a možností nebyla nalezena;
- R2-FN01: `According to the following passage` nebylo nalezeno;
- R2-FN02: `Según el siguiente texto` nebylo nalezeno;
- R2-TP02, CTRL01 a CTRL02 prošly již na baseline.

Původní source gate Sprintu 02.1 před změnou prošel včetně čtyř původních regresních významů: krátká věcná duplicita, anglický demonstrativní odkaz, španělský odkaz a generic false-positive control.

## 3. Příčina a oprava

Původní validátor:

1. vyřazoval přesně vyjmenované obecné instrukce ze srovnání úplně;
2. u ostatních položek porovnával jen normalizovaný stem;
3. nerozpoznával modifikátory `following` a `siguiente` mezi determinantem a označením Reading zdroje.

R2 oprava je strukturální:

- Každá položka se stejným stemem se nyní porovnává pomocí kanonického otisku odpovědního obsahu.
- Otisk zahrnuje seřazené možnosti, skutečný obsah správné možnosti a významová pole jako `answer`, `correct_answer`, `acceptable_answers`, `expected`, `solution`, `translation`, `pairs` a `right`.
- Pořadí polí a pořadí možností není způsob, jak úplnou duplicitu obejít.
- Stejný obecný stem s rozdílným odpovědním obsahem je povolen; stejný stem se stejným odpovědním obsahem je blokující `literal-cross-exercise-duplicate`.
- Není použit nový seznam jednotlivých auditorských vět.
- Hidden-context detekce byla ohraničeně rozšířena o anglické `following|preceding|above` a španělské `siguiente|anterior` před názvem Reading zdroje.
- Bodování, typ cvičení, počet položek a renderer nebyly změněny.

## 4. Regresní ochrana a CI wiring

- Nový `scripts/check-s2-r2-adversarial.mjs` obsahuje všech devět auditorských scénářů.
- `check:s2-pedagogical-fidelity` povinně spouští původní S2 matici, devět R2 scénářů a mutační gate.
- `check-s2-ci-wiring.mjs` odmítá konfiguraci, která R2 scénáře nebo S2.1 mutace odpojí.
- Mutační gate zachovává původní tři S2.1 mutace a přidává čtyři R2 mutace:
  - návrat ke stem-only porovnání znovu vytvoří falešnou duplicitu;
  - vyřazení content-free generic stemů znovu přehlédne úplnou duplicitu;
  - odebrání `following` znovu otevře anglickou mezeru;
  - odebrání `siguiente` znovu otevře španělskou mezeru.

## 5. Změněné soubory

Implementační commit mění pouze:

- `src/js/13a-secure-helpers.js`
- `scripts/check-pedagogical-fidelity-s2.mjs`
- `scripts/check-s2-r2-adversarial.mjs`
- `scripts/check-s2-remediation-mutations.mjs`
- `scripts/check-s2-ci-wiring.mjs`
- `package.json`

Tento report je samostatný sedmý soubor v následném dokumentačním commitu.

## 6. Výsledky na implementačním SHA

Není-li uvedeno jinak, následující výsledky jsou vázány na `c3ebcd8ef1324e1b65ff9666aa779042e2d965c2`.

### Pedagogická fidelity — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| Přiložený R2 reproduktor po samotné opravě | 0 | 9/9 PASS |
| Repozitářový R2 adversarial gate | 0 | 9/9 PASS |
| Původní S2/S2.1 source regrese | 0 | T01–T04, T55–T63 a původní 4 významy PASS |
| S2.1 + R2 mutační gate | 0 | 7/7 cílených mutací prokazuje znovuotevření mezery |
| S2 CI wiring | 0 | source, R2, mutations a browser evidence zůstávají blokující |
| S2 browser gate | 0 | instant, secure student a verifier; 5 cvičení / 18 otázek |

S2 browser provenance: Node `v24.19.0`, Windows x64, Playwright `1.61.1`, Chromium `149.0.7827.55`, source HEAD `c3ebcd8ef1324e1b65ff9666aa779042e2d965c2`.

- Instant HTML SHA-256: `6af5ab3e2c15397d76acd7c6cd0827023eca4ba17bf1e0b9348b6e1739e33211`.
- Secure student HTML SHA-256: `6db01d405707d7a80f5c7cdb478f109223bdbd263fbc933936cc7ad92bbd3119`.
- Teacher verifier SHA-256: `be5aa738445b48c8fd60b828e0e3304b13ab8c2e6408ecb1f4b5c04d80aa3548`.

### Sprint 01 a bezpečnostní hranice — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| E1/E2/E3 credential gates | 0 | oddělení Teacher/Admin a Recovery, auth-close race, cleanup, stav pokusu |
| E4 forensics, E5 secret hygiene, E6 adversarial | 0 | audit timeline, redakce tajemství, doménové oddělení |
| R2 credential policy, R3 infrastructure, R4 recovery runtime | 0 | fail-closed policy, test wiring, souběžné Recovery |
| R5 adversarial | 0 | 39 PASS / 0 FAIL / 0 ERROR |
| Sprint 01 browser gate | 0 | auth-close race + Recovery hranice + stav pokusu |
| Sensitive-data scan | 0 | 79 veřejných zdrojových souborů |
| Generated verifier syntax | 0 | inline verifier script parsuje |
| Red-team isolation | 0 | static PASS |
| Red-team isolation browser | 0 | syntetický Chromium PASS |

Sprint 01 browser artefakty:

- instant SHA-256 `2c6df31604865cd82be5d1411cd03dde0dc13651b001a8957e8217735a249200`;
- secure student SHA-256 `a2ff2b7f70f6ddee652518eb537c6d0853542d15b8202467ba694378e17e11f6`;
- verifier SHA-256 `a0cd51fe5befdc40e807c3d3cf172980362c24d98a7dba88b0531901e5a45c35`.

### Kompatibilita — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| Build | 0 | Core SHA-256 OK, 49 initial modulů + 2 lazy features |
| Platform conformance | 0 | 119/119 |
| Forms F1–F9 | 0 | 59/59 source/contract kontrol |
| Forms browser | 0 | 24/24 syntetických scénářů |
| Teacher Verifier V2 | 0 | contract PASS |
| Verifier IA/security | 0 | PASS |
| Verifier UI browser | 0 | Chromium theme/fullscreen runtime PASS |
| Randomization/numbering | 0 | deterministická úplná permutace a renderer/verifier shoda |
| Lint | 0 | 0 chyb; 9 dříve existujících warningů mimo R2 |

### F0 a GARP 2.7 — PASS v konzistentním LF checkoutu

Trust piny ani důvěryhodné soubory nebyly změněny. Srovnání bylo provedeno v oddělených checkoutech s `core.autocrlf=false`:

| SHA | Build | F0 |
|---|---:|---:|
| baseline `dff3e4977a87438cff437b7ea790da5212aa6d6d` | PASS, exit 0 | PASS, exit 0 |
| R2 `c3ebcd8ef1324e1b65ff9666aa779042e2d965c2` | PASS, exit 0 | PASS, exit 0 |

F0 ověřil 8 workflow referencí proti SHA-256 `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.

Na R2 LF checkoutu:

- GARP contract gate: 6/6 PASS, exit 0;
- architecture integrity: 41/41 PASS, exit 0;
- policy-admission mutations: 6/6 PASS, exit 0;
- architecture mutations: 10/10 PASS, exit 0;
- auto-patch contract: 9/9 PASS, exit 0; bez live auto-patch claimu.

Diagnostický běh v původním Windows checkoutu s `core.autocrlf=true` skončil F0 exit 1, architecture 37/41 a mutations 9/10. Příčinou byly raw CRLF otisky čistě checkoutovaných hashovaných textových souborů (např. trust-anchor file SHA-256 `9908c887...` místo workflow/consumer pinu `afc16d2a...`), nikoli změna Git obsahu. Piny nebyly přepsány ani kontroly oslabeny.

## 7. Commity

- `c3ebcd8ef1324e1b65ff9666aa779042e2d965c2` — `fix(s2): harden pedagogical duplicate detection`.
- Report je zapsán samostatným následným commitem; jeho SHA je uvedeno v historii větve a v předávacím checksum manifestu, aby report nevytvářel kruhovou sebe-referenci.

## 8. FAIL / NOT VERIFIED / rizika

### FAIL

- Na konzistentním LF checkoutu implementačního SHA nezůstal žádný FAIL v provedené R2, bezpečnostní, build ani GARP matici.
- Výchozí R2 reprodukce `3/9` a diagnostický CRLF trust run jsou výše zachované očekávané důkazy, nikoli zatajené PASS.

### NOT VERIFIED

- Fyzický iPadOS/Safari a nativní password-manager dialogy.
- GitHub Pages staging/production; žádný deployment nebyl proveden.
- Live AI požadavek.
- Reálný Google Forms účet a reálná studentská data.
- Node.js 22/Linux; dostupné prostředí bylo Node `v24.19.0`/Windows, doplněné konzistentním LF checkoutem.
- Jediný úplný `npm run qa:p5:ci` orchestration run; v prostředí nebyl příkaz `npm`, proto byly relevantní pod-gates spuštěny přímo.
- Úplná browser/scoring certifikace všech 38 veřejně popsaných formátů.

### Zbývající rizika

- Otisk řeší strukturální shodu obsahu, nikoli všechny možné sémantické parafráze; heuristický similarity warning a učitelský review zůstávají potřebné.
- Hidden-context detekce je záměrně ohraničená a auditovatelná; další jazykové formulace mohou vyžadovat nové schválené regrese.
- Statický klient nemůže zabránit DevTools/extension capture, screenshotům nebo úpravě vlastníkem zařízení.
- Metadata sestavení nadále uvádějí `7.1.99`; release/version bump nebyl autorizován.

## 9. Závěr

Všech šest potvrzených R2 selhání bylo nejprve reprodukováno a následně uzavřeno strukturální opravou validátoru. Devět nových scénářů, původní S2.1 regrese, cílené mutace, bezpečnostní hranice Sprintu 01, browser kontroly, build, F0 a GARP 2.7 prošly v uvedeném ověřovacím prostředí. Sprint 02.1 R2 je připraven k nezávislému GO/NO-GO auditu; nejde o autorizaci produkčního vydání.
