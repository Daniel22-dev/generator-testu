#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const fixture = path.resolve('qa-results/qa-fixtures/teacher_verifier.html');
const outDir = path.resolve('qa-results/stage3-pdf-quality');
if (!fs.existsSync(fixture)) {
  console.error('FAIL Stage 3 PDF quality: chybí qa-results/qa-fixtures/teacher_verifier.html. Spusť nejprve QA fixture generation.');
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const logoPath = path.resolve('public/assets/brand/school-logo.png');
if (!fs.existsSync(logoPath)) throw new Error('chybí public/assets/brand/school-logo.png');
const logoDataUri = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;

function patchFixture(html) {
  const configMatch = html.match(/^const CONFIG=(.*);$/m);
  if (!configMatch) throw new Error('CONFIG nebyl ve verifier fixture nalezen');
  const config = JSON.parse(configMatch[1]);
  config.nazev = 'Český PDF audit – Příliš žluťoučký kůň';
  config.proKoho = '3. ročník – QA';
  config.schoolLogoDataUri = logoDataUri;
  html = html.replace(configMatch[0], `const CONFIG=${JSON.stringify(config)};`);

  const mcItems = Array.from({ length: 18 }, (_, i) => ({
    question: `Která možnost nejlépe odpovídá zadání ${i + 1}? Příliš žluťoučký kůň úpěl ďábelské ódy a žák pečlivě četl dlouhou větu.`,
    options: ['Správná odpověď s českou diakritikou', 'Delší distraktor s kontextem', 'Krátká možnost C', 'Ř, š, č, ž, ý, á, í, é, ú, ů, ď, ť, ň'],
    correct: 0,
    explanation: 'Vysvětlení: správná odpověď odpovídá testovanému jevu.',
  }));
  const passage = ('Přečti delší text. Žluťoučký kůň běžel přes údolí a učitel vysvětloval žákům bezpečné stránkování. ').repeat(36);
  const variants = { __default: [
    { type: 'multiple choice', style: 'multiple choice', title: 'Výběr odpovědi', points_total: 18, items: mcItems, points_each: 1, item_points: Array(18).fill(1) },
    { type: 'reading comprehension', style: 'reading comprehension', title: 'Čtení s porozuměním', points_total: 12, passage, items: Array.from({ length: 6 }, (_, i) => ({ question: `Čtení – otázka ${i + 1}: Co vyplývá z textu?`, options: ['První možnost', 'Druhá možnost', 'Třetí možnost'], correct: 1, explanation: 'Vysvětlení k otázce.' })), points_each: 2, item_points: Array(6).fill(2) },
    { type: 'listening comprehension', style: 'listening comprehension', title: 'Poslech s porozuměním', points_total: 8, items: Array.from({ length: 4 }, (_, i) => ({ question: `Poslech – otázka ${i + 1}: Vyber správnou odpověď.`, options: ['Ano', 'Ne', 'Nelze určit'], correct: 0, transcript: 'Příliš žluťoučký kůň úpěl ďábelské ódy. Učitelský transkript nesmí být ve studentské verzi.', explanation: 'Vysvětlení poslechové položky.' })), points_each: 2, item_points: Array(4).fill(2) },
    { type: 'transformation-chain', style: 'transformation-chain', title: 'Transformace', points_total: 2, items: [{ base_sentence: 'Žák pečlivě přečetl výchozí větu.', transformations: [{ instruction: 'Přepiš větu do záporu.', answer: 'Žák větu nepřečetl.' }, { instruction: 'Přepiš větu jako otázku.', answer: 'Přečetl žák větu?' }] }], points_each: 2, item_points: [2] },
  ] };
  const variantsMatch = html.match(/^const VARIANTS_FULL=(.*);$/m);
  if (!variantsMatch) throw new Error('VARIANTS_FULL nebyl ve verifier fixture nalezen');
  return html.replace(variantsMatch[0], `const VARIANTS_FULL=${JSON.stringify(variants)};`);
}

function assertPdf(file, expectedPrefix) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 50_000) throw new Error(`${path.basename(file)} je podezřele malý (${bytes.length} B)`);
  if (bytes.subarray(0, 8).toString('latin1') !== '%PDF-1.4') throw new Error(`${path.basename(file)} nemá PDF 1.4 hlavičku`);
  if (!bytes.subarray(Math.max(0, bytes.length - 64)).toString('latin1').includes('%%EOF')) throw new Error(`${path.basename(file)} nemá PDF EOF marker`);
  if (!path.basename(file).startsWith(expectedPrefix)) throw new Error(`neočekávaný název PDF: ${path.basename(file)}`);
  const pageCount = (bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
  if (pageCount < 2) throw new Error(`${path.basename(file)} neověřil vícestránkové PDF (${pageCount} stran)`);
  return { bytes: bytes.length, pages: pageCount };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
try {
  const html = patchFixture(fs.readFileSync(fixture, 'utf8'));
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(150);

  const contract = await page.evaluate(() => {
    const student = prtVariantHtml('__default', false, false);
    const teacher = prtVariantHtml('__default', true, false);
    return {
      studentLeaksKey: student.includes('[OK]') || student.includes('Transkript (učitel):') || student.includes('Vysvětlení:</b>'),
      teacherHasKey: teacher.includes('[OK]') && teacher.includes('Transkript (učitel):') && teacher.includes('Vysvětlení:</b>'),
      czechLabels: teacher.includes('Výchozí věta:') && teacher.includes('Vysvětlení:') && student.includes('Jméno:') && student.includes('Známka:'),
    };
  });
  if (contract.studentLeaksKey) throw new Error('studentský PDF markup obsahuje teacher-only obsah');
  if (!contract.teacherHasKey) throw new Error('učitelský PDF markup neobsahuje očekávaný klíč/transkript/vysvětlení');
  if (!contract.czechLabels) throw new Error('PDF markup neobsahuje očekávané české diakritické popisky');

  const pagination = await page.evaluate(async () => {
    const W = 794, H = 1123, M = 40, contentH = H - (M * 2);
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-100000px;top:0;width:'+W+'px;background:#fff;z-index:-1';
    document.body.appendChild(stage);
    const root = stage.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>'+prtCss()+'.toolbar{display:none!important}.page{box-sizing:border-box;width:'+W+'px;max-width:none;padding:0 22px;font-family:Georgia,serif;color:#000;background:#fff;line-height:1.5}.variant{page-break-after:auto}</style><div class="page">'+prtVariantHtml('__default', true, false)+'</div>';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const logo = root.querySelector('.school-logo');
    if (logo && typeof logo.decode === 'function') { try { await logo.decode(); } catch {} }
    const paper = root.querySelector('.page');
    const rr = paper.getBoundingClientRect();
    const cuts = pdf3PageCuts(paper, contentH);
    const brokenQuestions = [];
    const brokenLines = [];
    const orphanExerciseStarts = [];
    for (const cut of cuts.slice(1, -1)) {
      for (const el of paper.querySelectorAll('.q')) {
        const r = el.getBoundingClientRect(), top = r.top - rr.top, bottom = r.bottom - rr.top;
        if (top + 2 < cut && bottom - 2 > cut && r.height < H * 0.94) brokenQuestions.push({ cut, top, bottom });
      }
      for (const ex of paper.querySelectorAll('.ex')) {
        const r = ex.getBoundingClientRect(), top = r.top - rr.top, bottom = r.bottom - rr.top;
        if (!(top < cut && bottom > cut)) continue;
        const first = ex.querySelector('.q,.match,.tbl,.src,.num-line,.ans-line');
        if (!first) continue;
        const fr = first.getBoundingClientRect(), firstBottom = fr.bottom - rr.top;
        if (top + 2 < cut && firstBottom - 2 > cut) orphanExerciseStarts.push({ cut, top, firstBottom });
      }
      const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!(node.nodeValue || '').trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          const top = r.top - rr.top, bottom = r.bottom - rr.top;
          if (top + 0.5 < cut && bottom - 0.5 > cut) { brokenLines.push({ cut, top, bottom }); break; }
        }
        range.detach?.();
      }
    }
    const logoRect = logo?.getBoundingClientRect();
    const logoOk = !!(logo && logo.naturalWidth > 0 && logo.naturalHeight > 0 && logoRect.width > 0 && logoRect.height > 0);
    stage.remove();
    return { cuts, brokenQuestions, brokenLines, orphanExerciseStarts, logoOk, verticalMarginPx: M, contentHeightPx: contentH };
  });
  if (pagination.cuts.length < 3) throw new Error('quality fixture nevytvořila vícestránkový dokument');
  if (pagination.brokenQuestions.length) throw new Error(`stránkování řeže otázky: ${JSON.stringify(pagination.brokenQuestions)}`);
  if (pagination.brokenLines.length) throw new Error(`stránkování řeže textový řádek: ${JSON.stringify(pagination.brokenLines)}`);
  if (pagination.orphanExerciseStarts.length) throw new Error(`stránkování nechává nadpis cvičení oddělený od prvního obsahu: ${JSON.stringify(pagination.orphanExerciseStarts)}`);
  if (pagination.verticalMarginPx < 32) throw new Error(`vertikální PDF okraj je příliš malý: ${pagination.verticalMarginPx}px`);
  if (!pagination.logoOk) throw new Error('školní logo není v PDF DOM skutečně vykreslitelné');

  const pdfResults = [];
  for (const test of [{ withKey: false, prefix: 'student_' }, { withKey: true, prefix: 'ucitel_klic_' }]) {
    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
    await page.evaluate(withKey => downloadDirectPdf(withKey), test.withKey);
    const download = await downloadPromise;
    const file = path.join(outDir, download.suggestedFilename());
    await download.saveAs(file);
    const info = assertPdf(file, test.prefix);
    pdfResults.push({ file: path.basename(file), ...info, withKey: test.withKey });
    console.log(`PASS ${path.basename(file)} ${info.bytes} B / ${info.pages} stran`);
  }
  if (pageErrors.length) throw new Error(`browser pageerror: ${pageErrors.join(' | ')}`);
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ schema: 'ghrab-stage3-pdf-quality-v1', status: 'passed', contract, pagination: { cuts: pagination.cuts, brokenQuestions: pagination.brokenQuestions.length, brokenLines: pagination.brokenLines.length, orphanExerciseStarts: pagination.orphanExerciseStarts.length, verticalMarginPx: pagination.verticalMarginPx, contentHeightPx: pagination.contentHeightPx, logoOk: pagination.logoOk }, pdfResults }, null, 2) + '\n');
  console.log(`PASS pagination cuts: ${pagination.cuts.join(', ')}`);
  console.log('PASS Stage 3 PDF quality');
} finally {
  await browser.close();
}
