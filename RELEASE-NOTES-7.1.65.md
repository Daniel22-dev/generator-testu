# Release notes – 7.1.65

Datum: 2026-10-01

## D2 – sjednocení analytické populace Teacher Verifieru

Verze 7.1.65 je chirurgická oprava druhého P1 nálezu závěrečného auditu nad checkpointem D1 / 7.1.64. Nemění scoring, dešifrování, secure submission workflow, student package, PDF renderer ani bezpečnostní signály.

### Opravený problém

Teacher Verifier měl správnou autoritu `effectiveResults()` pro dashboard, export výsledků a souhrn problematických otázek, ale `distributionStats()`, `itemAnalysisRows()` a obal `analysisHtml()` stále pracovaly se všemi výsledky se stavem `OK`.

Důsledkem bylo, že identická duplicita mohla zvýšit počet studentů a změnit průměr, a nevyřešené různé pokusy stejného studenta mohly vstoupit do rozložení známek a položkové analýzy ještě před rozhodnutím učitele.

### Nové chování

- `distributionStats()` používá výhradně `effectiveResults()`,
- `itemAnalysisRows()` používá výhradně `effectiveResults()`,
- `analysisHtml()` odvozuje existenci dat a skupin ze stejné efektivní populace,
- exact duplicate se do analytiky nikdy nezapočítá,
- při více různých validních pokusech stejného studenta se do analytiky do rozhodnutí učitele nezapočítá žádný z konfliktních pokusů,
- po explicitním výběru vstoupí do všech analytických výpočtů právě zvolený pokus.

### Regresní ochrana

Přidán samostatný test `check:verifier-analytics`, který přímo vykonává produkční analytické funkce nad scénáři exact duplicate, unresolved attempts a explicit teacher decision. Zpřísněny jsou také existující Teacher Verifier a suite-session contracty, aby nestačila pouhá přítomnost řetězce `effectiveResults()` někde ve zdrojáku.

Zapojení nového runtime testu do povinné release brány zůstává záměrně na plánované etapě D7.

### Záměrně mimo D2

D2 neřeší PDF stránkovací polish, diakritické texty PDF, dark mode, fullscreen, dashboard/security UX ani generator prefill. Ty zůstávají v D3–D6.
