// ═══ Admin Test Lab ═══════════════════════════════════════════════════════════
// Vestavěná diagnostika pro admina. Nevolá Gemini ani nestahuje soubory; slouží
// jako rychlá pojistka před vydáním / po úpravě single-file generátoru. Nenahrazuje
// plné E2E testy v reálném prohlížeči (Playwright), ale pokrývá nejrizikovější
// interní guardy, které už v generátoru existují.
function tlResult(status, name, message, detail){ return { status:status, name:name, message:message, detail:detail || '' }; }
function tlPass(name, message, detail){ return tlResult('pass', name, message, detail); }
function tlWarn(name, message, detail){ return tlResult('warn', name, message, detail); }
function tlFail(name, message, detail){ return tlResult('fail', name, message, detail); }
function tlStatusLabel(st){ return st === 'pass' ? 'prošlo' : (st === 'warn' ? 'varování' : 'selhalo'); }
function tlCardHtml(r){
  return '<div class="testlab-card ' + esc(r.status) + '">'
    + '<div class="testlab-head"><div class="testlab-title">' + esc(r.name) + '</div><div class="testlab-status">' + esc(tlStatusLabel(r.status)) + '</div></div>'
    + '<div class="testlab-msg">' + esc(r.message) + '</div>'
    + (r.detail ? '<div class="testlab-detail">' + esc(r.detail) + '</div>' : '')
    + '</div>';
}
function tlRenderReport(targetId, results, headline){
  var out = document.getElementById(targetId); if (!out) return;
  var pass = results.filter(function(r){ return r.status === 'pass'; }).length;
  var warn = results.filter(function(r){ return r.status === 'warn'; }).length;
  var fail = results.filter(function(r){ return r.status === 'fail'; }).length;
  var overall = fail ? 'fail' : (warn ? 'warn' : 'pass');
  out.innerHTML =
    '<div class="testlab-summary">'
    + '<span class="testlab-pill ' + overall + '">' + esc(headline || 'Výsledek') + '</span>'
    + '<span class="testlab-pill pass">✓ ' + pass + '</span>'
    + '<span class="testlab-pill warn">⚠ ' + warn + '</span>'
    + '<span class="testlab-pill fail">✗ ' + fail + '</span>'
    + '</div>'
    + '<div class="testlab-grid">' + results.map(tlCardHtml).join('') + '</div>';
}
function tlFixtureGeneratedHtml(){
  return '<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Smoke fixture</title></head><body>'
    + '<div id="introScreen"></div><div id="testScreen"></div><div id="resultScreen"></div><div id="teacherModal"></div>'
    + '<script>function buildVerify(){return true;}function buildReportSeal(){return "ok";}function parseVerifyText(t){return {text:t};}function doTeacherLogin(){return true;}function closeTeacherModal(){return true;}<\/script>'
    + '</body></html>';
}
function tlChecks(){
  return [
    { name:'Admin gate', run:function(){
      if (typeof accIsAdmin !== 'function' || !accIsAdmin()) return tlFail('Admin gate', 'Test Lab se pokusil spustit mimo admin roli.', 'accIsAdmin() není true.');
      var chip = document.getElementById('accTestLabChip');
      if (!chip) return tlFail('Admin gate', 'V hlavičce chybí admin čip Test Lab.', 'Očekáván element #accTestLabChip.');
      if (chip.classList.contains('hidden')) return tlWarn('Admin gate', 'Jsi admin, ale čip Test Lab je aktuálně skrytý.', 'Funkce jde otevřít, ale sync hlavičky nemusí být aktuální.');
      return tlPass('Admin gate', 'Test Lab je dostupný jen pro admin roli a čip je viditelný.');
    }},
    { name:'Release metadata', run:function(){
      var problems = [];
      if (!RELEASE || !RELEASE.version) problems.push('chybí RELEASE.version');
      if (!RELEASE || !RELEASE.date) problems.push('chybí RELEASE.date');
      if (!RELEASE || !RELEASE.status) problems.push('chybí RELEASE.status');
      if (!BUILD_HASH) problems.push('chybí BUILD_HASH');
      if (problems.length) return tlFail('Release metadata', 'Release metadata nejsou kompletní.', problems.join('\n'));
      var detail = 'verze: ' + RELEASE.version + '\ndatum: ' + RELEASE.date + '\nstav: ' + RELEASE.status + '\nbuild: ' + BUILD_HASH;
      if (RELEASE.status !== 'production-serverless') return tlWarn('Release metadata', 'Verze není označena jako produkční serverless vydání.', detail);
      return tlPass('Release metadata', 'Release metadata jsou kompletní a verze je schválená.', detail);
    }},
    { name:'HTML modal vrstva', run:function(){
      var missing = ['uiAlert','uiConfirm','uiPrompt','uiToast'].filter(function(fn){ return typeof window[fn] !== 'function'; });
      if (missing.length) return tlFail('HTML modal vrstva', 'Chybí vlastní UI modal/toast funkce.', missing.join(', '));
      return tlPass('HTML modal vrstva', 'Vlastní modal/toast funkce jsou dostupné; Test Lab nepřidává native alert/confirm/prompt.');
    }},
    { name:'SecretScanner regrese', run:function(){
      if (typeof SecretScanner === 'undefined' || typeof SecretScanner.runTests !== 'function') return tlFail('SecretScanner regrese', 'SecretScanner nebo jeho regresní sada není dostupná.');
      var r = SecretScanner.runTests();
      if (r.fail) {
        var bad = r.results.filter(function(x){ return !x.passed; }).map(function(x){ return x.name; }).join('\n');
        return tlFail('SecretScanner regrese', 'Bezpečnostní scanner má selhané fixture testy.', bad || (r.fail + ' selhání'));
      }
      return tlPass('SecretScanner regrese', 'Všech ' + r.total + '/' + r.total + ' regresních testů scanneru prošlo.');
    }},
    { name:'Export guard', run:function(){
      if (typeof SecretScanner === 'undefined' || typeof SecretScanner.assertSafeExport !== 'function') return tlFail('Export guard', 'Chybí SecretScanner.assertSafeExport().');
      var bad = SecretScanner.assertSafeExport({ fileName:'student_test.html', target:'student', targetLabel:'studentský test', content:'const PRIVATE_KEY={"kty":"RSA","d":"secret"}; const VARIANTS_FULL=[];' });
      var good = SecretScanner.assertSafeExport({ fileName:'student_test.html', target:'student', targetLabel:'studentský test', content:'<div>Odpovědi jsou v teacher_verifier.html</div>' });
      if (bad.ok) return tlFail('Export guard', 'Studentský export propustil ukázkový privátní klíč.', 'PRIVATE_KEY + VARIANTS_FULL měly být zablokovány.');
      if (!good.ok) return tlFail('Export guard', 'Scanner má false positive na bezpečné instrukci pro studenta.', JSON.stringify(good.findings || [], null, 2));
      return tlPass('Export guard', 'Studentský export blokuje citlivá data a zároveň nepadá na bezpečné instrukci.');
    }},
    { name:'Smoke validator HTML', run:function(){
      if (typeof validateGeneratedHtmlSmoke !== 'function') return tlFail('Smoke validator HTML', 'Chybí validateGeneratedHtmlSmoke().');
      validateGeneratedHtmlSmoke(tlFixtureGeneratedHtml());
      return tlPass('Smoke validator HTML', 'Fixture studentského HTML prošla povinnou strukturou, offline pravidly i JS syntaxí.');
    }},
    { name:'Answer-key guard', run:function(){
      if (typeof assertNoStudentAnswerKeys !== 'function') return tlFail('Answer-key guard', 'Chybí assertNoStudentAnswerKeys().');
      var blocked = false;
      try { assertNoStudentAnswerKeys({ question:'Q', correct:'A' }); } catch (e) { blocked = true; }
      if (!blocked) return tlFail('Answer-key guard', 'Guard neblokuje pole correct ve studentské datové konstantě.');
      assertNoStudentAnswerKeys({ question:'Q', options:['A','B'], prompt:'Vyber správnou možnost.' });
      return tlPass('Answer-key guard', 'Pole s odpovědním klíčem je blokováno, bezpečná studentská data projdou.');
    }},
    { name:'Self-test bodování', run:function(){
      if (typeof runScoringSelfTest !== 'function') return tlFail('Self-test bodování', 'Chybí runScoringSelfTest().');
      if (!document.getElementById('selfTestReport')) return tlWarn('Self-test bodování', 'Funkce existuje, ale v DOM chybí výstupní panel #selfTestReport.');
      return tlPass('Self-test bodování', 'Funkce self-testu bodování i výstupní panel jsou dostupné.');
    }},
    { name:'Secure/verifier funkce', run:function(){
      var missing = ['assembleSecureOfflinePackage','validateSecurePackageSmoke','downloadGeneratedStudentTest','downloadGeneratedTeacherVerifier','buildSecureTeacherVerifierHtml'].filter(function(fn){ return typeof window[fn] !== 'function'; });
      if (missing.length) return tlFail('Secure/verifier funkce', 'Chybí některé funkce bezpečného režimu.', missing.join(', '));
      return tlPass('Secure/verifier funkce', 'Základní funkce secure offline režimu, student exportu a verifieru jsou dostupné.');
    }},
    { name:'Bez Gemini/API', run:function(){
      if (typeof callGeminiJSON !== 'function') return tlWarn('Bez Gemini/API', 'Generátor nemá dostupnou funkci callGeminiJSON(); Test Lab ji ale nespouští.');
      return tlPass('Bez Gemini/API', 'Vestavěná diagnostika běží bez volání Gemini a bez API klíče.');
    }},
    { name:'Normalizace typů', run:function(){
      if (typeof normalizeType !== 'function') return tlFail('Normalizace typů', 'Chybí normalizeType().');
      if (normalizeType('translation') !== 'translation') return tlFail('Normalizace typů', 'Kanonický typ „translation" se nezachoval.', 'normalizeType("translation") = ' + normalizeType('translation'));
      var aliases = ['překlad','preklad','translate'];
      var bad = aliases.filter(function(a){ return normalizeType(a) !== 'translation'; });
      if (bad.length) return tlFail('Normalizace typů', 'Některé starší aliasy se nenormalizují na „translation".', bad.map(function(a){ return a + ' → ' + normalizeType(a); }).join('\n'));
      return tlPass('Normalizace typů', '„translation" je kanonické a aliasy překlad/preklad/translate se na něj normalizují.');
    }},
    { name:'Pedagogická mapa typů', run:function(){
      if (typeof pedagogyOf !== 'function' || typeof EXERCISE_PEDAGOGY === 'undefined') return tlFail('Pedagogická mapa typů', 'Chybí pedagogyOf() / EXERCISE_PEDAGOGY.');
      var btns = Array.prototype.slice.call(document.querySelectorAll('#typyBtns .tag-btn'));
      if (!btns.length) return tlWarn('Pedagogická mapa typů', 'V DOM nejsou tlačítka typů (#typyBtns) — nelze ověřit pokrytí.');
      var unmapped = btns.map(function(b){ return b.dataset.val; }).filter(function(v){ return v && pedagogyOf(v) === 'other'; });
      if (unmapped.length) return tlFail('Pedagogická mapa typů', 'Některé nabízené typy nemají pedagogickou funkci (spadnou do „other").', unmapped.join(', '));
      return tlPass('Pedagogická mapa typů', 'Všech ' + btns.length + ' nabízených typů cvičení má přiřazenou pedagogickou funkci (BOD 5).');
    }},
    { name:'Datový model / migrace', run:function(){
      if (typeof normalizeLoadedState !== 'function') return tlFail('Datový model / migrace', 'Chybí normalizeLoadedState().');
      var s;
      try { s = normalizeLoadedState({}); } catch (e) { return tlFail('Datový model / migrace', 'normalizeLoadedState({}) skončilo výjimkou — starší data by spadla.', e && e.stack ? e.stack : String(e && e.message ? e.message : e)); }
      var bad = [];
      if (typeof s.ageGroup !== 'string') bad.push('ageGroup není string');
      if (['none','brief','learning'].indexOf(s.feedbackMode) === -1) bad.push('feedbackMode=' + s.feedbackMode);
      if (['basic','standard','challenge'].indexOf(s.differentiationLevel) === -1) bad.push('differentiationLevel=' + s.differentiationLevel);
      if (bad.length) return tlFail('Datový model / migrace', 'Starší data bez nových polí nedostala bezpečné defaulty.', bad.join('\n'));
      return tlPass('Datový model / migrace', 'normalizeLoadedState doplní bezpečné defaulty nových polí (zpětná kompatibilita starých snapshotů/šablon).');
    }},
    { name:'Prompt builder', run:function(){
      if (typeof buildPrompt !== 'function') return tlFail('Prompt builder', 'Chybí buildPrompt().');
      var p;
      try { p = buildPrompt(); } catch (e) { return tlFail('Prompt builder', 'buildPrompt() skončilo výjimkou — sestavení promptu je rozbité.', e && e.stack ? e.stack : String(e && e.message ? e.message : e)); }
      if (typeof p !== 'string' || p.length < 50) return tlFail('Prompt builder', 'buildPrompt() nevrátil rozumný textový prompt.', 'typ: ' + (typeof p) + ', délka: ' + (p ? p.length : 0));
      return tlPass('Prompt builder', 'buildPrompt() sestaví prompt bez chyby (' + p.length + ' znaků).');
    }},
    { name:'Self-test bodování (spuštění)', run:async function(){
      if (typeof runScoringSelfTest !== 'function') return tlFail('Self-test bodování (spuštění)', 'Chybí runScoringSelfTest().');
      if (!generatedPackage && !generatedTestHtml) return tlWarn('Self-test bodování (spuštění)', 'Není vygenerovaný test — self-test se nespouští. Nejdřív vytvoř test, pak spusť tuto kontrolu.');
      var res;
      try { res = await runScoringSelfTest(); }
      catch (e) { return tlFail('Self-test bodování (spuštění)', 'runScoringSelfTest() skončil výjimkou.', e && e.stack ? e.stack : String(e && e.message ? e.message : e)); }
      if (!res) return tlWarn('Self-test bodování (spuštění)', 'Self-test nevrátil výsledek (nebylo co testovat).');
      if (res.hasErrors) return tlFail('Self-test bodování (spuštění)', 'Self-test bodování našel nesrovnalost mezi klíčem a strojovým bodováním. Otevři panel self-testu pro detail.');
      if (res.hasGaps) return tlWarn('Self-test bodování (spuštění)', 'Self-test prošel, ale s mezerami (např. nepokrytá pásma stupnice). Zkontroluj panel self-testu.');
      return tlPass('Self-test bodování (spuštění)', 'Self-test bodování proběhl proti vygenerovanému testu a prošel bez nesrovnalostí.');
    }},
    { name:'Offline guard (negativní)', run:function(){
      if (typeof validateGeneratedHtmlSmoke !== 'function') return tlFail('Offline guard (negativní)', 'Chybí validateGeneratedHtmlSmoke().');
      // Vezmi strukturně platný fixture a vlož do něj externí závislost (CDN). Guard ji MUSÍ odmítnout.
      var badHtml = tlFixtureGeneratedHtml().replace('</body>', '<script src="https://cdn.example.com/lib.js"><\/script></body>');
      var threw = false, msg = '';
      try { validateGeneratedHtmlSmoke(badHtml); } catch (e) { threw = true; msg = String(e && e.message ? e.message : e); }
      if (!threw) return tlFail('Offline guard (negativní)', 'Smoke validátor NEodmítl HTML s externí závislostí (CDN) — offline strážce nemá účinek. Studentský test by mohl tiše záviset na síti.');
      if (!/extern|offline|cdn/i.test(msg)) return tlWarn('Offline guard (negativní)', 'HTML s CDN bylo odmítnuto, ale zřejmě z jiného důvodu než kvůli offline pravidlu.', msg);
      return tlPass('Offline guard (negativní)', 'Smoke validátor správně odmítá HTML s externí závislostí (CDN/síť) — offline strážce funguje.');
    }},
    { name:'Multi-select bodování', run:function(){
      // 1) Načti SKUTEČNOU multiSelectScore přímo ze sdíleného bodovacího zdroje (stejný kód, jaký se vkládá do studenta i verifieru).
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function multiSelectScore') < 0) return tlFail('Multi-select bodování', 'SHARED_SCORING_JS neobsahuje multiSelectScore — sdílené bodování typu chybí.');
      var ms;
      try { ms = (new Function(SHARED_SCORING_JS + '\nreturn multiSelectScore;'))(); }
      catch (e) { return tlFail('Multi-select bodování', 'multiSelectScore nejde načíst ze SHARED_SCORING_JS.', e && e.message ? e.message : String(e)); }
      if (typeof ms !== 'function') return tlFail('Multi-select bodování', 'multiSelectScore není funkce.');
      // 2) Přísné bodování: 4 scénáře proti správné množině [0,2,3], pts=3.
      var cor=[0,2,3], P=3;
      var cases=[
        { name:'všechny správné',    sel:[0,2,3],   exp:P },
        { name:'jen část správných', sel:[0,2],     exp:0 },
        { name:'správná i špatná',   sel:[0,2,3,1], exp:0 },
        { name:'nevybráno nic',      sel:[],        exp:0 }
      ];
      for (var i=0;i<cases.length;i++){
        var got = ms(cases[i].sel, cor, P);
        if (got !== cases[i].exp) return tlFail('Multi-select bodování', 'Scénář „'+cases[i].name+'": čekáno '+cases[i].exp+' b, vráceno '+got+' b. Přísné bodování (přesná shoda množiny = plný počet, jakýkoli rozdíl = 0) neplatí.');
      }
      // pořadí výběru nesmí hrát roli
      if (ms([3,0,2], cor, P) !== P) return tlFail('Multi-select bodování', 'Stejná množina v jiném pořadí ([3,0,2]) nedostala plný počet — bodování závisí na pořadí.');
      // 3) Zapojení v secure (offline) studentské cestě: render + sběr + bodování.
      var ss = '';
      try { ss = secureStudentScript(); } catch(e) { return tlFail('Multi-select bodování', 'secureStudentScript() skončil výjimkou.', e && e.message ? e.message : String(e)); }
      var miss = [];
      if (ss.indexOf("type==='multi-select'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function toggleMulti') < 0) miss.push('sběr odpovědí (toggleMulti)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='multi-select'") < 0 || ts.indexOf('multiSelectScore(val,it.correct,pts)') < 0) miss.push('bodování (scoreItemSecure → multiSelectScore)');
      if (ts.indexOf('multiSelectScore') < 0) miss.push('sdílené multiSelectScore v secure');
      if (miss.length) return tlFail('Multi-select bodování', 'Secure studentská cesta nemá zapojený multi-select: '+miss.join(', ')+'.');
      // 4) Secure student soubor nesmí kvůli multi-selectu obsahovat klíč — multi-select nepřidává žádný answer key do studentského kódu (klíč je jen v payloadu/verifieru).
      return tlPass('Multi-select bodování', 'Přísné bodování projde všemi 4 scénáři (plný/0/0/0) nezávisle na pořadí a multi-select je zapojený v secure cestě (render + sběr + bodování přes sdílenou multiSelectScore).');
    }},
    { name:'Ordering bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function orderingScore') < 0) return tlFail('Ordering bodování', 'SHARED_SCORING_JS neobsahuje orderingScore — sdílené bodování typu chybí.');
      var os;
      try { os = (new Function(SHARED_SCORING_JS + '\nreturn orderingScore;'))(); }
      catch (e) { return tlFail('Ordering bodování', 'orderingScore nejde načíst ze SHARED_SCORING_JS.', e && e.message ? e.message : String(e)); }
      if (typeof os !== 'function') return tlFail('Ordering bodování', 'orderingScore není funkce.');
      var co=[1,3,0,2], P=2;
      var cases=[
        { name:'správné pořadí',        seq:[1,3,0,2], exp:P },
        { name:'jedna prohozená dvojice',seq:[1,3,2,0], exp:0 },
        { name:'výchozí nepromíchané',  seq:[0,1,2,3], exp:0 },
        { name:'úplně obrácené',        seq:[2,0,3,1], exp:0 }
      ];
      for (var i=0;i<cases.length;i++){
        var got = os(cases[i].seq, co, P);
        if (got !== cases[i].exp) return tlFail('Ordering bodování', 'Scénář „'+cases[i].name+'": čekáno '+cases[i].exp+' b, vráceno '+got+' b. Přísné bodování (celé pořadí přesně = plný počet, jakákoli chyba = 0) neplatí.');
      }
      // bez odpovědi (student nic nepřesune) → bere se výchozí pořadí → 0 (protože co ≠ [0,1,2,3])
      if (os(undefined, co, P) !== 0) return tlFail('Ordering bodování', 'Nevyplněná odpověď se nevyhodnotila jako výchozí pořadí (0 b).');
      // identické pořadí, kde výchozí JE správné → plný počet
      if (os(undefined, [0,1,2], P) !== P) return tlFail('Ordering bodování', 'Když je výchozí pořadí správné, nedostalo plný počet.');
      var ss = '';
      try { ss = secureStudentScript(); } catch(e) { return tlFail('Ordering bodování', 'secureStudentScript() skončil výjimkou.', e && e.message ? e.message : String(e)); }
      var miss = [];
      if (ss.indexOf("type==='ordering'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function clickOrd(') < 0) miss.push('sběr odpovědí (clickOrd)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='ordering'") < 0 || ts.indexOf('orderingScore(val,it.correct_order,pts)') < 0) miss.push('bodování (scoreItemSecure → orderingScore)');
      if (ts.indexOf('orderingScore') < 0) miss.push('sdílené orderingScore v secure');
      if (miss.length) return tlFail('Ordering bodování', 'Secure studentská cesta nemá zapojený ordering: '+miss.join(', ')+'.');
      // word order se nesmí přebít na ordering
      if (typeof normalizeType==='function' && normalizeType('word order')!=='word order') return tlFail('Ordering bodování', 'normalizeType rozbil „word order" (kolize s ordering).');
      return tlPass('Ordering bodování', 'Přísné bodování projde 4 scénáře (správně=plný, prohození=0, výchozí=0, obrácené=0), ordering je zapojený v secure cestě (▲▼ render + sběr + bodování) a „word order" zůstal nedotčený.');
    }},
    { name:'Table-completion bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function tableCompletionScore') < 0) return tlFail('Table-completion bodování', 'SHARED_SCORING_JS neobsahuje tableCompletionScore.');
      var tc;
      try { tc = (new Function('function __isSpanish(){return false;}function __fuzzyMode(){return "off";}\n' + SHARED_SCORING_JS + '\nreturn tableCompletionScore;'))(); }
      catch (e) { return tlFail('Table-completion bodování', 'tableCompletionScore nejde načíst.', e && e.message ? e.message : String(e)); }
      if (typeof tc !== 'function') return tlFail('Table-completion bodování', 'tableCompletionScore není funkce.');
      var rows=[['go','went',{answer:'gone',alt_answers:['been gone']}],['see',{answer:'saw',alt_answers:[]},'seen'],['write','wrote',{answer:'written',alt_answers:[]}]], P=3;
      var allOk=tc([['','','gone'],['','saw',''],['','','written']],rows,P,'table-completion');
      if (Math.abs(allOk-P)>1e-9) return tlFail('Table-completion bodování', 'Všechny buňky správně měly dát '+P+' b, vrátilo '+allOk+'.');
      var part=tc([['','','gone'],['','saw',''],['','','WRONG']],rows,P,'table-completion');
      if (Math.abs(part-2)>1e-9) return tlFail('Table-completion bodování', 'Dvě ze tří buněk správně měly dát 2 b, vrátilo '+part+'.');
      var none=tc([['','','x'],['','y',''],['','','z']],rows,P,'table-completion');
      if (none!==0) return tlFail('Table-completion bodování', 'Vše špatně mělo dát 0 b, vrátilo '+none+'.');
      var alt=tc([['','','been gone'],['','saw',''],['','','written']],rows,P,'table-completion');
      if (Math.abs(alt-P)>1e-9) return tlFail('Table-completion bodování', 'Alternativní odpověď z alt_answers nebyla uznána.');
      var ss = '';
      try { ss = secureStudentScript(); } catch(e) { return tlFail('Table-completion bodování', 'secureStudentScript() skončil výjimkou.', e && e.message ? e.message : String(e)); }
      var miss = [];
      if (ss.indexOf("type==='table-completion'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function setTable') < 0) miss.push('sběr odpovědí (setTable)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='table-completion'") < 0 || ts.indexOf('tableCompletionScore(val,it.rows,pts,t)') < 0) miss.push('bodování (scoreItemSecure → tableCompletionScore)');
      if (miss.length) return tlFail('Table-completion bodování', 'Secure cesta nemá zapojený table-completion: '+miss.join(', ')+'.');
      if (typeof stripItemForStudent==='function'){
        var clean=stripItemForStudent({question:'Q',columns:['A','B'],rows:[['go',{answer:'went',alt_answers:['gone']}]]}, 'table-completion');
        var raw=JSON.stringify(clean);
        if(/went|gone|alt_answers|answer/.test(raw)) return tlFail('Table-completion bodování', 'Studentský soubor by obsahoval answer/alt_answers (KLÍČ uniká): '+raw);
        if(raw.indexOf('"input":true')<0) return tlFail('Table-completion bodování', 'Studentský soubor nezachoval pozici input buňky: '+raw);
      }
      return tlPass('Table-completion bodování', 'Částečné bodování funguje (3/3=plný, 2/3=částečně, vše špatně=0), alt_answers se uznávají, secure render/sběr/bodování je zapojený a studentský soubor neobsahuje klíč.');
    }},
    { name:'Transformation-chain bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function transformationChainScore') < 0) return tlFail('Transformation-chain bodování', 'SHARED_SCORING_JS neobsahuje transformationChainScore.');
      var tc,P=12,trs=[
        {instruction:'Make it negative.',answer:'She does not go to school by bus.',alt_answers:["She doesn't go to school by bus."]},
        {instruction:'Make it a question.',answer:'Does she go to school by bus?',alt_answers:[]},
        {instruction:'Change it into the past simple.',answer:'She went to school by bus.',alt_answers:[]}
      ];
      try { tc = (new Function('function __isSpanish(){return false;}function __fuzzyMode(){return "off";}\n' + SHARED_SCORING_JS + '\nreturn transformationChainScore;'))(); }
      catch (e) { return tlFail('Transformation-chain bodování', 'transformationChainScore nejde načíst.', e && e.message ? e.message : String(e)); }
      if (typeof tc !== 'function') return tlFail('Transformation-chain bodování', 'transformationChainScore není funkce.');
      var allOk=tc(['She does not go to school by bus.','Does she go to school by bus?','She went to school by bus.'],trs,P,'transformation-chain');
      var part=tc(['WRONG','Does she go to school by bus?','WRONG'],trs,P,'transformation-chain');
      var alt=tc(["She doesn't go to school by bus.",'Does she go to school by bus?','She went to school by bus.'],trs,P,'transformation-chain');
      var none=tc(['x','y','z'],trs,P,'transformation-chain');
      if (Math.abs(allOk-P)>1e-9) return tlFail('Transformation-chain bodování', 'Vše správně nedává plný počet.', 'got '+allOk+' / '+P);
      if (Math.abs(part-P/3)>1e-9) return tlFail('Transformation-chain bodování', 'Jedna ze tří transformací nedává částečný bodový zisk.', 'got '+part+' / expected '+(P/3));
      if (Math.abs(alt-P)>1e-9) return tlFail('Transformation-chain bodování', 'Alternativní odpověď z alt_answers nebyla uznána.', 'got '+alt+' / '+P);
      if (none!==0) return tlFail('Transformation-chain bodování', 'Všechno špatně nemá být bodováno.', 'got '+none);
      var ss = secureStudentScript ? String(secureStudentScript()) : '';
      var miss=[];
      if (ss.indexOf("type==='transformation-chain'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function setChain') < 0) miss.push('sběr odpovědí (setChain)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='transformation-chain'") < 0 || ts.indexOf('transformationChainScore(val,it.transformations,pts,t)') < 0) miss.push('bodování (scoreItemSecure → transformationChainScore)');
      if (miss.length) return tlFail('Transformation-chain bodování', 'Secure cesta nemá zapojený transformation-chain: '+miss.join(', ')+'.');
      if (typeof stripItemForStudent==='function'){
        var clean=stripItemForStudent({base_sentence:'Base',transformations:[{instruction:'Do it',answer:'SECRET',alt_answers:['SECRET2']}],explanation:'x'}, 'transformation-chain');
        var j=JSON.stringify(clean);
        if(j.indexOf('SECRET')>=0||j.indexOf('alt_answers')>=0||j.indexOf('answer')>=0)return tlFail('Transformation-chain bodování', 'Studentský export obsahuje klíč transformation.answer/alt_answers.', j);
      }
      return tlPass('Transformation-chain bodování', 'Částečné bodování, alt_answers, secure render/sběr/bodování a neúnik klíče OK.');
    }},

    { name:'Highlight-evidence bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function highlightEvidenceScore') < 0) return tlFail('Highlight-evidence bodování', 'SHARED_SCORING_JS neobsahuje highlightEvidenceScore.');
      var he;
      try { he = (new Function(SHARED_SCORING_JS + '\nreturn highlightEvidenceScore;'))(); }
      catch (e) { return tlFail('Highlight-evidence bodování', 'highlightEvidenceScore nejde načíst.', e && e.message ? e.message : String(e)); }
      if (typeof he !== 'function') return tlFail('Highlight-evidence bodování', 'highlightEvidenceScore není funkce.');
      var P=2;
      if (he(1,1,P)!==P) return tlFail('Highlight-evidence bodování', 'Správná věta nedává plný počet.');
      if (he(0,1,P)!==0) return tlFail('Highlight-evidence bodování', 'Špatná věta nemá dát 0.');
      if (he(undefined,1,P)!==0 || he('',1,P)!==0) return tlFail('Highlight-evidence bodování', 'Nevybraná odpověď nemá dát 0.');
      var ss = secureStudentScript ? String(secureStudentScript()) : '';
      var miss=[];
      if (ss.indexOf("type==='highlight-evidence'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function selectEvidence') < 0) miss.push('sběr odpovědi (selectEvidence)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='highlight-evidence'") < 0 || ts.indexOf('highlightEvidenceScore(val,it.correct,pts)') < 0) miss.push('bodování (scoreItemSecure → highlightEvidenceScore)');
      if (miss.length) return tlFail('Highlight-evidence bodování', 'Secure cesta nemá zapojený highlight-evidence: '+miss.join(', ')+'.');
      if (typeof stripItemForStudent==='function'){
        var clean=stripItemForStudent({question:'Q',sentences:['A','B'],correct:1,explanation:'SECRET'}, 'highlight-evidence');
        var j=JSON.stringify(clean);
        if(j.indexOf('correct')>=0||j.indexOf('SECRET')>=0||j.indexOf('explanation')>=0)return tlFail('Highlight-evidence bodování', 'Studentský export obsahuje klíč correct/explanation.', j);
        if(j.indexOf('sentences')<0||j.indexOf('B')<0)return tlFail('Highlight-evidence bodování', 'Studentský export nezachoval věty k výběru.', j);
      }
      return tlPass('Highlight-evidence bodování', 'Správný index = plný počet, špatný/nevybraný = 0, secure render/sběr/bodování je zapojený a studentský export neobsahuje correct/explanation.');
    }},

    { name:'Error-tagging bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function errorTaggingScore') < 0) return tlFail('Error-tagging bodování', 'SHARED_SCORING_JS neobsahuje errorTaggingScore.');
      var et,item={sentence:'She go to school every day.',tokens:['She','go','to','school','every','day.'],error_token_index:1,error_type:'verb form',error_type_options:['word order','verb form','spelling','article'],correction:'goes'},P=3;
      try { et = (new Function('function __isSpanish(){return false;}function __fuzzyMode(){return "off";}\n' + SHARED_SCORING_JS + '\nreturn errorTaggingScore;'))(); }
      catch (e) { return tlFail('Error-tagging bodování', 'errorTaggingScore nejde načíst.', e && e.message ? e.message : String(e)); }
      if (typeof et !== 'function') return tlFail('Error-tagging bodování', 'errorTaggingScore není funkce.');
      var allOk=et({token:1,etype:'verb form',corr:'goes'},item,P,'error-tagging');
      var tokenOnly=et({token:1,etype:'spelling',corr:'go'},item,P,'error-tagging');
      var tokenType=et({token:1,etype:'verb form',corr:'go'},item,P,'error-tagging');
      var none=et({token:0,etype:'spelling',corr:'go'},item,P,'error-tagging');
      if (Math.abs(allOk-P)>1e-9) return tlFail('Error-tagging bodování', 'Všechny tři části správně nedávají plný počet.', 'got '+allOk+' / '+P);
      if (Math.abs(tokenOnly-P/3)>1e-9) return tlFail('Error-tagging bodování', 'Jen token správně nemá 1/3 bodu.', 'got '+tokenOnly+' / expected '+(P/3));
      if (Math.abs(tokenType-2*P/3)>1e-9) return tlFail('Error-tagging bodování', 'Token + typ správně nemají 2/3 bodu.', 'got '+tokenType+' / expected '+(2*P/3));
      if (none!==0) return tlFail('Error-tagging bodování', 'Vše špatně má dát 0.', 'got '+none);
      var ss='';try{ss=secureStudentScript();}catch(e){return tlFail('Error-tagging bodování','secureStudentScript() skončil výjimkou.',e&&e.message?e.message:String(e));}
      var miss=[];
      if(ss.indexOf("type==='error-tagging'")<0)miss.push('render (renderQ)');
      if(ss.indexOf('function setErrorTagToken')<0||ss.indexOf('setErrorTagType')<0||ss.indexOf('setErrorTagCorrection')<0)miss.push('sběr odpovědí');
      var ts=(typeof secureTeacherScript==='function')?String(secureTeacherScript()):'';
      if(ts.indexOf("t==='error-tagging'")<0||ts.indexOf('errorTaggingScore(val,it,pts,t)')<0)miss.push('bodování');
      if(String(buildQuestionHtml||'').indexOf('error-tagging')<0)miss.push('instant preview/render');
      if(miss.length)return tlFail('Error-tagging bodování','Zapojení error-tagging není kompletní: '+miss.join(', ')+'.');
      if (typeof stripItemForStudent==='function'){
        var clean=stripItemForStudent(Object.assign({},item,{explanation:'SECRET'}),'error-tagging');
        var j=JSON.stringify(clean);
        if(('error_token_index' in clean)||('error_type' in clean)||('correction' in clean)||('explanation' in clean))return tlFail('Error-tagging bodování','Studentský export obsahuje klíč error-tagging.',j);
        if(j.indexOf('tokens')<0||j.indexOf('error_type_options')<0)return tlFail('Error-tagging bodování','Studentský export nezachoval tokeny nebo možnosti typu chyby.',j);
      }
      return tlPass('Error-tagging bodování','Částečné bodování 3/3, 1/3, 2/3 a 0/3 funguje; render/sběr/bodování jsou zapojené; studentský export neobsahuje klíč.');
    }},

    { name:'Categorisation-board bodování', run:function(){
      if (typeof SHARED_SCORING_JS !== 'string' || SHARED_SCORING_JS.indexOf('function categoryBoardScore') < 0) return tlFail('Categorisation-board bodování', 'SHARED_SCORING_JS neobsahuje categoryBoardScore.');
      var cb;
      try { cb = (new Function(SHARED_SCORING_JS + '\nreturn categoryBoardScore;'))(); }
      catch (e) { return tlFail('Categorisation-board bodování', 'categoryBoardScore nejde načíst.', e && e.message ? e.message : String(e)); }
      if (typeof cb !== 'function') return tlFail('Categorisation-board bodování', 'categoryBoardScore není funkce.');
      var entries=[{text:'a',category:'X'},{text:'b',category:'Y'},{text:'c',category:'X'},{text:'d',category:'Y'}], P=4;
      var allOk=cb(['X','Y','X','Y'],entries,P);
      if (allOk!==P) return tlFail('Categorisation-board bodování', 'Vše správně mělo dát '+P+' b, vrátilo '+allOk+'.');
      var half=cb(['X','Y','Y','X'],entries,P); // 2 ze 4 správně
      if (Math.abs(half-P*0.5)>1e-9) return tlFail('Categorisation-board bodování', 'Polovina správně měla dát '+(P*0.5)+' b (částečné bodování), vrátilo '+half+'. Částečné bodování neplatí.');
      var none=cb(['Y','X','Y','X'],entries,P);
      if (none!==0) return tlFail('Categorisation-board bodování', 'Vše špatně mělo dát 0 b, vrátilo '+none+'.');
      var threeOf4=cb(['X','Y','X','X'],entries,P); // 3 ze 4
      if (Math.abs(threeOf4-P*0.75)>1e-9) return tlFail('Categorisation-board bodování', '3 ze 4 mělo dát '+(P*0.75)+' b (75 %), vrátilo '+threeOf4+'.');
      if (cb([],entries,P)!==0) return tlFail('Categorisation-board bodování', 'Prázdná odpověď měla dát 0 b.');
      var ss = '';
      try { ss = secureStudentScript(); } catch(e) { return tlFail('Categorisation-board bodování', 'secureStudentScript() skončil výjimkou.', e && e.message ? e.message : String(e)); }
      var miss = [];
      if (ss.indexOf("type==='categorisation-board'") < 0) miss.push('render (renderQ)');
      if (ss.indexOf('function setBoard') < 0) miss.push('sběr odpovědí (setBoard)');
      var ts = (typeof secureTeacherScript==='function') ? String(secureTeacherScript()) : '';
      if (ts.indexOf("t==='categorisation-board'") < 0 || ts.indexOf('categoryBoardScore(val,it.entries,pts)') < 0) miss.push('bodování (scoreItemSecure → categoryBoardScore)');
      if (ts.indexOf('categoryBoardScore') < 0) miss.push('sdílené categoryBoardScore v secure');
      if (miss.length) return tlFail('Categorisation-board bodování', 'Secure cesta nemá zapojený categorisation-board: '+miss.join(', ')+'.');
      // klíč entry.category nesmí být ve studentském souboru
      if (typeof stripItemForStudent==='function'){
        var s=stripItemForStudent({question:'Q',categories:['X','Y'],entries:[{text:'a',category:'X'}]}, 'categorisation-board');
        var leak=Array.isArray(s.entries)&&s.entries.some(function(e){return e && ('category' in e);});
        if(leak) return tlFail('Categorisation-board bodování', 'Studentský soubor by obsahoval entry.category (KLÍČ uniká).');
      }
      // staré categorization se nesmí přebít
      if (typeof normalizeType==='function' && normalizeType('categorization')!=='categorization') return tlFail('Categorisation-board bodování', 'normalizeType rozbil „categorization" (kolize).');
      return tlPass('Categorisation-board bodování', 'Částečné bodování funguje (4/4=plný, 3/4=75 %, 2/4=50 %, 0/4=0), typ je zapojený v secure cestě (dropdowny + sběr + bodování), klíč entry.category neuniká do studentského souboru a „categorization" zůstal nedotčený.');
    }},

    { name:'Banked cloze + Multiple matching alias', run:function(){
      // Tyto typy nemají vlastní scoring funkci — aliasují na existující
      if (typeof normalizeType !== 'function') return tlFail('Banked cloze + Multiple matching alias', 'Chybí normalizeType().');
      // Ověř, že typy existují v systému a mají správný alias
      // Aliasy přes scoringTypeFor() — EXERCISE_PEDAGOGY mapuje na pedagogickou kategorii, ne score
      if (typeof scoringTypeFor !== 'function') return tlFail('Banked cloze + Multiple matching alias', 'Chybí scoringTypeFor().');
      var bcAlias = scoringTypeFor('banked cloze');
      var mmAlias = scoringTypeFor('multiple matching');
      if (!bcAlias) return tlFail('Banked cloze + Multiple matching alias', 'scoringTypeFor(banked cloze) vrátil prázdný výsledek.');
      if (!mmAlias) return tlFail('Banked cloze + Multiple matching alias', 'scoringTypeFor(multiple matching) vrátil prázdný výsledek.');
      if (bcAlias !== 'cloze text') return tlFail('Banked cloze + Multiple matching alias', 'Banked cloze by měl aliasovat na "cloze text" přes scoringTypeFor, má: ' + bcAlias + '.');
      if (mmAlias !== 'matching') return tlFail('Banked cloze + Multiple matching alias', 'Multiple matching by měl aliasovat na "matching" přes scoringTypeFor, má: ' + mmAlias + '.');
      // Ověř, že manuální editor pro ně existuje
      if (typeof isManualSupported !== 'function') return tlFail('Banked cloze + Multiple matching alias', 'Chybí isManualSupported().');
      if (!isManualSupported('banked cloze')) return tlFail('Banked cloze + Multiple matching alias', 'isManualSupported("banked cloze") vrátil false — chybí v MANUAL_SUPPORTED_TYPES.');
      if (!isManualSupported('multiple matching')) return tlFail('Banked cloze + Multiple matching alias', 'isManualSupported("multiple matching") vrátil false — chybí v MANUAL_SUPPORTED_TYPES.');
      return tlPass('Banked cloze + Multiple matching alias', 'Aliasy na cloze text / matching jsou správné; oba typy jsou v manuálním editoru.');
    }},

    { name:'quickModel + Model fallback', run:function(){
      if (typeof GEMINI_MODEL_DEFAULT === 'undefined') return tlFail('quickModel + Model fallback', 'Chybí GEMINI_MODEL_DEFAULT.');
      if (typeof GEMINI_FALLBACK_MODELS === 'undefined' || !Array.isArray(GEMINI_FALLBACK_MODELS) || !GEMINI_FALLBACK_MODELS.length) return tlFail('quickModel + Model fallback', 'GEMINI_FALLBACK_MODELS chybí nebo je prázdné.');
      if (typeof pickGeminiFallbackModel !== 'function') return tlFail('quickModel + Model fallback', 'Chybí pickGeminiFallbackModel().');
      if (typeof normalizeModelName !== 'function') return tlFail('quickModel + Model fallback', 'Chybí normalizeModelName().');
      // quickModel
      if (typeof quickModel !== 'function') return tlFail('quickModel + Model fallback', 'Chybí quickModel().');
      var lastSet = null;
      var origSet = typeof setGeminiModel === 'function' ? setGeminiModel : null;
      if (!origSet) return tlFail('quickModel + Model fallback', 'Chybí setGeminiModel().');
      // Simulace: zachytíme co quickModel nastaví
      var orig = window.setGeminiModel;
      window.setGeminiModel = function(m){ lastSet = m; };
      quickModel('strong'); var strong = lastSet;
      quickModel('lite');   var lite = lastSet;
      window.setGeminiModel = orig;
      if (strong !== GEMINI_MODEL_DEFAULT) return tlFail('quickModel + Model fallback', 'quickModel("strong") nastavil "' + strong + '", očekáváno "' + GEMINI_MODEL_DEFAULT + '".');
      if (lite !== GEMINI_FALLBACK_MODELS[0]) return tlFail('quickModel + Model fallback', 'quickModel("lite") nastavil "' + lite + '", očekáváno "' + GEMINI_FALLBACK_MODELS[0] + '".');
      // pickGeminiFallbackModel
      var fb1 = pickGeminiFallbackModel(GEMINI_MODEL_DEFAULT);
      if (!fb1) return tlFail('quickModel + Model fallback', 'pickGeminiFallbackModel(default) vrátil prázdný string — není žádný záložní model.');
      if (normalizeModelName(fb1).toLowerCase() === normalizeModelName(GEMINI_MODEL_DEFAULT).toLowerCase()) return tlFail('quickModel + Model fallback', 'Fallback model je stejný jako primární (' + fb1 + ').');
      // Fallback od fallbacku musí být jiný nebo prázdný
      var fb2 = pickGeminiFallbackModel(GEMINI_FALLBACK_MODELS[0]);
      if (fb2 && normalizeModelName(fb2).toLowerCase() === normalizeModelName(GEMINI_FALLBACK_MODELS[0]).toLowerCase()) return tlFail('quickModel + Model fallback', 'pickGeminiFallbackModel(lite) vrátil stejný model jako vstup (' + fb2 + ').');
      return tlPass('quickModel + Model fallback', 'GEMINI_MODEL_DEFAULT=' + GEMINI_MODEL_DEFAULT + ', fallback[0]=' + GEMINI_FALLBACK_MODELS[0] + '. quickModel(strong/lite) nastavuje správné modely. pickGeminiFallbackModel vrací odlišný záložní model.');
    }},

    { name:'Manuální editor (funkce + typy)', run:function(){
      if (typeof isManualSupported !== 'function') return tlFail('Manuální editor (funkce + typy)', 'Chybí isManualSupported().');
      if (typeof showManualExerciseForm !== 'function') return tlFail('Manuální editor (funkce + typy)', 'Chybí showManualExerciseForm().');
      if (typeof generateTestWithManual !== 'function') return tlFail('Manuální editor (funkce + typy)', 'Chybí generateTestWithManual().');
      if (typeof MANUAL_SUPPORTED_TYPES === 'undefined' || !Array.isArray(MANUAL_SUPPORTED_TYPES)) return tlFail('Manuální editor (funkce + typy)', 'Chybí MANUAL_SUPPORTED_TYPES pole.');
      var expected = ['categorisation-board','ordering','multi-select','highlight-evidence','transformation-chain','error-tagging','banked cloze','multiple matching','table-completion'];
      var missing = expected.filter(function(t){ return !isManualSupported(t); });
      if (missing.length) return tlFail('Manuální editor (funkce + typy)', 'isManualSupported vrátil false pro: ' + missing.join(', ') + '.', 'MANUAL_SUPPORTED_TYPES: ' + MANUAL_SUPPORTED_TYPES.join(', '));
      var shouldNotSupport = ['multiple choice','fill-in-the-blank','true/false','translation'];
      var falsePositive = shouldNotSupport.filter(function(t){ return isManualSupported(t); });
      if (falsePositive.length) return tlFail('Manuální editor (funkce + typy)', 'isManualSupported vrátil true pro jednoduché typy (nemělo by): ' + falsePositive.join(', ') + '.');
      return tlPass('Manuální editor (funkce + typy)', 'showManualExerciseForm, generateTestWithManual i isManualSupported jsou dostupné. Všech 9 složitých typů je podporováno; jednoduché typy (MC, fill-in…) ne.');
    }},

    { name:'catBoard lock + nová pole (regrese)', run:function(){
      if (typeof normalizeLoadedState !== 'function') return tlFail('catBoard lock + nová pole (regrese)', 'Chybí normalizeLoadedState().');
      // splitGenerate default
      var s = normalizeLoadedState({});
      if (s.splitGenerate !== false) return tlFail('catBoard lock + nová pole (regrese)', 'normalizeLoadedState({}).splitGenerate není false, je: ' + s.splitGenerate);
      // manualMode default v exerciseConfig
      var s2 = normalizeLoadedState({ exerciseConfig: [{typ:'ordering', pocetOtazek:2, body:4}] });
      if (!s2.exerciseConfig || !s2.exerciseConfig.length) return tlFail('catBoard lock + nová pole (regrese)', 'normalizeLoadedState nevrátil exerciseConfig.');
      if (s2.exerciseConfig[0].manualMode !== false) return tlFail('catBoard lock + nová pole (regrese)', 'Nové cvičení v načteném stavu by mělo mít manualMode=false, má: ' + s2.exerciseConfig[0].manualMode);
      // catBoard buildContentPrompt lock: count musí být 1 bez ohledu na pocetOtazek
      if (typeof buildExerciseSpecs !== 'function') return tlFail('catBoard lock + nová pole (regrese)', 'Chybí buildExerciseSpecs().');
      var catState = normalizeLoadedState({ exerciseDetail:true, exerciseConfig:[{typ:'categorisation-board', pocetOtazek:8, body:20}] });
      var specs = buildExerciseSpecs(catState);
      if (!specs || !specs.length) return tlFail('catBoard lock + nová pole (regrese)', 'buildExerciseSpecs() nevrátil specs pro catBoard.');
      if (specs[0].count !== 1) return tlFail('catBoard lock + nová pole (regrese)', 'catBoard spec.count by měl být 1 (lock), je: ' + specs[0].count + '. Nastavení pocetOtazek=8 by mělo být ignorováno.');
      return tlPass('catBoard lock + nová pole (regrese)', 'splitGenerate defaultuje na false; nová cvičení mají manualMode=false; catBoard buildExerciseSpecs vrací count=1 bez ohledu na pocetOtazek (lock funguje).');
    }}

  ];
}
function openTestLab(){
  if (typeof accIsAdmin === 'function' && !accIsAdmin()) { try { uiAlert('Test Lab je dostupný jen pro roli admin.', 'Test Lab'); } catch (e) {} return; }
  var bd = document.getElementById('testLabModal');
  if (!bd){
    bd = document.createElement('div');
    bd.className = 'ui-modal-backdrop';
    bd.id = 'testLabModal';
    bd.setAttribute('role','dialog'); bd.setAttribute('aria-modal','true');
    document.body.appendChild(bd);
    bd.addEventListener('click', function(e){ if (e.target === bd) bd.remove(); });
  }
  bd.innerHTML =
    '<div class="ui-modal-box testlab-box">'
    + '<div class="acc-admin-headbar"><span class="acc-admin-title">🧪 Test Lab / admin diagnostika</span><button type="button" class="acc-admin-x" id="testLabX" aria-label="Zavřít" title="Zavřít">✕</button></div>'
    + '<div class="acc-admin-scroll">'
    +   '<div class="testlab-intro">Admin kontrola generátoru a právě vytvořených testů. Běží lokálně, nevolá Gemini a nic nestahuje. Slouží jako rychlá pojistka před vydáním nové verze nebo před sdílením konkrétního testu.</div>'
    +   '<div class="testlab-actions">'
    +     '<button type="button" class="acc-btn primary" id="testLabRunAll" title="Kontrola generátoru jako aplikace: bezpečnostní pojistky, export, UI modaly, self-testy, verifier a základní technická diagnostika.">Spustit vše</button>'
    +     '<button type="button" class="acc-btn" id="testLabPingGemini" title="Rychlý ping Gemini API s aktuálním klíčem a modelem. VOLÁ GEMINI — spotřebuje 1 API request.">🌐 Ping API</button>'
    +     '<button type="button" class="acc-btn" id="testLabDownloadE2E" title="Stáhne ZIP s Playwright smoke testy pro reálný prohlížeč — první vrstva E2E kontroly mimo Test Lab.">⬇ Stáhnout E2E starter</button>'
    +     '<button type="button" class="acc-btn" id="testLabClear" title="Smaže jen diagnostické hlášky v Test Labu. Nemění test ani nastavení generátoru.">Vyčistit výstup</button>'
    +   '</div>'
    +   '<div class="testlab-admin-help">'
    +     '<div class="testlab-admin-help-card"><b>Spustit vše</b><strong>Kontroluje generátor.</strong> Použij po úpravě kódu nebo před vydáním nové verze.</div>'
    +     '<div class="testlab-admin-help-card"><b>Vyčistit výstup</b><strong>Jen uklidí Test Lab.</strong> Smaže hlášky z diagnostiky, ne rozpracovaný test.</div>'
    +   '</div>'
    +   '<div class="testlab-note"><b>Rozsah:</b> admin gate, release metadata, UI modaly, SecretScanner, export guard, smoke validátor HTML, offline guard (negativní), answer-key guard, self-test bodování (vč. reálného spuštění proti vygenerovanému testu), secure/verifier funkce, normalizace typů, pedagogická mapa, datový model a prompt builder. <b>Neověřuje:</b> reálné klikání v prohlížeči, stahování souborů, mobilní Safari ani celý uživatelský průchod. Pro první vrstvu reálného prohlížeče použij nově tlačítko „Stáhnout E2E starter”.</div>'
    +   '<div id="testLabResults" style="margin-top:12px"></div>'
    + '</div>'
    + '<div class="acc-admin-footbar"><button type="button" class="acc-btn primary" id="testLabClose">Zavřít</button></div>'
    + '</div>';
  document.getElementById('testLabX').addEventListener('click', function(){ bd.remove(); });
  document.getElementById('testLabClose').addEventListener('click', function(){ bd.remove(); });
  document.getElementById('testLabRunAll').addEventListener('click', testLabRunAll);
  document.getElementById('testLabPingGemini').addEventListener('click', testLabPingGemini);
  var e2eBtn = document.getElementById('testLabDownloadE2E');
  if (e2eBtn) e2eBtn.addEventListener('click', downloadE2EStarter);
  document.getElementById('testLabClear').addEventListener('click', function(){ var el=document.getElementById('testLabResults'); if(el) el.innerHTML=''; });
}
async function testLabPingGemini(){
  var btn = document.getElementById('testLabPingGemini');
  var orig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Pinguju…'; }
  var out = document.getElementById('testLabResults');
  if (out) out.innerHTML = '<div class="st-box st-warn">Volám Gemini API s minimálním promptem…</div>';
  var result;
  try {
    var model = resolveGeminiModel ? resolveGeminiModel() : 'neznámý';
    if (!geminiApiKey) throw new Error('API klíč není nastaven.');
    var t0 = Date.now();
    var data = await callGeminiJSON('Reply with exactly: {"ok":true}', [], {});
    var ms = Date.now() - t0;
    var ok = data && data.ok === true;
    result = ok
      ? [{ status:'pass', name:'Gemini API ping', message:'Spojení funguje, model odpověděl za ' + ms + ' ms.', detail: 'model=' + model }]
      : [{ status:'warn', name:'Gemini API ping', message:'API odpovědělo, ale JSON neobsahuje {ok:true}. Model: ' + model, detail: JSON.stringify(data) }];
  } catch(e) {
    result = [{ status:'fail', name:'Gemini API ping', message:'API ping selhal: ' + (e && e.message ? e.message : String(e)), detail: '' }];
  }
  tlRenderReport('testLabResults', result, 'Gemini API ping');
  if (btn) { btn.disabled = false; btn.textContent = orig; }
}

