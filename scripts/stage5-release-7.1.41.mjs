#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FROM = '7.1.40';
const TO = '7.1.41';
const DATE = '2026-09-16';
const CHANGE = 'ETAPA 5 – AUTO-PATCH E2E (7.1.41): bez změny aplikační logiky. Patch ověřuje skutečné automatické převzetí nové verze AI Studiem. Release zachovává GARP 2.5/N5, platformní kontrakt 1.1.2, Studio Bridge v2, secure runtime, Forms, scoring, kryptografii i AI workflow; po úspěšném Pages deployi Generátor nově odešle AI Studiu repository_dispatch app-updated.';

const abs = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(abs(p), 'utf8');
const write = (p, text) => fs.writeFileSync(abs(p), text, 'utf8');
const assertIncludes = (text, needle, file) => {
  if (!text.includes(needle)) throw new Error(`${file}: očekávaný text nenalezen: ${needle}`);
};
const replaceAllRequired = (file, from = FROM, to = TO) => {
  const before = read(file);
  assertIncludes(before, from, file);
  write(file, before.split(from).join(to));
};
const replaceRequired = (file, from, to) => {
  const before = read(file);
  assertIncludes(before, from, file);
  write(file, before.replace(from, to));
};

const pkg = JSON.parse(read('package.json'));
if (pkg.version === TO) {
  console.log(`Stage 5 release already prepared: ${TO}`);
  process.exit(0);
}
if (pkg.version !== FROM) throw new Error(`Stage 5 expects ${FROM}, found ${pkg.version}`);

// 1) Core release metadata: keep 7.1.40 as historical entry and insert a new 7.1.41 entry.
{
  const file = 'src/js/01-core.js';
  let text = read(file);
  const oldVersion = `  version: '${FROM}',`;
  const newVersion = `  version: '${TO}',`;
  assertIncludes(text, oldVersion, file);
  text = text.replace(oldVersion, newVersion);
  const marker = '  changes: [\n';
  const start = text.indexOf(marker);
  const end = text.indexOf('\n  ]\n});', start + marker.length);
  if (start < 0 || end < 0) throw new Error(`${file}: RELEASE.changes block not found`);
  const rows = text.slice(start + marker.length, end).split('\n').filter((line) => line.trim());
  const newRow = `    '${CHANGE}',`;
  const nextRows = [newRow, ...rows].slice(0, 10);
  text = text.slice(0, start + marker.length) + nextRows.join('\n') + text.slice(end);
  write(file, text);
}

// 2) Strict runtime/PWA/QA version surfaces and release-script target.
for (const file of [
  'package.json',
  'package-lock.json',
  'src/shell.html',
  'src/js/07z-ai-core-integration.js',
  'public/access/error-reporter-adapter.js',
  'public/ai-operations.json',
  'public/config/data-manifest.json',
  'public/config/platform-manifest.json',
  'public/config/security-headers.json',
  'ghrab-platform.consumer.json',
  'public/ghrab-platform.consumer.json',
  'qa/qa-manifest.json',
  'reporter-test.config.json',
  'public/manual/index.html',
  'public/manifest.webmanifest',
  'public/sw.js',
  'scripts/test-suite-session-lifecycle.mjs',
  'APP-generator-GARP.txt',
]) replaceAllRequired(file);

// 3) Release acceptance remains fail-closed until this exact patch passes GitHub CI/deployment.
{
  const file = 'public/config/release-acceptance.json';
  const data = JSON.parse(read(file));
  if (data.appVersion !== FROM) throw new Error(`${file}: expected appVersion ${FROM}`);
  data.appVersion = TO;
  data.releaseStatus = 'auto-patch-e2e-candidate-pending-clean-github-ci-and-deployment';
  data.primaryRuntime.currentUseApproved = false;
  data.github.status = 'not-yet-uploaded';
  data.github.uploadDeferredUntilEcosystemComplete = false;
  data.github.postUploadValidationRequired = true;
  data.runtimeAudit.transport = 'deterministic-version-bump-plus-garp25-static; exact-lockfile GitHub CI/deployment pending';
  data.runtimeAudit.note = `${TO} is a no-feature-change patch over the accepted ${FROM} Studio auto-patch baseline. It exists solely to prove end-to-end automatic patch adoption. Runtime/PWA/QA metadata, SBOM and AI assurance fingerprint are regenerated; secure runtime, teacher access, Forms, scoring, cryptography, platform contract and AI behavior are intentionally unchanged.`;
  data.note = `${TO} auto-patch E2E candidate; ${FROM} remains the accepted Studio baseline until the ${TO} Pages deployment is verified and promoted automatically.`;
  write(file, JSON.stringify(data, null, 2) + '\n');
}

