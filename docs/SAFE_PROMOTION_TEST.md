# Safe Promotion verification

This file exists only to exercise the production Safe Promotion path end to end after enabling the repository setting that allows GitHub Actions to create pull requests.

Expected path:

candidate -> GARP 2.5/N5/QA/P3/P5 -> automatic pull request -> pull-request certification -> SHA-bound merge to main -> production deploy from main.

The file can be removed after the workflow is proven and the release process is frozen.
