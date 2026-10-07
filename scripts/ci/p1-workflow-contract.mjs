// Structural contract; actionlint and hosted execution remain separate acceptance gates.
import assert from 'node:assert/strict';
export function jobBlock(text, id) {
  const pattern = new RegExp(`^  ${id}:\\r?\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:\\r?\\n|$(?![\\s\\S]))`, 'm');
  const match = text.match(pattern); assert.ok(match, `Missing job ${id}`); return match[0];
}
export function validateP1Workflow(text, mode = 'parallel') {
  assert.ok(['parallel', 'serial'].includes(mode));
  const prepare = jobBlock(text, 'prepare'), candidate = jobBlock(text, 'candidate-gate');
  const pr = jobBlock(text, 'pr-certification'), admission = jobBlock(text, 'admission'), promote = jobBlock(text, 'promote');
  assert.match(candidate, /^    needs: prepare$/m);
  assert.match(pr, mode === 'parallel' ? /^    needs: prepare$/m : /^    needs: \[prepare, candidate-gate\]$/m);
  assert.ok(prepare.indexOf('run: node scripts/ci/main-protection.mjs --live') >= 0);
  assert.ok(prepare.indexOf('run: node scripts/ci/main-protection.mjs --live') < prepare.indexOf('gh pr create'));
  assert.match(prepare, /run: node scripts\/ci\/promotion-freshness.mjs --prepare/);
  assert.match(prepare, /run: node scripts\/ci\/promotion-freshness.mjs --pr/);
  assert.match(admission, /^    if: always\(\)$/m);
  assert.match(admission, /^    needs: \[prepare, candidate-gate, pr-certification\]$/m);
  for (const part of [admission, promote]) {
    assert.match(part, /run: node scripts\/ci\/main-protection.mjs --live/);
    assert.match(part, /run: node scripts\/ci\/release-admission.mjs --independent/);
    assert.match(part, /run: node scripts\/ci\/promotion-freshness.mjs --pr/);
    assert.match(part, /run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
    assert.match(part, /checks: read/);
  }
  assert.match(admission, /run: node scripts\/ci\/release-admission.mjs --prerequisites/);
  assert.match(admission, /CI_NEEDS_JSON: \$\{\{ toJSON\(needs\) \}\}/);
  assert.match(promote, /^    needs: \[prepare, candidate-gate, pr-certification, admission\]$/m);
  assert.match(promote, /needs.admission.result == 'success' && needs.admission.outputs.eligible == 'true' && needs.admission.outputs.certified_sha == github.sha/);
  assert.ok(promote.indexOf('promotion-freshness.mjs --pr') < promote.indexOf('gh pr merge'));
  assert.match(promote, /--match-head-commit "\$CERTIFIED_SHA"/);
  assert.match(promote, /run: node scripts\/ci\/p4-promotion-evidence\.mjs --produce/);
  assert.match(promote, /name: generator-p4-promotion-\$\{\{ steps\.merged\.outputs\.main_head \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(promote, /gh workflow run deploy\.yml[\s\S]*-f promotion_run_id="\$GITHUB_RUN_ID"[\s\S]*-f promotion_run_attempt="\$GITHUB_RUN_ATTEMPT"[\s\S]*-f certified_sha="\$CERTIFIED_SHA"[\s\S]*-f merged_main_sha="\$MAIN_HEAD"/);
  assert.ok(promote.indexOf('p4-promotion-evidence.mjs --produce') < promote.indexOf('gh workflow run deploy.yml'), 'P4 certificate must exist before deploy dispatch');
  assert.doesNotMatch(text, /^concurrency:/m);
  assert.match(promote, /group: generator-promotion-transaction\n      cancel-in-progress: false/);
  assert.doesNotMatch(text, /continue-on-error: true|\/cancel|force=true|--admin/);
  for (const part of [candidate, pr]) {
    assert.match(part, /eligible: \$\{\{ steps\.(?:freshness|final_freshness).outputs.eligible \}\}/);
    assert.equal((part.match(/run: node scripts\/ci\/promotion-freshness.mjs --pr/g) || []).length, 2, 'Freshness before and after certification');
    assert.match(part, /certified_sha: \$\{\{ needs.prepare.outputs.certified_sha \}\}/);
    const expensive = [...part.matchAll(/^        run: (npm run (?:test:reporter|qa:release|qa:platform|qa:redteam:ci))$/gm)].map(x => x[1]);
    assert.deepEqual(expensive, ['npm run test:reporter', 'npm run qa:release', 'npm run qa:platform', 'npm run qa:redteam:ci']);
    assert.doesNotMatch(part, /pull-requests: write|contents: write|download-artifact|gh pr create/, 'Certification must remain read-only and independent');
    assert.match(part, /ref: \$\{\{ needs.prepare.outputs.certified_sha \}\}/);
    assert.match(part, /persist-credentials: false/);
  }
}
