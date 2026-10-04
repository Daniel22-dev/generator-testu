# GIT 7.1.89 - source candidate: workflow and classroom distribution

## Scope
Based on the supplied 7.1.88 source archive. No deployment or live account change was performed. The user clarified that make-up tests are NEW tests, with recipients chosen in Google Sheets immediately before mailing, not new attempts in old tests.

## Implemented
- Native stacked confirmation dialogs; waiting-for-consent versus generation status; cancellation and stale-response protection for Reading/Listening.
- CEFR and material precede exercise selection. Prominent questions/points summary retains the existing hide/reveal detail toggle.
- Reading source scope: shared material or its own text/TXT/MD/DOCX; generate, adapt, or verbatim. Approved Reading tracks context changes, blocks inconsistent generation and offers explicit preservation/update choices. No silent rewrite of teacher text.
- Consistent styled select/search/count inputs and comprehension dialog.
- Explicit opt-in suitability request, registered in AI operation inventories. Basic local prerequisites plus constrained AI response validation, safe rendering, no private roster/credentials in request, memory cache invalidation; no automatic selection changes.
- Stable issued code registry, append only missing codes, explicit new set action; CSV selection consistent with active roster and FALSE mailing defaults. Verifier/code set drift blocks misleading CSV export.
- Google Apps Script companion: exact recipient preview, checked rows only, per-test/email journal, send lock, quota checks, stale selection detection, uncertain outcome stops automatic retry. No triggers or automatic mail.
- Secure and instant runtimes shuffle contents then renumber displayed positions; canonical IDs, answer option values and point associations are preserved. Reapplying shuffle in the same attempt is stable.
- Clear separation of personal/start/recovery/admin roles. Secure student still does not receive teacher administration secrets; private management stays in verifier. No new server authorization claim.

## Deployment
This is source, not a ready-to-open standalone index.html. Merge/review on a dedicated branch and run the unchanged exact-lockfile candidate, PR certification and security gates. Publish only after those pass. Install the companion Apps Script separately in the bound spreadsheet; existing legacy mailers do NOT automatically honor the new checkbox column. See NAVOD-ROZESILANI-7.1.89.txt and public/manual/rozesilani-kodu.html.

## Validation boundary
See QA-WORKFLOW-7.1.89.md and qa/workflow-7.1.89/evidence. Local tests use actual source modules and Chromium DOM with synthetic access and mocked AI/Apps Script services. They are not production authentication, WebCrypto export, live AI, Google delivery, full CI, Safari or physical iPad certification. Pinned npm dependencies could not be installed in this environment; no pin or security check was bypassed.
