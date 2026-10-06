// P1 activation guard: read live effective rules BEFORE opening a PR and before merge.
// This never writes rulesets. Hidden bypass metadata is accepted only for the exact
// administrator-attested ruleset revision; any later ruleset change fails closed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { githubRead, readCollection, repositoryName } from './github-read.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RULESET_ID = 23603155;
export const ACTIONS_APP_ID = 15368;
export const ATTESTATION_RELATIVE_PATH = 'security/ci/main-ruleset-attestation.json';
export const ATTESTATION_SHA256 = 'b33b154dbe36a4bfa0a04f642898f40e594f86ec37d5785fd6fe00d9032f9e6f';
export const ATTESTED_RULESET_UPDATED_AT = '2026-10-06T18:33:10.701Z';
export const REQUIRED_CHECKS = Object.freeze([
  'candidate-gate', 'pr-certification', 'p5-release-gate', 'journey-e2e', 'release-admission',
]);

function checkRules(rules) {
  assert.ok(Array.isArray(rules), 'Missing rules');
  for (const type of ['deletion', 'non_fast_forward', 'pull_request']) {
    assert.ok(rules.some(rule => rule.type === type), `Missing ${type} rule`);
  }
  const checks = rules.filter(rule => rule.type === 'required_status_checks');
  for (const context of REQUIRED_CHECKS) {
    assert.ok(checks.some(rule => rule.parameters?.do_not_enforce_on_create === false &&
      rule.parameters.strict_required_status_checks_policy === true &&
      rule.parameters.required_status_checks?.some(check => check.context === context &&
        check.integration_id === ACTIONS_APP_ID)), `Missing mandatory GitHub Actions check: ${context}`);
  }
  assert.ok(!rules.some(rule => rule.type === 'merge_queue'), 'Merge queue requires a separate tested design');
}

export function readAdminAttestation() {
  const file = path.join(ROOT, ATTESTATION_RELATIVE_PATH);
  const bytes = fs.readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), ATTESTATION_SHA256,
    'Governance attestation digest mismatch');
  return JSON.parse(bytes.toString('utf8'));
}

function verifyAdminAttestation(attestation, ruleset, repo) {
  assert.ok(attestation && typeof attestation === 'object', 'Hidden bypass metadata requires reviewed administrator attestation');
  assert.equal(attestation.schema, 'git-main-ruleset-admin-attestation-v1');
  assert.equal(attestation.repository, repo);
  assert.equal(attestation.rulesetId, RULESET_ID);
  assert.equal(attestation.rulesetUpdatedAt, ATTESTED_RULESET_UPDATED_AT);
  assert.equal(ruleset.updated_at, attestation.rulesetUpdatedAt,
    'Ruleset changed since administrator attestation; re-attestation required');
  assert.deepEqual(attestation.bypassActors, [], 'Administrator attestation must prove an empty bypass list');
  assert.equal(attestation.currentUserCanBypass, 'never');
  assert.equal(attestation.strictRequiredStatusChecks, true);
  assert.equal(attestation.doNotEnforceOnCreate, false);
  assert.deepEqual(attestation.scope, { include: ['refs/heads/main'], exclude: [] });
  const expected = REQUIRED_CHECKS.map(context => ({ context, integrationId: ACTIONS_APP_ID }));
  assert.deepEqual(attestation.requiredChecks, expected, 'Administrator attestation required-check set differs');
}

export function verifyMainProtection({ ruleset, effectiveRules, repo, attestation }) {
  repositoryName(repo);
  assert.equal(ruleset.id, RULESET_ID, 'Unexpected protected ruleset identity');
  assert.equal(ruleset.source_type, 'Repository');
  assert.equal(ruleset.source, repo);
  assert.equal(ruleset.target, 'branch');
  assert.equal(ruleset.enforcement, 'active');
  assert.equal(ruleset.current_user_can_bypass, 'never', 'Workflow identity must not be able to bypass main protection');
  let bypassEvidence;
  if (Object.hasOwn(ruleset, 'bypass_actors')) {
    assert.deepEqual(ruleset.bypass_actors, [], 'Bypass list must be empty');
    bypassEvidence = 'live-visible-empty';
  } else {
    verifyAdminAttestation(attestation, ruleset, repo);
    bypassEvidence = 'admin-attested-exact-revision';
  }
  assert.ok(ruleset.conditions?.ref_name?.include?.includes('refs/heads/main'), 'Explicit main scope required');
  assert.deepEqual(ruleset.conditions.ref_name.exclude, [], 'Main protection must not have exclusions');
  checkRules(ruleset.rules);
  assert.ok(Array.isArray(effectiveRules), 'Effective main rules must be readable');
  const applied = effectiveRules.filter(rule => rule.ruleset_id === RULESET_ID &&
    rule.ruleset_source_type === 'Repository' && rule.ruleset_source === repo);
  checkRules(applied);
  assert.ok(!effectiveRules.some(rule => rule.type === 'merge_queue'), 'Active merge queue is unsupported');
  return { schema: 'git-main-protection-p1-v2', status: 'PASS', repository: repo,
    rulesetId: RULESET_ID, rulesetUpdatedAt: ruleset.updated_at, bypassEvidence,
    requiredChecks: REQUIRED_CHECKS, checkedAt: new Date().toISOString(),
    evidenceSha256: createHash('sha256').update(JSON.stringify({ ruleset, effectiveRules, bypassEvidence })).digest('hex'),
    scope: 'Live ruleset/effective rules plus exact-revision administrator attestation when GitHub hides bypass_actors; any later ruleset change fails closed' };
}

export function readLiveProtection(repo, read = githubRead) {
  repositoryName(repo);
  const ruleset = read(`repos/${repo}/rulesets/${RULESET_ID}`);
  const effectiveRules = readCollection(`repos/${repo}/rules/branches/main`, null, read);
  const attestation = Object.hasOwn(ruleset, 'bypass_actors') ? undefined : readAdminAttestation();
  return verifyMainProtection({ ruleset, effectiveRules, repo, attestation });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.deepEqual(process.argv.slice(2), ['--live'], 'Only live API validation is allowed');
    const report = readLiveProtection(process.env.GITHUB_REPOSITORY || 'Daniel22-dev/generator-testu');
    if (process.env.GITHUB_ACTIONS === 'true') {
      fs.mkdirSync('qa-results', { recursive: true });
      fs.writeFileSync('qa-results/main-protection-p1.json', JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { console.error('BLOCKED main protection: ' + error.message); process.exitCode = 1; }
}
