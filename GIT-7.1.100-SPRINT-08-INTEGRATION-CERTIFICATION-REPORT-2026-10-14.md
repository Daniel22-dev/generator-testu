# GIT 7.1.100 V7 — Sprint 08 integration and certification report

Date: 2026-10-14

Approved product checkpoint under test: `33fcffeae9ab5b59c3be7d1213cf23a59c3f6054`

Isolated branch: `codex/sprint-08-integration-certification`

Release verdict: **NO-GO**

Sprint 08 performed certification, evidence collection and release planning. It did not change application runtime, scoring, crypto, Recovery, Forms, Teacher Verifier, Strict Mode, GARP policy, trust pins or the AI assurance fingerprint. It performed no push, merge, staging, deployment or production release.

## 1. Environment and provenance

- Windows x64, Europe/Prague.
- Official Node.js `v22.16.0` Windows x64 archive; downloaded archive SHA-256 `21c2d9735c80b8f86dab19305aa6a9f6f59bbc808f68de3eef09d5832e3bfbbd`, matching the official SHASUMS file checked during setup.
- Chromium `149.0.7827.55` through Playwright `1.61.1`.
- Product tests ran on the exact approved SHA above. The final Sprint 08 commit is documentation/test-only and is recorded in the handoff manifest after commit.
- `candidate` and `main` remained at `d7bf7875a33ca97fd619cd403a276973b23d14ea` during implementation.
- WSL, Docker and Podman were unavailable. A fresh Linux run is **NOT VERIFIED**; prior supplied Linux evidence is not relabeled as a new Sprint 08 execution.

## 2. F0 and line endings

| Environment | Command | Exit | Result |
|---|---|---:|---|
| Windows CRLF, Node 24 | `check:f0-ci-trust-pin` | 1 | **FAIL** — consumer profile does not match trust anchor |
| Windows CRLF, Node 22 | same gate | 1 | **FAIL**, same cause |
| Canonical LF export, Node 22 | same gate through `build` | 0 | **PASS**, 8/8 workflow pins |

The approved Git/LF anchor hash is `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`; the Windows CRLF worktree hash is `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`. No pin was modified. The root cause and the proposed safe remediation are in `docs/S08-CERTIFICATION-BLOCKERS.md`.

## 3. Build, GARP and assurance

The canonical LF checkout used the previous local dist only as the prebuild bootstrap required by existing S05 checks; the successful build then regenerated dist from the approved source.

| Command | Exit | Result |
|---|---:|---|
| `npm run build` (canonical LF, Node 22) | 0 | **PASS** |
| `npm run qa:garp27:static` | 0 | **PASS** — contracts, architecture, policy and architecture mutations, auto-patch contract |
| `npm run garp25:sbom:check` | 0 | **PASS** — 113 components |
| `npm run check:production` | 0 | **PASS** — static production/verifier contract |
| `npm run garp25:ai-evidence:check` | 1 | **FAIL** — stale AI assurance fingerprint |
| `npm run qa:garp27:foundation` | 1 | **FAIL** — 0/11 executed evidence; required exits are null |

GARP static integrity is healthy in the canonical byte environment, but complete GARP certification is not. Missing foundation evidence remains a hard blocker.

## 4. Windows versus canonical LF CI

- Windows CRLF/Node 22: **180/205 PASS, 25 FAIL**, exit `1`.
- Canonical LF/Node 22 with a local command-discovery compatibility shim: **409/436 PASS, 27 FAIL**, exit `1`.
- Remaining canonical-LF failures: 20 symlink cases rejected by Windows with `EPERM`; 7 Unix-oriented process/orchestration cases.
- All nine per-sprint CI wiring gates, S05/S06/S07 traceability gates and the standalone CI standard passed when executed separately.

The different test totals are retained exactly as emitted by the runner; they are not normalized or merged. The raw logs are part of the ZIP.

## 5. Core source and functional regression results

The successful LF build executed the complete prebuild chain, including S01 credentials/Recovery, S02 pedagogy, S03 session/scoring, S04/S04.1 verifier, S05 Strict Mode, S06 pedagogical AI, S06.1/S06.2 identity/quarantine and S07 teacher workflow.

Additional PASS gates include Forms F1–F9, version/manifest/lockfile/action pins, assistant/RPC/CSP, runtime UX, full roster, joker source workflow, productive contract, randomization, sensitive-data scan, GARP 2.3, timers, lint, precache, platform verification, S03/S05/S06/S07 traceability, red-team isolation/trust/storage/runtime/mobile/content/release/CI, R3/R5 security, and history/recovery/private-review contracts.

Confirmed FAIL gates:

