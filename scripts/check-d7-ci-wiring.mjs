#!/usr/bin/env node
import fs from 'node:fs';
import { validateP1Workflow } from './ci/p1-workflow-contract.mjs';
import { INDEPENDENT_GATES } from './ci/release-admission.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const journey = fs.readFileSync('.github/workflows/journey-e2e.yml', 'utf8');
const safePromotion = fs.readFileSync('.github/workflows/safe-promotion.yml', 'utf8');
const p5 = fs.readFileSync('.github/workflows/p5-release-gate.yml', 'utf8');
const runner = fs.readFileSync('scripts/qa-d7-regressions.mjs', 'utf8');

let failed = 0;
function need(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else { failed++; console.error(`FAIL ${message}`); }
}

need(pkg.scripts?.['qa:p5:ci']?.includes('npm run qa:d7:ci'), 'qa:p5:ci includes the D7 verifier/PDF regression gate');
need(pkg.scripts?.['qa:p5']?.includes('npm run qa:d7:ci'), 'qa:p5 keeps local/release parity with the D7 regression gate');
for (const script of [
  'check-teacher-verifier-v2.mjs',
  'check-verifier-effective-analytics.mjs',
  'check-verifier-ia-security.mjs',
  'check-stage3-pdf.mjs',
  'check-stage3-pdf-runtime.mjs',
  'check-stage3-pdf-quality.mjs',
  'check-verifier-ui-runtime.mjs',
]) need(runner.includes(script), `D7 runner includes ${script}`);
need(/rm -rf audit\/evidence[\s\S]*mkdir -p audit\/evidence/.test(journey), 'Journey workflow cleans stale evidence before the run');
need(journey.includes('--suite config_extra_suite'), 'Journey workflow includes config_extra_suite for count/differentiation coverage');
need(journey.includes('journey-e2e-evidence-${{ github.sha }}'), 'Journey artifact is bound to the exact SHA');
validateP1Workflow(safePromotion);
need(INDEPENDENT_GATES.some(x => x.job === 'p5-release-gate'), 'P1 admission retains independent P5');
need(INDEPENDENT_GATES.some(x => x.job === 'journey-e2e'), 'P1 admission also requires independent Journey');
need(p5.includes('qa-results/d7-regressions.json') && p5.includes('qa-results/verifier-ui-runtime/summary.json'), 'P5 artifact retains non-sensitive D7 evidence summaries');

if (failed) process.exit(1);
console.log('PASS D7 CI wiring contract');
