# P3 - ecosystem standardization preparation

Status: LOCAL_IMPLEMENTATION / STAGED_NOT_ACTIVATED.
Baseline: GIT 7.1.96, original commit 7516768223602cec697f4fb173382c2b6d17aab4,
plus the uncommitted P0/P1/P2 package. P3 is not a completed ecosystem rollout.

## Delivered changes

- tools/ci-standard/standard.v1.json: invariants and activation/sharing contract.
- tools/ci-standard/registry.v1.json: eight explicit repository IDs; one staged adapter.
- tools/ci-standard/consumers/generator-testu.json: GIT role/tool/trust requirements.
- tools/ci-standard/safe-io.mjs, contract.mjs: bounded data parsing and strict contracts.
- tools/ci-standard/check.mjs: GIT integration with existing P1/P2 structural checks.
- tools/ci-standard/collect.mjs, compare.mjs: read-only bounded inventory and drift review.
- tools/ci-standard/reference.lock.json: local implementation hash ledger, not a signature.
- scripts/ci/p3.test.mjs: positive/negative unit and local Git tests.
- package.json: append P3 tests/adapter and expose diagnostic CLI commands.
- scripts/ci/preflight.mjs: retain all prior steps and append offline P3 contract before networking.
- scripts/ci/p2.test.mjs: update ONLY the plan-length expectation for the extra phase.

No workflow, composite action, source/runtime, trust policy, existing gate command,
package-lock.json or application version is changed relative to P2. A new offline
check adds small overhead; it does not remove independent work or promise speed.

## Before and after

BEFORE: each repository maintains its CI declarations independently; GIT P2 already
has local shared setup, parallel independent certifiers and protected admission.

AFTER (staged): the same GIT release DAG, plus a versioned structural reference and
read-only diagnostics. Each future consumer keeps its own release DAG, independent
execution and native protections. There is no cross-repository promotion controller.

Shared code != shared build != shared certification. Only reviewed implementation
sharing is in scope. Build reuse, browser cache, removal of duplicate builds,
removal of the deployment watcher, GARP 2.8 and server migration remain separate work.

## Partial cross-repository observations, 2026-10-06

These are connector reads of exact commits, NOT a complete ecosystem audit and NOT
output of the newly implemented collector. Other repositories were not changed.

| Repository | Observed commit | Scope actually read | Observed differences |
|---|---|---|---|
| generator-testu | 7516768223602cec697f4fb173382c2b6d17aab4 | uploaded complete baseline + P2; candidate ref | Node 22; separate candidate, PR and Journey checks; local staged P0-P2 |
| AI-Studio-GHRAB | b46353943e5130843a73297a6cfc1210291f7dce | ref, workflow listing (6), full P5 + safe-promotion | Node 22 in P5; workflow_run controller; Studio manifest/release-wave checks |
| Ludus | 5e7d2b3783af72a5e26799f773e18bcd1ce64455 | ref, workflow listing (8), full P5 | Node 24 in P5; GARP27_TRUSTED_POLICY_SHA256 from repository variable |
| SORTIO | 3d5425143d87c6e7aadeb81ebc865b5c8863b723 | ref, workflow listing (4), full P5 | Node 22 in P5; fixed per-app external trust pin; extra non-PR foundation/PREP |
| lesson-hub, diferenciator, korespondencni-asistent, Hodnotitel-maturitnich-slohu | NOT_SAMPLED | repository metadata only | NOT_PROFILED; no CI conformance conclusion |

The main-branch readings are sequential snapshots, not one atomic ecosystem state.
Workflow counts are directory inventory, not measurements of runs or coverage.
Different Node versions/trust pins are differences, not proof of errors. For example,
Ludus must not inherit GIT's Node 22 or GIT's external trust digest automatically.
Studio remains last in the proposed rollout because it consumes application release
identities; this is a design recommendation, not an observed technical dependency
that has been tested in this patch.

## Adoption gates and proposed order

1. GIT pilot only after the COMPLETE local preflight, native policy validation under
   the actual workflow identity, both independent hosted certifiers, P5/Journey and
   main/deploy/live verification. Test stale runs, two concurrent commits and rollback.
