// These tests use synthetic package/CLI fixtures, never a fake release PASS.
// Real installed dependencies, browsers and GitHub execution stay in preflight.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runSetup, setupContext, verifyInstalledTools, INSTALL_COMMAND, BROWSER_ARGUMENTS, SOURCE_PATHS } from './setup-tools.mjs';
import { validateP2Workflows, readSetupSources, validateSetupSources, SETUP_JOBS } from './p2-workflow-contract.mjs';
import { sourceSnapshot } from '../redteam-source-snapshot-e9.mjs';
import { inspectActionPins, validateActionReference } from '../check-action-pins.mjs';
import { buildPlan } from './preflight.mjs';
import { jobBlock } from './p1-workflow-contract.mjs';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pinned = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const json = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const load = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'p2-synthetic-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'source'), temp = path.join(temporary, 'runner');
  fs.mkdirSync(root); fs.mkdirSync(temp);
  const write = (rel, data) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); };
  for (const d of ['.github/workflows', 'src', 'public', 'scripts', 'tools', 'security', 'vendor']) write(d + '/fixture', 'synthetic-only');
  for (const f of ['ghrab-platform.consumer.json', 'reporter-test.config.json', 'eslint.config.mjs', 'eslint-globals.generated.mjs', 'qa/qa-manifest.json']) write(f, '{}');
  write('.gitignore', 'node_modules/\n');
  write('.github/workflows/test.yml', `name: synthetic\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ./.github/actions/local\n`);
  write('.github/actions/local/action.yml', `name: synthetic\ndescription: synthetic fixture\nruns:\n  using: composite\n  steps:\n    - uses: actions/setup-node@${pinned}\n`);
  for (const f of ['scripts/ci/setup-tools.mjs', 'scripts/redteam-source-snapshot-e9.mjs']) write(f, fs.readFileSync(path.join(project, f)));
  const pkg = { name: 'synthetic-ci-test', version: '7.1.96', type: 'module', devDependencies: { playwright: '1.61.1', 'axe-core': '4.12.1' } };
  const lock = { lockfileVersion: 3, version: pkg.version, packages: { '': { version: pkg.version, devDependencies: pkg.devDependencies } } };
  for (const [name, version] of Object.entries({ ...pkg.devDependencies, 'playwright-core': '1.61.1' })) {
    lock.packages['node_modules/' + name] = { version, integrity: 'sha512-' + Buffer.alloc(64).toString('base64') };
    write(`node_modules/${name}/package.json`, JSON.stringify({ name, version, main: 'index.cjs', ...(name === 'playwright' ? { bin: { playwright: 'cli.js' } } : {}) }));
  }
  const browser = path.join(temp, 'synthetic-chromium'); fs.writeFileSync(browser, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  write('node_modules/playwright/index.cjs', `module.exports={chromium:{executablePath:()=>${JSON.stringify(browser)}}};\n`);
  write('node_modules/playwright/cli.js', 'if (process.argv.slice(2).join(" ") !== "install --with-deps chromium") process.exit(9);\n');
  write('package.json', JSON.stringify(pkg)); write('package-lock.json', JSON.stringify(lock));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_AUTHOR_NAME: 'Synthetic CI', GIT_COMMITTER_NAME: 'Synthetic CI',
    GIT_AUTHOR_EMAIL: 'ci@example.invalid', GIT_COMMITTER_EMAIL: 'ci@example.invalid' };
  const git = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q'); git('add', '.'); git('commit', '-qm', 'Synthetic test fixture, not a project change');
  const sha = git('rev-parse', 'HEAD');
  const environmentFile = path.join(temp, 'github-env'); fs.writeFileSync(environmentFile, '');
  Object.assign(env, { GITHUB_ACTIONS: 'true', GITHUB_SHA: sha, CI_TOOL_EXPECTED_SHA: sha, GITHUB_REPOSITORY: 'fixture/example',
    GITHUB_RUN_ID: '101', GITHUB_RUN_ATTEMPT: '1', GITHUB_JOB: 'candidate-gate', GITHUB_WORKSPACE: root, RUNNER_TEMP: temp,
    GITHUB_ENV: environmentFile, CI_TOOL_BROWSER_ENV: 'CHROMIUM_PATH', GH_TOKEN: 'SYNTHETIC_TOKEN_MUST_NOT_APPEAR' });
  const calls = [];
  const execute = (program, args, options) => {
    calls.push([program, ...args]);
    if (program === 'npm') return { status: 0, stdout: args[0] === '--version' ? '10.9.2\n' : '', stderr: '' };
    return spawnSync(program, args, { ...options, stdio: 'pipe' });
  };
  return { root, temp, env, sha, git, write, browser, calls, execute, environmentFile,
    options: { root, env, execute, log: () => {} }, reportFile: path.join(temp, 'generator-ci-tools/101-1-candidate-gate/toolchain.json') };
}

