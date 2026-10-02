# GIT 7.1.71 — finální audit A–D

Datum auditu: 2026-10-02  
Auditovaná větev změn: D1–D8  
Poslední certifikovaný baseline před D8: 7.1.70 / candidate `dcd70a39fa7a7dddc015fd5e7c9a6f57934af134`, main merge `d87d1881e9b17a2ede1f271172d024007a685f28`.

## Certifikační baseline 7.1.70

Před D8 prošel tentýž candidate SHA všemi třemi nezávislými workflow:

- P5 R2 pre-production release gate — **PASS** (run `36928075812`)
- Workflow journeys E2E — **PASS** (run `36928075805`)
- Safe Promotion — **PASS** (run `36928075706`)
- následná certifikace/nasazení na `main` — **PASS** (run `36929916374`)

D8 nad tímto baseline nedělá redesign funkcí. Uzavírá audit, odstraňuje pouze prokazatelně mrtvé/stale větve a přidává povinný finální kontrakt `check:d8-final-audit`.

## A — Generátor

| Bod | Stav | Ověřený výsledek |
|---|---|---|
| A1 Šablony / prefill_v3 | PASS | `rcTopic` se ukládá a obnovuje; příloha se neukládá a po LOAD je explicitně vyžádáno nové připojení. Legacy `prefill_v2/profile_v1` zůstává kompatibilní. |
| A2 Reading count | PASS | Default je 4; učitel může řídit počet a hodnota je součástí state/prompt/drift kontraktu. |
| A3 Listening count | PASS | Default je 4 a počet je samostatně řízený/propagovaný. |
| A4 Listening vstupy | PASS | Audio/video soubory jdou jako provider multimodal input; YouTube URL se mapuje na provider `fileData`; ostatní URL zůstávají kontextové. |
| A5 Diferenciace | PASS | Basic / Standard / Challenge zachovávají stejné učivo, CEFR, typy cvičení, počty položek a body; mění pouze podporu a náročnost zpracování. Platí pro obě aktivní prompt cesty i UI nápovědu. |
| A6 Content drift | PASS | `rcTopic`, Reading/Listening count, source-use a differentiation level jsou zahrnuté v content drift kontraktu. |

## B — Teacher Verifier 2.0

| Bod | Stav | Ověřený výsledek |
|---|---|---|
| B1 Informační architektura | PASS | Sedm panelů: Dashboard, Výsledky, Analýza, Bezpečnost, Test & PDF, Export, Technické údaje. |
| B2 Dashboard vs. technická metadata | PASS | Creator/build/hash údaje jsou soustředěné v Technických údajích; Dashboard zůstává pracovní. |
| B3 Navigace | PASS | Ikona + text, desktop i mobile active marker, `aria-current`. |
| B4 Dark mode | PASS | Reálné tmavé/světlé tokeny; Chromium D7 ověřilo obě computed palety. |
| B5 Fullscreen | PASS | Standard + WebKit API, `fullscreenchange`, stav tlačítka, Esc návrat, unsupported/rejected feedback + F11 fallback. |
| B6 Results | PASS | Výsledky používají sjednocený security signal model. |
| B7 Analytics | PASS | Distribuce, položková analýza a souhrny používají `effectiveResults()`; duplicity a nerozhodnuté konflikty nenafukují statistiky. |
| B8 Security | PASS S OMEZENÍM | `metadataMismatch` je viditelný jako měkký signál. Split-window je záměrně heuristický měkký signál (60% poměr, 10 s souvislé trvání, sumarizace); browser neumí spolehlivě dokázat nepoužití druhého zařízení ani zachytit každý layout. Aplikace to výslovně komunikuje a nepoužívá tento signál jako automatické obvinění. |

## C — PDF

| Bod | Stav | Ověřený výsledek |
|---|---|---|
| C1 Přímý PDF runtime | PASS | Origin-clean DOM rasterizer; `foreignObject` odstraněn. |
| C2 Studentské PDF | PASS | Samostatná studentská cesta bez správných odpovědí. |
| C3 Učitelské PDF | PASS | Oddělená cesta s klíčem / `ucitel_klic_` a učitelskými detaily. |
| C4 Logo | PASS | PNG logo je vložené přes validovaný data URI a D7 PDF-quality browser test prošel. |
| C5 Čeština/diakritika | PASS | `Výchozí věta`, `Vysvětlení` a další české labely mají správnou diakritiku. |
| C6 Pagination/offline fallback | PASS | Smart block/text page cuts, A4 stránkování a klasický print fallback zůstávají aktivní. |

## D — CI / release assurance

| Bod | Stav | Ověřený výsledek |
|---|---|---|
| D1 Povinné regresní testy | PASS | `qa:p5(:ci)` povinně volá D7 regression runner a od 7.1.71 také D8 final audit. |
| D2 Browser/PDF/analytics coverage | PASS | P5 zahrnuje effective analytics, IA/security, PDF runtime, PDF quality a dark/light/fullscreen Chromium test. |
| D3 Journey evidence | PASS | Evidence se před během čistí; artifact je vázaný na SHA; Journey zahrnuje state/config scénáře. |
| D4 Promotion admission | PASS | Safe Promotion vyžaduje zelený `p5-release-gate` i `journey-e2e` pro certifikovaný SHA. |
| D5 Evidence hygiene | PASS | Citlivé teacher fixtures a PDF se po browser testech mažou; uploadují se jen neškodné summary JSON. |

## D8 cleanup

Odstraněny byly pouze větve s prokázanou nulovou aktivní cestou:

- legacy přímé profily `fl_homework`, `fl_graded_quick`, `cs_text` a mrtvé helpery jejich starého detailního UI;
- mrtvý `pedagogicalPreset` state;
- mrtvý `sourceSliceMode` / `pickSourceSlice()`;
- zastaralá nápověda tvrdící, že dlouhý zdroj používá pouze začátek/konec.

Kompatibilita starých uložených dat se nezahodila: `normalizeLoadedState()` dál mapuje `fl_homework → fl_practice`, `fl_graded_quick → fl_standard`, `cs_text → cs_practice`. Nová nápověda odpovídá skutečné chunking/relevance/distribution strategii.

## Akceptované hranice

1. **Split-screen / druhé zařízení:** webová aplikace nemůže spolehlivě detekovat fyzické druhé zařízení ani každé rozložení obrazovky. Telemetrie zůstává podpůrným signálem pro učitele, nikoli verdiktem.
2. **Školní server:** live serverová fáze je rozhodnutím vlastníka projektu odložena. GARP 2.7 ji proto správně vykazuje jako `FOUNDATION_PASS_LIVE_NOT_TESTED`, nikoli jako falešný LIVE PASS.
3. **7.1.71 candidate:** finální exact-lockfile GitHub P5/Journey/Promotion musí po uploadu 7.1.71 znovu projít; zelený 7.1.70 je baseline, nikoli náhrada certifikace nového SHA.
