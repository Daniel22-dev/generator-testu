// ── Uvítací modal ─────────────────────────────────────────────────────────
function czechVocative(displayName) {
  // Vezme první slovo jako křestní jméno a skloní do vokativu
  var first = (displayName || '').trim().split(/\s+/)[0] || '';
  if (!first) return '';
  var n = first;
  var lc = n.toLowerCase();

  // Výjimky / speciální tvary (rozšiřuj podle potřeby)
  var exceptions = {
    'daniel':   'Dane',
    'jan':      'Jane',
    'jakub':    'Jakube',
    'ondrej':   'Ondřeji',
    'ondřej':   'Ondřeji',
    'tomas':    'Tomáši',
    'tomáš':    'Tomáši',
    'martin':   'Martine',
    'david':    'Davide',
    'michal':   'Michale',
    'lukas':    'Lukáši',
    'lukáš':    'Lukáši',
    'petr':     'Petře',
    'pavel':    'Pavle',
    'marek':    'Marku',
    'adam':     'Adame',
    'filip':    'Filipe',
    'roman':    'Romane',
    'jiri':     'Jiří',
    'jiří':     'Jiří',
    'radek':    'Radku',
    'vojtech':  'Vojtěchu',
    'vojtěch':  'Vojtěchu',
    'frantisek':'Františku',
    'františek':'Františku',
    'zdenek':   'Zdeňku',
    'zdeněk':   'Zdeňku',
    'milan':    'Milane',
    'stanislav':'Stanislave',
    'jaroslav': 'Jaroslavu',
    'miroslav': 'Miroslavu',
    // Ženská jména
    'jana':     'Jano',
    'marie':    'Marie',
    'tereza':   'Terezo',
    'katerina': 'Kateřino',
    'kateřina': 'Kateřino',
    'eva':      'Evo',
    'petra':    'Petro',
    'lenka':    'Lenko',
    'martina':  'Martino',
    'lucie':    'Lucie',
    'monika':   'Moniko',
    'helena':   'Heleno',
    'alena':    'Aleno',
    'anna':     'Anno',
    'hana':     'Hano',
    'veronika': 'Veroniko',
    'michaela': 'Michaelo',
    'marketa':  'Markéto',
    'markéta':  'Markéto',
    'barbora':  'Barbaro',
    'kristyna': 'Kristýno',
    'kristýna': 'Kristýno',
    'simona':   'Simono',
    'zuzana':   'Zuzano',
    'ivana':    'Ivano',
    'dagmar':   'Dagmar',
    'renata':   'Renato',
    'andrea':   'Andreo',
    'klara':    'Kláro',
    'klára':    'Kláro',
    'radka':    'Radko',
    'libuse':   'Libuše',
    'libuše':   'Libuše',
    'olga':     'Olgo',
    'vera':     'Věro',
    'věra':     'Věro',
    'sarka':    'Šárko',
    'šárka':    'Šárko',
    'blanka':   'Blanko',
    'denisa':   'Deniso',
    'nikola':   'Nikolo',
    'silvie':   'Silvie',
    'romana':   'Romano',
    'vladimira':'Vladimíro',
    'vladimíra':'Vladimíro'
  };

  if (exceptions[lc]) return exceptions[lc];

  // Automatická pravidla (záložní)
  var last = lc[lc.length - 1];
  var last2 = lc.slice(-2);

  // Ženská jména končící na -a
  if (last === 'a' && lc.length > 2) {
    return n.slice(0, -1) + 'o';
  }
  // Mužská jména končící na souhlásku (typická česká)
  var consonants = 'bcdfghjklmnpqrstvwxz';
  if (consonants.includes(last)) {
    if (last === 'k') return n + 'u';
    if (last === 'h') return n.slice(0,-1) + 'chu';
    if (last === 'r') return n + 'e';
    if (last === 'l') return n + 'e';
    if (last === 'n') return n + 'e';
    if (last === 'd') return n + 'e';
    if (last === 't') return n + 'e';
    if (last === 's') return n + 'e';
    return n + 'e';
  }
  // Jména končící na -e nebo -í ponecháme
  return n;
}

