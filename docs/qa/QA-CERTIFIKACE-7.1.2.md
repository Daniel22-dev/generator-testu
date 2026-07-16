# Certifikační protokol — Generátor interaktivních testů 7.1.2

**Datum:** 16. 7. 2026  
**Standard:** GHRAB QA Standard 1.0  
**Testovaný zdroj:** uživatelem dodaný ZIP verze 7.1.1, během certifikace opravený a zvýšený na 7.1.2

## Verdikt

> **AUTOMATED READY — PENDING DEPLOYED SMOKE**

Po opravě níže uvedené vizuální vady nebyla v kompletním automatickém, prohlížečovém ani vizuálním průchodu nalezena žádná otevřená chyba třídy BLOCKER nebo MAJOR. Finální `READY` lze udělit po krátkém ověření skutečně nasazené verze na GitHub Pages a fyzickém telefonu/počítači.

## Nález certifikačního běhu

### GIT-VIS-001 — překryv tlačítka Celá obrazovka

- **Původní závažnost:** MAJOR
- **Místo:** bezpečný studentský HTML test, úvodní obrazovka
- **Projev:** tlačítko „Celá obrazovka“ se na mobilu i notebooku překrývalo s následujícím popiskem „Jméno nebo kód studenta“.
- **Příčina:** tlačítko nemělo vlastní plnou řádku ani spodní odsazení.
- **Oprava:** `.btn-fullscreen` používá `display:flex`, `width:100%`, `box-sizing:border-box` a pevné svislé odsazení.
- **Prevence regrese:** kontrola v `check-production-readiness.mjs` a vizuální kontrola exportovaného runtime.
- **Stav po opravě:** PASS na 360 × 800 i 1366 × 768; ručně ověřeno ze screenshotů.

## Výsledky povinných bran

| Brána | Výsledek |
|---|---|
| Čistá instalace z veřejného lockfilu | PASS |
| Verze napříč projektem | PASS — 7.1.2 |
| QA manifest | PASS — Standard 1.0 |
| Produkční invarianty | PASS |
| Zdrojová struktura | PASS |
| Kontrola citlivých údajů | PASS |
| Deadline časovače | PASS |
| ESLint / neznámé symboly | PASS — 766 projektových globálů |
| Build | PASS — 29 modulů |
| Service worker precache | PASS — 10/10 |
| Workflow audit | PASS — 28/0 |
| Headless regrese | PASS — bez JS chyb |
| Reálný Chromium průchod formulářem | PASS — 11 kroků |
| Vizuální QA hlavní aplikace | PASS — 45/45 screenshotů |
| Exportované HTML runtimy | PASS — 10/10 kontrolovaných stavů |
| Secure runtime s WebCrypto | PASS — 6 otázek, aktivní test a časovač |
| Offline audit závislostí | PASS — 0 zranitelností |

## Rozsah kombinatorických kontrol

- 576 kombinací hlavních režimů,
- 38 samostatných typů úloh,
- 703 dvojic typů úloh,
- 315 kombinací jazyka a CEFR,
- 72 kombinací sekundárních voleb,
- 16 kombinací povinných polí,
- 30 kombinací cizích jazyků, režimu a jazyka instrukcí,
- 13 českých oborových presetů,
- reprezentativní matice 16 instantních HTML výstupů.

## Vizuální rozsah

Hlavní aplikace byla vykreslena v Chromium na rozměrech 360 × 800, 412 × 915, 768 × 1024, 1366 × 768 a 1920 × 1080. Na každém rozměru byly kontrolovány hlavní kroky, pokročilé nastavení, čas a forma, doplňky, changelog, Test Lab, manuál a stresový dlouhý obsah. Automaticky se kontrolovalo horizontální přetečení, překryvy, oříznuté kritické texty, skrytá nebo zakrytá tlačítka, nenačtené obrázky a konzolové chyby. Galerie byla také ručně prohlédnuta.

Samostatně byly kontrolovány `instant_test.html`, `student_test.html` a `teacher_verifier.html` na mobilu a notebooku.

## Omezení prostředí a povinný nasazený smoke test

Certifikační prostředí neumožnilo otevřít lokální server ani cílovou internetovou adresu v testovacím Chromiu. Proto nebylo možné přímo potvrdit:

1. skutečnou aktivaci service workeru na GitHub Pages,
2. reálné volání Gemini API s uživatelským klíčem,
3. stahování a sdílení `answers.txt` na konkrétním telefonu,
4. odečet času po skutečném přepnutí mobilní aplikace na pozadí,
5. online `npm audit`; živý advisory endpoint byl nedostupný, offline audit včetně lockfilu hlásí 0 zranitelností.

Tyto body netvoří známou chybu kódu. Jsou poslední povinnou kontrolou cílového prostředí před změnou verdiktu na `READY`.
