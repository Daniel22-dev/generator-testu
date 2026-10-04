# 7.1.79 — Red-team v2 / E3 verifier checkpoint

Candidate only. **NOT READY – BLOCKING ISSUE.** E0–E3 completed; E4–E10 and F7 start-code encryption remain open. No production promotion or deployment is authorized by this checkpoint.

The private verifier validates the encrypted envelope and decrypted schema before scoring. It bounds JSON size/depth, rejects duplicate or prototype keys, unknown fields and unsupported answer IDs, and validates response shape/range against all 21 native exercise types. Unanswered items remain valid. Informative client percentages and grades never enter private scoring. Empty/malformed telemetry, contradictory identity/joker/change statistics and impossible clocks are rejected.

The owner must privately configure the school domain, actual publication time, CSV timezone and exact system column headers, and attest verified-account email collection, domain restriction, one response per account and an unaltered export. The verifier requires a unique code-to-school-email roster and checks the Forms account against it. Client/event times must fall within publication → Forms, with only the CSV timestamp's stated precision interval. The default CSV timezone is Europe/Prague; explicit ISO offsets or Czech day-first wall-clock timestamps are accepted. Ambiguous/nonexistent DST times fail closed. Generation time is never substituted for publication.

CSV imports append to the current working set. Every column is inspected for payloads; malformed quoting, row widths or duplicate headers are rejected. Invalid rows retain diagnostics. Same-content re-encryption is detected through canonical plaintext digests; identical duplicates are excluded. Different attempts for one identity or conflicting reuse of one attempt ID exclude affected submissions and cannot be enabled through the legacy manual-selection button. The replay ledger is session-local; cross-session behavior belongs to E4. Clearing the set or changing policy clears that ledger visibly.

A valid raw TXT backup without Forms anchors is **DIAGNOSTIC_ONLY**, available for feedback but excluded from class statistics and result proposals. UI, CSV and archives carry private anchor observations and rejection/review states. Serialized trusted bits cannot restore the private observations. No result receives automatic classification authorization.

The new private verifier checks add initial generator bytes. The entry-critical static budget was explicitly recalibrated from 1,750,000 to 1,770,000 bytes; the other six size caps and behavioral/runtime assertions are retained. This is not a claim of improved performance.

Real generated artifacts, all 21 native response types, native desktop Chromium submission/CSV file import/downloads and baseline negative controls are covered. Matching roster/time anchors still allow a consistent public-key forgery: encryption does not prove the original runtime. Live Forms configuration, public deployment, live AI and real mobile devices are not certified. E7 remains **ANALYZED / NOT TESTED**; server architecture is **DEFERRED – SERVER VERSION**.

Detailed test evidence and remaining limits are in `redteam/E3/GIT-redteam-E3-7.1.79-handoff.txt`.
