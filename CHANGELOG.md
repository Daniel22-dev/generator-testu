## 7.1.32 — Stage 1/2 state-transition hotfix (2026-09-15)

- Opravena skutečná regrese Etapy 1 při změně cizí jazyk → čeština: `csApplyCoreState()` už nevynucuje Advanced režim, pokud je aktivní řízený Simple preset (`cs_practice` / `cs_strict`).
- Zachováno původní pravidlo pro češtinu bez Simple presetu: plný ČJ modul dál vyžaduje Advanced režim.
- Workflow testy stavu Bezpečnosti pracoviště očekávají správné české texty „není nastavena“ / „je nastavena“; samotná runtime synchronizace kódu byla v 7.1.31 funkční.
- Visual QA changelogu kontroluje stabilní text `Generátor testů v`; přesné patch číslo je samostatně fail-closed ověřeno `check-versions.mjs`, takže visual plán už nezastará při každém bumpu.
- Verifier, secure/student runtime, kryptografický kontrakt, výsledkový formát, PIN/odemknutí, Google Forms a serverový profil nejsou měněny.

## 7.1.31 — QA certifikační hotfix (2026-09-15)

- Produkční logika Generátoru se nemění; jde pouze o opravu QA infrastruktury po CI 7.1.30.
- Headless regresní test Etapy 1 už nečte lexikální `state` přes neexistující `window.state`; používá stejný přístup přes `eval('state')` jako ostatní harness kontroly.
- Tím se `headlessCommand` znovu dokončí a navazující `qa-generate-fixtures.mjs` může vytvořit `instant_test.html`, `student_test.html` a `teacher_verifier.html` pro visual/critical gate.
- Visual scénář volby režimu očekává aktuální text **„Způsob nastavení“** místo historického **„PRACOVNÍ REŽIM“**.
- Verifier, secure/student runtime, kryptografický kontrakt, výsledkový formát a změny Etapy 2 jsou funkčně beze změny.

## 7.1.30 — Etapa 2: Bezpečnost pracoviště (2026-09-15)

- Týmový bezpečnostní kód je odstraněn z běžného kroku Doplňky a přesunut do **⚙️ Nastavení Generátoru → Bezpečnost pracoviště**.
- Secure/joker workflow ukazuje pouze stav pracoviště a odkaz do Nastavení; validace už po učiteli nechce hledat technické pole v průvodci.
- Uložený týmový kód se automaticky obnovuje po startu, importu zadání, staré plné šabloně a historii.
- Admin může nadále kód vygenerovat/kopírovat; běžný učitel jej pouze vloží a může jej vědomě uložit na vlastním zařízení.
- Kryptografický význam kódu, verifier, formát výsledků, PIN/odemknutí, Google Forms a serverový profil se nemění.
- XSS a performance baseline se nezvyšují; přidány cílené regresní kontroly nastavení a automatického obnovení kódu.

## 7.1.29 — Etapa 1: Simple workflow (2026-09-15)

- Jednoduchý režim je redukován na tři pedagogické účely: **Procvičování / Běžný test / Přísný test**; technické volby se nastavují automaticky.
- Opraven skrytý stavový drift: návrat z procvičování do Běžného testu vždy vrátí `feedbackMode=brief`, takže výsledek nezávisí na historii klikání.
- Přepnutí mezi cizím jazykem a češtinou zachovává zvolený účel a mapuje odpovídající interní preset.
- Pokročilý režim ponechává původní plnou sadu šablon a ruční nastavení.
- Verifier, kryptografie, PIN/odemčení, Google Forms a serverový profil nejsou v této etapě měněny.
- Přidány regresní kontroly Simple účelů a zachování Advanced workflow; bezpečnostní a performance baseline se nezvyšují.

## 7.1.28 — XSS sink-ratchet + QA harness CI hotfix (2026-09-15)

