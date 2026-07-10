# Oprava přístupové brány — verze 7.0.2

## Problém

Po nasazení verze 7.0.1 se na zařízení, které mělo v otevřené kartě uložené odemčení relace, nemusela znovu zobrazit přístupová obrazovka. Aplikace si odemčení ukládala do `sessionStorage`, takže běžný reload stejné karty pokračoval bez PINu. Přístupová brána se navíc vytvářela až JavaScriptem.

## Oprava

- Aplikace je zamčená už ve statickém HTML (`body.acc-locked` + `#accessGate`). Při chybě JavaScriptu zůstane obsah překrytý.
- Odemčení relace je svázáno s konkrétní verzí aplikace. Po nasazení nové verze se dříve aktivované zařízení znovu zeptá na místní PIN.
- Starý session klíč verze 7.0.1 se při startu odstraní.
- `?lock=1` smaže pouze odemčení aktuální relace a zobrazí PIN.
- `?reset-access=1` smaže místní přístupový profil a vrátí zařízení na zadání aktivačního kódu.
- Service worker při startu aktivně kontroluje aktualizaci a při převzetí nové verze provede jediný reload.

## Očekávané chování

1. Nové zařízení: zobrazí se zadání osobního aktivačního kódu.
2. Již aktivované zařízení po nasazení 7.0.2: zobrazí se místní PIN.
3. Reload ve stejné odemčené kartě a stejné verzi: relace zůstane odemčená.
4. Zavření karty/prohlížeče nebo otevření `?lock=1`: znovu se zobrazí PIN.
5. Otevření `?reset-access=1`: profil se smaže a zobrazí se aktivace.

## Regresní ochrana

Produkční kontrola ověřuje existenci statické fail-closed brány a verzovaného session tokenu. Headless test navíc simuluje nové zařízení, obnovení odemčené relace, vynucené uzamčení i úplný reset profilu.
