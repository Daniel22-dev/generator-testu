# Validation report - 7.1.89 source candidate

Supplemental tests: 24 workflow + 40 render/shuffle + 3 actual dialog interactions + 24 mocked Google Apps Script = 91 passing scenarios. Syntax: 47 JS/GS files checked, no syntax errors. Selected static gates: see evidence/static-checks.json (13 pass, 2 environment-blocked).

The complete npm build did **not** finish: its prebuild stopped at the exercise-help test because pinned jsdom was unavailable. The CSP check was blocked by missing project Acorn. No CI result, production authentication, encrypted end-to-end assembly/grading, live AI request, real email delivery or physical mobile acceptance is claimed. Pinned dependencies and production safeguards were not bypassed. Existing historical reports in the repository are not new-version evidence.

Real modules were executed in a synthetic Chromium about:blank component harness, with deployment CSP removed in the harness and permit/storage mocked. An older separately installed Acorn parsed declarations only for that harness; no production parser pin was changed. See qa/workflow-7.1.89/README.md for repeatability and qa/workflow-7.1.89/evidence for actual results and screenshots.

Runtime identities, PWA cache version, AI operation registry, SBOM, AI boundary fingerprint and GARP inventory/trust hashes were synchronized for the candidate. Recomputed hashes establish consistency only, not a passed behavioral certification. Deploy through the existing unchanged gates after full dependency installation. Separate Apps Script installation and one teacher-address delivery test are mandatory before classroom distribution.

User-facing Czech report: REPORT-UPRAV-7.1.89.txt. Installation: NAVOD-ROZESILANI-7.1.89.txt.
