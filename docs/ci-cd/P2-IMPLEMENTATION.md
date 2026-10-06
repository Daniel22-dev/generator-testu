# CI/CD P2 - shared setup, independent execution

Status: implemented locally over the uncommitted P0+P1 package. NOT approved for
commit, activation or production. A complete final-source `npm run ci:preflight`
and the P1 governance requirements remain mandatory. Local unit/contract tests
are not a GitHub-hosted certification or evidence of deployment performance.

## Scope and boundaries

This is the common-setup/provenance part of P2, not completion of every P2
optimization candidate. Two repository-local composite actions replace repeated
setup definitions for candidate-gate, pr-certification, qa-build, p5-release-gate
and journey-e2e. Their code comes from each job's exact checked-out source SHA.
They share implementation, NOT runners, installed node_modules, build artifacts,
browser binaries or certification results. Every job still runs its own clean
locked npm install and every original test/admission chain.

No new build cache, browser cache, artifact import, certificate reuse, test
sharding, conditional test selection or cross-repository workflow is introduced.
The existing npm download cache is retained with an explicit package-lock.json
key input; a cache hit never skips npm ci. Node remains the existing major 22,
not an immutable patch version; ubuntu-latest and npm delivered with Node are
also not newly made immutable. Actual node/npm/platform values are recorded.
External Actions keep their existing full-SHA pins and package-lock.json is
unchanged. The existing Python installation and audit requirements are unchanged.

## Implementation

- `.github/actions/setup-ci-node/action.yml` centralizes the existing setup-node
  v4 pin, Node 22, public npm registry and download-cache configuration.
- `.github/actions/install-ci-tools/action.yml` requires an explicit expected SHA
  and the original browser variable for that job. It invokes
  `scripts/ci/setup-tools.mjs`; inputs are passed as environment variables, not
  inserted into shell code.
- The setup runner checks the Actions identity and actual clean Git checkout,
  always runs the original locked npm ci command, checks exact direct dependency
  versions against the manifest and lockfile, and runs the installed local
  Playwright CLI via Node. There is no npx fallback that can obtain a different
  tool if the local installation is missing. Version checks alone are not a new
  cryptographic package attestation; npm ci and lock integrity remain required.
- The original P5 hard-coded axe/Playwright checks remain as a separate step after
  the common setup. Equivalent manifest/lock/installed-version checks run before
  browser installation within the helper. No runtime test is removed.
- Setup evidence is written outside the checkout and destructive qa-results/dist
  cleanup under RUNNER_TEMP/generator-ci-tools/RUN-ATTEMPT-JOB/toolchain.json.
  It records only setup provenance, timings and source/lock binding. PASS is NOT
  release admission. It cannot be used to skip any certification gate.
- Each consumer uploads this one report with a unique SHA/run/attempt/job name,
  14-day retention and missing-file errors. A failed or incomplete setup remains
  failed. Forceful cancellation or context initialization failure may prevent a
  report/upload; this is never reinterpreted as a certificate or success.
- A second setup invocation within the same job/attempt is rejected, not reused.
  New jobs and rerun attempts perform independent installations.
- `scripts/check-action-pins.mjs` now inspects nested local action metadata too;
  local wrappers do not hide unpinned external uses. This conservative reference
  scanner is not a complete YAML parser. actionlint remains a separate gate.
- `scripts/redteam-source-snapshot-e9.mjs` includes local action definitions and
  an optional repository .npmrc in the source fingerprint and rejects symlinks.
  setup-node's pinned implementation creates its own npmrc in RUNNER_TEMP, not
  the repository. Historical snapshots have an older scope and are NOT new P2
  certification results. No historical security evidence is relabeled PASS.
- `scripts/ci/p2-workflow-contract.mjs` and `p2.test.mjs` enforce the shared
  definitions, all five consumers and fail-closed behavior. The E9 contract now
  follows the real shared setup implementation instead of requiring obsolete
  inline install text; its original 14 negative controls remain.
- The preflight retains the original 28 P1 phases and adds two offline setup/pin
  checks before registry access. Its browser command uses the local pinned CLI.
  Full test chains, advisory audit, Python suites and live policy guard remain.

## Why other repeated work stays

qa/qa-manifest.json installs with `npm ci --no-fund`, whereas initial CI setup
uses `npm ci --ignore-scripts --no-audit --no-fund --registry=...`. Lifecycle
semantics differ. Removing either installation without a full equivalence proof
is not justified. QA/foundation/P5 builds also clean or mutate dist and evidence.
They are not replaced with an imported build. The deploy watcher remains until
a separately tested completion protocol can replace it without weakening the
release-success definition. None of these holds is a claim that optimization is
impossible; they are explicit unimplemented follow-up work.

## Acceptance and rollout

1. Apply the incremental patch ONLY to the exact P1 package, or the cumulative
   P0+P1+P2 patch ONLY to the original 7516768223602cec697f4fb173382c2b6d17aab4
   source. They are alternatives. Rebase rather than overwrite a newer branch.
2. Obtain the locked toolchain and network access. Run full ci:preflight. Do not
   treat dependency-free tests, syntax fallback, mocked APIs or synthetic npm
   fixtures as real browser/foundation/P5 certification.
3. Resolve P1 native branch protection and workflow-token policy visibility.
   Do not insert an administrator credential into candidate-executed code or
   treat a hidden bypass list as empty. The supplied P1 guard remains closed.
4. Only after full PASS commit precisely the tested source. Do not stage
   node_modules, generated dist/qa-results, local .git metadata or test artifacts.
   Stop old incompatible release orchestration before the approved cutover.
5. Require independent hosted candidate/PR/P5/Journey/admission results, complete
   main certification, successful Pages deployment and live identity verification.
   Validate composite-action environment propagation with the real workflow token.
6. Compare cold/warm setup timings, evidence contents and critical-path timing
   against the baseline. No time savings are claimed from the local results.
   Added integrity/provenance work can add overhead even while reducing drift.

## Rollback

P2_ROLLBACK_TO_P1.patch restores the exact P1 source. It retains P0 evidence and
lease fixes and P1 independent certification/admission safeguards; it does NOT
restore unsafe force writes. Existing P1 activation blockers still apply.
Invalidate P2 setup reports/fingerprints as evidence for any later source, then
rerun the complete preflight and hosted certification. Local patch roundtrip and
regression tests do not establish a production rollback rehearsal.

## References (semantics, not proof of hosted execution)

- https://github.com/actions/setup-node/blob/49933ea5288caeca8642d1e84afbd3f7d6820020/README.md
- https://github.com/actions/setup-node/blob/49933ea5288caeca8642d1e84afbd3f7d6820020/src/authutil.ts
- https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax
- https://raw.githubusercontent.com/microsoft/playwright/v1.61.1/packages/playwright/package.json
- https://playwright.dev/docs/ci
