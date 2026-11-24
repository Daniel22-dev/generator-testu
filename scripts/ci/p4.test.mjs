import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  ACTIONS_APP_ID, CONFIG_PATHS, GARP27_TRUST_SHA256, PROMOTION_JOB, PROMOTION_WORKFLOW,
  REQUIRED_P5_REPORTS, SCHEMA, createPromotionCertificate, validatePromotionCertificate,
  materializeReusedEvidence, validatePremergeReadiness,
} from './p4-promotion-evidence.mjs';
import { buildPlan } from './preflight.mjs';
import { approvalStatement, RELEASE_SCOPE } from './release-authorization.mjs';
import {
  assertP4ConsumedPromotionEvidence,
  P4_CONSUMED_PROMOTION_EVIDENCE_SCHEMA,
} from './p4-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = c => c.repeat(40);
const sha256 = c => c.repeat(64);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = sha('a'), base = sha('b'), merged = sha('c'), tree = sha('d');
const repo = 'synthetic/fixture';
const promotionRunId = 1001, promotionAttempt = 1, p5RunId = 2001, journeyRunId = 3001;
const prNumber = 77;
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

test('P4 promotion trust pin matches the reviewed current GARP anchor', () => {
  const expected = hash(fs.readFileSync(path.join(ROOT, 'security/garp27/trust-anchor.json')));
  const consumer = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ci-standard/consumers/generator-testu.json'), 'utf8'));
  const pin = consumer.trustInputs.find(input => input.environment === 'GARP27_EXTERNAL_TRUST_SHA256')?.sha256;
  assert.equal(pin, expected, 'CI consumer trust pin must match current GARP anchor');
  assert.equal(GARP27_TRUST_SHA256, expected, 'P4 promotion must use current reviewed GARP pin');
});

test('P4 release identity accepts only the current consumed-evidence schema', () => {
  const current = { schema: P4_CONSUMED_PROMOTION_EVIDENCE_SCHEMA, status: 'PASS' };
  assert.equal(assertP4ConsumedPromotionEvidence(current), current);
  assert.throws(
    () => assertP4ConsumedPromotionEvidence({ ...current, schema: 'git-p4-consumed-promotion-evidence-v1' }),
    /Invalid P4 consumed evidence schema/,
  );
  assert.throws(
    () => assertP4ConsumedPromotionEvidence({ ...current, status: 'FAIL' }),
    /Invalid P4 consumed evidence status/,
  );
});


function tempRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-p4-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const rel of CONFIG_PATHS) {
    const src = path.join(ROOT, rel), dst = path.join(root, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
  }
  fs.mkdirSync(path.join(root, 'qa-results'), { recursive: true });
  fs.writeFileSync(path.join(root, 'qa-results/main-protection-p1.json'), JSON.stringify({
    schema: 'git-main-protection-p1-v2', status: 'PASS', repository: repo,
    rulesetId: 23603155, rulesetUpdatedAt: '2026-10-06T18:33:10.701Z', evidenceSha256: sha256('1'),
  }));
  fs.writeFileSync(path.join(root, 'qa-results/independent-admission-p1.json'), JSON.stringify({
    schema: 'git-independent-admission-p1-v1', status: 'PASS', sourceCommit: source,
    runId: String(promotionRunId), runAttempt: String(promotionAttempt), evidence: [
      { workflow: 'p5-release-gate.yml', job: 'p5-release-gate', runId: p5RunId, attempt: 1, jobId: 21, sha: source },
      { workflow: 'journey-e2e.yml', job: 'journey-e2e', runId: journeyRunId, attempt: 1, jobId: 31, sha: source },
    ],
  }));
  const p5EvidenceRoot = path.join(root, 'premerge-p5');
  fs.mkdirSync(path.join(p5EvidenceRoot, 'dist'), { recursive: true });
  for (const name of REQUIRED_P5_REPORTS) {
    fs.writeFileSync(path.join(p5EvidenceRoot, 'dist', name), JSON.stringify({
      appId: 'generator', appVersion: version, status: 'passed',
    }));
  }
  return { root, p5EvidenceRoot };
}
function runObj(id, attempt, workflow, status = 'completed', conclusion = 'success') {
  return { id, run_attempt: attempt, path: workflow, head_sha: source, head_branch: 'candidate', event: 'push',
    status, conclusion, repository: { full_name: repo }, head_repository: { full_name: repo } };
}
function jobObj(id, runId, attempt, name, status = 'completed', conclusion = 'success', steps = []) {
  return { id, run_id: runId, run_attempt: attempt, head_sha: source, name, status, conclusion,
    started_at: '2026-10-06T19:00:00Z', completed_at: '2026-10-06T20:00:00Z',
    check_run_url: `https://api.github.com/repos/${repo}/check-runs/${id}`, steps };
}
function checkObj(id, name, appId = ACTIONS_APP_ID, head = source) {
  return { id, name, head_sha: head, app: { id: appId }, status: 'completed', conclusion: 'success' };
}
function artifact(id, name, runId, digest = `sha256:${sha256(String((id % 9) + 1))}`) {
  return { id, name, size_in_bytes: 100 + id, expired: false, created_at: '2026-10-06T19:30:00Z', expires_at: '2027-01-01T00:00:00Z', digest,
    workflow_run: { id: runId } };
}
function fixture(t, { candidateSha = source } = {}) {
  const { root, p5EvidenceRoot } = tempRoot(t);
  const currentArtifacts = [
    artifact(101, `generator-candidate-release-${source}-${promotionRunId}-${promotionAttempt}`, promotionRunId),
    artifact(102, `generator-candidate-qa-${source}`, promotionRunId),
    artifact(103, `generator-toolchain-${source}-${promotionRunId}-${promotionAttempt}-candidate-gate`, promotionRunId),
    artifact(104, `generator-pr-release-${source}-${promotionRunId}-${promotionAttempt}`, promotionRunId),
    artifact(105, `generator-pr-certification-${source}`, promotionRunId),
    artifact(106, `generator-toolchain-${source}-${promotionRunId}-${promotionAttempt}-pr-certification`, promotionRunId),
    artifact(107, `generator-premerge-admission-${source}-${promotionRunId}-${promotionAttempt}`, promotionRunId),
  ];
  const p5Artifacts = [artifact(201, `p5-r2-${source}`, p5RunId), artifact(202, `generator-toolchain-${source}-${p5RunId}-1-p5-release-gate`, p5RunId)];
  const journeyArtifacts = [artifact(301, `journey-e2e-evidence-${source}`, journeyRunId), artifact(302, `generator-toolchain-${source}-${journeyRunId}-1-journey-e2e`, journeyRunId)];
  const producerSteps = [
    { name: 'Create P4 promotion certificate', status: 'completed', conclusion: 'success' },
    { name: 'Upload P4 promotion certificate', status: 'completed', conclusion: 'success' },
    { name: 'Ensure production deployment runs on merged main', status: 'in_progress', conclusion: null },
  ];
  const jobs = {
    [promotionRunId]: [
      jobObj(11, promotionRunId, promotionAttempt, 'candidate-gate'),
      jobObj(12, promotionRunId, promotionAttempt, 'pr-certification'),
      jobObj(13, promotionRunId, promotionAttempt, PROMOTION_JOB, 'in_progress', null, producerSteps),
      jobObj(14, promotionRunId, promotionAttempt, 'release-admission'),
    ],
    [p5RunId]: [jobObj(21, p5RunId, 1, 'p5-release-gate')],
    [journeyRunId]: [jobObj(31, journeyRunId, 1, 'journey-e2e')],
  };
  const runs = {
    [promotionRunId]: runObj(promotionRunId, promotionAttempt, PROMOTION_WORKFLOW, 'in_progress', null),
    [p5RunId]: runObj(p5RunId, 1, '.github/workflows/p5-release-gate.yml'),
    [journeyRunId]: runObj(journeyRunId, 1, '.github/workflows/journey-e2e.yml'),
  };
  const artifacts = { [promotionRunId]: currentArtifacts, [p5RunId]: p5Artifacts, [journeyRunId]: journeyArtifacts };
  const checks = { 11: checkObj(11, 'candidate-gate'), 12: checkObj(12, 'pr-certification'), 14: checkObj(14, 'release-admission'), 21: checkObj(21, 'p5-release-gate'), 31: checkObj(31, 'journey-e2e') };
  const pr = { number: prNumber, state: 'closed', merged: true, merge_commit_sha: merged,
    head: { ref: 'candidate', sha: source, repo: { full_name: repo } },
    base: { ref: 'main', sha: base, repo: { full_name: repo } } };
  const authExpected = { repository: repo, prNumber, sourceSha: source, sourceTree: tree,
    preparedMainSha: base, mergedMainSha: merged, version, scope: RELEASE_SCOPE };
  const reviews = [{ id: 901, node_id: 'PRR_fixture_901',
    html_url: `https://github.com/${repo}/pull/${prNumber}#pullrequestreview-901`,
    user: { login: 'synthetic', type: 'User' }, author_association: 'OWNER', state: 'APPROVED',
    commit_id: source, submitted_at: '2026-10-06T19:45:00Z', body: approvalStatement(authExpected) }];
  const ref = { main: { ref: 'refs/heads/main', object: { type: 'commit', sha: merged } },
    candidate: { ref: 'refs/heads/candidate', object: { type: 'commit', sha: candidateSha } } };
  const read = endpoint => {
    let m;
    if ((m = endpoint.match(/actions\/runs\/(\d+)$/))) return structuredClone(runs[Number(m[1])]);
    if ((m = endpoint.match(/check-runs\/(\d+)$/))) return structuredClone(checks[Number(m[1])]);
    if (endpoint.endsWith(`pulls/${prNumber}`)) return structuredClone(pr);
    if (endpoint.endsWith('git/ref/heads/main')) return structuredClone(ref.main);
    if (endpoint.endsWith('git/ref/heads/candidate')) return structuredClone(ref.candidate);
    if (endpoint.endsWith(`git/commits/${source}`)) return { sha: source, tree: { sha: tree } };
    throw new Error('Unexpected read ' + endpoint);
  };
  const collection = (endpoint, key) => {
    let m;
    if ((m = endpoint.match(/actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs/))) return structuredClone(jobs[Number(m[1])]);
    if ((m = endpoint.match(/actions\/runs\/(\d+)\/artifacts/))) return structuredClone(artifacts[Number(m[1])]);
    if (endpoint.endsWith(`pulls/${prNumber}/reviews`)) return structuredClone(reviews);
    throw new Error('Unexpected collection ' + endpoint + ' ' + key);
  };
  const git = args => {
    const key = args.join(' ');
    if (key === 'rev-parse HEAD') return source;
    if (key === `rev-parse ${source}^{tree}`) return tree;
    if (key === `rev-parse ${merged}^{tree}`) return tree;
    if (key === `show -s --format=%P ${merged}`) return `${base} ${source}`;
    throw new Error('Unexpected git ' + key);
  };
  const producerEnv = { GITHUB_REPOSITORY: repo, CERTIFIED_SHA: source, PREPARED_MAIN_SHA: base, MERGED_MAIN_SHA: merged,
    PR_NUMBER: String(prNumber), GITHUB_RUN_ID: String(promotionRunId), GITHUB_RUN_ATTEMPT: String(promotionAttempt),
    GITHUB_JOB: 'promote', GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/candidate', GITHUB_SHA: source,
    RELEASE_SCOPE, GARP27_EXTERNAL_TRUST_SHA256: GARP27_TRUST_SHA256 };
  const now = Date.parse('2026-10-06T20:00:00Z');
  const certificate = createPromotionCertificate({ root, env: producerEnv, read, collection, git, now });
  const certArtifact = artifact(401, `generator-p4-promotion-${merged}-${promotionRunId}-${promotionAttempt}`, promotionRunId, `sha256:${sha256('9')}`);
  artifacts[promotionRunId].push(certArtifact);
  const consumerEnv = { GITHUB_REPOSITORY: repo, CERTIFIED_SHA: source, MERGED_MAIN_SHA: merged,
    PROMOTION_RUN_ID: String(promotionRunId), PROMOTION_RUN_ATTEMPT: String(promotionAttempt), PROMOTION_ARTIFACT_NAME: certArtifact.name,
    GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_SHA: merged,
    RELEASE_SCOPE, GARP27_EXTERNAL_TRUST_SHA256: GARP27_TRUST_SHA256 };
  const consumerGit = args => {
    const key = args.join(' ');
    if (key === 'rev-parse HEAD') return merged;
    return git(args);
  };
  return { root, p5EvidenceRoot, runs, jobs, artifacts, checks, pr, reviews, ref, read, collection, git, consumerGit, producerEnv, consumerEnv, now, certificate, certArtifact };
}

