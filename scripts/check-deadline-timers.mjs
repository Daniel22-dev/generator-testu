import fs from 'node:fs';

const secure = fs.readFileSync('src/js/13e-secure-student-runtime.js', 'utf8');
const instant = fs.readFileSync('src/js/14b-instant-test-runtime.js', 'utf8');
const errors = [];
if (!/TIMER_DEADLINE\s*-\s*Date\.now\(\)/.test(secure)) errors.push('secure runtime nepočítá zbývající čas z TIMER_DEADLINE - Date.now()');
if (!/timerDeadline\s*-\s*Date\.now\(\)/.test(instant)) errors.push('instant runtime nepočítá zbývající čas z timerDeadline - Date.now()');
if (/remain--/.test(secure)) errors.push('secure runtime stále dekrementuje remain po ticích');
if (/timerVal--/.test(instant)) errors.push('instant runtime stále dekrementuje timerVal po ticích');
if (!/visibilityState==='visible'[^\n]*refreshSecureTimer\(\)/.test(secure)) errors.push('secure runtime nepřepočítá čas při návratu do viditelné karty');
if (!/visibilityState==='visible'\)refreshInstantTimer\(\)/.test(instant)) errors.push('instant runtime nepřepočítá čas při návratu do viditelné karty');
if (errors.length) {
  console.error('❌ Kontrola deadline timerů selhala:');
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
}
console.log('✅  Oba studentské runtimy používají deadline timer a přepočet po návratu.');
