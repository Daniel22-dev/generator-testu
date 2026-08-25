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