test('P2 successful setup is independently executed and emits only diagnostic provenance', t => {
  const f = fixture(t), result = runSetup(f.options);
  assert.equal(result.pass, true); assert.equal(result.report.status, 'PASS');
  assert.equal(result.report.purpose, 'SETUP_PROVENANCE_ONLY_NOT_RELEASE_ADMISSION');
  assert.equal(result.report.sourceCommit, f.sha); assert.equal(result.report.sourceUnchanged, true);
  assert.equal(result.report.steps.length, 7); assert.ok(result.report.steps.every(s => s.status === 'PASS' && s.durationMs >= 0));
  assert.deepEqual(f.calls.filter(c => c[0] === 'npm' && c[1] !== '--version'), [INSTALL_COMMAND]);
  assert.deepEqual(f.calls.find(c => c[1]?.endsWith('/playwright/cli.js')).slice(2), BROWSER_ARGUMENTS);
  assert.equal(fs.readFileSync(f.environmentFile, 'utf8'), `CHROMIUM_PATH=${f.browser}\n`);
  assert.doesNotMatch(fs.readFileSync(result.reportFile, 'utf8'), /SYNTHETIC_TOKEN_MUST_NOT_APPEAR/);
  assert.ok(!result.report.reuse.build && !result.report.reuse.certificate && !result.report.reuse.nodeModules);
});
test('P2 Journey preserves CHROMIUM_EXECUTABLE without adding another browser override', t => {
  const f = fixture(t); f.env.CI_TOOL_BROWSER_ENV = 'CHROMIUM_EXECUTABLE';
  assert.equal(runSetup(f.options).pass, true);
  assert.equal(fs.readFileSync(f.environmentFile, 'utf8'), `CHROMIUM_EXECUTABLE=${f.browser}\n`);
});
test('P2 second invocation in one job cannot consume or overwrite previous PASS', t => {
  const f = fixture(t), first = runSetup(f.options), bytes = fs.readFileSync(first.reportFile);
  assert.throws(() => runSetup(f.options)); assert.deepEqual(fs.readFileSync(first.reportFile), bytes);
  assert.equal(f.calls.filter(c => c[0] === 'npm' && c[1] === 'ci').length, 1);
});
test('P2 different attempt and job each performs its own install with separate evidence', t => {
  const f = fixture(t), files = [];
  for (const [job, attempt] of [['candidate-gate', '1'], ['pr-certification', '1'], ['candidate-gate', '2']]) {
    Object.assign(f.env, { GITHUB_JOB: job, GITHUB_RUN_ATTEMPT: attempt }); const r = runSetup(f.options);
    assert.equal(r.pass, true); files.push(r.reportFile);
  }
  assert.equal(new Set(files).size, 3); assert.equal(f.calls.filter(c => c[0] === 'npm' && c[1] === 'ci').length, 3);
});

for (const [name, mutate] of [
  ['missing Actions context', f => delete f.env.GITHUB_ACTIONS],
  ['foreign SHA', f => f.env.GITHUB_SHA = '1'.repeat(40)],
  ['malformed SHA', f => f.env.CI_TOOL_EXPECTED_SHA = 'main'],
  ['missing expected SHA', f => delete f.env.CI_TOOL_EXPECTED_SHA],
  ['repository injection', f => f.env.GITHUB_REPOSITORY = 'a/b\nINJECTED=yes'],
  ['attempt missing', f => delete f.env.GITHUB_RUN_ATTEMPT],
  ['run ID traversal', f => f.env.GITHUB_RUN_ID = '../a'],
  ['job traversal', f => f.env.GITHUB_JOB = '../../a'],
  ['unsupported browser variable', f => f.env.CI_TOOL_BROWSER_ENV = 'PATH'],
  ['wrong workspace', f => f.env.GITHUB_WORKSPACE = f.temp],
  ['temp inside checkout', f => f.env.RUNNER_TEMP = f.root],
  ['relative temp', f => f.env.RUNNER_TEMP = '.'],
  ['environment injection', f => f.env.GITHUB_ENV += '\nINJECTED'],
  ['linked environment file', f => { const dest = f.environmentFile + '.real'; fs.renameSync(f.environmentFile, dest); fs.symlinkSync(dest, f.environmentFile); }],
  ['environment outside temp', f => { f.env.GITHUB_ENV = path.join(f.root, 'outside-env'); fs.writeFileSync(f.env.GITHUB_ENV, ''); }],
  ['linked evidence directory', f => fs.symlinkSync(f.root, path.join(f.temp, 'generator-ci-tools'))],
]) test('P2 rejects context: ' + name, t => {
  const f = fixture(t); mutate(f); assert.throws(() => setupContext(f.root, f.env)); assert.equal(f.calls.length, 0);
});

