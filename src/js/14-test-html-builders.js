// ─── HTML builders ─────────────────────────────────────────────────────────────

function buildIntroHtml(cfg, exercises) {
  const L = cfg.labels;
  const totalQ = exercises.reduce((s,ex) => s+(ex.items?.length||0), 0);
  return '<div id="introScreen" class="screen">' +
    '<div class="intro-card">' +
    '<h1 class="test-title">' + H(cfg.nazev) + '</h1>' +
    (cfg.proKoho ? '<p class="test-sub">' + H(cfg.proKoho) + '</p>' : '') +
    (cfg.isCzech ? '<div class="cs-test-note"><strong>Český jazyk:</strong> hodnocení se řídí zvolenou přesností. Pokud jsou cílem pravopis, interpunkce nebo velká písmena, test je hodnotí přísně podle zadání.</div>' : '') +
    '<p class="test-id-lbl">Test ID: ' + H(cfg.testId) + '</p>' +
    '<div class="ex-ov">' +
    exercises.map((ex,i) => '<div class="ex-ov-row"><span class="ex-num-badge">' + (i+1) + '</span>' +
      '<span class="ex-ov-name">' + H(ex.title||ex.type) + '</span>' +
      '<span class="ex-ov-pts">' + fmtPts(exerciseTotalPoints(ex)) + '&nbsp;' + H(L.points) + '</span></div>').join('') +
    '<div class="ex-ov-total"><span>' + H(L.total) + '</span><span>' + fmtPts(cfg.totalBody) + ' ' + H(L.points) + ' · ' + totalQ + ' ' + H(L.questions) + ' · ' + cfg.cas + ' ' + H(L.minutes) + (cfg.cefr ? ' · CEFR ' + H(cfg.cefr) : '') + '</span></div>' +
    '</div>' +
    '<div class="rules-box"><div class="rules-ttl">' + H(L.rules) + '</div><ul class="rules-list">' +
    '<li>' + H(L.ruleOwn) + '</li>' +
    '<li>' + H(L.ruleFinal) + '</li>' +
    (cfg.testMode === 'prisny' ? '<li><strong>' + H(L.ruleStrict) + '</strong></li>' : (cfg.testMode === 'bezny' ? '<li>' + H(L.ruleMonitor) + '</li>' : '')) +
    (cfg.overeni ? '<li>' + H(L.ruleVerify) + '</li>' : '') +
    (cfg.zolicek ? '<li><strong>' + H(L.ruleJoker) + '</strong></li>' : '') +
    '</ul></div>' +
    '<label class="name-lbl" for="studentName">' + H(L.name) + '</label>' +
    '<input type="text" id="studentName" class="name-inp" placeholder="' + H(L.namePh) + '" autocomplete="off" autocorrect="off">' +
    (cfg.diffGroups && cfg.diffGroups.length ? '<div class="group-warning">Diferencovaný test: zadej přesně jméno/kód podle pokynů učitele.</div>' : '') +
    (cfg.zolicek ? '<div class="joker-choice" id="jokerChoice"><div class="joker-choice-title">&#127183; ' + H(L.jokerChoiceTitle) + '</div><div class="joker-choice-hint">' + H(L.jokerChoiceHint) + '</div><div class="joker-choice-row"><button type="button" class="joker-choice-btn" id="jokerChoiceNo" onclick="chooseJokerStart(false)">' + H(L.jokerDoTest) + '</button><button type="button" class="joker-choice-btn joker-choice-risk" id="jokerChoiceYes" onclick="chooseJokerStart(true)">' + H(L.jokerTake) + '</button></div><div class="joker-choice-confirm" id="jokerChoiceConfirm" style="display:none"></div></div>' : '') +
    '<button class="btn-fullscreen" type="button" onclick="enterFullscreen()"><span class="fs-ico" aria-hidden="true"></span> ' + H(L.fullscreen || 'Fullscreen') + '</button>' +
    '<button class="btn-start" onclick="startTest()">&#9654; ' + H(L.start) + '</button>' +
    '<button class="btn-teacher-lnk" onclick="openTeacherModal()">&#128274; ' + H(L.teacher) + '</button>' +
    '</div></div>';
}

function buildTestScreenHtml(cfg, exercises) {
  const L = cfg.labels;
  const totalQ = exercises.reduce((s,ex) => s+(ex.items?.length||0), 0);
  const casStr = String(Math.floor(cfg.cas)).padStart(2,'0') + ':00';
  return '<div id="testScreen" class="screen hidden layout-' + H(cfg.layout) + '">' +
    '<div class="t-header">' +
    '<span class="t-header-title">' + H(cfg.nazev) + '</span>' +
    '<div class="t-header-right">' +
    '<span id="timerDisplay" class="timer-badge">' + casStr + '</span>' +
    '<span id="progressDisplay" class="prog-badge">0/' + totalQ + '</span>' +
    '</div></div>' +
    (cfg.layout === 'tabs' ? buildTabsNavHtml(exercises, L) : '') +
    '<div id="a11yNote" class="a11y-note hidden"></div>' +
    '<div id="jokerWatermark" class="joker-watermark hidden"></div>' +
    '<div class="ex-area" id="exArea">' +
    exercises.map((ex,ei) => buildExerciseHtml(ex, ei, cfg, exercises.length)).join('') +
    '</div>' +
    '<div class="submit-row">' +
    (cfg.odevzdavani === 'A'
      ? '<button class="btn-submit" id="btnFinalSubmit" onclick="finishVariantA()">' + H(L.showResult) + ' &#8594;</button>'
      : '<button class="btn-submit" onclick="confirmSubmit()">' + H(L.submitTest) + ' &#8594;</button>') +
    '</div>' +
    '</div>';
}

function buildTabsNavHtml(exercises, L) {
  return '<div class="tabs-nav" id="tabsNav">' +
    exercises.map((ex,i) => '<button class="tab-btn' + (i===0?' tab-active':'') + '" id="tabBtn' + i + '" onclick="switchTab(' + i + ')">' +
      '<span class="tab-num">' + (i+1) + '</span>' +
      '<span class="tab-name">' + H((ex.title||ex.type).slice(0,12)) + '</span>' +
      '<span class="tab-done hidden" id="tabDone' + i + '">&#10003;</span>' +
      '</button>').join('') +
    '</div>';
}

function rcSharedPassage(ex){
  if(!ex) return '';
  var p = ex.passage || ex.source_text || ex.text || ex.source || '';
  if(p && String(p).trim()) return String(p);
  var items = ex.items||[], first='';
  for(var i=0;i<items.length;i++){
    var ip = String((items[i] && (items[i].passage||items[i].text||items[i].source))||'').trim();
    if(i===0) first=ip; else if(ip!==first) return '';
  }
  return first;
}
function buildExerciseHtml(ex, ei, cfg, totalEx) {
  const L = cfg.labels;
  const items  = ex.items || [];
  const isFirst = ei === 0;
  const totalPts = exerciseTotalPoints(ex);
  const panelHidden = (cfg.layout === 'tabs' && !isFirst) ? ' hidden' : '';
  // Reading comprehension: jeden sdílený text nahoře, otázky pod ním (ne text u každé otázky).
  let rcHead = '', rcSkip = false;
  if (ex.type === 'reading comprehension') {
    const sp = rcSharedPassage(ex);
    if (sp) { rcHead = '<div class="source-box reading-passage"><strong>' + H(L.passage) + ':</strong><br>' + H(sp).replace(/\n/g,'<br>') + '</div>'; rcSkip = true; }
  }
  return '<div class="ex-panel' + panelHidden + '" id="exPanel' + ei + '">' +
    '<div class="ex-hdr">' +
    '<span class="ex-hdr-num">' + H(L.exercise) + ' ' + (ei+1) + '</span>' +
    '<span class="ex-hdr-title">' + H(ex.title||ex.type) + '</span>' +
    '<span class="ex-hdr-pts">' + fmtPts(totalPts) + ' ' + H(L.points) + '</span>' +
    '</div>' +
    rcHead +
    '<div class="q-list">' +
    (ex.type === 'matching'
      ? buildMatchingHtml(ei, items, itemPoint(ex, 0), L)
      : items.map((item,qi) => buildQuestionHtml(item, qi, ei, ex.type, itemPoint(ex, qi), cfg, rcSkip)).join('')) +
    '</div>' +
    '<div class="ex-feedback hidden" id="exFeedback' + ei + '"></div>' +
    (cfg.odevzdavani === 'A'
      ? '<div class="ex-submit-row"><button class="btn-ex-submit" id="btnSubmitEx' + ei + '" onclick="submitExercise(' + ei + ')">' + H(L.submitExercise) + '</button></div>'
      : '') +
    (cfg.layout === 'tabs'
      ? '<div class="ex-nav">' +
        (ei > 0 ? '<button class="btn-ex-nav" onclick="switchTab(' + (ei-1) + ')">&#8592; ' + H(L.prev) + '</button>' : '<span></span>') +
        (ei < totalEx-1
          ? '<button class="btn-ex-nav btn-ex-nav-primary" onclick="switchTab(' + (ei+1) + ')">' + H(L.next) + ' &#8594;</button>'
          : '<button class="btn-ex-nav btn-ex-nav-primary" onclick="' + (cfg.odevzdavani === 'A' ? 'finishVariantA()' : 'confirmSubmit()') + '">' + H(cfg.odevzdavani === 'A' ? L.showResult : L.submit) + ' &#8594;</button>') +
        '</div>'
      : '') +
    '</div>';
}

function buildChoiceHtml(qid, options) {
  return '<div class="mc-opts" id="opts_' + qid + '">' +
    (options||[]).map((opt,oi) =>
      '<button class="mc-opt" data-qid="' + qid + '" data-val="' + oi + '" onclick="selectChoice(\'' + qid + '\',' + oi + ')">' +
      '<span class="opt-ltr">' + String.fromCharCode(65+oi) + '</span>' +
      '<span class="opt-txt">' + H(opt) + '</span>' +
      '</button>').join('') +
    '</div>';
}


function ordBadgeHtmlForBuild(qid, texts, picks) {
  texts = Array.isArray(texts) ? texts : [];
  picks = Array.isArray(picks) ? picks : [];
  var pickOf = {};
  picks.forEach(function(origIdx, pos) { pickOf[Number(origIdx)] = pos + 1; });
  return texts.map(function(txt, origIdx) {
    var pos = pickOf[origIdx] || 0;
    var picked = pos > 0;
    return '<div class="ord-row' + (picked ? ' ord-picked' : '') + '" onclick="clickOrdBuild(\'' + qid + '\',' + origIdx + ')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')clickOrdBuild(\'' + qid + '\',' + origIdx + ')">' +
      '<div class="ord-badge">' + (picked ? String(pos) : '') + '</div>' +
      '<span class="ord-txt">' + H(txt != null ? txt : '') + '</span>' +
    '</div>';
  }).join('');
}


