# CI/CD P1 - guarded independent parallel certification

Status: LOCAL IMPLEMENTATION / FULL PREFLIGHT BLOCKED / NOT ACTIVATED.
Base: the uncommitted P0 package, originally based on
7516768223602cec697f4fb173382c2b6d17aab4 (GIT 7.1.96).
P0 is not treated as certified: a complete combined preflight is mandatory.
No runtime, student data, GARP policy, dependency version or lockfile changes.

## Before and after

Before (P0): candidate-gate -> open PR -> pr-certification -> promote -> main QA/deploy.
After (P1): prepare -> [candidate-gate || pr-certification] -> release-admission -> promote.
The independent P5 and Journey workflows still start separately for the candidate.
The deploy workflow and its entire main certification are unchanged from P0.

Both certification jobs use a fresh checkout of the same event SHA, a separate
runner, independent dependency installation, build and test execution, and their
own evidence. No build artifact or certification result is shared between them.
Every existing reporter/QA/platform/red-team command remains in the same order.
Preparing a PR is not a certification or permission to merge it.

## Protection is a prerequisite, not an unchecked feature flag

`node scripts/ci/main-protection.mjs --live` must pass BEFORE prepare creates a PR.
It rechecks the same rule protection in admission and inside the promotion lock.
It requires repository ruleset 23603155 to be active, explicitly scoped to main,
with no exclusions and a VISIBLE EMPTY bypass list. It also reads all effective
rules for main from the branch-rules API, with bounded pagination.

All of these native required checks must be bound to GitHub Actions (app 15368):

- candidate-gate
- pr-certification
- p5-release-gate
- journey-e2e
- release-admission

Enable strict up-to-date status checks. Keep PR-only updates, protection from
deletion and non-fast-forward updates. Do not remove other existing rules.
Merge queues need a separate design and are not supported by this P1 change.

The live main ruleset was strengthened on 2026-10-06: all five required checks
are bound to GitHub Actions app 15368, strict up-to-date checks are enabled, the
main-only scope has no exclusions, and the administrator-visible bypass list is
empty. A JSON file containing PASS, or an arbitrary environment flag, cannot
substitute for the live reads. There is no fallback to looser protection on a 403
or timeout.

IMPORTANT API LIMIT: GitHub hides bypass_actors from the normal GITHUB_TOKEN
because that token lacks ruleset-write permission. A controlled hosted rehearsal
confirmed that the same token still sees ruleset identity, updated_at,
current_user_can_bypass=never, the five GitHub Actions checks, strict policy and
the effective main rules. The administrator-visible revision was separately
verified with bypass_actors=[]. That exact revision is recorded in
security/ci/main-ruleset-attestation.json and hash-pinned by main-protection.mjs.
Hidden bypass metadata is accepted only while live ruleset.updated_at exactly
matches that reviewed attestation. Any later ruleset change fails closed until a
new administrator-visible attestation is reviewed. No administrator credential or
secret is exposed to candidate-controlled workflow code.

## Admission is explicit and read-only

GitHub can treat skipped/neutral checks as acceptable required checks. Therefore
release-admission uses `if: always()` and inspects `needs` itself. Prepare and BOTH
certifications must report result=success, eligible="true", and the exact SHA.
Missing, cancelled, skipped, neutral, false, or another SHA is a failure.
The admission job does not merge, push, update rules, or deploy anything.

It also verifies P5 and Journey using workflow-specific run lists, exact SHA,
candidate branch, same head repository, allowed trigger, expected workflow path,
run ID, attempt, gate job and GitHub Actions check identity. Both workflow and job
must conclude success. A running duplicate prevents reuse of an older green
result. Any non-success completed eligible run blocks; a green duplicate does
not mask it. This examines the API's current run attempts, not every historical
attempt. The REST API is not an atomic historical snapshot.

The same independent gates are rechecked inside the promotion lock. All API
errors and pagination-limit failures stop admission. Waiting is bounded.

## Freshness and concurrency

Prepare captures candidate and current main SHA; current main must be an ancestor
of candidate. Both jobs and final admission check candidate, PR identity, source
repository, branch names, checkout HEAD, and the captured main again.
If main moves, the old proof is no longer admitted. Update/rebase candidate and
rerun the full checks; never reinterpret the older result as testing the new SHA.
Native strict status checks cover the main-update race at merge time in addition
to explicit local checks. Merge retains --match-head-commit.

