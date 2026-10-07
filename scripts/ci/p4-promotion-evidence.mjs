// P4 Balanced: exact-tree promotion evidence producer/consumer.
// Pre-merge certification results may be reused only when this contract proves
// exact repository/run/job/check/artifact identity and candidate-tree == merged-main-tree.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { githubRead, readCollection, repositoryName, exactSha, positiveId } from './github-read.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SCHEMA = 'git-p4-promotion-certificate-v1';
export const CONSUMED_SCHEMA = 'git-p4-consumed-promotion-evidence-v1';
export const ACTIONS_APP_ID = 15368;
export const PROMOTION_WORKFLOW = '.github/workflows/safe-promotion.yml';
export const PROMOTION_JOB = 'promote-certified-pr';
export const MAX_CERT_AGE_MS = 30 * 60 * 1000;
export const GARP27_TRUST_SHA256 = '831b87232ff4c3b9e517c25728153e97b3489d18f859bb235a7e3e9a06c9a896';
export const REQUIRED_P5_REPORTS = Object.freeze([
  'qa-p5-release-report.json',
  'qa-p5-acceptance-report.json',
  'qa-p5-runtime-report.json',
  'qa-p5-axe-runtime-report.json',
]);
export const CONFIG_PATHS = Object.freeze([
  'package-lock.json',
  'security/ci/main-ruleset-attestation.json',
  '.github/workflows/safe-promotion.yml',
  '.github/workflows/p5-release-gate.yml',
  '.github/workflows/journey-e2e.yml',
  '.github/workflows/deploy.yml',
  '.github/actions/setup-ci-node/action.yml',
  '.github/actions/install-ci-tools/action.yml',
  'scripts/ci/main-protection.mjs',
  'scripts/ci/promotion-freshness.mjs',
  'scripts/ci/release-admission.mjs',
  'scripts/ci/release-evidence.mjs',
  'scripts/run-redteam-ci-e10.mjs',
]);

