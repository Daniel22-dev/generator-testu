import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  approvalStatement, inspectLiveReleaseAuthorization, waitForLiveReleaseAuthorization,
} from './release-authorization.mjs';
import { requirePromotionOrigin } from './promotion-origin.mjs';
import { verifyRequiredNativeChecks, waitForNativeMergeReadiness } from './native-merge-readiness.mjs';
import { ACTIONS_APP_ID, REQUIRED_CHECKS } from './main-protection.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url)));
const repo = 'Daniel22-dev/generator-testu';
const source = 'a'.repeat(40), tree = 'b'.repeat(40), main = 'c'.repeat(40);
const expected = { repository: repo, prNumber: 146, sourceSha: source, sourceTree: tree,
  preparedMainSha: main, version: pkg.version, scope: 'R1-A-C32-D02+R1-E10-GOV' };

function approval(id = 2, commit = source, state = 'APPROVED', body = approvalStatement(expected)) {
  return { id, node_id: 'PRR_' + id, html_url: 'https://github.com/' + repo + '/pull/146#pullrequestreview-' + id,
    user: { login: 'Daniel22-dev', type: 'User' }, author_association: 'OWNER', state,
    commit_id: commit, submitted_at: '2026-11-24T10:00:00Z', body };
}
function authorizationApi(reviews = []) {
  const values = new Map([
    ['repos/' + repo + '/pulls/146', { number: 146, state: 'open', merged: false,
      head: { ref: 'candidate', sha: source, repo: { full_name: repo } },
      base: { ref: 'main', sha: main, repo: { full_name: repo } } }],
    ['repos/' + repo + '/git/ref/heads/candidate', { object: { sha: source } }],
    ['repos/' + repo + '/git/ref/heads/main', { object: { sha: main } }],
    ['repos/' + repo + '/git/commits/' + source, { sha: source, tree: { sha: tree } }],
  ]);
  return { read: endpoint => structuredClone(values.get(endpoint)),
    collection: () => structuredClone(reviews), values };
}

test('promotion origin accepts only first-attempt candidate push', () => {
  const env = { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/candidate',
    GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: source };
  assert.equal(requirePromotionOrigin(env).runAttempt, 1);
  for (const mutate of [
    x => { x.GITHUB_EVENT_NAME = 'workflow_dispatch'; },
    x => { x.GITHUB_RUN_ATTEMPT = '2'; },
    x => { x.GITHUB_REF = 'refs/heads/main'; },
    x => { x.GITHUB_ACTIONS = 'false'; },
  ]) {
    const broken = { ...env }; mutate(broken); assert.throws(() => requirePromotionOrigin(broken));
  }
});

test('historical approval is pending and new exact approval during wait is accepted', async () => {
  const old = approval(1, 'd'.repeat(40));
  const api = authorizationApi([old]);
  let clock = 0, polls = 0;
  const evidence = await waitForLiveReleaseAuthorization(expected, {
    read: api.read,
    collection: () => polls++ === 0 ? [old] : [old, approval()],
    now: () => clock, pause: ms => { clock += ms; }, timeoutMs: 100, intervalMs: 30,
  });
  assert.equal(evidence.status, 'PASS'); assert.equal(evidence.source.commit, source);
});

