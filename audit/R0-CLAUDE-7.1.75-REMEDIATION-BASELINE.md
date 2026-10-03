# R0 — Claude 7.1.75 remediation baseline

Date: 2026-10-02

Authoritative input artifact:
- `generator-testu-7.1.75-SECURITY-FINAL.zip`
- SHA-256: `cdf24436b56955c04c410e2f49a22530ebd5f55d028454670db0b197aea96837`

Independent audit source:
- `AUDIT-GIT-7_1_75-SECURITY-PACKAGE.txt`
- auditor verdict: `NOT READY`

Remediation stages are intentionally scoped:
- R1: fix CRITICAL Teacher Verifier syntax breakage and add a generated-script syntax gate.
- R2: close the credential-policy bypass through `applySettingsWithoutAi()` / every assembly path.
- R3+: repair obsolete fixtures/workflow tests, add behavior-first adversarial coverage, then address remaining accepted findings and release as 7.1.76 only after final gates pass.

R0 makes no product-behavior change. Version remains 7.1.75 during remediation checkpoints.
