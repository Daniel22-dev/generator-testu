# Release notes 7.1.52 — Exercise UX + Simple detail controls

Datum: 2026-09-25

## Co se mění

### 1. Reading workflow

Release přebírá systémovou opravu z 7.1.51: `reading-source-analysis` je registrovaná runtime i ve veřejném AI kontraktu, `reading-package-suggestion` podporuje text/image/document a build hlídá drift AI registrů fail-closed. Cesta se zdrojem je navržena shodně pro Simple/Advanced a pro procvičovací, běžný i přísný účel testu.

### 2. Typy cvičení

- zachováno pedagogické členění Rozpoznání / Řízená produkce / Volnější produkce / Porozumění;
- typy jsou zobrazené jako kompaktní responzivní karty;
- hover myší, focus klávesnice nebo tlačítko `i` na dotykovém zařízení zobrazí stručné vysvětlení a konkrétní příklad;
- odstraněna samostatná rozbalovací sekce s nápovědou;
- jediný metadata registr obsahuje nápovědu pro všech 38 aktuálních typů;
- build gate selže, pokud nový typ nemá popis a příklad nebo zůstane osiřelá metadata položka.

### 3. Jednoduchý režim

Jednoduchý režim zůstává automatizovaný v technických a bezpečnostních volbách, ale učitel může volitelně otevřít základní konfiguraci jednotlivých cvičení a upravit:

- typ cvičení;
- počet položek;
- počet bodů;
- automaticky zobrazené body na položku.

Ruční generování a další pokročilé technické ovládání zůstává viditelné pouze v Pokročilém režimu. Reading používá vlastní existující délkové profily textu.

### 4. Cleanup

- terminologie `Otázek` / `b/ot.` byla v per-exercise konfiguraci sjednocena na `Položek` / `b/pol.`;
- součet používá `Celkem položek`;
- výchozí počet položek nového řádku respektuje typ cvičení;
- odstraněn mrtvý odkaz na legacy `typeGuidePanel`.

## Bezpečnostní dopad

Release neobchází žádnou GARP/AI Core kontrolu. Naopak rozšiřuje build-time kontrolu parity. Aktivní bezpečnostní autorita zůstává GARP 2.7 r2 / G-02, legacy GARP 2.5.1/N5 zůstává regresním základem a serverová/LIVE část zůstává odložená podle existujícího rozhodnutí.

## Release pravidlo

Do `main` se má dostat pouze přes existující `candidate -> Safe Promotion -> main` workflow po úspěšném CI. Lokální audit je předběžná brána; GitHub CI je autoritativní finální release gate.
