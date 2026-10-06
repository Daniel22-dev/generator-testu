// Real local file reads + synthetic API responses. No remote writes or release certificates.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { strictJson, regularRead, readJson, sha256, blobSha, relative, repoName } from '../../tools/ci-standard/safe-io.mjs';
import { validateStandard, validateRegistry, validateConsumer, verifyReference, PURPOSE } from '../../tools/ci-standard/contract.mjs';
import { collect, validateInventory, apiRead } from '../../tools/ci-standard/collect.mjs';
import { compare } from '../../tools/ci-standard/compare.mjs';
import { checkLocal } from '../../tools/ci-standard/check.mjs';
import { buildPlan } from './preflight.mjs';
import { sourceSnapshot } from '../redteam-source-snapshot-e9.mjs';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const clone = x => structuredClone(x), read = p => readJson(project, p);
const standard = read('tools/ci-standard/standard.v1.json'), registry = read('tools/ci-standard/registry.v1.json');
const consumer = read('tools/ci-standard/consumers/generator-testu.json'), lock = read('tools/ci-standard/reference.lock.json');
const sha = 'a'.repeat(40), treeSha = 'b'.repeat(40);
function fixture(overrides = {}) {
  const data = {
    'package.json': Buffer.from('{"name":"synthetic","scripts":{"postinstall":"DO_NOT_EXECUTE"}}\n'),
    '.github/workflows/ci.yml': Buffer.from('name: synthetic\non: push\njobs: {}\n'),
    '.github/actions/setup/action.yml': Buffer.from('name: synthetic\nruns:\n  using: composite\n  steps: []\n'),
  };
  const directoryRows = ['.github', '.github/workflows', '.github/actions', '.github/actions/setup'].map(p => ({ path: p, type: 'tree', mode: '040000', sha: treeSha }));
  const blobs = Object.fromEntries(Object.values(data).map(bytes => [blobSha(bytes), { sha: blobSha(bytes), encoding: 'base64', size: bytes.length, content: bytes.toString('base64') }]));
  const tree = { sha: treeSha, truncated: false, tree: [...directoryRows, ...Object.entries(data).map(([p, b]) => ({ path: p, type: 'blob', mode: '100644', sha: blobSha(b), size: b.length }))] };
  const state = { tree, blobs, refs: 0, calls: [], ...overrides };
  const readAPI = endpoint => {
    state.calls.push(endpoint);
    if (endpoint === 'repos/test/app') return { id: 123, full_name: 'test/app' };
    if (endpoint.endsWith('/git/ref/heads/main')) { state.refs++; return { object: { sha: state.race && state.refs > 1 ? 'c'.repeat(40) : sha } }; }
    if (endpoint.endsWith('/git/commits/' + sha)) return { sha, tree: { sha: treeSha } };
    if (endpoint.endsWith('/git/trees/' + treeSha + '?recursive=1')) return state.tree;
    if (endpoint.includes('/git/blobs/')) return state.blobs[endpoint.split('/').at(-1)];
    throw new Error('Unexpected endpoint; mutation or secret access?');
  };
  return { state, options: { repository: 'test/app', repositoryId: '123', sha, branch: 'main', read: readAPI, now: () => '2026-10-06T12:00:00.000Z' } };
}
function temporary(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3-standard-')); t.after(() => fs.rmSync(d, { recursive: true, force: true })); return d;
}
function treeCopy(t) {
  const d = temporary(t);
  fs.cpSync(project, d, { recursive: true, filter: s => !path.relative(project, s).split(path.sep).some(x => ['.git', 'node_modules', 'dist', 'qa-results'].includes(x)) });
  assert.doesNotThrow(() => checkLocal(d), 'Unmodified copy must satisfy the real profile before mutation');
  return d;
}
test('reference bundle + real GIT consumer are structural only and never release authority', () => {
  const x = checkLocal(project); assert.equal(x.status, 'STRUCTURAL_MATCH_NOT_CERTIFIED');
  assert.equal(x.releaseEligible, false); assert.equal(x.runtimeVerified, false); assert.equal(x.policyVerified, false);
  assert.equal(x.stagedConsumers, 1); assert.equal(x.unprofiledConsumers, 7); assert.equal(x.purpose, PURPOSE);
});
for (const [label, change] of [
  ['unknown standard version', x => x.version = '2.0.0'], ['unknown schema', x => x.schema = 'other'],
  ['active declaration', x => x.status = 'ACTIVE'], ['release purpose', x => x.purpose = 'RELEASE'],
  ['removed invariant', x => x.invariants.pop()], ['build reuse', x => x.sharing.buildArtifact = true],
  ['certification reuse', x => x.sharing.certificationResult = true], ['global trust pin', x => x.sharing.globalTrustPin = true],
  ['missing activation gate', x => x.activation.pop()], ['extra field', x => x.allowBypass = true],
]) test('standard rejects ' + label, () => { const x = clone(standard); change(x); assert.throws(() => validateStandard(x)); });
for (const [label, change] of [
  ['duplicate repository', x => x.repositories.push(clone(x.repositories[0]))],
  ['case collision', x => { const a = clone(x.repositories[0]); a.repository = a.repository.toUpperCase(); a.repositoryId = '999'; x.repositories.push(a); }],
  ['ID collision', x => x.repositories[1].repositoryId = x.repositories[0].repositoryId],
  ['active state', x => x.repositories[0].state = 'ACTIVE'],
  ['unknown row', x => x.repositories[0].autoUpdate = true],
  ['path traversal', x => x.repositories[0].consumer = '../outside.json'],
  ['unprofiled adapter', x => x.repositories[1].consumer = 'some.json'],
  ['empty registry', x => x.repositories = []],
]) test('registry rejects ' + label, () => { const x = clone(registry); change(x); assert.throws(() => validateRegistry(x)); });
for (const [label, change] of [
  ['wrong repository', x => x.repository = 'test/other'], ['wrong ID', x => x.repositoryId = '2'],
  ['unprofiled consumer', x => { x.repository = 'Daniel22-dev/Ludus'; x.repositoryId = '1274991736'; }],
  ['false active state', x => x.state = 'ACTIVE'], ['missing invariant', x => x.invariants.pop()],
  ['unknown reuse', x => x.sharing.certificationResult = true], ['missing gate', x => x.gates = []],
  ['duplicate role', x => x.gates[1].role = x.gates[0].role],
  ['duplicate job', x => x.gates[1].job = x.gates[0].job], ['relative workflow escape', x => x.gates[0].workflow = '../test.yml'],
  ['invalid SHA domain', x => x.gates[0].identity = 'github-sha-always'],
  ['floating Playwright', x => x.toolchain.playwright = '^1.0.0'], ['unknown Node', x => x.toolchain.nodeMajor = 'latest'],
  ['missing trust', x => x.trustInputs = []], ['floating trust', x => x.trustInputs[0].sha256 = 'latest'],
  ['evidence admission', x => x.evidence.authority = 'trusted'],
]) test('consumer rejects ' + label, () => { const x = clone(consumer); change(x); assert.throws(() => validateConsumer(x, registry)); });
test('different Node major is allowed in an explicit generic profile, not imposed ecosystem-wide', () => {
  const x = clone(consumer); x.toolchain.nodeMajor = 24; assert.equal(validateConsumer(x, registry).toolchain.nodeMajor, 24);
});
for (const s of ['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"outer":{"x":1,"x":2}}', '[{"x":1,"x":2}]', '{bad']) {
  test('reject ambiguous or malformed JSON ' + s, () => assert.throws(() => strictJson(Buffer.from(s))));
}
test('strict JSON supports nested valid arrays, escapes, literals and numbers', () => {
  const x = { a: ['x\\\"', true, null, -12.5e3, { b: {} }], b: 2 };
  assert.deepEqual(strictJson(Buffer.from(JSON.stringify(x))), x);
});
test('invalid UTF8 rejected', () => assert.throws(() => strictJson(Buffer.from([255]))));
for (const p of ['../x', '/tmp/x', './x', 'a//x', 'a/../x', 'a\\x', 'a?x', 'a\nx']) test('unsafe path rejected: ' + JSON.stringify(p), () => assert.throws(() => relative(p)));
test('repository dot segments rejected', () => { for (const r of ['../app', 'test/..', '-x/../../b']) assert.throws(() => repoName(r)); });
test('symlink leaf + ancestor and oversize local files rejected', t => {
  const d = temporary(t); fs.writeFileSync(path.join(d, 'file'), 'xx'); fs.symlinkSync('file', path.join(d, 'link'));
  fs.mkdirSync(path.join(d, 'dir')); fs.writeFileSync(path.join(d, 'dir/f'), 'x'); fs.symlinkSync('dir', path.join(d, 'linked-dir'));
  assert.throws(() => regularRead(d, 'link')); assert.throws(() => regularRead(d, 'linked-dir/f')); assert.throws(() => regularRead(d, 'file', 1));
});
test('reference lock rejects mutation and cannot reduce its own coverage', t => {
  const x = clone(lock); x.files.pop(); assert.throws(() => verifyReference(project, x));
  const y = clone(lock); y.bundleSha256 = '0'.repeat(64); assert.throws(() => verifyReference(project, y));
  const d = treeCopy(t); fs.appendFileSync(path.join(d, lock.files[0].path), '\n// modified'); assert.throws(() => verifyReference(d, lock));
});
test('profile mismatch does not change actual GIT toolchain', t => {
  const d = treeCopy(t), p = 'tools/ci-standard/consumers/generator-testu.json', x = clone(consumer);
  x.toolchain.nodeMajor = 24; fs.writeFileSync(path.join(d, p), JSON.stringify(x)); assert.throws(() => checkLocal(d));
});
test('profile cannot remove independent certifier or rename admission to promote', t => {
  for (const change of [x => x.gates.splice(1, 1), x => x.gates[4].job = 'promote', x => x.gates[1].independentGroup = 'candidate']) {
    const d = treeCopy(t), x = clone(consumer); change(x); fs.writeFileSync(path.join(d, 'tools/ci-standard/consumers/generator-testu.json'), JSON.stringify(x));
    assert.throws(() => checkLocal(d));
  }
});
test('full synthetic collector records Git-bound definitions, no runtime or release assertion', () => {
  const { state, options } = fixture(); const r = collect(options); validateInventory(r);
  assert.equal(r.status, 'COLLECTED_NOT_CERTIFIED'); assert.equal(r.files.length, 3); assert.equal(state.refs, 2);
  assert.equal(r.releaseEligible, false); assert.equal(r.runtimeVerified, false); assert.equal(r.policyVerified, false);
  assert.ok(!JSON.stringify(r).includes('DO_NOT_EXECUTE'), 'Source contents and package hooks must not be serialized');
});
for (const [name, mutate] of [
  ['truncated tree', s => s.tree.truncated = true], ['missing truncation field', s => delete s.tree.truncated],
  ['wrong tree', s => s.tree.sha = 'c'.repeat(40)], ['duplicate path', s => s.tree.tree.push(clone(s.tree.tree.at(-1)))],
  ['symlink definition', s => s.tree.tree.at(-1).mode = '120000'], ['submodule definition', s => s.tree.tree.at(-1).type = 'commit'],
  ['symlink ancestor', s => s.tree.tree.find(x => x.path === '.github/actions/setup').mode = '120000'],
  ['missing ancestor', s => s.tree.tree = s.tree.tree.filter(x => x.path !== '.github/actions/setup')],
  ['oversize definition', s => s.tree.tree.at(-1).size = 1048577], ['wrong blob', s => Object.values(s.blobs)[0].sha = 'c'.repeat(40)],
  ['wrong content', s => Object.values(s.blobs)[0].content = Buffer.alloc(Object.values(s.blobs)[0].size).toString('base64')],
  ['wrong encoding', s => Object.values(s.blobs)[0].encoding = 'utf-8'],
  ['noncanonical base64', s => Object.values(s.blobs)[0].content += '!'],
  ['missing package', s => s.tree.tree = s.tree.tree.filter(x => x.path !== 'package.json')],
  ['no workflow', s => s.tree.tree = s.tree.tree.filter(x => !x.path.endsWith('ci.yml'))],
  ['advanced source', s => s.race = true],
]) test('collector blocks ' + name, () => {
  const { state, options } = fixture(); mutate(state); const r = collect(options); validateInventory(r);
  assert.equal(r.status, 'BLOCKED'); assert.equal(r.releaseEligible, false); assert.equal(r.snapshotSha256, null);
});
test('missing access and secret-bearing errors never imply absent controls or leak token', () => {
  const { options } = fixture(); options.read = () => { throw new Error('secret=synthetic-private-value'); };
  const r = collect(options); assert.equal(r.status, 'BLOCKED'); assert.ok(!JSON.stringify(r).includes('synthetic-private-value'));
});
test('wrong repository ID and missing commit return BLOCKED', () => {
  const { options } = fixture(); options.repositoryId = '456'; assert.equal(collect(options).status, 'BLOCKED');
});
test('production API adapter only invokes gh GET and fixed GitHub host', () => {
  let called = 0;
  const body = apiRead('repos/test/app/git/ref/heads/main', (bin, args, opts) => {
    called++; assert.equal(bin, 'gh'); assert.equal(args[args.indexOf('--method') + 1], 'GET');
    assert.equal(args[args.indexOf('--hostname') + 1], 'github.com'); assert.equal(opts.timeout, 30000);
    assert.ok(!opts.shell); return '{"a":1}';
  });
  assert.equal(called, 1); assert.equal(body.a, 1);
  for (const ep of ['repos/test/app/secrets', 'https://evil.test/x', 'repos/test/app/actions/workflows/a/dispatches', 'repos/test/app/pulls/1/merge', 'repos/test/app/git/ref/heads/../main']) {
    let executed = false;
    assert.throws(() => apiRead(ep, () => { executed = true; throw new Error('should not execute'); }));
    assert.equal(executed, false, 'Reject forbidden endpoint before calling gh');
  }
});
test('API transport errors do not expose subprocess output', () => {
  assert.throws(() => apiRead('repos/test/app', () => { throw new Error('TOKEN-secret'); }), e => !e.message.includes('TOKEN-secret'));
});
test('complete inventory cannot be relabeled release PASS or have authority added', () => {
  const r = collect(fixture().options);
  for (const change of [x => x.status = 'PASS', x => x.releaseEligible = true, x => x.runtimeVerified = true, x => x.policyVerified = true,
    x => x.purpose = 'RELEASE', x => x.files.pop(), x => x.sourceUnchanged = false, x => x.schema = 'v2', x => x.bypass = true]) {
    const x = clone(r); change(x); assert.throws(() => validateInventory(x));
  }
});
test('unchanged inventory is only file equality, including when commit changes', () => {
  const a = collect(fixture().options), b = clone(a); b.sourceCommit = 'c'.repeat(40);
  const diff = compare(a, b); assert.equal(diff.status, 'NO_CI_FILE_DRIFT_NOT_CERTIFIED'); assert.equal(diff.releaseEligible, false);
});
test('modified/added/removed CI inputs require review', () => {
  const a = collect(fixture().options), b = clone(a);
  b.files[0].sha256 = 'f'.repeat(64); b.files.splice(1, 1);
  b.files.push({ path: '.github/workflows/new.yml', sha256: 'e'.repeat(64), gitBlob: 'd'.repeat(40), size: 9 });
  b.snapshotSha256 = sha256(JSON.stringify(b.files));
  const d = compare(a, b); assert.equal(d.status, 'REVIEW_REQUIRED'); assert.equal(d.changes.length, 3);
});
test('cross-repository, branch and reversed comparisons rejected', () => {
  const a = collect(fixture().options);
  for (const change of [x => x.repository = 'test/other', x => x.repositoryId = '124', x => x.branch = 'other', x => { x.startedAt = '2026-10-05T12:00:00.000Z'; }]) {
    const b = clone(a); change(b); assert.throws(() => compare(a, b));
  }
});
test('incomplete inventory cannot be compared or laundered as no drift', () => {
  const good = collect(fixture().options), f = fixture({ race: true }); assert.throws(() => compare(good, collect(f.options)));
});
test('CLI refuses existing output and makes no destructive writes', t => {
  const d = temporary(t), out = path.join(d, 'report.json'); fs.writeFileSync(out, 'keep');
  const run = spawnSync(process.execPath, [path.join(project, 'tools/ci-standard/collect.mjs'), 'test/app', '123', sha, 'main', out], { encoding: 'utf8' });
  assert.equal(run.status, 1); assert.equal(fs.readFileSync(out, 'utf8'), 'keep');
});
test('Git blob calculation matches actual git hash-object', t => {
  const d = temporary(t), bytes = Buffer.from('synthetic\n'); const p = path.join(d, 'f'); fs.writeFileSync(p, bytes);
  assert.equal(blobSha(bytes), execFileSync('git', ['hash-object', p], { encoding: 'utf8' }).trim());
});
test('full source snapshot binds the P3 implementation, policy and registry', t => {
  const d = treeCopy(t), before = sourceSnapshot({ root: d });
  fs.appendFileSync(path.join(d, 'tools/ci-standard/registry.v1.json'), '\n');
  assert.notEqual(sourceSnapshot({ root: d }).sha256, before.sha256);
});
test('P3 integration preserves the P2 workflow topology and preflight finish guard', () => {
  const p = read('package.json'), plan = buildPlan({ root: project, out: '/tmp/synthetic-not-executed', env: {} });
  assert.equal(plan.length, 31); assert.ok(plan[0].command.includes('scripts/ci/p3.test.mjs'));
  assert.ok(plan.findIndex(x => x.id === 'ci-standard-contract') < plan.findIndex(x => x.id === 'npm-registry-connectivity'));
  assert.equal(plan.at(-1).id, 'p1-live-main-protection');
  assert.ok(p.scripts['check:ci-orchestration'].includes('scripts/ci/p3.test.mjs'));
  assert.ok(p.scripts['check:ci-orchestration'].endsWith('&& node tools/ci-standard/check.mjs'));
  for (const command of ['test', 'qa:p5', 'qa:p5:ci']) assert.ok(p.scripts[command].startsWith('npm run check:ci-orchestration && '));
});

