// Exercise type discovery UI: one metadata registry powers hover/focus/touch help.
// Adding a new exercise type requires a matching entry here; CI enforces parity.
const EXERCISE_TYPE_HELP = Object.freeze({
  'multiple choice': Object.freeze({ summary:'Ot\u00e1zka s v\u00edce mo\u017enostmi a jednou spr\u00e1vnou odpov\u011bd\u00ed. Rychl\u00e9 ov\u011b\u0159en\u00ed gramatiky, slovn\u00ed z\u00e1soby i porozum\u011bn\u00ed.', example:'She ___ to school every day. -> goes / go / went / gone' }),
  'multi-select': Object.freeze({ summary:'V\u00edce odpov\u011bd\u00ed je spr\u00e1vn\u011b a \u017e\u00e1k mus\u00ed ozna\u010dit v\u0161echny. Hod\u00ed se tam, kde jedna volba nesta\u010d\u00ed.', example:'Ozna\u010d v\u0161echny spr\u00e1vn\u00e9 tvary: goes / go / is going / goed' }),
  'true/false': Object.freeze({ summary:'\u017d\u00e1k rozhoduje, zda je tvrzen\u00ed pravdiv\u00e9, nebo nepravdiv\u00e9.', example:'She goes to school by bus. -> Pravda / Nepravda' }),
  'odd one out': Object.freeze({ summary:'\u017d\u00e1k hled\u00e1 polo\u017eku, kter\u00e1 do skupiny nepat\u0159\u00ed. Vhodn\u00e9 pro slovn\u00ed z\u00e1sobu, v\u00fdznamov\u00e9 vztahy i gramatick\u00e9 kategorie.', example:'go / run / beautiful / walk -> beautiful' }),
  'matching': Object.freeze({ summary:'P\u0159i\u0159azov\u00e1n\u00ed dvojic nebo souvisej\u00edc\u00edch polo\u017eek. Dob\u0159e funguje pro slovo-v\u00fdznam, slovo-p\u0159eklad nebo dv\u011b poloviny v\u011bty.', example:'go -> j\u00edt | run -> b\u011b\u017eet | see -> vid\u011bt' }),
  'categorisation-board': Object.freeze({ summary:'T\u0159\u00eddic\u00ed tabule pro v\u011bt\u0161\u00ed sadu polo\u017eek. \u017d\u00e1k rozd\u011bluje slova nebo v\u011bty do n\u011bkolika kategori\u00ed.', example:'Rozt\u0159i\u010f 8 v\u011bt: defining / non-defining relative clause' }),
  'synonym choice': Object.freeze({ summary:'\u017d\u00e1k vyb\u00edr\u00e1 slovo s nejbli\u017e\u0161\u00edm v\u00fdznamem. Vhodn\u00e9 pro upevn\u011bn\u00ed slovn\u00ed z\u00e1soby.', example:'happy -> glad / sad / tired / fast -> glad' }),
  'antonym choice': Object.freeze({ summary:'\u017d\u00e1k vyb\u00edr\u00e1 slovo s opa\u010dn\u00fdm v\u00fdznamem.', example:'big -> small / huge / wide / tall -> small' }),
  'choose the correct response': Object.freeze({ summary:'\u017d\u00e1k vyb\u00edr\u00e1 nejvhodn\u011bj\u0161\u00ed reakci v dialogu. Otestuje porozum\u011bn\u00ed komunika\u010dn\u00ed situaci.', example:'"Thanks a lot!" -> You\'re welcome / Yes, I do' }),
  'match word to definition': Object.freeze({ summary:'P\u0159i\u0159azen\u00ed slov k jejich definic\u00edm. U\u017eite\u010dn\u00e9 pro kontrolu aktivn\u011bj\u0161\u00ed znalosti v\u00fdznamu.', example:'generous -> willing to give | brave -> not afraid' }),
  'fill-in-the-blank': Object.freeze({ summary:'Dopln\u011bn\u00ed chyb\u011bj\u00edc\u00edho slova nebo tvaru do mezery ve v\u011bt\u011b. Z\u00e1kladn\u00ed form\u00e1t pro gramatiku i slovn\u00ed z\u00e1sobu.', example:'She ___ to school yesterday. -> went' }),
  'word formation': Object.freeze({ summary:'\u017d\u00e1k vytvo\u0159\u00ed spr\u00e1vn\u00fd tvar slova ze zadan\u00e9ho z\u00e1kladu. Prov\u011b\u0159uje slovotvorbu i kontext.', example:'beauty -> ___ -> beautiful' }),
  'sentence transformation': Object.freeze({ summary:'P\u0159eps\u00e1n\u00ed v\u011bty se zachov\u00e1n\u00edm p\u016fvodn\u00edho v\u00fdznamu. Vhodn\u00e9 pro gramatick\u00e9 struktury a parafr\u00e1zi.', example:'She is too tired to study. -> She is not energetic enough to study.' }),
  'key word transformation': Object.freeze({ summary:'Transformace v\u011bty s povinn\u00fdm kl\u00ed\u010dov\u00fdm slovem. Typick\u00e9 zkou\u0161kov\u00e9 cvi\u010den\u00ed na p\u0159esnost a parafr\u00e1zi.', example:'It was too cold. + ENOUGH -> It wasn\'t warm enough.' }),
  'word order': Object.freeze({ summary:'\u017d\u00e1k se\u0159ad\u00ed rozh\u00e1zen\u00e1 slova do spr\u00e1vn\u00e9 v\u011bty. Prov\u011b\u0159uje slovosled a stavbu v\u011bty.', example:'every / she / day / goes -> She goes every day.' }),
  'table-completion': Object.freeze({ summary:'Dopl\u0148ov\u00e1n\u00ed chyb\u011bj\u00edc\u00edch pol\u00ed v tabulce. Vhodn\u00e9 pro tvary sloves, paradigmatick\u00e9 p\u0159ehledy nebo slovn\u00ed rodiny.', example:'go | went | ___ -> gone' }),
  'transformation-chain': Object.freeze({ summary:'S\u00e9rie navazuj\u00edc\u00edch transformac\u00ed z jedn\u00e9 v\u00fdchoz\u00ed v\u011bty. Umo\u017e\u0148uje bodovat jednotliv\u00e9 kroky.', example:'She goes. -> negative -> question -> past simple' }),
  'error correction': Object.freeze({ summary:'\u017d\u00e1k najde chybu ve v\u011bt\u011b a oprav\u00ed ji. Prov\u011b\u0159uje aktivn\u00ed kontrolu jazykov\u00e9 spr\u00e1vnosti.', example:'She go to school every day. -> goes' }),
  'error-tagging': Object.freeze({ summary:'\u017d\u00e1k ozna\u010d\u00ed chybnou \u010d\u00e1st, ur\u010d\u00ed typ chyby a dopln\u00ed opravu. Detailn\u011bj\u0161\u00ed diagnostick\u00e1 varianta opravy chyb.', example:'She go to school. -> go | verb form | goes' }),
  'verb form': Object.freeze({ summary:'Dopln\u011bn\u00ed spr\u00e1vn\u00e9ho tvaru slovesa podle kontextu. Zam\u011b\u0159en\u00e9 p\u0159\u00edmo na slovesnou gramatiku.', example:'She ___ (go) home yesterday. -> went' }),
  'preposition gap-fill': Object.freeze({ summary:'Dopln\u011bn\u00ed spr\u00e1vn\u00e9 p\u0159edlo\u017eky do v\u011bty nebo spojen\u00ed.', example:'I\'m good ___ math. -> at' }),
  'question formation': Object.freeze({ summary:'\u017d\u00e1k vytv\u00e1\u0159\u00ed ot\u00e1zku k zadan\u00e9 odpov\u011bdi nebo informaci. Prov\u011b\u0159uje slovosled i volbu t\u00e1zac\u00edho v\u00fdrazu.', example:'Answer: To London. -> Where did she go?' }),
  'word family': Object.freeze({ summary:'Tvorba odvozen\u00e9ho tvaru ze stejn\u00e9 slovn\u00ed rodiny. Vhodn\u00e9 pro podstatn\u00e1 jm\u00e9na, p\u0159\u00eddavn\u00e1 jm\u00e9na, slovesa i p\u0159\u00edslovce.', example:'Her ___ (decide) was final. -> decision' }),
  'translation': Object.freeze({ summary:'\u017d\u00e1k p\u0159ekl\u00e1d\u00e1 v\u011btu do c\u00edlov\u00e9ho jazyka. Vy\u017eaduje aktivn\u00ed produkci a m\u016f\u017ee m\u00edt v\u00edce p\u0159ijateln\u00fdch variant.', example:'Ona \u0161la do \u0161koly v\u010dera. -> She went to school yesterday.' }),
  'short answer': Object.freeze({ summary:'Kr\u00e1tk\u00e1 vlastn\u00ed odpov\u011b\u010f, typicky 1-5 slov. Hod\u00ed se pro fakta, slovn\u00ed z\u00e1sobu i stru\u010dn\u00e9 porozum\u011bn\u00ed.', example:'What is the capital of France? -> Paris' }),
  'paraphrase the sentence': Object.freeze({ summary:'\u017d\u00e1k p\u0159eformuluje v\u011btu vlastn\u00edmi slovy a zachov\u00e1 v\u00fdznam. Otev\u0159en\u011bj\u0161\u00ed produkce s v\u00edce spr\u00e1vn\u00fdmi variantami.', example:'It\'s very cold. -> It isn\'t warm at all.' }),
  'reading comprehension': Object.freeze({ summary:'Jeden souvisl\u00fd text a sada ot\u00e1zek ov\u011b\u0159uj\u00edc\u00edch porozum\u011bn\u00ed. Ot\u00e1zky mohou m\u00ed\u0159it na detail, inferenci i hlavn\u00ed my\u0161lenku.', example:'Text about London -> What is the main topic? -> A) History' }),
  'listening comprehension': Object.freeze({ summary:'Ot\u00e1zky k poslechu. Audio nebo video pou\u0161t\u00ed u\u010ditel; \u017e\u00e1k v testu pracuje s ot\u00e1zkami a odpov\u011b\u010fmi.', example:'Teacher plays the recording -> Where did she go? -> A) School' }),
  'multiple matching': Object.freeze({ summary:'P\u0159i\u0159azov\u00e1n\u00ed tvrzen\u00ed, nadpis\u016f nebo informac\u00ed k v\u00edce text\u016fm \u010di odstavc\u016fm. Vhodn\u00e9 pro skenov\u00e1n\u00ed a detailn\u00ed porozum\u011bn\u00ed.', example:'Match headings 1-5 to paragraphs A-E.' }),
  'banked cloze': Object.freeze({ summary:'Text s mezerami a z\u00e1sobn\u00edkem nab\u00edzen\u00fdch slov. \u017d\u00e1k vyb\u00edr\u00e1 spr\u00e1vnou polo\u017eku podle v\u00fdznamu a gramatiky.', example:'Bank: however / although / because -> ___ it was late, she stayed.' }),
  'cloze text': Object.freeze({ summary:'Souvisl\u00fd text s n\u011bkolika mezerami k dopln\u011bn\u00ed. Otestuje pr\u00e1ci s kontextem nap\u0159\u00ed\u010d del\u0161\u00edm textem.', example:'She ___(1) to school every ___(2). -> goes, day' }),
  'dialogue completion': Object.freeze({ summary:'Dopl\u0148ov\u00e1n\u00ed chyb\u011bj\u00edc\u00ed repliky v dialogu. Prov\u011b\u0159uje, zda \u017e\u00e1k rozum\u00ed komunika\u010dn\u00ed situaci a n\u00e1vaznosti replik.', example:'A: What did you do? B: ___ -> I went shopping.' }),
  'categorization': Object.freeze({ summary:'\u017d\u00e1k za\u0159azuje polo\u017eky do spr\u00e1vn\u00fdch kategori\u00ed podle informac\u00ed z textu nebo zad\u00e1n\u00ed.', example:'Statements -> causes / effects / solutions' }),
  'ordering': Object.freeze({ summary:'Se\u0159azen\u00ed v\u011bt, krok\u016f nebo ud\u00e1lost\u00ed do spr\u00e1vn\u00e9ho po\u0159ad\u00ed. Vhodn\u00e9 pro logiku textu, chronologii i postup.', example:'Order the recipe: add eggs -> add milk -> bake -> serve' }),
  'highlight-evidence': Object.freeze({ summary:'\u017d\u00e1k vybere konkr\u00e9tn\u00ed v\u011btu nebo \u010d\u00e1st textu jako d\u016fkaz sv\u00e9 odpov\u011bdi. Nut\u00ed op\u00edrat odpov\u011b\u010f o text.', example:'Which sentence explains why Mark was late? -> He missed the bus.' }),
  'heading matching': Object.freeze({ summary:'P\u0159i\u0159azen\u00ed nejvhodn\u011bj\u0161\u00edho nadpisu k odstavci. Zam\u011b\u0159uje se hlavn\u011b na hlavn\u00ed my\u0161lenku, ne jednotliv\u00e9 detaily.', example:'Paragraph about weather patterns -> Climate' }),
  'gist question': Object.freeze({ summary:'Ot\u00e1zka na celkovou hlavn\u00ed my\u0161lenku textu nebo poslechu. U\u017eite\u010dn\u00e9 pro glob\u00e1ln\u00ed porozum\u011bn\u00ed.', example:'What is the text mainly about? -> A) Recycling' }),
  'summary cloze': Object.freeze({ summary:'\u017d\u00e1k dopl\u0148uje mezery ve stru\u010dn\u00e9m shrnut\u00ed p\u016fvodn\u00edho textu. Spojuje porozum\u011bn\u00ed s p\u0159esnou prac\u00ed s informacemi.', example:'The author argues that ___ helps the ___. -> reading, brain' })
});

