// ═══ Test Template Engine ══════════════════════════════════════════════════════

function H(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
// Bezpečné vložení JSON do inline skriptu: zabrání, aby řetězec jako konec script tagu v obsahu
// (látka, text z přílohy, otázka, odpověď — část pochází z AI/uživatele) předčasně ukončil
// script blok nebo umožnil injektáž. JS parser si \u003C atd. přečte zpět jako původní znak,
// takže data v běžícím testu jsou identická (ověřeno round-trip testem).
function safeJsonForScript(obj){
  return JSON.stringify(obj)
    .replace(/</g,'\\u003C')
    .replace(/>/g,'\\u003E')
    .replace(/&/g,'\\u0026')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}
function b64UrlFromBuffer(buf){let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
// ── Tvrdá brána pro ostrý (klasifikovaný) režim ──────────────────────────────
// Bezpečnostní kryptografie (manifest hash, per-test secret, Teacher/Admin secret, Recovery Code,
// RSA klíč verifieru) NESMÍ tiše spadnout na slabý fallback (FNV / Math.random).
// Pravidlo platí pro všechny exportované testy včetně instant režimu: bez WebCrypto
// se generování zastaví s jasnou hláškou.
function requireWebCrypto(feature){
  if(!(window.crypto && crypto.subtle && crypto.getRandomValues && window.TextEncoder)){
    throw new Error((feature||'Bezpečný režim')+': prohlížeč nemá dostupné WebCrypto (crypto.subtle / getRandomValues). '
      +'Ostrý klasifikovaný test tímto nelze bezpečně vytvořit. Otevři aplikaci v běžném prohlížeči '
      +'(Chrome, Edge, Firefox, Safari) přes https:// nebo z místního souboru — ne ve vestavěném '
      +'náhledu/WebView, kde WebCrypto někdy chybí.');
  }
}
async function sha256Text(txt){requireWebCrypto('Výpočet SHA-256');const enc=new TextEncoder();const dig=await crypto.subtle.digest('SHA-256',enc.encode(String(txt||'')));return b64UrlFromBuffer(dig);}
function hexFromBuffer(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256HexText(txt){requireWebCrypto('Výpočet SHA-256');const enc=new TextEncoder();const dig=await crypto.subtle.digest('SHA-256',enc.encode(String(txt||'')));return hexFromBuffer(dig);}
function normalizeStudentIdentity(value){
  const raw=String(value==null?'':value);
  const unicode=(typeof raw.normalize==='function')?raw.normalize('NFKD'):raw;
  return unicode.toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
async function hashStudentIdentity(value,salt){
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)){
    throw new Error('Diferencovaný test vyžaduje WebCrypto pro bezpečné skrytí seznamu studentů.');
  }
  return sha256Text('GIT-DIFF-ROSTER-V1|'+String(salt||'')+'|'+normalizeStudentIdentity(value));
}
async function hashIdentityCode(value,salt){
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)) throw new Error('Jednorázové kódy vyžadují WebCrypto.');
  return sha256Text('GIT-IDENTITY-CODE-V1|'+String(salt||'')+'|'+normalizeStudentIdentity(value));
}
async function buildPublicIdentityCodeHashes(st,salt){
  if(!st || (st.identityMode||'name')!=='oneTimeCode') return [];
  const rows=Array.isArray(st.__roster)?st.__roster:((typeof rosterEntries!=='undefined'&&Array.isArray(rosterEntries))?rosterEntries:[]);
  const out=[];
  for(const row of rows){ if(row&&row.code) out.push(await hashIdentityCode(row.code,salt)); }
  return Array.from(new Set(out));
}
async function buildPublicDiffGroups(groups,salt){
  const out=[];
  for(const group of (groups||[])){
    const hashes=[];
    for(const student of (group.students||[])){
      hashes.push(await hashStudentIdentity(student,salt));
    }
    out.push({
      key:group.key,
      name:group.name,
      conditions:group.conditions||'',
      studentHashes:Array.from(new Set(hashes)),
      a11y:group.a11y||null
    });
  }
  return out;
}
// Hash učitelského přístupového kódu přes PBKDF2 (pomalé, anti-brute-force). DŘÍV se
// používal jen jednoprůchodový SHA-256 — ten jde zkoušet stovkami milionů pokusů/s na GPU,
// takže slabší PIN šel offline uhádnout. Stejná funkce je i v emitovaném studentu/verifieru,
// aby hash sedl. Prefix 'pbkdf2-v1$' odlišuje formát od starého SHA-256 hashe.
async function deriveSecretHash(kind, secret, testId){
  // Teacher/Admin i Recovery credential jsou case-insensitive, ale používají zcela oddělené PBKDF2 domény.
  const norm = (kind==='teacher-pin'||kind==='recovery-code') ? String(secret||'').trim().toUpperCase() : String(secret||'').trim();
  requireWebCrypto('Hash hesla/PINu');
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(norm),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(kind+'|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);
  return 'pbkdf2-v1$'+b64UrlFromBuffer(bits);
}
function stableStringify(obj){if(obj===null||typeof obj!=='object')return JSON.stringify(obj);if(Array.isArray(obj))return '['+obj.map(stableStringify).join(',')+']';return '{'+Object.keys(obj).sort().map(k=>JSON.stringify(k)+':'+stableStringify(obj[k])).join(',')+'}';}
function randomHex(bytes){const a=new Uint8Array(bytes||16);if(!(window.crypto&&crypto.getRandomValues))throw new Error('WebCrypto není dostupné — generování soli selhalo.');crypto.getRandomValues(a);return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('');}
function shuffled(arr) { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function resolveCorrectIndex(item) {
  if (!item || !Array.isArray(item.options)) return -1;
  if (typeof item.correct === 'number') { if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct >= item.options.length) return -1; return item.correct; }
  const c = String(item.correct ?? '').trim();
  if (/^[0-9]+$/.test(c)) { const index=Number(c); return index<item.options.length?index:-1; }
  const byText = item.options.map(String).findIndex(x => x.trim().toLowerCase() === c.toLowerCase());
  if (byText >= 0) return byText;
  if (c.length === 1) {
    const letter = c.toUpperCase().charCodeAt(0) - 65;
    if (letter >= 0 && letter < item.options.length) return letter;
  }
  return -1;
}

function makeItemPoints(total,count){total=Number(total)||0;count=Math.max(1,parseInt(count,10)||1);const base=Math.floor((total/count)*100)/100;const arr=Array(count).fill(base);let diff=Math.round((total-arr.reduce((a,b)=>a+b,0))*100),i=0;while(diff>0){arr[i%count]=Math.round((arr[i%count]+0.01)*100)/100;diff--;i++;}return arr;}
function fmtPts(n){n=Number(n)||0;return Number.isInteger(n)?String(n):String(Math.round(n*100)/100).replace('.',',');}
function itemPoint(ex,i){return Array.isArray(ex.item_points)&&ex.item_points[i]!=null?Number(ex.item_points[i])||0:Number(ex.points_each)||1;}
function exerciseTotalPoints(ex){if(Number.isFinite(Number(ex?.points_total)))return Number(ex.points_total);return Math.round((ex?.items||[]).reduce((s,_,i)=>s+itemPoint(ex,i),0)*100)/100;}
function normalizeA11y(a){a=a||{};const time=['normal','125','150','200','none'].includes(a.time)?a.time:'normal';const font=['normal','large','xlarge'].includes(a.font)?a.font:'normal';const dys=!!a.dys;if(time==='normal'&&font==='normal'&&!dys)return null;return {time,font,dys};}
function getApiDiffGroups(st){if(st.diferencovany!=='ANO'||!Array.isArray(st.skupiny))return[];return st.skupiny.map((g,i)=>({key:'g'+(i+1),name:String(g.nazev||('Skupina '+(i+1))).trim(),conditions:String(g.podminky||'').trim(),students:Array.isArray(g.studenti)?g.studenti.map(x=>String(x).trim()).filter(Boolean):[],a11y:normalizeA11y(g.a11y)})).filter(g=>g.name&&g.conditions&&g.students.length);}
function valueText(v){return String(v == null ? '' : v).replace(/\u0000/g,'').trim();}
function hasAnyText(obj, keys){return keys.some(k => valueText(obj && obj[k]).length > 0);}
function hasNonEmptyArray(obj, key){return Array.isArray(obj && obj[key]) && obj[key].filter(x => valueText(x).length > 0).length > 0;}

// style = učitelem zvolený pedagogický formát, type = kanonická bodovací/renderovací
// větev a title = volitelný tematický podtitulek od AI. Tyto údaje se nesmějí
// vzájemně nahrazovat. Starší export bez style bezpečně zobrazuje pouze type.
function exercisePedagogicalStyle(ex){return valueText(ex&&ex.style)||valueText(ex&&ex.type);}
function exerciseStyleLabel(ex){const raw=exercisePedagogicalStyle(ex);return raw?raw.charAt(0).toUpperCase()+raw.slice(1):'';}
function exerciseThemeTitle(ex){const title=valueText(ex&&ex.title),style=exercisePedagogicalStyle(ex),type=valueText(ex&&ex.type);if(!title)return '';const key=title.toLowerCase();return key===style.toLowerCase()||key===type.toLowerCase()?'':title;}
function exerciseDisplayName(ex){const style=exerciseStyleLabel(ex),title=exerciseThemeTitle(ex);return title?(style+' — '+title):style;}

function fidelityNormalizedText(value){return valueText(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/g,' ').replace(/\s+/g,' ').trim();}
function fidelityContentTokens(value){
  const stop=new Set(['the','a','an','and','or','to','of','in','on','for','with','is','are','was','were','what','which','who','when','where','why','how','choose','select','correct','answer','option','question','according','based','text','passage','article','story','extract','reading','vyber','zvol','spravnou','spravne','odpoved','otazka','podle','textu','pasaze','clanku','pribehu','ukazky']);
  return fidelityNormalizedText(value).split(' ').filter(token=>token.length>=3&&!stop.has(token));
}
// Resolve the primary student-visible text with the same per-type precedence as
// the canonicalizer and the instant/secure renderers. Generic prompt metadata
// must not override a more specific sentence, statement or text that is what
// the exported test actually shows.
function fidelityItemStem(item,type){
  if(!item||typeof item!=='object')return '';
  type=normalizeType(type||'');
  if(type==='fill-in-the-blank'||type==='error correction'||type==='word formation')return valueText(item.sentence||item.prompt||item.question);
  if(type==='true/false')return valueText(item.statement||item.question||item.prompt);
  if(type==='cloze text')return valueText(item.text||item.passage);
  if(type==='categorization')return valueText(item.text||item.item||item.prompt);
  if(type==='matching')return valueText(item.left);
  if(type==='transformation-chain')return valueText(item.base_sentence);
  if(type==='error-tagging')return valueText(item.sentence||(Array.isArray(item.tokens)?item.tokens.join(' '):''));
  if(type==='translation')return valueText(item.prompt||item.source||item.sentence||item.question);
  if(type==='sentence transformation')return valueText(item.prompt||item.sentence||item.question);
  if(type==='word order')return valueText(item.prompt||item.sentence||item.correct_sentence);
  return valueText(item.question||item.prompt||item.statement||item.sentence||item.base_sentence||item.left||item.text||item.item);
}
function fidelitySimilarity(a,b){const aa=Array.from(new Set(fidelityContentTokens(a))),bb=Array.from(new Set(fidelityContentTokens(b)));if(aa.length<8||bb.length<8)return 0;const bs=new Set(bb),inter=aa.filter(x=>bs.has(x)).length,union=new Set(aa.concat(bb)).size;return inter>=7&&union?inter/union:0;}
function fidelityStyleKey(value){const raw=valueText(value);return specialStyleKey(raw)||normalizeType(raw);}
function collectPedagogicalFidelityIssues(exercises,specs){
  const issues=[],rows=[];
  const normalizedOrderedContent=function(value){
    if(Array.isArray(value))return '['+value.map(normalizedOrderedContent).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>fidelityNormalizedText(key)+':'+normalizedOrderedContent(value[key])).join(',')+'}';
    return fidelityNormalizedText(String(value==null?'':value));
  };
  const normalizedUnorderedContent=function(value){
    return Array.isArray(value)?'['+value.map(normalizedOrderedContent).sort().join(',')+']':normalizedOrderedContent(value);
  };
  const resolvedOptionIndex=function(item){
    if(!item||!Array.isArray(item.options))return -1;
    if(typeof item.correct==='number')return Number.isInteger(item.correct)&&item.correct>=0&&item.correct<item.options.length?item.correct:-1;
    const correct=valueText(item.correct);
    if(/^[0-9]+$/.test(correct)){const index=Number(correct);return index<item.options.length?index:-1;}
    const byText=item.options.map(valueText).findIndex(option=>option.toLowerCase()===correct.toLowerCase());
    if(byText>=0)return byText;
    if(correct.length===1){const letter=correct.toUpperCase().charCodeAt(0)-65;return letter>=0&&letter<item.options.length?letter:-1;}
    return -1;
  };
  // Duplicate identity follows what the student can actually see (or select),
  // never the hidden grading key. Array order is preserved only where it has
  // semantic meaning; selectable pools are compared as multisets.
  const studentVisibleTaskFingerprint=function(type,item,exercise){
    if(!item||typeof item!=='object')return '';
    const parts=[];
    const addOrdered=function(name,value){if(Array.isArray(value)?value.length:value&&typeof value==='object'?Object.keys(value).length:valueText(value))parts.push(name+':'+normalizedOrderedContent(value));};
    const addUnordered=function(name,value){if(Array.isArray(value)&&value.length)parts.push(name+':'+normalizedUnorderedContent(value));};
    const choiceTypes=['multiple choice','reading comprehension','listening comprehension','dialogue completion','multi-select'];
    if(choiceTypes.includes(type))addUnordered('options',item.options);
    if(type==='fill-in-the-blank'||type==='cloze text'){
      const renderedText=type==='cloze text'?valueText(item.text||item.passage):valueText(item.sentence||item.prompt||item.question);
      if(renderedText)parts.push('gap-layout:'+renderedText.split('___').map(fidelityNormalizedText).join('<gap>'));
    }
    if(type==='word order'){
      const words=Array.isArray(item.words)?item.words:valueText(item.prompt||item.sentence).split(/\s+/).filter(Boolean);
      addUnordered('words',words);
    }
    else if(type==='ordering')addUnordered('items',item.items);
    else if(type==='matching'){
      const pool=exercise&&Array.isArray(exercise.items)?exercise.items.map(entry=>entry&&entry.right).filter(entry=>valueText(entry)):[];
      addUnordered('matching-pool',pool);
    }
    else if(type==='table-completion'){
      addOrdered('columns',item.columns);
      if(Array.isArray(item.rows)){
        const visibleRows=item.rows.map(function(row){return Array.isArray(row)?row.map(function(cell){return cell&&typeof cell==='object'&&!Array.isArray(cell)?{blank:true}:cell;}):row;});
        addOrdered('rows',visibleRows);
      }
    }else if(type==='transformation-chain'){
      addOrdered('instructions',Array.isArray(item.transformations)?item.transformations.map(step=>step&&step.instruction):[]);
    }else if(type==='error-tagging'){
      const tokens=Array.isArray(item.tokens)?item.tokens:valueText(item.sentence).split(/\s+/).filter(Boolean);
      addOrdered('tokens',tokens);
      addUnordered('error-type-options',item.error_type_options);
    }else if(type==='categorisation-board'){
      addUnordered('categories',item.categories);
      addUnordered('entries',Array.isArray(item.entries)?item.entries.map(entry=>entry&&entry.text):[]);
    }else if(type==='highlight-evidence')addUnordered('sentences',item.sentences);
    else if(type==='dialogue completion')addOrdered('dialogue',item.dialogue||item.prompt||item.question);
    else if(type==='categorization')addUnordered('categories',item.categories);
    else if(type==='sentence transformation')addOrdered('keyword',item.keyword);
    else if(type==='word formation')addOrdered('base-word',item.base_word||item.base);
    return parts.sort().join('|');
  };
  const readingVisibleContext=function(exercise){
    if(!exercise||typeof exercise!=='object')return '';
    const direct=valueText(exercise.passage||exercise.source_text||exercise.text||exercise.source);
    if(direct)return fidelityNormalizedText(direct);
    const items=Array.isArray(exercise.items)?exercise.items:[];
    let shared='';
    for(let i=0;i<items.length;i++){
      const candidate=valueText(items[i]&&(items[i].passage||items[i].text||items[i].source));
      if(i===0)shared=candidate;else if(candidate!==shared)return '';
    }
    return fidelityNormalizedText(shared);
  };
  const gradingKeyFingerprint=function(type,item){
    if(!item||typeof item!=='object')return '';
    const parts=[];
    const add=function(name,value,unordered){
      const present=Array.isArray(value)?value.length:value&&typeof value==='object'?Object.keys(value).length:Object.prototype.hasOwnProperty.call({value},'value')&&value!==undefined&&value!==null&&valueText(value)!=='';
      if(present)parts.push(name+':'+(unordered?normalizedUnorderedContent(value):normalizedOrderedContent(value)));
    };
    if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].includes(type)){
      const index=resolvedOptionIndex(item);
      if(index>=0)add('correct-option',item.options[index]);
    }else if(type==='multi-select'){
      const selected=(Array.isArray(item.correct)?item.correct:[]).map(index=>Array.isArray(item.options)?item.options[Number(index)]:undefined).filter(value=>value!==undefined);
      add('correct-options',selected,true);
    }else if(type==='highlight-evidence'){
      const index=Number(item.correct);
      if(Number.isInteger(index)&&Array.isArray(item.sentences)&&item.sentences[index]!=null)add('correct-sentence',item.sentences[index]);
    }else if(type==='word order')add('correct-sentence',item.correct_sentence!=null?item.correct_sentence:item.answer);
    else if(type==='ordering'){
      const sequence=(Array.isArray(item.correct_order)?item.correct_order:[]).map(index=>Array.isArray(item.items)?item.items[Number(index)]:undefined).filter(value=>value!==undefined);
      add('correct-order',sequence);
    }else if(type==='table-completion'){
      const answers=(Array.isArray(item.rows)?item.rows:[]).map(function(row){return Array.isArray(row)?row.map(function(cell){return cell&&typeof cell==='object'&&!Array.isArray(cell)?{answer:cell.answer,alt_answers:cell.alt_answers}:null;}):[];});
      add('cell-answers',answers);
    }else if(type==='transformation-chain'){
      const answers=(Array.isArray(item.transformations)?item.transformations:[]).map(step=>step&&{answer:step.answer,alt_answers:step.alt_answers});
      add('step-answers',answers);
    }else if(type==='categorisation-board'){
      const assignments=(Array.isArray(item.entries)?item.entries:[]).map(entry=>({text:entry&&entry.text,category:entry&&entry.category}));
      add('assignments',assignments,true);
    }else if(type==='error-tagging'){
      const tokens=Array.isArray(item.tokens)?item.tokens:valueText(item.sentence).split(/\s+/).filter(Boolean);
      const index=Number(item.error_token_index),token=Number.isInteger(index)?tokens[index]:undefined;
      add('error-token',token);add('error-type',item.error_type);add('correction',item.correction);
    }else if(type==='categorization')add('correct-category',item.correct_category!=null?item.correct_category:(item.category!=null?item.category:item.answer));
    else if(type==='true/false')add('correct',item.correct);
    else if(type==='matching')add('right',item.right);
    else {
      ['answer','answers','correct_answer','correctAnswer','correct_sentence','acceptable_answers','acceptableAnswers','expected','expected_answer','solution','translation','model_answer','correction'].forEach(function(key){
        if(Object.prototype.hasOwnProperty.call(item,key))add(fidelityNormalizedText(key),item[key],Array.isArray(item[key]));
      });
    }
    return parts.sort().join('|');
  };
  if(!Array.isArray(exercises))return issues;
  exercises.forEach(function(ex,ei){
    ex=ex&&typeof ex==='object'?ex:{};
    const spec=Array.isArray(specs)?specs[ei]:null,type=normalizeType(ex.type||''),items=Array.isArray(ex.items)?ex.items:[];
    const actualStyle=valueText(ex.style),expectedStyle=valueText(spec&&spec.style);
    if(actualStyle&&expectedStyle&&fidelityStyleKey(actualStyle)!==fidelityStyleKey(expectedStyle))issues.push({level:'bad',code:'style-mismatch',exercise:ei+1,detail:`cvičení ${ei+1}: pedagogický styl je "${actualStyle}", učitel zvolil "${expectedStyle}".`});
    if(spec&&type!==spec.type)issues.push({level:'bad',code:'type-style-mismatch',exercise:ei+1,detail:`cvičení ${ei+1}: styl "${expectedStyle}" se musí bodovat jako "${spec.type}", nikoli "${type}".`});
    if(type==='reading comprehension'){
      if(!hasAnyText(ex,['passage','source_text','text','source']))issues.push({level:'bad',code:'reading-context-missing',exercise:ei+1,detail:`cvičení ${ei+1}: Reading Comprehension nemá jeden sdílený passage na úrovni cvičení.`});
      items.forEach(function(item,qi){if(hasAnyText(item,['passage','source_text','text','source']))issues.push({level:'bad',code:'reading-context-repeated',exercise:ei+1,item:qi+1,detail:`cvičení ${ei+1}, položka ${qi+1}: Reading passage nesmí být skrytě opakován uvnitř položky.`});});
    }
    if(type==='multiple choice'){
      const hiddenExerciseContext=hasAnyText(ex,['passage','source_text','text','source']);
      items.forEach(function(item,qi){
        const stem=fidelityItemStem(item,type),hiddenItemContext=hasAnyText(item,['passage','source_text','text','source']);
        const normalizedStem=fidelityNormalizedText(stem);
        const contextReference=[
          /\b(?:according to|based on|in|from)\s+(?:(?:the|this|that)\s+)?(?:(?:following|preceding|above)\s+)?(?:text|passage|article|story|extract|reading)\b/,
          /\b(?:podle|v|ve|z|ze)\s+(?:(?:tohoto|toho|tamtoho)\s+)?(?:textu|pasaze|clanku|pribehu|ukazky)\b/,
          /\b(?:segun|de acuerdo con|basado en|en|del)\s+(?:(?:el|este|ese|aquel)\s+)?(?:(?:siguiente|anterior)\s+)?(?:texto|pasaje|articulo|relato|extracto|lectura)\b/,
          /\b(?:laut|gemass|gemaß|in|aus)\s+(?:(?:dem|diesem|jenem)\s+)?(?:text|abschnitt|artikel|auszug|lesetext)\b/
        ].some(pattern=>pattern.test(normalizedStem));
        if(hiddenExerciseContext||hiddenItemContext||contextReference)issues.push({level:'bad',code:'independent-mc-hidden-context',exercise:ei+1,item:qi+1,detail:`cvičení ${ei+1}, položka ${qi+1}: samostatné Multiple Choice odkazuje na text/passage, který jeho renderer studentovi nezobrazuje.`});
      });
    }
    items.forEach(function(item,qi){const stem=fidelityItemStem(item,type),normalized=fidelityNormalizedText(stem),tokens=fidelityContentTokens(stem),visibleFingerprint=studentVisibleTaskFingerprint(type,item,ex),keyFingerprint=gradingKeyFingerprint(type,item),readingContext=type==='reading comprehension'?readingVisibleContext(ex):'';if(normalized)rows.push({exercise:ei+1,item:qi+1,type,stem,normalized,tokens,visibleFingerprint,keyFingerprint,readingContext});});
  });
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const a=rows[i],b=rows[j];if(a.exercise===b.exercise)continue;
    if(a.normalized===b.normalized){
      const bothReading=a.type==='reading comprehension'&&b.type==='reading comprehension';
      if(a.visibleFingerprint===b.visibleFingerprint&&(!bothReading||a.readingContext===b.readingContext)){
        issues.push({level:'bad',code:'literal-cross-exercise-duplicate',exercise:a.exercise,item:a.item,otherExercise:b.exercise,otherItem:b.item,detail:`cvičení ${a.exercise}/${b.exercise}: položky ${a.item}/${b.item} představují stejnou studentovi zobrazenou úlohu napříč cvičeními.`});
        if(a.keyFingerprint&&b.keyFingerprint&&a.keyFingerprint!==b.keyFingerprint)issues.push({level:'bad',code:'cross-exercise-answer-key-conflict',exercise:a.exercise,item:a.item,otherExercise:b.exercise,otherItem:b.item,detail:`cvičení ${a.exercise}/${b.exercise}: shodná studentovi zobrazená úloha má rozporný správný odpovědní klíč.`});
      }
      continue;
    }
    const similarity=fidelitySimilarity(a.stem,b.stem);
    if(similarity>=0.82)issues.push({level:'warn',code:'high-cross-exercise-similarity',exercise:a.exercise,item:a.item,otherExercise:b.exercise,otherItem:b.item,similarity,detail:`cvičení ${a.exercise}/${b.exercise}: položky ${a.item}/${b.item} jsou vysoce podobné (${Math.round(similarity*100)} %); učitel má ověřit, že nejde o nechtěnou duplicitu.`});
  }
  return issues;
}
function buildPedagogicalReview(variants){
  const review={};
  Object.keys(variants||{}).forEach(key=>{const exs=variants[key]||[],specs=exs.map(ex=>({style:ex.style||'',type:scoringTypeFor(ex.style||ex.type)}));review[key]=collectPedagogicalFidelityIssues(exs,specs).map(issue=>({level:issue.level,code:issue.code,detail:issue.detail}));});
  return review;
}

