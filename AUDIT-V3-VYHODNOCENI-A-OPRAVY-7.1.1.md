# Vyhodnocení auditu V3 a provedené opravy — Generátor testů 7.1.1

**Datum vyhodnocení a oprav:** 16. 7. 2026  
**Vstup:** audit Claude Fable 5 Max nad verzí 7.1.0 a dodaný zdrojový ZIP  
**Výstup:** verze 7.1.1

## Celkový verdikt

Audit je mimořádně kvalitní a převážná většina tvrzení odpovídala skutečnému kódu. Potvrdily se všechny čtyři kritické nálezy, všech pět vysokých nálezů a většina středních i dokumentačních připomínek. Nešlo jen o teoretické výhrady: K1–K3 reálně oslabovaly nebo blokovaly dodávkový řetězec a PWA, K4 umožňoval zastavit odpočet na pozadí, V3 představoval klasickou CSV formula injection a V5 porušoval vlastní fail-closed pravidlo secure režimu.

Opravy byly provedeny bez změny základní koncepce aplikace. Dvě doporučení byla záměrně realizována jinou variantou:

1. U aktualizace service workeru byla místo podmíněného automatického reloadu odstraněna kombinace `skipWaiting` + reload. Nová verze se aktivuje až po zavření starých karet, takže nerozbije rozpracovanou práci.
2. U Gemini je použit přesný limit `65536` výstupních tokenů. `thinking_level` není natvrdo nastaven, aby se zachovalo výchozí chování konkrétního modelu a kompatibilita záložních modelů.

---

# 1. Kritické nálezy

## K1 — kontaminovaný `package-lock.json`

**Verdikt:** souhlasím, potvrzeno.  
Všechna pole `resolved` původně mířila na interní OpenAI/CAAS Artifactory. Čisté `npm ci` mimo toto prostředí by nebylo spolehlivě přenositelné.

**Provedeno:**
- lockfile byl regenerován a normalizován na veřejné adresy `https://registry.npmjs.org/`;
- přidán `scripts/check-lockfile-registry.mjs`, který build zablokuje při nalezení interního registru;
- přidán `scripts/normalize-lockfile-registry.mjs`, protože toto pracovní prostředí transparentně používá interní proxy i při veřejně nastaveném registru;
- kontrola je součástí `npm test` a release checklistu.

**Ověření:** 108 veřejných `resolved` URL, 0 interních; čisté `npm ci` proběhlo úspěšně.

## K2 — GitHub Actions nespouštěly testy

**Verdikt:** souhlasím, potvrzeno.  
Workflow skutečně pouze sestavil a nasadil aplikaci.

**Provedeno:** `.github/workflows/deploy.yml` nyní před nasazením provádí:
- `npm ci`;
- `npm test`;
- `npm run test:headless`;
- `npm audit --audit-level=high`.

Nasazení je možné až po úspěchu všech kroků.

## K3 — service worker se nemohl nainstalovat

**Verdikt:** souhlasím, potvrzeno.  
`CORE_ASSETS` obsahoval `access-manifest.json`, který build nevytvářel. Atomické `cache.addAll()` proto mohlo shodit celý install event.

**Provedeno:**
- odstraněn `access-manifest.json` z precache i fetch logiky;
- odstraněn mrtvý `src/access-manifest.json`;
- původní úzký sensitive-data check nahrazen obecným skenem veřejných zdrojů;
- přidán `scripts/check-sw-precache.mjs`, který po buildu ověřuje existenci každého souboru v `CORE_ASSETS`;
- kontrola je součástí `npm test`.

**Ověření:** všech 10/10 precache položek existuje v `dist/`.

### Dodatečný nález při opravě K3 — mazání cizích cache

Audit tento bod nezmínil, ale původní `activate` handler mazal všechny cache stejného webového originu kromě aktuální cache Generátoru. Na společné GitHub Pages doméně by tak mohl odstranit cache AI Studia nebo jiných aplikací. Mazání je nyní omezeno na klíče začínající vlastním prefixem `generator-testu-pwa-v`; kontrola izolace je součástí `check-sw-precache.mjs`.

