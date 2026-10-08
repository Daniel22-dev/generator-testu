> **7.1.99 – otevření Google Forms + širší Teacher Verifier V2.** Nový Google Form se při povoleném popupu otevírá pouze v nové kartě; odevzdávací kód zůstane na kartě testu. Verifier V2 využívá šířku desktopu. V blokovaném popupu zůstává původní navigační fallback. Podrobnosti [RELEASE-NOTES-7.1.99.md](RELEASE-NOTES-7.1.99.md).

> **7.1.98 – classroom hotfix.** Identity-bound outbox recovery, fresh-start click-through protection, confirmed manual submit, expired-resume explanation and BFCache hardening. Viz [RELEASE-NOTES-7.1.98.md](RELEASE-NOTES-7.1.98.md).

> **7.1.97 – Google Forms workflow F1–F9 hardening.** Teacher Verifier nese pevné Forms nastavení, používá důvěryhodné START/END značky z původního CSV, podporuje ruční korekci časového okna a explicitní potvrzení chybné identity. Serverový Forms timestamp nesmí předcházet START značce; desetiminutová tolerance platí jen pro klientský čas zahájení. Performance budget byl pro nový workflow kontrolovaně navýšen. Skutečný školní Form a fyzický iPhone/Android zůstávají provozními acceptance testy. Viz [RELEASE-NOTES-7.1.97.md](RELEASE-NOTES-7.1.97.md).

> **7.1.96 – Teacher Verifier / Google Forms UX.** Čas zveřejnění se zadává jako české datum + čas v Europe/Prague; verifier automaticky řeší CET/CEST. Univerzální Form s `Limit to 1 response = OFF` je podporovaný; povinně se potvrzuje původní nezměněný CSV export. Studentský runtime a scoring se nemění. Viz [RELEASE-NOTES-7.1.96.md](RELEASE-NOTES-7.1.96.md).

> **7.1.95 – kritická oprava opakovaného náhledu.** Každé otevření učitelského náhledu dostává nový iframe; zavření starý browsing context zničí. Přidány regresní scénáře pro opakované otevření instant i secure testu a PWA cache bump. Viz [RELEASE-NOTES-7.1.95.md](RELEASE-NOTES-7.1.95.md).

> **7.1.94 – UX Readingu, AI posudek, náhled a Google Forms.** Opravený učitelský náhled, přehlednější Reading a AI posudek, přesunuté ověření Google Forms a sjednocené E2E/security workflow. Release prošel standardními P5/performance gate opravami bez zvýšení limitů. Viz [RELEASE-NOTES-7.1.94.md](RELEASE-NOTES-7.1.94.md).

> **7.1.93 – uchování výsledkové historie a soukromé časové plány.** Řízené studentské testování; další nezávislou revizi vlastník výslovně vynechal, fyzické zkoušky dosud neproběhly. Nasazení přes chráněnou certifikaci `candidate` a `main`. Viz [RELEASE-NOTES-7.1.93.md](RELEASE-NOTES-7.1.93.md).

> **7.1.90 – opravy cíleného auditu před studentským testováním (4.–5. 10. 2026).** Navazuje na 7.1.89. Úlohy s mezerou uznají doplnění i celou větu; po randomizaci verifier ukáže číslo, které viděl student; error-tagging nemíchá slova věty; výsledky ukazují typ cvičení a mají výběr studenta; iPhone/iPad klávesnice nevyvolá falešný zámek ani split. Mobilní chování je zatím automatizovaně ověřeno emulací; fyzické device gates zůstávají. Viz [RELEASE-NOTES-7.1.90.md](RELEASE-NOTES-7.1.90.md).

> **7.1.89 - workflow source candidate.** Last-minute recipient selection in Sheets, Reading provenance and source modes, stacked dialogs, suitability advice and display numbering after shuffle. Full CI and a separate Apps Script installation are required; no deployment was performed. See [release notes](RELEASE-NOTES-7.1.89.md), [Czech instructions](NAVOD-ROZESILANI-7.1.89.txt) and [validation limits](QA-WORKFLOW-7.1.89.md).