test('P4 producer creates exact-tree, exact-run, exact-artifact certificate', t => {
  const f = fixture(t), c = f.certificate;
  assert.equal(c.schema, SCHEMA); assert.equal(c.status, 'PASS');
  assert.equal(c.source.commit, source); assert.equal(c.source.tree, tree); assert.equal(c.mergedMain.tree, tree);
  assert.deepEqual(c.mergedMain.parents, [base, source]);
  assert.equal(c.certifications.candidateGate.checkAppId, ACTIONS_APP_ID);
  assert.equal(c.certifications.p5ReleaseGate.runId, p5RunId);
  assert.equal(c.trust.garp27ExternalTrustSha256, GARP27_TRUST_SHA256);
  assert.equal(c.trust.configDigests.length, CONFIG_PATHS.length);
  assert.equal(c.authorization.status, 'PASS');
  assert.equal(c.authorization.approval.reviewId, 901);
});

function makePremerge(f) {
  f.pr.state = 'open';
  f.pr.merged = false;
  f.pr.merge_commit_sha = null;
  f.ref.main.object.sha = base;
  f.reviews[0].body = approvalStatement({ repository: repo, prNumber, sourceSha: source,
    sourceTree: tree, preparedMainSha: base, version, scope: RELEASE_SCOPE });
  return f;
}

