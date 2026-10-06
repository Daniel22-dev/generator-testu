// Structural P2 contract supplements (never substitutes for) actionlint and
// execution on GitHub. Every mandatory test chain stays outside shared setup.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { jobBlock } from './p1-workflow-contract.mjs';

export const SETUP_JOBS = Object.freeze([
  ['safe-promotion.yml', 'candidate-gate', '${{ needs.prepare.outputs.certified_sha }}', 'CHROMIUM_PATH'],
  ['safe-promotion.yml', 'pr-certification', '${{ needs.prepare.outputs.certified_sha }}', 'CHROMIUM_PATH'],
  ['deploy.yml', 'qa-build', '${{ github.sha }}', 'CHROMIUM_PATH'],
  ['p5-release-gate.yml', 'p5-release-gate', '${{ github.sha }}', 'CHROMIUM_PATH'],
  ['journey-e2e.yml', 'journey-e2e', '${{ github.sha }}', 'CHROMIUM_EXECUTABLE'],
]);
export function readSetupSources(root = process.cwd()) {
  const read = p => fs.readFileSync(path.join(root, p), 'utf8');
  return {
    nodeAction: read('.github/actions/setup-ci-node/action.yml'),
    toolsAction: read('.github/actions/install-ci-tools/action.yml'),
    toolsRunner: read('scripts/ci/setup-tools.mjs'),
  };
}
export function validateSetupSources({ nodeAction, toolsAction, toolsRunner }) {
  for (const definition of [nodeAction, toolsAction]) {
    assert.match(definition, /^runs:\n  using: composite$/m);
    assert.doesNotMatch(definition, /continue-on-error:|\sif:|download-artifact|restore-keys:|secrets\.|permissions:/);
  }
  assert.deepEqual([...nodeAction.matchAll(/^\s+uses: (\S+)/gm)].map(x => x[1]), ['actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020']);
  assert.match(nodeAction, /^        node-version: '22'$/m);
  assert.match(nodeAction, /^        cache: npm$/m);
  assert.match(nodeAction, /^        cache-dependency-path: package-lock.json$/m);
  assert.match(nodeAction, /^        registry-url: https:\/\/registry.npmjs.org$/m);
  assert.doesNotMatch(nodeAction, /^\s+run:/m);
  assert.deepEqual([...toolsAction.matchAll(/^\s+run: (.+)$/gm)].map(x => x[1]), ['node scripts/ci/setup-tools.mjs']);
  assert.doesNotMatch(toolsAction, /^\s+uses:|^\s+default:/m);
  assert.match(toolsAction, /expected-sha:[\s\S]*?required: true/);
  assert.match(toolsAction, /browser-env:[\s\S]*?required: true/);
  assert.match(toolsAction, /shell: bash/);
  assert.match(toolsAction, /CI_TOOL_EXPECTED_SHA: \$\{\{ inputs.expected-sha \}\}/);
  assert.match(toolsAction, /CI_TOOL_BROWSER_ENV: \$\{\{ inputs.browser-env \}\}/);
  assert.ok(toolsRunner.includes("export const INSTALL_COMMAND = Object.freeze(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org']);"), 'Locked clean install cannot be replaced or weakened');
  assert.ok(toolsRunner.includes("export const BROWSER_ARGUMENTS = Object.freeze(['install', '--with-deps', 'chromium']);"), 'Pinned browser and OS dependencies required');
  assert.ok(toolsRunner.includes("step('locked-npm-ci', () => run(INSTALL_COMMAND))"));
  assert.ok(toolsRunner.includes("step('locked-tool-versions', () => { report.tools = verifyInstalledTools(root); })"));
  assert.ok(toolsRunner.includes('run([process.execPath, report.tools.cli, ...BROWSER_ARGUMENTS]'));
  assert.ok(toolsRunner.includes("path.join(root, 'node_modules', 'playwright', 'cli.js')"), 'No registry fallback for browser CLI');
  assert.ok(toolsRunner.indexOf("step('locked-tool-versions'") < toolsRunner.indexOf("step('pinned-browser-install'"));
  assert.ok(toolsRunner.includes("assert.equal(report.sourceUnchanged, true, 'Source changed while installing tools')"));
  assert.ok(toolsRunner.includes('SETUP_PROVENANCE_ONLY_NOT_RELEASE_ADMISSION'));
  assert.ok(toolsRunner.includes('result.status === 0'), 'Every setup command must succeed');
}
export function validateP2Workflows(workflows, setup) {
  validateSetupSources(setup);
  for (const [file, id, sha, browser] of SETUP_JOBS) {
    const block = jobBlock(workflows[file], id);
    assert.equal((block.match(/uses: \.\/\.github\/actions\/setup-ci-node/g) || []).length, 1, id + ' configures Node once');
    assert.equal((block.match(/uses: \.\/\.github\/actions\/install-ci-tools/g) || []).length, 1, id + ' installs its own tools once');
    assert.ok(block.includes('          expected-sha: ' + sha), id + ' exact source input');
    assert.ok(block.includes('          browser-env: ' + browser), id + ' preserves browser variable');
    assert.ok(block.includes('          ref: ' + sha), id + ' missing exact checkout ref');
    assert.match(block, /uses: actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
    assert.ok(block.indexOf('ref: ' + sha) < block.indexOf('uses: ./.github/actions/setup-ci-node'), id + ' exact checkout before local action');
    assert.ok(block.includes('persist-credentials: false'), id + ' does not persist checkout write credentials');
    assert.ok(block.indexOf('uses: ./.github/actions/setup-ci-node') < block.indexOf('uses: ./.github/actions/install-ci-tools'));
    assert.match(block, /id: ci_tools\n        timeout-minutes: 12\n        uses: \.\/\.github\/actions\/install-ci-tools/);
    assert.match(block, /if: always\(\) && \(steps.ci_tools.outcome == 'success' \|\| steps.ci_tools.outcome == 'failure'\)/);
    assert.ok(block.includes('name: generator-toolchain-${{ github.sha }}-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}'));
    assert.ok(block.includes('path: ${{ runner.temp }}/generator-ci-tools/${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}/toolchain.json'));
    assert.doesNotMatch(block, /download-artifact|continue-on-error:|cache-hit|node_modules.*(?:cache|artifact)/);
    if (file === 'safe-promotion.yml') {
      assert.ok(block.indexOf('run: node scripts/ci/promotion-freshness.mjs --pr') < block.indexOf('uses: ./.github/actions/install-ci-tools'), id + ' freshness precedes expensive setup');
    }
    if (file === 'deploy.yml') {
      assert.ok(block.indexOf('run: node scripts/check-redteam-release-e10.mjs --require-ready') < block.indexOf('uses: ./.github/actions/install-ci-tools'));
    }
  }
  const p5 = workflows['p5-release-gate.yml'];
  assert.ok(p5.includes("p.version!=='4.12.1'")); assert.ok(p5.includes("p.version!=='1.61.1'"));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const workflows = Object.fromEntries([...new Set(SETUP_JOBS.map(x => x[0]))].map(f => [f, fs.readFileSync('.github/workflows/' + f, 'utf8')]));
  validateP2Workflows(workflows, readSetupSources());
  console.log('PASS P2 shared setup definition and all five independent consumers');
}