const SHA256 = /^[0-9a-f]{64}$/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const safeName = value => {
  assert.match(value || '', /^[A-Za-z0-9_.-]+$/, 'Unsafe artifact name');
  return value;
};
const runGit = (args, root = ROOT) => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const digestFile = (root, rel) => {
  const full = path.join(root, rel);
  const stat = fs.lstatSync(full);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${rel}: regular file required`);
  return sha256(fs.readFileSync(full));
};
export function configDigests(root = ROOT) {
  return CONFIG_PATHS.map(rel => ({ path: rel, sha256: digestFile(root, rel) }));
}
function verifyRun(run, { repo, runId, runAttempt, workflow, headSha, headBranch, allowedEvents = ['push', 'workflow_dispatch'] }) {
  assert.equal(String(run.id), String(positiveId(runId)), 'Wrong workflow run ID');
  assert.equal(String(run.run_attempt), String(positiveId(runAttempt)), 'Wrong workflow attempt');
  assert.equal(run.path, workflow, 'Wrong workflow path');
  assert.equal(run.head_sha, exactSha(headSha), 'Wrong workflow head SHA');
  assert.equal(run.head_branch, headBranch, 'Wrong workflow branch');
  assert.ok(allowedEvents.includes(run.event), 'Unexpected workflow event');
  assert.equal(run.repository?.full_name, repo, 'Foreign workflow repository');
  assert.equal(run.head_repository?.full_name, repo, 'Foreign workflow source repository');
  return run;
}
function artifactRecord(artifacts, name, runId, runAttempt, window = null) {
  const named = artifacts.filter(a => a.name === name);
  const matches = window ? named.filter(a => {
    const created = Date.parse(a.created_at || '');
    const started = Date.parse(window.startedAt || '');
    const completed = Date.parse(window.completedAt || '');
    return Number.isFinite(created) && Number.isFinite(started) && Number.isFinite(completed) && created >= started && created <= completed;
  }) : named;
  assert.equal(matches.length, 1, `Exactly one current-attempt artifact required: ${name}`);
  const a = matches[0];
  positiveId(a.id);
  assert.equal(String(a.workflow_run?.id), String(positiveId(runId)), 'Artifact belongs to another run');
  assert.equal(a.expired, false, 'Expired artifact cannot be trusted');
  assert.match(a.digest || '', /^sha256:[0-9a-f]{64}$/, 'GitHub artifact digest is required');
  assert.ok(Number.isSafeInteger(a.size_in_bytes) && a.size_in_bytes > 0, 'Artifact must be non-empty');
  return {
    name: a.name, id: Number(a.id), digest: a.digest, size: a.size_in_bytes,
    runId: Number(runId), runAttempt: Number(runAttempt), createdAt: a.created_at, expiresAt: a.expires_at,
  };
}
function verifyJob({ repo, run, jobs, jobName, sha, read = githubRead }) {
  const matching = jobs.filter(j => j.name === jobName);
  assert.equal(matching.length, 1, `Exactly one ${jobName} job required`);
  const job = matching[0];
  positiveId(job.id);
  assert.equal(job.run_id, run.id, 'Job/run mismatch');
  assert.equal(job.run_attempt, run.run_attempt, 'Job attempt mismatch');
  assert.equal(job.head_sha, sha, 'Job SHA mismatch');
  assert.equal(job.check_run_url, `https://api.github.com/repos/${repo}/check-runs/${job.id}`, 'Unexpected check origin');
  assert.equal(job.status, 'completed', `${jobName} not completed`);
  assert.equal(job.conclusion, 'success', `${jobName} not successful`);
  assert.ok(Number.isFinite(Date.parse(job.started_at || '')), `${jobName} missing start time`);
  assert.ok(Number.isFinite(Date.parse(job.completed_at || '')), `${jobName} missing completion time`);
  assert.ok(Date.parse(job.completed_at) >= Date.parse(job.started_at), `${jobName} invalid execution window`);
  const check = read(`repos/${repo}/check-runs/${job.id}`);
  assert.equal(check.id, job.id, 'Check/job mismatch');
  assert.equal(check.name, jobName, 'Check name mismatch');
  assert.equal(check.head_sha, sha, 'Check SHA mismatch');
  assert.equal(check.app?.id, ACTIONS_APP_ID, 'Check must originate from GitHub Actions');
  assert.equal(check.status, 'completed');
  assert.equal(check.conclusion, 'success');
  return { jobId: job.id, checkId: check.id, checkAppId: check.app.id,
    jobStartedAt: job.started_at, jobCompletedAt: job.completed_at };
}
function verifyArtifactSet(actual, expected) {
  assert.equal(actual.length, expected.length, 'Artifact evidence count mismatch');
  const byName = new Map(actual.map(x => [x.name, x]));
  for (const e of expected) {
    const a = byName.get(e.name);
    assert.ok(a, `Missing artifact ${e.name}`);
    assert.equal(a.id, e.id, `${e.name}: artifact ID drift`);
    assert.equal(a.digest, e.digest, `${e.name}: artifact digest drift`);
    assert.equal(a.size, e.size, `${e.name}: artifact size drift`);
    assert.equal(a.runId, e.runId, `${e.name}: artifact run drift`);
    assert.equal(a.runAttempt, e.runAttempt, `${e.name}: artifact attempt drift`);
    assert.equal(a.createdAt, e.createdAt, `${e.name}: artifact creation time drift`);
  }
}
function expectedCurrentArtifacts(sha, runId, attempt, role) {
  if (role === 'candidate-gate') return [
    `generator-candidate-release-${sha}-${runId}-${attempt}`,
    `generator-candidate-qa-${sha}`,
    `generator-toolchain-${sha}-${runId}-${attempt}-candidate-gate`,
  ];
  if (role === 'pr-certification') return [
    `generator-pr-release-${sha}-${runId}-${attempt}`,
    `generator-pr-certification-${sha}`,
    `generator-toolchain-${sha}-${runId}-${attempt}-pr-certification`,
  ];
  throw new Error('Unknown current certification role');
}
function expectedIndependentArtifacts(sha, runId, attempt, role) {
  if (role === 'p5-release-gate') return [
    `p5-r2-${sha}`,
    `generator-toolchain-${sha}-${runId}-${attempt}-p5-release-gate`,
  ];
  if (role === 'journey-e2e') return [
    `journey-e2e-evidence-${sha}`,
    `generator-toolchain-${sha}-${runId}-${attempt}-journey-e2e`,
  ];
  throw new Error('Unknown independent certification role');
}
function collectCertification({ repo, sha, runId, runAttempt, workflow, headBranch, jobName, artifactNames, read, collection }) {
  const run = verifyRun(read(`repos/${repo}/actions/runs/${runId}`), {
    repo, runId, runAttempt, workflow, headSha: sha, headBranch,
  });
  assert.equal(run.status, 'completed', `${jobName} workflow not completed`);
  assert.equal(run.conclusion, 'success', `${jobName} workflow not successful`);
  const jobs = collection(`repos/${repo}/actions/runs/${runId}/attempts/${runAttempt}/jobs`, 'jobs', read);
  const job = verifyJob({ repo, run, jobs, jobName, sha, read });
  const arts = collection(`repos/${repo}/actions/runs/${runId}/artifacts`, 'artifacts', read);
  const artifacts = artifactNames.map(name => artifactRecord(arts, name, runId, runAttempt,
    { startedAt: job.jobStartedAt, completedAt: job.jobCompletedAt }));
  return { workflow, runId: Number(runId), runAttempt: Number(runAttempt), job: jobName, ...job, artifacts };
}
function gitIdentity({ root, sourceSha, preparedMainSha, mergedMainSha, git = runGit, checkoutRole }) {
  exactSha(sourceSha); exactSha(preparedMainSha); exactSha(mergedMainSha);
  const head = git(['rev-parse', 'HEAD'], root);
  if (checkoutRole === 'source') assert.equal(head, sourceSha, 'Producer checkout is not certified source');
  if (checkoutRole === 'main') assert.equal(head, mergedMainSha, 'Consumer checkout is not merged main');
  const sourceTree = git(['rev-parse', `${sourceSha}^{tree}`], root);
  const mergedMainTree = git(['rev-parse', `${mergedMainSha}^{tree}`], root);
  exactSha(sourceTree); exactSha(mergedMainTree);
  assert.equal(mergedMainTree, sourceTree, 'Merged main tree differs from certified candidate tree');
  const parents = git(['show', '-s', '--format=%P', mergedMainSha], root).split(/\s+/).filter(Boolean);
  assert.deepEqual(parents, [preparedMainSha, sourceSha], 'Merged main parents do not match prepared main + certified source');
  return { sourceTree, mergedMainTree, parents };
}
function validatePr(pr, { repo, prNumber, sourceSha, preparedMainSha, mergedMainSha }) {
  assert.equal(pr.number, Number(positiveId(prNumber)));
  assert.equal(pr.state, 'closed');
  assert.equal(pr.merged, true, 'Promotion PR is not merged');
  assert.equal(pr.merge_commit_sha, mergedMainSha, 'PR merge commit differs from merged main');
  assert.equal(pr.head?.repo?.full_name, repo, 'Foreign PR head repository');
  assert.equal(pr.base?.repo?.full_name, repo, 'Foreign PR base repository');
  assert.equal(pr.head?.ref, 'candidate'); assert.equal(pr.base?.ref, 'main');
  assert.equal(pr.head?.sha, sourceSha, 'PR head changed');
  assert.equal(pr.base?.sha, preparedMainSha, 'PR base differs from prepared main');
}
function protectionEvidence(root, repo) {
  const p = path.join(root, 'qa-results/main-protection-p1.json');
  const v = readJson(p);
  assert.equal(v.schema, 'git-main-protection-p1-v2');
  assert.equal(v.status, 'PASS');
  assert.equal(v.repository, repo);
  assert.match(v.evidenceSha256 || '', SHA256);
  return { rulesetId: v.rulesetId, rulesetUpdatedAt: v.rulesetUpdatedAt, evidenceSha256: v.evidenceSha256 };
}
function independentAdmission(root, sourceSha, promotionRunId, promotionAttempt) {
  const p = path.join(root, 'qa-results/independent-admission-p1.json');
  const v = readJson(p);
  assert.equal(v.schema, 'git-independent-admission-p1-v1');
  assert.equal(v.status, 'PASS');
  assert.equal(v.sourceCommit, sourceSha);
  assert.equal(String(v.runId), String(promotionRunId));
  assert.equal(String(v.runAttempt), String(promotionAttempt));
  assert.equal(v.evidence?.length, 2, 'P5 and Journey evidence both required');
  return v;
}
export function createPromotionCertificate({ root = ROOT, env, read = githubRead,
  collection = readCollection, git = runGit, now = Date.now() }) {
  const repo = repositoryName(env.GITHUB_REPOSITORY);
  const sourceSha = exactSha(env.CERTIFIED_SHA);
  const preparedMainSha = exactSha(env.PREPARED_MAIN_SHA);
  const mergedMainSha = exactSha(env.MERGED_MAIN_SHA);
  const prNumber = positiveId(env.PR_NUMBER);
  const runId = positiveId(env.GITHUB_RUN_ID);
  const runAttempt = positiveId(env.GITHUB_RUN_ATTEMPT);
  assert.equal(env.GITHUB_JOB, 'promote', 'Certificate may only be produced by promote job');
  assert.equal(env.GARP27_EXTERNAL_TRUST_SHA256, GARP27_TRUST_SHA256, 'GARP trust pin drift');

  const run = verifyRun(read(`repos/${repo}/actions/runs/${runId}`), {
    repo, runId, runAttempt, workflow: PROMOTION_WORKFLOW, headSha: sourceSha, headBranch: 'candidate',
  });
  assert.equal(run.status, 'in_progress', 'Promotion run must still be active while certificate is produced');
  const mainRef = read(`repos/${repo}/git/ref/heads/main`);
  assert.equal(mainRef.object?.sha, mergedMainSha, 'Main moved after merge; deployment evidence is stale');
  const pr = read(`repos/${repo}/pulls/${prNumber}`);
  validatePr(pr, { repo, prNumber, sourceSha, preparedMainSha, mergedMainSha });
  const gitId = gitIdentity({ root, sourceSha, preparedMainSha, mergedMainSha, git, checkoutRole: 'source' });

  const currentArtifacts = collection(`repos/${repo}/actions/runs/${runId}/artifacts`, 'artifacts', read);
  const jobs = collection(`repos/${repo}/actions/runs/${runId}/attempts/${runAttempt}/jobs`, 'jobs', read);
  const currentCertifications = {};
  for (const jobName of ['candidate-gate', 'pr-certification']) {
    const job = verifyJob({ repo, run: { ...run, status: 'completed', conclusion: 'success' }, jobs, jobName, sha: sourceSha, read });
    const artifacts = expectedCurrentArtifacts(sourceSha, runId, runAttempt, jobName)
      .map(name => artifactRecord(currentArtifacts, name, runId, runAttempt,
        { startedAt: job.jobStartedAt, completedAt: job.jobCompletedAt }));
    currentCertifications[jobName === 'candidate-gate' ? 'candidateGate' : 'prCertification'] = {
      workflow: PROMOTION_WORKFLOW, runId: Number(runId), runAttempt: Number(runAttempt), job: jobName, ...job, artifacts,
    };
  }

  const independent = independentAdmission(root, sourceSha, runId, runAttempt);
  const independentCertifications = {};
  for (const e of independent.evidence) {
    assert.ok(['p5-release-gate.yml', 'journey-e2e.yml'].includes(e.workflow), 'Unexpected independent workflow');
    const role = e.job;
    const cert = collectCertification({ repo, sha: sourceSha, runId: e.runId, runAttempt: e.attempt,
      workflow: `.github/workflows/${e.workflow}`, headBranch: 'candidate', jobName: role,
      artifactNames: expectedIndependentArtifacts(sourceSha, e.runId, e.attempt, role), read, collection });
    assert.equal(cert.jobId, e.jobId, `${role}: independent admission job ID drift`);
    independentCertifications[role === 'p5-release-gate' ? 'p5ReleaseGate' : 'journeyE2E'] = cert;
  }
  assert.ok(independentCertifications.p5ReleaseGate && independentCertifications.journeyE2E,
    'Both independent certifications required');

  // Candidate may legitimately advance after the protected merge. Deployment is bound to the
  // already-certified source/main tree; the later candidate sync has its own compare-and-swap lease.
  const cfg = configDigests(root);
  const certificate = {
    schema: SCHEMA,
    status: 'PASS',
    repository: repo,
    source: { commit: sourceSha, tree: gitId.sourceTree },
    preparedMain: { commit: preparedMainSha },
    mergedMain: { commit: mergedMainSha, tree: gitId.mergedMainTree, parents: gitId.parents },
    pullRequest: { number: Number(prNumber), headSha: sourceSha, baseSha: preparedMainSha, mergeCommitSha: mergedMainSha },
    producer: { workflow: PROMOTION_WORKFLOW, runId: Number(runId), runAttempt: Number(runAttempt), job: PROMOTION_JOB,
      event: run.event, headBranch: run.head_branch, headSha: run.head_sha },
    certifications: { ...currentCertifications, ...independentCertifications },
    protection: protectionEvidence(root, repo),
    trust: { garp27ExternalTrustSha256: GARP27_TRUST_SHA256, configDigests: cfg },
    producedAt: new Date(now).toISOString(),
    maxConsumerAgeSeconds: Math.floor(MAX_CERT_AGE_MS / 1000),
    invariants: [
      'exact-repository-and-workflow-identity', 'exact-run-attempt-job-check-identity',
      'github-actions-app-identity', 'exact-artifact-digests', 'prepared-main-parent-binding',
      'certified-source-tree-equals-merged-main-tree', 'lockfile-and-trust-input-binding',
      'fail-closed-current-main-validation',
    ],
  };
  return certificate;
}
function producerStep(job, name) {
  const steps = (job.steps || []).filter(s => s.name === name);
  assert.equal(steps.length, 1, `Producer step missing/ambiguous: ${name}`);
  return steps[0];
}
function validateProducerActive(run, jobs) {
  assert.equal(run.status, 'in_progress', 'Completed promotion evidence cannot be replayed');
  assert.equal(run.conclusion, null, 'Active promotion run must not have a conclusion');
  const producers = jobs.filter(j => j.name === PROMOTION_JOB);
  assert.equal(producers.length, 1, 'Exactly one promotion producer job required');
  const job = producers[0];
  assert.equal(job.status, 'in_progress', 'Promotion producer must still be active');
  assert.equal(job.conclusion, null, 'Active producer must not have a conclusion');
  for (const name of ['Create P4 promotion certificate', 'Upload P4 promotion certificate']) {
    const s = producerStep(job, name); assert.equal(s.status, 'completed'); assert.equal(s.conclusion, 'success');
  }
  const dispatch = producerStep(job, 'Ensure production deployment runs on merged main');
  assert.equal(dispatch.status, 'in_progress', 'Deployment must be consumed inside the active promotion transaction');
  return job;
}
function verifyCertificateShape(c, { repo, sourceSha, mergedMainSha, runId, runAttempt, artifactName, artifact, now }) {
  assert.equal(c.schema, SCHEMA); assert.equal(c.status, 'PASS'); assert.equal(c.repository, repo);
  assert.equal(c.source?.commit, sourceSha); exactSha(c.source?.tree);
  assert.equal(c.mergedMain?.commit, mergedMainSha); exactSha(c.mergedMain?.tree);
  assert.equal(c.source.tree, c.mergedMain.tree, 'Certificate tree equivalence is false');
  assert.equal(c.producer?.workflow, PROMOTION_WORKFLOW);
  assert.equal(c.producer?.runId, Number(runId)); assert.equal(c.producer?.runAttempt, Number(runAttempt));
  assert.equal(c.producer?.job, PROMOTION_JOB); assert.equal(c.producer?.headSha, sourceSha);
  assert.equal(c.producer?.headBranch, 'candidate');
  assert.match(artifact?.digest || '', /^sha256:[0-9a-f]{64}$/);
  assert.equal(artifact?.name, artifactName);
  const produced = Date.parse(c.producedAt || '');
  assert.ok(Number.isFinite(produced) && produced <= now + 60_000, 'Invalid certificate timestamp');
  assert.ok(now - produced <= MAX_CERT_AGE_MS, 'Promotion certificate is stale/replayed');
  assert.equal(c.maxConsumerAgeSeconds, Math.floor(MAX_CERT_AGE_MS / 1000));
  assert.equal(c.trust?.garp27ExternalTrustSha256, GARP27_TRUST_SHA256);
  assert.ok(Array.isArray(c.trust?.configDigests));
}
function certificationEntries(c) {
  return [
    ['candidateGate', c.certifications?.candidateGate],
    ['prCertification', c.certifications?.prCertification],
    ['p5ReleaseGate', c.certifications?.p5ReleaseGate],
    ['journeyE2E', c.certifications?.journeyE2E],
  ];
}
function revalidateCertification({ repo, sourceSha, record, read, collection }) {
  assert.ok(record, 'Missing certification record');
  const run = verifyRun(read(`repos/${repo}/actions/runs/${record.runId}`), {
    repo, runId: record.runId, runAttempt: record.runAttempt, workflow: record.workflow,
    headSha: sourceSha, headBranch: 'candidate',
  });
  if (record.workflow === PROMOTION_WORKFLOW) {
    assert.equal(run.status, 'in_progress', 'Promotion certification run must still be active');
    assert.equal(run.conclusion, null);
  } else {
    assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success');
  }
  const jobs = collection(`repos/${repo}/actions/runs/${record.runId}/attempts/${record.runAttempt}/jobs`, 'jobs', read);
  const actualJob = verifyJob({ repo, run, jobs, jobName: record.job, sha: sourceSha, read });
  assert.equal(actualJob.jobId, record.jobId, `${record.job}: job ID drift`);
  assert.equal(actualJob.checkId, record.checkId, `${record.job}: check ID drift`);
  assert.equal(actualJob.checkAppId, record.checkAppId, `${record.job}: app identity drift`);
  const arts = collection(`repos/${repo}/actions/runs/${record.runId}/artifacts`, 'artifacts', read);
  const actualArtifacts = record.artifacts.map(e => artifactRecord(arts, e.name, record.runId, record.runAttempt,
    { startedAt: actualJob.jobStartedAt, completedAt: actualJob.jobCompletedAt }));
  verifyArtifactSet(actualArtifacts, record.artifacts);
}
export function validatePromotionCertificate({ root = ROOT, env, certificate, artifact, read = githubRead,
  collection = readCollection, git = runGit, now = Date.now(), producerRun, producerJobs }) {
  const repo = repositoryName(env.GITHUB_REPOSITORY);
  const sourceSha = exactSha(env.CERTIFIED_SHA);
  const mergedMainSha = exactSha(env.MERGED_MAIN_SHA);
  const runId = positiveId(env.PROMOTION_RUN_ID);
  const runAttempt = positiveId(env.PROMOTION_RUN_ATTEMPT);
  const artifactName = safeName(env.PROMOTION_ARTIFACT_NAME);
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Consumer must run on GitHub Actions');
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch', 'Only explicit promotion dispatch may deploy');
  assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Production deploy must target main');
  assert.equal(exactSha(env.GITHUB_SHA), mergedMainSha, 'Workflow-dispatch SHA differs from merged main');
  assert.equal(env.GARP27_EXTERNAL_TRUST_SHA256, GARP27_TRUST_SHA256, 'GARP trust pin drift');

  const run = producerRun || verifyRun(read(`repos/${repo}/actions/runs/${runId}`), {
    repo, runId, runAttempt, workflow: PROMOTION_WORKFLOW, headSha: sourceSha, headBranch: 'candidate',
  });
  const jobs = producerJobs || collection(`repos/${repo}/actions/runs/${runId}/attempts/${runAttempt}/jobs`, 'jobs', read);
  validateProducerActive(run, jobs);
  verifyCertificateShape(certificate, { repo, sourceSha, mergedMainSha, runId, runAttempt, artifactName, artifact, now });
  assert.equal(certificate.producer.event, run.event, 'Producer event drift');

  const mainRef = read(`repos/${repo}/git/ref/heads/main`);
  assert.equal(mainRef.object?.sha, mergedMainSha, 'Main moved after promotion; deploy is stale');
  const gitId = gitIdentity({ root, sourceSha, preparedMainSha: certificate.preparedMain.commit,
    mergedMainSha, git, checkoutRole: 'main' });
  assert.equal(gitId.sourceTree, certificate.source.tree, 'Local certified source tree mismatch');
  assert.equal(gitId.mergedMainTree, certificate.mergedMain.tree, 'Local merged main tree mismatch');
  assert.deepEqual(gitId.parents, certificate.mergedMain.parents, 'Local merge parents mismatch');
  const pr = read(`repos/${repo}/pulls/${certificate.pullRequest.number}`);
  validatePr(pr, { repo, prNumber: certificate.pullRequest.number, sourceSha,
    preparedMainSha: certificate.preparedMain.commit, mergedMainSha });

  const expectedConfig = configDigests(root);
  assert.deepEqual(certificate.trust.configDigests, expectedConfig, 'Dependency/workflow/security input changed since certification');
  for (const [, record] of certificationEntries(certificate)) revalidateCertification({ repo, sourceSha, record, read, collection });

  return {
    schema: CONSUMED_SCHEMA, status: 'PASS', repository: repo,
    certifiedSource: { commit: sourceSha, tree: certificate.source.tree },
    mergedMain: { commit: mergedMainSha, tree: certificate.mergedMain.tree },
    promotion: { runId: Number(runId), runAttempt: Number(runAttempt), artifactName,
      artifactId: artifact.id, artifactDigest: artifact.digest },
    promotionCertificateSha256: sha256(Buffer.from(JSON.stringify(certificate, null, 2) + '\n')),
    validatedAt: new Date(now).toISOString(),
    assurance: 'PREMERGE_CERTIFICATION_REUSED_ONLY_FOR_IDENTICAL_GIT_TREE; FINAL_BUILD_CREATED_FROM_MERGED_MAIN',
  };
}
function defaultDownload({ repo, runId, name, dir }) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  execFileSync('gh', ['run', 'download', String(runId), '--repo', repo, '--name', name, '--dir', dir], {
    cwd: ROOT, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function exactArtifactFromApi({ repo, runId, runAttempt, name, window = null, read = githubRead, collection = readCollection }) {
  const arts = collection(`repos/${repo}/actions/runs/${runId}/artifacts`, 'artifacts', read);
  return artifactRecord(arts, name, runId, runAttempt, window);
}
function regularFile(file) {
  const s = fs.lstatSync(file); assert.ok(s.isFile() && !s.isSymbolicLink(), `${file}: regular file required`); return file;
}
function copyTreeSafe(src, dst) {
  const stat = fs.lstatSync(src); assert.ok(!stat.isSymbolicLink(), 'Symlink forbidden in reused evidence');
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const name of fs.readdirSync(src).sort()) copyTreeSafe(path.join(src, name), path.join(dst, name));
  } else if (stat.isFile()) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
  else throw new Error('Unsupported file in reused evidence');
}
function extractedTreeDigest(root) {
  const files = [];
  const walk = (dir, base = '') => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name), rel = path.posix.join(base, name);
      const stat = fs.lstatSync(full); assert.ok(!stat.isSymbolicLink(), `Symlink forbidden in downloaded evidence: ${rel}`);
      if (stat.isDirectory()) walk(full, rel);
      else if (stat.isFile()) files.push({ path: rel, size: stat.size, sha256: sha256(fs.readFileSync(full)) });
      else throw new Error(`Unsupported downloaded evidence type: ${rel}`);
    }
  };
  walk(root); assert.ok(files.length > 0, 'Downloaded P5 evidence is empty');
  return { fileCount: files.length, sha256: sha256(Buffer.from(JSON.stringify(files))), files };
}
export function materializeReusedEvidence({ root = ROOT, reuseDir }) {
  assert.ok(reuseDir && path.isAbsolute(reuseDir), 'Absolute P4 reuse directory required');
  const certFile = regularFile(path.join(reuseDir, 'p4-promotion-certificate.json'));
  const consumedFile = regularFile(path.join(reuseDir, 'p4-consumed-promotion-evidence.json'));
  const certBytes = fs.readFileSync(certFile);
  const cert = JSON.parse(certBytes.toString('utf8')), consumed = readJson(consumedFile);
  assert.equal(cert.schema, SCHEMA); assert.equal(cert.status, 'PASS');
  assert.equal(consumed.schema, CONSUMED_SCHEMA); assert.equal(consumed.status, 'PASS');
  assert.equal(sha256(certBytes), consumed.promotionCertificateSha256, 'Promotion certificate changed after consumption');
  assert.equal(consumed.certifiedSource.tree, consumed.mergedMain.tree, 'Tree equivalence lost before materialization');
  const pkg = readJson(path.join(root, 'package.json'));
  const p5Root = path.join(reuseDir, 'p5');
  const extracted = extractedTreeDigest(p5Root);
  assert.equal(extracted.sha256, consumed.reusedP5?.extractedSha256, 'Downloaded P5 evidence changed after validation');
  assert.equal(extracted.fileCount, consumed.reusedP5?.fileCount, 'Downloaded P5 evidence file count changed');
  const expectedReports = new Map((consumed.reusedP5?.requiredReports || []).map(x => [x.path, x.sha256]));
  for (const reportName of REQUIRED_P5_REPORTS) {
    const source = regularFile(path.join(p5Root, 'dist', reportName));
    assert.equal(sha256(fs.readFileSync(source)), expectedReports.get(reportName), `${reportName}: reused report digest drift`);
    const report = readJson(source);
    assert.equal(report.appId, 'generator', `${reportName}: appId drift`);
    assert.equal(report.appVersion, pkg.version, `${reportName}: version drift`);
    assert.equal(report.status, 'passed', `${reportName}: premerge P5 did not pass`);
    fs.copyFileSync(source, path.join(root, 'dist', reportName));
  }
  fs.mkdirSync(path.join(root, 'qa-results'), { recursive: true });
  fs.copyFileSync(certFile, path.join(root, 'qa-results/p4-promotion-certificate.json'));
  fs.copyFileSync(consumedFile, path.join(root, 'qa-results/p4-consumed-promotion-evidence.json'));
  const p5Qa = path.join(p5Root, 'qa-results');
  assert.ok(fs.existsSync(p5Qa) && fs.lstatSync(p5Qa).isDirectory(), 'P5 QA evidence directory missing');
  copyTreeSafe(p5Qa, path.join(root, 'qa-results/premerge-p5'));
  return { status: 'PASS', reports: REQUIRED_P5_REPORTS.length, evidenceRoot: 'qa-results/premerge-p5' };
}