> **7.1.88 — audit a opravy workflow.** Výběr cvičení, Reading/Listening dialogy, přesné opravné fragmenty a vybraní nebo odložení účastníci. Viz [RELEASE-NOTES-7.1.88.md](RELEASE-NOTES-7.1.88.md). Rozsah vydání zůstává řízená studentská red-team zkouška; E6 je odložené a fyzické E7 naplánované na 6. a 9. 10. 2026.

> **Historický checkpoint 7.1.80 — RED-TEAM v2 / E4.** Pokus i zašifrovaný výsledek přežijí restart ve stejném profilu. Outbox obnoví přerušené odevzdání, podporované Web Locks brání souběhu karet a soukromá replay evidence verifieru přetrvá restart. Úplné smazání storage, anonymní režim a jiný profil jsou **ARCHITECTURAL LIMIT – SERVER TRUST REQUIRED**. Původ runtime zůstává CLIENT-CONTROLLED; známky vyžadují REVIEW_REQUIRED. **NOT READY – BLOCKING ISSUE:** E5–E10 a F7 čekají. Viz RELEASE-NOTES-7.1.80.md.

> **7.1.75 — bezpečnostní rozdělení credentialů.** Teacher/Admin secret je tajný privilegovaný údaj pouze pro učitele; Classroom Recovery Code je per-test provozní kód pouze pro odemknutí aktuálního zámku. Obě větve mají oddělenou kryptografickou doménu, Recovery Code nemůže otevřít teacher panel/retry/reset a raw credentialy se neukládají do studentského HTML, historie, šablon, exportu zadání ani AI/manual promptů. Viz RELEASE-NOTES-7.1.75.md.

> **7.1.74 — zpevnění workflow žolíka.** Po spuštění bezpečného testu se volba žolíka, identita pokusu, attempt ID, deadline a stav zámku lokálně zapečetí; běžný reload už nemůže změnit volbu ani resetovat čas. Verifier žolíkový pokus zachová pro kontrolu a bezpečnost, ale vyřadí jej z klasifikačních statistik; CSV obsahuje explicitní stav žolíka/klasifikace. D7 navíc obsahuje klikací Chromium regresní test tohoto workflow. Viz RELEASE-NOTES-7.1.74.md.

> **7.1.73 — iPadOS klávesnice + workflow Verifieru.** Zavření softwarové klávesnice systémovým tlačítkem na iPadu už nemá vyvolat falešný zámek testu; skutečné opuštění stránky a split-screen monitoring zůstávají aktivní. Teacher Verifier nyní nabízí Google Forms CSV jako první a doporučenou cestu, nouzovou zálohu až pod ní a po importu/exportu zobrazuje viditelné potvrzení. Viz RELEASE-NOTES-7.1.73.md.

> **7.1.72 — GARP 2.8 hardening + PDF layout.** Bezpečnostní workflow mají oddělené minimální pravomoci, přidán frame guard a další redakce citlivých klíčů. Přímé student/teacher PDF nyní používá konzistentní horní/dolní okraj a nenechává nadpis nového cvičení osamocený na konci stránky. Viz RELEASE-NOTES-7.1.72.md.

> **7.1.70 — D7 / CI hardening.** Povinná release cesta nově zahrnuje reálné PDF runtime/quality kontroly, D2/D4/D5 regresní testy a Safe Promotion čeká na zelené P5 i Journey E2E pro stejný SHA. D4–D6 produkční logika zůstává beze změny. Viz RELEASE-NOTES-7.1.70.md.

> **7.1.67 — D4 / Teacher Verifier theme + fullscreen.** Teacher Verifier má skutečný tmavý i světlý motiv napříč kartami, tabulkami, vstupy a modaly; fullscreen sleduje stav prohlížeče přes `fullscreenchange`, mění stav ovládacího prvku a při nepodporovaném/odmítnutém API dává konkrétní fallback. D1–D3 zůstávají funkčně beze změny. Viz RELEASE-NOTES-7.1.67.md.

> **7.1.63 — Etapa 3 / přímé PDF.** Teacher Verifier umí přímo stáhnout studentské PDF i učitelské PDF s klíčem bez tiskového dialogu, zachovává tiskový fallback, českou diakritiku a vložené školní logo. Součástí release je také rekalibrovaný statický performance budget; scoring, kryptografie a secure submission kontrakty zůstávají beze změny. Viz RELEASE-NOTES-7.1.63.md.

