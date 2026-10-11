# GIT 7.1.100 V7 — Sprint 02 final fingerprint remediation

Technický implementační a ověřovací report, 2026-10-11.

## 1. Identita, základ a rozsah

- Požadovaný výchozí HEAD Sprintu 02.1 R2: `9e2f89fb8611827c8cf76a11dccd1c1935976357`.
- Izolovaná větev: `codex/sprint-02.1-r2-fingerprint-remediation`.
- Implementační checkpoint: `64ad6e39a10155bcbc7dd510755d7fcdd7786fc3`.
- Merge-base s požadovaným základem: přesně `9e2f89fb8611827c8cf76a11dccd1c1935976357`.
- Rozsah: pouze strukturální otisky studentovi viditelné úlohy a odpovědního klíče, F-01 až F-04, jejich regrese, mutace a povinné S2 source-gate wiring.
- Beze změny zůstaly scorery, kryptografie, Google Forms payload, GARP trust data, Recovery/Teacher/Admin hranice, generátory studentských HTML i teacher verifier runtime.
- Nebyl proveden push/merge do `candidate` nebo `main`, deployment ani práce na Sprintu 03.

## 2. Auditní vstup a reprodukce

Kontrolní součty všech sedmi souborů dodaného auditorského balíčku souhlasily se `SHA256SUMS-AUDIT.txt`.

Přiložený `S2-EXTRA-FINGERPRINT-NEGATIVES.mjs` byl spuštěn beze změny:

| SHA | Exit | Výsledek |
|---|---:|---|
| `dff3e4977a87438cff437b7ea790da5212aa6d6d` | 1 | 3/6 PASS; F-02 až F-04 reprodukovány jako starší závady, oba MC scénáře ještě PASS |
| `9e2f89fb8611827c8cf76a11dccd1c1935976357` | 1 | 2/6 PASS; F-01 až F-04 reprodukovány, F-01 potvrzena jako nová regrese R2 |
| `64ad6e39a10155bcbc7dd510755d7fcdd7786fc3` | 0 | 6/6 PASS |

Původní devítiprvkový R2 adversarial runner na implementačním checkpointu skončil `9/9 PASS`, exit `0`. Požadované minimum je tedy `15/15 PASS` (9 původních + 6 nových scénářů).

## 3. Příčina a řešení

Původní `itemContentFingerprint()` míchal dvě odlišné vrstvy:

1. obsah skutečně zobrazený nebo nabídnutý studentovi;
2. skrytý hodnoticí klíč.

Proto rozdílný MC klíč maskoval identickou viditelnou otázku, zatímco formáty s obecným instrukčním stemem a vlastní viditelnou strukturou (`words`, `items`, tabulka) byly chybně považovány za shodné.

Oprava zavádí dvě oddělené deterministické reprezentace:

- `studentVisibleTaskFingerprint`: studentovi zobrazené možnosti, slovní banky, položky pro řazení, viditelné hlavičky/pevné buňky tabulky a další podporované formátové struktury;
- `gradingKeyFingerprint`: správná možnost jako hodnota (nikoli pouze index), správná věta/pořadí, skryté odpovědi tabulky a odpovídající klíče dalších kanonických formátů.

Výběrové banky jsou porovnávány jako multisety, takže pouhé přeskupení možností nebo slov duplicitu neskryje. Pořadí zůstává zachováno tam, kde je studentovi zobrazenou sémantikou, například v řádcích a sloupcích tabulky nebo instrukcích transformačního řetězce. Objektová odpovědní buňka tabulky je ve viditelném otisku pouze prázdné vstupní místo; její odpověď patří výhradně do klíče.

Stejná viditelná úloha je vždy blokující `literal-cross-exercise-duplicate`. Pokud se navíc liší oba neprázdné klíče, validátor přidá samostatnou blokující chybu `cross-exercise-answer-key-conflict`. Nebyl přidán seznam výjimek pro auditní věty.

## 4. Regrese, mutace a CI wiring

- Nový `scripts/check-s2-visible-task-fingerprint.mjs` obsahuje přesných šest auditních scénářů a šest dalších strukturálních kontrol.
- Další kontroly dokazují shodu po přeskupení bank, explicitní konflikt klíče pro Word Order, Ordering a Table Completion a zachování sémantického pořadí řádků tabulky.
- Mutační gate nyní obsahuje 11 cílených mutací: původní S2.1/R2 mutace plus F-01 až F-04. Každá mutace prokazatelně znovu otevře odpovídající mezeru.
- `check:s2-pedagogical-fidelity` povinně spouští původní pedagogickou matici, 9 R2 scénářů, nový fingerprint gate a mutace.
- `check-s2-ci-wiring.mjs` odmítne odpojení kteréhokoli z těchto gate; `prebuild` nadále vyžaduje celý source gate a P5 nadále vyžaduje browser gate.

