# Architektura projektu

Generátor interaktivních testů je produkční serverless/PWA aplikace bez školního backendu. Aktuální verze je určena v `package.json` a `RELEASE.version`; číslo verze se v tomto dokumentu záměrně neopakuje, aby nevznikal dokumentační rozpor.

## Build a dodávkový řetězec

```bash
npm ci
npm test
npm run test:headless
npm audit --audit-level=high
```

Build skládá vlastní HTML, CSS a JavaScript. Výsledná aplikace nepoužívá runtime framework ani externí JavaScriptovou knihovnu. GitHub Actions nasazuje pouze čerstvý `dist/`, který vznikl po úspěšném průchodu všech kontrol.

`package-lock.json` smí obsahovat jen veřejné npm URL. `scripts/check-lockfile-registry.mjs` blokuje interní proxy adresy a `scripts/normalize-lockfile-registry.mjs` je umí deterministicky přepsat na `registry.npmjs.org`.

## Hlavní složky

- `src/shell.html` – HTML kostra a placeholdery.
- `src/styles.css` – vizuální vrstva.
- `src/js/` – JavaScript skládaný podle názvu souboru.
- `public/` – PWA manifest, service worker, manuál a ikony.
- `scripts/build.mjs` – produkční build.
- `scripts/check-production-readiness.mjs` – produkční, privacy, API a a11y invarianty.
- `scripts/check-source-structure.mjs` – struktura split modulů.
- `scripts/check-sensitive-data.mjs` – obecný sken veřejných zdrojů.
- `scripts/check-sw-precache.mjs` – konzistence precache proti `dist/`.
- `scripts/check-deadline-timers.mjs` – pojistka proti návratu tikových časovačů.
- `scripts/generate-eslint-globals.mjs` – AST seznam top-level globálů pro ESLint.
- `tools/headless-check.mjs` – funkční regrese v jsdom.
- `.github/workflows/deploy.yml` – testovaný deploy na Pages.

## Kontrakt pořadí modulů

Soubory nejsou ES moduly. Každý se ve výsledném HTML spouští v samostatném classic `<script>` tagu a sdílí globální scope.

1. Prefixy `01-` až `17-` určují pořadí hlavní aplikace.
2. Bezpečný export je rozdělen na `13a` až `13g`.
3. Build testů je rozdělen na `14a` až `14d`.
4. `16-access.js` promítá ověřený permit AI Studia.
5. `17-ai-studio-bridge.js` řeší krátkodobou předávku materiálu.
6. `99-init.js` startuje aplikaci až po hlavních modulech.
7. `50-cs-module.js` a `60-pwa.js` jsou navazující samostatné skripty.

ESLint má `no-undef: error`. Protože jsou definice rozdělené mezi classic scripty, před lintem se přes Espree vygeneruje `eslint-globals.generated.mjs`. Překlep nebo odkaz na smazanou globální funkci už test zablokuje.

## Centrální přístup

Veřejný `dist/index.html` obsahuje inertní skripty typu `application/ghrab-protected`. Centrální `app-guard.js` AI Studia nejprve ověří podepsaný permit a teprve potom aplikační moduly aktivuje. Generátor už nemá vlastní aktivační kód, místní PIN ani `access-manifest.json`.

Service worker používá pro `/AI-Studio-GHRAB/` strategii `networkFirst`: online je bezpečnostní komponenta vždy čerstvá, offline lze použít poslední známou cache. Důsledek je vědomý: offline zařízení může do nejbližšího připojení pracovat s dříve platným permitem. Po připojení se čerstvý guard a revokace uplatní okamžitě.

## PWA aktualizace

`CORE_ASSETS` musí odpovídat skutečným souborům v `dist/`; tuto vazbu hlídá `check-sw-precache.mjs`. Service worker nepoužívá `skipWaiting`, takže nová verze nepřevezme otevřenou kartu a sama nezahodí rozpracovanou práci. Aktivuje se po zavření starých klientů.

## Datový tok AI

1. Učitel vyplní konfiguraci, zdroje a přílohy.
2. `buildPrompt()` sestaví strukturované zadání.
3. Diferenciační identity se nahradí kódy `Student A1…`.
4. Před prvním požadavkem se zobrazí informace o přenosu dat.
5. `callGeminiJSON()` odešle požadavek s klíčem v `x-goog-api-key`.
6. Gemini 3.x používá výchozí sampling; aplikace nenastavuje sníženou `temperature`.
7. Odpověď je validována, případně opravena nebo odmítnuta.
8. Generátor sestaví instantní HTML nebo secureOffline balík.

## Bezpečný offline balík

- `student_test.html` obsahuje veřejný RSA klíč, ale ne answer key ani privátní klíč.
- `teacher_verifier.html` obsahuje privátní RSA klíč a správné odpovědi.
- Každé odevzdání používá čerstvý AES-GCM klíč a IV; AES klíč je zabalen RSA-OAEP.
- Selhání generování nebo exportu RSA klíče tvrdě zastaví sestavení balíku.
- `validateSecurePackageSmoke()` ověřuje přítomnost platného veřejného i soukromého JWK.

## Časovače

Oba studentské runtimy používají pevný deadline `Date.now() + limit`. Zobrazený zbytek se vždy dopočítá z reálného času, ne počtem tiků. Přepnutí karty, uspání telefonu ani throttling timerů proto čas nezastaví; při návratu přes `visibilitychange` nebo `focus` proběhne okamžitý přepočet a případné odevzdání.

## Stav aplikace versus stav v katalogu

`RELEASE.status = 'production-serverless'` znamená technicky ověřený stav kódu. Studio manifest záměrně používá opatrnější organizační formulaci do okamžiku formálního rozhodnutí školy. Build guard proto katalogu nedovolí předčasně deklarovat schválený produkční provoz. Tuto dvojici pravidel neměnit bez změny governance.

## Hranice

Serverless verze neřeší školní SSO, databázi, serverovou proxy API klíče, centrální uchování výsledků ani neobejitelnou autorizaci. Již stažené soubory nelze vzdáleně zneplatnit a rozpracovaný test se po reloadu plně neobnoví.
