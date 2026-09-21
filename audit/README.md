# Opakování lokálního auditu 7.1.46

## Co je předáno

Celý projekt včetně oprav; `REPORT.html` a `REPORT.md`; `tests/`; důkazy v `evidence/`; zdrojový `changes.patch`. Kontrolní otisky v `manifest.sha256` jsou pro auditora balíčku, nikoli povinná operace pro učitele.

`dist` byl sestaven lokálně s dostupným Acorn 8.15.0. Lockfile projektu vyžaduje 8.17.0. Závislosti nebyly v lockfile sníženy a node_modules není součástí ZIPu. Před nasazením sestavte znovu se správnými závislostmi. Kompletní `npm test` v tomto prostředí skončil chybou chybějícího balíčku jsdom, nikoli úspěchem.

## Projektové testy a build

Z kořene projektu, v prostředí s přístupem k uzamčeným závislostem:

```sh
npm ci
npm run build
npm test
npm run qa:p5:ci
```

Poslední příkaz je existující projektová akceptační sada, nikoli zaručené potvrzení úspěchu. Respektujte její požadavky na prostředí a akceptaci. Lokální audit ji nenahrazuje a nevytváří falešný souhlas s nasazením.

## Doplňkové klikací testy

Vyžadují Python, Node a Chromium. Testovací Python Playwright je oddělený od JavaScript Playwright připnutého v package-lock.json. Použijte dostupný prohlížeč nebo nainstalujte prohlížeč těmito testovacími nástroji.

```sh
python -m pip install -r audit/requirements-audit.txt
python -m playwright install chromium
python audit/run_audit.py
```

Volitelná proměnná `CHROMIUM_EXECUTABLE` nastaví konkrétní binárku; `GENERATOR_AUDIT_ROOT` jiný kořen projektu. Výchozí kořen se určí podle umístění skriptů. Jeden scénář lze spustit například:

```sh
python audit/run_audit.py --suite feature_suite
python audit/run_audit.py --validate-only
```

Runner před spuštěním vybrané sady odstraní její starý JSON. Poté ověří očekávaný počet scénářů a všechna pole `ok`. Nedokončená sada nebo selhání znamenají nenulový návratový kód. Samotné jednotlivé skripty mohou zachytit výjimku do JSON; proto pro CI použijte runner, ne pouze exit code jednoho skriptu. Režim `--validate-only` jen zkontroluje uložené výsledky, nespouští nové testy.

Při opakování se původní důkazy v `evidence/` přepisují. Původní předávací ZIP a manifest si nejprve uchovejte.

## Co harness simuluje

AI poskytovatel vrací definované syntetické odpovědi. Autentizovaný učitel a původ stránky jsou testovací předpoklady. Stránka běží přes `set_content` v izolovaném kontextu, CSP se v něm nevynucuje. Kryptografie volá skutečné `node:crypto` operace. Kopírování do schránky, otevření formuláře a stažení jsou zachyceny testovacím adaptérem. Tyto adaptéry NEPATŘÍ do `src`, `public` ani `dist`.

Důkazy nepotvrzují reálný model, školní autentizaci, zápis do Google Forms, PWA ani ochranu proti podvádění na libovolném zařízení. Neobsahují skutečné žákovské údaje.

## Před ostrým nasazením

Dokončit původní CI s uzamčenými závislostmi a přestavět dist; v reálném Studiu ověřit přístup, editor, stažení, HTTPS a odevzdání; provést obsahové vzorky živé AI ve všech jazycích; proklikat telefon a školní formulář. Teprve po doložené akceptaci změnit `RELEASE.sourceAuditPending` ve `src/js/01-core.js`, aktualizovat akceptační podklady a znovu sestavit. Neodstraňujte příznak pouze kvůli odstranění upozornění.

Interní profil `production-serverless` zůstal kvůli kompatibilitě původní infrastruktury. Sám není schválením tohoto vydání. Nové rozhraní a exporty respektují `sourceAuditPending`.

`audit/` obsahuje vývojové podklady, ne studentský materiál. Na hosting patří jen správně sestavený deployment podle projektu. Učitelský verifier a seznam přiřazení kódů nikdy nezveřejňujte studentům.
