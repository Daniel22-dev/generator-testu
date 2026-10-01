# Generator testů 7.1.70 — D7 CI / regression hardening

## Rozsah
D7 nepřidává novou uživatelskou funkcionalitu. Uzavírá auditní TEST GAPy tím, že již opravené D1-D6 chování převádí z volitelných/lokálních kontrol na povinné release brány.

## P5 release gate
- `qa:p5` i `qa:p5:ci` nyní povinně spouštějí `qa:d7:ci` po produkčním buildu.
- D7 runner ověřuje Teacher Verifier V2 kontrakt, effective analytics, D5 IA/security, Stage-3 PDF kontrakt, skutečný browserový PDF download, vícestránkovou PDF kvalitu a skutečný D4 dark/light/fullscreen runtime.
- Každý krok je zaznamenán do `qa-results/d7-regressions.json`.
- PDF runtime a quality testy ukládají neškodné JSON souhrny; teacher fixture a vygenerované teacher/student PDF jsou po testech odstraněny, aby se nedostaly do CI artifactu.

## Journey E2E
- Workflow před každým během maže `audit/evidence/` a vytváří nový prázdný adresář, takže artifact obsahuje pouze evidence aktuálního SHA.
- Artifact je pojmenován `journey-e2e-evidence-${SHA}`.
- Do povinné sady je přidán `config_extra_suite`, který kryje Reading/Listening count single-source, differentiation invariants a multimodální/YouTube routing.

## Safe Promotion
- Povýšení candidate → main už nestačí pouze zelený `p5-release-gate`.
- Safe Promotion čeká fail-closed na zelený `p5-release-gate` **a** `journey-e2e` pro přesně stejný certifikovaný SHA.
- Jakýkoli terminal RED stav kteréhokoli z těchto dvou checků povýšení zastaví.
- Po doběhnutí obou checků se znovu kontroluje, že candidate i promotion PR stále ukazují na původní certifikovaný SHA.

## Hranice
D7 nemění scoring, kryptografii, secure student runtime, PDF renderer, D2 analytiku, D4 theme/fullscreen logiku, D5 security model ani D6 prompt/prefill chování. Změny jsou omezeny na CI wiring, testovací harnessy, evidence hygiene a release metadata.
