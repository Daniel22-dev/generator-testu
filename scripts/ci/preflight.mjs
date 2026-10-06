// Strict local pre-commit preflight. Never commits, pushes, merges or deploys.
// Keep output outside qa-results/audit/evidence: later canonical gates clean them.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sourceSnapshot } from '../redteam-source-snapshot-e9.mjs';
import { REPORT_FILES } from './release-evidence.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TRUST_PIN = '2444648deccb7b4693ac8ad7ce72d0adffddd30ba9eeea4d3628d014faacebc1';
const ACTIONLINT_VERSION = '1.7.7';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Exported only to test failure handling without substituting any real gate.
export function executePlan(plan, { out, cwd, env, execute = spawnSync, snapshot = sourceSnapshot }) {
  fs.mkdirSync(out, { recursive: true });
  const sourceBefore = snapshot();
  const result = {
    schema: 'git-ci-precommit-v1', environment: 'local-precommit', status: 'RUNNING',
    startedAt: new Date().toISOString(), node: process.version, sourceBefore,
    steps: plan.map(step => ({ id: step.id, status: 'NOT_RUN' })),
    limits: ['Local execution is not remote GitHub certification or deployment',
      'Commit only the exact reviewed source snapshot after a complete PASS; this command never commits'],
  };
  const save = () => fs.writeFileSync(path.join(out, 'preflight.json'), JSON.stringify(result, null, 2) + '\n');
  save();
  for (const [index, step] of plan.entries()) {
    const record = result.steps[index], clock = performance.now();
    record.status = 'RUNNING'; record.startedAt = new Date().toISOString(); save();
    let log = '', exitCode = 0;
    try {
      if (step.command) {
        record.command = step.command;
        const run = execute(step.command[0], step.command.slice(1), {
          cwd, env, encoding: 'utf8', timeout: step.timeout || 30 * 60 * 1000,
          maxBuffer: 128 * 1024 * 1024,
        });
        log = (run.stdout || '') + (run.stderr || '');
        exitCode = run.status;
        if (run.error || run.signal || run.status !== 0) {
          throw new Error(`Command failed: status=${run.status} signal=${run.signal || ''} ${run.error?.message || ''}`);
        }
        if (step.validate) step.validate(log);
      } else {
        step.action(); log = `PASS ${step.id}\n`;
      }
      record.status = 'PASS';
    } catch (error) {
      record.status = 'FAIL'; record.error = error.message;
      if (exitCode === 0) exitCode = 1;
      log += '\n' + error.message + '\n';
    }
    record.exitCode = exitCode;
    record.completedAt = new Date().toISOString();
    record.durationMs = Math.round(performance.now() - clock);
    record.log = `${String(index + 1).padStart(2, '0')}-${step.id}.log`;
    record.logSha256 = digest(log);
    fs.writeFileSync(path.join(out, record.log), log);
    console.log(`${record.status} ${step.id} (${record.durationMs} ms)`);
    save();
    if (record.status !== 'PASS') break;
  }
  result.completedAt = new Date().toISOString();
  result.sourceAfter = snapshot();
  result.sourceUnchanged = sourceBefore.sha256 === result.sourceAfter.sha256;
  result.status = result.steps.every(x => x.status === 'PASS') && result.sourceUnchanged ? 'PASS' : 'BLOCKED';
  save();
  return result;
}