async function main() {
  const mode = process.argv[2]; assert.ok(['--produce', '--consume', '--materialize'].includes(mode));
  if (mode === '--produce') {
    const certificate = createPromotionCertificate({ env: process.env });
    fs.mkdirSync('qa-results', { recursive: true });
    fs.writeFileSync('qa-results/p4-promotion-certificate.json', JSON.stringify(certificate, null, 2) + '\n', { flag: 'wx' });
    console.log('PASS P4 promotion certificate: exact certified tree equals merged main tree');
    return;
  }
  if (mode === '--consume') {
    const repo = repositoryName(process.env.GITHUB_REPOSITORY);
    const runId = positiveId(process.env.PROMOTION_RUN_ID), runAttempt = positiveId(process.env.PROMOTION_RUN_ATTEMPT);
    const artifactName = safeName(process.env.PROMOTION_ARTIFACT_NAME);
    const producerRun = verifyRun(githubRead(`repos/${repo}/actions/runs/${runId}`), {
      repo, runId, runAttempt, workflow: PROMOTION_WORKFLOW, headSha: exactSha(process.env.CERTIFIED_SHA), headBranch: 'candidate',
    });
    const producerJobs = readCollection(`repos/${repo}/actions/runs/${runId}/attempts/${runAttempt}/jobs`, 'jobs');
    validateProducerActive(producerRun, producerJobs);
    const artifact = exactArtifactFromApi({ repo, runId, runAttempt, name: artifactName });
    const reuseDir = path.resolve(process.env.P4_REUSE_DIR || path.join(os.tmpdir(), `git-p4-reuse-${process.env.GITHUB_RUN_ID || 'local'}`));
    const certDir = path.join(reuseDir, 'certificate');
    defaultDownload({ repo, runId, name: artifactName, dir: certDir });
    const certPath = regularFile(path.join(certDir, 'p4-promotion-certificate.json'));
    const certBytes = fs.readFileSync(certPath); const certificate = JSON.parse(certBytes.toString('utf8'));
    const consumed = validatePromotionCertificate({ env: process.env, certificate, artifact, producerRun, producerJobs });
    consumed.promotionCertificateSha256 = sha256(certBytes);
    fs.rmSync(path.join(reuseDir, 'p4-promotion-certificate.json'), { force: true });
    fs.copyFileSync(certPath, path.join(reuseDir, 'p4-promotion-certificate.json'));
    const p5 = certificate.certifications.p5ReleaseGate;
    const p5Full = p5.artifacts.find(a => a.name === `p5-r2-${certificate.source.commit}`);
    assert.ok(p5Full, 'Certified P5 full evidence artifact missing');
    const currentP5 = exactArtifactFromApi({ repo, runId: p5.runId, runAttempt: p5.runAttempt, name: p5Full.name,
      window: { startedAt: p5.jobStartedAt, completedAt: p5.jobCompletedAt } });
    assert.equal(currentP5.id, p5Full.id); assert.equal(currentP5.digest, p5Full.digest); assert.equal(currentP5.size, p5Full.size);
    const p5Dir = path.join(reuseDir, 'p5');
    defaultDownload({ repo, runId: p5.runId, name: p5Full.name, dir: p5Dir });
    const extracted = extractedTreeDigest(p5Dir);
    const requiredReports = REQUIRED_P5_REPORTS.map(name => ({
      path: name, sha256: digestFile(path.join(p5Dir, 'dist'), name),
    }));
    consumed.reusedP5 = {
      runId: p5.runId, runAttempt: p5.runAttempt, artifactId: p5Full.id, artifactName: p5Full.name,
      artifactDigest: p5Full.digest, extractedSha256: extracted.sha256, fileCount: extracted.fileCount, requiredReports,
    };
    fs.writeFileSync(path.join(reuseDir, 'p4-consumed-promotion-evidence.json'), JSON.stringify(consumed, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'PASS', reuseDir, certificateSha256: consumed.promotionCertificateSha256,
      p5ExtractedSha256: extracted.sha256, sourceTree: consumed.certifiedSource.tree, mergedMain: consumed.mergedMain.commit }, null, 2));
    return;
  }
  const result = materializeReusedEvidence({ reuseDir: path.resolve(process.env.P4_REUSE_DIR || '') });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('BLOCKED P4 evidence:', error.message); process.exitCode = 1; });
}
