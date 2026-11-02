# GIT 7.1.102 – Clean Stage08 + MOJE SKUPINY v2 release review

**PREPRODUCTION DRAFT – production NO-GO.** This is the **release-oriented source tree**, not a classroom-approved or deployed build.

## Exact source provenance
- Original Stage08 reviewed branch / [PR #138](https://github.com/Daniel22-dev/generator-testu/pull/138) commit `b6255c847931885fb5b57ccb795485920cee1132`: complete original Stage08 plus the verified v2 client.
- Real v2 runtime client `src/features/central-groups.js` git blob `09561d7705d798cb38e872acd03244dde10ca4f4`, identical to external browser-tested [GIT #139](https://github.com/Daniel22-dev/generator-testu/pull/139) source.
- `scripts/check-stage08-groups.mjs` blob `fab4563ff950baad2caa4e7d8b4c65f13f60076f`, and v2 Chromium harness `scripts/check-stage08-v2-browser.mjs` blob `42a0fb10bc0ded31b560abac81ef44ef3a74652f`, also unchanged from #139.
- Original exact-whitelist Stage08 branch-only workflow is preserved on PR #138 for independent E10/P5/journey testing but **intentionally removed from this clean release proposal**.

## Security release transition S83 (scope only)
The only executable change in this clean candidate proposal is `scripts/check-s83-ci-portability.mjs`. Release S83-CI07A now requires the exact historical workflow inventory plus the two byte-for-byte protected-main manual QA workflows and **zero feature-only Stage08 workflows**. There is no new allowance for unknown workflows, no wildcard digest, no `CI` or `GITHUB_REF` spoofing, no weakening of trust pin rotation, full checkout, Actions SHA pinning, or E10/P5 thresholds.

The previous feature-only S83 explicitly allowed a single SHA-256-pinned Stage08 workflow **only** at the original branch ref; it was not suitable for `candidate` or `main`. The clean release policy removes that exception entirely. Embedded S83 negative regression checks reject reintroduction of all three historical QA-only Stage08 workflow names, and retain the original unknown workflow, protected manual QA byte-mutation and release-artifact-path mutation rejections.

**Important limitation:** negative checks in source are not an independent CI result. This clean release tree must complete a new exact-SHA protected candidate P5/E10, GARP and teacher/student journey release certification before acceptance; passing the original feature branch does not certify its different clean release SHA.

## Additional release blockers
1. Authoritative school owner and privacy-controller approval, safe encryption/segregation decision for browser localStorage on shared devices; v2 account key hashing alone does not encrypt or isolate plaintext.
2. Owner-certified historical v1 group migration, with intact recoverable source data and no automatic reassignment.
3. Genuine signed school staff access, live Forms/Sheets/teacher verifier workflows, teacher A/B switch checks, physical desktop/Android/iPhone/iPad Safari including multitasking.
4. Coordinated exact-SHA release across AI Studio 0.21.260, SORTIO, Hodnotitel, Lesson Hub and GIT 7.1.102, each with protected candidate→main certification and post-release Pages byte-parity.
5. Remove any remaining temporary QA workflows from the *other* four apps before their final protected promotion; do not merge test-only PRs #139/#140.
6. No deployment from Draft, no real pupil records in public GitHub logs, no claim of live GARP/AEGIS or production authorization.

## Decision
**This branch may be reviewed, not merged or deployed.** Do not promote to protected candidate until the school explicitly authorizes the release procedure and the exact candidate SHA is ready for its independent tests. Revert using audited Git history, not an unapproved fallback to shared v1 storage.