function csFeedbackBlockForBuild(item, mode){
  const fb=(item&&item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:{};
  const phenomenon=fb.phenomenon||item.phenomenon||'';
  const rule=fb.rule||item.rule||'';
  const why=fb.whyCorrect||fb.why||item.feedback||item.explanation||item.model_answer||'';
  const repeat=fb.reviewTip||item.reviewTip||'';
  if(!phenomenon&&!rule&&!why&&!repeat)return '';
  const rows=[];
  if(phenomenon)rows.push('<div><b>Jev:</b> '+H(phenomenon)+'</div>');
  if(rule)rows.push('<div><b>Pravidlo:</b> '+H(rule)+'</div>');
  if(why)rows.push('<div><b>Proč:</b> '+H(why)+'</div>');
  if(repeat)rows.push('<div><b>Co zopakovat:</b> '+H(repeat)+'</div>');
  return '<div class="practice-note cs-fb"><strong>Vysvětlení / nápověda:</strong>'+rows.join('')+'</div>';
}

function buildQuestionHtml(item, qi, ei, type, pts, cfg, rcSkip) {
  const L = cfg.labels;
  const qid  = ei + '_' + qi;
  const qnum = qi + 1;
  const hdr  = '<div class="q-hdr"><span class="q-num">' + qnum + '</span><span class="q-pts">' + pts + '&nbsp;b</span></div>';
  const joker = '';
  // Vysvětlení/nápovědu PŘÍMO U OTÁZKY (před odevzdáním) ukazujeme jen v procvičovacím
  // režimu — tam nejde o známku a cílem je učení za pochodu. U běžného známkovaného testu
  // by inline vysvětlení prozradilo správnou odpověď ještě před výběrem, proto se učící
  // zpětná vazba (feedbackMode=learning) zobrazuje až ve výsledcích PO odevzdání.
  const inlineHelp = cfg.testMode === 'procviceci'
    && (cfg.resultMode || 'instant') !== 'secureOffline'
    && (cfg.feedbackMode || 'brief') !== 'none';
  const practiceNote = inlineHelp ? (cfg.isCzech ? csFeedbackBlockForBuild(item,'practice') : ((item.explanation || item.model_answer) ? '<div class="practice-note"><strong>Vysvětlení / nápověda:</strong> ' + H(item.explanation || item.model_answer) + '</div>' : '')) : '';

  if (type === 'multiple choice') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||'') + '</div>' + buildChoiceHtml(qid, item.options||[]) + joker + practiceNote + '</div>';
  }
  if (type === 'fill-in-the-blank') {
    const parts = (item.sentence||'').split('___');
    const inner = parts.map((p,pi) => H(p) + (pi < parts.length-1 ? '<input type="text" class="fib-inp" data-qid="' + qid + '" oninput="updateFib(\'' + qid + '\')" placeholder="…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' : '')).join('');
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="fib-sent">' + inner + '</div></div>';
  }
  if (type === 'true/false') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.statement||'') + '</div><div class="tf-opts">' +
      '<button class="tf-btn" data-qid="' + qid + '" data-val="true" onclick="selectTF(\'' + qid + '\',true)">&#10003; ' + H(L.true) + '</button>' +
      '<button class="tf-btn" data-qid="' + qid + '" data-val="false" onclick="selectTF(\'' + qid + '\',false)">&#10007; ' + H(L.false) + '</button>' +
      '</div>' + joker + practiceNote + '</div>';
  }
  if (type === 'error-tagging') {
    const toks = Array.isArray(item.tokens) ? item.tokens : String(item.sentence||'').split(/\s+/).filter(Boolean);
    const opts = Array.isArray(item.error_type_options) ? item.error_type_options : [];
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text err-sent">' + H(item.sentence || toks.join(' ')) + '</div><div class="err-lbl">Vyber chybný token</div><div class="mc-opts et-list">' + toks.map((tok,ti) => '<button type="button" class="mc-opt et-token" data-qid="' + qid + '" data-val="' + ti + '" onclick="setErrorTagToken(\'' + qid + '\',' + ti + ')"><span class="opt-txt">' + H(tok) + '</span></button>').join('') + '</div><div class="err-lbl">Typ chyby</div><select class="match-sel et-type" data-qid="' + qid + '" onchange="setErrorTagType(\'' + qid + '\',this.value)"><option value="">— ' + H(L.choose) + ' —</option>' + opts.map(o => '<option value="' + H(o) + '">' + H(o) + '</option>').join('') + '</select><div class="err-lbl">Oprava</div><input type="text" class="err-inp et-corr" data-qid="' + qid + '" oninput="setErrorTagCorrection(\'' + qid + '\',this.value)" placeholder="oprava" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' + practiceNote + '</div>';
  }
  if (type === 'error correction') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text err-sent">' + H(item.sentence||'') + '</div><div class="err-lbl">' + H(L.correctedSentence) + '</div>' +
      '<input type="text" class="err-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'error correction\')" placeholder="' + H(L.writeSentence) + '" autocomplete="off" autocorrect="off" spellcheck="false"></div>';
  }
  if (type === 'open answer') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||'') + '</div>' +
      '<textarea class="open-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'open answer\')" placeholder="' + H(L.writeAnswer) + '" rows="3" autocorrect="off" spellcheck="false"></textarea></div>';
  }
  if (type === 'word order') {
    const words = Array.isArray(item.words) ? item.words : String(item.prompt||item.correct_sentence||'').split(/\s+/).filter(Boolean);
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.prompt || L.writeSentence) + '</div>' +
      '<div class="word-bank"><strong>' + H(L.wordBank) + '</strong> ' + words.map(w => '<span class="word-chip">' + H(w) + '</span>').join(' ') + '</div>' +
      '<input type="text" class="err-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'word order\')" placeholder="' + H(L.writeSentence) + '" autocomplete="off" autocorrect="off" spellcheck="false"></div>';
  }
  if (type === 'translation') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.prompt || item.source || '') + '</div>' +
      '<input type="text" class="err-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'translation\')" placeholder="' + H(L.writeTranslation) + '" autocomplete="off" autocorrect="off" spellcheck="false"></div>';
  }
  if (type === 'cloze text') {
    const parts = String(item.text || '').split('___');
    const gaps = Math.max(parts.length - 1, Array.isArray(item.answers) ? item.answers.length : 1);
    let inner = '';
    for (let i=0;i<Math.max(parts.length, gaps+1);i++) {
      inner += H(parts[i] || '');
      if (i < gaps) inner += '<input type="text" class="fib-inp" data-qid="' + qid + '" oninput="updateCloze(\'' + qid + '\')" placeholder="' + (i+1) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">';
    }
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="fib-sent cloze-sent">' + inner + '</div></div>';
  }
  if (type === 'sentence transformation') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.prompt || item.sentence || '') + (item.keyword ? ' <strong>(' + H(item.keyword) + ')</strong>' : '') + '</div>' +
      '<input type="text" class="err-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'sentence transformation\')" placeholder="' + H(L.writeSentence) + '" autocomplete="off" autocorrect="off" spellcheck="false"></div>';
  }
  if (type === 'reading comprehension') {
    return '<div class="question" id="q_' + qid + '">' + hdr + ((!rcSkip && item.passage) ? '<div class="source-box"><strong>' + H(L.passage) + ':</strong><br>' + H(item.passage) + '</div>' : '') +
      '<div class="q-text">' + H(item.question||'') + '</div>' + (Array.isArray(item.options) ? buildChoiceHtml(qid, item.options) + joker : '<textarea class="open-inp" oninput="updateText(\'' + qid + '\',this.value,\'reading comprehension\')" rows="3"></textarea>') + '</div>';
  }
  if (type === 'dialogue completion') {
    return '<div class="question" id="q_' + qid + '">' + hdr + (item.dialogue ? '<div class="source-box dialogue-box">' + H(item.dialogue).replace(/\n/g,'<br>') + '</div>' : '') +
      '<div class="q-text">' + H(item.question || item.prompt || '') + '</div>' + (Array.isArray(item.options) ? buildChoiceHtml(qid, item.options) + joker : '<input type="text" class="err-inp" oninput="updateText(\'' + qid + '\',this.value,\'dialogue completion\')" placeholder="' + H(L.writeAnswer) + '">') + '</div>';
  }
  if (type === 'categorization') {
    const cats = Array.isArray(item.categories) ? item.categories : [];
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.text || item.item || item.prompt || '') + '</div>' +
      '<select class="match-sel" data-qid="' + qid + '" onchange="updateCategory(\'' + qid + '\',this.value)"><option value="">— ' + H(L.choose) + ' —</option>' +
      cats.map(c => '<option value="' + H(c) + '">' + H(c) + '</option>').join('') + '</select>' + practiceNote + '</div>';
  }
  if (type === 'word formation') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.sentence || item.prompt || '') + (item.base_word ? ' <strong>(' + H(item.base_word) + ')</strong>' : '') + '</div>' +
      '<input type="text" class="err-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'word formation\')" placeholder="' + H(L.writeAnswer) + '" autocomplete="off" autocorrect="off" spellcheck="false"></div>';
  }
  if (type === 'listening comprehension') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="source-box"><strong>' + H(L.transcript || 'Listening') + ':</strong><br>' + H(L.teacherAudio || 'The teacher will play the listening.') + '</div>' +
      '<div class="q-text">' + H(item.question||'') + '</div>' + (Array.isArray(item.options) ? buildChoiceHtml(qid, item.options) + joker : '<textarea class="open-inp" oninput="updateText(\'' + qid + '\',this.value,\'listening comprehension\')" rows="3"></textarea>') + '</div>';
  }
  if (type === 'image description') {
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="source-box"><strong>' + H(L.imagePrompt) + ':</strong><br>' + H(item.image_description || item.prompt || '') + '</div>' +
      '<textarea class="open-inp" data-qid="' + qid + '" oninput="updateText(\'' + qid + '\',this.value,\'image description\')" placeholder="' + H(L.writeAnswer) + '" rows="4" autocorrect="off" spellcheck="false"></textarea></div>';
  }
  if (type === 'highlight-evidence') {
    const hs = Array.isArray(item.sentences) ? item.sentences : [];
    const rows = hs.map((sent,si) => '<button type="button" class="mc-opt he-sent" data-qid="' + qid + '" data-val="' + si + '" onclick="selectEvidence(\'' + qid + '\',' + si + ')"><span class="opt-ltr">' + String.fromCharCode(65+si) + '</span><span class="opt-txt">' + H(sent) + '</span></button>').join('');
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||item.prompt||'') + '</div><div class="he-list">' + rows + '</div>' + practiceNote + '</div>';
  }
  if (type === 'table-completion') {
    const cols = Array.isArray(item.columns) ? item.columns : [];
    const rows = Array.isArray(item.rows) ? item.rows : [];
    const head = '<thead><tr>' + cols.map(c => '<th>' + H(c) + '</th>').join('') + '</tr></thead>';
    const body = '<tbody>' + rows.map((row,ri) => {
      row = Array.isArray(row) ? row : [];
      return '<tr>' + row.map((cell,ci) => {
        if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
          return '<td><input type="text" class="tc-inp" data-qid="' + qid + '" oninput="setTable(\'' + qid + '\',' + ri + ',' + ci + ',this.value)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></td>';
        }
        return '<td><span class="tc-fixed">' + H(cell) + '</span></td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||item.prompt||'') + '</div><div class="tc-wrap"><table class="tc-table">' + head + body + '</table></div>' + practiceNote + '</div>';
  }
  if (type === 'transformation-chain') {
    const trs = Array.isArray(item.transformations) ? item.transformations : [];
    const rows = trs.map((tr,ti) => '<div class="trch-row"><div class="trch-instr">' + (ti+1) + '. ' + H(tr && tr.instruction != null ? tr.instruction : '') + '</div><input type="text" class="trch-inp" data-qid="' + qid + '" oninput="setChain(\'' + qid + '\',' + ti + ',this.value)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>').join('');
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="trch-base">' + H(item.base_sentence||'') + '</div><div class="trch-list">' + rows + '</div>' + practiceNote + '</div>';
  }
  if (type === 'categorisation-board') {
    const cbCats = Array.isArray(item.categories) ? item.categories : [];
    const cbEntries = Array.isArray(item.entries) ? item.entries : [];
    const rows = cbEntries.map((en,bi) => '<div class="cb-row"><span class="cb-txt">' + H(en&&en.text!=null?en.text:'') + '</span><select class="cb-sel match-sel" data-qid="' + qid + '" onchange="setBoard(\'' + qid + '\',' + bi + ',this.value)"><option value="">— ' + H(L.choose||'vyber') + ' —</option>' + cbCats.map(c => '<option value="' + H(c) + '">' + H(c) + '</option>').join('') + '</select></div>').join('');
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||'') + '</div><div class="cb-list">' + rows + '</div>' + practiceNote + '</div>';
  }
  if (type === 'ordering') {
    const oTexts = Array.isArray(item.items) ? item.items : [];
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||'') + '</div><div class="ms-hint">' + H(L.reorderHint || 'Klikej na položky v pořadí, v jakém mají jít (1., 2., 3…). Klikni znovu pro zrušení.') + '</div><div class="ord-list" id="ordlist_' + qid + '">' + ordBadgeHtmlForBuild(qid, oTexts, []) + '</div>' + practiceNote + '</div>';
  }
  if (type === 'multi-select') {
    const mso = Array.isArray(item.options) ? item.options : [];
    const box = '<div class="mc-opts" id="opts_' + qid + '">' + mso.map((opt,oi) =>
      '<button class="mc-opt" role="checkbox" aria-checked="false" data-qid="' + qid + '" data-val="' + oi + '" onclick="toggleMulti(\'' + qid + '\',' + oi + ')">' +
      '<span class="ms-box" aria-hidden="true"></span>' +
      '<span class="opt-ltr">' + String.fromCharCode(65+oi) + '</span>' +
      '<span class="opt-txt">' + H(opt) + '</span></button>').join('') + '</div>';
    return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question||'') + '</div><div class="ms-hint">' + H(L.chooseAll || 'Vyber všechny správné možnosti (může jich být víc).') + '</div>' + box + practiceNote + '</div>';
  }
  return '<div class="question" id="q_' + qid + '">' + hdr + '<div class="q-text">' + H(item.question || item.prompt || JSON.stringify(item)) + '</div><textarea class="open-inp" oninput="updateText(\'' + qid + '\',this.value,\'open answer\')" rows="3"></textarea></div>';
}

function buildMatchingHtml(ei, items, pts, L) {
  const rightItems = shuffled(items.map((item,i) => ({ text: item.right||'', origIdx: i })));
  return '<div class="question matching-q" id="q_' + ei + '_match">' +
    '<div class="q-text" style="margin-bottom:14px">' + H(L.choose) + '.</div>' +
    '<div class="match-grid">' +
    items.map((item,li) =>
      '<div class="match-row">' +
      '<div class="match-left">' + H(item.left||'') + '</div>' +
      '<select class="match-sel" data-ei="' + ei + '" data-li="' + li + '" onchange="updateMatch(' + ei + ',' + li + ',this.value)">' +
      '<option value="">— ' + H(L.choose) + ' —</option>' +
      rightItems.map(r => '<option value="' + r.origIdx + '">' + H(r.text) + '</option>').join('') +
      '</select></div>').join('') +
    '</div></div>';
}

function buildResultHtml(cfg) {
  const L = cfg.labels;
  return '<div id="resultScreen" class="screen hidden">' +
    '<div class="result-card" id="resultCard">' +
    '<div class="result-grade-row"><span class="result-grade-big" id="resultGrade">—</span></div>' +
    '<div class="result-name" id="resultName"></div>' +
    '<div class="result-meta"><span id="resultTestId">' + H(cfg.testId) + '</span> · <span id="resultTs"></span> · <span>' + H(L.attempt) + ': </span><span id="resultAttempt">—</span></div>' +
    '<div id="jokerResultBox" class="joker-result-box hidden">&#127183; ' + H(L.jokerReport) + '</div>' +
    '<div class="result-score-row"><span class="result-pct" id="resultPct">0%</span><span class="result-pts" id="resultPts">0/' + cfg.totalBody + '&nbsp;b</span></div>' +
    '<div class="report-seal-box"><div class="report-seal-label">' + H(L.reportSeal) + '</div><div class="report-seal-code" id="reportSeal">Připravuji…</div><div class="report-seal-hint">' + H(L.reportSealHint) + '</div></div>' +
    '</div>' +
    '<div class="result-details" id="resultDetails">' +
    '<div class="result-breakdown" id="resultBreakdown"></div>' +
    (cfg.overeni ?
      '<div class="verify-section" id="verifySection"><button class="btn-dl-txt" onclick="downloadVerifyTxt()">&#11015; ' + H(L.verifyDownload) + '</button>' +
      '<div class="verify-hint">' + H(L.verifyHint) + '</div><details class="verify-backup"><summary>Záloha</summary>' +
      '<textarea class="verify-ta" id="verifyTa" readonly rows="5"></textarea><button class="btn-copy-verify" onclick="copyVerify()">' + H(L.copy) + '</button></details></div>' : '') +
    '<div class="result-actions"><button class="btn-toggle-ans" onclick="toggleAnswersPanel()">' + H(L.resultAnswers) + '</button>' +
    '<button class="btn-teacher-lnk" onclick="openTeacherModal()">&#128274; ' + H(L.teacher) + '</button></div>' +
    '<div id="answersPanel" class="ans-panel hidden"></div>' +
    '</div></div>';
}