> **7.1.62 — Teacher Verifier 2.0 / Etapa 2.** New dashboard-based verifier UX with separated Results, Analysis, Security, Test & PDF, Export and Technical sections; scoring, cryptography and secure submission contracts remain unchanged. See RELEASE-NOTES-7.1.62.md.

> **7.1.61 — Stage A functional fixes.** Secure template prefill v3, teacher-controlled Reading/Listening counts, differentiation propagation, corrected YouTube routing and content-drift detection. See RELEASE-NOTES-7.1.61.md.

> **7.1.60 — final pre-server Forms workflow.** See RELEASE-NOTES-7.1.60.md.

> **7.1.59 — workflow / user-journey audit.** Učitel dokončí test bez hádání: rozdíly AI klíče se rozhodují po položkách a nezmizí, chyby AI říkají „Co dál“, změny nastavení po vygenerování jdou použít bez AI, přísný test vysvětluje odemčení a studentské texty odpovídají jazyku testu. Viz RELEASE-NOTES-7.1.59.md.

> **7.1.58 — odolné dávkové generování.** Hotové části a analýza Readingu se při chybě zachovají v relaci, další pokus naváže od nedokončené dávky a jeden logický AI požadavek už nemůže násobit timeout přes několik fallback modelů.

> **7.1.57 — AI dostupnost a diagnostika.** Kvalitní profil používá aktuální stabilní Gemini 3.8 Flash, vyvážený profil Gemini 3.7 Flash a při providerové nedostupnosti se zkouší více stabilních fallbacků. Chybová hláška nově zachovává HTTP stav a interní kód pro přesnou diagnostiku.

> **7.1.54 — úklid a zrychlení otevírání.** Service worker nezměněnou stránku aplikace při otevření znovu nestahuje, jen ověří její aktuálnost u serveru. Odstraněno 17 nevolaných funkcí a sestavovací skript je čitelný. Chování aplikace se nemění. Aktivní bezpečnostní autorita zůstává GARP 2.7; GARP 2.5.1 zůstává regresním základem.

# Generátor interaktivních testů

**Aktuální verze:** 7.1.99 (Forms tab + Teacher Verifier V2 width hotfix; exact-SHA release gates required)

> **7.1.59 Workflow audit (2026-09-29):** jednotný stavový model finálního workflow, akční chybové hlášky, hlídání změn nastavení po vygenerování, opravy studentských textů; viz RELEASE-NOTES-7.1.59.md.

> **7.1.58 Odolné generování (2026-09-28):** úspěšné dávky se během jednoho otevřeného okna checkpointují, Reading analýza se při stejném zadání znovu neopakuje, logický AI požadavek má společný časový strop a batching už neodděluje úlohu jen proto, že podporuje ruční editor.

> **7.1.57 AI dostupnost (2026-09-28):** opraveno providerové mapování a diagnostika. Generování používá aktuální stabilní profily a více fallbacků; při chybě se neztratí bezpečný HTTP stav a interní kód. Scoring, verifier, secure runtime ani GARP autorita se nemění.

> **7.1.55 O aplikaci (2026-09-27):** hlavička používá jednotný vstup **O aplikaci**. Karta obsahuje účel aplikace, autora a vývojového garanta, školní projekt, určení a přístup, technický stav, provozní zásady a nápovědu. Dosavadní changelog je zachován jako rozbalovací **Katalog změn** s oddělenou historií hlavního Generátoru a modulu Český jazyk. Generování, scoring, secure runtime, AI prompty ani bezpečnostní model se nemění.

> **7.1.54 Úklid a zrychlení (2026-09-27):** navigace na stránku aplikace používá v service workeru podmíněné ověření (`cache: 'no-cache'`) místo úplného obejití HTTP cache; nezměněná stránka se nestahuje znovu (odpověď 304), nová verze se projeví okamžitě. Odstraněno 17 nevolaných funkcí, `scripts/build.mjs` přepsán čitelně (výstup `dist` bajtově shodný). Rozhraní, bodování, secure runtime, AI prompty ani bezpečnostní model se nemění.