## K4 — odpočet šel zastavit přepnutím aplikace

**Verdikt:** souhlasím, potvrzeno.  
Oba runtimy používaly dekrement po jednotlivých ticích, takže throttling nebo pozastavení timerů prodlužovalo test.

**Provedeno:**
- secure i instant runtime používají pevný deadline `Date.now() + limit`;
- zbývající čas se vždy znovu dopočítává z rozdílu deadline a aktuálního času;
- přepočet probíhá také při návratu k viditelné kartě a při focusu;
- secure runtime přepočítá čas i tehdy, když je test po odchodu zamčený;
- zachován režim bez časového limitu i násobič času pro podpůrná opatření;
- přidána trvalá statická kontrola `check-deadline-timers.mjs`.

---

# 2. Vysoká závažnost

## V1 — cacheFirst zmrazoval centrální `app-guard.js`

**Verdikt:** souhlasím. Po opravě K3 by se problém stal aktivním.

**Provedeno:** všechny same-origin požadavky pod `/AI-Studio-GHRAB/` používají `networkFirst`. Online se vždy načte čerstvá bezpečnostní komponenta; poslední úspěšná odpověď slouží pouze jako offline fallback.

**Vědomý kompromis:** offline zařízení může do dalšího připojení použít naposledy známý permit/guard. Toto omezení je výslovně popsáno v `SECURITY.md` a provozních pravidlech.

## V2 — automatický reload mohl zahodit práci

**Verdikt:** souhlasím s nálezem, zvolena čistší varianta z auditu.

**Provedeno:**
- odstraněn `skipWaiting()`;
- odstraněn listener `controllerchange → location.reload()`;
- nový worker se aktivuje až po zavření starých karet;
- při první instalaci ani při aktualizaci se aplikace sama nereloaduje.

Tato varianta má o něco pomalejší rollout, ale nulové riziko automatického přerušení rozpracovaného generování.

## V3 — CSV formula injection

**Verdikt:** souhlasím, potvrzeno.

**Provedeno:** jednotná funkce `csvCell` před hodnoty začínající `=`, `+`, `-`, `@`, tabulátorem nebo CR přidá apostrof a teprve potom provede běžné CSV escapování. Ochrana se tím vztahuje na všechny exportované sloupce používající tuto funkci.

## V4 — tiché selhání `localStorage`

**Verdikt:** souhlasím, potvrzeno.

**Provedeno:**
- zaveden `safeSetItem()`;
- při první chybě zápisu se zobrazí výrazné upozornění, že změny nebyly uloženy;
- snapshot neukazuje falešné „Uloženo“;
- šablona nehlásí úspěch, pokud zápis selže;
- wrapper používají snapshoty, šablony, historie i migrační zápisy.

## V5 — selhání RSA generování nezastavilo secure balíček

**Verdikt:** souhlasím, potvrzeno.

**Provedeno:**
- výjimka z `crypto.subtle.generateKey` se již nepolyká a sestavení secure balíčku tvrdě skončí;
- odstraněny mrtvé konfigurační větve `crypto`/`cryptoError` a pozdní varování ve verifieru;
- smoke validace nyní navíc ověřuje přítomnost platného veřejného RSA JWK ve studentském HTML a privátního RSA JWK ve verifieru.

---

# 3. Střední a nízké nálezy

## S1 — localhost jako official

**Verdikt:** souhlasím.  
`localhost` a `127.0.0.1` jsou nyní klasifikovány jako `local`, nikoli `official`.

## S2 — mrtvá větev a politika `file://`

**Verdikt:** souhlasím s technickým nálezem. Politiku bylo nutné rozhodnout.

**Zvolená politika:** secure balíček z lokální kopie může vytvořit pouze centrálně ověřený administrátor a až po výslovném potvrzení varování. Běžný uživatel je zablokován. Mrtvá podmínka a zastaralý komentář byly odstraněny.

## S3 — vypnuté `no-undef`

**Verdikt:** souhlasím; přínos je vysoký.

