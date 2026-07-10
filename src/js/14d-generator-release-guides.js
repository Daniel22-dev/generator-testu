// Naplní viditelný release badge z jednoho zdroje (const RELEASE).
// Rozpozná OS a velikost obrazovky — informativní (jako úvodní detekce ve studentském
// testu), ale layout se řídí ŽIVOU šířkou okna přes CSS, ne tímto řetězcem (spolehlivější
// — okno na PC může být úzké, tablet široký). Badge tedy ukazuje OS + aktuální rozložení.
function detectGeneratorEnv(){
  const ua=navigator.userAgent||'';
  let os='PC';
  if(/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)) os='Apple';
  else if(/Macintosh|Mac OS X/.test(ua)) os='Mac';
  else if(/Android/i.test(ua)) os='Android';
  else if(/Windows/i.test(ua)) os='Windows';
  else if(/Linux|CrOS/i.test(ua)) os='PC';
  const w=window.innerWidth||document.documentElement.clientWidth||0;
  const layout = w>=1400?'široké':(w>=1000?'rozšířené':'kompaktní');
  return {os, layout, w};
}
function updateDeviceBadge(){
  const el=$('deviceBadge'); if(!el) return;
  const e=detectGeneratorEnv();
  const icon={Apple:'',Mac:'',Android:'📱',Windows:'🖥️',PC:'🖥️'}[e.os]||'🖥️';
  el.textContent=(icon?icon+' ':'')+e.os+' · '+e.layout+' rozložení';
  el.title='Rozpoznané zařízení: '+e.os+'. Rozložení se přizpůsobuje šířce okna ('+e.w+' px) — zvětši/zmenši okno a změní se živě.';
}

