# GIT 7.1.100 V7 — Sprint 05: Strict Mode Guard V2

Datum dokončení: 2026-10-13  
Stav: implementace dokončena, čeká na nezávislý audit  
Schválený výchozí checkpoint: `52d5ada25da507acc2489a7d588eea7964f7fa32`  
Implementační checkpoint před tímto reportem: `2b575cd627f655f8c16b639b6628a472c9c08334`  
Větev: `codex/sprint-05-strict-mode-guard-v2`

## Rozsah a bezpečnostní hranice

Implementace pokrývá P1-17, SG-01 až SG-10 a automatizovatelnou část T64–T101. Split-screen detekce je výhradně `SHADOW/AUDIT-ONLY`: vytváří auditní telemetrii, ale nikdy sama nezamyká pokus. Automatický split-screen LOCK nebyl aktivován. Nebyl proveden push, merge do `candidate`/`main`, deployment ani změna produkční verze 7.1.99. Sprint 06 nebyl zahájen.

GARP 2.7 trust piny, F0 consumer profil, kryptografie, scoring, Google Forms, Recovery a Teacher Verifier 2.0 nebyly oslabeny. Explicitní fallback pro nepodporované Fullscreen API je nastavení učitele; není automaticky povolen.

## Implementace

### Dvoufázové spuštění přísného testu

- předstartovní kontrola odděluje ověření prostředí od zahájení pokusu;
- Fullscreen se požaduje přímo z uživatelského gesta;
- časovač, obsah a identita pokusu nezačnou před potvrzeným Fullscreen;
- přímé pokusy o obejití přes F11 nebo interní startovací funkci jsou odmítnuty;
- zamítnutí Fullscreen je bezpečně opakovatelné;
- nepodporované Fullscreen API selže uzavřeně, není-li učitelem výslovně povolen auditovaný kompatibilní režim.

### Integrita pokusu a Recovery

- opuštění Fullscreen v aktivním přísném režimu vytvoří jediný zámek;
- po odevzdání se nový zámek nevytváří;
- Recovery zachová identitu pokusu, deadline i odpovědi;
- v režimu s vynuceným Fullscreen zůstane obnovený pokus zamčený, dokud student znovu vědomě nevstoupí do Fullscreen;
- běžný test a procvičování zachovávají stávající chování.

### Split-screen SHADOW/AUDIT-ONLY

- stavový model: `NORMAL`, `SUSPECTED`, `CONFIRMED`, `AMBIGUOUS`, `EXEMPT`;
- měření vychází z důvěryhodné Fullscreen baseline a rozlišuje přiblížení, softwarovou klávesnici a změnu orientace;
- potvrzení podezření vyžaduje časovou persistenci;
- každá split událost nese `shadowOnly: true` a `lockApplied: false`;
- Teacher Verifier zobrazuje auditní stav, režim Fullscreen a případný kompatibilní fallback bez tvrzení, že shadow signál způsobil zámek.

### CI a auditovatelnost

- nový zdrojový gate `check:s5-strict-mode`;
- nový Chromium gate `check:s5-strict-mode-browser` nad skutečně nově generovaným secure studentským HTML;
- traceability gate T64–T101 s explicitním `PASS` / `NOT VERIFIED`;
- CI wiring gate se šesti negativními mutacemi;
- S5 brány jsou blokující součástí P5/CI orchestrace a release workflow.

## Změněné soubory

Celkem 57 souborů, 598 vložených a 121 odstraněných řádků před tímto reportem.

Hlavní produkční soubory:

- `src/js/13di-secure-strict-mode-runtime.js` — nový izolovaný runtime Strict Mode Guard V2;
- `src/js/13de-secure-student-guard.js` — split-screen shadow klasifikace;
- `src/js/13e-secure-student-runtime.js` a `src/js/13d-secure-student-shell.js` — dvoufázové UI, fallback a Recovery návrat;
- `src/js/13c-secure-package.js`, `src/js/13g-assemble-test-html.js` — vložení runtime do secure artefaktu;
- `src/js/13df-secure-critical-history.js`, `src/js/13eg-secure-verifier-history.js`, `src/js/13eh-secure-teacher-verifier-s4.js`, `src/js/13f-secure-teacher-verifier.js` — interpretace auditní telemetrie;
- `src/js/01-core.js`, `src/js/02-state-persistence.js`, `src/js/03-ui-render.js`, `src/shell.html` — učitelské nastavení kompatibilního fallbacku;
- `scripts/student-publication-lib.mjs` — zachování nastavení v publikaci;
- `.github/workflows/p5-release-gate.yml`, `package.json` — blokující CI zapojení.

Nové trvalé testy:

- `scripts/check-s5-strict-mode.mjs`;
- `scripts/check-s5-strict-mode-browser.mjs`;
- `scripts/check-s5-ci-wiring.mjs`;
- `scripts/check-s5-traceability.mjs`.

