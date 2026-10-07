// GIT adapter. It verifies declarations and existing P1/P2 structural contracts.
// It does not claim runtime equivalence, policy visibility, or a successful release.
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readStandard, validateConsumer, PURPOSE, VERSION } from './contract.mjs';
import { readJson, regularRead, sha256 } from './safe-io.mjs';
import { validateP1Workflow, jobBlock } from '../../scripts/ci/p1-workflow-contract.mjs';
import { validateP2Workflows, validateSetupSources } from '../../scripts/ci/p2-workflow-contract.mjs';
const EXPECTED_GATES = [
  ['candidate', 'safe-promotion.yml', 'candidate-gate', 'candidate-gate', 'candidate-source', 'candidate'],
  ['pr', 'safe-promotion.yml', 'pr-certification', 'pr-certification', 'candidate-source', 'pr'],
  ['p5', 'p5-release-gate.yml', 'p5-release-gate', 'p5-release-gate', 'candidate-source', 'p5'],
  ['journey', 'journey-e2e.yml', 'journey-e2e', 'journey-e2e', 'candidate-source', 'journey'],
  ['admission', 'safe-promotion.yml', 'admission', 'release-admission', 'candidate-source', null],
  ['main', 'deploy.yml', 'qa-build', 'qa-build', 'merged-main-source', 'main'],
];
export function checkLocal(root = process.cwd()) {
  const { registry, bundleSha256 } = readStandard(root);
  assert.equal(registry.repositories.find(r => r.repository === 'Daniel22-dev/generator-testu')?.consumer,
    'tools/ci-standard/consumers/generator-testu.json', 'GIT profile path drift');
  const profile = validateConsumer(readJson(root, 'tools/ci-standard/consumers/generator-testu.json'), registry);
  assert.equal(profile.repository, 'Daniel22-dev/generator-testu'); assert.equal(profile.repositoryId, '1262251614');
  assert.equal(profile.appId, 'generator-testu'); assert.equal(profile.profile, 'git-independent-v1');
  assert.deepEqual(profile.gates.map(g => [g.role, g.workflow.replace('.github/workflows/', ''), g.job, g.checkName, g.identity, g.independentGroup]), EXPECTED_GATES);
  assert.equal(profile.toolchain.nodeMajor, 22); assert.equal(profile.toolchain.npmLockfile, 'package-lock.json');
  assert.equal(profile.toolchain.pythonRequirements, 'audit/requirements-audit.txt');
  assert.equal(profile.trustInputs.length, 1); const trust = profile.trustInputs[0];
  assert.equal(trust.environment, 'GARP27_EXTERNAL_TRUST_SHA256');
  assert.equal(trust.sha256, '831b87232ff4c3b9e517c25728153e97b3489d18f859bb235a7e3e9a06c9a896');
  const pkg = readJson(root, 'package.json'), lock = readJson(root, profile.toolchain.npmLockfile);
  assert.equal(pkg.name, 'generator-testu'); assert.equal(lock.version, pkg.version);
  assert.equal(pkg.devDependencies.playwright, profile.toolchain.playwright); assert.equal(pkg.devDependencies['axe-core'], profile.toolchain.axe);
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    assert.equal(lock.packages[''].devDependencies[name], version); assert.equal(lock.packages['node_modules/' + name].version, version);
  }
  assert.equal(regularRead(root, profile.toolchain.pythonRequirements).toString().trim(), 'playwright==1.57.0');
  const workflows = {};
  for (const name of [...new Set(EXPECTED_GATES.map(g => g[1]))]) workflows[name] = regularRead(root, '.github/workflows/' + name).toString();
  const setup = { nodeAction: regularRead(root, '.github/actions/setup-ci-node/action.yml').toString(),
    toolsAction: regularRead(root, '.github/actions/install-ci-tools/action.yml').toString(),
    toolsRunner: regularRead(root, 'scripts/ci/setup-tools.mjs').toString() };
  validateP1Workflow(workflows['safe-promotion.yml']); validateSetupSources(setup); validateP2Workflows(workflows, setup);
  for (const g of profile.gates) {
    const block = jobBlock(workflows[g.workflow.replace('.github/workflows/', '')], g.job);
    const declaredName = block.match(/^    name: (.+)$/m)?.[1] || g.job; assert.equal(declaredName, g.checkName);
  }
  for (const [workflow, job] of [['safe-promotion.yml', 'candidate-gate'], ['safe-promotion.yml', 'pr-certification'], ['p5-release-gate.yml', 'p5-release-gate']]) {
    assert.ok(jobBlock(workflows[workflow], job).includes(trust.environment + ': ' + trust.sha256), 'Repository-specific trust pin drift');
  }
  return { schema: 'ghrab-ci-local-contract-v1', standardVersion: VERSION, purpose: PURPOSE,
    repository: profile.repository, repositoryId: profile.repositoryId, status: 'STRUCTURAL_MATCH_NOT_CERTIFIED',
    releaseEligible: false, runtimeVerified: false, policyVerified: false, bundleSha256,
    consumerSha256: sha256(regularRead(root, 'tools/ci-standard/consumers/generator-testu.json')),
    stagedConsumers: registry.repositories.filter(r => r.state === 'STAGED').length,
    unprofiledConsumers: registry.repositories.filter(r => r.state === 'NOT_PROFILED').length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { assert.equal(process.argv.length, 2); console.log(JSON.stringify(checkLocal(), null, 2)); }
  catch (error) { console.error('BLOCKED local standard contract: ' + error.message); process.exitCode = 1; }
}
