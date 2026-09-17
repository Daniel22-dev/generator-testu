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
assert(SHA40.test(sourceCommit), 'GHRAB_SOURCE_COMMIT/GITHUB_SHA must be an exact 40-character Git commit SHA.');
assert(REPOSITORY.test(sourceRepository), 'GHRAB_SOURCE_REPOSITORY/GITHUB_REPOSITORY must be owner/repository.');
assert(/^\d+\.\d+\.\d+$/.test(String(pkg.version || '')), `package.json version must be stable SemVer, got ${pkg.version || '?'}`);
assert(buildId, 'GHRAB_BUILD_ID or GitHub run identity is required.');
const sourcePackageSha256 = sha256(pkgBytes);
for (const reportName of ['qa-p5-release-report.json', 'qa-p5-acceptance-report.json', 'qa-p5-runtime-report.json', 'qa-p5-axe-runtime-report.json']) {
  const report = readJson(path.join(dist, reportName));
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
integrity.garpGate = 'qa:p5:ci';
integrity.workflowRunId = process.env.GITHUB_RUN_ID || null;
integrity.workflowRunAttempt = process.env.GITHUB_RUN_ATTEMPT || null;
integrity.signature = {
  ...integrity.signature,
  status: 'UNSIGNED_TRANSITIONAL',
};
integrity.assuranceNote = 'TRANSITIONAL: artifact files, manifest, SBOM, QA evidence manifest, provenance and source commit are SHA-256-bound and revalidated; no production signing key/attestation chain is claimed.';
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
for (const requiredPath of ['studio-manifest.json', 'sbom.cdx.json', 'build-provenance.json', 'security-evidence-manifest.json', 'qa-p5-release-report.json', 'qa-p5-acceptance-report.json']) {
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
