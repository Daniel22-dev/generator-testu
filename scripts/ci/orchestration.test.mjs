import { validateP1Workflow } from './p1-workflow-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { REPORT_FILES, createReleaseEvidence } from './release-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const syncScript = path.join(ROOT, 'scripts/ci/sync-candidate.sh');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'git-ci-p0-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function evidenceFixture(t) {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'qa-results'));
  fs.mkdirSync(path.join(root, 'qa'));
  const now = Date.now() + 100;
  const started = now - 2000;
  const env = {
    GITHUB_ACTIONS: 'true', GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2', GITHUB_JOB: 'candidate-gate', GITHUB_REPOSITORY: 'synthetic/fixture',
    CI_RELEASE_OUTCOME: 'success', CI_RELEASE_STARTED_AT: new Date(started).toISOString(),
  };
  const report = {
    commit: env.GITHUB_SHA, version: '0.0.0', appId: 'fixture', qaStandard: 'test-standard',
    date: new Date(now - 50).toISOString(), verdict: 'AUTOMATED_READY', buildSha256: 'b'.repeat(64),
  };
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: report.version }));
  fs.writeFileSync(path.join(root, 'qa/qa-manifest.json'), JSON.stringify({ appId: 'fixture', standard: 'test-standard' }));
  const writeReport = () => fs.writeFileSync(path.join(root, 'qa-results/qa-report.json'), JSON.stringify(report));
  writeReport();
  fs.writeFileSync(path.join(root, 'qa-results/qa-report.html'), '<!doctype html><p>Synthetic report</p>');
  fs.writeFileSync(path.join(root, 'qa-results/release-verdict.txt'), report.verdict + '\n');
  fs.writeFileSync(path.join(root, 'qa-results/qa-test-matrix.csv'), 'synthetic,result\nfixture,PASS\n');
  const options = { root, env, now, snapshot: { sha256: 'c'.repeat(64), fileCount: 1 } };
  return { ...options, options, report, writeReport };
}