**Provedeno:**
- přidán AST generátor `scripts/generate-eslint-globals.mjs`;
- před lintem vygeneruje seznam top-level globálů všech projektových modulů;
- `no-undef` je nyní `error`;
- browser globals pocházejí z balíčku `globals`;
- `no-redeclare` zůstává vypnuto kvůli záměrné architektuře sdíleného globálního scope.

**Skutečně nalezená chyba:** nové pravidlo odhalilo mrtvý odkaz `EXERCISE_SCORE_ALIAS` v Test Labu. Odkaz byl odstraněn a lint prochází. To potvrzuje praktickou hodnotu změny.

## S4 — parametry Gemini 3.x

**Verdikt:** převážně souhlasím.

**Provedeno:**
- odstraněna vlastní `temperature: 0.45`, takže model používá doporučený default;
- `maxOutputTokens` zvýšen na přesný limit `65536`;
- `thinking_level` nebyl natvrdo přidán. Výchozí úroveň modelu se tím nemění a záložní modely nedostanou parametr, který nemusí podporovat stejně.

## S5 — nekonzistentní učitelské přihlášení

**Verdikt:** souhlasím.  
Secure runtime již nepřijme prázdné jméno, pokud je očekávané učitelské jméno v konfiguraci nastaveno. Chování odpovídá instant runtime.

## S6 — možný únik listening zdroje

**Verdikt:** souhlasím jako defense-in-depth.

**Provedeno:** u listening comprehension se ze studentské položky explicitně odstraňují `source`, `text`, `passage`, `source_url` a `audio_url` vedle již odstraňovaného transkriptu.

## S7 — retry drobnosti

**Verdikt:** souhlasím, funkční dopad byl malý.

**Provedeno:** odstraněn no-op `replace`, sloučeno identické větvení a doplněn komentář, že limit 503 pokusů platí pro každý model zvlášť.

## S8 — náhoda, WebView regex, mrtvé modal ID

**Verdikt:** souhlasím, nízká priorita.

**Provedeno:**
- `randomChunk` používá rejection sampling bez modulo bias;
- detekce Android WebView již nehledá holé `wv` kdekoli v User-Agentu;
- odstraněn neexistující `accAdminModal` ze seznamu ESC modalů.

## S9 — trvalý očekávaný warning v headless testu

**Verdikt:** souhlasím.

**Provedeno:** self-test bodování bez vygenerovaného testu je nyní vykázán jako jeden očekávaný skip. Jakýkoli jiný warning je neočekávaný a headless běh shodí.

**Aktuální výsledek:** `26 pass / 0 neočekávaných warn / 0 fail`, plus 1 očekávaný skip.

---

# 4. Dokumentace a úklid

## D1 — README

**Verdikt:** souhlasím.  
README bylo přepsáno podle skutečné centrální permit brány, aktuálního CI, reálných headless kontrol, současné struktury modulů a PWA strategie. Starý aktivační kód, lokální PIN, query parametry a access manifest byly odstraněny.

## D2 — ARCHITEKTURA

**Verdikt:** souhlasím.  
Dokument byl aktualizován a zbytečné pevné odkazy na staré verze odstraněny. Doplněna současná přístupová vrstva, service worker, deadline timery a governance statusů.

## D3 — PROVOZNÍ PRAVIDLA

**Verdikt:** souhlasím.  
Sekce přístupů nyní popisuje AI Studio, podepsaný permit, centrální revokaci a lokální odebrání přístupu. Starý export manifestu a místní PIN byly odstraněny.

## D4 — jednorázové artefakty v kořeni

**Verdikt:** souhlasím.

**Provedeno:** uvedené komentáře, návody k nahrání a staré opravy byly přesunuty do `docs/release-notes/`; prázdný stub `README_PWA.md` byl odstraněn.

## D5 — `dist/` a `archive/`

**Verdikt:** souhlasím.

**Provedeno:**
- `archive/` byl odstraněn;
- distribuční ZIP neobsahuje `dist/`, `node_modules/` ani `.git`;
- CI vytváří `dist/` samo.