const ONBOARDING_DONE_KEY = 'genOnboardingDone_v1';
const WELCOME_SESSION_KEY = 'genWelcomeShown_session';

// 5 rotujících frází pro opakované spuštění (točí se podle dne v týdnu)
var RETURN_PHRASES = [
  'Dnes to zase rozjedeme. Studenti neví, co je čeká. 😄',
  'Káva v ruce, test v hlavě — jdeme na to!',
  'Připraven/a tvořit? Gemini čeká na pokyny.',
  'Každý dobrý test začíná tady.',
  'Nový den, nový test. Jsi na správném místě.'
];

// ── Opakované spuštění (2.+): krátké velké uvítání ───────────────────────
function showReturnWelcome(profile) {
  if (document.getElementById('returnWelcomeGate')) return;
  var p = profile || {};
  var vocative = czechVocative(p.displayName || p.userId || '');
  var greeting = vocative ? ('Vítej zpátky, ' + vocative + '!') : 'Vítej zpátky!';
  var phrase = RETURN_PHRASES[new Date().getDay() % RETURN_PHRASES.length];

  var backdrop = document.createElement('div');
  backdrop.id = 'returnWelcomeGate';
  backdrop.className = 'ui-modal-backdrop welcome-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.innerHTML =
    '<div class="ui-modal-box welcome-return-box">' +
      '<div class="welcome-return-hero">' +
        '<div class="welcome-return-emoji">👋</div>' +
        '<div class="welcome-return-name">' + esc(greeting) + '</div>' +
        '<div class="welcome-return-phrase">' + esc(phrase) + '</div>' +
      '</div>' +
      '<div class="welcome-return-actions">' +
        '<button type="button" class="welcome-return-btn" id="returnWelcomeOkBtn">Jdeme na to!</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(backdrop);
  document.body.classList.add('onboarding-locked');
  function close() { document.body.classList.remove('onboarding-locked'); backdrop.remove(); }
  backdrop.querySelector('#returnWelcomeOkBtn').addEventListener('click', close);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) e.stopPropagation(); });
  setTimeout(function(){ var b = backdrop.querySelector('#returnWelcomeOkBtn'); if(b) b.focus(); }, 80);
}

