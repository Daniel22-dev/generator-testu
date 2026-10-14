# Sprint 07 — Forms, Apps Script, teacher workflow and UX

Scope is limited to P1–07, P1–08, P2–09, P2–10, P2–11, P2–12 and P2–15. T110 server enforcement remains deferred. No Sprint 07 change may enable automatic split-screen locking.

## T13–T20 evidence map

| Scenario | Area | Automated evidence |
|---|---|---|
| T13 | P1–07 | complete install/setup guide and generator links (`S07-FORMS-R11/R12`) |
| T14 | P1–08 | checked-recipient-only send and empty selection (`S07-FORMS-R01/R02/R06`) |
| T15 | P1–08 | latecomer, dedupe, deliberate resend, list mutation, quota and uncertain MailApp result (`S07-FORMS-R03`–`R10`) |
| T16 | P1–07 | START comes from a submitted, teacher-authorized CSV marker (`S07-LESSON-R01/R02`) |
| T17 | P1–07 | END and chronology come from submitted CSV; opening a link cannot change state (`S07-LESSON-R01`–`R03`) |
| T18 | P2–09 / P2–10 | settings hints, icons, labels and accessible controls (`S07-UX-R04`, `S07-B09`) |
| T19 | P2–11 | preview, integrity and four-step output review (`S07-UX-R03`, `S07-B09`) |
| T20 | P2–12 / P2–15 | indeterminate real-operation AI status, no invented percent (`S07-UX-R01/R02`, `S07-B08`) |

## S07-AF01

A rejected non-identity payload is never a scored result. It does not contain `earned`, `total`, `pct` or `grade`. The live table and archive HTML render unavailability, while the historical score columns in archive CSV remain present but blank. Valid results retain their original scoring.

## Test boundaries

The Apps Script gate is a deterministic in-memory Sheets/MailApp simulation with synthetic `example.invalid` recipients. Chromium loads source-current, newly generated student and teacher HTML. Real Google authorization, mail delivery, Forms submission/export, GitHub Pages, AI provider, AI Studio, physical iPad and physical split-screen calibration remain **NOT VERIFIED**.
