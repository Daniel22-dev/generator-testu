#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const qaResults = path.join(root, 'qa-results');
const pkgPath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const manifestPath = path.join(dist, 'studio-manifest.json');
const sbomPath = path.join(dist, 'sbom.cdx.json');
const provenancePath = path.join(dist, 'build-provenance.json');
const evidencePath = path.join(dist, 'security-evidence-manifest.json');
const integrityPath = path.join(dist, 'release-integrity.json');
const p4AssurancePath = path.join(dist, 'p4-premerge-assurance.json');
const APP_ID = 'generator';
const RELEASE_CONTRACT = 'ghrab-release-integrity-v2';
const ASSURANCE_MODE = 'TRANSITIONAL';
const SHA40 = /^[0-9a-f]{40}$/i;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA256 = /^[0-9a-f]{64}$/i;

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const ensureFile = (file) => {
  assert(fs.existsSync(file) && fs.statSync(file).isFile(), `Missing required file: ${path.relative(root, file)}`);
};
const runNode = (args, env = process.env) => {
  execFileSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
};

ensureFile(pkgPath);
ensureFile(lockPath);
ensureFile(manifestPath);
ensureFile(path.join(dist, 'index.html'));
for (const reportName of ['qa-p5-release-report.json', 'qa-p5-acceptance-report.json', 'qa-p5-runtime-report.json', 'qa-p5-axe-runtime-report.json']) {
  ensureFile(path.join(dist, reportName));
}
assert(fs.existsSync(qaResults) && fs.statSync(qaResults).isDirectory(), 'Missing qa-results directory. Release identity is fail-closed without current QA evidence.');
const qaFiles = fs.readdirSync(qaResults, { recursive: true }).filter((entry) => {
  const full = path.join(qaResults, String(entry));
  return fs.existsSync(full) && fs.statSync(full).isFile();
});
assert(qaFiles.length > 0, 'qa-results is empty. Release identity is fail-closed without current QA evidence.');

