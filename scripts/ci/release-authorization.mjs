// E10 governance: authenticated owner approval bound to one exact release.
// The approval is intentionally external to the tracked tree: an APPROVED
// GitHub review on the automatic candidate -> main promotion PR.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { githubRead, readCollection, repositoryName, exactSha, positiveId } from './github-read.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const AUTH_SCHEMA = 'git-owner-release-authorization-v1';
export const APPROVAL_MARKER = 'GIT-OWNER-RELEASE-APPROVAL-V1';
export const RELEASE_SCOPE = 'R1-A-C32-D02+R1-E10-GOV';
export const AUTHORIZED_ACTIONS = Object.freeze([
  'merge-candidate-to-main',
  'deploy-github-pages',
  'notify-ai-studio',
]);
const SHA256 = /^[0-9a-f]{64}$/;
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function releaseVersion(root = ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.version || '', /^\d+\.\d+\.\d+$/, 'Invalid release version');
  return pkg.version;
}

export function approvalPayload(expected) {
  assert.match(expected.version || '', /^\d+\.\d+\.\d+$/, 'Invalid release version');
  assert.equal(expected.scope || RELEASE_SCOPE, RELEASE_SCOPE, 'Unapproved release scope');
  return {
    schema: AUTH_SCHEMA,
    repository: repositoryName(expected.repository),
    promotionPullRequest: Number(positiveId(expected.prNumber)),
    sourceBranch: 'candidate',
    sourceCommit: exactSha(expected.sourceSha),
    sourceTree: exactSha(expected.sourceTree),
    targetBranch: 'main',
    preparedMainCommit: exactSha(expected.preparedMainSha),
    version: expected.version,
    scope: expected.scope || RELEASE_SCOPE,
    authorizedActions: [...AUTHORIZED_ACTIONS],
  };
}

export function approvalStatement(expected) {
  return `${APPROVAL_MARKER}\n${JSON.stringify(approvalPayload(expected))}`;
}

function ownerLogin(repository) {
  return repository.split('/')[0];
}

