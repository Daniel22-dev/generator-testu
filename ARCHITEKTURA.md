# Architektura projektu

Generátor interaktivních testů 7.0.1 je produkční serverless/PWA aplikace bez školního backendu. Zdroj je rozdělen do doménových souborů; build z něj vytváří jeden samostatný `dist/index.html` a související PWA soubory.

## Build

```bash
npm ci
npm test
npm run build
```

Build skládá vlastní HTML, CSS a JavaScript. Nezavádí runtime framework ani externí balíček do výsledné aplikace.

## Hlavní složky

- `src/shell.html` – statická HTML kostra a placeholdery.
- `src/styles.css` – kompletní vizuální vrstva.
- `src/js/` – JavaScript skládaný podle názvu souboru.
- `src/index.html` – informační ukazatel; není zdrojem aplikace.
- `public/` – PWA manifest, service worker a ikony.
- `scripts/build.mjs` – skládá produkční výstup a kopíruje PWA aktiva.
- `scripts/check-versions.mjs` – hlídá shodu verzí.
- `scripts/check-production-readiness.mjs` – hlídá produkční stav, modely, soukromí, nápovědu a klíčové prvky přístupnosti.
- `scripts/check-source-structure.mjs` – hlídá rozdělení velkých bloků.
- `scripts/check-sensitive-data.mjs` – kontroluje veřejný access manifest.
- `tools/headless-check.mjs` – funkční regresní test v jsdom.
- `.github/workflows/deploy.yml` – testovaný deploy na GitHub Pages.

## Kontrakt pořadí modulů

JavaScriptové soubory nejsou ES moduly s `import/export`; build je konkatenace. Pořadí je proto součástí architektury.

1. Prefixy `01-` až `16-` určují pořadí hlavní aplikace.
2. Bezpečný export je rozdělen na `13a` až `13g`.
3. Build HTML testů je rozdělen na `14a` až `14d`.
4. `50-cs-module.js` rozšiřuje hlavní aplikaci a musí následovat až po ní.
5. `60-pwa.js` se skládá jako poslední.
6. Přejmenování nebo přesun souboru vyžaduje kompletní `npm test`.

## Datový tok AI

1. Učitel vyplní konfiguraci, zdroje a případné přílohy.
2. `buildPrompt()` sestaví strukturované zadání.
3. Diferenciační identity jsou vždy nahrazeny kódy `Student A1`, `Student A2` atd.
4. Před prvním požadavkem v relaci aplikace zobrazí upozornění na přenos dat.
5. `callGeminiJSON()` odešle požadavek na zvolený model Gemini s klíčem v hlavičce `x-goog-api-key`.
6. Odpověď je validována, opravena nebo odmítnuta podle očekávaného formátu.
7. Generátor sestaví studentský HTML výstup a případně učitelský verifier.

Volný text, podmínky skupin a přílohy mohou stále obsahovat osobní údaje; odpovědnost za jejich odstranění zůstává na uživateli.

## Datový tok diferenciace

1. V pracovní relaci má skupina název, pedagogické podmínky a seznam jmen nebo kódů.
2. Do promptu pro AI jde pouze pseudonymizovaný seznam `Student A1…`.
3. Při exportu `buildPublicDiffGroups()` vygeneruje náhodnou sůl testu a SHA-256 otisky normalizovaných identifikátorů.
4. `student_test.html` obsahuje pouze `studentHashes`, sůl a veřejné vlastnosti skupiny; čitelný roster se nevkládá.
5. Student zadá identifikátor, runtime vytvoří stejný hash a vybere odpovídající variantu.
6. Neznámý identifikátor je odmítnut, nikoli přesměrován na výchozí variantu.
7. U režimu jednorázových kódů může privátní mapování zůstat pouze v `teacher_verifier.html`.

## Bezpečný offline balík

- `student_test.html` neobsahuje správné odpovědi ani privátní klíč.
- `teacher_verifier.html` obsahuje answer key a privátní RSA klíč.
- Po odevzdání student vytvoří `SECURE-ANSWERS-V1`.
- Payload odpovědí je šifrován AES-GCM; symetrický klíč je zabalen RSA-OAEP veřejným klíčem verifieru.
- Oba HTML soubory mají SHA-256 integritní otisky.
- Serverless architektura neumí vzdáleně zneplatnit již staženou kopii.

## Modely a limity

Výchozí stabilní model je definován jedinou konstantou v `src/js/07-gemini.js`. Záložní model je odlišný a použije se pouze v omezených situacích. Starší uložené názvy modelů se migrují na aktuální varianty.

Aplikace nezobrazuje pevné univerzální hodnoty kvót. Aktivní limity závisejí na projektu, účtu, modelu a tarifu a uživatel je ověřuje v Google AI Studio.

## Testovací strategie

`npm test` ověřuje statické, buildové a workflow invarianty:

- jednotnou verzi a PWA cache,
- produkční status,
- povinnou pseudonymizaci před AI,
- hashovaný roster ve studentském výstupu,
- nepřítomnost čitelného seznamu studentů v runtimu,
- odmítnutí zastaralých bezpečnostních tvrzení v interní nápovědě,
- aktuální výchozí a záložní model,
- kontrakt URL a hlavičky Gemini požadavku,
- klíčové ARIA role a popisky,
- strukturu rozdělených modulů,
- veřejný access manifest,
- ESLint,
- produkční build,
- workflow matici: 576 režimových kombinací, všechny šablony, jazyky, české presety, typy cvičení, viditelnosti polí, obnovu starých stavů a runtime identit,
- bezpečné vložení JSON.

`npm run test:headless` samostatně ověřuje spuštění aplikace bez JS chyb, sestavení promptu a exportu, jazykové režimy, jednoduché šablony, interní Test Lab, PWA soubory a secureOffline balík bez answer key a čitelného rosteru.

## Záměrně neřešené části

- školní server a SSO,
- serverová správa API klíče,
- databáze a centrální výsledky,
- neobejitelná serverová autorizace,
- centrální auditní log,
- úplné obnovení rozpracovaného studentského pokusu po reloadu nebo pádu.

Tyto části nejsou součástí verze 7.0.1 a musí být řešeny provozními pravidly nebo budoucí serverovou etapou.
