
(function(){
  'use strict';
  const CS_STYLE_ID = 'csModuleStyleV16';
  const CS_STEP0_ID = 'csModuleStep0';
  const CS_STEP1_ID = 'csModuleStep1';
  const CS_STEP2_ID = 'csModuleStep2';
  const CS_INTRO_ID = 'csModuleIntro';

  const CS_STAGE = {
    prima:{label:'prima', short:'1. ročník osmiletého gymnázia', level:'B1', hint:'jednodušší formulace, konkrétní jevy, kratší věty'},
    sekunda:{label:'sekunda', short:'2. ročník osmiletého gymnázia', level:'B1', hint:'konkrétní jazykové jevy, přiměřené zadání'},
    tercie:{label:'tercie', short:'3. ročník osmiletého gymnázia', level:'B1', hint:'standardní školní terminologie, kratší rozbory'},
    kvarta:{label:'kvarta', short:'4. ročník osmiletého gymnázia', level:'B2', hint:'náročnější pravopis, skladba a práce s textem'},
    kvinta:{label:'kvinta / 1. ročník', short:'1. ročník SŠ', level:'B2', hint:'středoškolská terminologie, systematické opakování'},
    sexta:{label:'sexta / 2. ročník', short:'2. ročník SŠ', level:'B2', hint:'standardní středoškolská náročnost'},
    septima:{label:'septima / 3. ročník', short:'3. ročník SŠ', level:'C1', hint:'vyšší náročnost, kombinované jevy, práce s textem'},
    oktava:{label:'oktáva / 4. ročník', short:'4. ročník SŠ', level:'C1', hint:'maturitní ročník, kombinované jazykové opakování'},
    custom:{label:'vlastní skupina', short:'učitel upřesní', level:'B2', hint:'použije se upřesnění učitele'}
  };

  const CS_DIFFICULTY = {
    zakladni:{label:'Základní', icon:'🟢', hint:'kratší zadání, méně kombinovaných jevů, jasné odpovědi', prompt:'drž úlohy jednodušší, s oporou v kontextu; vyhni se chytákům a kombinaci více jevů v jedné položce', itemAdjust:-2},
    standardni:{label:'Standardní', icon:'🔵', hint:'běžná školní náročnost pro daný ročník', prompt:'použij běžnou školní náročnost pro vybraný ročník; zadání má být jasné, ale ne zjednodušené', itemAdjust:0},
    narocnejsi:{label:'Náročnější', icon:'🟠', hint:'více kombinovaných jevů, přesnější terminologie, náročnější distraktory', prompt:'zařaď náročnější formulace, kombinaci blízkých jevů a kvalitní distraktory; stále musí existovat jednoznačný klíč', itemAdjust:1},
    maturitni:{label:'Maturitní', icon:'🎓', hint:'jazykové opakování a práce s textem v maturitní náročnosti', prompt:'směřuj k maturitnímu opakování: kombinuj pravopis, skladbu, práci s textem, stylistiku a přesnou terminologii; nehodnoť sloh ani interpretaci čistě automaticky', itemAdjust:2},
    prijimacky:{label:'Přijímačkové', icon:'🎯', hint:'typ úloh a tempo blízké přijímacím zkouškám', prompt:'směřuj k přijímačkovému procvičování: krátké jasné položky, důraz na pravopis, skladbu, porozumění textu, slovní zásobu a práci s informací', itemAdjust:2}
  };

  const CS_DOMAINS = {
    pravopis:{label:'Pravopis', icon:'✍️', hint:'i/y, s/z/vz, mě/mně, bě/pě/vě, velká písmena, shoda', phenomena:['i/y po obojetných souhláskách','koncovky podstatných a přídavných jmen','shoda přísudku s podmětem','s/z/vz','mě/mně','bě/pě/vě/mě','velká písmena','pravopis přejatých slov','kombinovaný pravopis']},
    tvaroslovi:{label:'Tvarosloví', icon:'🧩', hint:'slovní druhy, pády, vzory, mluvnické kategorie, tvary slov', phenomena:['slovní druhy','pády','vzory podstatných jmen','mluvnické kategorie jmen','mluvnické kategorie sloves','stupňování přídavných jmen a příslovcí','zájmena a číslovky','správné tvary slov']},
    skladba:{label:'Skladba', icon:'🏗️', hint:'větné členy, druhy vět vedlejších, souvětí, interpunkce', phenomena:['podmět a přísudek','větné členy','druhy vedlejších vět','poměry mezi větami hlavními','souvětí souřadné a podřadné','interpunkce v souvětí','přístavek, oslovení, vsuvka']},
    text:{label:'Práce s textem', icon:'📖', hint:'porozumění, hlavní myšlenka, informace, význam slov v kontextu', phenomena:['hlavní myšlenka textu','vyhledání informace','pravda/nepravda podle textu','význam slova v kontextu','vhodný nadpis','seřazení informací','autorův záměr','jazykové prostředky v textu']},
    slovni_zasoba:{label:'Slovní zásoba a význam slov', icon:'🗣️', hint:'synonyma, antonyma, mnohoznačnost, odborné výrazy, frazémy', phenomena:['synonyma','antonyma','slova mnohoznačná','význam slova v kontextu','odborné výrazy a termíny','frazémy a ustálená slovní spojení','slova citově zabarvená','slova nadřazená, podřazená a souřadná','archaismy, historismy, neologismy','slovní zásoba v publicistickém nebo odborném textu']},
    stylistika:{label:'Stylistika', icon:'🎭', hint:'vhodnost vyjádření, stylové vrstvy, úprava formulace', phenomena:['formální a neformální styl','vhodnost formulace','nahrazení hovorového výrazu','úprava nevhodné věty','komunikační záměr','slohové útvary jako uzavřené rozpoznávání','koherence a návaznost textu']},
    literatura:{label:'Literární teorie', icon:'📚', hint:'pojmy, žánry, tropy a figury, vypravěč, kompozice', phenomena:['literární druhy','literární žánry','tropy a figury','vypravěč','kompozice','rým a rytmus','charakteristika postavy','základní pojmy literární teorie']},
    kombinovane:{label:'Kombinovaný test', icon:'🧪', hint:'smíšené opakování více oblastí českého jazyka', phenomena:['kombinované opakování ČJ','maturitní jazykové opakování','přijímačkové opakování ČJ','diagnostický mix ročníku']}
  };

  const CS_EXERCISES = {
    cs_spell_choice:{label:'Vyber pravopisně správnou variantu', tech:'multiple choice', review:'auto', domains:['pravopis'], desc:'bezpečné pro známkování; přesný klíč'},
    cs_spell_blank:{label:'Doplň přesný pravopisný tvar', tech:'fill-in-the-blank', review:'auto', domains:['pravopis','tvaroslovi'], desc:'jen u jednoznačného tvaru; diakritika se netoleruje automaticky'},
    cs_error_correction:{label:'Najdi a oprav chybu', tech:'error correction', review:'semi', domains:['pravopis','tvaroslovi','skladba','stylistika'], desc:'AI může navrhnout uznatelné alternativy; učitel je schválí před ostrým použitím'},
    cs_word_class:{label:'Urči slovní druh / kategorii', tech:'categorization', review:'auto', domains:['tvaroslovi'], desc:'slovní druhy a mluvnické kategorie'},
    cs_grammar_board:{label:'Roztřiď pojmy nebo tvary do kategorií', tech:'categorization', review:'auto', domains:['tvaroslovi','skladba','literatura'], desc:'třídění slov, pádů, žánrů nebo pojmů'},
    cs_matching_terms:{label:'Přiřaď pojem a příklad', tech:'matching', review:'auto', domains:['tvaroslovi','skladba','literatura'], desc:'pojem - definice - ukázka'},
    cs_syntax_mc:{label:'Vyber správný rozbor věty', tech:'multiple choice', review:'auto', domains:['skladba'], desc:'bezpečnější než volný větný rozbor'},
    cs_sentence_member:{label:'Urči větný člen / druh vedlejší věty', tech:'categorization', review:'auto', domains:['skladba'], desc:'uzavřená klasifikace skladebních jevů'},
    cs_punctuation_choice:{label:'Vyber správnou interpunkční variantu', tech:'multiple choice', review:'auto', domains:['skladba','pravopis'], desc:'uzavřené varianty s pevným klíčem; vhodné pro automatické opravení po kontrole klíče'},
    cs_punctuation_blank:{label:'Doplň čárky do souvětí', tech:'fill-in-the-blank', review:'semi', domains:['skladba','pravopis'], desc:'čárky do očíslovaných míst přes podporovaný formát ___ / answers[]; klíč schvaluje učitel'},
    cs_punctuation_correction:{label:'Oprav interpunkci v textu', tech:'error correction', review:'manual', domains:['skladba','pravopis','stylistika'], desc:'otevřená oprava interpunkce v delším textu; konečné hodnocení patří učiteli'},
    cs_text_mc:{label:'Otázky k textu s výběrem odpovědi', tech:'reading comprehension', review:'auto', domains:['text'], desc:'hlavní myšlenka, informace, význam v kontextu'},
    cs_text_tf:{label:'Tvrzení podle textu', tech:'true/false', review:'auto', domains:['text'], desc:'rychlá kontrola porozumění'},
    cs_text_evidence:{label:'Vyber důkaz v textu', tech:'highlight-evidence', review:'semi', domains:['text'], desc:'žák vybírá větu, která dokládá odpověď'},
    cs_ordering:{label:'Seřaď informace podle textu', tech:'ordering', review:'auto', domains:['text','literatura'], desc:'řazení událostí, kroků nebo argumentů'},
    cs_synonym_choice:{label:'Vyber vhodné synonymum', tech:'multiple choice', review:'auto', domains:['slovni_zasoba','text'], desc:'významově nejbližší slovo podle věty nebo krátkého kontextu'},
    cs_antonym_choice:{label:'Vyber vhodné antonymum', tech:'multiple choice', review:'auto', domains:['slovni_zasoba'], desc:'protikladné významy slov s jednoznačným klíčem'},
    cs_phraseology_matching:{label:'Přiřaď frazém k významu', tech:'matching', review:'auto', domains:['slovni_zasoba'], desc:'ustálená slovní spojení, přísloví a rčení s definicí nebo situací'},
    cs_polysemy_context:{label:'Urči význam mnohoznačného slova v kontextu', tech:'reading comprehension', review:'auto', domains:['slovni_zasoba','text'], desc:'význam slova podle konkrétní věty nebo krátkého úryvku'},
    cs_term_definition:{label:'Přiřaď odborný výraz k definici', tech:'matching', review:'auto', domains:['slovni_zasoba'], desc:'termíny, odborné výrazy a jejich přesné definice'},
    cs_style_choice:{label:'Vyber stylisticky vhodnější formulaci', tech:'multiple choice', review:'semi', domains:['stylistika'], desc:'AI navrhne klíč a přijatelné varianty; učitel je schválí'},
    cs_style_correction:{label:'Uprav stylisticky nevhodnou větu', tech:'error correction', review:'manual', domains:['stylistika'], desc:'AI navrhne možné řešení a alternativy; učitel rozhodne, co uznat'},
    cs_lit_terms:{label:'Literární pojem - definice / ukázka', tech:'matching', review:'auto', domains:['literatura'], desc:'pojmy, žánry, tropy a figury'},
    cs_lit_choice:{label:'Rozpoznej literární jev v ukázce', tech:'multiple choice', review:'semi', domains:['literatura'], desc:'uzavřená literární teorie, ne volná interpretace'}
  };

  const CS_DOMAIN_DEFAULT_EX = {
    pravopis:['cs_spell_choice','cs_spell_blank'],
    tvaroslovi:['cs_word_class','cs_grammar_board','cs_matching_terms'],
    skladba:['cs_syntax_mc','cs_sentence_member','cs_punctuation_choice'],
    text:['cs_text_mc','cs_text_tf','cs_text_evidence'],
    slovni_zasoba:['cs_synonym_choice','cs_antonym_choice','cs_phraseology_matching','cs_polysemy_context','cs_term_definition'],
    stylistika:['cs_style_choice','cs_style_correction','cs_text_mc'],
    literatura:['cs_lit_terms','cs_lit_choice','cs_grammar_board'],
    kombinovane:['cs_spell_choice','cs_word_class','cs_syntax_mc','cs_text_mc','cs_synonym_choice']
  };

  const CS_PRESETS = {
    pravopis_rychle:{label:'Rychlý pravopisný test', icon:'✍️', domain:'pravopis', phenomenon:'kombinovaný pravopis', goal:'practice', correctionMode:'auto', difficulty:'zakladni', exercises:['cs_spell_choice','cs_spell_blank'], pocet:3, body:20, cas:12, resultMode:'instant', feedbackMode:'learning', desc:'krátké automatické procvičení nebo pětiminutovka'},
    pravopis_oprava_chyb:{label:'Pravopis - oprava chyb', icon:'🔎', domain:'pravopis', phenomenon:'oprava pravopisných chyb', goal:'practice', correctionMode:'semi', difficulty:'standardni', exercises:['cs_error_correction','cs_spell_choice'], pocet:2, body:20, cas:15, resultMode:'instant', feedbackMode:'learning', desc:'žák hledá a opravuje chyby; klíč schvaluje učitel'},
    mluvnice:{label:'Mluvnice a tvarosloví', icon:'🧩', domain:'tvaroslovi', phenomenon:'slovní druhy', goal:'graded', correctionMode:'auto', difficulty:'standardni', exercises:['cs_word_class','cs_grammar_board','cs_matching_terms'], pocet:3, body:30, cas:25, resultMode:'secureOffline', feedbackMode:'none', desc:'slovní druhy, pády, vzory, kategorie'},
    skladba:{label:'Skladba', icon:'🏗️', domain:'skladba', phenomenon:'druhy vedlejších vět', goal:'graded', correctionMode:'auto', difficulty:'standardni', exercises:['cs_syntax_mc','cs_sentence_member','cs_punctuation_choice'], pocet:3, body:30, cas:25, resultMode:'secureOffline', feedbackMode:'none', desc:'uzavřené skladební úlohy a výběr interpunkční varianty'},
    interpunkce:{label:'Interpunkce - výběr variant', icon:'、', domain:'skladba', phenomenon:'interpunkce v souvětí', goal:'practice', correctionMode:'auto', difficulty:'standardni', exercises:['cs_punctuation_choice'], pocet:2, body:20, cas:12, resultMode:'instant', feedbackMode:'learning', desc:'bezpečné procvičení čárek přes pevné možnosti'},
    interpunkce_doplneni:{label:'Interpunkce - doplň čárky', icon:'✒️', domain:'skladba', phenomenon:'interpunkce v souvětí', goal:'practice', correctionMode:'semi', difficulty:'standardni', exercises:['cs_punctuation_blank'], pocet:2, body:20, cas:15, resultMode:'instant', feedbackMode:'learning', desc:'doplňování čárek do očíslovaných míst; klíč schvaluje učitel'},
    interpunkce_oprava:{label:'Interpunkce - oprava textu', icon:'📝', domain:'skladba', phenomenon:'interpunkce v souvětí', goal:'practice', correctionMode:'manual', difficulty:'narocnejsi', exercises:['cs_punctuation_correction'], pocet:1, body:20, cas:18, resultMode:'instant', feedbackMode:'learning', desc:'otevřená oprava interpunkce v textu; hodnotí učitel'},
    text:{label:'Práce s textem', icon:'📖', domain:'text', phenomenon:'hlavní myšlenka textu', goal:'diagnostic', correctionMode:'auto', difficulty:'standardni', exercises:['cs_text_mc','cs_text_tf','cs_text_evidence'], pocet:3, body:24, cas:30, resultMode:'instant', feedbackMode:'learning', desc:'čtenářská gramotnost a porozumění'},
    slovni_zasoba:{label:'Slovní zásoba a význam slov', icon:'🗣️', domain:'slovni_zasoba', phenomenon:'synonyma', goal:'practice', correctionMode:'auto', difficulty:'standardni', exercises:['cs_synonym_choice','cs_antonym_choice','cs_phraseology_matching','cs_polysemy_context','cs_term_definition'], pocet:3, body:24, cas:18, resultMode:'instant', feedbackMode:'learning', desc:'synonyma, antonyma, frazémy, termíny a význam slov v kontextu'},
    stylistika:{label:'Stylistika', icon:'🎭', domain:'stylistika', phenomenon:'vhodnost formulace', goal:'practice', correctionMode:'semi', difficulty:'narocnejsi', exercises:['cs_style_choice','cs_style_correction','cs_text_mc'], pocet:3, body:24, cas:25, resultMode:'instant', feedbackMode:'learning', desc:'vhodnost formulací s kontrolou učitele'},
    literatura:{label:'Literární teorie', icon:'📚', domain:'literatura', phenomenon:'tropy a figury', goal:'practice', correctionMode:'semi', difficulty:'standardni', exercises:['cs_lit_terms','cs_lit_choice','cs_grammar_board'], pocet:3, body:24, cas:20, resultMode:'instant', feedbackMode:'learning', desc:'pojmy, žánry, tropy a figury'},
    prijimacky:{label:'Přijímačkové procvičování', icon:'🎯', domain:'kombinovane', phenomenon:'přijímačkové opakování ČJ', goal:'practice', correctionMode:'auto', difficulty:'prijimacky', exercises:['cs_spell_choice','cs_text_mc','cs_text_tf','cs_syntax_mc','cs_synonym_choice'], pocet:5, body:50, cas:40, resultMode:'instant', feedbackMode:'learning', stage:'kvarta', desc:'pravopis, skladba, práce s textem a slovní zásoba ve stylu přijímacích zkoušek'},
    maturita:{label:'Maturitní jazykové opakování', icon:'🎓', domain:'kombinovane', phenomenon:'maturitní jazykové opakování', goal:'graded', correctionMode:'semi', difficulty:'maturitni', exercises:['cs_spell_choice','cs_syntax_mc','cs_text_mc','cs_style_choice'], pocet:4, body:40, cas:35, resultMode:'secureOffline', feedbackMode:'none', stage:'oktava', desc:'pravopis, skladba, text, stylistika'}
  };

  const CS_DEFAULT = {
    stage:'sexta', stageCustom:'', domain:'pravopis', phenomenon:'kombinovaný pravopis', phenomenonCustom:'',
    difficulty:'standardni', goal:'practice', correctionMode:'auto', preset:'', exerciseTypes:['cs_spell_choice','cs_spell_blank'],
    csPage:0,
    checks:{diacritics:true, punctuation:false, capitalization:true, exactShape:true}
  };

  const CS_TEACHER_QUESTIONS = [
    'U pravopisných úloh: má se odpověď bez diakritiky vždy hodnotit jako chyba, pokud je cílem pravopis?',
    'U velkých písmen: máme hodnotit rozdíl Praha/praha vždy, nebo jen tehdy, když jsou velká písmena přímo cílem úlohy?',
    'U interpunkce: má jít jen o automatický výběr správné varianty, nebo také o poloautomatické doplňování čárek / ruční opravu textu?',
    'U skladby: které typy vět nebo větných členů jsou pro automatické hodnocení bezpečné a které už vyžadují učitelskou kontrolu?',
    'U slovní zásoby: mají být frazémy, odborné výrazy a mnohoznačná slova hodnocené jen přes výběr/přiřazování, nebo připouštíme i krátké otevřené odpovědi po schválení alternativ?',
    'U oprav chyb: má AI navrhovat více přijatelných oprav a učitel jen schválit, které se budou uznávat?',
    'U stylistiky: které úlohy jsou vhodné jako výběr z možností a které mají zůstat jen jako ruční hodnocení?',
    'U literární teorie: co lze ověřovat uzavřenou otázkou a co už je interpretace, kterou má hodnotit učitel?',
    'U maturitního opakování: má být bodování pouze správně/špatně, nebo u některých úloh připouštíme částečné body?',
    'U alternativních odpovědí: stačí AI návrh + druhý průchod AI + schválení učitelem jako postup pro téměř automatické hodnocení?',
    'Které typické odpovědi žáků máme vždy uznávat jako rovnocenné alternativy?'
  ];

  function csClone(o){ return JSON.parse(JSON.stringify(o)); }
  function csEsc(s){ try { return esc(String(s == null ? '' : s)); } catch(_) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); } }
  function csTip(text){ return '<span class="tt-icon cs-tt" role="button" tabindex="0" data-tip="'+csEsc(text)+'" aria-label="Nápověda">?</span>'; }
  function csTitle(text, tip){ return '<div class="cs-section-title">'+csEsc(text)+(tip ? csTip(tip) : '')+'</div>'; }
  const CS_SECTION_TIPS = {
    intro:'Český modul je samostatná větev. Základní informace zůstávají stejné jako u ostatních jazyků, ale čeština má vlastní nastavení učiva, opravování a přísnosti hodnocení.',
    stage:'Vyber ročník nebo skupinu, pro kterou test připravuješ. Generátor podle toho upraví věkovou přiměřenost, terminologii a délku úloh. Není to totéž jako jazyková úroveň A1–C2.',
    difficulty:'Samostatná didaktická obtížnost. Ročník říká, pro koho test je; obtížnost říká, jak náročné mají být položky v rámci daného ročníku.',
    domain:'Vyber hlavní oblast učiva. Tady říkáš, co se žáci mají učit: pravopis, tvarosloví, skladbu, práci s textem, slovní zásobu, stylistiku nebo literaturu.',
    phenomenon:'Zpřesni konkrétní jev v dané oblasti. Například u pravopisu shodu přísudku s podmětem, u skladby druhy vedlejších vět. Čím přesnější jev, tím přesnější test.',
    goal:'Určuje použití výsledku. Procvičování může ukazovat více vysvětlení, diagnostika pomáhá najít slabá místa, známkovaný test zapíná přísnější a bezpečnější nastavení.',
    correction:'Určuje, kdo rozhoduje o bodech. U jednoznačných úloh může opravovat generátor, u spornějších úloh AI navrhne alternativy a učitel je schválí, u slohu a interpretace hodnotí učitel ručně.',
    checks:'Nastavuje, co se má při porovnávání odpovědi brát jako chyba. U pravopisu se obvykle hlídají háčky/čárky, přesný tvar a případně velká písmena nebo interpunkce.',
    presets:'Šablony rychle nastaví typický češtinářský test. Po výběru je můžeš dál upravit ručně.',
    exerciseForm:'Tady nevybíráš učivo, ale podobu otázky: co bude žák fyzicky dělat v testu. Například vybere správnou variantu, doplní tvar, přiřadí pojem nebo opraví chybu.',
    principles:'Bezpečnostní pravidla pro češtinu. Připomínají, které úlohy lze opravovat automaticky a kde je nutná kontrola učitele.',
    verification:'Pomocný blok pro kontrolu českého bodování a pro otázky na kolegu češtináře. Není určený pro žáky.'
  };
  const CS_CHECK_TIPS = {
    diacritics:'Když je zapnuto, byt a být nejsou totéž. Vhodné hlavně pro pravopis a tvarosloví. Vypínej jen u úloh, kde háčky a čárky nejsou cílem.',
    punctuation:'Když je zapnuto, chybějící čárka, tečka nebo jiná interpunkce se počítá jako chyba. Používej hlavně u interpunkčních úloh; u jiných typů může být zbytečně přísné.',
    capitalization:'Když je zapnuto, Praha a praha nejsou totéž. Vhodné pro velká písmena, vlastní jména a názvy. U běžných významových odpovědí může být vypnuto.',
    exactShape:'Když je zapnuto, žák musí napsat přesný požadovaný tvar. Vhodné pro pády, vzory, koncovky, slovesné tvary a pravopisné doplňování.'
  };
  function csIsActive(st){ st = st || state; return String(st && st.jazyk || '').toLowerCase() === 'čeština'; }
  function csEnsureState(st){
    st = st || state;
    if (!st.csModule || typeof st.csModule !== 'object') st.csModule = csClone(CS_DEFAULT);
    const d = CS_DEFAULT;
    Object.keys(d).forEach(k => { if (typeof st.csModule[k] === 'undefined') st.csModule[k] = csClone(d[k]); });
    if (!st.csModule.checks || typeof st.csModule.checks !== 'object') st.csModule.checks = csClone(d.checks);
    Object.keys(d.checks).forEach(k => { if (typeof st.csModule.checks[k] === 'undefined') st.csModule.checks[k] = d.checks[k]; });
    if (!Array.isArray(st.csModule.exerciseTypes) || !st.csModule.exerciseTypes.length) st.csModule.exerciseTypes = csClone(CS_DOMAIN_DEFAULT_EX[st.csModule.domain] || d.exerciseTypes);
    if (!CS_DOMAINS[st.csModule.domain]) st.csModule.domain = 'pravopis';
    if (!CS_STAGE[st.csModule.stage]) st.csModule.stage = 'sexta';
    if (!CS_DIFFICULTY[st.csModule.difficulty]) st.csModule.difficulty = 'standardni';
    st.csModule.csPage = Math.max(0, Math.min(2, parseInt(st.csModule.csPage || 0, 10) || 0));
    return st.csModule;
  }
  function csModule(){ return csEnsureState(state); }
  function csStageLabel(m){ m = m || csModule(); return m.stage === 'custom' ? (m.stageCustom || 'vlastní skupina') : (CS_STAGE[m.stage] ? CS_STAGE[m.stage].label + ' (' + CS_STAGE[m.stage].short + ')' : 'sexta / 2. ročník'); }
  function csDifficultyDef(m){ m = m || csModule(); return CS_DIFFICULTY[m.difficulty] || CS_DIFFICULTY.standardni; }
  function csDifficultyLabel(m){ const d = csDifficultyDef(m); return d.label + ' - ' + d.hint; }
  function csDifficultyPrompt(m){ return csDifficultyDef(m).prompt || ''; }
  function csDifficultyItemAdjust(m){ return Number(csDifficultyDef(m).itemAdjust || 0); }
  function csPhenomenonLabel(m){ m = m || csModule(); return m.phenomenon === '__custom__' ? (m.phenomenonCustom || 'vlastní jev') : (m.phenomenon || 'kombinovaný pravopis'); }
  function csExerciseList(m){ m = m || csModule(); const arr = Array.isArray(m.exerciseTypes) ? m.exerciseTypes : []; return arr.filter(k => CS_EXERCISES[k]); }
  function csTechTypes(m){ const seen = new Set(); csExerciseList(m).forEach(k => seen.add(CS_EXERCISES[k].tech)); return Array.from(seen); }
  function csTechUiLabel(t){
    const map = {
      'reading comprehension':'Práce s textem / porozumění textu',
      'highlight-evidence':'Práce s textem - výběr důkazu',
      'true/false':'Pravda / nepravda',
      'multiple choice':'Výběr z možností',
      'fill-in-the-blank':'Doplnění do mezer',
      'error correction':'Oprava chyby',
      'categorization':'Třídění do kategorií',
      'matching':'Přiřazování',
      'ordering':'Řazení'
    };
    return map[t] || t;
  }
  function csTechPromptLabel(t){
    if (t === 'reading comprehension') return 'Práce s textem / porozumění textu (interně JSON type: reading comprehension)';
    if (t === 'highlight-evidence') return 'Práce s textem - výběr důkazové věty (interně JSON type: highlight-evidence)';
    return csTechUiLabel(t);
  }
  function csTechListLabel(m){ return csTechTypes(m).map(csTechPromptLabel).join(', '); }
  function csReviewLabel(v){ return v === 'auto' ? 'generátor opraví sám' : (v === 'semi' ? 'AI navrhne alternativy, učitel schválí' : 'opravuje učitel ručně'); }
  function csCorrectionRank(v){ return v === 'manual' ? 2 : (v === 'semi' ? 1 : 0); }
  function csCorrectionFromRank(r){ return r >= 2 ? 'manual' : (r >= 1 ? 'semi' : 'auto'); }
  function csCorrectionTitle(v){ return v === 'auto' ? 'Generátor opraví sám' : (v === 'semi' ? 'AI pomůže, učitel schválí' : 'Opravuje učitel ručně'); }
  function csRecommendedCorrection(m){
    m = m || csModule();
    let rank = 0;
    const reasons = [];
    csExerciseList(m).forEach(function(k){
      const e = CS_EXERCISES[k];
      const r = csCorrectionRank(e.review);
      if (r > rank) rank = r;
      if (e.review === 'semi') reasons.push(e.label + ' má více možných správných odpovědí nebo vyžaduje schválení klíče');
      if (e.review === 'manual') reasons.push(e.label + ' není vhodné pro plně automatické známkování');
    });
    const ph = String(csPhenomenonLabel(m) || '').toLowerCase();
    if (ph.includes('interpunk') && rank < 1) { reasons.push('interpunkce je automatická jen u uzavřené volby variant; doplňování čárek a oprava textu se povýší podle typu úlohy'); }
    if ((m.domain === 'stylistika' || m.domain === 'literatura') && rank < 1) { rank = 1; reasons.push('stylistika/literatura vyžaduje kontrolu klíče nebo alternativ'); }
    if (ph.includes('interpretac') || ph.includes('úvaha') || ph.includes('uvaha') || ph.includes('sloh')) { rank = Math.max(rank, 2); reasons.push('sloh nebo interpretace musí hodnotit učitel'); }
    return {mode: csCorrectionFromRank(rank), rank: rank, reason: reasons.length ? reasons.join('; ') : 'Vybrané jevy a typy cvičení jsou vhodné pro automatické opravení po kontrole klíče.'};
  }
  function csNeedsPunctuationCheck(m){
    m = m || csModule();
    const ph = String(csPhenomenonLabel(m) || '').toLowerCase();
    if (ph.includes('interpunk')) return true;
    return csExerciseList(m).some(function(k){ return /^cs_punctuation_/.test(k); });
  }
  function csSyncCorrectionMode(m){
    m = m || csModule();
    if (!m.checks) m.checks = {};
    if (csNeedsPunctuationCheck(m)) m.checks.punctuation = true;
    const rec = csRecommendedCorrection(m);
    m.correctionRecommended = rec.mode;
    m.correctionReason = rec.reason;
    if (csCorrectionRank(m.correctionMode) < rec.rank) m.correctionMode = rec.mode;
    return rec;
  }
  function csCorrectionRecommendationText(m){ const rec = csRecommendedCorrection(m || csModule()); return 'Doporučeno pro aktuální výběr: ' + csCorrectionTitle(rec.mode) + '. ' + rec.reason; }
  function csSafetySummary(m){ m=m||csModule(); const rec=csRecommendedCorrection(m); const list=csExerciseList(m), risks=[]; list.forEach(function(k){ const e=CS_EXERCISES[k]; if(e.review==='semi') risks.push(e.label+' = AI navrhne alternativy a učitel schválí klíč'); if(e.review==='manual') risks.push(e.label+' = ruční hodnocení'); }); if(!risks.length) return 'Doporučeno: '+csCorrectionTitle(rec.mode)+'. Vybraná cvičení jsou koncipovaná jako automaticky opravitelná. Před ostrým použitím přesto zkontroluj klíč.'; return 'Doporučeno: '+csCorrectionTitle(rec.mode)+'. Pozor: '+risks.join('; ')+'. Po schválení alternativ a ověření klíče druhým průchodem může vyhodnocení běžet téměř automaticky; pro známkování použij bezpečný offline režim.'; }
  function csApplyCoreState(){
    if (!csIsActive()) return;
    const m = csEnsureState(state);
    csSyncCorrectionMode(m);
    const stage = CS_STAGE[m.stage] || CS_STAGE.sexta;
    state.instrJazyk = 'cs';
    // Interní CEFR hodnota zůstává jen jako technická kompatibilita se staršími částmi generátoru.
    // Český modul ji v AI promptu a exportu nahrazuje školním stupněm/ročníkem.
    state.uroven = [stage.level || 'B2'];
    state.kombinovat = false;
    state.ageGroup = (m.stage === 'prima' || m.stage === 'sekunda' || m.stage === 'tercie' || m.stage === 'kvarta') ? 'lower' : (m.stage === 'oktava' ? 'maturita' : 'upper');
    state.ageGroupCustom = m.stage === 'custom' ? (m.stageCustom || '') : '';
    state.testPurpose = 'Český jazyk - ' + (CS_DOMAINS[m.domain] ? CS_DOMAINS[m.domain].label : 'obecně') + ' - ' + csPhenomenonLabel(m) + ' - obtížnost: ' + (csDifficultyDef(m).label || 'Standardní');
    const latkaEl = document.getElementById('latka');
    if (latkaEl) latkaEl.value = state.testPurpose;
    state.csDifficulty = m.difficulty || 'standardni';
    state.csDifficultyLabel = csDifficultyLabel(m);
    state.fuzzyTolerance = 'off';
    if (typeof isSimpleMode === 'function' && isSimpleMode()) { state.appMode = 'advanced'; state.workPreset = 'advanced'; }
    if (m.correctionMode !== 'auto') { state.splitGenerate = true; state.__csSplitForced = true; }
    else if (state.__csSplitForced) { state.splitGenerate = false; delete state.__csSplitForced; }
    state.typyCviceni = csTechTypes(m);
    state.pocet = Math.max(1, csExerciseList(m).length || state.pocet || 3);
    if (!state.body || state.body <= 0) state.body = 20;
    if (!state.cas || state.cas <= 0) state.cas = 20;
    state.exerciseDetail = true;
    const exKeys = csExerciseList(m);
    const totalPts = Math.max(exKeys.length, parseInt(state.body,10) || exKeys.length * 8);
    const basePts = Math.floor(totalPts / Math.max(exKeys.length,1));
    const remPts = totalPts - basePts * Math.max(exKeys.length,1);
    state.exerciseConfig = exKeys.map(function(k,i){ const e=CS_EXERCISES[k]; const baseCount = e.tech==='reading comprehension' ? 5 : (e.tech==='matching' ? 8 : (e.tech==='ordering' ? 6 : 8)); const count = Math.max(3, baseCount + csDifficultyItemAdjust(m)); return { typ:e.tech, pocetOtazek:count, body:basePts + (i < remPts ? 1 : 0), csExerciseKey:k, csReview:e.review, csLabel:e.label, manualMode:false }; });
    state.pocet = state.exerciseConfig.length || Math.max(1,state.pocet||3);
    state.body = state.exerciseConfig.reduce(function(s,e){return s+(Number(e.body)||0);},0) || state.body;
    if (typeof setVal === 'function') { setVal('bodyCustom', state.body); setVal('casCustom', state.cas); }
    try { if (typeof renderExerciseConfig === 'function') renderExerciseConfig(); } catch(_) {}
  }

  function csInstallStyle(){
    if (document.getElementById(CS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CS_STYLE_ID;
    style.textContent = `
.cs-entry-box{width:min(880px,calc(100vw - 32px));max-height:calc(100vh - 32px)}.cs-entry-box .ui-modal-head{font-size:22px;padding:24px 28px 12px}.cs-entry-box .ui-modal-body{font-size:16px;line-height:1.75;padding:0 28px 20px}.cs-entry-box .ui-modal-actions{padding:18px 28px 26px;gap:12px}.cs-entry-box .ui-modal-btn{font-size:15px;min-height:48px;padding:12px 18px}.cs-entry-box .ui-modal-btn.primary{min-width:210px}@media(max-width:560px){.cs-entry-box{width:min(96vw,100%)}.cs-entry-box .ui-modal-head{font-size:18px;padding:18px 18px 10px}.cs-entry-box .ui-modal-body{font-size:14px;padding:0 18px 14px}.cs-entry-box .ui-modal-actions{padding:14px 18px 18px}}.cs-module-intro{background:var(--acc-d);border:1.5px solid var(--acc-b);border-radius:12px;padding:11px 13px;margin:12px 0;color:var(--t3);font-size:13px;line-height:1.55}.cs-module-intro.hidden{display:none!important}.cs-module-intro b{color:var(--acc)}.cs-module-panel{background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(17,69,126,.10));border:1.5px solid var(--acc-b);border-radius:14px;padding:14px;margin:14px 0;box-shadow:var(--card-shadow)}
.cs-module-panel.hidden{display:none!important}.cs-module-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}.cs-module-title{font-size:15px;font-weight:800;color:var(--acc);letter-spacing:.04em;text-transform:uppercase;line-height:1.35}.cs-module-sub{font-size:13px;color:var(--t4);line-height:1.5;margin-top:3px}.cs-module-badge{display:inline-flex;align-items:center;border:1px solid var(--ok-b);background:var(--ok-d);color:var(--ok);border-radius:999px;padding:4px 9px;font-size:11.5px;font-weight:800;white-space:nowrap}.cs-section{border-top:1px dashed var(--bdr);padding-top:12px;margin-top:12px}.cs-section:first-of-type{border-top:none;padding-top:0;margin-top:0}.cs-section-title{font-size:12.5px;color:var(--t1);font-weight:800;margin-bottom:6px;letter-spacing:.03em;text-transform:uppercase;display:flex;align-items:center;gap:6px}.cs-section-title .tt-icon,.cs-check .tt-icon{width:20px;height:20px;font-size:11.5px;flex:0 0 auto}.cs-check .tt-icon{margin-left:2px}.cs-grid{display:grid;grid-template-columns:1fr;gap:8px}.cs-grid.three{grid-template-columns:1fr}.cs-grid.four{grid-template-columns:repeat(2,minmax(0,1fr))}.cs-card{position:relative;width:100%;text-align:left;border:1.5px solid var(--bdr);border-radius:11px;background:var(--bg3);color:var(--t3);padding:11px 12px;min-height:72px;cursor:pointer;font-family:Georgia,serif;transition:all .15s}.cs-card:hover{border-color:var(--acc-b);transform:translateY(-1px)}.cs-card.disabled,.cs-card:disabled{opacity:.48;cursor:not-allowed;transform:none}.cs-card.disabled:hover,.cs-card:disabled:hover{border-color:var(--bdr);transform:none}.cs-card.recommended{border-color:var(--ok-b)}.cs-card.recommended .cs-card-desc::after{content:"  • doporučeno";color:var(--ok);font-weight:800}.cs-card.active{border-color:var(--acc);background:var(--acc-d);color:var(--acc);box-shadow:0 0 0 2px var(--acc-b);padding-right:38px}.cs-card.active::after{content:'✓';position:absolute;top:8px;right:9px;width:21px;height:21px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:var(--acc);color:#0a0c14;font-size:12px;font-weight:900}.cs-card-title{display:block;color:var(--t2);font-size:13.5px;font-weight:800;line-height:1.35}.cs-card.active .cs-card-title{color:var(--acc)}.cs-card-desc{display:block;margin-top:4px;color:var(--t4);font-size:12px;line-height:1.45}.cs-field-row{display:grid;grid-template-columns:1fr;gap:9px;align-items:start}.cs-select,.cs-input{width:100%;background:var(--bg3);border:1.5px solid var(--bdr);border-radius:8px;padding:9px 11px;color:var(--t2);font-family:Georgia,serif;font-size:14px;outline:none}.cs-select:focus,.cs-input:focus{border-color:var(--acc-b)}.cs-note{font-size:12.5px;color:var(--t4);line-height:1.55;background:var(--bg3);border:1px solid var(--bdr2);border-radius:9px;padding:9px 11px;margin-top:8px}.cs-warning{font-size:12.5px;color:var(--acc);line-height:1.55;background:var(--acc-d);border:1px solid var(--acc-b);border-radius:9px;padding:9px 11px;margin-top:8px}.cs-checks{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px}.cs-check{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--bdr);background:var(--bg3);border-radius:999px;padding:7px 10px;color:var(--t3);font-size:12.5px;cursor:pointer;user-select:none}.cs-check input{width:15px;height:15px;accent-color:var(--acc)}.cs-review-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 7px;font-size:11px;font-weight:800;margin-top:7px;border:1px solid var(--bdr)}.cs-review-pill.auto{background:var(--ok-d);color:var(--ok);border-color:var(--ok-b)}.cs-review-pill.semi{background:var(--acc-d);color:var(--acc);border-color:var(--acc-b)}.cs-review-pill.manual{background:#7c3aed14;color:#a78bfa;border-color:#7c3aed66}.cs-summary-list{margin:7px 0 0 18px;color:var(--t3);font-size:12.5px;line-height:1.6}.cs-dev-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.cs-dev-report{margin-top:8px;border:1px solid var(--bdr);background:var(--bg3);border-radius:9px;padding:9px 11px;font-size:12.5px;line-height:1.55;color:var(--t3);white-space:pre-wrap}.cs-dev-report.ok{border-color:var(--ok-b);color:var(--ok);background:var(--ok-d)}.cs-dev-report.warn{border-color:var(--acc-b);color:var(--acc);background:var(--acc-d)}.cs-question-list{margin:7px 0 0 18px;color:var(--t3);font-size:12.5px;line-height:1.6}.cs-question-list li{margin-bottom:4px}.cs-subnav{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--bdr2);background:var(--bg3);border-radius:10px;padding:8px 10px;margin:0 0 12px}.cs-subnav-title{font-size:12.5px;font-weight:800;color:var(--acc)}.cs-subnav-dots{display:flex;gap:5px;align-items:center}.cs-dot{width:10px;height:10px;border-radius:999px;background:var(--bdr);display:inline-block;border:none;padding:0;cursor:pointer}.cs-dot:hover{background:var(--acc-b)}.cs-dot.active{background:var(--acc);box-shadow:0 0 0 3px var(--acc-d)}.cs-subnav-note{font-size:12px;color:var(--t4);line-height:1.45;margin-top:7px}.cs-progress-nav{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 14px;justify-content:center}.cs-progress-nav.hidden{display:none!important}.cs-progress-btn{border:1.5px solid var(--bdr);background:var(--bg3);color:var(--t3);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:800;font-family:Georgia,serif;cursor:pointer}.cs-progress-btn:hover{border-color:var(--acc-b);color:var(--acc)}.cs-progress-btn.active{border-color:var(--acc);background:var(--acc-d);color:var(--acc);box-shadow:0 0 0 2px var(--acc-b)}.cs-mini-btn{border:1px solid var(--bdr);background:transparent;color:var(--t3);border-radius:8px;padding:6px 10px;font-size:12.5px;font-family:Georgia,serif;cursor:pointer}.cs-mini-btn:hover{border-color:var(--acc-b);color:var(--acc)}.cs-exercise-section{border:1.5px solid var(--acc-b);background:linear-gradient(135deg,var(--acc-d),rgba(17,69,126,.08));border-radius:13px;padding:13px;margin-top:14px}.cs-exercise-section>.cs-section-title{font-size:15.5px;color:var(--acc);letter-spacing:.055em;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--acc-b)}.cs-exercise-section .cs-note{background:var(--bg2)}.cs-exercise-groups{display:flex;flex-direction:column;gap:12px}.cs-exercise-group{border:1px solid var(--bdr2);background:var(--bg2);border-radius:12px;padding:11px 12px;margin-top:0}.cs-exercise-group>.cs-section-title{font-size:12px;color:var(--t3);letter-spacing:.045em;margin-bottom:8px;padding:0 0 7px;border-bottom:1px dashed var(--bdr);text-transform:uppercase}.cs-exercise-group.auto{border-color:var(--ok-b)}.cs-exercise-group.auto>.cs-section-title{color:var(--ok)}.cs-exercise-group.semi{border-color:var(--acc-b)}.cs-exercise-group.semi>.cs-section-title{color:var(--acc)}.cs-exercise-group.manual{border-color:#7c3aed66}.cs-exercise-group.manual>.cs-section-title{color:#a78bfa}@media(max-width:560px){.cs-exercise-section{padding:11px}.cs-exercise-section>.cs-section-title{font-size:14px}.cs-exercise-group{padding:10px}}@media(min-width:760px){.cs-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.cs-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}.cs-field-row{grid-template-columns:1fr 1fr}}@media(max-width:560px){.cs-module-head{display:block}.cs-module-badge{margin-top:8px}.cs-grid.four{grid-template-columns:1fr}.cs-card{min-height:68px}}`;
    document.head.appendChild(style);
  }
  function csCard(key,obj,active,onclick){
    const desc = obj.hint || obj.desc || obj.short || '';
    const label = (obj.icon ? obj.icon+' ' : '') + obj.label;
    return '<button type="button" class="cs-card '+(active?'active':'')+'" data-val="'+csEsc(key)+'" title="'+csEsc(desc)+'" aria-label="'+csEsc(label + (desc ? ' - ' + desc : ''))+'" onclick="'+onclick+'"><span class="cs-card-title">'+csEsc(label)+'</span><span class="cs-card-desc">'+csEsc(desc)+'</span></button>';
  }
  function csStageCards(){ const m = csModule(); return Object.keys(CS_STAGE).map(k => csCard(k, CS_STAGE[k], m.stage===k, "csPick('stage','"+k+"')")).join(''); }
  function csDifficultyCards(){ const m = csModule(); return Object.keys(CS_DIFFICULTY).map(k => csCard(k, CS_DIFFICULTY[k], m.difficulty===k, "csPick('difficulty','"+k+"')")).join(''); }
  function csDomainCards(){ const m = csModule(); return Object.keys(CS_DOMAINS).map(k => csCard(k, CS_DOMAINS[k], m.domain===k, "csPick('domain','"+k+"')")).join(''); }
    function csCorrectionCards(){
    const m = csModule(); const rec = csSyncCorrectionMode(m); const minRank = rec.rank;
    const defs={auto:{label:'Generátor opraví sám',icon:'✅',hint:'jen uzavřené nebo jednoznačné úlohy'},semi:{label:'AI pomůže, učitel schválí',icon:'⚠️',hint:'AI navrhne alternativy a druhým průchodem ověří klíč'},manual:{label:'Opravuje učitel ručně',icon:'👩‍🏫',hint:'sloh, interpretace, stylistické nuance'}};
    return Object.keys(defs).map(function(k){
      const disabled = csCorrectionRank(k) < minRank;
      const cls = (m.correctionMode===k?'active ':'') + (disabled?'disabled ':'') + (rec.mode===k?'recommended ':'');
      const title = disabled ? 'Tato možnost je pro vybraný jev příliš automatická. Doporučeno: '+csCorrectionTitle(rec.mode)+'.' : (rec.mode===k ? 'Doporučená možnost pro vybraný jev.' : 'Bezpečnější ruční varianta.');
      const onclick = disabled ? '' : ' onclick="csPick(\'correctionMode\',\''+k+'\')"';
      return '<button type="button" class="cs-card '+cls.trim()+'" data-val="'+csEsc(k)+'" title="'+csEsc(title)+'" '+(disabled?'disabled aria-disabled="true"':'')+onclick+'><span class="cs-card-title">'+csEsc(defs[k].icon+' '+defs[k].label)+'</span><span class="cs-card-desc">'+csEsc(defs[k].hint)+'</span></button>';
    }).join('');
  }
  function csPhenomenonOptions(){ const m = csModule(); const list = (CS_DOMAINS[m.domain] || CS_DOMAINS.pravopis).phenomena; let html = list.map(v => '<option value="'+csEsc(v)+'" '+(m.phenomenon===v?'selected':'')+'>'+csEsc(v)+'</option>').join(''); html += '<option value="__custom__" '+(m.phenomenon==='__custom__'?'selected':'')+'>vlastní jev…</option>'; return html; }
  function csPresetCards(){
    const m = csModule();
    const customTitle = 'Vlastní nastavení: učitel ručně vybere oblast, jev, typy úloh, obtížnost i režim kontroly. Rychlá šablona není povinná.';
    const customCard = '<button type="button" class="cs-card '+(!m.preset?'active':'')+'" title="'+csEsc(customTitle)+'" aria-label="Vlastní test - '+csEsc(customTitle)+'" onclick="csUseCustomPreset()"><span class="cs-card-title">'+csEsc('🛠️ Vlastní test')+'</span><span class="cs-card-desc">'+csEsc('Bez rychlé šablony: ručně nastavíš oblast, jev, typy úloh a obtížnost.')+'</span><span class="cs-review-pill semi">'+csEsc('ruční nastavení')+'</span></button>';
    const presetCards = Object.keys(CS_PRESETS).map(k => { const p = CS_PRESETS[k]; const review = p.correctionMode; const diff = CS_DIFFICULTY[p.difficulty] || CS_DIFFICULTY.standardni; const title = p.desc + ' Obtížnost: ' + diff.label + '. Doporučený režim: ' + csReviewLabel(review) + '.'; return '<button type="button" class="cs-card '+(m.preset===k?'active':'')+'" title="'+csEsc(title)+'" aria-label="'+csEsc(p.label+' - '+title)+'" onclick="csChoosePreset(\''+k+'\')"><span class="cs-card-title">'+csEsc(p.icon+' '+p.label)+'</span><span class="cs-card-desc">'+csEsc(p.desc + ' · ' + diff.label)+'</span><span class="cs-review-pill '+(review==='auto'?'auto':review==='semi'?'semi':'manual')+'">'+csEsc(csReviewLabel(review))+'</span></button>'; }).join('');
    return customCard + presetCards;
  }
  function csExerciseCards(){ const m = csModule(); const selected = new Set(csExerciseList(m)); const domain = m.domain; const groups = {auto:'Jednoznačné odpovědi - generátor opraví sám',semi:'AI navrhne alternativy - učitel schválí',manual:'Otevřené odpovědi - opravuje učitel'}; const html = Object.keys(groups).map(g => {
      const cards = Object.keys(CS_EXERCISES).filter(k => CS_EXERCISES[k].review===g && (CS_EXERCISES[k].domains.includes(domain) || domain==='kombinovane')).map(k => { const e=CS_EXERCISES[k]; const title = e.desc + ' Typ úlohy v ČJ: ' + csTechUiLabel(e.tech) + '. Režim: ' + (g==='auto'?'opraví generátor':g==='semi'?'AI pomůže, učitel schválí':'opravuje učitel ručně') + '.'; return '<button type="button" class="cs-card '+(selected.has(k)?'active':'')+'" title="'+csEsc(title)+'" aria-label="'+csEsc(e.label+' - '+title)+'" onclick="csToggleExercise(\''+k+'\')"><span class="cs-card-title">'+csEsc(e.label)+'</span><span class="cs-card-desc">'+csEsc(e.desc)+'</span><span class="cs-review-pill '+g+'">'+csEsc(g==='auto'?'opraví generátor':g==='semi'?'učitel zkontroluje':'ručně')+'</span></button>'; }).join('');
      return cards ? '<div class="cs-exercise-group '+g+'"><div class="cs-section-title">'+csEsc(groups[g])+'</div><div class="cs-grid three">'+cards+'</div></div>' : '';
    }).join(''); return '<div class="cs-exercise-groups">'+html+'</div>'; }
  function csCheck(key,label){ const m = csModule(); let tip = CS_CHECK_TIPS[key] || ''; const forced = (key === 'punctuation' && csNeedsPunctuationCheck(m)); if (forced) tip = 'U interpunkčního jevu nebo interpunkčních úloh je kontrola čárek povinná — nelze ji vypnout. ' + tip; return '<label class="cs-check" title="'+csEsc(tip)+'"'+(forced?' style="opacity:.65;cursor:not-allowed"':'')+'><input type="checkbox" '+((m.checks && m.checks[key]) || forced ?'checked':'')+(forced?' disabled':'')+' onchange="csToggleCheck(\''+key+'\',this.checked)"><span>'+csEsc(label)+(forced?' (povinné)':'')+'</span>'+csTip(tip)+'</label>'; }
  function csClampPage(v){ return Math.max(0, Math.min(2, parseInt(v || 0, 10) || 0)); }
  function csPageTitle(page){ return ['Učivo','Úlohy a podklady','Opravování a kontrola'][csClampPage(page)] || 'Modul ČJ'; }
  function csPageSubnav(page){
    page = csClampPage(page);
    const dots = [0,1,2].map(function(i){ return '<button type="button" class="cs-dot '+(i===page?'active':'')+'" title="Otevřít ČJ '+(i+1)+'/3 - '+csEsc(csPageTitle(i))+'" aria-label="Otevřít ČJ '+(i+1)+'/3 - '+csEsc(csPageTitle(i))+'" onclick="csGoPage('+i+')"></button>'; }).join('');
    return '<div class="cs-subnav"><div><div class="cs-subnav-title">Český modul '+(page+1)+'/3 · '+csEsc(csPageTitle(page))+'</div><div class="cs-subnav-note">Tři kroky jdou za sebou logicky: 1) co se učí, 2) jak budou vypadat úlohy a podklady, 3) jak se bude opravovat a kontrolovat.</div></div><div class="cs-subnav-dots">'+dots+'</div></div>';
  }
  function csBuildTopProgressNav(page){
    page = csClampPage(page);
    return '<div id="csProgressSubnav" class="cs-progress-nav hidden" aria-label="Navigace v modulu Český jazyk">'+[0,1,2].map(function(i){ return '<button type="button" class="cs-progress-btn '+(i===page?'active':'')+'" onclick="csGoPage('+i+')">ČJ '+(i+1)+'/3 · '+csEsc(csPageTitle(i))+'</button>'; }).join('')+'</div>';
  }
  function csEnsureProgressNav(){
    let nav = document.getElementById('csProgressSubnav');
    const host = document.getElementById('progLabels') || document.getElementById('progressArea');
    if (!host) return null;
    if (!nav) { host.insertAdjacentHTML('afterend', csBuildTopProgressNav(csModule().csPage || 0)); nav = document.getElementById('csProgressSubnav'); }
    return nav;
  }
  function csTeacherQuestionsText(){ return CS_TEACHER_QUESTIONS.map(function(q,i){return (i+1)+'. '+q;}).join('\n'); }
  function csTeacherQuestionsHtml(){ return CS_TEACHER_QUESTIONS.map(function(q){return '<li>'+csEsc(q)+'</li>';}).join(''); }
  function csCopyTeacherQuestions(){ const txt=csTeacherQuestionsText(); try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(function(){try{uiToast('Otázky pro češtináře zkopírovány.','ok');}catch(_){}}); return; } }catch(_){} try{ fallbackCopy(txt); }catch(_){ window.prompt('Zkopíruj otázky pro češtináře:', txt); } }
  function csRunScoringTests(){ const out=document.getElementById('csDevTestReport'); const lines=[]; let pass=0,fail=0; function assert(name,got,exp){ const ok=Object.is(got,exp); if(ok)pass++; else fail++; lines.push((ok?'✓':'✗')+' '+name+' → '+got+' (čekáno '+exp+')'); } try{ if(typeof SHARED_SCORING_JS!=='string') throw new Error('SHARED_SCORING_JS není dostupný.'); const boot='function __isSpanish(){return false;}function __fuzzyMode(){return "mild";}function __isCzech(){return true;}function __csScoringPolicy(){return {enabled:true,diacritics:true,punctuation:true,capitalization:true,exactShape:true};}'; const api=(new Function(boot+'\n'+SHARED_SCORING_JS+'\nreturn {textScore:textScore,correctIndex:correctIndex};'))(); assert('diakritika: byt ≠ být', api.textScore('byt','být',[],'fill-in-the-blank'), 0); assert('velká písmena: praha ≠ Praha', api.textScore('praha','Praha',[],'fill-in-the-blank'), 0); assert('interpunkce: Ano ≠ Ano.', api.textScore('Ano','Ano.',[],'fill-in-the-blank'), 0); assert('fuzzy tolerance je u ČJ vypnutá i při mild', api.textScore('zkouska','zkouška',[],'fill-in-the-blank'), 0); assert('MC správně rozliší Praha/praha podle kapitalizace', api.correctIndex({options:['praha','Praha'],correct:'Praha'}), 1); assert('MC správně rozliší Ano/Ano. podle interpunkce', api.correctIndex({options:['Ano','Ano.'],correct:'Ano.'}), 1); const boot2='function __isSpanish(){return false;}function __fuzzyMode(){return "off";}function __isCzech(){return true;}function __csScoringPolicy(){return {enabled:true,diacritics:true,punctuation:false,capitalization:false,exactShape:true};}'; const api2=(new Function(boot2+'\n'+SHARED_SCORING_JS+'\nreturn {textScore:textScore,correctIndex:correctIndex};'))(); assert('při vypnuté kapitalizaci se praha/Praha uzná', api2.textScore('praha','Praha',[],'fill-in-the-blank'), 1); assert('při vypnuté interpunkci se Ano/Ano. uzná', api2.textScore('Ano','Ano.',[],'fill-in-the-blank'), 1); const boot3='function __isSpanish(){return false;}function __fuzzyMode(){return "off";}function __isCzech(){return true;}function __csScoringPolicy(){return {enabled:true,diacritics:false,punctuation:false,capitalization:false,exactShape:true};}'; const api3=(new Function(boot3+'\n'+SHARED_SCORING_JS+'\nreturn {textScore:textScore,correctIndex:correctIndex};'))(); assert('při vypnuté diakritice se byt/být uzná', api3.textScore('byt','být',[],'fill-in-the-blank'), 1); }catch(e){ fail++; lines.push('✗ Test se nepodařilo spustit: '+(e&&e.message?e.message:String(e))); } if(out){ out.classList.remove('hidden','ok','warn'); out.classList.add(fail?'warn':'ok'); out.textContent='České bodování: '+pass+' testů prošlo, '+fail+' selhalo.\n\n'+lines.join('\n'); } try{ if(fail) uiToast('České bodování má problém — viz panel v modulu ČJ.','warn',5200); else uiToast('České bodování prošlo lokálními kontrolami.','ok'); }catch(_){} return {pass:pass,fail:fail,lines:lines}; }
  function csBuildIntro(){ return '<div id="'+CS_INTRO_ID+'" class="cs-module-intro hidden"><b>Čeština má vlastní nastavení.</b> Na tomto listu jen dokonči základní informace. Podrobný modul Český jazyk se otevře až na dalším listu po kliknutí na Pokračovat.</div>'; }
  function csBuildStep0(){ const m = csModule(); return '<div id="'+CS_STEP0_ID+'" class="cs-module-panel hidden"><div class="cs-module-head"><div><div class="cs-module-title"><span class="flag flag-cz" aria-hidden="true"></span> Modul Český jazyk '+csTip(CS_SECTION_TIPS.intro)+'</div><div class="cs-module-sub">První část řeší pouze učivo: ročník, oblast češtiny a konkrétní jazykový jev.</div></div><span class="cs-module-badge">1/3 · učivo</span></div>'+csPageSubnav(0)+'<div class="cs-section">'+csTitle('Ročník / cílová skupina', CS_SECTION_TIPS.stage)+'<div class="cs-grid four" id="csStageBtns">'+csStageCards()+'</div><input id="csStageCustom" class="cs-input '+(m.stage==='custom'?'':'hidden')+'" style="margin-top:8px" placeholder="např. 2. ročník, septima, slabší skupina…" value="'+csEsc(m.stageCustom||'')+'" oninput="csInput(\'stageCustom\',this.value)"></div><div class="cs-section">'+csTitle('Didaktická obtížnost', CS_SECTION_TIPS.difficulty)+'<div class="cs-note">Ročník určuje cílovou skupinu. Obtížnost určuje, jak náročné mají být položky v rámci vybraného ročníku.</div><div class="cs-grid three" id="csDifficultyBtns">'+csDifficultyCards()+'</div></div><div class="cs-section">'+csTitle('Co se bude procvičovat?', CS_SECTION_TIPS.domain)+'<div class="cs-note">Vyber oblast učiva. Tady ještě neurčuješ podobu otázky ani způsob hodnocení.</div><div class="cs-grid three" id="csDomainBtns">'+csDomainCards()+'</div></div><div class="cs-section">'+csTitle('Jaký konkrétní jev?', CS_SECTION_TIPS.phenomenon)+'<div class="cs-field-row"><select id="csPhenomenonSelect" class="cs-select" title="Vyber konkrétní jazykový jev v aktuální oblasti učiva." onchange="csPick(\'phenomenon\',this.value)">'+csPhenomenonOptions()+'</select><input id="csPhenomenonCustom" class="cs-input '+(m.phenomenon==='__custom__'?'':'hidden')+'" title="Sem napiš vlastní konkrétní jev, pokud není v seznamu." placeholder="Upřesni vlastní jev…" value="'+csEsc(m.phenomenonCustom||'')+'" oninput="csInput(\'phenomenonCustom\',this.value)"></div><div class="cs-note">Příklad: oblast = skladba, konkrétní jev = druhy vedlejších vět. Oblast = pravopis, konkrétní jev = shoda přísudku s podmětem.</div></div></div>'; }
  function csBuildStep1(){ return '<div id="'+CS_STEP1_ID+'" class="cs-module-panel hidden"><div class="cs-module-head"><div><div class="cs-module-title"><span class="flag flag-cz" aria-hidden="true"></span> ČJ - úlohy a podklady '+csTip(CS_SECTION_TIPS.exerciseForm)+'</div><div class="cs-module-sub">Druhá část řeší podobu testu: šablonu, typy úloh, počet cvičení a případný textový podklad.</div></div><span class="cs-module-badge">2/3 · úlohy</span></div>'+csPageSubnav(1)+'<div class="cs-section">'+csTitle('Rychlé šablony', CS_SECTION_TIPS.presets)+'<div class="cs-note"><strong>Šablona není povinná.</strong> Karta Vlastní test nechá ruční nastavení. Ostatní šablony jsou jen zkratky: nastaví oblast, typy úloh, počet, čas a doporučený režim. Po výběru je můžeš ručně upravit.</div><div class="cs-grid three" id="csPresetBtns">'+csPresetCards()+'</div></div><div class="cs-section cs-exercise-section">'+csTitle('Co má žák v úlohách dělat?', CS_SECTION_TIPS.exerciseForm)+'<div id="csExerciseBtns">'+csExerciseCards()+'</div><div class="cs-note"><strong>Rozdíl oproti první části:</strong> tam se vybírá učivo, tady forma otázky. Např. učivo = velká písmena; forma úlohy = vyber správnou variantu / doplň přesný tvar / oprav chybu.</div><div class="cs-warning" id="csSafetySummary">'+csEsc(csSafetySummary())+'</div></div><div class="cs-section"><div class="cs-note"><strong>Počet cvičení</strong> odpovídá počtu vybraných typů úloh výše — každý vybraný typ = jedno cvičení. Případný <strong>vlastní text, soubor nebo odkaz</strong> (podklad pro úlohy) nastavíš hned pod tímto českým blokem.</div></div></div>'; }
  function csBuildStep2(){ const m = csModule(); return '<div id="'+CS_STEP2_ID+'" class="cs-module-panel hidden"><div class="cs-module-head"><div><div class="cs-module-title"><span class="flag flag-cz" aria-hidden="true"></span> ČJ - opravování a kontrola '+csTip(CS_SECTION_TIPS.correction)+'</div><div class="cs-module-sub">Třetí část uzavírá český modul: kdo má poslední slovo u opravování a co se má počítat jako chyba.</div></div><span class="cs-module-badge">3/3 · hodnocení</span></div>'+csPageSubnav(2)+'<div class="cs-section">'+csTitle('Kdo má odpovědi opravovat?', CS_SECTION_TIPS.correction)+'<div class="cs-note">Generátor doporučí bezpečný režim podle vybraných typů úloh. U jednoznačných uzavřených úloh může opravovat automaticky. U spornějších položek AI připraví návrh a klíč musí potvrdit učitel. Otevřené stylistické nebo interpretační odpovědi hodnotí učitel ručně.</div><div class="cs-grid three" id="csCorrectionBtns">'+csCorrectionCards()+'</div><div class="cs-warning" id="csCorrectionRecommendation">'+csEsc(csCorrectionRecommendationText(m))+'</div></div><div class="cs-section">'+csTitle('Co se má při opravování počítat jako chyba?', CS_SECTION_TIPS.checks)+'<div class="cs-checks">'+csCheck('diacritics','háčky a čárky ve slovech')+csCheck('punctuation','čárky a další interpunkce')+csCheck('capitalization','velká a malá písmena')+csCheck('exactShape','přesný tvar odpovědi')+'</div><div class="cs-warning" id="csRiskNote"></div></div><div class="cs-section">'+csTitle('Povinné zásady pro ČJ', CS_SECTION_TIPS.principles)+'<ul class="cs-summary-list"><li>Diakritika se u pravopisných a tvarových úloh standardně hodnotí.</li><li>Interpunkce má tři režimy: výběr správné varianty = automaticky po kontrole klíče; doplnění čárek do očíslovaných míst = učitel schválí klíč; oprava interpunkce v textu = ruční hodnocení.</li><li>Sloh a literární interpretace nesmí být čistě automaticky známkované.</li><li>Každá položka má mít správnou odpověď, krátké zdůvodnění a označený jazykový jev.</li></ul></div><div class="cs-section">'+csTitle('Ověření a dotazy pro češtináře', CS_SECTION_TIPS.verification)+'<div class="cs-note">Volitelné pracovní pojistky před ostrým použitím: lokální self-test českého bodování a otázky pro češtináře ke sporným oblastem.</div><div class="cs-dev-actions"><button type="button" class="btn-mini" title="Spustí lokální kontrolu českého porovnávání odpovědí: diakritika, velká písmena, interpunkce a multiple choice." onclick="csRunScoringTests()">🧪 Ověřit české bodování</button><button type="button" class="btn-mini" title="Zkopíruje srozumitelné otázky pro kolegu češtináře, hlavně ke sporným oblastem hodnocení." onclick="csCopyTeacherQuestions()">📋 Zkopírovat otázky pro kolegu</button></div><div id="csDevTestReport" class="cs-dev-report hidden"></div><ul class="cs-question-list">'+csTeacherQuestionsHtml()+'</ul></div></div>'; }
  function csMountPanels(){
    csInstallStyle();
    const langHost = document.getElementById('jazykBtns');
    const langField = langHost && langHost.closest ? langHost.closest('.field') : null;
    let intro = document.getElementById(CS_INTRO_ID);
    if (!intro && langField) {
      langField.insertAdjacentHTML('afterend', csBuildIntro());
      intro = document.getElementById(CS_INTRO_ID);
    } else if (intro && langField && intro.previousElementSibling !== langField) {
      langField.insertAdjacentElement('afterend', intro);
    }

    csEnsureProgressNav();

    // Český modul se nemá otevírat hned pod volbou jazyka. Patří až na další list
    // průvodce (krok Cvičení), aby první obrazovka zůstala čistá.
    const countHost = document.getElementById('pocetBtns');
    const countField = countHost && countHost.closest ? countHost.closest('.field') : null;
    let step0 = document.getElementById(CS_STEP0_ID);
    if (!step0 && countField) {
      countField.insertAdjacentHTML('beforebegin', csBuildStep0());
      step0 = document.getElementById(CS_STEP0_ID);
    } else if (step0 && countField && step0.nextElementSibling !== countField) {
      countField.parentNode.insertBefore(step0, countField);
    }

    let step1 = document.getElementById(CS_STEP1_ID);
    if (!step1 && step0) {
      step0.insertAdjacentHTML('afterend', csBuildStep1());
      step1 = document.getElementById(CS_STEP1_ID);
    } else if (step1 && step0 && step1.previousElementSibling !== step0) {
      step0.insertAdjacentElement('afterend', step1);
    }
    let step2 = document.getElementById(CS_STEP2_ID);
    if (!step2 && step1) {
      step1.insertAdjacentHTML('afterend', csBuildStep2());
    } else if (step2 && step1 && step2.previousElementSibling !== step1) {
      step1.insertAdjacentElement('afterend', step2);
    }
  }
  function csRenderPanels(){
    const intro = document.getElementById(CS_INTRO_ID); if (intro) intro.outerHTML = csBuildIntro();
    const s0 = document.getElementById(CS_STEP0_ID); if (s0) s0.outerHTML = csBuildStep0();
    const s1 = document.getElementById(CS_STEP1_ID); if (s1) s1.outerHTML = csBuildStep1();
    const s2 = document.getElementById(CS_STEP2_ID); if (s2) s2.outerHTML = csBuildStep2();
    csMountPanels();
    csUpdateRiskNote();
    try { if (typeof initTooltips === 'function') setTimeout(initTooltips, 0); } catch(_) {}
  }
  function csSetHidden(el, hide){ if (el) el.classList.toggle('hidden', !!hide); }
  function csApplyVisualState(){
    const active = csIsActive();
    document.body.classList.toggle('cs-active', active);
    csMountPanels();
    const intro=document.getElementById(CS_INTRO_ID), s0=document.getElementById(CS_STEP0_ID), s1=document.getElementById(CS_STEP1_ID), s2=document.getElementById(CS_STEP2_ID);
    const page = active ? csClampPage(csModule().csPage) : 0;
    const pnav = csEnsureProgressNav();
    if (pnav) { pnav.outerHTML = csBuildTopProgressNav(page); const pnav2=document.getElementById('csProgressSubnav'); if(pnav2) pnav2.classList.toggle('hidden', !active || currentStep !== 1); }
    if (intro) intro.classList.toggle('hidden', !active);
    if (s0) s0.classList.toggle('hidden', !active || page !== 0);
    if (s1) s1.classList.toggle('hidden', !active || page !== 1);
    if (s2) s2.classList.toggle('hidden', !active || page !== 2);
    const cefrField = document.getElementById('cefrBtns') && document.getElementById('cefrBtns').closest('.field');
    const instrField = document.getElementById('instrJazykBtns') && document.getElementById('instrJazykBtns').closest('.field');
    const ageField = document.getElementById('ageGroupBtns') && document.getElementById('ageGroupBtns').closest('.field');
    const globalTypesField = document.getElementById('globalTypesField');
    const typeGuide = document.getElementById('typeGuidePanel');
    csSetHidden(cefrField, active); csSetHidden(instrField, active); csSetHidden(ageField, active); csSetHidden(globalTypesField, active); csSetHidden(typeGuide, active);
    const countField = document.getElementById('pocetBtns') && document.getElementById('pocetBtns').closest('.field');
    const sourceField = document.getElementById('tabBtnText') && document.getElementById('tabBtnText').closest('.field');
    const listeningField = document.getElementById('listeningBlock');
    const readingField = document.getElementById('readingBlock');
    const latkaField = document.getElementById('latka') && document.getElementById('latka').closest('.field');
    csSetHidden(latkaField, active);
    csSetHidden(countField, active); // v ČJ počet cvičení určuje výběr typů úloh, tlačítka by nefungovala
    csSetHidden(sourceField, active && page !== 1);
    const btnExDetail = document.getElementById('btnExDetail');
    const exConfigList = document.getElementById('exConfigList');
    const exTotals = document.getElementById('exTotals');
    csSetHidden(btnExDetail, active);
    if (active) { csSetHidden(exConfigList, true); csSetHidden(exTotals, true); }
    // V ČJ modulu bloky vždy skryj. Mimo ČJ je neukazuj natvrdo — řiď se tím,
    // zda učitel daný typ skutečně vybral (jinak se zobrazí matoucí prázdné nastavení).
    csSetHidden(listeningField, active || !usesListeningComprehension());
    csSetHidden(readingField, active || !usesReadingComprehension());
    const step1Back = document.querySelector('#step1 .nav .btn-back');
    const step1Next = document.getElementById('next1');
    if (step1Back) {
      step1Back.textContent = active && page > 0 ? '← Předchozí část ČJ' : '← Zpět';
      step1Back.onclick = active && page > 0 ? function(){ csGoPage(page - 1); } : function(){ goTo(0); };
    }
    if (step1Next) {
      step1Next.textContent = active && page < 2 ? 'Pokračovat v modulu ČJ →' : 'Pokračovat →';
      step1Next.onclick = active && page < 2 ? function(){ csGoPage(page + 1); } : function(){ goTo(2); };
    }
    const latka = document.getElementById('latka');
    if (latka) { if (!latka.dataset.origPlaceholder) latka.dataset.origPlaceholder = latka.getAttribute('placeholder') || ''; latka.setAttribute('placeholder', active ? 'např. shoda přísudku s podmětem, druhy vedlejších vět, práce s publicistickým textem…' : latka.dataset.origPlaceholder); }
    const lbl0=document.getElementById('lbl0'), lbl1=document.getElementById('lbl1');
    if (lbl0) { if (!lbl0.dataset.origText) lbl0.dataset.origText = lbl0.textContent; lbl0.textContent = active ? 'Základní info' : lbl0.dataset.origText; }
    if (lbl1) { if (!lbl1.dataset.origText) lbl1.dataset.origText = lbl1.textContent; lbl1.textContent = active ? ('ČJ ' + (page + 1) + '/3') : lbl1.dataset.origText; }
    if (active) { csApplyCoreState(); csUpdateRiskNote(); }
  }
  function csUpdateRiskNote(){
    const box = document.getElementById('csRiskNote'); if (!box) return;
    const m = csModule();
    const warnings = [];
    if ((m.domain === 'stylistika' || m.domain === 'literatura') && m.correctionMode === 'auto') warnings.push('Stylistika a literatura nejsou vhodné pro čisté automatické známkování bez kontroly. Doporučený režim je AI návrh + učitelské schválení, případně ruční hodnocení.');
    if (m.domain === 'slovni_zasoba' && csExerciseList(m).some(function(k){ return (CS_EXERCISES[k] && CS_EXERCISES[k].review !== 'auto'); })) warnings.push('Slovní zásoba je vhodná pro automatické hodnocení hlavně u výběru, přiřazování a uzavřeného významu v kontextu. Otevřené odpovědi vyžadují schválení alternativ.');
    if ((m.phenomenon || '').toLowerCase().includes('interpunk') && !m.checks.punctuation) warnings.push('Vybraný jev souvisí s interpunkcí, ale kontrola interpunkce není zapnutá.');
    if (csDerivedGoal(state) === 'graded' && m.correctionMode !== 'auto') warnings.push('Známkovaný test s poloautomatickými položkami vyžaduje schválení alternativ a ověření klíče před použitím; ruční položky musí hodnotit učitel.');
    box.textContent = warnings.length ? warnings.join(' ') : csSafetySummary(m); const ss=document.getElementById('csSafetySummary'); if(ss) ss.textContent=csSafetySummary(m); const cr=document.getElementById('csCorrectionRecommendation'); if(cr) cr.textContent=csCorrectionRecommendationText(m);
  }
  function csGoPage(page){
    const m = csModule();
    m.csPage = csClampPage(page);
    if (csIsActive() && typeof showOnlyStep === 'function' && currentStep !== 1) {
      try { showOnlyStep(1); if (typeof maxStep !== 'undefined') maxStep = Math.max(maxStep || 0, 1); } catch(_) {}
    }
    csRenderPanels();
    csApplyVisualState();
    try { if (typeof validate === 'function') validate(); } catch(_) {}
    try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function csPick(key,value){
    const m = csModule();
    m[key] = value;
    if (key === 'stage') { m.stage = value; m.preset = ''; }
    if (key === 'difficulty' || key === 'goal' || key === 'phenomenon') { m.preset = ''; }
    if (key === 'domain') { m.domain = value; m.phenomenon = (CS_DOMAINS[value] || CS_DOMAINS.pravopis).phenomena[0]; m.exerciseTypes = csClone(CS_DOMAIN_DEFAULT_EX[value] || CS_DEFAULT.exerciseTypes); m.preset = ''; csSyncCorrectionMode(m); }
    if (key === 'phenomenon') { csSyncCorrectionMode(m); }
    if (key === 'correctionMode') { m.preset = ''; const rec=csRecommendedCorrection(m); if (csCorrectionRank(value) < rec.rank) { m.correctionMode = rec.mode; try{ uiToast('Tato volba je pro vybraný jev příliš automatická. Nastavuji: '+csCorrectionTitle(rec.mode)+'.','warn',4800); }catch(_){} } else { m.correctionMode = value; } }
    csApplyCoreState(); csRenderPanels(); csApplyVisualState();
    try { if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
    try { if (typeof validate === 'function') validate(); } catch(_) {}
    try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
  }
  function csInput(key,value){ const m=csModule(); m[key]=value; csApplyCoreState(); csUpdateRiskNote(); try{ if(typeof validate==='function') validate(); }catch(_){} try{ if(typeof saveSnapshot==='function') saveSnapshot(); }catch(_){} }
  function csToggleCheck(key,checked){ const m=csModule(); m.checks[key]=!!checked; csApplyCoreState(); if (m.checks[key] !== !!checked) { csRenderPanels(); try{ uiToast('Tuto kontrolu nelze pro vybraný jev vypnout.', 'warn', 4200); }catch(_){} } csUpdateRiskNote(); try{ if(typeof saveSnapshot==='function') saveSnapshot(); }catch(_){} }
  function csUseCustomPreset(){
    const m = csModule();
    m.preset = '';
    if (!Array.isArray(m.exerciseTypes) || !m.exerciseTypes.length) {
      m.exerciseTypes = csClone(CS_DOMAIN_DEFAULT_EX[m.domain] || CS_DEFAULT.exerciseTypes);
    }
    csSyncCorrectionMode(m);
    csApplyCoreState(); csRenderPanels(); csApplyVisualState();
    try { if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
    try { if (typeof validate === 'function') validate(); } catch(_) {}
    try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
  }
  function csChoosePreset(k){
    const p = CS_PRESETS[k]; if (!p) return;
    const m = csModule();
    m.preset=k; m.domain=p.domain; m.phenomenon=p.phenomenon; m.goal=p.goal; m.correctionMode=p.correctionMode; m.difficulty=p.difficulty || m.difficulty || 'standardni'; m.exerciseTypes=csClone(p.exercises); if (p.stage) m.stage=p.stage; csSyncCorrectionMode(m);
    state.pocet=p.pocet; state.body=p.body; state.cas=p.cas; state.resultMode=p.resultMode; state.feedbackMode=p.feedbackMode;
    // Šablona zapisuje resultMode/feedbackMode mimo pick() — křížová pravidla se musí
    // vynutit ručně, jinak vznikne např. zakázané procvičovací + secureOffline.
    // Záměr šablony má přednost: secureOffline šablona při procvičovacím režimu přepne na běžný test
    // (stejně jako ruční volba secureOffline), jinak by enforceModeConstraints verifier zase vrátil na instant.
    if (p.resultMode === 'secureOffline' && state.testMode === 'procviceci') {
      state.testMode = 'bezny';
      try { uiToast('Šablona používá bezpečný offline verifier — režim testu přepnut z procvičovacího na běžný.', 'warn', 5200); } catch(_) {}
    }
    try { if (typeof enforceModeConstraints === 'function') enforceModeConstraints(); } catch(_) {}
    try { uiToast('Šablona nastavila: ' + (CS_STAGE[m.stage] ? CS_STAGE[m.stage].label : m.stage) + ' · ' + ((CS_DOMAINS[m.domain]||{}).label || m.domain) + ' · ' + csPhenomenonLabel(m) + ' · ' + (CS_DIFFICULTY[m.difficulty]||{}).label + ' · ' + (state.resultMode === 'secureOffline' ? 'bezpečný offline verifier' : 'okamžitá známka') + '. Volby na kartách 1 a 3 se tomu přizpůsobily.', 'ok', 6500); } catch(_) {}
    if (typeof setVal === 'function') { setVal('bodyCustom', state.body); setVal('casCustom', state.cas); }
    csApplyCoreState(); csRenderPanels(); csApplyVisualState();
    try { if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
    try { if (typeof validate === 'function') validate(); } catch(_) {}
    try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
  }
  function csToggleExercise(k){
    const m = csModule(); if (!CS_EXERCISES[k]) return;
    const arr = Array.isArray(m.exerciseTypes) ? m.exerciseTypes.slice() : [];
    const idx = arr.indexOf(k);
    if (idx >= 0) arr.splice(idx,1); else arr.push(k);
    m.exerciseTypes = arr.length ? arr : [k];
    m.preset = '';
    csSyncCorrectionMode(m);
    csApplyCoreState(); csRenderPanels(); csApplyVisualState();
    try { if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
    try { if (typeof validate === 'function') validate(); } catch(_) {}
    try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
  }
  function csShowEntryModal(){
    // Záměrně se spouští jen po ručním kliknutí na tlačítko Čeština, ne při načtení uloženého stavu.
    try {
      if (typeof closeUiModal === 'function') closeUiModal(null);
    } catch(_) {}
    const existing = document.getElementById('csEntryModal');
    if (existing) existing.remove();
    const backdrop = document.createElement('div');
    backdrop.id = 'csEntryModal';
    backdrop.className = 'ui-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Modul Český jazyk');
    backdrop.innerHTML = '<div class="ui-modal-box cs-entry-box">'
      + '<div class="ui-modal-head"><span class="flag flag-cz" aria-hidden="true"></span> Modul Český jazyk</div>'
      + '<div class="ui-modal-body">Čeština má vlastní průvodce pro ročník, oblast učiva, konkrétní jev, obtížnost, typy úloh a kontrolu hodnocení. Otevřením modulu se přeskočí běžné cizojazyčné nastavení CEFR a typů úloh. Volba „Zůstat zde“ slouží jen pro návrat zpět bez otevření českého průvodce.</div>'
      + '<div class="ui-modal-actions">'
      + '<button type="button" class="ui-modal-btn" data-cs-stay>Zavřít</button>'
      + '<button type="button" class="ui-modal-btn primary" data-cs-open>Otevřít modul ČJ</button>'
      + '</div></div>';
    document.body.appendChild(backdrop);
    function close(){ backdrop.remove(); document.removeEventListener('keydown', onKey); }
    function openModule(){ close(); csGoPage(0); }
    function onKey(e){ if(e.key === 'Escape') close(); if(e.key === 'Enter') openModule(); }
    const stay = backdrop.querySelector('[data-cs-stay]');
    const open = backdrop.querySelector('[data-cs-open]');
    if (stay) stay.addEventListener('click', close);
    if (open) open.addEventListener('click', openModule);
    backdrop.addEventListener('click', function(e){ if(e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);
    setTimeout(function(){ if(open) open.focus(); }, 0);
  }
  function csBackupGenericBeforeEntering(){ if (!state.__csGenericBackup) { const latkaEl=document.getElementById('latka'); state.__csGenericBackup = {instrJazyk:state.instrJazyk, uroven:csClone(state.uroven||[]), kombinovat:state.kombinovat, typyCviceni:csClone(state.typyCviceni||[]), ageGroup:state.ageGroup, ageGroupCustom:state.ageGroupCustom, testPurpose:state.testPurpose, latkaValue: latkaEl ? latkaEl.value : '', exerciseConfig:csClone(state.exerciseConfig||[]), exerciseDetail:!!state.exerciseDetail, pocet:state.pocet, body:state.body, cas:state.cas, splitGenerate:!!state.splitGenerate}; } }
  function csRestoreGenericAfterLeaving(){ const b=state.__csGenericBackup; if (b){ ['instrJazyk','uroven','kombinovat','typyCviceni','ageGroup','ageGroupCustom','testPurpose'].forEach(k => { state[k]=csClone(b[k]); }); if (Object.prototype.hasOwnProperty.call(b,'exerciseConfig')) state.exerciseConfig = csClone(b.exerciseConfig||[]); if (Object.prototype.hasOwnProperty.call(b,'exerciseDetail')) state.exerciseDetail = !!b.exerciseDetail; if (Object.prototype.hasOwnProperty.call(b,'pocet')) state.pocet = b.pocet; if (Object.prototype.hasOwnProperty.call(b,'body')) state.body = b.body; if (Object.prototype.hasOwnProperty.call(b,'cas')) state.cas = b.cas; if (Object.prototype.hasOwnProperty.call(b,'splitGenerate')) { state.splitGenerate = !!b.splitGenerate; delete state.__csSplitForced; } const latkaEl=document.getElementById('latka'); if (latkaEl && Object.prototype.hasOwnProperty.call(b,'latkaValue')) latkaEl.value = b.latkaValue || ''; delete state.__csGenericBackup; } csStripCzechExerciseRows(); try { if (typeof renderExerciseConfig === 'function') renderExerciseConfig(); } catch(_) {} }
  // Pojistka: v cizím jazyce nesmí zůstat řádky cvičení patřící do modulu ČJ (csLabel/csExerciseKey).
  function csStripCzechExerciseRows(){ if (csIsActive()) return; if (Array.isArray(state.exerciseConfig) && state.exerciseConfig.some(function(ex){return ex && (ex.csLabel || ex.csExerciseKey);})) { state.exerciseConfig = state.exerciseConfig.filter(function(ex){return ex && !ex.csLabel && !ex.csExerciseKey;}); if (!state.exerciseConfig.length) state.exerciseDetail = false; } }
  function csSelectedExerciseText(m){ return csExerciseList(m).map(k => { const e=CS_EXERCISES[k]; return '- '+e.label+' -> typ v ČJ: '+csTechPromptLabel(e.tech)+'; režim: '+csReviewLabel(e.review)+'; poznámka: '+e.desc; }).join('\n'); }
  function csDerivedGoal(st){
    st = st || state;
    if ((st.testMode || '') === 'procviceci') return 'practice';
    if ((st.resultMode || '') === 'secureOffline' || (st.testMode || '') === 'prisny' || (st.testMode || '') === 'bezny') return 'graded';
    return (csModule().goal || 'practice');
  }
  function csDerivedGoalLabel(st){
    const g = csDerivedGoal(st);
    const labels = {practice:'procvičování / trénink', diagnostic:'zjištění slabých míst', graded:'známkovaný nebo kontrolovaný test'};
    const mode = (st && st.testMode) || (typeof state !== 'undefined' ? state.testMode : '');
    const result = (st && st.resultMode) || (typeof state !== 'undefined' ? state.resultMode : '');
    const extra = [];
    if (mode === 'procviceci') extra.push('procvičovací režim');
    if (mode === 'prisny') extra.push('přísný režim');
    if (mode === 'bezny') extra.push('běžný test');
    if (result === 'secureOffline') extra.push('bezpečný offline verifier');
    if (result === 'instant') extra.push('okamžitá známka');
    return (labels[g] || g) + (extra.length ? ' (' + extra.join(', ') + ')' : '');
  }
  function csStagePromptLabel(st){
    const m = csEnsureState(st || state);
    return csStageLabel(m);
  }
  function csNormalizeCzechPrompt(base, st){
    if (!csIsActive(st)) return base;
    const stage = csStagePromptLabel(st);
    const diff = csDifficultyLabel(csEnsureState(st || state));
    const axisCs = 'Školní stupeň ČJ: ' + stage + '\n'
      + 'Didaktická obtížnost ČJ: ' + diff + '\n'
      + 'Didaktická osa ČJ: ročník/skupina, oblast učiva, konkrétní jazykový jev a samostatná obtížnost; CEFR/SERR nepoužívat jako rámec pro češtinu.';
    const axisEn = 'Czech school stage: ' + stage + '\n'
      + 'Czech didactic difficulty: ' + diff + '\n'
      + 'Czech didactic axis: Czech as a mother-tongue/school subject; use school stage, curriculum domain, concrete phenomenon and the selected didactic difficulty instead of CEFR/SERR.';
    let out = String(base || '');

    // Ruční HTML prompt: v konfiguraci nemá u ČJ zůstat obecný řádek CEFR/SERR.
    out = out.replace(/\nCEFR\/SERR:[^\n]*(?=\n)/g, '\n' + axisCs);

    // Přímý content prompt pro Gemini/API: nahradí "CEFR level: B2" školním stupněm ČJ.
    out = out.replace(/\nCEFR level:[^\n]*(?=\n)/g, '\n' + axisEn);

    // Práce s textem: v českém modulu nesmí uživatelský prompt vypadat jako cizojazyčné reading comprehension.
    out = out.replace(/READING COMPREHENSION RULES:/g, 'PRÁCE S TEXTEM / POROZUMĚNÍ TEXTU (interní renderer: reading comprehension):');

    // Reading comprehension note v content promptu nesmí říkat "at CEFR B2".
    out = out.replace(/about ([^.\n]+?) words at CEFR [^.\n]+?\. All/g, 'about $1 words appropriate for the selected Czech school stage. All');

    // Věkový blok z obecného jazykového režimu zmiňuje CEFR. U ČJ ho nahradíme školním vysvětlením.
    out = out.replace(/\n• CEFR úroveň není totéž co věková přiměřenost:[^\n]*\n/g, '\n• U češtiny se náročnost neřídí CEFR/SERR, ale školním ročníkem, oblastí učiva a konkrétním jazykovým jevem.\n');
    return out;
  }
  function csPromptBlock(st){
    st = st || state; if (!csIsActive(st)) return '';
    const m = csEnsureState(st); const domain = CS_DOMAINS[m.domain] || CS_DOMAINS.pravopis; const checks = m.checks || {};
    const selected = csSelectedExerciseText(m); const tech = csTechListLabel(m);
    const goalLabel = csDerivedGoalLabel(st);
    const corrLabel = {auto:'generátor opraví sám',semi:'AI navrhne přijatelné alternativy, provede druhý průchod klíčem a učitel schválí, co se bude uznávat',manual:'opravuje učitel ručně'}[m.correctionMode] || m.correctionMode;
    const body = `Tento test je z českého jazyka jako mateřského/školního předmětu, ne z cizího jazyka.\nCEFR/SERR zde nepoužívej jako hlavní didaktickou osu; řiď se ročníkem, oblastí učiva a konkrétním jazykovým jevem.\n\nRočník/skupina: ${csStageLabel(m)}.\nOblast ČJ: ${domain.label}.\nKonkrétní jev: ${csPhenomenonLabel(m)}.\nDidaktická obtížnost: ${csDifficultyLabel(m)}.\nPokyn k obtížnosti: ${csDifficultyPrompt(m)}.\nJak bude test použit: ${goalLabel}.\nKdo opravuje odpovědi: ${corrLabel}.\nTypy úloh v ČJ: ${tech}.\n\nVybraná češtinářská cvičení:\n${selected}\n\nPOVINNÁ DIDAKTICKÁ PRAVIDLA PRO ČJ:\n- Úlohy musí měřit přesně zvolený jev, ne obecnou jazykovou intuici.\n- Dodrž zvolenou didaktickou obtížnost: základní = jednodušší a opěrné položky; standardní = běžná školní náročnost; náročnější = kombinované jevy; maturitní/přijímačková = cílený trénink podle daného účelu.\n- Každá položka má mít jednoznačný klíč, krátké zdůvodnění a označený jazykový jev.\n- Pokud existuje více obhajitelných odpovědí, přidej je do alt_answers/accepted_answers a položku označ reviewLevel=teacher-review.
- U poloautomatických úloh aktivně navrhni možné plně správné alternativy, aby je učitel mohl schválit a potom hodnotit téměř automaticky.\n- Nehodnoť automaticky sloh, volnou interpretaci, argumentaci ani kvalitu formulace bez učitele.\n- U slovní zásoby testuj synonyma, antonyma, frazémy, termíny a mnohoznačnost přednostně přes uzavřené volby, přiřazování nebo význam v jasném kontextu; u každé položky rozliš, zda jde o význam, stylovou vrstvu, nebo odborný termín.
- U stylistiky a literatury upřednostni rozpoznávání, přiřazování, volbu nejlepší varianty a práci s textem.
- V názvech a pokynech pro učitele/žáky nepoužívej anglický termín reading comprehension; piš Práce s textem nebo porozumění textu. Pouze interní hodnota JSON type může zůstat reading comprehension, protože ji používá renderer aplikace.\n\nPRAVOPIS A PŘESNOST:\n- Diakritika: ${checks.diacritics ? 'hodnotit; nepřidávat automaticky varianty bez háčků/čárek.' : 'nehodnotit jen tehdy, pokud nejde o pravopisný/tvarový jev.'}\n- Interpunkce: ${checks.punctuation ? 'rozliš tři režimy: výběr správné interpunkční varianty = uzavřená automatická úloha s pevným klíčem; doplnění čárek do očíslovaných míst = poloautomatická úloha se schválením klíče; oprava interpunkce v textu = ruční hodnocení učitelem. Nehodnoť dlouhou volnou větu prostým textovým porovnáním.' : 'neřešit jako hlavní bod, pokud není výslovně cílem.'}\n- Velká písmena: ${checks.capitalization ? 'hodnotit přesně, pokud jsou cílem; vytvoř varianty, kde je rozdíl viditelný.' : 'nehodnotit jako hlavní bod, pokud nejsou cílem.'}\n- Přesný tvar: ${checks.exactShape ? 'u tvarosloví a pravopisu vyžadovat přesný tvar.' : 'toleranci připustit jen u významových úloh.'}\n\nPOVINNÁ ČEŠTINÁŘSKÁ ZPĚTNÁ VAZBA V JSON POLOŽKÁCH:
U každé položky přidej běžná pole phenomenon, rule, explanation/feedback, errorFocus, reviewLevel, csDifficulty a zároveň strukturovaný objekt csFeedback. Objekt csFeedback musí mít podle možnosti: phenomenon, rule, whyCorrect, whyIncorrect, reviewTip, errorFocus. Piš česky, konkrétně a krátce. Nechci obecné věty typu „protože je to správně”; vysvětli pravidlo nebo oporu v textu.
Příklady: u i/y vysvětli vyjmenované/slovní příbuznost nebo koncovku; u velkých písmen uveď vlastní jméno/instituci/název; u vedlejší věty vysvětli určovací otázku a funkci; u práce s textem uveď, z čeho v textu odpověď plyne; u stylistiky uveď adresáta, situaci a stylovou vrstvu. U semi úloh použij suggested_alt_answers pro varianty, které má učitel schválit.

POVINNÉ FORMÁTY PRO BEZPEČNÉ HODNOCENÍ ČJ:\n- Pravopis/interpunkci testuj přednostně přes multiple choice nebo krátké jednoznačné fill-in-the-blank.\n- Pokud je cílem interpunkce, dodrž režimy: multiple choice s pevnými variantami může být auto; doplnění čárek do očíslovaných míst generuj jako podporovaný fill-in-the-blank se znaky ___ na místech doplnění a s answers[] v přesném pořadí mezer; položku označ reviewLevel=semi a klíč nech schválit učitelem. Opravu interpunkce v delším textu označ reviewLevel=teacher/manual. Nepoužívej dlouhou volnou větu jako jediný textový vstup pro automatické bodování.\n- U každé textově opravované položky uveď jisté plně správné varianty do alt_answers a další spornější, ale možné varianty do suggested_alt_answers pro učitelské schválení; nepřidávej varianty bez diakritiky, pokud by je češtinář neuznal.\n- U slovní zásoby generuj synonyma/antonyma/frazémy/termíny tak, aby každá správná odpověď byla významově jednoznačná; u sporných synonym uveď suggested_alt_answers pro kontrolu učitelem.
- U stylistiky/literatury generuj jen uzavřeně hodnotitelné úlohy, nebo položku označ reviewLevel=teacher.\n- Nepoužívej open answer pro známkování ČJ.\n\nSCORING POLICY PRO VÝSTUPNÍ TEST:\nGenerated test config ponese csScoringPolicy: diakritika=${checks.diacritics?'ON':'OFF'}, interpunkce=${checks.punctuation?'ON':'OFF'}, velká písmena=${checks.capitalization?'ON':'OFF'}, přesný tvar=${checks.exactShape?'ON':'OFF'}. Textové bodování u češtiny nesmí uplatnit fuzzy překlepy ani španělskou diakritickou toleranci.`;
    try { return '\n\n' + promptSection('🇨🇿 MODUL ČESKÝ JAZYK - SAMOSTATNÁ OBOROVÁ VĚTEV', body); }
    catch(_) { return '\n\n🇨🇿 MODUL ČESKÝ JAZYK\n' + body; }
  }
  function csPatchFunctions(){
    if (window.__csModulePatchedV16) return; window.__csModulePatchedV16 = true;
    if (typeof normalizeLoadedState === 'function') { const orig = normalizeLoadedState; normalizeLoadedState = function(s){ const out = orig(s); if (out && out.jazyk === 'čeština') csEnsureState(out); return out; }; }
    if (typeof pickJazyk === 'function') { const orig = pickJazyk; pickJazyk = function(v){ const prev = state && state.jazyk; csEnsureState(state); if (prev !== 'čeština' && v === 'čeština') csBackupGenericBeforeEntering(); const r = orig(v); if (v === 'čeština') { csEnsureState(state).csPage = 0; csApplyCoreState(); } else if (prev === 'čeština' && v !== 'čeština') { csRestoreGenericAfterLeaving(); } csRenderPanels(); csApplyVisualState(); try{ if(typeof validate==='function') validate(); }catch(_){} try{ if(typeof saveSnapshot==='function') saveSnapshot(); }catch(_){} if (v === 'čeština') { try { setTimeout(csShowEntryModal, 0); } catch(_) {} } return r; }; }
    if (typeof applyVisualState === 'function') { const orig = applyVisualState; applyVisualState = function(){ const r = orig.apply(this, arguments); try{ csApplyVisualState(); }catch(e){ console.warn('CS module UI update failed', e); } return r; }; }
    if (typeof goTo === 'function') { const origGoTo = goTo; goTo = function(n){ if (csIsActive() && currentStep === 1) { const page = csClampPage(csModule().csPage || 0); if (n === 2 && page < 2) { csGoPage(page + 1); return; } if (n === 0 && page > 0) { csGoPage(page - 1); return; } } const r = origGoTo.apply(this, arguments); try{ if (csIsActive()) csApplyVisualState(); }catch(e){ console.warn('CS module navigation update failed', e); } return r; }; }
    if (typeof buildPrompt === 'function') { const orig = buildPrompt; buildPrompt = function(){ const base = orig.apply(this, arguments); return csIsActive() ? csNormalizeCzechPrompt(base, state) + csPromptBlock(state) : base; }; }
    if (typeof buildContentPrompt === 'function') { const orig = buildContentPrompt; buildContentPrompt = function(st, notes){ const base = orig.apply(this, arguments); return csIsActive(st) ? csNormalizeCzechPrompt(base, st) + csPromptBlock(st) : base; }; }
    if (typeof enDeterministicAlts === 'function') { const orig = enDeterministicAlts; enDeterministicAlts = function(correct){ if (csIsActive()) return []; return orig.apply(this, arguments); }; }
    if (typeof enrichAltAnswers === 'function') { const origEnrich = enrichAltAnswers; enrichAltAnswers = function(){ if(csIsActive() && state && state.csModule && state.csModule.checks && state.csModule.checks.diacritics){ try{ uiToast('U češtiny nepřidávej varianty bez diakritiky automaticky. Alternativy přidávej jen ručně po kontrole.', 'warn', 5200); }catch(_){} } return origEnrich.apply(this, arguments); }; }
    if (typeof enBuildPrompt === 'function') { const orig = enBuildPrompt; enBuildPrompt = function(flat){ let base = orig.apply(this, arguments); if (csIsActive()) base += '\n\nCZECH-SPECIFIC RULES: Czech as a school subject. Do not add accentless variants as acceptable answers. Do not weaken spelling, capitalization or punctuation when they are the tested phenomenon. Add sure alternatives only if a Czech teacher would mark them fully correct; put uncertain but plausible alternatives into suggested_alt_answers for teacher approval and second-pass key review.'; return base; }; }
  }
  function csInstallCzechButtonFallback(){
    const btn = document.querySelector('#jazykBtns .tag-btn[data-val="čeština"]');
    if (!btn || btn.dataset.csFallbackInstalled === '1') return;
    btn.dataset.csFallbackInstalled = '1';
    btn.addEventListener('click', function(){
      setTimeout(function(){
        try {
          if (csIsActive()) {
            csEnsureState(state).csPage = 0;
            csApplyCoreState();
            csRenderPanels();
            csApplyVisualState();
            if (!document.getElementById('csEntryModal')) csShowEntryModal();
          }
        } catch(e) { console.warn('CS fallback click failed', e); }
      }, 0);
    });
  }
  function csBoot(){
    try { csMountPanels(); csPatchFunctions(); csInstallCzechButtonFallback(); csEnsureState(state); if (csIsActive()) csApplyCoreState(); else csStripCzechExerciseRows(); csRenderPanels(); csApplyVisualState(); try{ if(typeof validate==='function') validate(); }catch(_){} } catch(e) { console.error('Modul Český jazyk se nepodařilo inicializovat:', e); }
  }

  window.csEnterCzechFromButton = function(ev){
    try {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      }
      const prev = state && state.jazyk;
      csEnsureState(state);
      if (prev !== 'čeština') csBackupGenericBeforeEntering();
      state.jazyk = 'čeština';
      csEnsureState(state).csPage = 0;
      csApplyCoreState();
      try { if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
      csRenderPanels();
      csApplyVisualState();
      try { if (typeof validate === 'function') validate(); } catch(_) {}
      try { if (typeof saveSnapshot === 'function') saveSnapshot(); } catch(_) {}
      csShowEntryModal();
    } catch(e) {
      console.error('Nepodařilo se otevřít modul Český jazyk:', e);
      try { state.jazyk = 'čeština'; if (typeof applyVisualState === 'function') applyVisualState(); } catch(_) {}
    }
    return false;
  };

  window.csGoPage = csGoPage; window.csShowEntryModal = csShowEntryModal; window.csPick = csPick; window.csInput = csInput; window.csToggleCheck = csToggleCheck; window.csChoosePreset = csChoosePreset; window.csToggleExercise = csToggleExercise; window.csModule = csModule; window.csSafetySummary = csSafetySummary; window.csRunScoringTests = csRunScoringTests; window.csCopyTeacherQuestions = csCopyTeacherQuestions;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', csBoot); else csBoot();
})();

