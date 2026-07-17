# GHRAB QA certifikace – Generátor interaktivních testů 7.1.3

- QA standard: **GHRAB-QA-1.0.2**
- Datum lokálního finálního průchodu: **2026-07-16**
- Build SHA-256: `d96d23438a12c5d59072d36ff31cc735b0d0facec69ad184608a96fd63f5de82`
- Automatický verdikt: **AUTOMATED_READY**
- Ruční kontrola 41 screenshotů: **dokončena**
- Deployed smoke test: **dosud neproveden**

## Výchozí stav 7.1.2

Čisté `npm ci`, původní `npm test`, `npm run test:headless` a `npm run build` prošly. Generátor už obsahoval nadprůměrně rozsáhlé vlastní kontroly, proto nebyly nahrazeny. Byly zachovány jako projektová brána a doplněny společnou certifikační vrstvou.

## Provedené změny

- verze zvýšena z 7.1.2 na 7.1.3 a synchronizována v package souborech, aplikaci, PWA manifestu, service workeru, changelogu a QA manifestu;
- přidán jednotný příkaz `npm run qa:release`;
- integrovány technické, bezpečnostní, PWA, pairwise, Chromium a kritické workflow brány;
- přidán QA manifest, vizuální plán, kombinatorický plán, plán kritických workflow a schéma ručního schválení;
- přidán GitHub Actions deploy až po úspěšné QA;
- lockfile převeden na veřejný registr `registry.npmjs.org`;
- `dist`, `node_modules` a `qa-results` jsou vyloučeny z Git repozitáře;
- vytvořeny bezpečné testovací exporty okamžitého testu, studentského souboru a učitelského verifieru.

## Skutečně ověřeno

- původní workflow audit: **28 scénářů PASS**;
- původní matice: **576 režimových kombinací**, 38 typů a 703 dvojic typů, 315 CEFR kombinací;
- headless Test Lab: **26 PASS, 0 neočekávaných varování, 0 FAIL**;
- společná kombinatorika: **19 scénářů z 288 teoretických kombinací, 100 % pairwise pokrytí**;
- vizuální Chromium: **41/41 běhů PASS** na povinných mobilních, tabletových a desktopových viewporTech;
- kritická workflow: **8/8 PASS**, včetně otevření Generátoru, tvorby promptu, Test Labu, okamžitého exportu, bezpečného studentského exportu, verifieru, fail-closed guardu a izolace PWA cache;
- všech sedm povinných bran: **PASS**;
- ruční galerie: dokončena a svázána s výše uvedeným otiskem buildu.

## Vysvětlení testovacího upozornění na úložiště

V části izolovaných Chromium screenshotů je vidět červené upozornění na blokované úložiště. Vzniká proto, že vizuální harness načítá dokument přes izolované `setContent` prostředí bez běžného webového originu. Nejde o falešný úspěch: aplikace správně a viditelně oznamuje selhání `localStorage`. Na skutečné nasazené adrese musí být chování úložiště ještě potvrzeno deployed smoke testem.

## Co zbývá

Po nahrání na GitHub je nutné zkontrolovat zelenou GitHub Action a provést krátký smoke test skutečné GitHub Pages adresy. Teprve pak lze pro stejný build uložit `--deployed-smoke` a získat stav READY.