// A single contract for the model, manual forms, editor and both scorers.
// Canonicalization copies data: validation and failed edits must not mutate inputs.
function canonicalizeExercise(ex, spec){
  if(!ex || typeof ex!=='object')return ex;
  const copy=JSON.parse(JSON.stringify(ex)), type=normalizeType(copy.type||''), style=(spec&&spec.style)||copy.style||'';
  copy.type=type;
  function alias(it,key,keys){if(!valueText(it[key])){for(const k of keys){if(valueText(it[k])){it[key]=it[k];break;}}}}
  copy.items=(Array.isArray(copy.items)?copy.items:[]).map(function(it){
    if(!it||typeof it!=='object'||Array.isArray(it))return it;
    if(['multiple choice','reading comprehension','listening comprehension','multi-select','ordering','highlight-evidence','categorisation-board','table-completion'].includes(type))alias(it,'question',['prompt']);
    if(type==='reading comprehension')alias(it,'passage',['text','source']);
    if(type==='dialogue completion')alias(it,'dialogue',['prompt','question']);
    if(type==='true/false')alias(it,'statement',['question','prompt']);
    if(['fill-in-the-blank','error correction','word formation'].includes(type))alias(it,'sentence',['prompt','question']);
    if(type==='translation'){alias(it,'prompt',['source','sentence','question']);alias(it,'answer',['translation','model_answer']);}
    if(type==='sentence transformation'){alias(it,'prompt',['sentence','question']);alias(it,'answer',['correct_sentence','model_answer']);}
    if(type==='error correction')alias(it,'correction',['answer']);
    if(type==='word order'){alias(it,'correct_sentence',['answer']);if(!Array.isArray(it.words)&&valueText(it.prompt||it.sentence))it.words=valueText(it.prompt||it.sentence).split(/\s+/);}
    if(type==='categorization'){alias(it,'text',['item','prompt']);alias(it,'correct_category',['category','answer']);}
    if(type==='cloze text')alias(it,'text',['passage']);
    if(type==='word formation')alias(it,'base_word',['base']);
    if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].includes(type))it.correct=resolveCorrectIndex(it);
    if(['highlight-evidence','error-tagging'].includes(type)){const k=type==='error-tagging'?'error_token_index':'correct';if(it[k]!=null&&typeof it[k]!=='boolean'&&String(it[k]).trim()!=='')it[k]=Number(it[k]);}
    if(type==='fill-in-the-blank'){
      if(style==='short answer'&&valueText(it.sentence)&&!String(it.sentence).includes('___'))it.sentence+=' ___';
      const gaps=(String(it.sentence||'').match(/___/g)||[]).length;
      if(gaps===1&&Array.isArray(it.answers)&&it.answers.length){
        if(!valueText(it.answer))it.answer=it.answers[0];
        const alts=Array.isArray(it.alt_answers)?it.alt_answers.flat():[];
        it.alt_answers=Array.from(new Set(alts.concat(it.answers.slice(1)).filter(x=>valueText(x))));
        delete it.answers;
      }
    }
    return it;
  });
  return copy;
}

