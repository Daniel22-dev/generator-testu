// scripts/build.mjs — v3 (izolované classic script tagy)
// Složí dist/index.html ze src/shell.html + src/styles.css + src/js/*.js.
// Pořadí JS modulů = abecední řazení názvů souborů. Každý modul je vložen do
// samostatného classic <script> tagu; nejde o ES moduly ani import/export. Tím
// runtime chyba jednoho modulu nezastaví následující přístupový/init modul.
import fs from "node:fs";
import path from "node:path";


function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function assertVersionSync() {
  const pkg = readJson("package.json");
  const core = fs.readFileSync("src/js/01-core.js", "utf8");
  const sw = fs.readFileSync("public/sw.js", "utf8");
  const manifest = readJson("public/manifest.webmanifest");

  const versions = {
    "package.json version": String(pkg.version || "").trim(),
    "src/js/01-core.js RELEASE.version": core.match(/version:\s*['\"]([^'\"]+)['\"]/)?.[1] || "",
    "public/sw.js CACHE_NAME": sw.match(/CACHE_NAME\s*=\s*['\"][^'\"]*v([^'\"]+)['\"]/)?.[1] || "",
    "public/manifest.webmanifest start_url": String(manifest.start_url || "").match(/[?&]v=([^&]+)/)?.[1] || "",
  };

  const values = Object.values(versions);
  if (values.some(v => !v) || new Set(values).size !== 1) {
    console.error("❌ Nesedi verze napric projektem:");
    for (const [label, value] of Object.entries(versions)) {
      console.error(`   - ${label}: ${value || "NENALEZENO"}`);
    }
    process.exit(1);
  }
  console.log(`✅  Verze sedi napric projektem: ${versions["package.json version"]}`);
}

const DIST_DIR = path.resolve("dist");
const DIST = path.join(DIST_DIR, "index.html");
const MANIFEST_SRC = path.resolve("src/access-manifest.json");
const MANIFEST_DIST = path.join(DIST_DIR, "access-manifest.json");
const PUBLIC_DIR = path.resolve("public");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

assertVersionSync();

fs.mkdirSync(DIST_DIR, { recursive: true });

const shell = fs.readFileSync("src/shell.html", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");
const appVersion = String(readJson("package.json").version || "").trim();

const jsDir = "src/js";
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort();
const mainParts = jsFiles.filter(f => !f.startsWith("50-") && !f.startsWith("60-"));
function inlineScriptTag(file) {
  const code = fs.readFileSync(path.join(jsDir, file), "utf8");
  // Každý zdrojový modul je samostatný classic script. Runtime chyba v jednom
  // modulu tak nezastaví načtení přístupové brány ani závěrečného init modulu.
  return `<script data-source="${file}">\n${code}\n</script>`;
}

const jsMainTags = mainParts.map(inlineScriptTag).join("\n");
const jsCsTag = inlineScriptTag("50-cs-module.js");
const jsPwaTag = inlineScriptTag("60-pwa.js");

// replace() s funkcí kvůli $-sekvencím v kódu (jinak by "$&" apod. rozbily obsah)
let out = shell
  .replace("{{STYLES}}", () => styles)
  .replace("{{APP_VERSION}}", () => appVersion)
  .replace("{{JS_MAIN_TAGS}}", () => jsMainTags)
  .replace("{{JS_CS_TAG}}", () => jsCsTag)
  .replace("{{JS_PWA_TAG}}", () => jsPwaTag);

const buildTime = new Date().toISOString();
out = out.replace(/(<html[^>]*>)/i, `$1\n<!-- BUILD: ${buildTime} -->`);

fs.writeFileSync(DIST, out, "utf8");

if (fs.existsSync(MANIFEST_SRC)) {
  fs.copyFileSync(MANIFEST_SRC, MANIFEST_DIST);
  console.log("✅  access-manifest.json zkopírován do dist/");
}
if (fs.existsSync(PUBLIC_DIR)) {
  copyDir(PUBLIC_DIR, DIST_DIR);
  console.log("✅  PWA soubory z public/ zkopírovány do dist/");
}

console.log("✅  Build dokončen z", mainParts.length + 2, "JS modulů");
console.log(`   dist/index.html →  ${(fs.statSync(DIST).size / 1024).toFixed(1)} kB`);
console.log(`   Čas: ${buildTime}`);
