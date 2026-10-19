# GIT 7.1.100 V7 — Sprint 01: Recovery / Credential Hardening

Datum auditu: 2026-10-09

Repozitář: `generator-testu`

Pracovní větev: `work/git-7.1.100-v7-20261009`

Výchozí commit: `b0fedac582c82d5c97982c781ca17bd81e704581`

Verze deklarovaná v `package.json`: `7.1.99` (release/version bump nebyl součástí Sprintu 01)

Rozsah: pouze Sprint 01, P0-18 — Classroom Recovery Code a Teacher/Admin credentials

## Výsledek

**GO pro nezávislý bezpečnostní audit a code review Sprintu 01.**

**NO-GO pro merge do `candidate`/`main`, release nebo deployment.**

Důvod NO-GO není selhání opravených recovery cest. Lokální recovery, privilege-boundary a browser testy procházejí. Release blokují:

1. existující F0/GARP local trust-pin neshody mimo měněné soubory,
2. neprovedený fyzický iPadOS/Safari test,
3. neověřené nativní password-manager dialogy,
4. neprovedený autorizovaný GitHub Pages staging a re-publish/cache test.

Nebyl proveden push, merge, PR, release ani deployment. `origin/main` a `origin/candidate` zůstaly na výchozím commitu `b0fedac582c82d5c97982c781ca17bd81e704581`.

## Audit před změnou

Auditoval jsem zdroj generátoru a skutečně vygenerované syntetické HTML v obou režimech:

- rychlý/instant studentský test,
- secure offline studentský test a jeho oddělený učitelský verifier.

Zjištění:

- Recovery vstup byl `type=password`, ale textově se v některých jazycích vydával za učitelský přístupový kód nebo obecný classroom unlock code.
- Recovery a Teacher/Admin vstupy neměly konzistentní `autocomplete`, `autocorrect`, `autocapitalize` a `spellcheck` omezení.
- Chybný Recovery Code zůstával ve vstupu. Totéž nastalo při výjimce během autorizace a u chybného Teacher/Admin přihlášení.
- Hodnota se čistila převážně jen po úspěchu, nikoli fail-safe před asynchronním PBKDF2 ověřením a ve `finally`.
- Samotné rozdělení rolí již bylo architektonicky správné: Recovery nemohl otevřít učitelský panel a Teacher/Admin credential nemohl odemknout recovery zámek. Chyběly však úplné regresní důkazy pro chybu, výjimku, souběh, kontinuitu stavu a skutečný browser.
- Instant export obsahoval pouze odvozené, testem a účelem oddělené PBKDF2 hodnoty; neobsahoval raw credentialy.
- Secure studentský export neobsahoval Teacher/Admin schopnost ani Teacher/Admin hash. Obsahoval pouze odvozený recovery verifier nutný pro lokální odemčení; privátní verifier zůstával oddělen.
- Secure studentský export již správně odmítal reset rozpracovaného pokusu cizí identity.

## Implementované změny

### Oprávnění a datové cesty

- Classroom Recovery Code má jedinou runtime pravomoc: odemknout právě běžící uzamčený pokus.
- Teacher/Admin credential v instant režimu otevírá učitelský panel, ale neodemyká Recovery zámek.
- Recovery credential neotevírá učitelský panel.
- Secure studentský soubor nemá učitelské přihlášení ani resetovací credential capability; soukromé učitelské funkce zůstávají mimo studentský artefakt.
- Recovery unlock nemění attempt ID, deadline, identitu, variantu, volbu žolíka, čas zahájení ani odpovědi.

### Mazání vstupů

- Recovery i Teacher/Admin hodnota se kopíruje jen do lokální proměnné potřebné pro ověření.
- DOM vstup se maže okamžitě před asynchronním ověřením a znovu ve `finally`.
- Stejné chování platí pro úspěch, odmítnutí, prázdnou hodnotu, výjimku a přerušenou autorizaci.
- Zavření učitelského modalu provede logout a vyčištění credential pole.

### UX a browser hints

- Recovery a Teacher/Admin jsou označeny odlišně v CS/EN/ES/DE/FR/LA.
- Vstupy jsou `type=password` a mají `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"` a odpovídající `aria-label`.
- Jde pouze o defense-in-depth hint. Prohlížeč nebo password manager může `autocomplete="off"` u přihlašovacích polí ignorovat; viz [MDN — autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete).

### Regresní testy

- Přidány testy odmítnuté, úspěšné, výjimečné a přerušené Recovery autorizace.
- Přidány testy okamžitého vymazání Teacher/Admin pole při odmítnutí i úspěchu.
- Přidány kontroly privilege separation a kontinuity studentského stavu pro oba režimy.
- Přidán Playwright/Chromium gate nad skutečně vygenerovaným instant a secure HTML.
- Browser gate kontroluje `localStorage`, `sessionStorage`, IndexedDB, URL, živé hodnoty vstupů a konzoli na raw syntetické credentialy.
- Test záměrně prokázal, že kód běžící na klientovi dokáže hodnotu zachytit přes `input` event ještě před aplikačním vymazáním. To je očekávaný a neodstranitelný limit čistě klientské aplikace.