test('WAIT validates release context without constructing a synthetic review', () => {
  const api = authorizationApi([]);
  const result = inspectLiveReleaseAuthorization(expected, api);
  assert.deepEqual(result, { status: 'WAIT', reason: 'MISSING_CURRENT_OWNER_APPROVAL' });
  const sourceText = fs.readFileSync(new URL('./release-authorization.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(sourceText, /PENDING_CONTEXT_ONLY/);
});

test('missing new approval times out fail-closed', async () => {
  const api = authorizationApi([approval(1, 'd'.repeat(40))]);
  let clock = 0;
  await assert.rejects(waitForLiveReleaseAuthorization(expected, {
    ...api, now: () => clock, pause: ms => { clock += ms; }, timeoutMs: 60, intervalMs: 30,
  }), /Timed out/);
});

test('invalid current approval, dismissal, branch drift, and API errors fail immediately', () => {
  for (const reviews of [
    [approval(2, source, 'APPROVED', 'wrong')],
    [approval(2, source, 'DISMISSED')],
    [approval(2, source, 'CHANGES_REQUESTED')],
  ]) {
    const api = authorizationApi(reviews);
    assert.throws(() => inspectLiveReleaseAuthorization(expected, api));
  }
  const drift = authorizationApi([]);
  drift.values.get('repos/' + repo + '/git/ref/heads/candidate').object.sha = 'e'.repeat(40);
  assert.throws(() => inspectLiveReleaseAuthorization(expected, drift), /Candidate moved/);
  assert.throws(() => inspectLiveReleaseAuthorization(expected, { read: () => { throw new Error('HTTP 503'); } }), /HTTP 503/);
});

function nativeFixture() {
  const runs = new Map();
  const statuses = [];
  const checks = REQUIRED_CHECKS.map((name, index) => {
    const runId = 100 + index;
    runs.set(runId, { id: runId, run_attempt: 1, event: 'push', head_sha: source, head_branch: 'candidate',
      repository: { full_name: repo }, head_repository: { full_name: repo } });
    return { id: 200 + index, name, head_sha: source, app: { id: ACTIONS_APP_ID },
      status: 'completed', conclusion: 'success',
      details_url: 'https://github.com/' + repo + '/actions/runs/' + runId + '/job/' + (300 + index) };
  });
  const refs = {
    candidate: { object: { sha: source } }, main: { object: { sha: main } },
    pr: { number: 146, state: 'open', merged: false, draft: false, mergeable: true, mergeable_state: 'clean',
      head: { sha: source }, base: { sha: main } },
  };
  const read = endpoint => {
    const match = endpoint.match(/actions\/runs\/(\d+)$/);
    if (match) return structuredClone(runs.get(Number(match[1])));
    if (endpoint.endsWith('/candidate')) return structuredClone(refs.candidate);
    if (endpoint.endsWith('/main')) return structuredClone(refs.main);
    if (endpoint.endsWith('/pulls/146')) return structuredClone(refs.pr);
    throw new Error('Unexpected ' + endpoint);
  };
  const collection = endpoint => {
    if (endpoint.endsWith('/check-runs')) return structuredClone(checks);
    if (endpoint.endsWith('/statuses')) return structuredClone(statuses);
    throw new Error('Unexpected collection ' + endpoint);
  };
  return { runs, checks, statuses, refs, read, collection };
}

function addCurrentPromotionCheck(f, overrides = {}) {
  const runId = 104; // release-admission belongs to the current Safe Promotion run
  const check = { id: 999, name: 'promote-certified-pr', head_sha: source,
    app: { id: ACTIONS_APP_ID }, status: 'in_progress', conclusion: null,
    details_url: 'https://github.com/' + repo + '/actions/runs/' + runId + '/job/999', ...overrides };
  f.runs.get(runId).path = '.github/workflows/safe-promotion.yml';
  f.checks.push(check);
  return check;
}

test('native readiness accepts all five exact-SHA eligible GitHub Actions checks', async () => {
  const f = nativeFixture();
  assert.equal(verifyRequiredNativeChecks({ repo, sha: source, checks: f.checks, read: f.read }).length, 5);
  const result = await waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read: f.read, collection: f.collection, pause: () => { throw new Error('unexpected wait'); } });
  assert.equal(result.status, 'PASS'); assert.equal(result.mergeableState, 'clean');
});

test('native readiness accepts unstable only for the authentic current in-progress promotion job', async () => {
  const f = nativeFixture(); f.refs.pr.mergeable_state = 'unstable'; addCurrentPromotionCheck(f);
  const result = await waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read: f.read, collection: f.collection, pause: () => { throw new Error('unexpected wait'); } });
  assert.equal(result.status, 'PASS'); assert.equal(result.mergeableState, 'unstable');
  assert.equal(result.inProgressPromotion.checkId, 999); assert.equal(result.inProgressPromotion.runId, 104);
});