Poznámka: při nahrání opraveného balíčku do existujícího Git repozitáře se odstranění trackovaného `dist/` projeví jako mazání souborů v commitu; `.gitignore` už následnému opětovnému přidání brání.

## D6 — production-serverless vs. řízený pilot ve Studiu

**Verdikt:** souhlasím s auditem, logika se nemá měnit.

**Provedeno:** status `production-serverless` zůstává technickým stavem samotné aplikace. Katalog AI Studia může současně uvádět „Připraveno k řízenému pilotu“, protože jde o organizační schválení školy. Rozdíl je vysvětlen v `ARCHITEKTURA.md` a komentáři build pravidla.

---

# 5. Další závěry k objektivnímu hodnocení auditu

S pozitivním hodnocením testovací kultury, privacy-by-design, kryptografické koncepce, prompt-injection obrany a transparentních UX textů souhlasím. Kontroly skutečně pokrývají rozsáhlou matici režimů a secure balíček je navržen podstatně pečlivěji než běžná hobby aplikace.

Souhlasím také s hlavním negativním závěrem: největší slabinou nebyla vlastní doménová logika, ale proces vydávání a nedokončený úklid migrace 7.0.6. Verze 7.1.1 proto posiluje především dodávkový řetězec, PWA konzistenci a fail-closed pojistky.

Audit správně připomíná serverless strop. Šifrovaný answers soubor a lokální zámky zvyšují integritu a dohledatelnost, ale nenahrazují školní server, online identitu a dozor učitele. Dokumentace tuto hranici nadále uvádí otevřeně.

---

# 6. Přijatá rozhodnutí za správce

1. **Aktualizace SW:** bez automatického reloadu; aktivace po zavření karet.
2. **Guard:** `networkFirst`, cache pouze jako offline fallback.
3. **Lokální secure balíček:** pouze ověřený admin + výslovné potvrzení.
4. **Studio katalog:** ponechat „řízený pilot“ do organizačního schválení školy.
5. **Repo:** release poznámky přesunout do `docs/`, `archive` odstranit, `dist` nedistribuovat.

---

# 7. Závěrečná verifikace

Provedeno z čistého stavu po odstranění `node_modules` a `dist`:

- `npm ci` — PASS, 108 balíčků, 0 zranitelností;
- `npm test` — PASS;
- shoda verze 7.1.1 — PASS;
- lockfile: 108 veřejných URL / 0 interních — PASS;
- produkční invarianty — PASS;
- struktura zdrojů — PASS;
- obecný sken citlivých údajů — PASS;
- deadline timer check — PASS;
- ESLint s `no-undef` — PASS, 766 projektových globálů;
- build z 29 JS modulů — PASS;
- SW precache 10/10 — PASS;
- workflow audit — **28 PASS / 0 FAIL**;
- `npm run test:headless` — PASS;
- Test Lab — **26 pass / 0 neočekávaných warn / 0 fail**, 1 očekávaný skip;
- `npm audit --audit-level=high` — **0 zranitelností**.
- výsledný ZIP bez `node_modules`, `dist` a `.git` byl samostatně rozbalen; z něj znovu prošly `npm ci`, `npm test`, `npm run test:headless` i bezpečnostní audit.

## Co nelze poctivě označit za provedené v tomto lokálním prostředí

Nebylo možné provést skutečný smoke test po nasazení na veřejnou GitHub Pages adresu, fyzické přepnutí mobilní aplikace na dvě minuty, otevření exportu ve stolním Excelu ani reálné naplnění kvóty konkrétního školního browser profilu. Pro tyto čtyři provozní scénáře je připraven přesný checklist v `RELEASE-CHECKLIST.md`.

---

# 8. Výsledný stav

Verze 7.1.1 opravuje všechny potvrzené kritické a vysoké nálezy z auditu. Automatické kontroly jsou zelené a nově chrání právě třídy regresí, které audit odhalil: interní lockfile registry, neexistující SW precache položky, tikající místo deadline timerů a neznámé globální symboly.
