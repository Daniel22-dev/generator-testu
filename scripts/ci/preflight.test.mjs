import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executePlan, buildPlan } from './preflight.mjs';
function options(t, execute) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-control-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  return { out, cwd: out, env: {}, execute, snapshot: () => ({ sha256: 'a'.repeat(64) }) };
}
const plan = [{ id: 'first', command: ['fixture-first'] }, { id: 'second', command: ['fixture-second'] }];
test('preflight does not relabel unexecuted gates after failure as PASS', t => {
  let count = 0;
  const result = executePlan(plan, options(t, () => { count++; return { status: 1, stdout: '', stderr: 'fixture failure' }; }));
  assert.equal(count, 1); assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(result.steps.map(x => x.status), ['FAIL', 'NOT_RUN']);
});
test('preflight treats missing command and process timeout as blocking', t => {
  for (const run of [{ status: null, error: new Error('ENOENT') }, { status: null, signal: 'SIGTERM' }]) {
    assert.equal(executePlan(plan, options(t, () => run)).status, 'BLOCKED');
  }
});
test('preflight success requires all phases and unchanged source', t => {
  const opts = options(t, () => ({ status: 0, stdout: 'synthetic', stderr: '' }));
  const result = executePlan(plan, opts); assert.equal(result.status, 'PASS');
  assert.ok(result.steps.every(x => x.logSha256.length === 64 && x.durationMs >= 0));
  let count = 0; opts.snapshot = () => ({ sha256: (++count).toString().repeat(64) });
  assert.equal(executePlan(plan, opts).status, 'BLOCKED');
});
test('preflight plan retains all project and release gates, never commits or deploys', t => {
  const opts = options(t, () => ({ status: 0 }));
  const actual = buildPlan({ root: opts.out, out: opts.out, env: {} });
  const commands = actual.filter(x => x.command).map(x => x.command.join(' '));
  for (const expected of ['npm test', 'npm run test:headless', 'npm audit --audit-level=high',
    'npm run test:reporter', 'npm run qa:release', 'npm run qa:platform', 'npm run qa:redteam:ci']) assert.ok(commands.includes(expected), expected);
  const journey = actual.find(x => x.id === 'journey-seven-suites').command;
  assert.equal(journey.filter(x => x === '--suite').length, 7);
  assert.ok(!commands.some(x => /git commit|git push|gh pr merge|gh workflow/.test(x)));
  assert.ok(actual.findIndex(x => x.id === 'preserve-qa-release') < actual.findIndex(x => x.id === 'redteam-foundation-p5-complete'));
  assert.ok(actual.findIndex(x => x.id === 'preserve-redteam-evidence') < actual.findIndex(x => x.id === 'fresh-journey-evidence'));
  assert.equal(actual.at(-1).id, 'p1-live-main-protection', 'P1 activation proof is mandatory before a commit');
});