> **7.1.53 UX hotfix (2026-09-26):** Simple panel „Upravit položky a body“ lze znovu sbalit; po sbalení se vrací karty typů cvičení se synchronizovaným výběrem. Kontextová nápověda typů má neprůhledné pozadí a preferuje umístění vedle karty. Karty účelu testu nyní stručně popisují reálné chování Procvičování, Běžného a Přísného testu bez zbytečných poznámek o režimech.

> **7.1.52 Exercise UX + Simple detail controls (2026-09-25):** typy cvičení jsou uspořádané do pedagogických kategorií s hover/focus/touch nápovědou a příklady; stará rozbalovací nápověda byla odstraněna. Jednoduchý režim nově dovoluje volitelně upravit typ, počet položek a body po jednotlivých cvičeních, zatímco ruční/technické ovládání zůstává pouze v Pokročilém režimu. Součástí buildu je parity gate pro 38/38 nápověd i základní Simple-mode kontrakt.

> **7.1.51 Reading AI registry hotfix (2026-09-25):** Reading se zdrojem je povolen konzistentně v Simple i Advanced a napříč účely testu. Runtime AI registr je synchronizován s veřejným kontraktem; nový fail-closed gate blokuje budoucí drift registrů před buildem/releasem.

> **7.1.50 GARP 2.7 r2 / G-02 (2026-09-24):** přidává aplikační GARP 2.7 policy/inventory/trust adapter, fail-closed architecture a mutation brány, auto-patch admission a externě připnutý CI trust anchor. Zachovává D3 a AGENTIC=PARTIAL; serverové LIVE kontroly jsou nadále NOT_TESTED.

> **7.1.49 Priorita tématu Readingu (2026-09-23):** pokud učitel explicitně vybere nebo zadá téma Readingu, je povinným tematickým rámcem. Zdroj ho nesmí přepsat; podle režimu zdroje se přenášejí pouze přirozeně slučitelné prvky a nevhodná vocabulary/obsah se nenutí do textu.

> **7.1.48 Přehlednější práce se zdrojem (2026-09-23):** Simple režim používá vždy Automaticky. Advanced režim zobrazuje šest voleb jako přehledné karty s krátkým popisem přímo na kartě a plným tooltipem; přepnutí zpět do Simple bezpečně vrací režim zdroje na Automaticky.

> **7.1.47 Workflow zdrojů + Reading (2026-09-22):** Simple i Advanced používají stejné tři účely testu; Advanced pouze předvyplní technické volby. Zdrojový materiál má explicitní režimy použití a Reading se zdrojem používá samostatnou analýzu podkladu před generováním. CEFR je pro Reading explicitní a poznámky k souborům/URL se propisují do AI promptu. Jazykově specifické scoringové/ortografické změny nejsou součástí této verze.

> **7.1.45 AI Core + workflow cleanup (2026-09-19):** konkrétní modely jsou skryté za profily AI Core; Poradce je uzemněný v relevantní KB + aktuálním stavu; Google Forms jsou samostatná cesta předání secure výsledků a legacy týmový bezpečnostní kód byl odstraněn jako neúčinná vrstva.

> **7.1.44 Etapa 6 – MASTER cleanup (2026-09-18):** metadata-only patch bez změny aplikační logiky. Interní pre-release `release-acceptance.json` je přesunut z `public/` do `src/config/`, takže se už nepublikuje do runtime `dist`. Živý stav releasu dokládá `release-integrity.json` a AI Studio release-wave.

> **7.1.42 Etapa 5 – ostrý auto-patch E2E (2026-09-18):** bez změny aplikační logiky. Jde o kontrolní patch nad přijatým 7.1.41 baseline. Akceptační podmínkou je celý automatický tok: chráněný release Generátoru → ověřený Pages deployment → `app-updated` → live release-integrity v2 kontrola v AI Studiu → patch-only změna `release-wave` → chráněná Safe Promotion a produkční deploy Studia.

> **7.1.41 Etapa 5 – auto-patch E2E (2026-09-16):** bez změny aplikační logiky. Jde o kontrolní patch nad schváleným baseline 7.1.40. Po úspěšném Pages deployi Generátor odešle AI Studiu událost `app-updated`; Studio musí samo ověřit live manifest, přijmout pouze patch změnu a persistovat 7.1.41 jako nový release-wave baseline.

