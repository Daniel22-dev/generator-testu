# Generátor testů 7.1.67 — D4 / Teacher Verifier theme + fullscreen

## Rozsah

D4 mění pouze prezentační/orchestrační vrstvu Teacher Verifieru 2.0. Scoring, dešifrování, `effectiveResults()`, studentský export a PDF renderer D1–D3 se nemění.

## Změny

- Skutečný tmavý motiv je výchozí a používá explicitní barevné tokeny pro pozadí, karty, navigaci, tabulky, formulářové prvky, statusy a modaly.
- Světlý motiv používá samostatnou světlou paletu a preference se nadále ukládá lokálně.
- Ovládací tlačítko motivu mění `aria-label`, `aria-pressed`, ikonu i viditelný popisek podle aktuálního stavu.
- Fullscreen používá standardní Fullscreen API s kompatibilními fallbacky, sleduje `fullscreenchange` / `webkitfullscreenchange` a synchronizuje `aria-pressed`, ikonu, popisek a stav `body`.
- Při nepodporovaném Fullscreen API je uživateli zobrazena explicitní informace; při odmítnutí requestu dostane akční fallback přes F11.
- Browserový journey regression nyní kontroluje skutečné `computedStyle` hodnoty dark/light surfaces a fullscreen state transition.

## D4 acceptance

- Teacher Verifier 2.0 static contract: PASS.
- Integrovaný Chromium smoke: skutečný dark/light palette na body/card/nav/input/modal: PASS.
- Fullscreen state + `fullscreenchange` + unsupported API + rejected request: PASS.
- D1–D3 funkce budou před trojbalíkem D4–D6 znovu ověřeny společným regression během.