- Opraven pád tří CI workflow na `qa:p5-xss-sinks`: 7.1.26/7.1.27 zvýšily počet `innerHTML` sinků z bezpečnostního baseline 161 na 164.
- Baseline se nezvyšuje. Schování checklistu používá `textContent`, učitelský re-run modal je sestaven přes DOM API a automatické otevření cvičného rozboru znovu používá již auditovanou `toggleAnswersPanel()` cestu.
- Funkční opravy 7.1.26 i performance optimalizace 7.1.27 zůstávají zachovány.
- Opraven QA teardown race v practice workflow testu: harness před zavřením JSDOM čeká na asynchronní report seal, takže po úspěšném testu nevzniká falešný `document` TypeError.
- Cílový XSS sink inventář: `innerHTML` 161/161, `insertAdjacentHTML` 8/8, `outerHTML` 5/5, `document.write` 0, `eval` 0, `new Function` 0.

## 7.1.27 — CI/performance hotfix (2026-09-15)

- Opraven pád GitHub `qa:p5:ci`: 7.1.26 překročila `entryHtmlBytes` / `largestFileBytes` o 4 558 B.
- Performance budget se nezvyšuje. Build používá Acorn k odstranění pouze skutečných JS komentářů z embedovaných aplikačních skriptů; zdrojové soubory a jejich dokumentační komentáře zůstávají čitelné.
- Funkční změny 7.1.26 (team code, finální submit, practice feedback, teacher re-run, lockOnLeave, checklist) nejsou měněny.
- Lokální kontrola po optimalizaci: `entryHtmlBytes` 1 395 618 / 1 470 000 B, `largestFileBytes` 1 395 618 / 1 470 000 B; GHRAB Platform conformance 115/115 a quality budget 35/35 PASS.

## 7.1.26 — workflow a UX opravy po učitelském testování (2026-09-15)

- Jednoduchý režim / ostrý test nyní zobrazuje povinný týmový bezpečnostní kód, který už validace vyžadovala.
- U testů v záložkách je finální odevzdání dostupné až u posledního cvičení (instant i secure workflow).
- Procvičovací test po vyhodnocení automaticky otevře rozbor odpovědí a u chyb ukáže správné řešení; rozšířena podpora typů úloh.
- Device lock po odevzdání lze na stejném zařízení znovu povolit existujícím učitelským PINem nebo odemykacím heslem konkrétního testu.
- Přísný secure test nyní přenáší `lockOnLeave` do studentské konfigurace, takže odchod (např. pagehide/visibility/blur) vede k zamknutí místo pouhého logu.
- Exportní checklist se u instant/procvičovacích testů nezobrazuje; u secure režimu zůstávají 4 povinné lidské kontroly.
- Přidány regresní kontroly všech výše uvedených scénářů; cílený průchod v Chromium: 9/9 PASS.
- Verze 7.1.26 je nový kandidát a nepřebírá automaticky dřívější GARP schválení/evidence.

## 7.1.25 — hotfix self-testu bodování (2026-09-10)

- Opraveno falešné selhání `Self-test RPC timeout: __has__` v bezpečném offline režimu.
- Příčina: RPC bridge se vkládal před první textový `</body>`; teacher verifier ale obsahuje další `</body></html>` uvnitř JavaScriptových šablon pro feedback, archiv a tisk. Bridge proto mohl skončit uvnitř JS řetězce a nikdy se nespustil.
- Nově se bridge vkládá před poslední uzavírací `</body>` výsledného dokumentu.
- Přidána regresní kontrola `scripts/check-selftest-rpc-injection.mjs` a čitelnější diagnostická zpráva bootstrap timeoutu.
- Zachycený 180s `AbortError` Gemini v uživatelském reportu byl starší síťový timeout a není příčinou selhání self-testu.
- Bezpečnostní evidence 7.1.24 se tímto hotfixem automaticky nepřenáší na 7.1.25; nový kandidát vyžaduje revalidaci.

## 7.1.24 — Service Worker offline privacy hardening (2026-09-08)

