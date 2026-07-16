# GHRAB QA Standard 1.0

**Platnost:** všechny aplikace ekosystému AI Studio GHRAB  
**Cíl:** stejným způsobem rozhodnout, zda je konkrétní verze připravena k vydání.

## 1. Povinné brány

Každá verze musí projít všemi relevantními branami:

1. **Čistá reprodukovatelnost** — instalace z lockfilu, build bez ručních zásahů.
2. **Technická kvalita** — verze, lint, chybějící symboly, struktura zdroje, konzolové chyby.
3. **Bezpečnost a soukromí** — tajemství, přístupová brána, anonymizace, bezpečné exporty a fail-closed chování.
4. **Doménová logika** — vlastní Test Lab, kombinatorická matice a kritické invarianty aplikace.
5. **PWA a nasazení** — manifest, service worker, precache, oddělení cache a CI před deployem.
6. **Reálný prohlížeč** — hlavní workflow ve skutečném Chromium, nikoli pouze v DOM simulaci.
7. **Vizuální QA** — screenshoty a kontroly překryvů, přetečení, ořezu, skrytých ovládacích prvků a nenačtených obrázků.
8. **Výstupní artefakty** — samostatně otevřít a zkontrolovat všechny HTML/PDF/CSV balíčky, které aplikace vytváří.
9. **Nasazený smoke test** — skutečná veřejná verze na cílové adrese, reálné zařízení a skutečná síťová služba.

## 2. Povinné rozměry vizuální kontroly

- 360 × 800 — malý mobil,
- 412 × 915 — běžný mobil,
- 768 × 1024 — tablet,
- 1366 × 768 — školní notebook,
- 1920 × 1080 — desktop.

U aplikací s dlouhým obsahem se pořizuje celý screenshot stránky. Povinně se kontrolují úvod, všechny hlavní kroky, otevřené modaly, dlouhý obsah, chybový stav, hotový výstup a každá samostatně exportovaná aplikace nebo dokument.

## 3. Klasifikace nálezů

- **BLOCKER:** hlavní činnost nelze dokončit, ztráta dat, obejití přístupu, závažný únik nebo nebezpečný výstup.
- **MAJOR:** nečitelný či překrytý obsah, nedostupné důležité tlačítko, chybný výsledek, nefunkční podporovaná kombinace nebo zásadní rozpor s dokumentací.
- **MINOR:** drobná vada bez vlivu na dokončení práce, bezpečnost a správnost výsledku.
- **PREFERENCE:** subjektivní změna stylu nebo pracovního postupu; nevstupuje do certifikačního verdiktu.

## 4. Verdikty

- **READY:** všechny automatické brány i nasazený smoke test prošly; žádný otevřený BLOCKER ani MAJOR.
- **READY WITH MINOR ISSUES:** žádný BLOCKER ani MAJOR, pouze přesně popsané MINOR nálezy.
- **AUTOMATED READY — PENDING DEPLOYED SMOKE:** automatické, prohlížečové a vizuální testy prošly, ale ještě nebyla potvrzena cílová veřejná adresa a fyzické zařízení.
- **NOT READY:** alespoň jeden BLOCKER nebo MAJOR, případně neprovedená povinná automatická brána.

Zelené technické testy samy nesmějí vytvořit verdikt READY. Poslední krok je vždy kontrola nasazené verze člověkem.

## 5. Povinný certifikační výstup

Každý audit musí uvést:

- přesnou verzi a otisk testovaného balíku,
- provedené a neprovedené brány,
- počty testů, scénářů a screenshotů,
- všechny nalezené vady a jejich stav,
- omezení testovacího prostředí,
- jasný verdikt,
- přesný krátký seznam kroků, které musí udělat správce na reálném zařízení.

## 6. Zásada prevence regresí

Každá potvrzená chyba musí po opravě získat automatickou nebo jednoznačnou vizuální regresní pojistku. Nestačí chybu pouze opravit. Nová pojistka se následně stává součástí společného standardu nebo specifické sady dané aplikace.
