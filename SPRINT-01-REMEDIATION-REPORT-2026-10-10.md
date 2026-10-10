# GIT 7.1.100 V7 — Sprint 01 review remediation report

Date: 2026-10-10 (Europe/Prague)

## Verdict and scope

The targeted remediation requested by the independent Sprint 01 review is implemented at source commit `607ea355ef1e5fee9cfa6e6460fe36bc15b148c1` on `work/git-7.1.100-v7-20261009`.

- F-01 teacher-login close/logout race: **FIXED and regression-tested**.
- F-02 S1 browser gate disconnected from certification: **FIXED** by making `check:s1-recovery-browser` a blocking `qa:p5:ci` step after `build`.
- F-03 evidence provenance: **FIXED for S1 evidence** with exact Git HEAD, clean-tree assertion, timestamps, Node/Playwright/browser versions, scenario results and SHA-256 artifact digests.
- F-04 external acceptance: **NOT VERIFIED**; physical Safari/iPadOS, native password-manager behavior and authorized GitHub Pages staging were not simulated or claimed.

No Sprint 02 work, release, deployment, merge, `candidate`/`main` write or GARP trust-pin update was performed.

## Audit reproduction and correction

The supplied hotfix file was verified before use:

- file: `SPRINT-01-AUTH-CLOSE-RACE-HOTFIX.patch`
- expected and observed SHA-256: `5bc988b2203b50f6a71d6edf76db544a9bb5ef2c2b3e868b0f36dfae961f352d`
- `git apply --check --whitespace=error-all`: exit `0` against pre-remediation HEAD `e8820e902d73dcf54972155fbafc88a22db19cf5`

The source finding was confirmed: `doTeacherLogin()` awaited PBKDF2 authorization and then enabled `teacherLogged` without checking whether `closeTeacherModal()`/`logoutTeacher()` had happened while the authorization was pending. A test-only working-tree reproduction against source HEAD `e8820e9` failed both the single late-success and two-concurrent-login assertions.

The reviewed epoch design from the supplied patch was retained and extended:

- every teacher login captures a new monotonic authentication epoch;
- a newer login supersedes an older result;
- close/logout increments the epoch and immediately removes teacher privilege;
- a stale async result returns without changing login/error/panel state;
- credential input cleanup remains in `finally`;
- a fresh legitimate login still works after cancellation and explicit logout still removes privilege.

The E3 regression resolves two authorization promises out of order after modal close and proves that neither can restore `teacherLogged` or expose the privileged panel.

## Changed files in implementation commit

| File | Change |
|---|---|
| `src/js/14b-instant-test-runtime.js` | Monotonic teacher-auth epoch; close/logout invalidates pending authentication. |
| `scripts/check-security-credential-e3.mjs` | Single and concurrent late-success race regressions; legitimate re-login/logout checks. |
| `scripts/check-recovery-browser-s1.mjs` | Real-Chromium concurrent close race plus self-bound provenance and scenario outcomes. |
| `scripts/check-s1-ci-wiring.mjs` | New fail-closed wiring/pin/evidence contract with negative mutations. |
| `package.json` | Blocking S1 step added to `qa:p5:ci` immediately after `build`; wiring contract added to CI orchestration. |
| `.github/workflows/p5-release-gate.yml` | S1 JSON retained in P5 audit evidence. |

The only additional tracked file after the implementation commit is this report.

## S1 CI and evidence behavior

The mandatory chain now contains:

```text
... npm run build && npm run check:s1-recovery-browser && ...
```

`qa:p5:ci` is invoked by the existing P3, P4 and Stage-B browser-enabled workflows. The final P5 and safe-promotion admission paths reach it through `qa:redteam:ci`; their shared tool installer uses the locked local Playwright CLI with `install --with-deps chromium`.

The new contract rejects:

1. removal of S1 from `qa:p5:ci`;
2. a non-exact Playwright version;
3. removal of the S1 evidence artifact from the P5 upload.

