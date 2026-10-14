# Sprint 08 — certification blockers and controlled remediation proposals

Tested product checkpoint: `33fcffeae9ab5b59c3be7d1213cf23a59c3f6054`.

Verdict: **NO-GO for production release**. This document proposes follow-up work only. It does not authorize or apply a trust-anchor, pin, GARP policy or AI assurance fingerprint change.

## B01 — Windows F0 byte drift

Observed on Windows/Node.js 22 and 24 with `core.autocrlf=true`:

- `check:f0-ci-trust-pin`: exit `1`, `reviewed consumer profile does not match trust anchor`;
- Git/LF trust-anchor SHA-256: `afc16d2a0318a5448ef1855fb4966a326278ee95f47ce1e5c8bf2786aeedb279`;
- Windows working-file SHA-256: `9908c887ffbf2ae340b093d3cfb32820faa4b90afc4eef537b0b84a841568aa1`;
- the file contains 28 LF bytes in Git and 28 CRLF pairs after Windows checkout;
- all reviewed consumer/workflow pins still point to the approved LF digest;
- `.gitattributes` does not define a byte contract for the pinned input.

The same SHA exported with `core.autocrlf=false` passes F0 (8/8 pins), the full build and `qa:garp27:static`. This is an EOL checkout defect, not evidence that the approved pin should be rewritten.

Proposed owner-approved remediation:

1. Define `text eol=lf` for every byte-pinned trust/GARP input, not only the first failing file.
2. Re-checkout from a clean clone on Windows and Linux; prove Git blob, archive and worktree bytes agree.
3. Keep the approved `afc16d…` anchor digest unless an independent content review authorizes a new anchor.
4. Add a Windows mutation test that changes only EOL and proves the checkout contract prevents drift.
5. Re-run F0, build, GARP static/mutations and the complete release preflight before accepting the change.

## B02 — stale AI assurance fingerprint

`garp25:ai-evidence:check` exits `1`. The stored fingerprint is `4df59d23beb8c522042a4dc00c86a98ee0b7314e55e91c07956eb1c3245eaf08`.

- Canonical Git/LF fingerprint of the current approved product SHA: `3bee9a95a586c56d67fc74d173d7a78f3db32223230a949efa6f172c5374e210`.
- Windows working-file fingerprint: `b88856fa9913a568ebf79c98dd5e94f96018d2aa16053c58525264b931ef60e4`.
- Eight files have real post-assurance content changes: `01-core.js`, `03-ui-render.js`, `05-form-fields.js`, `05b-workflow-context.js`, `05c-exercise-suitability.js`, `12-prompt-builder.js`, `13a-secure-helpers.js`, `preview-editor.js`.
- Four additional Windows differences are EOL-only: `07z-ai-core-integration.js`, `08-manual-editor.js`, `09-selftest-keycheck.js`, `public/ai-operations.json`.

Proposed owner-approved remediation:

1. Independently review the eight semantic changes against the AI boundary and re-run the AIR/red-corpus behavior suite.
2. First make the fingerprint input byte policy platform-stable; otherwise a newly accepted value would remain host-dependent.
3. Generate the candidate evidence from the reviewed canonical source SHA, sign/record reviewer identity and attach all behavioral logs.
4. Update the committed fingerprint only in a dedicated, reviewable commit after explicit owner approval.
5. Negative-control the gate by mutating one boundary file and proving that the updated gate fails closed.

## B03 — incomplete GARP foundation evidence

In the canonical LF build:

- `qa:garp27:static`: PASS;
- contract gate: PASS 6/6;
- architecture integrity: PASS 41/41;
- policy mutations: PASS 6/6;
- architecture mutations: PASS 10/10;
- auto-patch contract: PASS;
- foundation gate: FAIL 0/11 because all required executed-evidence steps have `actualExit:null` and the source identity is not a live certified run.

Proposed remediation is to execute the existing foundation workflow on the exact reviewed SHA in the authorized Linux/GitHub environment, retain signed immutable artifacts, then run the consumer against those artifacts. Do not fabricate exit codes or downgrade missing evidence to PASS.

## B04 — Windows/Linux CI divergence

Windows CRLF/Node 22: `180/205 PASS`, `25 FAIL`. A canonical LF copy exposes `409/436 PASS`, `27 FAIL` after a local `where.exe` compatibility shim. The remaining failures are:

- 20 tests that require creating symlinks and fail with `EPERM` on this host;
- 7 process/orchestration tests with Unix command/process assumptions even after `which` is available.

EOL-sensitive workflow and digest failures disappear in the LF copy. An independently supplied prior Linux run reported 436/436 PASS, but Linux was not available for a new local run in Sprint 08 and is therefore **NOT VERIFIED** for this checkpoint.

Proposed remediation:

1. Keep Linux as a mandatory release runner for symlink security cases.
2. Add an explicitly supported Windows runner with Developer Mode/symlink privilege, or report those tests as platform-not-executed rather than PASS.
3. Replace Unix-only discovery with an audited cross-platform helper; do not fake `which` in production CI.
4. Normalize line endings only where the contract is semantic text; preserve byte-exact hashing for trust inputs under an explicit LF checkout policy.
5. Require equal test inventory and machine-readable scenario IDs on both platforms.

## B05 — newly discovered regression/certification failures

These were not repaired during Sprint 08 because the task was certification and the common causes require a separately reviewed remediation:

- source structure: `13e-secure-student-runtime.js` is 90 kB and `13f-secure-teacher-verifier.js` is 91 kB, both over the 90 kB limit;
- headless workflow: rejected verifier rows are not retained as the old harness expects;
- workflow audit: secure submit is visible on the first exercise;
- workflow update: reducing exercise count leaves 8 configurations where 4 are expected;
- D7 effective analytics: extracted runtime omits `isDiagnosticQuarantine`;
- old verifier/forgery tests expect score `0` for rejected quarantine records, while the current S07 contract intentionally leaves score unavailable;
- old publication fixtures are rejected by the strengthened S02 pedagogical validator;
- negative storage/runtime tests lack required historical baseline paths;
- XSS sink inventory is 165 against baseline 161;
- QA quality budgets fail 5/41 checks: total dist, entry HTML, entry critical bytes, precache bytes and largest file exceed their limits;
- `qa:browser` and `qa:runtime` complete their assertions but do not finish cleanly on Windows; `qa:axe` times out opening the debug endpoint;
- joker browser completes 21 assertions but does not terminate without intervention.

Each item needs a minimized reproduction on the exact product SHA, classification as product defect versus stale harness, and a narrowly scoped follow-up commit. Test expectations must not be weakened merely to obtain green output.