// ── První spuštění: 4 kroky ───────────────────────────────────────────────
function showFirstRunFlow(profile) {
  if (document.getElementById('firstRunGate')) return;
  var p = profile || {};
  var vocative = czechVocative(p.displayName || p.userId || '');
  var greeting = vocative ? ('Vítej, ' + vocative + '!') : 'Vítej!';
  var isAdmin = (p.role === 'admin');

  function mkBackdrop(cls) {
    var bd = document.createElement('div');
    bd.id = 'firstRunGate';
    bd.className = 'ui-modal-backdrop ' + cls;
    bd.setAttribute('role', 'dialog');
    bd.setAttribute('aria-modal', 'true');
    bd.addEventListener('click', function(e){ if (e.target === bd) e.stopPropagation(); });
    document.body.appendChild(bd);
    document.body.classList.add('onboarding-locked');
    return bd;
  }
  function removeBackdrop(bd) { bd.remove(); }

  // Krok 1: uvítání
  function step1() {
    var bd = mkBackdrop('welcome-gate');
    bd.innerHTML =
      '<div class="ui-modal-box welcome-box">' +
        '<div class="welcome-hero">' +
          '<div class="welcome-hero-emoji">🎓</div>' +
          '<div class="welcome-hero-title">' + esc(greeting) + '</div>' +
          '<div class="welcome-hero-sub">Generátor interaktivních testů</div>' +
        '</div>' +
        '<div class="welcome-body">' +
          '<p>Právě spouštíš <strong>aplikaci pro tvorbu interaktivních testů</strong> s podporou umělé inteligence. Pomůže ti snadno vygenerovat, přizpůsobit a distribuovat testy pro studenty.</p>' +
          (isAdmin ? '<p>Jako <strong>administrátor</strong> máš plný přístup ke všem funkcím, včetně správy přístupů ostatních uživatelů.</p>' : '') +
          (isAdmin ? '' : '<p>Pokud budeš mít dotazy, obrať se na <strong>Poradce ke generátoru</strong> — ikona <span style="font-size:15px">💬</span> vpravo nahoře. Pokud si ani tam neporadíš, napiš správci aplikace.</p>') +
          '<p>Přístup je řízen centrálně přes <strong>AI Studio GHRAB</strong>. Osobní přístupový soubor si bezpečně uchovej pro případ nového zařízení nebo obnovení prohlížeče.</p>' +
          '<p>Hodně štěstí při generování! 🚀</p>' +
        '</div>' +
        '<div class="welcome-actions">' +
          '<button type="button" class="welcome-ok-btn" id="frStep1Btn">Spustit průvodce →</button>' +
        '</div>' +
      '</div>';
    bd.querySelector('#frStep1Btn').addEventListener('click', function(){ removeBackdrop(bd); step2(); });
  }

  // Krok 2: průvodce ostrý test
  function step2() {
    var bd = mkBackdrop('onboarding-gate');
    bd.innerHTML =
      '<div class="ui-modal-box sec-guide-box">' +
        buildUsageGuideHtml() +
        '<div class="sec-guide-actions" style="flex-direction:column;gap:10px;align-items:stretch">' +
          '<label class="onb-check-row">' +
            '<input type="checkbox" id="frCheck1">' +
            '<span class="onb-check-label">Přečetl/a jsem si postup a rozumím, jak správně používat ostrý test.</span>' +
          '</label>' +
          '<button type="button" class="ui-modal-btn primary" id="frStep2Btn" disabled style="opacity:.45">Pokračovat →</button>' +
        '</div>' +
      '</div>';
    var cb = bd.querySelector('#frCheck1'), btn = bd.querySelector('#frStep2Btn');
    cb.addEventListener('change', function(){ btn.disabled = !cb.checked; btn.style.opacity = cb.checked ? '1' : '.45'; });
    btn.addEventListener('click', function(){ if (!cb.checked) return; removeBackdrop(bd); step3(); });
  }

  // Krok 3: průvodce bezpečný provoz
  function step3() {
    var bd = mkBackdrop('onboarding-gate');
    bd.innerHTML =
      '<div class="ui-modal-box sec-guide-box">' +
        buildSecurityGuideBodyHtml() +
        '<div class="sec-guide-actions" style="flex-direction:column;gap:10px;align-items:stretch">' +
          '<label class="onb-check-row">' +
            '<input type="checkbox" id="frCheck2">' +
            '<span class="onb-check-label">Přečetl/a jsem si pravidla bezpečného provozu a budu se jimi řídit.</span>' +
          '</label>' +
          '<button type="button" class="ui-modal-btn primary" id="frStep3Btn" disabled style="opacity:.45">Dokončit průvodce →</button>' +
        '</div>' +
      '</div>';
    var cb = bd.querySelector('#frCheck2'), btn = bd.querySelector('#frStep3Btn');
    cb.addEventListener('change', function(){ btn.disabled = !cb.checked; btn.style.opacity = cb.checked ? '1' : '.45'; });
    btn.addEventListener('click', function(){ if (!cb.checked) return; removeBackdrop(bd); step4(); });
  }

  // Krok 4: závěr
  function step4() {
    var bd = mkBackdrop('welcome-gate');
    bd.innerHTML =
      '<div class="ui-modal-box welcome-return-box">' +
        '<div class="welcome-return-hero" style="padding:28px 28px 22px">' +
          '<div class="welcome-return-emoji">✅</div>' +
          '<div class="welcome-return-name">Průvodce dokončen!</div>' +
          '<div class="welcome-return-phrase">Jsi připraven/a generovat testy.</div>' +
        '</div>' +
        '<p class="onb-finish-note">Kdykoli se můžeš vrátit k oběma průvodcům — jsou dostupné přes ikony <strong>📋</strong> a <strong>🔒</strong> vpravo nahoře.</p>' +
        '<div class="welcome-return-actions" style="padding-top:12px">' +
          '<button type="button" class="welcome-return-btn" id="frFinishBtn">Jdeme na to!</button>' +
        '</div>' +
      '</div>';
    bd.querySelector('#frFinishBtn').addEventListener('click', function(){
      try { localStorage.setItem(ONBOARDING_DONE_KEY, '1'); } catch(_){}
      document.body.classList.remove('onboarding-locked');
      bd.remove();
    });
  }

  step1();
}

