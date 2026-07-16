# Generátor interaktivních testů

Produkční serverless/PWA aplikace pro učitele. Připravuje procvičovací i klasifikované interaktivní testy, diferencované varianty a bezpečný offline balík bez školního backendu.

## Stav vydání

Verze **7.1.1** je technicky ověřená produkční serverless varianta. Označení popisuje stav kódu a automatických kontrol; samo o sobě nenahrazuje formální schválení školy ani posouzení budoucího serverového provozu.

Katalog AI Studia může současně zobrazovat opatrnější organizační stav „Připraveno k řízenému ověřování“. Nejde o rozpor: aplikace je technicky produkční, ale katalog nesmí před rozhodnutím školy tvrdit, že je formálně schválena pro plošný provoz.

## Hlavní vlastnosti

- tvorba testů pro cizí jazyky a český jazyk,
- jednoduchý i pokročilý režim,
- 38 podporovaných typů úloh,
- diferenciace pomocí jmen nebo doporučených jednorázových kódů,
- náhodné pořadí a varianty podle skupin,
- okamžitý procvičovací režim,
- bezpečný offline balík `student_test.html` + `teacher_verifier.html`,
- šifrované odevzdání `answers.txt`,
- PWA instalace pro počítač a telefon,
- lokální šablony, historie a export zadání,
- automatizovaný build, lint, bezpečnostní kontroly, workflow matice a headless regrese.

## Ochrana dat

1. Před AI požadavkem se identity studentů nahrazují kódy `Student A1`, `Student A2` atd.
2. Ve studentském HTML není čitelný roster. Přiřazení variant používá náhodnou sůl konkrétního testu a SHA-256 `studentHashes`.
3. Pro klasifikované diferencované testy se doporučují náhodné jednorázové kódy, nikoli běžná jména.
4. Text zadání, zvolené URL, pedagogické podmínky a přílohy mohou být odeslány do Google Gemini. Učitel je musí předem anonymizovat.

## Struktura zdroje

- `src/shell.html` – HTML kostra aplikace.
- `src/styles.css` – kompletní CSS.
- `src/js/01-core.js ... 17-ai-studio-bridge.js` – hlavní logika po doménách; každý soubor se ve výsledku spouští jako samostatný classic script.
- `src/js/50-cs-module.js` – modul Český jazyk.
- `src/js/60-pwa.js` – registrace service workeru.
- `src/js/99-init.js` – závěrečný start aplikace.
- `public/` – PWA manifest, service worker, manuál a ikony.
- `scripts/build.mjs` – build do lokálního `dist/`.
- `scripts/check-sw-precache.mjs` – ověřuje, že každá položka PWA precache skutečně existuje v buildu.
- `scripts/check-lockfile-registry.mjs` – blokuje lockfile s interními registry URL.
- `scripts/generate-eslint-globals.mjs` – generuje sdílené globály pro `no-undef` v architektuře classic scriptů.
- `tools/headless-check.mjs` – funkční regrese v jsdom.
- `tools/workflow-matrix-check.mjs` – úplná kontrola návazností průvodce a kombinací režimů.

## Instalace a kontrola

```bash
npm ci
npm test
npm run test:headless
npm audit --audit-level=high
```

`npm test` kontroluje:

1. shodu verze ve čtyřech zdrojích,
2. veřejný npm registr v lockfile,
3. produkční a privacy invarianty,
4. strukturu zdrojů,
5. obecný sken citlivých údajů,
6. deadline časovače obou studentských runtime,
7. ESLint včetně `no-undef`,
8. produkční build,
9. konzistenci service-worker precache,
10. workflow matici 576 režimových kombinací, 38 typů a 703 dvojic typů.

`npm run test:headless` skutečně spustí aplikaci po centrálním povolení, ověří fail-closed build, pseudonymizaci promptu, hashovaný roster, Gemini kontrakt, sestavení secureOffline balíku, jednorázové kódy, šablony, PWA soubory a interní Test Lab. Očekávané přeskočení self-testu bez právě vygenerovaného testu je v logu označeno zvlášť; jakýkoli jiný warn test zablokuje.

Užitečné samostatné příkazy:

```bash
npm run build
npm run check:versions
npm run check:lockfile
npm run check:precache
npm run check:timers
npm run check:production
npm run check:structure
npm run check:sensitive
npm run test:workflow
npm run test:headless
npm run lint
```

Pokud práce v izolovaném vývojovém prostředí přepíše `resolved` URL v lockfile na interní proxy, spusť před commitem:

```bash
npm run fix:lockfile-registry
npm run check:lockfile
```

## Centrální přístup AI Studia

- Veřejný build je fail-closed: aplikační skripty jsou inertní, dokud je centrální `app-guard.js` nepovolí.
- Guard ověřuje podepsaný permit AI Studia, jeho platnost, roli, povolenou aplikaci a revokaci.
- Uživatel aktivuje přístup ve Studiu; Generátor neobsahuje vlastní aktivační kód ani místní PIN bránu.
- Lokální odebrání přístupu je dostupné v účtovém modalu tlačítkem **Odebrat přístup z tohoto zařízení**.
- Neoficiální vzdálená kopie nesmí generovat. `file://` a `localhost` jsou vývojové prostředí; ostrý balík v nich může po výslovném potvrzení vytvořit pouze centrálně ověřený správce.

## Nasazení na GitHub Pages

Workflow `.github/workflows/deploy.yml` provede `npm ci`, `npm test`, `npm run test:headless` a `npm audit --audit-level=high`. Teprve poté nahraje čerstvě vytvořený `dist/` na GitHub Pages.

Do repozitáře se nenahrává `node_modules/` ani lokální `dist/`. Zdroj se upravuje v `src/` a `public/`; vygenerovaný `dist/index.html` se ručně neupravuje.

## Verze, PWA a aktualizace

Verze musí být shodná v:

- `package.json`,
- `src/js/01-core.js`,
- `public/sw.js`,
- `public/manifest.webmanifest`.

Service worker nepoužívá `skipWaiting`. Nová verze se aktivuje po zavření starých karet, takže rozpracovaná práce není přerušena automatickým reloadem. Centrální soubory pod `/AI-Studio-GHRAB/` používají `networkFirst`: online se vždy ověří čerstvý guard, offline je dostupná poslední známá cache.

## Dokumentace

- `PROVOZNI-PRAVIDLA.md` – praktická pravidla pro učitele a správce.
- `SECURITY.md` – bezpečnostní hranice serverless verze.
- `RELEASE-CHECKLIST.md` – kontrolní seznam vydání.
- `ARCHITEKTURA.md` – technické uspořádání.
- `CONTRIBUTING.md` – pravidla dalšího vývoje.
- `docs/release-notes/` – historické jednorázové instrukce a komentáře vydání.

## Omezení rozsahu

Verze 7.1.1 nemá školní SSO, databázi, serverovou úschovu API klíče ani neobejitelnou serverovou autorizaci. Rozpracovaný studentský pokus se po reloadu nebo zavření stránky plně neobnoví. Již stažený HTML test nelze vzdáleně zneplatnit. Tyto hranice řeší `PROVOZNI-PRAVIDLA.md` a `SECURITY.md`.

## Napojení na AI Studio GHRAB

Build vytváří `dist/studio-manifest.json`. Studio z něj načítá verzi, stav, adresu a metadata. Studio Bridge v1 umí přes krátkodobou lokální předávku `ghrab-material-v1` doplnit název, skupinu, předmět a zdrojový obsah bez serverového ukládání předávky.