function buildTeacherHtml(cfg, exercises) {
  const L = cfg.labels;
  return '<div id="teacherModal" class="modal-ov hidden" onclick="if(event.target===this)closeTeacherModal()">' +
    '<div class="modal-box teacher-box"><div id="t-login">' +
    '<div class="modal-title">&#128274; ' + H(L.teacher) + '</div>' +
    '<input type="text" id="t-name" class="modal-inp" placeholder="' + H(L.teacher) + '" autocomplete="off">' +
    '<input type="password" id="t-pin" class="modal-inp" placeholder="PIN" onkeydown="if(event.key===\'Enter\')doTeacherLogin()">' +
    '<div id="t-err" class="t-err hidden"></div>' +
    '<button class="btn-modal-ok" onclick="doTeacherLogin()">' + H(L.login) + '</button>' +
    '<button class="btn-modal-cancel" onclick="closeTeacherModal()">' + H(L.close) + '</button>' +
    '</div><div id="t-panel" class="hidden">' +
    '<div class="modal-title">' + H(L.overview) + '</div><div id="t-body"></div><div class="modal-btn-row">' +
    '<button class="btn-modal-cancel" onclick="logoutTeacher()">' + H(L.logout) + '</button>' +
    '<button class="btn-modal-cancel" onclick="closeTeacherModal()">' + H(L.close) + '</button>' +
    '</div></div></div></div>';
}

function buildModalsHtml(cfg) {
  const L = cfg.labels;
  return '<div id="submitModal" class="modal-ov hidden"><div class="modal-box">' +
    '<div class="modal-title">' + H(L.submitTitle) + '</div><div id="submitBody" class="modal-body"></div>' +
    '<div class="modal-btn-row"><button class="btn-modal-ok" onclick="doSubmit()">' + H(L.yesSubmit) + '</button>' +
    '<button class="btn-modal-cancel" onclick="closeModal(\'submitModal\')">' + H(L.back) + '</button></div></div></div>' +
    '<div id="messageModal" class="modal-ov hidden"><div class="modal-box">' +
    '<div class="modal-title" id="messageTitle"></div><div id="messageBody" class="modal-body"></div>' +
    '<div class="modal-btn-row"><button class="btn-modal-ok" onclick="closeModal(\'messageModal\')">' + H(L.ok) + '</button></div></div></div>' +
    ((cfg.hasUnlock || cfg.testMode === 'prisny') ?
      '<div id="lockScreen" class="lock-ov hidden"><div class="lock-card">' +
      '<div class="lock-icon" id="lockIcon" onclick="lockTap()" style="cursor:pointer;user-select:none;-webkit-user-select:none">&#128274;</div><div class="lock-title">' + H(L.locked) + '</div>' +
      '<div class="lock-reason" id="lockContactMsg">' + H(L.lockContact || 'Kontaktuj učitele.') + '</div>' +
      '<div id="unlockReveal" class="hidden"><div id="lockReason" class="lock-reason"></div>' +
      '<input type="password" id="unlockInp" class="lock-inp" placeholder="' + H(L.unlockPh) + '" onkeydown="if(event.key===\'Enter\')tryUnlock()">' +
      '<button class="btn-modal-ok" onclick="tryUnlock()">' + H(L.unlock) + '</button></div></div></div>' : '');
}

// ─── Embedded test JS (returned as string, runs inside generated test) ─────────