let exerciseTypeHelpAnchor = null;
let exerciseTypeHelpHideTimer = 0;
let exerciseTypeHelpBound = false;

function exerciseTypeHelpNodes(){
  return {
    pop: document.getElementById('exerciseTypePopover'),
    cat: document.getElementById('exerciseTypePopoverCat'),
    title: document.getElementById('exerciseTypePopoverTitle'),
    desc: document.getElementById('exerciseTypePopoverDesc'),
    example: document.getElementById('exerciseTypePopoverExample')
  };
}
function cancelExerciseTypeHelpHide(){
  if (exerciseTypeHelpHideTimer) window.clearTimeout(exerciseTypeHelpHideTimer);
  exerciseTypeHelpHideTimer = 0;
}
function scheduleExerciseTypeHelpHide(delay){
  cancelExerciseTypeHelpHide();
  exerciseTypeHelpHideTimer = window.setTimeout(hideExerciseTypeHelp, Number.isFinite(delay) ? delay : 120);
}
function positionExerciseTypeHelp(anchor){
  const n = exerciseTypeHelpNodes();
  if (!n.pop || !anchor) return;
  const a = anchor.getBoundingClientRect();
  const p = n.pop.getBoundingClientRect();
  const margin = 12;
  const gap = 10;
  let left = a.left + (a.width / 2) - (p.width / 2);
  left = Math.max(margin, Math.min(left, window.innerWidth - p.width - margin));
  let top = a.bottom + gap;
  if (top + p.height > window.innerHeight - margin && a.top - p.height - gap >= margin) {
    top = a.top - p.height - gap;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - p.height - margin));
  n.pop.style.left = Math.round(left) + 'px';
  n.pop.style.top = Math.round(top) + 'px';
}
function showExerciseTypeHelp(anchor){
  cancelExerciseTypeHelpHide();
  const btn = anchor?.classList?.contains('exercise-type-btn') ? anchor : anchor?.querySelector?.('.exercise-type-btn');
  const type = btn?.dataset?.val || '';
  const help = EXERCISE_TYPE_HELP[type];
  const n = exerciseTypeHelpNodes();
  if (!btn || !help || !n.pop) return;
  if (exerciseTypeHelpAnchor && exerciseTypeHelpAnchor !== btn) exerciseTypeHelpAnchor.removeAttribute('aria-describedby');
  exerciseTypeHelpAnchor = btn;
  const fn = typeof pedagogyOf === 'function' ? pedagogyOf(type) : 'other';
  const category = (typeof PEDAGOGY_FN !== 'undefined' && PEDAGOGY_FN[fn]) ? PEDAGOGY_FN[fn].label : 'Typ cviceni';
  if (n.cat) n.cat.textContent = category;
  if (n.title) n.title.textContent = type;
  if (n.desc) n.desc.textContent = help.summary;
  if (n.example) n.example.textContent = help.example;
  btn.setAttribute('aria-describedby', 'exerciseTypePopover');
  n.pop.dataset.openFor = type;
  n.pop.style.visibility = 'hidden';
  n.pop.classList.remove('hidden');
  n.pop.setAttribute('aria-hidden', 'false');
  positionExerciseTypeHelp(btn.closest('.exercise-type-wrap') || btn);
  n.pop.style.visibility = 'visible';
}
function hideExerciseTypeHelp(){
  cancelExerciseTypeHelpHide();
  const n = exerciseTypeHelpNodes();
  if (exerciseTypeHelpAnchor) exerciseTypeHelpAnchor.removeAttribute('aria-describedby');
  exerciseTypeHelpAnchor = null;
  if (!n.pop) return;
  n.pop.classList.add('hidden');
  n.pop.setAttribute('aria-hidden', 'true');
  n.pop.style.visibility = '';
  delete n.pop.dataset.openFor;
}
function initExerciseTypeHelp(){
  const n = exerciseTypeHelpNodes();
  const root = document.getElementById('typyBtns');
  if (!root || !n.pop) return;

  root.querySelectorAll('.type-group').forEach(function(group){
    const head = group.querySelector('.type-group-head');
    if (head && !head.querySelector('.type-group-count')) {
      const count = group.querySelectorAll('.tag-btn[data-val]').length;
      const badge = document.createElement('span');
      badge.className = 'type-group-count';
      badge.textContent = String(count) + (count === 1 ? ' typ' : (count >= 2 && count <= 4 ? ' typy' : ' typ\u016f'));
      head.appendChild(badge);
    }
  });

  root.querySelectorAll('.tag-btn[data-val]').forEach(function(btn){
    const type = btn.dataset.val || '';
    btn.classList.add('exercise-type-btn');
    if (!EXERCISE_TYPE_HELP[type]) {
      btn.classList.add('exercise-type-help-missing');
      return;
    }
    if (btn.parentElement?.classList?.contains('exercise-type-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'exercise-type-wrap';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'exercise-type-info';
    info.textContent = 'i';
    info.setAttribute('aria-label', 'Zobrazit popis typu cvi\u010den\u00ed ' + type);
    info.setAttribute('title', 'Popis a p\u0159\u00edklad');
    wrap.appendChild(info);

    wrap.addEventListener('mouseenter', function(){ showExerciseTypeHelp(btn); });
    wrap.addEventListener('mouseleave', function(){ scheduleExerciseTypeHelpHide(130); });
    btn.addEventListener('focus', function(){
      try { if (btn.matches(':focus-visible')) showExerciseTypeHelp(btn); } catch(_) { showExerciseTypeHelp(btn); }
    });
    btn.addEventListener('blur', function(){ scheduleExerciseTypeHelpHide(130); });
    info.addEventListener('focus', function(){ showExerciseTypeHelp(btn); });
    info.addEventListener('blur', function(){ scheduleExerciseTypeHelpHide(130); });
    info.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      showExerciseTypeHelp(btn);
    });
  });

  if (!exerciseTypeHelpBound) {
    exerciseTypeHelpBound = true;
    n.pop.addEventListener('mouseenter', cancelExerciseTypeHelpHide);
    n.pop.addEventListener('mouseleave', function(){ scheduleExerciseTypeHelpHide(100); });
    document.addEventListener('pointerdown', function(ev){
      const target = ev.target;
      if (target?.closest?.('.exercise-type-wrap') || target?.closest?.('#exerciseTypePopover')) return;
      hideExerciseTypeHelp();
    }, true);
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') hideExerciseTypeHelp(); });
    window.addEventListener('resize', hideExerciseTypeHelp);
    window.addEventListener('scroll', hideExerciseTypeHelp, true);
  }
}