test('registry cannot alias two repository profiles or application IDs', () => {
  const a = clone(registry); a.repositories[1].appId = a.repositories[0].appId;
  assert.throws(() => validateRegistry(a));
  const b = clone(registry); b.repositories[1].state = 'STAGED'; b.repositories[1].consumer = b.repositories[0].consumer;
  assert.throws(() => validateRegistry(b));
});
test('staging an unmaterialized profile cannot report structural success', t => {
  const d = treeCopy(t), x = clone(registry);
  x.repositories[1].state = 'STAGED'; x.repositories[1].consumer = 'tools/ci-standard/consumers/ludus.json';
  fs.writeFileSync(path.join(d, 'tools/ci-standard/registry.v1.json'), JSON.stringify(x));
  assert.throws(() => checkLocal(d));
});
test('registry cannot substitute another filename for the GIT consumer', t => {
  const d = treeCopy(t), x = clone(registry);
  x.repositories[0].consumer = 'tools/ci-standard/consumers/alias.json';
  fs.writeFileSync(path.join(d, x.repositories[0].consumer), JSON.stringify(consumer));
  fs.writeFileSync(path.join(d, 'tools/ci-standard/registry.v1.json'), JSON.stringify(x));
  assert.throws(() => checkLocal(d), /profile path drift/);
});
test('collector includes helper changes while never executing inspected modules', () => {
  const f = fixture(), p = 'tools/ci-standard/contract.mjs', bytes = Buffer.from('throw new Error("DO_NOT_EXECUTE_HELPER");');
  f.state.tree.tree.push({ path: 'tools', type: 'tree', mode: '040000', sha: treeSha },
    { path: 'tools/ci-standard', type: 'tree', mode: '040000', sha: treeSha },
    { path: p, type: 'blob', mode: '100644', sha: blobSha(bytes), size: bytes.length });
  f.state.blobs[blobSha(bytes)] = { sha: blobSha(bytes), encoding: 'base64', size: bytes.length, content: bytes.toString('base64') };
  const r = collect(f.options); validateInventory(r); assert.equal(r.status, 'COLLECTED_NOT_CERTIFIED');
  assert.ok(r.files.some(x => x.path === p)); assert.ok(!JSON.stringify(r).includes('DO_NOT_EXECUTE_HELPER'));
});
test('collector refuses a symlinked helper root', () => {
  const f = fixture(); f.state.tree.tree.push({ path: 'scripts/ci', type: 'blob', mode: '120000', sha: treeSha, size: 4 });
  assert.equal(collect(f.options).status, 'BLOCKED');
});
test('collector applies definition count limit before downloading any blob', () => {
  const f = fixture();
  for (let i = 0; i < 128; i++) f.state.tree.tree.push({ path: '.github/workflows/x' + i + '.yml', type: 'blob', mode: '100644', sha, size: 10 });
  assert.equal(collect(f.options).status, 'BLOCKED'); assert.ok(!f.state.calls.some(x => x.includes('/git/blobs/')));
});
test('collector applies total byte limit before downloading any blob', () => {
  const f = fixture();
  for (let i = 0; i < 9; i++) f.state.tree.tree.push({ path: '.github/workflows/large' + i + '.yml', type: 'blob', mode: '100644', sha, size: 1048576 });
  assert.equal(collect(f.options).status, 'BLOCKED'); assert.ok(!f.state.calls.some(x => x.includes('/git/blobs/')));
});
test('GitHub transport is bounded for every read', () => {
  assert.throws(() => apiRead('repos/test/app', (_bin, _args, opts) => {
    assert.equal(opts.timeout, 30000); assert.equal(opts.maxBuffer, 16 * 1024 * 1024);
    throw new Error('simulated timeout');
  }), /read unavailable/);
});
test('strict parser rejects duplicate fields in API transport response', () => {
  assert.throws(() => apiRead('repos/test/app', () => '{"id":123,"id":456}'), /Duplicate JSON key/);
});
test('depth limit prevents excessive nested data', () => {
  assert.throws(() => strictJson(Buffer.from('['.repeat(100) + '0' + ']'.repeat(100))), /nesting limit/);
});
test('CLI drift status distinguishes equality, differences and invalid inputs', t => {
  const d = temporary(t), a = collect(fixture().options), b = clone(a);
  const before = path.join(d, 'before.json'), after = path.join(d, 'after.json'), cli = path.join(project, 'tools/ci-standard/compare.mjs');
  fs.writeFileSync(before, JSON.stringify(a)); fs.writeFileSync(after, JSON.stringify(b));
  let run = spawnSync(process.execPath, [cli, before, after], { encoding: 'utf8' });
  assert.equal(run.status, 0); assert.equal(JSON.parse(run.stdout).releaseEligible, false);
  b.files[0].sha256 = 'e'.repeat(64); b.snapshotSha256 = sha256(JSON.stringify(b.files)); fs.writeFileSync(after, JSON.stringify(b));
  run = spawnSync(process.execPath, [cli, before, after], { encoding: 'utf8' }); assert.equal(run.status, 2);
  b.status = 'PASS'; fs.writeFileSync(after, JSON.stringify(b));
  run = spawnSync(process.execPath, [cli, before, after], { encoding: 'utf8' }); assert.equal(run.status, 1);
});
