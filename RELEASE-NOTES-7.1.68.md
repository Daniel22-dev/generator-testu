# Generator testů 7.1.68 — D5 checkpoint

## Rozsah
D5 upravuje pouze informační architekturu a security UX Teacher Verifieru 2.0. Scoring, dešifrování, PDF runtime/kvalita, D2 analytics a D4 theme/fullscreen nejsou měněny.

## Změny
- Dashboard zůstává pracovním přehledem; Creator ID, build, manifest a Student HTML SHA-256 jsou v panelu **Technické údaje**.
- Panel Technické údaje je rozdělen na identitu testu, autora/build a integritu.
- Google Forms `metadataMismatch` je součástí jednotného `securitySignalsFor()` modelu jako **měkký signál** s konkrétním důvodem. Kryptograficky ověřený payload zůstává autoritativní; popisná metadata formuláře jsou sekundární.
- Results již nepřidává druhé paralelní `METADATA MISMATCH` varování; používá stejný security signal text jako Security panel a CSV.
- Dashboard KPI „signály“ používá `effectiveResults()`, takže se shoduje s populací Security panelu.
- Navigace má ikonovou hierarchii a jednoznačný aktivní marker na desktopu i mobilu.

## Ověření
- Teacher Verifier 2.0 contract
- D5 VM regression pro metadata mismatch / IA
- D2 effective analytics regression
- Stage 3 PDF contract
- source structure / production / GARP security a GARP 2.7 gates
- Browserové D5 asserty jsou přidány do Journey E2E a budou autoritativně provedeny při společném uploadu D4+D5+D6 (7.1.69).
