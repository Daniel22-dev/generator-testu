import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const audit = path.join(here, 'workflow-matrix-check.mjs');
const target = process.argv[2] || path.resolve(here, '../dist/index.html');
const child = spawn(process.execPath, [audit, target], { stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '';
let finished = false;

function finish(code, message = '') {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  if (message) process.stderr.write(`${message}\n`);
  try { child.kill('SIGTERM'); } catch { /* already closed */ }
  const force = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already closed */ } }, 800);
  force.unref();
  setTimeout(() => process.exit(code), 30);
}

function inspect(chunk) {
  buffer = (buffer + chunk).slice(-10000);
  const match = buffer.match(/Workflow audit:\s*(\d+) PASS\s*\/\s*(\d+) FAIL/);
  if (match) finish(Number(match[2]) === 0 ? 0 : 1);
}

child.stdout.on('data', chunk => { process.stdout.write(chunk); inspect(String(chunk)); });
child.stderr.on('data', chunk => { process.stderr.write(chunk); inspect(String(chunk)); });
child.on('error', error => finish(1, `Workflow audit se nepodařilo spustit: ${error.message}`));
child.on('exit', code => { if (!finished) finish(code === 0 ? 0 : 1); });

const timeout = setTimeout(() => finish(1, 'Workflow audit nedokončil závěrečný souhrn do 12 minut.'), 12 * 60 * 1000);
