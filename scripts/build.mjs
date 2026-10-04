#!/usr/bin/env node
// Produkční build Generátoru testů.
// Skládá src/shell.html + src/styles.css + src/js/* do jednoho dist/index.html,
// kopíruje public/, odkládané moduly src/features/ a lokální parser Acorn.
// Všechny aplikační skripty jsou v dist inertní (nespustitelný typ skriptu),
// dokud je po ověření permitu neodemkne centrální brána AI Studia.
//
// Kontroly check-csp.mjs, check-production-readiness.mjs a ai-core-version-rewrite.mjs
// ověřují doslovné úseky tohoto souboru (cesty k Acornu, typ inertních skriptů,
// atribut data-source, konstanta CORE_VERSION). Při přeformátování je zachovej
// a do komentářů je necituj — komentář by kontrolu splnil i bez skutečného kódu.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse, tokenizer } from 'acorn';

const APP_ID = 'generator';
const CORE_VERSION = '1.0.0';
const CORE_DIR = path.resolve('vendor', `ghrab-ai-core-${CORE_VERSION}`);
const CORE_FILE = `ghrab-ai-core-${CORE_VERSION}.js`;
const CORE_MANIFEST = `ghrab-ai-core-manifest-${CORE_VERSION}.json`;
const EXPECTED_AI_OPERATIONS = 11;
// Staré názvy modulů zůstávají v repozitáři jen jako náhrobky pro nahrávání přes GitHub web.
const MIGRATION_TOMBSTONES = new Set(['13-secure-export.js', '14-test-html-builders.js']);

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function fail(message) {
  console.error('❌ ' + message);
  process.exit(1);
}

// ── Kompakce zdrojů ─────────────────────────────────────────────────────────

// Odstraní JS komentáře podle AST (Acorn), takže nezasáhne řetězce ani regexy.
// Blokový komentář se nahradí stejným počtem odřádkování, aby seděla čísla řádků.
function stripJsComments(source, file) {
  const comments = [];
  try {
    parse(source, { ecmaVersion: 'latest', sourceType: 'script', allowAwaitOutsideFunction: true, onComment: comments, ranges: true });
  } catch (error) {
    fail(`nelze analyzovat ${file} pro build kompakci: ${error.message}`);
  }
  if (!comments.length) return source;
  let out = '';
  let cursor = 0;
  for (const comment of comments) {
    out += source.slice(cursor, comment.start);
    const raw = source.slice(comment.start, comment.end);
    if (comment.type === 'Block') {
      const lines = (raw.match(/\n/g) || []).length;
      out += lines ? '\n'.repeat(lines) : ' ';
    }
    cursor = comment.end;
  }
  return out + source.slice(cursor);
}

