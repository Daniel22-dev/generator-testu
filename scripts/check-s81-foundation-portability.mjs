#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolveNpmCommand } from './lib/npm-command.mjs';

const cli = 'C:\\synthetic\\npm-cli.js';
const node = 'C:\\synthetic\\node.exe';
const win = resolveNpmCommand(['run', 'build'], {
  platform: 'win32',
  execPath: node,
  npmExecPath: cli,
  exists: candidate => candidate === cli
});
assert.deepEqual(win, { program: node, args: [cli, 'run', 'build'] });

const posix = resolveNpmCommand(['run', 'build'], { platform: 'linux' });
assert.deepEqual(posix, { program: 'npm', args: ['run', 'build'] });

assert.throws(() => resolveNpmCommand(['run', 'build'], {
  platform: 'win32',
  execPath: node,
  npmExecPath: cli,
  exists: () => false
}), /refusing to report unexecuted certification steps/);

console.log('PASS S08.1 foundation portability: Windows uses the pinned npm CLI via the active Node runtime; missing CLI fails closed.');
