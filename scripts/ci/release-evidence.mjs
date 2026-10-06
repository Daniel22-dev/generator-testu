// Preserve only structured QA reports. This is evidence metadata, not a release permit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sourceSnapshot } from '../redteam-source-snapshot-e9.mjs';

export const REPORT_FILES = Object.freeze([
  'qa-report.json', 'qa-report.html', 'release-verdict.txt', 'qa-test-matrix.csv',
]);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function createReleaseEvidence({ root, env, now = Date.now(), snapshot }) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'This metadata records a GitHub Actions run only');
  assert.match(env.GITHUB_SHA || '', /^[a-f0-9]{40}$/, 'Exact source SHA is required');
  assert.match(env.GITHUB_RUN_ID || '', /^[1-9][0-9]*$/, 'Run ID is required');
  assert.match(env.GITHUB_RUN_ATTEMPT || '', /^[1-9][0-9]*$/, 'Run attempt is required');
  assert.match(env.GITHUB_JOB || '', /^[A-Za-z_][A-Za-z0-9_-]*$/, 'Job identity is required');
  assert.match(env.GITHUB_REPOSITORY || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.ok(['success', 'failure'].includes(env.CI_RELEASE_OUTCOME), 'QA must have actually run');
  const started = Date.parse(env.CI_RELEASE_STARTED_AT || '');
  assert.ok(Number.isFinite(started) && started <= now, 'A current gate start marker is required');
  assert.match(snapshot?.sha256 || '', /^[a-f0-9]{64}$/, 'Source snapshot is required');
  const directory = path.join(root, 'qa-results');
  const directoryStat = fs.lstatSync(directory);
  assert.ok(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), 'No linked evidence directory');
  const files = REPORT_FILES.map(name => {
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${name}: regular file required`);
    assert.ok(stat.size > 0 && stat.size <= 16 * 1024 * 1024, `${name}: invalid report size`);
    assert.ok(stat.mtimeMs >= started - 1000 && stat.mtimeMs <= now + 1000, `${name}: stale report`);
    const bytes = fs.readFileSync(file);
    return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'qa-report.json'), 'utf8'));
  const verdict = fs.readFileSync(path.join(directory, 'release-verdict.txt'), 'utf8').trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa/qa-manifest.json'), 'utf8'));
  assert.equal(report.commit, env.GITHUB_SHA, 'Report belongs to another commit');
  assert.equal(report.version, pkg.version, 'Report belongs to another application version');
  assert.equal(report.appId, manifest.appId, 'Report belongs to another application');
  assert.equal(report.qaStandard, manifest.standard, 'Report uses another QA standard');
  assert.equal(verdict, report.verdict, 'Report/verdict mismatch');
  assert.ok(['READY', 'AUTOMATED_READY', 'READY_WITH_MINOR_ISSUES', 'NOT_READY'].includes(verdict));
  const reportDate = Date.parse(report.date);
  assert.ok(Number.isFinite(reportDate) && reportDate >= started && reportDate <= now, 'Stale report date');
  assert.match(report.buildSha256 || '', /^[a-f0-9]{64}$/, 'Build digest is required');
  if (env.CI_RELEASE_OUTCOME === 'success') assert.notEqual(verdict, 'NOT_READY', 'Failed QA cannot pass');
  return {
    schema: 'git-ci-release-evidence-v1',
    repository: env.GITHUB_REPOSITORY,
    sourceCommit: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
    job: env.GITHUB_JOB,
    gateStartedAt: new Date(started).toISOString(),
    recordedAt: new Date(now).toISOString(),
    qaOutcome: env.CI_RELEASE_OUTCOME,
    verdict,
    sourceSnapshot: snapshot,
    buildSha256: report.buildSha256,
    files,
    limits: ['Evidence metadata is not an independent certification or a release authorization',
      'The QA build may precede later canonical rebuilds; it is not the final Pages artifact'],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = createReleaseEvidence({ root: process.cwd(), env: process.env, snapshot: sourceSnapshot() });
    fs.writeFileSync('qa-results/qa-release-evidence.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log('PASS current structured QA evidence: four reports, exact SHA/run/attempt/job and digests');
  } catch (error) {
    console.error('FAIL structured QA evidence:', error.message);
    process.exitCode = 1;
  }
}
