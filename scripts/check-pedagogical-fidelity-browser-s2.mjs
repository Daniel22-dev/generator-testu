// Sprint 02: real-Chromium regression gate for pedagogical labels and Reading isolation.
// All content and identities in this harness are synthetic.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { configure, build, enterStartCode, GEN, gdom } from './redteam-harness-utils.mjs';

const origin = 'http://127.0.0.1:18787';
const styleNames = ['multiple choice', 'paraphrase the sentence', 'translation', 'reading comprehension', 'verb form'];
const contexts = [];
const pageErrors = [];
let browser;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const choice = question => ({ question, options:['A', 'B', 'C', 'D'], correct:0, explanation:'Synthetic explanation.' });
const many = (count, factory) => Array.from({length:count}, (_, index) => factory(index));
const passage = 'A synthetic school passage about a coastal research station and its weekly environmental measurements.';
const exercises = [
  { type:'multiple choice', style:'multiple choice', title:'Advanced Conditionals', items:many(4, i => choice(`Select the correct conditional verb form for situation ${i + 1}.`)) },
  { type:'sentence transformation', style:'paraphrase the sentence', title:'Advanced Conditionals', items:many(3, i => ({prompt:`Rewrite conditional sentence ${i + 1} without changing its meaning.`, answer:`Synthetic paraphrase ${i + 1}.`, explanation:'Synthetic explanation.'})) },
  { type:'translation', style:'translation', title:'Advanced Conditionals', items:many(2, i => ({prompt:`Přelož kontrolní větu ${i + 1}.`, answer:`Synthetic translation ${i + 1}.`, explanation:'Synthetic explanation.'})) },
  { type:'reading comprehension', style:'reading comprehension', title:'Advanced Conditionals', passage, items:many(5, i => choice(`Reading comprehension question number ${i + 1} about the coastal station.`)) },
  { type:'fill-in-the-blank', style:'verb form', title:'Advanced Conditionals', items:many(4, i => ({sentence:`If the researcher arrived earlier, she ___ (record) sample ${i + 1}.`, answer:'would record', explanation:'Synthetic explanation.'})) }
];
const exerciseConfig = [
  {typ:'multiple choice',pocetOtazek:4,body:4},
  {typ:'paraphrase the sentence',pocetOtazek:3,body:6},
  {typ:'translation',pocetOtazek:2,body:4},
  {typ:'reading comprehension',pocetOtazek:5,body:10},
  {typ:'verb form',pocetOtazek:4,body:8}
];

function provenance() {
  const sourceHead = execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim().toLowerCase();
  const trackedStatus = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {encoding:'utf8'}).trim();
  assert.match(sourceHead, /^[0-9a-f]{40}$/);
  assert.equal(trackedStatus, '', 'S2 browser evidence requires a clean tracked working tree');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const playwrightVersion = JSON.parse(fs.readFileSync('node_modules/playwright/package.json', 'utf8')).version;
  assert.equal(playwrightVersion, packageJson.devDependencies.playwright);
  return {
    sourceHead,
    nodeVersion:process.version,
    platform:process.platform,
    architecture:process.arch,
    playwrightVersion,
    gateScriptSha256:sha256(fs.readFileSync(new URL(import.meta.url))),
    packageLockSha256:sha256(fs.readFileSync('package-lock.json'))
  };
}

