// Data-only helpers. No source from an inspected repository is executed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const blobSha = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export function exact(value, regex, label) {
  assert.equal(typeof value, 'string', label + ' must be a string');
  assert.ok(regex.test(value), 'Invalid ' + label); return value;
}
export const commitSha = x => exact(x, /^[0-9a-f]{40}$/, 'commit SHA');
export const digest = x => exact(x, /^[0-9a-f]{64}$/, 'SHA-256');
export const repoName = x => { exact(x, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'repository');
  assert.ok(!x.split('/').some(y => y === '.' || y === '..')); return x; };
export const id = x => { exact(x, /^[1-9][0-9]*$/, 'ID'); assert.ok(Number.isSafeInteger(Number(x))); return x; };
export function relative(p) {
  exact(p, /^[A-Za-z0-9_.@/-]+$/, 'relative path');
  assert.ok(!p.split('/').some(x => !x || x === '.' || x === '..'), 'Unsafe path'); return p;
}
export function keys(obj, names) {
  assert.ok(obj && typeof obj === 'object' && !Array.isArray(obj), 'Object required');
  assert.deepEqual(Object.keys(obj).sort(), [...names].sort(), 'Unknown or missing fields');
}
export function regularRead(root, file, limit = 1024 * 1024) {
  relative(file); root = fs.realpathSync(root);
  let current = root;
  for (const [i, part] of file.split('/').entries()) {
    current = path.join(current, part); const stat = fs.lstatSync(current);
    assert.ok(!stat.isSymbolicLink(), 'Linked input rejected');
    if (i < file.split('/').length - 1) assert.ok(stat.isDirectory(), 'Invalid input directory');
  }
  const fd = fs.openSync(current, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd); assert.ok(stat.isFile() && stat.size <= limit, 'Input is not a bounded regular file');
    const bytes = fs.readFileSync(fd); assert.ok(bytes.length <= limit); return bytes;
  } finally { fs.closeSync(fd); }
}
// JSON.parse validates grammar; this walk additionally rejects duplicate object keys.
export function strictJson(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value = JSON.parse(text); let i = 0;
  const white = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  function string() {
    const start = i++; while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i));
    }
    throw new Error('Invalid JSON string');
  }
  function walk(depth = 0) {
    assert.ok(depth <= 64, 'JSON nesting limit'); white();
    if (text[i] === '{') {
      i++; white(); const seen = new Set(); if (text[i] === '}') { i++; return; }
      while (true) {
        white(); const key = string(); assert.ok(!seen.has(key), 'Duplicate JSON key'); seen.add(key);
        white(); assert.equal(text[i++], ':'); walk(depth + 1); white();
        if (text[i++] === '}') return;
      }
    } else if (text[i] === '[') {
      i++; white(); if (text[i] === ']') { i++; return; }
      while (true) { walk(depth + 1); white(); if (text[i++] === ']') return; }
    } else if (text[i] === '"') string();
    else { while (i < text.length && !/[\s,}\]]/.test(text[i])) i++; }
  }
  walk(); return value;
}
export const readJson = (root, file) => strictJson(regularRead(root, file));
