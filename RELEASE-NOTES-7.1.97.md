# GIT 7.1.97 — Google Forms workflow F1–F9

Datum: 2026-10-07

## Hlavní změny

- Teacher Verifier nese pevné Forms nastavení z Generátoru; na druhém PC se běžně nic znovu nevyplňuje.
- Univerzální Google Form používá předvyplněná pole `TESTID`, `NAZEV`, `TRIDA` a `KOD`.
- Učitel může přes stejný formulář odeslat značky `GIT-LESSON-START-V1` a `GIT-LESSON-END-V1`.
- Student zadává pouze osobní 6znakový kód; ID testu je odlišeno a odmítnuto jako osobní kód.
- Parser podporuje české, US, ISO a explicitně zónované Google Forms timestampy včetně CET/CEST/EET/EEST/WET/WEST/UTC/GMT offsetů.
- Neshoda popisných metadat formuláře je upozornění, nikoli automatická ztráta bodů; kryptografické vazby a identita zůstávají fail-closed.
- Chybná identita může být pouze navržena k ručnímu potvrzení učitelem, nikoli automaticky uznána.
- Opakovaná značka START nezneplatní dřívější platné okno. Klientský čas zahájení má toleranci 10 minut, ale důvěryhodný Forms timestamp nesmí předcházet START značce.
- Ručně zadaný čas hodiny může opravit pozdní START nebo omylem předčasný END a je ve výsledku označen jako ruční zásah.
- Reading comprehension je upraven pro mobilní šířku, zarovnání do bloku, dělení slov a správný jazyk dokumentu.

## Performance budget

Kvůli novému Forms workflow byly kontrolovaně zvýšeny limity:

- `distBytes`: 2 800 000 B
- `entryHtmlBytes`: 1 750 000 B
- `entryCriticalBytes`: 1 925 000 B
- `precacheBytes`: 2 350 000 B
- `largestFileBytes`: 1 750 000 B

Zvýšení je záměrné a musí i nadále projít P5/performance gate.

## Ověření před commitem

- Forms workflow unit/source kontrakty: PASS (55/55).
- CI orchestration a navazující bezpečnostní kontrakty: PASS v dostupném lokálním prostředí.
- Plný lokální řetězec nebylo možné dokončit kvůli nekompletním `node_modules` (`jsdom`); rozhodující je exact-SHA GitHub CI.

## Zbývající provozní ověření

Po zeleném CI zůstává první ostrá zkouška na skutečném školním Google Formu a fyzickém iPhone/Android zařízení: START → studentské odevzdání → CSV → vyhodnocení na druhém PC.