const pkgBytes = fs.readFileSync(pkgPath);
const pkg = JSON.parse(pkgBytes.toString('utf8'));
const sourceCommit = String(process.env.GHRAB_SOURCE_COMMIT || process.env.GITHUB_SHA || '').trim().toLowerCase();
const sourceRepository = String(process.env.GHRAB_SOURCE_REPOSITORY || process.env.GITHUB_REPOSITORY || '').trim();
const buildId = String(process.env.GHRAB_BUILD_ID || [process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT].filter(Boolean).join('-') || '').trim();
const p4EvidenceRel = String(process.env.GHRAB_P4_CONSUMED_EVIDENCE || '').trim();
let p4Evidence = null;
let p4Assurance = null;
assert(SHA40.test(sourceCommit), 'GHRAB_SOURCE_COMMIT/GITHUB_SHA must be an exact 40-character Git commit SHA.');
assert(REPOSITORY.test(sourceRepository), 'GHRAB_SOURCE_REPOSITORY/GITHUB_REPOSITORY must be owner/repository.');
assert(/^\d+\.\d+\.\d+$/.test(String(pkg.version || '')), `package.json version must be stable SemVer, got ${pkg.version || '?'}`);
assert(buildId, 'GHRAB_BUILD_ID or GitHub run identity is required.');
const sourcePackageSha256 = sha256(pkgBytes);
if (p4EvidenceRel) {
  assert(!path.isAbsolute(p4EvidenceRel) && !p4EvidenceRel.split(/[\\/]+/).includes('..'), 'P4 evidence path must be repository-relative');
  const p4EvidencePath = path.resolve(root, p4EvidenceRel);
  assert(p4EvidencePath.startsWith(root + path.sep), 'P4 evidence must stay inside repository root');
  ensureFile(p4EvidencePath);
  p4Evidence = readJson(p4EvidencePath);
  assert(p4Evidence.schema === 'git-p4-consumed-promotion-evidence-v1' && p4Evidence.status === 'PASS', 'Invalid P4 consumed evidence contract');
  assert(String(p4Evidence.repository || '').toLowerCase() === sourceRepository.toLowerCase(), 'P4 evidence repository drift');
  assert(String(p4Evidence.mergedMain?.commit || '').toLowerCase() === sourceCommit, 'P4 evidence belongs to another merged main commit');
  assert(SHA40.test(p4Evidence.certifiedSource?.commit || ''), 'P4 certified source SHA missing');
  assert(SHA40.test(p4Evidence.certifiedSource?.tree || '') && SHA40.test(p4Evidence.mergedMain?.tree || ''), 'P4 tree identity missing');
  assert(p4Evidence.certifiedSource.tree === p4Evidence.mergedMain.tree, 'P4 source/main tree equivalence is false');
  assert(SHA256.test(p4Evidence.promotionCertificateSha256 || ''), 'P4 promotion certificate digest missing');
  assert(/^sha256:[0-9a-f]{64}$/.test(p4Evidence.promotion?.artifactDigest || ''), 'P4 GitHub artifact digest missing');
  assert(/^sha256:[0-9a-f]{64}$/.test(p4Evidence.reusedP5?.artifactDigest || ''), 'P4 reused P5 artifact digest missing');
  assert(SHA256.test(p4Evidence.reusedP5?.extractedSha256 || ''), 'P4 reused P5 extracted digest missing');
  assert(Array.isArray(p4Evidence.reusedP5?.requiredReports) && p4Evidence.reusedP5.requiredReports.length === 4, 'P4 reused P5 report digest set incomplete');
  p4Assurance = {
    schema: 'ghrab-p4-premerge-assurance-v1',
    status: 'PASS',
    repository: sourceRepository,
    certifiedSourceCommit: p4Evidence.certifiedSource.commit,
    certifiedSourceTree: p4Evidence.certifiedSource.tree,
    mergedMainCommit: p4Evidence.mergedMain.commit,
    mergedMainTree: p4Evidence.mergedMain.tree,
    promotionRunId: p4Evidence.promotion.runId,
    promotionRunAttempt: p4Evidence.promotion.runAttempt,
    promotionArtifactDigest: p4Evidence.promotion.artifactDigest,
    promotionCertificateSha256: p4Evidence.promotionCertificateSha256,
    reusedP5ArtifactDigest: p4Evidence.reusedP5.artifactDigest,
    reusedP5ExtractedSha256: p4Evidence.reusedP5.extractedSha256,
    reusedP5RequiredReports: p4Evidence.reusedP5.requiredReports,
    validatedAt: p4Evidence.validatedAt,
    assurance: p4Evidence.assurance,
    finalBuildPolicy: 'AUTHORITATIVE_BUILD_CREATED_FROM_MERGED_MAIN_AFTER_EXACT_TREE_EVIDENCE_VALIDATION',
  };
  fs.writeFileSync(p4AssurancePath, JSON.stringify(p4Assurance, null, 2) + '\n', 'utf8');
}
for (const reportName of ['qa-p5-release-report.json', 'qa-p5-acceptance-report.json', 'qa-p5-runtime-report.json', 'qa-p5-axe-runtime-report.json']) {
  const reportPath = path.join(dist, reportName);
  if (p4Assurance) {
    const expected = p4Assurance.reusedP5RequiredReports.find(x => x.path === reportName);
    assert(expected && SHA256.test(expected.sha256), `${reportName}: P4 reused report digest missing`);
    assert(sha256(fs.readFileSync(reportPath)) === expected.sha256, `${reportName}: P4 reused report digest drift`);
  }
  const report = readJson(reportPath);
  assert(report.appId === APP_ID, `${reportName} appId drift: ${report.appId || '?'} != ${APP_ID}`);
  assert(report.appVersion === pkg.version, `${reportName} version drift: ${report.appVersion || '?'} != ${pkg.version}`);
  assert(report.status === 'passed', `${reportName} is not passed.`);
}

