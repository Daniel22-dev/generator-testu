import fs   from "node:fs";
import path from "node:path";

const SRC  = path.resolve("src/index.html");
const DIST = path.resolve("dist/index.html");

fs.mkdirSync(path.dirname(DIST), { recursive: true });

if (!fs.existsSync(SRC)) {
  console.error("❌  Chyba: src/index.html neexistuje.");
  process.exit(1);
}

const source = fs.readFileSync(SRC, "utf8");

const buildTime = new Date().toISOString();
const output = source.replace(
  /(<html[^>]*>)/i,
  `$1\n<!-- BUILD: ${buildTime} -->`
);

fs.writeFileSync(DIST, output, "utf8");

const srcKB  = (fs.statSync(SRC).size  / 1024).toFixed(1);
const distKB = (fs.statSync(DIST).size / 1024).toFixed(1);

console.log("✅  Build dokončen");
console.log(`   src/index.html  →  ${srcKB} kB`);
console.log(`   dist/index.html →  ${distKB} kB`);
console.log(`   Čas: ${buildTime}`);
