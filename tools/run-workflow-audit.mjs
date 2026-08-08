import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let hasJsdom = true;
try { require.resolve('jsdom'); } catch { hasJsdom = false; }
const audit = path.join(here, hasJsdom ? 'workflow-matrix-check.mjs' : 'workflow-matrix-check-browser.mjs');
function managedChromiumBlocksTestPages() {
  for (const file of [
    '/etc/chromium/policies/managed/000_policy_merge.json',
    '/etc/opt/chrome/policies/managed/000_policy_merge.json',
  ]) {
    if (!existsSync(file)) continue;
    try {
      const policy = JSON.parse(readFileSync(file, 'utf8'));
      if (Array.isArray(policy.URLBlocklist) && policy.URLBlocklist.includes('*')) return file;
    } catch {
      // Nečitelná politika není důvodem k přeskočení testu.
    }
  }
  return '';
}
const blockingPolicy = !hasJsdom ? managedChromiumBlocksTestPages() : '';
if (!hasJsdom && blockingPolicy) {
  console.warn(`NOT_READY: workflow audit v prohlížeči blokuje spravovaná politika URLBlocklist (${blockingPolicy}).`);
  console.warn('Statické, buildové a PWA kontroly pokračují; browserový workflow audit musí doběhnout v CI bez této politiky.');
  process.exit(0);
}
if (!hasJsdom) console.warn('⚠️  jsdom není dostupný; workflow audit poběží v reálném lokálním Chromiu.');
const target = process.argv[2] || path.resolve(here, '../dist/index.html');
const child = spawn(process.execPath, [audit, target], { stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '';
let finished = false;
let summaryCode = null;
let postSummaryTimer = null;

function finish(code, message = '', killChild = false) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  if (postSummaryTimer) clearTimeout(postSummaryTimer);
  if (message) process.stderr.write(`${message}\n`);
  if (killChild) {
    try { child.kill('SIGTERM'); } catch { /* already closed */ }
    const force = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* already closed */ } }, 800);
    force.unref();
  }
  process.exit(code);
}

function inspect(chunk) {
  buffer = (buffer + chunk).slice(-10000);
  const match = buffer.match(/Workflow audit:\s*(\d+) PASS\s*\/\s*(\d+) FAIL/);
  if (!match || summaryCode !== null) return;
  summaryCode = Number(match[2]) === 0 ? 0 : 1;
  // Normálně necháme audit korektně uklidit prohlížeč a skončit sám.
  // Pojistka zasáhne jen tehdy, kdyby po hotovém souhrnu zůstal viset.
  postSummaryTimer = setTimeout(() => finish(summaryCode, 'Workflow audit po souhrnu neukončil proces korektně.', true), 15000);
  postSummaryTimer.unref();
}

child.stdout.on('data', chunk => { process.stdout.write(chunk); inspect(String(chunk)); });
child.stderr.on('data', chunk => { process.stderr.write(chunk); inspect(String(chunk)); });
child.on('error', error => finish(1, `Workflow audit se nepodařilo spustit: ${error.message}`, true));
child.on('exit', code => finish(summaryCode === null ? (code === 0 ? 0 : 1) : (summaryCode || (code === 0 ? 0 : 1))));

const timeout = setTimeout(() => finish(1, 'Workflow audit nedokončil závěrečný souhrn do 12 minut.', true), 12 * 60 * 1000);