## 5. Změněné soubory implementačního checkpointu

- `src/js/13a-secure-helpers.js`
- `scripts/check-s2-visible-task-fingerprint.mjs`
- `scripts/check-s2-remediation-mutations.mjs`
- `scripts/check-s2-ci-wiring.mjs`
- `package.json`

Tento report je jediný soubor samostatného následného dokumentačního commitu.

## 6. Výsledky na SHA `64ad6e39a10155bcbc7dd510755d7fcdd7786fc3`

### Pedagogická fidelity — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| Nezměněný externí fingerprint runner | 0 | 6/6 PASS |
| Původní R2 adversarial gate | 0 | 9/9 PASS |
| Součet požadovaných scénářů | 0 | 15/15 PASS |
| Dodatečné strukturální kontroly | 0 | 6/6 PASS |
| Původní S2/S2.1 pedagogická matice | 0 | T01–T04, T55–T63 a původní regrese PASS |
| Mutační gate | 0 | 11/11 mutací prokazuje znovuotevření příslušné mezery |
| S2 CI wiring | 0 | source/fingerprint/mutations/browser zůstávají blokující |
| S2 Chromium browser gate | 0 | instant, secure student a verifier; 5 cvičení / 18 otázek |

S2 browser provenance: Node `v24.19.0`, Windows x64, Playwright `1.61.1`, Chromium `149.0.7827.55`, source HEAD `64ad6e39a10155bcbc7dd510755d7fcdd7786fc3`.

- Instant HTML SHA-256: `a2379c2b115f0e2579311a4188d6b0f48de7ac41c2e71621d2c0b8726b07dfcb`.
- Secure student HTML SHA-256: `d1447c025f11c0ab71bc7c00e949248325292129ba9d8edb90a4ab7dd832924b`.
- Teacher verifier SHA-256: `7adf352770531153c52ce3de5af4c674c4ba1523334c92bd21bd460c97091d11`.

### Sprint 01 a bezpečnostní hranice — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| E1/E2/E3 credential gates | 0 | Recovery a Teacher/Admin odděleny, cleanup, auth-close race, zachování pokusu |
| E4 forensics, E5 secret hygiene, E6 adversarial | 0 | audit timeline, redakce tajemství, doménové oddělení |
| R2 policy, R3 infrastructure, R4 runtime | 0 | fail-closed policy, test wiring a souběžné Recovery |
| R5 adversarial | 0 | 39 PASS / 0 FAIL / 0 ERROR |
| Sensitive-data scan | 0 | 79 veřejných zdrojových souborů |
| Generated verifier syntax | 0 | inline verifier script parsuje |
| S1 CI wiring | 0 | pinned Chromium recovery/auth evidence zůstává blokující |
| S1 Chromium browser gate | 0 | auth-close race, role boundaries, cleanup a stav pokusu PASS |

S1 browser artefakty:

- instant SHA-256 `e6215e18a941c52f8fa1c89fadd793cdece592352fab47a53ed9fd1167fa8cfb`;
- secure student SHA-256 `965857ed8667c716beff29d1a9b0ce6160942fb5e9e48a3a043c67d88c81f7bc`;
- verifier SHA-256 `b98b838155b6d64fa7a632d8cd7539914026ae4439a947c2b2e905df361a8bda`.

### Build, Forms a Teacher Verifier — PASS

| Kontrola | Exit | Výsledek |
|---|---:|---|
| Build v hlavním checkoutu | 0 | Core SHA-256 OK; 49 initial + 2 lazy features |
| Build v čistém LF checkoutu | 0 | Core SHA-256 OK; 49 initial + 2 lazy features |
| Platform conformance | 0 | 119/119 PASS |
| Forms F1–F9 | 0 | 59/59 source/contract kontrol |
| Forms Chromium | 0 | 24/24 syntetických scénářů |
| Teacher Verifier V2 | 0 | contract PASS |
| Verifier IA/security | 0 | PASS |
| Verifier UI Chromium | 0 | dark/light theme a fullscreen PASS po explicitním `CHROMIUM_PATH` |
| Randomization/numbering | 0 | deterministická permutace a shoda renderer/verifier PASS |
| Lint | 0 | 0 chyb; 9 dříve existujících warningů mimo tento rozsah |

