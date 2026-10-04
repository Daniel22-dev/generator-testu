import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const r5=read('scripts/check-security-adversarial-r5.mjs');
const pkg=JSON.parse(read('package.json'));
function ok(c,m){if(!c){console.error('FAIL R5:',m);process.exitCode=1}else console.log('PASS R5:',m)}
const required=[
  'Q-crypto: stejný plaintext v obou rolích',
  'A instant: správný Recovery odemkne',
  'C instant: Recovery neotevře učitelský panel',
  'AB instant: dvojklik / unlock bez zámku',
  'instant: recovery-unlock nezvyšuje počet varování',
  'A secure: správný Recovery odemkne',
  'AB secure: souběžné dvojité odemčení jednoho zámku',
  'AA secure: reload zamčeného pokusu zámek neobejde',
  'E secure: studentský soubor nepovoluje reset cizí identity',
  'D/G secure: odevzdaný pokus nemá další spuštění přes žádné heslo',
  'Verifier: hlavní skript se naparsuje',
  'AC/AD + export: Verifier zachová lock jako signál, recovery jako audit, CSV nese údaje',
  'U: snapshot / stav pro uložení bez raw credentialů',
  'W: import legacy záznamu s jedním „heslo" nevyrobí dva credentialy',
  'X: AI prompt neobsahuje raw credentialy',
  'Q-bypass: applySettingsWithoutAi nesmí sestavit test s Teacher == Recovery',
  'Q-bypass: slabý Teacher (6 znaků) přes applySettingsWithoutAi'
];
for(const marker of required)ok(r5.includes(marker),'behavioral R5 gate covers: '+marker);
ok(r5.includes("dist/index.html")&&r5.includes("new JSDOM")&&r5.includes("acorn.parse"),'R5 runs the built generator and parses generated HTML');
ok(r5.includes("qa-results/adversarial-harness-r5.json"),'R5 writes a machine-readable result artifact');
ok(pkg.scripts?.['check:r5-adversarial']==='node scripts/check-security-adversarial-r5.mjs','R5 behavioral npm script is defined');
ok(String(pkg.scripts?.test||'').includes('npm run check:r5-adversarial'),'npm test requires the full R5 adversarial gate after build');
ok(pkg.scripts?.['check:r4-recovery-runtime']==='node scripts/check-recovery-runtime-r4.mjs','R4 runtime gate is defined');
ok(String(pkg.scripts?.prebuild||'').includes('npm run check:r4-recovery-runtime'),'prebuild requires the R4 recovery runtime gate');
if(process.exitCode)process.exit(process.exitCode);
console.log('PASS R5 adversarial wiring gate');
