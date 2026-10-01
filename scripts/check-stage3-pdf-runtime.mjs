#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const fixture = path.resolve('qa-results/qa-fixtures/teacher_verifier.html');
const outDir = path.resolve('qa-results/stage3-pdf-runtime');
if (!fs.existsSync(fixture)) {
  console.error('FAIL Stage 3 PDF runtime: chybí qa-results/qa-fixtures/teacher_verifier.html. Spusť nejprve QA fixture generation.');
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function assertPdf(file, expectedPrefix) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 10_000) throw new Error(`${path.basename(file)} je podezřele malý (${bytes.length} B)`);
  if (bytes.subarray(0, 8).toString('latin1') !== '%PDF-1.4') throw new Error(`${path.basename(file)} nemá očekávanou PDF hlavičku`);
  if (!bytes.subarray(Math.max(0, bytes.length - 64)).toString('latin1').includes('%%EOF')) throw new Error(`${path.basename(file)} nemá PDF EOF marker`);
  if (!path.basename(file).startsWith(expectedPrefix)) throw new Error(`neočekávaný název PDF: ${path.basename(file)}`);
  return bytes.length;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
try {
  const html = fs.readFileSync(fixture, 'utf8');
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  if (await page.evaluate(() => typeof window.downloadDirectPdf !== 'function')) throw new Error('downloadDirectPdf není dostupné');

  const results = [];
  for (const test of [
    { withKey: false, prefix: 'student_' },
    { withKey: true, prefix: 'ucitel_klic_' },
  ]) {
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.evaluate(withKey => window.downloadDirectPdf(withKey), test.withKey);
    const download = await downloadPromise;
    const file = path.join(outDir, download.suggestedFilename());
    await download.saveAs(file);
    results.push({ file: path.basename(file), bytes: assertPdf(file, test.prefix) });
  }

  if (pageErrors.length) throw new Error(`browser pageerror: ${pageErrors.join(' | ')}`);
  for (const result of results) console.log(`PASS ${result.file} ${result.bytes} B`);
  console.log('PASS Stage 3 direct PDF real-browser runtime');
} finally {
  await browser.close();
}
