// scripts/build.mjs — v2 (modulární skládání)
// Složí dist/index.html ze src/shell.html + src/styles.css + src/js/*.js.
// Pořadí JS modulů = abecední řazení názvů souborů (číselné prefixy 01–16 → hlavní
// blok, 50 → CS modul, 60 → PWA). Chování je identické s původním jedním souborem —
// jde o čistou konkatenaci, žádné ES moduly, žádné přepisy.
import fs from "node:fs";
import path from "node:path";

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

fs.mkdirSync(DIST_DIR, { recursive: true });

const shell = fs.readFileSync("src/shell.html", "utf8");
const styles = fs.readFileSync("src/styles.css", "utf8");

const jsDir = "src/js";
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort();
const mainParts = jsFiles.filter(f => !f.startsWith("50-") && !f.startsWith("60-"));
const jsMain = mainParts.map(f => fs.readFileSync(path.join(jsDir, f), "utf8")).join("");
const jsCs  = fs.readFileSync(path.join(jsDir, "50-cs-module.js"), "utf8");
const jsPwa = fs.readFileSync(path.join(jsDir, "60-pwa.js"), "utf8");

// replace() s funkcí kvůli $-sekvencím v kódu (jinak by "$&" apod. rozbily obsah)
let out = shell
  .replace("{{STYLES}}", () => styles)
  .replace("{{JS_MAIN}}", () => jsMain)
  .replace("{{JS_CS}}", () => jsCs)
  .replace("{{JS_PWA}}", () => jsPwa);

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