> **7.1.40 GARP 2.5 / N5 auto-patch baseline (2026-09-16):** bez změny aplikační logiky. Verze pouze sjednocuje release metadata po uzavření N5 detekce a GARP 2.5 evidence a připravuje čistý patch baseline pro automatické přebírání dalších patch verzí AI Studiem. Před přijetím jako baseline musí projít čistým GitHub CI/deploymentem.

> **7.1.39 Etapa 6 secure unlock hotfix (2026-09-16):** exact GitHub CI 7.1.38 odhalilo jednu skutečnou produkční nekonzistenci: secure studentský runtime kanonizoval velikost písmen pro `teacher-pin`, ale ne pro `unlock-password`. Secure zámek nyní používá stejnou case-insensitive kanonizaci jako teacher-login a instant runtime; PBKDF2 domény zůstávají oddělené. Verifier, Google Forms, scoring, RSA/AES a `SECURE-ANSWERS-V1` se nemění.

> **7.1.38 Etapa 6 QA hotfix (2026-09-16):** bez změny produkční logiky. Opravuje dvě chyby workflow harnessu: instant Stage 6 scénář používá skutečné instant DOM ID/funkci a secure Stage 6 scénář při generování dočasně obnoví skutečný PBKDF2 KDF, aby se hash shodoval se studentským runtime. Samotný učitelský přístupový kód, secure/instant runtime, verifier, Google Forms, scoring i RSA/AES zůstávají funkčně stejné jako v 7.1.37.

> **7.1.37 Etapa 6 – jeden učitelský přístupový kód (2026-09-15):** Učitel už nezadává zvlášť PIN a odemykací heslo. Jeden kanonizovaný přístupový kód se při exportu odvodí do dvou různých PBKDF2 hodnot s doménami `teacher-pin` a `unlock-password`. Teacher-login a povolení dalšího pokusu ověřují jen teacher doménu; zámková obrazovka jen unlock doménu. Google Forms, verifier, scoring, `SECURE-ANSWERS-V1`, RSA/AES a Bezpečnost pracoviště zůstávají beze změny.

> **7.1.36 Etapa 5 – přehlednější Pokročilá nastavení (2026-09-15):** Pokročilý režim nově seskupuje stávající volby do pěti sekcí **Test / Student / Zpětná vazba / Bezpečnost / Vzhled**. Jde pouze o informační architekturu: používají se stejné ovladače se stejnými ID, hodnotami a validacemi. Simple režim zůstává beze změny; secure/student runtime, verifier, Google Forms, kryptografie, scoring a PIN/odemčení se nemění.

> **7.1.34 Etapa 4 – studentské odevzdání přes Google Forms (2026-09-15):** nově generovaný secure studentský test může po odevzdání nabídnout zkopírování celého `SECURE-ANSWERS-V1` payloadu a otevření školního Google Formuláře. Responder URL se nastavuje lokálně v Nastavení Generátoru, je validována fail-closed a zahrnuta do integrity-bound konfigurace konkrétního testu. `answers.txt` zůstává nouzový fallback a jediná cesta bez nakonfigurovaného formuláře nebo při neobvykle dlouhém payloadu. Stage 3 CSV import ve verifieru zůstává beze změny.

> **7.1.32 Stage 1/2 state-transition hotfix (2026-09-15):** opravuje reálnou regresi při přepnutí cizí jazyk → čeština v Simple režimu: český modul už nepřepne aktivní `cs_practice` / `cs_strict` preset do Advanced. Současně opravuje dva chybné QA assertiony stavu „Bezpečnost pracoviště“ a dělá changelog visual check nezávislý na konkrétním patch čísle; přesnou verzi dál kontroluje `check-versions`. Verifier, kryptografie, PIN/odemčení, Google Forms ani serverový profil se nemění.

> **7.1.31 QA certifikační hotfix (2026-09-15):** produkční logika Etapy 1/2 se nemění. Opraven je pouze headless regresní test, který četl `state` přes neexistující `window.state`, a zastaralé očekávání textu ve visual QA plánu. Tím se znovu umožní generovat QA exportní fixtures pro instant/student/verifier. 7.1.31 je nový kandidát do čistého GitHub CI.

