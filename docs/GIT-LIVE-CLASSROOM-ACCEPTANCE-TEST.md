# GIT – live classroom acceptance test

Status: pre-server release candidate test plan. This document does **not** claim a live classroom pass.

## Preconditions
- Use one universal Google Form for the school-year response log.
- Keep **Limit to 1 response** disabled.
- Collect the verified school e-mail.
- The secure submission field accepts the complete `SECURE-ANSWERS-V1` block.
- If automatic metadata are enabled, configure Test ID, test name and group once from a Google Forms prefilled link.
- Never publish `teacher_verifier.html` to students.

## Pilot matrix
1. Generate secureOffline **TEST-A** for group A and **TEST-B** for group B.
2. Distribute each student URL plus the student's one-time code using the existing roster workflow.
3. Standard submission: finish TEST-A, copy the complete secure block, open the Form, paste the block and submit.
4. Invalid code: try an unassigned/incorrect one-time code and confirm the existing code validation/security signal behavior.
5. Duplicate: submit the identical TEST-A secure block twice. Import the common CSV and confirm the verifier marks the second copy as an identical duplicate and counts the result once.
6. Distinct attempts: create two different valid TEST-A submissions for the same student. Confirm neither is silently selected; the teacher must choose the attempt to use.
7. Metadata mismatch: manually alter a visible prefilled Test ID or group field. Confirm the valid cryptographic payload is still accepted and the verifier shows **METADATA MISMATCH**.
8. answers.txt fallback: submit one result through the downloaded answers.txt route and confirm the same verifier accepts it.
9. Mobile: complete and submit at least one test from a supported mobile browser.
10. Same day / two groups: collect TEST-A and TEST-B in the same universal Form.
11. Export one common Forms CSV containing both Test IDs.
12. Import the **unchanged full CSV** into verifier A and verifier B.

## Acceptance
- Verifier A finds only cryptographically valid TEST-A results.
- Verifier B finds only cryptographically valid TEST-B results.
- Neither verifier requires manual CSV filtering/editing.
- Other-test rows are reported as other tests, not exported as current-test results.
- Tampered operational metadata never override the cryptographically verified payload.
- Identical duplicate submissions count once.
- Different valid attempts by the same student remain unresolved until the teacher explicitly chooses one.
- Results export contains only the effective results for the current test.
- Submissions export contains only cryptographically verified submissions for the current test.
- Existing answers.txt fallback still works.

## Evidence discipline
Record browser/device, date, Test IDs, row counts and observed outcome for every step. Until this is performed with real students/devices, mark the release evidence **LIVE CLASSROOM TEST REQUIRED**.
