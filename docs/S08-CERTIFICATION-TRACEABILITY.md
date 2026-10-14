# Sprint 08 — traceability T01–T135

Tested product checkpoint: `33fcffeae9ab5b59c3be7d1213cf23a59c3f6054`.

Summary: 105 PASS / 7 FAIL / 22 NOT VERIFIED / 1 DEFERRED.

| ID | Status | Requirement | Evidence / limitation |
|---|---|---|---|
| T01 | **PASS** | Pedagogical type selected by the teacher remains authoritative | check:s2-pedagogical-fidelity + check:s2-pedagogical-browser |
| T02 | **PASS** | Multiple Choice and Reading Comprehension remain structurally distinct | check:s2-pedagogical-fidelity + check:s2-pedagogical-browser |
| T03 | **PASS** | Exercise names remain consistent in generator, student HTML and verifier | check:s2-pedagogical-fidelity + check:s2-pedagogical-browser |
| T04 | **PASS** | Question counts, points and canonical structure remain stable | check:s2-pedagogical-fidelity + check:s2-pedagogical-browser |
| T05 | **PASS** | Opening the manual preserves the active generator session | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T06 | **PASS** | Roster and one-time student codes remain stable in the same session | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T07 | **PASS** | Global point mode has one strict integer authority | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T08 | **PASS** | Detailed point mode has one strict integer authority | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T09 | **PASS** | Redistribution is bounded, explicit and preserves item counts | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T10 | **PASS** | Primary Reading/Listening count is synchronized in both directions | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T11 | **PASS** | Secondary Reading/Listening rows remain independent | check:s3-workflow-fidelity + check:s3-workflow-browser |
| T12 | **PASS** | Didactic AI review uses the shared create-new-task policy | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T13 | **PASS** | Complete Sheets and Apps Script installation/setup guide | S07 source, traceability and Chromium evidence |
| T14 | **NOT VERIFIED** | Only explicitly selected recipients receive code messages | Synthetic Sheets/MailApp simulation passed; no live Google authorization or delivery was performed. |
| T15 | **NOT VERIFIED** | Latecomers, deduplication and deliberate resend are handled | Synthetic Sheets/MailApp simulation passed; no live Google authorization or delivery was performed. |
| T16 | **NOT VERIFIED** | START requires a submitted trusted Forms marker | Synthetic Forms CSV/browser path passed; no live school Google Forms submission/export was performed. |
| T17 | **NOT VERIFIED** | END and chronology require submitted trusted Forms markers | Synthetic Forms CSV/browser path passed; no live school Google Forms submission/export was performed. |
| T18 | **PASS** | Settings, icons, labels and navigation are accessible | S07 source, traceability and Chromium evidence |
| T19 | **FAIL** | Teacher preview, integrity panel and output review remain coherent | workflow audit and workflow-update source gate found secure-submit visibility/configuration synchronization regressions. |
| T20 | **PASS** | AI progress is truthful and never invents percentages | S07 source, traceability and Chromium evidence |
| T21 | **PASS** | Formats are recommended before the teacher selects them | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T22 | **PASS** | Recommendations reflect the supplied teaching context | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T23 | **PASS** | Recommendation cache/fingerprint invalidates on context changes | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T24 | **PASS** | Unverified URL/source context is represented honestly | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T25 | **PASS** | Manual workflow remains available and preserves teacher choice | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T26 | **PASS** | Composition review uses the shared policy | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T27 | **PASS** | The validated catalog contains all 38 formats | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T28 | **PASS** | Every catalog entry satisfies the metadata contract | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T29 | **PASS** | Conditionals search returns appropriate formats | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T30 | **PASS** | Nature/weather search returns appropriate formats | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T31 | **PASS** | Spanish/table search returns appropriate formats | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T32 | **PASS** | Reading prerequisites are enforced | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T33 | **PASS** | Heading prerequisites and filtering are enforced | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T34 | **PASS** | Listening source prerequisites are enforced | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T35 | **PASS** | Source, format, count and scoring stay independent | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T36 | **PASS** | Filtering does not silently change teacher selection | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T37 | **PASS** | Canonical formatId remains stable | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T38 | **PASS** | AI phases use indeterminate labels without fabricated percentage | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T39 | **PASS** | Catalog interaction remains keyboard and narrow-viewport usable | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T40 | **PASS** | AI receives only typed, allowlisted teaching context | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T41 | **PASS** | Prompt, student output and verifier preserve style fidelity | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T42 | **PASS** | AI review preserves security modes and existing gates | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T43 | **PASS** | Sprint work remains isolated from release branches | Sprint 08 Git/history/environment/release audit |
| T44 | **PASS** | No merge, push, staging or deployment occurs during certification | Sprint 08 Git/history/environment/release audit |
| T45 | **NOT VERIFIED** | Remote branch protection is effective | Remote GitHub, staging, AI Studio or physical-device environment was not authorized/available. |
| T46 | **NOT VERIFIED** | GitHub-hosted Linux CI completes on the exact candidate SHA | Remote GitHub, staging, AI Studio or physical-device environment was not authorized/available. |
| T47 | **NOT VERIFIED** | Staging, promotion and rollback paths are exercised | Remote GitHub, staging, AI Studio or physical-device environment was not authorized/available. |
| T48 | **FAIL** | Release identity, version and signed evidence are internally current | Package remains 7.1.99 and AI assurance evidence is stale; no version bump or fingerprint rewrite was authorized. |
| T49 | **FAIL** | Complete release preflight is green on all required platforms | Windows CI, AI assurance, foundation evidence, XSS baseline and legacy harness blockers remain open. |
| T50 | **NOT VERIFIED** | AI Studio and physical-device smoke tests complete | Remote GitHub, staging, AI Studio or physical-device environment was not authorized/available. |
| T51 | **PASS** | Audit handoff is reproducible from bundle, patches and hashes | Sprint 08 Git/history/environment/release audit |
| T52 | **PASS** | Certification evidence contains synthetic data only | Sprint 08 Git/history/environment/release audit |
| T53 | **FAIL** | Final release decision has no open blocking finding | Certification verdict is NO-GO pending remediation and independent audit. |
| T54 | **PASS** | AI does not invent format IDs or mutate scoring authority | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T55 | **PASS** | Five pedagogical styles keep their ordering and identity | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T56 | **PASS** | Secure output preserves pedagogical labels | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T57 | **PASS** | Instant output preserves pedagogical labels | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T58 | **PASS** | Preview, verifier and PDF agree on exercise identity | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T59 | **PASS** | Content and pedagogical style remain separate concepts | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T60 | **PASS** | Title and canonical type remain separate concepts | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T61 | **PASS** | Historic data receives a compatible fallback | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T62 | **PASS** | All 38 formats retain scorer mappings | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T63 | **PASS** | Variants and exports preserve pedagogical fidelity | check:s6-pedagogical-ai + S06 traceability + Chromium |
| T64 | **PASS** | Strict Mode Guard V2 acceptance scenario T64 | S05 source + Chromium + T64–T101 traceability |
| T65 | **PASS** | Strict Mode Guard V2 acceptance scenario T65 | S05 source + Chromium + T64–T101 traceability |
| T66 | **PASS** | Strict Mode Guard V2 acceptance scenario T66 | S05 source + Chromium + T64–T101 traceability |
| T67 | **PASS** | Strict Mode Guard V2 acceptance scenario T67 | S05 source + Chromium + T64–T101 traceability |
| T68 | **PASS** | Strict Mode Guard V2 acceptance scenario T68 | S05 source + Chromium + T64–T101 traceability |
| T69 | **PASS** | Strict Mode Guard V2 acceptance scenario T69 | S05 source + Chromium + T64–T101 traceability |
| T70 | **PASS** | Strict Mode Guard V2 acceptance scenario T70 | S05 source + Chromium + T64–T101 traceability |
| T71 | **PASS** | Strict Mode Guard V2 acceptance scenario T71 | S05 source + Chromium + T64–T101 traceability |
| T72 | **PASS** | Strict Mode Guard V2 acceptance scenario T72 | S05 source + Chromium + T64–T101 traceability |
| T73 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T73 | Automatic split-screen LOCK intentionally remains disabled in SHADOW/AUDIT-ONLY mode. |
| T74 | **PASS** | Strict Mode Guard V2 acceptance scenario T74 | S05 source + Chromium + T64–T101 traceability |
| T75 | **PASS** | Strict Mode Guard V2 acceptance scenario T75 | S05 source + Chromium + T64–T101 traceability |
| T76 | **PASS** | Strict Mode Guard V2 acceptance scenario T76 | S05 source + Chromium + T64–T101 traceability |
| T77 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T77 | Automatic split-screen LOCK intentionally remains disabled in SHADOW/AUDIT-ONLY mode. |
| T78 | **PASS** | Strict Mode Guard V2 acceptance scenario T78 | S05 source + Chromium + T64–T101 traceability |
| T79 | **PASS** | Strict Mode Guard V2 acceptance scenario T79 | S05 source + Chromium + T64–T101 traceability |
| T80 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T80 | No physical iPadOS Stage Manager/orientation calibration. |
| T81 | **PASS** | Strict Mode Guard V2 acceptance scenario T81 | S05 source + Chromium + T64–T101 traceability |
| T82 | **PASS** | Strict Mode Guard V2 acceptance scenario T82 | S05 source + Chromium + T64–T101 traceability |
| T83 | **PASS** | Strict Mode Guard V2 acceptance scenario T83 | S05 source + Chromium + T64–T101 traceability |
| T84 | **PASS** | Strict Mode Guard V2 acceptance scenario T84 | S05 source + Chromium + T64–T101 traceability |
| T85 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T85 | Required physical mobile/tablet behavior was not tested. |
| T86 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T86 | Required physical mobile/tablet behavior was not tested. |
| T87 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T87 | Required physical mobile/tablet behavior was not tested. |
| T88 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T88 | Required physical mobile/tablet behavior was not tested. |
| T89 | **NOT VERIFIED** | Strict Mode Guard V2 acceptance scenario T89 | Required physical mobile/tablet behavior was not tested. |
| T90 | **PASS** | Strict Mode Guard V2 acceptance scenario T90 | S05 source + Chromium + T64–T101 traceability |
| T91 | **PASS** | Strict Mode Guard V2 acceptance scenario T91 | S05 source + Chromium + T64–T101 traceability |
| T92 | **PASS** | Strict Mode Guard V2 acceptance scenario T92 | S05 source + Chromium + T64–T101 traceability |
| T93 | **PASS** | Strict Mode Guard V2 acceptance scenario T93 | S05 source + Chromium + T64–T101 traceability |
| T94 | **PASS** | Strict Mode Guard V2 acceptance scenario T94 | S05 source + Chromium + T64–T101 traceability |
| T95 | **PASS** | Strict Mode Guard V2 acceptance scenario T95 | S05 source + Chromium + T64–T101 traceability |
| T96 | **PASS** | Strict Mode Guard V2 acceptance scenario T96 | S05 source + Chromium + T64–T101 traceability |
| T97 | **PASS** | Strict Mode Guard V2 acceptance scenario T97 | S05 source + Chromium + T64–T101 traceability |
| T98 | **PASS** | Strict Mode Guard V2 acceptance scenario T98 | S05 source + Chromium + T64–T101 traceability |
| T99 | **PASS** | Strict Mode Guard V2 acceptance scenario T99 | S05 source + Chromium + T64–T101 traceability |
| T100 | **PASS** | Strict Mode Guard V2 acceptance scenario T100 | S05 source + Chromium + T64–T101 traceability |
| T101 | **PASS** | Strict Mode Guard V2 acceptance scenario T101 | S05 source + Chromium + T64–T101 traceability |
| T102 | **PASS** | Credential/recovery audit covers both generated student channels | S01 security gates + newly generated instant/secure Chromium evidence |
| T103 | **NOT VERIFIED** | Recovery behavior is verified on required desktop and physical tablet environments | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T104 | **PASS** | Raw credentials do not enter application-controlled storage or exports | S01 security gates + newly generated instant/secure Chromium evidence |
| T105 | **NOT VERIFIED** | Native password-manager behavior does not retain sensitive inputs | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T106 | **PASS** | Recovery and Teacher/Admin purposes are explicit and localized | S01 security gates + newly generated instant/secure Chromium evidence |
| T107 | **PASS** | Recovery, Teacher and Admin privileges remain separated | S01 security gates + newly generated instant/secure Chromium evidence |
| T108 | **PASS** | Credential derivations and test binding remain separate | S01 security gates + newly generated instant/secure Chromium evidence |
| T109 | **PASS** | All active credential branches are covered by regression contracts | S01 security gates + newly generated instant/secure Chromium evidence |
| T110 | **DEFERRED** | Server-side recovery/revocation enforcement | Explicitly deferred to the separately authorized server phase. |
| T111 | **NOT VERIFIED** | Recovery interoperability is verified on required physical devices | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T112 | **PASS** | Both generated student modes pass a real local Chromium journey | S01 security gates + newly generated instant/secure Chromium evidence |
| T113 | **PASS** | Storage, URL, log and export leakage scans pass | S01 security gates + newly generated instant/secure Chromium evidence |
| T114 | **NOT VERIFIED** | Reload, navigation and BFCache behavior preserve attempt state | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T115 | **PASS** | Negative control proves a client can capture a credential before cleanup | S01 security gates + newly generated instant/secure Chromium evidence |
| T116 | **NOT VERIFIED** | Authorized GitHub Pages staging passes recovery tests | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T117 | **NOT VERIFIED** | Republish/cache behavior preserves active attempt integrity | Local synthetic/Chromium evidence exists, but the required native device/browser or deployed environment was not tested. |
| T118 | **PASS** | Verifier empty state is safe | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T119 | **PASS** | Verifier renders one compact result row | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T120 | **PASS** | Verifier aggregates the 43/43/13 fixture | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T121 | **PASS** | Verifier preserves split values 7%, 49% and 96% | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T122 | **PASS** | Missing split measurement differs from measured 0% | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T123 | **PASS** | More than 300 security events remain available | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T124 | **PASS** | Orientation/split telemetry stays non-accusatory and audit-only | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T125 | **PASS** | Lock, successful Recovery and failed Recovery remain separate | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T126 | **FAIL** | Replay, duplicate, identity and joker decisions remain coherent | Legacy verifier/forgery and D7 effective-analytics harnesses fail after diagnostic-quarantine changes; product browser scenarios pass but complete regression certification does not. |
| T127 | **FAIL** | Scoring/import and effective-result analytics remain authoritative | D7 effective-result analytics harness throws because its extracted runtime omits isDiagnosticQuarantine; full certification is blocked. |
| T128 | **PASS** | Teacher UI does not alter student or Forms behavior | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T129 | **PASS** | Verifier is responsive in required themes and viewports | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T130 | **PASS** | Verifier keyboard, ARIA and contrast contracts pass | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T131 | **PASS** | CSV remains append-only and backward compatible | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T132 | **FAIL** | Untrusted verifier content is XSS-safe | Focused hostile text rendering passed, but global XSS sink inventory is 165 versus approved baseline 161. |
| T133 | **PASS** | Verifier is offline and CSP isolated | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T134 | **PASS** | A newly generated verifier is actually exercised | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |
| T135 | **PASS** | Normal/practice workflow remains unaffected | S04/S04.1 source + newly generated Teacher Verifier Chromium evidence |

A PASS here means the listed local source or Chromium contract passed on the tested product SHA. It is not a claim about a real iPad, AI Studio, Google service, GitHub Pages or production environment unless explicitly stated.
