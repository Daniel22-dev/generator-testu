#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const evidenceRoot = 'audit/evidence/garp27-current';
const archiveRoot = 'qa-results/redteam-e10-ci/foundation-evidence';

const statusOutsideEvidence = execFileSync('git', [
  'status', '--porcelain', '--untracked-files=no', '--', '.',
  `:(exclude)${evidenceRoot}/**`
], { encoding: 'utf8' }).trim();
if(statusOutsideEvidence)console.error('FOUNDATION_TRACKED_DRIFT (paths only):\n'+statusOutsideEvidence);
assert.equal(statusOutsideEvidence, '', 'Foundation may modify only its generated GARP evidence directory');
assert.ok(fs.existsSync(evidenceRoot), 'Foundation evidence directory is missing');
assert.ok(!fs.existsSync(archiveRoot), 'Foundation evidence archive already exists');

fs.cpSync(evidenceRoot, archiveRoot, { recursive: true });

const tracked = execFileSync('git', ['ls-files', '-z', '--', evidenceRoot])
  .toString('utf8').split('\0').filter(Boolean);
assert.ok(tracked.length > 0, 'No tracked foundation evidence baseline was found');

for (const file of tracked) {
  const bytes = execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

const trackedStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
assert.equal(trackedStatus, '', 'Tracked tree must be clean before browser evidence is collected');

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(absolute);
      files.push({
        file: path.relative(archiveRoot, absolute).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex')
      });
    }
  }
}
walk(archiveRoot);
files.sort((a, b) => a.file.localeCompare(b.file));

const report = {
  schema: 'git-foundation-evidence-preservation-e10-v1',
  status: 'PASS',
  sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceTreeAfterRestore: 'CLEAN',
  evidenceRoot,
  archiveRoot,
  files
};
fs.writeFileSync('qa-results/redteam-e10-ci/foundation-evidence-preservation.log', `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS preserved ${files.length} foundation evidence files and restored a clean tracked tree`);