async function testLabRunAll(){
  var btn = document.getElementById('testLabRunAll');
  var origTxt = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Probíhá…'; }
  var out = document.getElementById('testLabResults'); if (out) out.innerHTML = '<div class="st-box st-warn">Spouštím admin diagnostiku…</div>';
  var results = [];
  var checks = tlChecks();
  for (var i = 0; i < checks.length; i++) {
    try { results.push(await checks[i].run()); }
    catch (e) { results.push(tlFail(checks[i].name, 'Kontrola skončila výjimkou.', e && e.stack ? e.stack : String(e && e.message ? e.message : e))); }
  }
  window.TEST_LAB_LAST_REPORT = { generatedAt:new Date().toISOString(), release:RELEASE.version, results:results };
  tlRenderReport('testLabResults', results, 'Vestavěná diagnostika');
  if (btn) { btn.disabled = false; btn.textContent = origTxt; }
}


// ── E2E starter export (Playwright) ───────────────────────────────────────────
function buildE2EReadme() {
  return [
    "# Generátor testů — E2E smoke testy",
    "",
    "Tento balíček je startovací sada pro Playwright. Ověří, že generátor i exportované testy jdou otevřít v reálném prohlížeči, nepoužívají nativní dialogy a netahají externí zdroje.",
    "",
    "## Instalace",
    "",
    "1. Ulož aktuální generátor jako `index.html` do kořene složky s těmito soubory.",
    "2. Spusť `npm install`.",
    "3. Spusť `npm run install:browsers`.",
    "4. Spusť `npm test`.",
    "",
    "## Volitelné kontroly exportů",
    "",
    "Po vygenerování testu můžeš přidat cesty k exportům:",
    "",
    "Windows PowerShell:",
    "`$env:GENERATOR_HTML=\".\\index.html\"; $env:STUDENT_HTML=\".\\student_test.html\"; $env:TEACHER_HTML=\".\\teacher_verifier.html\"; npm test`",
    "",
    "macOS/Linux:",
    "`GENERATOR_HTML=./index.html STUDENT_HTML=./student_test.html TEACHER_HTML=./teacher_verifier.html npm test`",
    "",
    "## Co testy hlídají",
    "",
    "- JavaScript generátoru se načte v Chromiu bez konzolových chyb.",
    "- V kódu nejsou přímá volání `alert()`, `confirm()` ani `prompt()` mimo texty/řetězce.",
    "- Studentský export neobsahuje běžné učitelské/secretní signály jako `PRIVATE_KEY` nebo `VARIANTS_FULL`.",
    "- Exporty při otevření nevytvářejí HTTP/HTTPS requesty, tedy jsou použitelné offline.",
    "",
    "Poznámka: Tyto E2E smoke testy nenahrazují ruční pedagogickou kontrolu obsahu testu. Jsou pojistka proti technickým regresím."
  ].join('\n');
}
function buildE2EPackageJson() {
  return [
    "{",
    "  \"name\": \"generator-e2e-smoke\",",
    "  \"version\": \"1.0.0\",",
    "  \"private\": true,",
    "  \"scripts\": {",
    "    \"test\": \"playwright test\",",
    "    \"test:headed\": \"playwright test --headed\",",
    "    \"install:browsers\": \"playwright install chromium\"",
    "  },",
    "  \"devDependencies\": {",
    "    \"@playwright/test\": \"^1.54.0\"",
    "  }",
    "}"
  ].join('\n');
}
function buildE2EPlaywrightConfig() {
  return [
    "const { defineConfig } = require('@playwright/test');",
    "",
    "module.exports = defineConfig({",
    "  testDir: './e2e',",
    "  timeout: 30000,",
    "  expect: { timeout: 5000 },",
    "  use: {",
    "    browserName: 'chromium',",
    "    headless: true,",
    "    viewport: { width: 1366, height: 900 }",
    "  },",
    "  reporter: [['list'], ['html', { open: 'never' }]]",
    "});"
  ].join('\n');
}
function buildE2ESpec() {
  return [
    "const { test, expect } = require('@playwright/test');",
    "const fs = require('fs');",
    "const path = require('path');",
    "",
    "function fileUrl(filePath) {",
    "  return 'file://' + path.resolve(filePath).replace(/\\\\/g, '/');",
    "}",
    "",
    "function envPath(name, fallback) {",
    "  const raw = process.env[name] || fallback || '';",
    "  if (!raw) return null;",
    "  const abs = path.resolve(raw);",
    "  if (!fs.existsSync(abs)) throw new Error(name + ' neexistuje: ' + abs);",
    "  return abs;",
    "}",
    "",
    "function scriptBlocks(html) {",
    "  const blocks = [];",
    "  String(html || '').replace(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi, (_, code) => { blocks.push(code); return ''; });",
    "  return blocks;",
    "}",
    "",
    "function stripCode(code) {",
    "  let out = '';",
    "  let i = 0;",
    "  const s = String(code || '');",
    "  while (i < s.length) {",
    "    const c = s[i];",
    "    const d = s[i + 1];",
    "    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\\n') i++; out += '\\n'; continue; }",
    "    if (c === '/' && d === '*') { i += 2; while (i < s.length - 1 && !(s[i] === '*' && s[i + 1] === '/')) { if (s[i] === '\\n') out += '\\n'; i++; } i += 2; continue; }",
    "    if (c === '\"' || c === \"'\" || c === '`') {",
    "      const q = c; out += ' '; i++;",
    "      while (i < s.length) {",
    "        if (s[i] === '\\\\') { i += 2; continue; }",
    "        if (s[i] === q) { i++; break; }",
    "        if (s[i] === '\\n') out += '\\n';",
    "        i++;",
    "      }",
    "      continue;",
    "    }",
    "    out += c; i++;",
    "  }",
    "  return out;",
    "}",
    "",
    "function assertNoNativeDialogsInScripts(html, label) {",
    "  const rx = /(^|[^\\w$.])(alert|confirm|prompt)\\s*\\(/g;",
    "  for (const [idx, code] of scriptBlocks(html).entries()) {",
    "    const stripped = stripCode(code);",
    "    const hit = rx.exec(stripped);",
    "    if (hit) throw new Error(label + ': native dialog call ve scriptu #' + (idx + 1) + ' poblíž znaku ' + hit.index);",
    "  }",
    "}",
    "",
    "function assertNoExternalDeps(html, label) {",
    "  const text = String(html || '');",
    "  const structural = /<script\\b[^>]+\\bsrc\\s*=|<link\\b[^>]+\\bhref\\s*=\\s*[\"']https?:|@import\\s+url/i;",
    "  if (structural.test(text)) throw new Error(label + ': HTML obsahuje externí script/link/import');",
    "  const network = /(^|[^\\w$.])(fetch|XMLHttpRequest|importScripts)\\s*\\(|(^|[^\\w$.])navigator\\.sendBeacon\\s*\\(/g;",
    "  for (const [idx, code] of scriptBlocks(text).entries()) {",
    "    const hit = network.exec(stripCode(code));",
    "    if (hit) throw new Error(label + ': script #' + (idx + 1) + ' obsahuje síťové volání');",
    "  }",
    "}",
    "",
    "async function watchRuntime(page) {",
    "  const nativeDialogs = [];",
    "  const externalRequests = [];",
    "  const consoleErrors = [];",
    "  page.on('dialog', async dialog => { nativeDialogs.push(dialog.type() + ': ' + dialog.message()); await dialog.dismiss().catch(() => {}); });",
    "  page.on('request', request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });",
    "  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });",
    "  return { nativeDialogs, externalRequests, consoleErrors };",
    "}",
    "",
    "test('generator se načte bez nativních dialogů a externích requestů', async ({ page }) => {",
    "  const generator = envPath('GENERATOR_HTML', path.join(__dirname, '..', 'index.html'));",
    "  const html = fs.readFileSync(generator, 'utf8');",
    "  expect(html).toContain('const RELEASE');",
    "  assertNoNativeDialogsInScripts(html, 'generator');",
    "  const runtime = await watchRuntime(page);",
    "  await page.goto(fileUrl(generator));",
    "  await expect(page.locator('body')).toBeVisible();",
    "  expect(runtime.nativeDialogs).toEqual([]);",
    "  expect(runtime.externalRequests).toEqual([]);",
    "  expect(runtime.consoleErrors.filter(t => !/favicon/i.test(t))).toEqual([]);",
    "});",
    "",
    "test('studentský export je offline a bez učitelských secretů', async ({ page }) => {",
    "  const student = envPath('STUDENT_HTML');",
    "  test.skip(!student, 'Nastav STUDENT_HTML na cestu ke student_test.html, pokud chceš kontrolovat export.');",
    "  const html = fs.readFileSync(student, 'utf8');",
    "  assertNoNativeDialogsInScripts(html, 'student export');",
    "  assertNoExternalDeps(html, 'student export');",
    "  ['PRIVATE_KEY', 'VARIANTS_FULL', 'teacher_verifier', 'downloadArchiveHtml', 'key_ops:[\"decrypt\"]'].forEach(secret => {",
    "    expect(html.includes(secret), secret + ' nesmí být ve studentském exportu').toBeFalsy();",
    "  });",
    "  const runtime = await watchRuntime(page);",
    "  await page.goto(fileUrl(student));",
    "  await expect(page.locator('body')).toBeVisible();",
    "  expect(runtime.nativeDialogs).toEqual([]);",
    "  expect(runtime.externalRequests).toEqual([]);",
    "});",
    "",
    "test('učitelský verifier se načte offline bez nativních dialogů', async ({ page }) => {",
    "  const teacher = envPath('TEACHER_HTML');",
    "  test.skip(!teacher, 'Nastav TEACHER_HTML na cestu k teacher_verifier.html, pokud chceš kontrolovat verifier.');",
    "  const html = fs.readFileSync(teacher, 'utf8');",
    "  assertNoNativeDialogsInScripts(html, 'teacher verifier');",
    "  assertNoExternalDeps(html, 'teacher verifier');",
    "  expect(html).toContain('Učitelský verifier');",
    "  const runtime = await watchRuntime(page);",
    "  await page.goto(fileUrl(teacher));",
    "  await expect(page.locator('body')).toBeVisible();",
    "  expect(runtime.nativeDialogs).toEqual([]);",
    "  expect(runtime.externalRequests).toEqual([]);",
    "});"
  ].join('\n');
}