První spuštění verifier UI runneru bez `CHROMIUM_PATH` skončilo exit `1` (`Chromium neni dostupne`). Opakování se skutečnou lokální cestou k Playwright Chromium skončilo exit `0`; zdroj ani browser nebyly mezi běhy změněny.

### F0 a GARP 2.7 — PASS po build precondition

Ověření proběhlo v samostatném čistém checkoutu implementačního SHA s `core.autocrlf=false` a `core.eol=lf`.

- Mezi baseline `9e2f89f...` a implementací není žádná změna v trust anchoru, consumer profilu ani `.github/workflows`.
- Trust-anchor Git-blob SHA-256 na obou SHA: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`.
- Consumer-profile Git-blob SHA-256 na obou SHA: `9fe00628f4aafe1049fe5d40c76978bccb23b51199e921d4656abe0b306356d3`.
- Všech 8 workflow pinů odpovídá trust anchoru.
- F0 trust-pin gate: PASS, exit `0`.
- GARP contract gate: 6/6 PASS, exit `0`.
- Architecture integrity po build: 41/41 PASS, exit `0`.
- Policy-admission mutations: 6/6 PASS, exit `0`.
- Architecture mutations: 10/10 PASS, exit `0`.
- Auto-patch contract: 9/9 PASS, exit `0`; `liveAutoPatchClaim=false`.

První diagnostické spuštění architecture integrity před nezbytným buildem skončilo očekávaně 37/41, exit `1`, pouze kvůli chybějícím `dist` artefaktům (`artifact-present`, `artifact-index`, `artifact-sw`, `artifact-aiops`). Po build precondition prošla stejná kontrola 41/41. Trust piny nebyly přepsány a kontroly nebyly oslabeny.

CI standard read-only checker skončil exit `0` se stavem `STRUCTURAL_MATCH_NOT_CERTIFIED`; jde výslovně o diagnostiku, nikoli release admission.

## 7. FAIL / NOT VERIFIED / zbývající rizika

### FAIL zachované jako diagnostika prostředí

- Úplný `node --test` CI orchestration běh na Windows skončil exit `1`, 396/436 PASS a 40 FAIL. Selhání jsou spojena s `EPERM` při vytváření syntetických symlinků a s nedostupným příkazem `npm`; tím se také posunuly očekávané fáze P2 negativních testů. Tento běh nelze vydávat za úplný CI PASS. Relevantní S1/S2 wiring, F0, GARP, build, bezpečnostní a browser gate byly spuštěny samostatně a jejich výsledky jsou uvedeny výše.
- První verifier UI běh bez povinné proměnné prostředí a první GARP architecture běh před build precondition jsou popsány výše včetně následných úspěšných opakování.

### NOT VERIFIED

- Node.js 22 a Linux; dostupné prostředí bylo Node `v24.19.0`/Windows x64, doplněné konzistentním LF checkoutem.
- Fyzický iPadOS/Safari a nativní password-manager dialogy.
- GitHub Pages staging/production; žádný deployment nebyl proveden.
- Live AI požadavek a úplná semantická kvalita modelového výstupu.
- Reálný Google Forms účet a reálná studentská data.
- Úplný `npm run qa:p5:ci`/`npm run build`; `npm` nebylo v prostředí dostupné. Relevantní skripty včetně source gate a build skriptu byly spuštěny přímo přes `node`.
- Live GARP auto-patch a release admission; statický/syntetický contract výslovně nenese live claim.

### Zbývající rizika

- Normalizovaný otisk hledá strukturální shodu, nikoli všechny významové parafráze; similarity warning a učitelský review zůstávají potřebné.
- U sdíleného Reading passage se nadále samostatně kontroluje kontext na úrovni cvičení a duplicita položky na úrovni otázky/možností, aby samostatné MC nemohlo kopírovat Reading otázku.
- Statický klient nemůže zabránit DevTools/extension capture, screenshotům ani zásahu vlastníka zařízení.
- Metadata sestavení nadále uvádějí `7.1.99`; release/version bump nebyl autorizován.

## 8. Závěr

F-01 až F-04 byly uzavřeny jedním strukturálním řešením, které odděluje studentovi viditelnou identitu úlohy od hodnoticího klíče. Požadované scénáře skončily 15/15 PASS, dalších šest strukturálních kontrol a jedenáct mutací potvrdilo obecnost opravy. Sprint 01 hranice, build, oba cílené browser gate, Forms, verifier, F0 a GARP 2.7 zůstaly v uvedeném prostředí zachovány. Checkpoint je připraven pro nezávislý audit; nejde o produkční release ani autorizaci Sprintu 03.