// 4) Human release documentation.
{
  const file = 'README.md';
  let text = read(file);
  replaceGuard(text, `**Aktuální verze:** ${FROM}  `, file);
  text = text.replace(
    `**Aktuální verze:** ${FROM}  \n`,
    `**Aktuální verze:** ${TO}  \n\n> **${TO} Etapa 5 – auto-patch E2E (${DATE}):** bez změny aplikační logiky. Jde o kontrolní patch nad schváleným baseline ${FROM}. Po úspěšném Pages deployi Generátor odešle AI Studiu událost \`app-updated\`; Studio musí samo ověřit live manifest, přijmout pouze patch změnu a persistovat ${TO} jako nový release-wave baseline.\n`,
  );
  const oldState = `Verze **${FROM}** je baseline release bez zamýšlené funkční změny nad 7.1.39. Jejím účelem je uzavřít N5/GARP 2.5 stav a vytvořit jednoznačný výchozí bod pro centrální auto-patch AI Studia. **Do zápisu jako auto-patch baseline zůstává podmínkou nový čistý GitHub CI/deployment.**`;
  assertIncludes(text, oldState, file);
  text = text.replace(oldState, `Verze **${TO}** je kontrolní patch Etapy 5 bez zamýšlené funkční změny. **${FROM} je již schválený a nasazený minimální baseline centrálního auto-patche AI Studia.** ${TO} ověřuje skutečný end-to-end tok: deploy Generátoru → \`app-updated\` → live ověření Studiem → patch-only promotion → persistence nového baseline.`);
  write(file, text);
}

function replaceGuard(text, needle, file) {
  if (!text.includes(needle)) throw new Error(`${file}: expected marker missing: ${needle}`);
}

{
  const file = 'CHANGELOG.md';
  const before = read(file);
  const heading = `## ${TO} — Etapa 5: auto-patch E2E (${DATE})`;
  if (!before.startsWith(`## ${FROM} `)) throw new Error(`${file}: unexpected current top release`);
  const section = `${heading}\n\n- Bez změny aplikační logiky nebo uživatelského workflow.\n- Kontrolní patch nad schváleným ${FROM} baseline pro ověření skutečného auto-patche AI Studia.\n- Runtime/PWA/QA identita, SBOM a AI assurance fingerprint jsou přegenerovány pro ${TO}.\n- Po úspěšném GitHub Pages deployi Generátor odešle AI Studiu \`repository_dispatch\` typu \`app-updated\`.\n- AI Studio musí bez ruční změny své konfigurace ověřit live deployment, přijmout pouze patch 7.1.40 → 7.1.41 a persistovat ${TO} jako nový release-wave baseline.\n\n`;
  write(file, section + before);
}

write('RELEASE-NOTES-7.1.41.md', `# Generátor interaktivních testů ${TO}\n\nDatum: ${DATE}\n\n## Účel\n\nTato verze je čistý kontrolní PATCH nad schváleným ${FROM} baseline. Nemění pedagogické ani bezpečnostní chování aplikace. Jejím jediným účelem je end-to-end ověřit centrální auto-patch AI Studia.\n\n## Co se mění\n\n- verze runtime/PWA/QA metadat ${FROM} → ${TO},\n- nový SBOM a AI assurance fingerprint odpovídající ${TO},\n- po úspěšném Pages deployi workflow odešle AI Studiu \`repository_dispatch: app-updated\`.\n\n## Co se nemění\n\nGARP 2.5/N5, platformní kontrakt 1.1.2, Studio Bridge v2, secure studentský runtime, teacher verifier, Google Forms workflow, scoring, RSA/AES ani AI operace.\n\n## Akceptační podmínka Etapy 5\n\nEtapa je uzavřena pouze tehdy, pokud AI Studio bez ruční úpravy samo detekuje nasazené ${TO}, vyhodnotí změnu jako povolený patch, projde svými QA/P5 branami a persistuje ${TO} do release-wave baseline.\n`);

