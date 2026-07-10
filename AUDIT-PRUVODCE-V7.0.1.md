# Audit návaznosti průvodce a kombinací — verze 7.0.1

Datum: 10. 7. 2026  
Rozsah: klientská serverless/PWA verze bez školního serveru

## Verdikt

Po opravách a regresním ověření je průvodce logicky konzistentní. Známé kombinace, které by vedly k rozbitému, nevyhodnotitelnému nebo vnitřně rozpornému testu, jsou buď automaticky převedeny na bezpečnou variantu, nebo zablokovány s vysvětlením před přechodem do dalšího kroku.

Audit ověřuje konečné množiny voleb a jejich závislosti. Nemůže matematicky vyčerpat libovolné texty učitele ani všechny možné odpovědi generativní AI; tyto výstupy nadále podléhají schématové validaci, self-testu a obsahové kontrole učitele.

## Metodika

Nový test `tools/workflow-matrix-check.mjs` spouští aplikaci v jsdom nad produkčním buildem a kontroluje stav, DOM, validační brány, sestavení promptu a instantní studentský runtime. Skutečný secure runtime a jeho kryptografická cesta jsou samostatně ověřeny testem `tools/headless-check.mjs`. Oba testy jsou povinnými samostatnými kroky GitHub Actions (`npm test` a `npm run test:headless`), takže stejné chyby mají zablokovat budoucí vydání.

Ověřené oblasti:

- úplný kartézský součin hlavních režimových voleb,
- jednoduchý a pokročilý režim,
- všechny rychlé šablony,
- všech 13 presetů českého jazyka,
- všech pět cizích jazyků a tři režimy jazyka instrukcí,
- všech 38 podporovaných typů cvičení samostatně a všech 703 dvojic,
- všechny neprázdné kombinace A1–C2 ve všech pěti cizích jazycích,
- vlastní stupnice, zdroje pro poslech, diferenciace a roster,
- aktivace, deaktivace a skrývání závislých polí,
- migrace historických rozporných stavů,
- skutečný průchod tlačítky od prvního kroku po výsledný prompt,
- instantní studentský runtime s platným a neplatným jednorázovým kódem a secure veřejná konfigurace bez čitelných identit,
- samostatný headless test skutečného secure runtime s platným a neplatným jednorázovým kódem,
- přenos kombinací rozložení, odevzdávání, randomizace a hlídání obrazovky do výsledného HTML.

## Nalezené a opravené problémy

### 1. „Bez šablony“ neplnilo slib UI

Karta v jednoduchém režimu slibovala ruční nastavení, ale režim se nepřepnul. Nyní volba skutečně otevře pokročilý režim a zachová již vyplněná data.

### 2. České presety pro procvičování používaly běžný test

Preset měl účel `practice` a učící zpětnou vazbu, ale historicky ponechal `testMode=bezny`. Nyní každý český procvičovací preset nastaví skutečný procvičovací režim; známkované a diagnostické presety zůstávají běžné a bezpečnost výsledku řídí `resultMode`.

### 3. Dvojí konkurenční nastavení typů cvičení

Pomocná vizuální logika českého modulu mimo češtinu znovu odkrývala globální výběr typů, i když byl aktivní detailní rozpis jednotlivých cvičení. Nyní se globální blok při detailním rozpisu vždy skryje.

### 4. Rozporné režimy bylo možné obnovit ze starého snapshotu

Obnovený stav nyní vždy prochází stejnými invarianty jako ruční volby. Platí zejména:

- přísný test → bezpečný offline verifier + celkové odevzdání,
- procvičování → okamžitý výsledek + učící zpětná vazba + bez žolíku,
- secureOffline → bez okamžité zpětné vazby + celkové odevzdání,
- feedback `none` → nelze průběžně uzamykat cvičení,
- diferenciace → pokročilý režim.

### 5. Nefunkční kombinace cvičení nebyly dostatečně blokovány

Průvodce nyní zablokuje:

- více než 10 různých typů,
- více různých typů než je počet cvičení,
- nepodporovaný vlastní typ,
- listening comprehension bez audio/video zdroje, URL nebo transkriptu.

Při psaní podporovaného synonymního názvu, například `gap fill`, se typ korektně normalizuje.

### 6. Vlastní stupnice mohla mít mezery nebo překryvy

Stupnice musí pokrýt celé rozpětí 0–100 % právě jednou. Mezery i překryvy zablokují pokračování a UI nyní uvádí konkrétní problém místo obecné zprávy o nerozpoznané stupnici.

### 7. Diferenciace a roster mohly být neúplné

Nová validace odmítne:

- stejného studenta/kód ve více skupinách,
- neznámý kód ve skupině,
- vygenerovaný kód bez přiřazené skupiny,
- skupinu bez názvu, podmínek nebo člena.

U jednorázových kódů platí přesná vazba 1:1 mezi rosterem a skupinami.

### 8. Jednorázové kódy nebyly dříve tvrdou branou ve všech výstupech

Instantní i secure studentský runtime nyní před startem ověří, že zadaný kód patří do rosteru, a to i bez diferenciace. Do studentského HTML se nevkládá čitelný kód ani e-mail; používají se solené SHA-256 otisky.

## Výsledky workflow testu

- 28 testovacích oblastí PASS,
- 0 FAIL,
- 576 úplných režimových kombinací,
- 14 průchodů rychlými šablonami,
- 13 českých presetů,
- 38 samostatných typů a 703 dvojic typů,
- 315 kombinací CEFR/jazyk,
- 72 kombinací sekundárních voleb,
- 30 kombinací cizí jazyk × režim aplikace × jazyk instrukcí,
- 20 stavů viditelnosti a aktivace polí,
- 16 kombinací povinných polí prvního kroku,
- 16 sestavených variant instantního HTML,
- runtime kontrola platného/neplatného kódu v instantním režimu,
- headless runtime kontrola platného/neplatného kódu v secure režimu.

## Zbytkové hranice

- Volný text učitele a libovolná odpověď AI tvoří nekonečný prostor; automatický audit proto ověřuje schéma, podporované typy, stavové závislosti a reprezentativní sestavení, ne obsah každé budoucí otázky.
- Učitel musí před použitím ověřit zadání, klíč, přijatelné alternativy, body a stupnici.
- Server, SSO, centrální databáze a serverová správa API klíče zůstávají mimo tento audit.
