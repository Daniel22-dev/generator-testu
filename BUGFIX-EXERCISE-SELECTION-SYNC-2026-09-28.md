# Bugfix report – synchronizace cvičení, typů a bodů

**Datum:** 2026-09-28  
**Výchozí verze:** Generator testů 7.1.55  
**Stav:** opravený zdrojový kandidát; bez změny release verze a bez publikace na GitHub

## Nahlášený problém

1. Učitel vybral konkrétní typy cvičení (např. 6 typů včetně Reading comprehension), pokračoval dál a později otevřel podrobné nastavení položek a bodů.
2. V podrobném nastavení se objevila jiná/starší sada typů; Reading mohl zmizet.
3. Hodnota „Počet cvičení“ nebyla synchronní s počtem konkrétně vybraných typů.
4. Skrytá detailní konfigurace mohla vedle starých typů držet i staré rozdělení bodů.

## Kořenová příčina

Aplikace udržovala tři souběžné reprezentace stejné konfigurace:

- `state.pocet` – počet cvičení,
- `state.typyCviceni` – globálně vybrané typy,
- `state.exerciseConfig` – detailní konfigurace jednotlivých cvičení.

`exerciseConfig` se při změně globálních typů nepřestavovala přesně podle aktuálního výběru. Po otevření detailu proto mohl starý skrytý stav převzít autoritu. Při následném sbalení detailu mohl tento starý stav přepsat i globální výběr.

Druhá část problému byla záměrná historická logika: `state.pocet` mohl být vyšší než počet vybraných typů a generátor typy opakoval round-robin. To ale odporovalo očekávání UI „počet cvičení = počet konkrétně vybraných typů“.

## Nové pravidlo

### Běžný výběr

**1 vybraný typ = 1 cvičení.**

- 6 vybraných typů → přesně 6 cvičení.
- Počet se při výběru/odebrání typu přepočítává automaticky.
- Kliknutí na jiný počet už nemůže existující konkrétní výběr rozpojit.
- Generování vytváří přesně seznam vybraných typů; typy se automaticky neopakují.

### Podrobné nastavení

Podrobné nastavení zůstává místem, kde lze:

- použít stejný typ cvičení vícekrát,
- nastavit počet položek v jednotlivém cvičení,
- nastavit body jednotlivých cvičení.

Při otevření detailu se tabulka vždy vytvoří z aktuálního globálního výběru, nikoliv ze staré skryté konfigurace.

## Opravené chování

- Globální typy, počet cvičení a skrytý detail jsou synchronizované.
- Reading comprehension se při otevření/sbalení detailu neztrácí.
- Změna typu přímo v detailu okamžitě aktualizuje navazující Reading/Listening UI.
- Body se při přechodu z globálního výběru do detailu znovu rozdělí podle aktuálního celkového počtu bodů; staré skryté bodování se nevrací.
- Starší uložený stav s konfliktem `pocet` vs. `typyCviceni` se při načtení normalizuje podle konkrétně zvolených typů.
- Před generováním se kontroluje přesná shoda počtu specifikací a vybraných typů.
- UI nově přímo vysvětluje pravidlo 1 typ = 1 cvičení a odkazuje na podrobné nastavení pro opakování typu.

## Změněné soubory

- `src/js/02-state-persistence.js`
- `src/js/03-ui-render.js`
- `src/js/04-templates.js`
- `src/js/05-form-fields.js`
- `src/js/08a-output-workflow.js`
- `src/js/12-prompt-builder.js`
- `src/shell.html`
- `tools/workflow-matrix-check.mjs`
- `qa/combinatorial-validator.mjs`

## Regresní scénář přidaný do QA

Scénář simuluje:

1. existující starou skrytou `exerciseConfig`,
2. výběr 6 nových typů,
3. Reading comprehension mezi nimi,
4. pokus změnit počet na jinou hodnotu,
5. otevření detailního nastavení,
6. kontrolu typů a součtu bodů,
7. sbalení detailu,
8. sestavení promptových specifikací,
9. načtení starého snapshotu s konfliktním počtem.

Výsledek cíleného runtime testu nad skutečnými zdrojovými funkcemi: **11/11 PASS**.

## Další ověření

Úspěšně prošlo:

- `node --check` všech změněných JS/MJS souborů,
- kontrola zdrojové struktury,
- kontrola citlivých údajů,
- kontrola nápovědy typů cvičení,
- Studio manifest template,
- AI operations registry parity,
- production readiness invariants,
- QA manifest,
- jednotnost verze,
- lockfile registry,
- GitHub Actions pinning,
- Generator Assistant / AI Core invariants.

Plný `npm test` nebylo možné v pracovním prostředí dokončit, protože npm registry nebyl z kontejneru dostupný a projekt neměl přibalené `node_modules`. Regresní logika byla proto navíc spuštěna přímo nad skutečnými zdrojovými funkcemi ve VM harnessu; cílený scénář prošel kompletně. Přidané workflow testy jsou připravené pro standardní CI běh v repozitáři.

## Release poznámka

Zdroj zůstává označen jako **7.1.55**. Oprava tedy zatím není vydaná jako nová produkční verze. Před ostrým nasazením je vhodné provést standardní version bump / CI / promotion proces projektu.
