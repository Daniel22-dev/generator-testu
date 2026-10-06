// Inspect both workflow entries and local action metadata; a local wrapper is
// not a reason to exempt its nested external uses from immutable pinning.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export function validateActionReference(reference, root) {
  if (reference.startsWith('./')) {
    const rel = reference.slice(2);
    assert.ok(rel.startsWith('.github/actions/') && !rel.split('/').some(p => p === '..' || p === '.' || p === ''), 'Unsafe local action path');
    assert.match(rel, /^\.github\/actions\/[A-Za-z0-9_.\/-]+$/, 'Malformed local action reference');
    const dir = path.resolve(root, rel);
    assert.equal(fs.realpathSync(dir), dir, 'Linked local action');
    const candidates = ['action.yml', 'action.yaml'].map(n => path.join(dir, n)).filter(p => fs.existsSync(p));
    assert.equal(candidates.length, 1, 'Local action metadata must resolve unambiguously');
    assert.ok(!fs.lstatSync(candidates[0]).isSymbolicLink() && fs.statSync(candidates[0]).isFile(), 'Linked or non-file action metadata');
    return 'local';
  }
  assert.match(reference, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[0-9a-fA-F]{40}$/, 'External GitHub action must use full commit SHA');
  return 'external';
}
export function inspectActionPins(root = process.cwd()) {
  root = fs.realpathSync(root);
  const files = [];
  function walk(dir, workflows) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      assert.ok(!entry.isSymbolicLink(), 'Linked CI definition');
      if (entry.isDirectory()) { if (!workflows) walk(rel, false); }
      else if (entry.isFile() && (workflows ? /\.ya?ml$/i.test(entry.name) : /^action\.ya?ml$/.test(entry.name))) files.push(rel);
    }
  }
  walk('.github/workflows', true);
  if (fs.existsSync(path.join(root, '.github/actions'))) walk('.github/actions', false);
  const refs = [];
  for (const file of files.sort()) {
    for (const [index, line] of fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).entries()) {
      if (!/\buses\s*:/.test(line) || /^\s*#/.test(line)) continue;
      // Reject unsupported spellings rather than silently missing an external use.
      // Full YAML/expressions validation remains an independent preflight gate.
      const match = line.match(/^\s*(?:-\s*)?uses:\s*(['"]?)([^\s'"#]+)\1\s*(?:#.*)?$/);
      assert.ok(match, `${file}:${index + 1}: non-canonical uses syntax requires review`);
      const reference = match[2];
      refs.push({ file, line: index + 1, reference, kind: validateActionReference(reference, root) });
    }
  }
  assert.ok(refs.length > 0, 'No action references found');
  return { files, refs, external: refs.filter(x => x.kind === 'external').length, local: refs.filter(x => x.kind === 'local').length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = inspectActionPins();
    console.log(`PASS pinned external Actions (${result.external}); resolved local uses (${result.local}); workflow/action definitions (${result.files.length})`);
  } catch (error) { console.error('BLOCKED action pins: ' + error.message); process.exitCode = 1; }
}