export function verifyReleaseAuthorization({ expected, pr, reviews, candidateRef, mainRef, sourceCommit, stage = 'premerge' }) {
  const payload = approvalPayload(expected);
  const repo = payload.repository;
  assert.ok(['premerge', 'postmerge'].includes(stage), 'Unknown authorization stage');
  assert.equal(sourceCommit?.sha, payload.sourceCommit, 'Source commit identity drift');
  assert.equal(sourceCommit?.tree?.sha, payload.sourceTree, 'Source tree identity drift');
  assert.equal(pr?.number, payload.promotionPullRequest, 'Wrong promotion PR');
  assert.equal(pr?.head?.repo?.full_name, repo, 'Foreign PR head repository');
  assert.equal(pr?.base?.repo?.full_name, repo, 'Foreign PR base repository');
  assert.equal(pr?.head?.ref, payload.sourceBranch, 'Wrong promotion source branch');
  assert.equal(pr?.base?.ref, payload.targetBranch, 'Wrong promotion target branch');
  assert.equal(pr?.head?.sha, payload.sourceCommit, 'Promotion PR source SHA drift');
  assert.equal(pr?.base?.sha, payload.preparedMainCommit, 'Promotion PR prepared main drift');

  if (stage === 'premerge') {
    assert.equal(pr?.state, 'open', 'Promotion PR is not open');
    assert.equal(pr?.merged, false, 'Promotion PR already merged');
    assert.equal(candidateRef?.object?.sha, payload.sourceCommit, 'Candidate moved after approval');
    assert.equal(mainRef?.object?.sha, payload.preparedMainCommit, 'Main moved after approval');
  } else {
    assert.equal(pr?.state, 'closed', 'Promotion PR is not closed after merge');
    assert.equal(pr?.merged, true, 'Promotion PR was not merged');
    assert.equal(mainRef?.object?.sha, exactSha(expected.mergedMainSha), 'Merged main moved before deployment');
    assert.equal(pr?.merge_commit_sha, expected.mergedMainSha, 'Unexpected promotion merge commit');
  }

  assert.ok(Array.isArray(reviews), 'Reviews collection required');
  const owner = ownerLogin(repo).toLowerCase();
  const ownerReviews = reviews.filter(r => String(r?.user?.login || '').toLowerCase() === owner);
  assert.ok(ownerReviews.length > 0, 'Missing repository-owner review');
  ownerReviews.sort((a, b) => Number(a.id) - Number(b.id));
  const review = ownerReviews.at(-1);
  assert.equal(review.user?.type, 'User', 'Owner approval must come from a human GitHub user');
  assert.equal(review.author_association, 'OWNER', 'Reviewer is not authenticated as repository owner');
  assert.equal(review.state, 'APPROVED', 'Latest owner review is not APPROVED');
  assert.equal(review.commit_id, payload.sourceCommit, 'Owner approval is for another commit');
  assert.equal(review.body, approvalStatement(expected), 'Owner approval body does not bind the exact release');
  positiveId(review.id);
  assert.match(review.node_id || '', /^\S+$/, 'Review node identity required');
  assert.match(review.html_url || '', /^https:\/\/github\.com\//, 'Review URL identity required');
  assert.ok(Number.isFinite(Date.parse(review.submitted_at || '')), 'Review timestamp required');

  const bodySha256 = sha256(review.body);
  assert.match(bodySha256, SHA256);
  return {
    schema: AUTH_SCHEMA,
    status: 'PASS',
    stage,
    repository: repo,
    version: payload.version,
    scope: payload.scope,
    authorizedActions: payload.authorizedActions,
    source: { branch: payload.sourceBranch, commit: payload.sourceCommit, tree: payload.sourceTree },
    preparedMain: { branch: payload.targetBranch, commit: payload.preparedMainCommit },
    ...(stage === 'postmerge' ? { mergedMain: { commit: expected.mergedMainSha } } : {}),
    pullRequest: { number: payload.promotionPullRequest },
    approval: {
      mechanism: 'github-owner-pr-review-v1',
      reviewId: Number(review.id),
      reviewNodeId: review.node_id,
      reviewUrl: review.html_url,
      reviewer: review.user.login,
      authorAssociation: review.author_association,
      state: review.state,
      commitId: review.commit_id,
      submittedAt: review.submitted_at,
      bodySha256,
    },
    synthetic: false,
  };
}

export function checkLiveReleaseAuthorization(expected, {
  read = githubRead, collection = readCollection, stage = 'premerge',
} = {}) {
  const repo = repositoryName(expected.repository);
  const prNumber = positiveId(expected.prNumber);
  return verifyReleaseAuthorization({
    expected: { ...expected, repository: repo, prNumber },
    stage,
    pr: read(`repos/${repo}/pulls/${prNumber}`),
    reviews: collection(`repos/${repo}/pulls/${prNumber}/reviews`, null, read),
    candidateRef: stage === 'premerge' ? read(`repos/${repo}/git/ref/heads/candidate`) : null,
    mainRef: read(`repos/${repo}/git/ref/heads/main`),
    sourceCommit: read(`repos/${repo}/git/commits/${exactSha(expected.sourceSha)}`),
  });
}

function runCli() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Live owner authorization runs only in GitHub Actions');
  assert.equal(process.env.GITHUB_REPOSITORY, repositoryName(process.env.GITHUB_REPOSITORY));
  const stage = process.argv.includes('--postmerge') ? 'postmerge' : 'premerge';
  const repository = process.env.GITHUB_REPOSITORY;
  const sourceSha = exactSha(process.env.CERTIFIED_SHA);
  const sourceTree = process.env.CERTIFIED_TREE || githubRead(`repos/${repository}/git/commits/${sourceSha}`).tree?.sha;
  const expected = {
    repository,
    prNumber: process.env.PR_NUMBER,
    sourceSha,
    sourceTree,
    preparedMainSha: process.env.PREPARED_MAIN_SHA,
    mergedMainSha: process.env.MERGED_MAIN_SHA,
    version: releaseVersion(),
    scope: process.env.RELEASE_SCOPE || RELEASE_SCOPE,
  };
  console.log(`Required exact owner review body:\n${approvalStatement(expected)}`);
  const evidence = checkLiveReleaseAuthorization(expected, { stage });
  fs.mkdirSync('qa-results', { recursive: true });
  fs.writeFileSync('qa-results/release-authorization-e10.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`PASS exact owner release authorization: review ${evidence.approval.reviewId}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli(); }
  catch (error) { console.error(`BLOCKED owner release authorization: ${error.message}`); process.exitCode = 1; }
}