- Uzavřen auditní nález N3-01: `suite-session-cleanup.js` a `ghrab-platform.js` používají network-first s `cache: no-store` pokusem a install-cache fallbackem, takže online se aktualizují a offline zůstává zachována cleanup/platform vrstva.
- Skutečné autorizační, revokační a release-integrity artefakty zůstávají network-only bez cache fallbacku.
- Přidán behaviorální Node regresní test Service Workeru: online freshness, offline fallback a negativní kontrola stale revokace/integrity v cache.
- Uzavřeny N3-02/N3-03: AI fingerprint scope pokrývá `src/` i `public/`, `.js` i `.mjs` a přímé Gemini transportní tokeny; `whenRootExists` je fail-closed svázán s prefixem deklarované kopie.
- Business logika generátoru, prompt assembly, provider/model konfigurace a datový model nejsou změněny.
- Verze 7.1.24 je kandidát pro nezávislé ověření; SHIELD-LIVE / RI-LIVE / behaviorální AIR zůstávají NOT TESTED bez školního serveru a živého modelu.

## 7.1.23 — GARP 2.5.1 SHIELD-PREP source candidate (2026-09-07)

- Přidán GARP 2.5.1 TOOLING-R2 release-integrity/SHIELD tooling, autoritativní seznam security-critical assetů a fail-closed statické GARP brány v hlavních testovacích řetězcích.
- Přidán deterministický build-time hook `GHRAB_BUILD_TIME` pro reprodukovatelnost; bez proměnné zůstává běžné chování build timestampu zachováno.
- Přidán CycloneDX 1.7 SBOM generátor/snapshot, threat model, deployment security profil, AI resource budget, crosswalk, exception/debt registr a evidence index.
- Runtime promptů, provider/model policy, auth/session business logika, storage/data flow, AI tool scope a network egress destinace nebyly funkčně měněny. Service worker však nově fail-closed směruje security-critical session/platform/integrity assety přes network-only/no-store před cache-first; jde tedy o změnu bezpečnostní distribuční hranice, která vyžaduje revalidaci relevantních session/SW kontrol.
- Kandidát není produkční release: plný dependency install/build/browser/DAST a school-server LIVE zůstávají k nezávislému ověření.

## 7.1.22 — Platform 1.1.2 Studio manifest alignment (2026-09-06)

- Zdrojový Studio manifest byl srovnán s reálným runtime/consumer stavem: Platform 1.1.2 a range `>=1.1.2 <2.0.0`.
- Source-repository fallback AI Studia tak již nemůže aplikaci ověřit se zastaralou deklarací Platformy 1.0.0.
- Produkční suite-session cleanup ani storage ownership se nemění.

## 7.1.21 — GHRAB Platform 1.1.2 suite-session migration candidate (2026-09-05)

- Přesná vendor vrstva GHRAB Platform 1.1.2 z referenčního AI Studia 0.21.40.
- `ghrab-suite-session-v1` cleanup pro otevřenou, delayed-open, multi-tab a stale/BFCache instanci.
- F-02 lokální acknowledgement: signal → seen status → verified cleanup → platform seen ack; při chybě se ack neposune.
- PC-01 aktualizován včetně plné migration backup kopie, target-scoped handoffu, AI klíčů a in-memory AI/test/roster stavu.
- Persistence writery mají fail-closed generation guard; suite end abortuje probíhající AI request a znemožní starému dokumentu obnovit data.
- Kandidát není automaticky produkční release; E-01 zůstává otevřený na úrovni ekosystému do migrace a společného testu všech relevantních child aplikací.

## 7.1.20 — post-second-Claude repair candidate GARP 2.3 (2026-08-30)

- Opraven HIGH release-integrity regresní nález C2-01: inlinovaný verifier už neobsahuje souvislé `</script>` uvnitř emitovaného JS zdroje; přidán fail-closed source guard a negativní kontrola.
- Sjednocen artifact import contract (`generator-testu-zadani`) mezi consumer, platform a data manifestem; platformní konformita po buildové regeneraci musí být 114/114.
- Povinný `npm test` používá standardní `npm run build` včetně postbuild konformity a následně kontroluje přesný `dist` headless cestou.
- XSS ratchet zamyká `documentWrite` na 0; performance budgety dostaly pouze malý (<1 %) headroom po bezpečnostním hardeningu.
- PC-01 navíc vyžaduje u každé přezkoumané AI cesty wrapper evidence nebo explicitně povolenou fixed-literal výjimku.
- Stav není release-approved: po změně distribuovaného kódu po druhém Claude kole vyžaduje GARP nový, uživatelem výslovně zahájený nezávislý review cyklus.

