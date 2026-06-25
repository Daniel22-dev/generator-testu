import fs   from "node:fs";
import path from "node:path";

const SRC  = path.resolve("src/index.html");
const DIST_DIR = path.resolve("dist");
const DIST = path.join(DIST_DIR, "index.html");
const MANIFEST_SRC  = path.resolve("src/access-manifest.json");
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

if (!fs.existsSync(SRC)) {
  console.error("❌  Chyba: src/index.html neexistuje.");
  process.exit(1);
}

const source = fs.readFileSync(SRC, "utf8");

const buildTime = new Date().toISOString();
const output = source.replace(
  /(<html[^>]*>)/i,
  `$1
<!-- BUILD: ${buildTime} -->`
);

fs.writeFileSync(DIST, output, "utf8");

if (fs.existsSync(MANIFEST_SRC)) {
  fs.copyFileSync(MANIFEST_SRC, MANIFEST_DIST);
  console.log("✅  access-manifest.json zkopírován do dist/");
}

if (fs.existsSync(PUBLIC_DIR)) {
  copyDir(PUBLIC_DIR, DIST_DIR);
  console.log("✅  PWA soubory z public/ zkopírovány do dist/");
}

const srcKB  = (fs.statSync(SRC).size  / 1024).toFixed(1);
const distKB = (fs.statSync(DIST).size / 1024).toFixed(1);

console.log("✅  Build dokončen");
console.log(`   src/index.html  →  ${srcKB} kB`);
console.log(`   dist/index.html →  ${distKB} kB`);
console.log(`   Čas: ${buildTime}`);