test('evidence: exact run/attempt/job, four report hashes; no release permission', t => {
  const f = evidenceFixture(t);
  const actual = createReleaseEvidence(f.options);
  assert.equal(actual.sourceCommit, f.env.GITHUB_SHA);
  assert.equal(actual.runAttempt, '2');
  assert.equal(actual.job, 'candidate-gate');
  assert.deepEqual(actual.files.map(x => x.path), REPORT_FILES);
  for (const file of actual.files) assert.equal(file.sha256, hash(fs.readFileSync(path.join(f.root, 'qa-results', file.path))));
  assert.match(actual.limits.join(' '), /not an independent certification/);
  // Transport simulation: an already uploaded allowlist survives later workspace cleanup.
  const archive = path.join(f.root, 'uploaded-fixture');
  fs.mkdirSync(archive);
  for (const file of actual.files) fs.copyFileSync(path.join(f.root, 'qa-results', file.path), path.join(archive, file.path));
  fs.rmSync(path.join(f.root, 'qa-results'), { recursive: true });
  for (const file of actual.files) assert.equal(hash(fs.readFileSync(path.join(archive, file.path))), file.sha256);
});
for (const name of REPORT_FILES) {
  for (const mutation of ['missing', 'empty', 'stale', 'symlink']) {
    test(`evidence rejects ${mutation} ${name}`, t => {
      const f = evidenceFixture(t), file = path.join(f.root, 'qa-results', name);
      if (mutation === 'missing') fs.unlinkSync(file);
      if (mutation === 'empty') fs.writeFileSync(file, '');
      if (mutation === 'stale') fs.utimesSync(file, new Date(0), new Date(0));
      if (mutation === 'symlink') { fs.unlinkSync(file); fs.symlinkSync(path.join(f.root, 'package.json'), file); }
      assert.throws(() => createReleaseEvidence(f.options));
    });
  }
}
for (const [name, mutate] of [
  ['other SHA', f => { f.report.commit = 'd'.repeat(40); f.writeReport(); }],
  ['other version', f => { f.report.version = '1.0.0'; f.writeReport(); }],
  ['other app', f => { f.report.appId = 'another'; f.writeReport(); }],
  ['other standard', f => { f.report.qaStandard = 'another'; f.writeReport(); }],
  ['old run report date', f => { f.report.date = new Date(0).toISOString(); f.writeReport(); }],
  ['future date', f => { f.report.date = new Date(f.now + 10000).toISOString(); f.writeReport(); }],
  ['verdict mismatch', f => { f.report.verdict = 'NOT_READY'; f.writeReport(); }],
  ['missing digest', f => { delete f.report.buildSha256; f.writeReport(); }],
  ['skipped QA', f => { f.env.CI_RELEASE_OUTCOME = 'skipped'; }],
  ['no attempt', f => { delete f.env.GITHUB_RUN_ATTEMPT; }],
  ['no run ID', f => { delete f.env.GITHUB_RUN_ID; }],
  ['no start marker', f => { delete f.env.CI_RELEASE_STARTED_AT; }],
  ['local run mislabelled as Actions', f => { f.env.GITHUB_ACTIONS = 'false'; }],
]) test(`evidence rejects ${name}`, t => {
  const f = evidenceFixture(t); mutate(f); assert.throws(() => createReleaseEvidence(f.options));
});
test('failed QA remains failed evidence, never a green gate', t => {
  const f = evidenceFixture(t);
  f.report.verdict = 'NOT_READY'; f.writeReport();
  fs.writeFileSync(path.join(f.root, 'qa-results/release-verdict.txt'), 'NOT_READY\n');
  assert.throws(() => createReleaseEvidence(f.options));
  f.env.CI_RELEASE_OUTCOME = 'failure';
  assert.equal(createReleaseEvidence(f.options).qaOutcome, 'failure');
});
test('linked evidence directory is rejected', t => {
  const f = evidenceFixture(t);
  fs.renameSync(path.join(f.root, 'qa-results'), path.join(f.root, 'linked-target'));
  fs.symlinkSync(path.join(f.root, 'linked-target'), path.join(f.root, 'qa-results'));
  assert.throws(() => createReleaseEvidence(f.options));
});

