// Minimalni kontrola verejneho repozitare: pristupove manifesty nesmi obsahovat
// jmena konkretniho spravce/kolegu. Nejde o obecny DLP skener; je to pojistka pro
// znamy public soubor access-manifest.json a jeho vestavenou kopii v 16-access.js.
import fs from 'node:fs';

const files = ['src/access-manifest.json', 'src/js/16-access.js'];
const blocked = [
  /Daniel\s+Bal[aá][zž]/iu,
  /Ad[eé]la\s+Stillerov[aá]/iu,
  /STILLEROVA/u,
  /BALAZ/u,
];
let failed = 0;
for (const file of files) {
  const txt = fs.readFileSync(file, 'utf8');
  for (const re of blocked) {
    if (re.test(txt)) {
      console.error(`❌ ${file} obsahuje verejne identifikovatelny udaj: ${re}`);
      failed++;
    }
  }
}
if (!failed) console.log('✅  Kontrola citlivych udaju v pristupovych manifestech OK.');
process.exit(failed ? 1 : 0);
