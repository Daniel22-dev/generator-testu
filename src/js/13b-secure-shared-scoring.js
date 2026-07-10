// ════════════════════════════════════════════════════════════════════════════
// SHARED_SCORING_JS — JEDEN zdroj hodnoticích helperů (bod D z revize).
// Vkládá se do učitelského verifieru i do instant testu, takže neexistuje trojí
// ručně udržovaná kopie → mizí třída chyb „opravil jsem to v instant, ale ne ve
// verifieru". Host-specifický rozdíl (CONFIG vs CFG pro španělštinu) se řeší přes
// __isSpanish(), který si každý host nadefinuje sám PŘED vložením tohoto bloku.
// Pozn.: ověřeno Node testem, že tyto funkce dávají identické výsledky jako původní
// kopie napříč norm/textScore/correctIndex/itemPoint (88/88). correctIndex je vědomě
// sjednoceno na verifierovou variantu (shoda textu přes norm) + obranná pojistka
// (bez options → -1); v reálu se volá jen u položek s polem options.
const SHARED_SCORING_JS = String.raw`
function norm(s){return String(s==null?'':s).toLowerCase().normalize('NFC').replace(/[.!?,;:"'()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();}
function stripDia(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function lev(a,b){if(a===b)return 0;var m=a.length,n=b.length,dp=[];for(var i=0;i<=m;i++){dp[i]=[];for(var j=0;j<=n;j++)dp[i][j]=i===0?j:j===0?i:0;}for(var i=1;i<=m;i++)for(var j=1;j<=n;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);return dp[m][n];}
var GRAMMAR_SENSITIVE_TYPES={'error correction':1,'error-tagging':1,'sentence transformation':1,'word formation':1};
/* Tolerance překlepů (Levenshtein ≤ 1). Řídí ji učitel přepínačem; každý host
   (instant test, secure student, verifier) si PŘED vložením tohoto bloku nadefinuje
   __fuzzyMode() vracející 'off' | 'mild' | 'strict'. Stejný vzor jako __isSpanish().
     off    → fuzzy se nepřiznává vůbec (jen přesná shoda, příp. diakritika u ŠJ);
              pravopis se hodnotí. Výchozí pro klasifikované/maturitní testy.
     mild   → původní chování: 0,85 (gramaticky citlivé typy 0,5).
     strict → mírný kredit 0,5 pro všechny typy.
   Pozn.: přesná shoda (g===c) vrací vždy 1 nezávisle na režimu, takže self-test
   bodování (přesná odpověď = 100 %, nesmysl = 0 %) prochází ve všech režimech.
   Délkový práh c.length>=6: u krátkých slov je editační vzdálenost 1 příliš
   benevolentní — pětipísmenný cíl má hustou „sousedskou" oblast skutečných JINÝCH
   slov ve vzdálenosti 1 (house→horse/mouse, plant→plane, their→heir), takže by
   fuzzy přiznala body za zjevně jiné slovo. Od délky 6+ jsou tyto sousedské oblasti
   řídké a shoda na vzdálenost 1 je drtivě překlep, ne jiné slovo. Práh 6 je striktně
   bezpečnější než původní >4 (nikdy nepřijme nic navíc, jen ubere krátká slova). */
function __fuzzyModeSafe(){try{var m=__fuzzyMode();return (m==='mild'||m==='strict')?m:'off';}catch(_){return 'off';}}
function fuzzyCredit(type){var m=__fuzzyModeSafe();if(m==='off')return 0;if(m==='strict')return 0.5;return GRAMMAR_SENSITIVE_TYPES[type]?0.5:0.85;}
function __isCzechSafe(){try{return !!__isCzech();}catch(_){return false;}}
function __csPolicySafe(){try{var p=__csScoringPolicy();return (p&&typeof p==='object')?p:{};}catch(_){return {};}}
function normForScore(s,type){var p=__csPolicySafe();if(__isCzechSafe()&&p.enabled){var v=String(s==null?'':s).normalize('NFC');if(p.diacritics===false)v=stripDia(v);if(!p.capitalization)v=v.toLowerCase();if(!p.punctuation)v=v.replace(/[.!?,;:"'()\[\]{}„“‚‘–—-]/g,' ');v=v.replace(/\s+/g,' ').trim();return v;}return norm(s);}
function textScore(given,correct,alts,type){var g=normForScore(given,type);if(!g)return 0;var all=[normForScore(correct,type)].concat((alts||[]).map(function(x){return normForScore(x,type);})).filter(Boolean);if(!all.length)return 0;var isEs=!!__isSpanish(),isCs=__isCzechSafe(),gNo=stripDia(g),best=0,fuzzy=isCs?0:fuzzyCredit(type);for(var i=0;i<all.length;i++){var c=all[i];if(g===c)return 1;if(isEs&&gNo===stripDia(c)){best=Math.max(best,0.5);continue;}if(fuzzy>0&&c.length>=6&&lev(g,c)<=1)best=Math.max(best,fuzzy);}return best;}
function indexNorm(s){return (__isCzechSafe()&&__csPolicySafe().enabled)?normForScore(s,'multiple choice'):norm(s);}
function correctIndex(it){if(!it||!Array.isArray(it.options))return -1;if(typeof it.correct==='number'){if(it.correct<0||it.correct>=it.options.length)return -1;return it.correct;}var c=String(it.correct==null?'':it.correct).trim();if(/^\d+$/.test(c)){var ni=Number(c);return (ni>=0&&ni<it.options.length)?ni:-1;}var byText=it.options.map(String).findIndex(function(x){return indexNorm(x)===indexNorm(c);});if(byText>=0)return byText;if(c.length===1){var letter=c.toUpperCase().charCodeAt(0)-65;if(letter>=0&&it.options[letter]!=null)return letter;}return -1;}
function accepted(it,fields){var vals=[];fields.forEach(function(k){if(Array.isArray(it[k]))vals=vals.concat(it[k]);else if(it[k]!=null)vals.push(it[k]);});return vals.map(function(x){return String(x);}).filter(Boolean);}
function itemPoint(ex,i){return Array.isArray(ex.item_points)&&ex.item_points[i]!=null?Number(ex.item_points[i])||0:Number(ex.points_each)||1;}
function scoreBlanks(keys,vals,altSource,pts,type,singleFlat){if(!keys||!keys.length)return 0;vals=vals||[];var got=0;for(var i=0;i<keys.length;i++){var alts;if(keys.length===1&&singleFlat)alts=Array.isArray(altSource)?altSource:[];else alts=(Array.isArray(altSource)&&Array.isArray(altSource[i]))?altSource[i]:[];got+=textScore(vals[i],keys[i],alts,type);}return pts*(got/keys.length);}
/* multi-select: porovnání MNOŽINY vybraných indexů s množinou správných.
   v1 = PŘÍSNÉ bodování: přesná shoda množin = plný počet bodů, jakýkoli rozdíl = 0.
   multiSelectStats vrací počty pro budoucí ČÁSTEČNÉ bodování (correct/wrong/missed),
   aniž by se teď do strict varianty zaváděla nestabilita — stačí pak napsat jiný vzorec. */
function multiSelectStats(sel,correct){var s={},c={},i,k;var selArr=Array.isArray(sel)?sel:[];var corArr=Array.isArray(correct)?correct:[];for(i=0;i<selArr.length;i++){var sv=parseInt(selArr[i],10);if(!isNaN(sv))s[sv]=1;}for(i=0;i<corArr.length;i++){var cv=parseInt(corArr[i],10);if(!isNaN(cv))c[cv]=1;}var hit=0,wrong=0,missed=0;for(k in s){if(s.hasOwnProperty(k)){if(c[k])hit++;else wrong++;}}for(k in c){if(c.hasOwnProperty(k)&&!s[k])missed++;}var nc=0;for(k in c){if(c.hasOwnProperty(k))nc++;}var ns=0;for(k in s){if(s.hasOwnProperty(k))ns++;}return {hit:hit,wrong:wrong,missed:missed,nCorrect:nc,nSelected:ns};}
function multiSelectScore(sel,correct,pts){var st=multiSelectStats(sel,correct);if(st.nCorrect===0)return 0;if(st.wrong===0&&st.missed===0&&st.nSelected===st.nCorrect)return pts;return 0;}
/* ordering: student seřadí položky; odpověď = pole PŮVODNÍCH indexů v aktuálním pořadí.
   correctOrder = permutace původních indexů ve správném pořadí. Když student nic nepřesune,
   odpověď je výchozí [0..n-1] (proto fallback). v1 = PŘÍSNÉ: celé pořadí přesně = plný počet, jinak 0.
   orderingStats vrací počet pozic na svém místě (pro pozdější ČÁSTEČNÉ bodování), strict varianta ho zatím nepoužívá. */
function orderingStats(seq,correctOrder){var co=Array.isArray(correctOrder)?correctOrder.map(Number):[];var s;if(Array.isArray(seq))s=seq.map(Number);else{s=[];for(var k=0;k<co.length;k++)s.push(k);}var inPlace=0;for(var i=0;i<co.length;i++){if(s[i]===co[i])inPlace++;}return {inPlace:inPlace,n:co.length,sameLength:s.length===co.length};}
function orderingScore(seq,correctOrder,pts){var st=orderingStats(seq,correctOrder);if(st.n===0)return 0;if(!st.sameLength)return 0;return st.inPlace===st.n?pts:0;}
/* highlight-evidence: student vybere jednu připravenou větu jako důkaz. Bodování je přesný index. */
function highlightEvidenceScore(val,correct,pts){var n=Number(val),c=Number(correct);if(!Number.isInteger(n)||!Number.isInteger(c))return 0;return n===c?pts:0;}
/* categorisation-board: student zařazuje položky do kategorií dropdownem.
   sel = pole zvolených kategorií indexované POZICÍ entry (sel[i] = kategorie pro entries[i]).
   entries = teacher data s {text, category}. ČÁSTEČNÉ bodování: každá správně zařazená položka
   = poměrný díl bodů (správně/celkem * pts). Porovnání kategorií přes norm() (case/diakritika-insensitive). */
function categoryBoardStats(sel,entries){var es=Array.isArray(entries)?entries:[];var sa=Array.isArray(sel)?sel:[];var correct=0;for(var i=0;i<es.length;i++){var want=(es[i]&&es[i].category!=null)?norm(es[i].category):'';var got=norm(sa[i]);if(want&&got&&got===want)correct++;}return {correct:correct,total:es.length};}
function categoryBoardScore(sel,entries,pts){var st=categoryBoardStats(sel,entries);if(st.total===0)return 0;return pts*(st.correct/st.total);}
/* table-completion: student doplňuje pouze buňky definované objektem {answer, alt_answers?}.
   val = dvourozměrné pole [row][col]. ČÁSTEČNÉ bodování: každá správně doplněná buňka
   = poměrný díl bodů za položku. Používá stejné textScore/normalizaci jako ostatní textové typy. */
function tableCompletionStats(val,rows,type){var rs=Array.isArray(rows)?rows:[];var grid=Array.isArray(val)?val:[];var total=0,score=0;for(var r=0;r<rs.length;r++){var row=Array.isArray(rs[r])?rs[r]:[];for(var c=0;c<row.length;c++){var cell=row[c];if(cell&&typeof cell==='object'&&!Array.isArray(cell)&&cell.answer!=null){total++;var got=(Array.isArray(grid[r])&&grid[r][c]!=null)?grid[r][c]:'';var alts=Array.isArray(cell.alt_answers)?cell.alt_answers:[];score+=textScore(got,cell.answer,alts,type||'table-completion');}}}return {score:score,total:total};}
function tableCompletionScore(val,rows,pts,type){var st=tableCompletionStats(val,rows,type);if(st.total===0)return 0;return pts*(st.score/st.total);}
/* transformation-chain: student transformuje jednu výchozí větu podle více instrukcí.
   val = pole odpovědí indexované transformací. ČÁSTEČNÉ bodování: každá správná transformace
   = poměrný díl bodů. Přijímá pouze answer/alt_answers přes textScore; žádné AI/parafráze. */
function transformationChainStats(val,transformations,type){var trs=Array.isArray(transformations)?transformations:[];var vals=Array.isArray(val)?val:[];var score=0,total=0;for(var i=0;i<trs.length;i++){var tr=trs[i];if(tr&&tr.answer!=null){total++;score+=textScore(vals[i],tr.answer,Array.isArray(tr.alt_answers)?tr.alt_answers:[],type||'transformation-chain');}}return {score:score,total:total};}
function transformationChainScore(val,transformations,pts,type){var st=transformationChainStats(val,transformations,type);if(st.total===0)return 0;return pts*(st.score/st.total);}
/* error-tagging: student vybere chybný token, určí typ chyby a napíše opravu.
   ČÁSTEČNÉ bodování: token / typ chyby / oprava mají stejnou váhu. Oprava používá
   textScore, tedy stejnou normalizaci jako ostatní textové odpovědi. */
function errorTaggingStats(val,item,type){var v=(val&&typeof val==='object'&&!Array.isArray(val))?val:{};var gotToken=(v.token!=null)?v.token:((v.tokenIndex!=null)?v.tokenIndex:v.error_token_index);var tokenOk=Number(gotToken)===Number(item&&item.error_token_index);var gotType=(v.etype!=null)?v.etype:((v.errorType!=null)?v.errorType:v.error_type);var typeOk=norm(gotType)===norm(item&&item.error_type);var gotCorr=(v.corr!=null)?v.corr:((v.correction!=null)?v.correction:v.answer);var corrScore=textScore(gotCorr,item&&item.correction,Array.isArray(item&&item.alt_answers)?item.alt_answers:[],type||'error-tagging');return {token:tokenOk?1:0,etype:typeOk?1:0,corr:corrScore,total:3};}
function errorTaggingScore(val,item,pts,type){var st=errorTaggingStats(val,item,type);return pts*((st.token+st.etype+st.corr)/st.total);}
`;

function buildVariantHtmls(cfg,variants){
  const out={};
  Object.keys(variants).forEach(key=>{
    const exs=variants[key]||[];
    out[key]={
      tabs: cfg.layout==='tabs'?buildTabsNavHtml(exs,cfg.labels):'',
      body: exs.map((ex,ei)=>buildExerciseHtml(ex,ei,cfg,exs.length)).join('')
    };
  });
  return out;
}


