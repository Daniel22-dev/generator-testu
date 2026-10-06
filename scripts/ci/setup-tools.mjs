// P2 setup is diagnostic provenance, not a certificate and never a reuse token.
// Every invocation performs npm ci on this runner. No shell, npx download fallback,
// node_modules cache, build import, workflow dispatch, or promotion is performed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { sourceSnapshot } from '../redteam-source-snapshot-e9.mjs';

export const INSTALL_COMMAND = Object.freeze(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org']);
export const BROWSER_ARGUMENTS = Object.freeze(['install', '--with-deps', 'chromium']);
export const SOURCE_PATHS = Object.freeze(['.github/workflows', '.github/actions', 'src', 'public', 'scripts', 'tools', 'security', 'vendor',
  'package.json', 'package-lock.json', 'ghrab-platform.consumer.json', 'reporter-test.config.json', 'eslint.config.mjs',
  'eslint-globals.generated.mjs', 'qa/qa-manifest.json', '.npmrc']);
const SHA = /^[a-f0-9]{40}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const hash = data => createHash('sha256').update(data).digest('hex');
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function regular(file) {
  const st = fs.lstatSync(file);
  assert.ok(st.isFile() && !st.isSymbolicLink(), 'Expected an unlinked regular file');
  return st;
}
function scalar(value, pattern, field) {
  assert.equal(typeof value, 'string', `${field} missing`);
  assert.ok(pattern.test(value), `${field} malformed`);
  return value;
}
export function setupContext(root, env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Hosted setup requires the GitHub Actions context');
  const sha = scalar(env.CI_TOOL_EXPECTED_SHA, SHA, 'expected SHA');
  assert.equal(env.GITHUB_SHA, sha, 'Event SHA differs from expected checkout SHA');
  const repository = scalar(env.GITHUB_REPOSITORY, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'repository');
  const runId = scalar(env.GITHUB_RUN_ID, /^[1-9][0-9]*$/, 'run ID');
  const attempt = scalar(env.GITHUB_RUN_ATTEMPT, /^[1-9][0-9]*$/, 'run attempt');
  const job = scalar(env.GITHUB_JOB, /^[A-Za-z_][A-Za-z0-9_-]*$/, 'job');
  const browserEnv = env.CI_TOOL_BROWSER_ENV;
  assert.ok(['CHROMIUM_PATH', 'CHROMIUM_EXECUTABLE'].includes(browserEnv), 'Unsupported browser environment variable');
  assert.equal(fs.realpathSync(env.GITHUB_WORKSPACE), fs.realpathSync(root), 'Wrong checkout workspace');
  assert.ok(typeof env.RUNNER_TEMP === 'string' && path.isAbsolute(env.RUNNER_TEMP) && !/[\r\n\0]/.test(env.RUNNER_TEMP), 'Invalid runner temp');
  const temp = fs.realpathSync(env.RUNNER_TEMP);
  assert.ok(!inside(fs.realpathSync(root), temp), 'Evidence must be outside the checkout and destructive QA cleanup');
  const environmentFile = env.GITHUB_ENV;
  assert.ok(typeof environmentFile === 'string' && path.isAbsolute(environmentFile) && !/[\r\n\0]/.test(environmentFile), 'Invalid GitHub environment file');
  regular(environmentFile);
  assert.ok(inside(temp, fs.realpathSync(environmentFile)), 'Environment file outside runner temp');
  const parent = path.join(temp, 'generator-ci-tools');
  fs.mkdirSync(parent, { recursive: true });
  assert.equal(fs.realpathSync(parent), parent, 'Linked evidence directory');
  const directory = path.join(parent, `${runId}-${attempt}-${job}`);
  // Refuse a second invocation in this same job/attempt instead of using stale PASS.
  fs.mkdirSync(directory, { mode: 0o700 });
  return { sha, repository, runId, attempt, job, browserEnv, environmentFile, directory };
}

export function verifyInstalledTools(root) {
  regular(path.join(root, 'package.json')); regular(path.join(root, 'package-lock.json'));
  const pkg = readJson(path.join(root, 'package.json')), lock = readJson(path.join(root, 'package-lock.json'));
  assert.equal(lock.lockfileVersion, 3, 'Expected locked npm v3 dependency tree');
  assert.equal(lock.version, pkg.version, 'Lockfile version differs');
  assert.equal(lock.packages?.['']?.version, pkg.version, 'Lockfile root version differs');
  assert.deepEqual(lock.packages?.['']?.devDependencies, pkg.devDependencies, 'Lockfile direct dependency pins differ');
  assert.ok(pkg.devDependencies?.playwright && pkg.devDependencies?.['axe-core'], 'Pinned browser and accessibility tooling required');
  const modules = path.join(root, 'node_modules');
  assert.equal(fs.realpathSync(modules), modules, 'Linked dependency tree');
  const versions = {};
  for (const [name, expected] of Object.entries(pkg.devDependencies)) {
    assert.match(name, /^(?:@[A-Za-z0-9_.-]+\/)?[A-Za-z0-9_.-]+$/, 'Invalid dependency name');
    assert.ok(!name.split('/').some(p => p === '.' || p === '..'), 'Invalid dependency path');
    assert.match(expected, VERSION, 'Exact dependency version required');
    const packageRoot = path.join(modules, name), file = path.join(packageRoot, 'package.json');
    assert.equal(fs.realpathSync(packageRoot), packageRoot, 'Linked direct dependency');
    regular(file);
    const entry = lock.packages?.[`node_modules/${name}`];
    assert.equal(entry?.version, expected, 'Lockfile package version differs');
    assert.ok(typeof entry.integrity === 'string' && /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity), 'Package integrity missing');
    assert.equal(readJson(file).version, expected, 'Installed direct dependency differs from pin');
    versions[name] = expected;
  }
  const core = path.join(modules, 'playwright-core');
  assert.equal(fs.realpathSync(core), core, 'Linked Playwright core');
  regular(path.join(core, 'package.json'));
  assert.equal(readJson(path.join(core, 'package.json')).version, versions.playwright, 'Playwright core version differs');
  assert.equal(lock.packages?.['node_modules/playwright-core']?.version, versions.playwright, 'Locked Playwright core differs');
  const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
  regular(cli);
  assert.equal(readJson(path.join(modules, 'playwright/package.json')).bin?.playwright, 'cli.js', 'Unexpected Playwright CLI');
  return { versions, cli, packageSha256: hash(fs.readFileSync(path.join(root, 'package.json'))),
    lockSha256: hash(fs.readFileSync(path.join(root, 'package-lock.json'))) };
}

