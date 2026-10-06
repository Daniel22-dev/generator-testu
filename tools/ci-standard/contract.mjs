// GHRAB CI standard v1: diagnostic interoperability, NEVER release admission.
import assert from 'node:assert/strict';
import { keys, exact, repoName, id, digest, relative, sha256, regularRead, readJson } from './safe-io.mjs';
export const VERSION = '1.0.0';
export const PURPOSE = 'DIAGNOSTIC_ONLY_NOT_RELEASE_ADMISSION';
export const INVARIANTS = Object.freeze([
  'exact-source-identity', 'independent-certifications', 'fail-closed-admission',
  'branch-and-pr-freshness', 'retain-mandatory-gates', 'preserve-evidence-before-cleanup',
  'pinned-dependencies', 'least-privilege', 'atomic-candidate-update',
  'protected-production-deploy', 'verify-live-release-identity', 'repository-specific-trust',
]);
export const REFERENCE_FILES = Object.freeze([
  'tools/ci-standard/safe-io.mjs', 'tools/ci-standard/contract.mjs',
  'tools/ci-standard/collect.mjs', 'tools/ci-standard/compare.mjs',
  'tools/ci-standard/standard.v1.json',
]);
export function validateStandard(s) {
  keys(s, ['schema', 'version', 'purpose', 'status', 'invariants', 'sharing', 'activation']);
  assert.equal(s.schema, 'ghrab-ci-standard-v1'); assert.equal(s.version, VERSION);
  assert.equal(s.purpose, PURPOSE); assert.equal(s.status, 'STAGED_NOT_ACTIVATED');
  assert.deepEqual(s.invariants, [...INVARIANTS]);
  assert.deepEqual(s.sharing, { implementation: 'reviewed-vendored-bundle', buildArtifact: false, certificationResult: false, globalTrustPin: false });
  assert.deepEqual(s.activation, ['complete-local-preflight', 'native-policy-with-runtime-identity',
    'independent-hosted-certifications', 'race-and-superseded-rehearsal', 'verified-deploy-and-rollback', 'explicit-per-repository-rollout']);
  return s;
}
export function validateRegistry(r) {
  keys(r, ['schema', 'standardVersion', 'purpose', 'repositories']);
  assert.equal(r.schema, 'ghrab-ci-registry-v1'); assert.equal(r.standardVersion, VERSION); assert.equal(r.purpose, PURPOSE);
  assert.ok(Array.isArray(r.repositories) && r.repositories.length > 0 && r.repositories.length <= 100);
  const names = new Set(), ids = new Set(), apps = new Set(), consumers = new Set();
  for (const row of r.repositories) {
    keys(row, ['repository', 'repositoryId', 'appId', 'state', 'consumer']);
    repoName(row.repository); id(row.repositoryId); exact(row.appId, /^[a-z][a-z0-9-]*$/, 'application ID');
    assert.ok(!names.has(row.repository.toLowerCase()) && !ids.has(row.repositoryId) && !apps.has(row.appId), 'Duplicate repository/application');
    names.add(row.repository.toLowerCase()); ids.add(row.repositoryId); apps.add(row.appId);
    assert.ok(['STAGED', 'NOT_PROFILED'].includes(row.state), 'No ACTIVE claim is supported in this preparation registry');
    if (row.state === 'STAGED') {
      relative(row.consumer); exact(row.consumer, /^tools\/ci-standard\/consumers\/[a-z0-9-]+\.json$/, 'consumer path');
      assert.ok(!consumers.has(row.consumer), 'Duplicate profile file'); consumers.add(row.consumer);
    } else assert.equal(row.consumer, null);
  }
  return r;
}
export function validateConsumer(c, registry) {
  keys(c, ['schema', 'standardVersion', 'purpose', 'repository', 'repositoryId', 'appId', 'profile', 'state',
    'toolchain', 'trustInputs', 'gates', 'evidence', 'invariants', 'sharing']);
  assert.equal(c.schema, 'ghrab-ci-consumer-v1'); assert.equal(c.standardVersion, VERSION); assert.equal(c.purpose, PURPOSE);
  repoName(c.repository); id(c.repositoryId); assert.equal(c.state, 'STAGED');
  const entry = registry.repositories.find(r => r.repository === c.repository);
  assert.ok(entry && entry.state === 'STAGED', 'Repository not staged');
  assert.equal(c.repositoryId, entry.repositoryId); assert.equal(c.appId, entry.appId);
  exact(c.profile, /^[a-z][a-z0-9-]*$/, 'profile');
  keys(c.toolchain, ['nodeMajor', 'npmLockfile', 'playwright', 'axe', 'pythonRequirements']);
  assert.ok(Number.isInteger(c.toolchain.nodeMajor) && c.toolchain.nodeMajor >= 18 && c.toolchain.nodeMajor <= 100);
  for (const x of [c.toolchain.playwright, c.toolchain.axe]) exact(x, /^[0-9]+\.[0-9]+\.[0-9]+$/, 'tool version');
  relative(c.toolchain.npmLockfile); relative(c.toolchain.pythonRequirements);
  assert.ok(Array.isArray(c.trustInputs) && c.trustInputs.length > 0);
  for (const t of c.trustInputs) {
    keys(t, ['environment', 'source', 'sha256']); exact(t.environment, /^[A-Z][A-Z0-9_]*$/, 'trust variable');
    assert.equal(t.source, 'repository-reviewed-pin'); digest(t.sha256);
  }
  assert.ok(Array.isArray(c.gates) && c.gates.length > 0); const roles = new Set(), pairs = new Set();
  for (const g of c.gates) {
    keys(g, ['role', 'workflow', 'job', 'checkName', 'identity', 'independentGroup']);
    exact(g.role, /^[a-z][a-z0-9-]*$/, 'role'); exact(g.job, /^[A-Za-z_][A-Za-z0-9_-]*$/, 'job');
    exact(g.workflow, /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/, 'workflow');
    exact(g.checkName, /^[A-Za-z0-9 _-]+$/, 'check name');
    assert.ok(['candidate-source', 'merged-main-source'].includes(g.identity));
    assert.ok(!roles.has(g.role) && !pairs.has(g.workflow + '#' + g.job), 'Duplicate gate');
    roles.add(g.role); pairs.add(g.workflow + '#' + g.job);
    if (g.independentGroup !== null) exact(g.independentGroup, /^[a-z0-9-]+$/, 'independent group');
  }
  keys(c.evidence, ['identityFields', 'cleanupPolicy', 'authority']);
  assert.deepEqual(c.evidence.identityFields, ['repositoryId', 'repository', 'sourceCommit', 'runId', 'runAttempt', 'job', 'workflowIdentity', 'artifactDigest']);
  assert.equal(c.evidence.cleanupPolicy, 'preserve-before-cleanup'); assert.equal(c.evidence.authority, 'never-from-standard-report');
  assert.deepEqual(c.invariants, [...INVARIANTS]);
  assert.deepEqual(c.sharing, { implementation: true, buildArtifact: false, certificationResult: false });
  return c;
}
export function verifyReference(root, lock) {
  keys(lock, ['schema', 'standardVersion', 'purpose', 'files', 'bundleSha256']);
  assert.equal(lock.schema, 'ghrab-ci-reference-lock-v1'); assert.equal(lock.standardVersion, VERSION); assert.equal(lock.purpose, PURPOSE);
  assert.ok(Array.isArray(lock.files)); assert.deepEqual(lock.files.map(x => x.path), [...REFERENCE_FILES].sort());
  const records = [];
  for (const row of lock.files) {
    keys(row, ['path', 'sha256', 'size']); digest(row.sha256); assert.ok(Number.isSafeInteger(row.size) && row.size > 0);
    const bytes = regularRead(root, row.path); assert.equal(bytes.length, row.size, 'Reference file size drift');
    assert.equal(sha256(bytes), row.sha256, 'Reference implementation drift'); records.push(row);
  }
  digest(lock.bundleSha256); assert.equal(sha256(JSON.stringify(records)), lock.bundleSha256, 'Bundle digest mismatch');
  return lock.bundleSha256;
}
export function readStandard(root) {
  const standard = validateStandard(readJson(root, 'tools/ci-standard/standard.v1.json'));
  const registry = validateRegistry(readJson(root, 'tools/ci-standard/registry.v1.json'));
  const bundleSha256 = verifyReference(root, readJson(root, 'tools/ci-standard/reference.lock.json'));
  const profiles = registry.repositories.filter(row => row.state === 'STAGED').map(row => {
    const profile = validateConsumer(readJson(root, row.consumer), registry);
    assert.equal(profile.repository, row.repository, 'Profile path belongs to another repository');
    assert.equal(profile.repositoryId, row.repositoryId); return profile;
  });
  return { standard, registry, bundleSha256, profiles };
}