Measured on this host, the successful standalone S1 npm command took `20.326 s`; execution inside the script from `startedAt` to `completedAt` took `7.762 s`. This is one additional headless Chromium launch in the required CI chain. Actual GitHub-hosted-runner duration remains **NOT VERIFIED**.

## Exact validation environment

- tested source SHA: `607ea355ef1e5fee9cfa6e6460fe36bc15b148c1`
- checkout: independent detached clone, `core.autocrlf=false`, clean tracked tree
- Node.js: `v22.23.3`
- npm: `12.2.0`
- OS: Windows x64
- Playwright: `1.61.1` from lockfile
- Chromium: `149.0.7827.55`, Playwright browser revision directory `chromium-1228`
- dependency install: `npm ci --ignore-scripts --no-audit --no-fund`, exit `0`, 112 packages

## Required security and regression results

All rows below were executed against exact source SHA `607ea355ef1e5fee9cfa6e6460fe36bc15b148c1` unless explicitly marked otherwise.

| Command / gate | Exit | Result | Evidence summary |
|---|---:|---|---|
| `npm run check:r2-credential-policy` | 0 | PASS | Distinct/strong credentials and fail-closed assembly policy. |
| `npm run check:r4-recovery-runtime` | 0 | PASS | Serialized recovery, fail-safe cleanup and attempt continuity. |
| `npm run check:credential-security` (E1/E2/E3) | 0 | PASS | Role separation, domain separation, late-close and two-request race. |
| `npm run check:secret-hygiene` (E5) | 0 | PASS | DOM/persistence/export/prompt hygiene and scanner regressions. |
| `npm run check:security-adversarial` (E6) | 0 | PASS | Recovery/Teacher authority boundaries and replay separation. |
| `npm run check:s1-ci-wiring` | 0 | PASS | Required chain, pinned browser and retained evidence; negative mutations pass. |
| `npm run build` | 0 | PASS | Build `1689.7 kB`; platform conformance `119/119`; prebuild includes F0 and credential gates. |
| `npm run check:s1-recovery-browser` after build | 0 | PASS | Three scenarios including two pending logins completed second-then-first after close. |
| `npm run check:forms-workflow` | 0 | PASS | `59/59` unit/source Forms contracts. |
| `npm run check:forms-lesson-browser` | 0 | PASS | `24/24` synthetic Chromium Forms/lesson regressions. |
| `node scripts/check-recovery-export-contract.mjs` | 0 | PASS | Distinct packages, reuse denied, fresh-session identity. |
| `npm run check:verifier-generated-syntax` | 0 | PASS | Generated verifier inline script and required functions parse. |
| `npm run check:redteam-verifier` | 0 | PASS | 8 synthetic cryptographic/import/export checks. |
| `npm run check:redteam-verifier-browser` | 0 | PASS | Real generated HTML in desktop Chromium; real WebCrypto/IndexedDB. |
| `npm run check:f0-ci-trust-pin` | 0 | PASS | 8 workflow pins equal `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`. |
| `npm run qa:garp27:static` | 0 | PASS | Contracts 6/6, architecture 41/41, policy mutations 6/6, mutations 10/10, auto-patch PASS. |
| `npm run qa:lock` | 0 | PASS | 7 direct dependencies, 113 locked packages. |
| `npm run qa:garp23` | 0 | PASS | Suite lifecycle 42/42 and security regression 83 passed. |
| `npm run check:workflow-update` | 0 | PASS | 12/12. |
| `npm run check:workflow-update-browser` | 0 | PASS | 7/7 in Chromium. |
| `npm run qa:quality` | 0 | PASS | 41/41; performance budgets met. |
| `npm run qa:xss` | 0 | PASS | Sink inventory did not exceed baseline. |
| `node scripts/check-sensitive-data.mjs` | 0 | PASS | 79 public source files; no forbidden sensitive data. |
| S1 evidence raw-credential scan | 0 | PASS | Neither synthetic Teacher/Admin nor Recovery plaintext appears in the JSON. |