function getTestScript() {
  return String.raw`
var ANSWERS={},EX_SUBMITTED={},started=false,submitted=false,locked=false,teacherLogged=false;
var timerVal=CFG.cas*60,timerInterval=null,warningCount=0;
var A11Y=null;
function applyA11yInstant(key){
  A11Y=null;var b=document.body;if(b)b.classList.remove('a11y-large','a11y-xlarge','a11y-dys');
  var groups=CFG.diffGroups||[];var gg=null;for(var i=0;i<groups.length;i++){if(groups[i].key===key){gg=groups[i];break;}}
  if(!gg||!gg.a11y)return;
  var a=gg.a11y;var mult=({'125':1.25,'150':1.5,'200':2})[a.time]||1;
  A11Y={timeMult:mult,noLimit:a.time==='none',font:a.font||'normal',dys:!!a.dys};
  if(b){if(a.font==='large')b.classList.add('a11y-large');if(a.font==='xlarge')b.classList.add('a11y-xlarge');if(a.dys)b.classList.add('a11y-dys');}
  var bar=I('a11yNote');
  if(bar){var parts=[];if(mult>1)parts.push('prodloužený čas ('+(mult===2?'2\u00d7':'+'+Math.round((mult-1)*100)+' %')+')');if(A11Y.noLimit)parts.push('bez časového limitu');if(a.font==='large')parts.push('větší písmo');if(a.font==='xlarge')parts.push('největší písmo');if(a.dys)parts.push('dyslexie-friendly');if(parts.length){bar.textContent='♿ Aktivní úpravy: '+parts.join(', ');bar.classList.remove('hidden');}}
}
var jokerUsed=false,jokerMode=false,jokerStartChoice=null,jokerSelectedAt='';
var generatedTxt='';

function I(id){return document.getElementById(id);}
function T(k){return LABELS[k]||k;}
function show(id){var e=I(id);if(e)e.classList.remove('hidden');}
function hide(id){var e=I(id);if(e)e.classList.add('hidden');}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function showMessage(title,body){I('messageTitle').textContent=title||'';I('messageBody').textContent=body||'';show('messageModal');}
function closeModal(mid){hide(mid);}

function normNameForGroup(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function resolveStudentGroup(name){var n=normNameForGroup(name);var groups=CFG.diffGroups||[];for(var i=0;i<groups.length;i++){var st=groups[i].students||[];for(var j=0;j<st.length;j++){if(normNameForGroup(st[j])===n)return groups[i];}}return groups.length?null:null;}
function enterFullscreen(){var el=document.documentElement;try{if(el.requestFullscreen)el.requestFullscreen();else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();}catch(_){} }
function variantKeyForGroup(g){return g&&g.key&&VARIANTS[g.key]?g.key:'__default';}
function variantByGroupNameOrKey(name,key){if(key&&VARIANTS[key])return VARIANTS[key];var n=normNameForGroup(name);var groups=CFG.diffGroups||[];for(var i=0;i<groups.length;i++){if(normNameForGroup(groups[i].name)===n&&VARIANTS[groups[i].key])return VARIANTS[groups[i].key];}return VARIANTS.__default||[];}
function activateVariant(key){
  key=VARIANTS[key]?key:'__default';
  CFG.activeVariantKey=key;
  EXS=VARIANTS[key]||VARIANTS.__default||[];
  ANSWERS={};EX_SUBMITTED={};jokerMode=false;
  var html=VARIANT_HTMLS[key]||VARIANT_HTMLS.__default||{};
  var area=I('exArea');if(area)area.innerHTML=html.body||'';
  var nav=I('tabsNav');if(nav)nav.innerHTML=html.tabs||'';
  var sum=variantSummaryClient(EXS);CFG.totalBody=sum.totalBody;CFG.totalQ=sum.totalQ;CFG.exCount=sum.exCount;
  var progress=I('progressDisplay');if(progress)progress.textContent='0/'+sum.totalQ;
  var pts=I('resultPts');if(pts)pts.innerHTML='0/'+fmtPtsClient(sum.totalBody)+'&nbsp;b';
}
function variantSummaryClient(exs){var tb=0,tq=0;(exs||[]).forEach(function(ex){tb+=Number(ex.points_total)||0;tq+=(ex.items||[]).length;});return{totalBody:Math.round(tb*100)/100,totalQ:tq,exCount:(exs||[]).length};}
function seedHash(str){var h=2166136261;str=String(str||'');for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seed){var x=seed>>>0;return function(){x+=0x6D2B79F5;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffleNodes(parent, selector, seed){if(!parent)return;var nodes=[].slice.call(parent.querySelectorAll(':scope > '+selector));if(nodes.length<2)return;var rnd=seededRandom(seed);for(var i=nodes.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=nodes[i];nodes[i]=nodes[j];nodes[j]=tmp;}nodes.forEach(function(n){parent.appendChild(n);});}
function shuffleOptionChildren(container, seed){if(!container)return;var nodes=[].slice.call(container.children);if(nodes.length<2)return;var rnd=seededRandom(seed);for(var i=nodes.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=nodes[i];nodes[i]=nodes[j];nodes[j]=tmp;}nodes.forEach(function(n,idx){var l=n.querySelector('.opt-ltr');if(l)l.textContent=String.fromCharCode(65+idx);container.appendChild(n);});}
function shuffleSelectOptions(sel, seed){if(!sel)return;var first=sel.querySelector('option[value=""]');var opts=[].slice.call(sel.querySelectorAll('option')).filter(function(o){return o!==first;});if(opts.length<2)return;var rnd=seededRandom(seed);for(var i=opts.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var tmp=opts[i];opts[i]=opts[j];opts[j]=tmp;}if(first)sel.appendChild(first);opts.forEach(function(o){sel.appendChild(o);});}
function applyRuntimeRandomization(){
  if(!CFG.randomizace)return;
  var base=seedHash([CFG.testId,CFG.studentName,CFG.activeGroupKey,attemptId].join('|'));
  document.querySelectorAll('.q-list').forEach(function(list,ei){
    shuffleNodes(list,'.question',base+ei*101);
    var match=list.querySelector('.match-grid');if(match)shuffleNodes(match,'.match-row',base+ei*211);
  });
  document.querySelectorAll('.mc-opts').forEach(function(box,i){shuffleOptionChildren(box,base+i*307);});
  document.querySelectorAll('select.match-sel').forEach(function(sel,i){shuffleSelectOptions(sel,base+i*401);});
}
function fmtPtsClient(n){n=Number(n)||0;return Number.isInteger(n)?String(n):String(Math.round(n*100)/100).replace('.',',');}
function chooseJokerStart(use){jokerStartChoice=!!use;var no=I('jokerChoiceNo'),yes=I('jokerChoiceYes');if(no)no.classList.toggle('selected',!use);if(yes)yes.classList.toggle('selected',!!use);var box=I('jokerChoiceConfirm');if(box){box.style.display='block';box.textContent=use?'✅ Zvoleno: BERU SI ŽOLÍKA — test psát nebudeš.':'✅ Zvoleno: DĚLÁM TEST.';box.className='joker-choice-confirm '+(use?'joker-choice-confirm-risk':'joker-choice-confirm-ok');}}
function jokerWatermarkText(){return T('jokerReport')+' · '+(CFG.studentName||'—')+' · '+CFG.testId+' · '+attemptId;}
function updateJokerWatermark(){var wm=I('jokerWatermark');if(wm){wm.textContent=jokerWatermarkText();wm.classList.toggle('hidden',!jokerUsed);}var rb=I('jokerResultBox');if(rb){rb.textContent='🃏 '+jokerWatermarkText();rb.classList.toggle('hidden',!jokerUsed);}document.body.classList.toggle('joker-mode',!!jokerUsed);}
function startTest(){
  var n=(I('studentName').value||'').trim();
  if(!n){showMessage(T('name'),T('enterName'));I('studentName').focus();return;}
  if(CFG.zolicek && jokerStartChoice===null){showMessage(T('jokerChoiceTitle'),T('jokerChoiceHint'));return;}
  jokerUsed=!!jokerStartChoice;
  jokerSelectedAt=jokerUsed?new Date().toISOString():'';
  var g=resolveStudentGroup(n);
  if((CFG.diffGroups||[]).length&&!g){showMessage('Diferencovaný test','Zadané jméno/kód není v žádné skupině. Zkontroluj přesný zápis podle pokynů učitele.');I('studentName').focus();return;}
  CFG.studentName=n;CFG.activeGroupKey=g?g.key:'';CFG.activeGroupName=g?g.name:'';
  activateVariant(variantKeyForGroup(g));
  applyA11yInstant(CFG.activeGroupKey);
  timerVal=A11Y&&A11Y.noLimit?Infinity:(A11Y&&A11Y.timeMult>1?Math.round((Number(CFG.cas)||45)*60*A11Y.timeMult):timerVal);
  applyRuntimeRandomization();
  hide('introScreen');show('testScreen');updateJokerWatermark();
  if(CFG.activeGroupKey){var note=(CFG.groupNotes||{})[CFG.activeGroupKey]||g.conditions||'';var hdr=document.querySelector('.t-header-title');if(hdr&&!document.querySelector('.group-pill')){hdr.insertAdjacentHTML('afterend','<span class="group-pill">'+esc(CFG.activeGroupName)+'</span>');}if(note){var area=I('exArea');if(area)area.insertAdjacentHTML('afterbegin','<div class="group-warning">'+esc(note)+'</div>');}}
  started=true;
  startTimer();
  if(CFG.lockOnLeave||CFG.testMode==='prisny'||CFG.testMode==='bezny') setupLockDetection();
  var first=document.querySelector('.mc-opt,.he-sent,.et-token,.et-type,.et-corr,.fib-inp,.tf-btn,.match-sel,.err-inp,.open-inp,.tc-inp,.trch-inp');
  if(first)setTimeout(function(){first.focus();},120);
}

function startTimer(){
  renderTimer();
  timerInterval=setInterval(function(){
    if(timerVal===Infinity){renderTimer();return;}
    if(timerVal>0)timerVal--;
    renderTimer();
    if(timerVal<=0){clearInterval(timerInterval);doSubmit();}
  },1000);
}
function renderTimer(){
  var el=I('timerDisplay');if(!el)return;
  if(timerVal===Infinity){el.textContent='∞';el.className='timer-badge';return;}
  var m=Math.floor(timerVal/60).toString().padStart(2,'0');
  var s=(timerVal%60).toString().padStart(2,'0');
  el.textContent=m+':'+s;
  el.className='timer-badge'+(timerVal<60?' t-danger':timerVal<300?' t-warn':'');
}

function switchTab(ei){
  if(CFG.layout==='scroll')return;
  document.querySelectorAll('.ex-panel').forEach(function(p,i){p.classList.toggle('hidden',i!==ei);});
  document.querySelectorAll('.tab-btn').forEach(function(b,i){b.classList.toggle('tab-active',i===ei);});
  window.scrollTo({top:0,behavior:'smooth'});
}
function qEi(qid){return parseInt(String(qid).split('_')[0],10);}
function isLockedQid(qid){var ei=qEi(qid);return submitted || (CFG.odevzdavani==='A' && EX_SUBMITTED[ei]);}
function markSelected(qid,val,cls){document.querySelectorAll('.'+cls+'[data-qid="'+qid+'"]').forEach(function(b){b.classList.toggle(cls==='mc-opt'?'mc-sel':'tf-sel',String(b.dataset.val)===String(val));});}

function selectChoice(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'choice',val:val};markSelected(qid,val,'mc-opt');updateProgress();markTabDone(qid);}
function selectEvidence(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'evidence',val:val};markSelected(qid,val,'mc-opt');updateProgress();markTabDone(qid);}
function getErrorTagAns(qid){var a=ANSWERS[qid];return (a&&a.type==='error-tagging')?{token:a.token,etype:a.etype||'',corr:a.corr||''}:{token:null,etype:'',corr:''};}
function setErrorTagToken(qid,idx){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.token=idx;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};document.querySelectorAll('.et-token[data-qid="'+qid+'"]').forEach(function(b){b.classList.toggle('mc-sel',String(b.getAttribute('data-val'))===String(idx));});updateProgress();markTabDone(qid);}
function setErrorTagType(qid,val){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.etype=val;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};updateProgress();markTabDone(qid);}
function setErrorTagCorrection(qid,val){if(isLockedQid(qid))return;var a=getErrorTagAns(qid);a.corr=val;ANSWERS[qid]={type:'error-tagging',token:a.token,etype:a.etype,corr:a.corr};updateProgress();markTabDone(qid);}
function updateFib(qid){if(isLockedQid(qid))return;var inputs=[].slice.call(document.querySelectorAll('.fib-inp[data-qid="'+qid+'"]'));ANSWERS[qid]={type:'fib',vals:inputs.map(function(i){return i.value.trim();})};updateProgress();markTabDone(qid);}
function updateCloze(qid){if(isLockedQid(qid))return;var inputs=[].slice.call(document.querySelectorAll('.fib-inp[data-qid="'+qid+'"]'));ANSWERS[qid]={type:'cloze',vals:inputs.map(function(i){return i.value.trim();})};updateProgress();markTabDone(qid);}
function selectTF(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'tf',val:val};markSelected(qid,String(val),'tf-btn');updateProgress();markTabDone(qid);}
function updateMatch(ei,li,val){if(submitted || (CFG.odevzdavani==='A'&&EX_SUBMITTED[ei]))return;var key='match_'+ei;if(!ANSWERS[key])ANSWERS[key]={type:'match',pairs:{}};if(val!=='')ANSWERS[key].pairs[li]=parseInt(val,10);else delete ANSWERS[key].pairs[li];updateProgress();markTabDone(ei+'_match');}
function updateText(qid,val,kind){if(isLockedQid(qid))return;ANSWERS[qid]={type:kind||'text',val:val};updateProgress();markTabDone(qid);}
function toggleMulti(qid,idx){if(isLockedQid(qid))return;var cur=(ANSWERS[qid]&&ANSWERS[qid].type==='multi'&&Array.isArray(ANSWERS[qid].vals))?ANSWERS[qid].vals.slice():[];var p=cur.indexOf(idx);if(p>=0)cur.splice(p,1);else cur.push(idx);cur.sort(function(a,b){return a-b;});ANSWERS[qid]={type:'multi',vals:cur};document.querySelectorAll('.mc-opt[data-qid="'+qid+'"]').forEach(function(b){var v=parseInt(b.dataset.val,10);b.classList.toggle('mc-sel',cur.indexOf(v)>=0);});updateProgress();markTabDone(qid);}
function ordTexts(qid){var p=qid.split('_');var it=((EXS[+p[0]]||{}).items||[])[+p[1]]||{};return Array.isArray(it.items)?it.items:[];}
function ordCurOrder(qid){var texts=ordTexts(qid);var a=ANSWERS[qid];return (a&&a.type==='order'&&Array.isArray(a.seq)&&a.seq.length===texts.length)?a.seq.slice():texts.map(function(_,i){return i;});}
function ordBadgeHtmlInst(qid,texts,picks){
  var pickOf={};
  picks.forEach(function(origIdx,pos){ pickOf[Number(origIdx)]=pos+1; });
  return texts.map(function(txt,origIdx){
    var pos=pickOf[origIdx]||0;
    var picked=pos>0;
    return '<div class="ord-row'+(picked?' ord-picked':'')+'" onclick="clickOrdInst(\''+qid+'\','+origIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')clickOrdInst(\''+qid+'\','+origIdx+')">'+
      '<div class="ord-badge">'+(picked?String(pos):'')+'</div>'+
      '<span class="ord-txt">'+H(txt!=null?txt:'')+'</span>'+
    '</div>';
  }).join('');
}
function renderOrdList(qid){var el=document.getElementById('ordlist_'+qid);if(el){var texts=ordTexts(qid);var picks=Array.isArray(ANSWERS[qid]&&ANSWERS[qid].seq)?ANSWERS[qid].seq:[];el.innerHTML=ordBadgeHtmlInst(qid,texts,picks);}}
function clickOrdInst(qid,origIdx){if(isLockedQid(qid))return;var texts=ordTexts(qid);var n=texts.length;var cur=ANSWERS[qid]&&Array.isArray(ANSWERS[qid].seq)?ANSWERS[qid].seq.slice():[];var at=cur.indexOf(origIdx);if(at>=0){cur.splice(at,1);}else if(cur.length<n){cur.push(origIdx);}ANSWERS[qid]={type:'order',seq:cur};renderOrdList(qid);updateProgress();markTabDone(qid);}
function clickOrdBuild(qid,origIdx){clickOrdInst(qid,origIdx);}
function setBoard(qid,idx,val){if(isLockedQid(qid))return;var a=(ANSWERS[qid]&&ANSWERS[qid].type==='board'&&Array.isArray(ANSWERS[qid].sel))?ANSWERS[qid].sel.slice():[];a[idx]=val;ANSWERS[qid]={type:'board',sel:a};updateProgress();markTabDone(qid);}
function setTable(qid,r,c,val){if(isLockedQid(qid))return;var g=(ANSWERS[qid]&&ANSWERS[qid].type==='table'&&Array.isArray(ANSWERS[qid].grid))?ANSWERS[qid].grid.map(function(row){return Array.isArray(row)?row.slice():[];}):[];if(!Array.isArray(g[r]))g[r]=[];g[r][c]=val;ANSWERS[qid]={type:'table',grid:g};updateProgress();markTabDone(qid);}
function setChain(qid,idx,val){if(isLockedQid(qid))return;var vals=(ANSWERS[qid]&&ANSWERS[qid].type==='chain'&&Array.isArray(ANSWERS[qid].vals))?ANSWERS[qid].vals.slice():[];vals[idx]=val;ANSWERS[qid]={type:'chain',vals:vals};updateProgress();markTabDone(qid);}
function updateCategory(qid,val){if(isLockedQid(qid))return;ANSWERS[qid]={type:'categorization',val:val};updateProgress();markTabDone(qid);}

function countAnswered(){
  var n=0;
  EXS.forEach(function(ex,ei){
    if(ex.type==='matching'){var p=(ANSWERS['match_'+ei]||{}).pairs||{};n+=Object.keys(p).length;}
    else(ex.items||[]).forEach(function(_,qi){var ans=ANSWERS[ei+'_'+qi];if(ans){if(ans.val!==''&&ans.val!=null)n++;else if(ans.vals&&ans.vals.some(function(v){return v!=='';}))n++;else if(ans.grid&&ans.grid.some(function(row){return Array.isArray(row)&&row.some(function(v){return v!==''&&v!=null;});}))n++;else if(ans.type==='error-tagging'&&ans.token!=null&&String(ans.etype||'').trim()&&String(ans.corr||'').trim())n++;}});
  });
  return n;
}
function countTotal(){return EXS.reduce(function(s,ex){return s+(ex.items||[]).length;},0);}
function updateProgress(){var el=I('progressDisplay');if(el)el.textContent=countAnswered()+'/'+countTotal();}
function markTabDone(qid){
  var ei=parseInt(String(qid).split('_')[0],10);
  if(isNaN(ei))return;
  var ex=EXS[ei];if(!ex)return;
  var done=true;
  if(ex.type==='matching'){var p=(ANSWERS['match_'+ei]||{}).pairs||{};done=Object.keys(p).length>=(ex.items||[]).length;}
  else(ex.items||[]).forEach(function(_,qi){if(!ANSWERS[ei+'_'+qi])done=false;});
  if(CFG.odevzdavani==='A')done=!!EX_SUBMITTED[ei];
  var b=I('tabDone'+ei);if(b)b.classList.toggle('hidden',!done);
}


function submitExercise(ei){
  if(submitted||EX_SUBMITTED[ei])return;
  EX_SUBMITTED[ei]=true;
  var panel=I('exPanel'+ei);if(panel)panel.classList.add('ex-submitted');
  var btn=I('btnSubmitEx'+ei);if(btn){btn.disabled=true;btn.textContent=T('submittedExercise');}
  var sc=calcExerciseScore(ei);
  var fb=I('exFeedback'+ei);
  if(fb){fb.innerHTML='<strong>'+T('exerciseScore')+':</strong> '+sc.earned+'/'+sc.total+' b ('+sc.pct+' %)'+exerciseFeedbackHtml(ei);fb.classList.remove('hidden');}
  markTabDone(ei+'_submitted');
  updateProgress();
  if(allExercisesSubmitted()){var f=I('btnFinalSubmit');if(f)f.classList.add('ready');}
}
function allExercisesSubmitted(){for(var i=0;i<EXS.length;i++)if(!EX_SUBMITTED[i])return false;return true;}
function finishVariantA(){if(!allExercisesSubmitted()){showMessage(T('submitTest'),T('notAllSubmitted'));return;}doSubmit();}
function confirmSubmit(){
  if(submitted)return;
  if(CFG.odevzdavani==='A'){finishVariantA();return;}
  var ans=countAnswered(),tot=countTotal(),un=tot-ans;
  var msg=T('answered')+': '+ans+' / '+tot+'.';
  if(un>0)msg+=' <strong>'+un+' '+T('unansweredZero')+'</strong>';
  I('submitBody').innerHTML=msg;show('submitModal');
}
function doSubmit(){
  if(submitted)return;
  submitted=true;hide('submitModal');clearInterval(timerInterval);teardownLockDetection();
  var res=calcScore();showResult(res);
}

function __isSpanish(){return !!(typeof CFG!=='undefined'&&CFG&&CFG.isSpanish);}
function __isCzech(){return !!(typeof CFG!=='undefined'&&CFG&&CFG.isCzech);}
function __csScoringPolicy(){return (typeof CFG!=='undefined'&&CFG&&CFG.csScoringPolicy)||{};}
function __fuzzyMode(){return (typeof CFG!=='undefined'&&CFG&&CFG.fuzzyTolerance)||'off';}
`+SHARED_SCORING_JS+String.raw`
var pointFor=itemPoint; // alias: instant kód historicky volá pointFor; itemPoint je z SHARED_SCORING_JS
function scoreItem(ex,item,ans,pts){
  if(!ans)return 0;
  if(ex.type==='multiple choice'||ex.type==='reading comprehension'||ex.type==='listening comprehension')return ans.val===correctIndex(item)?pts:0;
  if(ex.type==='dialogue completion'){
    if(Array.isArray(item.options))return ans.val===correctIndex(item)?pts:0;
    return pts*textScore(ans.val,item.answer||item.model_answer,item.alt_answers,ex.type);
  }
  if(ex.type==='true/false')return ans.val===!!item.correct?pts:0;
  if(ex.type==='fill-in-the-blank'){var fk=Array.isArray(item.answers)?item.answers:[item.answer];var fv=Array.isArray(ans.vals)?ans.vals:(ans.val!=null?[ans.val]:[]);return scoreBlanks(fk,fv,item.alt_answers,pts,ex.type,true);}
  if(ex.type==='error correction')return pts*textScore(ans.val,item.correction,item.alt_answers,ex.type);
  if(ex.type==='word order')return pts*textScore(ans.val,item.correct_sentence||item.answer,item.alt_answers,ex.type);
  if(ex.type==='translation')return pts*textScore(ans.val,item.answer||item.translation,item.alt_answers,ex.type);
  if(ex.type==='sentence transformation')return pts*textScore(ans.val,item.answer,item.alt_answers,ex.type);
  if(ex.type==='word formation')return pts*textScore(ans.val,item.answer,item.alt_answers,ex.type);
  if(ex.type==='categorization')return norm(ans.val)===norm(item.correct_category||item.category||item.answer)?pts:0;
  if(ex.type==='cloze text'){var ck=Array.isArray(item.answers)?item.answers:[item.answer];var cv=Array.isArray(ans.vals)?ans.vals:(ans.val!=null?[ans.val]:[]);return scoreBlanks(ck,cv,item.alt_answers,pts,ex.type,false);}
  if(ex.type==='multi-select')return multiSelectScore(ans&&ans.vals,item.correct,pts);
  if(ex.type==='ordering')return orderingScore(ans&&ans.seq,item.correct_order,pts);
  if(ex.type==='highlight-evidence')return highlightEvidenceScore(ans&&ans.val,item.correct,pts);
  if(ex.type==='error-tagging')return errorTaggingScore(ans,item,pts,ex.type);
  if(ex.type==='table-completion')return tableCompletionScore(ans&&ans.grid,item.rows,pts,ex.type);
  if(ex.type==='transformation-chain')return transformationChainScore(ans&&ans.vals,item.transformations,pts,ex.type);
  if(ex.type==='categorisation-board')return categoryBoardScore(ans&&ans.sel,item.entries,pts);
  return 0;
}

function csItemFeedbackData(item){
  if(!CFG.isCzech||!item)return null;
  var fb=(item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:{};
  var phenomenon=fb.phenomenon||item.phenomenon||'';
  var rule=fb.rule||item.rule||'';
  var whyCorrect=fb.whyCorrect||fb.why||item.feedback||item.explanation||item.model_answer||'';
  var whyIncorrect=fb.whyIncorrect||fb.whyWrong||'';
  var reviewTip=fb.reviewTip||item.reviewTip||'';
  var focus=fb.errorFocus||item.errorFocus||'';
  if(!phenomenon&&!rule&&!whyCorrect&&!whyIncorrect&&!reviewTip&&!focus)return null;
  return {phenomenon:phenomenon,rule:rule,whyCorrect:whyCorrect,whyIncorrect:whyIncorrect,reviewTip:reviewTip,errorFocus:focus};
}
function csItemFeedbackHtml(item,good,showCorrect){
  var fb=csItemFeedbackData(item); if(!fb)return '';
  var why=good?(fb.whyCorrect||'Odpověď odpovídá uvedenému pravidlu.'):(fb.whyIncorrect||fb.whyCorrect||'Zkontroluj pravidlo a sledovaný jazykový jev.');
  var rows=[];
  if(fb.phenomenon)rows.push('<div><b>Jev:</b> '+esc(fb.phenomenon)+'</div>');
  if(fb.rule)rows.push('<div><b>Pravidlo:</b> '+esc(fb.rule)+'</div>');
  if(why)rows.push('<div><b>'+(good?'Proč je to správně:':'Proč je odpověď problematická:')+'</b> '+esc(why)+'</div>');
  if(fb.reviewTip)rows.push('<div><b>Co zopakovat:</b> '+esc(fb.reviewTip)+'</div>');
  if(fb.errorFocus)rows.push('<div><b>Typ chyby:</b> '+esc(fb.errorFocus)+'</div>');
  return rows.length?'<div class="cs-fb '+(good?'cs-fb-ok':'cs-fb-bad')+'">'+rows.join('')+'</div>':'';
}
function itemFeedbackStatusHtml(ex,item,ans,pts){
  if((CFG.feedbackMode||'brief')==='none')return '';
  var raw=scoreItem(ex,item,ans,pts);
  var got=Math.round(raw*100)/100;
  var good=got>=pts-1e-9;
  var html='<div class="ap-feedback '+(good?'ap-ok':'ap-bad')+'"><b>'+(good?'✓ Správně':'✕ Chyba')+'</b> <span class="small">('+got+'/'+pts+' b)</span></div>';
  if((CFG.feedbackMode||'brief')==='learning')html+=csItemFeedbackHtml(item,good,true)||(item.explanation?'<div class="small"><b>Vysvětlení:</b> '+esc(item.explanation)+'</div>':'');
  return html;
}
function exerciseFeedbackHtml(ei){
  if((CFG.feedbackMode||'brief')==='none')return '';
  var ex=EXS[ei]; if(!ex||ex.type==='matching')return '';
  var h='<div class="ex-feedback-list">';
  (ex.items||[]).forEach(function(item,qi){var qid=ei+'_'+qi,ans=ANSWERS[qid],pts=pointFor(ex,qi);h+='<div class="ex-feedback-item"><b>Otázka '+(qi+1)+':</b> '+itemFeedbackStatusHtml(ex,item,ans,pts)+'</div>';});
  h+='</div>'; return h;
}

function calcExerciseScore(ei){
  var ex=EXS[ei],earned=0,total=0;
  if(ex.type==='matching'){
    var pairs=(ANSWERS['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(_,li){var pts=pointFor(ex,li);total+=pts;if(pairs[li]!==undefined&&parseInt(pairs[li],10)===li)earned+=pts;});
  } else {
    (ex.items||[]).forEach(function(item,qi){var pts=pointFor(ex,qi);total+=pts;earned+=Math.round(scoreItem(ex,item,ANSWERS[ei+'_'+qi],pts)*100)/100;});
  }
  var pct=total>0?Math.round(earned/total*100):0;
  return{earned:Math.round(earned*100)/100,total:total,pct:pct,title:ex.title||ex.type};
}
function calcScore(){
  var earned=0,total=0,breakdown=[];
  EXS.forEach(function(ex,ei){var sc=calcExerciseScore(ei);earned+=sc.earned;total+=sc.total;breakdown.push({title:sc.title,earned:sc.earned,total:sc.total});});
  var pct=total>0?Math.round(earned/total*100):0;
  return{earned:Math.round(earned*100)/100,total:Math.round(total*100)/100,pct:pct,grade:getGrade(pct),breakdown:breakdown};
}
var GRADE_SKOLA=[{min:88,g:'1'},{min:74,g:'2'},{min:59,g:'3'},{min:44,g:'4'},{min:0,g:'5'}];
function getGrade(pct){
  pct=Math.round(Number(pct)||0);
  if(CFG.gradeTyp==='vlastni'){
    if(!(Array.isArray(CFG.gradeScale)&&CFG.gradeScale.length))return T('customGrade');
    for(var i=0;i<CFG.gradeScale.length;i++){var x=CFG.gradeScale[i];if(pct>=x.min&&pct<=x.max)return x.g;}
    return '?';
  }
  for(var j=0;j<GRADE_SKOLA.length;j++)if(pct>=GRADE_SKOLA[j].min)return GRADE_SKOLA[j].g;
  return '5';
}

function showResult(res){
  hide('testScreen');show('resultScreen');var now=new Date();CFG.submittedAt=now.toISOString();
  I('resultGrade').textContent=res.grade;I('resultName').textContent=CFG.studentName||'—';I('resultTs').textContent=now.toLocaleString(CFG.uiLang==='cs'?'cs-CZ':CFG.uiLang);var ra=I('resultAttempt');if(ra)ra.textContent=attemptId;
  I('resultPct').textContent=res.pct+'%';I('resultPts').textContent=res.earned+'/'+res.total+' b';
  updateJokerWatermark();
  I('resultBreakdown').innerHTML=res.breakdown.map(function(b){return '<div class="bdown-row"><span>'+esc(b.title)+'</span><span>'+b.earned+'/'+b.total+' b</span></div>';}).join('');
  var locks=securityEvents.filter(function(e){return e.type==='lock';}).length,unlocks=securityEvents.filter(function(e){return e.type==='unlock';}).length,warns=securityEvents.filter(function(e){return e.type==='warning'||e.type==='heartbeat-gap';}).length;
  if(securityEvents.length){I('resultBreakdown').insertAdjacentHTML('afterend','<div class="security-summary">Bezpečnostní záznam: '+warns+' varování, '+locks+' zámek/zámky, '+unlocks+' odemčení.</div>');}
  buildReportSeal(res).then(function(code){var el=I('reportSeal');if(el)el.textContent=code;res.reportSeal=code;if(CFG.overeni&&!jokerUsed){var ta=I('verifyTa');if(ta)ta.value='Připravuji ověřovací .txt…';buildVerify(res);}else if(jokerUsed){var vs=I('verifySection');if(vs)vs.classList.add('hidden');}}).catch(function(){var el=I('reportSeal');if(el)el.textContent='RPT-NELZE-VYTVOŘIT';var vs=I('verifySection');if(vs&&jokerUsed)vs.classList.add('hidden');});
}
function toggleAnswersPanel(){var p=I('answersPanel'),btn=document.querySelector('.btn-toggle-ans');if(p.classList.contains('hidden')){p.innerHTML=buildAnswersHtml();p.classList.remove('hidden');if(btn)btn.textContent=T('hideAnswers');}else{p.classList.add('hidden');if(btn)btn.textContent=T('resultAnswers');}}
function answerText(ex,item,ans){
  if(!ans)return '—';
  if(ans.type==='choice')return esc((item.options||[])[ans.val]||'—');
  if(ans.type==='fib'||ans.type==='cloze')return esc((ans.vals||[]).join(', '));
  if(ans.type==='table')return esc((ans.grid||[]).map(function(row){return Array.isArray(row)?row.filter(function(v){return v!==''&&v!=null;}).join(', '):'';}).filter(Boolean).join(' | ')||'—');
  if(ans.type==='chain')return esc((ans.vals||[]).filter(function(v){return v!==''&&v!=null;}).join(' | ')||'—');
  if(ans.type==='evidence')return esc((item.sentences||[])[ans.val]||'—');
  if(ans.type==='error-tagging'){var toks=Array.isArray(item.tokens)?item.tokens:[];var ix=Number(ans.token);var tok=(Number.isInteger(ix)&&toks[ix]!=null)?toks[ix]:'—';return esc('token: '+tok+'; typ: '+(ans.etype||'—')+'; oprava: '+(ans.corr||'—'));}
  if(ans.type==='tf')return ans.val?T('true'):T('false');
  return esc(ans.val||'—');
}
function buildAnswersHtml(){
  var h='';EXS.forEach(function(ex,ei){h+='<div class="ap-sec"><div class="ap-ex-title">'+esc(ex.title||ex.type)+'</div>';
    if(ex.type==='matching'){var pairs=(ANSWERS['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(item,li){var right=EXS[ei].items[pairs[li]]||{};var good=(pairs[li]!==undefined&&parseInt(pairs[li],10)===li);var fb=((CFG.feedbackMode||'brief')!=='none'?'<div class="ap-feedback '+(good?'ap-ok':'ap-bad')+'"><b>'+(good?'✓ Správně':'✕ Chyba')+'</b></div>'+(((CFG.feedbackMode||'brief')==='learning')?csItemFeedbackHtml(item,good,true):''):'');h+='<div class="ap-item"><span class="ap-q">'+(li+1)+'. '+esc(item.left)+'</span><span class="ap-a">'+(right.right?esc(right.right):'—')+'</span>'+fb+'</div>';});}
    else{(ex.items||[]).forEach(function(item,qi){var ans=ANSWERS[ei+'_'+qi];h+='<div class="ap-item"><span class="ap-q">'+(qi+1)+'.</span><span class="ap-a">'+answerText(ex,item,ans)+'</span>'+itemFeedbackStatusHtml(ex,item,ans,itemPoint(ex,qi))+'</div>';});}
    h+='</div>';});return h;
}

function b64Url(buf){var bin='';var bytes=new Uint8Array(buf);for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).split('+').join('-').split('/').join('_').replace(/=+$/,'');}
function jsonB64(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));}
function hasSubtle(){return !!(window.crypto&&crypto.subtle&&window.TextEncoder);}
function shortHashClient(str){var h=2166136261;str=String(str||'');for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
async function deriveSecretHashClient(kind,secret,testId){var norm=(kind==='teacher-pin')?String(secret||'').trim().toUpperCase():String(secret||'').trim();if(!(window.crypto&&crypto.subtle&&window.TextEncoder))return 'fnv$'+shortHashClient(kind+'|'+norm+'|'+testId);var enc=new TextEncoder();var key=await crypto.subtle.importKey('raw',enc.encode(norm),{name:'PBKDF2'},false,['deriveBits']);var bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(kind+'|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);return 'pbkdf2-v1$'+b64Url(bits);}
async function secretMatches(raw,prefix,expectedHash){if(!expectedHash)return false;return await deriveSecretHashClient(prefix,raw,CFG.testId)===expectedHash;}
function verifyKey(){return String(CFG.verifySecret||CFG.testId||'');}
async function hmac256(payload,tag){var enc=new TextEncoder();var key=await crypto.subtle.importKey('raw',enc.encode(verifyKey()),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);var msg=enc.encode(tag+'|'+payload);var sig=await crypto.subtle.sign('HMAC',key,msg);return b64Url(sig);}
async function makeSignedLine(tag,payload){return tag+'|'+payload+'|'+await hmac256(payload,tag);}
var attemptId='A'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,8).toUpperCase();
function securityCounts(){return{warnings:securityEvents.filter(function(e){return e.type==='warning'||e.type==='heartbeat-gap';}).length,locks:securityEvents.filter(function(e){return e.type==='lock';}).length,unlocks:securityEvents.filter(function(e){return e.type==='unlock';}).length,total:securityEvents.length};}
function reportPayload(res){return{v:1,tag:'RPT1',id:CFG.testId,manifestHash:CFG.manifestHash,creatorId:CFG.creatorId||'',creatorRole:CFG.creatorRole||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',resultMode:CFG.resultMode||'instant',attemptId:attemptId,student:CFG.studentName,group:CFG.activeGroupName||'',groupKey:CFG.activeGroupKey||'',variantKey:CFG.activeVariantKey||'',ts:CFG.submittedAt,earned:res.earned,total:res.total,pct:res.pct,grade:res.grade,jokerUsed:!!jokerUsed,jokerSelectedAt:jokerSelectedAt||'',security:securityCounts()};}
function shortCode(sig,prefix){sig=String(sig||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();return (prefix||'RPT')+'-'+sig.slice(0,4)+'-'+sig.slice(4,8)+'-'+sig.slice(8,12)+'-'+sig.slice(12,16);}
async function buildReportSeal(res){if(!hasSubtle())throw new Error('WebCrypto není dostupné');var payload=jsonB64(reportPayload(res));var sig=await hmac256(payload,'RPT1');return shortCode(sig,'RPT');}
async function buildVerify(res){
  var manifestPayload=jsonB64(CFG.manifest||{hash:CFG.manifestHash});
  var pay={v:5,id:CFG.testId,manifestHash:CFG.manifestHash,creatorId:CFG.creatorId||'',creatorRole:CFG.creatorRole||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',attemptId:attemptId,student:CFG.studentName,group:CFG.activeGroupName||'',groupKey:CFG.activeGroupKey||'',variantKey:CFG.activeVariantKey||'',ts:CFG.submittedAt,earned:res.earned,total:res.total,pct:res.pct,grade:res.grade,reportSeal:res.reportSeal||'',jokerUsed:!!jokerUsed,jokerSelectedAt:jokerSelectedAt||'',warnings:warningCount,variant:CFG.odevzdavani,breakdown:res.breakdown||[],securityEvents:securityEvents||[],securityCounts:securityCounts()};
  var review={v:5,id:CFG.testId,manifestHash:CFG.manifestHash,attemptId:attemptId,student:CFG.studentName,answers:ANSWERS};
  var p1=jsonB64(pay),p2=jsonB64(review);
  try{if(!hasSubtle())throw new Error('WebCrypto není dostupné');generatedTxt=await makeSignedLine('OVR4M',manifestPayload)+String.fromCharCode(10)+await makeSignedLine('OVR4',p1)+String.fromCharCode(10)+await makeSignedLine('OVR4R',p2);}catch(e){generatedTxt='# CHYBA: Tento prohlížeč neumí vytvořit platný OVR4/HMAC ověřovací soubor. Použij aktuální Chrome/Edge/Safari/Firefox a stáhni .txt znovu.';}var ta=I('verifyTa');if(ta)ta.value=generatedTxt;
}
function downloadVerifyTxt(){if(jokerUsed){var taJ=I('verifyTa');if(taJ)taJ.value='U žolíka se ověřovací .txt nevyžaduje. Pošli screenshot s kontrolním kódem reportu.';return;}if(!generatedTxt){var ta0=I('verifyTa');if(ta0)ta0.value='Ověřovací .txt se ještě připravuje. Zkus to za okamžik.';return;}var name=(CFG.studentName||'student').replace(/[^a-z0-9]/gi,'-');var ts=new Date().toISOString().slice(0,10);var fn='ovr_'+CFG.testId+'_'+name+'_'+ts+'.txt';try{var b=new Blob([generatedTxt],{type:'text/plain;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=fn;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},1000);}catch(_){var ta=I('verifyTa');if(ta)ta.select();}}
function copyVerify(){var ta=I('verifyTa');if(!ta)return;try{navigator.clipboard.writeText(ta.value);}catch(_){ta.select();document.execCommand('copy');}}

function b64Json(s){return JSON.parse(decodeURIComponent(escape(atob(s))));}
async function parseVerifyText(txt){var lines=String(txt||'').split(String.fromCharCode(13)).join('').split(String.fromCharCode(10)).map(function(x){return x.trim();}).filter(Boolean);var out={ok:false,strong:false,meta:null,answers:null,manifest:null,errors:[]};for(var i=0;i<lines.length;i++){var line=lines[i];if(!line||line.charAt(0)==='#')continue;var p=line.split('|');if(p.length<3){out.errors.push('Neplatný řádek ověřovacího souboru.');continue;}var tag=p[0],payload=p[1],sig=p[2];try{if(tag!=='OVR4'&&tag!=='OVR4R'&&tag!=='OVR4M'){out.errors.push(tag+': neplatný formát. Tento test přijímá pouze OVR4M/OVR4/OVR4R s HMAC-SHA-256.');continue;}if(!hasSubtle()){out.errors.push(tag+': tento prohlížeč neumí ověřit HMAC-SHA-256.');continue;}var expected=await hmac256(payload,tag);if(expected!==sig)out.errors.push(tag+': nesedí podpis (HMAC) - soubor byl změněn, nepatří k tomuto testu, nebo byl vyroben jiným klíčem.');else out.strong=true;var obj=b64Json(payload);if(tag==='OVR4M')out.manifest=obj;if(tag==='OVR4')out.meta=obj;if(tag==='OVR4R')out.answers=(obj&&obj.answers)?obj.answers:obj;}catch(e){out.errors.push(tag+': nejde přečíst nebo ověřit data.');}}
  if(!out.manifest)out.errors.push('Chybí řádek OVR4M s manifestem testu.');
  if(out.manifest&&out.manifest.hash&&out.manifest.hash!==CFG.manifestHash)out.errors.push('Manifest neodpovídá tomuto testu: výsledek nepatří k této verzi testu nebo byl test upraven.');
  if(out.meta&&out.meta.manifestHash&&out.meta.manifestHash!==CFG.manifestHash)out.errors.push('Výsledek je podepsán pro jiný manifest testu.');
  if(out.answers&&out.answers.manifestHash&&out.answers.manifestHash!==CFG.manifestHash)out.errors.push('Detail odpovědí je podepsán pro jiný manifest testu.');
  out.ok=!!(out.meta&&out.answers&&out.manifest)&&out.errors.length===0;return out;}
function loadVerifyFile(inp){var f=inp.files&&inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){I('verifyInput').value=String(r.result||'');verifyStudentTxt();};r.readAsText(f,'utf-8');}
function answerRawForTeacher(ex,item,ans){return answerText(ex,item,ans).replace(/<[^>]+>/g,'');}
function buildVerifiedAnswersHtml(ansObj,exs){exs=exs||EXS;var h='';(exs||[]).forEach(function(ex,ei){h+='<div class="student-answer-card"><b>'+esc(ex.title||ex.type)+'</b>';if(ex.type==='matching'){var pairs=(ansObj['match_'+ei]||{}).pairs||{};(ex.items||[]).forEach(function(item,li){var right=ex.items[pairs[li]]||{};h+='<div>'+(li+1)+'. '+esc(item.left||'')+' → <b>'+esc(right.right||'—')+'</b></div>';});}else{(ex.items||[]).forEach(function(item,qi){var a=ansObj[ei+'_'+qi];h+='<div>'+(qi+1)+'. <b>'+answerRawForTeacher(ex,item,a)+'</b></div>';});}h+='</div>';});return h;}
function calcScoreFromAnswers(ansObj,exs){var old=ANSWERS;ANSWERS=ansObj||{};var oldExs=EXS;EXS=exs||EXS;var sc=calcScore();ANSWERS=old;EXS=oldExs;return sc;}
function closeNum(a,b){return Math.abs((Number(a)||0)-(Number(b)||0))<0.11;}
async function verifyStudentTxt(){var txt=(I('verifyInput').value||'').trim();var box=I('verifyResult');if(!txt){box.innerHTML='<span class="t-verify-bad">Vlož nebo nahraj .txt.</span>';return;}box.innerHTML='Ověřuji podpis, manifest a přepočítávám skóre…';var p=await parseVerifyText(txt),meta=p.meta||{};var exs=variantByGroupNameOrKey(meta.group||'',meta.groupKey||meta.variantKey||'');var rec=p.answers?calcScoreFromAnswers(p.answers,exs):null;var scoreOk=!!(rec&&closeNum(rec.earned,meta.earned)&&closeNum(rec.total,meta.total)&&String(rec.grade)===String(meta.grade));var manifestOk=!!(p.manifest&&p.manifest.hash===CFG.manifestHash);var status=(p.ok&&scoreOk)?'<span class="t-verify-ok">✓ Orientační kontrola prošla: podpis, manifest i přepočet skóre sedí. Pozn.: v rychlém režimu je podpisový klíč v souboru u studenta, takže tohle potvrzuje shodu a odhalí náhodnou úpravu, ale není to důkaz neměnnosti vůči samotnému studentovi — pro klasifikaci slouží bezpečný offline režim.</span>':'<span class="t-verify-bad">⚠ Ověření má problém.</span>';var vkey=meta.groupKey||meta.variantKey||'';var att=meta.attemptId?(' | <b>Attempt:</b> '+esc(meta.attemptId)):'';var seal=meta.reportSeal?(' | <b>Report kód:</b> '+esc(meta.reportSeal)):'';var joker=meta.jokerUsed?(' | <b>ŽOLÍK:</b> ANO'):' | <b>ŽOLÍK:</b> ne';var detail=[];if(!manifestOk)detail.push('Manifest testu nesedí nebo chybí.');if(rec&&!scoreOk)detail.push('Přepočet skóre z odpovědí nesedí s hodnotami v .txt: přepočteno '+esc(rec.earned)+'/'+esc(rec.total)+' ('+esc(rec.pct)+' %), známka '+esc(rec.grade)+'.');var info='<div>'+status+'</div>'+(p.errors.length?'<div>'+p.errors.map(esc).join('<br>')+'</div>':'')+(detail.length?'<div>'+detail.join('<br>')+'</div>':'')+'<div><b>Student:</b> '+esc(meta.student||'—')+' | <b>Skupina:</b> '+esc(meta.group||'—')+' '+(vkey?'('+esc(vkey)+')':'')+' | <b>Skóre v .txt:</b> '+esc(meta.earned)+'/'+esc(meta.total)+' ('+esc(meta.pct)+' %), známka '+esc(meta.grade)+att+seal+joker+'</div>';box.innerHTML=info+(p.answers?'<div style="margin-top:8px"><b>Odpovědi ze studentského .txt podle správné skupinové varianty:</b></div>'+buildVerifiedAnswersHtml(p.answers,exs):'');}
function openTeacherModal(){show('teacherModal');I('t-name').focus();}
function closeTeacherModal(){logoutTeacher();hide('teacherModal');}
async function doTeacherLogin(){var n=(I('t-name').value||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var p=(I('t-pin').value||'').trim().toUpperCase();var cn=(CFG.ucitelJmeno||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');var err=I('t-err');if(n===cn&&await secretMatches(p,'teacher-pin',CFG.ucitelPinHash)){teacherLogged=true;I('t-pin').value='';hide('t-login');show('t-panel');I('t-body').innerHTML=buildTeacherBody();}else{if(err){err.textContent=T('incorrectLogin');err.classList.remove('hidden');}}}
function logoutTeacher(){teacherLogged=false;hide('t-panel');show('t-login');I('t-pin').value='';var e=I('t-err');if(e)e.classList.add('hidden');}
function csTeacherFeedbackHtml(item){var fb=(item&&item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:null;if(!fb)return '';var rows=[];if(fb.phenomenon)rows.push('<div><b>Jev:</b> '+esc(fb.phenomenon)+'</div>');if(fb.rule)rows.push('<div><b>Pravidlo:</b> '+esc(fb.rule)+'</div>');if(fb.whyCorrect)rows.push('<div><b>Proč:</b> '+esc(fb.whyCorrect)+'</div>');if(fb.reviewTip)rows.push('<div><b>Co zopakovat:</b> '+esc(fb.reviewTip)+'</div>');if(fb.errorFocus)rows.push('<div><b>Typ chyby:</b> '+esc(fb.errorFocus)+'</div>');return rows.length?'<div class="t-expl cs-fb">'+rows.join('')+'</div>':'';}
function correctTextForTeacher(ex,item){if(ex.type==='matching')return item.right||'';if(ex.type==='multiple choice'||ex.type==='reading comprehension'||ex.type==='dialogue completion'||ex.type==='listening comprehension')return (item.options||[])[correctIndex(item)]||item.answer||'';if(ex.type==='true/false')return item.correct?T('true'):T('false');if(ex.type==='fill-in-the-blank'||ex.type==='word formation'||ex.type==='translation'||ex.type==='sentence transformation')return item.answer||'';if(ex.type==='error correction')return item.correction||'';if(ex.type==='error-tagging'){var toks=Array.isArray(item.tokens)?item.tokens:[];var ix=Number(item.error_token_index);return 'token: '+(toks[ix]!=null?toks[ix]:('#'+ix))+'; typ: '+(item.error_type||'')+'; oprava: '+(item.correction||'');}if(ex.type==='word order')return item.correct_sentence||item.answer||'';if(ex.type==='cloze text')return (item.answers||[]).join(', ');if(ex.type==='categorization')return item.correct_category||item.category||item.answer||'';return '['+T('manualReview')+'] '+(item.model_answer||'');}
function questionTextForTeacher(item){return item.question||item.statement||item.sentence||item.prompt||item.text||item.dialogue||item.passage||item.transcript||item.audio_prompt||item.image_description||'';}
function listeningTranscriptForTeacher(ex,item){if(!ex||ex.type!=='listening comprehension')return '';var tr=item.transcript||item.audio_prompt||item.audio_source_note||'';return tr?'<div class="t-expl"><b>Transkript / audio script:</b> '+esc(tr)+'</div>':'';}
function buildTeacherBody(){
  var fzLabel=(CFG.fuzzyTolerance==='mild')?'Mírná (překlep u psaných odpovědí = 0,85 b)':(CFG.fuzzyTolerance==='strict'?'Přísná (překlep u psaných odpovědí = 0,5 b)':'Vypnuto (jen přesná shoda, pravopis se hodnotí)');
  var h='<div class="t-summary"><div class="t-row"><b>Test:</b> '+esc(CFG.nazev)+'</div><div class="t-row"><b>ID:</b> '+CFG.testId+'</div>'+(CFG.cefr?'<div class="t-row"><b>CEFR:</b> '+esc(CFG.cefr)+'</div>':'')+'<div class="t-row"><b>Čas:</b> '+CFG.cas+' min</div><div class="t-row"><b>Body:</b> '+fmtPtsClient(CFG.totalBody)+'</div><div class="t-row"><b>Tolerance překlepů:</b> '+esc(fzLabel)+'</div></div>';
  if((CFG.diffGroups||[]).length){
    h+='<div class="t-sec-title">Diferencované varianty</div><div class="t-verify-box"><div class="small-note">Test obsahuje samostatnou fyzickou variantu pro každou skupinu. Student po zadání kódu uvidí pouze svou variantu.</div>';
    (CFG.diffGroups||[]).forEach(function(g){var exs=VARIANTS[g.key]||[];var sum=variantSummaryClient(exs);h+='<div class="student-answer-card"><b>'+esc(g.name)+' ('+esc(g.key)+')</b><br><span>'+sum.exCount+' cvičení · '+sum.totalQ+' položek · '+fmtPtsClient(sum.totalBody)+' b</span><br><span>'+esc(g.conditions||'')+'</span></div>';});
    h+='</div>';
  }
  h+='<div class="t-sec-title">Ověření studentského .txt</div><div class="t-verify-box"><div class="small-note">Ověřovací soubor musí obsahovat OVR4M/OVR4/OVR4R podepsané přes HMAC-SHA-256. U žolíka se TXT nevyžaduje, kontroluje se screenshot s report kódem.</div><div class="small-note" style="border-left:3px solid #f59e0b;padding-left:8px"><b>Míra důvěry (rychlý režim):</b> podpisový klíč je součástí tohoto testového souboru, který má student k dispozici. Kontrola tedy spolehlivě odhalí náhodnou úpravu a potvrdí, že .txt patří k tomuto testu, ale technicky zdatný student ji umí obejít. Pro klasifikovaný / maturitní test použij <b>Bezpečný offline režim</b> — tam klíč ve studentském souboru není a ověření je neprůstřelné.</div><textarea id="verifyInput" placeholder="Sem vlož obsah studentského ověřovacího .txt (OVR4M / OVR4 / OVR4R)…"></textarea><div class="t-verify-actions"><input type="file" id="verifyFile" accept=".txt,text/plain" onchange="loadVerifyFile(this)"><button class="btn-modal-ok" onclick="verifyStudentTxt()">Ověřit .txt</button></div><div id="verifyResult" class="t-verify-result"></div></div>';
  h+='<div class="t-sec-title">'+T('correctAnswers')+'</div>';
  var keys=(CFG.diffGroups||[]).length?(CFG.diffGroups||[]).map(function(g){return g.key;}):['__default'];
  keys.forEach(function(key){var exs=VARIANTS[key]||VARIANTS.__default||[];var g=(CFG.diffGroups||[]).find(function(x){return x.key===key;});if(g){h+='<div class="t-ex-sec"><div class="t-ex-title">Varianta: '+esc(g.name)+' ('+esc(key)+')</div>';}exs.forEach(function(ex,ei){h+='<div class="t-ex-sec"><div class="t-ex-title">'+esc(ex.title||ex.type)+'</div>';(ex.items||[]).forEach(function(item,qi){var qtxt=questionTextForTeacher(item);h+='<div class="t-item teacher-review-card"><div class="t-qnum">'+(qi+1)+'.</div><div class="t-qtext">'+esc(String(qtxt).slice(0,120))+'</div><div class="t-correct">✓ '+esc(correctTextForTeacher(ex,item))+'</div>'+listeningTranscriptForTeacher(ex,item)+(item.explanation?'<div class="t-expl">'+esc(item.explanation)+'</div>':'')+csTeacherFeedbackHtml(item)+'</div>';});h+='</div>';});if(g){h+='</div>';}});
  return h;
}

var secInstalled=false,blurTimer=null,lastBeat=Date.now(),activeEditable=false,securityEvents=[];
function isModalOpen(){return !I('submitModal')?.classList.contains('hidden')||!I('messageModal')?.classList.contains('hidden')||!I('teacherModal')?.classList.contains('hidden')||!I('lockScreen')?.classList.contains('hidden');}
function isEditable(el){return !!(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable));}
function recordSecurityEvent(type,detail){securityEvents.push({type:type,detail:detail||'',ts:new Date().toISOString()});warningCount=securityEvents.length;}
function lockTest(reason){
  if(!started||submitted||locked)return;
  if(CFG.lockOnLeave){
    recordSecurityEvent('lock',reason);
    if(CFG.hasUnlock){locked=true;I('lockReason').textContent=reason+' ('+warningCount+')';LOCK_TAPS=0;hide('unlockReveal');show('lockScreen');}
    else{recordSecurityEvent('warning','Hlídání obrazovky: zámek nemá nastavené odemykací heslo. '+reason);}
    return;
  }
  if(CFG.testMode==='bezny'){recordSecurityEvent('warning',reason);return;}
  recordSecurityEvent('warning',reason);
}
function guardedBlurCheck(){clearTimeout(blurTimer);blurTimer=setTimeout(function(){if(!started||submitted||locked)return;if(activeEditable||isEditable(document.activeElement)||isModalOpen())return;if(document.visibilityState==='visible'&&!document.hasFocus())lockTest('Stránka ztratila fokus.');},1000);}
function onVisibility(){if(!started||submitted||locked)return;if(document.visibilityState==='hidden')lockTest('Student opustil okno nebo přepnul aplikaci.');}
function onPageHide(){if(!started||submitted||locked)return;lockTest('Pokus o opuštění stránky.');}
function onBeforeUnload(e){if(!started||submitted)return;recordSecurityEvent('warning','Pokus o reload nebo opuštění stránky.');if(CFG.lockOnLeave){e.preventDefault();e.returnValue='';return '';}}
function setupLockDetection(){if(secInstalled)return;secInstalled=true;lastBeat=Date.now();document.addEventListener('visibilitychange',onVisibility);window.addEventListener('pagehide',onPageHide);window.addEventListener('blur',guardedBlurCheck);window.addEventListener('beforeunload',onBeforeUnload);document.addEventListener('focusin',function(e){activeEditable=isEditable(e.target);});document.addEventListener('focusout',function(){setTimeout(function(){activeEditable=isEditable(document.activeElement);},50);});setInterval(function(){if(started&&!submitted&&!locked){var now=Date.now();if(now-lastBeat>45000)lockTest('Podezřelá prodleva aktivity: '+String(now-lastBeat)+' ms.');lastBeat=now;}},15000);}
function teardownLockDetection(){if(!secInstalled)return;secInstalled=false;document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',onPageHide);window.removeEventListener('blur',guardedBlurCheck);window.removeEventListener('beforeunload',onBeforeUnload);}
var LOCK_TAPS=0,LOCK_TAP_TIMER=null;
function lockTap(){LOCK_TAPS++;clearTimeout(LOCK_TAP_TIMER);LOCK_TAP_TIMER=setTimeout(function(){LOCK_TAPS=0;},2000);if(LOCK_TAPS>=5){LOCK_TAPS=0;show('unlockReveal');var inp=I('unlockInp');if(inp){try{inp.focus();}catch(_){}}}}
async function tryUnlock(){var v=(I('unlockInp').value||'').trim();if(await secretMatches(v,'unlock-password',CFG.hesloHash)){locked=false;hide('lockScreen');hide('unlockReveal');LOCK_TAPS=0;I('unlockInp').value='';recordSecurityEvent('unlock','teacher password');}else{I('unlockInp').style.borderColor='#ef4444';setTimeout(function(){I('unlockInp').style.borderColor='';},800);}}
`;
}

