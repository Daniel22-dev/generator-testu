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
// Bezpečnostní kryptografie (manifest hash, per-test secret, PIN/heslo, přístupový kód,
// RSA klíč verifieru) NESMÍ tiše spadnout na slabý fallback (FNV / Math.random). Když
// WebCrypto chybí, ostrý režim se zastaví s jasnou hláškou. Slabé fallbacky níž zůstávají
// jen pro neostré/dekorativní použití (instant režim, lokální demo ID), kam se přes tuhle
// bránu nelze dostat. (Pravidlo: WebCrypto dostupné → pokračuj; nedostupné → stop.)
function requireWebCrypto(feature){
  if(!(window.crypto && crypto.subtle && crypto.getRandomValues && window.TextEncoder)){
    throw new Error((feature||'Bezpečný režim')+': prohlížeč nemá dostupné WebCrypto (crypto.subtle / getRandomValues). '
      +'Ostrý klasifikovaný test tímto nelze bezpečně vytvořit. Otevři aplikaci v běžném prohlížeči '
      +'(Chrome, Edge, Firefox, Safari) přes https:// nebo z místního souboru — ne ve vestavěném '
      +'náhledu/WebView, kde WebCrypto někdy chybí.');
  }
}
async function sha256Text(txt){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))return 'fnv-'+shortHash(String(txt||''));const enc=new TextEncoder();const dig=await crypto.subtle.digest('SHA-256',enc.encode(String(txt||'')));return b64UrlFromBuffer(dig);}
function hexFromBuffer(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256HexText(txt){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))return 'fnv-'+shortHash(String(txt||''));const enc=new TextEncoder();const dig=await crypto.subtle.digest('SHA-256',enc.encode(String(txt||'')));return hexFromBuffer(dig);}
async function derivePerTestSecret(master,salt,manifestHash){if(!(window.crypto&&crypto.subtle&&window.TextEncoder))return 'fallback-'+shortHash(String(master)+'|'+String(salt)+'|'+String(manifestHash));const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(String(master||'')),{name:'PBKDF2'},false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode('GIT-v1|'+String(salt)+'|'+String(manifestHash)),iterations:120000,hash:'SHA-256'},key,256);return b64UrlFromBuffer(bits);}
// Hash PINu/hesla studentského zámku přes PBKDF2 (pomalé, anti-brute-force). DŘÍV se
// používal jen jednoprůchodový SHA-256 — ten jde zkoušet stovkami milionů pokusů/s na GPU,
// takže slabší PIN šel offline uhádnout. Stejná funkce je i v emitovaném studentu/verifieru,
// aby hash sedl. Prefix 'pbkdf2-v1$' odlišuje formát od starého SHA-256 hashe.
async function deriveSecretHash(kind, secret, testId){
  const norm = (kind==='teacher-pin') ? String(secret||'').trim().toUpperCase() : String(secret||'').trim();
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)) return 'fnv$'+shortHash(kind+'|'+norm+'|'+testId);
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
  if (typeof item.correct === 'number') { if (item.correct < 0 || item.correct >= item.options.length) return -1; return item.correct; }
  const c = String(item.correct ?? '').trim();
  if (/^[0-9]+$/.test(c)) return parseInt(c, 10);
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
function validateExerciseSetStrict(st,exercises,whereLabel){
  const specs=buildExerciseSpecs(st),errors=[];
  if(!Array.isArray(exercises)){
    errors.push(whereLabel+': chybí pole exercises.');
  }else if(exercises.length!==specs.length){
    errors.push(`${whereLabel}: počet cvičení je ${exercises.length}, očekáváno ${specs.length}.`);
  }
  const n=Math.min(Array.isArray(exercises)?exercises.length:0,specs.length);
  for(let i=0;i<n;i++){
    const ex=exercises[i]||{},spec=specs[i],type=normalizeType(ex.type||'');
    if(!isAllowedExerciseType(type))errors.push(`${whereLabel}, cvičení ${i+1}: typ "${type}" je vypnutý, protože vyžaduje ruční hodnocení.`);
    if(type!==spec.type)errors.push(`${whereLabel}, cvičení ${i+1}: typ je "${type}", očekáváno "${spec.type}".`);
    const items=Array.isArray(ex.items)?ex.items:[];
    if(items.length!==spec.count)errors.push(`${whereLabel}, cvičení ${i+1}: počet položek je ${items.length}, očekáváno ${spec.count}.`);
    items.forEach((it,qi)=>{
      const loc=`${whereLabel}, cvičení ${i+1}, položka ${qi+1}`;
      if(!it || typeof it!=='object'){errors.push(`${loc}: položka není objekt.`);return;}
      if(['multiple choice','reading comprehension','listening comprehension'].includes(type)){
        if(!hasAnyText(it,['question','prompt']))errors.push(`${loc}: chybí question/prompt.`);
        if(type==='reading comprehension'&&!hasAnyText(ex,['passage','source_text','text','source'])&&!hasAnyText(it,['passage','text','source']))errors.push(`${loc}: reading comprehension potřebuje sdílený text (passage) na úrovni cvičení, nebo u položky.`);
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
          if(!Number.isInteger(ix)||ix<0||ix>=toks.length)errors.push(`${loc}: error-tagging: error_token_index musí být platný 0-based index do tokens (0..${toks.length-1}).`);
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
          it.correct.forEach(ix=>{const num=Number(ix);if(!Number.isInteger(num)||num<0||num>=optsN)bad=true;if(seen[num])dup=true;seen[num]=1;});
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
          it.correct_order.forEach(ix=>{const num=Number(ix);if(!Number.isInteger(num)||num<0||num>=nn)bad=true;if(seen[num])dup=true;seen[num]=1;});
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
          if(!Number.isInteger(ci)||ci<0||ci>=hs.length)errors.push(`${loc}: highlight-evidence: correct musí být platný 0-based index do sentences (0..${hs.length-1}).`);
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
  const raw=Array.isArray(genData?.exercises)?genData.exercises:[];
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
    // Titul cvičení: AI generuje nesmysly ("test", "complete the test" apod.) → vždy použij typ
    const cleanEx = Object.assign({},ex,{type,title:type,points_total:spec.pts,points_each:item_points[0]||1,item_points,items});
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


// ─── Secure offline package (student without answer key + bulk teacher verifier) ──
function stripItemForStudent(item, type) {
  const out = {};
  if (type === 'matching') {
    if (item && item.left != null) out.left = item.left;
    return out;
  }
  const keep = ['question','prompt','sentence','statement','options','words','text','passage','dialogue','categories','item','source','keyword','base_word','media_note','items','columns','base_sentence','sentences'];
  keep.forEach(k => { if (item && item[k] != null) out[k] = item[k]; });
  // Teacher-only material must not go to the student file.
  delete out.transcript;
  delete out.explanation;
  if (type === 'listening comprehension') {
    // Audio/video/source URL is teacher-only. The student file only shows a generic instruction.
    out.audio_source_note = '__TEACHER_PLAYS_AUDIO__';
  }
  if (type === 'categorisation-board' && Array.isArray(item.entries)) {
    // Klíč je entry.category — student smí vidět jen text položek, NIKDY jejich kategorii.
    out.entries = item.entries.map(e => ({ text: (e && e.text != null) ? String(e.text) : '' }));
  }
  if (type === 'error-tagging') {
    // Klíčem jsou error_token_index/error_type/correction/explanation — student vidí jen větu, tokeny a možnosti typu chyby.
    if (Array.isArray(item && item.tokens)) out.tokens = item.tokens.map(x => String(x));
    if (Array.isArray(item && item.error_type_options)) out.error_type_options = item.error_type_options.map(x => String(x));
    delete out.error_token_index;
    delete out.error_type;
    delete out.correction;
    delete out.answer;
    delete out.alt_answers;
  }
  if (type === 'table-completion' && Array.isArray(item.rows)) {
    // Klíčem jsou cell.answer/alt_answers — student smí vidět jen pevné buňky a pozice inputů.
    out.rows = item.rows.map(row => Array.isArray(row) ? row.map(cell => (cell && typeof cell === 'object' && !Array.isArray(cell)) ? { input:true } : cell) : []);
  }
  if (type === 'transformation-chain' && Array.isArray(item.transformations)) {
    // Klíčem jsou transformation.answer/alt_answers — student smí vidět jen instrukce.
    out.transformations = item.transformations.map(tr => ({ instruction: (tr && tr.instruction != null) ? String(tr.instruction) : '' }));
  }
  return out;
}
function stripVariantsForStudent(variants) {
  const out = {};
  Object.keys(variants || {}).forEach(key => {
    out[key] = (variants[key] || []).map(ex => {
      const cleanEx = {
        title: ex.title || ex.type,
        type: ex.type,
        points_total: ex.points_total,
        points_each: ex.points_each,
        item_points: ex.item_points,
        items: (ex.items || []).map(it => stripItemForStudent(it, ex.type))
      };
      // Reading comprehension: sdílený text patří na úroveň cvičení (jeden text, víc otázek).
      // Student ho smí vidět (není to klíč), proto ho přeneseme do studentského balíčku.
      if (ex.type === 'reading comprehension') {
        const sp = ex.passage || ex.source_text || ex.text || ex.source || '';
        if (sp && String(sp).trim()) cleanEx.passage = String(sp);
      }
      if (ex.type === 'matching') {
        // Student smí vidět pravé možnosti, ale nikdy spárované s levými položkami.
        // Hodnota odpovědi je text vybrané možnosti; teacher verifier porovnává s teacher-only answer key.
        cleanEx.match_options = shuffled((ex.items || []).map(it => String(it && it.right != null ? it.right : '')).filter(Boolean));
      }
      return cleanEx;
    });
  });
  return out;
}
async function generateSecureKeyPair() {
  try {
    if (!(window.crypto && crypto.subtle)) throw new Error('WebCrypto unavailable');
    const pair = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'}, true, ['encrypt','decrypt']);
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    return { publicJwk, privateJwk, crypto:true };
  } catch(e) {
    return { publicJwk:null, privateJwk:null, crypto:false, error:String(e && e.message ? e.message : e) };
  }
}
function securePublicCfg(cfg, keyInfo) {
  return {
    v:1,
    mode:'secureOffline',
    generatorVersion:cfg.generatorVersion,
    buildHash:cfg.buildHash,
    releaseDate:cfg.releaseDate,
    releaseStatus:cfg.releaseStatus,
    resultMode:'secureOffline',
    creatorId:cfg.creatorId,
    creatorRole:cfg.creatorRole,
    appMode:cfg.appMode||'',
    testId:cfg.testId,
    manifestHash:cfg.manifestHash,
    nazev:cfg.nazev,
    proKoho:cfg.proKoho,
    jazyk:cfg.jazyk,
    uiLang:cfg.uiLang,
    cefr:cfg.cefr || '',
    cefrLevels:cfg.cefrLevels || [],
    cefrCombined:!!cfg.cefrCombined,
    secureLabels:getSecureStudentLabels(cfg.uiLang),
    identityMode:cfg.identityMode||'name',
    labels:cfg.labels || getLabels(cfg.uiLang),
    isCzech:!!cfg.isCzech,
    csScoringPolicy:cfg.csScoringPolicy||{},
    cas:cfg.cas,
    tema:cfg.tema,
    testMode:cfg.testMode,
    layout:cfg.layout,
    odevzdavani:'B',
    fuzzyTolerance:cfg.fuzzyTolerance||'off',
    randomizace:cfg.randomizace,
    zolicek:cfg.zolicek,
    ucitelJmeno:cfg.ucitelJmeno || '',
    ucitelPinHash:cfg.ucitelPinHash || '',
    hesloHash:cfg.hesloHash || '',
    hasUnlock:!!cfg.hasUnlock,
    diffGroups:(cfg.diffGroups||[]).map(g=>({key:g.key,name:g.name,students:g.students,a11y:g.a11y||null})),
    publicKey:keyInfo.publicJwk,
    crypto:keyInfo.crypto
  };
}
async function assembleSecureOfflinePackage(st, cfg, variants) {
  const keyInfo = await generateSecureKeyPair();
  const studentVariants = stripVariantsForStudent(variants);
  const publicCfg = securePublicCfg(cfg, keyInfo);
  const studentHtml = buildSecureStudentHtml(publicCfg, studentVariants);
  const studentHtmlSha256 = await sha256HexText(studentHtml);
  const teacherCfg = Object.assign({}, cfg, { privateKey:keyInfo.privateJwk, publicKey:keyInfo.publicJwk, crypto:keyInfo.crypto, cryptoError:keyInfo.error||'', roster:((((typeof st!=='undefined'&&st&&st.identityMode)||cfg.identityMode)==='oneTimeCode')?rosterForVerifier():[]), studentHtmlSha256 });
  const teacherHtml = buildSecureTeacherVerifierHtml(teacherCfg, variants);
  const teacherHtmlSha256 = await sha256HexText(teacherHtml);
  return {
    mode:'secureOffline',
    studentHtml,
    teacherHtml,
    testId:cfg.testId,
    manifestHash:cfg.manifestHash,
    buildHash:cfg.buildHash,
    generatorVersion:cfg.generatorVersion,
    releaseDate:cfg.releaseDate,
    releaseStatus:cfg.releaseStatus||'',
    generatedAt:cfg.generatedAt||'',
    creatorId:cfg.creatorId||'',
    creatorName:cfg.creatorName||'',
    creatorRole:cfg.creatorRole||'',
    studentHtmlSha256,
    teacherHtmlSha256
  };
}

function getSecureStudentLabels(lang) {
  const base = {
    cs: {
      secureMode:'Bezpečný offline režim', secureModeText:'po odevzdání neuvidíš známku. Stáhni zakódovaný soubor answers.txt a pošli ho učiteli.',
      chooseDevice:'Nejdřív vyber zařízení', chooseDeviceText:'zobrazí se jen postup, který se tě týká. Když si nejsi jistý/á, zvol „Nevím / automaticky“.',
      envBlockTitle:'⚠️ Otevři tento test jako webový odkaz v prohlížeči', envBlockText:'Zdá se, že test neběží jako běžná webová stránka, ale jako stažený HTML soubor, náhled souboru nebo vestavěný prohlížeč v aplikaci. V tomto prostředí nemusí fungovat jméno, start, zámky ani odevzdání. Neotevírej HTML soubor lokálně; zkopíruj webový odkaz na test a otevři ho v Safari na iPhonu/iPadu nebo v Chrome na Androidu.',
      apple:'iPhone / iPad', android:'Android', desktop:'PC / Mac', auto:'Nevím / automaticky',
      androidTitle:'Postup pro Android', appleTitle:'Postup pro iPhone/iPad', desktopTitle:'Postup pro PC/Mac', autoTitle:'Obecný postup',
      androidTips:['Doporučený prohlížeč je Chrome.','Neotevírej test jen v náhledu aplikace Teams/Drive/Messenger.','Po odevzdání hledej answers.txt ve Stažených souborech / Downloads.','Když se soubor nestáhne, použij Kopírovat zálohu.'],
      appleTips:['Test otevři pouze jako webový odkaz v Safari.','HTML soubor neotvírej lokálně ze Souborů, Documents, Teams, Gmailu ani Drive; tyto aplikace používej jen k uložení nebo odeslání answers.txt.','Když se odkaz otevře v náhledu aplikace, zkopíruj odkaz a vlož ho ručně do adresního řádku Safari.','Po odevzdání použij nejdřív Sdílet answers.txt; pokud to nejde, zkus Stáhnout answers.txt.','Když se soubor nestáhne ani nesdílí, použij Kopírovat zálohu a pošli celý text učiteli.'],
      desktopTips:['Doporučený je Chrome, Edge nebo Safari.','Po odevzdání ulož answers.txt a pošli ho učiteli podle pokynu.','Pokud stahování blokuje prohlížeč, použij Kopírovat zálohu.'],
      autoTips:['Vyber své zařízení výše, nebo pokračuj podle automaticky rozpoznaného prostředí.','Před testem spusť Otestovat zařízení a Zkusit stažení TXT.','Po odevzdání musíš učiteli předat answers.txt nebo záložní kód.'],
      notChecked:'Kontrola zařízení zatím nebyla spuštěna.', testDevice:'Otestovat zařízení', tryDownload:'Zkusit stažení TXT',
      deviceSelected:'Zvolené zařízení', textEncoding:'Textové kódování', txtCreation:'Vytvoření souboru TXT', crypto:'Bezpečné šifrování WebCrypto', env:'Doporučené prostředí', ok:'OK', unsupported:'nepodporováno', unavailable:'není dostupné',
      usable:'Zařízení vypadá použitelné. Test by měl běžet jako webová stránka v běžném prohlížeči. Přesto si před ostrým testem zkus stáhnout nebo sdílet testovací TXT.', risky:'Test neběží ve spolehlivém prostředí. Nepokračuj v náhledu souboru ani ve vestavěné aplikaci; otevři webový odkaz v Safari/Chrome.', unusable:'Toto prostředí není vhodné pro bezpečné odevzdání. Otevři webový odkaz v Safari/Chrome nebo použij školní počítač.',
      studentName:'Jméno nebo kód studenta', start:'Začít test', teacher:'Učitelský mód', teacherLogin:'Přihlášení učitele', teacherPanel:'Učitelský panel', teacherHint:'Tento bezpečný studentský soubor neobsahuje answer key. Odpovědi a známky jsou v teacher_verifier.html.',
      name:'Jméno učitele', pin:'PIN učitele / odemykací heslo', login:'Přihlásit', close:'Zavřít', logout:'Odhlásit', badLogin:'Nesprávný PIN, heslo nebo jméno.',
      author:'Autor', exercise:'Cvičení', question:'Otázka', listening:'Poslech', teacherAudio:'Poslech pustí učitel.', trueTxt:'Pravda', falseTxt:'Nepravda', choose:'vyber', next:'Další', prev:'Předchozí', submit:'Odevzdat',
      submitSecure:'Odevzdat a vytvořit answers.txt', done:'Odevzdáno', doneText:'Soubor answers.txt je připraven v záloze níže. Nejprve ho zkus stáhnout nebo sdílet. Pokud to na telefonu nejde, zkopíruj celý záložní text a pošli ho učiteli.',
      download:'Stáhnout answers.txt', share:'Sdílet answers.txt', copyBackup:'Kopírovat zálohu',
      locked:'Test uzamčen', lockReason:'Důvod', unlockPh:'Odemykací heslo', unlock:'Odemknout', lockedStrict:'Přísný režim: test se uzamkl po opuštění okna/aplikace.', lockContact:'Test je uzamčený. Kontaktuj učitele.', fullscreen:'Celá obrazovka', all:'Vše', teacherStatus:'Stav testu', teacherNoAnswers:'Správné odpovědi jsou pouze v učitelském verifieru.', student:'Student', group:'Skupina', started:'Začátek', submitted:'Odevzdáno', unlocked:'Test odemčen', lockedEvent:'opuštění okna/aplikace', downloadTestText:'TEST DOWNLOAD OK\nPokud tento soubor najdeš ve stažených souborech, stahování pravděpodobně funguje.', downloadStarted:'Testovací stažení bylo spuštěno. Prohlížeč ale neumí potvrdit, že se soubor opravdu uložil. Na iPhonu je v ostrém testu často spolehlivější Sdílet answers.txt nebo Kopírovat zálohu.', downloadFailed:'Testovací stažení selhalo', cryptoFail:'Toto prostředí nepodporuje bezpečné šifrování WebCrypto. Otevři test v Safari/Chrome nebo použij školní počítač.', encryptFail:'Nepodařilo se vytvořit bezpečný answers.txt', jokerChoiceTitle:'Volba žolíka', jokerChoiceHint:'Vyber před začátkem testu, zda píšeš test, nebo bereš žolíka. Volba je po startu nevratná.', jokerDoTest:'Dělám test', jokerTake:'Beru si žolíka', jokerReport:'ŽOLÍK POUŽIT', jokerSecureHint:'I při použití žolíka musíš v bezpečném offline režimu odevzdat answers.txt, aby učitel mohl test opravit. Verifier žolíka výrazně označí.'
    },
    es: {
      secureMode:'Modo seguro offline', secureModeText:'después de enviar no verás la nota. Descarga el archivo cifrado answers.txt y envíalo al profesor.',
      chooseDevice:'Primero elige el dispositivo', chooseDeviceText:'se mostrará solo el procedimiento que corresponde a tu dispositivo. Si no estás seguro/a, elige “No sé / automático”.',
      envBlockTitle:'⚠️ Abre esta prueba como enlace web en el navegador', envBlockText:'Parece que la prueba no se está ejecutando como una página web normal, sino como un archivo HTML descargado, una vista previa de archivo o un navegador integrado en una app. En este entorno pueden fallar el nombre, el inicio, los bloqueos y la entrega. No abras el HTML localmente; copia el enlace web de la prueba y ábrelo en Safari en iPhone/iPad o en Chrome en Android.',
      apple:'iPhone / iPad', android:'Android', desktop:'PC / Mac', auto:'No sé / automático',
      androidTitle:'Instrucciones para Android', appleTitle:'Instrucciones para iPhone/iPad', desktopTitle:'Instrucciones para PC/Mac', autoTitle:'Instrucciones generales',
      androidTips:['El navegador recomendado es Chrome.','No abras el test solo en la vista previa de Teams/Drive/Messenger.','Después de enviar, busca answers.txt en Descargas / Downloads.','Si el archivo no se descarga, usa Copiar copia de seguridad.'],
      appleTips:['Abre la prueba solo como enlace web en Safari.','No abras el archivo HTML localmente desde Archivos, Documents, Teams, Gmail o Drive; usa esas apps solo para guardar o enviar answers.txt.','Si el enlace se abre en una vista previa de una app, copia el enlace y pégalo manualmente en la barra de direcciones de Safari.','Después de enviar, usa primero Compartir answers.txt; si no funciona, prueba Descargar answers.txt.','Si no se puede descargar ni compartir, usa Copiar copia de seguridad y envía todo el texto al profesor.'],
      desktopTips:['Se recomienda Chrome, Edge o Safari.','Después de enviar, guarda answers.txt y envíalo al profesor según las instrucciones.','Si el navegador bloquea la descarga, usa Copiar copia de seguridad.'],
      autoTips:['Elige tu dispositivo arriba o continúa según el entorno detectado automáticamente.','Antes del test, usa Probar dispositivo y Probar descarga TXT.','Después de enviar, debes entregar answers.txt o el código de copia de seguridad al profesor.'],
      notChecked:'La comprobación del dispositivo todavía no se ha ejecutado.', testDevice:'Probar dispositivo', tryDownload:'Probar descarga TXT',
      deviceSelected:'Dispositivo elegido', textEncoding:'Codificación de texto', txtCreation:'Creación del archivo TXT', crypto:'Cifrado seguro WebCrypto', env:'Entorno recomendado', ok:'OK', unsupported:'no compatible', unavailable:'no disponible',
      usable:'El dispositivo parece utilizable. La prueba debe ejecutarse como página web en un navegador normal. Aun así, prueba descargar o compartir el TXT antes del test real.', risky:'La prueba no se está ejecutando en un entorno fiable. No continúes en una vista previa ni en una app integrada; abre el enlace web en Safari/Chrome.', unusable:'Este entorno no es adecuado para una entrega segura. Abre el enlace web en Safari/Chrome o usa un ordenador del centro.',
      studentName:'Nombre o código del estudiante', start:'Empezar test', teacher:'Modo profesor', teacherLogin:'Acceso del profesor', teacherPanel:'Panel del profesor', teacherHint:'Este archivo seguro para estudiantes no contiene la clave de respuestas. Las respuestas y notas están en teacher_verifier.html.',
      name:'Nombre del profesor', pin:'PIN del profesor / contraseña de desbloqueo', login:'Entrar', close:'Cerrar', logout:'Salir', badLogin:'PIN, contraseña o nombre incorrecto.',
      author:'Autor', exercise:'Ejercicio', question:'Pregunta', listening:'Audio', teacherAudio:'El profesor reproducirá el audio.', trueTxt:'Verdadero', falseTxt:'Falso', choose:'elige', next:'Siguiente', prev:'Anterior', submit:'Enviar',
      submitSecure:'Enviar y crear answers.txt', done:'Enviado', doneText:'El archivo answers.txt está preparado en la copia de seguridad de abajo. Primero intenta descargarlo o compartirlo. Si no funciona en el móvil, copia todo el texto de seguridad y envíalo al profesor.',
      download:'Descargar answers.txt', share:'Compartir answers.txt', copyBackup:'Copiar copia de seguridad',
      locked:'Test bloqueado', lockReason:'Motivo', unlockPh:'Contraseña de desbloqueo', unlock:'Desbloquear', lockedStrict:'Modo estricto: el test se bloqueó al salir de la ventana/aplicación.', lockContact:'El test está bloqueado. Avisa a tu profesor/a.', fullscreen:'Pantalla completa', all:'Todo', teacherStatus:'Estado del test', teacherNoAnswers:'Las respuestas correctas están solo en el verificador del profesor.', student:'Estudiante', group:'Grupo', started:'Inicio', submitted:'Enviado', unlocked:'Test desbloqueado', lockedEvent:'salida de la ventana/aplicación', downloadTestText:'TEST DOWNLOAD OK\nSi encuentras este archivo en Descargas, la descarga probablemente funciona.', downloadStarted:'La descarga de prueba se ha iniciado. El navegador no puede confirmar que el archivo se haya guardado.', downloadFailed:'La descarga de prueba ha fallado', cryptoFail:'Este entorno no admite el cifrado seguro WebCrypto. Abre el test en Safari/Chrome o usa un ordenador del centro.', encryptFail:'No se pudo crear el archivo seguro answers.txt', jokerChoiceTitle:'Elección del comodín', jokerChoiceHint:'Elige antes de empezar si haces el test o usas el comodín. La elección no se puede cambiar después del inicio.', jokerDoTest:'Hago el test', jokerTake:'Uso el comodín', jokerReport:'COMODÍN USADO', jokerSecureHint:'También con el comodín debes entregar answers.txt en el modo seguro offline para que el profesor pueda corregir el test. El verificador marcará claramente el comodín.'
    },
    en: {
      secureMode:'Secure offline mode', secureModeText:'after submitting, you will not see your grade. Download the encrypted answers.txt file and send it to your teacher.',
      chooseDevice:'First choose your device', chooseDeviceText:'only the relevant instructions will be shown. If you are not sure, choose “I don’t know / automatic”.',
      envBlockTitle:'⚠️ Open this test as a web link in the browser', envBlockText:'It looks like the test is not running as a normal web page, but as a downloaded HTML file, a file preview, or an in-app browser. In this environment, the name field, start button, security locks, and submission may fail. Do not open the HTML file locally; copy the web link to the test and open it in Safari on iPhone/iPad or in Chrome on Android.',
      apple:'iPhone / iPad', android:'Android', desktop:'PC / Mac', auto:'I don’t know / automatic',
      androidTitle:'Android instructions', appleTitle:'iPhone/iPad instructions', desktopTitle:'PC/Mac instructions', autoTitle:'General instructions',
      androidTips:['Recommended browser: Chrome.','Do not open the test only in the preview inside Teams/Drive/Messenger.','After submitting, look for answers.txt in Downloads.','If the file does not download, use Copy backup.'],
      appleTips:['Open the test only as a web link in Safari.','Do not open the HTML file locally from Files, Documents, Teams, Gmail, or Drive; use those apps only to save or send answers.txt.','If the link opens in an app preview, copy the link and paste it manually into the Safari address bar.','After submitting, use Share answers.txt first; if that fails, try Download answers.txt.','If downloading or sharing fails, use Copy backup and send the full text to your teacher.'],
      desktopTips:['Recommended browsers: Chrome, Edge or Safari.','After submitting, save answers.txt and send it to your teacher.','If downloading is blocked, use Copy backup.'],
      autoTips:['Choose your device above or continue with the automatically detected environment.','Before the test, use Test device and Try TXT download.','After submitting, send answers.txt or the backup code to your teacher.'],
      notChecked:'Device check has not been run yet.', testDevice:'Test device', tryDownload:'Try TXT download',
      deviceSelected:'Selected device', textEncoding:'Text encoding', txtCreation:'TXT file creation', crypto:'Secure WebCrypto encryption', env:'Recommended environment', ok:'OK', unsupported:'unsupported', unavailable:'unavailable',
      usable:'The device looks usable. The test should be running as a web page in a normal browser. Still, try downloading or sharing a test TXT before the real test.', risky:'The test is not running in a reliable environment. Do not continue in a file preview or embedded app; open the web link in Safari/Chrome.', unusable:'This environment is not suitable for secure submission. Open the web link in Safari/Chrome or use a school computer.',
      studentName:'Student name or code', start:'Start test', teacher:'Teacher mode', teacherLogin:'Teacher login', teacherPanel:'Teacher panel', teacherHint:'This secure student file does not contain the answer key. Answers and grades are in teacher_verifier.html.',
      name:'Teacher name', pin:'Teacher PIN', login:'Log in', close:'Close', logout:'Log out', badLogin:'Incorrect name or PIN.',
      author:'Author', exercise:'Exercise', question:'Question', listening:'Listening', teacherAudio:'The teacher will play the listening.', trueTxt:'True', falseTxt:'False', choose:'choose', next:'Next', prev:'Previous', submit:'Submit',
      submitSecure:'Submit and create answers.txt', done:'Submitted', doneText:'The answers.txt file is ready in the backup below. First try downloading or sharing it. If that does not work on your phone, copy the entire backup text and send it to your teacher.',
      download:'Download answers.txt', share:'Share answers.txt', copyBackup:'Copy backup',
      locked:'Test locked', lockReason:'Reason', unlockPh:'Unlock password', unlock:'Unlock', lockedStrict:'Strict mode: the test locked after leaving the window/app.', lockContact:'The test is locked. Contact your teacher.', fullscreen:'Fullscreen'
    }
  };
  base.de = Object.assign({}, base.en, {
    secureMode:'Sicherer Offline-Modus', secureModeText:'Nach dem Absenden siehst du keine Note. Lade die verschlüsselte Datei answers.txt herunter und sende sie an die Lehrkraft.',
    chooseDevice:'Wähle zuerst dein Gerät', chooseDeviceText:'Es werden nur die passenden Hinweise für dein Gerät angezeigt. Wenn du unsicher bist, wähle „Ich weiß nicht / automatisch”.',
    envBlockTitle:'⚠️ Öffne diesen Test als Weblink im Browser', envBlockText:'Der Test läuft anscheinend nicht als normale Webseite, sondern als heruntergeladene HTML-Datei, Dateivorschau oder eingebetteter Browser in einer App. In dieser Umgebung können Name, Start, Sicherheitssperren und Abgabe fehlschlagen. Öffne die HTML-Datei nicht lokal; kopiere den Weblink zum Test und öffne ihn auf iPhone/iPad in Safari oder auf Android in Chrome.',
    apple:'iPhone / iPad', android:'Android', desktop:'PC / Mac', auto:'Ich weiß nicht / automatisch',
    androidTitle:'Hinweise für Android', appleTitle:'Hinweise für iPhone/iPad', desktopTitle:'Hinweise für PC/Mac', autoTitle:'Allgemeine Hinweise',
    androidTips:['Empfohlener Browser: Chrome.','Öffne den Test nicht nur in der Vorschau von Teams/Drive/Messenger.','Nach dem Absenden findest du answers.txt im Ordner Downloads.','Wenn die Datei nicht heruntergeladen wird, nutze Sicherung kopieren.'],
    appleTips:['Öffne den Test nur als Weblink in Safari.','Öffne die HTML-Datei nicht lokal aus Dateien, Documents, Teams, Gmail oder Drive; nutze diese Apps nur zum Speichern oder Senden von answers.txt.','Wenn sich der Link in einer App-Vorschau öffnet, kopiere den Link und füge ihn manuell in die Adresszeile von Safari ein.','Nach dem Absenden nutze zuerst answers.txt teilen; wenn das nicht klappt, versuche answers.txt herunterzuladen.','Wenn weder Download noch Teilen funktioniert, kopiere die Sicherung und sende den gesamten Text an die Lehrkraft.'],
    desktopTips:['Empfohlen sind Chrome, Edge oder Safari.','Speichere nach dem Absenden answers.txt und sende die Datei an die Lehrkraft.','Wenn der Download blockiert wird, nutze Sicherung kopieren.'],
    autoTips:['Wähle oben dein Gerät oder nutze die automatisch erkannte Umgebung.','Teste vor dem Test dein Gerät und den TXT-Download.','Nach dem Absenden musst du answers.txt oder den Sicherungscode an die Lehrkraft senden.'],
    notChecked:'Die Gerätepruefung wurde noch nicht gestartet.', testDevice:'Gerät testen', tryDownload:'TXT-Download testen',
    deviceSelected:'Ausgewaehltes Gerät', textEncoding:'Textkodierung', txtCreation:'TXT-Datei erstellen', crypto:'Sichere WebCrypto-Verschlüsselung', env:'Empfohlene Umgebung', ok:'OK', unsupported:'nicht unterstützt', unavailable:'nicht verfügbar',
    usable:'Das Gerät scheint verwendbar zu sein. Der Test sollte als Webseite in einem normalen Browser laufen. Teste trotzdem vor dem echten Test den TXT-Download oder das Teilen.', risky:'Der Test läuft nicht in einer zuverlässigen Umgebung. Fahre nicht in einer Dateivorschau oder eingebetteten App fort; öffne den Weblink in Safari/Chrome.', unusable:'Diese Umgebung ist für eine sichere Abgabe nicht geeignet. Öffne den Weblink in Safari/Chrome oder nutze einen Schulcomputer.',
    studentName:'Name oder Code', start:'Test starten', teacher:'Lehrermodus', teacherLogin:'Lehrer-Login', teacherPanel:'Lehrerbereich', teacherHint:'Diese sichere Schülerdatei enthält keinen Lösungsschlüssel. Antworten und Noten sind in teacher_verifier.html.',
    name:'Name der Lehrkraft', pin:'Lehrer-PIN / Entsperrpasswort', login:'Anmelden', close:'Schließen', logout:'Abmelden', badLogin:'Falscher PIN, falsches Passwort oder falscher Name.',
    exercise:'Übung', question:'Frage', listening:'Hören', teacherAudio:'Die Lehrkraft spielt den Hörtext ab.', trueTxt:'Richtig', falseTxt:'Falsch', choose:'wählen', next:'Weiter', prev:'Zurück', submit:'Abgeben',
    submitSecure:'Abgeben und answers.txt erstellen', done:'Abgegeben', doneText:'Die Datei answers.txt ist unten als Sicherung vorbereitet. Versuche zuerst, sie herunterzuladen oder zu teilen. Wenn das auf dem Handy nicht funktioniert, kopiere den gesamten Sicherungstext und sende ihn an die Lehrkraft.',
    download:'answers.txt herunterladen', share:'answers.txt teilen', copyBackup:'Sicherung kopieren',
    locked:'Test gesperrt', lockReason:'Grund', unlockPh:'Entsperrpasswort', unlock:'Entsperren', lockedStrict:'Strenger Modus: Der Test wurde gesperrt, nachdem du das Fenster/die App verlassen hast.', lockContact:'Der Test ist gesperrt. Wende dich an die Lehrkraft.', fullscreen:'Vollbild', all:'Alle', teacherStatus:'Teststatus', teacherNoAnswers:'Die richtigen Antworten sind nur im Lehrer-Verifier.', student:'Schüler/in', group:'Gruppe', started:'Start', submitted:'Abgegeben', unlocked:'Test entsperrt', lockedEvent:'Fenster/App verlassen', downloadTestText:'TEST DOWNLOAD OK\nWenn du diese Datei in Downloads findest, funktioniert der Download wahrscheinlich.', downloadStarted:'Der Testdownload wurde gestartet. Der Browser kann aber nicht bestätigen, dass die Datei gespeichert wurde.', downloadFailed:'Testdownload fehlgeschlagen', cryptoFail:'Diese Umgebung unterstützt keine sichere WebCrypto-Verschlüsselung. Öffne den Test in Safari/Chrome oder nutze einen Schulcomputer.', encryptFail:'Die sichere answers.txt konnte nicht erstellt werden', jokerChoiceTitle:'Joker-Auswahl', jokerChoiceHint:'Wähle vor dem Start, ob du den Test schreibst oder den Joker nimmst. Die Wahl kann nach dem Start nicht geändert werden.', jokerDoTest:'Ich schreibe den Test', jokerTake:'Ich nehme den Joker', jokerReport:'JOKER VERWENDET', jokerSecureHint:'Auch mit Joker musst du im sicheren Offline-Modus answers.txt abgeben, damit die Lehrkraft den Test korrigieren kann. Der Verifier markiert den Joker deutlich.'
  });
  return base[lang] || base.cs;
}
function secureStudentExtraCss(){return '.device-choice{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}.device-btn{min-height:48px}.device-panel{margin:10px 0}.secure-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 0}.secure-tab{background:#fff;color:#1d4ed8;border:1px solid #c7d2fe;white-space:nowrap}.secure-tab.active{background:#1d4ed8;color:#fff}.ex-panel.hidden{display:none!important}.navrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:18px;z-index:50;overflow:auto}.modalbox{width:min(520px,100%);background:#fff;border-radius:16px;padding:18px;margin-top:24px;box-shadow:0 20px 60px rgba(0,0,0,.25)}.lockscreen{position:fixed;inset:0;background:#0f172a;color:#fff;z-index:60;display:flex;align-items:center;justify-content:center;padding:18px}.lockbox{width:min(520px,100%);background:#111827;border:1px solid #334155;border-radius:18px;padding:22px}.lockbox input,.modalbox input{margin:8px 0}.danger.small{font-size:13px}.teacher-open{margin-top:10px;width:100%}.joker-choice{border:2px solid var(--s-accent,#1d4ed8);background:var(--s-accent-bg,#eef3ff);border-radius:14px;padding:12px;margin:14px 0}.joker-title{font-weight:900;color:var(--s-accent,#1d4ed8);margin-bottom:4px}.joker-btn.selected{background:var(--s-accent,#1d4ed8)!important;color:var(--s-btntext,#fff)!important;border-color:var(--s-accent,#1d4ed8)!important}.joker-btn{padding:13px;border:2px solid #c7d2fe;border-radius:10px;background:#fff;color:#1d4ed8;font-weight:800;cursor:pointer;min-height:48px;font-size:15px;transition:all .12s}.joker-btn.selected::before{content:"✓ "}.joker-confirm{margin-top:10px;padding:10px 12px;border-radius:10px;font-weight:800;text-align:center;font-size:14px}.joker-confirm-ok{background:#dcfce7;color:#15803d;border:2px solid #15803d}.joker-confirm-risk{background:#fef3c7;color:#b45309;border:2px solid #f59e0b}.joker-risk.selected{box-shadow:0 0 0 3px rgba(245,158,11,.35)!important}.joker-watermark{position:sticky;top:58px;z-index:25;margin:8px auto;max-width:720px;padding:8px 12px;border:2px dashed var(--s-accent,#1d4ed8);border-radius:12px;background:var(--s-accent-bg,#eef3ff);color:var(--s-accent,#1d4ed8);font-weight:900;text-align:center;letter-spacing:.04em}.joker-result{border:3px solid var(--s-accent,#1d4ed8);background:var(--s-accent-bg,#eef3ff);color:var(--s-accent,#1d4ed8);border-radius:14px;padding:10px;margin:12px 0;font-size:16px;font-weight:900;text-align:center;letter-spacing:.04em}.joker-mode .card{position:relative}.joker-mode .ex-panel::after{content:"JOKER";position:absolute;right:18px;bottom:12px;font-size:34px;font-weight:900;color:var(--s-accent,#1d4ed8);opacity:.08;pointer-events:none;transform:rotate(-12deg)}.a11y-note{position:sticky;top:58px;z-index:24;margin:8px auto;max-width:720px;padding:7px 12px;border:2px solid var(--s-accent,#1d4ed8);border-radius:12px;background:var(--s-accent-bg,#eef3ff);color:var(--s-accent,#1d4ed8);font-weight:800;text-align:center}#exerciseArea{font-size:16px}body.a11y-large #exerciseArea{font-size:19px}body.a11y-xlarge #exerciseArea{font-size:22px}body.a11y-large #exerciseArea input,body.a11y-large #exerciseArea textarea,body.a11y-large #exerciseArea button,body.a11y-large #exerciseArea .opt,body.a11y-xlarge #exerciseArea input,body.a11y-xlarge #exerciseArea textarea,body.a11y-xlarge #exerciseArea button,body.a11y-xlarge #exerciseArea .opt{font-size:1em}body.a11y-dys #exerciseArea{font-family:Verdana,Tahoma,sans-serif;letter-spacing:.05em;word-spacing:.14em;line-height:1.95;text-align:left}body.a11y-dys #exerciseArea .opt,body.a11y-dys #exerciseArea .q,body.a11y-dys #exerciseArea p{line-height:1.95}.s-modal-bd{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:18px}.s-modal-box{background:#fff;border-radius:14px;max-width:460px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.s-modal-head{font-size:17px;font-weight:700;margin-bottom:8px;color:#111}.s-modal-body{font-size:14px;line-height:1.55;margin-bottom:16px;color:#374151;white-space:pre-wrap}.s-modal-act{display:flex;gap:8px;justify-content:flex-end}.s-modal-btn{padding:9px 18px;border-radius:9px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:14px;font-family:inherit}.s-modal-btn.primary{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.btn-fullscreen{display:inline-flex;align-items:center;justify-content:center;gap:8px}.fs-ico{display:inline-block;width:15px;height:15px;position:relative;flex-shrink:0}.fs-ico::before,.fs-ico::after{content:"";position:absolute;width:5px;height:5px;border-color:currentColor;border-style:solid}.fs-ico::before{top:0;left:0;border-width:2px 0 0 2px}.fs-ico::after{bottom:0;right:0;border-width:0 2px 2px 0}';}


function secureStudentThemeCss(tema){
  const v=getThemeVars(tema);
  return ':root{--s-bg:'+v.bg+';--s-card:'+v.card+';--s-card2:'+v.card2+';--s-text:'+v.text+';--s-muted:'+v.muted+';--s-border:'+v.border+';--s-accent:'+v.accent+';--s-accent-bg:'+v.accentBg+';--s-ok:'+v.ok+';--s-ok-bg:'+v.okBg+';--s-btntext:'+v.btnText+';--s-warn-bg:'+v.warnBg+';--s-warn-border:'+v.warnBorder+';--s-warn-text:'+v.warnText+'}' +
  'body{background:var(--s-bg)!important;color:var(--s-text)!important}' +
  '.card,.modalbox{background:var(--s-card)!important;border-color:var(--s-border)!important;color:var(--s-text)!important}' +
  '.bar{background:var(--s-card)!important;border-bottom-color:var(--s-border)!important;color:var(--s-text)!important}' +
  'h1,h2,h3,.teacher-preview-details>summary{color:var(--s-text)!important}.muted,.small{color:var(--s-muted)!important}' +
  'button{background:var(--s-accent)!important;color:var(--s-btntext)!important}button.secondary,.secure-tab{background:var(--s-accent-bg)!important;color:var(--s-accent)!important;border-color:var(--s-accent)!important}button.ghost{background:var(--s-card)!important;color:var(--s-text)!important;border-color:var(--s-border)!important}' +
  '.pill,.archive-note,.device-list div,.q,.feedback{background:var(--s-card2)!important;border-color:var(--s-border)!important;color:var(--s-text)!important}' +
  'input,textarea,select{background:var(--s-card)!important;color:var(--s-text)!important;border-color:var(--s-border)!important}' +
  '.tc-wrap,.tc-table th,.tc-table td{border-color:var(--s-border)!important}.tc-table{background:var(--s-card)!important}.tc-table th{background:var(--s-card2)!important;color:var(--s-text)!important}.tc-fixed{color:var(--s-text)!important}.trch-base{border-left-color:var(--s-accent)!important;background:var(--s-card2)!important;color:var(--s-text)!important}.trch-row{border-color:var(--s-border)!important;background:var(--s-card)!important;color:var(--s-text)!important}.he-sent{border-color:var(--s-border)!important;background:var(--s-card)!important;color:var(--s-text)!important}.he-sent.selected{border-color:var(--s-accent)!important;background:var(--s-accent-bg)!important;color:var(--s-text)!important}' +
  '.opt{background:var(--s-card)!important;color:var(--s-text)!important;border-color:var(--s-border)!important}.opt.selected,.secure-tab.active,.device-btn.selected{background:var(--s-accent)!important;color:var(--s-btntext)!important;border-color:var(--s-accent)!important}.device-btn{transition:all .12s}.device-btn.selected{box-shadow:0 0 0 3px var(--s-accent-bg,rgba(29,78,216,.3)),0 2px 8px rgba(0,0,0,.12)!important;font-weight:800}.device-btn.selected::before{content:"✓ "}.device-detected-tag{font-size:11px;color:var(--s-accent);font-weight:700;margin:4px 0 2px}' +
  '.src{background:var(--s-card2)!important;border-left-color:var(--s-accent)!important;color:var(--s-text)!important}.warn{background:var(--s-warn-bg)!important;border-color:var(--s-warn-border)!important;color:var(--s-warn-text)!important}.ok{background:var(--s-ok-bg)!important;border-color:var(--s-ok)!important;color:var(--s-ok)!important}' +
  '.lockscreen{background:#0f172a!important;color:#fff!important}.lockbox{background:#111827!important;border-color:#334155!important;color:#fff!important}';
}
function secureCss() {
  return 'body{margin:0;background:#f4f6fb;color:#182033;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.5}'+
  '.wrap{max-width:860px;margin:0 auto;padding:18px}.card{background:#fff;border:1px solid #d9e0ee;border-radius:16px;padding:18px;margin:12px 0;box-shadow:0 8px 28px rgba(20,30,60,.08)}'+
  'h1{margin:0 0 4px;font-size:26px}.muted{color:#647089;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:12px 0}.pill{background:#eef3ff;border:1px solid #d6e2ff;border-radius:12px;padding:10px;font-weight:700}'+
  'input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #c9d3e5;border-radius:10px;padding:11px;font-size:16px;background:#fff;color:#182033}button{border:0;border-radius:12px;padding:12px 16px;font-size:15px;font-weight:800;cursor:pointer;background:#1d4ed8;color:#fff;min-height:44px}button.secondary{background:#eef2ff;color:#1d4ed8;border:1px solid #c7d2fe}button.ghost{background:#fff;color:#334155;border:1px solid #cbd5e1}button.selected{background:#0f766e;color:#fff}.q{border:1px solid #e0e7f1;border-radius:14px;padding:14px;margin:12px 0}.qhead{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#647089;margin-bottom:8px}.opts{display:grid;gap:8px;margin-top:10px}.opt{background:#fff;color:#182033;border:1.5px solid #cbd5e1;text-align:left}.opt.selected{background:#dbeafe;border-color:#1d4ed8;color:#0f172a}.ms-opt{display:flex;align-items:center;gap:10px}.ms-box{flex:0 0 auto;width:20px;height:20px;border:2px solid #94a3b8;border-radius:5px;display:inline-block;position:relative;background:#fff}.opt.selected .ms-box{border-color:#1d4ed8;background:#1d4ed8}.opt.selected .ms-box::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.ms-hint{font-size:12px;color:#647089;margin:6px 0}.ord-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.ord-row{display:flex;align-items:center;gap:12px;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 14px;background:#fff;cursor:pointer;transition:border-color .15s,background .15s;user-select:none}.ord-row:hover{border-color:#1d4ed8;background:#eff6ff}.ord-row.ord-picked{border-color:#1d4ed8;background:#eff6ff}.ord-badge{flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#647089;background:#f1f5f9;transition:all .15s}.ord-row.ord-picked .ord-badge{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.ord-txt{flex:1;text-align:left}.ord-hint{font-size:12px;color:#647089;margin-top:6px}.cb-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.cb-row{display:flex;flex-direction:column;gap:6px;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#fff}.cb-txt{font-weight:600;text-align:left}.cb-sel{width:100%}.tc-wrap{overflow-x:auto;margin-top:10px;border:1px solid #e0e7f1;border-radius:12px}.tc-table{width:100%;min-width:520px;border-collapse:collapse;background:#fff}.tc-table th,.tc-table td{border-bottom:1px solid #e5e7eb;border-right:1px solid #eef2f7;padding:8px 10px;text-align:left;vertical-align:middle}.tc-table th{background:#f8fafc;color:#334155;font-size:13px}.tc-table td:last-child,.tc-table th:last-child{border-right:0}.tc-fixed{font-weight:700;color:#182033}.tc-inp{min-width:110px}.trch-base{margin:9px 0;padding:10px 12px;border-left:4px solid #1d4ed8;background:#f8fafc;border-radius:10px;font-weight:800;color:#182033}.trch-list{display:flex;flex-direction:column;gap:9px;margin-top:10px}.trch-row{border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:#fff;color:#182033}.trch-instr{font-weight:700;margin-bottom:6px}.trch-inp{width:100%}.he-list{display:grid;gap:8px;margin-top:10px}.he-sent{white-space:normal;line-height:1.55}.src{background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:10px;padding:10px;margin:8px 0;color:#334155}.hidden{display:none!important}.bar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 18px;z-index:3;display:flex;justify-content:space-between;align-items:center}.warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:10px;margin:10px 0}.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:12px;padding:10px;margin:10px 0}.danger{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:10px;margin:10px 0}.backup{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;min-height:130px}.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}.small{font-size:12px}.feedback{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0}.dropzone{border:2px dashed #93a4c3;border-radius:16px;padding:20px;text-align:center;background:#f8fbff;color:#42526b;margin:10px 0}.dropzone.drag{background:#e0f2fe;border-color:#0284c7}.device-list{display:grid;gap:6px;margin:8px 0}.device-list div{padding:7px 9px;border-radius:9px;background:#f8fafc;border:1px solid #e2e8f0}.archive-note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:10px 0}.env-block{background:#fef2f2;border:2px solid #ef4444;color:#991b1b;border-radius:12px;padding:12px 14px;margin:12px 0;font-size:15px;line-height:1.45;font-weight:600}.env-block b{font-size:16px}.backup{white-space:pre-wrap}.teacher-preview-details>summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:22px;font-weight:800;color:#182033}.teacher-preview-details>summary::-webkit-details-marker{display:none}.teacher-preview-details summary small{font-size:12px;font-weight:600;color:#647089}.teacher-preview-details[open]>summary{margin-bottom:10px}.feedback-item{border-width:2px}.feedback-item.ans-ok{background:#ecfdf5;border-color:#34d399}.feedback-item.ans-bad{background:#fff1f2;border-color:#fb7185}.badge{display:inline-block;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:900}.badge.ok-badge{background:#d1fae5;color:#065f46}.badge.bad-badge{background:#fee2e2;color:#991b1b}.student-answer{border-radius:10px;padding:7px 9px;margin-top:6px;font-weight:700}.student-answer.ok{background:#d1fae5;color:#065f46}.student-answer.bad{background:#fee2e2;color:#991b1b}.correct-answer{border-radius:10px;padding:7px 9px;margin-top:6px;background:#eff6ff;color:#1e3a8a}.result-row-ok td{background:#f8fffb}.result-row-warn td{background:#fff7ed;color:#9a3412}.result-row-bad td{background:#fff1f2;color:#991b1b}#studentFilter{min-width:220px}#studentSelect{min-width:220px}.problem-high{background:#fff7ed}.signal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:10px 0}.signal-card{border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:12px;padding:10px}.signal-card.ok{border-color:#a7f3d0;background:#ecfdf5;color:#065f46}.signal-card b{display:block;font-size:18px}.signal-note{font-size:12px;color:#647089;margin-top:4px}.signal-list{margin:0;padding-left:18px}.signal-list li{margin:3px 0}.signal-badge{display:inline-block;border-radius:999px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:2px 8px;font-size:12px;font-weight:800}.sev-badge{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:800}.sev-soft{background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3}.sev-hard{background:#fff7ed;border:1px solid #fdba74;color:#9a3412}.cs-fb{margin-top:8px;border-left:4px solid #1d4ed8;background:#eff6ff;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.55;color:#1e293b}.cs-fb div+div{margin-top:3px}.cs-fb-ok{border-left-color:#10b981;background:#ecfdf5}.cs-fb-bad{border-left-color:#ef4444;background:#fff1f2}';
}
function buildSecureStudentHtml(publicCfg, studentVariants) {
  const S = publicCfg.secureLabels || getSecureStudentLabels(publicCfg.uiLang);
  const L = publicCfg.labels || {};
  const htmlLang = H(publicCfg.uiLang || 'cs');
  return '<!DOCTYPE html>\n<html lang="'+htmlLang+'"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+H(publicCfg.nazev)+' — student</title><style>'+secureCss()+secureStudentExtraCss()+secureStudentThemeCss(publicCfg.tema)+'</style></head><body>'+auditCommentHtml(publicCfg)+
    '<div class="wrap"><section id="intro" class="card"><h1>'+H(publicCfg.nazev)+'</h1><div class="muted">'+H(publicCfg.proKoho||'')+' · Test ID: '+H(publicCfg.testId)+(publicCfg.cefr?' · CEFR: '+H(publicCfg.cefr):'')+((publicCfg.creatorName||publicCfg.creatorId)?' · '+H(S.author||'Autor')+': '+H(publicCfg.creatorName||publicCfg.creatorId):'')+'</div>'+ 
    '<div class="warn"><b>'+H(S.secureMode)+':</b> '+H(S.secureModeText)+'</div>'+ 
    '<div class="archive-note"><b>'+H(S.chooseDevice)+':</b> '+H(S.chooseDeviceText)+'</div>'+ 
    '<div class="env-block hidden" id="envWarning"><b>'+H(S.envBlockTitle)+'</b><br>'+H(S.envBlockText)+'</div>'+ 
    '<div class="device-detected-tag" id="deviceDetectedTag"></div>'+
    '<div class="device-choice" id="deviceChoice">'+
      '<button class="device-btn" type="button" data-device="apple" onclick="pickDevice(\'apple\')">🍎 '+H(S.apple)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="android" onclick="pickDevice(\'android\')">🤖 '+H(S.android)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="desktop" onclick="pickDevice(\'desktop\')">💻 '+H(S.desktop)+'</button>'+ 
      '<button class="device-btn" type="button" data-device="auto" onclick="pickDevice(\'auto\')">❔ '+H(S.auto)+'</button>'+ 
    '</div>'+ 
    '<div class="device-panel" id="deviceInstructions"></div>'+ 
    '<div class="device-list" id="deviceStatus"><div>'+H(S.notChecked)+'</div></div><div class="row"><button class="secondary" type="button" onclick="checkDevice(true)">'+H(S.testDevice)+'</button><button class="ghost" type="button" onclick="testDownload()">'+H(S.tryDownload)+'</button></div>'+ 
    '<button class="ghost btn-fullscreen" type="button" onclick="enterFullscreen()"><span class="fs-ico" aria-hidden="true"></span> '+H(S.fullscreen || 'Fullscreen')+'</button>'+ 
    (publicCfg.zolicek ? '<div class="joker-choice" id="jokerChoice"><div class="joker-title">🃏 '+H(S.jokerChoiceTitle || 'Volba žolíka')+'</div><div class="small">'+H(S.jokerChoiceHint || 'Vyber před začátkem testu. Volba je nevratná.')+'</div><div class="row" style="margin-top:8px"><button type="button" class="joker-btn" id="jokerNo" onclick="chooseJokerStart(false)">'+H(S.jokerDoTest || 'Dělám test')+'</button><button type="button" class="joker-btn joker-risk" id="jokerYes" onclick="chooseJokerStart(true)">'+H(S.jokerTake || 'Beru si žolíka')+'</button></div><div class="joker-confirm" id="jokerChoiceConfirm" style="display:none"></div><div class="small muted" style="margin-top:6px">'+H(S.jokerSecureHint || 'I při žolíkovi odešli answers.txt; učitel uvidí označení ve verifieru.')+'</div></div>' : '')+
    '<label>'+(publicCfg.identityMode==='oneTimeCode'?'Tvůj jednorázový kód':H(S.studentName))+'</label><input id="studentName" autocomplete="off" autocorrect="off" placeholder="'+(publicCfg.identityMode==='oneTimeCode'?'kód od učitele':'')+'"><div class="row" style="margin-top:12px"><button onclick="startTest()">'+H(S.start)+'</button></div>'+ 
    '<button class="ghost teacher-open" type="button" onclick="openTeacherModal()">🔒 '+H(S.teacher)+'</button></section>'+ 
    '<section id="test" class="hidden"><div class="bar"><b>'+H(publicCfg.nazev)+'</b><span id="timer">--:--</span></div><div id="a11yNote" class="a11y-note hidden"></div><div id="jokerWatermark" class="joker-watermark hidden"></div><div class="wrap"><div id="exerciseArea"></div><div class="card"><div id="submitError" class="danger hidden"></div><button onclick="submitSecureTest()">'+H(S.submitSecure)+'</button></div></div></section>'+ 
    '<section id="done" class="card hidden"><h1>'+H(S.done)+'</h1><div class="ok">'+H(S.doneText)+'</div><div id="jokerDoneBox" class="joker-result hidden"></div><div class="row"><button onclick="downloadAnswers()">'+H(S.download)+'</button><button class="secondary" onclick="shareAnswers()">'+H(S.share)+'</button><button class="ghost" onclick="copyAnswers()">'+H(S.copyBackup)+'</button></div><textarea id="answerBackup" class="backup" readonly></textarea><button class="ghost teacher-open" type="button" onclick="openTeacherModal()">🔒 '+H(S.teacher)+'</button></section>'+ 
    '<div id="teacherModal" class="modal hidden"><div class="modalbox"><h2>'+H(S.teacherLogin)+'</h2><div id="teacherLoginBox"><input id="teacherName" placeholder="'+H(S.name)+'" autocomplete="off"><input id="teacherPin" type="password" placeholder="'+H(S.pin)+'" autocomplete="off"><div id="teacherErr" class="danger small hidden"></div><div class="row"><button onclick="teacherLogin()">'+H(S.login)+'</button><button class="ghost" onclick="closeTeacherModal()">'+H(S.close)+'</button></div></div><div id="teacherPanel" class="hidden"><h2>'+H(S.teacherPanel)+'</h2><div class="archive-note">'+H(S.teacherHint)+'</div><div id="teacherRuntimeInfo" class="device-list"></div><div class="row"><button class="ghost" onclick="teacherLogout()">'+H(S.logout)+'</button><button onclick="closeTeacherModal()">'+H(S.close)+'</button></div></div></div></div>'+ 
    '<div id="lockScreen" class="lockscreen hidden"><div class="lockbox"><h1 id="lockIcon" onclick="lockTap()" style="cursor:pointer;user-select:none;-webkit-user-select:none">🔒</h1><p><b>'+H(S.locked)+'</b></p><p id="lockContactMsg">'+H(S.lockContact||'Kontaktuj učitele.')+'</p><div id="unlockReveal" class="hidden"><p>'+H(S.lockedStrict)+'</p><div class="danger" id="lockReasonBox"></div><input id="unlockInp" type="password" placeholder="'+H(S.unlockPh)+'" autocomplete="off"><div class="row"><button onclick="tryUnlock()">'+H(S.unlock)+'</button><button class="ghost" onclick="openTeacherModal()">'+H(S.teacher)+'</button></div></div></div></div>'+ 
    '</div>'+ 
    '<script>\n\'use strict\';\nconst CFG='+safeJsonForScript(publicCfg)+';\nconst STUDENT_VARIANTS='+safeJsonForScript(studentVariants)+';\n'+secureStudentScript()+'\n<\/script></body></html>';
}
function secureStudentScript(){return String.raw`
let EXS=[],ACTIVE_KEY='__default',RESP={},STARTED_AT='',SUBMITTED_AT='',ANSWER_TXT='',SEC_EVENTS=[],CURRENT_DEVICE='auto',TIMER_ID=null,LOCKED=false,SUBMITTED=false,JOKER_CHOICE=null,JOKER_USED=false,JOKER_SELECTED_AT='',ATTEMPT_ID='',ANSWER_CHANGE_STATS={},LAST_RESP_SERIAL={},LAST_CHANGE_TS={};
let A11Y=null;
function applyA11y(key){A11Y=null;var b=document.body;if(b)b.classList.remove('a11y-large','a11y-xlarge','a11y-dys');var groups=CFG.diffGroups||[];var gg=null;for(var i=0;i<groups.length;i++){if(groups[i].key===key){gg=groups[i];break;}}if(!gg||!gg.a11y)return;var a=gg.a11y;var mult=({'125':1.25,'150':1.5,'200':2})[a.time]||1;A11Y={timeMult:mult,noLimit:a.time==='none',font:a.font||'normal',dys:!!a.dys};if(b){if(a.font==='large')b.classList.add('a11y-large');if(a.font==='xlarge')b.classList.add('a11y-xlarge');if(a.dys)b.classList.add('a11y-dys');}var bar=document.getElementById('a11yNote');if(bar){var parts=[];if(mult>1)parts.push('prodloužený čas ('+(mult===2?'2\u00d7':'+'+Math.round((mult-1)*100)+' %')+')');if(A11Y.noLimit)parts.push('bez časového limitu');if(a.font==='large')parts.push('větší písmo');if(a.font==='xlarge')parts.push('největší písmo');if(a.dys)parts.push('dyslexie-friendly');if(parts.length){bar.textContent='♿ Aktivní úpravy: '+parts.join(', ');bar.classList.remove('hidden');}}}
const $=id=>document.getElementById(id);
const SL=CFG.secureLabels||{};
const GL=CFG.labels||{};
function t(k,f){return (SL&&SL[k]!=null)?String(SL[k]):(GL&&GL[k]!=null?String(GL[k]):String(f||k));}
function arr(k){return Array.isArray(SL[k])?SL[k]:[];}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(s){return String(s==null?'':s).trim().toLowerCase();}
function chooseJokerStart(use){JOKER_CHOICE=!!use;var no=$('jokerNo'),yes=$('jokerYes');if(no)no.classList.toggle('selected',!use);if(yes)yes.classList.toggle('selected',!!use);var box=$('jokerChoiceConfirm');if(box){box.style.display='block';box.textContent=use?'✅ Zvoleno: BERU SI ŽOLÍKA — test psát nebudeš.':'✅ Zvoleno: DĚLÁM TEST.';box.className='joker-confirm '+(use?'joker-confirm-risk':'joker-confirm-ok');}}
function jokerText(){return (t('jokerReport','ŽOLÍK POUŽIT'))+' · '+(($('studentName')&&$('studentName').value.trim())||'—')+' · '+CFG.testId;}
function updateJokerUi(){var wm=$('jokerWatermark');if(wm){wm.textContent=jokerText();wm.classList.toggle('hidden',!JOKER_USED);}var db=$('jokerDoneBox');if(db){db.textContent='🃏 '+jokerText();db.classList.toggle('hidden',!JOKER_USED);}document.body.classList.toggle('joker-mode',!!JOKER_USED);}

function detectDevice(){const ua=navigator.userAgent||'';if(/iPad|iPhone|iPod|Macintosh/.test(ua)&&navigator.maxTouchPoints>1)return 'apple';if(/Android/i.test(ua))return 'android';if(/Windows|Macintosh|Linux|CrOS/i.test(ua))return 'desktop';return 'auto';}
// Rozpozná nespolehlivé prostředí: lokální HTML soubor, content://, náhled souboru
// nebo vestavěný WebView (Gmail, Teams, Documents, Drive, Facebook…). Ostrý test má běžet
// jako webová stránka z HTTPS odkazu v Safari/Chrome, ne jako stažený HTML soubor.
function envInfo(){
  try{
    var ua=navigator.userAgent||'';
    var href=String(location&&location.href||'');
    var protocol=String(location&&location.protocol||'');
    var contentUri=/^content:\/\//i.test(href);
    var localFile=protocol==='file:'||/^file:/i.test(href);
    var webview=/\bwv\b|FBAN|FBAV|Instagram|Line\/|Documents|Outlook|Teams|GSA|MicroMessenger|FB_IAB|FB4A/i.test(ua);
    var noCrypto=!(window.crypto&&crypto.subtle);
    var noBlob=!(typeof Blob!=='undefined'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function');
    var previewOk=/^about:/i.test(href)||/^blob:/i.test(href); // náhled v generátoru může běžet přes about:srcdoc/blob
    var broken=(contentUri||localFile||webview||noCrypto||noBlob)&&!previewOk;
    return {href:href,protocol:protocol,contentUri:contentUri,localFile:localFile,webview:webview,noCrypto:noCrypto,noBlob:noBlob,previewOk:previewOk,broken:broken};
  }catch(e){return {broken:true,error:String(e&&e.message?e.message:e)};}
}
function isBrokenEnv(){return !!envInfo().broken;}
function updateEnvWarning(){var el=$('envWarning');if(!el)return;if(isBrokenEnv()){var title=String(t('envBlockTitle',''));var text=String(t('envBlockText',''));el.innerHTML='<b>'+esc(title)+'</b><br>'+esc(text);el.classList.remove('hidden');}else{el.classList.add('hidden');}}
function enterFullscreen(){try{var d=document,el=d.documentElement,fs=d.fullscreenElement||d.webkitFullscreenElement;if(fs){(d.exitFullscreen||d.webkitExitFullscreen||function(){}).call(d);}else{(el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen||function(){}).call(el);}}catch(_){}}
function deviceLabel(d){return d==='apple'?t('apple','iPhone / iPad'):d==='android'?t('android','Android'):d==='desktop'?t('desktop','PC / Mac'):t('auto','I don\'t know / automatic');}
function pickDevice(device){CURRENT_DEVICE=device||'auto';renderDeviceInstructions();checkDevice(false);updateEnvWarning();}
function tipsHtml(titleKey,tipsKey,fallbackTitle){const tips=arr(tipsKey);return '<b>'+esc(t(titleKey,fallbackTitle))+'</b><ul>'+tips.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';}
function renderDeviceInstructions(){const selected=CURRENT_DEVICE==='auto'?detectDevice():CURRENT_DEVICE;document.querySelectorAll('.device-btn').forEach(b=>b.classList.toggle('selected',b.dataset.device===CURRENT_DEVICE));var tag=$('deviceDetectedTag');if(tag){var det=detectDevice();tag.textContent=CURRENT_DEVICE==='auto'?('🔎 Automaticky rozpoznáno: '+deviceLabel(det)+' (klepni pro změnu)'):('✓ Ručně zvoleno: '+deviceLabel(CURRENT_DEVICE));}const box=$('deviceInstructions');if(!box)return;let html='';if(selected==='apple')html=tipsHtml('appleTitle','appleTips','iPhone/iPad');else if(selected==='android')html=tipsHtml('androidTitle','androidTips','Android');else if(selected==='desktop')html=tipsHtml('desktopTitle','desktopTips','PC/Mac');else html=tipsHtml('autoTitle','autoTips','General');box.innerHTML=html;}
window.addEventListener('DOMContentLoaded',()=>{CURRENT_DEVICE=detectDevice();renderDeviceInstructions();checkDevice(false);updateEnvWarning();});
function deviceLine(ok,label,extra){return '<div>'+(ok?'✓':'✕')+' '+esc(label)+(extra?' — '+esc(extra):'')+'</div>';}
function checkDevice(manual){const selected=CURRENT_DEVICE==='auto'?detectDevice():CURRENT_DEVICE;const info=envInfo();const hasCrypto=!!(CFG.publicKey&&window.crypto&&crypto.subtle);const hasBlob=typeof Blob!=='undefined'&&typeof URL!=='undefined'&&typeof URL.createObjectURL==='function';const hasText=typeof TextEncoder!=='undefined'&&typeof TextDecoder!=='undefined';let envMsg=t('ok','OK');if(info.localFile)envMsg='lokální HTML soubor';else if(info.contentUri)envMsg='náhled souboru / content://';else if(info.webview)envMsg='náhled aplikace / WebView';else if(info.noCrypto)envMsg=t('unavailable','unavailable');else if(info.noBlob)envMsg=t('unsupported','unsupported');const usable=hasCrypto&&hasBlob&&hasText&&!info.broken;let html='';html+=deviceLine(true,t('deviceSelected','Device'),deviceLabel(selected));html+=deviceLine(hasText,t('textEncoding','Text encoding'),hasText?t('ok','OK'):t('unsupported','unsupported'));html+=deviceLine(hasBlob,t('txtCreation','TXT file creation'),hasBlob?t('ok','OK'):t('unsupported','unsupported'));html+=deviceLine(hasCrypto,t('crypto','WebCrypto'),hasCrypto?t('ok','OK'):t('unavailable','unavailable'));html+=deviceLine(!info.broken,t('env','Environment'),info.broken?envMsg:t('ok','OK'));const box=$('deviceStatus');if(box)box.innerHTML=html+(usable?'<div class="ok">'+esc(t('usable','Device looks usable.'))+'</div>':(hasCrypto&&hasBlob&&hasText?'<div class="danger">'+esc(t('risky','This environment may be unreliable.'))+'</div>':'<div class="danger">'+esc(t('unusable','This environment is not suitable.'))+'</div>'));updateEnvWarning();return usable;}
function testDownload(){try{const blob=new Blob([t('downloadTestText','TEST DOWNLOAD OK')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='test_download_'+CFG.testId+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);const box=$('deviceStatus');if(box)box.innerHTML+='<div class="ok">'+esc(t('downloadStarted','Test download was triggered.'))+'</div>';return true;}catch(e){const box=$('deviceStatus');if(box)box.innerHTML+='<div class="danger">'+esc(t('downloadFailed','Test download failed'))+': '+esc(e.message||e)+'</div>';return false;}}


function seedHash(str){let h=2166136261;str=String(str||'');for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function seededRandom(seed){let x=seed>>>0;return function(){x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffleElementChildren(parent, selector, seed){if(!parent)return;const nodes=[...parent.querySelectorAll(':scope > '+selector)];if(nodes.length<2)return;const rnd=seededRandom(seed);for(let i=nodes.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[nodes[i],nodes[j]]=[nodes[j],nodes[i]];}nodes.forEach(n=>parent.appendChild(n));}
function shuffleOptionButtons(box, seed){if(!box)return;const nodes=[...box.children];if(nodes.length<2)return;const rnd=seededRandom(seed);for(let i=nodes.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[nodes[i],nodes[j]]=[nodes[j],nodes[i]];}nodes.forEach((n,idx)=>{const b=n.querySelector('b');if(b)b.textContent=String.fromCharCode(65+idx)+'.';box.appendChild(n);});}
function shuffleSelectOptions(sel, seed){if(!sel)return;const first=sel.querySelector('option[value=""]');const opts=[...sel.querySelectorAll('option')].filter(o=>o!==first);if(opts.length<2)return;const rnd=seededRandom(seed);for(let i=opts.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[opts[i],opts[j]]=[opts[j],opts[i]];}if(first)sel.appendChild(first);opts.forEach(o=>sel.appendChild(o));}
function applyRuntimeRandomization(){
  if(!CFG.randomizace)return;
  const base=seedHash([CFG.testId,$('studentName')&&$('studentName').value,ACTIVE_KEY,STARTED_AT].join('|'));
  document.querySelectorAll('.ex-panel .card, #exerciseArea > .card').forEach((card,ei)=>{
    shuffleElementChildren(card,'.q',base+ei*101);
    // Míchání otázek je přesouvá appendem na konec karty. navrow (Další/Předchozí) je
    // přímým dítětem karty hned za otázkami, takže by skončil NAD nimi → tlačítka by
    // vyskočila pod nadpis. Po zamíchání proto navrow vrátíme na konec, aby zůstal dole.
    const nav=card.querySelector(':scope > .navrow'); if(nav) card.appendChild(nav);
  });
  document.querySelectorAll('.opts').forEach((box,i)=>shuffleOptionButtons(box,base+i*307));
  document.querySelectorAll('select').forEach((sel,i)=>shuffleSelectOptions(sel,base+i*401));
}
function storageKey(kind){return 'testgen_'+kind+'_'+String(CFG.testId||'test')+'_'+String(CFG.manifestHash||'manifest');}
function storageGet(kind){try{return localStorage.getItem(storageKey(kind));}catch(e){return null;}}
function storageSet(kind,val){try{localStorage.setItem(storageKey(kind),String(val));}catch(e){}}
function makeAttemptId(){try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return 'A'+Date.now().toString(36).toUpperCase()+Array.from(a).map(x=>x.toString(36).toUpperCase().padStart(6,'0')).join('').slice(0,10);}}catch(_){}return 'A'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,10).toUpperCase();}
function currentAttemptId(){if(!ATTEMPT_ID)ATTEMPT_ID=makeAttemptId();return ATTEMPT_ID;}
// Vlastní modal místo nativních prohlížečových dialogů — stejně jako ve verifieru
// a generátoru. Důvod: nativní dialogy se na mobilu a školních zařízeních chovají
// nekonzistentně.
// Tento modal je BLOKUJÍCÍ z hlediska UI (overlay zachytí klik a Esc/Enter),
// ale technicky neblokuje JS běh; volající nečeká na zavření (informativní funkce).
function sModal(msg,title){var bd=document.createElement('div');bd.className='s-modal-bd';bd.setAttribute('role','dialog');bd.setAttribute('aria-modal','true');bd.innerHTML='<div class="s-modal-box"><div class="s-modal-head">'+esc(title||'Upozornění')+'</div><div class="s-modal-body">'+esc(msg||'')+'</div><div class="s-modal-act"><button type="button" class="s-modal-btn primary" data-ok>OK</button></div></div>';document.body.appendChild(bd);function done(){document.removeEventListener('keydown',onkey);bd.remove();}function onkey(e){if(e.key==='Escape'||e.key==='Enter')done();}bd.querySelector('[data-ok]').addEventListener('click',done);bd.addEventListener('click',function(e){if(e.target===bd)done();});document.addEventListener('keydown',onkey);setTimeout(function(){var o=bd.querySelector('[data-ok]');if(o)o.focus();},0);}
function submittedLocked(){return storageGet('submitted')==='1';}
function setSubmittedLocked(){storageSet('submitted','1');}
function showSubmittedLocked(){sModal('Tento test už byl v tomto prohlížeči na tomto zařízení odevzdán. Pokud má student psát znovu, učitel musí poslat novou verzi testu nebo je nutné použít jiné zařízení/prohlížeč.','Test je již odevzdán');}
function chooseVariant(name){const n=String(name||'').trim().toLowerCase();for(const g of (CFG.diffGroups||[])){if((g.students||[]).map(x=>String(x).trim().toLowerCase()).includes(n))return g.key;}return STUDENT_VARIANTS.__default?'__default':Object.keys(STUDENT_VARIANTS)[0];}
function startTest(){const name=$('studentName').value.trim();if(!name){$('studentName').focus();return;}if(submittedLocked()){showSubmittedLocked();return;}if(CFG.zolicek&&JOKER_CHOICE===null){sModal(t('jokerChoiceHint','Vyber před začátkem testu, zda píšeš test, nebo bereš žolíka.'),'Vyber volbu');return;}if(!checkDevice(false))return;JOKER_USED=!!JOKER_CHOICE;JOKER_SELECTED_AT=JOKER_USED?new Date().toISOString():'';ACTIVE_KEY=chooseVariant(name);EXS=STUDENT_VARIANTS[ACTIVE_KEY]||STUDENT_VARIANTS.__default||[];applyA11y(ACTIVE_KEY);STARTED_AT=new Date().toISOString();ATTEMPT_ID=makeAttemptId();RESP={};ANSWER_CHANGE_STATS={};LAST_RESP_SERIAL={};LAST_CHANGE_TS={};SEC_EVENTS=[{t:STARTED_AT,type:'attempt-start',detail:currentAttemptId()}];if(JOKER_USED)SEC_EVENTS.push({t:JOKER_SELECTED_AT,type:'joker-used'});LOCKED=false;SUBMITTED=false;renderTest();applyRuntimeRandomization();$('intro').classList.add('hidden');$('test').classList.remove('hidden');updateJokerUi();startTimer();startSplitMonitor();}
function startTimer(){let base=Math.max(1,Number(CFG.cas)||45)*60;let remain=A11Y&&A11Y.noLimit?Infinity:(A11Y&&A11Y.timeMult>1?Math.round(base*A11Y.timeMult):base);clearTimeout(TIMER_ID);const tick=()=>{if(SUBMITTED)return;if(remain===Infinity){const el=$('timer');if(el)el.textContent='∞';TIMER_ID=setTimeout(tick,1000);return;}const m=Math.floor(remain/60),s=remain%60;const el=$('timer');if(el)el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');if(remain<=0){submitSecureTest();return;}remain--;TIMER_ID=setTimeout(tick,1000);};tick();}
function isTestRunning(){return $('test')&&!$('test').classList.contains('hidden')&&!SUBMITTED&&!LOCKED;}
function recordSec(type,detail,extra){var ev={t:new Date().toISOString(),type:String(type||'event'),detail:detail||''};if(extra&&typeof extra==='object'){Object.keys(extra).forEach(function(k){ev[k]=extra[k];});}SEC_EVENTS.push(ev);}
// Měření délky odchodu: zaznamenáme okamžik odchodu a při návratu doplníme, jak dlouho byl
// student pryč. Krátký odchod (notifikace, systémová lišta, příchozí hovor na chvíli) je
// MĚKKÝ signál; dlouhý odchod je TVRDŠÍ. Stará answers.txt tento údaj nemají — verifier si
// poradí i bez něj (klasifikuje podle typu události).
var LEFT_AT=0;
var SOFT_AWAY_MS=8000; // odchod kratší než ~8 s bereme jako měkký (běžné mobilní vyrušení)
function markLeftNow(){ LEFT_AT=Date.now(); }
function awayMsSinceLeft(){ if(!LEFT_AT) return null; var d=Date.now()-LEFT_AT; LEFT_AT=0; return d>=0?d:null; }
function handleLeave(kind,reason){if(!isTestRunning())return;var why=reason||t('lockedEvent','left window');if(CFG.lockOnLeave){lockTest(why);return;}recordSec(kind||'left-window',why);}
var LOCK_TAPS=0,LOCK_TAP_TIMER=null;
function lockTap(){LOCK_TAPS++;clearTimeout(LOCK_TAP_TIMER);LOCK_TAP_TIMER=setTimeout(function(){LOCK_TAPS=0;},2000);if(LOCK_TAPS>=5){LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.remove('hidden');var inp=$('unlockInp');if(inp){try{inp.focus();}catch(_){}}}}
function lockTest(reason){if(!isTestRunning())return;if(!CFG.lockOnLeave){recordSec('left-window',reason||t('lockedEvent','left window'));return;}LOCKED=true;recordSec('locked',reason||t('lockedEvent','left window'));const r=$('lockReasonBox');if(r)r.textContent=(t('lockReason','Reason')+': '+(reason||t('lockedEvent','left window')));LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.add('hidden');$('lockScreen').classList.remove('hidden');}
document.addEventListener('visibilitychange',()=>{
  if(!isTestRunning())return;
  if(document.visibilityState==='hidden'){ markLeftNow(); handleLeave('visibility-hidden',t('lockedEvent','left window')); }
  else if(document.visibilityState==='visible'){ var ms=awayMsSinceLeft(); if(ms!=null) recordSec('returned','',{awayMs:ms,severity:(ms>=SOFT_AWAY_MS?'hard':'soft')}); }
});
window.addEventListener('pagehide',()=>{if(isTestRunning())handleLeave('pagehide','pagehide');});
window.addEventListener('beforeunload',()=>{if(isTestRunning())recordSec('beforeunload','');});
window.addEventListener('blur',()=>{setTimeout(()=>{if(isTestRunning()&&!document.hasFocus()){markLeftNow();handleLeave('blur-away',t('lockedEvent','left window'));}},900);});
window.addEventListener('focus',()=>{ if(isTestRunning()){ var ms=awayMsSinceLeft(); if(ms!=null) recordSec('returned','',{awayMs:ms,severity:(ms>=SOFT_AWAY_MS?'hard':'soft')}); } });
// ── Indikátor rozdělené obrazovky (měkký signál) ─────────────────────────────
// Split screen (test na půl displeje, vedle prohlížeč/překladač) NESPUSTÍ blur ani
// visibilitychange — okno zůstává viditelné a má fokus. Měřitelně ale ZMENŠÍ okno.
// Vzorkujeme poměr okna k displeji a sčítáme čas, kdy je okno „malé" (pod 60 % šířky
// NEBO výšky). Počítá se jen TRVÁNÍ (ne jednorázové zmenšení), takže otočení telefonu
// nebo plovoucí klávesnice signál nevyvolá. Je to MĚKKÝ signál pro učitele — nikdy zámek
// a nikdy obvinění. Cílenou snahu (rozdělení 70/30, druhé zařízení) nechytí; chytí
// nedbalé rozdělení obrazovky a dává učiteli vodítko k posouzení.
var SPLIT_RATIO=0.60;        // pod tímto poměrem k displeji bereme okno jako malé/rozdělené
var SPLIT_SAMPLE_MS=2000;    // jak často vzorkujeme
var SPLIT_MIN_RUN_MS=10000;  // souvislé „malé okno" se počítá až od ~10 s (filtr falešných poplachů)
var splitTotalMs=0, splitSmallMs=0, splitRunMs=0, splitTimer=null;
function windowIsSmall(){
  try{
    var sw=(screen&&screen.width)||0, sh=(screen&&screen.height)||0;
    var iw=window.innerWidth||0, ih=window.innerHeight||0;
    if(sw<=0||sh<=0||iw<=0||ih<=0) return false;
    return (iw/sw < SPLIT_RATIO) || (ih/sh < SPLIT_RATIO);
  }catch(_){ return false; }
}
function splitSampleTick(){
  if(!isTestRunning()||document.visibilityState!=='visible'){ splitRunMs=0; return; }
  splitTotalMs+=SPLIT_SAMPLE_MS;
  if(windowIsSmall()){
    splitRunMs+=SPLIT_SAMPLE_MS;
    if(splitRunMs>=SPLIT_MIN_RUN_MS) splitSmallMs+=SPLIT_SAMPLE_MS; // počítej až souvislý běh
  } else { splitRunMs=0; }
}
function startSplitMonitor(){ splitTotalMs=0; splitSmallMs=0; splitRunMs=0; if(splitTimer)clearInterval(splitTimer); splitTimer=setInterval(splitSampleTick,SPLIT_SAMPLE_MS); }
function stopSplitMonitor(){ if(splitTimer){clearInterval(splitTimer); splitTimer=null;} }
// Při odevzdání uložíme souhrn jako jednu událost (podíl času v malém okně).
function recordSplitSummary(){
  if(splitTotalMs<=0) return;
  var pct=Math.round((splitSmallMs/splitTotalMs)*100);
  if(splitSmallMs>0) recordSec('split-window','podil='+pct+'%',{smallMs:splitSmallMs,totalMs:splitTotalMs,pct:pct});
}
function b64UrlFromBufferLocal(buf){let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function hexFromBufferLocal(buf){return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256Text(str){const data=new TextEncoder().encode(String(str));const digest=await crypto.subtle.digest('SHA-256',data);return b64UrlFromBufferLocal(digest);}
async function sha256HexTextLocal(str){const data=new TextEncoder().encode(String(str));const digest=await crypto.subtle.digest('SHA-256',data);return hexFromBufferLocal(digest);}
async function currentStudentHtmlSha256(){
  try{
    if(!(window.crypto&&crypto.subtle&&typeof TextEncoder!=='undefined'))return '';
    const href=String(location&&location.href||'');
    if(!/^https?:/i.test(href))return '';
    const res=await fetch(href,{cache:'no-store',credentials:'same-origin'});
    if(!res||!res.ok)return '';
    const txt=await res.text();
    return await sha256HexTextLocal(txt);
  }catch(_){return '';}
}
// Stejná PBKDF2 derivace jako v generátoru — hash PINu/hesla musí sednout. Prefix
// 'pbkdf2-v1$' je součástí uložené hodnoty v CFG; tady počítáme stejně a porovnáváme.
async function deriveSecretHash(kind, secret, testId){
  const norm = (kind==='teacher-pin') ? String(secret||'').trim().toUpperCase() : String(secret||'').trim();
  if(!(window.crypto&&crypto.subtle&&window.TextEncoder)) return 'fnv$'+seedHash(kind+'|'+norm+'|'+testId).toString(36);
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(norm),{name:'PBKDF2'},false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(kind+'|'+String(testId)),iterations:120000,hash:'SHA-256'},key,256);
  return 'pbkdf2-v1$'+b64UrlFromBufferLocal(bits);
}
function normLoginName(s){return String(s||'').trim().replace(/\s+/g,' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
async function tryUnlock(){const v=($('unlockInp').value||'').trim();if(!v)return;const h=await deriveSecretHash('unlock-password',v,CFG.testId);if(CFG.hesloHash&&h===CFG.hesloHash){LOCKED=false;recordSec('unlocked',t('unlocked','unlocked'));$('lockScreen').classList.add('hidden');$('unlockInp').value='';LOCK_TAPS=0;var rv=$('unlockReveal');if(rv)rv.classList.add('hidden');}else{recordSec('bad-unlock','');$('lockReasonBox').textContent=t('badLogin','Incorrect login.');}}
function openTeacherModal(){const m=$('teacherModal');if(m)m.classList.remove('hidden');renderTeacherRuntimeInfo();}
function closeTeacherModal(){const m=$('teacherModal');if(m)m.classList.add('hidden');}
function teacherLogout(){const l=$('teacherLoginBox'),p=$('teacherPanel');if(l)l.classList.remove('hidden');if(p)p.classList.add('hidden');const pin=$('teacherPin');if(pin)pin.value='';}
async function teacherLogin(){const name=($('teacherName').value||'').trim();const pin=($('teacherPin').value||'').trim();const expected=normLoginName(CFG.ucitelJmeno||'');let okName=!expected||!name||normLoginName(name)===expected;let okSecret=false;if(pin&&CFG.ucitelPinHash){const h=await deriveSecretHash('teacher-pin',pin,CFG.testId);okSecret=okSecret||h===CFG.ucitelPinHash;}if(pin&&CFG.hesloHash){const u=await deriveSecretHash('unlock-password',pin,CFG.testId);okSecret=okSecret||u===CFG.hesloHash;}if(okName&&okSecret){$('teacherErr').classList.add('hidden');$('teacherLoginBox').classList.add('hidden');$('teacherPanel').classList.remove('hidden');renderTeacherRuntimeInfo();}else{$('teacherErr').textContent=t('badLogin','Incorrect PIN, password or name.');$('teacherErr').classList.remove('hidden');}}
function renderTeacherRuntimeInfo(){const box=$('teacherRuntimeInfo');if(!box)return;box.innerHTML='<div><b>'+esc(t('teacherStatus','Test status'))+'</b></div><div>Creator ID — '+esc(CFG.creatorId||'—')+(CFG.creatorName?' · '+esc(CFG.creatorName):'')+' ('+esc(CFG.creatorRole||'trainedTeacher')+')</div><div>Generátor — v'+esc(CFG.generatorVersion||'')+' · '+esc(CFG.releaseStatus||'')+'</div><div>Test ID — '+esc(CFG.testId)+'</div><div>Manifest — '+esc(CFG.manifestHash||'')+'</div><div>Attempt ID — '+esc(ATTEMPT_ID||'—')+'</div><div>'+esc(t('student','Student'))+' — '+esc($('studentName')?$('studentName').value:'')+'</div><div>'+esc(t('group','Group'))+' — '+esc(ACTIVE_KEY)+'</div><div>'+esc(t('started','Started'))+' — '+esc(STARTED_AT||'—')+'</div><div>'+esc(t('submitted','Submitted'))+' — '+esc(SUBMITTED_AT||'—')+'</div><div>'+esc(t('teacherNoAnswers','Correct answers are only in the teacher verifier.'))+'</div>';}

function qid(ei,qi){return ei+'_'+qi;}
function respSerial(v){try{return JSON.stringify(v);}catch(e){return String(v);}}
function totalAnswerChanges(){return Object.values(ANSWER_CHANGE_STATS||{}).reduce(function(a,b){return a+(Number(b)||0);},0);}
function setResp(id,val){RESP[id]=val;var key=String(id);var ser=respSerial(val);if(LAST_RESP_SERIAL[key]!==ser){var now=Date.now();if(LAST_RESP_SERIAL[key]!==undefined){if(!LAST_CHANGE_TS[key]||now-LAST_CHANGE_TS[key]>1500)ANSWER_CHANGE_STATS[key]=(ANSWER_CHANGE_STATS[key]||0)+1;}else ANSWER_CHANGE_STATS[key]=ANSWER_CHANGE_STATS[key]||0;LAST_RESP_SERIAL[key]=ser;LAST_CHANGE_TS[key]=now;}}
function installPasteMonitor(){if(window.__pasteMonitorInstalled)return;window.__pasteMonitorInstalled=true;document.addEventListener('paste',function(e){if(!isTestRunning())return;var el=e.target;if(!el||!(/^(INPUT|TEXTAREA)$/i.test(el.tagName)))return;var txt='';try{txt=(e.clipboardData||window.clipboardData).getData('text')||'';}catch(_){txt='';}var words=(txt.trim().match(/\S+/g)||[]).length;if(txt.length>=120||words>=20){recordSec('large-paste','delka='+txt.length+', slova='+words,{qid:el.getAttribute('data-qid')||'',chars:txt.length,words:words});}});}
installPasteMonitor();
function selectChoice(id,val){setResp(id,val);document.querySelectorAll('[data-qid="'+id+'"]').forEach(b=>b.classList.toggle('selected',String(b.dataset.val)===String(val)));}
function selectEvidence(id,val){setResp(id,val);document.querySelectorAll('[data-qid="'+id+'"]').forEach(function(b){b.classList.toggle('selected',String(b.dataset.val)===String(val));});}
function updateText(id,el){setResp(id,el.value);}
function updateCloze(id){setResp(id,Array.from(document.querySelectorAll('[data-qid="'+id+'"]')).map(x=>x.value));}
function updateMatch(ei,li,val){setResp(ei+'_match_'+li,val);}
function toggleMulti(id,idx){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];var p=cur.indexOf(idx);if(p>=0)cur.splice(p,1);else cur.push(idx);cur.sort(function(a,b){return a-b;});setResp(id,cur);document.querySelectorAll('[data-qid="'+id+'"]').forEach(function(b){var v=parseInt(b.dataset.val,10);b.classList.toggle('selected',cur.indexOf(v)>=0);});}
function ordBadgeHtml(id,texts,picks){
  // picks = pole origIdx v pořadí jak je student seřadil (nebo výchozí pořadí)
  // pickOf[origIdx] = pořadová pozice (1-based) nebo 0 = ještě nezadaná
  var pickOf={};
  picks.forEach(function(origIdx,pos){ pickOf[Number(origIdx)]=pos+1; });
  return texts.map(function(txt,origIdx){
    var pos=pickOf[origIdx]||0;
    var picked=pos>0;
    return '<div class="ord-row'+(picked?' ord-picked':'')+'" onclick="clickOrd(\''+id+'\','+origIdx+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\'||event.key===\' \')clickOrd(\''+id+'\','+origIdx+')">'+
      '<div class="ord-badge">'+(picked?String(pos):'')+'</div>'+
      '<span class="ord-txt">'+esc(txt!=null?txt:'')+'</span>'+
    '</div>';
  }).join('');
}
function ordTexts(id){var p=id.split('_');var it=((EXS[+p[0]]||{}).items||[])[+p[1]]||{};return Array.isArray(it.items)?it.items:[];}
function ordCurOrder(id){var texts=ordTexts(id);return Array.isArray(RESP[id])&&RESP[id].length===texts.length?RESP[id]:texts.map(function(_,i){return i;});}
function renderOrdList(id){var el=document.getElementById('ordlist_'+id);if(el)el.innerHTML=ordBadgeHtml(id,ordTexts(id),ordCurPicks(id));}
function ordCurPicks(id){
  // Vrátí pole origIdx v pořadí kliků (0 = nic, n = vše nakliknuto)
  // RESP[id] je undefined dokud student poprvé neklikne — to je validní prázdný stav
  var stored=RESP[id];
  if(Array.isArray(stored)) return stored;
  return [];
}
function clickOrd(id,origIdx){
  var texts=ordTexts(id);
  var n=texts.length;
  var picks=Array.isArray(RESP[id])&&RESP[id].length===n?RESP[id].slice():[];
  var alreadyAt=picks.indexOf(origIdx);
  if(alreadyAt>=0){
    // Zrušit výběr — odeber z picks a přečísluj
    picks.splice(alreadyAt,1);
  } else if(picks.length<n){
    // Přidat na konec
    picks.push(origIdx);
  }
  setResp(id,picks.length===n?picks:picks); // uložit průběžně
  renderOrdList(id);
}
function setBoard(id,idx,val){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];cur[idx]=val;setResp(id,cur);}
function setTable(id,r,c,val){var grid=Array.isArray(RESP[id])?RESP[id].map(function(row){return Array.isArray(row)?row.slice():[];}):[];if(!Array.isArray(grid[r]))grid[r]=[];grid[r][c]=val;setResp(id,grid);}
function setChain(id,idx,val){var cur=Array.isArray(RESP[id])?RESP[id].slice():[];cur[idx]=val;setResp(id,cur);}
function errorTagCur(id){var cur=(RESP[id]&&typeof RESP[id]==='object'&&!Array.isArray(RESP[id]))?Object.assign({},RESP[id]):{};return cur;}
function setErrorTagToken(id,idx){var cur=errorTagCur(id);cur.token=idx;setResp(id,cur);document.querySelectorAll('[data-qid="'+id+'"].et-token').forEach(function(b){b.classList.toggle('selected',String(b.dataset.val)===String(idx));});}
function setErrorTagType(id,val){var cur=errorTagCur(id);cur.etype=val;setResp(id,cur);}
function setErrorTagCorrection(id,val){var cur=errorTagCur(id);cur.corr=val;setResp(id,cur);}
function switchExercise(i){document.querySelectorAll('.secure-tab').forEach(b=>b.classList.toggle('active',String(b.dataset.ex)===String(i)));document.querySelectorAll('.ex-panel').forEach(p=>p.classList.toggle('hidden',String(p.dataset.ex)!==String(i)));try{window.scrollTo({top:0,behavior:'smooth'});}catch(_){window.scrollTo(0,0);}}
function renderTest(){const box=$('exerciseArea');if(CFG.layout==='tabs'){const tabs='<div class="secure-tabs">'+EXS.map((ex,ei)=>'<button type="button" class="secure-tab '+(ei===0?'active':'')+'" data-ex="'+ei+'" onclick="switchExercise('+ei+')">'+esc(t('exercise','Exercise'))+' '+(ei+1)+'</button>').join('')+'</div>';const panels=EXS.map((ex,ei)=>'<div class="ex-panel '+(ei===0?'':'hidden')+'" data-ex="'+ei+'"><div class="card"><h2>'+esc(t('exercise','Exercise'))+' '+(ei+1)+': '+esc(ex.title||ex.type)+'</h2>'+renderItems(ex,ei)+'<div class="navrow">'+(ei>0?'<button type="button" class="ghost" onclick="switchExercise('+(ei-1)+')">'+esc(t('prev','Previous'))+'</button>':'')+(ei<EXS.length-1?'<button type="button" class="secondary" onclick="switchExercise('+(ei+1)+')">'+esc(t('next','Next'))+'</button>':'')+'</div></div></div>').join('');box.innerHTML=tabs+panels;}else{box.innerHTML=EXS.map((ex,ei)=>'<div class="card"><h2>'+esc(t('exercise','Exercise'))+' '+(ei+1)+': '+esc(ex.title||ex.type)+'</h2>'+renderItems(ex,ei)+'</div>').join('');}}
function rcSharedPassage(ex){if(!ex)return '';var p=ex.passage||ex.source_text||ex.text||ex.source||'';if(p&&String(p).trim())return String(p);var items=ex.items||[],first='';for(var i=0;i<items.length;i++){var ip=String((items[i]&&(items[i].passage||items[i].text||items[i].source))||'').trim();if(i===0)first=ip;else if(ip!==first)return '';}return first;}
function renderItems(ex,ei){if(ex.type==='matching'){const opts=Array.isArray(ex.match_options)?ex.match_options:[];return '<div class="src">'+esc(t('choose','choose'))+'</div>'+((ex.items||[]).map((it,li)=>'<div class="q"><div class="qhead"><b>'+(li+1)+'</b><span></span></div><div>'+esc(it.left||'')+'</div><select onchange="updateMatch('+ei+','+li+',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+opts.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select></div>').join(''));}var rcHead='',skipP=false;if(ex.type==='reading comprehension'){var sp=rcSharedPassage(ex);if(sp){rcHead='<div class="src reading-passage">'+esc(sp).replace(/\n/g,'<br>')+'</div>';skipP=true;}}return rcHead+(ex.items||[]).map((it,qi)=>renderQ(ex.type,it,ei,qi,skipP)).join('');}
function choiceBlock(id,opts){return '<div class="opts">'+(opts||[]).map((o,i)=>'<button type="button" class="opt" data-qid="'+id+'" data-val="'+i+'" onclick="selectChoice(\''+id+'\','+i+')"><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o)+'</button>').join('')+'</div>';}
function renderQ(type,it,ei,qi,skipP){const id=qid(ei,qi),pts=(EXS[ei].item_points&&EXS[ei].item_points[qi])||EXS[ei].points_each||1;let h='<div class="q"><div class="qhead"><b>'+esc(t('question','Question'))+' '+(qi+1)+'</b><span>'+pts+' '+esc((CFG.labels&&CFG.labels.points)||'b')+'</span></div>';if(type==='multiple choice')return h+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='true/false')return h+'<div>'+esc(it.statement||it.question||it.prompt||'')+'</div><div class="opts"><button type="button" class="opt" data-qid="'+id+'" data-val="true" onclick="selectChoice(\''+id+'\',true)">'+esc(t('trueTxt','True'))+'</button><button type="button" class="opt" data-qid="'+id+'" data-val="false" onclick="selectChoice(\''+id+'\',false)">'+esc(t('falseTxt','False'))+'</button></div></div>';if(type==='reading comprehension')return h+((!skipP&&it.passage)?'<div class="src">'+esc(it.passage)+'</div>':'')+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='listening comprehension')return h+'<div class="src"><b>'+esc(t('listening','Audio'))+':</b> '+esc(t('teacherAudio','The teacher will play the listening.'))+'</div><div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='dialogue completion')return h+(it.dialogue?'<div class="src">'+esc(it.dialogue).replace(/\n/g,'<br>')+'</div>':'')+'<div>'+esc(it.question||it.prompt||'')+'</div>'+choiceBlock(id,it.options)+'</div>';if(type==='categorization')return h+'<div>'+esc(it.text||it.item||it.prompt||'')+'</div><select onchange="setResp(\''+id+'\',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+((it.categories||[]).map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join(''))+'</select></div>';if(type==='cloze text'){const parts=String(it.text||it.passage||'').split('___');let inner='';for(let i=0;i<Math.max(1,parts.length);i++){inner+=esc(parts[i]||'');if(i<parts.length-1)inner+='<input data-qid="'+id+'" oninput="updateCloze(\''+id+'\')" placeholder="'+(i+1)+'">';}return h+'<div>'+inner+'</div></div>';}if(type==='fill-in-the-blank'){const parts=String(it.sentence||it.prompt||'').split('___');let inner='';for(let i=0;i<parts.length;i++){inner+=esc(parts[i]||'');if(i<parts.length-1)inner+='<input data-qid="'+id+'" oninput="updateCloze(\''+id+'\')" placeholder="…">';}return h+'<div>'+inner+'</div></div>';}if(type==='word order')return h+'<div>'+esc((it.words||[]).join(' / ')||it.prompt||it.sentence||'')+'</div><input oninput="updateText(\''+id+'\',this)" autocomplete="off" spellcheck="false"></div>';if(type==='multi-select'){var mso=Array.isArray(it.options)?it.options:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="ms-hint">'+esc(t('chooseAll','Vyber všechny správné možnosti (může jich být víc).'))+'</div><div class="opts">'+mso.map(function(o,i){return '<button type="button" class="opt ms-opt" role="checkbox" aria-checked="false" data-qid="'+id+'" data-val="'+i+'" onclick="toggleMulti(\''+id+'\','+i+')"><span class="ms-box" aria-hidden="true"></span><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o)+'</button>';}).join('')+'</div></div>';}if(type==='ordering'){var oTexts=Array.isArray(it.items)?it.items:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="ms-hint">'+esc(t('reorderHint','Klikej na položky v pořadí, v jakém mají jít (1., 2., 3…). Klikni znovu pro zrušení.'))+'</div><div class="ord-list" id="ordlist_'+id+'">'+ordBadgeHtml(id,Array.isArray(it.items)?it.items:[],[])+'</div></div>';}if(type==='highlight-evidence'){var hs=Array.isArray(it.sentences)?it.sentences:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="he-list">'+hs.map(function(sent,i){return '<button type="button" class="opt he-sent" data-qid="'+id+'" data-val="'+i+'" onclick="selectEvidence(\''+id+'\','+i+')"><b>'+String.fromCharCode(65+i)+'.</b> '+esc(sent)+'</button>';}).join('')+'</div></div>';}if(type==='table-completion'){var tcCols=Array.isArray(it.columns)?it.columns:[];var tcRows=Array.isArray(it.rows)?it.rows:[];var tcHead='<thead><tr>'+tcCols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead>';var tcBody='<tbody>'+tcRows.map(function(row,ri){row=Array.isArray(row)?row:[];return '<tr>'+row.map(function(cell,ci){if(cell&&typeof cell==='object'&&!Array.isArray(cell)){return '<td><input class="tc-inp" data-qid="'+id+'" oninput="setTable(\''+id+'\','+ri+','+ci+',this.value)" autocomplete="off" spellcheck="false"></td>';}return '<td><span class="tc-fixed">'+esc(cell)+'</span></td>';}).join('')+'</tr>';}).join('')+'</tbody>';return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="tc-wrap"><table class="tc-table">'+tcHead+tcBody+'</table></div></div>';}if(type==='transformation-chain'){var trs=Array.isArray(it.transformations)?it.transformations:[];return h+'<div class="trch-base">'+esc(it.base_sentence||'')+'</div><div class="trch-list">'+trs.map(function(tr,ti){return '<div class="trch-row"><div class="trch-instr">'+(ti+1)+'. '+esc(tr&&tr.instruction!=null?tr.instruction:'')+'</div><input class="trch-inp" data-qid="'+id+'" oninput="setChain(\''+id+'\','+ti+',this.value)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';}).join('')+'</div></div>';}if(type==='error-tagging'){var etoks=Array.isArray(it.tokens)?it.tokens:String(it.sentence||'').split(/\s+/).filter(Boolean);var eopts=Array.isArray(it.error_type_options)?it.error_type_options:[];return h+'<div>'+esc(it.sentence||etoks.join(' '))+'</div><div class="ms-hint">Vyber chybný token, typ chyby a napiš opravu.</div><div class="opts et-list">'+etoks.map(function(tok,i){return '<button type="button" class="opt et-token" data-qid="'+id+'" data-val="'+i+'" onclick="setErrorTagToken(\''+id+'\','+i+')">'+esc(tok)+'</button>';}).join('')+'</div><select class="cb-sel" onchange="setErrorTagType(\''+id+'\',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+eopts.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join('')+'</select><input class="trch-inp" data-qid="'+id+'" oninput="setErrorTagCorrection(\''+id+'\',this.value)" placeholder="oprava" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></div>';}if(type==='categorisation-board'){var cbCats=Array.isArray(it.categories)?it.categories:[];var cbEntries=Array.isArray(it.entries)?it.entries:[];return h+'<div>'+esc(it.question||it.prompt||'')+'</div><div class="cb-list">'+cbEntries.map(function(en,bi){return '<div class="cb-row"><span class="cb-txt">'+esc(en&&en.text!=null?en.text:'')+'</span><select class="cb-sel" onchange="setBoard(\''+id+'\','+bi+',this.value)"><option value="">— '+esc(t('choose','choose'))+' —</option>'+cbCats.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('')+'</select></div>';}).join('')+'</div></div>';}return h+'<div>'+esc(it.prompt||it.sentence||it.question||it.source||'')+(it.keyword?' <b>('+esc(it.keyword)+')</b>':'')+'</div><input oninput="updateText(\''+id+'\',this)" autocomplete="off" spellcheck="false"></div>';}
function b64FromBytes(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function encryptPayloadForTeacher(payload){const json=JSON.stringify(payload);if(!(CFG.publicKey&&window.crypto&&crypto.subtle))throw new Error(t('cryptoFail','WebCrypto not available.'));try{const enc=new TextEncoder();const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,enc.encode(json));const raw=await crypto.subtle.exportKey('raw',aes);const pub=await crypto.subtle.importKey('jwk',CFG.publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,raw);return {mode:'encrypted',alg:'RSA-OAEP+AES-GCM',key:b64FromBytes(new Uint8Array(wrapped)),iv:b64FromBytes(iv),data:b64FromBytes(new Uint8Array(cipher))};}catch(e){throw new Error(t('encryptFail','Could not create secure answers.txt')+': '+(e&&e.message?e.message:e));}}
async function secureAnswers(){SUBMITTED_AT=new Date().toISOString();stopSplitMonitor();recordSplitSummary();const pageHash=await currentStudentHtmlSha256();return {v:1,testId:CFG.testId,manifestHash:CFG.manifestHash,studentHtmlSha256:pageHash||'',attemptId:currentAttemptId(),student:$('studentName').value.trim(),identityMode:CFG.identityMode||'name',code:(CFG.identityMode==='oneTimeCode'?$('studentName').value.trim():''),groupKey:ACTIVE_KEY,startedAt:STARTED_AT,submittedAt:SUBMITTED_AT,jokerUsed:!!JOKER_USED,jokerSelectedAt:JOKER_SELECTED_AT||'',resp:RESP,answerChangeStats:ANSWER_CHANGE_STATS,totalAnswerChanges:totalAnswerChanges(),securityEvents:SEC_EVENTS,userAgent:navigator.userAgent};}
async function submitSecureTest(){if($('test').classList.contains('hidden')||SUBMITTED)return;try{SUBMITTED=true;clearTimeout(TIMER_ID);const payload=await secureAnswers();const packed=await encryptPayloadForTeacher(payload);ANSWER_TXT='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:CFG.testId,creatorId:CFG.creatorId||'',generatorVersion:CFG.generatorVersion||'',buildStatus:CFG.releaseStatus||'',resultMode:'secureOffline',manifestHash:CFG.manifestHash,studentHtmlSha256:payload.studentHtmlSha256||'',createdAt:new Date().toISOString(),payload:packed},null,2);setSubmittedLocked();$('answerBackup').value=ANSWER_TXT;$('test').classList.add('hidden');$('lockScreen').classList.add('hidden');$('done').classList.remove('hidden');updateJokerUi();downloadAnswers();}catch(e){SUBMITTED=false;const el=$('submitError');if(el){el.textContent=String(e&&e.message?e.message:e);el.classList.remove('hidden');}else{console.error(e);}}}
function downloadAnswers(){if(!ANSWER_TXT)return;const name=($('studentName').value.trim()||'student').replace(/[^a-z0-9_-]+/gi,'-');const att=(ATTEMPT_ID||'').replace(/[^a-z0-9_-]+/gi,'-');const blob=new Blob([ANSWER_TXT],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='answers_'+CFG.testId+'_'+name+(att?'_'+att:'')+'.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function shareAnswers(){if(!ANSWER_TXT)return;const name=($('studentName').value.trim()||'student').replace(/[^a-z0-9_-]+/gi,'-');const att=(ATTEMPT_ID||'').replace(/[^a-z0-9_-]+/gi,'-');try{if(navigator.share&&typeof File!=='undefined'){const file=new File([ANSWER_TXT],'answers_'+CFG.testId+'_'+name+(att?'_'+att:'')+'.txt',{type:'text/plain'});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'answers.txt'});return;}}}catch(e){}copyAnswers();}
function copyAnswers(){const ta=$('answerBackup');ta.select();try{navigator.clipboard.writeText(ta.value);}catch(_){document.execCommand('copy');}}
`;}

function buildSecureTeacherVerifierHtml(cfg, variants) {
  // Učitelský verifier je záměrně vždy česky. Jazyk studentského testu (uiLang)
  // se sem nepropaguje, protože verifier je pracovní nástroj učitele.
  const safeCfg = {v:1,mode:'secureOfflineVerifier',generatorVersion:cfg.generatorVersion,buildHash:cfg.buildHash,releaseDate:cfg.releaseDate,releaseStatus:cfg.releaseStatus||'',generatedAt:cfg.generatedAt||'',resultMode:'secureOffline',creatorId:cfg.creatorId||'',creatorName:cfg.creatorName||'',creatorRole:cfg.creatorRole||'',testId:cfg.testId,manifestHash:cfg.manifestHash,studentHtmlSha256:cfg.studentHtmlSha256||'',nazev:cfg.nazev,proKoho:cfg.proKoho,isSpanish:!!cfg.isSpanish,isCzech:!!cfg.isCzech,csScoringPolicy:cfg.csScoringPolicy||{},cefr:cfg.cefr||'',cefrLevels:cfg.cefrLevels||[],cefrCombined:!!cfg.cefrCombined,totalBody:cfg.totalBody,gradeTyp:cfg.gradeTyp,gradeScale:cfg.gradeScale,gradeScaleRaw:cfg.gradeScaleRaw,fuzzyTolerance:cfg.fuzzyTolerance||'off',identityMode:cfg.identityMode||'name',roster:Array.isArray(cfg.roster)?cfg.roster:[],privateKey:cfg.privateKey,crypto:cfg.crypto,cryptoError:cfg.cryptoError||''};
  return '<!DOCTYPE html>\n<html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+H(cfg.nazev)+' — teacher verifier</title><style>'+secureCss()+'.v-toast-stack{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;z-index:9999;max-width:92vw;align-items:center}.v-toast{background:#1f2937;color:#fff;padding:11px 16px;border-radius:10px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.25);opacity:0;transform:translateY(8px);transition:opacity .2s,transform .2s;max-width:480px}.v-toast.show{opacity:1;transform:translateY(0)}.v-toast.ok{background:#15803d}.v-toast.warn{background:#b45309}.v-toast.err{background:#b91c1c}.v-modal-bd{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:10000;padding:18px}.v-modal-box{background:#fff;border-radius:14px;max-width:440px;width:100%;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3)}.v-modal-head{font-size:17px;font-weight:700;margin-bottom:8px;color:#111}.v-modal-body{font-size:14px;line-height:1.5;margin-bottom:16px;color:#374151}.v-modal-act{display:flex;gap:8px;justify-content:flex-end}.v-modal-btn{padding:9px 16px;border-radius:9px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:14px;font-family:inherit}.v-modal-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}</style></head><body>'+ 
    auditCommentHtml(safeCfg)+'<div class="wrap"><section class="card"><h1>Učitelský verifier</h1><div class="muted">'+H(cfg.nazev)+' · Test ID: '+H(cfg.testId)+(cfg.cefr?' · CEFR: '+H(cfg.cefr):'')+'</div><div class="muted" style="font-size:12px;opacity:.85;margin-top:2px">Creator ID: '+H(safeCfg.creatorId||'—')+(safeCfg.creatorName?' · '+H(safeCfg.creatorName):'')+' · role: '+H(safeCfg.creatorRole||'—')+' · generátor v'+H(safeCfg.generatorVersion||'')+' ('+H(safeCfg.releaseStatus||'')+') · build '+H(safeCfg.buildHash||'')+' · vygenerováno '+H(safeCfg.generatedAt||'—')+' · režim: secureOffline</div><div class="archive-note"><b>Kontrola integrity:</b> očekávaný SHA-256 studentského HTML: <code style="word-break:break-all">'+H(safeCfg.studentHtmlSha256||'—')+'</code><br>Verifier přijímá jen answers.txt se stejným Test ID a manifestem: <code>'+H(safeCfg.testId)+'</code> / <code style="word-break:break-all">'+H(safeCfg.manifestHash||'')+'</code>.</div><div class="ok">Přetáhni nebo vyber všechny studentské answers.txt najednou. Verifier spočítá známky, CSV, individuální zpětnou vazbu a archivní balíček pro školní úložiště.</div><div class="danger"><b>⚠️ Pouze pro učitele:</b> tento soubor obsahuje správné odpovědi, soukromý dešifrovací klíč, učitelský náhled testu a archivní nástroje. <b>Nikdy neposílej teacher_verifier.html studentům.</b> Studentům patří pouze student_test.html.</div>'+ 
    (cfg.crypto?'' : '<div class="warn">Pozor: při generování se nepodařilo vytvořit šifrovací klíče. Bezpečný offline režim by se neměl používat.</div>')+
    '<details class="card teacher-preview-details" id="teacherPreviewDetails"><summary><span>👁 Náhled testu pro učitele</span><small>kliknutím zobrazíš/skryješ celý test</small></summary><div class="archive-note"><b>Teacher preview:</b> tady vidíš celý test včetně správných odpovědí, bodů a vysvětlení. Tato data jsou pouze v učitelském verifieru, ne ve studentském HTML.</div><div id="previewControls" class="row"></div><div id="teacherPreview"></div></details><section class="card"><h2>Tisk / papírová verze</h2><div class="archive-note">Vytiskni test na papír nebo ulož jako PDF pro studenty bez zařízení a jako zálohu při výpadku techniky. Prázdný arch neobsahuje odpovědi; verze s klíčem je jen pro tebe. U diferencovaného testu se vytisknou všechny varianty.</div><div class="row"><button onclick=\"openPrint(false)\">Tisk — prázdný arch</button><button class=\"secondary\" onclick=\"openPrint(true)\">Tisk — s klíčem (jen učitel)</button></div></section><section class="card"><h2>Hromadné vyhodnocení</h2><div id="dropzone" class="dropzone">Přetáhni sem všechny answers.txt nebo klikni na výběr souborů níže.</div><input type="file" id="files" accept=".txt,text/plain" multiple onchange="bulkVerifyFiles(this.files)"><div class="archive-note"><b>Nouzová záloha:</b> pokud studentovi nejde stáhnout soubor, vlož sem celý text od SECURE-ANSWERS-V1 a načti ho.</div><textarea id="pasteBox" class="backup" placeholder="Sem vlož záložní kód od studenta..."></textarea><div class="row" style="margin-top:10px"><button class="ghost" onclick="bulkVerifyPasted()">Načíst vloženou zálohu</button><button onclick="downloadCsv()">Stáhnout CSV</button><button class="secondary" onclick="downloadFeedbackHtml()">Stáhnout feedback HTML</button></div></section><section class="card"><h2>Výsledky</h2><div class="archive-note">Bodování tohoto verifieru je shodné s tím, co viděli studenti, a je zapečetěné v manifestu. <b>Tolerance překlepů u psaných odpovědí:</b> <span id="fuzzyInfo"></span></div><div id="summary" class="muted">Zatím nejsou načtené žádné soubory.</div><div style="overflow:auto"><table class="tbl" id="resultTable"></table></div></section><section class="card"><h2>Bezpečnostní signály</h2><div class="archive-note"><b>Nejde o automatické obvinění z podvodu.</b> Panel pouze označuje situace, kde <b>výsledek vyžaduje kontrolu</b>: opuštění okna/karty, zámek, odemčení učitelem, podezřele krátký čas, opakovaný pokus, stejný token/jméno vícekrát, neobvykle mnoho změn odpovědí nebo vložení delšího textu ze schránky. Naopak: <b>absence signálů neznamená jistotu</b>, že student nepoužil druhé zařízení (mobil, hodinky) nebo pomůcku mimo prohlížeč — to web nevidí.</div><div id="securitySignals" class="muted">Zatím nejsou načtené žádné výsledky.</div></section><section class="card"><h2>Individuální zpětná vazba</h2><div class="row"><input id="studentFilter" type="text" placeholder="Hledat studenta, soubor nebo skupinu..." oninput="renderTable();refreshStudentSelect();renderFeedback()"><select id="feedbackLevel" onchange="renderFeedback()"><option value="wrong-correct">Chyby + správné odpovědi</option><option value="score-only">Jen body a známka</option><option value="wrong-no-correct">Chyby bez správných odpovědí</option><option value="full">Kompletní rozbor</option></select><button class="ghost" onclick="renderFeedback()">Obnovit náhled</button></div><div class="row" style="margin-top:8px"><select id="studentSelect"><option value="">Nejdřív načti výsledky</option></select><button class="ghost" onclick="copySelectedFeedback()">Kopírovat feedback vybraného studenta</button><button class="secondary" onclick="downloadSelectedFeedbackHtml()">Stáhnout feedback vybraného studenta</button><button onclick="downloadIndividualFeedbacks()">Stáhnout jednotlivé feedbacky</button></div><label class="small" style="display:block;margin-top:8px"><input type="checkbox" id="hideCorrectExport"> Skrýt správné odpovědi v exportech feedbacku/archivu</label><div class="small muted">Vyhledávání filtruje tabulku i náhled feedbacku. Export celé zpětné vazby respektuje aktuální filtr; archiv zůstává souhrnný pro celou sadu.</div><div id="feedbackArea"></div></section><section class="card"><h2>Souhrn problematických otázek</h2><div class="archive-note">Zobrazují se položky, kde chybovalo alespoň 50 % načtených studentů. Slouží jako rychlá diagnostika, co bylo pro třídu problematické.</div><div id="problemSummary" class="muted">Zatím nejsou načtené žádné výsledky.</div></section><section class="card"><h2>Rozložení a položková analýza</h2><div class="archive-note">Histogram známek a souhrn třídy, plus položková analýza: obtížnost (p) a diskriminační síla každé otázky. Slouží k odlišení vadné otázky od pouze těžké a k rozhodnutí, které úlohy recyklovat.</div><div id="itemAnalysis" class="muted">Zatím nejsou načtené žádné výsledky.</div></section><section class="card"><h2>Archiv pro školní úložiště</h2><div class="archive-note">Po opravě stáhni archivní HTML nebo JSON a ulož ho do školního OneDrive/SharePointu/Google Drive/NAS. Archiv obsahuje výsledky, feedback a původní odevzdávací data, proto s ním zacházej jako s osobními údaji žáků.</div><div class="row"><button onclick="downloadArchiveHtml()">Stáhnout archiv HTML</button><button class="secondary" onclick="downloadArchiveJson()">Stáhnout archiv JSON</button><button class="ghost" onclick="downloadIndexCsv()">Stáhnout index CSV</button></div></section></div>'+ 
    '<script>\n\'use strict\';\nconst CONFIG='+safeJsonForScript(safeCfg)+';\nconst PRIVATE_KEY=CONFIG.privateKey;\nconst VARIANTS_FULL='+safeJsonForScript(variants)+';\n'+secureTeacherScript()+'\n<\/script></body></html>';
}
function secureTeacherScript(){return String.raw`
let RESULTS=[];
const $=id=>document.getElementById(id);
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// Vlastní toast + potvrzovací modal místo nativních prohlížečových dialogů —
// stejně jako v generátoru. Důvod: nativní dialogy se na mobilu a školních
// zařízeních chovají rušivě a nekonzistentně napříč prohlížeči a komplikují
// automatické E2E testy.
function vToast(msg,type){var st=document.getElementById('vToastStack');if(!st){st=document.createElement('div');st.id='vToastStack';st.className='v-toast-stack';document.body.appendChild(st);}var el=document.createElement('div');el.className='v-toast '+(type||'ok');el.setAttribute('role','status');el.textContent=String(msg||'');st.appendChild(el);requestAnimationFrame(function(){el.classList.add('show');});setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},220);},3200);}
function vConfirm(msg,title){return new Promise(function(resolve){var bd=document.createElement('div');bd.className='v-modal-bd';bd.setAttribute('role','dialog');bd.setAttribute('aria-modal','true');bd.innerHTML='<div class="v-modal-box"><div class="v-modal-head">'+esc(title||'Potvrzení')+'</div><div class="v-modal-body">'+esc(msg||'')+'</div><div class="v-modal-act"><button type="button" class="v-modal-btn" data-c>Zrušit</button><button type="button" class="v-modal-btn primary" data-o>Pokračovat</button></div></div>';document.body.appendChild(bd);function done(v){document.removeEventListener('keydown',onkey);bd.remove();resolve(v);}function onkey(e){if(e.key==='Escape')done(false);else if(e.key==='Enter')done(true);}bd.querySelector('[data-o]').addEventListener('click',function(){done(true);});bd.querySelector('[data-c]').addEventListener('click',function(){done(false);});bd.addEventListener('click',function(e){if(e.target===bd)done(false);});document.addEventListener('keydown',onkey);setTimeout(function(){var o=bd.querySelector('[data-o]');if(o)o.focus();},0);});}
function __isSpanish(){return !!(typeof CONFIG!=='undefined'&&CONFIG&&CONFIG.isSpanish);}
function __isCzech(){return !!(typeof CONFIG!=='undefined'&&CONFIG&&CONFIG.isCzech);}
function __csScoringPolicy(){return (typeof CONFIG!=='undefined'&&CONFIG&&CONFIG.csScoringPolicy)||{};}
function __fuzzyMode(){return (typeof CONFIG!=='undefined'&&CONFIG&&CONFIG.fuzzyTolerance)||'off';}
`+SHARED_SCORING_JS+String.raw`
function b64ToBytes(b64){b64=b64.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';const bin=atob(b64);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
async function decryptPayload(pack){const p=pack.payload;if(p.mode==='plain-b64')throw new Error('Nešifrovaný BASE64 fallback není v provozní verzi povolen.');if(!PRIVATE_KEY)throw new Error('Chybí soukromý klíč verifieru.');const priv=await crypto.subtle.importKey('jwk',PRIVATE_KEY,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);const raw=await crypto.subtle.decrypt({name:'RSA-OAEP'},priv,b64ToBytes(p.key));const aes=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(p.iv)},aes,b64ToBytes(p.data));return JSON.parse(new TextDecoder().decode(plain));}
function parseTxt(txt){txt=String(txt||'').trim();if(!txt.startsWith('SECURE-ANSWERS-V1'))throw new Error('Není to SECURE-ANSWERS-V1 soubor.');return JSON.parse(txt.replace(/^SECURE-ANSWERS-V1\s*/,''));}
async function verifyText(name,txt){try{const pack=parseTxt(txt);if(pack.testId!==CONFIG.testId)throw new Error('Soubor patří k jinému testu: '+pack.testId);if(pack.manifestHash!==CONFIG.manifestHash)throw new Error('Nesedí manifest testu.');if(pack.studentHtmlSha256&&CONFIG.studentHtmlSha256&&pack.studentHtmlSha256!==CONFIG.studentHtmlSha256)throw new Error('Answers.txt uvádí jiný SHA-256 studentského HTML. Pravděpodobně jde o jinou verzi souboru.');const payload=await decryptPayload(pack);if(payload.testId!==CONFIG.testId)throw new Error('Payload patří k jinému testu: '+payload.testId);if(payload.manifestHash!==CONFIG.manifestHash)throw new Error('Payload má jiný manifest testu.');if(payload.studentHtmlSha256&&CONFIG.studentHtmlSha256&&payload.studentHtmlSha256!==CONFIG.studentHtmlSha256)throw new Error('Payload uvádí jiný SHA-256 studentského HTML.');const scored=scorePayload(payload);RESULTS.push(Object.assign({file:name,status:'OK',rawTxt:txt,expectedStudentHtmlSha256:CONFIG.studentHtmlSha256||'',answerStudentHtmlSha256:payload.studentHtmlSha256||pack.studentHtmlSha256||''},scored));}catch(e){RESULTS.push({file:name,status:'CHYBA',error:String(e&&e.message?e.message:e),student:'?',earned:0,total:0,pct:0,grade:'?',rawTxt:txt});}}
async function bulkVerifyFiles(files){RESULTS=[];duplicateWarnShown=false;const arr=Array.from(files||[]);for(const f of arr){const txt=await f.text();await verifyText(f.name,txt);}afterResultsChanged();}
async function bulkVerifyPasted(){const txt=($('pasteBox').value||'').trim();if(!txt)return;await verifyText('vlozena_zaloha_'+(RESULTS.length+1)+'.txt',txt);$('pasteBox').value='';afterResultsChanged();}
function setupDropzone(){const dz=$('dropzone');if(!dz)return;dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');bulkVerifyFiles(e.dataTransfer.files);});dz.addEventListener('click',()=>{const f=$('files');if(f)f.click();});}
setTimeout(()=>{setupDropzone();renderPreviewControls();renderTeacherPreview('__default');var fi=$('fuzzyInfo');if(fi){var fm=CONFIG.fuzzyTolerance||'off';fi.textContent=fm==='mild'?'Mírná (drobný překlep = 0,85 b)':(fm==='strict'?'Přísná (drobný překlep = 0,5 b)':'Vypnuto (jen přesná shoda; pravopis se hodnotí)');}},0);
function getExs(groupKey){return VARIANTS_FULL[groupKey]||VARIANTS_FULL.__default||VARIANTS_FULL[Object.keys(VARIANTS_FULL)[0]]||[];}
function previewKeys(){const keys=Object.keys(VARIANTS_FULL||{});return keys.length?keys:['__default'];}
function renderPreviewControls(){const box=$('previewControls');if(!box)return;box.innerHTML=previewKeys().map(k=>'<button class="ghost" type="button" onclick="renderTeacherPreview(\''+escAttr(k)+'\')">'+esc(k==='__default'?'Základní varianta':k)+'</button>').join('');}
function escAttr(s){return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');}
function tableCompletionCorrectText(it){var rows=Array.isArray(it&&it.rows)?it.rows:[];var out=[];rows.forEach(function(row,ri){if(!Array.isArray(row))return;row.forEach(function(cell,ci){if(cell&&typeof cell==='object'&&!Array.isArray(cell)&&cell.answer!=null){var col=(Array.isArray(it.columns)&&it.columns[ci]!=null)?it.columns[ci]:('sloupec '+(ci+1));var alts=Array.isArray(cell.alt_answers)&&cell.alt_answers.length?' (alt: '+cell.alt_answers.join(' / ')+')':'';out.push((ri+1)+'. řádek, '+col+': '+cell.answer+alts);}});});return out.join('; ');}
function tableCompletionStudentText(it,val){var rows=Array.isArray(it&&it.rows)?it.rows:[];var grid=Array.isArray(val)?val:[];var out=[];rows.forEach(function(row,ri){if(!Array.isArray(row))return;row.forEach(function(cell,ci){if(cell&&typeof cell==='object'&&!Array.isArray(cell)&&cell.answer!=null){var col=(Array.isArray(it.columns)&&it.columns[ci]!=null)?it.columns[ci]:('sloupec '+(ci+1));var got=(Array.isArray(grid[ri])&&grid[ri][ci]!=null&&grid[ri][ci]!=='')?grid[ri][ci]:'?';out.push((ri+1)+'. řádek, '+col+'='+got);}});});return out.join('; ');}
function transformationChainCorrectText(it){var trs=Array.isArray(it&&it.transformations)?it.transformations:[];return trs.map(function(tr,i){var alts=Array.isArray(tr&&tr.alt_answers)&&tr.alt_answers.length?' (alt: '+tr.alt_answers.join(' / ')+')':'';return (i+1)+'. '+(tr&&tr.answer!=null?tr.answer:'')+alts;}).join('; ');}
function transformationChainStudentText(it,val){var trs=Array.isArray(it&&it.transformations)?it.transformations:[];var vals=Array.isArray(val)?val:[];return trs.map(function(tr,i){return (i+1)+'. '+(vals[i]!=null&&vals[i]!==''?vals[i]:'?');}).join('; ');}
function highlightEvidenceCorrectText(it){var s=Array.isArray(it&&it.sentences)?it.sentences:[];var i=Number(it&&it.correct);return Number.isInteger(i)&&s[i]!=null?String.fromCharCode(65+i)+'. '+s[i]:String(i);}
function highlightEvidenceStudentText(it,val){var s=Array.isArray(it&&it.sentences)?it.sentences:[];var i=Number(val);return Number.isInteger(i)&&s[i]!=null?String.fromCharCode(65+i)+'. '+s[i]:'?';}
function errorTaggingCorrectText(it){var toks=Array.isArray(it&&it.tokens)?it.tokens:[];var ix=Number(it&&it.error_token_index);var tok=(toks[ix]!=null)?toks[ix]:('#'+ix);return 'token: '+tok+'; typ: '+((it&&it.error_type)||'')+'; oprava: '+((it&&it.correction)||'');}
function errorTaggingStudentText(it,val){var v=(val&&typeof val==='object'&&!Array.isArray(val))?val:{};var toks=Array.isArray(it&&it.tokens)?it.tokens:[];var ix=Number(v.token!=null?v.token:v.tokenIndex);var tok=(Number.isInteger(ix)&&toks[ix]!=null)?toks[ix]:(v.token!=null?('#'+v.token):'?');return 'token: '+tok+'; typ: '+(v.etype||v.errorType||v.error_type||'?')+'; oprava: '+(v.corr||v.correction||v.answer||'');}
function answerForPreview(ex,it){
  if(ex.type==='matching') return it.right||'';
  if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].includes(ex.type)){const ci=correctIndex(it);return (it.options||[])[ci]||String(it.correct??'');}
  if(ex.type==='true/false') return String(it.correct);
  if(ex.type==='categorization') return it.correct_category||it.category||it.answer||'';
  if(ex.type==='cloze text') return accepted(it,['answers','answer']).join(' / ');
  if(ex.type==='multi-select'){var mo=Array.isArray(it.options)?it.options:[];return (Array.isArray(it.correct)?it.correct:[]).map(function(ix){var n=Number(ix);return mo[n]!=null?mo[n]:('#'+n);}).join(' | ');}
  if(ex.type==='ordering'){var oi=Array.isArray(it.items)?it.items:[];return (Array.isArray(it.correct_order)?it.correct_order:[]).map(function(ix){var n=Number(ix);return oi[n]!=null?oi[n]:('#'+n);}).join(' -> ');}
  if(ex.type==='highlight-evidence') return highlightEvidenceCorrectText(it);
  if(ex.type==='error-tagging') return errorTaggingCorrectText(it);
  if(ex.type==='table-completion') return tableCompletionCorrectText(it);
  if(ex.type==='transformation-chain') return transformationChainCorrectText(it);
  if(ex.type==='categorisation-board'){var cbe=Array.isArray(it.entries)?it.entries:[];return cbe.map(function(e){return (e&&e.text!=null?e.text:'')+' -> '+(e&&e.category!=null?e.category:'');}).join(', ');}
  return accepted(it,['answer','answers','correct_sentence','model_answer','correction','translation']).join(' / ');
}
function promptForPreview(ex,it){return it.question||it.prompt||it.base_sentence||it.sentence||it.statement||it.text||it.source||it.left||it.item||'';}
function renderTeacherPreview(groupKey){
  const box=$('teacherPreview'); if(!box)return;
  const exs=getExs(groupKey); let total=0;
  let html='<div class="muted">Varianta: '+esc(groupKey==='__default'?'Základní varianta':groupKey)+' · '+exs.length+' cvičení</div>';
  exs.forEach((ex,ei)=>{const exPts=exTotal(ex); total+=exPts; html+='<div class="feedback"><h3>Cvičení '+(ei+1)+': '+esc(ex.title||ex.type)+' <span class="muted">('+esc(ex.type)+', '+exPts+' b)</span></h3>';
    if(ex.type==='matching'){
      (ex.items||[]).forEach((it,li)=>{html+='<div class="q"><div><b>'+(li+1)+'. '+esc(it.left||'')+'</b></div><div><b>Správně:</b> '+esc(it.right||'')+'</div>'+(it.explanation?'<div class="small"><b>Vysvětlení:</b> '+esc(it.explanation)+'</div>':'')+'</div>';});
    } else {
      (ex.items||[]).forEach((it,qi)=>{html+='<div class="q"><div><b>Otázka '+(qi+1)+'</b> <span class="muted">'+itemPoint(ex,qi)+' b</span></div><div>'+esc(promptForPreview(ex,it))+'</div>';
        if(Array.isArray(it.options)&&it.options.length){const msc=(ex.type==='multi-select'&&Array.isArray(it.correct))?it.correct.map(Number):null;html+='<ol type="A">'+it.options.map((o,i)=>'<li>'+esc(o)+((msc?msc.indexOf(i)>=0:i===correctIndex(it))?' <b>✓</b>':'')+'</li>').join('')+'</ol>';}
        if(it.passage) html+='<div class="src"><b>Text:</b> '+esc(it.passage)+'</div>';
        if(it.dialogue) html+='<div class="src"><b>Dialog:</b> '+esc(it.dialogue)+'</div>';
        if(it.audio_prompt||it.audio_source_note||it.source_url) html+='<div class="src"><b>Poslechový zdroj:</b> '+esc(it.audio_prompt||it.audio_source_note||it.source_url)+'</div>';
        if(it.transcript) html+='<div class="src"><b>Transkript pro učitele:</b> '+esc(it.transcript)+'</div>';
        html+='<div><b>Správně:</b> '+esc(answerForPreview(ex,it)||'—')+'</div>'+(it.explanation?'<div class="small"><b>Vysvětlení:</b> '+esc(it.explanation)+'</div>':'')+'</div>';
      });
    }
    html+='</div>';
  });
  html='<div class="ok"><b>Náhled je určen pouze pro učitele.</b> Studentský HTML neobsahuje tento answer key.</div><div class="pill">Celkem: '+total+' b</div>'+html;
  box.innerHTML=html;
}

function exTotal(ex){return Number(ex.points_total)||((ex.items||[]).reduce((s,_,i)=>s+itemPoint(ex,i),0));}
function scoreItemSecure(ex,it,val,pts){var t=ex.type;
  if(t==='multiple choice'||t==='reading comprehension'||t==='listening comprehension')return String(val)===String(correctIndex(it))?pts:0;
  if(t==='dialogue completion'){if(Array.isArray(it.options))return String(val)===String(correctIndex(it))?pts:0;return pts*textScore(val,it.answer||it.model_answer,it.alt_answers,t);}
  if(t==='true/false')return String(val)===String(!!it.correct)?pts:0;
  if(t==='fill-in-the-blank'){var keys=Array.isArray(it.answers)?it.answers:[it.answer];var vals=Array.isArray(val)?val:(val!=null?[val]:[]);return scoreBlanks(keys,vals,it.alt_answers,pts,t,true);}
  if(t==='error correction')return pts*textScore(val,it.correction,it.alt_answers,t);
  if(t==='word order')return pts*textScore(val,it.correct_sentence||it.answer,it.alt_answers,t);
  if(t==='translation')return pts*textScore(val,it.answer||it.translation,it.alt_answers,t);
  if(t==='sentence transformation')return pts*textScore(val,it.answer,it.alt_answers,t);
  if(t==='word formation')return pts*textScore(val,it.answer,it.alt_answers,t);
  if(t==='categorization')return norm(val)===norm(it.correct_category||it.category||it.answer)?pts:0;
  if(t==='cloze text'){var keys=Array.isArray(it.answers)?it.answers:[it.answer];var vals=Array.isArray(val)?val:(val!=null?[val]:[]);return scoreBlanks(keys,vals,it.alt_answers,pts,t,false);}
  if(t==='multi-select')return multiSelectScore(val,it.correct,pts);
  if(t==='ordering')return orderingScore(val,it.correct_order,pts);
  if(t==='highlight-evidence')return highlightEvidenceScore(val,it.correct,pts);
  if(t==='error-tagging')return errorTaggingScore(val,it,pts,t);
  if(t==='table-completion')return tableCompletionScore(val,it.rows,pts,t);
  if(t==='transformation-chain')return transformationChainScore(val,it.transformations,pts,t);
  if(t==='categorisation-board')return categoryBoardScore(val,it.entries,pts);
  return 0;}
function csDetailFeedback(it){var fb=(it&&it.csFeedback&&typeof it.csFeedback==='object')?it.csFeedback:{};var out={phenomenon:fb.phenomenon||it.phenomenon||'',rule:fb.rule||it.rule||'',whyCorrect:fb.whyCorrect||fb.why||it.feedback||it.explanation||it.model_answer||'',whyIncorrect:fb.whyIncorrect||fb.whyWrong||'',reviewTip:fb.reviewTip||it.reviewTip||'',errorFocus:fb.errorFocus||it.errorFocus||''};return (out.phenomenon||out.rule||out.whyCorrect||out.whyIncorrect||out.reviewTip||out.errorFocus)?out:null;}
function csDetailFeedbackHtml(d){var fb=d&&d.csFeedback;if(!fb)return '';var why=d.ok?(fb.whyCorrect||'Odpověď odpovídá pravidlu.'):(fb.whyIncorrect||fb.whyCorrect||'Zkontroluj pravidlo a sledovaný jazykový jev.');var rows=[];if(fb.phenomenon)rows.push('<div><b>Jev:</b> '+esc(fb.phenomenon)+'</div>');if(fb.rule)rows.push('<div><b>Pravidlo:</b> '+esc(fb.rule)+'</div>');if(why)rows.push('<div><b>'+(d.ok?'Proč je to správně:':'Proč je odpověď problematická:')+'</b> '+esc(why)+'</div>');if(fb.reviewTip)rows.push('<div><b>Co zopakovat:</b> '+esc(fb.reviewTip)+'</div>');if(fb.errorFocus)rows.push('<div><b>Typ chyby:</b> '+esc(fb.errorFocus)+'</div>');return rows.length?'<div class="cs-fb '+(d.ok?'cs-fb-ok':'cs-fb-bad')+'">'+rows.join('')+'</div>':'';}
function csDetailFeedbackPlain(d){var fb=d&&d.csFeedback;if(!fb)return [];var why=d.ok?(fb.whyCorrect||'Odpověď odpovídá pravidlu.'):(fb.whyIncorrect||fb.whyCorrect||'Zkontroluj pravidlo a sledovaný jazykový jev.');var out=[];if(fb.phenomenon)out.push('Jev: '+fb.phenomenon);if(fb.rule)out.push('Pravidlo: '+fb.rule);if(why)out.push((d.ok?'Proč je to správně: ':'Proč je odpověď problematická: ')+why);if(fb.reviewTip)out.push('Co zopakovat: '+fb.reviewTip);if(fb.errorFocus)out.push('Typ chyby: '+fb.errorFocus);return out;}
function scorePayload(payload){const exs=getExs(payload.groupKey),resp=payload.resp||{};let earned=0,total=0,details=[];exs.forEach((ex,ei)=>{if(ex.type==='matching'){(ex.items||[]).forEach((it,li)=>{const pts=itemPoint(ex,li);total+=pts;const q=ei+'_match_'+li;const ok=norm(resp[q])===norm(it.right);if(ok)earned+=pts;details.push({ex:ei+1,q:li+1,type:ex.type,prompt:it.left||'',student:resp[q]!=null?String(resp[q]):'',correct:it.right||'',ok,pts:ok?pts:0,total:pts,explanation:it.explanation||'',csFeedback:csDetailFeedback(it)});});return;} (ex.items||[]).forEach((it,qi)=>{const pts=itemPoint(ex,qi);total+=pts;const q=ei+'_'+qi;const val=resp[q];let corr='';if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].includes(ex.type)&&Array.isArray(it.options)){const ci=correctIndex(it);corr=(it.options||[])[ci]||String(ci);}else if(ex.type==='true/false'){corr=String(!!it.correct);}else if(ex.type==='categorization'){corr=it.correct_category||it.category||it.answer||'';}else if(ex.type==='cloze text'){corr=accepted(it,['answers','answer']).join(' / ');}else if(ex.type==='multi-select'){const mo=Array.isArray(it.options)?it.options:[];corr=(Array.isArray(it.correct)?it.correct:[]).map(function(ix){var n=Number(ix);return mo[n]!=null?mo[n]:('#'+n);}).join(' | ');}else if(ex.type==='ordering'){const oi=Array.isArray(it.items)?it.items:[];corr=(Array.isArray(it.correct_order)?it.correct_order:[]).map(function(ix){var n=Number(ix);return oi[n]!=null?oi[n]:('#'+n);}).join(' -> ');}else if(ex.type==='highlight-evidence'){corr=highlightEvidenceCorrectText(it);}else if(ex.type==='error-tagging'){corr=errorTaggingCorrectText(it);}else if(ex.type==='table-completion'){corr=tableCompletionCorrectText(it);}else if(ex.type==='transformation-chain'){corr=transformationChainCorrectText(it);}else if(ex.type==='categorisation-board'){const cbe=Array.isArray(it.entries)?it.entries:[];corr=cbe.map(function(e){return (e&&e.text!=null?e.text:'')+'='+(e&&e.category!=null?e.category:'');}).join(', ');}else {corr=accepted(it,['answer','answers','correct_sentence','model_answer','correction','translation']).join(' / ');}const e=Math.round(scoreItemSecure(ex,it,val,pts)*100)/100;earned+=e;const ok=e>=pts-1e-9;details.push({ex:ei+1,q:qi+1,type:ex.type,prompt:it.question||it.prompt||it.sentence||it.statement||it.text||it.source||'',student:(ex.type==='error-tagging')?errorTaggingStudentText(it,val):((ex.type==='highlight-evidence')?highlightEvidenceStudentText(it,val):((ex.type==='table-completion')?tableCompletionStudentText(it,val):((ex.type==='transformation-chain')?transformationChainStudentText(it,val):((ex.type==='categorisation-board')?((Array.isArray(it.entries)?it.entries:[]).map(function(e,i){return (e&&e.text!=null?e.text:'')+'='+((Array.isArray(val)&&val[i]!=null&&val[i]!=='')?val[i]:'?');}).join(', ')):((ex.type==='ordering')?((Array.isArray(val)?val:(it.items||[]).map(function(_,i){return i;})).map(function(ix){var n=Number(ix);return (Array.isArray(it.items)&&it.items[n]!=null)?it.items[n]:('#'+n);}).join(' -> ')):((ex.type==='multi-select'&&Array.isArray(val))?val.map(function(ix){var n=Number(ix);return (Array.isArray(it.options)&&it.options[n]!=null)?it.options[n]:('#'+n);}).join(' | '):(Array.isArray(val)?val.join(' | '):(val==null?'':String(val))))))))),correct:corr,ok,pts:e,total:pts,explanation:it.explanation||'',csFeedback:csDetailFeedback(it)});});});earned=Math.round(earned*100)/100;total=Math.round(total*100)/100;const pct=total?Math.round((earned/total)*100):0;return {student:payload.student||'?',code:payload.code||'',identityMode:payload.identityMode||'',attemptId:payload.attemptId||'',studentHtmlSha256:payload.studentHtmlSha256||'',groupKey:payload.groupKey||'__default',startedAt:payload.startedAt,submittedAt:payload.submittedAt,jokerUsed:!!payload.jokerUsed,jokerSelectedAt:payload.jokerSelectedAt||'',answerChangeStats:payload.answerChangeStats||{},totalAnswerChanges:Number(payload.totalAnswerChanges)||0,securityEvents:payload.securityEvents||[],userAgent:payload.userAgent||'',earned,total,pct,grade:gradeFor(pct),details};}
function gradeFor(pct){const p=Math.round(Number(pct)||0);if(CONFIG.gradeTyp==='vlastni'){if(Array.isArray(CONFIG.gradeScale)&&CONFIG.gradeScale.length){const hit=CONFIG.gradeScale.find(x=>p>=x.min&&p<=x.max);return hit?hit.g:'?';}return 'vlastní stupnice';}if(p>=88)return '1';if(p>=74)return '2';if(p>=59)return '3';if(p>=44)return '4';return '5';}
function resultKey(r,i){return String(i)+'|'+String(r.file||'')+'|'+String(r.student||'');}
function queryOf(){const el=$('studentFilter');return norm(el?el.value:'');}
function matchesQuery(r){const q=queryOf();if(!q)return true;return norm([r.student,r.file,r.groupKey,r.status,r.error].join(' ')).includes(q);}
function visibleResults(){return RESULTS.filter(matchesQuery);}
function okVisibleResults(){return visibleResults().filter(r=>r.status==='OK');}
function refreshStudentSelect(){const sel=$('studentSelect');if(!sel)return;const old=sel.value;const opts=RESULTS.map((r,i)=>({r,i})).filter(x=>x.r.status==='OK'&&matchesQuery(x.r));sel.innerHTML=opts.length?opts.map(x=>'<option value="'+esc(resultKey(x.r,x.i))+'">'+esc(displayStudent(x.r))+' — '+esc(x.r.earned)+'/'+esc(x.r.total)+' b, známka '+esc(x.r.grade)+'</option>').join(''):'<option value="">Žádný student ve filtru</option>';if(old&&Array.from(sel.options).some(o=>o.value===old))sel.value=old;}
function selectedResult(){const sel=$('studentSelect');if(sel&&sel.value){for(let i=0;i<RESULTS.length;i++){if(resultKey(RESULTS[i],i)===sel.value)return RESULTS[i];}}return okVisibleResults()[0]||RESULTS.find(r=>r.status==='OK')||null;}
function normStudentKey(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function duplicateInfo(){const byStudent={},byAttempt={};RESULTS.forEach((r,i)=>{if(r.status!=='OK')return;const sk=normStudentKey(r.student);if(sk)(byStudent[sk]||(byStudent[sk]=[])).push(i);const ak=String(r.attemptId||'').trim();if(ak)(byAttempt[ak]||(byAttempt[ak]=[])).push(i);});const dupStudentKeys=Object.keys(byStudent).filter(k=>byStudent[k].length>1);const dupAttemptKeys=Object.keys(byAttempt).filter(k=>byAttempt[k].length>1);return {byStudent,byAttempt,dupStudentKeys,dupAttemptKeys};}
function duplicateWarningsFor(r,info){if(!r||r.status!=='OK')return [];info=info||duplicateInfo();const out=[];const sk=normStudentKey(r.student);if(sk&&info.byStudent[sk]&&info.byStudent[sk].length>1)out.push('duplicitní jméno/kód '+info.byStudent[sk].length+'×');const ak=String(r.attemptId||'').trim();if(ak&&info.byAttempt[ak]&&info.byAttempt[ak].length>1)out.push('duplicitní ID pokusu');return out;}
function eventCount(r,types){const set=new Set(types);return (r&&Array.isArray(r.securityEvents)?r.securityEvents:[]).filter(e=>set.has(String(e&&e.type||''))).length;}
function durationMinutes(r){const a=Date.parse(r&&r.startedAt||''),b=Date.parse(r&&r.submittedAt||'');if(!isFinite(a)||!isFinite(b)||b<=a)return null;return (b-a)/60000;}
function answerChangeTotal(r){if(r&&Number(r.totalAnswerChanges))return Number(r.totalAnswerChanges)||0;const st=(r&&r.answerChangeStats)||{};return Object.keys(st).reduce((a,k)=>a+(Number(st[k])||0),0);}
function rosterMap(){var m={};(CONFIG.roster||[]).forEach(function(e){if(e&&e.code)m[String(e.code).trim().toUpperCase()]=(e.label||'');});return m;}
function submittedCode(r){return String((r&&(r.code||r.student))||'').trim();}
function rosterIsCodeMode(){return CONFIG.identityMode==='oneTimeCode' && (CONFIG.roster||[]).length>0;}
function rosterLabel(r){if(!rosterIsCodeMode())return '';var m=rosterMap();var c=submittedCode(r).toUpperCase();return Object.prototype.hasOwnProperty.call(m,c)?(m[c]||''):'';}
function rosterHasCode(r){if(!rosterIsCodeMode())return true;var m=rosterMap();return Object.prototype.hasOwnProperty.call(m,submittedCode(r).toUpperCase());}
function displayStudent(r){if(!r)return '';var base=r.student||r.file||'';if(!rosterIsCodeMode())return base;var c=submittedCode(r);var lab=rosterLabel(r);if(lab)return lab+(c?' (kód '+c+')':'');return (c?('kód '+c):base)+' — není v seznamu';}
function securitySignalsFor(r,info){if(!r||r.status!=='OK')return [];info=info||duplicateInfo();const out=[];const add=(code,label,detail,sev)=>out.push({code,label,detail:detail||'',sev:(sev==='hard'?'hard':'soft')});const ev=r.securityEvents||[];
  // Opuštění okna rozdělujeme na MĚKKÝ a TVRDÝ signál. Technická detekce odchodu z okna není
  // 100% (na mobilu ji spustí notifikace, příchozí hovor, systémová lišta, uspání displeje),
  // proto ojedinělé krátké přepnutí je jen měkký signál. Tvrdší je: pagehide, reload, zámek,
  // opakované opuštění nebo prokazatelně dlouhý odchod (z měření délky v novějších souborech).
  const leaveSoftTypes=['visibility-hidden','blur-away','left-window'];
  const leaveCount=eventCount(r,leaveSoftTypes);
  const pagehide=eventCount(r,['pagehide']);
  const reload=eventCount(r,['beforeunload']);
  const longAway=ev.filter(e=>String(e&&e.type||'')==='returned'&&String(e&&e.severity||'')==='hard');
  const maxAwayMs=Math.max(0,...ev.filter(e=>String(e&&e.type||'')==='returned').map(e=>Number(e&&e.awayMs)||0));
  const awayTxt=maxAwayMs>=1000?(', nejdelší odchod '+Math.round(maxAwayMs/1000)+' s'):'';
  if(pagehide) add('leave-hard','opuštění stránky (pagehide/zavření)','záznamů: '+pagehide,'hard');
  if(reload) add('leave-hard','reload / pokus o opuštění stránky','záznamů: '+reload,'hard');
  if(longAway.length) add('leave-hard','dlouhý odchod z okna','delších odchodů: '+longAway.length+awayTxt,'hard');
  if(leaveCount>=2) add('leave-hard','opakované opuštění okna/karty','záznamů: '+leaveCount+awayTxt,'hard');
  else if(leaveCount===1) add('leave-soft','krátké opuštění okna/karty','1 záznam'+(maxAwayMs>=1000?(', cca '+Math.round(maxAwayMs/1000)+' s'):'')+' — na mobilu může jít o notifikaci/hovor','soft');
  const locked=eventCount(r,['locked']);if(locked)add('locked','test se uzamkl (přísný režim)','záznamů: '+locked,'hard');
  const unlocked=eventCount(r,['unlocked']);if(unlocked)add('unlocked','test byl odemčen učitelem','záznamů: '+unlocked,'soft');
  const badUnlock=eventCount(r,['bad-unlock']);if(badUnlock)add('bad-unlock','neúspěšný pokus o odemčení','záznamů: '+badUnlock,'hard');
  const paste=ev.filter(e=>String(e&&e.type||'')==='large-paste');if(paste.length){const maxChars=Math.max.apply(null,paste.map(e=>Number(e.chars)||0));var pStart=Date.parse((r&&r.startedAt)||'')||0;var pParts=paste.map(function(e){var q=(e&&e.qid)?('ot. '+String(e.qid)):'otázka ?';var tt='';var em=Date.parse((e&&e.t)||'')||0;if(pStart&&em&&em>=pStart){var sec=Math.round((em-pStart)/1000);tt=' v '+Math.floor(sec/60)+':'+('0'+(sec%60)).slice(-2);}return q+tt+' ('+(Number(e.chars)||0)+' zn.)';});add('large-paste','vložení delšího textu ze schránky','záznamů: '+paste.length+', max. '+maxChars+' znaků — '+pParts.join('; ')+'. Doporučení: u podezřele kvalitní otevřené odpovědi krátký ústní follow-up.','hard');}
  const mins=durationMinutes(r);const planned=Number(CONFIG.cas)||0;if(mins!=null&&!r.jokerUsed){const lim=planned?Math.max(2,planned*0.20):2;if(mins<lim)add('short-time','podezřele krátký čas',Math.round(mins*10)/10+' min z plánovaných '+(planned||'?')+' min','hard');}
  duplicateWarningsFor(r,info).forEach(w=>add('duplicate','opakovaný pokus / stejný kód',w,'hard'));
  const changes=answerChangeTotal(r);const qn=(r.details||[]).length||1;const changeLimit=Math.max(30,qn*5);if(changes>changeLimit)add('many-changes','neobvykle mnoho změn odpovědí',changes+' změn u '+qn+' položek','soft');
  const st=r.answerChangeStats||{};const maxOne=Math.max(0,...Object.keys(st).map(k=>Number(st[k])||0));if(maxOne>12)add('many-changes-one','neobvykle mnoho změn u jedné odpovědi','max. '+maxOne+' změn u jedné položky','soft');
  // Indikátor rozdělené obrazovky — měkký signál. Zobraz jen když okno bylo malé/rozdělené
  // po nezanedbatelnou část testu (≥25 %), ať jednorázové zmenšení nedělá šum.
  var split=ev.filter(e=>String(e&&e.type||'')==='split-window');
  if(split.length){var sp=Math.max.apply(null,split.map(e=>Number(e.pct)||0));if(sp>=25)add('split-window','test běžel v malém / rozděleném okně',sp+' % času — možný split screen (okno vedle). Na mobilu může jít o rozdělenou obrazovku.','soft');}
  if(CONFIG.identityMode==='oneTimeCode' && (CONFIG.roster||[]).length && !rosterHasCode(r)){add('unknown-code','kód není v seznamu (roster)','zadáno: '+(submittedCode(r)||'—')+' — ověř přidělený kód studenta, může jít o překlep nebo cizí kód.','hard');}
  return out;}
function securityIssueCount(r){return securitySignalsFor(r,duplicateInfo()).length;}
function securitySignalText(r,info){const s=securitySignalsFor(r,info);return s.map(x=>x.label+(x.detail?' ('+x.detail+')':''));}
function renderSecuritySignals(){const box=$('securitySignals');if(!box)return;const ok=RESULTS.filter(r=>r.status==='OK');if(!ok.length){box.innerHTML='<div class="muted">Zatím nejsou načtené žádné opravené výsledky.</div>';return;}const info=duplicateInfo();const rows=[];ok.forEach(r=>{securitySignalsFor(r,info).forEach(sig=>rows.push({r,sig}));});const hard=rows.filter(x=>x.sig.sev==='hard').length;const soft=rows.length-hard;const clear=ok.length-rows.map(x=>x.r).filter((r,i,a)=>a.indexOf(r)===i).length;let html='<div class="signal-grid"><div class="signal-card '+(hard?'':'ok')+'"><b>'+hard+'</b><span>tvrdších signálů</span><div class="signal-note">dlouhý odchod, opakované opuštění, reload, pagehide, zámek</div></div><div class="signal-card'+(soft?'':' ok')+'"><b>'+soft+'</b><span>měkkých signálů</span><div class="signal-note">krátké přepnutí, blur — na mobilu častý plání poplach</div></div><div class="signal-card ok"><b>'+clear+'</b><span>výsledků bez signálu</span></div></div>';html+='<div class="archive-note" style="margin-top:8px"><b>Toto není automatický důkaz podvodu.</b> Posuď podle kontextu: měkké signály vznikají na mobilech běžně (notifikace, příchozí hovor, systémová lišta, uspání displeje). Tvrdší signály si zaslouží pozornost, ale ani ty nejsou rozsudek — porovnej je s časem, počtem a prací studenta.</div>';if(!rows.length){box.innerHTML=html+'<div class="ok">Žádný načtený výsledek nemá bezpečnostní signál.</div>';return;}rows.sort((a,b)=>(a.sig.sev==='hard'?0:1)-(b.sig.sev==='hard'?0:1));html+='<div style="overflow:auto"><table class="tbl"><tr><th>Student</th><th>ID pokusu</th><th>Závažnost</th><th>Signál</th><th>Detail</th></tr>'+rows.map(x=>{const isHard=x.sig.sev==='hard';return '<tr class="'+(isHard?'result-row-warn':'')+'"><td>'+esc(displayStudent(x.r))+'</td><td>'+esc(x.r.attemptId||'—')+'</td><td><span class="sev-badge '+(isHard?'sev-hard':'sev-soft')+'">'+(isHard?'tvrdší':'měkký')+'</span></td><td>'+esc(x.sig.label)+'</td><td>'+esc(x.sig.detail||'—')+'</td></tr>';}).join('')+'</table></div>';box.innerHTML=html;}
let duplicateWarnShown=false;
function flagDuplicateSubmissions(){if(duplicateWarnShown)return;const info=duplicateInfo();if(info.dupStudentKeys.length||info.dupAttemptKeys.length){duplicateWarnShown=true;vToast('Verifier našel možné duplicity: '+info.dupStudentKeys.length+' duplicitních jmen/kódů, '+info.dupAttemptKeys.length+' duplicitních ID pokusu. Zkontroluj oranžové řádky ve výsledcích.','warn');}}
function afterResultsChanged(){renderTable();refreshStudentSelect();renderSecuritySignals();renderProblemSummary();renderItemAnalysis();renderFeedback();flagDuplicateSubmissions();flagFullNameIdentifiers();}
// Defenzivní vrstva nad provozním pravidlem „používej kódy, ne jména". Když nahraná
// data vypadají jako celá jména (mezera + 2+ tokeny ≥3 znaků, např. „Jan Novák"),
// jednorázově upozorníme učitele — výsledky/feedback/CSV ponesou osobní údaje a je
// třeba je ukládat jen do zabezpečeného školního úložiště, ne posílat e-mailem.
let nameWarnShown = false;
function looksLikeFullName(s){
  const v=String(s||'').trim();
  if(!v) return false;
  const toks=v.split(/\s+/).filter(t=>t.length>=3);
  return toks.length>=2;
}
function flagFullNameIdentifiers(){
  if(nameWarnShown) return;
  const ok=RESULTS.filter(r=>r.status==='OK');
  if(ok.length<2) return; // jednorázové soubory netriggerujeme
  const looksLikeNames=ok.filter(r=>looksLikeFullName(r.student)).length;
  if(looksLikeNames < Math.ceil(ok.length*0.5)) return; // jen když převažují
  nameWarnShown=true;
  vToast('Studenti zadali svá jména místo kódů ('+looksLikeNames+' z '+ok.length+'). Výsledky, CSV a feedback budou nést osobní údaje — ukládej je jen do zabezpečeného školního úložiště a neposílej e-mailem. Pro příště zvaž zadání kódů (A1, A2…) místo jmen.','warn');
}
function renderTable(){const ok=RESULTS.filter(r=>r.status==='OK').length;const visible=visibleResults();const info=duplicateInfo();$('summary').innerHTML='Načteno: '+RESULTS.length+' souborů, opraveno: '+ok+'. Zobrazeno podle filtru: '+visible.length+'. Duplicity: '+info.dupStudentKeys.length+' jméno/kód, '+info.dupAttemptKeys.length+' ID pokusu.'+'<br><span class="small muted">Tento verifier očekává answers.txt pro Test ID <code>'+esc(CONFIG.testId)+'</code>, manifest <code>'+esc(CONFIG.manifestHash||'')+'</code> a studentský soubor SHA-256 <code style="word-break:break-all">'+esc(CONFIG.studentHtmlSha256||'—')+'</code>.</span>';$('resultTable').innerHTML='<tr><th>Student</th><th>ID pokusu</th><th>Body</th><th>%</th><th>Známka</th><th>Skupina</th><th>Žolík</th><th>Stav/varování</th></tr>'+visible.map(r=>{const sigs=r.status==='OK'?securitySignalText(r,info):[];const status=r.status==='OK'?(sigs.length?('výsledek vyžaduje kontrolu: '+sigs.join('; ')):'OK'):r.error;const cls=r.status!=='OK'?'result-row-bad':(sigs.length?'result-row-warn':'result-row-ok');return '<tr class="'+cls+'"><td>'+esc(displayStudent(r))+'</td><td>'+esc(r.attemptId||'—')+'</td><td>'+esc(r.earned)+'/'+esc(r.total)+'</td><td>'+esc(r.pct)+' %</td><td><b>'+esc(r.grade)+'</b></td><td>'+esc(r.groupKey||'')+'</td><td>'+esc(r.jokerUsed?'ANO':'—')+'</td><td>'+esc(status)+'</td></tr>';}).join('');}
function csvCell(s){s=String(s==null?'':s);return '"'+s.replace(/"/g,'""')+'"';}
function downloadCsv(){const info=duplicateInfo();const rows=[['student','attempt_id','student_html_sha256','expected_student_html_sha256','earned','total','pct','grade','group','joker_used','joker_selected_at','security_signal_count','security_signals','answer_change_count','duplicate_flags','started_at','submitted_at','file','status']].concat(RESULTS.map(r=>[r.student,r.attemptId||'',r.studentHtmlSha256||'',CONFIG.studentHtmlSha256||'',r.earned,r.total,r.pct,r.grade,r.groupKey,r.jokerUsed?'ANO':'NE',r.jokerSelectedAt||'',securityIssueCount(r),securitySignalText(r,info).join(' | '),answerChangeTotal(r),duplicateWarningsFor(r,info).join(' | '),r.startedAt||'',r.submittedAt||'',r.file,r.status]));const csv=rows.map(row=>row.map(csvCell).join(';')).join('\n');downloadText(csv,'results_'+CONFIG.testId+'.csv','text/csv;charset=utf-8');}
function feedbackLevelForExport(){const lvl=$('feedbackLevel')?$('feedbackLevel').value:'wrong-correct';const hide=$('hideCorrectExport')&&$('hideCorrectExport').checked;if(!hide)return lvl;if(lvl==='score-only')return 'score-only';if(lvl==='full')return 'full-no-correct';return 'wrong-no-correct';}
function feedbackShowsCorrect(level){return !['wrong-no-correct','full-no-correct'].includes(level);}
function feedbackDetailsFor(r,level){return (level==='full'||level==='full-no-correct')?r.details:r.details.filter(d=>!d.ok);}
function feedbackHtmlFor(r,level){
  if(r.status!=='OK')return '<div class="feedback"><h3>'+esc(r.file)+'</h3><div class="danger">'+esc(r.error)+'</div></div>';
  let h='<div class="feedback" data-student="'+esc(r.student||'')+'"><h3>'+esc(displayStudent(r))+(r.jokerUsed?' <span class="badge bad-badge">🃏 ŽOLÍK</span>':'')+'</h3><p><b>Výsledek:</b> '+esc(r.earned)+'/'+esc(r.total)+' b, '+esc(r.pct)+' %, známka '+esc(r.grade)+(r.jokerUsed?' — <b>žolík použit</b>':'')+'</p><p class="small muted"><b>ID pokusu:</b> '+esc(r.attemptId||'—')+' · <b>Start:</b> '+esc(r.startedAt||'—')+' · <b>Odevzdáno:</b> '+esc(r.submittedAt||'—')+'</p>';const dupWarn=duplicateWarningsFor(r,duplicateInfo());if(dupWarn.length)h+='<div class="warn"><b>Pozor:</b> '+esc(dupWarn.join('; '))+'</div>';
  if(level==='score-only')return h+'</div>';
  const ds=feedbackDetailsFor(r,level);
  if(!ds.length)h+='<div class="ok">Bez chyb.</div>';
  ds.forEach(d=>{
    const good=!!d.ok;
    const cls=good?'ans-ok':'ans-bad';
    const badge=good?'<span class="badge ok-badge">✓ správně</span>':'<span class="badge bad-badge">✕ špatně</span>';
    h+='<div class="q feedback-item '+cls+'"><div><b>Cvičení '+d.ex+', otázka '+d.q+'</b> — '+badge+' <span class="small">('+d.pts+'/'+d.total+' b)</span></div>';
    h+='<div class="small">'+esc(d.prompt)+'</div>';
    h+='<div class="student-answer '+(good?'ok':'bad')+'"><b>Odpověď studenta:</b> '+esc(d.student||'—')+'</div>';
    if(feedbackShowsCorrect(level))h+='<div class="correct-answer"><b>Správně:</b> '+esc(d.correct||'—')+'</div>';
    if(d.explanation)h+='<div class="small"><b>Vysvětlení:</b> '+esc(d.explanation)+'</div>';
    h+=csDetailFeedbackHtml(d);
    h+='</div>';
  });
  return h+'</div>';
}
function plainFeedbackFor(r,level){
  if(!r)return '';
  if(r.status!=='OK')return 'Soubor: '+(r.file||'')+'\nCHYBA: '+(r.error||'');
  let lines=['Student: '+(r.student||''),'Výsledek: '+r.earned+'/'+r.total+' b, '+r.pct+' %, známka '+r.grade];
  if(level==='score-only')return lines.join('\n');
  const ds=feedbackDetailsFor(r,level);
  if(!ds.length)lines.push('Bez chyb.');
  ds.forEach(d=>{lines.push('');lines.push('Cvičení '+d.ex+', otázka '+d.q+' — '+(d.ok?'správně':'špatně')+' ('+d.pts+'/'+d.total+' b)');if(d.prompt)lines.push('Zadání: '+d.prompt);lines.push('Odpověď studenta: '+(d.student||'—'));if(feedbackShowsCorrect(level))lines.push('Správně: '+(d.correct||'—'));if(d.explanation)lines.push('Vysvětlení: '+d.explanation);csDetailFeedbackPlain(d).forEach(function(x){lines.push(x);});});
  return lines.join('\n');
}
function renderFeedback(){const lvl=$('feedbackLevel').value;const rows=visibleResults();$('feedbackArea').innerHTML=rows.map(r=>feedbackHtmlFor(r,lvl)).join('')||'<div class="muted">Zatím není co zobrazit.</div>';refreshStudentSelect();}
function copySelectedFeedback(){const r=selectedResult();if(!r){vToast('Není vybraný žádný student.','warn');return;}const text=plainFeedbackFor(r,$('feedbackLevel').value);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>vToast('Feedback zkopírován.','ok')).catch(()=>fallbackCopyText(text));}else fallbackCopyText(text);}
function fallbackCopyText(text){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');vToast('Feedback zkopírován.','ok');}catch(e){vToast('Kopírování se nepovedlo.','err');}ta.remove();}
function feedbackDocumentHtml(title,body){return '<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'+document.querySelector('style').textContent+'</style></head><body><div class="wrap"><h1>'+esc(title)+'</h1>'+body+'</div></body></html>';}
function downloadSelectedFeedbackHtml(){const r=selectedResult();if(!r){vToast('Není vybraný žádný student.','warn');return;}const lvl=feedbackLevelForExport();const html=feedbackDocumentHtml('Zpětná vazba — '+(r.student||r.file),feedbackHtmlFor(r,lvl));downloadText(html,'feedback_'+safeFileName(r.student||r.file)+'_'+CONFIG.testId+'.html','text/html;charset=utf-8');}
async function downloadIndividualFeedbacks(){const rows=okVisibleResults();if(!rows.length){vToast('Není co exportovat.','warn');return;}const lvl=feedbackLevelForExport();if(rows.length>12){const ok=await vConfirm('Bude staženo '+rows.length+' samostatných souborů. Pokračovat?','Hromadné stažení');if(!ok)return;}rows.forEach((r,i)=>setTimeout(()=>{const html=feedbackDocumentHtml('Zpětná vazba — '+(r.student||r.file),feedbackHtmlFor(r,lvl));downloadText(html,'feedback_'+safeFileName(r.student||r.file)+'_'+CONFIG.testId+'.html','text/html;charset=utf-8');},i*250));}
function downloadFeedbackHtml(){const lvl=feedbackLevelForExport();const rows=visibleResults();const body=rows.map(r=>feedbackHtmlFor(r,lvl)).join('');const note=queryOf()?'<div class="warn"><b>Filtr aktivní:</b> export obsahuje jen položky odpovídající hledání.</div>':'';const html=feedbackDocumentHtml('Zpětná vazba — '+CONFIG.nazev,note+body);downloadText(html,'feedback_'+CONFIG.testId+'.html','text/html;charset=utf-8');}
function problemItems(){const agg={};RESULTS.filter(r=>r.status==='OK').forEach(r=>{(r.details||[]).forEach(d=>{const key=d.ex+'|'+d.q+'|'+d.prompt;const a=agg[key]||(agg[key]={ex:d.ex,q:d.q,prompt:d.prompt,total:0,wrong:0,type:d.type,correct:d.correct});a.total++;if(!d.ok)a.wrong++;});});return Object.values(agg).filter(a=>a.total>0&&a.wrong/a.total>=0.5).sort((a,b)=>(b.wrong/b.total)-(a.wrong/a.total)||b.wrong-a.wrong);}
function problemSummaryHtml(forExport){const arr=problemItems();if(!RESULTS.filter(r=>r.status==='OK').length)return '<div class="muted">Zatím nejsou načtené žádné opravené výsledky.</div>';if(!arr.length)return '<div class="ok">Žádná otázka nemá chybovost 50 % nebo vyšší.</div>';return '<table class="tbl"><tr><th>Otázka</th><th>Chybovost</th><th>Zadání</th>'+(forExport?'':'<th>Správně</th>')+'</tr>'+arr.map(a=>'<tr><td>Cv. '+esc(a.ex)+', otázka '+esc(a.q)+'</td><td><b>'+Math.round(a.wrong/a.total*100)+' %</b> ('+esc(a.wrong)+'/'+esc(a.total)+')</td><td>'+esc(a.prompt||'')+'</td>'+(forExport?'':'<td>'+esc(a.correct||'—')+'</td>')+'</tr>').join('')+'</table>';}
function renderProblemSummary(){const box=$('problemSummary');if(box)box.innerHTML=problemSummaryHtml(false);}
function iaPearson(xs,ys){var n=xs.length;if(n<3)return null;var sx=0,sy=0,sxx=0,syy=0,sxy=0;for(var i=0;i<n;i++){var x=xs[i],y=ys[i];sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;}var cov=sxy-sx*sy/n,vx=sxx-sx*sx/n,vy=syy-sy*sy/n;if(vx<=0||vy<=0)return null;return cov/Math.sqrt(vx*vy);}
function iaMedian(arr){if(!arr.length)return 0;var a=arr.slice().sort(function(p,q){return p-q;}),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function iaSum(arr){return arr.reduce(function(a,b){return a+b;},0);}
function iaGradeCmp(a,b){var na=parseFloat(String(a).replace(',','.')),nb=parseFloat(String(b).replace(',','.'));if(!isNaN(na)&&!isNaN(nb))return na-nb;return String(a).localeCompare(String(b),'cs');}
function distributionStats(){var ok=RESULTS.filter(function(r){return r.status==='OK';});var pcts=ok.map(function(r){return r.pct;});var grades={};ok.forEach(function(r){var g=String(r.grade);grades[g]=(grades[g]||0)+1;});return {n:ok.length,pcts:pcts,grades:grades,mean:pcts.length?Math.round(iaSum(pcts)/pcts.length):0,median:pcts.length?Math.round(iaMedian(pcts)):0,min:pcts.length?Math.min.apply(null,pcts):0,max:pcts.length?Math.max.apply(null,pcts):0};}
function itemAnalysisRows(){var ok=RESULTS.filter(function(r){return r.status==='OK';});var groups={};ok.forEach(function(r){var k=r.groupKey||'__default';(groups[k]||(groups[k]=[])).push(r);});var rows=[];Object.keys(groups).forEach(function(gk){var studs=groups[gk];var totals=studs.map(function(r){return r.earned;});var items={};studs.forEach(function(r,si){(r.details||[]).forEach(function(d){var key=d.ex+'|'+d.q;var it=items[key]||(items[key]={ex:d.ex,q:d.q,prompt:d.prompt,type:d.type,scores:[],oks:[],totals:[],wrongAnswers:[]});var frac=(d.total>0)?(d.pts/d.total):0;it.scores.push(frac);it.oks.push(d.ok?1:0);it.totals.push(totals[si]);if(!d.ok && d.student != null && String(d.student).trim()) it.wrongAnswers.push(String(d.student).trim());});});Object.keys(items).forEach(function(key){var it=items[key];var n=it.scores.length;var p=n?iaSum(it.scores)/n:0;var full=n?iaSum(it.oks)/n:0;var D=iaPearson(it.scores,it.totals);var topWrong=iaTopWrongAnswers(it.wrongAnswers,3);rows.push({groupKey:gk,ex:it.ex,q:it.q,prompt:it.prompt,type:it.type,n:n,p:p,full:full,D:D,topWrong:topWrong,wrongTotal:it.wrongAnswers.length});});});rows.sort(function(a,b){var da=(a.D==null)?99:a.D,db=(b.D==null)?99:b.D;return da-db||b.p-a.p;});return rows;}
function iaDiffLabel(p){if(p<0.3)return 'těžká';if(p>0.9)return 'podezřele snadná';if(p>0.85)return 'snadná';return 'střední';}
function iaDiscVerdict(row){if(row.n<3)return {txt:'málo dat',bad:false};if(row.D==null)return {txt:'—',bad:false};if(row.D<0)return {txt:'⚠ záporná — zkontroluj klíč',bad:true};if(row.D<0.15)return {txt:'⚠ slabě rozlišuje',bad:true};if(row.D<0.3)return {txt:'hraniční',bad:false};return {txt:'OK',bad:false};}
function iaTopWrongAnswers(wrongAnswers, n){
  // Agreguje nejčastější špatné odpovědi, vrátí top-n s počtem výskytů
  var counts = {};
  wrongAnswers.forEach(function(a){ var k = String(a||'').trim(); if(k) counts[k] = (counts[k]||0)+1; });
  return Object.keys(counts)
    .filter(function(k){ return counts[k] >= 2; })
    .sort(function(a,b){ return counts[b]-counts[a]; })
    .slice(0, n)
    .map(function(k){ return {answer:k, count:counts[k]}; });
}
function analysisHtml(forExport){var ok=RESULTS.filter(function(r){return r.status==='OK';});if(!ok.length)return '<div class="muted">Zatím nejsou načtené žádné opravené výsledky.</div>';var s=distributionStats();var html='';html+='<div class="archive-note"><b>Souhrn třídy:</b> '+s.n+' studentů · průměr <b>'+s.mean+' %</b> · medián '+s.median+' % · rozsah '+s.min+'–'+s.max+' %</div>';var gkeys=Object.keys(s.grades).sort(iaGradeCmp);var maxc=0;gkeys.forEach(function(g){if(s.grades[g]>maxc)maxc=s.grades[g];});html+='<div style="margin:10px 0">';gkeys.forEach(function(g){var c=s.grades[g];var w=maxc?Math.round(c/maxc*100):0;html+='<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><div style="width:64px;font-weight:800">Známka '+esc(g)+'</div><div style="flex:1;background:#eef2ff;border-radius:6px;overflow:hidden"><div style="width:'+w+'%;min-width:2px;background:#1d4ed8;color:#fff;padding:2px 6px;font-size:12px;font-weight:800;border-radius:6px;text-align:right">'+c+'</div></div></div>';});html+='</div>';var rows=itemAnalysisRows();var hasGroups=false;var seen={};ok.forEach(function(r){seen[r.groupKey||'__default']=1;});hasGroups=Object.keys(seen).length>1;html+='<div class="archive-note" style="margin-top:14px"><b>Položková analýza.</b> Obtížnost p = průměrná úspěšnost (0–100 %). Diskriminace = korelace položky s celkovým skóre: vysoká = dobří studenti ji řeší lépe; nízká nebo záporná = položka pravděpodobně chybná, dvojznačná nebo špatně oklíčovaná, ne jen těžká. Sloupec <b>Časté chyby</b> ukazuje nejčastější špatné odpovědi — pokud se opakuje stejná, zvaž uznání alternativy.</div>';html+='<div style="overflow:auto"><table class="tbl"><tr>'+(hasGroups?'<th>Skupina</th>':'')+'<th>Položka</th><th>Typ</th><th>n</th><th>Obtížnost p</th><th>Diskriminace</th><th>Hodnocení</th><th>Časté chyby / doporučení</th></tr>';rows.forEach(function(row){var v=iaDiscVerdict(row);var dtxt=(row.D==null||row.n<3)?'—':(Math.round(row.D*100)/100).toFixed(2);
  // Signál vysoké úspěšnosti
  var diffCls=''; var diffTxt='<b>'+Math.round(row.p*100)+' %</b> <span class="small muted">('+iaDiffLabel(row.p)+')</span>';
  if(row.p>0.9&&row.n>=3) diffTxt='<b style="color:#b45309">'+Math.round(row.p*100)+' %</b> <span class="small" style="color:#b45309">⚠ podezřele snadná</span>';
  // Špatné odpovědi a doporučení
  var wrongHtml='—';
  if(row.topWrong&&row.topWrong.length){
    var parts=row.topWrong.map(function(w){
      var pct=row.n?Math.round(w.count/row.n*100):0;
      var rec=(pct>=20)?' <span style="color:#1d4ed8;font-weight:700">→ zvaž alternativu</span>':'';
      return '<span class="small">„'+esc(w.answer)+'" ('+w.count+'×'+' / '+pct+'%)'+rec+'</span>';
    });
    wrongHtml=parts.join('<br>');
  }
  html+='<tr'+(v.bad?' class="problem-high"':'')+'>'+(hasGroups?'<td>'+esc(row.groupKey==='__default'?'základní':row.groupKey)+'</td>':'')+'<td>Cv. '+esc(row.ex)+', ot. '+esc(row.q)+'</td><td class="small">'+esc(row.type||'')+'</td><td>'+row.n+'</td><td>'+diffTxt+'</td><td>'+dtxt+'</td><td'+(v.bad?' style="font-weight:800;color:#991b1b"':'')+'>'+esc(v.txt)+'</td><td class="small">'+wrongHtml+'</td></tr>';});html+='</table></div>';return html;}
function renderItemAnalysis(){var box=$('itemAnalysis');if(box)box.innerHTML=analysisHtml(false);}
function archiveMeta(){const info=duplicateInfo();return {testId:CONFIG.testId,manifestHash:CONFIG.manifestHash,studentHtmlSha256:CONFIG.studentHtmlSha256||'',nazev:CONFIG.nazev,proKoho:CONFIG.proKoho||'',creatorId:CONFIG.creatorId||'',creatorName:CONFIG.creatorName||'',creatorRole:CONFIG.creatorRole||'',generatorVersion:CONFIG.generatorVersion||'',buildHash:CONFIG.buildHash||'',releaseDate:CONFIG.releaseDate||'',releaseStatus:CONFIG.releaseStatus||'',generatedAt:CONFIG.generatedAt||'',resultMode:CONFIG.resultMode||'secureOffline',createdAt:new Date().toISOString(),resultCount:RESULTS.length,okCount:RESULTS.filter(r=>r.status==='OK').length,duplicateStudentCount:info.dupStudentKeys.length,duplicateAttemptCount:info.dupAttemptKeys.length};}
function safeFileName(s){return String(s||'test').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80)||'test';}
function downloadIndexCsv(){const m=archiveMeta();const rows=[['testId','manifestHash','testName','class','student','earned','total','pct','grade','group','securitySignals','answerChanges','sourceFile','status']].concat(RESULTS.map(r=>[m.testId,m.manifestHash,m.nazev,m.proKoho,r.student,r.earned,r.total,r.pct,r.grade,r.groupKey,securityIssueCount(r),answerChangeTotal(r),r.file,r.status]));downloadText(rows.map(row=>row.map(csvCell).join(';')).join('\n'),'archive_index_'+CONFIG.testId+'.csv','text/csv;charset=utf-8');}
function downloadArchiveJson(){const data={metadata:archiveMeta(),results:RESULTS};downloadText(JSON.stringify(data,null,2),'archive_'+CONFIG.testId+'.json','application/json;charset=utf-8');}
function downloadArchiveHtml(){const lvl=feedbackLevelForExport();const m=archiveMeta();const rows=RESULTS.map(r=>'<tr><td>'+esc(r.student||r.file)+'</td><td>'+esc(r.earned)+'/'+esc(r.total)+'</td><td>'+esc(r.pct)+' %</td><td>'+esc(r.grade)+'</td><td>'+esc(r.status)+'</td><td>'+esc(securityIssueCount(r))+'</td></tr>').join('');const feedback=RESULTS.map(r=>feedbackHtmlFor(r,lvl)).join('');const problems=problemSummaryHtml($('hideCorrectExport')&&$('hideCorrectExport').checked);const raw=RESULTS.map(r=>'<details><summary>'+esc(r.student||r.file)+' — '+esc(r.file)+'</summary><textarea class="backup" readonly>'+esc(r.rawTxt||'')+'</textarea></details>').join('');const html='<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Archiv '+esc(CONFIG.testId)+'</title><style>'+document.querySelector('style').textContent+'</style></head><body><div class="wrap"><h1>Archiv testu — '+esc(m.nazev)+'</h1><div class="muted">Test ID: '+esc(m.testId)+' · Manifest: '+esc(m.manifestHash)+' · Student SHA-256: '+esc(m.studentHtmlSha256||'—')+' · Vytvořeno: '+esc(m.createdAt)+'<br>Generátor: v'+esc(m.generatorVersion)+' (build '+esc(m.buildHash)+', vydáno '+esc(m.releaseDate)+')</div><div class="warn"><b>⚠️ Osobní údaje žáků:</b> archiv obsahuje jména/kódy, body a feedback. Ukládej JEN do zabezpečeného školního úložiště (ne osobní cloud, ne e-mailové přílohy, ne sdílené adresáře). Zpřístupňuj pouze oprávněným osobám a po skončení uchovávací lhůty smaž.</div><section class="card"><h2>Souhrn</h2><table class="tbl"><tr><th>Student</th><th>Body</th><th>%</th><th>Známka</th><th>Stav</th><th>Varování</th></tr>'+rows+'</table></section><section class="card"><h2>Souhrn problematických otázek</h2>'+problems+'</section><section class="card"><h2>Rozložení a položková analýza</h2>'+analysisHtml(true)+'</section><section class="card"><h2>Feedback</h2>'+feedback+'</section><section class="card"><h2>Původní odevzdávací data</h2>'+raw+'</section></div></body></html>';downloadText(html,'archive_'+safeFileName(CONFIG.nazev)+'_'+CONFIG.testId+'.html','text/html;charset=utf-8');}
function downloadText(txt,fn,mime){const blob=new Blob([txt],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fn;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

var PRT_INSTR={'multiple choice':'Zakrouzkuj pismeno spravne odpovedi.','reading comprehension':'Prect text a zakrouzkuj spravnou odpoved.','listening comprehension':'Poslechni si nahravku a zakrouzkuj spravnou odpoved.','dialogue completion':'Doplň dialog — zakrouzkuj spravnou moznost.','true/false':'Zakrouzkuj Pravda nebo Nepravda.','matching':'Prirad k cislu vlevo pismeno spravne dvojice vpravo.','fill-in-the-blank':'Doplň chybejici slovo do mezery.','error correction':'Najdi a oprav chybu ve vete.','error-tagging':'Zakroužkuj chybný token, urči typ chyby a napiš opravu.','word order':'Seraď slova do spravne vety.','translation':'Preloz vetu.','sentence transformation':'Prepis vetu podle zadani.','word formation':'Doplň spravny tvar slova.','categorization':'Zaraď polozku do spravne kategorie.','cloze text':'Doplň slova do ocislovanych mezer.','multi-select':'Zaškrtni VŠECHNY správné možnosti.','ordering':'Seraď polozky do spravneho poradi — napis poradove cislo (1,2,3…) ke kazde polozce.','categorisation-board':'Zaraď kazdou polozku do spravne kategorie — napis nazev kategorie na linku.','table-completion':'Doplň chybejici udaje do tabulky.','transformation-chain':'Transformuj vychozi vetu podle jednotlivych instrukci.','highlight-evidence':'Vyber vetu, ktera slouzi jako dukaz pro odpoved.'};
function prtShuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function prtMatching(ex,withKey){var items=ex.items||[];var lefts=items.map(function(it,i){return {n:i+1,left:it.left||'',right:it.right||''};});var rights=prtShuffle(lefts.map(function(x){return x.right;}));var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';var h='<div class=\"match\"><div class=\"match-col\"><b>Vlevo</b>';lefts.forEach(function(x){h+='<div class=\"num-line\"><span>'+x.n+'.</span> '+esc(x.left)+' <span class=\"ul ul-sm\"></span></div>';});h+='</div><div class=\"match-col\"><b>Vpravo</b>';rights.forEach(function(r,i){h+='<div>'+letters[i]+') '+esc(r)+'</div>';});h+='</div></div>';if(withKey){h+='<div class=\"key-ans\"><b>Spravne dvojice:</b> '+lefts.map(function(x){return x.n+'-&gt;'+esc(x.right);}).join(' - ')+'</div>';}return h;}
function prtAnswerArea(ex,it,withKey){var t=ex.type;if(['multiple choice','reading comprehension','listening comprehension','dialogue completion'].indexOf(t)>=0&&Array.isArray(it.options)){var ci=withKey?correctIndex(it):-1;return '<ol class=\"opts\" type=\"A\">'+it.options.map(function(o,i){return '<li'+(i===ci?' class=\"keyopt\"':'')+'>'+esc(o)+(i===ci?' [OK]':'')+'</li>';}).join('')+'</ol>';}if(t==='multi-select'){var msc={};(Array.isArray(it.correct)?it.correct:[]).forEach(function(ix){msc[Number(ix)]=1;});return '<ol class=\"opts\" type=\"A\">'+(it.options||[]).map(function(o,i){var isC=withKey&&msc[i];return '<li'+(isC?' class=\"keyopt\"':'')+'>['+(isC?'X':' ')+'] '+esc(o)+(isC?' [OK]':'')+'</li>';}).join('')+'</ol>';}if(t==='ordering'){var oi=Array.isArray(it.items)?it.items:[];var co=Array.isArray(it.correct_order)?it.correct_order.map(Number):[];var rank={};co.forEach(function(origIdx,pos){rank[origIdx]=pos+1;});var rows=oi.map(function(o,i){return '<div class=\"num-line\"><span class=\"ul ul-sm\"></span> '+esc(o)+(withKey?' <b>['+(rank[i]||'?')+']</b>':'')+'</div>';}).join('');return rows+(withKey?'<div class=\"key-ans\"><b>Spravne poradi:</b> '+esc(co.map(function(ix){return oi[ix]!=null?oi[ix]:('#'+ix);}).join(' -> '))+'</div>':'');}if(t==='highlight-evidence'){var hs=Array.isArray(it.sentences)?it.sentences:[];var ci=Number(it.correct);return '<ol class=\"opts\" type=\"A\">'+hs.map(function(sent,i){var ok=withKey&&i===ci;return '<li'+(ok?' class=\"keyopt\"':'')+'>'+esc(sent)+(ok?' [OK]':'')+'</li>';}).join('')+'</ol>';}if(t==='table-completion'){var cols=Array.isArray(it.columns)?it.columns:[];var rows=Array.isArray(it.rows)?it.rows:[];var head='<table class=\"tbl\"><thead><tr>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>';var body=rows.map(function(row){row=Array.isArray(row)?row:[];return '<tr>'+row.map(function(cell){if(cell&&typeof cell==='object'&&!Array.isArray(cell)){return '<td>'+(withKey?'<b>'+esc(cell.answer||'')+'</b>':'<span class=\"ul ul-sm\"></span>')+'</td>';}return '<td>'+esc(cell)+'</td>';}).join('')+'</tr>';}).join('');return head+body+'</tbody></table>';}if(t==='transformation-chain'){var trs=Array.isArray(it.transformations)?it.transformations:[];var h='<div class=\"src\"><b>Vychozi veta:</b> '+esc(it.base_sentence||'')+'</div>';h+=trs.map(function(tr,i){return '<div class=\"num-line\"><span>'+(i+1)+'. '+esc(tr&&tr.instruction!=null?tr.instruction:'')+'</span><br><span class=\"ul\"></span>'+(withKey&&tr&&tr.answer!=null?' <b>'+esc(tr.answer)+'</b>':'')+'</div>';}).join('');return h;}if(t==='categorisation-board'){var cbcats=Array.isArray(it.categories)?it.categories:[];var cbens=Array.isArray(it.entries)?it.entries:[];var head='<div class=\"src\">Kategorie: '+esc(cbcats.join(' / '))+'</div>';var rows=cbens.map(function(e){var tx=e&&e.text!=null?e.text:'';return '<div class=\"num-line\">'+esc(tx)+': <span class=\"ul\"></span>'+(withKey&&e&&e.category!=null?' <b>'+esc(e.category)+'</b>':'')+'</div>';}).join('');return head+rows;}if(t==='error-tagging'){var toks=Array.isArray(it.tokens)?it.tokens:[];var ix=Number(it.error_token_index);var tok=toks[ix]!=null?toks[ix]:('#'+ix);var opts=Array.isArray(it.error_type_options)?it.error_type_options:[];var head='<div class=\"src\">'+esc((it.sentence||toks.join(' ')))+'</div><div class=\"src\">Tokeny: '+esc(toks.join(' / '))+'</div>';if(withKey)return head+'<div class=\"key-ans\"><b>Správně:</b> token '+esc(tok)+'; typ '+esc(it.error_type||'')+'; oprava '+esc(it.correction||'')+'</div>';return head+'<div class=\"num-line\">Chybný token: <span class=\"ul ul-sm\"></span></div><div class=\"num-line\">Typ chyby ('+esc(opts.join(' / '))+'): <span class=\"ul ul-sm\"></span></div><div class=\"num-line\">Oprava: <span class=\"ul\"></span></div>';}if(t==='true/false'){return '<div class=\"tf\">Pravda / Nepravda'+(withKey?' <b>-&gt; '+(it.correct===true?'Pravda':(it.correct===false?'Nepravda':esc(String(it.correct))))+'</b>':'')+'</div>';}if(t==='cloze text'){var ans=accepted(it,['answers','answer']);var nb=(String(it.text||it.passage||'').match(/_{2,}/g)||[]).length||ans.length||1;var lines='';for(var ci2=0;ci2<nb;ci2++){lines+='<div class=\"num-line\"><span>'+(ci2+1)+'.</span><span class=\"ul\"></span>'+(withKey&&ans[ci2]!=null?' <b>'+esc(ans[ci2])+'</b>':'')+'</div>';}return lines;}if(t==='word order'){var words=Array.isArray(it.words)?it.words:[];var pool=words.length?'<div class=\"src\">Slova: '+esc(prtShuffle(words).join(' - '))+'</div>':'';return pool+'<div class=\"ans-line\"></div>'+(withKey?'<div class=\"key-ans\"><b>Spravne:</b> '+esc(answerForPreview(ex,it)||'-')+'</div>':'');}return '<div class=\"ans-line\"></div>'+(withKey?'<div class=\"key-ans\"><b>Spravne:</b> '+esc(answerForPreview(ex,it)||'-')+'</div>':'');}
function prtVariantHtml(groupKey,withKey,showLabel){var exs=getExs(groupKey);var total=0;exs.forEach(function(ex){total+=exTotal(ex);});var h='<div class=\"variant\">';if(showLabel)h+='<div class=\"vlabel\">Varianta: '+esc(groupKey==='__default'?'zakladni':groupKey)+'</div>';h+='<div class=\"phead\"><div class=\"ptitle\">'+esc(CONFIG.nazev||'Test')+(withKey?' - KLIC':'')+'</div><div class=\"pmeta\">Test ID: '+esc(CONFIG.testId)+(CONFIG.cefr?' - CEFR '+esc(CONFIG.cefr):'')+' - '+total+' b'+(CONFIG.cas?' - '+esc(CONFIG.cas)+' min':'')+'</div>'+(withKey?'':'<div class=\"pname\">Jmeno: <span class=\"ul ul-lg\"></span> Datum: <span class=\"ul\"></span></div>')+(withKey?'':'<div class=\"pname\">Body: <span class=\"ul ul-sm\"></span> / '+total+' Znamka: <span class=\"ul ul-sm\"></span></div>')+'</div>';exs.forEach(function(ex,ei){var instr=PRT_INSTR[ex.type]||'';h+='<div class=\"ex\"><div class=\"exh\"><b>Cviceni '+(ei+1)+': '+esc(ex.title||ex.type)+'</b> <span class=\"muted\">('+exTotal(ex)+' b)</span></div>';if(instr)h+='<div class=\"instr\">'+esc(instr)+'</div>';var rcShared='';if(ex.type==='reading comprehension'){rcShared=String(ex.passage||ex.source_text||ex.text||ex.source||'');if(!rcShared){var items0=ex.items||[],f0='';for(var z=0;z<items0.length;z++){var ip0=String((items0[z]&&(items0[z].passage||items0[z].text||items0[z].source))||'').trim();if(z===0)f0=ip0;else if(ip0!==f0){f0='';break;}}rcShared=f0;}if(rcShared)h+='<div class=\"src\">'+esc(rcShared)+'</div>';}if(ex.type==='matching'){h+=prtMatching(ex,withKey);}else{(ex.items||[]).forEach(function(it,qi){h+='<div class=\"q\"><div class=\"qh\"><b>'+(qi+1)+'.</b> '+esc(promptForPreview(ex,it))+' <span class=\"muted\">('+itemPoint(ex,qi)+' b)</span></div>';if(ex.type==='reading comprehension'&&!rcShared&&it.passage)h+='<div class=\"src\">'+esc(it.passage)+'</div>';if(ex.type==='listening comprehension')h+='<div class=\"src\"><i>Ucitel prehraje poslech.</i></div>';if(ex.type==='dialogue completion'&&it.dialogue)h+='<div class=\"src\">'+esc(it.dialogue)+'</div>';if(withKey&&ex.type==='listening comprehension'&&it.transcript)h+='<div class=\"src\"><b>Transkript (ucitel):</b> '+esc(it.transcript)+'</div>';h+=prtAnswerArea(ex,it,withKey);if(withKey&&it.explanation)h+='<div class=\"key-expl\"><b>Vysvetleni:</b> '+esc(it.explanation)+'</div>';h+='</div>';});}h+='</div>';});h+='</div>';return h;}
function prtCss(){return '@media print{.no-print{display:none!important}.variant{page-break-after:always}}'+'body{font-family:Georgia,serif;color:#000;background:#fff;margin:0;line-height:1.5}'+'.toolbar{position:sticky;top:0;background:#1d4ed8;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}'+'.toolbar button{background:#fff;color:#1d4ed8;border:0;border-radius:8px;padding:9px 14px;font-weight:800;cursor:pointer;font-size:14px}'+'.page{max-width:780px;margin:0 auto;padding:22px}'+'.phead{border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}'+'.ptitle{font-size:20px;font-weight:800}.pmeta{font-size:12px;color:#333;margin:4px 0}'+'.pname{margin-top:8px;font-size:14px}'+'.vlabel{font-weight:800;background:#eee;padding:4px 8px;border-radius:6px;display:inline-block;margin-bottom:8px}'+'.ex{margin:14px 0;border-top:1px solid #999;padding-top:8px}'+'.exh{font-size:15px}.instr{font-size:12px;font-style:italic;color:#444;margin:2px 0 8px}'+'.q{margin:9px 0}.qh{margin-bottom:4px}'+'.opts{margin:4px 0 4px 18px}.opts li{margin:2px 0}.keyopt{font-weight:800}'+'.tf{margin:4px 0;font-weight:600}'+'.src{background:#f4f6fb;border-left:3px solid #1d4ed8;padding:7px 10px;margin:6px 0;font-size:13px}'+'.ans-line{border-bottom:1px solid #000;height:24px;margin:8px 0}'+'.num-line{display:flex;align-items:center;gap:6px;margin:5px 0}'+'.ul{display:inline-block;border-bottom:1px solid #000;min-width:150px;height:16px}.ul-sm{min-width:60px}.ul-lg{min-width:220px}'+'.match{display:flex;gap:26px;margin:6px 0}.match-col{flex:1}'+'.muted{color:#666;font-size:12px}'+'.key-ans{background:#eef6ff;padding:5px 8px;border-radius:6px;margin-top:5px;font-size:13px}'+'.key-expl{font-size:12px;color:#333;margin-top:3px}';}
function buildPrintableHtml(withKey){var keys=previewKeys();var showLabel=keys.length>1;var body='';keys.forEach(function(k){body+=prtVariantHtml(k,withKey,showLabel);});var title=esc(CONFIG.nazev||'Test')+(withKey?' - klic':' - tisk');return '<!DOCTYPE html><html lang=\"cs\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>'+title+'</title><style>'+prtCss()+'</style></head><body><div class=\"toolbar no-print\"><button onclick=\"window.print()\">Vytisknout / ulozit jako PDF</button><span>'+(withKey?'Verze s klicem - jen pro ucitele.':'Prazdny studentsky arch.')+'</span></div><div class=\"page\">'+body+'</div></body></html>';}
function openPrint(withKey){var html=buildPrintableHtml(withKey);var w=null;try{w=window.open('','_blank');}catch(e){w=null;}if(w&&w.document){w.document.open();w.document.write(html);w.document.close();}else{downloadText(html,(withKey?'klic_':'arch_')+safeFileName(CONFIG.nazev||'test')+'_'+CONFIG.testId+'.html','text/html;charset=utf-8');}}

`;}

async function assembleTestHtml(st, genData) {
  // Ostrý (klasifikovaný) balíček = secureOffline. Veškerá jeho kryptografie (salt, manifest
  // hash, per-test secret, PIN/heslo, RSA klíč verifieru) se počítá níž; tvrdou bránou hned na
  // vstupu zajistíme, že nic z toho nespadne na slabý fallback. Instant režim (neostrý) tady
  // záměrně neblokujeme — používá orientační ověření, kde je fallback přijatelný.
  if((st.resultMode||'instant')==='secureOffline') requireWebCrypto('Bezpečný offline test');
  const diffGroups=getApiDiffGroups(st);
  const variants=normalizeAllVariants(st,genData,diffGroups);
  // Randomizace se aplikuje až při startu testu podle studenta/attemptId; všichni tak nemají stejný pořádek.
  const defaultExercises=variants.__default||[];
  if(!defaultExercises.length)throw new Error('Žádná cvičení k sestavení.');
  const groupNotes=(genData&&typeof genData.group_notes==='object'&&genData.group_notes)?genData.group_notes:{};

  const jazyk=st.jazyk||'angličtina';
  const uiLang=getUiLang(st.instrJazyk,jazyk);
  const labels=getLabels(uiLang);
  const customScaleRaw=trim('vlastniSkala');
  const summary=variantSummary(defaultExercises);
  const testId='T'+Date.now().toString(36).toUpperCase().slice(-6);
  const generatorVersion=RELEASE.version;
  const generatedAt=new Date().toISOString();
  const cr=currentCreator(); // přihlášený proškolený učitel / admin → auditní stopa do výstupů
  const securitySalt=randomHex(16);
  const configForHash={
    generatorVersion,buildHash:BUILD_HASH,releaseDate:RELEASE.date,releaseStatus:RELEASE.status,testId,generatedAt,
    creatorId:cr.id, creatorRole:cr.role,
    nazev: trim('nazev')||'Test', proKoho: trim('proKoho')||'', jazyk, uiLang,
    cefr: (String(jazyk||'').toLowerCase()==='čeština' ? '' : cefrLabel()), cefrLevels: (String(jazyk||'').toLowerCase()==='čeština' ? [] : CEFR_LEVELS.filter(l => st.uroven.includes(l))), cefrCombined: (String(jazyk||'').toLowerCase()==='čeština' ? false : !!(st.kombinovat && st.uroven.length > 1)),
    cas: st.cas||45, tema: st.tema||'examBlue', testMode: st.testMode||'bezny',
    randomizace: st.randomizace==='ANO', overeni: st.overeni==='ANO', identityMode: st.identityMode||'name',
    zolicek: st.zolicek==='ANO', layout: st.layout||'tabs', odevzdavani: st.odevzdavani||'B', resultMode: st.resultMode || 'instant',
    gradeTyp: st.gradeTyp||'skola', gradeScaleRaw: customScaleRaw,
    fuzzyTolerance: (st.fuzzyTolerance==='mild'||st.fuzzyTolerance==='strict')?st.fuzzyTolerance:'off',
    feedbackMode: (['none','brief','learning'].indexOf(st.feedbackMode)!==-1)?st.feedbackMode:'brief',
    screenGuard: !!st.screenGuard,
    lockOnLeave: (st.testMode==='prisny') || !!st.screenGuard,
    isCzech: String(jazyk||'').toLowerCase()==='čeština',
    csScoringPolicy: (function(){ const cm=(st&&st.csModule)||{}; const ch=(cm&&cm.checks)||{}; return { enabled:String(jazyk||'').toLowerCase()==='čeština', domain:cm.domain||'', phenomenon:cm.phenomenon||'', correctionMode:cm.correctionMode||'', difficulty:cm.difficulty||'', diacritics:ch.diacritics!==false, punctuation:!!ch.punctuation, capitalization:!!ch.capitalization, exactShape:ch.exactShape!==false, requireTeacherReview: cm.correctionMode==='semi'||cm.correctionMode==='manual'||cm.domain==='stylistika'||cm.domain==='literatura' }; })(),
    csFeedbackPolicy: (function(){ const cm=(st&&st.csModule)||{}; return { enabled:String(jazyk||'').toLowerCase()==='čeština', structured:true, domain:cm.domain||'', phenomenon:cm.phenomenon||'', difficulty:cm.difficulty||'', studentLabels:{phenomenon:'Jev',rule:'Pravidlo',why:'Proč',repeat:'Co zopakovat'} }; })(),
    totalBody: summary.totalBody, totalQ: summary.totalQ, exCount: summary.exCount,
    diffGroups: diffGroups.map(g=>({key:g.key,name:g.name,conditions:g.conditions,students:g.students,a11y:g.a11y||null})),
    groupNotes, variantKeys: Object.keys(variants).filter(k=>k!=='__default')
  };
  const contentHash=await sha256Text(stableStringify(variants));
  const configHash=await sha256Text(stableStringify(configForHash));
  const manifestBase={v:1,security:'B+C-offline',salt:securitySalt,contentHash,configHash,...configForHash};
  const manifestHash=await sha256Text(stableStringify(manifestBase));
  const teacherSecurityCode=trim('bezpKod');
  const verifySecret=teacherSecurityCode
    ? await derivePerTestSecret(teacherSecurityCode, securitySalt, manifestHash)
    : makeVerifySecret();
  const teacherPinHash=await deriveSecretHash('teacher-pin', trim('ucitelPin')||'', testId);
  const unlockHash=await deriveSecretHash('unlock-password', trim('heslo')||'', testId);
  const cfg={
    nazev: configForHash.nazev,
    proKoho: configForHash.proKoho,
    jazyk,uiLang,labels,
    isSpanish: isSpanishLike(jazyk),
    isCzech: !!configForHash.isCzech,
    csScoringPolicy: configForHash.csScoringPolicy || {},
    csFeedbackPolicy: configForHash.csFeedbackPolicy || {},
    cefr: configForHash.cefr,
    cefrLevels: configForHash.cefrLevels,
    cefrCombined: configForHash.cefrCombined,
    cas: configForHash.cas,
    tema: configForHash.tema,
    testMode: configForHash.testMode,
    randomizace: configForHash.randomizace,
    overeni: configForHash.overeni,
    zolicek: configForHash.zolicek,
    ucitelJmeno: trim('ucitelJmeno')||'',
    ucitelPinHash: teacherPinHash,
    hesloHash: unlockHash,
    hasUnlock: !!trim('heslo'),
    verifySecret,
    securityMode: teacherSecurityCode ? 'teacher-code-derived' : 'random-per-test',
    securitySalt,
    manifest:{...manifestBase,hash:manifestHash},
    manifestHash,
    layout: configForHash.layout,
    odevzdavani: configForHash.odevzdavani,
    resultMode: configForHash.resultMode,
    gradeTyp: configForHash.gradeTyp,
    fuzzyTolerance: configForHash.fuzzyTolerance,
    feedbackMode: configForHash.feedbackMode,
    screenGuard: configForHash.screenGuard,
    lockOnLeave: configForHash.lockOnLeave,
    gradeScale: st.gradeTyp==='vlastni'?((st.aiGradeScale&&st.aiGradeScale.length&&st.aiGradeRaw===customScaleRaw)?st.aiGradeScale.slice():parseCustomGradeScale(customScaleRaw, summary.totalBody)):[],
    gradeScaleRaw: customScaleRaw,
    generatorVersion,
    buildHash: BUILD_HASH,
    releaseDate: RELEASE.date,
    releaseStatus: RELEASE.status,
    generatedAt,
    creatorId: cr.id,
    creatorName: cr.name,
    creatorRole: cr.role,
    appMode: state.appMode || '',
    testId,
    totalBody: summary.totalBody,
    totalQ: summary.totalQ,
    exCount: summary.exCount,
    diffGroups,
    groupNotes,
    variantKeys: configForHash.variantKeys
  };
  lastAssembled = { cfg, variants }; // vstup pro self-test bodování (skutečná data testu)
  const variantHtmls=buildVariantHtmls(cfg,variants);
  if ((st.resultMode || 'instant') === 'secureOffline') {
    return await assembleSecureOfflinePackage(st, cfg, variants);
  }
  return '<!DOCTYPE html>\n<html lang="'+H(uiLang)+'">\n<head>\n'+
    '<meta charset="UTF-8">\n'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">\n'+
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'+
    '<title>'+H(cfg.nazev)+'</title>\n'+
    '<style>\n'+getTestBaseCSS()+'\n'+getTestThemeCSS(cfg.tema)+'\n</style>\n'+
    '</head>\n<body>\n'+
    auditCommentHtml(cfg)+
    buildIntroHtml(cfg,defaultExercises)+
    buildTestScreenHtml(cfg,defaultExercises)+
    buildResultHtml(cfg)+
    buildTeacherHtml(cfg,defaultExercises)+
    buildModalsHtml(cfg)+
    '\n<script>\n\'use strict\';\n'+
    'const CFG='+safeJsonForScript(cfg)+';\n'+
    'const VARIANTS='+safeJsonForScript(variants)+';\n'+
    'const VARIANT_HTMLS='+safeJsonForScript(variantHtmls)+';\n'+
    'var EXS=VARIANTS.__default||[];\n'+
    'const LABELS=CFG.labels||{};\n'+
    getTestScript()+
    '\n<\/'+'script>\n</body>\n</html>';
}