1. `check:structure`: two modules exceed 90 kB.
2. `test:headless:dist`: rejected verifier rows do not satisfy the historic diagnostic assertion.
3. `test:workflow`: secure submit is visible on the first exercise.
4. `check:workflow-update`: reducing the selected count does not reduce the configuration array.
5. `qa:d7:ci`: extracted verifier analytics runtime lacks `isDiagnosticQuarantine`.
6. Legacy verifier/forgery source gates expect score `0` for quarantined rejected rows; the current contract leaves score unavailable.
7. Publication source fixtures are rejected by the strengthened pedagogical validator.
8. Historical-negative runtime/storage gates were not supplied their required baseline paths.

## 6. Browser evidence over newly generated artifacts

PASS with exit `0`:

- S01 Recovery/credential Chromium;
- S02 pedagogical fidelity Chromium;
- S03 session/scoring/Reading Chromium;
- S04/S04.1 newly generated Teacher Verifier: 28 checks, 13 synthetic attempts, 302-event chronology, 0/7/49/96/missing split values, CSV, dark/light and four viewports;
- S05 Strict Mode Chromium, split policy still `SHADOW/AUDIT-ONLY`;
- S06 pedagogical AI Chromium;
- S06.1 identity/quarantine Chromium;
- S06.2 diagnostic remediation Chromium;
- S07 teacher workflow Chromium;
- synthetic Forms lesson browser: 24/24;
- workflow-update browser;
- red-team isolation, trust, storage, runtime, mobile recorder and restart browser.

FAIL or incomplete:

- verifier and forgery browser harnesses expect numeric zero on rejected quarantine records and fail on `undefined`;
- red-team content browser expects `CONTENT_READY` at a different point and fails;
- joker browser prints 21 PASS assertions but does not terminate; it was interrupted and is not counted as exit-code PASS;
- `qa:quality`: 36/41 PASS, five size/performance budgets exceeded;
- `qa:browser`: all reported checks PASS, then Windows profile cleanup fails with `EBUSY`; exit `1`;
- `qa:runtime`: reports 24 states, zero blockers and status passed, but the process does not terminate; not counted as clean PASS;
- `qa:xss`: exit `1`, 165 sinks versus baseline 161;
- `qa:axe`: exit `1`, Chromium debug timeout.

No generated student HTML, answer key or private teacher verifier is committed or included in the handoff ZIP. Machine-readable evidence and screenshots are included; generated private fixtures remain excluded.

## 7. T01–T135

Executable traceability result:

- **105 PASS**
- **7 FAIL**
- **22 NOT VERIFIED**
- **1 DEFERRED** (`T110`)

The complete row-by-row matrix is `docs/S08-CERTIFICATION-TRACEABILITY.md` and `docs/evidence/S08-T01-T135.json`. `scripts/check-s8-certification-contract.mjs` asserts all 135 unique IDs, status vocabulary, T110 deferral, isolated branch, unchanged protected trust/assurance files and unchanged production version.

## 8. Real environments not verified

- physical iPad/iPadOS/Safari, Android, Stage Manager and physical split-screen calibration;
- automatic split-screen LOCK, intentionally disabled pending separate approval;
- embedded AI Studio host/WebView;
- live AI provider responses;
- live school Google Forms, Sheets, Apps Script authorization and MailApp delivery;
- GitHub Pages/staging cache and republish behavior;
- GitHub-hosted Linux CI and live branch-protection/ruleset behavior;
- production promotion, deployment and rollback.

## 9. HACK 4A4 handling

Only sanitized category-level obligations were used. Consent-based possession of a Recovery code or inspection of public client source was not treated as a successful attack. No real classroom record or private teacher artifact is in the repository or ZIP. See `docs/S08-H4A4-SAFE-REGRESSION.md`.

## 10. Changes made in Sprint 08

Certification-only files:

- `scripts/check-s8-certification-contract.mjs`;
- `package.json` — adds only the S08 contract command;
- `docs/S08-CERTIFICATION-TRACEABILITY.md`;
- `docs/evidence/S08-T01-T135.json`;
- `docs/S08-CERTIFICATION-BLOCKERS.md`;
- `docs/S08-SAFE-RELEASE-RUNBOOK.md`;
- `docs/S08-H4A4-SAFE-REGRESSION.md`;
- this report.

No application, runtime, policy, pin, fingerprint, workflow or release branch file was changed.

## 11. Final decision

Sprint 08 evidence collection is complete enough for independent audit, but GIT 7.1.100 is **not certified for production**. The four inherited certification blockers remain open and new regression-gate failures were discovered. The safe next action is an owner-authorized, narrowly scoped remediation checkpoint followed by a fresh independent audit; not a candidate merge or deployment.