test('unstable readiness rejects unauthentic promotion, extra failures, failed statuses and identity drift', async () => {
  const reject = async (mutate, pattern) => {
    const f = nativeFixture(); f.refs.pr.mergeable_state = 'unstable'; addCurrentPromotionCheck(f); mutate(f);
    await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
      read: f.read, collection: f.collection, pause: () => { throw new Error('unexpected wait'); } }), pattern);
  };
  await reject(f => { f.checks[5].app.id = 999; }, /promotion.*GitHub Actions App/i);
  await reject(f => { f.checks[5].details_url = 'https://github.com/' + repo + '/actions/runs/103/job/999'; }, /current promotion run/i);
  await reject(f => { f.checks.push({ id: 1000, name: 'foreign-pending', head_sha: source,
    app: { id: ACTIONS_APP_ID }, status: 'in_progress', conclusion: null,
    details_url: 'https://github.com/' + repo + '/actions/runs/104/job/1000' }); }, /only non-success check/i);
  await reject(f => { f.statuses.push({ id: 1, sha: source, context: 'legacy', state: 'failure' }); }, /commit status/i);
  await reject(f => { f.refs.candidate.object.sha = 'e'.repeat(40); }, /Candidate moved/);
  await reject(f => { f.refs.pr.head.sha = 'e'.repeat(40); }, /PR head moved/);
});

test('native readiness rejects missing or failed mandatory checks and nonmergeable states', async () => {
  for (const mutate of [
    f => { f.checks = f.checks.filter(check => check.name !== REQUIRED_CHECKS[0]); },
    f => { f.checks[0].conclusion = 'failure'; },
  ]) {
    const f = nativeFixture(); mutate(f);
    await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
      read: f.read, collection: endpoint => endpoint.endsWith('/check-runs') ? structuredClone(f.checks) : [],
      pause: () => { throw new Error('unexpected wait'); } }));
  }
  for (const state of ['dirty', 'behind']) {
    const f = nativeFixture(); f.refs.pr.mergeable_state = state;
    await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
      read: f.read, collection: f.collection }), /Non-transient native merge state/);
  }
  const f = nativeFixture(); f.refs.pr.mergeable = false;
  await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read: f.read, collection: f.collection }), /unmergeable/);
});

test('native readiness tolerates bounded propagation but never persistent BLOCKED', async () => {
  const f = nativeFixture(); let clock = 0, polls = 0;
  const read = endpoint => {
    if (endpoint.endsWith('/pulls/146')) {
      const pr = structuredClone(f.refs.pr); if (polls++ === 0) pr.mergeable_state = 'blocked'; return pr;
    }
    return f.read(endpoint);
  };
  assert.equal((await waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read, collection: f.collection, now: () => clock, pause: ms => { clock += ms; }, timeoutMs: 20, intervalMs: 10 })).status, 'PASS');
  f.refs.pr.mergeable_state = 'blocked'; clock = 0;
  await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read: f.read, collection: f.collection, now: () => clock, pause: ms => { clock += ms; }, timeoutMs: 20, intervalMs: 10 }), /remained blocked/);
});

test('native checks reject workflow_dispatch, rerun, wrong App, failure, and drift', async () => {
  for (const mutate of [
    f => { f.runs.get(104).event = 'workflow_dispatch'; },
    f => { f.runs.get(104).run_attempt = 2; },
    f => { f.checks[4].app.id = 999; },
    f => { f.checks[4].conclusion = 'failure'; },
  ]) {
    const f = nativeFixture(); mutate(f);
    assert.throws(() => verifyRequiredNativeChecks({ repo, sha: source, checks: f.checks, read: f.read }));
  }
  const f = nativeFixture(); f.refs.main.object.sha = 'e'.repeat(40);
  await assert.rejects(waitForNativeMergeReadiness({ repo, prNumber: 146, sha: source, mainSha: main,
    read: f.read, collection: f.collection }), /Main moved/);
});
