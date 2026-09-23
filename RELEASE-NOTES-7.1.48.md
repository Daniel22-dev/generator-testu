# Release notes 7.1.48 — přehlednější práce se zdrojem

Datum: 2026-09-23

## Funkční změny

- V Simple režimu je způsob práce se zdrojem pevně `Automaticky`; uživatel nemusí rozhodovat mezi technickými režimy.
- V Advanced režimu byl původní rozbalovací seznam nahrazen šesti kartami: Automaticky, Obsah a fakta, Slovní zásoba, Gramatika / jazykové jevy, Vzor úloh a obtížnosti, Kombinovat.
- Každá karta obsahuje krátké vysvětlení přímo v UI, ikonu, aktivní stav a plný tooltip s detailnějším popisem.
- Pod kartami zůstává detailní dynamické vysvětlení vybrané možnosti; obecný `?` tooltip u nadpisu zůstává zachován.
- Přepnutí z Advanced do Simple vždy resetuje `sourceUseMode` na `auto`, takže skrytá pokročilá volba nemůže ovlivňovat Simple prompt.
- Starší Simple snapshot s jiným `sourceUseMode` se při načtení normalizuje na `auto`.

## Beze změny

- Dvoufázový Reading se zdrojem, CEFR pravidla a bezpečnostní trust boundary z 7.1.47 zůstávají beze změny.
- Jazykově specifické scoringové/ortografické chování se nemění.

## QA očekávání

- Headless regrese ověřuje šest vysvětlených karet v Advanced.
- Headless regrese ověřuje, že Simple zobrazuje pouze Automaticky a skutečně resetuje stav na `auto`.
- Standardní GHRAB QA / Platform P3 / P5 R2 / GARP 2.5 / N5 release brány zůstávají beze změny.
