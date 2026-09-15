# Release notes — Generátor testů 7.1.28

Datum: 2026-09-15

## Důvod vydání
Čistý GitHub CI průchod 7.1.27 potvrdil opravu performance budgetu, ale tři workflow skončila na XSS sink ratchetu: počet přiřazení do `innerHTML` byl 164 při historicky zamknutém baseline 161. Všechny tři nové sinky pocházely z UX oprav 7.1.26, nikoli z původního GARP baseline. Samostatný `qa-build` navíc odhalil teardown race v novém practice regresním testu: JSDOM se zavřel dřív, než doběhl asynchronní `buildReportSeal()`, a pending Promise pak sahal na již zrušený `document`.

## Oprava
- Bezpečnostní baseline 161 se nezvyšuje.
- Schování exportního checklistu čistí obsah přes `textContent` místo nového `innerHTML` přiřazení.
- Modal pro povolení dalšího pokusu učitelem se sestavuje pomocí `createElement`, `textContent` a `appendChild`, bez nového HTML sinku.
- Procvičovací test automaticky otevře panel rozboru přes již existující `toggleAnswersPanel()` cestu, místo druhého přímého zápisu do `innerHTML`.
- Practice regresní test před `window.close()` čeká na dokončení asynchronního report seal; odstraňuje se falešný teardown crash bez změny produkčního runtime.
- UX funkce 7.1.26 a kompakce buildu 7.1.27 zůstávají beze změny.

## Očekávané CI invarianty
- `innerHTML`: 161 / baseline 161
- `insertAdjacentHTML`: 8 / baseline 8
- `outerHTML`: 5 / baseline 5
- `document.write`: 0
- `eval`: 0
- `new Function`: 0

7.1.28 je nový kandidát; autoritativní release verdikt dává čistý GitHub CI běh z exact lockfile.
