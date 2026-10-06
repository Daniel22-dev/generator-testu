# GIT – secure výsledky přes jeden Google Form

## A. Jednorázové nastavení
1. Vytvoř jeden univerzální Google Form pro GIT. Zapni sběr ověřeného školního e-mailu a nech vypnuté „Limit to 1 response“.
2. Přidej pole pro secure výsledek a pole **Test ID**, **Název testu**, **Skupina**. Volitelně přidej verzi Generátoru a datum generování.
3. V Google Forms použij získání předvyplněného odkazu. Do metadata polí vlož přesně: `GIT_TEST_ID`, `GIT_TEST_NAME`, `GIT_GROUP`. Volitelně `GIT_GENERATOR_VERSION` a `GIT_GENERATED_AT`.
4. V GIT otevři **Nastavení Generátoru → Předání secure výsledků → Google Forms** a vlož předvyplněný odkaz do „Nastavit metadata z předvyplněného odkazu“.
5. Ulož. Toto nastavení se neopakuje pro každý test.

Metadata slouží jen k orientaci. Autoritou výsledku je stále kryptograficky ověřený `SECURE-ANSWERS-V1`.

## B. Každý nový test
1. Vytvoř secureOffline test.
2. Vygeneruj individuální studentské kódy.
3. Rozesílej odkaz na test + individuální kód přes stávající roster/Apps Script workflow.
4. Student: odkaz → kód → test → Odevzdat → zkopírovat celý `SECURE-ANSWERS-V1` → Otevřít formulář → vložit secure výsledek → Odeslat.
5. Test ID, název a skupina se do Formu předvyplní automaticky, pokud je jednorázová konfigurace aktivní.

## C. Po testu
1. Z univerzálního Formu stáhni celé CSV. **Nefiltruj ho ani neupravuj.**
2. Otevři `teacher_verifier.html` konkrétního testu.
3. V **Ověření Google Forms** nastav školní doménu, datum a běžný český čas zveřejnění (např. `13:20`). Datum je předvyplněné dnešním datem a časové pásmo je vždy `Europe/Prague`.
4. Potvrď: **Sbírá ověřený e-mail**, **Je omezen na školní doménu** a **CSV je původní nezměněný export z Google Forms**. `Limit to 1 response` zůstává **OFF**.
5. Nahraj celé CSV.
4. Verifier rozliší výsledky tohoto testu, jiné testy, poškozené záznamy, metadata mismatch a duplicity.
5. Identická duplicita se nezapočítá dvakrát. U dvou různých validních pokusů stejného studenta vyber explicitně, který použít.
6. Stáhni **Export výsledků tohoto testu** a **Export odevzdání tohoto testu**.
7. Ulož verifier, výsledky, submissions a případný feedback pouze do zabezpečeného školního úložiště. Obsahují osobní údaje studentů.

Doporučená složka: `GIT/2026-2027/1A4/2026-10-15_Vocabulary/`.

## D. Konec školního roku
Response Sheet během roku nemaž. Ber jej jako append-only provozní log. Po skončení školního roku celý dataset archivuj podle pravidel školy a pro nový školní rok založ nový roční dataset.

## Fallback
Pokud automatická metadata nejsou nastavena, pokračuje dosavadní Forms workflow. `answers.txt` zůstává nouzová cesta a individuální studentské kódy se neruší.