// ─── Test CSS ──────────────────────────────────────────────────────────────────

function getTestBaseCSS() {
  return '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{font-size:16px}' +
'body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;padding:0 0 env(safe-area-inset-bottom,20px)}' +
'.hidden{display:none!important}.screen{padding:0}' +
/* Intro */
'.intro-card{max-width:560px;margin:0 auto;padding:24px 16px}' +
'.test-title{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:4px}' +
'.test-sub{font-size:14px;color:var(--muted);margin-bottom:2px}' +
'.test-id-lbl{font-size:11px;color:var(--muted);font-family:monospace;margin-bottom:18px}' +
'.ex-ov{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px}' +
'.ex-ov-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)}' +
'.ex-num-badge{background:var(--accent);color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}' +
'.ex-ov-name{flex:1;font-size:14px}.ex-ov-pts{font-size:13px;color:var(--muted)}' +
'.ex-ov-total{display:flex;justify-content:space-between;padding:10px 14px;background:var(--card2);font-size:13px;font-weight:600}' +
'.cs-test-note{background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.45);border-radius:12px;padding:10px 12px;margin:12px 0 14px;font-size:13px;line-height:1.55;color:var(--text)}.cs-test-note strong{color:var(--accent)}' +
'.rules-box{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px}' +
'.rules-ttl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px}' +
'.rules-list{padding-left:16px;font-size:14px;line-height:1.9}' +
'.name-lbl{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}' +
'.name-inp{width:100%;padding:14px 12px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:16px;margin-bottom:12px;outline:none;transition:border-color .15s;-webkit-appearance:none}' +
'.name-inp:focus{border-color:var(--accent)}' +
'.btn-start{width:100%;padding:16px;border:none;border-radius:12px;background:var(--accent);color:#fff;font-size:17px;font-weight:700;cursor:pointer;min-height:52px;margin-bottom:10px;transition:filter .15s}' +
'.btn-start:active{filter:brightness(.9)}' +
'.btn-teacher-lnk{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--muted);font-size:14px;cursor:pointer;min-height:44px}' +
'.btn-fullscreen{width:100%;padding:13px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--muted);font-size:14px;cursor:pointer;min-height:46px;margin-bottom:10px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit}' +
'.fs-ico{display:inline-block;width:15px;height:15px;position:relative;flex-shrink:0}' +
'.fs-ico::before,.fs-ico::after{content:"";position:absolute;width:5px;height:5px;border-color:currentColor;border-style:solid}' +
'.fs-ico::before{top:0;left:0;border-width:2px 0 0 2px}' +
'.fs-ico::after{bottom:0;right:0;border-width:0 2px 2px 0}' +
/* Header */
'.t-header{position:sticky;top:0;z-index:10;background:var(--accent);color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:0 0 14px 14px;box-shadow:0 2px 12px rgba(0,0,0,.2)}' +
'.t-header-title{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}' +
'.t-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0}' +
'.timer-badge{font-size:16px;font-weight:700;font-family:monospace;background:rgba(255,255,255,.2);padding:4px 8px;border-radius:6px;min-width:54px;text-align:center}' +
'.timer-badge.t-warn{background:rgba(255,200,0,.35)}.timer-badge.t-danger{background:rgba(255,60,60,.45);animation:pulse 1s infinite}' +
'@keyframes pulse{50%{opacity:.6}}' +
'.a11y-note{position:sticky;top:0;z-index:24;margin:8px auto;max-width:720px;padding:7px 12px;border:2px solid var(--acc-b);border-radius:12px;background:var(--acc-d);color:var(--acc);font-weight:800;text-align:center;font-size:13px}' +
'body.a11y-large #exArea{font-size:19px}body.a11y-xlarge #exArea{font-size:22px}' +
'body.a11y-large #exArea input,body.a11y-large #exArea textarea,body.a11y-large #exArea button,body.a11y-large #exArea .opt,body.a11y-large #exArea .mc-opt,body.a11y-xlarge #exArea input,body.a11y-xlarge #exArea textarea,body.a11y-xlarge #exArea button,body.a11y-xlarge #exArea .opt,body.a11y-xlarge #exArea .mc-opt{font-size:1em}' +
'body.a11y-dys #exArea{font-family:Verdana,Tahoma,sans-serif;letter-spacing:.05em;word-spacing:.14em;line-height:1.95;text-align:left}body.a11y-dys #exArea .opt,body.a11y-dys #exArea .mc-opt,body.a11y-dys #exArea .question,body.a11y-dys #exArea p{line-height:1.95}' +
'.prog-badge{font-size:13px;background:rgba(255,255,255,.15);padding:4px 8px;border-radius:6px}' +
/* Tabs */
'.tabs-nav{display:flex;gap:6px;padding:10px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--card);border-bottom:1px solid var(--border);scrollbar-width:none}' +
'.tabs-nav::-webkit-scrollbar{display:none}' +
'.tab-btn{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:12px;cursor:pointer;min-height:44px;min-width:58px;transition:all .15s}' +
'.tab-btn.tab-active{border-color:var(--accent);color:var(--accent)}' +
'.tab-name{font-size:10px;white-space:nowrap}.tab-done{color:var(--ok);font-size:10px}' +
/* Exercise area */
'.ex-area{padding:12px;max-width:720px;margin:0 auto}' +
'.ex-hdr{margin-bottom:16px;padding:12px 14px;background:var(--card);border-radius:12px;border:1px solid var(--border)}' +
'.ex-hdr-num{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);display:block;margin-bottom:2px}' +
'.ex-hdr-title{font-size:17px;font-weight:700;display:block;margin-bottom:4px}' +
'.ex-hdr-pts{font-size:12px;color:var(--muted)}' +
'.q-list{display:flex;flex-direction:column;gap:14px;margin-bottom:16px}' +
'.question{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;position:relative}' +
'.question.joker-used{opacity:.65;border-style:dashed}' +
'.q-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
'.q-num{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}' +
'.q-pts{font-size:11px;color:var(--muted)}.q-text{font-size:15px;line-height:1.5;margin-bottom:12px}' +
/* MC */
'.mc-opts{display:flex;flex-direction:column;gap:8px}' +
'.mc-opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:15px;cursor:pointer;text-align:left;min-height:48px;transition:all .12s;-webkit-tap-highlight-color:transparent;width:100%}' +
'.mc-opt:active{transform:scale(.98)}.mc-opt.mc-sel{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}' +
'.opt-ltr{font-weight:700;min-width:20px;color:var(--muted)}.mc-opt.mc-sel .opt-ltr{color:var(--accent)}' +
'.mc-opt .ms-box{flex:0 0 auto;width:20px;height:20px;border:2px solid var(--muted);border-radius:5px;position:relative;background:var(--card)}.mc-opt.mc-sel .ms-box{border-color:var(--accent);background:var(--accent)}.mc-opt.mc-sel .ms-box::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.ms-hint{font-size:12.5px;color:var(--muted);margin:6px 0}.ord-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.ord-row{display:flex;align-items:center;gap:12px;border:2px solid var(--border);border-radius:10px;padding:10px 14px;background:var(--card);color:var(--text);cursor:pointer;transition:border-color .15s,background .15s;user-select:none}.ord-row:hover{border-color:var(--accent);background:var(--card2)}.ord-row.ord-picked{border-color:var(--accent);background:var(--card2)}.ord-badge{flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted);background:var(--card2);transition:all .15s}.ord-row.ord-picked .ord-badge{background:var(--accent);border-color:var(--accent);color:#fff}.ord-txt{flex:1;text-align:left}.ord-hint{font-size:12px;color:var(--muted);margin-top:6px}.cb-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.cb-row{display:flex;flex-direction:column;gap:6px;border:2px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--card);color:var(--text)}.cb-txt{font-weight:600;text-align:left}.cb-sel{width:100%}.tc-wrap{overflow-x:auto;margin-top:10px;border:1px solid var(--border);border-radius:12px}.tc-table{width:100%;min-width:520px;border-collapse:collapse;background:var(--card)}.tc-table th,.tc-table td{border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:8px 10px;text-align:left;vertical-align:middle}.tc-table th{background:var(--card2);color:var(--text);font-size:13px}.tc-table td:last-child,.tc-table th:last-child{border-right:0}.tc-fixed{font-weight:700;color:var(--text)}.tc-inp{min-width:110px}.trch-base{margin:9px 0;padding:10px 12px;border-left:4px solid var(--accent);background:var(--card2);border-radius:10px;font-weight:800;color:var(--text)}.trch-list{display:flex;flex-direction:column;gap:9px;margin-top:10px}.trch-row{border:2px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--card);color:var(--text)}.trch-instr{font-weight:700;margin-bottom:6px}.trch-inp{width:100%}.he-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.he-sent{align-items:flex-start;line-height:1.55;white-space:normal}.he-sent .opt-txt{text-align:left}' +
'.opt-txt{flex:1}' +
/* FiB */
'.fib-sent{font-size:15px;line-height:2.4}' +
'.fib-inp{border:none;border-bottom:2px solid var(--accent);background:transparent;color:var(--text);font-size:15px;padding:0 4px;min-width:80px;max-width:160px;outline:none;text-align:center;vertical-align:middle}' +
/* TF */
'.tf-opts{display:flex;gap:10px}' +
'.tf-btn{flex:1;padding:14px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:15px;font-weight:600;cursor:pointer;min-height:48px;transition:all .12s}' +
'.tf-btn.tf-sel{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}' +
/* Matching */
'.match-grid{display:flex;flex-direction:column;gap:8px}' +
'.match-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center}' +
'.match-left{padding:10px 12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;font-size:14px;min-height:44px;display:flex;align-items:center}' +
'.match-sel{padding:10px 8px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:14px;min-height:44px;cursor:pointer;-webkit-appearance:auto;width:100%}' +
'.match-sel:focus{border-color:var(--accent);outline:none}' +
/* Err / Open */
'.err-sent{font-style:italic;margin-bottom:8px;padding:8px;background:var(--card2);border-radius:6px}' +
'.err-lbl{font-size:12px;color:var(--muted);margin-bottom:6px}' +
'.err-inp,.open-inp{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;outline:none;-webkit-appearance:none}' +
'.err-inp:focus,.open-inp:focus{border-color:var(--accent)}' +
'.open-inp{resize:vertical;min-height:80px;font-family:inherit}' +
/* Joker */
'.joker-choice{border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:14px;padding:12px;margin:14px 0}' +
'.joker-choice-title{font-weight:800;color:var(--accent);margin-bottom:4px}.joker-choice-hint{font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:10px}' +
'.joker-choice-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.joker-choice-btn{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-weight:700;cursor:pointer;min-height:46px}.joker-choice-btn.selected{border-color:var(--accent);background:var(--accent);color:#fff}.joker-choice-btn.selected::before{content:"✓ "}.joker-choice-risk.selected{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)}.joker-choice-confirm{margin-top:10px;padding:10px 12px;border-radius:10px;font-weight:800;text-align:center;font-size:14px}.joker-choice-confirm-ok{background:color-mix(in srgb,#16a34a 15%,var(--card));color:#16a34a;border:2px solid #16a34a}.joker-choice-confirm-risk{background:color-mix(in srgb,#f59e0b 15%,var(--card));color:#b45309;border:2px solid #f59e0b}' +
'.joker-watermark{position:sticky;top:58px;z-index:25;margin:8px auto;max-width:720px;padding:8px 12px;border:2px dashed var(--accent);border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--accent);font-weight:900;text-align:center;letter-spacing:.04em}' +
'.practice-note,.cs-fb{margin-top:8px;border-left:4px solid var(--accent);background:var(--accent-bg);border-radius:10px;padding:9px 11px;font-size:13px;line-height:1.55;color:var(--text)}.cs-fb div+div{margin-top:3px}.cs-fb-ok{border-left-color:var(--ok);background:var(--ok-bg)}.cs-fb-bad{border-left-color:#ef4444;background:#fff1f2}.ap-feedback{margin-top:6px;border-radius:8px;padding:6px 8px;font-size:13px}.ap-ok{background:var(--ok-bg);color:var(--ok)}.ap-bad{background:#fff1f2;color:#991b1b}.ex-feedback-list{margin-top:8px;display:flex;flex-direction:column;gap:7px}.ex-feedback-item{border-top:1px solid var(--border);padding-top:7px}' +
'.joker-mode .ex-panel{position:relative}.joker-mode .ex-panel::after{content:"ŽOLÍK";position:absolute;right:18px;bottom:12px;font-size:36px;font-weight:900;color:var(--accent);opacity:.08;pointer-events:none;transform:rotate(-12deg)}.joker-mode .practice-note{display:none!important}' +
'.joker-result-box{border:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--accent);border-radius:14px;padding:10px;margin:12px 0;font-size:16px;font-weight:900;text-align:center;letter-spacing:.04em}' +
'.report-seal-box{border:1.5px solid var(--border);background:var(--card2);border-radius:12px;padding:10px;margin:12px 0;text-align:center}.report-seal-label{font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:800;letter-spacing:.06em}.report-seal-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:900;color:var(--accent);margin:4px 0}.report-seal-hint{font-size:11px;color:var(--muted);line-height:1.35}' +
/* Ex nav */
'.ex-nav{display:flex;justify-content:space-between;gap:10px;margin-top:16px}' +
'.btn-ex-nav{flex:1;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:14px;cursor:pointer;min-height:44px}' +
'.btn-ex-nav-primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}' +
/* Submit */
'.submit-row{padding:12px;max-width:720px;margin:0 auto}' +
'.btn-submit{width:100%;padding:16px;border:none;border-radius:12px;background:var(--ok);color:#fff;font-size:17px;font-weight:700;cursor:pointer;min-height:52px;transition:filter .15s}' +
'.btn-submit:active{filter:brightness(.9)}' +
/* Result */
'.result-card{max-width:480px;margin:0 auto;padding:24px 16px}' +
'.result-details{max-width:480px;margin:16px auto 0}' +
'.result-grade-row{text-align:center;margin-bottom:8px}' +
'.result-grade-big{font-size:72px;font-weight:900;color:var(--accent);line-height:1}' +
'.result-name{text-align:center;font-size:20px;font-weight:700;margin-bottom:4px}' +
'.result-meta{text-align:center;font-size:11px;color:var(--muted);font-family:monospace;margin-bottom:16px}' +
'.result-score-row{display:flex;justify-content:center;align-items:baseline;gap:14px;margin-bottom:16px}' +
'.result-pct{font-size:40px;font-weight:700;color:var(--ok)}.result-pts{font-size:16px;color:var(--muted)}' +
'.result-breakdown{border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px}' +
'.bdown-row{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);font-size:14px}' +
'.bdown-row:last-child{border-bottom:none}' +
'.verify-section{border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px}' +
'.btn-dl-txt{width:100%;padding:12px;border:1.5px solid var(--accent);border-radius:8px;background:transparent;color:var(--accent);font-size:14px;font-weight:600;cursor:pointer;min-height:44px;margin-bottom:8px}' +
'.verify-hint{font-size:12px;color:var(--muted);margin-bottom:8px}' +
'.security-summary{font-size:12px;color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:12px}' +
'.verify-backup summary{font-size:12px;color:var(--muted);cursor:pointer;margin-bottom:6px}' +
'.verify-ta{width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-size:11px;font-family:monospace;resize:none;margin-bottom:6px;margin-top:6px}' +
'.btn-copy-verify{padding:6px 14px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--muted);font-size:12px;cursor:pointer}' +
'.result-actions{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}' +
'.btn-toggle-ans,.btn-teacher-lnk{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:14px;cursor:pointer;min-height:44px;width:100%}' +
'.ans-panel{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:8px}' +
'.ap-sec{margin-bottom:12px}.ap-ex-title{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:6px}' +
'.ap-item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px}' +
'.ap-item:last-child{border-bottom:none}.ap-q{color:var(--muted);min-width:50px}.ap-a{flex:1}' +
/* Modals */
'.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:env(safe-area-inset-top,20px) 16px 20px;z-index:100;overflow-y:auto}' +
'.modal-box{background:var(--card);border-radius:16px;padding:20px;width:100%;max-width:380px;margin-top:40px}' +
'.modal-title{font-size:18px;font-weight:700;margin-bottom:14px}' +
'.modal-body{font-size:15px;line-height:1.5;margin-bottom:16px}' +
'.modal-btn-row{display:flex;flex-direction:column;gap:8px}' +
'.btn-modal-ok{padding:14px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;width:100%}' +
'.btn-modal-cancel{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:15px;cursor:pointer;min-height:44px;width:100%}' +
/* Teacher */
'.teacher-box{max-width:500px}.modal-inp{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;margin-bottom:10px;outline:none;-webkit-appearance:none;display:block}' +
'.modal-inp:focus{border-color:var(--accent)}' +
'.t-err{font-size:13px;color:#ef4444;margin-bottom:10px;padding:8px 10px;background:rgba(239,68,68,.1);border-radius:6px}' +
'.t-summary{border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px}' +
'.t-row{font-size:14px;padding:4px 0;border-bottom:1px solid var(--border)}.t-row:last-child{border-bottom:none}' +
'.t-sec-title{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}' +
'.t-ex-sec{margin-bottom:16px}.t-ex-title{font-size:14px;font-weight:700;margin-bottom:8px}' +
'.t-item.teacher-review-card{background:var(--card);border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px}' +
'.t-qnum{font-size:12px;color:var(--muted)}.t-qtext{font-size:12px;color:var(--muted);margin:2px 0}' +
'.t-correct{color:var(--ok);font-weight:600;font-size:14px;margin-top:4px}' +
'.t-expl{color:var(--muted);font-size:12px;margin-top:3px;font-style:italic}' +
'.t-left{font-size:14px;margin-bottom:3px}.t-right{color:var(--ok);font-weight:600;font-size:14px}' +
/* Lock */
'.lock-ov{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}' +
'.lock-card{background:var(--card);border-radius:16px;padding:24px;max-width:340px;width:100%;text-align:center}' +
'.lock-icon{font-size:48px;margin-bottom:12px}.lock-title{font-size:20px;font-weight:700;margin-bottom:8px}' +
'.lock-reason{font-size:14px;color:var(--muted);margin-bottom:16px}' +
'.lock-inp{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;margin-bottom:10px;text-align:center;outline:none;-webkit-appearance:none;display:block}';
}

