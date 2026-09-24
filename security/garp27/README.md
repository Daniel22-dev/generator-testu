# Generator testu - GARP 2.7

Tato slozka je aplikacni adapter pro konsolidovany **GARP 2.7 r2 / G-02 FIX** z 23. 9. 2026.
Jedinou aktualni bezpecnostni autoritou je GARP 2.7. GARP 2.5.1 zustava v repozitari jako povinny regresni zaklad; historicke dukazy se neprepisuji ani neprejmenovavaji.

Normativni konsolidovany balik je bitove prevzaty ve `vendor/garp-2.7-consolidated-r2/` a jeho strom je pripnut v `trust-anchor.json`. Produkcni runtime tento balik neimportuje; pouzivaji jej pouze build/verification nastroje.

Generator zachovava puvodni hranice **D3** a **AGENTIC=PARTIAL**. Jediny modelove pouzitelny provider tool je ucitelem explicitne zapinany `url_context`; aplikace nema autonomni lokalni tool loop, zapisove agentni akce ani obecny MCP executor.

R2 uzavira nalez G-02 v policy admission: `appId` musi byt v duveryhodnem inventari, produkcni `0.0.0` a neplatny semver jsou odmitnuty, povinne sekce museji obsahovat rozpoznanou semantiku a placeholdery vcetne `explicit-app-policy` nesmeji projit.

## Lokalni a CI brany

- `npm run qa:garp27:contracts` - r2 package/contract selftest, trusted `checkDigest`, G-02 reference selftest, Generator policy admission a deferred LIVE status;
- `npm run qa:garp27:architecture` - dependency/artifact/capability/trust/single-authority integrita vcetne D3/AGENTIC boundary;
- `npm run qa:garp27:policy-mutations` - aplikacni pozitivni a negativni G-02 scenare;
- `npm run qa:garp27:mutations` - architektonicke G27-AR mutation scenare;
- `npm run qa:garp27:auto-patch` - GARP 2.7 auto-patch state/gate admission + vazba na existujici exact-release dispatch;
- `npm run qa:garp27:foundation` - kumulativni FOUNDATION gate vcetne legacy GARP 2.5.1 regresi a release governance.

V chranenem CI musi architecture gate dostat presny SHA-256 `security/garp27/trust-anchor.json` v `GARP27_EXTERNAL_TRUST_SHA256`. Zmena trust anchoru proto nemuze sama sebe schvalit bez soucasne explicitni zmeny chraneneho CI pinu.

## Serverova hranice

Priprava skolniho serveru je stale `DEFERRED_BY_OWNER_DECISION`. Tato migrace nevytvari nove endpointy, Docker/Fortinet konfiguraci ani LIVE tvrzeni. `security/garp27/live-status.json` proto zustava `NOT_TESTED`.