// ── Hlavní vstupní bod ────────────────────────────────────────────────────
function showWelcomeModal(profile) {
  // Zobrazit jen jednou za relaci (ne při každém reloadu po "Sestavit nový test")
  try { if (sessionStorage.getItem(WELCOME_SESSION_KEY) === '1') return; } catch(_){}
  try { sessionStorage.setItem(WELCOME_SESSION_KEY, '1'); } catch(_){}

  var done = false;
  try { done = localStorage.getItem(ONBOARDING_DONE_KEY) === '1'; } catch(_){}
  if (!done) showFirstRunFlow(profile);
  else showReturnWelcome(profile);
}

// ── HTML pro bezpečnostní průvodce (sdílené mezi onboardingem a 🔒 tlačítkem) ──
function buildSecurityGuideBodyHtml() {
  return '<div class="sec-guide-hero">' +
      '<div class="sec-guide-hero-emoji">🔒</div>' +
      '<div class="sec-guide-hero-title">Bezpečný provoz ve škole</div>' +
      '<div class="sec-guide-hero-sub">Praktická pravidla pro každodenní použití</div>' +
    '</div>' +
    '<div class="sec-guide-body">' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📁</span> Kdy použít který režim</div>' +
        '<p class="sec-guide-p"><strong>Procvičování a domácí úkoly</strong> — stačí jednoduchý (instant) režim.</p>' +
        '<p class="sec-guide-p"><strong>Ostrý (známkovaný) test</strong> — vždy <strong>Bezpečný offline + verifier</strong>.</p>' +
      '</div>' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🚫</span> Co nikdy neposlat studentům</div>' +
        '<div class="sec-guide-warn">⚠️ Soubor <strong>DO_NOT_SEND_TEACHER_VERIFIER_…</strong> obsahuje správné odpovědi. Nikdy ho neposílejte studentům.</div>' +
        '<p class="sec-guide-p">Studentům patří <strong>výhradně</strong> odkaz na <code>student_test.html</code>.</p>' +
      '</div>' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📂</span> Kam ukládat výsledky</div>' +
        '<p class="sec-guide-p">Soubory <code>answers.txt</code> a verifier ukládejte pouze do <strong>zabezpečeného školního úložiště</strong>. Výsledky uchovávejte po dobu danou školním řádem, pak je smažte.</p>' +
      '</div>' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">👤</span> Anonymizace studentů</div>' +
        '<p class="sec-guide-p">Zapněte <strong>anonymizaci</strong> v sekci skupin — generátor nahradí jména kódy v promptu odesílaném do AI.</p>' +
      '</div>' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🔑</span> Gemini API klíč</div>' +
        '<p class="sec-guide-p">Klíč zadávejte <strong>jen pro relaci</strong>. Každý učitel má vlastní klíč — musí být omezený na Gemini API.</p>' +
        '<div class="sec-guide-warn">⚠️ Na sdíleném počítači nikdy neukládejte klíč trvale.</div>' +
      '</div>' +
      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🚨</span> Co dělat při úniku</div>' +
        '<p class="sec-guide-p"><strong>Unikl verifier:</strong> Informujte admina aplikace, soubor okamžitě odstraňte ze sdílených umístění.</p>' +
        '<p class="sec-guide-p"><strong>Unikl API klíč:</strong> Přihlaste se na <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style="color:var(--acc)">aistudio.google.com</a>, starý klíč smažte a vytvořte nový.</p>' +
      '</div>' +
    '</div>';
}