function applyReleaseBadge(){
  const b=$('releaseBadge'); if(b) b.textContent='v'+RELEASE.version+' · '+RELEASE.date+' · '+BUILD_HASH;
  const s=$('releaseStatus'); if(s){
    const approved=RELEASE.status==='production-serverless';
    s.textContent=approved?'produkční serverless verze':'DRAFT — nepoužívat ostře';
    s.classList.toggle('approved',approved); s.classList.toggle('draft',!approved);
  }
}
// Modal s changelogem této verze — pro učitele a kolegy, ať vidí, co se v této verzi
// změnilo a podle čeho se rozhodnout, jestli ji použít pro ostrý test.
function showReleaseInfo(){
  if (document.getElementById('changelogGate')) return;
  var envLabel = ({
    official:'oficiální adresa',
    unofficialCopy:'⚠ NEOFICIÁLNÍ kopie — generování blokováno',
    local:'lokální soubor (file://)',
    unverified:'web (oficiální adresa zatím nenastavena)',
    unknown:'neurčeno'
  })[Access && Access.envKind] || 'neurčeno';

  var MAX_CHANGES = 10;

  // Společný renderer seznamu změn (formát "NÁZEV (verze): text").
  function renderItems(changes){
    return changes.slice(0, MAX_CHANGES).map(function(c){
      var m = c.match(/^([^(]+)\(([^)]+)\):\s*([\s\S]*)$/);
      var title, version, body;
      if(m){ title = m[1].trim(); version = m[2].trim(); body = m[3].trim(); }
      else { title = ''; version = ''; body = c; }
      return '<div class="sec-guide-section">' +
        (title ? '<div class="sec-guide-section-title" style="font-size:12px;gap:6px">' +
          '<span style="font-size:13px">📝</span> ' + esc(title) +
          (version ? ' <span style="font-weight:400;color:var(--t4);font-size:11px;text-transform:none;letter-spacing:0">'+(/^v/i.test(version)?'':'v')+esc(version)+'</span>' : '') +
        '</div>' : '') +
        '<p class="sec-guide-p" style="font-size:12.5px;color:var(--t3)">' + esc(body) + '</p>' +
      '</div>';
    }).join('');
  }

  // Přepínač mezi hlavním changelogem generátoru a changelogem modulu ČJ.
  function tabsHtml(active){
    function tab(id,label){
      var on = id===active;
      return '<button type="button" class="cl-tab'+(on?' active':'')+'" data-cltab="'+id+'" aria-pressed="'+(on?'true':'false')+'">'+label+'</button>';
    }
    return '<div class="cl-tabs">'+tab('main','Generátor')+tab('cs','<span class="flag flag-cz" aria-hidden="true"></span> Modul ČJ')+'</div>';
  }

  // Celý obsah boxu pro zvolený tab.
  function buildHtml(tab){
    if(tab==='cs'){
      var csWindowNote = RELEASE_CS.changes.length > MAX_CHANGES
        ? '<p class="sec-guide-p" style="color:var(--t4);font-style:italic">Zobrazeno posledních '+MAX_CHANGES+' změn modulu.</p>' : '';
      return '<div class="sec-guide-hero" style="background:linear-gradient(135deg,#7f1d1d 0%,#1e3a8a 100%);padding:18px 22px 14px">' +
          '<div class="sec-guide-hero-emoji" style="font-size:28px;margin-bottom:4px"><span class="flag flag-cz" aria-hidden="true"></span></div>' +
          '<div class="sec-guide-hero-title" style="font-size:15px">' + esc(RELEASE_CS.module) + ' ' + esc(RELEASE_CS.version) + '</div>' +
          '<div class="sec-guide-hero-sub">aktualizováno ' + esc(RELEASE_CS.date) + ' · samostatné verzování modulu</div>' +
        '</div>' +
        '<div class="sec-guide-body" style="padding:12px 16px 8px">' +
          tabsHtml('cs') +
          '<div class="sec-guide-ok" style="margin:0 0 4px">Changelog modulu Český jazyk. Verzování modulu je nezávislé na verzi generátoru.</div>' +
          '<div style="margin-top:10px">' + renderItems(RELEASE_CS.changes) + '</div>' +
          csWindowNote +
        '</div>' +
        '<div class="sec-guide-actions">' +
          '<button type="button" class="ui-modal-btn primary" id="changelogOkBtn">Zavřít</button>' +
        '</div>';
    }
    var approved = RELEASE.status === 'production-serverless';
    var statusHtml = approved
      ? '<div class="sec-guide-ok" style="margin:0 0 4px">✅ Technicky ověřená produkční serverless verze — prošla automatickými, integračními a bezpečnostními kontrolami. Formální schválení provozu je rozhodnutí školy.</div>'
      : '<div class="sec-guide-warn" style="margin:0 0 4px">⚠️ DRAFT — nepoužívat pro ostré klasifikované testy.</div>';
    var windowNote = RELEASE.changes.length > MAX_CHANGES
      ? '<p class="sec-guide-p" style="color:var(--t4);font-style:italic">Zobrazeno posledních '+MAX_CHANGES+' změn; starší se průběžně odmazávají.</p>' : '';
    return '<div class="sec-guide-hero" style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:18px 22px 14px">' +
        '<div class="sec-guide-hero-emoji" style="font-size:28px;margin-bottom:4px">📋</div>' +
        '<div class="sec-guide-hero-title" style="font-size:15px">Generátor testů v' + esc(RELEASE.version) + '</div>' +
        '<div class="sec-guide-hero-sub">vydáno ' + esc(RELEASE.date) + ' · build ' + esc(BUILD_HASH) + ' · ' + esc(envLabel) + '</div>' +
      '</div>' +
      '<div class="sec-guide-body" style="padding:12px 16px 8px">' +
        tabsHtml('main') +
        statusHtml +
        '<div style="margin-top:10px">' + renderItems(RELEASE.changes) + '</div>' +
        windowNote +
      '</div>' +
      '<div class="sec-guide-actions">' +
        '<button type="button" class="ui-modal-btn primary" id="changelogOkBtn">Zavřít</button>' +
      '</div>';
  }

  var backdrop = document.createElement('div');
  backdrop.id = 'changelogGate';
  backdrop.className = 'ui-modal-backdrop sec-guide-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  var box = document.createElement('div');
  box.className = 'ui-modal-box sec-guide-box changelog-box';
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  function close(){ backdrop.remove(); }
  function render(tab){
    box.innerHTML = buildHtml(tab);
    box.querySelector('#changelogOkBtn').addEventListener('click', close);
    Array.prototype.forEach.call(box.querySelectorAll('[data-cltab]'), function(btn){
      btn.addEventListener('click', function(){ render(btn.getAttribute('data-cltab')); });
    });
  }
  render('main');

  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) close(); });
  backdrop.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
}

