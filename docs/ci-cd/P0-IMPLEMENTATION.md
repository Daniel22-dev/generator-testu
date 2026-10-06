# CI/CD P0 - evidence preservation and race-safe synchronization

Status: IMPLEMENTED LOCALLY / FULL PREFLIGHT BLOCKED / NOT COMMITTED.
Base archive: generator-testu-main(8).zip.
Base commit: 7516768223602cec697f4fb173382c2b6d17aab4 (GIT 7.1.96).
The application version, application source, public assets, dependency lockfile and GARP policy are unchanged.

## Changes

1. Candidate, PR and main certification each upload four structured QA reports and a hash manifest immediately after qa:release, before the red-team runner cleans qa-results. The new artifact is separate from the existing red-team artifact. Its name binds source SHA, run ID, attempt and certification role. Missing, empty, linked, stale or mismatched reports fail validation; a failed QA remains failed. The manifest is evidence metadata, not a release authorization or a claim that this intermediate QA build is the final Pages artifact.
2. Replace the check-then-force REST update with scripts/ci/sync-candidate.sh. The exact expected candidate SHA is supplied in --force-with-lease=refs/heads/candidate:<expected>. A competing write is preserved. No unconditional-force fallback exists. The deployed main must contain the certified source; only the candidate ref can be pushed and implicit tag following is disabled.
3. Remove workflow-wide cancellation and the cross-workflow cancellation loop. Candidate and PR validation have separate cancellable job groups. Promotion has a separate non-cancelling group. P5 already has its own per-ref cancellation. No job or test gate is removed. Old validation can still finish before the next job acquires its group; freshness checks remain mandatory. Manual cancellation, timeouts and runner outages are not made impossible by this change. The default single pending slot is not a durable deployment queue.
4. Record step start timestamps and monotonic durationMs in the existing red-team report; record run ID, attempt and job. Keep the original command order, fail-fast behavior, source immutability check, log hashes and cleanup. The saved baseline is measured GitHub data from the earlier audit, not post-patch measurements.
5. Add 55 dependency-free tests and a strict local ci:preflight entrypoint. Every original command remains, in the original order, in npm test, qa:p5 and qa:p5:ci. The new CI tests are added before those chains.

## Pre-commit execution

Run on Linux/WSL with Git, Bash, Node 22, npm, Python 3 with venv support and actionlint 1.7.7 on PATH. Network access to the locked package sources and browser downloads is required. Browser dependency installation may require the same system privileges as the existing workflow.

    npm run check:ci-orchestration
    npm run ci:preflight

The complete command runs 27 phases including locked setup, actionlint, npm test, headless, full npm audit (including dev dependencies, as CONTRIBUTING requires), reporter, QA release, platform, the canonical red-team/foundation/P5 chain, all seven Journey suites and release readiness. It stops at the first failure, marks subsequent phases NOT_RUN and requires the working-source snapshot to remain unchanged. It never commits, pushes, merges or deploys. Evidence lives in a printed temporary directory outside destructively cleaned QA directories.

This command cleans audit/evidence before Journey, just as journey-e2e.yml does. Review generated evidence separately; do not stage it blindly. A local PASS still does not replace the independent exact-SHA GitHub certification jobs after committing. A changed source after preflight requires rerunning it.

## Actual verification in this environment

- New tests: 55/55 PASS, including real local bare-Git race fixtures and a deliberately unsafe force negative control.
- All 9 workflow YAML files parsed with duplicate-key rejection; job dependencies/cycles and duplicate step IDs checked. Bash syntax checked for 84 workflow run blocks. This is not actionlint or GitHub's expression evaluator.
- Existing E9/E10 wiring, D7 P5/Journey admission, release readiness, versions, action pins, trust pins, AI assurance fingerprint and SBOM checks passed individually.
- Full preflight: BLOCKED at npm registry connectivity (EAI_AGAIN). The exact locked packages cannot be installed; offline cache is incomplete. Baseline and patched npm test both stop at missing jsdom. Headless cannot reach browser execution. npm audit has no usable advisory result. actionlint is absent.
- Running GARP static with the correct trust pin on baseline and patched sources produces the same 4 missing-build-artifact failures. Neither result is a GARP PASS; build-dependent gates require the complete environment.
- No GitHub Actions execution, production race, upload integration, deployment, merge or push has been performed for this patch.

## Acceptance before any commit

Do not commit or deploy this package on the basis of partial green checks. Reapply to the exact base (or rebase with a reviewed diff), run the complete preflight to PASS, inspect all logs and the source snapshot, then commit only reviewed CI-related files. Preserve both candidate certifications, independent P5/Journey and the full main certification.

P1 parallelization is NOT implemented or enabled: the observed main ruleset only requires p5-release-gate. Its complete effective protections must be resolved before earlier PR creation. The existing PR is still created after candidate certification in P0. No runtime improvements, GARP 2.8 adoption, server migration, cache reuse or legacy gate removal is included.

## Rollback and rollout constraints

Evidence/timing additions are separable from synchronization/cancellation changes. Before replacing the old workflow, ensure no old Safe Promotion run is in progress: its old cancellation group and cancellation loop can still operate during a transition. Publish a tested change only through the normal candidate route.

Do not restore an unconditional force update as a rollback. If synchronization must be disabled, retain a clear notice and leave candidate untouched; manual reconciliation is safer than overwriting concurrent work. Rolling back evidence preservation restores a known evidence-retention gap. Any rollback requires the same preflight and independent certification.

## Primary implementation references

- https://git-scm.com/docs/git-push (explicit expected-value lease).
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency (job-level groups and pending-slot limits).
- https://github.com/actions/upload-artifact (immutable, separately named artifacts and missing-file policy).
- https://github.com/rhysd/actionlint/releases/tag/v1.7.7 (pinned additional preflight validator).