// 5) Current security status: preserve 7.1.40 evidence paths as historical baseline, update only current-candidate claims.
{
  const file = 'security/ASSURANCE-STATUS.txt';
  let text = read(file);
  for (const [from, to] of [
    [`Application: generator ${FROM}`, `Application: generator ${TO}`],
    [`VERSION CONSISTENCY          PASS (${FROM} across runtime/PWA/QA sources)`, `VERSION CONSISTENCY          PASS (${TO} across runtime/PWA/QA sources)`],
    [`LOCAL BUILD                  PASS (cache ghrab-generator-v${FROM})`, `LOCAL BUILD                  PASS (cache ghrab-generator-v${TO})`],
    [`DEPLOYMENT LEAK SCAN         PASS on locally built ${FROM} dist`, `DEPLOYMENT LEAK SCAN         PASS on locally built ${TO} dist`],
    [`IMPORTANT ${FROM} VALIDATION BOUNDARY`, `IMPORTANT ${TO} VALIDATION BOUNDARY`],
    [`The ${FROM} candidate has not yet been uploaded`, `The ${TO} candidate has not yet been deployed`],
    [`SOURCE BASELINE CANDIDATE    ${FROM} READY FOR REMOTE CI`, `SOURCE PATCH CANDIDATE       ${TO} READY FOR REMOTE CI`],
    [`STUDIO ENROLLMENT            NOT YET PERFORMED`, `STUDIO ENROLLMENT            ACTIVE FROM ACCEPTED ${FROM} BASELINE`],
    [`AUTOMATIC PATCH PROMOTION    NOT YET ENABLED FOR GENERATOR`, `AUTOMATIC PATCH PROMOTION    ENABLED; ${TO} IS THE FIRST LIVE E2E PATCH TEST`],
    [`SECURITY          AMBER pending ${FROM} remote CI + LIVE environment`, `SECURITY          AMBER pending ${TO} remote CI/deployment + LIVE environment`],
  ]) {
    if (text.includes(from)) text = text.replace(from, to);
  }
  const purposeStart = `${FROM} intentionally adds no application feature or workflow change.`;
  if (text.includes(purposeStart)) {
    const line = text.split('\n').find((row) => row.startsWith(purposeStart));
    text = text.replace(line, `${TO} intentionally adds no application feature or workflow change. It is the first controlled patch above the accepted ${FROM} AI Studio auto-patch minimum baseline and exists to prove the complete deployment-notification-promotion-persistence chain.`);
  }
  const nextLine = text.split('\n').find((row) => row.startsWith('Required next condition:'));
  if (nextLine) text = text.replace(nextLine, `Required next condition: deploy ${TO}; Generator must notify AI Studio automatically; Studio must verify and persist ${TO} without manual release-wave editing.`);
  write(file, text);
}

{
  const file = 'security/NEGATIVE-CONTROLS.txt';
  replaceRequired(file, `Application: generator ${FROM}`, `Application: generator ${TO}`);
}