// Vestavěný provozní návod „Jak používat ostře" — pro kolegy, kteří nástroj nestavěli.
// Žije přímo v souboru, takže se nedá oddělit ani zastarat. U bodů, kde to nástroj
// vynucuje sám, je to označené, ať kolega ví, že ho to jistí.
// Jediný zdroj provozního návodu — používá ho tlačítko 📋 v záhlaví i povinné
// úvodní okno při otevření.
function buildUsageGuideHtml() {
  return '<div class="sec-guide-hero" style="background:linear-gradient(135deg,#1a3a1a 0%,#0d2b0d 100%)">' +
      '<div class="sec-guide-hero-emoji">📋</div>' +
      '<div class="sec-guide-hero-title">Jak používat generátor ostře</div>' +
      '<div class="sec-guide-hero-sub">Postup pro ostrý (známkovaný) test</div>' +
    '</div>' +
    '<div class="sec-guide-body">' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">1️⃣</span> Zvol správný režim</div>' +
        '<p class="sec-guide-p">Pro ostrý (známkovaný) test vždy zvol <strong>Bezpečný offline + verifier</strong>.</p>' +
        '<div class="sec-guide-ok">✓ Vzniknou dva soubory: <strong>student_test.html</strong> (bez správných odpovědí) a <strong>učitelský verifier</strong> (s klíčem a hodnoticí logikou).</div>' +
        '<p class="sec-guide-p">Procvičování a domácí úkoly nevyžadují bezpečný režim — stačí jednoduchý (instant) mód.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">2️⃣</span> Pošli studentům pouze odkaz</div>' +
        '<p class="sec-guide-p">Studentům posílej jen <strong>HTTPS odkaz</strong> na <code>student_test.html</code> (např. GitHub Pages, Netlify nebo Tiiny.host).</p>' +
        '<div class="sec-guide-warn">⚠️ Nikdy neposílej soubor jako přílohu e-mailu — studenti by mohli vidět zdrojový kód a zjistit strukturu testu.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">3️⃣</span> Nikdy nesdílej verifier</div>' +
        '<p class="sec-guide-p">Učitelský verifier obsahuje <strong>správné odpovědi a privátní dešifrovací klíč</strong>. Patří jen tobě.</p>' +
        '<div class="sec-guide-ok">✓ Generátor ho pojmenuje <strong>DO_NOT_SEND_TEACHER_VERIFIER_…</strong> a blokuje jeho zahrnutí do studentského exportu.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">4️⃣</span> Zkontroluj náhled</div>' +
        '<p class="sec-guide-p">Před stažením otevři <strong>Náhled</strong> a zkontroluj zadání, otázky i odpovědi — v mobilní i plné šířce.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">5️⃣</span> Spusť self-test bodování</div>' +
        '<p class="sec-guide-p">Klikni na <strong>Self-test</strong> a nechej generátor ověřit, že bodování počítá správně.</p>' +
        '<div class="sec-guide-ok">✓ U bezpečného režimu je self-test <strong>povinný</strong> — bez úspěšného testu nepůjde stáhnout klasifikovaný test. Chrání před tichou chybnou známkou.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">6️⃣</span> Volitelně: ověř klíč druhým průchodem</div>' +
        '<p class="sec-guide-p">Funkce <strong>Ověřit klíč (AI)</strong> nechá AI nezávisle vyřešit úlohy a označí místa, kde se liší od uloženého klíče — tam nejspíš je obsahová chyba v klíči.</p>' +
        '<p class="sec-guide-p">Doplňuje self-test: self-test ověří, že <em>stroj</em> počítá správně; tohle ověří, zda je sám <em>klíč</em> obsahově správný. Neblokuje stažení.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">7️⃣</span> Jména a výsledky</div>' +
        '<p class="sec-guide-p">U diferencovaných skupin generátor <strong>povinně nahrazuje jména kódy</strong> v promptu odesílaném do AI. Přesto zkontroluj poznámky a přílohy.</p>' +
        '<p class="sec-guide-p">Výsledky ukládej jen do <strong>zabezpečeného školního úložiště</strong> (ne sdílený cloud s veřejným přístupem).</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🛡️</span> Co hlídá nástroj sám</div>' +
        '<p class="sec-guide-p">Povinný self-test před stažením klasifikovaného testu · bezpečnostní skener blokující únik učitelských dat · výrazný název verifieru · potvrzení u rizikových akcí · sjednocené bodování pro instant i verifier režim.</p>' +
        '<div class="sec-guide-warn">⚠️ Nástroj je připravenější než člověk, který ho použije — proto tenhle postup.</div>' +
      '</div>' +

    '</div>';
}

function showUsageGuide(){
  if (document.getElementById('usageGuideGate')) return;

  var backdrop = document.createElement('div');
  backdrop.id = 'usageGuideGate';
  backdrop.className = 'ui-modal-backdrop sec-guide-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'usageGuideHead');
  backdrop.innerHTML =
    '<div class="ui-modal-box sec-guide-box" id="usageGuideHead">' +
      buildUsageGuideHtml() +
      '<div class="sec-guide-actions">' +
        '<button type="button" class="ui-modal-btn primary" id="usageGuideOkBtn">Rozumím</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(backdrop);

  function closeGuide() { backdrop.remove(); }
  backdrop.querySelector('#usageGuideOkBtn').addEventListener('click', closeGuide);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) closeGuide(); });
  backdrop.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeGuide(); });
}

