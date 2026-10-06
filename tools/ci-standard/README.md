# GHRAB CI standard 1.0.0 - staged reference implementation

**Diagnostic interoperability only. NOT a release certificate or a new release gate.**

P3 adds data contracts, a GIT-specific structural adapter, an exact-SHA read-only
inventory collector and a drift comparator. It does NOT deploy a shared workflow,
change other repositories, share builds or reuse certification results. Existing
candidate/PR/P5/Journey/main certifications and native policy checks remain required.

## What is shared

The portable reference is the five files listed in `reference.lock.json`. Each
repository adopts a reviewed copy (vendoring) through its own small PR. There is
no central runtime dependency, automatic updater, floating remote ref or shared
administration credential. Registry/profile/check.mjs are integration data/code,
not part of the portable bundle. The GIT adapter deliberately imports existing
P1/P2 checks from GIT and is not a universal adapter for other applications.

The SHA-256 ledger catches accidental divergence of a reviewed copy. It is NOT
a signature, an independent trust root or proof of authorship: a writer able to
change both the code and the ledger can change both. The protected reviewed
commit and the existing independent gates remain the trust boundary. No commit
SHA is assigned to these currently uncommitted files.

## Commands

From the GIT repository root, with Node 22:

```sh
npm run check:ci-standard
npm run check:ci-orchestration
npm run ci:preflight
```

The first two commands are offline structural/unit checks. Only a complete
preflight PASS permits proceeding to the existing hosted certification process.
Neither an inventory nor a structural report can satisfy native release checks.

For a read-only live inventory, use an authenticated `gh` CLI with access to the
specific repository. Refresh the actual branch SHA first. `COMMIT_SHA` below is
a placeholder for the FULL 40-hex SHA; it is never resolved implicitly.

```sh
npm run ci:inventory -- Daniel22-dev/generator-testu 1262251614 COMMIT_SHA candidate /tmp/git-ci-before.json
npm run ci:drift -- /tmp/git-ci-before.json /tmp/git-ci-after.json
```

The collector always uses fixed-host GET requests. No checkout, npm install,
source evaluation, shell, GitHub mutation or secrets endpoint is used. The output
file must not already exist (exclusive creation, permissions 0600). A failure may
leave a BLOCKED report; invalid arguments may leave an empty file. Use a new path
for a new collection; do not substitute an earlier successful JSON.

## Inventory scope and limits

Coverage is explicitly `ci-definitions-packages-and-scoped-helpers-only`:
package.json, package-lock.json, audit/requirements-audit.txt, direct workflow
YAML files, local composite action metadata, and .mjs/.js/.sh/.json files under
scripts/ci and tools/ci-standard. Raw file contents are not emitted in the report.
The report records path, size, Git blob SHA and SHA-256. Branch identity is checked
before and after collection, and every returned blob must match its Git SHA.

This is NOT a whole-repository snapshot or expanded call graph. Helpers outside
those directories, runtime-generated artifacts, external action internals, live
rulesets, token permissions, runtime test results and deploy state are outside
coverage. NO_CI_FILE_DRIFT does not prove that application behavior or release
assurance is unchanged. YAML content is inventoried, not semantically executed.
A repository with no package.json or workflow is unsupported and BLOCKED.

A truncated recursive Git tree, changed branch, unreadable file, duplicate JSON
key, linked/submodule input, invalid metadata or digest mismatch blocks collection.
Limits: 128 selected files, 1 MiB per file, 8 MiB total selected bytes; each GET has
30-second timeout and 16 MiB response limit. Large repositories may need a reviewed
adapter/nonrecursive tree traversal; truncation is never interpreted as absence.
The local filesystem used to run the tools is trusted, not an adversarial sandbox.

## Status and exit contracts

| Command | Exit | Meaning |
|---|---:|---|
| check | 0 | STRUCTURAL_MATCH_NOT_CERTIFIED; declarations match selected profile |
| check | 1 | BLOCKED; invalid/missing/drifted contract |
| collect | 0 | COLLECTED_NOT_CERTIFIED; complete within the declared LIMITED scope |
| collect | 1 | BLOCKED; read, input, integrity, size or freshness failure |
| compare | 0 | NO_CI_FILE_DRIFT_NOT_CERTIFIED; selected file hashes equal |
| compare | 2 | REVIEW_REQUIRED; selected inputs added/removed/modified |
| compare | 1 | BLOCKED; incomplete/mismatched/invalid inventories |

Every output has `releaseEligible: false`. Runtime/policy results are never
invented. Data files are unsigned diagnostic observations, so the comparator
also cannot authenticate who produced them. It refuses cross-repository/ID,
cross-branch and reversed observation comparisons. A later commit can have equal
selected files without having been tested at all.

## Per-repository profiles

The registry intentionally has one STAGED consumer (GIT) and seven NOT_PROFILED
entries. A registry row is not an audit or rollout. Different applications may
need different Node versions, trust variable names, job names, source SHA domains,
artifact locations and event triggers. The supplied generic validator currently
supports candidate-source and merged-main-source roles with reviewed fixed trust
pins; external variable providers and PR synthetic-merge identity need explicitly
reviewed schema/adapters before adoption. Do not mislabel a different topology
as the GIT profile merely to obtain a structural success result.

The evidence identity field list in a consumer is a REQUIREMENT for a future
adapter, not a claim that every existing artifact already exposes every field.
No shared evidence envelope replaces P0/P1/P2 evidence or release identity.

See `docs/ci-cd/P3-IMPLEMENTATION.md` for rollout, acceptance and rollback.
