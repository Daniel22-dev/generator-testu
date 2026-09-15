# Generátor testů 7.1.31 — QA certifikační hotfix

Datum: 2026-09-15

## Účel

Tato verze opravuje výhradně QA infrastrukturu po CI běhu 7.1.30. Produkční logika Etapy 1 a Etapy 2 se nemění.

## Opravy

1. `tools/headless-check.mjs`: regresní kontrola Simple účelů už nečte lexikální `state` přes `window.state`; po každém přepnutí čte `state` přes `window.eval('state')`.
2. `qa/visual-plan.json`: scénář volby režimu očekává aktuální nadpis `Způsob nastavení` namísto odstraněného textu `PRACOVNÍ REŽIM`.

Selhání headless testu v 7.1.30 zastavilo příkaz `npm run test:headless && node scripts/qa-generate-fixtures.mjs`, takže se nevytvořily QA fixtures `instant_test.html`, `student_test.html` a `teacher_verifier.html`. Následné visual/critical ENOENT nálezy byly sekundární důsledek této chyby harnessu.

## Neměněno

- verifier a secure package,
- studentský secure/instant runtime,
- kryptografie a týmový bezpečnostní kód,
- PIN a odemykání,
- formát výsledků,
- Google Forms a serverový profil.

## Release podmínka

7.1.31 je kandidát. Za zelenou ji lze označit až po čistém GitHub CI průchodu všech povinných workflow na stejném commit SHA.