function validateExerciseSetStrict(st,exercises,whereLabel){
  const specs=buildExerciseSpecs(st),errors=[];
  if(!Array.isArray(exercises)){
    errors.push(whereLabel+': chybí pole exercises.');
  }else if(exercises.length!==specs.length){
    errors.push(`${whereLabel}: počet cvičení je ${exercises.length}, očekáváno ${specs.length}.`);
  }
  const n=Math.min(Array.isArray(exercises)?exercises.length:0,specs.length);
  for(let i=0;i<n;i++){
    const spec=specs[i],ex=canonicalizeExercise(exercises[i]||{},spec),type=normalizeType(ex.type||'');
    if(!isAllowedExerciseType(type))errors.push(`${whereLabel}, cvičení ${i+1}: typ "${type}" je vypnutý, protože vyžaduje ruční hodnocení.`);
    if(type!==spec.type)errors.push(`${whereLabel}, cvičení ${i+1}: typ je "${type}", očekáváno "${spec.type}".`);
    const items=Array.isArray(ex.items)?ex.items:[];
    if(items.length!==spec.count)errors.push(`${whereLabel}, cvičení ${i+1}: počet položek je ${items.length}, očekáváno ${spec.count}.`);
    if(type==='matching'){const rights=items.map(it=>valueText(it&&it.right).toLowerCase());if(new Set(rights).size!==rights.length)errors.push(`${whereLabel}, cviceni ${i+1}: kazda prava strana matching musi byt jednoznacna (bez duplicit).`);}
    items.forEach((it,qi)=>{
      const loc=`${whereLabel}, cvičení ${i+1}, položka ${qi+1}`;
      if(!it || typeof it!=='object'||Array.isArray(it)){errors.push(`${loc}: položka není objekt.`);return;}
      if(['multiple choice','reading comprehension','listening comprehension','dialogue completion','multi-select'].includes(type)&&Array.isArray(it.options)){
        const labels=it.options.map(x=>valueText(x).toLowerCase());
        if(labels.some(x=>!x)||new Set(labels).size!==labels.length)errors.push(`${loc}: možnosti musí být vyplněné a navzájem odlišné.`);
      }
      if(['categorization','categorisation-board'].includes(type)&&Array.isArray(it.categories)){
        const cats=it.categories.map(x=>valueText(x).toLowerCase());
        if(cats.some(x=>!x)||new Set(cats).size!==cats.length)errors.push(`${loc}: kategorie musí být vyplněné a jedinečné.`);
        if(type==='categorization'&&!cats.includes(valueText(it.correct_category||it.category||it.answer).toLowerCase()))errors.push(`${loc}: správná kategorie není v nabídce.`);
      }
      if(['fill-in-the-blank','cloze text'].includes(type)){
        const text=type==='cloze text'?it.text:it.sentence;
        const gaps=(String(text||'').match(/___/g)||[]).length;
        const answers=type==='cloze text'||Array.isArray(it.answers)?it.answers:[it.answer];
        if(!Array.isArray(answers)||gaps!==answers.length||answers.some(x=>typeof x!=='string'||!valueText(x)))errors.push(`${loc}: kazda mezera ___ musi mit prave jednu nepr azdnou odpoved ve spravnem poradi.`.replace('nepr azdnou','neprazdnou'));
        if(Array.isArray(it.alt_answers)){
          const nested=type==='cloze text'||gaps>1;
          if(nested&&it.alt_answers.some(x=>!Array.isArray(x)))errors.push(`${loc}: alternativy musí být rozdělené po mezerách (pole polí).`);
          if(nested&&it.alt_answers.length>gaps)errors.push(`${loc}: alternativ je víc než mezer.`);
        }
      }
      if(['multiple choice','reading comprehension','listening comprehension'].includes(type)){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: chybí question/prompt.`);
        if(type==='listening comprehension'&&!hasAnyText(it,['transcript','audio_prompt','audio_source_note','source_url','text','passage']))errors.push(`${loc}: listening comprehension potřebuje teacher-only transcript/audio script/source note podle přiloženého audio/video/URL/dokumentu.`);
        if(!Array.isArray(it.options)||it.options.filter(x=>valueText(x)).length<2)errors.push(`${loc}: chybí alespoň dvě možnosti.`);
        if(resolveCorrectIndex(it)<0)errors.push(`${loc}: chybí správná odpověď nebo je correct mimo rozsah options (0 = první možnost).`);
      }else if(type==='dialogue completion'){
        if(!hasAnyText(it,['dialogue','prompt','question']))errors.push(`${loc}: dialogue completion potřebuje dialogue/prompt/question.`);
        if(!Array.isArray(it.options)||it.options.filter(x=>valueText(x)).length<2)errors.push(`${loc}: dialogue completion musí mít options[2+] kvůli automatickému hodnocení.`);
        if(resolveCorrectIndex(it)<0)errors.push(`${loc}: correct chybí nebo je mimo rozsah options (0 = první možnost).`);
      }else if(type==='matching'){
        if(!hasAnyText(it,['left'])||!hasAnyText(it,['right']))errors.push(`${loc}: matching potřebuje left i right.`);
      }else if(type==='true/false'){
        if(!hasAnyText(it,['statement','question','prompt']))errors.push(`${loc}: true/false potřebuje statement/question.`);
        if(typeof it.correct!=='boolean')errors.push(`${loc}: true/false potřebuje boolean correct.`);
      }else if(type==='fill-in-the-blank'){
        if(!hasAnyText(it,['sentence','prompt']))errors.push(`${loc}: fill-in-the-blank potřebuje sentence/prompt.`);
        if(valueText(it.sentence||it.prompt).indexOf('___')<0)errors.push(`${loc}: věta má obsahovat mezeru označenou ___ .`);
        if(!hasAnyText(it,['answer'])&&!hasNonEmptyArray(it,'answers'))errors.push(`${loc}: chybí answer.`);
      }else if(type==='word order'){
        if(!hasNonEmptyArray(it,'words')&&!hasAnyText(it,['prompt','sentence']))errors.push(`${loc}: word order potřebuje words[] nebo prompt/sentence.`);
        if(!hasAnyText(it,['correct_sentence','answer']))errors.push(`${loc}: word order potřebuje correct_sentence/answer.`);
      }else if(type==='open answer'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: open answer potřebuje question/prompt.`);
        if(!hasAnyText(it,['model_answer','answer']))errors.push(`${loc}: open answer potřebuje model_answer nebo answer pro učitelskou kontrolu.`);
      }else if(type==='translation'){
        if(!hasAnyText(it,['prompt','source','sentence','question']))errors.push(`${loc}: překlad potřebuje prompt/source.`);
        if(!hasAnyText(it,['answer','translation','model_answer']))errors.push(`${loc}: překlad potřebuje answer/translation.`);
      }else if(type==='error correction'){
        if(!hasAnyText(it,['sentence','prompt']))errors.push(`${loc}: error correction potřebuje sentence/prompt.`);
        if(!hasAnyText(it,['correction','answer']))errors.push(`${loc}: error correction potřebuje correction/answer.`);
      }else if(type==='error-tagging'){
        if(!valueText(it.sentence))errors.push(`${loc}: error-tagging potřebuje neprázdný string "sentence".`);
        const toks=Array.isArray(it.tokens)?it.tokens:null;
        if(!toks||toks.length<2){
          errors.push(`${loc}: error-tagging potřebuje pole "tokens" s alespoň dvěma tokeny.`);
        }else{
          toks.forEach((tok,ti)=>{ if(!valueText(tok))errors.push(`${loc}: error-tagging token ${ti+1} nesmí být prázdný.`); });
          const ix=Number(it.error_token_index);
          if(it.error_token_index==null||typeof it.error_token_index==='boolean'||String(it.error_token_index).trim()===''||!Number.isInteger(ix)||ix<0||ix>=toks.length)errors.push(`${loc}: error-tagging: error_token_index musí být platný 0-based index do tokens (0..${toks.length-1}).`);
        }
        const opts=Array.isArray(it.error_type_options)?it.error_type_options:null;
        if(!opts||opts.filter(x=>valueText(x)).length<2){
          errors.push(`${loc}: error-tagging potřebuje error_type_options s alespoň dvěma možnostmi.`);
        }else{
          opts.forEach((op,oi)=>{ if(!valueText(op))errors.push(`${loc}: error-tagging error_type_options ${oi+1} nesmí být prázdné.`); });
          const want=valueText(it.error_type);
          if(!want)errors.push(`${loc}: error-tagging potřebuje neprázdný error_type.`);
          else if(!opts.some(op=>String(op).trim()===want))errors.push(`${loc}: error-tagging: error_type musí přesně existovat v error_type_options.`);
        }
        if(!valueText(it.correction))errors.push(`${loc}: error-tagging potřebuje neprázdný string "correction".`);
      }else if(type==='cloze text'){
        if(!hasAnyText(it,['text','passage']))errors.push(`${loc}: cloze text potřebuje text/passage.`);
        if(valueText(it.text||it.passage).indexOf('___')<0)errors.push(`${loc}: cloze text má obsahovat mezery označené ___ .`);
        if(!Array.isArray(it.answers)||it.answers.filter(x=>valueText(x)).length<1)errors.push(`${loc}: cloze text potřebuje answers[].`);
      }else if(type==='sentence transformation'){
        if(!hasAnyText(it,['prompt','sentence','question']))errors.push(`${loc}: sentence transformation potřebuje prompt/sentence.`);
        if(!hasAnyText(it,['answer','correct_sentence','model_answer']))errors.push(`${loc}: sentence transformation potřebuje answer/correct_sentence.`);
      }else if(type==='categorization'){
        if(!hasAnyText(it,['text','item','prompt']))errors.push(`${loc}: categorization potřebuje text/item.`);
        if(!Array.isArray(it.categories)||it.categories.filter(x=>valueText(x)).length<1)errors.push(`${loc}: categorization potřebuje categories.`);
        if(!hasAnyText(it,['correct_category','category','answer']))errors.push(`${loc}: categorization potřebuje correct_category.`);
      }else if(type==='word formation'){
        if(!hasAnyText(it,['sentence','prompt','question']))errors.push(`${loc}: word formation potřebuje sentence/prompt.`);
        if(!hasAnyText(it,['answer']))errors.push(`${loc}: word formation potřebuje answer.`);
      }else if(type==='image description'){
        if(!hasAnyText(it,['image_description','prompt','question']))errors.push(`${loc}: image description potřebuje image_description/prompt.`);
        if(!hasAnyText(it,['model_answer','answer']))errors.push(`${loc}: image description potřebuje model_answer/answer.`);
      }else if(type==='multi-select'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: multi-select potřebuje question.`);
        if(!Array.isArray(it.options)||it.options.filter(x=>valueText(x)).length<2)errors.push(`${loc}: multi-select potřebuje alespoň dvě možnosti.`);
        if(!Array.isArray(it.correct)){
          errors.push(`${loc}: multi-select: "correct" musí být pole indexů (např. [0,2,3]).`);
        }else{
          const optsN=Array.isArray(it.options)?it.options.length:0;const seen={};let bad=false,dup=false;
          it.correct.forEach(ix=>{const num=Number(ix);if(ix==null||typeof ix==='boolean'||String(ix).trim()===''||!Number.isInteger(num)||num<0||num>=optsN)bad=true;if(seen[num])dup=true;seen[num]=1;});
          if(it.correct.length<1)errors.push(`${loc}: multi-select musí mít aspoň jednu správnou možnost.`);
          if(bad)errors.push(`${loc}: multi-select: každý index v "correct" musí odkazovat na existující možnost (0 = první).`);
          if(dup)errors.push(`${loc}: multi-select: "correct" nesmí obsahovat duplicitní indexy.`);
        }
      }else if(type==='ordering'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: ordering potřebuje question.`);
        const oitems=Array.isArray(it.items)?it.items:null;
        if(!oitems||oitems.filter(x=>valueText(x)).length<2)errors.push(`${loc}: ordering potřebuje pole "items" s alespoň dvěma položkami k seřazení.`);
        if(!Array.isArray(it.correct_order)){
          errors.push(`${loc}: ordering: "correct_order" musí být pole indexů (přesná permutace, např. [1,3,0,2]).`);
        }else if(oitems){
          const nn=oitems.length;const seen={};let bad=false,dup=false;
          it.correct_order.forEach(ix=>{const num=Number(ix);if(ix==null||typeof ix==='boolean'||String(ix).trim()===''||!Number.isInteger(num)||num<0||num>=nn)bad=true;if(seen[num])dup=true;seen[num]=1;});
          if(bad)errors.push(`${loc}: ordering: každý index v "correct_order" musí být 0..${nn-1}.`);
          if(dup)errors.push(`${loc}: ordering: "correct_order" nesmí obsahovat duplicitní indexy.`);
          if(it.correct_order.length!==nn)errors.push(`${loc}: ordering: "correct_order" musí obsahovat všechny indexy položek právě jednou (přesná permutace ${nn} položek).`);
        }
      }else if(type==='highlight-evidence'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: highlight-evidence potřebuje neprázdný question.`);
        const hs=Array.isArray(it.sentences)?it.sentences:null;
        if(!hs||hs.length<2){
          errors.push(`${loc}: highlight-evidence potřebuje sentences s alespoň dvěma větami.`);
        }else{
          hs.forEach((sent,si)=>{ if(!valueText(sent))errors.push(`${loc}: highlight-evidence věta ${si+1} nesmí být prázdná.`); });
          const ci=Number(it.correct);
          if(it.correct==null||typeof it.correct==='boolean'||String(it.correct).trim()===''||!Number.isInteger(ci)||ci<0||ci>=hs.length)errors.push(`${loc}: highlight-evidence: correct musí být platný 0-based index do sentences (0..${hs.length-1}).`);
        }
      }else if(type==='transformation-chain'){
        if(!hasAnyText(it,['base_sentence']))errors.push(`${loc}: transformation-chain potřebuje neprázdný base_sentence.`);
        const trs=Array.isArray(it.transformations)?it.transformations:null;
        if(!trs||trs.length<1){
          errors.push(`${loc}: transformation-chain potřebuje transformations s alespoň jednou položkou.`);
        }else{
          trs.forEach((tr,ti)=>{
            if(!tr||typeof tr!=='object'){errors.push(`${loc}: transformation ${ti+1} musí být objekt.`);return;}
            if(!valueText(tr.instruction))errors.push(`${loc}: transformation ${ti+1} potřebuje instruction.`);
            if(!valueText(tr.answer))errors.push(`${loc}: transformation ${ti+1} má prázdné answer.`);
            if(tr.alt_answers!=null&&!Array.isArray(tr.alt_answers))errors.push(`${loc}: transformation ${ti+1}: alt_answers musí být pole, nebo se má vynechat.`);
          });
        }
      }else if(type==='table-completion'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: table-completion potřebuje question.`);
        const cols=Array.isArray(it.columns)?it.columns:[];
        if(cols.length<2)errors.push(`${loc}: table-completion potřebuje "columns" s alespoň dvěma sloupci.`);
        if(cols.some(c=>!valueText(c)))errors.push(`${loc}: table-completion: názvy sloupců nesmí být prázdné.`);
        const rows=Array.isArray(it.rows)?it.rows:null;
        if(!rows||rows.length<1){errors.push(`${loc}: table-completion potřebuje "rows" s alespoň jedním řádkem.`);}
        else{
          let answerCells=0;
          rows.forEach((row,ri)=>{
            if(!Array.isArray(row)){errors.push(`${loc}: table-completion řádek ${ri+1} musí být pole buněk.`);return;}
            if(row.length!==cols.length)errors.push(`${loc}: table-completion řádek ${ri+1} má ${row.length} buněk, ale columns má ${cols.length}.`);
            row.forEach((cell,ci)=>{
              if(cell&&typeof cell==='object'&&!Array.isArray(cell)){
                answerCells++;
                if(!valueText(cell.answer))errors.push(`${loc}: table-completion buňka ${ri+1}:${ci+1} má prázdné answer.`);
                if(cell.alt_answers!=null&&!Array.isArray(cell.alt_answers))errors.push(`${loc}: table-completion buňka ${ri+1}:${ci+1}: alt_answers musí být pole, nebo se má vynechat.`);
              }else if(Array.isArray(cell)){
                errors.push(`${loc}: table-completion buňka ${ri+1}:${ci+1} nesmí být pole; použij string nebo {answer, alt_answers}.`);
              }
            });
          });
          if(answerCells<1)errors.push(`${loc}: table-completion musí mít alespoň jednu odpovědní buňku {answer:...}.`);
        }
      }else if(type==='categorisation-board'){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: categorisation-board potřebuje question.`);
        const cbcats=Array.isArray(it.categories)?it.categories:[];
        if(cbcats.some(c=>!valueText(c)))errors.push(`${loc}: categorisation-board: kategorie nesmí být prázdné stringy.`);
        const cbcatsOk=cbcats.filter(c=>valueText(c));
        if(cbcatsOk.length<2)errors.push(`${loc}: categorisation-board potřebuje "categories" s alespoň dvěma neprázdnými kategoriemi.`);
        const cbent=Array.isArray(it.entries)?it.entries:null;
        if(!cbent||cbent.length<2){errors.push(`${loc}: categorisation-board potřebuje "entries" s alespoň dvěma položkami.`);}
        else{
          const catSet={};cbcatsOk.forEach(c=>{catSet[String(c).trim().toLowerCase()]=1;});
          cbent.forEach((e,k)=>{
            if(!e||typeof e!=='object'||!valueText(e.text)){errors.push(`${loc}: entry ${k+1}: chybí neprázdný "text".`);return;}
            if(!valueText(e.category)){errors.push(`${loc}: entry ${k+1} ("${valueText(e.text)}"): chybí "category".`);return;}
            if(!catSet[String(e.category).trim().toLowerCase()])errors.push(`${loc}: entry ${k+1} má kategorii "${valueText(e.category)}", která není v "categories".`);
          });
        }
      }
    });
  }
  collectPedagogicalFidelityIssues(exercises,specs).filter(issue=>issue.level==='bad').forEach(issue=>errors.push(`${whereLabel}: ${issue.detail}`));
  if(errors.length){
    const err=new Error('Gemini vrátil data mimo zadání, test negeneruji:\n- '+errors.join('\n- '));
    err.isExerciseValidation=true;            // rozlišení od jiných chyb (crypto, síť…)
    err.validationDetails=errors.join('\n- '); // seznam konkrétních problémů pro opravný pokyn AI
    throw err;
  }
}


function csNormPlain(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();}
function csInferFocusFromType(type,domain){
  type=String(type||''); domain=String(domain||'');
  if(domain==='pravopis'||/spell|punctuation/i.test(type))return 'pravopis/interpunkce';
  if(domain==='tvaroslovi'||/word formation|categorization/i.test(type))return 'mluvnické kategorie / tvarosloví';
  if(domain==='skladba'||/syntax|sentence/i.test(type))return 'skladba';
  if(domain==='text'||/reading|evidence/i.test(type))return 'porozumění textu';
  if(domain==='slovni_zasoba')return 'slovní zásoba a význam slov';
  if(domain==='stylistika')return 'stylistická vhodnost';
  if(domain==='literatura')return 'literární teorie';
  return 'jazykový jev';
}
function csFallbackRule(type,domain,phenomenon){
  const ph=csNormPlain(phenomenon);
  const d=String(domain||'');
  if(d==='pravopis')return ph?('Řiď se pravidlem pro jev: '+ph+'.'):'U pravopisné úlohy je rozhodující přesný tvar, diakritika a zadáním sledovaný jev.';
  if(d==='skladba')return ph?('Při rozboru sleduj větné vztahy a jev: '+ph+'.'):'Ve skladbě rozhoduje vztah mezi členy/větami a jejich funkce ve větě.';
  if(d==='text')return 'Odpověď musí být opřená o informace přímo v textu, ne o domněnku mimo text.';
  if(d==='slovni_zasoba')return 'Význam slova nebo frazému určuj podle kontextu a přesného významového vztahu.';
  if(d==='stylistika')return 'Hodnotí se vhodnost formulace vzhledem ke komunikační situaci, adresátovi a stylové vrstvě.';
  if(d==='literatura')return 'Rozhoduj podle definice literárního pojmu a konkrétních znaků v ukázce.';
  if(d==='tvaroslovi')return 'Určuj tvar podle slovního druhu a příslušných mluvnických kategorií.';
  return 'Vysvětlení vychází ze sledovaného jazykového jevu a konkrétního zadání.';
}
function csEnsureItemFeedback(st,type,item,ex){
  if(String((st&&st.jazyk)||'').toLowerCase()!=='čeština')return item;
  if(!item||typeof item!=='object')return item;
  const cm=(st&&st.csModule)||{};
  const domain=csNormPlain(item.domain||ex.domain||cm.domain||'');
  const phenomenon=csNormPlain(item.phenomenon||ex.phenomenon||cm.phenomenon||csInferFocusFromType(type,domain));
  const rule=csNormPlain(item.rule||item.grammar_rule||item.spelling_rule||csFallbackRule(type,domain,phenomenon));
  const expl=csNormPlain(item.explanation||item.feedback||item.comment||item.model_answer||'');
  const focus=csNormPlain(item.errorFocus||item.error_focus||csInferFocusFromType(type,domain));
  const reviewTip=csNormPlain(item.reviewTip||item.review_tip||item.repeat||item.revision||('Zopakuj si: '+(phenomenon||focus)+'.'));
  const baseCorrect=csNormPlain(item.feedbackCorrect||item.feedback_correct||item.whyCorrect||item.why_correct||expl||('Správná odpověď odpovídá pravidlu: '+rule));
  const baseWrong=csNormPlain(item.feedbackIncorrect||item.feedback_incorrect||item.whyWrong||item.why_wrong||('Zkontroluj pravidlo a vrať se k jevu: '+(phenomenon||focus)+'.'));
  const existing=(item.csFeedback&&typeof item.csFeedback==='object')?item.csFeedback:{};
  item.csFeedback=Object.assign({
    phenomenon: phenomenon,
    rule: rule,
    whyCorrect: baseCorrect,
    whyIncorrect: baseWrong,
    reviewTip: reviewTip,
    errorFocus: focus
  }, existing);
  if(!item.phenomenon&&phenomenon)item.phenomenon=phenomenon;
  if(!item.rule&&rule)item.rule=rule;
  if(!item.errorFocus&&focus)item.errorFocus=focus;
  if(!item.feedback&&expl)item.feedback=expl;
  return item;
}
function csEnsureExerciseFeedback(st,type,ex,items){
  if(String((st&&st.jazyk)||'').toLowerCase()!=='čeština')return items;
  return (items||[]).map(function(it){return csEnsureItemFeedback(st,type,it,ex||{});});
}

function normalizeGeneratedExercises(st,genData,whereLabel='základní verze'){
  const specs=buildExerciseSpecs(st);
  const raw=Array.isArray(genData?.exercises)?genData.exercises.map((ex,i)=>canonicalizeExercise(ex,specs[i])):[];
  validateExerciseSetStrict(st,raw,whereLabel);
  return raw.map((ex,i)=>{
    const spec=specs[i],type=normalizeType(ex.type||spec.type);
    let items=Array.isArray(ex.items)?ex.items:[];
    if(type==='categorization'&&items.length===1&&Array.isArray(items[0].items)){
      const source=items[0],cats=source.categories||[];
      items=source.items.map(it=>({text:it.text||it.item||String(it),categories:cats,correct_category:it.correct_category||it.category||it.answer,explanation:it.explanation||source.explanation||''}));
    }
    const item_points=makeItemPoints(spec.pts,spec.count);
    items = csEnsureExerciseFeedback(st,type,ex,items);
    const GENERATOR_INTERNAL_FIELDS = ['manualMode']; // nikdy nepatří do studentského testu
    // Preserve an explicitly edited title and the selected pedagogical style.
    const cleanEx = Object.assign({},ex,{type,style:spec.style,title:valueText(ex.title)||spec.style||type,points_total:spec.pts,points_each:item_points[0]||1,item_points,items});
    GENERATOR_INTERNAL_FIELDS.forEach(function(k){ delete cleanEx[k]; });
    return cleanEx;
  });
}

function getGroupVariantExercisesRaw(genData,key){
  const gv=genData&&genData.group_variants;
  if(!gv||typeof gv!=='object')return null;
  const v=gv[key];
  if(Array.isArray(v))return {exercises:v};
  if(v&&Array.isArray(v.exercises))return v;
  return null;
}

function normalizeAllVariants(st,genData,diffGroups){
  const variants={};
  if(diffGroups.length){
    const missing=[];
    diffGroups.forEach(g=>{
      const raw=getGroupVariantExercisesRaw(genData,g.key);
      if(!raw)missing.push(g.key+' / '+g.name);
      else variants[g.key]=normalizeGeneratedExercises(st,raw,'skupina '+g.key+' ('+g.name+')');
    });
    if(missing.length)throw new Error('Gemini nevrátil samostatnou variantu pro všechny skupiny, test negeneruji:\n- chybí '+missing.join('\n- chybí '));
    variants.__default=variants[diffGroups[0].key];
  }else{
    variants.__default=normalizeGeneratedExercises(st,genData,'základní verze');
  }
  return variants;
}

function variantSummary(exercises){
  return {
    totalBody: exercises.reduce((s,ex)=>s+exerciseTotalPoints(ex),0),
    totalQ: exercises.reduce((s,ex)=>s+((ex.items||[]).length),0),
    exCount: exercises.length
  };
}
