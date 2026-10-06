// Compare two complete inventories of the SAME repository. Never grant admission.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { strictJson } from './safe-io.mjs';
import { validateInventory } from './collect.mjs';
import { VERSION, PURPOSE } from './contract.mjs';
export function compare(before, after) {
  validateInventory(before); validateInventory(after);
  assert.equal(before.status, 'COLLECTED_NOT_CERTIFIED'); assert.equal(after.status, 'COLLECTED_NOT_CERTIFIED');
  assert.equal(before.repository, after.repository, 'Cannot compare unrelated consumers');
  assert.equal(before.repositoryId, after.repositoryId, 'Repository replacement or identity mismatch');
  assert.equal(before.branch, after.branch, 'Compare the same branch role');
  assert.ok(Date.parse(after.startedAt) >= Date.parse(before.startedAt), 'Reversed observation order');
  const a = new Map(before.files.map(x => [x.path, x])), b = new Map(after.files.map(x => [x.path, x]));
  const changes = [];
  for (const p of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(p), y = b.get(p);
    if (!x || !y || x.sha256 !== y.sha256 || x.gitBlob !== y.gitBlob || x.size !== y.size) {
      changes.push({ path: p, change: !x ? 'ADDED' : !y ? 'REMOVED' : 'MODIFIED' });
    }
  }
  return { schema: 'ghrab-ci-drift-v1', standardVersion: VERSION, purpose: PURPOSE,
    repository: after.repository, repositoryId: after.repositoryId,
    beforeCommit: before.sourceCommit, afterCommit: after.sourceCommit,
    status: changes.length ? 'REVIEW_REQUIRED' : 'NO_CI_FILE_DRIFT_NOT_CERTIFIED',
    releaseEligible: false, runtimeVerified: false, changes };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.equal(process.argv.length, 4, 'Usage: compare.mjs BEFORE.json AFTER.json');
    const read = p => { const s = fs.lstatSync(p); assert.ok(s.isFile() && !s.isSymbolicLink() && s.size <= 1024 * 1024); return strictJson(fs.readFileSync(p)); };
    const report = compare(read(process.argv[2]), read(process.argv[3])); console.log(JSON.stringify(report, null, 2));
    if (report.status === 'REVIEW_REQUIRED') process.exitCode = 2;
  } catch { console.error('BLOCKED incomplete/mismatched inventories; no compliance inferred'); process.exitCode = 1; }
}