export function buildPlan({ root, out, env }) {
  const venv = path.join(out, 'audit-venv');
  const python = path.join(venv, 'bin', 'python');
  const command = (id, args, options = {}) => ({ id, command: args, ...options });
  function archive(files, name) {
    const directory = path.join(out, name); fs.mkdirSync(directory, { recursive: true });
    const hashes = [];
    for (const file of files) {
      const from = path.join(root, file), stat = fs.lstatSync(from);
      assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Missing/linked evidence: ${file}`);
      const bytes = fs.readFileSync(from);
      fs.writeFileSync(path.join(directory, path.basename(file)), bytes);
      hashes.push({ path: file, sha256: digest(bytes), size: bytes.length });
    }
    fs.writeFileSync(path.join(directory, 'files.json'), JSON.stringify(hashes, null, 2) + '\n');
  }
  return [
    command('ci-orchestration-tests', [process.execPath, '--test', 'scripts/ci/orchestration.test.mjs', 'scripts/ci/preflight.test.mjs', 'scripts/ci/p1.test.mjs', 'scripts/ci/p2.test.mjs', 'scripts/ci/p3.test.mjs']),
    command('whitespace-before', ['git', 'diff', '--check']),
    { id: 'node-major', action: () => assert.equal(process.versions.node.split('.')[0], '22', 'Workflow uses Node 22') },
    command('ci-setup-definition', [process.execPath, 'scripts/ci/p2-workflow-contract.mjs']),
    command('ci-recursive-action-pins', [process.execPath, 'scripts/check-action-pins.mjs']),
    command('ci-standard-contract', [process.execPath, 'tools/ci-standard/check.mjs']),
    command('npm-registry-connectivity', ['npm', 'ping', '--registry=https://registry.npmjs.org', '--fetch-retries=0', '--fetch-timeout=5000'], { timeout: 15000 }),
    command('locked-install', ['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'], { timeout: 300000 }),
    { id: 'locked-tool-versions', action: () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        const actual = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'))).version;
        assert.equal(actual, version, `${name}: installed version differs from the pinned version`);
      }
    } },
    command('actionlint-version', ['actionlint', '-version'], {
      validate: log => assert.equal(log.split(/\r?\n/)[0].trim(), ACTIONLINT_VERSION, 'Pinned actionlint version required'),
    }),
    command('actions-validation', ['actionlint']),
    command('pinned-chromium', [process.execPath, 'node_modules/playwright/cli.js', 'install', '--with-deps', 'chromium']),
    { id: 'browser-environment', action: () => {
      const run = spawnSync(process.execPath, ['-e', "console.log(require('playwright').chromium.executablePath())"], { cwd: root, encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
      const browser = run.stdout.trim(); assert.ok(fs.existsSync(browser), 'Pinned browser binary missing');
      env.CHROMIUM_PATH = browser; env.CHROMIUM_EXECUTABLE = browser;
    } },
    command('python-audit-venv', ['python3', '-m', 'venv', venv]),
    command('locked-python-tools', [python, '-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'audit/requirements-audit.txt']),
    command('npm-test', ['npm', 'test']),
    command('headless', ['npm', 'run', 'test:headless']),
    // CONTRIBUTING requires the full advisory audit, not only production dependencies.
    command('npm-audit-full', ['npm', 'audit', '--audit-level=high']),
    command('reporter', ['npm', 'run', 'test:reporter']),
    command('qa-release', ['npm', 'run', 'qa:release']),
    { id: 'preserve-qa-release', action: () => {
      const report = JSON.parse(fs.readFileSync(path.join(root, 'qa-results/qa-report.json')));
      assert.notEqual(report.verdict, 'NOT_READY');
      assert.equal((report.skipped || []).length, 0, 'Complete preflight cannot accept skipped QA checks');
      archive(REPORT_FILES.map(x => 'qa-results/' + x), 'structured-qa');
    } },
    command('platform', ['npm', 'run', 'qa:platform']),
    command('redteam-foundation-p5-complete', ['npm', 'run', 'qa:redteam:ci']),
    { id: 'preserve-redteam-evidence', action: () => archive([
      'qa-results/redteam-e10-ci-run.json', 'qa-results/redteam-e10-evidence.json',
      'qa-results/redteam-e9-evidence.json', 'qa-results/redteam-e10-release.json',
    ], 'redteam') },
    // Match journey-e2e.yml: fresh evidence and a fresh build before all seven suites.
    { id: 'fresh-journey-evidence', action: () => {
      fs.rmSync(path.join(root, 'audit/evidence'), { recursive: true, force: true });
      fs.mkdirSync(path.join(root, 'audit/evidence'));
    } },
    command('journey-build', ['npm', 'run', 'build']),
    command('journey-seven-suites', [python, 'audit/run_audit.py',
      '--suite', 'journey_suite', '--suite', 'state_transition_suite', '--suite', 'config_extra_suite',
      '--suite', 'feature_suite', '--suite', 'integration_suite', '--suite', 'identity_suite', '--suite', 'wizard_suite']),
    { id: 'preserve-journey-evidence', action: () => archive(['audit/evidence/runner-result.json'], 'journey') },
    command('release-readiness', [process.execPath, 'scripts/check-redteam-release-e10.mjs', '--require-ready']),
    command('whitespace-after', ['git', 'diff', '--check']),
    command('p1-live-main-protection', [process.execPath, 'scripts/ci/main-protection.mjs', '--live']),
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(ROOT);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'git-ci-preflight-'));
  const env = { ...process.env, GARP27_EXTERNAL_TRUST_SHA256: TRUST_PIN,
    NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org', NPM_CONFIG_FETCH_RETRIES: '0', NPM_CONFIG_FETCH_TIMEOUT: '30000' };
  // This is a dirty working-tree preflight, never evidence for an already committed SHA.
  for (const name of Object.keys(env)) if (name.startsWith('GITHUB_')) delete env[name];
  console.log('Preflight evidence: ' + out);
  const result = executePlan(buildPlan({ root: ROOT, out, env }), { out, cwd: ROOT, env });
  console.log(`PREFLIGHT ${result.status}: ${path.join(out, 'preflight.json')}`);
  if (result.status !== 'PASS') process.exitCode = 1;
}
