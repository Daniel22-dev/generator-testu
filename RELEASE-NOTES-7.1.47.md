# Release notes 7.1.47 — workflow zdrojů a Reading

Datum: 2026-09-22

## Funkční změny

- Jednotný účel testu v Simple i Advanced: Procvičování, Běžný test, Přísný test.
- Advanced profil pouze předvyplní technické hodnoty; nezamyká je. Duplicitní druhá volba „Režim testu“ je mimo workflow.
- Nový režim použití zdroje: Automaticky / Obsah a fakta / Slovní zásoba / Gramatika / Vzor obtížnosti a typu úloh / Kombinovat.
- Reading se zdrojem: samostatná analýza zdroje a následné vytvoření nového textu. Analýza se používá i při hlavním generování testu.
- Zdrojová slovní zásoba může být jako explicitní cílové učivo omezeně zachována, ale okolní slovní zásoba, syntax a informační hustota jsou řízeny zvoleným CEFR.
- Bez zdroje se Reading generuje přímo podle explicitně zvoleného CEFR; pomocný AI Reading nemá tichý B1 fallback.
- Přílohy jsou předávány i do AI návrhu Readingu.
- Poznámky k souborům a URL jsou předávány i do hlavního API promptu.
- Odhad AI volání počítá s jedním dodatečným požadavkem na analýzu zdroje, pokud test obsahuje Reading a aktivní zdroj.

## Kompatibilita

Staré interní šablony `fl_homework`, `fl_graded_quick` a `cs_text` se při načtení mapují na nové společné účely. Legacy helpery zůstávají kvůli starším snapshotům, nové UI je však nenabízí.

## Záměrně mimo tuto verzi

Nebyla měněna jazykově specifická pravidla bodování ani ortografie (španělské akcenty/ñ, německá kapitalizace a umlauty, francouzská diakritika/elize, latinské konvence apod.). Ty budou řešeny samostatně po koordinaci s jazykáři.

## QA

Lokálně ověřeno:
- production/source/CSP/PWA statické kontroly: PASS,
- build 7.1.47: PASS (11 registrovaných AI operací),
- GARP 2.5.1 self-test: 59/59 PASS,
- GARP 2.3 bezpečnostní regresní inventář: 82/82 PASS,
- GARP static prep včetně SBOM, AI assurance fingerprintu, SW freeze/offline failsafe, vendored consistency a leak scan: PASS,
- Error Reporter statické kontroly: 54/54 PASS.

Browserový workflow audit v tomto pracovním prostředí nebylo možné spustit, protože spravovaná Chromium politika `URLBlocklist` blokuje testovací stránky. Finální GitHub CI/browser QA proto zůstává standardní release branou před produkčním nasazením.
