// Read-only, bounded GitHub REST access. No shell interpolation and no token output.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
export function repositoryName(value) {
  assert.match(value || '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Invalid repository');
  return value;
}
export function exactSha(value) {
  assert.match(value || '', /^[0-9a-f]{40}$/, 'An exact commit SHA is required');
  return value;
}
export function positiveId(value) {
  assert.match(String(value ?? ''), /^[1-9][0-9]*$/, 'Invalid numeric identity');
  assert.ok(Number.isSafeInteger(Number(value)), 'Identity exceeds safe integer range');
  return String(value);
}
export function githubRead(endpoint, execute = execFileSync) {
  assert.match(endpoint, /^repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\//, 'Repository GET endpoint required');
  assert.ok(!endpoint.includes('..') && !/[\r\n]/.test(endpoint), 'Unsafe endpoint');
  let text;
  try {
    text = execute('gh', ['api', '--hostname', 'github.com', '--method', 'GET',
      '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', endpoint],
    { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(`GitHub GET failed (access/network/timeout): ${endpoint}`);
  }
  return JSON.parse(text);
}
export function readCollection(endpoint, key = null, read = githubRead) {
  const items = [], pageSize = 100, maxPages = 20;
  for (let page = 1; page <= maxPages; page++) {
    const body = read(`${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=${pageSize}&page=${page}`);
    const batch = key ? body[key] : body;
    assert.ok(Array.isArray(batch), 'Expected a paginated GitHub array');
    items.push(...batch);
    if (batch.length < pageSize) {
      if (key && Number.isInteger(body.total_count)) assert.ok(items.length >= body.total_count, 'Incomplete GitHub result');
      return items;
    }
  }
  throw new Error('GitHub pagination limit reached; incomplete evidence cannot admit a release');
}
