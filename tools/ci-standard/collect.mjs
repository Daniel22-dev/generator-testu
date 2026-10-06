// Read-only exact-SHA CI inventory. GET only; no checkout, shell or repository code execution.
// It inventories declarations, not runtime assurance. Missing access never means no controls.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { repoName, commitSha, id, relative, blobSha, sha256, strictJson, keys } from './safe-io.mjs';
import { VERSION, PURPOSE } from './contract.mjs';
export const LIMITS = Object.freeze({ definitions: 128, fileBytes: 1024 * 1024, totalBytes: 8 * 1024 * 1024 });
export function apiRead(endpoint, execute = execFileSync) {
  assert.match(endpoint, /^repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(?:git\/(?:ref\/heads\/[A-Za-z0-9_.\/-]+|commits\/[0-9a-f]{40}|trees\/[0-9a-f]{40}\?recursive=1|blobs\/[0-9a-f]{40})))?$/);
  assert.ok(!endpoint.includes('..'), 'Unsafe API endpoint');
  let text;
  try { text = execute('gh', ['api', '--hostname', 'github.com', '--method', 'GET',
    '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28', endpoint],
    { encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { throw new Error('GitHub read unavailable; access/network/timeout. No absence or compliance inferred.'); }
  return strictJson(Buffer.from(text));
}
export function included(file) {
  return /^(?:package(?:-lock)?\.json|audit\/requirements-audit\.txt)$/.test(file) ||
    /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file) ||
    /^\.github\/actions\/(?:[^/]+\/)*action\.ya?ml$/.test(file) ||
    /^(?:scripts\/ci|tools\/ci-standard)\/.+\.(?:mjs|js|sh|json)$/.test(file);
}
export function collect({ repository, repositoryId, sha, branch = 'main', read = apiRead, now = () => new Date().toISOString() }) {
  repoName(repository); id(repositoryId); commitSha(sha); relative(branch);
  const startedAt = now(); const base = 'repos/' + repository;
  const result = { schema: 'ghrab-ci-inventory-v1', standardVersion: VERSION, purpose: PURPOSE,
    repository, repositoryId, sourceCommit: sha, branch, startedAt, completedAt: null,
    status: 'BLOCKED', collection: 'github-rest-get', coverage: 'ci-definitions-packages-and-scoped-helpers-only',
    runtimeVerified: false, policyVerified: false, releaseEligible: false, sourceUnchanged: false,
    files: [], snapshotSha256: null, reason: null };
  try {
    const meta = read(base); assert.equal(String(meta.id), repositoryId); assert.equal(meta.full_name, repository);
    assert.equal(read(base + '/git/ref/heads/' + branch).object?.sha, sha, 'Branch differs from requested SHA');
    const commit = read(base + '/git/commits/' + sha); assert.equal(commit.sha, sha); commitSha(commit.tree?.sha);
    const tree = read(base + '/git/trees/' + commit.tree.sha + '?recursive=1');
    assert.equal(tree.sha, commit.tree.sha); assert.equal(tree.truncated, false, 'Truncated tree is incomplete');
    assert.ok(Array.isArray(tree.tree)); const names = new Set(), selected = [];
    for (const row of tree.tree) {
      assert.equal(typeof row.path, 'string'); assert.ok(!names.has(row.path), 'Duplicate tree path'); names.add(row.path);
      // Reject a linked/submodule ancestor of CI inputs, not only the final filename.
      if (['.github', '.github/workflows', '.github/actions', 'audit', 'scripts/ci', 'tools/ci-standard'].includes(row.path)) {
        assert.equal(row.type, 'tree'); assert.equal(row.mode, '040000');
      }
      if (!included(row.path)) continue;
      relative(row.path); assert.equal(row.type, 'blob'); assert.ok(['100644', '100755'].includes(row.mode), 'Linked CI source rejected');
      commitSha(row.sha); assert.ok(Number.isInteger(row.size) && row.size >= 0 && row.size <= LIMITS.fileBytes, 'CI source too large');
      selected.push(row);
    }
    assert.ok(selected.length > 0 && selected.length <= LIMITS.definitions, 'CI definition limit or empty selection');
    assert.ok(selected.some(x => x.path === 'package.json'), 'Package metadata missing');
    assert.ok(selected.some(x => /^\.github\/workflows\//.test(x.path)), 'No workflow in complete tree');
    assert.ok(selected.reduce((n, x) => n + x.size, 0) <= LIMITS.totalBytes, 'Total CI input limit');
    const byPath = new Map(tree.tree.map(row => [row.path, row]));
    for (const row of selected) {
      const parts = row.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const ancestor = byPath.get(parts.slice(0, i).join('/'));
        assert.ok(ancestor && ancestor.type === 'tree' && ancestor.mode === '040000', 'Missing/linked CI ancestor');
      }
    }
    for (const row of selected.sort((a, b) => a.path.localeCompare(b.path, 'en'))) {
      const b = read(base + '/git/blobs/' + row.sha);
      assert.equal(b.sha, row.sha); assert.equal(b.encoding, 'base64'); assert.equal(b.size, row.size);
      assert.equal(typeof b.content, 'string'); assert.ok(b.content.length <= LIMITS.fileBytes * 2);
      const encoded = b.content.replace(/[\r\n]/g, ''); assert.match(encoded, /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
      const bytes = Buffer.from(encoded, 'base64'); assert.equal(bytes.length, row.size);
      assert.equal(bytes.toString('base64'), encoded); assert.equal(blobSha(bytes), row.sha, 'Git blob digest mismatch');
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (row.path.endsWith('.json')) strictJson(bytes);
      result.files.push({ path: row.path, gitBlob: row.sha, sha256: sha256(bytes), size: bytes.length });
    }
    assert.equal(read(base + '/git/ref/heads/' + branch).object?.sha, sha, 'Branch advanced during collection');
    result.sourceUnchanged = true; result.snapshotSha256 = sha256(JSON.stringify(result.files)); result.status = 'COLLECTED_NOT_CERTIFIED';
  } catch {
    // Do not serialize raw API errors or content: they can contain credentials or other sensitive data.
    result.reason = 'READ_OR_INTEGRITY_OR_FRESHNESS_CHECK_FAILED';
  }
  result.completedAt = now(); return result;
}
export function validateInventory(v) {
  keys(v, ['schema', 'standardVersion', 'purpose', 'repository', 'repositoryId', 'sourceCommit', 'branch', 'startedAt',
    'completedAt', 'status', 'collection', 'coverage', 'runtimeVerified', 'policyVerified', 'releaseEligible', 'sourceUnchanged',
    'files', 'snapshotSha256', 'reason']);
  assert.equal(v.schema, 'ghrab-ci-inventory-v1'); assert.equal(v.standardVersion, VERSION); assert.equal(v.purpose, PURPOSE);
  repoName(v.repository); id(v.repositoryId); commitSha(v.sourceCommit); relative(v.branch);
  assert.equal(v.collection, 'github-rest-get'); assert.equal(v.coverage, 'ci-definitions-packages-and-scoped-helpers-only');
  assert.equal(v.runtimeVerified, false); assert.equal(v.policyVerified, false); assert.equal(v.releaseEligible, false);
  for (const d of [v.startedAt, v.completedAt]) assert.equal(new Date(d).toISOString(), d);
  assert.ok(Date.parse(v.completedAt) >= Date.parse(v.startedAt));
  assert.ok(['BLOCKED', 'COLLECTED_NOT_CERTIFIED'].includes(v.status));
  assert.ok(Array.isArray(v.files) && v.files.length <= LIMITS.definitions); const names = new Set(); let total = 0;
  for (const f of v.files) {
    keys(f, ['path', 'gitBlob', 'sha256', 'size']); relative(f.path); assert.ok(included(f.path));
    commitSha(f.gitBlob); assert.match(f.sha256, /^[0-9a-f]{64}$/);
    assert.ok(Number.isInteger(f.size) && f.size >= 0 && f.size <= LIMITS.fileBytes); total += f.size;
    assert.ok(!names.has(f.path)); names.add(f.path);
  }
  assert.ok(total <= LIMITS.totalBytes);
  if (v.status === 'COLLECTED_NOT_CERTIFIED') {
    assert.equal(v.sourceUnchanged, true); assert.equal(v.reason, null);
    assert.equal(v.snapshotSha256, sha256(JSON.stringify(v.files)));
    assert.ok(names.has('package.json') && v.files.some(f => f.path.startsWith('.github/workflows/')));
  } else { assert.equal(v.sourceUnchanged, false); assert.equal(v.snapshotSha256, null); assert.equal(v.reason, 'READ_OR_INTEGRITY_OR_FRESHNESS_CHECK_FAILED'); }
  return v;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 7, 'Usage: collect.mjs OWNER/REPO REPOSITORY_ID COMMIT_SHA BRANCH NEW_REPORT.json');
    const [, , repository, repositoryId, sha, branch, out] = process.argv;
    // Open output exclusively before network access. Never overwrite an existing file.
    const fd = fs.openSync(out, 'wx', 0o600);
    try {
      const report = collect({ repository, repositoryId, sha, branch }); validateInventory(report);
      fs.writeFileSync(fd, JSON.stringify(report, null, 2) + '\n');
      console.log(report.status + ' (not release admission)'); if (report.status === 'BLOCKED') process.exitCode = 1;
    } finally { fs.closeSync(fd); }
  } catch { console.error('BLOCKED inventory input/output. No release authority.'); process.exitCode = 1; }
}
