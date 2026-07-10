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

