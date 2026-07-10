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
  const rows=(typeof rosterEntries!=='undefined'&&Array.isArray(rosterEntries))?rosterEntries:[];
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