test('P4 premerge readiness authenticates the complete attempt-1 evidence chain', t => {
  const f = makePremerge(fixture(t));
  const result = validatePremergeReadiness({ root: f.root, env: f.producerEnv,
    read: f.read, collection: f.collection, git: f.git, p5EvidenceRoot: f.p5EvidenceRoot });
  assert.equal(result.status, 'PASS');
  assert.equal(result.schema, 'git-p4-premerge-readiness-v1');
  assert.equal(result.producer.runAttempt, 1);
  assert.equal(result.currentCertifications['release-admission'].checkAppId, ACTIONS_APP_ID);
  assert.equal(result.independentCertifications.length, 2);
  assert.equal(result.p5Evidence.requiredReports.length, REQUIRED_P5_REPORTS.length);
  assert.equal(result.trust.configDigests.length, CONFIG_PATHS.length);
  assert.equal(result.trust.garp27ExternalTrustSha256, GARP27_TRUST_SHA256);
});

const premergeMutations = [
  ['workflow dispatch origin', f => { f.producerEnv.GITHUB_EVENT_NAME = 'workflow_dispatch'; }],
  ['rerun attempt', f => { f.producerEnv.GITHUB_RUN_ATTEMPT = '2'; }],
  ['main drift', f => { f.ref.main.object.sha = sha('e'); }],
  ['missing release admission artifact', f => { f.artifacts[promotionRunId] = f.artifacts[promotionRunId].filter(a => !a.name.startsWith('generator-premerge-admission-')); }],
  ['foreign release admission app', f => { f.checks[14].app.id = 999; }],
  ['independent workflow rerun evidence', f => {
    const file = path.join(f.root, 'qa-results/independent-admission-p1.json');
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8')); evidence.evidence[0].attempt = 2;
    fs.writeFileSync(file, JSON.stringify(evidence));
  }],
  ['two P5 certifications without Journey', f => {
    const file = path.join(f.root, 'qa-results/independent-admission-p1.json');
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    evidence.evidence[1] = { ...evidence.evidence[0], runId: journeyRunId, jobId: 31 };
    fs.writeFileSync(file, JSON.stringify(evidence));
  }],
  ['two Journey certifications without P5', f => {
    const file = path.join(f.root, 'qa-results/independent-admission-p1.json');
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    evidence.evidence[0] = { ...evidence.evidence[1], runId: p5RunId, jobId: 21 };
    fs.writeFileSync(file, JSON.stringify(evidence));
  }],
  ['independent workflow and job role mismatch', f => {
    const file = path.join(f.root, 'qa-results/independent-admission-p1.json');
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    evidence.evidence[0].workflow = 'journey-e2e.yml';
    fs.writeFileSync(file, JSON.stringify(evidence));
  }],
  ['missing required configuration file', f => { fs.rmSync(path.join(f.root, CONFIG_PATHS[0])); }],
  ['invalid GARP trust input', f => { f.producerEnv.GARP27_EXTERNAL_TRUST_SHA256 = sha256('8'); }],
  ['missing required P5 report', f => { fs.rmSync(path.join(f.p5EvidenceRoot, 'dist', REQUIRED_P5_REPORTS[0])); }],
];
for (const [name, mutate] of premergeMutations) test(`P4 premerge readiness rejects ${name}`, t => {
  const f = makePremerge(fixture(t)); mutate(f);
  assert.throws(() => validatePremergeReadiness({ root: f.root, env: f.producerEnv,
    read: f.read, collection: f.collection, git: f.git, p5EvidenceRoot: f.p5EvidenceRoot }));
});