// Final deployment manifest advertises the exact evidence contract consumed by AI Studio.
const manifest = readJson(manifestPath);
assert(manifest.id === APP_ID, `studio-manifest app id drift: ${manifest.id || '?'} != ${APP_ID}`);
assert(manifest.version === pkg.version, `studio-manifest version drift: ${manifest.version || '?'} != ${pkg.version}`);
assert(String(manifest.repository || '').toLowerCase() === sourceRepository.toLowerCase(), 'studio-manifest repository does not match source repository.');
manifest.releaseIdentity = {
  contract: RELEASE_CONTRACT,
  url: './release-integrity.json',
  assuranceMode: ASSURANCE_MODE,
  ...(p4Assurance ? { premergeAssuranceUrl: './p4-premerge-assurance.json' } : {}),
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// Produce current release-bound evidence. These files become part of the deployed artifact digest.
runNode(['scripts/generate-cyclonedx-sbom.mjs', path.relative(root, sbomPath)]);
const commonEnv = {
  ...process.env,
  GHRAB_APP_ID: APP_ID,
  GHRAB_APP_VERSION: String(pkg.version),
  GHRAB_SOURCE_COMMIT: sourceCommit,
  GHRAB_SOURCE_REPOSITORY: sourceRepository,
  GHRAB_SOURCE_PACKAGE_SHA256: sourcePackageSha256,
  GHRAB_BUILD_ID: buildId,
};
runNode([
  'security/garp25/tools/create-evidence-manifest.mjs',
  path.relative(root, qaResults),
  path.relative(root, evidencePath),
], commonEnv);
runNode([
  'security/garp25/tools/create-build-provenance.mjs',
  path.relative(root, path.join(dist, 'index.html')),
  path.relative(root, provenancePath),
], {
  ...commonEnv,
  GHRAB_LOCKFILE: lockPath,
  GHRAB_BUILDER_ID: process.env.GHRAB_BUILDER_ID || 'github-actions-hosted',
  GHRAB_WORKFLOW_REF: process.env.GHRAB_WORKFLOW_REF || process.env.GITHUB_WORKFLOW_REF || null,
  GHRAB_BUILD_ENTRYPOINT: process.env.GHRAB_BUILD_ENTRYPOINT || 'npm run qa:p5:ci',
  GHRAB_BUILD_PROFILE: process.env.GHRAB_BUILD_PROFILE || 'github-pages-release',
});

const manifestSha256 = sha256(fs.readFileSync(manifestPath));
const sbomSha256 = sha256(fs.readFileSync(sbomPath));
const buildProvenanceSha256 = sha256(fs.readFileSync(provenancePath));
const evidenceManifestSha256 = sha256(fs.readFileSync(evidencePath));
for (const [label, value] of Object.entries({ manifestSha256, sbomSha256, buildProvenanceSha256, evidenceManifestSha256, sourcePackageSha256 })) {
  assert(SHA256.test(value), `${label} is not SHA-256.`);
}

runNode([
  'security/garp25/tools/create-release-integrity.mjs',
  path.relative(root, dist),
  APP_ID,
  String(pkg.version),
  'transitional-unsigned',
  path.relative(root, integrityPath),
], {
  ...commonEnv,
  GHRAB_BUILD_PROVENANCE_SHA256: buildProvenanceSha256,
  GHRAB_SBOM_SHA256: sbomSha256,
  GHRAB_EVIDENCE_MANIFEST_SHA256: evidenceManifestSha256,
});

// GARP v2 intentionally has no circular self-hash. Add non-circular release contract fields
// required by the Studio verifier, and state the actual assurance level without overclaiming.
const integrity = readJson(integrityPath);
integrity.manifestSha256 = manifestSha256;
integrity.assuranceMode = ASSURANCE_MODE;
integrity.sourceRepository = sourceRepository;
integrity.garpProfile = 'GARP-2.5.1-SHIELD-PREP';
integrity.garpGate = p4Assurance ? 'p4-balanced-exact-tree-evidence-reuse' : 'qa:p5:ci';
if (p4Assurance) {
  integrity.premergeAssurance = {
    schema: p4Assurance.schema,
    url: 'p4-premerge-assurance.json',
    sha256: sha256(fs.readFileSync(p4AssurancePath)),
    certifiedSourceCommit: p4Assurance.certifiedSourceCommit,
    certifiedSourceTree: p4Assurance.certifiedSourceTree,
    mergedMainTree: p4Assurance.mergedMainTree,
    promotionRunId: p4Assurance.promotionRunId,
    promotionRunAttempt: p4Assurance.promotionRunAttempt,
    promotionCertificateSha256: p4Assurance.promotionCertificateSha256,
    reusedP5ArtifactDigest: p4Assurance.reusedP5ArtifactDigest,
    reusedP5ExtractedSha256: p4Assurance.reusedP5ExtractedSha256,
  };
}
integrity.workflowRunId = process.env.GITHUB_RUN_ID || null;
integrity.workflowRunAttempt = process.env.GITHUB_RUN_ATTEMPT || null;
integrity.signature = {
  ...integrity.signature,
  status: 'UNSIGNED_TRANSITIONAL',
};
integrity.assuranceNote = p4Assurance
  ? 'TRANSITIONAL P4 BALANCED: independent pre-merge certifications are reused only after exact Git-tree, workflow/run/job/check/artifact and trust-input validation; the final production build is created from the authoritative merged main commit. No production signing key/attestation chain is claimed.'
  : 'TRANSITIONAL: artifact files, manifest, SBOM, QA evidence manifest, provenance and source commit are SHA-256-bound and revalidated; no production signing key/attestation chain is claimed.';
fs.writeFileSync(integrityPath, JSON.stringify(integrity, null, 2) + '\n', 'utf8');

// Verify the final deployment directory with the approved GARP verifier.
runNode([
  'security/garp25/tools/verify-release-integrity.mjs',
  path.relative(root, dist),
  path.relative(root, integrityPath),
]);

// Contract-level regression assertions not covered by the generic GARP verifier.
const finalIntegrity = readJson(integrityPath);
const finalManifest = readJson(manifestPath);
const sbom = readJson(sbomPath);
const provenance = readJson(provenancePath);
const evidence = readJson(evidencePath);
assert(finalIntegrity.schema === RELEASE_CONTRACT, 'release-integrity schema drift.');
assert(finalIntegrity.digestAlgorithmId === 'ghrab-artifact-digest-v2', 'release-integrity digest algorithm drift.');
assert(finalIntegrity.appId === APP_ID && finalIntegrity.version === pkg.version, 'release-integrity app/version drift.');
assert(finalIntegrity.sourceCommit === sourceCommit, 'release-integrity source commit drift.');
assert(finalIntegrity.sourceRepository === sourceRepository, 'release-integrity source repository drift.');
assert(finalIntegrity.sourcePackageSha256 === sourcePackageSha256, 'release-integrity source package digest drift.');
assert(finalIntegrity.manifestSha256 === sha256(fs.readFileSync(manifestPath)), 'release-integrity manifest digest drift.');
assert(finalIntegrity.sbomSha256 === sha256(fs.readFileSync(sbomPath)), 'release-integrity SBOM digest drift.');
assert(finalIntegrity.buildProvenanceSha256 === sha256(fs.readFileSync(provenancePath)), 'release-integrity provenance digest drift.');
assert(finalIntegrity.evidenceManifestSha256 === sha256(fs.readFileSync(evidencePath)), 'release-integrity evidence digest drift.');
assert(finalIntegrity.assuranceMode === ASSURANCE_MODE, 'release-integrity assurance mode drift.');
assert(finalIntegrity.signature?.status === 'UNSIGNED_TRANSITIONAL', 'release-integrity must state unsigned transitional status.');
assert(finalManifest.releaseIdentity?.contract === RELEASE_CONTRACT, 'studio-manifest releaseIdentity contract drift.');
assert(finalManifest.releaseIdentity?.assuranceMode === ASSURANCE_MODE, 'studio-manifest releaseIdentity assurance drift.');
assert(sbom.metadata?.component?.version === pkg.version, 'SBOM version drift.');
assert(provenance.schema === 'ghrab-build-provenance-v1', 'build provenance schema drift.');
assert(String(provenance.source?.repository || '').toLowerCase() === sourceRepository.toLowerCase(), 'build provenance repository drift.');
assert(String(provenance.source?.revision || '').toLowerCase() === sourceCommit, 'build provenance source commit drift.');
assert(provenance.source?.sourcePackageSha256 === sourcePackageSha256, 'build provenance source package digest drift.');
assert(evidence.schema === 'ghrab-security-evidence-manifest-v1', 'security evidence schema drift.');
assert(evidence.appId === APP_ID && evidence.version === pkg.version, 'security evidence app/version drift.');
assert(String(evidence.sourceRevision || '').toLowerCase() === sourceCommit, 'security evidence source commit drift.');
assert(evidence.sourcePackageSha256 === sourcePackageSha256, 'security evidence source package digest drift.');
if (p4Assurance) {
  assert(finalIntegrity.garpGate === 'p4-balanced-exact-tree-evidence-reuse', 'P4 release must identify its actual assurance gate.');
  assert(finalIntegrity.premergeAssurance?.sha256 === sha256(fs.readFileSync(p4AssurancePath)), 'P4 assurance digest drift.');
  assert(finalIntegrity.premergeAssurance?.certifiedSourceTree === finalIntegrity.premergeAssurance?.mergedMainTree, 'P4 release lost exact-tree equivalence.');
  assert(finalManifest.releaseIdentity?.premergeAssuranceUrl === './p4-premerge-assurance.json', 'P4 assurance URL missing from manifest.');
}
const requiredReleasePaths = ['studio-manifest.json', 'sbom.cdx.json', 'build-provenance.json', 'security-evidence-manifest.json', 'qa-p5-release-report.json', 'qa-p5-acceptance-report.json', ...(p4Assurance ? ['p4-premerge-assurance.json'] : [])];
for (const requiredPath of requiredReleasePaths) {
  assert(finalIntegrity.files.some((file) => file.path === requiredPath), `release-integrity does not cover ${requiredPath}.`);
}
assert(!finalIntegrity.files.some((file) => file.path === 'release-integrity.json'), 'release-integrity must exclude its own self-referential file.');

console.log(JSON.stringify({
  status: 'PASS',
  appId: APP_ID,
  version: pkg.version,
  sourceCommit,
  sourceRepository,
  assuranceMode: ASSURANCE_MODE,
  artifactDigest: finalIntegrity.artifactDigest,
  manifestSha256,
  sbomSha256,
  buildProvenanceSha256,
  evidenceManifestSha256,
  fileCount: finalIntegrity.fileCount,
  qaEvidenceFiles: evidence.files?.length || 0,
}, null, 2));