> **7.1.29 Etapa 1 – Simple workflow (2026-09-15):** jednoduché nastavení nabízí jen tři pedagogické účely (Procvičování / Běžný test / Přísný test) a technické volby odvozuje deterministicky. Pokročilý režim zachovává původní plnou konfiguraci. Verifier, kryptografie, PIN/odemčení, Google Forms ani serverový profil se v této etapě nemění. 7.1.29 je kandidát do nového čistého CI; poslední zelený baseline je 7.1.28.

> **7.1.28 XSS sink-ratchet + QA harness hotfix (2026-09-15):** opravuje CI regresi z 7.1.26/7.1.27 bez zvyšování bezpečnostního baseline. Tři nově přidaná použití `innerHTML` (schování checklistu, učitelský re-run modal a automatické otevření practice feedbacku) jsou nahrazena bezpečnějšími existujícími/DOM cestami; XSS inventář je zpět na 161/161. Současně je opraven teardown race practice workflow testu, který po PASS zavřel JSDOM před dokončením asynchronního report seal. Funkční UX změny 7.1.26 zůstávají zachovány.

> **7.1.27 CI/performance hotfix (2026-09-15):** nemění funkční opravy 7.1.26. Build před vložením aplikačních JS do `index.html` odstraňuje pouze skutečné JavaScriptové komentáře přes parser Acorn; komentáře ve zdrojových souborech zůstávají. Cílem je vrátit release pod existující GHRAB performance budget bez jeho navyšování.

> **7.1.26 kandidát (2026-09-15):** opravuje šest workflow/UX problémů z učitelského testování (simple strict team code, finální odevzdání až na konci, učící zpětná vazba, opakovaný pokus přes učitelský kód, skutečný lock při opuštění přísného testu a zkrácený checklist). Jde o změnu distribuovaného kódu; před produkčním označením vyžaduje nový nezávislý GARP/regresní průchod.

> **7.1.25 hotfix (2026-09-10):** opravuje produkční regresi self-testu bodování v bezpečném offline režimu (`RPC __has__ timeout`). Jde o změnu distribuovaného kódu po 7.1.24, takže bezpečnostní evidence 7.1.24 zůstává historickým podkladem a 7.1.25 vyžaduje nový regresní/GARP průchod před tvrzením, že je znovu auditně schválena.
**Platforma:** GHRAB Platform 1.1.2 · QA etapa P5


Produkční serverless/PWA aplikace pro učitele. Připravuje procvičovací i klasifikované interaktivní testy, diferencované varianty a bezpečný offline balík bez školního backendu.

## Stav vydání

Verze **7.1.42** je čistý kontrolní patch bez zamýšlené funkční změny. **7.1.41 je aktuální přijatý baseline AI Studia.** 7.1.42 slouží jako ostrý test kompletního automatického toku: Generator candidate → bezpečnostní brány → chráněný main → Pages deployment + release identity → `app-updated` → AI Studio live verification → patch-only release-wave update → Studio Safe Promotion → produkční deploy.

Verze **7.1.39** byla úzce zaměřený produkční hotfix Etapy 6 nad **7.1.38**. Opravila pouze case-normalizaci `unlock-password` v secure studentském runtime; účelově oddělené PBKDF2 domény zůstaly zachované. Její exact GitHub runtime baseline následně prošel P5/deploymentem; pozdější lokální N5 tooling delta je evidována odděleně v bezpečnostních podkladech.

GARP 2.5.1 SHIELD-LIVE / RI-LIVE a behaviorální live-model AI-RED zůstávají samostatnými serverovými/live kontrolami; tato UX etapa jejich stav nemění.

## Hlavní vlastnosti

