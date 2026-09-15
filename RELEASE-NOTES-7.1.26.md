# Release notes — Generátor testů 7.1.26

Datum: 2026-09-15  
Stav: kandidát k nezávislé regresní/GARP revalidaci

## Co se mění

1. **Jednoduchý režim / ostrý test:** krok s bezpečností nyní zobrazuje týmový bezpečnostní kód, pokud je pro zvolený režim povinný.
2. **Odevzdání v záložkách:** finální odevzdávací tlačítko se objeví až u posledního cvičení, aby student test omylem neodevzdal po první části.
3. **Procvičovací režim:** po vyhodnocení se automaticky zobrazí rozbor odpovědí; u chyb je uvedeno správné řešení (tam, kde je lze jednoznačně určit).
4. **Další pokus na zařízení:** již odevzdaný test lze znovu spustit po autorizaci existujícím učitelským PINem nebo odemykacím heslem daného testu.
5. **Přísný test / odchod ze stránky:** `lockOnLeave` se přenáší do studentského secure balíku a odchod ze stránky test zamkne.
6. **Checklist:** instant a procvičovací test už checklist nezobrazují; secure test má čtyři povinné kontroly: obsah, klíč, bodování/stupnice a bezpečná distribuce.

## Regresní pokrytí

Do `tools/workflow-matrix-check.mjs` byly doplněny scénáře pro všech šest změn. Cílený browser průchod v reálném Chromium prošel 9/9 kontrolami. Standardní build a platformní konformance se spouštějí znovu po version bumpu.

## Bezpečnostní status

Tato verze mění distribuovaný runtime. Historické GARP výsledky předchozích verzí jsou podklad, nikoli automatické schválení 7.1.26. Před označením za produkčně auditovanou verzi je nutná nezávislá revalidace.
