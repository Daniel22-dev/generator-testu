import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactSha, positiveId } from './github-read.mjs';

export function requirePromotionOrigin(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Promotion must run in GitHub Actions');
  assert.equal(env.GITHUB_EVENT_NAME, 'push', 'Production promotion requires an authentic candidate push event');
  assert.equal(env.GITHUB_REF, 'refs/heads/candidate', 'Production promotion must run on candidate');
  assert.equal(Number(positiveId(env.GITHUB_RUN_ATTEMPT)), 1, 'Promotion reruns are forbidden');
  return { event: 'push', ref: env.GITHUB_REF, sha: exactSha(env.GITHUB_SHA), runAttempt: 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = requirePromotionOrigin(process.env);
    console.log(`PASS authentic promotion origin: ${result.event} ${result.ref} ${result.sha} attempt ${result.runAttempt}`);
  } catch (error) {
    console.error(`BLOCKED promotion origin: ${error.message}`);
    process.exitCode = 1;
  }
}