for (const [name, change] of [
  ['installed version', f => { const p = path.join(f.root, 'node_modules/playwright/package.json'), x = load(p); x.version = '0.0.1'; json(p, x); }],
  ['missing dependency', f => fs.rmSync(path.join(f.root, 'node_modules/axe-core'), { recursive: true })],
  ['wrong lockfile version', f => { const p = path.join(f.root, 'package-lock.json'), x = load(p); x.lockfileVersion = 2; json(p, x); }],
  ['floating direct pin', f => { const p = path.join(f.root, 'package.json'), x = load(p); x.devDependencies.playwright = '^1.61.1'; json(p, x); }],
  ['lock root mismatch', f => { const p = path.join(f.root, 'package-lock.json'), x = load(p); x.packages[''].version = '0.0.1'; json(p, x); }],
  ['missing integrity', f => { const p = path.join(f.root, 'package-lock.json'), x = load(p); delete x.packages['node_modules/playwright'].integrity; json(p, x); }],
  ['core mismatch', f => { const p = path.join(f.root, 'node_modules/playwright-core/package.json'), x = load(p); x.version = '0.0.1'; json(p, x); }],
  ['missing local CLI', f => fs.unlinkSync(path.join(f.root, 'node_modules/playwright/cli.js'))],
  ['linked local CLI', f => { const p = path.join(f.root, 'node_modules/playwright/cli.js'); fs.unlinkSync(p); fs.symlinkSync(f.browser, p); }],
  ['unexpected CLI mapping', f => { const p = path.join(f.root, 'node_modules/playwright/package.json'), x = load(p); x.bin.playwright = 'elsewhere.js'; json(p, x); }],
  ['linked dependency', f => { const p = path.join(f.root, 'node_modules/axe-core'); fs.renameSync(p, p + '-real'); fs.symlinkSync(p + '-real', p); }],
]) test('P2 rejects installed tool drift: ' + name, t => { const f = fixture(t); change(f); assert.throws(() => verifyInstalledTools(f.root)); });

test('P2 rejects an actual dirty checkout before invoking npm', t => {
  const f = fixture(t); f.write('.github/actions/local/action.yml', 'changed'); const r = runSetup(f.options);
  assert.equal(r.pass, false); assert.equal(r.report.failureStage, 'exact-clean-source'); assert.equal(f.calls.some(c => c[0] === 'npm'), false);
});
test('P2 rejects a different actual Git HEAD even if env SHA matches itself', t => {
  const f = fixture(t); f.env.GITHUB_SHA = f.env.CI_TOOL_EXPECTED_SHA = 'a'.repeat(40);
  assert.equal(runSetup(f.options).report.failureStage, 'exact-clean-source');
});
for (const [name, failedCommand, failure] of [
  ['npm failure', 'npm', { status: 1 }], ['npm missing', 'npm', { status: null, error: new Error('ENOENT') }],
  ['npm timeout', 'npm', { status: null, signal: 'SIGTERM' }], ['browser failure', 'browser', { status: 1 }],
  ['browser timeout', 'browser', { status: null, signal: 'SIGTERM' }],
]) test('P2 stops and retains BLOCKED setup: ' + name, t => {
  const f = fixture(t); f.options.execute = (program, args, opts) => {
    if ((failedCommand === 'npm' && program === 'npm' && args[0] === 'ci') || (failedCommand === 'browser' && args[0]?.endsWith('/playwright/cli.js'))) return failure;
    return f.execute(program, args, opts);
  };
  const r = runSetup(f.options); assert.equal(r.pass, false); assert.equal(load(r.reportFile).status, 'BLOCKED');
  assert.equal(r.report.failureStage, failedCommand === 'npm' ? 'locked-npm-ci' : 'pinned-browser-install');
  assert.equal(fs.readFileSync(f.environmentFile, 'utf8'), '');
});
test('P2 installation cannot change source without blocking environment export', t => {
  const f = fixture(t); f.options.execute = (program, args, opts) => {
    const result = f.execute(program, args, opts);
    if (args[0]?.endsWith('/playwright/cli.js')) f.write('.github/actions/local/action.yml', 'changed during setup');
    return result;
  };
  const r = runSetup(f.options); assert.equal(r.pass, false); assert.equal(r.report.sourceUnchanged, false);
  assert.equal(r.report.failureStage, 'unchanged-setup-inputs'); assert.equal(fs.readFileSync(f.environmentFile, 'utf8'), '');
});
for (const [name, browser] of [
  ['relative', () => 'chrome'], ['newline', () => '/tmp/chrome\nPATH=bad'], ['missing', f => f.browser + '-missing'],
  ['directory', f => f.temp], ['not executable', f => { fs.chmodSync(f.browser, 0o600); return f.browser; }],
  ['linked', f => { const p = f.browser + '-link'; fs.symlinkSync(f.browser, p); return p; }],
]) test('P2 refuses unsafe browser export: ' + name, t => {
  const f = fixture(t); f.options.browserPath = () => browser(f); const r = runSetup(f.options);
  assert.equal(r.pass, false); assert.equal(r.report.failureStage, 'installed-browser-path');
  assert.equal(fs.readFileSync(f.environmentFile, 'utf8'), '');
});
test('P2 source fingerprint includes local action metadata and npm config', t => {
  const f = fixture(t), before = sourceSnapshot({ root: f.root });
  f.write('.github/actions/local/action.yml', 'changed'); const middle = sourceSnapshot({ root: f.root }); assert.notEqual(middle.sha256, before.sha256);
  f.write('.npmrc', 'registry=https://registry.npmjs.org\n'); const after = sourceSnapshot({ root: f.root }); assert.notEqual(after.sha256, middle.sha256);
});
for (const rel of ['.github/actions/local/action.yml', '.github/actions', '.npmrc', 'package-lock.json']) test('P2 source fingerprint rejects linked input ' + rel, t => {
  const f = fixture(t), target = path.join(f.root, rel); fs.rmSync(target, { recursive: true, force: true }); fs.symlinkSync(f.temp, target);
  assert.throws(() => sourceSnapshot({ root: f.root }));
});

