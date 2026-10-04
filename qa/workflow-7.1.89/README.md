# Workflow 7.1.89 component diagnostics

These tests are supplemental, not a replacement for the pinned production CI.

- `node qa/workflow-7.1.89/test-mailer.mjs` uses Node built-ins and fake Google services; no email can be sent.
- `python qa/workflow-7.1.89/browser_full.py` runs component and render/shuffle tests.
- `python qa/workflow-7.1.89/browser_smoke.py` captures the layout and verifies actual nested consent interaction.

Python scripts require Playwright and BeautifulSoup; set CHROMIUM_PATH to an installed Chromium executable. They use the project's Acorn after npm ci. ACORN_DIAGNOSTIC_PATH may select a separate parser only for this diagnostic harness (never for production build). GIT_QA_OUTPUT selects the evidence directory.

The original execution used Node 22.16.0 and system Chromium in an about:blank DOM because managed browser policy blocked navigations. It inserted actual app modules with synthetic access and in-memory storage, removed deployment CSP from that test document and blocked network. AI responses were mocked; Apps Script services were mocked. This does NOT verify the production permit chain, CSP enforcement, encrypted artifact assembly, full grading, live Google email, Safari or a physical iPad. The older separately available Acorn was used only to inspect functions in the test harness; production dependency pins were never changed or spoofed.

All addresses and test data are synthetic. Test-only Function construction extracts original runtime declarations, not arbitrary uploaded user code. Never distribute this harness to students as a test runtime.
