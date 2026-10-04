# 7.1.77 — E1 checkpoint (2026-10-03)

NOT READY – BLOCKING ISSUE. Toto je etapový zdrojový kandidát pro pokračování E2–E10, nikoli release pro třídu.

Bezpečný studentský export je sestaven bez učitelského režimu, teacher/recovery hashů, resetu a povolení dalšího pokusu, rosteru a hashů studentských kódů. Historická šablona zůstává uvnitř generátoru pro migraci a regresní testy; parser z ní před exportem odstraňuje zakázané schopnosti. Assembler před prvním exportem vyčká na načtení lokálního parseru. Selhání načtení parseru či zakázané pole blokuje export. První export byl ověřen v čisté relaci desktop Chromium.

Společný odemykací kód třídy používá PBKDF2 doménu classroom-unlock. Jeho veřejný hash je pouze procedurální brzda. Odemykání zachovává attemptId, deadline, identitu, odpovědi a historii. Po odevzdání ani při cizí aktivní identitě nemá studentský soubor učitelský reset. Nový profil nebo úplné smazání úložiště zůstává architektonickým limitem.

U více skupin student zvolí přidělenou variantu. Soukromý verifier kontroluje vazbu kódu na skupinu; prohlížeč kontroluje jen syntaxi kódu. Roster ve verifieru nově zachovává e-mail. Párování e-mailu z Forms, důvěryhodné časové okno, validace payloadu a detekce duplicit ještě nejsou dokončeny. Veřejné RSA šifrování neautentizuje runtime. Otázky jsou stále v plaintextu; povinné AES-GCM šifrování startovním kódem čeká na další etapu. Historické veřejné artefakty nebyly změněny.

Regresní testy: npm ci; npm test; npm run qa:p5:ci. Nové testy check:redteam-isolation a check:redteam-isolation-browser jsou součástí gate. Lokální browser může být předán přes CHROMIUM_PATH. Negativní kontrola původního skutečného generátoru: GIT_REDTEAM_GENERATOR_HTML=/cesta/k/puvodnimu/index.html npm run check:redteam-isolation (očekává se FAIL kvůli teacher hash).

Testy používají syntetické identity a privátní klíče vytvořené jen v paměti. QA reporty nejsou důkazem autenticity studentova runtime. Reálné iOS/Android zařízení jsou ANALYZED / NOT TESTED; lokální Chromium není mobilní test. GitHub Actions a produkční deploy zůstávají neověřeny.