test('P4 premerge and producer share independent-role and deterministic-input validation', t => {
  const duplicate = fixture(t);
  const admissionFile = path.join(duplicate.root, 'qa-results/independent-admission-p1.json');
  const admission = JSON.parse(fs.readFileSync(admissionFile, 'utf8'));
  admission.evidence[1] = { ...admission.evidence[0], runId: journeyRunId, jobId: 31 };
  fs.writeFileSync(admissionFile, JSON.stringify(admission));
  assert.throws(() => createPromotionCertificate({ root: duplicate.root, env: duplicate.producerEnv,
    read: duplicate.read, collection: duplicate.collection, git: duplicate.git, now: duplicate.now }));

  const missingConfig = fixture(t);
  fs.rmSync(path.join(missingConfig.root, CONFIG_PATHS.at(-1)));
  assert.throws(() => createPromotionCertificate({ root: missingConfig.root, env: missingConfig.producerEnv,
    read: missingConfig.read, collection: missingConfig.collection, git: missingConfig.git, now: missingConfig.now }));
});



test('P4 producer keeps deployment valid when candidate advances only after the protected merge', t => {
  const f = fixture(t, { candidateSha: sha('f') });
  assert.equal(f.certificate.status, 'PASS');
  assert.equal(f.certificate.source.commit, source);
  assert.equal(f.certificate.mergedMain.commit, merged);
  assert.notEqual(f.ref.candidate.object.sha, source);
});

test('P4 consumer admits active promotion and identical main tree', t => {
  const f = fixture(t);
  const result = validatePromotionCertificate({ root: f.root, env: f.consumerEnv, certificate: f.certificate,
    artifact: f.certArtifact, read: f.read, collection: f.collection, git: f.consumerGit, now: f.now + 60_000,
    producerRun: f.runs[promotionRunId], producerJobs: f.jobs[promotionRunId] });
  assert.equal(result.status, 'PASS'); assert.equal(result.certifiedSource.tree, tree); assert.equal(result.mergedMain.commit, merged);
});

const mutations = [
  ['evidence belongs to another SHA', f => { f.certificate.source.commit = sha('e'); }],
  ['same source but different tree digest', f => { f.certificate.source.tree = sha('e'); }],
  ['merge tree differs from certified tree', f => { f.certificate.mergedMain.tree = sha('e'); }],
  ['main changed after merge', f => { f.ref.main.object.sha = sha('e'); }],
  ['PR head changed', f => { f.pr.head.sha = sha('e'); }],
  ['old retry attempt', f => { f.runs[promotionRunId].run_attempt = promotionAttempt + 1; }],
  ['foreign workflow repository', f => { f.runs[promotionRunId].repository.full_name = 'evil/fork'; }],
  ['foreign GitHub check app', f => { f.checks[11].app.id = 999; }],
  ['missing certification evidence', f => { delete f.certificate.certifications.p5ReleaseGate; }],
  ['artifact digest changed', f => { f.artifacts[p5RunId][0].digest = `sha256:${sha256('8')}`; }],
  ['lockfile or workflow digest changed', f => { f.certificate.trust.configDigests[0].sha256 = sha256('8'); }],
  ['GARP trust anchor changed', f => { f.certificate.trust.garp27ExternalTrustSha256 = sha256('8'); }],
  ['completed producer replay', f => { f.runs[promotionRunId].status = 'completed'; f.runs[promotionRunId].conclusion = 'success'; }],
  ['producer no longer dispatching this deploy', f => { const s=f.jobs[promotionRunId][2].steps[2]; s.status='completed'; s.conclusion='success'; }],
  ['stale certificate', f => { f.certificate.producedAt = new Date(f.now - 31 * 60_000).toISOString(); }],
  ['dismissed owner approval', f => { f.reviews.push({ ...f.reviews[0], id: 902, state: 'DISMISSED' }); }],
  ['authorization certificate tampering', f => { f.certificate.authorization.scope = 'UNRESTRICTED'; }],
];
for (const [name, mutate] of mutations) test(`P4 consumer rejects ${name}`, t => {
  const f = fixture(t); mutate(f);
  assert.throws(() => validatePromotionCertificate({ root: f.root, env: f.consumerEnv, certificate: f.certificate,
    artifact: f.certArtifact, read: f.read, collection: f.collection, git: f.consumerGit, now: f.now + 60_000,
    producerRun: f.runs[promotionRunId], producerJobs: f.jobs[promotionRunId] }));
});

