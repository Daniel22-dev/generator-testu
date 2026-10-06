// A read-only pre-merge decision. Never converts skipped/neutral/cancelled jobs into PASS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { githubRead, readCollection, repositoryName, exactSha, positiveId } from './github-read.mjs';
import { ACTIONS_APP_ID } from './main-protection.mjs';
export const INDEPENDENT_GATES = Object.freeze([
  { file: 'p5-release-gate.yml', job: 'p5-release-gate' },
  { file: 'journey-e2e.yml', job: 'journey-e2e' },
]);
export function requirePrerequisites(needs, sha) {
  exactSha(sha);
  for (const id of ['prepare', 'candidate-gate', 'pr-certification']) {
    assert.equal(needs?.[id]?.result, 'success', `${id} must finish successfully, not skipped/neutral/cancelled`);
    assert.equal(needs[id].outputs?.eligible, 'true', `${id} must explicitly admit this source`);
    assert.equal(needs[id].outputs?.certified_sha, sha, `${id} must certify the exact event SHA`);
  }
  positiveId(needs.prepare.outputs.pr_number); exactSha(needs.prepare.outputs.main_sha);
  return true;
}
export function selectIndependentRuns(runs, gate, repo, sha) {
  repositoryName(repo); exactSha(sha); assert.ok(Array.isArray(runs));
  const relevant = runs.filter(run => run.head_sha === sha && run.head_branch === 'candidate' &&
    ['push', 'workflow_dispatch'].includes(run.event));
  if (!relevant.length) return { status: 'WAIT', runs: [] };
  for (const run of relevant) {
    positiveId(run.id); positiveId(run.run_attempt);
    assert.equal(run.path, '.github/workflows/' + gate.file, 'Wrong independent workflow provenance');
    assert.equal(run.repository?.full_name, repo, 'Wrong workflow repository');
    assert.equal(run.head_repository?.full_name, repo, 'Foreign workflow source repository');
    if (run.status === 'completed') assert.equal(run.conclusion, 'success', `${gate.job} is RED/non-success`);
    else assert.ok(['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(run.status), 'Unknown workflow state');
  }
  if (relevant.some(run => run.status !== 'completed')) return { status: 'WAIT', runs: [] };
  return { status: 'PASS', runs: relevant };
}
export function verifyIndependentJob({ jobs, run, check, gate, repo, sha }) {
  const matching = jobs.filter(job => job.name === gate.job);
  assert.equal(matching.length, 1, 'Exactly one independent gate job is required');
  const job = matching[0];
  positiveId(job.id); assert.equal(job.run_id, run.id); assert.equal(job.run_attempt, run.run_attempt);
  assert.equal(job.head_sha, sha); assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'success');
  assert.equal(job.check_run_url, `https://api.github.com/repos/${repo}/check-runs/${job.id}`, 'Unexpected check origin');
  assert.equal(check.id, job.id); assert.equal(check.name, gate.job); assert.equal(check.head_sha, sha);
  assert.equal(check.app?.id, ACTIONS_APP_ID, 'Independent result must originate from GitHub Actions');
  assert.equal(check.status, 'completed'); assert.equal(check.conclusion, 'success');
  return { workflow: gate.file, job: gate.job, runId: run.id, attempt: run.run_attempt, jobId: job.id, sha };
}
export async function waitForIndependent({ repo, sha, timeoutMs = 30 * 60 * 1000, intervalMs = 15000,
  read = githubRead, pause = sleep, now = Date.now }) {
  repositoryName(repo); exactSha(sha);
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 30 * 60 * 1000);
  assert.ok(Number.isFinite(intervalMs) && intervalMs > 0);
  const deadline = now() + timeoutMs;
  for (let iteration = 0; iteration < 120 && now() < deadline; iteration++) {
    let waiting = false;
    const evidence = [];
    for (const gate of INDEPENDENT_GATES) {
      const runs = readCollection(`repos/${repo}/actions/workflows/${gate.file}/runs?head_sha=${sha}`, 'workflow_runs', read);
      const decision = selectIndependentRuns(runs, gate, repo, sha);
      if (decision.status !== 'PASS') { waiting = true; continue; }
      for (const run of decision.runs) {
        const jobs = readCollection(`repos/${repo}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs', read);
        const job = jobs.find(item => item.name === gate.job);
        assert.ok(job, `Missing ${gate.job} job`); positiveId(job.id);
        const check = read(`repos/${repo}/check-runs/${job.id}`);
        evidence.push(verifyIndependentJob({ jobs, run, check, gate, repo, sha }));
      }
    }
    if (!waiting && now() < deadline) return evidence;
    await pause(Math.max(0, Math.min(intervalMs, deadline - now())));
  }
  throw new Error('Independent P5/Journey did not both succeed within the bounded wait');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2]; assert.ok(process.argv.length === 3);
    if (mode === '--prerequisites') {
      requirePrerequisites(JSON.parse(process.env.CI_NEEDS_JSON || 'null'), process.env.CERTIFIED_SHA);
      console.log('PASS both independent certification jobs and prepare belong to this SHA');
    } else {
      assert.equal(mode, '--independent');
      const evidence = await waitForIndependent({ repo: process.env.GITHUB_REPOSITORY, sha: process.env.CERTIFIED_SHA });
      fs.mkdirSync('qa-results', { recursive: true });
      fs.writeFileSync('qa-results/independent-admission-p1.json', JSON.stringify({
        schema: 'git-independent-admission-p1-v1', status: 'PASS', sourceCommit: process.env.CERTIFIED_SHA,
        runId: positiveId(process.env.GITHUB_RUN_ID), runAttempt: positiveId(process.env.GITHUB_RUN_ATTEMPT),
        checkedAt: new Date().toISOString(), evidence,
      }, null, 2) + '\n');
      console.log('PASS independent p5-release-gate and journey-e2e for exact SHA and workflow origins');
    }
  } catch (error) { console.error('BLOCKED admission: ' + error.message); process.exitCode = 1; }
}
