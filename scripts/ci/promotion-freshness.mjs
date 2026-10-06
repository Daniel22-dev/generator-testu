// Exact repo/ref/SHA/base binding, shared by prepare, both independent jobs and promotion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { githubRead, repositoryName, exactSha, positiveId } from './github-read.mjs';
export function validateFreshness({ repo, sha, mainSha, candidate, main, pr, prNumber }) {
  repositoryName(repo); exactSha(sha); exactSha(mainSha);
  assert.equal(candidate.ref, 'refs/heads/candidate'); assert.equal(candidate.object?.type, 'commit');
  assert.equal(main.ref, 'refs/heads/main'); assert.equal(main.object?.type, 'commit');
  assert.equal(candidate.object.sha, sha, 'Candidate advanced or source does not match');
  assert.equal(main.object.sha, mainSha, 'Main changed since preparation; recertification required');
  if (prNumber !== undefined) {
    positiveId(prNumber); assert.equal(pr?.number, Number(prNumber)); assert.equal(pr?.state, 'open');
    assert.equal(pr.merged, false, 'PR was already merged');
    assert.equal(pr.head?.repo?.full_name, repo, 'Foreign PR head repository');
    assert.equal(pr.base?.repo?.full_name, repo, 'Foreign PR target repository');
    assert.equal(pr.head.ref, 'candidate'); assert.equal(pr.base.ref, 'main');
    assert.equal(pr.head.sha, sha, 'PR head differs from certified SHA');
  }
  return { sha, mainSha, eligible: true };
}
export function checkLiveFreshness({ repo, sha, mainSha, prNumber }, read = githubRead, git = execFileSync) {
  repositoryName(repo); exactSha(sha);
  if (prNumber !== undefined) exactSha(mainSha); // PR checks cannot silently recapture a missing base.
  const candidate = read(`repos/${repo}/git/ref/heads/candidate`);
  const main = read(`repos/${repo}/git/ref/heads/main`);
  const baseline = mainSha === undefined ? main.object?.sha : mainSha;
  const pr = prNumber === undefined ? undefined : read(`repos/${repo}/pulls/${positiveId(prNumber)}`);
  const result = validateFreshness({ repo, sha, mainSha: baseline, candidate, main, pr, prNumber });
  const options = { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] };
  assert.equal(git('git', ['rev-parse', 'HEAD'], options).trim(), sha, 'Checkout differs from certified SHA');
  // A moved main must not silently create an untested merge combination.
  git('git', ['fetch', '--no-tags', 'origin', 'main'], options);
  assert.equal(git('git', ['rev-parse', 'origin/main'], options).trim(), baseline, 'Main moved during freshness check');
  git('git', ['merge-base', '--is-ancestor', baseline, sha], options);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); assert.ok(args.length === 1 && ['--prepare', '--pr'].includes(args[0]));
    const result = checkLiveFreshness({ repo: process.env.GITHUB_REPOSITORY, sha: process.env.CERTIFIED_SHA,
      mainSha: args[0] === '--prepare' ? undefined : exactSha(process.env.PREPARED_MAIN_SHA),
      prNumber: args[0] === '--pr' ? positiveId(process.env.PR_NUMBER) : undefined });
    if (args[0] === '--prepare') {
      try {
        execFileSync('git', ['diff', '--quiet', result.mainSha, result.sha, '--'], { stdio: 'pipe' });
        throw new Error('Candidate has no content changes; no new release is admitted');
      } catch (error) { if (error.status !== 1) throw error; }
    }
    assert.ok(process.env.GITHUB_OUTPUT, 'Workflow output file required');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `sha=${result.sha}\nmain_sha=${result.mainSha}\neligible=true\n`);
    console.log('PASS exact source, candidate, PR (when present) and prepared main binding');
  } catch (error) { console.error('BLOCKED freshness: ' + error.message); process.exitCode = 1; }
}