function downloadE2EStarter(){
  downloadBlobFile(buildE2EReadme(), 'README-generator-e2e.md', 'text/markdown;charset=utf-8');
  downloadBlobFile(buildE2EPackageJson(), 'package.json', 'application/json;charset=utf-8');
  downloadBlobFile(buildE2EPlaywrightConfig(), 'playwright.config.js', 'text/javascript;charset=utf-8');
  downloadBlobFile(buildE2ESpec(), 'generator-smoke.spec.js', 'text/javascript;charset=utf-8');
  uiToast('E2E starter stažen: README, package.json, playwright.config.js a generator-smoke.spec.js. Soubor spec vlož do složky e2e/.', 'ok', 6500);
}

function downloadBlobFile(content, filename, mime='text/html;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function rosterEscHtml(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function rosterParseEmails(raw){
  var toks=String(raw||'').split(/[\s,;]+/).map(function(x){return x.trim();}).filter(Boolean);
  var seen={},out=[];
  toks.forEach(function(tok){ if(tok.indexOf('@')<0)return; var low=tok.toLowerCase(); if(seen[low])return; seen[low]=1; out.push({email:low,label:low.split('@')[0]}); });
  return out;
}
function rosterMakeCode(){
  var ab='ABCDEFGHJKMNPQRSTUVWXYZ23456789',n=6,o='';
  try{var a=new Uint32Array(n);crypto.getRandomValues(a);for(var i=0;i<n;i++)o+=ab[a[i]%ab.length];}
  catch(e){for(var j=0;j<n;j++)o+=ab[Math.floor(Math.random()*ab.length)];}
  return o;
}
function rosterForVerifier(){ return (rosterEntries||[]).map(function(e){ return {code:e.code,label:e.label}; }); }
function rosterRender(msg){
  var box=document.getElementById('rosterResult'); if(!box)return;
  if(msg){ box.innerHTML='<span style="color:var(--err)">'+rosterEscHtml(msg)+'</span>'; return; }
  if(!rosterEntries.length){ box.innerHTML='Zatím žádné kódy. Vlep e-maily a klikni na „Vygenerovat kódy".'; return; }
  var rows=rosterEntries.map(function(e){ return '<tr><td style="padding:3px 8px 3px 0">'+rosterEscHtml(e.label)+'</td><td style="padding:3px 10px;font-family:monospace;font-weight:700">'+rosterEscHtml(e.code)+'</td><td style="padding:3px 0;color:var(--t3)">'+rosterEscHtml(e.email)+'</td></tr>'; }).join('');
  box.innerHTML='<div style="margin-bottom:6px"><b>'+rosterEntries.length+'</b> studentů, kódy vygenerované. Zapečou se do verifieru až při vygenerování testu — při změně kódů test vygeneruj znovu.</div><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="text-align:left;color:var(--t3)"><th style="padding-right:8px">Označení</th><th style="padding-right:10px">Kód</th><th>E-mail</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function rosterGenerate(){
  var ta=document.getElementById('rosterEmails'); var raw=ta?ta.value:'';
  var parsed=rosterParseEmails(raw);
  if(!parsed.length){ rosterEntries=[]; rosterRender('Vlož aspoň jeden e-mail ve tvaru prijmeni@domena.'); return; }
  var used={};
  parsed.forEach(function(e){ var c; do{ c=rosterMakeCode(); }while(used[c]); used[c]=1; e.code=c; });
  rosterEntries=parsed; rosterRender('');
}
function rosterDownloadCsv(){
  if(!rosterEntries.length){ rosterRender('Nejdřív vygeneruj kódy.'); return; }
  var lines=['email,student,code'];
  rosterEntries.forEach(function(e){ lines.push([e.email,e.label,e.code].map(function(x){ var v=String(x==null?'':x); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }).join(',')); });
  try{ downloadBlobFile(lines.join('\n'),'kody_'+outputSlug()+'.csv','text/csv;charset=utf-8'); }
  catch(e){ rosterRender('Stažení CSV selhalo: '+(e&&e.message||e)); }
}
function outputSlug(extra='') {
  const slug = (trim('nazev') || 'test').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'test';
  const v = (typeof variantSlug === 'string' && variantSlug) ? '_' + variantSlug : '';
  return extra ? slug + v + '_' + extra : slug + v;
}
async function downloadGeneratedTest() {
  if (generatedPackage && generatedPackage.mode === 'secureOffline') {
    if (!enforceSecureGate()) return;
    await downloadGeneratedStudentTest();
    await downloadGeneratedTeacherVerifier();
    return;
  }
  if (!generatedTestHtml) return;
  // I instant test projde scannerem (nesmí v něm být private key/master key/externí token).
  if (!(await guardExport(outputSlug()+'.html', generatedTestHtml, 'student-instant', 'studentský test'))) return;
  try { downloadBlobFile(generatedTestHtml, outputSlug()+'.html'); }
  catch(_) {
    const w = window.open('', '_blank');
    if (w) { w.document.write(generatedTestHtml); w.document.close(); }
    else setGenErr('Stažení se nezdařilo. Zkus otevřít stránku v aktuálním Chrome/Edge/Safari.');
  }
}
async function downloadGeneratedStudentTest() {
  if (!generatedPackage || !generatedPackage.studentHtml) return;
  if (!enforceSecureGate()) return;
  // Finální kontrola bajtů: nesmí to být omylem učitelský verifier / answer key.
  if (!(await guardExport(outputSlug('student_test')+'.html', generatedPackage.studentHtml, 'student', 'studentský test'))) return;
  try { downloadBlobFile(generatedPackage.studentHtml, outputSlug('student_test')+'.html'); }
  catch(e){ setGenErr('Stažení studentského testu se nezdařilo: '+(e&&e.message?e.message:e)); }
}
function teacherVerifierFileName(){ return 'DO_NOT_SEND_TEACHER_VERIFIER_contains_answers_'+outputSlug()+'_'+(generatedPackage&&generatedPackage.testId?generatedPackage.testId:'test')+'.html'; }
async function makeVariantForNextGroup(){
  if(!lastGenData){ uiAlert('Nejdřív vygeneruj test, pak z něj můžeš udělat variantu pro další skupinu.'); return; }
  variantSeq = (variantSeq||0) + 1;
  var letter = String.fromCharCode(65 + variantSeq); // B, C, D…
  variantSlug = 'skupina-' + letter.toLowerCase();
  // Varianta = jiné pořadí: zapni randomizaci (bere se až při sestavení), pak přesestav z týchž dat.
  if(typeof pick==='function') pick('randomizace','ANO'); else state.randomizace='ANO';
  var note=document.getElementById('variantNote');
  if(note){ note.classList.remove('hidden'); note.innerHTML='Připravuji variantu pro skupinu '+letter+'…'; }
  try{
    var built=await assembleTestHtml(state, lastGenData);
    if(built && typeof built==='object' && built.mode==='secureOffline'){ validateSecurePackageSmoke(built); generatedPackage=built; generatedTestHtml=''; }
    else { var html=String(built||''); validateGeneratedHtmlSmoke(html); generatedTestHtml=html; generatedPackage=null; }
    lastSelfTest=null; secureGapsAcknowledged=false; keyDiffsAcknowledged=false;
    if(typeof renderQualityDiagnostics==='function') renderQualityDiagnostics();
    if(typeof updateSecureDownloadGate==='function') updateSecureDownloadGate();
    var tid=(generatedPackage&&generatedPackage.testId)||(lastAssembled&&lastAssembled.cfg&&lastAssembled.cfg.testId)||'(nové)';
    if(note){ note.classList.remove('hidden'); note.innerHTML='✅ Varianta pro skupinu '+letter+' připravena: nové Test ID <b>'+tid+'</b>, nový název souboru (<code>'+outputSlug('student_test')+'.html</code>) a zapnuté promíchané pořadí. Stejná látka i body. Před stažením znovu spusť 🧪 self-test, pak stáhni nahoře jako obvykle. Správné odpovědi posílej studentům až po skončení všech skupin.'; }
  }catch(e){
    if(note){ note.classList.remove('hidden'); note.innerHTML='⚠️ Vytvoření varianty selhalo: '+((e&&e.message)?e.message:String(e)); }
  }
}
async function downloadGeneratedTeacherVerifier() {
  if (!generatedPackage || !generatedPackage.teacherHtml) return;
  if (!enforceSecureGate()) return;
  // Poslední pojistka u rizikové akce: učitelský verifier obsahuje správné odpovědi
  // i soukromý dešifrovací klíč. Krátké vědomé potvrzení, ať se nestáhne omylem do
  // sdílené složky spolu se studentským souborem.
  const ok = await uiConfirm(
    'Tento soubor obsahuje SPRÁVNÉ ODPOVĚDI a soukromý dešifrovací klíč. Je určen POUZE učiteli.\n\nNikdy ho neposílej studentům ani neukládej do sdílené složky, odkud berou test. Studentům jde jen student_test.html.\n\nStáhnout učitelský verifier?',
    'Stažení učitelského verifieru', true);
  if (!ok) return;
  // Scanner v režimu 'teacher': private key i answer key jsou tu OČEKÁVANÉ a neblokují se;
  // blokuje jen master key nebo externí token (GitHub/API) — ty sem nepatří.
  if (!(await guardExport(teacherVerifierFileName(), generatedPackage.teacherHtml, 'teacher', 'učitelský verifier'))) return;
  // Varování přímo v názvu souboru — přežije i mimo aplikaci (ve složce stažených,
  // při přeposílání), kde UI hlášku nikdo nevidí.
  try { downloadBlobFile(generatedPackage.teacherHtml, teacherVerifierFileName()); }
  catch(e){ setGenErr('Stažení učitelského verifieru se nezdařilo: '+(e&&e.message?e.message:e)); }
}

