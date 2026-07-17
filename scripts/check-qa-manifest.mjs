import fs from "node:fs";
const fail = message => { console.error(`❌ ${message}`); process.exit(1); };
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("qa/qa-manifest.json", "utf8"));
if (manifest.standard !== "GHRAB-QA-1.0.2") fail("Aplikace nepoužívá GHRAB QA Standard 1.0.2.");
if (manifest.appVersion !== pkg.version) fail(`QA manifest má verzi ${manifest.appVersion}, package.json ${pkg.version}.`);
for (const key of ["requiredViewports", "versionChecks", "pwaTargets"]) {
  if (!Array.isArray(manifest[key]) || !manifest[key].length) fail(`QA manifest nemá povinné pole ${key}.`);
}
const required = ["360x800", "412x915", "768x1024", "1366x768", "1920x1080"];
const present = manifest.requiredViewports.map(v => `${v.width}x${v.height}`);
for (const vp of required) if (!present.includes(vp)) fail(`Chybí povinný viewport ${vp}.`);
if (!manifest.testCommand || !manifest.headlessCommand || !manifest.buildCommand) fail("QA manifest nemá příkazy projektu.");
console.log(`✅  QA manifest odpovídá ${manifest.standard} a verzi ${manifest.appVersion}.`);
