import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { githubRead, readCollection, repositoryName, exactSha, positiveId } from './github-read.mjs';
import { ACTIONS_APP_ID, REQUIRED_CHECKS } from './main-protection.mjs';

export const NATIVE_MERGE_WAIT_MS = 120 * 1000;
const ELIGIBLE_EVENTS = new Set(['push']);

function runIdFromCheck(check) {
  const match = String(check?.details_url || '').match(/\/actions\/runs\/(\d+)\/job\/\d+$/);
  assert.ok(match, `${check?.name || 'check'} has no verifiable Actions run URL`);
  return positiveId(match[1]);
}

export function verifyRequiredNativeChecks({ repo, sha, checks, read = githubRead }) {
  repositoryName(repo); exactSha(sha); assert.ok(Array.isArray(checks));
  const evidence = [];
  for (const context of REQUIRED_CHECKS) {
    const candidates = checks.filter(check => check.name === context && check.head_sha === sha && check.app?.id === ACTIONS_APP_ID);
    assert.ok(candidates.length > 0, `Missing native required check ${context}`);
    const eligible = candidates.map(check => {
      const runId = runIdFromCheck(check);
      const run = read(`repos/${repo}/actions/runs/${runId}`);
      return { check, run, runId };
    }).filter(item => ELIGIBLE_EVENTS.has(item.run.event));
    assert.ok(eligible.length > 0, `${context} has no ruleset-eligible workflow event`);
    assert.ok(!eligible.some(item => item.check.status !== 'completed' || item.check.conclusion !== 'success'),
      `${context} has an eligible non-success result`);
    const current = eligible.at(-1);
    assert.equal(current.run.head_sha, sha, `${context} workflow SHA drift`);
    assert.equal(current.run.head_branch, 'candidate', `${context} workflow branch drift`);
    assert.equal(current.run.repository?.full_name, repo, `${context} foreign workflow repository`);
    assert.equal(current.run.head_repository?.full_name, repo, `${context} foreign workflow source`);
    assert.equal(current.run.event, 'push', `${context} must originate from candidate push`);
    assert.equal(Number(current.run.run_attempt), 1, `${context} rerun cannot authorize promotion`);
    evidence.push({ context, checkId: current.check.id, runId: Number(current.runId), event: current.run.event,
      appId: current.check.app.id, conclusion: current.check.conclusion });
  }
  return evidence;
}

export async function waitForNativeMergeReadiness({ repo, prNumber, sha, mainSha, read = githubRead,
  collection = readCollection, pause = sleep, now = Date.now, timeoutMs = NATIVE_MERGE_WAIT_MS, intervalMs = 5000 }) {
  repositoryName(repo); positiveId(prNumber); exactSha(sha); exactSha(mainSha);
  assert.ok(Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= NATIVE_MERGE_WAIT_MS);
  const deadline = now() + timeoutMs;
  for (let iteration = 0; iteration < 25; iteration++) {
    const candidate = read(`repos/${repo}/git/ref/heads/candidate`);
    const main = read(`repos/${repo}/git/ref/heads/main`);
    const pr = read(`repos/${repo}/pulls/${positiveId(prNumber)}`);
    assert.equal(candidate.object?.sha, sha, 'Candidate moved while waiting for native merge readiness');
    assert.equal(main.object?.sha, mainSha, 'Main moved while waiting for native merge readiness');
    assert.equal(pr.head?.sha, sha, 'PR head moved while waiting for native merge readiness');
    assert.equal(pr.base?.sha, mainSha, 'PR base moved while waiting for native merge readiness');
    assert.equal(pr.state, 'open'); assert.equal(pr.merged, false); assert.equal(pr.draft, false);
    const checks = collection(`repos/${repo}/commits/${sha}/check-runs`, 'check_runs', read);
    const evidence = verifyRequiredNativeChecks({ repo, sha, checks, read });
    if (pr.mergeable === true && pr.mergeable_state === 'clean') {
      return { status: 'PASS', repository: repo, pullRequest: Number(prNumber), sourceCommit: sha,
        preparedMainCommit: mainSha, mergeableState: pr.mergeable_state, checks: evidence };
    }
    assert.ok(pr.mergeable === null || pr.mergeable === true, 'GitHub reports the PR as unmergeable');
    assert.ok(['unknown', 'blocked'].includes(pr.mergeable_state), `Non-transient native merge state: ${pr.mergeable_state}`);
    const remaining = deadline - now();
    if (remaining <= 0) break;
    await pause(Math.min(intervalMs, remaining));
  }
  throw new Error('GitHub native merge readiness remained blocked after 120 seconds');
}

async function main() {
  assert.equal(process.argv[2], '--wait');
  const result = await waitForNativeMergeReadiness({ repo: process.env.GITHUB_REPOSITORY,
    prNumber: process.env.PR_NUMBER, sha: process.env.CERTIFIED_SHA,
    mainSha: process.env.PREPARED_MAIN_SHA });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`BLOCKED native merge readiness: ${error.message}`); process.exitCode = 1; });
}
