// Sprint 01: real-Chromium regression gate for generated instant and secure student HTML.
// All credentials and identities in this harness are synthetic.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { enterStartCode, gdom, configure, build, REC, TEACH } from './redteam-harness-utils.mjs';

const origin = 'http://127.0.0.1:18786';
const contexts = [];
const pageErrors = [];
const consoleLeaks = [];
const checks = [];
const scenarioOutcomes = [];
let browser;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function collectProvenance() {
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
  const trackedStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert.match(sourceHead, /^[0-9a-f]{40}$/, 'S1 evidence requires an exact Git source HEAD');
  assert.equal(trackedStatus, '', 'S1 evidence requires a clean tracked working tree');
  const ciHead = String(process.env.GITHUB_SHA || '').trim().toLowerCase();
  if (ciHead) assert.equal(ciHead, sourceHead, 'S1 source HEAD differs from GITHUB_SHA');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const playwrightVersion = JSON.parse(fs.readFileSync('node_modules/playwright/package.json', 'utf8')).version;
  assert.equal(playwrightVersion, packageJson.devDependencies.playwright, 'S1 installed Playwright differs from the repository pin');
  return {
    sourceHead,
    ciHead: ciHead || null,
    trackedTree: 'clean',
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    playwrightVersion,
    gateScriptSha256: sha256(fs.readFileSync(new URL(import.meta.url))),
    packageLockSha256: sha256(fs.readFileSync('package-lock.json'))
  };
}

async function makePage(html, path) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  contexts.push(context);
  await context.route(origin + '/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    const text = message.text();
    if (text.includes(REC) || text.includes(TEACH)) consoleLeaks.push(message.type());
  });
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(origin + '/' + path);
  return page;
}

async function assertHardenedInput(page, selector, expectedLabel) {
  const attrs = await page.locator(selector).evaluate(input => ({
    type: input.type,
    autocomplete: input.getAttribute('autocomplete'),
    autocorrect: input.getAttribute('autocorrect'),
    autocapitalize: input.getAttribute('autocapitalize'),
    spellcheck: input.getAttribute('spellcheck'),
    placeholder: input.getAttribute('placeholder'),
    ariaLabel: input.getAttribute('aria-label')
  }));
  assert.deepEqual(attrs, {
    type: 'password',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: expectedLabel,
    ariaLabel: expectedLabel
  });
}

async function revealUnlock(page) {
  await page.evaluate(() => {
    const reveal = document.getElementById('unlockReveal');
    if (reveal) reveal.classList.add('hidden');
    for (let i = 0; i < 5; i++) lockTap();
  });
  await page.locator('#unlockInp').waitFor({ state: 'visible' });
}