A no-content-change candidate does not issue a new release admission. Manual
runs for such a candidate may fail with a no-change notice rather than creating
an unnecessary PR. Old/superseded jobs are allowed to fail or cancel; no green
no-op output grants permission to merge.

Preparation, both validations and admission have separate cancellable groups.
The promotion transaction retains cancel-in-progress:false and its existing
watch of the production deploy, then uses P0's explicit candidate lease.
This is not protection against manual cancellation, runner loss or a future
administrator changing repository policy. Pending concurrency slots are not a
durable FIFO queue. P2 may replace the waiting runner; P1 does not do that.

## Controlled rollout - do not upload this ZIP directly to production

1. Prepare a network-enabled Linux environment and run the combined checks.
   Required tools: Git, Bash, Node 22, Python/venv, actionlint 1.7.7, GitHub CLI.
   The full command is `npm run ci:preflight` (28 stages including live protection).
   It MUST remain BLOCKED until the live-policy prerequisite is satisfied in
   steps 2-4 below. Preparation and fixture tests can happen first; no project
   commit is allowed yet. A partial run, syntax fallback or unit-test PASS is
   NOT sufficient. Step 5 is the final complete pre-commit run.
2. Rehearse on an isolated repository/environment before production activation:
   verify token metadata visibility, required-check names, the actual native
   blocking behavior for red/skipped/cancelled checks, and the new DAG.
   A test fork has a different ruleset ID: update that ID only in the isolated
   test copy. Never pretend its results certify the production rule settings.
3. Drain old Safe Promotion runs and complete in-progress production deploys.
   Old P0/global concurrency behavior does not share every new lock group.
4. In a planned release freeze, have the repository administrator strengthen the
   EXISTING main ruleset with the five names and strict status policy. Keep all
   other protections and an empty bypass list. The old pipeline will not produce
   release-admission, so releases must remain paused during this transition.
   The existing production site is unaffected. Do not bypass rules to bootstrap.
5. Re-run `npm run ci:check-main-protection` with the intended read identity, and
   the FULL combined preflight against the final reviewed source. Ensure the
   working snapshot has not changed. Only then create the implementation commit
   on the current candidate via the normal development path. Do not force-push
   an obsolete ZIP over a newer candidate. No commit was created in this session.
6. Require all hosted jobs to pass, including complete main certification,
   verified deployment identity, notification and safe candidate synchronization.
   Then compare timing/evidence against docs/ci-cd/baseline-2026-10-06.json.

If required-check names are not yet selectable in the UI, use a reviewed,
administrator-owned ruleset update/rehearsal; never add promote-certified-pr
as a required premerge check. That job performs the merge and finishes after
production deployment; requiring it to finish before merge creates a deadlock.

## Rollback without weakening protection

A separate `P1_SERIAL_ROLLBACK.patch` changes only PR needs to
[prepare, candidate-gate] and the contract's expected mode to serial.
All five native checks, admission, source binding, strict policy, evidence and
lease remain. The rollback variant is exercised by the same local tests.
Re-run full preflight and hosted validation before committing that rollback.
Do NOT revert to raw P0 while release-admission is required: raw P0 cannot emit
that check. Do not undo native protections or reinstate unconditional force.
File patch roundtrip tests are not a production rollback exercise.

## Timing and evidence

Reference audit: candidate 11:46 and PR 11:09 serial. In the parallel design the
corresponding dependency term is max(candidate, PR), not their sum, plus prepare
and admission overhead. This is a structural model, NOT a new measured speedup.
No new hosted run/deploy duration or full assurance equivalence is claimed.

Known local blockers remain npm DNS/network, missing locked npm dependencies,
actionlint and GitHub CLI. Pinned Chromium installation and the complete Python
audit-tool setup have not been reached by the complete preflight. The full preflight stops rather
than marking unexecuted phases as passed. Read-only connector access separately
confirmed the candidate SHA and ruleset definition, but rejected the effective
branch-rules endpoint; it did not exercise the shipping GitHub CLI adapter.

## Official references consulted

- https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch
- https://docs.github.com/en/rest/repos/rules#get-a-repository-ruleset
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idneeds

These references inform API/Actions semantics. They are not evidence of a
successful run of the modified project.