## 7.1.19 — bezpečnostní kandidát GARP 2.3 K2 (2026-08-30)

- Uzavřen C-01: acceptable-answer enrichment nyní fencuje předchozí AI výstup a klíč odpovědí jako nedůvěryhodný zdroj.
- PC-01 enumeruje všech 13 aplikačních callGeminiJSON cest včetně lazy features a má negativní kontrolu nové neošetřené cesty.
- Oficiální GARP 2.3 AI-RED corpus je povinný, hashovaný QA artefakt; harness bez něj neprojde.
- Diferenciační podmínky před AI egress pseudonymizují známé identifikátory studentů; end-work čistí další runtime data.
- Generované HTML už nemá dva same-origin execution sinky; studentský secure balík má regresi proti úniku answer key.

## 7.1.18 — bezpečnostní kandidát GARP 2.3 K1 (2026-08-30)

- AI vstupy používají společnou trust policy a explicitní hranice pro volný text, dokumenty, reading/listening obsah, metadata, přílohy i předchozí AI výstup při druhém průchodu/repair retry.
- Diferenciace posílá do AI pouze pseudonymy `Student A1…`, nikoli skutečné hodnoty `students/codes`.
- Self-testovací iframe už nekombinuje `allow-scripts` a `allow-same-origin`; skutečné emitované funkce ověřuje přes nonce-scoped allowlist RPC v opaque sandboxu.
- Návratový URL z AI Studio handoffu je omezen na nakonfigurovaný Studio origin a cestu.
- Přidáno skutečné `generatorEndWork()` pro sdílená zařízení a opraven datový manifest retence/mazání/importu; veřejná kopie platform consumer manifestu je synchronizována s P5 zdrojem.
- Přidán `qa:garp23` s 24 AIR strukturálními mutacemi ve 4 rodinách, privacy preflight canary, scoped deletion regresí a negativními kontrolami.

## 7.1.17 — integrační hotfix AI Studia (2026-08-26)

- Veřejný i připravený školní deployment používají stejnou podepsanou přístupovou verzi jako aktuální AI Studio.
- Odstraněno zamítnutí platného správcovského permitu způsobené rozdílnou verzí bezpečnostního bundle.
- Produkční kontrola nově hlídá tuto synchronizaci jako blokující invariant.

## 7.1.16 — oprava P5 rozpočtů po GARP K2 (2026-08-25)

- Acorn se načítá lazy až při prvním sestavení/ověření testu, nikoli při startu aplikace.
- Parser byl odstraněn z povinné PWA precache; po prvním online použití jej uloží runtime cache.
- Smoke validátory jsou asynchronní a při chybě parseru selžou uzamčeně.
- Kritický a precache limit nebyl zvýšen; pouze celkový dist limit zohledňuje distribuovaný lazy bezpečnostní parser.

## 7.1.15 — bezpečnostní kandidát GARP K2 (2026-08-25)

- Aktivní meta CSP v aplikaci i interaktivním manuálu; statický profil nyní odpovídá skutečně nasazené politice.
- `unsafe-eval` není povolen. `new Function` byl odstraněn z validátoru generovaných testů, Test Labu i modulu Český jazyk.
- Syntaxi generovaných skriptů kontroluje lokální Acorn 8.17.0, který build přibalí jako same-origin PWA asset.
- Sdílené bodování používá jednu factory pro emitovaný kód i interní diagnostiku, takže CSP-safe testy neudržují druhou kopii algoritmů.
- Chybějící WebCrypto zastaví každý export včetně instant režimu; tiché FNV/fallback hashe byly odstraněny také z vložených studentských runtime.
- Přidána automatická CSP brána, kontrola shody meta politiky s nasazovací konfigurací a AST zákaz runtime `eval`/`new Function`; P5 baseline je pro obě konstrukce ratchetován na nulu.

