#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveNpmCommand } from './lib/npm-command.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.S81_FOUNDATION_EVIDENCE_DIR || path.join(ROOT, 'qa-results', 's81-foundation-execution'));
const steps = [
  ['build-production', 'build'],
  ['version-contract', 'check:versions'],
  ['garp27-contracts', 'qa:garp27:contracts'],
  ['garp27-architecture', 'qa:garp27:architecture'],
  ['garp27-policy-mutations', 'qa:garp27:policy-mutations'],
  ['garp27-mutations', 'qa:garp27:mutations'],
  ['garp27-auto-patch', 'qa:garp27:auto-patch'],
  ['legacy-garp25-static', 'garp25:prep-static'],
  ['production-readiness', 'check:production'],
  ['action-pins', 'check:actions'],
  ['sensitive-scan', 'check:sensitive']
];

fs.mkdirSync(OUT, { recursive: true });
const results = [];
for (const [id, script] of steps) {
  const command = resolveNpmCommand(['run', script]);
  const run = spawnSync(command.program, command.args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024
  });
  const log = `$ npm run ${script}\nEXIT=${run.status}\n\nSTDOUT\n${run.stdout || ''}\nSTDERR\n${run.stderr || ''}`;
  const file = path.join(OUT, `${id}.log`);
  fs.writeFileSync(file, log);
  results.push({
    id,
    expectedExit: 0,
    actualExit: run.status,
    pass: run.status === 0,
    sha256: crypto.createHash('sha256').update(log).digest('hex')
  });
}

const report = {
  schema: 'git-s81-foundation-execution-v1',
  classification: 'DIAGNOSTIC_ONLY_NOT_RELEASE_ADMISSION',
  sourceHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(),
  platform: process.platform,
  node: process.version,
  status: results.every(result => result.pass) ? 'PASS' : 'FAIL',
  results,
  summary: {
    total: results.length,
    passed: results.filter(result => result.pass).length,
    failed: results.filter(result => !result.pass).length
  },
  limits: [
    'This executes the same eleven local commands but is not the pinned GARP foundation authority.',
    'Live/server assurance remains NOT VERIFIED and server phase remains DEFERRED.'
  ]
};
fs.writeFileSync(path.join(OUT, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === 'PASS' ? 0 : 1);