## Změněné soubory

| Soubor | Změna |
|---|---|
| `package.json` | nový browser gate `check:s1-recovery-browser` |
| `scripts/check-credential-policy-r2.mjs` | Windows/CRLF odolnost policy testu |
| `scripts/check-recovery-browser-s1.mjs` | nový skutečný Chromium test obou studentských režimů |
| `scripts/check-recovery-runtime-r4.mjs` | fail/success/exception/interruption a cleanup regrese |
| `scripts/check-security-behavior-r3.mjs` | privilege boundary, storage scan a kontinuita pokusu |
| `scripts/check-security-credential-e1.mjs` | statické UX, lokalizace a input-hardening kontrakty |
| `scripts/check-security-credential-e3.mjs` | dynamické cleanup a privilege-boundary testy |
| `src/js/12-prompt-builder.js` | oddělené Recovery a Teacher/Admin popisky CS/EN/ES/DE |
| `src/js/12a-language-catalog.js` | oddělené Recovery a Teacher/Admin popisky FR/LA |
| `src/js/13d-secure-student-shell.js` | recovery-specifické secure popisky |
| `src/js/13da-secure-student-isolation.js` | izolované secure popisky a chybová hlášení bez teacher záměny |
| `src/js/13e-secure-student-runtime.js` | fail-safe mazání Recovery/Teacher vstupů a logout při zavření modalu |
| `src/js/14a-test-html-builders.js` | hardened Recovery/Teacher vstupy a přístupné popisky |
| `src/js/14b-instant-test-runtime.js` | fail-safe mazání Recovery/Teacher vstupů |

## Commity

1. `6e37ae7346345bd822190328be9b709d667ea86c` — `test: reproduce credential retention on recovery paths`
2. `eb2e841eab4ac82b2a594f0e10a2ea3c8a664150` — `fix: harden recovery and teacher credential entry`

Tento report je samostatný auditní artefakt. Jeho vlastní commit je z definice uveden v předávací zprávě, nikoli samoodkazem uvnitř souboru.

## Výsledky testů

| Kontrola | Stav | Poznámka |
|---|---|---|
| `npm run check:r4-recovery-runtime` | PASS | oba režimy; souběh, success/fail/exception/interruption, jeden audit event |
| `npm run check:credential-security` | PASS | E1/E2/E3, kryptografické i runtime oddělení rolí |
| `npm run check:r2-credential-policy` | PASS | síla, odlišnost, fail-closed, settings drift |
| `npm run check:r3-security-behavior` | PASS | skutečně generované oba režimy, verifier parse, kontinuita stavu |
| `npm run check:s1-recovery-browser` | PASS | Chromium `149.0.7827.55`, skutečné studentské HTML |
| `npm run check:redteam-runtime` | PASS | Strict Mode/runtime včetně iPad modelu; skutečné zařízení ne |
| `npm run check:redteam-storage` | PASS | fault injection, WebCrypto/IDB model |
| `npm run check:redteam-runtime-browser` | PASS | reload, fullscreen, history, inert input, IndexedDB/Web Locks |
| `npm run check:redteam-storage-browser` | PASS | restart, paralelní taby, integrita, outbox, privátní verifier |
| `npm run check:redteam-isolation` | PASS | studentský secure artefakt bez teacher capability/odpovědí |
| `npm run check:redteam-verifier` | PASS | RSA-OAEP/AES-GCM, Forms/CSV, replay a scoring |
| `npm run check:verifier-generated-syntax` | PASS | vygenerovaný verifier se parsuje a obsahuje očekávané funkce |
| `npm run check:forms-workflow` | PASS | 59/59 source/unit kontraktů; bez živého Google Formu |
| `node scripts/check-recovery-export-contract.mjs` | PASS | odlišné balíčky, zákaz ručního reuse, nová session identity |
| `npm run lint` | PASS | 0 errors, 9 existujících warnings |
| `node scripts/build.mjs` | PASS | generátor `7.1.99`, 1691.9 kB |
| `npm run qa:garp27:contracts` | PASS | GARP 2.7 contract gate včetně `SERVER_PHASE_DEFERRED` |
| `npm run qa:garp27:static` | FAIL | architecture-integrity: 4 local-pin/digest neshody v neměněných GARP/trust artefaktech |
| `npm run check:f0-ci-trust-pin` | FAIL | `reviewed consumer profile does not match trust anchor`; reprodukováno i jako blokátor prebuild |
| `npm run build` | FAIL | všechny Sprint 01 prebuild kontroly před F0 prošly; build zastavil F0 trust pin |
| Fyzický iPadOS/Safari | NOT VERIFIED | zařízení nebylo dostupné |
| Firefox/Safari desktop | NOT VERIFIED | browser gate byl Chromium-only |
| Nativní password-manager save/autofill dialog | NOT VERIFIED | headless běh jej nedokáže spolehlivě pozorovat |
| Autorizovaný GitHub Pages staging | NOT VERIFIED | záměrně bez deploymentu |

