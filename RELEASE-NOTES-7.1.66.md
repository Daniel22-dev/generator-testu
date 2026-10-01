# Release notes – 7.1.66

Datum: 2026-10-01

## D3 – kvalita PDF vrstvy

Verze 7.1.66 navazuje na D1 / 7.1.64 a D2 / 7.1.65. D3 nemění scoring, dešifrování, `effectiveResults()`, secure submission workflow ani student package. Zásah je omezen na tiskový/PDF renderer Teacher Verifieru a jeho regresní ochranu.

### Opravené problémy

- PDF se již nedělí mechanicky po pevných 1123 CSS px bez ohledu na obsah;
- běžná otázka, tabulka nebo matching blok se před zlomem přesune jako celek na další stránku, pokud se na stránku vejde;
- jako poslední ochrana se zlom neposadí doprostřed vykresleného textového řádku;
- české popisky `Vychozi veta` a `Vysvetleni` jsou opraveny na `Výchozí věta` a `Vysvětlení`;
- DOM-to-canvas renderer zachovává mezeru mezi sousedními inline textovými uzly, takže nevzniká např. `Vysvětlení:Vysvětlení` nebo `Transkript:Příliš`.

### Student vs. teacher

- studentský PDF markup neobsahuje answer key, `[OK]`, učitelský Listening transcript ani vysvětlení;
- učitelská varianta zachovává odpovědi, vysvětlení i transcript;
- obě varianty používají stejné číslování a stejnou tiskovou strukturu;
- školní logo zůstává vložené lokálně z canonical assetu a bez externí runtime závislosti.

### Regresní ochrana

- Stage 3 static contract nově vyžaduje bezpečné stránkovací helpery a české diakritické popisky;
- přidán `check:stage3-pdf-quality`, který nad dlouhým syntetickým testem kontroluje student/teacher boundary, vícestránkovost, skutečný browser PDF download, logo a to, že zlom neprochází běžnou otázkou ani textovým řádkem;
- zapojení nového quality testu do povinných release bran zůstává záměrně na D7.

### Záměrně mimo D3

D3 neřeší dark mode, fullscreen, dashboard/security UX ani generator prefill. Ty zůstávají pro D4–D6.

## R1 – certifikační hotfix po prvním candidate CI

První upload 7.1.66 měl zelený Workflow journeys E2E, ale dvě certifikační workflow skončila červeně ze dvou nezávislých infrastrukturních důvodů. Produkční D1–D3 funkcionalita se v R1 nemění.

- `RELEASE.changes` je znovu omezen na posledních 10 položek; původních 12 způsobilo jediný headless FAIL a následně nevznikly QA fixtures, takže Visual/Critical brány kaskádově hlásily chybějící exportní HTML soubory.
- `qa-p5-runtime.mjs` po dostupnosti Chromium debug endpointu čeká také na skutečný `page` CDP target. Odstraňuje se latentní race condition, při které `/json/version` už odpovídal, ale `/json` ještě krátce neobsahoval stránku.
- AI assurance fingerprint byl regenerován pouze kvůli změně release metadata v `01-core.js`.
