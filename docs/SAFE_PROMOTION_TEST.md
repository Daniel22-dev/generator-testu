# Safe Promotion verification

This file exists only to exercise the production Safe Promotion path end to end after enabling the repository setting that allows GitHub Actions to create pull requests.

Expected path:

candidate -> GARP 2.5/N5/QA/P3/P5 -> automatic pull request -> pull-request certification -> SHA-bound merge to main -> production deploy from main.

## Stage 2 protected-main evidence — 2026-09-17

- Repository ruleset: `23603155`
- Protected target: `main`
- Direct write probe: rejected by GitHub with HTTP 409 — `Changes must be made through a pull request.`
- Required status check: `p5-release-gate`
- Bypass actors: none
- Force-push / non-fast-forward: blocked
- Branch deletion: blocked

This documentation-only change is the controlled payload used to prove that Safe Promotion still succeeds through `candidate -> certified PR -> protected main` while direct writes remain blocked.

The file can be removed after the workflow is proven and the release process is frozen.
