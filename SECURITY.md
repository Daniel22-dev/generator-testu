# Bezpečnostní hranice serverless verze

Generátor běží jako klientská PWA bez školního backendu. Je technicky připraven k řízenému používání, ale jeho bezpečnostní model má jasné hranice.

## Ochrany, které aplikace poskytuje

- povinnou pseudonymizaci identit před AI požadavkem,
- hashovaný diferenciační roster ve studentském HTML,
- odmítnutí neznámého identifikátoru,
- oddělení studentského výstupu a učitelského verifieru,
- odstranění answer key ze secure studentského balíku,
- hybridní šifrování AES-GCM + RSA-OAEP,
- fail-closed sestavení při chybě kryptografie,
- deadline časovače odolné proti throttlingu karty,
- centrálně podepsaný permit AI Studia,
- verzovaný PWA cache systém bez automatického reloadu práce,
- kompletní CI bránu před nasazením.

## Identity v diferenciaci

Do promptu se místo skutečných identit posílají kódy `Student A1…`. Studentský soubor obsahuje náhodnou sůl testu a SHA-256 `studentHashes`, nikoli čitelný roster. Protože je sůl veřejná, běžná jména lze teoreticky hádat slovníkovým útokem; pro ostré testy se proto používají náhodné jednorázové kódy.

## Data odesílaná do Gemini

Do Gemini mohou být odeslány texty formuláře, pedagogické podmínky, zvolené URL a přílohy. Aplikace neumí spolehlivě odstranit osobní údaje vložené do volného textu nebo dokumentu. Učitel musí před odesláním odstranit zdravotní a psychologické údaje, kázeňské záznamy, rodná čísla, adresy, kontakty, individuální hodnocení propojené s identitou a neveřejné dokumenty bez oprávnění.

Gemini 3.x používá výchozí sampling. Aplikace záměrně nesnižuje `temperature`, protože to může u reasoning modelů zhoršit výstup. Maximální výstup je nastaven na 65 536 tokenů; validita JSON zůstává jištěna formátem odpovědi a opravnou vrstvou.

## API klíč

Klíč pracuje v prohlížeči a nelze jej chránit stejně jako serverové tajemství. Každý učitel používá vlastní omezený klíč, nesdílí jej, na sdíleném zařízení jej neukládá trvale a při podezření na únik jej okamžitě zneplatní.

## Centrální přístupová brána

Veřejný build je inertní, dokud `app-guard.js` AI Studia neověří podpis, platnost, roli, povolenou aplikaci a revokaci permitu. Generátor nemá vlastní PIN ani `access-manifest.json`.

Přesto jde stále o klientskou kontrolu. Není to:

- školní SSO,
- serverově ověřená identita,
- neobejitelná autorizace,
- centrální auditní systém.

### Offline kompromis

Service worker načítá `/AI-Studio-GHRAB/` strategií `networkFirst`. Online je guard vždy čerstvý. Offline se použije poslední známá cache, takže zařízení může do příštího připojení pracovat s dříve platným permitem. Jakmile se připojí, čerstvý guard a revokace se uplatní. Pro práci s vysokým rizikem se vyžaduje online ověření před začátkem.

## PWA aktualizace

Service worker nepoužívá `skipWaiting`; nová verze se aktivuje až po zavření starých karet. Tím se eliminuje automatický reload uprostřed generování, editoru nebo práce s hotovým testem. `check-sw-precache.mjs` ověřuje, že každá položka precache existuje v produkčním buildu.

## Časový limit testu

Časovač vychází z pevného deadline. Přepnutí do jiné aplikace, uspání telefonu nebo omezení JavaScriptových timerů čas nezastaví. Při návratu se zbytek okamžitě dopočítá a při vypršení se test odevzdá. Bezpečnostní události opuštění okna se evidují odděleně.

## Bezpečný offline balík

- Studentský soubor obsahuje veřejný RSA klíč, který slouží jen k šifrování.
- Verifier obsahuje privátní klíč a správné odpovědi; jeho únik kompromituje konkrétní balík.
- Selhání `crypto.subtle.generateKey` sestavení zastaví. Neexistuje plaintext fallback.
- Serverless model neumí prokázat, že student neupravil vlastní soubor nebo nepoužil druhé zařízení. Pro klasifikaci je nutný dozor a provozní pravidla.

## CSV export

Všechny buňky procházejí neutralizací počátečních znaků `=`, `+`, `-`, `@`, tab a CR. Jméno nebo jiný textový vstup se po otevření v Excelu nesmí vyhodnotit jako vzorec.

## Lokální úložiště

Snapshot, šablony a historie jsou v `localStorage`. Při zaplnění nebo blokaci úložiště aplikace zobrazí výrazné upozornění a nesmí hlásit úspěšné uložení. Na sdíleném zařízení se citlivé hodnoty neukládají.

## Výsledky studentů

Po dešifrování obsahují identitu nebo kód, odpovědi, časy a bezpečnostní události. Ukládají se pouze na oprávněné školní místo, nesdílejí se veřejně a do AI se neposílají bez anonymizace. Rozpracované odpovědi se po reloadu plně neobnovují.

## Veřejný repozitář

Repozitář nesmí obsahovat API klíče, hesla, osobní údaje, neveřejné dokumenty školy, ostré rostery, reálné verifier soubory ani výsledky studentů. Kontrola:

```bash
npm run check:sensitive
npm run check:lockfile
```

## Incident

1. Únik `student_test.html`: odstranit odkaz a vytvořit nový Test ID.
2. Únik `teacher_verifier.html`: považovat klíč a answer key za kompromitované a vytvořit nový balík.
3. Únik permitu nebo odchod uživatele: revokovat oprávnění v AI Studiu.
4. Únik API klíče: okamžitě jej zneplatnit a zkontrolovat využití.
5. Únik osobních údajů: postupovat podle školních pravidel pro incidenty.

Již stažený serverless HTML soubor nelze vzdáleně zneplatnit.
