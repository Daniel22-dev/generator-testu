# Release notes — Generátor testů 7.1.27

Datum: 2026-09-15

## Důvod vydání
GitHub `qa:p5:ci` u 7.1.26 prošel funkčními, bezpečnostními a platformními kontrolami, ale skončil na performance budgetu: `dist/index.html` měl 1 474 558 B při limitu 1 470 000 B. Stejný soubor proto vyvolal dva fail body (`entryHtmlBytes` a `largestFileBytes`).

## Oprava
- Performance limit nebyl zvýšen.
- `scripts/build.mjs` používá parser Acorn a z embedovaných aplikačních JS odstraní pouze syntakticky rozpoznané komentáře.
- Zdrojové soubory se neminifikují ani nepřepisují; komentáře v repozitáři zůstávají.
- Řetězce, template literals a generovaný studentský runtime nejsou regexově upravovány.
- Funkční opravy 7.1.26 zůstávají beze změny.

## Lokální ověření
Po optimalizaci: `entryHtmlBytes` 1 395 618 B (limit 1 470 000), `largestFileBytes` 1 395 618 B, `entryCriticalBytes` 1 566 581 B (limit 1 655 000), `precacheBytes` 1 971 714 B (limit 2 130 000). GHRAB Platform conformance 115/115 PASS a quality gate 35/35 PASS.

7.1.27 je nový kandidát; finální autoritativní verdikt dává čistý GitHub CI průchod z exact lockfile.