### Browser artefakty z posledního syntetického běhu

Tyto hashe identifikují pouze konkrétní QA běh; generátor vytváří nové testové identity a nejsou release pinem.

- instant student HTML: `91745b5c543b000712dff8589644d98d2aaa10419a974307d1fce9fd768454c2`
- secure student HTML: `286bf96b409fd0ca2695fd7cc2aecb1d1160c28cf23636d4f4c5b930f3727ea6`
- secure teacher verifier HTML: `731cf1f9a2eeedaced850d546e2938cfcc8e55ff59cf7a3876327a6cf2ae43bd`

QA běh používal pouze syntetické hodnoty. V reportu ani repozitáři nejsou reálná studentská data, učitelské klíče ani soukromé verifiery.

## T102–T117

| ID | Stav | Důkaz / omezení |
|---|---|---|
| T102 | PASS | audit současného kódu a skutečně generovaných instant/secure artefaktů |
| T103 | NOT VERIFIED | desktop Chromium PASS; fyzický iPadOS/Safari chybí |
| T104 | PASS | raw hodnoty nenalezeny v app-controlled storage, IDB, URL, konzoli ani exportech |
| T105 | NOT VERIFIED | atributy jsou hardened; nativní password-manager prompt nebyl pozorovatelný |
| T106 | PASS | explicitní a lokalizované rozlišení Recovery versus Teacher/Admin |
| T107 | PASS | Recovery/Teacher/Admin oprávnění oddělena a negativně testována |
| T108 | PASS | samostatné derivace, vazba na test ID, odlišné exporty, reuse odmítnut |
| T109 | PASS | audit všech aktivních credential větví a regresní kontrakty |
| T110 | SERVER-DEFERRED | serverová recovery/revocation architektura nebyla autorizována |
| T111 | NOT VERIFIED | automatizované Strict/Forms/crypto/verifier regrese PASS; fyzický iPad chybí |
| T112 | PASS | lokální skutečný Chromium průchod v obou studentských režimech |
| T113 | PASS | app-controlled storage/URL/log/export scan; browser-manager úložiště zůstává T105 |
| T114 | NOT VERIFIED | modal/reload/state continuity PASS; nativní BFCache eligibility pouze řízeně simulována |
| T115 | PASS | klientský capture test záměrně zachytil hodnotu před cleanupem |
| T116 | NOT VERIFIED | žádný autorizovaný GitHub Pages staging/deployment |
| T117 | NOT VERIFIED | nebyl proveden re-export, re-publish ani test starého URL/cache |

## Rizika a omezení statického GitHub Pages hostingu

- Studentské HTML a autorizační logika běží na zařízení studenta. Kdo ovládá klienta, DevTools, rozšíření nebo původ stránky, může plaintext zachytit před vymazáním; browser test to prokázal.
- Statický hosting neposkytuje serverovou session, centrální rate limiting, okamžitou revokaci ani autoritativní jednorázovost Recovery Code.
- PBKDF2, vazba na test ID, per-test credential a vyčištění DOM zvyšují odolnost, ale z klienta nevytvoří důvěryhodný server.
- `autocomplete="off"` je požadavek/hint pro user agent, nikoli garance proti browser password manageru nebo rozšíření.
- Secure studentský soubor je záměrně oddělen od privátního verifieru. Učitelský verifier a klíče nesmějí být publikovány na stejném veřejném původu.
- Již publikovaný HTML soubor nelze zpětně bezpečně „opravit“ bez nového exportu a publikace. Doporučený postup je nový test ID/URL, nový Recovery Code a ponechání starého pokusu beze změny do ukončení probíhající výuky.
- Nahrazení aktivního souboru uprostřed pokusu může rozbít vazbu na manifest, start code, lokální attempt state nebo cache. T117 musí být proveden na autorizovaném stagingu před release.

## Doporučené další kroky koordinátora

1. Nezávisle zkontrolovat commity `6e37ae7` a `eb2e841`.
2. Samostatně vyřešit/obnovit F0 a GARP trust piny schváleným release procesem; neplést to s Recovery změnou.
3. Provést fyzický iPadOS/Safari scénář včetně soft keyboard, background/foreground, reloadu a password-manager dialogu.
4. Na autorizovaném Pages stagingu ověřit nový export, staré URL, cache, re-publish a kontinuitu rozpracovaného pokusu.
5. Teprve po uzavření FAIL/NOT VERIFIED položek rozhodnout o `candidate`.

Sprint 01 zde končí. Žádná další etapa nebyla zahájena.