2. Select one leaf application (proposed SORTIO) and read its FULL current source,
   workflows, nested runners and protection state. Record baseline; implement its
   own adapter. Its tests remain independent and mandatory. No bulk copy of GIT YAML.
3. Migrate remaining leaf applications one repository per explicit review/PR. Ludus
   needs an explicit Node-24 and external-variable trust profile. Unprofiled consumers
   remain unprofiled until the adapter has been reviewed and tested.
4. Integrate Studio last after selected consumer release contracts are demonstrably
   interoperable. Revalidate downstream release identity and existing distribution
   workflows. No cross-repository secret sharing or automatic migration.

Do not create a remote reusable workflow with a made-up SHA. A future central
implementation must be committed/reviewed first, pinned to its immutable full SHA,
have least-privilege inputs and isolated concurrency groups, and be rolled out one
consumer at a time. Do not use secrets: inherit or an organization admin token as a
shortcut for policy visibility. Existing full-SHA action pins remain untouched.

## Versioning and blast radius

Version 1.0.0 is a staged internal proposal, not a new GARP version. Unknown versions
and fields fail validation. Intentional reference changes require code review, new
hash ledger, compatibility tests and a new protected commit. Cross-version changes
need a migration specification; they must not silently change the meaning of PASS.
Vendoring limits runtime blast radius: a change in one copy does not auto-update the
other seven repositories. The trade-off is explicit maintenance and review of copies.
The hash ledger alone is not an independent trust root.

## Acceptance and proof requirements

Local structural checks are useful but insufficient. Before any commit, all previous
preflight phases must PASS on the exact final source. After commit, hosted evidence
must bind repository ID, source commit, workflow identity, job/run/attempt and artifact
digest as required by the repository-specific chain. Preserve evidence before cleanup.
Different source SHA domains (PR head, synthetic merge, final main, workflow source)
must not be conflated. A diagnostic report can never be a required release certificate.

The current incomplete dependency installation and native main policy are independent
blockers. Do not turn them into advisory warnings or give a newer stage an ACTIVE flag.
No measured post-change CI speed is claimed. Actual runner/minute and wall-clock impact
is N/A until a verified hosted pilot and comparable repeated runs exist.

## Rollback

P3_ROLLBACK_TO_P2.patch removes this optional diagnostic layer and restores exact P2
source, including its original test count expectation/preflight plan. It does not
remove P0/P1/P2 protection, independent certifiers, readiness or exact-SHA guards.
Use rollback only against the exact packaged P3 source or rebase professionally.
Never restore an unprotected force update or deploy while required gates are RED.
A local file roundtrip/test run is not a production rollback rehearsal.

The cumulative patch and incremental patch are ALTERNATIVES. Apply cumulative only
to the original 7516768 snapshot, incremental only to the exact provided P2 package.
Newer candidate work requires merge/rebase and a fresh complete preflight; do not
upload an old full source ZIP over it.

## Primary source references

The user's master prompt: P3 lines 578-588, sharing distinction 411-425,
precommit requirements 628-648, no automatic other-repo modifications 683-689.

GitHub reads (commit-pinned, partial scope above):
https://github.com/Daniel22-dev/AI-Studio-GHRAB/blob/b46353943e5130843a73297a6cfc1210291f7dce/.github/workflows/safe-promotion.yml
https://github.com/Daniel22-dev/AI-Studio-GHRAB/blob/b46353943e5130843a73297a6cfc1210291f7dce/.github/workflows/p5-release-gate.yml
https://github.com/Daniel22-dev/Ludus/blob/5e7d2b3783af72a5e26799f773e18bcd1ce64455/.github/workflows/p5-release-gate.yml
https://github.com/Daniel22-dev/SORTIO/blob/3d5425143d87c6e7aadeb81ebc865b5c8863b723/.github/workflows/p5-release-gate.yml

Official semantics reference (not evidence of a successful implementation):
https://docs.github.com/en/rest/git/trees
https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
