#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audit', 'evidence', 'garp27-current');
const V = path.join(ROOT, 'vendor', 'garp-2.7-consolidated-r2', 'MASTER', 'TOOLS');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const shaFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const APP_VERSION = String(pkg.version || '');

function sourceIdentity() {
  if (process.env.GITHUB_SHA && /^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA)) {
    return { value: process.env.GITHUB_SHA, kind: 'git-commit' };
  }
  const include = [
    'package.json',
    'package-lock.json',
    'public/ai-operations.json',
    'public/config/deployment.json',
    'public/config/deployment.school-server.json',
    'src/config/release-acceptance.json',
    'security/garp27/garp-policy.json',
    'security/garp27/architecture-policy.json',
    'security/garp27/capability-inventory.json'
  ];
  const h = crypto.createHash('sha1');
  for (const rel of include) {
    h.update(rel);
    h.update('\0');
    h.update(fs.readFileSync(path.join(ROOT, rel)));
    h.update('\n');
  }
  return { value: h.digest('hex'), kind: 'local-source-tree-sha1-surrogate' };
}

const steps = [
  { id: 'build-production', cmd: ['npm', 'run', 'build'], expected: 0 },
  { id: 'version-contract', cmd: ['npm', 'run', 'check:versions'], expected: 0 },
  { id: 'garp27-contracts', cmd: ['npm', 'run', 'qa:garp27:contracts'], expected: 0 },
  { id: 'garp27-architecture', cmd: ['npm', 'run', 'qa:garp27:architecture'], expected: 0 },
  { id: 'garp27-policy-mutations', cmd: ['npm', 'run', 'qa:garp27:policy-mutations'], expected: 0 },
  { id: 'garp27-mutations', cmd: ['npm', 'run', 'qa:garp27:mutations'], expected: 0 },
  { id: 'garp27-auto-patch', cmd: ['npm', 'run', 'qa:garp27:auto-patch'], expected: 0 },
  { id: 'legacy-garp25-static', cmd: ['npm', 'run', 'garp25:prep-static'], expected: 0 },
  { id: 'production-readiness', cmd: ['npm', 'run', 'check:production'], expected: 0 },
  { id: 'action-pins', cmd: ['npm', 'run', 'check:actions'], expected: 0 },
  { id: 'sensitive-scan', cmd: ['npm', 'run', 'check:sensitive'], expected: 0 }
];

const results = [];
let failed = 0;
for (const step of steps) {
  const run = spawnSync(step.cmd[0], step.cmd.slice(1), {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 32 * 1024 * 1024
  });
  const log = [
    `$ ${step.cmd.join(' ')}`,
    `EXIT=${run.status}`,
    '',
    'STDOUT',
    run.stdout || '',
    'STDERR',
    run.stderr || ''
  ].join('\n');
  const file = path.join(OUT, `${step.id}.log`);
  fs.writeFileSync(file, log);
  const pass = run.status === step.expected;
  results.push({
    id: step.id,
    expectedExit: step.expected,
    actualExit: run.status,
    pass,
    evidence: { id: step.id, sha256: shaFile(file) }
  });
  if (!pass) failed++;
}

const ident = sourceIdentity();
if (!failed) {
  const by = Object.fromEntries(results.map(result => [result.id, result.evidence]));
  const template = JSON.parse(fs.readFileSync(path.join(ROOT, 'security', 'garp27', 'application-migration-profile.json'), 'utf8'));
  const evidenceIds = [
    'version-contract',
    'garp27-contracts',
    'garp27-architecture',
    'garp27-policy-mutations',
    'garp27-mutations',
    'garp27-auto-patch',
    'legacy-garp25-static',
    'production-readiness',
    'action-pins',
    'sensitive-scan'
  ];
  const trustedEvidence = Object.fromEntries(evidenceIds.map(id => [id, by[id].sha256]));
  const profile = {
    ...template,
    trustedEvidence,
    releaseIdentity: {
      appId: 'generator',
      appVersion: APP_VERSION,
      sourceCommit: ident.value
    }
  };
  const observedAt = new Date().toISOString();
  const refs = ids => ids.map(id => by[id]);
  const components = [
    ['AG-01-policy', ['garp27-contracts', 'garp27-policy-mutations']],
    ['AG-02-identity', ['legacy-garp25-static', 'production-readiness']],
    ['AG-03-request-api-ai', ['legacy-garp25-static', 'garp27-architecture']],
    ['AG-05-files', ['legacy-garp25-static', 'sensitive-scan']],
    ['AG-06-data-lifecycle', ['legacy-garp25-static']],
    ['AG-07-release', ['garp27-auto-patch', 'production-readiness', 'action-pins']],
    ['AG-08-architecture', ['garp27-architecture', 'garp27-mutations']],
    ['AG-09-inventory', ['garp27-architecture']]
  ].map(([componentId, ids]) => ({
    componentId,
    presence: 'PRESENT',
    health: 'HEALTHY',
    effectiveness: 'PASS',
    evidenceFreshness: 'FRESH',
    observedAt,
    evidenceRefs: refs(ids)
  }));
  const status = {
    schema: 'garp27-assurance-status-v1',
    garpVersion: '2.7',
    environment: 'local-ci',
    releaseIdentity: profile.releaseIdentity,
    overall: 'DERIVE',
    components
  };
  const profileFile = path.join(OUT, 'resolved-migration-profile.json');
  const statusFile = path.join(OUT, 'assurance-status.json');
  fs.writeFileSync(profileFile, JSON.stringify(profile, null, 2) + '\n');
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2) + '\n');
  const assurance = spawnSync('node', [path.join(V, 'validate-assurance.mjs'), statusFile, '--profile', profileFile], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env
  });
  const assuranceFile = path.join(OUT, 'assurance-validation.log');
  fs.writeFileSync(assuranceFile, `EXIT=${assurance.status}\n${assurance.stdout || ''}\n${assurance.stderr || ''}`);
  const pass = assurance.status === 0 && /FOUNDATION_PASS_LIVE_NOT_TESTED/.test(assurance.stdout || '');
  results.push({
    id: 'assurance-admission',
    expectedExit: 0,
    actualExit: assurance.status,
    pass,
    evidence: { id: 'assurance-admission', sha256: shaFile(assuranceFile) }
  });
  if (!pass) failed++;
}

const summary = {
  classification: 'GARP27_FOUNDATION_GATE',
  schema: 'garp27-foundation-summary-v1',
  garpVersion: '2.7',
  appId: 'generator',
  appVersion: APP_VERSION,
  status: failed ? 'FAIL' : 'FOUNDATION_PASS_LIVE_NOT_TESTED',
  serverPhase: 'DEFERRED_BY_OWNER_DECISION',
  liveStatus: 'NOT_TESTED',
  sourceIdentity: ident,
  steps: results,
  summary: {
    total: results.length,
    passed: results.filter(result => result.pass).length,
    failed
  }
};

fs.writeFileSync(path.join(OUT, 'foundation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
process.exit(failed ? 1 : 0);
