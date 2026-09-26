# Generátor testů 7.1.53 — UX hotfix

Datum: 2026-09-26

## Co se mění

- Simple režim: „Upravit položky a body“ lze otevřít i znovu sbalit.
- Otevřený detail dočasně nahrazuje globální karty typů; po sbalení se karty vrátí a přebírají typy z detailní tabulky.
- Tlačítko panelu používá jasný otevřený/zavřený popisek a přístupný stav aria-expanded.
- Vysvětlující text pod tlačítkem má větší odstup.
- Kontextová nápověda typu cvičení se zobrazuje přednostně vedle karty, má neprůhledné pozadí a omezenou výšku.
- Karty „Procvičování“, „Běžný test“ a „Přísný test“ říkají stručně, co student uvidí a jak se výsledek zpracuje.

## Funkční profily

- Procvičování: okamžitý výsledek + správné řešení a vysvětlení chyb.
- Běžný test: okamžitě body, procenta a známka + stručná zpětná vazba.
- Přísný test: bez okamžité známky, zámek při opuštění testu a zpracování výsledku ve verifieru.

## Bezpečnost

Bez změny bezpečnostního modelu, AI transportu, scoringu, verifieru, GARP autority nebo serverové fáze. Release musí projít stávající cestou candidate → Safe Promotion → main.