function showSecurityGuide(){
  if (document.getElementById('secGuideGate')) return;

  var html =
    '<div class="sec-guide-hero">' +
      '<div class="sec-guide-hero-emoji">🔒</div>' +
      '<div class="sec-guide-hero-title">Bezpečný provoz ve škole</div>' +
      '<div class="sec-guide-hero-sub">Praktická pravidla pro každodenní použití</div>' +
    '</div>' +
    '<div class="sec-guide-body">' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📁</span> Kdy použít který režim</div>' +
        '<p class="sec-guide-p"><strong>Procvičování a domácí úkoly</strong> — stačí jednoduchý (instant) režim. Výsledek vidí student okamžitě, klíč odpovědí je v souboru — to je v pořádku, protože oprava není tajná.</p>' +
        '<p class="sec-guide-p"><strong>Ostrý (známkovaný) test</strong> — vždy zvolte <strong>Bezpečný offline + verifier</strong>. Studentský soubor neobsahuje správné odpovědi ani hodnoticí logiku; vše řeší učitelský verifier samostatně.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🚫</span> Co nikdy neposlat studentům</div>' +
        '<div class="sec-guide-warn">⚠️ Soubor <strong>DO_NOT_SEND_TEACHER_VERIFIER_…</strong> obsahuje správné odpovědi a privátní dešifrovací klíč. Nikdy ho neposílejte e-mailem, nenahrávejte na sdílené úložiště ani nevkládejte do skupinového chatu.</div>' +
        '<p class="sec-guide-p">Studentům patří <strong>výhradně</strong> odkaz na <code>student_test.html</code> (ideálně přes GitHub Pages nebo Tiiny.host — ne jako příloha e-mailu).</p>' +
        '<p class="sec-guide-p">Generátor sám blokuje export verifieru do studentského balíčku, ale technická pojistka nenahrazuje pozornost učitele.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📂</span> Kam ukládat answers.txt a výsledky</div>' +
        '<p class="sec-guide-p">Soubory <code>answers.txt</code> od studentů a učitelský verifier ukládejte <strong>pouze do zabezpečeného školního úložiště</strong> (šifrovaný disk, školní cloud s přihlášením — ne Google Disk se sdílením „kdokoliv s odkazem").</p>' +
        '<div class="sec-guide-ok">✓ Doporučeno: složka s přístupem jen pro daného učitele, pojmenovaná třídou a datem testu.</div>' +
        '<p class="sec-guide-p">Výsledky uchovávejte <strong>po dobu, kterou vyžaduje školní řád</strong> (obvykle do konce školního roku nebo do uzavření klasifikace). Pak soubory smažte.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">👤</span> Jak anonymizovat studenty</div>' +
        '<p class="sec-guide-p">Anonymizace je <strong>vždy zapnutá</strong> — generátor nahradí jména ze skupin kódy (Student A1, A2…) v promptu odesílaném do AI. Reálná jména z této části neopustí prohlížeč.</p>' +
        '<p class="sec-guide-p">Ochrana se týká komunikace s AI při generování. Jména nebo kódy zadané studenty do hotového testu se mohou objevit ve výsledcích a verifieru, proto je ukládejte jen do zabezpečeného školního úložiště.</p>' +
        '<p class="sec-guide-p">Mapování kódů na skutečná jména (Student A1 = Jan Novák…) zůstává jen ve vašem prohlížeči v sekci „Lokální mapování pro učitele" — nikam se neodesílá.</p>' +
        '<div class="sec-guide-ok">✓ Shrnutí: jména ze skupin jsou před AI chráněna automaticky; obsah textů, URL a příloh musí zkontrolovat učitel.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🔑</span> Gemini API klíč</div>' +
        '<p class="sec-guide-p">Klíč zadávejte <strong>jen pro relaci</strong> (výchozí volba) — po zavření prohlížeče se sám zapomene. Trvalé uložení používejte výhradně na vlastním zařízení, které nikomu nepůjčujete.</p>' +
        '<p class="sec-guide-p">Každý učitel by měl mít <strong>vlastní klíč</strong> z Google AI Studio (zdarma). Klíč musí být omezený na Gemini API — <button type="button" class="inline-guide-btn" onclick="showApiKeyGuide()" style="color:var(--acc)">návod zde</button>.</p>' +
        '<div class="sec-guide-warn">⚠️ Na sdíleném počítači (sborovna, počítačová učebna) nikdy neukládejte klíč trvale — mohl by ho získat jiný uživatel.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🚨</span> Co dělat při úniku</div>' +
        '<p class="sec-guide-p"><strong>Unikl verifier nebo answers.txt:</strong> Informujte admina aplikace, zneplatnění testu zvažte individuálně. Soubor okamžitě odstraňte ze všech sdílených umístění.</p>' +
        '<p class="sec-guide-p"><strong>Unikl API klíč:</strong> Přihlaste se na <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style="color:var(--acc)">aistudio.google.com</a>, starý klíč smažte a vytvořte nový. Zkontrolujte historii požadavků — zda klíč někdo nezneužil.</p>' +
        '<div class="sec-guide-ok">✓ Rychlá akce (smazání klíče) zabrání dalšímu zneužití i tehdy, když k úniku skutečně došlo.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📊</span> Přístup k CSV a sdílení výsledků</div>' +
        '<p class="sec-guide-p">CSV s výsledky obsahuje jména (nebo kódy), skupiny, body a časy — jde o osobní údaje. Soubor sdílejte <strong>pouze s osobami, které mají oprávnění výsledky zpracovávat</strong> (třídní učitel, výchovný poradce, vedení školy v rámci klasifikace).</p>' +
        '<p class="sec-guide-p">Výsledky neposílejte e-mailem bez šifrování, nesdílejte přes veřejné cloudy (Google Disk „pro kohokoliv s odkazem", Dropbox bez hesla). Používejte školní systémy s přihlášením.</p>' +
        '<div class="sec-guide-ok">✓ Pravidlo: CSV putuje jen tam, kam by putoval papírový výpis z třídní knihy.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🖥️</span> Sdílení obrazovky</div>' +
        '<p class="sec-guide-p">Při sdílení obrazovky (online hodina, projekce ve třídě) nikdy nezobrazujte teacher verifier ani otevřený answers.txt. Zavřete záložky s výsledky před tím, než spustíte sdílení.</p>' +
        '<p class="sec-guide-p">Pokud potřebujete studentům ukázat výsledky, použijte anonymizovaný přehled — bez jmen, pouze s kódy nebo skupinami.</p>' +
        '<div class="sec-guide-warn">⚠️ Správné odpovědi zobrazené při sdílení obrazovky nelze vzít zpět — studenti je mohou zachytit screenshotem.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">⚠️</span> Bezpečnostní signály v answers.txt</div>' +
        '<p class="sec-guide-p">Každý answers.txt obsahuje záznamy o bezpečnostních událostech: opuštění okna, přepnutí záložky, ztráta fokusu, zamčení testu. Nejde o důkaz podvádění — jde o <strong>podněty k rozhovoru se studentem</strong>.</p>' +
        '<p class="sec-guide-p"><strong>Jedno opuštění okna</strong> — může být náhodné (notifikace, přepnutý kurzor). <strong>Opakované události těsně za sebou</strong> — stojí za zmínku při opravě. <strong>Zamčení testu</strong> (jen přísný režim) — student musel zadat odemykací heslo; záznam obsahuje čas a důvod.</p>' +
        '<div class="sec-guide-ok">✓ Signály jsou kontextuální pomůcka, ne automatický verdikt. Výsledek vždy posuzujte jako celek.</div>' +
      '</div>' +

    '</div>' +
    '<div class="sec-guide-actions">' +
      '<button type="button" class="ui-modal-btn primary" id="secGuideOkBtn">Rozumím</button>' +
    '</div>';

  var backdrop = document.createElement('div');
  backdrop.id = 'secGuideGate';
  backdrop.className = 'ui-modal-backdrop sec-guide-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'secGuideHead');
  backdrop.innerHTML = '<div class="ui-modal-box sec-guide-box" id="secGuideHead">' + html + '</div>';
  document.body.appendChild(backdrop);

  function closeSecGuide() { backdrop.remove(); }
  backdrop.querySelector('#secGuideOkBtn').addEventListener('click', closeSecGuide);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) closeSecGuide(); });
  backdrop.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSecGuide(); });
}