function getThemeVars(tema) {
  var themes = {
    examBlue:   {bg:'#f0f4f8',card:'#ffffff',card2:'#e8f0fb',text:'#1a2332',muted:'#6b7a8d',border:'#dde3ea',accent:'#1a3a6c',accentBg:'rgba(26,58,108,.10)',ok:'#2e7d32',okBg:'rgba(46,125,50,.10)',btnText:'#ffffff',warnBg:'#fff8e1',warnBorder:'#ffc107',warnText:'#7a4a00'},
    dark:       {bg:'#0a0e1a',card:'#0d1226',card2:'#121a33',text:'#e8f6ff',muted:'#8fb3c7',border:'rgba(0,245,255,.22)',accent:'#00f5ff',accentBg:'rgba(0,245,255,.12)',ok:'#10b981',okBg:'rgba(16,185,129,.12)',btnText:'#07111f',warnBg:'rgba(255,184,77,.12)',warnBorder:'rgba(255,184,77,.45)',warnText:'#ffd28a'},
    modern:     {bg:'#f8faff',card:'#ffffff',card2:'#f0f4ff',text:'#1a1c2e',muted:'#6b7280',border:'#e5e7eb',accent:'#6366f1',accentBg:'rgba(99,102,241,.08)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    nature:     {bg:'#f0f7f0',card:'#ffffff',card2:'#e8f4e8',text:'#1a2e1a',muted:'#5a7a5a',border:'#c8dfc8',accent:'#2d8a2d',accentBg:'rgba(45,138,45,.08)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a5a10'},
    akademicky: {bg:'#f8fafc',card:'#ffffff',card2:'#e3f2fd',text:'#1e293b',muted:'#64748b',border:'#e2e8f0',accent:'#1976d2',accentBg:'rgba(25,118,210,.10)',ok:'#16a34a',okBg:'rgba(22,163,74,.10)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    minimal:    {bg:'#ffffff',card:'#f9fafb',card2:'#f3f4f6',text:'#111827',muted:'#6b7280',border:'#e5e7eb',accent:'#111827',accentBg:'rgba(17,24,39,.06)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    pastel:     {bg:'#fff7ed',card:'#ffffff',card2:'#fef3e2',text:'#1f2937',muted:'#6b7280',border:'#fed7aa',accent:'#fb7185',accentBg:'rgba(251,113,133,.10)',ok:'#22c55e',okBg:'rgba(34,197,94,.08)',btnText:'#ffffff',warnBg:'#fffbeb',warnBorder:'#fde68a',warnText:'#92400e'},
    terakota:   {bg:'#faf4ec',card:'#ffffff',card2:'#f5ede0',text:'#2b211c',muted:'#7a6a60',border:'#ece2d6',accent:'#c75d3c',accentBg:'rgba(199,93,60,.10)',ok:'#2f9e6e',okBg:'rgba(47,158,110,.08)',btnText:'#ffffff',warnBg:'#fff4e8',warnBorder:'#e8b47f',warnText:'#8a4a20'},
  };
  return themes[tema] || themes.modern;
}
function cssRootFromThemeVars(v) {
  return ':root{--bg:'+v.bg+';--card:'+v.card+';--card2:'+v.card2+';--text:'+v.text+';--muted:'+v.muted+';--border:'+v.border+';--accent:'+v.accent+';--accent-bg:'+v.accentBg+';--ok:'+v.ok+';--ok-bg:'+v.okBg+'}';
}
function getTestThemeCSS(tema) {
  return cssRootFromThemeVars(getThemeVars(tema));
}


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
    const approved=RELEASE.status==='approved-for-school-use';
    s.textContent=approved?'schváleno pro školní použití':'DRAFT — nepoužívat ostře';
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
    var approved = RELEASE.status === 'approved-for-school-use';
    var statusHtml = approved
      ? '<div class="sec-guide-ok" style="margin:0 0 4px">✅ Schváleno pro školní použití — verze prošla self-testem bodování a integračními testy.</div>'
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
        '<p class="sec-guide-p">U diferencovaných skupin používej <strong>anonymizaci</strong> — generátor nahradí jména kódy v promptu odesílaném do AI.</p>' +
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
        '<p class="sec-guide-p">Zapněte <strong>anonymizaci</strong> v sekci skupin — generátor nahradí jména kódy (Student A1, A2…) v promptu odesílaném do AI. Reálná jména tak neopustí prohlížeč.</p>' +
        '<p class="sec-guide-p">Studenti přesto píší své skutečné jméno do testu — anonymizace se týká pouze komunikace s AI při generování, ne samotného testu. Ve <strong>teacher verifieru jsou výsledky pod skutečnými jmény</strong>, takže jako učitel vidíte vše normálně.</p>' +
        '<p class="sec-guide-p">Mapování kódů na skutečná jména (Student A1 = Jan Novák…) zůstává jen ve vašem prohlížeči v sekci „Lokální mapování pro učitele" — nikam se neodesílá.</p>' +
        '<div class="sec-guide-ok">✓ Shrnutí: anonymizace chrání jména před AI, ale vás jako učitele nijak neomezuje.</div>' +
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