test('P2 recursive pins checks workflow and nested action definitions', t => {
  const f = fixture(t), result = inspectActionPins(f.root); assert.equal(result.external, 1); assert.equal(result.local, 1); assert.equal(result.files.length, 2);
  f.write('.github/actions/local/action.yml', 'runs:\n  using: composite\n  steps:\n    - uses: actions/setup-node@v4\n'); assert.throws(() => inspectActionPins(f.root));
});
for (const reference of ['actions/setup-node@v4', 'actions/setup-node', 'actions/setup-node@' + 'a'.repeat(39), 'docker://node:latest', './.github/actions/../workflows', './missing', './.github/actions/missing']) test('P2 rejects action reference ' + reference, t => { const f = fixture(t); assert.throws(() => validateActionReference(reference, f.root)); });
test('P2 quoted pinned metadata works, flow uses must not silently escape the scanner', t => {
  const f = fixture(t); f.write('.github/actions/local/action.yml', `runs:\n  using: composite\n  steps:\n    - uses: 'actions/setup-node@${pinned}' # approved\n`); inspectActionPins(f.root);
  f.write('.github/actions/local/action.yml', 'runs:\n  steps: [{uses: actions/setup-node@v4}]\n'); assert.throws(() => inspectActionPins(f.root));
});
test('P2 missing or ambiguous local metadata is blocking', t => {
  const f = fixture(t); f.write('.github/actions/local/action.yaml', 'duplicate'); assert.throws(() => inspectActionPins(f.root));
});
const sources = readSetupSources(project);
const workflows = Object.fromEntries([...new Set(SETUP_JOBS.map(x => x[0]))].map(f => [f, fs.readFileSync(path.join(project, '.github/workflows', f), 'utf8')]));
test('P2 shipping shared setup and all consumers satisfy the contract', () => validateP2Workflows(workflows, sources));
for (const [name, field, before, after] of [
  ['unpinned Node', 'nodeAction', 'actions/setup-node@' + pinned, 'actions/setup-node@v4'],
  ['floating Node major', 'nodeAction', "node-version: '22'", 'node-version: latest'],
  ['unbound npm cache', 'nodeAction', 'cache-dependency-path: package-lock.json', 'cache-dependency-path: README.md'],
  ['setup-node optional', 'nodeAction', 'steps:', 'steps:\n    - if: false'],
  ['wrong runner', 'toolsAction', 'run: node scripts/ci/setup-tools.mjs', 'run: true'],
  ['shell injection', 'toolsAction', 'run: node scripts/ci/setup-tools.mjs', 'run: node scripts/ci/setup-tools.mjs ${{ inputs.expected-sha }}'],
  ['ignore setup failure', 'toolsAction', 'shell: bash', 'continue-on-error: true\n      shell: bash'],
  ['install instead of ci', 'toolsRunner', "['npm', 'ci'", "['npm', 'install'"],
  ['enable lifecycle', 'toolsRunner', "'--ignore-scripts', ", ''],
  ['skip install', 'toolsRunner', "step('locked-npm-ci', () => run(INSTALL_COMMAND))", "step('locked-npm-ci', () => true)"],
  ['skip OS dependencies', 'toolsRunner', "['install', '--with-deps', 'chromium']", "['install', 'chromium']"],
  ['unversioned CLI', 'toolsRunner', 'run([process.execPath, report.tools.cli, ...BROWSER_ARGUMENTS]', "run(['npx', 'playwright', ...BROWSER_ARGUMENTS]"],
  ['accept changed source', 'toolsRunner', "assert.equal(report.sourceUnchanged, true, 'Source changed while installing tools')", 'true'],
]) test('P2 setup mutation is blocked: ' + name, () => {
  const copy = structuredClone(sources); assert.ok(copy[field].includes(before)); copy[field] = copy[field].replace(before, after); assert.throws(() => validateSetupSources(copy));
});
for (const [file, id, sha, browser] of SETUP_JOBS) for (const [name, before, after] of [
  ['missing Node', 'uses: ./.github/actions/setup-ci-node', 'run: true'],
  ['missing tools', 'uses: ./.github/actions/install-ci-tools', 'run: true'],
  ['wrong SHA', 'expected-sha: ' + sha, 'expected-sha: main'],
  ['missing checkout ref', '          ref: ' + sha, '          ref: candidate'],
  ['wrong browser variable', 'browser-env: ' + browser, 'browser-env: PATH'],
  ['reused provenance name', 'name: generator-toolchain-${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}', 'name: generator-toolchain-latest'],
  ['missing attempt binding', 'path: ${{ runner.temp }}/generator-ci-tools/${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}/toolchain.json', 'path: qa-results/toolchain.json'],
]) test(`P2 consumer mutation ${id}: ${name}`, () => {
  const copy = { ...workflows }, block = jobBlock(copy[file], id); assert.ok(block.includes(before));
  copy[file] = copy[file].replace(block, block.replace(before, after)); assert.throws(() => validateP2Workflows(copy, sources));
});
test('P2 preflight retains all P1 phases and runs new setup checks before network', () => {
  const plan = buildPlan({ root: project, out: os.tmpdir(), env: {} });
  const ids = plan.map(s => s.id); assert.equal(ids.length, 31); // P3 adds one structural check; all P2 phases remain.
  assert.ok(ids.indexOf('ci-setup-definition') < ids.indexOf('locked-install'));
  assert.ok(ids.indexOf('ci-recursive-action-pins') < ids.indexOf('locked-install'));
  assert.ok(plan[0].command.includes('scripts/ci/p2.test.mjs'));
  assert.deepEqual(plan.find(s => s.id === 'locked-install').command, INSTALL_COMMAND);
  assert.deepEqual(plan.find(s => s.id === 'pinned-chromium').command.slice(2), BROWSER_ARGUMENTS);
  assert.equal(plan.at(-1).id, 'p1-live-main-protection');
  assert.ok(SOURCE_PATHS.includes('.github/actions'));
});
// Execute the actual production CLI with real Git and a synthetic npm executable.
// The browser CLI is a local dummy fixture; this is NOT a real browser test.
test('P2 production CLI integration: real local Git, no npx fallback, fail-closed process status', t => {
  const f = fixture(t), bin = path.join(f.temp, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'npm'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 10.9.2; exit 0; fi\n[ "$*" = "ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org" ] || exit 9\nexit "${SYNTHETIC_NPM_EXIT:-0}"\n', { mode: 0o700 });
  const env = { ...f.env, PATH: bin + path.delimiter + f.env.PATH };
  const script = path.join(f.root, 'scripts/ci/setup-tools.mjs');
  const invoke = () => spawnSync(process.execPath, [script], { cwd: f.root, env, encoding: 'utf8', timeout: 20000 });
  const success = invoke(); assert.equal(success.status, 0, success.stdout + success.stderr); assert.equal(load(f.reportFile).status, 'PASS');
  env.GITHUB_RUN_ATTEMPT = '2'; env.SYNTHETIC_NPM_EXIT = '42'; const blocked = invoke(); assert.equal(blocked.status, 1);
  assert.equal(load(path.join(f.temp, 'generator-ci-tools/101-2-candidate-gate/toolchain.json')).status, 'BLOCKED');
});