async function browserOwnedData(page) {
  return page.evaluate(async () => {
    const local = {};
    const session = {};
    for (let i = 0; i < localStorage.length; i++) local[localStorage.key(i)] = localStorage.getItem(localStorage.key(i));
    for (let i = 0; i < sessionStorage.length; i++) session[sessionStorage.key(i)] = sessionStorage.getItem(sessionStorage.key(i));
    const idb = [];
    if (indexedDB.databases) {
      for (const info of await indexedDB.databases()) {
        if (!info.name) continue;
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open(info.name);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          for (const storeName of Array.from(db.objectStoreNames)) {
            const values = await new Promise((resolve, reject) => {
              const tx = db.transaction(storeName, 'readonly');
              const request = tx.objectStore(storeName).getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            idb.push([info.name, storeName, values]);
          }
        } finally {
          db.close();
        }
      }
    }
    return JSON.stringify({
      local,
      session,
      idb,
      url: location.href,
      inputs: Array.from(document.querySelectorAll('input')).map(input => [input.id, input.value])
    });
  });
}

async function instantCase() {
  configure({ testMode: 'bezny', resultMode: 'instant', screenGuard: true, feedbackMode: 'brief' });
  const html = await build();
  const page = await makePage(html, 'instant.html');

  await assertHardenedInput(page, '#unlockInp', 'Odemykací kód testu');
  await assertHardenedInput(page, '#t-pin', 'Učitelský přístupový kód');
  await page.locator('#studentName').fill('Synthetic Student');
  await page.evaluate(() => startTest());

  await page.evaluate(() => openTeacherModal());
  await page.locator('#t-name').fill('Daniel Teacher');
  await page.locator('#t-pin').fill(REC);
  await page.evaluate(() => doTeacherLogin());
  assert.equal(await page.locator('#t-panel').evaluate(el => el.classList.contains('hidden')), true);
  assert.equal(await page.locator('#t-pin').inputValue(), '');
  await page.locator('#t-pin').fill(TEACH);
  await page.evaluate(() => doTeacherLogin());
  assert.equal(await page.locator('#t-panel').evaluate(el => el.classList.contains('hidden')), false);
  assert.equal(await page.locator('#t-pin').inputValue(), '');
  await page.evaluate(() => closeTeacherModal());

  await page.evaluate(() => {
    window.__s1OriginalTeacherMatcher = teacherSecretMatches;
    window.__s1TeacherResolvers = [];
    window.__s1TeacherPending = [];
    teacherSecretMatches = () => new Promise(resolve => window.__s1TeacherResolvers.push(resolve));
  });
  await page.evaluate(() => openTeacherModal());
  await page.locator('#t-name').fill('Daniel Teacher');
  await page.locator('#t-pin').fill(TEACH);
  await page.evaluate(() => { window.__s1TeacherPending.push(doTeacherLogin()); });
  await page.locator('#t-pin').fill(TEACH);
  await page.evaluate(() => { window.__s1TeacherPending.push(doTeacherLogin()); });
  assert.equal(await page.evaluate(() => window.__s1TeacherResolvers.length), 2, 'two teacher authentications were not pending');
  await page.evaluate(() => closeTeacherModal());
  assert.equal(await page.evaluate(() => teacherLogged), false, 'teacher remained logged after closing a pending authentication');
  assert.equal(await page.locator('#t-panel').evaluate(el => el.classList.contains('hidden')), true);
  await page.evaluate(async () => {
    window.__s1TeacherResolvers[1](true);
    await window.__s1TeacherPending[1];
    window.__s1TeacherResolvers[0](true);
    await window.__s1TeacherPending[0];
  });
  assert.equal(await page.evaluate(() => teacherLogged), false, 'late concurrent teacher authorization revived privilege');
  assert.equal(await page.locator('#t-panel').evaluate(el => el.classList.contains('hidden')), true, 'stale privileged panel became visible');
  assert.equal(await page.locator('#t-pin').inputValue(), '');
  await page.evaluate(() => openTeacherModal());
  assert.equal(await page.locator('#t-panel').evaluate(el => el.classList.contains('hidden')), true, 'reopened modal exposed a stale privileged panel');
  assert.equal(await page.locator('#t-login').evaluate(el => el.classList.contains('hidden')), false, 'reopened modal omitted the unauthenticated login panel');
  await page.evaluate(() => {
    teacherSecretMatches = window.__s1OriginalTeacherMatcher;
    delete window.__s1OriginalTeacherMatcher;
    delete window.__s1TeacherResolvers;
    delete window.__s1TeacherPending;
    closeTeacherModal();
  });
  scenarioOutcomes.push({
    id: 'instant-teacher-auth-close-race',
    status: 'PASS',
    requests: 2,
    completionOrder: 'second-then-first',
    result: 'closed modal remained logged out; no stale privileged panel'
  });

  await page.evaluate(() => {
    selectChoice('0_0', 1);
    lockTest('synthetic browser recovery check');
  });
  const before = await page.evaluate(() => JSON.stringify({ attemptId, timerDeadline, jokerUsed, jokerSelectedAt, ANSWERS }));

  await revealUnlock(page);
  await page.evaluate(() => {
    window.__s1CaptureObserved = false;
    document.getElementById('unlockInp').addEventListener('input', event => {
      if (event.target.value) window.__s1CaptureObserved = true;
    });
  });
  await page.locator('#unlockInp').fill(TEACH);
  await page.evaluate(() => tryUnlock());
  assert.equal(await page.evaluate(() => locked), true, 'Teacher/Admin credential unlocked instant recovery lock');
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  assert.equal(await page.evaluate(() => window.__s1CaptureObserved), true, 'client-side observer did not see the entered value');

  await page.evaluate(() => {
    window.__s1OriginalRecoveryMatcher = recoveryCodeMatches;
    recoveryCodeMatches = async () => { throw new Error('synthetic authorization fault'); };
  });
  await page.locator('#unlockInp').fill('SYNTHETIC-FAULT');
  await page.evaluate(async () => { try { await tryUnlock(); } catch {} });
  assert.equal(await page.evaluate(() => locked), true);
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  await page.evaluate(() => { recoveryCodeMatches = window.__s1OriginalRecoveryMatcher; });

  await page.locator('#unlockInp').fill(REC);
  await page.evaluate(() => tryUnlock());
  assert.equal(await page.evaluate(() => locked), false);
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  assert.equal(await page.evaluate(() => JSON.stringify({ attemptId, timerDeadline, jokerUsed, jokerSelectedAt, ANSWERS })), before);
  const owned = await browserOwnedData(page);
  assert.equal(owned.includes(REC) || owned.includes(TEACH), false, 'raw synthetic credential reached instant browser-owned app data');
  assert.equal(html.includes(REC) || html.includes(TEACH), false, 'raw synthetic credential reached instant export');
  checks.push('instant: hardened inputs, privilege separation, cleanup, state continuity, app-data scan');
  scenarioOutcomes.push({
    id: 'instant-recovery-and-privilege-boundary',
    status: 'PASS',
    result: 'Recovery only unlocked recovery; Teacher/Admin remained separate; attempt state preserved'
  });
  return { sha256: sha256(html), captureObserved: true };
}

async function secureCase() {
  configure({ testMode: 'prisny', resultMode: 'secureOffline', screenGuard: true, feedbackMode: 'none' });
  const pkg = await build();
  const page = await makePage(pkg.studentHtml, 'secure.html');

  await assertHardenedInput(page, '#unlockInp', 'Odemykací kód testu');
  assert.equal(await page.evaluate(() => typeof teacherLogin), 'undefined');
  assert.equal(await page.locator('#teacherModal').count(), 0);
  await page.locator('#studentName').fill('Synthetic Student');
  await enterStartCode(page, pkg);
  await page.evaluate(() => startTest());
  await page.evaluate(() => {
    setResp('0_0', 1);
    lockTest('synthetic browser recovery check');
  });
  const before = await page.evaluate(() => JSON.stringify({
    ATTEMPT_ID,
    TIMER_DEADLINE,
    ACTIVE_IDENTITY_HASH,
    ACTIVE_KEY,
    JOKER_USED,
    JOKER_SELECTED_AT,
    JOKER_CHOICE,
    STARTED_AT,
    RESP
  }));

  await revealUnlock(page);
  await page.evaluate(() => {
    window.__s1CaptureObserved = false;
    document.getElementById('unlockInp').addEventListener('input', event => {
      if (event.target.value) window.__s1CaptureObserved = true;
    });
  });
  await page.locator('#unlockInp').fill(TEACH);
  await page.evaluate(() => tryUnlock());
  assert.equal(await page.evaluate(() => LOCKED), true, 'Teacher/Admin credential unlocked secure recovery lock');
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  assert.equal(await page.evaluate(() => window.__s1CaptureObserved), true, 'client-side observer did not see the entered value');

  await page.evaluate(() => {
    window.__s1OriginalRecoveryMatcher = unlockCodeMatches;
    unlockCodeMatches = async () => { throw new Error('synthetic authorization fault'); };
  });
  await page.locator('#unlockInp').fill('SYNTHETIC-FAULT');
  await page.evaluate(async () => { try { await tryUnlock(); } catch {} });
  assert.equal(await page.evaluate(() => LOCKED), true);
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  await page.evaluate(() => { unlockCodeMatches = window.__s1OriginalRecoveryMatcher; });

  await page.locator('#unlockInp').fill(REC);
  await page.evaluate(() => tryUnlock());
  assert.equal(await page.evaluate(() => LOCKED), false);
  assert.equal(await page.locator('#unlockInp').inputValue(), '');
  assert.equal(await page.evaluate(() => JSON.stringify({
    ATTEMPT_ID,
    TIMER_DEADLINE,
    ACTIVE_IDENTITY_HASH,
    ACTIVE_KEY,
    JOKER_USED,
    JOKER_SELECTED_AT,
    JOKER_CHOICE,
    STARTED_AT,
    RESP
  })), before);
  const owned = await browserOwnedData(page);
  assert.equal(owned.includes(REC) || owned.includes(TEACH), false, 'raw synthetic credential reached secure browser-owned app data');
  assert.equal(pkg.studentHtml.includes(REC) || pkg.studentHtml.includes(TEACH), false, 'raw synthetic credential reached secure student export');
  checks.push('secure: hardened input, no teacher capability, privilege separation, cleanup, state continuity, app-data scan');
  scenarioOutcomes.push({
    id: 'secure-recovery-and-capability-isolation',
    status: 'PASS',
    result: 'secure student HTML had no teacher capability; Recovery preserved attempt state'
  });
  return {
    studentSha256: sha256(pkg.studentHtml),
    verifierSha256: sha256(pkg.teacherHtml),
    captureObserved: true
  };
}

try {
  const startedAt = new Date().toISOString();
  const provenance = collectProvenance();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  });
  const instant = await instantCase();
  const secure = await secureCase();
  assert.deepEqual(pageErrors, [], 'generated HTML produced unhandled page errors');
  assert.deepEqual(consoleLeaks, [], 'generated HTML logged a raw synthetic credential');
  const report = {
    sprint: '01-recovery-credential-hardening',
    status: 'PASS',
    startedAt,
    completedAt: new Date().toISOString(),
    provenance,
    browser: await browser.version(),
    checks,
    scenarioOutcomes,
    artifacts: { instant, secure },
    evidence: {
      credentials: 'synthetic only; report contains hashes, not raw values',
      browserOwnedData: ['localStorage', 'sessionStorage', 'IndexedDB', 'URL', 'live input values'],
      clientSideCapture: 'OBSERVED — input listener read a non-empty value before application cleanup'
    },
    limits: [
      'Chromium headless only; physical iPadOS/Safari not tested',
      'Native browser/password-manager save prompts not observable in this run',
      'Client-side cleanup cannot prevent capture by DevTools, extensions, injected scripts or a compromised origin',
      'No authorized GitHub Pages staging deployment was performed'
    ]
  };
  fs.mkdirSync('qa-results', { recursive: true });
  fs.writeFileSync('qa-results/recovery-browser-s1.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  gdom.window.close();
}
