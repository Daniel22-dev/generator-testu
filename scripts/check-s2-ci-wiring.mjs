#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const splitSteps = command => String(command || '').split(' && ').map(step => step.trim()).filter(Boolean);

function validateS2Wiring(pkg, p5Workflow) {
  assert.equal(pkg.scripts?.['check:s2-pedagogical-fidelity'], 'node scripts/check-pedagogical-fidelity-s2.mjs && node scripts/check-s2-r2-adversarial.mjs && node scripts/check-s2-visible-task-fingerprint.mjs && node scripts/check-s2-remediation-mutations.mjs',
    'S2 source gate must execute the reviewed fidelity, R2 adversarial, visible-task fingerprint and remediation mutation tests');
  assert.equal(pkg.scripts?.['check:s2-pedagogical-browser'], 'node scripts/check-pedagogical-fidelity-browser-s2.mjs',
    'S2 browser gate must point to the reviewed Chromium test');
  assert.equal(pkg.devDependencies?.playwright, '1.61.1', 'S2 browser evidence requires the reviewed Playwright pin');

  const prebuild = splitSteps(pkg.scripts?.prebuild);
  assert.equal(prebuild.filter(step => step === 'npm run check:s2-pedagogical-fidelity').length, 1,
    'prebuild must execute the blocking S2 source gate exactly once');

  const p5ci = splitSteps(pkg.scripts?.['qa:p5:ci']);
  const browserGate = 'npm run check:s2-pedagogical-browser';
  assert.equal(p5ci.filter(step => step === browserGate).length, 1,
    'qa:p5:ci must execute the blocking S2 browser gate exactly once');
  assert.ok(p5ci.indexOf('npm run build') < p5ci.indexOf(browserGate),
    'qa:p5:ci must build before the S2 browser gate');

  const p5 = splitSteps(pkg.scripts?.['qa:p5']);
  assert.equal(p5.filter(step => step === browserGate).length, 1,
    'qa:p5 must execute the S2 browser gate exactly once');
  assert.ok(p5.indexOf('npm run build') < p5.indexOf(browserGate),
    'qa:p5 must build before the S2 browser gate');

  assert.ok(splitSteps(pkg.scripts?.['check:ci-orchestration']).includes('node scripts/check-s2-ci-wiring.mjs'),
    'CI orchestration must enforce the S2 wiring contract');
  assert.match(p5Workflow, /qa-results\/pedagogical-fidelity-browser-s2\.json/,
    'P5 release evidence must retain the self-bound S2 browser report');
}

const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/p5-release-gate.yml');
validateS2Wiring(pkg, workflow);

const disconnectedSource = structuredClone(pkg);
disconnectedSource.scripts.prebuild = disconnectedSource.scripts.prebuild.replace(' && npm run check:s2-pedagogical-fidelity', '');
assert.throws(() => validateS2Wiring(disconnectedSource, workflow), /blocking S2 source gate/,
  'S2 contract must reject a disconnected source gate');

const disconnectedRemediation = structuredClone(pkg);
disconnectedRemediation.scripts['check:s2-pedagogical-fidelity'] = 'node scripts/check-pedagogical-fidelity-s2.mjs && node scripts/check-s2-r2-adversarial.mjs';
assert.throws(() => validateS2Wiring(disconnectedRemediation, workflow), /remediation mutation tests/,
  'S2 contract must reject a source gate that omits S2.1 mutation tests');

const disconnectedR2 = structuredClone(pkg);
disconnectedR2.scripts['check:s2-pedagogical-fidelity'] = 'node scripts/check-pedagogical-fidelity-s2.mjs && node scripts/check-s2-visible-task-fingerprint.mjs && node scripts/check-s2-remediation-mutations.mjs';
assert.throws(() => validateS2Wiring(disconnectedR2, workflow), /R2 adversarial/,
  'S2 contract must reject a source gate that omits R2 adversarial scenarios');

const disconnectedFingerprint = structuredClone(pkg);
disconnectedFingerprint.scripts['check:s2-pedagogical-fidelity'] = 'node scripts/check-pedagogical-fidelity-s2.mjs && node scripts/check-s2-r2-adversarial.mjs && node scripts/check-s2-remediation-mutations.mjs';
assert.throws(() => validateS2Wiring(disconnectedFingerprint, workflow), /visible-task fingerprint/,
  'S2 contract must reject a source gate that omits final fingerprint scenarios');

const disconnectedBrowser = structuredClone(pkg);
disconnectedBrowser.scripts['qa:p5:ci'] = disconnectedBrowser.scripts['qa:p5:ci'].replace(' && npm run check:s2-pedagogical-browser', '');
assert.throws(() => validateS2Wiring(disconnectedBrowser, workflow), /blocking S2 browser gate/,
  'S2 contract must reject a disconnected browser gate');

assert.throws(() => validateS2Wiring(pkg, workflow.replace(/^\s*qa-results\/pedagogical-fidelity-browser-s2\.json\r?\n/m, '')),
  /retain the self-bound S2 browser report/, 'S2 contract must reject disconnected release evidence');

console.log('PASS S2 CI wiring contract: prebuild and P5 certification block on pedagogical fidelity evidence');
