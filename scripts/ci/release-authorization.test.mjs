import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { approvalStatement, checkLiveReleaseAuthorization, verifyReleaseAuthorization } from './release-authorization.mjs';
import { releaseDecision } from '../check-redteam-release-e10.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url)));
const readiness = JSON.parse(fs.readFileSync(new URL('../../security/release-readiness-e10.json', import.meta.url)));
const S = 'a'.repeat(40), T = 'b'.repeat(40), M = 'c'.repeat(40), TREE = 'd'.repeat(40);
const expected = { repository: 'Daniel22-dev/generator-testu', prNumber: 137, sourceSha: S,
  sourceTree: TREE, preparedMainSha: T, mergedMainSha: M, version: pkg.version,
  scope: 'R1-A-C32-D02+R1-E10-GOV' };

function fixture(stage = 'premerge') {
  return {
    expected: structuredClone(expected), stage,
    sourceCommit: { sha: S, tree: { sha: TREE } },
    candidateRef: { object: { sha: S } },
    mainRef: { object: { sha: stage === 'premerge' ? T : M } },
    pr: { number: 137, state: stage === 'premerge' ? 'open' : 'closed', merged: stage === 'postmerge',
      merge_commit_sha: stage === 'postmerge' ? M : null,
      head: { ref: 'candidate', sha: S, repo: { full_name: expected.repository } },
      base: { ref: 'main', sha: T, repo: { full_name: expected.repository } } },
    reviews: [{ id: 901, node_id: 'PRR_synthetic_901', html_url: 'https://github.com/Daniel22-dev/generator-testu/pull/137#pullrequestreview-901',
      user: { login: 'Daniel22-dev', type: 'User' }, author_association: 'OWNER', state: 'APPROVED',
      commit_id: S, submitted_at: '2026-10-24T12:00:00Z', body: approvalStatement(expected) }],
  };
}

test('N01 historical tracked readiness never authorizes a later release', () => {
  const decision = releaseDecision(readiness, pkg.version);
  assert.equal(decision.releaseBlocked, true);
  assert.equal(decision.releaseAuthorization, 'EXTERNAL_OWNER_APPROVAL_REQUIRED');
});

test('P01 exact authenticated owner approval admits premerge and postmerge stages', () => {
  assert.equal(verifyReleaseAuthorization(fixture()).status, 'PASS');
  assert.equal(verifyReleaseAuthorization(fixture('postmerge')).status, 'PASS');
});

const mutations = [
  ['N02 missing approval', x => { x.reviews = []; }],
  ['N03 comment is not approval', x => { x.reviews[0].state = 'COMMENTED'; }],
  ['N04 approval for another commit', x => { x.reviews[0].commit_id = 'e'.repeat(40); }],
  ['N05 wrong owner identity', x => { x.reviews[0].user.login = 'attacker'; }],
  ['N06 bot identity', x => { x.reviews[0].user.type = 'Bot'; }],
  ['N07 non-owner association', x => { x.reviews[0].author_association = 'MEMBER'; }],
  ['N08 stale approval body SHA', x => { x.reviews[0].body = x.reviews[0].body.replace(S, 'e'.repeat(40)); }],
  ['N09 wrong source tree', x => { x.sourceCommit.tree.sha = 'e'.repeat(40); }],
  ['N10 candidate drift', x => { x.candidateRef.object.sha = 'e'.repeat(40); }],
  ['N11 main drift', x => { x.mainRef.object.sha = 'e'.repeat(40); }],
  ['N12 foreign PR repository', x => { x.pr.head.repo.full_name = 'attacker/fork'; }],
  ['N13 wrong PR number', x => { x.pr.number = 138; }],
  ['N14 wrong branch', x => { x.pr.head.ref = 'feature'; }],
  ['N15 dismissed latest owner review', x => { x.reviews.push({ ...x.reviews[0], id: 902, state: 'DISMISSED' }); }],
  ['N16 scope mutation', x => { x.expected.scope = 'UNRESTRICTED'; }],
  ['N17 version mutation', x => { x.expected.version = '9.9.9'; }],
  ['N18 missing review evidence identity', x => { x.reviews[0].node_id = ''; }],
];
for (const [name, mutate] of mutations) test(name, () => {
  const x = fixture(); mutate(x); assert.throws(() => verifyReleaseAuthorization(x), { name: 'AssertionError' });
});

test('N19 fail closed when GitHub API access fails', () => {
  assert.throws(() => checkLiveReleaseAuthorization(expected, { read: () => { throw new Error('offline'); } }), /offline/);
});

test('P02 live adapter consumes only bounded GET evidence', () => {
  const x = fixture();
  const endpoints = [];
  const data = new Map([
    [`repos/${expected.repository}/pulls/137`, x.pr],
    [`repos/${expected.repository}/git/ref/heads/candidate`, x.candidateRef],
    [`repos/${expected.repository}/git/ref/heads/main`, x.mainRef],
    [`repos/${expected.repository}/git/commits/${S}`, x.sourceCommit],
  ]);
  const read = endpoint => { endpoints.push(endpoint); return data.get(endpoint); };
  const collection = endpoint => { endpoints.push(endpoint); return x.reviews; };
  assert.equal(checkLiveReleaseAuthorization(expected, { read, collection }).status, 'PASS');
  assert.ok(endpoints.every(e => e.startsWith(`repos/${expected.repository}/`)));
});