## 7.1.14 — bezpečnostní kandidát GARP K1 (2026-08-25)

- Fail-closed bootstrap: bez platné deployment konfigurace, povolené adresy a skutečného permitu se chráněné skripty neodemknou.
- Opravena vazba na GHRAB AI Core: veřejný profil je pouze `direct-gemini`, školní profil pouze same-origin `school-gateway`, bez automatického fallbacku; nepřipojený školní server zůstává blokovaný.
- Import zadání, snapshoty, staré šablony a historie procházejí allowlistem, limity a ochranou proti prototypovým klíčům.
- Deployment konfigurace se neukládá do běžné service-worker cache; dokumentace přesně odděluje lokální app-shell a centrální podepsaný LKG režim.
- GitHub Actions jsou připnuté plným commit SHA, zranitelné nepřímé závislosti jsou aktualizované a plný ESLint je skutečně aktivní.

## 7.1.13 — sjednocení reportéru (2026-08-13)

- Reportér používá dvoukrokové vytvoření a skutečné stažení diagnostického ZIPu; Gmail je dostupný až po kliknutí na stažení.
- Rozhraní i e-mail vyžadují ruční přiložení ZIPu a pomocné video je bezpečně skryté uvnitř reportéru i při scrollování.
- Regresní sada fyzicky ověřuje stažený ZIP, jeho snímky a diagnostiku, jednu instanci reportéru, motivy, mobilní zobrazení a klávesnici.
- Generování testů ani bezpečný žákovský režim nebyly změněny; PWA cache je `ghrab-generator-v7.1.13`.

## 7.1.12 — P5 (2026-08-05)


## 7.1.12 — P5 R2

- Browser workflow vygenerovaného testu běží přes důvěryhodný lokální HTTP origin s WebCrypto.
- P5 R2 runtime audit měří skutečné UI, ne HTML skořápku.


- Předprodukční akceptace bez povinného školního serveru.
- Nulové otevřené automatické a11y nálezy jsou podmínkou P5 brány.
- Přidán aktualizovaný release-acceptance kontrakt a odložený GitHub upload.

# Changelog

## 7.1.10 — P4 FINAL (2026-08-04)

- Finální certifikace, čisté buildy, přístupnost, výkon, bezpečnost a release evidence.
- Přidána povinná `qa:p4:ci` brána.

## 7.1.9 - 2026-08-04 (P3)

- Platforma 1.1.0, pristupnost, performance budgety a modularizace P3.

## 7.1.8 — P2: sjednocení platformy GHRAB (2026-08-04)

- jeden kanonický školní logotyp a jednotná autorská patička;
- GHRAB Platform 1.0.0: motiv, storage namespace s vratnou migrací, Studio Bridge 2.0 a artifact envelope v1;
- jednotný název PWA cache `ghrab-generator-v7.1.8` a řízená aktualizace;
- platformní konformitní test je součástí buildu a CI.


## 7.1.7 — P1 (2026-08-04)

- Produkční bezpečnost, serverový profil, datové manifesty a jednotná observability vrstva.
- GHRAB AI Core 1.0.0 a přepínání direct-gemini / school-gateway.

# Changelog

## 7.1.6 — 2026-08-04

- Etapa P0: odstraněn pevný origin lock, stabilizována PWA identita, přidán deployment kontrakt pro školní server a reportér už neblokuje spuštění aplikace.
## 7.1.5 — 2026-08-03

- technický reportér sjednocen s AI Studio GHRAB a načítán právě jednou;
- adaptér respektuje `body.light`, zatímco výchozí vzhled zůstává tmavý;
- doplněny bezpečný koncept, až pět screenshotů, ZIP/Gmail workflow, PWA precache a centrální návod;
- generování testů, prompty, výstupy a uživatelská data nebyly měněny.
