#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const readJson = relative => JSON.parse(read(relative));
const splitSteps = command => String(command || '').split(' && ').map(step => step.trim()).filter(Boolean);

const workflowPaths = Object.freeze([
  '.github/workflows/p3-quality.yml',
  '.github/workflows/p4-release.yml',
  '.github/workflows/stage-b-full-validation.yml'
]);

function validateS1Wiring({ pkg, lock, workflows, p5Workflow, p5Runner, setupTools }) {
  assert.equal(pkg.scripts?.['check:s1-recovery-browser'], 'node scripts/check-recovery-browser-s1.mjs',
    'S1 browser command must point to the reviewed gate');
  assert.equal(pkg.devDependencies?.playwright, '1.61.1', 'S1 requires the reviewed Playwright pin');
  assert.equal(lock.packages?.['']?.devDependencies?.playwright, pkg.devDependencies.playwright,
    'S1 Playwright lockfile pin differs from package.json');

  const p5Steps = splitSteps(pkg.scripts?.['qa:p5:ci']);
  const s1Step = 'npm run check:s1-recovery-browser';
  assert.equal(p5Steps.filter(step => step === s1Step).length, 1,
    'qa:p5:ci must execute the blocking S1 browser gate exactly once');
  assert.ok(p5Steps.indexOf('npm run build') < p5Steps.indexOf(s1Step),
    'qa:p5:ci must build before the S1 browser gate');
  assert.ok(splitSteps(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s1-ci-wiring.mjs'),
    'CI orchestration must enforce the S1 wiring contract');

  for (const [name, workflow] of Object.entries(workflows)) {
    assert.match(workflow, /npx playwright install --with-deps chromium/,
      `${name} must install the pinned Playwright Chromium`);
    assert.match(workflow, /run: npm run qa:p5:ci/,
      `${name} must execute the blocking qa:p5:ci chain`);
  }

  assert.match(p5Runner, /'npm run qa:p5:ci'/,
    'final red-team admission must execute qa:p5:ci');
  assert.match(setupTools, /BROWSER_ARGUMENTS\s*=\s*Object\.freeze\(\['install', '--with-deps', 'chromium'\]\)/,
    'shared final-admission setup must install Chromium through the pinned local Playwright CLI');
  assert.match(p5Workflow, /uses: \.\/\.github\/actions\/install-ci-tools/,
    'P5 release workflow must use the independently verified browser-tool installer');
  assert.match(p5Workflow, /run: npm run qa:redteam:ci/,
    'P5 release workflow must execute final admission');
  assert.match(p5Workflow, /qa-results\/recovery-browser-s1\.json/,
    'P5 release evidence must retain the self-bound S1 report');
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const workflows = Object.fromEntries(workflowPaths.map(relative => [relative, read(relative)]));
const inputs = {
  pkg,
  lock,
  workflows,
  p5Workflow: read('.github/workflows/p5-release-gate.yml'),
  p5Runner: read('scripts/run-redteam-ci-e10.mjs'),
  setupTools: read('scripts/ci/setup-tools.mjs')
};

validateS1Wiring(inputs);

const disconnected = structuredClone(pkg);
disconnected.scripts['qa:p5:ci'] = disconnected.scripts['qa:p5:ci']
  .replace(' && npm run check:s1-recovery-browser', '');
assert.throws(() => validateS1Wiring({ ...inputs, pkg: disconnected }),
  /blocking S1 browser gate/, 'S1 contract must reject a disconnected browser gate');

const unpinned = structuredClone(pkg);
unpinned.devDependencies.playwright = '^1.61.1';
assert.throws(() => validateS1Wiring({ ...inputs, pkg: unpinned }),
  /reviewed Playwright pin/, 'S1 contract must reject an unpinned browser tool');

assert.throws(() => validateS1Wiring({
  ...inputs,
  p5Workflow: inputs.p5Workflow.replace(/^\s*qa-results\/recovery-browser-s1\.json\r?\n/m, '')
}), /retain the self-bound S1 report/, 'S1 contract must reject disconnected release evidence');

console.log('PASS S1 CI wiring contract: qa:p5:ci blocks on pinned Chromium recovery/authentication evidence');