// These tests invoke the production shell script and real Git against temporary
// local bare repositories. A wrapper only schedules the competing write.
function gitFixture(t) {
  const root = temporary(t), remote = path.join(root, 'remote.git'), work = path.join(root, 'work');
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Synthetic CI', GIT_COMMITTER_NAME: 'Synthetic CI',
    GIT_AUTHOR_EMAIL: 'ci@example.invalid', GIT_COMMITTER_EMAIL: 'ci@example.invalid' };
  const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  const git = (...args) => execFileSync(realGit, args, { cwd: work, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  fs.mkdirSync(work);
  git('init', '--bare', '-q', remote);
  git('init', '-q', work);
  git('remote', 'add', 'origin', remote);
  fs.writeFileSync(path.join(work, 'fixture.txt'), 'synthetic\n');
  git('add', 'fixture.txt'); git('commit', '-qm', 'synthetic base');
  const base = git('rev-parse', 'HEAD');
  const tree = git('rev-parse', 'HEAD^{tree}');
  const main = git('commit-tree', tree, '-p', base, '-m', 'synthetic merged main');
  const newer = git('commit-tree', tree, '-p', base, '-m', 'synthetic newer candidate');
  const later = git('commit-tree', tree, '-p', main, '-m', 'synthetic work after sync');
  git('push', '-q', 'origin', `${base}:refs/heads/candidate`, `${main}:refs/heads/main`);
  // Make all competing objects available to the bare fixture, without advancing candidate.
  git('push', '-q', 'origin', `${newer}:refs/heads/fixture-newer`, `${later}:refs/heads/fixture-later`);
  const remoteHead = () => git('--git-dir=' + remote, 'rev-parse', 'refs/heads/candidate');
  const setHead = value => git('--git-dir=' + remote, 'update-ref', 'refs/heads/candidate', value);
  const run = (extra = {}, script = syncScript) => spawnSync('bash', [script], {
    cwd: work, encoding: 'utf8', timeout: 15000,
    env: { ...env, CERTIFIED_SHA: base, MAIN_HEAD: main, ...extra },
  });
  const inject = mode => {
    const bin = path.join(root, 'bin'); fs.mkdirSync(bin, { recursive: true });
    const wrapper = `#!/usr/bin/env bash\nset -euo pipefail\ncase " $* " in\n*" push "*)\n` +
      (mode === 'before' ? `  "${realGit}" --git-dir="${remote}" update-ref refs/heads/candidate ${newer} ${base}\n` : '') +
      (mode === 'transport' ? '  exit 1\n' : '') +
      (mode === 'delete' ? `  "${realGit}" --git-dir="${remote}" update-ref -d refs/heads/candidate\n` : '') +
      (mode === 'after' ? `  "${realGit}" "$@"\n  "${realGit}" --git-dir="${remote}" update-ref refs/heads/candidate ${later} ${main}\n  exit 0\n` : '') +
      `;;\nesac\nexec "${realGit}" "$@"\n`;
    fs.writeFileSync(path.join(bin, 'git'), wrapper, { mode: 0o755 });
    return { PATH: bin + path.delimiter + env.PATH };
  };
  return { root, work, base, main, newer, later, tree, git, run, inject, setHead, remoteHead };
}
test('sync advances exact candidate and is idempotent', t => {
  const f = gitFixture(t); const first = f.run();
  assert.equal(first.status, 0, first.stderr); assert.equal(f.remoteHead(), f.main);
  const second = f.run(); assert.equal(second.status, 0, second.stderr); assert.match(second.stdout, /ALREADY_SYNCHRONIZED/);
});
test('sync leaves a candidate that advanced before the read untouched', t => {
  const f = gitFixture(t); f.setHead(f.newer);
  const result = f.run(); assert.equal(result.status, 0, result.stderr);
  assert.equal(f.remoteHead(), f.newer); assert.match(result.stdout, /SUPERSEDED:/);
});
test('actual server lease rejects update that raced between read and push', t => {
  const f = gitFixture(t); const result = f.run(f.inject('before'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.remoteHead(), f.newer); assert.match(result.stdout, /SUPERSEDED_DURING_SYNC/);
});
test('negative control: replacing the explicit lease with force loses the competing work', t => {
  const f = gitFixture(t), broken = path.join(f.root, 'unsafe-negative-control.sh');
  const original = fs.readFileSync(syncScript, 'utf8');
  const mutation = original.replace('--force-with-lease="refs/heads/candidate:$CERTIFIED_SHA"', '--force');
  assert.notEqual(mutation, original, 'Mutation must actually change the script');
  fs.writeFileSync(broken, mutation);
  const result = f.run(f.inject('before'), broken);
  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(f.remoteHead(), f.newer, 'Unsafe control must fail the preservation invariant');
  assert.equal(f.remoteHead(), f.main);
});
test('sync leaves work that advances after successful update untouched', t => {
  const f = gitFixture(t); const result = f.run(f.inject('after'));
  assert.equal(result.status, 0, result.stderr); assert.equal(f.remoteHead(), f.later);
  assert.match(result.stdout, /ADVANCED_AFTER_SYNC/);
});
test('sync does not hide transport or policy failures when candidate did not change', t => {
  const f = gitFixture(t); const result = f.run(f.inject('transport'));
  assert.notEqual(result.status, 0); assert.equal(f.remoteHead(), f.base);
});
test('deleted candidate is not recreated by stale sync', t => {
  const f = gitFixture(t); const result = f.run(f.inject('delete'));
  assert.notEqual(result.status, 0);
  assert.throws(() => f.remoteHead());
});
test('sync rejects unrelated main and malformed identities', t => {
  const f = gitFixture(t);
  const unrelated = f.git('commit-tree', f.tree, '-m', 'unrelated synthetic root');
  for (const extra of [{ MAIN_HEAD: unrelated }, { CERTIFIED_SHA: '--all' }, { MAIN_HEAD: '' }]) {
    assert.notEqual(f.run(extra).status, 0); assert.equal(f.remoteHead(), f.base);
  }
});
test('sync never implicitly follows local annotated tags', t => {
  const f = gitFixture(t);
  f.git('config', 'push.followTags', 'true'); f.git('tag', '-am', 'synthetic tag', 'fixture-tag', f.base);
  assert.equal(f.run().status, 0);
  assert.equal(f.git('ls-remote', 'origin', 'refs/tags/fixture-tag'), '');
});

function job(text, id) {
  const begin = text.indexOf(`\n  ${id}:\n`);
  assert.ok(begin >= 0, `Missing job ${id}`);
  const rest = text.slice(begin + 1), next = rest.slice(1).search(/^  [a-zA-Z0-9_-]+:\s*$/m);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function validateWorkflowContracts(safe, deploy, p5, runner) {
  assert.doesNotMatch(safe, /^concurrency:/m, 'No globally cancellable promotion');
  assert.doesNotMatch(safe, /\/cancel|force=true|gh api -X PATCH/, 'No whole-run cancellation or unconditional branch force update');
  for (const id of ['candidate-gate', 'pr-certification']) {
    const part = job(safe, id);
    assert.match(part, /cancel-in-progress: true/);
    assert.match(part, /timeout-minutes: 60/);
  }
  assert.match(job(safe, 'promote'), /group: generator-promotion-transaction\n      cancel-in-progress: false/);
  validateP1Workflow(safe);
  assert.match(safe, /--match-head-commit "\$CERTIFIED_SHA"/);
  assert.match(safe, /gh run watch "\$deploy_run" --repo "\$GITHUB_REPOSITORY" --exit-status/);
  assert.match(safe, /run: bash scripts\/ci\/sync-candidate\.sh/);
  assert.ok(safe.indexOf('gh run watch') < safe.indexOf('run: bash scripts/ci/sync-candidate.sh'));
  assert.equal((safe.match(/run: npm run qa:redteam:ci/g) || []).length, 2);
  assert.equal((deploy.match(/run: npm run qa:redteam:ci/g) || []).length, 0, 'Main must reuse exact-tree evidence instead of rerunning E9');
  assert.equal((p5.match(/run: npm run qa:redteam:ci/g) || []).length, 1);
  assert.match(deploy, /group: generator-testu-pages\n  cancel-in-progress: false/);
  for (const part of [job(safe, 'candidate-gate'), job(safe, 'pr-certification')]) {
    const start = part.indexOf('id: release_start'), qa = part.indexOf('run: npm run qa:release');
    const validate = part.indexOf('run: node scripts/ci/release-evidence.mjs');
    const upload = part.indexOf('name: Preserve structured QA before destructive red-team cleanup');
    const redteam = part.indexOf('run: npm run qa:redteam:ci');
    assert.ok(start >= 0 && start < qa && qa < validate && validate < upload && upload < redteam, 'Capture current QA evidence before destructive cleanup');
    assert.match(part, /if: always\(\) && steps.release_evidence.outcome == 'success'/);
    assert.match(part, /CI_RELEASE_STARTED_AT: \$\{\{ steps.release_start.outputs.started_at \}\}/);
    for (const file of [...REPORT_FILES, 'qa-release-evidence.json']) assert.ok(part.includes('            qa-results/' + file));
    assert.match(part.slice(upload, redteam), /if-no-files-found: error/);
    assert.match(part.slice(upload, redteam), /\$\{\{ github.sha \}\}-\$\{\{ github.run_id \}\}-\$\{\{ github.run_attempt \}\}/);
    assert.doesNotMatch(part, /continue-on-error: true/);
  }
  const main = job(deploy, 'qa-build');
  assert.match(main, /run: node scripts\/ci\/main-protection\.mjs --live/);
  assert.match(main, /run: node scripts\/ci\/p4-promotion-evidence\.mjs --consume/);
  assert.match(main, /run: npm run build/);
  assert.match(main, /run: node scripts\/ci\/p4-promotion-evidence\.mjs --materialize/);
  assert.match(main, /GHRAB_P4_CONSUMED_EVIDENCE: qa-results\/p4-consumed-promotion-evidence\.json/);
  assert.doesNotMatch(main, /run: npm run (?:test:reporter|qa:release|qa:redteam:ci)/);
  assert.ok(main.indexOf('main-protection.mjs --live') < main.indexOf('p4-promotion-evidence.mjs --consume'), 'Live main protection must be rechecked before evidence reuse');
  assert.ok(main.indexOf('p4-promotion-evidence.mjs --consume') < main.indexOf('uses: ./.github/actions/install-ci-tools'), 'Fail-closed evidence validation must precede expensive setup');
  const deployJob = job(deploy, 'deploy');
  assert.match(deployJob, /gh api \"repos\/\$GITHUB_REPOSITORY\/git\/ref\/heads\/main\" --jq '\.object\.sha'/);
  assert.match(deployJob, /if \[ \"\$current_main\" != \"\$EXPECTED_MAIN_SHA\" \]; then/);
  assert.ok(main.indexOf('run: npm run build') < main.indexOf('p4-promotion-evidence.mjs --materialize'), 'Final main build precedes reused evidence materialization');
  assert.doesNotMatch(main, /continue-on-error: true/);
  assert.match(runner, /const steps=\['npm test','npm run qa:garp27:foundation','npm run qa:p5:ci','node scripts\/check-redteam-evidence-e10.mjs'\]/);
  assert.match(runner, /fs.rmSync\('qa-results',\{recursive:true,force:true\}\)/);
  assert.match(runner, /results.every\(x=>x.pass\)&&sourceUnchanged/);
  assert.match(runner, /durationMs:Math.round\(performance.now\(\)-stepClock\)/);
}
const safe = read('.github/workflows/safe-promotion.yml');
const deploy = read('.github/workflows/deploy.yml');
const p5 = read('.github/workflows/p5-release-gate.yml');
const runner = read('scripts/run-redteam-ci-e10.mjs');
test('workflow: retain all pre-merge certifications and use fail-closed P4 evidence on main', () => {
  validateWorkflowContracts(safe, deploy, p5, runner);
  assert.match(safe, /run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
  assert.match(deploy, /run: node scripts\/check-redteam-release-e10.mjs --require-ready/);
});
for (const [name, mutate] of [
  ['reintroduce cancellable workflow', x => { x[0] = 'concurrency:\n  cancel-in-progress: true\n' + x[0]; }],
  ['cancel transaction', x => { x[0] = x[0].replace('group: generator-promotion-transaction\n      cancel-in-progress: false', 'group: generator-promotion-transaction\n      cancel-in-progress: true'); }],
  ['drop second certification', x => { x[0] = x[0].replace('run: npm run qa:redteam:ci', 'run: true'); }],
  ['open PR without native guard', x => { x[0] = x[0].replace('run: node scripts/ci/main-protection.mjs --live', 'run: true'); }],
  ['missing report upload', x => { x[0] = x[0].replace('            qa-results/qa-report.json', ''); }],
  ['unbound run artifact', x => { x[0] = x[0].replaceAll('${{ github.run_id }}-${{ github.run_attempt }}', 'latest'); }],
  ['skip P4 main protection recheck', x => { x[1] = x[1].replace('run: node scripts/ci/main-protection.mjs --live', 'run: true'); }],
  ['skip P4 main evidence validator', x => { x[1] = x[1].replace('run: node scripts/ci/p4-promotion-evidence.mjs --consume', 'run: true'); }],
  ['accept stale main before deploy', x => { x[1] = x[1].replace('if [ \"$current_main\" != \"$EXPECTED_MAIN_SHA\" ]; then', 'if false; then'); }],
  ['drop cleanup freshness', x => { x[3] = x[3].replace("fs.rmSync('qa-results',{recursive:true,force:true})", ''); }],
  ['drop source invariant', x => { x[3] = x[3].replace('&&sourceUnchanged', ''); }],
]) test(`workflow negative control: ${name}`, () => {
  const input = [safe, deploy, p5, runner]; mutate(input);
  assert.throws(() => validateWorkflowContracts(...input));
});
