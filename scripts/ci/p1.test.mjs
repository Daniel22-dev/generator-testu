import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { githubRead, readCollection } from './github-read.mjs';
import { verifyMainProtection, readLiveProtection, readAdminAttestation, REQUIRED_CHECKS, RULESET_ID, ACTIONS_APP_ID, ATTESTED_RULESET_UPDATED_AT } from './main-protection.mjs';
import { validateFreshness, checkLiveFreshness } from './promotion-freshness.mjs';
import { requirePrerequisites, selectIndependentRuns, verifyIndependentJob, waitForIndependent, INDEPENDENT_GATES } from './release-admission.mjs';
import { validateP1Workflow, jobBlock } from './p1-workflow-contract.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = 'Daniel22-dev/generator-testu', sha = 'a'.repeat(40), mainSha = 'b'.repeat(40);
function protection() {
  const rules = [{ type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'pull_request' },
    { type: 'required_status_checks', parameters: { do_not_enforce_on_create: false, strict_required_status_checks_policy: true,
      required_status_checks: REQUIRED_CHECKS.map(context => ({ context, integration_id: ACTIONS_APP_ID })) } }];
  return { repo, ruleset: { id: RULESET_ID, source_type: 'Repository', source: repo, target: 'branch', enforcement: 'active',
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } }, updated_at: ATTESTED_RULESET_UPDATED_AT, current_user_can_bypass: 'never', bypass_actors: [], rules },
  effectiveRules: rules.map(rule => ({ ...structuredClone(rule), ruleset_id: RULESET_ID, ruleset_source_type: 'Repository', ruleset_source: repo })) };
}
test('P1: all five native checks, PR and branch protection are mandatory', () => {
  const result = verifyMainProtection(protection()); assert.equal(result.status, 'PASS'); assert.equal(result.requiredChecks.length, 5);
});
test('P1 hidden bypass metadata is accepted only for the exact administrator-attested ruleset revision', () => {
  const x = protection(); delete x.ruleset.bypass_actors;
  const result = verifyMainProtection({ ...x, attestation: readAdminAttestation() });
  assert.equal(result.status, 'PASS'); assert.equal(result.bypassEvidence, 'admin-attested-exact-revision');
});
test('P1 hidden bypass metadata fails closed without attestation or after any ruleset revision change', () => {
  const x = protection(); delete x.ruleset.bypass_actors;
  assert.throws(() => verifyMainProtection(x), /attestation/);
  const attestation = readAdminAttestation();
  x.ruleset.updated_at = '2026-10-06T18:33:10.702Z';
  assert.throws(() => verifyMainProtection({ ...x, attestation }), /changed since administrator attestation/);
});
test('P1 hidden bypass metadata rejects a non-empty or otherwise forged administrator attestation', () => {
  const x = protection(); delete x.ruleset.bypass_actors;
  const attestation = structuredClone(readAdminAttestation()); attestation.bypassActors = [{ actor_type: 'Integration' }];
  assert.throws(() => verifyMainProtection({ ...x, attestation }), /empty bypass list/);
});
for (const [id, mutate] of [
  ['loose main checks', x => { x.ruleset.rules[3].parameters.strict_required_status_checks_policy = false; }],
  ['disabled', x => { x.ruleset.enforcement = 'disabled'; }],
  ['evaluate-only', x => { x.ruleset.enforcement = 'evaluate'; }],
  ['foreign repo', x => { x.ruleset.source = 'foreign/repo'; }],
  ['wrong ruleset ID', x => { x.ruleset.id++; }],
  ['wrong target', x => { x.ruleset.target = 'tag'; }],
  ['bypass allowed', x => { x.ruleset.bypass_actors = [{ actor_type: 'Integration', actor_id: ACTIONS_APP_ID, bypass_mode: 'always' }]; }],
  ['workflow token can bypass', x => { x.ruleset.current_user_can_bypass = 'always'; }],
  ['main excluded', x => { x.ruleset.conditions.ref_name.exclude = ['refs/heads/main']; }],
  ['scope ambiguous', x => { x.ruleset.conditions.ref_name.include = ['refs/heads/*']; }],
  ['ineffective rules', x => { x.effectiveRules = []; }],
  ['foreign effective rules', x => { x.effectiveRules.forEach(r => { r.ruleset_source = 'foreign/repo'; }); }],
  ['different active ruleset', x => { x.effectiveRules.forEach(r => { r.ruleset_id++; }); }],
  ['merge queue unsupported', x => { x.effectiveRules.push({ type: 'merge_queue' }); }],
]) test('P1 protection refuses ' + id, () => { const x = protection(); mutate(x); assert.throws(() => verifyMainProtection(x)); });
for (const context of REQUIRED_CHECKS) for (const where of ['rules', 'effective']) {
  test(`P1 protection rejects missing ${context} in ${where}`, () => {
    const x = protection(), rules = where === 'rules' ? x.ruleset.rules : x.effectiveRules;
    rules.find(r => r.type === 'required_status_checks').parameters.required_status_checks =
      rules.find(r => r.type === 'required_status_checks').parameters.required_status_checks.filter(c => c.context !== context);
    assert.throws(() => verifyMainProtection(x));
  });
}
for (const wrongApp of [null, undefined, -1, 1, '15368']) test('P1 rejects unbound or foreign App ' + wrongApp, () => {
  const x = protection(); x.ruleset.rules[3].parameters.required_status_checks[0].integration_id = wrongApp;
  assert.throws(() => verifyMainProtection(x));
});
for (const type of ['deletion', 'non_fast_forward', 'pull_request']) test('P1 rejects missing ' + type, () => {
  const x = protection(); x.ruleset.rules = x.ruleset.rules.filter(r => r.type !== type); assert.throws(() => verifyMainProtection(x));
});
test('P1 live guard performs GET reads and never mutates repository configuration', () => {
  const x = protection(), calls = [];
  assert.equal(readLiveProtection(repo, endpoint => { calls.push(endpoint); return endpoint.includes('/rulesets/') ? x.ruleset : x.effectiveRules; }).status, 'PASS');
  assert.equal(calls.length, 2); assert.ok(calls[1].includes('/rules/branches/main?per_page=100&page=1'));
  let args;
  assert.deepEqual(githubRead(`repos/${repo}/rulesets/${RULESET_ID}`, (cmd, a) => { assert.equal(cmd, 'gh'); args = a; return '{}'; }), {});
  assert.equal(args[args.indexOf('--method') + 1], 'GET'); assert.ok(!args.includes('--input'));
});
test('P1 cannot interpret API errors or malformed JSON as protection PASS', () => {
  assert.throws(() => readLiveProtection(repo, () => { throw new Error('HTTP 403'); }));
  assert.throws(() => githubRead(`repos/${repo}/rulesets/${RULESET_ID}`, () => '{broken'));
  assert.throws(() => githubRead(`repos/${repo}/rulesets/${RULESET_ID}`, () => { throw new Error('synthetic credential'); }), /GET failed/);
});
test('P1 pagination includes later pages and refuses truncated evidence', () => {
  const a = readCollection(`repos/${repo}/rules/branches/main`, null, url => url.includes('page=2') ? ['last'] : Array(100).fill('first'));
  assert.equal(a.length, 101);
  assert.throws(() => readCollection(`repos/${repo}/rules/branches/main`, null, () => Array(100).fill(1)), /pagination limit/);
  assert.throws(() => readCollection(`repos/${repo}/actions/runs`, 'workflow_runs', () => ({ total_count: 2, workflow_runs: [1] })), /Incomplete/);
});
function needsFixture() {
  return Object.fromEntries(['prepare', 'candidate-gate', 'pr-certification'].map(id => [id,
    { result: 'success', outputs: { certified_sha: sha, eligible: 'true', main_sha: mainSha, pr_number: '87' } }]));
}
test('P1 successful prerequisites must all certify exact event SHA', () => assert.equal(requirePrerequisites(needsFixture(), sha), true));
for (const id of ['prepare', 'candidate-gate', 'pr-certification']) {
  for (const result of ['failure', 'cancelled', 'skipped', 'neutral', '', undefined]) test(`P1 admission rejects ${id}=${result}`, () => {
    const x = needsFixture(); x[id].result = result; assert.throws(() => requirePrerequisites(x, sha));
  });
  for (const [label, mutate] of [['foreign SHA', x => { x.certified_sha = mainSha; }], ['missing SHA', x => { delete x.certified_sha; }],
    ['no eligibility', x => { x.eligible = 'false'; }], ['boolean eligibility', x => { x.eligible = true; }]]) {
    test(`P1 admission rejects ${id}: ${label}`, () => { const x = needsFixture(); mutate(x[id].outputs); assert.throws(() => requirePrerequisites(x, sha)); });
  }
}
test('P1 empty needs and malformed PR identity do not authorize release', () => {
  assert.throws(() => requirePrerequisites({}, sha)); const x = needsFixture(); x.prepare.outputs.pr_number = '--all'; assert.throws(() => requirePrerequisites(x, sha));
});
function freshFixture() {
  return { repo, sha, mainSha, candidate: { ref: 'refs/heads/candidate', object: { type: 'commit', sha } },
    main: { ref: 'refs/heads/main', object: { type: 'commit', sha: mainSha } }, prNumber: '87',
    pr: { number: 87, state: 'open', merged: false, head: { repo: { full_name: repo }, ref: 'candidate', sha },
      base: { repo: { full_name: repo }, ref: 'main', sha: mainSha } } };
}
test('P1 exact candidate, PR and captured main pass freshness', () => assert.equal(validateFreshness(freshFixture()).eligible, true));
for (const [id, mutate] of [
  ['new candidate', x => { x.candidate.object.sha = 'c'.repeat(40); }],
  ['new main', x => { x.main.object.sha = 'c'.repeat(40); }],
  ['different PR head', x => { x.pr.head.sha = mainSha; }],
  ['foreign PR', x => { x.pr.head.repo.full_name = 'foreign/repo'; }],
  ['wrong base repo', x => { x.pr.base.repo.full_name = 'foreign/repo'; }],
  ['wrong PR', x => { x.pr.number++; }],
  ['closed PR', x => { x.pr.state = 'closed'; }],
  ['merged PR', x => { x.pr.merged = true; }],
  ['wrong base branch', x => { x.pr.base.ref = 'master'; }],
  ['wrong head branch', x => { x.pr.head.ref = 'other'; }],
  ['missing PR', x => { delete x.pr; }],
  ['missing candidate', x => { x.candidate.object = {}; }],
  ['symbolic SHA', x => { x.sha = 'candidate'; }],
]) test('P1 freshness refuses ' + id, () => { const x = freshFixture(); mutate(x); assert.throws(() => validateFreshness(x)); });
test('P1 live freshness checks actual checkout and base ancestry, not only API strings', () => {
  const f = freshFixture(); const read = url => url.includes('/pulls/') ? f.pr : url.endsWith('/main') ? f.main : f.candidate;
  const calls = [];
  const git = (cmd, args) => { calls.push(args); return args[0] === 'rev-parse' ? (args[1] === 'HEAD' ? sha : mainSha) : ''; };
  assert.equal(checkLiveFreshness(f, read, git).eligible, true); assert.ok(calls.some(a => a[0] === 'merge-base' && a[1] === '--is-ancestor'));
  assert.throws(() => checkLiveFreshness(f, read, (cmd, a) => a[0] === 'rev-parse' ? mainSha : ''), /Checkout differs/);
  assert.throws(() => checkLiveFreshness(f, read, (cmd, a) => { if (a[0] === 'merge-base') throw new Error('not ancestor'); return git(cmd, a); }), /not ancestor/);
  assert.throws(() => checkLiveFreshness(f, read, (cmd, a) => a[0] === 'rev-parse' && a[1] === 'origin/main' ? 'c'.repeat(40) : git(cmd, a)), /Main moved/);
});
test('P1 PR freshness cannot silently recapture a missing prepared main SHA', () => {
  const f = freshFixture(); delete f.mainSha;
  let calls = 0;
  assert.throws(() => checkLiveFreshness(f, () => { calls++; return f.main; }), /exact commit SHA/);
  assert.equal(calls, 0, 'No API/Git operation before rejecting a missing prepared base');
});
function independentFixture(gate = INDEPENDENT_GATES[0], index = 1) {
  const run = { id: index, run_attempt: 1, head_sha: sha, head_branch: 'candidate', event: 'push',
    path: '.github/workflows/' + gate.file, repository: { full_name: repo }, head_repository: { full_name: repo }, status: 'completed', conclusion: 'success' };
  const job = { id: index + 100, name: gate.job, run_id: index, run_attempt: 1, head_sha: sha, status: 'completed', conclusion: 'success', check_run_url: `https://api.github.com/repos/${repo}/check-runs/${index + 100}` };
  const check = { id: job.id, name: job.name, head_sha: sha, app: { id: ACTIONS_APP_ID }, status: 'completed', conclusion: 'success' };
  return { jobs: [job], run, check, gate, repo, sha };
}
for (const gate of INDEPENDENT_GATES) {
  test('P1 independent source and successful job: ' + gate.job, () => {
    const f = independentFixture(gate); assert.equal(selectIndependentRuns([f.run], gate, repo, sha).status, 'PASS');
    assert.equal(verifyIndependentJob(f).job, gate.job);
  });
  for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'skipped', 'neutral', null]) {
    test(`P1 never hides ${gate.job} ${conclusion} behind a green duplicate`, () => {
      const f = independentFixture(gate); const failed = { ...f.run, id: 2, conclusion };
      assert.throws(() => selectIndependentRuns([f.run, failed], gate, repo, sha));
    });
  }
}
test('P1 running rerun cannot reuse an older green workflow result', () => {
  const f = independentFixture(); assert.equal(selectIndependentRuns([f.run, { ...f.run, id: 2, status: 'in_progress', conclusion: null }], f.gate, repo, sha).status, 'WAIT');
});
for (const [id, change] of [ ['wrong SHA', { head_sha: mainSha }], ['wrong branch', { head_branch: 'main' }], ['foreign event', { event: 'pull_request' }] ]) {
  test('P1 does not reuse ' + id, () => { const f = independentFixture(); assert.equal(selectIndependentRuns([{ ...f.run, ...change }], f.gate, repo, sha).status, 'WAIT'); });
}
for (const [id, mutate] of [
  ['workflow file', x => { x.run.path = '.github/workflows/other.yml'; }],
  ['workflow repo', x => { x.run.repository.full_name = 'foreign/repo'; }],
  ['head repo', x => { x.run.head_repository.full_name = 'foreign/repo'; }],
]) test('P1 rejects incorrect ' + id, () => { const f = independentFixture(); mutate(f); assert.throws(() => selectIndependentRuns([f.run], f.gate, repo, sha)); });
for (const [id, mutate] of [
  ['job missing', x => { x.jobs = []; }], ['job duplicate', x => { x.jobs.push(structuredClone(x.jobs[0])); }],
  ['job skipped', x => { x.jobs[0].conclusion = 'skipped'; }], ['job neutral', x => { x.jobs[0].conclusion = 'neutral'; }],
  ['wrong job SHA', x => { x.jobs[0].head_sha = mainSha; }], ['wrong run ID', x => { x.jobs[0].run_id++; }],
  ['stale attempt', x => { x.jobs[0].run_attempt++; }], ['foreign check URL', x => { x.jobs[0].check_run_url = 'https://example.invalid/check'; }],
  ['wrong app', x => { x.check.app.id++; }], ['wrong check SHA', x => { x.check.head_sha = mainSha; }],
  ['wrong check ID', x => { x.check.id++; }], ['wrong check name', x => { x.check.name = 'other'; }],
  ['check still running', x => { x.check.status = 'in_progress'; }], ['failed check', x => { x.check.conclusion = 'failure'; }],
]) test('P1 rejects independent evidence: ' + id, () => { const f = independentFixture(); mutate(f); assert.throws(() => verifyIndependentJob(f)); });
test('P1 independent verifier executes both complete API paths and binds attempt/job/app', async () => {
  const fixtures = INDEPENDENT_GATES.map((g, i) => independentFixture(g, i + 1)), calls = [];
  const read = url => {
    calls.push(url);
    for (const f of fixtures) {
      if (url.includes(`/workflows/${f.gate.file}/runs`)) return { total_count: 1, workflow_runs: [f.run] };
      if (url.includes(`/runs/${f.run.id}/attempts/1/jobs`)) return { total_count: 1, jobs: f.jobs };
      if (url.endsWith(`/check-runs/${f.check.id}`)) return f.check;
    }
    throw new Error('Unexpected API endpoint: ' + url);
  };
  const evidence = await waitForIndependent({ repo, sha, read, pause: () => { throw new Error('Unexpected wait'); } });
  assert.equal(evidence.length, 2); assert.equal(calls.length, 6); assert.ok(evidence.every(x => x.sha === sha && x.attempt === 1));
});
test('P1 empty/missing required runs time out instead of granting access', async () => {
  let clock = 0;
  await assert.rejects(waitForIndependent({ repo, sha, timeoutMs: 10, intervalMs: 5,
    read: () => ({ total_count: 0, workflow_runs: [] }), now: () => clock, pause: n => { clock += n; } }), /bounded wait/);
});
test('P1 API failure is not treated as pending success', async () => {
  await assert.rejects(waitForIndependent({ repo, sha, read: () => { throw new Error('HTTP 403'); } }), /HTTP 403/);
});
const production = fs.readFileSync(path.join(root, '.github/workflows/safe-promotion.yml'), 'utf8');
const parallel = production.replace(/^    needs: \[prepare, candidate-gate\]$/m, '    needs: prepare');
test('P1 production workflow satisfies its guarded topology contract', () => validateP1Workflow(production));
test('P1 serial rollback preserves admission and every gate', () => {
  const part = jobBlock(parallel, 'pr-certification');
  const serial = parallel.replace(part, part.replace('    needs: prepare', '    needs: [prepare, candidate-gate]'));
  validateP1Workflow(serial, 'serial'); assert.throws(() => validateP1Workflow(serial, 'parallel'));
});
for (const [id, mutate] of [
  ['remove prepare guard', s => s.replace('run: node scripts/ci/main-protection.mjs --live', 'run: true')],
  ['skip admission on dependency failure', s => s.replace(/^    if: always\(\)$/m, '    if: success()')],
  ['drop PR dependency in admission', s => s.replace('needs: [prepare, candidate-gate, pr-certification]', 'needs: [prepare, candidate-gate]')],
  ['drop prerequisite validation', s => s.replace('run: node scripts/ci/release-admission.mjs --prerequisites', 'run: true')],
  ['drop P5/Journey', s => s.replace('run: node scripts/ci/release-admission.mjs --independent', 'run: true')],
  ['promote without admission', s => s.replace('needs: [prepare, candidate-gate, pr-certification, admission]', 'needs: [prepare, candidate-gate, pr-certification]')],
  ['accept failed admission', s => s.replace("needs.admission.result == 'success'", "needs.admission.result != 'failure'")],
  ['allow eligible output for another SHA', s => s.replace(' && needs.admission.outputs.certified_sha == github.sha', '')],
  ['drop first reporter', s => s.replace('run: npm run test:reporter', 'run: true')],
  ['drop independent full QA', s => s.replace('run: npm run qa:release', 'run: true')],
  ['drop platform', s => s.replace('run: npm run qa:platform', 'run: true')],
  ['drop redteam', s => s.replace('run: npm run qa:redteam:ci', 'run: true')],
  ['drop exact merge head', s => s.replace('--match-head-commit "$CERTIFIED_SHA"', '')],
  ['cancel promotion transaction', s => s.replace('group: generator-promotion-transaction\n      cancel-in-progress: false', 'group: generator-promotion-transaction\n      cancel-in-progress: true')],
  ['continue despite failure', s => s + '\n# continue-on-error: true\n'],
]) test('P1 topology negative control: ' + id, () => { const broken = mutate(parallel); assert.notEqual(broken, parallel); assert.throws(() => validateP1Workflow(broken, 'parallel')); });
// Execute the shipping CLI entrypoints with a synthetic read-only gh executable.
// This tests argument parsing and fail-closed integration, not live GitHub enforcement.
test('P1 CLI fails closed on HTTP errors, malformed input, and missing dependencies', t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-cli-')); t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const gh = path.join(tmp, 'gh'); fs.writeFileSync(gh, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const env = { ...process.env, PATH: tmp + path.delimiter + process.env.PATH, GITHUB_REPOSITORY: repo, CERTIFIED_SHA: sha, CI_NEEDS_JSON: '{}' };
  for (const [script, arg] of [['main-protection.mjs', '--live'], ['release-admission.mjs', '--prerequisites'], ['promotion-freshness.mjs', '--pr']]) {
    const run = spawnSync(process.execPath, [path.join(root, 'scripts/ci', script), arg], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 1, run.stdout + run.stderr); assert.match(run.stderr, /BLOCKED/);
  }
});
// Real local Git DAG, not a stubbed ancestry result.
test('P1 main ancestry check rejects an untested divergent base using real Git', t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-ancestry-')); t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Synthetic CI', GIT_COMMITTER_NAME: 'Synthetic CI',
    GIT_AUTHOR_EMAIL: 'ci@example.invalid', GIT_COMMITTER_EMAIL: 'ci@example.invalid' };
  const git = (...a) => execFileSync('git', a, { cwd: tmp, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q'); fs.writeFileSync(path.join(tmp, 'fixture'), 'synthetic'); git('add', 'fixture'); git('commit', '-qm', 'synthetic fixture');
  const base = git('rev-parse', 'HEAD'), tree = git('rev-parse', 'HEAD^{tree}');
  const candidate = git('commit-tree', tree, '-p', base, '-m', 'candidate'), diverged = git('commit-tree', tree, '-p', base, '-m', 'concurrent main');
  git('merge-base', '--is-ancestor', base, candidate);
  assert.throws(() => git('merge-base', '--is-ancestor', diverged, candidate));
});