function showStrictSituations(){
  if (document.getElementById('strictSitGate')) return;

  var pill = 'display:inline-block;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:700;white-space:nowrap;margin-bottom:4px';
  var pOk   = pill + ';background:var(--ok-d);border:1px solid var(--ok-b);color:var(--ok)';
  var pMid  = pill + ';background:var(--acc-d);border:1px solid var(--acc-b);color:var(--acc)';
  var pNo   = pill + ';background:transparent;border:1px solid var(--err);color:var(--err)';

  function row(badgeStyle, badgeText, situace, akce){
    return '<tr style="border-bottom:1px solid var(--bdr)">' +
      '<td style="padding:8px 8px 8px 0;vertical-align:top;width:46%">' +
        '<span style="' + badgeStyle + '">' + badgeText + '</span><br>' +
        '<strong style="color:var(--t1)">' + situace + '</strong>' +
      '</td>' +
      '<td style="padding:8px 0;vertical-align:top;color:var(--t2)">' + akce + '</td>' +
    '</tr>';
  }

  var html =
    '<div class="sec-guide-hero" style="background:linear-gradient(135deg,#3a1a3a 0%,#241024 100%)">' +
      '<div class="sec-guide-hero-emoji">🔒</div>' +
      '<div class="sec-guide-hero-title">Situace v přísném testu</div>' +
      '<div class="sec-guide-hero-sub">Co od něj čekat — a co musí pohlídat dozor</div>' +
    '</div>' +
    '<div class="sec-guide-body">' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🎯</span> Co přísný režim umí a co ne</div>' +
        '<p class="sec-guide-p">Vycházíme z toho, že student dostane jen webový odkaz na test a k samotnému HTML souboru se nedostane. Tím odpadá čtení správných odpovědí ze zdrojového kódu i přepisování výsledku v prohlížeči. Přísný režim pak podvádění výrazně ztěžuje a spolehlivě chrání známku i klíč. Není to ale dozor a není 100% neprůstřelný — počítej s tím, na co se dá spolehnout, a zbytek pohlídej v učebně.</p>' +
        '<div class="sec-guide-ok"><strong>Spolehni se:</strong> studentský test neobsahuje správné odpovědi ani klíč a známku nelze vylepšit — verifier ji počítá znovu z odevzdaných odpovědí, ne z toho, co student tvrdí. U ostrého testu navíc nedrží jména: student zadává jen jednorázový kód a to, kterému studentovi kód patří, ví pouze učitelský verifier.</div>' +
        '<div class="sec-guide-warn"><strong>Pomáhá, ale ne na 100 %:</strong> jednorázové kódy, promíchání otázek, zámek po opuštění testu a bezpečnostní signály (opuštění okna, krátký čas, duplicitní pokus, kód mimo seznam). Jsou to překážky a vodítka pro tvou kontrolu, ne neprůstřelné zábrany a ne důkazy.</div>' +
        '<div style="background:transparent;border:1px solid var(--err);border-radius:7px;padding:6px 10px;font-size:12.5px;color:var(--err);line-height:1.5;margin-bottom:6px"><strong>Tohle nezařídí soubor:</strong> telefon, papír, druhé zařízení, soused, sdílení kódu mezi studenty, kdo test reálně píše a kdy se odkaz dostane ke studentům. To řeší jedině dozor a organizace.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🔑</span> Jak fungují jednorázové kódy</div>' +
        '<p class="sec-guide-p">Pro ostrý test zvol režim <strong>Jednorázový kód</strong>: vložíš e-maily skupiny, vygeneruješ kódy a pak test. Co je důležité vědět:</p>' +
        '<div class="sec-guide-ok"><strong>Do studentského testu se kódy nevkládají.</strong> Student vidí jen políčko „zadej svůj kód“ — žádný seznam, takže z testu cizí kódy nevyčte. To, kterému studentovi kód patří, i e-maily zná jen učitel (verifier + stažené CSV).</div>' +
        '<div class="sec-guide-ok"><strong>Kódy jsou pokaždé nové.</strong> Generují se náhodně pro každý test (co student, to jiný kód), nejsou to stálé celoroční kódy. Když roster změníš, vygeneruj test znovu.</div>' +
        '<div class="sec-guide-warn"><strong>Kód váže záznam, ne osobu.</strong> Kód označuje odevzdaný test, ne konkrétního studenta. Pokud si dva studenti kódy vymění, verifier to sám nepozná — proto fyzicky ověř, že kód u zařízení sedí na přítomného studenta.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">📋</span> Situace a co s nimi</div>' +
        '<p class="sec-guide-p" style="font-size:12px">Stav: ' +
          '<span style="' + pOk + '">Spolehlivé</span> ' +
          '<span style="' + pMid + '">Pomáhá</span> ' +
          '<span style="' + pNo + '">Neřeší</span></p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.5">' +
          '<tbody>' +
            row(pOk, 'Spolehlivé', 'Student chce najít správné odpovědi', 'Ve studentském testu nejsou — klíč má jen učitelský verifier. A k HTML se student stejně nedostane. Nedělej nic.') +
            row(pOk, 'Spolehlivé', 'Student chce nahlásit lepší známku, než dosáhl', 'Verifier známku přepočítá sám z odevzdaných odpovědí. Student ji neovlivní.') +
            row(pOk, 'Spolehlivé', 'Student zadá vymyšlený nebo cizí kód', 'Verifier u kódu mimo roster zobrazí tvrdý signál „kód není v seznamu“. Hned vidíš, že něco nesedí.') +
            row(pOk, 'Spolehlivé', 'Z testu zjistit cizí kódy spolužáků', 'Nejde — kódy jsou jen ve verifieru, ne ve studentském souboru. Student vidí jen své prázdné políčko.') +
            row(pMid, 'Pomáhá', 'Student test otevře a odevzdá vícekrát', 'Verifier označí duplicitní kód i duplicitní ID pokusu oranžově. Rozhodnutí, který pokus platí, je na tobě.') +
            row(pMid, 'Pomáhá', 'Opisování od souseda', 'Zapni promíchání otázek. Pro ostrý test ideálně pro každou skupinu jiné zadání.') +
            row(pMid, 'Pomáhá', 'Student přepne okno nebo aplikaci během testu', 'Test se zamkne, signál uvidíš ve verifieru. Ber to jako vodítko, ne důkaz — na mobilu ho vyvolá i běžné oznámení nebo příchozí hovor.') +
            row(pMid, 'Pomáhá', 'Obejití zámku jiným prohlížečem nebo anonymním oknem', 'Zámek i blok opětovného odevzdání se drží v úložišti prohlížeče, takže incognito nebo jiný prohlížeč je obejde. Je to odrazení a záznam, ne nepřekonatelná překážka — v učebně hlídej, kdo začíná test znovu.') +
            row(pNo, 'Neřeší', 'Dva studenti si vymění kódy', 'Verifier vidí kód v seznamu a použitý jednou — záměnu sám nepozná. Ověř u zařízení, že kód sedí na přítomného studenta.') +
            row(pNo, 'Neřeší', 'Test píše za studenta někdo jiný', 'Kód ani odkaz neověří, kdo u zařízení skutečně sedí. Totožnost musí potvrdit dozor.') +
            row(pNo, 'Neřeší', 'Telefon, tahák, druhé zařízení, šeptání', 'Fyzický dozor. Software druhé zařízení ani odposlech nevidí.') +
            row(pNo, 'Neřeší', 'Přečtení otázek z odkazu předem', 'Odkaz pošli nebo zveřejni až na začátku testu. Stejné zadání nedávej opakovaně víc skupinám.') +
            row(pNo, 'Neřeší', 'Student si obsah testu zapamatuje na příště', 'Co student jednou viděl, může předat dál. Pro další skupinu vytvoř variantu nebo nový test.') +
            row(pNo, 'Neřeší', 'Student protahuje čas prací mimo okno', 'Klientský timer odpočítává jen v běžící kartě a sám čas neohlídá. Reálný čas drží dozor; čas odevzdání a opuštění okna vidíš ve verifieru.') +
          '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">🛡️</span> Shrnutí</div>' +
        '<div class="sec-guide-ok">Přísný režim + jednorázové kódy chrání známku a klíč spolehlivě, ohlídá použití cizího kódu i opakovaný pokus a podvádění ztěžuje. Zabránit fyzickému podvádění, záměně identity (kdo pod kódem reálně sedí) a úniku zadání ale musí dozor a organizace, ne soubor.</div>' +
      '</div>' +

    '</div>' +
    '<div class="sec-guide-actions">' +
      '<button type="button" class="ui-modal-btn primary" id="strictSitOkBtn">Rozumím</button>' +
    '</div>';

  var backdrop = document.createElement('div');
  backdrop.id = 'strictSitGate';
  backdrop.className = 'ui-modal-backdrop sec-guide-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'strictSitHead');
  backdrop.innerHTML = '<div class="ui-modal-box sec-guide-box" id="strictSitHead">' + html + '</div>';
  document.body.appendChild(backdrop);

  function closeStrictSit() { backdrop.remove(); }
  backdrop.querySelector('#strictSitOkBtn').addEventListener('click', closeStrictSit);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) closeStrictSit(); });
  backdrop.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeStrictSit(); });
}