async function pageFor(html, path) {
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  contexts.push(context);
  await context.route(origin + '/**', route => route.fulfill({status:200,contentType:'text/html',body:html}));
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${path}: ${error.message}`));
  await page.goto(`${origin}/${path}`);
  return page;
}

async function assertRenderedContract(page, mode) {
  const primary = mode === 'instant'
    ? await page.locator('.ex-panel .ex-style-label').allTextContents()
    : await page.locator('.ex-panel .exercise-style').allTextContents();
  assert.deepEqual(primary.map(value => value.trim().toLowerCase()), styleNames, `${mode}: pedagogical labels changed or reordered`);
  const subtitles = await page.locator('.ex-panel .exercise-subtitle').allTextContents();
  assert.equal(subtitles.length, 5, `${mode}: thematic subtitles missing`);
  assert.ok(subtitles.every(value => value.trim() === 'Advanced Conditionals'), `${mode}: title replaced a pedagogical label`);
  assert.equal(await page.locator('.reading-passage').count(), 1, `${mode}: Reading passage must be shown exactly once`);
  assert.equal((await page.locator('body').innerText()).split(passage).length - 1, 1, `${mode}: Reading passage was duplicated in the rendered document`);
  const counts = await page.locator('.ex-panel').evaluateAll(panels => panels.map(panel => panel.querySelectorAll('.question,.q').length));
  assert.deepEqual(counts, [4,3,2,5,4], `${mode}: configured question counts changed`);
  const mcText = await page.locator('.ex-panel').first().innerText();
  assert.equal(mcText.includes(passage), false, `${mode}: independent Multiple Choice leaked the Reading passage`);
}

async function instantCase() {
  configure({
    testMode:'bezny', resultMode:'instant', screenGuard:true, feedbackMode:'brief', layout:'tabs', randomizace:'ANO',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:styleNames, exerciseConfig, body:32, pocet:5
  });
  GEN.exercises = structuredClone(exercises);
  const html = await build();
  const page = await pageFor(html, 'instant-s2.html');
  const overviewLabels = await page.locator('.ex-ov-name .ex-style-label').allTextContents();
  assert.deepEqual(overviewLabels.map(value => value.trim().toLowerCase()), styleNames, 'instant intro did not preserve selected styles');
  await page.locator('#studentName').fill('Synthetic Student');
  await page.evaluate(() => startTest());
  await assertRenderedContract(page, 'instant');
  return {sha256:sha256(html), renderedExercises:5, renderedQuestions:18};
}

async function secureCase() {
  configure({
    testMode:'prisny', resultMode:'secureOffline', screenGuard:true, feedbackMode:'none', layout:'tabs', randomizace:'ANO',
    exerciseDetail:true, exerciseConfigSaved:true, typyCviceni:styleNames, exerciseConfig, body:32, pocet:5
  });
  GEN.exercises = structuredClone(exercises);
  const pkg = await build();
  const page = await pageFor(pkg.studentHtml, 'secure-s2.html');
  await page.locator('#studentName').fill('Synthetic Student');
  await enterStartCode(page, pkg);
  await page.evaluate(() => startTest());
  await assertRenderedContract(page, 'secure');
  const tabLabels = await page.locator('.secure-tab strong').allTextContents();
  assert.deepEqual(tabLabels.map(value => value.trim().toLowerCase()), styleNames, 'secure tabs did not preserve selected styles');
  const verifier = await pageFor(pkg.teacherHtml, 'teacher-verifier-s2.html');
  await verifier.evaluate(() => renderTeacherPreview('__default'));
  const verifierHeadings = await verifier.locator('#teacherPreview .feedback h3').allTextContents();
  assert.equal(verifierHeadings.length, 5, 'teacher verifier preview omitted exercises');
  styleNames.forEach((style, index) => assert.ok(verifierHeadings[index].toLowerCase().includes(style), `teacher verifier replaced style ${style}`));
  assert.ok(verifierHeadings.every(value => value.includes('Advanced Conditionals')), 'teacher verifier omitted thematic subtitles');
  assert.equal(await verifier.locator('#teacherPreview .danger').count(), 0, 'valid fixture produced a teacher fidelity warning');
  const printable = await verifier.evaluate(() => prtVariantHtml('__default', true, false));
  styleNames.forEach(style => assert.ok(printable.toLowerCase().includes(style), `print/PDF source replaced style ${style}`));
  assert.equal((printable.match(new RegExp(passage, 'g')) || []).length, 1, 'print/PDF source duplicated the Reading passage');
  return {studentSha256:sha256(pkg.studentHtml), verifierSha256:sha256(pkg.teacherHtml), renderedExercises:5, renderedQuestions:18};
}

try {
  const startedAt = new Date().toISOString();
  const source = provenance();
  browser = await chromium.launch({
    headless:true,
    ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})
  });
  const instant = await instantCase();
  const secure = await secureCase();
  assert.deepEqual(pageErrors, [], 'generated student HTML produced browser page errors');
  const report = {
    sprint:'02-pedagogical-fidelity',
    status:'PASS',
    startedAt,
    completedAt:new Date().toISOString(),
    provenance:source,
    browser:await browser.version(),
    checks:[
      'instant intro, tabs and headings preserve five selected pedagogical styles',
      'secure tabs and headings preserve five selected pedagogical styles after decryption',
      'teacher verifier preview and print/PDF source preserve pedagogical labels and one Reading passage',
      'thematic title remains a secondary subtitle',
      'Reading passage appears once and does not leak into independent Multiple Choice',
      'configured exercise and question counts remain exact'
    ],
    artifacts:{instant,secure},
    limits:[
      'Headless Chromium only; physical iPadOS/Safari not tested',
      'Synthetic generated content only; no live AI request was made',
      'No GitHub Pages staging or production deployment was performed'
    ]
  };
  fs.mkdirSync('qa-results', {recursive:true});
  fs.writeFileSync('qa-results/pedagogical-fidelity-browser-s2.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (browser) await browser.close();
  gdom.window.close();
}
