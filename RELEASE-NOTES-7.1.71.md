# Generátor testů 7.1.71 — D8 final audit + cleanup

Datum: 2026-10-02

## Účel

D8 uzavírá celý opravný cyklus D1–D8. Nezavádí nový redesign; provádí finální průřez původním auditem A–D, přidává povinný automatický final-audit kontrakt a odstraňuje pouze prokazatelně mrtvé nebo zastaralé cesty.

## Finální audit

Nový `scripts/check-d8-final-audit.mjs` kontroluje 29 kontraktů:

- A1–A6: šablony/prefill, Reading/Listening count, multimodální routing, invariant diferenciace a content drift;
- B1–B8: IA Teacher Verifieru, technická metadata, navigace, dark/light, fullscreen, Results, effective analytics a Security;
- C1–C6: přímé PDF, student/teacher semantics, logo, české labely, pagination a print fallback;
- D1–D5: povinné D7 browser/PDF regrese, Journey evidence hygiene a exact-SHA promotion admission;
- cleanup guardy: staré uložené ID se stále migrují, ale mrtvé helpery/stavy se nesmějí vrátit.

`qa:p5` i `qa:p5:ci` tento D8 audit povinně spouštějí.

## Cleanup

Odstraněno pouze po prokázání nulové aktivní cesty:

- staré přímé profily `fl_homework`, `fl_graded_quick`, `cs_text` a jejich mrtvé helpery/detail UI;
- nepoužívaný `pedagogicalPreset`;
- nepoužívaný `sourceSliceMode` a `pickSourceSlice()`;
- zastaralá nápověda tvrdící, že dlouhý zdroj používá jen začátek/konec.

Kompatibilita je zachována: `normalizeLoadedState()` dál migruje staré profily na `fl_practice`, `fl_standard` a `cs_practice`.

## Dlouhé zdroje

Nápověda nyní odpovídá skutečnému chování: při překročení kontextu se skládá reprezentativní průřez z tematicky relevantních a rozprostřených částí, nikoli prosté uříznutí začátku či konce.

## Bezpečnostní hranice

Split-window zůstává záměrně měkkou browserovou heuristikou. Aplikace neslibuje detekci druhého zařízení ani každého rozložení obrazovky a žádný takový signál nepoužívá jako automatický důkaz podvodu.

Školní serverová LIVE fáze zůstává odložena rozhodnutím vlastníka; GARP 2.7 ji správně vede jako `LIVE_NOT_TESTED`.

## Certifikace

Bezprostřední baseline 7.1.70-R3 prošel P5, Journey E2E, Safe Promotion i následným main deployem. Verze 7.1.71 musí po uploadu znovu projít exact-lockfile GitHub CI pro vlastní SHA; před tímto během není vzdálená certifikace 7.1.71 deklarována.