Ostatní změněné testovací skripty pouze přizpůsobují dřívější regresní harness dvoufázovému startu a novému runtime modulu.

## Commity implementace

- `ef8fef98109feaa171639084c61978d80dff10a0` — Strict Mode Guard V2;
- `3da50bc` — obnovené expirované pokusy;
- `f012723` — obnovená odevzdání v browser helperu;
- `8fdcaab` — explicitní obnova ztraceného paralelního tabu;
- `cff52be` — fail-closed výsledky preflightu;
- `d3bddc92f0f5792914fc259e6494491dfa2929bf` — vazba evidence na checkpoint;
- `2b575cd627f655f8c16b639b6628a472c9c08334` — registrace runtime v lint globálech.

Přesný konečný předávací SHA včetně dokumentace je v `HANDOFF-MANIFEST.txt` auditorského balíčku.

## Výsledky ověření

### PASS — Sprint 05

- S5 zdrojové/jsdom scénáře: 14/14;
- S5 Chromium scénáře: 9/9, Chromium 149.0.7827.55;
- S5 CI wiring: PASS včetně 6/6 negativních mutací;
- T64–T101 traceability: 30 PASS, 0 FAIL, 8 NOT VERIFIED;
- build: PASS;
- lint: PASS, 0 chyb; 9 zděděných varování;
- sensitive-data scan: PASS.

### PASS — zachované regrese

- Sprint 01 Chromium a Recovery runtime;
- Sprint 02 pedagogická fidelity Chromium;
- Sprint 03 workflow Chromium;
- Sprint 04/04.1 zdrojové a Chromium testy Teacher Verifieru;
- Forms zdrojové kontroly 59/59 a lesson Chromium 24/24;
- roster, runtime UX, deadline, persistence a produkční readiness;
- bezpečnostní R3/R5 a dostupné E1/E3/E4/E5/E7/E8/E9/E10 source/browser kontroly;
- generovaný verifier syntax a CSP;
- CI wiring Sprintů 01–05.

### F0 a GARP 2.7

Na čistém checkoutu s LF (`core.autocrlf=false`) na výchozím checkpointu i implementačním HEAD:

- build: PASS;
- F0 trust-pin: PASS;
- GARP 2.7 contracts: PASS;
- GARP 2.7 architecture: 41/41 PASS;
- GARP 2.7 policy mutations: 6/6 PASS;
- GARP 2.7 mutations: 10/10 PASS;
- GARP 2.7 auto-patch: PASS.

Očekávaný trust-anchor SHA-256 zůstal `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`; osm workflow pinů odpovídá. V hlavním Windows checkoutu s `core.autocrlf=true` se bajtový hash trust-anchoru mění na `9908c887...` a F0 správně selže. Jde o reprodukovaný line-ending drift checkoutu, nikoli změnu důvěryhodných pinů. Kontroly nebyly oslabeny a hash nebyl přepsán.

### FAIL — přesně zaznamenaná lokální odchylka

Kompletní Windows orchestrace v tomto prostředí: 436 testů, 396 PASS, 40 FAIL. Selhání jsou soustředěna do platformních/testovacích předpokladů (zejména Windows symlink `EPERM` a lokální dostupnost npm po odděleném pokusu s package managerem), nikoli do S5 aplikačních scénářů. Výsledek je přesto klasifikován `FAIL`; nebyl vydáván za certifikační PASS.

### NOT VERIFIED

- aktuální kompletní běh na Linuxu s Node.js 22 (host nabízí Windows a Node.js 24.19.0; WSL není instalován);
- T73 a T77 jako automatický split-screen LOCK — záměrně deaktivováno dle zadání;
- T80 Apple Stage Manager;
- T85–T89 fyzické telefony/tablety a skutečné iPady;
- Safari/iPadOS a další fyzické browser/device kombinace;
- skutečný GitHub Pages hosting, produkční Google Forms a reálné AI Studio;
- fyzická kalibrace split-screen prahů.

## Zbývající rizika

1. Fullscreen API a viewport metriky mají odlišnosti mezi prohlížeči a zařízeními; před jakýmkoli enforcementem split-screen je nutná fyzická kalibrace.
2. Učitelem povolený fallback pro nepodporovaný Fullscreen snižuje sílu vynucení; je explicitní a auditovaný, ne automatický.
3. Statický GitHub Pages nemůže serverově garantovat kiosk režim ani pravost klientské telemetrie. Telemetrie je důkaz pro učitele, ne absolutní ochrana zařízení.
4. Windows CRLF checkout může způsobit fail-closed F0 hash kontrolu. Certifikační checkout musí zachovat LF; trust piny se kvůli lokálnímu driftu nesmějí přepisovat.
5. Známý zděděný AI assurance fingerprint nesoulad nebyl měněn ani obcházen.

## Rozhodnutí implementátora

Implementace je připravena k nezávislému auditu. Produkční GO není tímto reportem uděleno. Automatický split-screen LOCK zůstává vypnutý. Sprint 06 není zahájen.