function showApiKeyGuide(){
  if (document.getElementById('apiKeyGuideGate')) return;

  var html =
    '<div class="sec-guide-hero">' +
      '<div class="sec-guide-hero-emoji">🔑</div>' +
      '<div class="sec-guide-hero-title">Jak získat a omezit Gemini API klíč</div>' +
      '<div class="sec-guide-hero-sub">Postup krok za krokem — zdarma, trvá asi 3 minuty</div>' +
    '</div>' +
    '<div class="sec-guide-body">' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">1️⃣</span> Přihlaste se do Google AI Studio</div>' +
        '<p class="sec-guide-p">Otevřete v prohlížeči adresu <strong>aistudio.google.com</strong> a přihlaste se svým Google účtem (stejným, který běžně používáte).</p>' +
        '<p class="sec-guide-p">Pokud se zobrazí uvítací obrazovka, klikněte na <strong>„Continue"</strong>.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">2️⃣</span> Otevřete správu API klíčů</div>' +
        '<p class="sec-guide-p">V levém menu klikněte na <strong>„Get API key"</strong> (nebo přejděte přímo na <strong>aistudio.google.com/apikey</strong>).</p>' +
        '<p class="sec-guide-p">Zobrazí se přehled vašich klíčů. Pokud žádný nemáte, klikněte na <strong>„Create API key"</strong> a vyberte existující projekt nebo nechte vytvořit nový.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">3️⃣</span> Otevřete nastavení klíče v Google Cloud</div>' +
        '<p class="sec-guide-p">U vašeho klíče klikněte na ikonu tužky ✏️ nebo na název klíče. Tím se dostanete do <strong>Google Cloud Console</strong> — to je správná stránka pro omezení.</p>' +
        '<p class="sec-guide-p">Pokud vás to přesměruje na <strong>console.cloud.google.com</strong>, jste na správném místě.</p>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">4️⃣</span> Omezte klíč na Gemini API</div>' +
        '<p class="sec-guide-p">Na stránce úprav klíče najděte sekci <strong>„APIs that can be accessed using this key"</strong>.</p>' +
        '<p class="sec-guide-p">Klikněte na rozbalovací nabídku <strong>„Select API restrictions"</strong> a vyberte <strong>„Restrict key"</strong>.</p>' +
        '<p class="sec-guide-p">Ze seznamu vyberte <strong>„Generative Language API"</strong> (to je Gemini API). Ostatní API nechte nezaškrtnuté.</p>' +
        '<div class="sec-guide-ok">✓ Pod výběrem se zobrazí: <strong>Selected APIs: Gemini API</strong> — to je správný stav.</div>' +
      '</div>' +

      '<div class="sec-guide-section">' +
        '<div class="sec-guide-section-title"><span class="sg-ico">5️⃣</span> Uložte a zkopírujte klíč</div>' +
        '<p class="sec-guide-p">Klikněte na tlačítko <strong>„Save"</strong> dole na stránce.</p>' +
        '<p class="sec-guide-p">Vraťte se zpět na <strong>aistudio.google.com/apikey</strong>, klikněte na <strong>„Show key"</strong> a klíč zkopírujte.</p>' +
        '<p class="sec-guide-p">Vložte ho do pole <strong>„Gemini API klíč (AIza…)"</strong> ve žluté sekci generátoru a klikněte <strong>„Použít jen pro relaci"</strong>.</p>' +
        '<div class="sec-guide-warn">⚠️ Klíč začíná vždy písmeny <strong>AIza</strong>. Pokud začíná jinak, není to Gemini API klíč.</div>' +
      '</div>' +

    '</div>' +
    '<div class="sec-guide-actions">' +
      '<button type="button" class="ui-modal-btn primary" id="apiKeyGuideOkBtn">← Zpět</button>' +
    '</div>';

  var backdrop = document.createElement('div');
  backdrop.id = 'apiKeyGuideGate';
  backdrop.className = 'ui-modal-backdrop sec-guide-gate';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'apiKeyGuideHead');
  backdrop.innerHTML = '<div class="ui-modal-box sec-guide-box" id="apiKeyGuideHead">' + html + '</div>';
  document.body.appendChild(backdrop);

  function closeGuide() { backdrop.remove(); }
  backdrop.querySelector('#apiKeyGuideOkBtn').addEventListener('click', closeGuide);
  backdrop.addEventListener('click', function(e){ if (e.target === backdrop) closeGuide(); });
  backdrop.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeGuide(); });
}

// Povinné úvodní okno: vyskočí při každém otevření generátoru a blokuje tvorbu testu,
// dokud uživatel nepotvrdí „ROZUMÍM". Záměrně NEjde zavřít klikem mimo okno ani Esc —
// jediná cesta dál je tlačítko. Stejný text jako návod 📋 v záhlaví (jeden zdroj).

