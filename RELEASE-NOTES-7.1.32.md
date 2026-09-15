# Generátor testů 7.1.32 — Stage 1/2 state-transition hotfix

Datum: 2026-09-15

## Důvod vydání

GitHub CI 7.1.31 odhalil jednu skutečnou regresi po Etapě 1: při přepnutí z cizího jazyka na češtinu se interní preset správně změnil např. z `fl_strict` na `cs_strict`, ale český modul následně historickým pravidlem vynutil `appMode=advanced`.

## Produkční oprava

V `src/js/50-cs-module.js` zůstává požadavek Advanced režimu pro češtinu bez řízeného Simple presetu. Pokud je ale aktivní platný Simple preset (`cs_practice` nebo `cs_strict`), ČJ modul už Simple režim nepřepisuje. Tím je pravidlo sjednoceno s `enforceModeConstraints()`.

## QA opravy

- Workflow assertiony Bezpečnosti pracoviště používají správné české formulace `není nastavena` / `je nastavena`. Runtime přenos týmového kódu byl funkční už v 7.1.31.
- Visual kontrola changelogu očekává stabilní prefix `Generátor testů v` místo konkrétního patch čísla. Přesnou verzi nadále samostatně a fail-closed kontroluje `scripts/check-versions.mjs`.

## Ověření cíleného scénáře

V lokálním Chromium byl nad skutečně sestavenými aplikačními skripty ověřen přechod přísného i procvičovacího Simple profilu v obou směrech FL ↔ ČJ a oba stavy Bezpečnosti pracoviště. Cílený průchod: 6/6 PASS.

## Co se nemění

Verifier, secure/student runtime, kryptografie, formát výsledků, PIN/odemykací heslo, Google Forms a serverový profil nejsou touto verzí funkčně měněny.

## Release stav

7.1.32 je kandidát. Produkční zelený verdikt lze vydat až po čistém GitHub CI nad přesným 7.1.32 commitem.