function resolveBrowser(root) {
  const require = createRequire(path.join(root, 'package.json'));
  return require(path.join(root, 'node_modules', 'playwright')).chromium.executablePath();
}
export function runSetup({ root, env, execute = spawnSync, snapshot = sourceSnapshot, browserPath = resolveBrowser, log = console.log }) {
  root = fs.realpathSync(root);
  const context = setupContext(root, env);
  const reportFile = path.join(context.directory, 'toolchain.json');
  const report = {
    schema: 'git-ci-tools-v1', status: 'RUNNING', purpose: 'SETUP_PROVENANCE_ONLY_NOT_RELEASE_ADMISSION',
    repository: context.repository, sourceCommit: context.sha, runId: context.runId, runAttempt: context.attempt, job: context.job,
    node: process.version, platform: process.platform, arch: process.arch,
    startedAt: new Date().toISOString(), steps: [],
    reuse: { build: false, certificate: false, nodeModules: false, browserCache: false, npmDownloadCacheOnly: true },
    limits: ['Reports describe setup only; all mandatory certification gates must still execute.',
      'GitHub-hosted execution and independent release certification are separate acceptance requirements.'],
  };
  const save = () => {
    const tmp = reportFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 }); fs.renameSync(tmp, reportFile);
  };
  const run = (command, { capture = false, timeout = 300000 } = {}) => {
    const result = execute(command[0], command.slice(1), { cwd: root, env: { ...env, NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org' },
      encoding: 'utf8', timeout, maxBuffer: 4 * 1024 * 1024, stdio: capture ? 'pipe' : 'inherit' });
    assert.ok(!result.error && !result.signal && result.status === 0, 'Required setup process did not complete successfully');
    return capture ? (result.stdout || '').trim() : '';
  };
  const step = (id, action) => {
    const clock = performance.now(), record = { id, status: 'RUNNING', startedAt: new Date().toISOString() };
    report.steps.push(record); save();
    try { action(); record.status = 'PASS'; }
    catch (error) { record.status = 'BLOCKED'; throw error; }
    finally { record.durationMs = Math.round(performance.now() - clock); record.completedAt = new Date().toISOString(); save(); log(`${record.status} ${id}`); }
  };
  let failure;
  save();
  try {
    step('exact-clean-source', () => {
      assert.equal(process.versions.node.split('.')[0], '22', 'Expected Node 22');
      assert.equal(run(['git', 'rev-parse', '--verify', 'HEAD'], { capture: true }), context.sha, 'Wrong checkout HEAD');
      assert.equal(run(['git', 'status', '--porcelain=v1', '--untracked-files=all', '--', ...SOURCE_PATHS], { capture: true }), '', 'Dirty or untracked certification input');
      report.sourceBefore = snapshot({ root });
      report.npm = run(['npm', '--version'], { capture: true });
      assert.match(report.npm, VERSION, 'Invalid npm version');
    });
    step('locked-npm-ci', () => run(INSTALL_COMMAND));
    step('locked-tool-versions', () => { report.tools = verifyInstalledTools(root); });
    step('pinned-browser-install', () => run([process.execPath, report.tools.cli, ...BROWSER_ARGUMENTS], { timeout: 600000 }));
    let browser;
    step('installed-browser-path', () => {
      browser = browserPath(root);
      assert.ok(typeof browser === 'string' && path.isAbsolute(browser) && !/[\r\n\0]/.test(browser), 'Invalid browser executable path');
      regular(browser); fs.accessSync(browser, fs.constants.X_OK);
      report.browser = { variable: context.browserEnv, executable: browser, playwrightVersion: report.tools.versions.playwright };
    });
    step('unchanged-setup-inputs', () => {
      report.sourceAfter = snapshot({ root });
      report.sourceUnchanged = report.sourceBefore.sha256 === report.sourceAfter.sha256;
      assert.equal(report.sourceUnchanged, true, 'Source changed while installing tools');
      assert.equal(run(['git', 'status', '--porcelain=v1', '--untracked-files=all', '--', ...SOURCE_PATHS], { capture: true }), '', 'Setup modified certification input');
    });
    step('export-browser-environment', () => fs.appendFileSync(context.environmentFile, `${context.browserEnv}=${browser}\n`));
    report.status = 'PASS';
  } catch (error) {
    failure = error;
    report.status = 'BLOCKED';
    // Do not write raw errors/stdout/env: they can contain credentials or personal paths.
    report.failureStage = report.steps.find(s => s.status === 'BLOCKED')?.id || 'setup';
  } finally {
    report.completedAt = new Date().toISOString(); save();
  }
  log(`SETUP ${report.status}: ${reportFile}`);
  return { pass: !failure, report, reportFile };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 2, 'Unexpected setup arguments');
    const result = runSetup({ root: process.cwd(), env: process.env });
    if (!result.pass) process.exitCode = 1;
  } catch {
    console.error('BLOCKED CI setup context/evidence initialization; no certificate was produced'); process.exitCode = 1;
  }
}