function compactJsWhitespace(source, file) {
  const clean = stripJsComments(source, file);
  let scan;
  try {
    scan = tokenizer(clean, { ecmaVersion:'latest', sourceType:'script', allowAwaitOutsideFunction:true });
  } catch (error) {
    fail(`nelze tokenizovat ${file} pro build kompakci: ${error.message}`);
  }
  const tokens = [];
  try {
    for (;;) {
      const token = scan.getToken();
      if (token.type.label === 'eof') break;
      tokens.push(token);
    }
  } catch (error) {
    fail(`nelze tokenizovat ${file} pro build kompakci: ${error.message}`);
  }
  let out = '', end = 0;
  for (let ti=0;ti<tokens.length;ti++) {
    const token=tokens[ti];
    const gap = clean.slice(end, token.start);
    if (/\r|\n/.test(gap)) out += '\n';
    else if (gap.length) {
      const prev=tokens[ti-1];
      const left=clean[end-1]||'',right=clean[token.start]||'';
      if((/[\w$\\]/.test(left)&&/[\w$\\]/.test(right))||(['num','regexp'].includes(prev?.type.label))||(/[+\-/?.]/.test(left)&&/[+\-/*.]/.test(right)))out+=' ';
    }
    out += clean.slice(token.start, token.end);
    end = token.end;
  }
  const semantic=(s)=>JSON.stringify(parse(s,{ecmaVersion:'latest',sourceType:'script',allowAwaitOutsideFunction:true}), (k,v)=>['start','end','raw'].includes(k)?undefined:v);
  try{if(semantic(clean)!==semantic(out))fail('JS compaction changed AST: '+file);}catch(e){fail('JS compaction invalid: '+file+' '+e.message);}
  return out;
}

// Odstraní CSS komentáře mimo řetězce.
function stripCssComments(source, file) {
  let out = '';
  let quote = '';
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      out += char;
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") { quote = char; out += char; continue; }
    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) fail(`neuzavřený CSS komentář v ${file}`);
      out += ' ';
      i = end + 1;
      continue;
    }
    out += char;
  }
  return out;
}

// Sloučí bílé znaky v CSS mimo řetězce a odstraní mezery kolem { } : ; ,
function compactCss(source, file) {
  const input = stripCssComments(source, file);
  const tight = new Set(['{', '}', ':', ';', ',']);
  let out = '';
  let quote = '';
  let escaped = false;
  let pendingSpace = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      out += char;
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      if (pendingSpace && out && !tight.has(out[out.length - 1])) out += ' ';
      pendingSpace = false;
      quote = char;
      out += char;
      continue;
    }
    if (/\s/.test(char)) { pendingSpace = true; continue; }
    if (tight.has(char)) {
      if (out.endsWith(' ')) out = out.slice(0, -1);
      out += char;
      pendingSpace = false;
      continue;
    }
    if (pendingSpace && out && !tight.has(out[out.length - 1])) out += ' ';
    pendingSpace = false;
    out += char;
  }
  return out.trim().replace(/;}/g, '}');
}

// Odstraní HTML komentáře (kromě BUILD), ořízne řádky a sloučí prázdné řádky.
function compactHtmlShell(source) {
  const lines = source.replace(/<!--(?!\s*BUILD:)[\s\S]*?-->/g, '').split('\n').map(line => line.trim());
  const out = [];
  for (const line of lines) {
    if (!line && (!out.length || out[out.length - 1] === '')) continue;
    out.push(line);
  }
  return out.join('\n');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(from, to) : fs.copyFileSync(from, to);
  }
}

// ── Vstupní kontroly ────────────────────────────────────────────────────────

// Verze musí souhlasit v package.json, RELEASE (01-core.js), CACHE_NAME (sw.js) a PWA manifestu.
function assertVersionSync() {
  const pkg = readJson('package.json');
  const core = fs.readFileSync('src/js/01-core.js', 'utf8');
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  const manifest = readJson('public/manifest.webmanifest');
  const versions = {
    package: String(pkg.version || '').trim(),
    release: core.match(/version:\s*['"]([^'"]+)['"]/)?.[1] || '',
    sw: sw.match(/CACHE_NAME\s*=\s*['"][^'"]*v([^'"]+)['"]/)?.[1] || '',
    manifest: String(manifest.version || '').trim()
  };
  if (manifest.id !== './' || manifest.start_url !== './') fail('PWA manifest musí mít stabilní id a start_url');
  if (Object.values(versions).some(v => !v) || new Set(Object.values(versions)).size !== 1) fail('nesedí verze napříč projektem');
  return versions.package;
}

for (const f of [CORE_FILE, CORE_MANIFEST]) {
  if (!fs.existsSync(path.join(CORE_DIR, f))) fail('chybí Core artefakt ' + f);
}
const coreManifest = readJson(path.join(CORE_DIR, CORE_MANIFEST));
if (coreManifest.coreVersion !== CORE_VERSION || coreManifest.artifacts?.[CORE_FILE]?.sha256 !== sha(path.join(CORE_DIR, CORE_FILE))) {
  fail('GHRAB AI Core neprošel SHA-256 kontrolou');
}

const DIST_DIR = path.resolve('dist');
const DIST = path.join(DIST_DIR, 'index.html');
const PUBLIC_DIR = path.resolve('public');
const appVersion = assertVersionSync();

const requestedBuildTime = String(process.env.GHRAB_BUILD_TIME || '').trim();
if (requestedBuildTime && Number.isNaN(Date.parse(requestedBuildTime))) fail('GHRAB_BUILD_TIME musí být platný ISO-8601 čas');
const buildTime = requestedBuildTime ? new Date(requestedBuildTime).toISOString() : new Date().toISOString();

// Acorn se kopíruje do dist/vendor jako lazy CSP-safe parser pro smoke validátor.
const ACORN_DIR = path.resolve('node_modules','acorn');
const ACORN_PACKAGE = path.join(ACORN_DIR, 'package.json');
const ACORN_BROWSER = path.join(ACORN_DIR, 'dist', 'acorn.js');
const ACORN_LICENSE = path.join(ACORN_DIR, 'LICENSE');
if (!fs.existsSync(ACORN_PACKAGE) || !fs.existsSync(ACORN_BROWSER) || !fs.existsSync(ACORN_LICENSE)) {
  fail('chybí lokální CSP-safe JavaScript parser Acorn; spusť npm ci');
}
const expectedAcorn = String(readJson('package.json').devDependencies?.acorn || '').trim();
const installedAcorn = String(readJson(ACORN_PACKAGE).version || '').trim();
if (!expectedAcorn || installedAcorn !== expectedAcorn) {
  fail(`nesedí pin Acorn: očekáváno ${expectedAcorn || 'missing'}, nainstalováno ${installedAcorn || 'missing'}; spusť čisté npm ci`);
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

// ── Skládání dist/index.html ────────────────────────────────────────────────

const shell = compactHtmlShell(fs.readFileSync('src/shell.html', 'utf8'));
const styles = compactCss(fs.readFileSync('src/styles.css', 'utf8'), 'src/styles.css');
const jsDir = 'src/js';
// Pořadí modulů určuje číselný prefix názvu souboru (classic skripty se sdíleným globálním scope).
const jsFiles = fs.readdirSync(jsDir)
  .filter(f => f.endsWith('.js') && !MIGRATION_TOMBSTONES.has(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const mainParts = jsFiles.filter(f => !f.startsWith('50-') && !f.startsWith('60-'));

const inlineScriptTag = file => `<script type="application/ghrab-protected" data-ghrab-protected data-source="${file}">\n${compactJsWhitespace(fs.readFileSync(path.join(jsDir, file), 'utf8'), file)}\n</script>`;
const coreTag = `<script type="application/ghrab-protected" data-ghrab-protected data-source="${CORE_FILE}">\n${fs.readFileSync(path.join(CORE_DIR, CORE_FILE), 'utf8')}\n</script>`;
const jsMainTags = [coreTag, ...mainParts.map(inlineScriptTag)].join('\n');
const jsCsTag = inlineScriptTag('50-cs-module.js');
const jsPwaTag = inlineScriptTag('60-pwa.js');

// Náhrady přes funkci, aby se znaky $ v kódu nevykládaly jako vzory replace().
let out = shell
  .replace('{{STYLES}}', () => styles)
  .replace('{{APP_VERSION}}', () => appVersion)
  .replace('{{JS_MAIN_TAGS}}', () => jsMainTags)
  .replace('{{JS_CS_TAG}}', () => jsCsTag)
  .replace('{{JS_PWA_TAG}}', () => jsPwaTag);
out = out.replace(/(<html[^>]*>)/i, `$1\n<!-- BUILD: ${buildTime} -->`);
fs.writeFileSync(DIST, out, 'utf8');

copyDir(PUBLIC_DIR, DIST_DIR);
// JSON konfigurace se v dist ukládají kompaktně; zdrojové soubory zůstávají čitelné a byte-stable pro audit.
for (const file of (function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])})(DIST_DIR)) {
  if (!/\.(?:json|webmanifest)$/i.test(file)) continue;
  try { fs.writeFileSync(file, JSON.stringify(JSON.parse(fs.readFileSync(file,'utf8')))+'\n'); } catch {}
}
copyDir(path.resolve('src', 'features'), path.join(DIST_DIR, 'features'));
fs.mkdirSync(path.join(DIST_DIR, 'vendor'), { recursive: true });
fs.copyFileSync(ACORN_BROWSER, path.join(DIST_DIR,'vendor','acorn.js'));
fs.copyFileSync(ACORN_LICENSE, path.join(DIST_DIR, 'vendor', 'acorn-LICENSE.txt'));

// ── Výstupní kontroly ───────────────────────────────────────────────────────

// Registr AI operací musí odpovídat verzi a každá operace musí být v kódu skutečně použita.
const operations = readJson(path.join(DIST_DIR, 'ai-operations.json'));
if (operations.appId !== APP_ID || operations.appVersion !== appVersion || operations.coreVersion !== CORE_VERSION || operations.operations.length !== EXPECTED_AI_OPERATIONS) {
  fail('neplatný ai-operations.json');
}
const appSource = mainParts.map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
for (const op of operations.operations) {
  if (!appSource.includes(`'${op.operation}'`) && !appSource.includes(`"${op.operation}"`)) fail('integrace neobsahuje operaci ' + op.operation);
}

// Katalogový manifest pro AI Studio; před formálním schválením nesmí deklarovat produkci.
const template = path.resolve('studio/app-manifest.template.json');
if (fs.existsSync(template)) {
  const text = fs.readFileSync(template, 'utf8').replaceAll('__APP_VERSION__', appVersion).replaceAll('__BUILD_TIME__', buildTime);
  const manifest = JSON.parse(text);
  const status = `${manifest.status?.cs || ''} ${manifest.status?.en || ''}`.toLowerCase();
  if (/produk|production/.test(status)) fail('manifest před schválením nesmí deklarovat produkci');
  if (manifest.aiCore?.coreVersion !== CORE_VERSION || manifest.aiCore?.serverReady !== true || manifest.aiCore?.conformancePassed !== true) {
    fail('studio-manifest nemá P1 AI Core metadata');
  }
  fs.writeFileSync(path.join(DIST_DIR, 'studio-manifest.json'), text);
}

console.log(`✅ Generátor ${appVersion}: Core ${CORE_VERSION} SHA-256 OK · ${operations.operations.length} operací · ${mainParts.length + 2} initial modulů + 2 lazy features · ${(fs.statSync(DIST).size / 1024).toFixed(1)} kB`);

// P2: canonical cross-application platform post-processing.
await import("./apply-ghrab-platform.mjs");