test('P4 materialization copies only verified P5 reports and names reused evidence explicitly', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-p4-materialize-root-'));
  const reuse = fs.mkdtempSync(path.join(os.tmpdir(), 'git-p4-materialize-reuse-'));
  t.after(() => { fs.rmSync(root,{recursive:true,force:true}); fs.rmSync(reuse,{recursive:true,force:true}); });
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true }); fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({version:'7.1.96'}));
  const certBytes = Buffer.from(JSON.stringify({schema:SCHEMA,status:'PASS'}));
  fs.writeFileSync(path.join(reuse, 'p4-promotion-certificate.json'), certBytes);
  fs.mkdirSync(path.join(reuse, 'p5/dist'), { recursive: true }); fs.mkdirSync(path.join(reuse, 'p5/qa-results'), { recursive: true });
  const requiredReports=[];
  for (const name of REQUIRED_P5_REPORTS) {
    const bytes=Buffer.from(JSON.stringify({appId:'generator',appVersion:'7.1.96',status:'passed'}));
    fs.writeFileSync(path.join(reuse, 'p5/dist', name), bytes); requiredReports.push({path:name,sha256:hash(bytes)});
  }
  fs.writeFileSync(path.join(reuse, 'p5/qa-results/evidence.json'), JSON.stringify({status:'PASS'}));
  const rows=[];
  const walk=(dir,base='')=>{for(const name of fs.readdirSync(dir).sort()){const full=path.join(dir,name),rel=path.posix.join(base,name),st=fs.lstatSync(full); if(st.isDirectory())walk(full,rel); else rows.push({path:rel,size:st.size,sha256:hash(fs.readFileSync(full))});}};
  walk(path.join(reuse,'p5'));
  fs.writeFileSync(path.join(reuse, 'p4-consumed-promotion-evidence.json'), JSON.stringify({
    schema:'git-p4-consumed-promotion-evidence-v2',status:'PASS',certifiedSource:{tree},mergedMain:{tree},
    promotionCertificateSha256:hash(certBytes),reusedP5:{extractedSha256:hash(Buffer.from(JSON.stringify(rows))),fileCount:rows.length,requiredReports}
  }));
  const r = materializeReusedEvidence({ root, reuseDir: reuse });
  assert.equal(r.status, 'PASS');
  for (const name of REQUIRED_P5_REPORTS) assert.ok(fs.existsSync(path.join(root, 'dist', name)));
  assert.ok(fs.existsSync(path.join(root, 'qa-results/premerge-p5/evidence.json')));
});


test('P4 regression suite is mandatory in the complete preflight', t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'git-p4-preflight-plan-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const plan = buildPlan({ root: ROOT, out, env: {} });
  const orchestration = plan.find(step => step.id === 'ci-orchestration-tests');
  assert.ok(orchestration, 'Complete preflight must contain orchestration regression tests');
  assert.ok(orchestration.command.includes('scripts/ci/p4.test.mjs'), 'Complete preflight must execute P4 regressions');
});

test('P4 consumer ignores same-name artifact from a previous retry attempt', t => {
  const f = fixture(t);
  const current = f.artifacts[p5RunId][0];
  f.artifacts[p5RunId].unshift({ ...structuredClone(current), id: 991, created_at: '2026-10-06T18:30:00Z', digest: `sha256:${sha256('7')}` });
  const result = validatePromotionCertificate({ root: f.root, env: f.consumerEnv, certificate: f.certificate,
    artifact: f.certArtifact, read: f.read, collection: f.collection, git: f.consumerGit, now: f.now + 60_000,
    producerRun: f.runs[promotionRunId], producerJobs: f.jobs[promotionRunId] });
  assert.equal(result.status, 'PASS');
});

test('P4 consumer rejects evidence when only a stale retry artifact matches by name', t => {
  const f = fixture(t);
  f.artifacts[p5RunId][0].created_at = '2026-10-06T18:30:00Z';
  assert.throws(() => validatePromotionCertificate({ root: f.root, env: f.consumerEnv, certificate: f.certificate,
    artifact: f.certArtifact, read: f.read, collection: f.collection, git: f.consumerGit, now: f.now + 60_000,
    producerRun: f.runs[promotionRunId], producerJobs: f.jobs[promotionRunId] }));
});