{
  const file = 'security/SECRET-SCAN-SUMMARY.txt';
  let text = read(file);
  const replacements = [
    [`Application: generator ${FROM}`, `Application: generator ${TO}`],
    [`STATUS: PASS for the current local ${FROM} N5/static scanner scope.`, `STATUS: PASS for the current local ${TO} N5/static scanner scope.`],
    [`CURRENT ${FROM} / N5 RESULTS`, `CURRENT ${TO} / N5 RESULTS`],
    [`over the locally built ${FROM} dist`, `over the locally built ${TO} dist`],
    [`Last exact remote runtime baseline remains 7.1.39 until ${FROM} is uploaded and GitHub Actions/deployment complete successfully.`, `Accepted exact remote/Studio baseline is ${FROM}; ${TO} remains a candidate until its GitHub Actions/deployment and Studio promotion complete successfully.`],
    [`Local ${FROM} build/static GARP evidence is not a substitute for the pending exact-lockfile browser/P5/deployment evidence.`, `Local ${TO} build/static GARP evidence is not a substitute for the pending exact-lockfile browser/P5/deployment and Studio auto-promotion evidence.`],
  ];
  for (const [from, to] of replacements) if (text.includes(from)) text = text.replace(from, to);
  write(file, text);
}

{
  const file = 'security/garp25/TOOLING-SOURCE.txt';
  let text = read(file);
  for (const [from, to] of [
    [`Application: generator ${FROM}`, `Application: generator ${TO}`],
    [`CURRENT ${FROM} LOCAL VALIDATION`, `CURRENT ${TO} LOCAL VALIDATION`],
    [`cache ghrab-generator-v${FROM}`, `cache ghrab-generator-v${TO}`],
    [`on locally built ${FROM} dist`, `on locally built ${TO} dist`],
    [`The ${FROM} source candidate still requires a new exact-lockfile GitHub CI/deploy run before it can become the AI Studio auto-patch minimum baseline.`, `${FROM} is the accepted AI Studio auto-patch minimum baseline. ${TO} is the first end-to-end patch candidate and requires exact-lockfile GitHub CI/deploy plus automatic Studio promotion evidence.`],
  ]) if (text.includes(from)) text = text.replace(from, to);
  write(file, text);
}

// 6) Candidate scope evidence (remote CI evidence is intentionally not fabricated here).
const evidenceDir = `security/evidence/autopatch-e2e-${TO}-${DATE}`;
fs.mkdirSync(abs(evidenceDir), { recursive: true });
write(`${evidenceDir}/scope.txt`, `Generator ${TO} – Stage 5 auto-patch E2E candidate\nDate: ${DATE}\nBase: accepted ${FROM} GARP 2.5/N5 auto-patch baseline\nFunctional application changes: none\nRelease-only changes: version identity, regenerated SBOM/fingerprint, AI Studio deployment notification workflow\nRemote evidence boundary: GitHub CI, Pages deployment, repository_dispatch, AI Studio promotion and release-wave persistence must be observed after commit/deploy; they are not claimed by this source-preparation file.\n`);

// 7) Regenerate deterministic version-bound artifacts from source/lockfile.
execFileSync(process.execPath, ['scripts/generate-cyclonedx-sbom.mjs', `security/sbom/generator-testu-${TO}.cdx.json`], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/generate-ai-assurance-fingerprint.mjs', 'security/evidence/ai-assurance-fingerprint.json'], { cwd: root, stdio: 'inherit' });

// 8) Refresh security tree SHA256 manifest after all security artifacts are current.
const securityRoot = abs('security');
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      const rel = path.relative(root, full).replaceAll('\\', '/');
      if (rel !== 'security/SHA256SUMS.txt') files.push(rel);
    }
  }
};
walk(securityRoot);
files.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
const sums = files.map((file) => `${createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex')}  ${file}`).join('\n') + '\n';
write('security/SHA256SUMS.txt', sums);

// 9) Fail fast on version drift and assurance-generation drift.
execFileSync(process.execPath, ['scripts/check-versions.mjs'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['security/garp25/tools/selftest-garp251.mjs'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/generate-cyclonedx-sbom.mjs', `security/sbom/generator-testu-${TO}.cdx.json`, '--check'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/generate-ai-assurance-fingerprint.mjs', 'security/evidence/ai-assurance-fingerprint.json', '--check'], { cwd: root, stdio: 'inherit' });

console.log(`Stage 5 release candidate prepared deterministically: ${FROM} -> ${TO}`);
