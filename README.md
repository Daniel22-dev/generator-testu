# Generátor interaktivních testů

Produkční serverless aplikace pro učitele. Pomáhá připravovat interaktivní cvičení, procvičovací materiály a klasifikované testy, včetně diferencovaných variant a bezpečného offline odevzdání. Výstupem je samostatný HTML soubor; samotný generátor lze provozovat jako PWA na GitHub Pages bez školního serveru.

## Stav vydání

Verze 7.0.3 je technicky ověřená produkční serverless varianta. Je připravena k řízenému oficiálnímu používání školou za podmínek popsaných v `PROVOZNI-PRAVIDLA.md`, `SECURITY.md` a `RELEASE-CHECKLIST.md`.

Toto označení neznamená automatické formální schválení vedením školy ani bezpečnostní posouzení budoucího serverového řešení. Server, školní přihlášení a centrální správa API klíče jsou samostatná etapa.

## Hlavní vlastnosti

- tvorba testů pro cizí jazyky i český jazyk,
- jednoduchý a pokročilý pracovní režim,
- více než dvacet typů interaktivních úloh,
- diferenciace pomocí jmen nebo jednorázových kódů,
- náhodné pořadí a samostatné varianty podle skupin,
- okamžitý procvičovací režim,
- bezpečný offline balík `student_test.html` + `teacher_verifier.html`,
- šifrované odevzdání `answers.txt`,
- PWA instalace pro počítač a telefon,
- lokální šablony, historie a export zadání,
- automatizovaný build, lint, bezpečnostní kontroly a headless regresní testy.

## Ochrana dat

Generátor chrání identity ve dvou samostatných vrstvách:

1. **Před AI požadavkem** nahrazuje identity z diferenciačních skupin kódy `Student A1`, `Student A2` atd. Skutečná jména se do promptu Gemini nevkládají ani při načtení starého nastavení.
2. **Ve studentském HTML** neukládá čitelný seznam jmen ani kódů. Pro přiřazení variant používá náhodnou sůl konkrétního testu a SHA-256 otisky identifikátorů.

Pro diferencované testy se doporučují náhodné jednorázové kódy místo běžných jmen. Hash s veřejnou solí omezuje přímý únik seznamu, ale sám o sobě nebrání slovníkovému hádání známých jmen.

Text zadání, zvolené URL, pedagogické podmínky skupin a přiložené soubory se při přímém generování odesílají do služby Google Gemini. Učitel musí před odesláním odstranit osobní, zdravotní, kázeňské a jiné citlivé údaje, které mohou být obsaženy ve volném textu nebo přílohách.

## Struktura zdroje

- `src/shell.html` – HTML kostra aplikace.
- `src/styles.css` – kompletní CSS.
- `src/js/01-core.js ... 16-access.js` – hlavní logika po doménách; pořadí určuje číselný prefix.
- `src/js/50-cs-module.js` – modul Český jazyk.
- `src/js/60-pwa.js` – registrace service workeru.
- `src/index.html` – pouze informační ukazatel na modulární zdroj.
- `src/access-manifest.json` – veřejný přístupový manifest s obecnými identifikátory.
- `public/` – PWA manifest, service worker a ikony.
- `scripts/build.mjs` – build do `dist/`.
- `tools/headless-check.mjs` – funkční regresní test v jsdom.
- `tools/workflow-matrix-check.mjs` – úplná kontrola logických závislostí průvodce a kombinací režimů.

## Instalace a kontrola

```bash
npm ci
npm test
npm run test:headless
npm audit --audit-level=high
```

`npm test` musí projít před každým nasazením. Kontroluje:

1. shodu verzí,
2. produkční připravenost a povinné ochrany soukromí,
3. strukturu zdrojových modulů,
4. známé citlivé údaje ve veřejném manifestu,
5. ESLint,
6. produkční build,
7. workflow matici všech zásadních návazností, presetů, jazyků, typů cvičení a runtime identit.

Samostatný `npm run test:headless` ověřuje spuštění aplikace, pseudonymizaci promptu, hashovaný roster, Gemini kontrakt, secureOffline balík, šablony a interní Test Lab.

Samostatné příkazy:

```bash
npm run build
npm run check:versions
npm run check:production
npm run test:workflow
npm run test:headless
npm run check:structure
npm run check:sensitive
npm run lint
```

## Ověření přístupové brány

- Nové zařízení musí zobrazit aktivační kód.
- Již aktivované zařízení musí po novém vydání zobrazit místní PIN.
- Adresa s `?lock=1` okamžitě uzamkne relaci a vyžádá PIN.
- Adresa s `?reset-access=1` smaže místní přístupový profil a vyžádá novou aktivaci.
- Přístupová vrstva je fail-closed: dokud JavaScript přístup neověří, obsah aplikace zůstává překrytý bránou.

## Nasazení na GitHub Pages

Workflow `.github/workflows/deploy.yml` používá `npm ci`, spustí `npm test` a v samostatném kroku `npm run test:headless`; teprve poté nasadí vytvořený `dist/`. Do repozitáře se nenahrává `node_modules/`, lokální `dist/`, screenshoty ani testovací výsledky.

Zdroj se upravuje v `src/`; vygenerovaný `dist/index.html` se ručně neupravuje. Po nahrání ZIPu zkontroluj zelený běh GitHub Actions a následně proveď smoke test skutečné Pages URL.

## Verze a cache

Jedna verze musí být shodná v:

- `package.json`,
- `src/js/01-core.js`,
- `public/sw.js`,
- `public/manifest.webmanifest`.

Kontrola `npm run check:versions` zabrání nasazení, pokud se verze rozcházejí. Changelog v `RELEASE.changes` obsahuje nejvýše deset posledních záznamů.

## Dokumentace

- `PROVOZNI-PRAVIDLA.md` – závazný praktický postup pro učitele a správce.
- `SECURITY.md` – bezpečnostní hranice serverless verze.
- `RELEASE-CHECKLIST.md` – kontrolní seznam před vydáním.
- `AUDIT-V2.md` – hloubkový produkční audit verze 7.0.0.
- `AUDIT-PRUVODCE-V7.0.1.md` – audit logiky kroků, závislostí a kombinací vydání 7.0.1, jehož opravy zůstávají součástí 7.0.3.
- `ARCHITEKTURA.md` – technické uspořádání projektu.
- `CONTRIBUTING.md` – pravidla dalšího vývoje.
- `PLAN-MODULARIZACE.md` – historický plán modularizace.

## Omezení rozsahu

Verze 7.0.3 neřeší školní server, centrální identitu, databázi ani serverovou úschovu API klíče. Přístupová brána v klientském kódu je organizační opatření, nikoli neobejitelná autentizace. Rozpracovaný studentský pokus se po zavření nebo obnovení stránky plně neobnoví. Tyto body musí být zohledněny v provozních pravidlech a později posouzeny se školním IT.
