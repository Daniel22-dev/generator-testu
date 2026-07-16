import fs from 'node:fs';
const fail = message => { console.error(`❌ ${message}`); process.exit(1); };
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('qa/qa-manifest.json', 'utf8'));
if (manifest.schema !== 'GHRAB-QA-MANIFEST-1') fail('Neplatné schéma QA manifestu.');
if (manifest.qaStandard !== '1.0') fail('Aplikace nepoužívá GHRAB QA Standard 1.0.');
if (manifest.version !== pkg.version) fail(`QA manifest má verzi ${manifest.version}, package.json ${pkg.version}.`);
if (!fs.existsSync(manifest.entryPoint) && fs.existsSync('dist')) fail(`QA entry point neexistuje: ${manifest.entryPoint}`);
for (const key of ['requiredViewports','criticalFlows','appSpecificGates']) {
  if (!Array.isArray(manifest[key]) || !manifest[key].length) fail(`QA manifest nemá povinné pole ${key}.`);
}
const required = ['360x800','412x915','768x1024','1366x768','1920x1080'];
for (const vp of required) if (!manifest.requiredViewports.includes(vp)) fail(`Chybí povinný viewport ${vp}.`);
console.log(`✅  QA manifest odpovídá GHRAB QA Standardu ${manifest.qaStandard} a verzi ${manifest.version}.`);