- tvorba testů pro cizí jazyky a český jazyk,
- jednoduchý i pokročilý režim,
- 38 podporovaných typů úloh,
- diferenciace pomocí jmen nebo doporučených jednorázových kódů,
- náhodné pořadí a varianty podle skupin,
- okamžitý procvičovací režim,
- bezpečný offline balík `student_test.html` + `teacher_verifier.html`,
- šifrované odevzdání `answers.txt`,
- učitelský import Google Forms CSV s plnými `SECURE-ANSWERS-V1` payloady,
- PWA instalace pro počítač a telefon,
- lokální šablony, historie a export zadání,
- automatizovaný build, lint, bezpečnostní kontroly, workflow matice a headless regrese.
- aktivní CSP bez `unsafe-eval`; lokální Acorn parser se načte až při prvním sestavení testu a ověří syntaxi generovaných skriptů bez jejich spuštění.

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
- `scripts/check-csp.mjs` – ověřuje aktivní a synchronní CSP, zákaz `unsafe-eval` a absenci runtime `eval`/`new Function`.
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
4. aktivní CSP, zákaz `unsafe-eval` a runtime dynamického vyhodnocování,
5. strukturu zdrojů,
6. obecný sken citlivých údajů,
7. deadline časovače obou studentských runtime,
8. ESLint včetně `no-undef`,
9. produkční build,
10. konzistenci service-worker precache,
11. workflow matici 576 režimových kombinací, 38 typů a 703 dvojic typů.

`npm run test:headless` skutečně spustí aplikaci po centrálním povolení, ověří fail-closed build, pseudonymizaci promptu, hashovaný roster, Gemini kontrakt, sestavení secureOffline balíku, jednorázové kódy, šablony, PWA soubory a interní Test Lab. Očekávané přeskočení self-testu bez právě vygenerovaného testu je v logu označeno zvlášť; jakýkoli jiný warn test zablokuje.

Užitečné samostatné příkazy:

```bash
npm run build
npm run check:versions
npm run check:lockfile
npm run check:precache
npm run check:timers
npm run check:production
npm run check:csp
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
- Lokální odebrání přístupu je dostupné v účtovém modalu tlačítkem **Odebrat přístup z tohoto zařízení**. Na sdíleném zařízení použij **Ukončit práci a smazat místní data**, které odstraní stav, historii, šablony, lokální/session AI klíče a permit Generátoru, nikoli data jiných aplikací AI Studia.
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

Service worker nespouští `skipWaiting` automaticky při instalaci. Přechod čekající verze lze vyvolat pouze explicitní zprávou `GHRAB_SKIP_WAITING`/`SKIP_WAITING` z aktualizačního toku; jinak se nová verze aktivuje po zavření starých karet, takže rozpracovaná práce není přerušena automatickým reloadem. Service worker Generátoru ukládá jen vlastní statický app-shell; deployment konfiguraci ani centrální `app-guard.js` do běžné cache neukládá. Podepsaný offline LKG režim spravuje centrální brána AI Studia. Pokud konfiguraci nebo platné oprávnění nelze ověřit, Generátor zůstane uzamčený.

## Dokumentace

- `PROVOZNI-PRAVIDLA.md` – praktická pravidla pro učitele a správce.
- `SECURITY.md` – bezpečnostní hranice serverless verze.
- `RELEASE-CHECKLIST.md` – kontrolní seznam vydání.
- `ARCHITEKTURA.md` – technické uspořádání.
- `CONTRIBUTING.md` – pravidla dalšího vývoje.
- `docs/release-notes/` – historické jednorázové instrukce a komentáře vydání.

## Omezení rozsahu

GitHub Pages profil 7.1.24 sám o sobě nemá školní SSO, databázi, serverovou úschovu API klíče ani neobejitelnou serverovou autorizaci. Rozpracovaný studentský pokus se po reloadu nebo zavření stránky plně neobnoví. Již stažený HTML test nelze vzdáleně zneplatnit. Tyto hranice řeší `PROVOZNI-PRAVIDLA.md` a `SECURITY.md`.

## Napojení na AI Studio GHRAB

Build vytváří `dist/studio-manifest.json`. Studio z něj načítá verzi, stav, adresu a metadata. Studio Bridge v1 umí přes krátkodobou lokální předávku `ghrab-material-v1` doplnit název, skupinu, předmět a zdrojový obsah bez serverového ukládání předávky.

## Jednotná certifikace GHRAB QA

Aplikace obsahuje `qa/qa-manifest.json` a řídí se dokumentem `docs/qa/GHRAB-QA-STANDARD-1.0.md`. `npm test` ověřuje, že manifest odpovídá verzi aplikace a obsahuje všechny povinné rozměry, kritické workflow a specifické testovací brány. Finální označení `READY` vyžaduje také vizuální kontrolu ve skutečném prohlížeči a krátký smoke test nasazené verze na reálném zařízení.
