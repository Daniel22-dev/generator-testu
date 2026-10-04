# 7.1.78 — E2 trust boundaries

Verifier nyní u dešifrovaného a opraveného výsledku uvádí **PŮVOD NEPROKÁZÁN**. Skóre přepočítává podle soukromého answer key; veřejným klíčem zašifrovaný payload, shoda klientského hashe ani klientská telemetrie neopravňují automatickou klasifikaci.

UI, individuální feedback včetně score-only, tři CSV exporty a HTML/JSON archivy přenášejí stejné rozlišení. Výsledky mají `REVIEW_REQUIRED`, žolík `JOKER_EXCLUDED`. Archiv uvádí nulový počet autorizovaných klasifikací. Interní `OK`/`current` označuje technické dešifrování a opravu, nikoli legitimní odevzdání. Statistiky jsou návrhy k posouzení. Chybějící, neplatná a prázdná telemetrie mají vlastní varování; hlášené události zůstávají nedůvěryhodným tvrzením klienta.

Secure generátor už nevyžaduje nepoužívaný Teacher/Admin secret ani jméno pro studentský učitelský mód. Instant režim zachovává dosavadní credential policy. Odemykací kód třídy zůstává procedurální brzdou; E1 izolace studentů a persistence pokusu zůstávají zachovány.

CSV nově obsahuje osm trust sloupců; `verified_email` je přejmenován na `forms_email`. Integrace, které četly dřívější hlavičku nebo automaticky klasifikovaly řádky `OK`, musí respektovat `classification_authorization`. JSON archiv přidává `trustContract`, `authorizedClassificationCount`, `proposedGradeCount`, `classificationStatus` a `trustAssessment`. Neověřené exporty neslouží k automatickému zápisu známek.

Lokálně prošly `npm test`, `qa:p5:ci`, nové skutečné artefaktové a desktop Chromium kontroly. Šest skupin nových kontrol prokazatelně selhává proti každému z původních sestavených generátorů 7.1.76 a 7.1.77. Důkazy a přesné omezení jsou v `redteam/E2`.

P3 browser brána po jednom startup timeoutu používá volný port přidělený Chromiem, kontroluje vlastní DevTools endpoint, má unikátní dočasný profil a uchovává chybovou diagnostiku. Původní příčina timeoutu ze zahazovaného stderr nebyla prokázána; celý P5 po zpevnění znovu prošel. Assertions ani čekací limit nebyly oslabeny. Detaily v předávacím TXT.

**NOT READY – BLOCKING ISSUE.** E3 musí vynutit schema, Forms e-mail ↔ soukromý roster, časové okno publikace ↔ Forms timestamp a duplicate/replay diagnostiku. F7 vyžaduje AES-GCM/PBKDF2 šifrování zadání před startem. Veřejné historické soubory nebyly v této etapě měněny. E3–E10 čekají; reálné mobily jsou **ANALYZED / NOT TESTED**. GitHub Actions, main ani deploy nejsou tímto lokálním checkpointem ověřeny.
