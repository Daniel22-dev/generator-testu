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
