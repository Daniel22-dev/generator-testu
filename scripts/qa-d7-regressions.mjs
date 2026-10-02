#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outDir = path.resolve('qa-results');
const summaryPath = path.join(outDir, 'd7-regressions.json');
fs.mkdirSync(outDir, { recursive: true });

const steps = [
  ['d7-ci-wiring', 'scripts/check-d7-ci-wiring.mjs'],
  ['verifier-v2-contract', 'scripts/check-teacher-verifier-v2.mjs'],
  ['verifier-effective-analytics', 'scripts/check-verifier-effective-analytics.mjs'],
  ['verifier-ia-security', 'scripts/check-verifier-ia-security.mjs'],
  ['joker-workflow-real-browser', 'scripts/check-joker-workflow-browser.mjs'],
  ['stage3-pdf-contract', 'scripts/check-stage3-pdf.mjs'],
  ['generate-verifier-fixtures', 'scripts/qa-generate-fixtures.mjs'],
  ['stage3-pdf-real-browser', 'scripts/check-stage3-pdf-runtime.mjs'],
  ['stage3-pdf-quality', 'scripts/check-stage3-pdf-quality.mjs'],
  ['verifier-ui-real-browser', 'scripts/check-verifier-ui-runtime.mjs'],
];

const summary = {
  schema: 'ghrab-d7-regressions-v1',
  version: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
  startedAt: new Date().toISOString(),
  status: 'running',
  steps: [],
};

function persist() {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
}

function cleanupSensitiveRuntimeArtifacts() {
  fs.rmSync(path.join(outDir, 'qa-fixtures'), { recursive: true, force: true });
  for (const directory of ['stage3-pdf-runtime', 'stage3-pdf-quality']) {
    const target = path.join(outDir, directory);
    if (!fs.existsSync(target)) continue;
    for (const entry of fs.readdirSync(target)) {
      if (entry !== 'summary.json') fs.rmSync(path.join(target, entry), { recursive: true, force: true });
    }
  }
}

let failed = false;
for (const [name, script] of steps) {
  if (failed) {
    summary.steps.push({ name, script, status: 'skipped', reason: 'previous-step-failed' });
    persist();
    continue;
  }
  console.log(`\n=== D7 ${name} ===`);
  const started = Date.now();
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  const status = result.status === 0 ? 'passed' : 'failed';
  summary.steps.push({
    name,
    script,
    status,
    exitCode: result.status,
    signal: result.signal || null,
    durationMs: Date.now() - started,
  });
  persist();
  if (status === 'failed') failed = true;
}

cleanupSensitiveRuntimeArtifacts();
summary.completedAt = new Date().toISOString();
summary.status = failed ? 'failed' : 'passed';
summary.sensitiveArtifactsRemoved = true;
persist();
if (failed) {
  console.error(`D7 verifier/PDF regression gate FAIL. Evidence: ${summaryPath}`);
  process.exit(1);
}
console.log(`D7 verifier/PDF regression gate PASS. Evidence: ${summaryPath}`);