The first manual S1 invocation before creating `dist/index.html` returned exit `1` with `ENOENT dist/index.html`. This was a harness-order failure, retained here for accuracy; the mandatory CI chain places S1 after `build`, and the correct build → S1 sequence passed.

## P5 status and environment-specific failures

`npm run qa:p5:ci` was invoked without bypasses on the same exact SHA and returned exit `1` before reaching its build/S1 step. Existing CI-orchestration tests require Linux/POSIX capabilities unavailable on this Windows runner:

- `fs.symlinkSync(...)`: `EPERM: operation not permitted` for five negative symlink tests;
- `spawnSync which`: `ENOENT` for Git fixture tests.

Accordingly the complete P5 chain is **NOT VERIFIED on its intended Linux runner**, not reported as PASS. No test was weakened or skipped inside the chain.

Additional direct P5 observations:

- `npm run qa:browser` completed all functional checks with report status `passed`, but the command returned exit `1` because Windows kept `Account Web Data` locked during temporary-profile cleanup (`EBUSY`).
- `qa:runtime` and required `qa:axe` returned exit `1` with `Chromium debug timeout`; these scripts use POSIX `/tmp/...` profile paths and were not certified on this Windows host.
- These failures are recorded as **FAIL/NOT VERIFIED environment**, not converted into green results. The Playwright-based S1, Forms and verifier browser suites all passed on the same Chromium binary.

## Self-bound evidence and hashes

`qa-results/recovery-browser-s1.json` records:

- source HEAD `607ea355ef1e5fee9cfa6e6460fe36bc15b148c1` and `trackedTree: clean`;
- start `2026-10-10T05:24:43.336Z`, completion `2026-10-10T05:24:51.098Z`;
- Node `v22.23.3`, Playwright `1.61.1`, Chromium `149.0.7827.55`;
- gate-script SHA-256 `3784b32c75780101507ad5bf8afee17a070cb92d45d8239527a0af3e94e4826f`;
- package-lock SHA-256 `a481268adeb64617b2b6f5201970b7fb3338b416228622644b16ec7982eff199`;
- instant HTML SHA-256 `53812829b2505ffbdfb39cc0214b4e058111a30466ac112f05a1a5024d7d9fe4`;
- secure student HTML SHA-256 `cc24cb7a9801f9b35acf91229b913d4caad3cbcc031dcea5038040077ce92aff`;
- secure verifier HTML SHA-256 `897df7a6e2cdc232307f014909abe959d670729c829601c2d092bff193fd5eb8`.

Evidence-file SHA-256: `75508c36a7a57c8146c26233cd95c2a58d88db2fedb26f4b9231059e9a4058dc`.

The JSON contains synthetic scenario descriptions and hashes only; no raw Teacher/Admin or Recovery credential, real student data or private verifier is present.

## Trust integrity

The remediation changed no file under `security/garp27/` and did not change `tools/ci-standard/consumers/generator-testu.json`. The P5 workflow edit only adds the S1 evidence path; its F0 trust pin remains unchanged. No trusted hash was rewritten.

## Remaining risks / NOT VERIFIED

- Full `qa:p5:ci` on Ubuntu Node.js 22 and actual GitHub-hosted timing.
- Physical iPadOS/Safari and supported desktop Safari/Firefox behavior.
- Native password-manager/autofill prompts and browser-owned credential copies.
- Authorized GitHub Pages staging, cache/old-URL behavior and real BFCache/tab lifecycle acceptance.
- Static GitHub Pages remains client-controlled: DOM cleanup cannot prevent capture by DevTools, extensions, injected scripts, a compromised origin, or a student controlling the client.

The remediation stops here pending independent GO / NO-GO review.
