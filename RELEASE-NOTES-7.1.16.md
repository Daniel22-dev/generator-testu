# Generátor testů 7.1.16 — oprava P5 výkonových limitů po GARP K2

Datum: 25. 8. 2026

## Příčina

Všechny funkční, bezpečnostní a přístupnostní kontroly kandidáta 7.1.15 prošly, ale Acorn 8.17.0 byl načítán při startu a povinně ukládán do PWA precache. Jeho přibližně 240 kB překročilo tři P5 velikostní limity: celkový `dist`, kritický vstup a precache.

## Oprava

- Acorn zůstává lokální same-origin CSP-safe parser bez `unsafe-eval`.
- Načítá se až při prvním sestavení nebo ověření vygenerovaného testu.
- Není v počátečním HTML ani povinné PWA precache; po prvním online použití jej service worker uloží běžnou cache-first strategií.
- Všechny smoke validátory a jejich volající cesty jsou asynchronní a na parser skutečně čekají; chyba načtení zastaví validaci s jasnou zprávou.
- P5 limit kritického vstupu a precache nebyl zvýšen. Pouze limit celkové velikosti `dist` byl vědomě upraven z 2,20 MB na 2,45 MB, protože lazy bezpečnostní parser je stále distribuovaným souborem, nikoli počáteční zátěží.
- CSP a produkční brány nově vynucují lazy načítání a zakazují návrat parseru do startu či povinné precache.

## Očekávaný výsledek

P5 musí projít bez změkčení limitů `entryCriticalBytes` a `precacheBytes`. Aplikace zůstává bez `unsafe-eval`; syntaktická kontrola generovaných testů se pouze přesunula z počátečního načtení do okamžiku skutečné potřeby.
