// ── Bezpečný offline režim: testuje skutečné funkce verifieru + krypto řetězec ──
async function stRunSecure(report){
  const pkg=generatedPackage, asm=lastAssembled;
  if(!asm||!asm.variants||!asm.cfg) throw new Error('Chybí strukturovaná data testu. Spusť self-test hned po vygenerování testu (ne po načtení z historie).');
  let teacherFrame=null, studentFrame=null;
  try{
    teacherFrame=await stMakeHiddenFrame(pkg.teacherHtml, w=>['scorePayload','decryptPayload','parseTxt','correctIndex'].every(n=>typeof w[n]==='function'));
    studentFrame=await stMakeHiddenFrame(pkg.studentHtml, w=>typeof w.encryptPayloadForTeacher==='function');
    const tw=teacherFrame.contentWindow, sw=studentFrame.contentWindow;
    ['scorePayload','decryptPayload','parseTxt','correctIndex'].forEach(n=>{ if(typeof tw[n]!=='function') throw new Error('Verifier neexponuje funkci '+n+' — pravděpodobně chyba v emitovaném skriptu.'); });
    if(typeof sw.encryptPayloadForTeacher!=='function') throw new Error('Studentský test neexponuje encryptPayloadForTeacher.');

    const cfg=asm.cfg, variants=asm.variants;
    const keys=Object.keys(variants).length?Object.keys(variants):['__default'];
    let firstResp=null, firstKey=null;

    keys.forEach(key=>{
      const exs=variants[key]||[]; if(!exs.length)return;
      const c=stBuildResp(tw,exs,'correct'), w=stBuildResp(tw,exs,'wrong');
      const gapSet=new Set(c.gaps.map(g=>g.ex+'_'+g.q));
      c.gaps.forEach(g=>report.gaps.push(Object.assign({variant:key},g)));
      const meta={testId:cfg.testId,manifestHash:cfg.manifestHash,student:'__ST__'};
      const pc=tw.scorePayload(Object.assign({groupKey:key,resp:c.resp},meta));
      const pw=tw.scorePayload(Object.assign({groupKey:key,resp:w.resp},meta));
      report.scoring.push(stVerdict('['+key+'] vše správně',pc.details,100,pc.pct,pc.earned,pc.total,pc.grade,gapSet));
      report.scoring.push(stVerdict('['+key+'] vše špatně',pw.details,0,pw.pct,pw.earned,pw.total,pw.grade,gapSet));
      // Randomizovaný test monotonie + rozsahu proti reálnému scorePayload.
      var slots=stFlippableSlots(tw,exs);
      var scoreFn=function(correctSet){
        var resp={};
        slots.forEach(function(s,idx){
          if(s.matching){ resp[s.key]= correctSet.has(idx)? String((exs[s.ei].items[s.li].right)) : (ST_WRONG+'_'+s.ei+'_'+s.li); }
          else { resp[s.key]= correctSet.has(idx)? s.correct : s.wrong; }
        });
        var sc=tw.scorePayload(Object.assign({groupKey:key,resp:resp},meta));
        return sc.pct;
      };
      report.scoring.push(stMonotonicVerdict('['+key+'] monotonie + rozsah (náhodné pořadí oprav)',slots,scoreFn,0x5eed^key.length));
      if(!firstResp){firstResp=c.resp;firstKey=key;}
    });

    if(firstResp){
      const payload={v:1,testId:cfg.testId,manifestHash:cfg.manifestHash,student:'__SELFTEST__',groupKey:firstKey,startedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),jokerUsed:false,jokerSelectedAt:'',resp:firstResp,securityEvents:[],userAgent:'selftest'};
      const packed=await sw.encryptPayloadForTeacher(payload);
      const txt='SECURE-ANSWERS-V1\n'+JSON.stringify({testId:cfg.testId,creatorId:cfg.creatorId||'',generatorVersion:cfg.generatorVersion||'',buildStatus:cfg.releaseStatus||'',resultMode:'secureOffline',manifestHash:cfg.manifestHash,studentHtmlSha256:cfg.studentHtmlSha256||'',createdAt:new Date().toISOString(),payload:packed},null,2);
      const pack=tw.parseTxt(txt);
      const okMeta=(pack.testId===cfg.testId&&pack.manifestHash===cfg.manifestHash);
      const decrypted=await tw.decryptPayload(pack);
      const roundtrip=JSON.stringify(decrypted.resp)===JSON.stringify(firstResp);
      const scored=tw.scorePayload(decrypted);
      report.crypto={okMeta,roundtrip,pct:scored.pct,pass:okMeta&&roundtrip&&scored.pct===100};
    }
  } finally {
    if(teacherFrame)teacherFrame.remove();
    if(studentFrame)studentFrame.remove();
  }
}

// ── Okamžitá známka (instant): testuje skutečné funkce scoreItem + agregaci calcScoreFromAnswers ──
async function stRunInstant(report){
  const asm=lastAssembled;
  if(!asm||!asm.variants) throw new Error('Chybí strukturovaná data testu. Spusť self-test hned po vygenerování testu (ne po načtení z historie).');
  let frame=null;
  try{
    frame=await stMakeHiddenFrame(generatedTestHtml, w=>['calcScore','calcScoreFromAnswers','scoreItem','correctIndex'].every(n=>typeof w[n]==='function'));
    const iw=frame.contentWindow;
    ['calcScore','calcScoreFromAnswers','scoreItem','correctIndex'].forEach(n=>{ if(typeof iw[n]!=='function') throw new Error('Instant test neexponuje funkci '+n+' — pravděpodobně chyba v emitovaném skriptu.'); });
    const variants=asm.variants, keys=Object.keys(variants).length?Object.keys(variants):['__default'];

    keys.forEach(key=>{
      const exs=variants[key]||[]; if(!exs.length)return;
      // Mezery v datech: textová/výběrová položka bez určitelného klíče správné odpovědi.
      const gaps=[];
      exs.forEach((ex,ei)=>{
        if(ex.type==='matching'){(ex.items||[]).forEach((it,li)=>{ if(it.right==null||!String(it.right).trim())gaps.push({ex:ei+1,q:li+1,type:ex.type}); }); return;}
        (ex.items||[]).forEach((it,qi)=>{ if(stCorrectValue(iw,ex,it)===null)gaps.push({ex:ei+1,q:qi+1,type:ex.type}); });
      });
      const gapSet=new Set(gaps.map(g=>g.ex+'_'+g.q));
      gaps.forEach(g=>report.gaps.push(Object.assign({variant:key},g)));

      ['correct','wrong'].forEach(mode=>{
        const answers={}, details=[];
        exs.forEach((ex,ei)=>{
          if(ex.type==='matching'){
            const n=(ex.items||[]).length, pairs={}, gap=(ex.items||[]).some(it=>it.right==null||!String(it.right).trim());
            (ex.items||[]).forEach((_,li)=>{ pairs[li]= mode==='correct'?li : (n>=2?((li+1)%n):li); });
            answers['match_'+ei]={type:'match',pairs};
            // izolované skóre cvičení přes reálnou agregaci (bez sahání na globály)
            const single={}; single['match_0']={type:'match',pairs};
            const sc=iw.calcScoreFromAnswers(single,[ex]);
            details.push({ex:ei+1,q:'(matching)',type:ex.type,pts:sc.earned,total:sc.total,skip:(mode==='wrong'&&n<2)||(mode==='correct'&&gap)});
            return;
          }
          (ex.items||[]).forEach((it,qi)=>{
            const pts=stPointOf(ex,qi);
            const v= mode==='correct'?stCorrectValue(iw,ex,it):stWrongValue(iw,ex,it);
            const ans=(ex.type==='cloze text'||ex.type==='fill-in-the-blank')?{vals:Array.isArray(v)?v:[v==null?'':v]}:{val:v};
            answers[ei+'_'+qi]=ans;
            const got=iw.scoreItem(ex,it,ans,pts);
            details.push({ex:ei+1,q:qi+1,type:ex.type,pts:Math.round((got||0)*100)/100,total:pts});
          });
        });
        // Reálná agregace: chytí chyby součtu, zaokrouhlení i mapování známky.
        const agg=iw.calcScoreFromAnswers(answers,exs);
        const want= mode==='correct'?100:0;
        const v=stVerdict('['+key+'] '+(mode==='correct'?'vše správně':'vše špatně'),details,want,agg.pct,agg.earned,agg.total,agg.grade,gapSet);
        report.scoring.push(v);
      });

      // Randomizovaný test monotonie + rozsahu proti reálnému calcScoreFromAnswers.
      const slots=stFlippableSlots(iw,exs);
      const scoreFn=function(correctSet){
        const answers={};
        // sestav odpovědi: položky v correctSet správně, ostatní špatně
        slots.forEach(function(s,idx){
          if(s.matching){
            const ekey='match_'+s.ei;
            if(!answers[ekey]) answers[ekey]={type:'match',pairs:{}};
            answers[ekey].pairs[s.li]= correctSet.has(idx)? s.li : ((s.li+1)%s.n);
          } else {
            const val= correctSet.has(idx)? s.correct : s.wrong;
            answers[s.ei+'_'+s.qi]=(s.type==='cloze text'||s.type==='fill-in-the-blank')?{vals:Array.isArray(val)?val:[val==null?'':val]}:{val:val};
          }
        });
        return iw.calcScoreFromAnswers(answers,exs).pct;
      };
      report.scoring.push(stMonotonicVerdict('['+key+'] monotonie + rozsah (náhodné pořadí oprav)',slots,scoreFn,0x5eed^key.length));
    });
    report.crypto=null;
  } finally { if(frame)frame.remove(); }
}

function stRenderReport(r){
  if(r.error) return '<div class="st-box st-fail"><b>❌ Self-test selhal:</b> '+H(r.error)+'</div>';
  const fails=r.scoring.filter(s=>s.issues.length);
  const cryptoFail=r.crypto&&!r.crypto.pass;
  const pass=!fails.length&&!cryptoFail&&r.scoring.length>0;
  let h='<div class="st-box '+(pass?'st-pass':(r.scoring.length?'st-fail':'st-warn'))+'"><b>'+(pass?'✅ Self-test prošel':(r.scoring.length?'❌ Self-test našel problém':'⚠️ Nebylo co testovat'))+'</b> — režim: '+(r.mode==='secure'?'bezpečný offline (verifier)':'okamžitá známka (instant)')+'</div>';
  if(r.scoring.length){
    h+='<table class="st-tbl"><tr><th>Případ</th><th>Cíl</th><th>Výsledek</th><th></th></tr>';
    r.scoring.forEach(s=>{
      const ok=!s.issues.length;
      if(s.kind==='mono'){
        const cell = s.skipped ? '<span class="muted">přeskočeno (žádné obracitelné položky)</span>' : (H(String(s.earned))+' · '+H(String(s.grade)));
        h+='<tr><td>'+H(s.label)+'</td><td>0→100 %</td><td>'+cell+'</td><td class="'+(ok?'st-ok':'st-bad')+'">'+(s.skipped?'—':(ok?'OK':'CHYBA'))+'</td></tr>';
      } else {
        h+='<tr><td>'+H(s.label)+'</td><td>'+s.wantPct+' %</td><td>'+s.earned+'/'+s.total+' b · '+s.gotPct+' %'+(s.grade?' · zn. '+H(String(s.grade)):'')+'</td><td class="'+(ok?'st-ok':'st-bad')+'">'+(ok?'OK':'CHYBA')+'</td></tr>';
      }
      if(!ok) s.issues.forEach(i=>{ h+='<tr class="st-issue"><td colspan="4">↳ '+H(i)+'</td></tr>'; });
    });
    h+='</table>';
  }
  if(r.crypto){
    h+='<div class="st-box '+(r.crypto.pass?'st-pass':'st-fail')+'"><b>'+(r.crypto.pass?'✅':'❌')+' Krypto řetězec</b> (encrypt → parseTxt → decrypt → scorePayload): metadata '+(r.crypto.okMeta?'OK':'NESEDÍ')+' · round-trip odpovědí '+(r.crypto.roundtrip?'OK':'NESEDÍ')+' · skóre po dešifrování '+r.crypto.pct+' %.</div>';
  }
  if(r.gaps.length){
    h+='<div class="st-box st-warn"><b>⚠️ Položky bez rozpoznatelného klíče správné odpovědi ('+r.gaps.length+'):</b> tyto nejdou automaticky obodovat jako správné — doplň odpověď v editoru, jinak i správně odpovídající student dostane 0 b.<ul class="st-gaps">'
      + r.gaps.slice(0,40).map(g=>'<li>Varianta '+H(String(g.variant))+', cv. '+g.ex+', pol. '+g.q+' ('+H(g.type)+')</li>').join('')
      + (r.gaps.length>40?'<li>… a další '+(r.gaps.length-40)+'</li>':'')
      +'</ul></div>';
  }
  return h;
}

let lastSelfTest = null; // {ok, hasErrors, hasGaps, error, ranAt, mode} — pro povinnou kontrolu před stažením

// Vyhodnotí report do souhrnu pro gating. ok=true znamená „bodování počítá správně".
// Mezery (gaps) NEjsou chyba bodování — jsou to položky bez klíče (např. otevřená
// otázka k ruční opravě). Drží se zvlášť a vyžadují vědomé potvrzení, ne tichý průchod.
function summarizeSelfTest(report){
  const hasScoringErrors = (report.scoring||[]).some(s=>s.issues&&s.issues.length);
  const cryptoFail = report.crypto && !report.crypto.pass;
  const hardError = !!report.error;
  const ranSomething = (report.scoring||[]).length>0;
  return {
    ok: ranSomething && !hasScoringErrors && !cryptoFail && !hardError,
    hasErrors: hasScoringErrors || cryptoFail || hardError,
    hasGaps: (report.gaps||[]).length>0,
    gapCount: (report.gaps||[]).length,
    error: report.error||null,
    mode: report.mode,
    ranAt: Date.now()
  };
}

// Sbalitelný panel pro výsledky (self-test, ověření klíče). Výsledek zůstane vidět
// (otevřený), ale dá se po kontrole sbalit kliknutím na hlavičku — řeší to, že self-test
// ani ověření klíče dřív nešlo schovat a zabíraly místo nad tlačítky stažení.
function collapsibleResultHtml(title, statusClass, bodyHtml){
  return '<details class="result-panel'+(statusClass?' '+statusClass:'')+'" open>'
    + '<summary><span class="result-summary-title">'+title+'</span>'
    + '<span class="result-toggle"><span class="toggle-open">sbalit ▲</span><span class="toggle-closed">rozbalit ▼</span></span></summary>'
    + '<div class="result-body">'+bodyHtml+'</div>'
    + '</details>';
}
// Po (pře)generování / úpravě testu schová staré výsledky self-testu i ověření klíče,
// aby uživatel neviděl neaktuální „prošlo" k jinému obsahu.
function resetVerificationReports(){
  ['selfTestReport','keyCheckReport'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){ el.innerHTML=''; el.classList.add('hidden'); }
  });
}

async function runScoringSelfTest(){
  const out=document.getElementById('selfTestReport'), btn=document.getElementById('btnSelfTest');
  if(!generatedPackage && !generatedTestHtml){ uiAlert('Nejdřív vygeneruj test, pak spusť self-test.'); return null; }
  if(btn){ btn.disabled=true; if(!btn.dataset.label)btn.dataset.label=btn.textContent; btn.textContent='🧪 Testuji…'; }
  if(out){ out.classList.remove('hidden'); out.innerHTML='<div class="st-box st-warn">Spouštím hodnoticí self-test proti skutečnému vygenerovanému kódu…</div>'; }
  const report={mode:(generatedPackage?'secure':'instant'),scoring:[],gaps:[],crypto:null,error:null};
  try{
    if(generatedPackage) await stRunSecure(report);
    else await stRunInstant(report);
  }catch(e){ report.error=(e&&e.message)?e.message:String(e); }
  if(btn){ btn.disabled=false; btn.textContent=btn.dataset.label||'🧪 Self-test bodování'; }
  if(out){
    const sum=summarizeSelfTest(report);
    let stTitle, stCls;
    if(report.error){ stTitle='🧪 Self-test bodování — ❌ selhal'; stCls='is-fail'; }
    else if(sum.hasErrors){ stTitle='🧪 Self-test bodování — ❌ našel problém'; stCls='is-fail'; }
    else if(!report.scoring.length){ stTitle='🧪 Self-test bodování — ⚠️ nebylo co testovat'; stCls='is-warn'; }
    else if(sum.hasGaps){ stTitle='🧪 Self-test bodování — ✅ prošel (s mezerami)'; stCls='is-warn'; }
    else { stTitle='🧪 Self-test bodování — ✅ prošel'; stCls='is-pass'; }
    out.innerHTML=collapsibleResultHtml(stTitle, stCls, stRenderReport(report));
  }
  lastSelfTest = summarizeSelfTest(report);
  updateSecureDownloadGate();
  return lastSelfTest;
}

// ── „Dvojí klíč": AI nezávisle odpoví na úlohy, porovná se s uloženým klíčem ──────
// Slabé místo č. 1 (chybný klíč) neumí odchytit žádný deterministický self-test —
// stroj neví, jestli je označená správná odpověď OBSAHOVĚ správná. Tady necháme AI
// nezávisle vyřešit STEJNÉ otázky (negeneruje nový test) a označíme položky, kde se
// její odpověď liší od klíče. Není to důkaz chyby, je to seznam míst k ruční kontrole.
// Levné: jeden fokusovaný API call proti existujícím otázkám.
function akvCorrectText(ex,it){
  var t=ex.type;
  if(t==='multiple choice'||t==='reading comprehension'||t==='listening comprehension'||t==='dialogue completion'){
    if(Array.isArray(it.options)){var ci=correctIndexGen(it);return (it.options[ci]!=null)?String(it.options[ci]):'';}
    return String(it.answer||it.model_answer||'');
  }
  if(t==='true/false')return it.correct?'true':'false';
  if(t==='multi-select'){var mo=Array.isArray(it.options)?it.options:[];return (Array.isArray(it.correct)?it.correct:[]).map(function(ix){var n=Number(ix);return mo[n]!=null?String(mo[n]):('#'+n);}).join(' | ');}
  if(t==='ordering'){var oarr=Array.isArray(it.items)?it.items:[];return (Array.isArray(it.correct_order)?it.correct_order:[]).map(function(ix){var n=Number(ix);return oarr[n]!=null?String(oarr[n]):('#'+n);}).join(' -> ');}
  if(t==='highlight-evidence'){var hs=Array.isArray(it.sentences)?it.sentences:[];var hi=Number(it.correct);return Number.isInteger(hi)&&hs[hi]!=null?String(hs[hi]):String(hi);}
  if(t==='error-tagging'){var toks=Array.isArray(it.tokens)?it.tokens:[];var ix=Number(it.error_token_index);var tok=toks[ix]!=null?toks[ix]:('#'+ix);return 'token: '+tok+'; type: '+(it.error_type||'')+'; correction: '+(it.correction||'');}
  if(t==='table-completion'){var tr=Array.isArray(it.rows)?it.rows:[],out=[];tr.forEach(function(row,ri){if(!Array.isArray(row))return;row.forEach(function(cell,ci){if(cell&&typeof cell==='object'&&!Array.isArray(cell)&&cell.answer!=null){var col=(Array.isArray(it.columns)&&it.columns[ci]!=null)?it.columns[ci]:('col '+(ci+1));out.push((ri+1)+'. '+col+'='+cell.answer);}});});return out.join('; ');}
  if(t==='transformation-chain'){var trs=Array.isArray(it.transformations)?it.transformations:[];return trs.map(function(tr,i){return (i+1)+'. '+(tr&&tr.answer!=null?tr.answer:'');}).join('; ');}
  if(t==='categorisation-board'){var cbe=Array.isArray(it.entries)?it.entries:[];return cbe.map(function(e){return (e&&e.text!=null?e.text:'')+'='+(e&&e.category!=null?e.category:'');}).join('; ');}
  if(t==='categorization')return String(it.correct_category||it.category||it.answer||'');
  if(t==='cloze text'||t==='fill-in-the-blank')return (Array.isArray(it.answers)?it.answers:[it.answer]).filter(function(x){return x!=null;}).map(String).join(' | ');
  if(t==='error correction')return String(it.correction||it.answer||'');
  if(t==='word order')return String(it.correct_sentence||it.answer||'');
  if(t==='translation')return String(it.answer||it.translation||'');
  return String(it.answer||'');
}
function akvQuestionText(ex,it){
  var t=ex.type, base=String(it.question||it.prompt||it.sentence||it.statement||it.text||it.source||'');
  var extra='';
  if(it.passage)extra+=' | text: '+String(it.passage);
  if(it.dialogue)extra+=' | dialog: '+String(it.dialogue);
  if(t==='word order'&&Array.isArray(it.words))extra+=' | slova: '+it.words.join(' / ');
  if(t==='ordering'&&Array.isArray(it.items))extra+=' | polozky k serazeni (index) origin order): '+it.items.map(function(o,i){return i+') '+o;}).join('  ');
  if(t==='highlight-evidence'&&Array.isArray(it.sentences))extra+=' | vety k vyberu: '+it.sentences.map(function(o,i){return i+') '+o;}).join('  ');
  if(t==='error-tagging'){extra+=' | tokens: '+(Array.isArray(it.tokens)?it.tokens.map(function(o,i){return i+') '+o;}).join('  '):'');extra+=' | error type options: '+(Array.isArray(it.error_type_options)?it.error_type_options.join(' / '):'');}
  if(t==='table-completion'){if(Array.isArray(it.columns))extra+=' | sloupce: '+it.columns.join(', ');if(Array.isArray(it.rows))extra+=' | radky: '+it.rows.map(function(row){return Array.isArray(row)?row.map(function(cell){return (cell&&typeof cell==='object'&&!Array.isArray(cell))?'___':String(cell);}).join(' | '):'';}).join(' / ');}
  if(t==='transformation-chain'){extra+=' | base sentence: '+String(it.base_sentence||'');if(Array.isArray(it.transformations))extra+=' | transformations: '+it.transformations.map(function(tr,i){return (i+1)+') '+(tr&&tr.instruction!=null?tr.instruction:'');}).join('  ');}
  if(t==='categorisation-board'){if(Array.isArray(it.categories))extra+=' | kategorie: '+it.categories.join(', ');if(Array.isArray(it.entries))extra+=' | polozky: '+it.entries.map(function(e){return e&&e.text!=null?e.text:'';}).join(', ');}
  if(t==='word formation'&&(it.base_word||it.keyword))extra+=' | základ: '+String(it.base_word||it.keyword);
  if(Array.isArray(it.options)&&it.options.length)extra+=' | možnosti: '+it.options.map(function(o,i){return String.fromCharCode(65+i)+') '+o;}).join('  ');
  if(t==='categorization'&&Array.isArray(it.categories))extra+=' | kategorie: '+it.categories.join(', ');
  if(it.transcript)extra+=' | transkript: '+String(it.transcript);
  return (base+extra).slice(0,600);
}
// uzávěra: bezpečně získá správný index i v generátoru (correctIndex žije v emitovaném kódu)
function correctIndexGen(it){
  if(!it||!Array.isArray(it.options))return -1;
  if(typeof it.correct==='number')return it.correct;
  var c=String(it.correct==null?'':it.correct).trim();
  if(/^\d+$/.test(c))return Number(c);
  var letter=c.toUpperCase().charCodeAt(0)-65;
  if(letter>=0&&it.options[letter]!=null)return letter;
  var nrm=function(s){return String(s==null?'':s).toLowerCase().normalize('NFC').replace(/[.!?,;:"'()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();};
  return it.options.map(String).findIndex(function(x){return nrm(x)===nrm(c);});
}
function akvNorm(s){return String(s==null?'':s).toLowerCase().normalize('NFC').replace(/[.!?,;:"'()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();}
// porovná AI odpověď s klíčem; vrací 'match' | 'diff' | 'weak' (otevřený typ, slabý signál)
function akvCompare(ex,it,aiAnswer){
  var t=ex.type, key=akvCorrectText(ex,it), a=String(aiAnswer==null?'':aiAnswer);
  if(t==='multiple choice'||t==='reading comprehension'||t==='listening comprehension'||(t==='dialogue completion'&&Array.isArray(it.options))){
    // AI může vrátit písmeno, index nebo text možnosti — normalizuj na index
    var ci=correctIndexGen(it), opts=(it.options||[]).map(String);
    var ai=a.trim(), aiIdx=-1;
    if(/^\d+$/.test(ai))aiIdx=Number(ai);
    else if(ai.length===1&&/[a-z]/i.test(ai))aiIdx=ai.toUpperCase().charCodeAt(0)-65;
    else aiIdx=opts.findIndex(function(o){return akvNorm(o)===akvNorm(ai);});
    if(aiIdx<0)return 'weak';
    return aiIdx===ci?'match':'diff';
  }
  if(t==='true/false'){
    var av=/^(true|pravda|ano|t|yes|1)$/i.test(a.trim())?'true':(/^(false|nepravda|ne|f|no|0)$/i.test(a.trim())?'false':'');
    if(!av)return 'weak'; return av===key?'match':'diff';
  }
  if(t==='categorization'){ if(!a.trim())return 'weak'; return akvNorm(a)===akvNorm(key)?'match':'diff'; }
  if(t==='cloze text'||t==='fill-in-the-blank'){
    var keys=(Array.isArray(it.answers)?it.answers:[it.answer]).filter(function(x){return x!=null;}).map(akvNorm);
    var parts=a.split(/[|;,/]/).map(akvNorm).filter(Boolean);
    if(!parts.length)return 'weak';
    // shoda, pokud se každý klíč objeví mezi AI odpověďmi (pořadí tolerujeme)
    var allHit=keys.length&&keys.every(function(k){return parts.indexOf(k)>=0;});
    return allHit?'match':'diff';
  }
  // otevřené typy (překlad, transformace, slovotvorba, oprava chyb, slovosled):
  // přesná normalizovaná shoda = match; jinak slabý signál (ne tvrdá neshoda — víc cest)
  if(!a.trim())return 'weak';
  return akvNorm(a)===akvNorm(key)?'match':'weak';
}
function akvBuildPrompt(items){
  var lines=items.map(function(q){
    return q.i+'. ['+q.type+'] '+q.q;
  }).join('\n');
  return 'Jsi zkušený jazykový examinátor. Níže je '+items.length+' testových úloh. '+
    'Pro KAŽDOU úlohu nezávisle urči SPRÁVNOU odpověď podle svého nejlepšího úsudku. '+
    'Neřeš body ani formátování testu, jen věcně správnou odpověď.\n'+
    'Pravidla pro tvar odpovědi podle typu:\n'+
    '- multiple choice / reading / listening / dialogue s možnostmi: vrať PÍSMENO možnosti (A, B, C…).\n'+
    '- true/false: vrať "true" nebo "false".\n'+
    '- categorization: vrať název kategorie.\n'+
    '- fill-in-the-blank / cloze: vrať jen doplněná slova; víc mezer odděl " | ".\n'+
    '- word formation / translation / sentence transformation / error correction / word order: vrať jen výslednou odpověď (slovo/větu).\n\n'+
    'Úlohy:\n'+lines+'\n\n'+
    'Odpověz POUZE validním JSON bez Markdownu v přesném tvaru: '+
    '{"answers":[{"i":<číslo úlohy>,"a":"<tvoje odpověď>"}]}';
}
let akvBusy=false;
let akvWeakRows=[];      // poslední „slabé" návrhy (otevřené úlohy) — kandidáti na uznávané alternativy
let akvVariantKey='__default'; // varianta, ze které ověření klíče vycházelo
// Stav AI ověření klíče pro grading gate. closedDiffs = počet UZAVŘENÝCH úloh, kde se AI
// liší od klíče (silný signál možné chyby v klíči). Jen tyhle zamykají stažení; otevřené
// (weak) signály zůstávají informativní, protože tam bývá víc legitimních správných znění.
// keyDiffsAcknowledged = učitel vědomě potvrdil „klíč ponechávám" i s těmito rozdíly.
let lastKeyCheck = null; // {closedDiffs, openWeaks, checked, ranAt} nebo null (nespuštěno / neaktuální)
let keyDiffsAcknowledged = false;
function resetKeyCheckState(){ lastKeyCheck=null; keyDiffsAcknowledged=false; }
async function aiVerifyKey(){
  var out=document.getElementById('keyCheckReport'), btn=document.getElementById('btnKeyCheck');
  var asm=lastAssembled;
  if(!asm||!asm.variants){ uiAlert('Nejdřív vygeneruj test, pak ověř klíč.'); return; }
  if(!geminiApiKey){ uiAlert('Pro ověření klíče přidej Gemini API klíč ve žluté sekci.'); return; }
  if(akvBusy)return;
  // vezmi první variantu (u diferencovaného testu základní); klíč je per-položka stejný princip
  var keys=Object.keys(asm.variants).length?Object.keys(asm.variants):['__default'];
  var firstKey=keys.indexOf('__default')>=0?'__default':keys[0];
  var exs=asm.variants[firstKey]||[];
  // sestav položky k ověření (matching vynech — párování AI „odpovědí" je jiný formát)
  var items=[], map=[];
  exs.forEach(function(ex,ei){
    if(ex.type==='matching')return;
    (ex.items||[]).forEach(function(it,qi){
      var qt=akvQuestionText(ex,it); if(!qt.trim())return;
      var idx=items.length+1;
      items.push({i:idx,type:ex.type,q:qt});
      map.push({i:idx,ex:ei,qi:qi,exObj:ex,itObj:it});
    });
  });
  if(!items.length){ if(out){out.classList.remove('hidden');out.innerHTML='<div class="st-box st-warn">Žádné úlohy vhodné k ověření klíče (např. jen matching).</div>';} return; }
  akvBusy=true;
  if(btn){ btn.disabled=true; if(!btn.dataset.label)btn.dataset.label=btn.textContent; btn.textContent='🔑 Ověřuji klíč…'; }
  if(out){ out.classList.remove('hidden'); out.innerHTML='<div class="st-box st-warn">AI nezávisle řeší '+items.length+' úloh a porovnává s klíčem…</div>'; }
  try{
    var data=await callGeminiJSON(akvBuildPrompt(items),[],{});
    var arr=(data&&Array.isArray(data.answers))?data.answers:[];
    var byI={}; arr.forEach(function(r){ if(r&&r.i!=null)byI[Number(r.i)]=(r.a!=null?r.a:r.answer); });
    var diffs=[], weaks=[], checked=0, missing=0;
    map.forEach(function(m){
      var ai=byI[m.i];
      if(ai==null){ missing++; return; }
      checked++;
      var verdict=akvCompare(m.exObj,m.itObj,ai);
      var row={ex:m.ex+1,q:m.qi+1,ex0:m.ex,qi0:m.qi,type:m.exObj.type,key:akvCorrectText(m.exObj,m.itObj),ai:String(ai),question:akvQuestionText(m.exObj,m.itObj).slice(0,220)};
      if(verdict==='diff')diffs.push(row);
      else if(verdict==='weak'&&akvNorm(String(ai))!==akvNorm(row.key))weaks.push(row);
    });
    akvVariantKey=firstKey; akvWeakRows=weaks.concat(diffs.map(function(r){return Object.assign({},r,{isDiff:true});})); // weak + diff pro přidání alternativ
    // Zápis stavu pro grading gate: uzavřené rozdíly (diffs) zamykají stažení, dokud je
    // učitel nevyřeší nebo vědomě nepotvrdí. Nový běh ověření = nové rozhodnutí, takže
    // dřívější potvrzení „klíč ponechávám" se ruší.
    lastKeyCheck={ closedDiffs:diffs.length, openWeaks:weaks.length, checked:checked, ranAt:Date.now() };
    keyDiffsAcknowledged=false;
    var akvTitle, akvCls;
    if(diffs.length){ akvTitle='🔑 Ověření klíče (AI) — 🔎 '+diffs.length+' k revizi'; akvCls='is-warn'; }
    else if(weaks.length){ akvTitle='🔑 Ověření klíče (AI) — ⚠️ '+weaks.length+' k posouzení'; akvCls='is-warn'; }
    else { akvTitle='🔑 Ověření klíče (AI) — ✅ AI se shoduje s klíčem'; akvCls='is-pass'; }
    out.innerHTML=collapsibleResultHtml(akvTitle, akvCls, akvRender(firstKey,checked,missing,diffs,weaks));
    updateSecureDownloadGate(); // uzavřené rozdíly můžou zamknout stažení
  }catch(e){
    if(out)out.innerHTML='<div class="st-box st-fail"><b>❌ Ověření klíče selhalo:</b> '+H((e&&e.message)?e.message:String(e))+'</div>';
  }finally{
    akvBusy=false;
    if(btn){ btn.disabled=false; btn.textContent=btn.dataset.label||'🔑 Ověřit klíč druhým průchodem (AI)'; }
  }
}
function akvRender(variant,checked,missing,diffs,weaks){
  var h='';
  // Stručné shrnutí (samotná shoda/neshoda je v hlavičce sbaleného panelu).
  h+='<div class="akv-note">Ověřeno '+checked+' úloh'+(variant!=='__default'?' (varianta '+H(String(variant))+')':'')+(missing?', '+missing+' bez odpovědi AI':'')+'. '
    +'Shoda neznamená jistotu a neshoda neznamená chybu — je to jen seznam míst ke kontrole. Klíč zůstává tvůj.</div>';
  // Legenda: jasně říká, co je „správná odpověď v testu" a co „odpověď AI".
  h+='<div class="akv-legend">'
    +'<span class="akv-leg-item"><span class="akv-dot key"></span><b>Klíč v testu</b> = odpověď označená v testu jako správná</span>'
    +'<span class="akv-leg-item"><span class="akv-dot ai"></span><b>Odpověď AI</b> = co nezávisle vyřešila AI</span>'
    +'</div>';
  if(diffs.length){
    h+='<div class="akv-section-head diff">🔎 Uzavřené úlohy: AI se liší od klíče ('+diffs.length+') — sem se dívej nejdřív</div>';
    h+=diffs.slice(0,40).map(function(d,wi){return akvCard(d,'diff',wi+1000);}).join(''); // wi+1000 odliší diff indexy od weak
    if(diffs.length>40) h+='<div class="akv-more">… a dalších '+(diffs.length-40)+' položek (zkrať test nebo zkontroluj v editoru)</div>';
  }
  if(weaks.length){
    h+='<div class="akv-section-head weak">⚠️ Otevřené úlohy: AI formulovala jinak ('+weaks.length+') — může jít o jinou správnou variantu</div>';
    h+='<div class="akv-weak-hint">U překladů a transformací bývá víc správných znění. Zaškrtni návrhy, které chceš do ostrého testu uznávat jako správné, a dole klikni na „Přidat". Test se přesestaví; tvůj původní klíč zůstává hlavní odpovědí.</div>';
    h+=weaks.slice(0,40).map(function(d,wi){return akvCard(d,'weak',wi);}).join('');
    if(weaks.length>40) h+='<div class="akv-more">… a dalších '+(weaks.length-40)+' položek</div>';
    h+='<div class="akv-apply-row"><button type="button" class="akv-apply-btn" onclick="akvApplySelected()">✚ Přidat zaškrtnuté jako uznávané odpovědi a přesestavit</button><span class="akv-apply-status" id="akvApplyStatus"></span></div>';
  }
  if(!diffs.length&&!weaks.length){
    h+='<div class="akv-clean">✅ AI se u všech ověřených úloh shoduje s klíčem. Shoda chybu nevylučuje úplně (AI i klíč se můžou mýlit stejně), ale výrazně snižuje pravděpodobnost chyby v klíči.</div>';
  }
  return h;
}
// Jedna karta: nahoře umístění + typ + štítek, pak otázka, pak klíč vs. AI pod sebou.
// U otevřených úloh (weak) přidá zaškrtávátko „přidat AI odpověď jako uznávanou".
function akvCard(d,kind,wi){
  // Checkbox pro WEAK (otevřené typy) i pro DIFF (uzavřené — AI mohla mít pravdu).
  var pick = (typeof wi==='number' && (kind==='weak' || kind==='diff'))
    ? '<label class="akv-pick-row' + (kind==='diff' ? ' akv-pick-diff' : '') + '">'
      + '<input type="checkbox" class="akv-pick" data-wi="'+wi+'">'
      + '<span>✚ ' + (kind==='diff' ? 'přijmout AI odpověď <b>„'+H(d.ai||'')+'"</b> jako alternativu (klíč zůstává)' : 'uznávat odpověď AI <b>„'+H(d.ai||'')+'"</b> jako správnou') + '</span>'
      + '</label>'
    : '';
  return '<div class="akv-item '+kind+'">'
    + '<div class="akv-item-head"><span>cv. '+d.ex+' · pol. '+d.q+'</span>'
    +   '<span class="akv-type-badge">'+H(d.type)+'</span>'
    +   '<span class="akv-flag '+kind+'">'+(kind==='diff'?'k revizi':'slabý signál')+'</span></div>'
    + (d.question?'<div class="akv-q-full">'+H(d.question)+'</div>':'')
    + '<div class="akv-cmp">'
    +   '<div class="akv-cmp-row key"><span class="akv-cmp-label">🔑 Klíč v testu</span><span class="akv-cmp-val">'+H(d.key||'—')+'</span></div>'
    +   '<div class="akv-cmp-row ai"><span class="akv-cmp-label">🤖 Odpověď AI</span><span class="akv-cmp-val">'+H(d.ai||'—')+'</span></div>'
    + '</div>'
    + pick
    + '</div>';
}
// #3 — přidá zaškrtnuté návrhy AI jako uznávané alternativy do zdrojových dat testu
// a test přesestaví. Klíč (hlavní správná odpověď) se nemění; jen se rozšiřuje seznam
// odpovědí, které test/verifier uzná. Ověření klíče zůstává zobrazené; po přesestavení
// je potřeba znovu spustit self-test (mění se hodnoticí data).
function akvTargetExercises(){
  if(!lastGenData) return null;
  if(akvVariantKey==='__default' || !akvVariantKey) return Array.isArray(lastGenData.exercises)?lastGenData.exercises:null;
  var gv=lastGenData.group_variants&&lastGenData.group_variants[akvVariantKey];
  return (gv&&Array.isArray(gv.exercises))?gv.exercises:(Array.isArray(lastGenData.exercises)?lastGenData.exercises:null);
}
function akvItemIsMulti(it){
  if(!it) return false;
  if(Array.isArray(it.answers) && it.answers.length>1) return true;
  var s=String(it.sentence||it.prompt||it.text||'');
  return (s.match(/_{2,}/g)||[]).length>1;
}
function akvAddAltToItem(it, aiAns, exType){
  if(!it) return false;
  var added=false;
  if(akvItemIsMulti(it)){
    // víc mezer: AI vrací části oddělené " | " → přidej po mezerách do alt_answers[bi]
    var parts=String(aiAns).split(/\s*\|\s*/);
    var nb=(Array.isArray(it.answers)?it.answers.length:parts.length);
    if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
    for(var bi=0;bi<nb;bi++){
      if(!Array.isArray(it.alt_answers[bi])) it.alt_answers[bi]=Array.isArray(it.alt_answers[bi])?it.alt_answers[bi]:[];
      var cand=String(parts[bi]==null?'':parts[bi]).trim();
      var keyAns=String((Array.isArray(it.answers)?it.answers[bi]:'')||'').trim();
      if(cand && akvNorm(cand)!==akvNorm(keyAns) && !it.alt_answers[bi].some(function(x){return akvNorm(String(x))===akvNorm(cand);})){
        it.alt_answers[bi].push(cand); added=true;
      }
    }
  }else{
    if(!Array.isArray(it.alt_answers)) it.alt_answers=[];
    var c=String(aiAns).trim();
    var key=akvCorrectText({type:exType||it.type},it)||'';
    if(c && akvNorm(c)!==akvNorm(String(key)) && !it.alt_answers.some(function(x){return akvNorm(String(x))===akvNorm(c);})){
      it.alt_answers.push(c); added=true;
    }
  }
  return added;
}
async function akvApplySelected(){
  var status=document.getElementById('akvApplyStatus');
  var picks=[].slice.call(document.querySelectorAll('.akv-pick:checked'));
  if(!picks.length){ if(status){status.textContent='Nejdřív zaškrtni aspoň jeden návrh.'; status.className='akv-apply-status warn';} return; }
  if(!lastGenData){ if(status){status.textContent='Chybí data testu — vygeneruj test znovu.'; status.className='akv-apply-status warn';} return; }
  var exsArr=akvTargetExercises();
  if(!exsArr){ if(status){status.textContent='Nepodařilo se najít cvičení v datech testu.'; status.className='akv-apply-status warn';} return; }
  var applied=0, skipped=0;
  picks.forEach(function(cb){
    var wi=Number(cb.getAttribute('data-wi'));
    var row=akvWeakRows[wi];
    if(!row){ skipped++; return; }
    var ex=exsArr[row.ex0];
    var it=ex&&Array.isArray(ex.items)?ex.items[row.qi0]:null;
    if(!it){ skipped++; return; }
    if(akvAddAltToItem(it, row.ai, (ex&&ex.type)||row.type)) applied++; else skipped++;
    cb.checked=false; cb.disabled=true;
    var lab=cb.closest('.akv-pick-row'); if(lab){ lab.classList.add('done'); }
  });
  if(!applied){ if(status){status.textContent='Vybrané odpovědi už byly mezi uznávanými (nic nepřidáno).'; status.className='akv-apply-status warn';} return; }
  if(status){ status.textContent='Přidávám '+applied+' a přesestavuji test…'; status.className='akv-apply-status'; }
  try{
    var built=await assembleTestHtml(state, lastGenData);
    if(built && typeof built==='object' && built.mode==='secureOffline'){ validateSecurePackageSmoke(built); generatedPackage=built; generatedTestHtml=''; }
    else { var html=String(built||''); validateGeneratedHtmlSmoke(html); generatedTestHtml=html; generatedPackage=null; }
    // obsah se změnil → vynuť nový self-test před stažením (ověření klíče necháme zobrazené).
    // Přidání alternativ se týká jen OTEVŘENÝCH úloh, ne klíče uzavřených — případný
    // uzavřený rozdíl tedy pořád platí; jen znovu vyžádáme vědomé potvrzení.
    lastSelfTest=null; secureGapsAcknowledged=false; keyDiffsAcknowledged=false;
    if(typeof renderQualityDiagnostics==='function') renderQualityDiagnostics();
    updateSecureDownloadGate();
    if(status){ status.textContent='✓ Přidáno '+applied+' uznávaných odpovědí'+(skipped?(' ('+skipped+' přeskočeno)'):'')+'. Test přesestaven — před stažením znovu spusť 🧪 self-test. Zkontroluj přidané odpovědi v editoru.'; status.className='akv-apply-status ok'; }
  }catch(e){
    if(status){ status.textContent='⚠️ Přesestavení selhalo: '+((e&&e.message)?e.message:String(e)); status.className='akv-apply-status warn'; }
  }
}


// Mezery (položky bez klíče) stažení neblokují natvrdo, ale vyžadují vědomé potvrzení —
// můžou být legitimní (otevřená otázka k ruční opravě), takže je neřešíme jako bug.
let secureGapsAcknowledged = false;
function isSecurePackage(){ return !!(generatedPackage && generatedPackage.mode === 'secureOffline'); }
function secureDownloadAllowed(){
  if(!isSecurePackage()) return true;            // gate platí jen pro secure balíček
  if(!lastSelfTest) return false;                // self-test ještě neproběhl
  if(!lastSelfTest.ok) return false;             // self-test našel chybu bodování / krypto / hard error
  if(lastSelfTest.hasGaps && !secureGapsAcknowledged) return false; // mezery nutno potvrdit
  if(!teacherReviewSatisfied()) return false;    // obsahový teacher review (technika neumí poznat chybný klíč)
  // AI ověření klíče je VOLITELNÉ (vyžaduje Gemini klíč). ALE když proběhlo a u UZAVŘENÝCH
  // úloh našlo rozdíl mezi AI a klíčem (silný signál možné chyby v klíči), stažení se zavře,
  // dokud učitel rozdíly nevyřeší (přegeneruje/upraví → stav se zahodí) nebo vědomě nepotvrdí.
  // Otevřené (weak) signály schválně neblokují — bývá tam víc legitimních správných znění.
  if(lastKeyCheck && lastKeyCheck.closedDiffs>0 && !keyDiffsAcknowledged) return false;
  return true;
}
function updateSecureDownloadGate(){
  const banner=$('secureGateBanner');
  const btnMain=$('btnDownloadMain'), btnStu=$('btnDownloadStudent'), btnTea=$('btnDownloadTeacher');
  if(!isSecurePackage()){
    if(banner){ banner.classList.add('hidden'); banner.innerHTML=''; }
    [btnMain,btnStu,btnTea].forEach(b=>{ if(b){ b.disabled=false; b.classList.remove('gate-locked'); } });
    return;
  }
  const allowed=secureDownloadAllowed();
  [btnMain,btnStu,btnTea].forEach(b=>{ if(b){ b.disabled=!allowed; b.classList.toggle('gate-locked',!allowed); } });
  if(!banner) return;
  banner.classList.remove('hidden');
  if(!lastSelfTest){
    banner.className='st-box st-warn';
    banner.innerHTML='🔒 <strong>Před stažením klasifikovaného testu spusť self-test bodování.</strong> Ověří, že se body počítají správně — špatná známka je horší než nespustitelný test. <button type="button" class="gate-run-btn" onclick="runScoringSelfTest()" title="Spustí vygenerovaný test proti reálnému kódu hodnocení a ověří, že 100 % správných odpovědí dá 100 % bodů a 0 % správných dá 0. Bez úspěšného běhu se stažení neodemkne.">🧪 Spustit self-test</button>';
  } else if(lastSelfTest.hasErrors){
    banner.className='st-box st-fail';
    banner.innerHTML='⛔ <strong>Self-test našel chybu v bodování — stažení je zablokované.</strong> Oprav klíče/odpovědi v editoru a spusť self-test znovu.'+(lastSelfTest.error?'<br>Detail: '+esc(lastSelfTest.error):'');
  } else if(lastSelfTest.hasGaps && !secureGapsAcknowledged){
    banner.className='st-box st-warn';
    banner.innerHTML='⚠️ <strong>Self-test prošel, ale '+lastSelfTest.gapCount+' položek nemá rozpoznatelný klíč správné odpovědi.</strong> Buď je doplň v editoru, nebo potvrď, že je budeš opravovat ručně. <button type="button" class="gate-run-btn" onclick="acknowledgeSecureGaps()" title="Mezery NEjsou chyba bodování — můžou být legitimní (otevřená otázka k ruční opravě). Potvrzením říkáš „vím o nich a opravím ručně". Tím se odemkne stažení.">Beru na vědomí, opravím ručně</button>';
  } else if(!teacherReviewSatisfied()){
    const items=exportChecklistItems().filter(it=>it[2]);
    const reqDone=items.filter(it=>exportChecklist[it[0]]).length;
    banner.className='st-box st-warn';
    banner.innerHTML='👁️ <strong>Self-test prošel — teď ještě obsahový teacher review.</strong> Stroj ověřil, že bodování počítá podle klíče správně, ale jestli ten klíč obsahově sedí, musí potvrdit učitel (AI může vyrobit krásný test s chybnou správnou odpovědí). Zaškrtni povinné položky v checklistu níž ('+reqDone+'/'+items.length+').';
  } else if(lastKeyCheck && lastKeyCheck.closedDiffs>0 && !keyDiffsAcknowledged){
    banner.className='st-box st-fail';
    banner.innerHTML='🔑 <strong>AI ověření klíče našlo '+lastKeyCheck.closedDiffs+' rozdíl'+(lastKeyCheck.closedDiffs>=5?'ů':(lastKeyCheck.closedDiffs>=2?'y':''))+' v uzavřených úlohách — stažení je zatím zavřené.</strong> U úloh s jednou správnou odpovědí (výběr, true/false…) AI odpověděla jinak než tvůj klíč. Většinou to znamená chybu v klíči. Projdi je v ověření klíče výš a oprav v editoru (po úpravě spusť self-test znovu) — nebo, pokud je tvůj klíč správný, vědomě potvrď. <button type="button" class="gate-run-btn" onclick="acknowledgeKeyDiffs()" title="Potvrzením říkáš „rozdíly jsem prošel/prošla a klíč ponechávám záměrně". Tím se odemkne stažení. Otevřené (překlady/transformace) úlohy stažení neblokují.">Klíč jsem prošel/prošla, ponechávám</button>';
  } else {
    banner.className='st-box st-pass';
    let kc;
    if(!lastKeyCheck) kc=' <span class="gate-subnote">AI ověření klíče: nespuštěno (volitelné — u prvního ostrého nasazení doporučeno).</span>';
    else if(lastKeyCheck.closedDiffs>0) kc=' <span class="gate-subnote">AI verifier: '+lastKeyCheck.closedDiffs+' rozdíl(y) v uzavřených úlohách potvrzen(y), klíč ponechán.</span>';
    else kc=' <span class="gate-subnote">AI verifier: u uzavřených úloh se shoduje s klíčem.</span>';
    banner.innerHTML='✅ <strong>Self-test prošel a teacher review hotov — stažení odemčeno.</strong>'+(lastSelfTest.hasGaps?' (mezery potvrzeny k ruční opravě).':'')+kc;
  }
}
function acknowledgeKeyDiffs(){ keyDiffsAcknowledged=true; updateSecureDownloadGate(); }
function acknowledgeSecureGaps(){ secureGapsAcknowledged=true; updateSecureDownloadGate(); }
// Vrátí false a zobrazí důvod, když gate brání stažení. Volá se na začátku secure stažení.
function enforceSecureGate(){
  if(secureDownloadAllowed()) return true;
  updateSecureDownloadGate();
  const banner=$('secureGateBanner'); if(banner) banner.scrollIntoView({behavior:'smooth',block:'center'});
  if(!lastSelfTest) uiAlert('Před stažením klasifikovaného testu spusť self-test bodování (tlačítko 🧪). Ověří, že se body počítají správně.','Self-test je povinný');
  else if(lastSelfTest.hasErrors) uiAlert('Self-test našel chybu v bodování. Stažení je zablokované, dokud ji neopravíš a self-test znovu neproběhne bez chyb.','Bodování má chybu');
  else if(lastSelfTest.hasGaps && !secureGapsAcknowledged) uiAlert('Self-test našel položky bez klíče správné odpovědi. Doplň je v editoru, nebo potvrď, že je budeš opravovat ručně.','Potvrď mezery');
  else if(!teacherReviewSatisfied()) uiAlert('Stroj ověřil bodování, ale obsahová správnost je na tobě. AI může vyrobit krásný test s chybnou správnou odpovědí. Zaškrtni povinné položky v checklistu (správné odpovědi, bodování, stupnice, nesdílení verifieru).','Teacher review je povinný');
  else if(lastKeyCheck && lastKeyCheck.closedDiffs>0 && !keyDiffsAcknowledged) uiAlert('AI ověření klíče našlo '+lastKeyCheck.closedDiffs+' rozdíl(y) v uzavřených úlohách — tam, kde je jen jedna správná odpověď, odpověděla AI jinak než tvůj klíč. Projdi je a oprav v editoru, nebo (pokud je tvůj klíč správný) potvrď „klíč ponechávám".','Zkontroluj rozdíly v klíči');
  return false;
}

// ═══ SecretScanner ═══════════════════════════════════════════════════════════
// Automatická brzda PŘED stažením/exportem. Kontroluje SKUTEČNÝ finální obsah souboru
// (ne zdrojová data v generátoru), aby se omylem nevyexportoval učitelský verifier,
// answer key nebo privátní klíč ve studentském/veřejném souboru.
// Cíle exportu (target): 'student' | 'teacher' | 'public' | 'archive' | 'feedback'.
// Pravidla jsou záměrně přesná (s uvozovkami a jako kombinace), aby legitimní studentský
// soubor (obsahuje slovo "answer" u studentských odpovědí, public key s key_ops:["encrypt"],
// AES ['encrypt','decrypt'], manifest hash) NEbyl blokován falešně.
const SecretScanner = (function(){
  const STUDENT_BLOCK_NEEDLES = [
    'privateKey', '"privateKey"', 'const PRIVATE_KEY', 'key_ops":["decrypt"]',
    'VARIANTS_FULL', 'teacherPreview',
    'Učitelský verifier', 'Pouze pro učitele', 'Náhled testu pro učitele',
    'Tisk — s klíčem', 'Tisk - s klíčem', 'openPrint(true)',
    'downloadArchiveHtml', 'downloadArchiveJson', 'downloadIndexCsv'
  ];
  const STUDENT_ANSWERKEY_COMBOS = [
    ['"correct"','"explanation"','"points_total"'],
    ['"correction"','"explanation"','"alt_answers"'],
    ['"model_answer"','"points_total"'],
    ['"answer"','"alt_answers"','"explanation"'],
    ['VARIANTS_FULL','"correct"'],
    ['VARIANTS_FULL','"answer"']
  ];
  const PUBLIC_BLOCK_NEEDLES = [
    // POZN.: holý řetězec 'teacher_verifier' tu ZÁMĚRNĚ NENÍ. Studentský soubor ho
    // legitimně obsahuje jako nápovědu „odpovědi jsou v teacher_verifier.html“, takže
    // by to falešně blokovalo publikování studentského testu. Skutečný učitelský soubor
    // poznáme podle nadpisu „Učitelský verifier“, varování „Pouze pro učitele“,
    // payloadu (privateKey/VARIANTS_FULL/…) a podle názvu souboru (PUBLIC_FILENAME_NEEDLES).
    'Učitelský verifier','Pouze pro učitele',
    'privateKey','const PRIVATE_KEY','VARIANTS_FULL','key_ops":["decrypt"]',
    'DO_NOT_SEND','contains_answers'
  ];
  const PUBLIC_FILENAME_NEEDLES = ['teacher','verifier','ucitel','učitel','DO_NOT_SEND','answers_key','answer_key','contains_answers'];
  const MASTERKEY_NEEDLES = ['masterKey','MASTER_KEY','master_key','rootKey','ROOT_KEY','globalSecret','GLOBAL_SECRET','generatorSecret','GENERATOR_SECRET','teacherPassword','teacherPass'];
  const SECRET_REGEXES = [
    {rule:'pem-private-key', re:/-----BEGIN [A-Z ]*PRIVATE KEY-----/, msg:'PEM privátní klíč'},
    {rule:'github-token', re:/gh[pousr]_[A-Za-z0-9_]{30,}/, msg:'GitHub token'},
    {rule:'github-pat', re:/github_pat_[A-Za-z0-9_]{20,}/, msg:'GitHub personal access token'},
    {rule:'openai-key', re:/sk-[A-Za-z0-9_-]{20,}/, msg:'API klíč (sk-…)'},
    {rule:'inline-credential', re:/(apiKey|api_key|token|secret|password)\s*[:=]\s*["'](?=[^"']*\d)[^"'\s]{12,}["']/i, msg:'inline přihlašovací údaj'}
  ];

  function finding(severity, rule, message, needle){ return {severity, rule, message, needle}; }
  function has(content, needle){ return content.indexOf(needle) >= 0; }

  function scanExportedFile(opts){
    opts = opts || {};
    const content = String(opts.content || '');
    const fileName = String(opts.fileName || '');
    const target = opts.target || 'student';
    const out = [];

    SECRET_REGEXES.forEach(r=>{
      if (r.re.test(content)) {
        if (target === 'teacher' && r.rule === 'pem-private-key') return;
        out.push(finding('BLOCK', r.rule, 'Vypadá to jako '+r.msg+' v exportovaném souboru.', r.msg));
      }
    });

    MASTERKEY_NEEDLES.forEach(n=>{ if (has(content, n)) out.push(finding('BLOCK','master-key','Export obsahuje název master/root klíče („'+n+'“). Master klíč se nesmí dostat do žádného souboru.', n)); });

    if (target === 'student') {
      STUDENT_BLOCK_NEEDLES.forEach(n=>{ if (has(content, n)) out.push(finding('BLOCK','student-teacher-data','Studentský soubor obsahuje učitelská/citlivá data („'+n+'“).', n)); });
      STUDENT_ANSWERKEY_COMBOS.forEach(combo=>{ if (combo.every(p=>has(content,p))) out.push(finding('BLOCK','student-answer-key','Studentský soubor obsahuje strukturu připomínající klíč správných odpovědí ('+combo.join(' + ')+').', combo.join(' + '))); });
    }

    if (target === 'student-instant') {
      // Instant test má klíč odpovědí ZÁMĚRNĚ (zobrazený po PIN). Neblokujeme answer key,
      // ale private key / teacher verifier / archivní nástroje sem nepatří.
      ['privateKey','"privateKey"','const PRIVATE_KEY','key_ops":["decrypt"]','VARIANTS_FULL','Učitelský verifier','downloadArchiveHtml','downloadArchiveJson'].forEach(n=>{ if (has(content,n)) out.push(finding('BLOCK','instant-teacher-data','Test obsahuje data, která tam nepatří („'+n+'“).', n)); });
    }

    if (target === 'public' || target === 'github-pages') {
      PUBLIC_BLOCK_NEEDLES.forEach(n=>{ if (has(content, n)) out.push(finding('BLOCK','public-teacher-data','Veřejný export obsahuje učitelská/citlivá data („'+n+'“).', n)); });
      const fnLow = fileName.toLowerCase();
      PUBLIC_FILENAME_NEEDLES.forEach(n=>{ if (fnLow.indexOf(String(n).toLowerCase()) >= 0) out.push(finding('BLOCK','public-filename','Název souboru určeného k zveřejnění napovídá učitelský obsah („'+n+'“).', n)); });
    }

    if (target === 'archive') {
      ['privateKey','const PRIVATE_KEY','key_ops":["decrypt"]'].forEach(n=>{ if (has(content,n)) out.push(finding('BLOCK','archive-private','Archiv obsahuje privátní klíč („'+n+'“). Do archivu nepatří.', n)); });
    }

    if (target === 'feedback') {
      STUDENT_ANSWERKEY_COMBOS.forEach(combo=>{ if (combo.every(p=>has(content,p))) out.push(finding('WARN','feedback-answer-key','Feedback možná obsahuje kompletní klíč odpovědí ('+combo.join(' + ')+'). Zkontroluj úroveň feedbacku.', combo.join(' + '))); });
    }

    const longB64 = content.match(/[A-Za-z0-9_-]{120,}/g);
    if (longB64 && longB64.length) out.push(finding('INFO','high-entropy','Soubor obsahuje dlouhé náhodně vypadající řetězce ('+longB64.length+'×) — typicky public key, manifest hash nebo šifrovaný payload. Pokud jde o secret, zkontroluj ručně.', longB64.length+' dlouhých řetězců'));

    return out;
  }

  function hasBlockers(findings){ return (findings||[]).some(f=>f.severity==='BLOCK'); }

  function scanFiles(files, target){
    const all = [];
    (files||[]).forEach(f=>{ scanExportedFile({fileName:f.fileName, content:f.content, target:target}).forEach(x=>{ x.file=f.fileName; all.push(x); }); });
    return all;
  }

  function formatFindingsForUser(findings, ctx){
    ctx = ctx || {};
    const blockers = (findings||[]).filter(f=>f.severity==='BLOCK');
    const lines = [];
    lines.push('Export zablokován.');
    lines.push('');
    lines.push('Soubor '+(ctx.fileName?('„'+ctx.fileName+'“ '):'')+'měl být '+(ctx.targetLabel||'studentský export')+', ale obsahuje učitelská nebo citlivá data:');
    lines.push('');
    blockers.forEach(f=>lines.push('• '+f.needle+'  ('+f.message+')'));
    lines.push('');
    lines.push('Proč je to problém: tento soubor by neměl jít studentům ani na veřejný web — vypadá jako učitelský verifier nebo klíč správných odpovědí.');
    lines.push('');
    lines.push('Co udělat: zkontroluj, že stahuješ STUDENTSKÝ test (student_test…), ne učitelský verifier. Pokud problém trvá, vygeneruj test znovu.');
    return lines.join('\n');
  }

  function assertSafeExport(opts){
    const findings = scanExportedFile(opts);
    const ok = !hasBlockers(findings);
    return { ok, findings, message: ok ? '' : formatFindingsForUser(findings, {fileName:opts&&opts.fileName, targetLabel:opts&&opts.targetLabel}) };
  }

  // ── Testovací sada ────────────────────────────────────────────────────────────
  // 6 povinných scénářů (ze specifikace) + 8 regresních. Volej po každé změně pravidel.
  // V prohlížeči: runScannerTests() nebo SecretScanner.runTests().
  function runTests(){
    const cases = [
      // Povinné
      {n:'1: student smí obsahovat teacher_verifier.html (false-positive guard)',target:'student',fn:'student_test.html',c:'<div>Odpovědi jsou v teacher_verifier.html</div>',expect:true},
      {n:'2: student nesmí obsahovat PRIVATE_KEY',target:'student',fn:'student_test.html',c:'const PRIVATE_KEY={"kty":"RSA","d":"abc"};',expect:false},
      {n:'3: student nesmí obsahovat VARIANTS_FULL',target:'student',fn:'student_test.html',c:'const VARIANTS_FULL=[{"correct":"a"}];',expect:false},
      {n:'4: teacher verifier smí obsahovat privátní data (PRIVATE_KEY + VARIANTS_FULL)',target:'teacher',fn:'teacher_verifier.html',c:'<h1>Učitelský verifier</h1>const PRIVATE_KEY={"kty":"RSA","d":"x"};const VARIANTS_FULL=[];',expect:true},
      {n:'5: public export nesmí obsahovat inline API klíč',target:'public',fn:'student_test.html',c:'const cfg={apiKey:"AIzaSyFakeTestKey12345678901234"};',expect:false},
      {n:'6: "What does alert() do?" nesmí být blokováno',target:'student',fn:'student_test.html',c:'<div class="q">What does alert() do? Shows a native dialog.</div>',expect:true},
      // Regresní
      {n:'R1: PUBLIC_KEY (šifrovací key_ops:encrypt) ve studentském souboru projde',target:'student',fn:'student_test.html',c:'const PUBLIC_KEY={key_ops:["encrypt"],n:"abc"};',expect:true},
      {n:'R2: samotné slovo "answer" studentský soubor neblokuje (musí být kombo)',target:'student',fn:'student_test.html',c:'<div>Tvá odpověď:</div><script>function submitAnswers(){}<\/script>',expect:true},
      {n:'R3: student_test.html jménem projde na public export',target:'public',fn:'student_test.html',c:'<html><body>Test content</body></html>',expect:true},
      {n:'R4: teacher_verifier.html jménem blokuje public export',target:'public',fn:'teacher_verifier.html',c:'<html><body>Innocent content</body></html>',expect:false},
      {n:'R5: student-instant smí mít answer key (záměrné chování)',target:'student-instant',fn:'instant.html',c:'{"correct":"a","explanation":"správně","points_total":2}',expect:true},
      {n:'R6: student-instant nesmí mít PRIVATE_KEY',target:'student-instant',fn:'instant.html',c:'const PRIVATE_KEY={"kty":"RSA","d":"secret"};',expect:false},
      {n:'R7: teacher smí mít PEM klíč (záměrná výjimka na řádku s target===teacher)',target:'teacher',fn:'teacher_verifier.html',c:'-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----',expect:true},
      {n:'R8: GitHub token blokuje ve studentském souboru',target:'student',fn:'student_test.html',c:'const t="ghp_AbCdEfGhIjKlMnOpQrStUvWxYz012345";',expect:false},
      {n:'R9: běžná věta z textu (secret: s mezerami) studentský soubor NEblokuje',target:'student',fn:'student_test.html',c:'<div class="src">The agent revealed the secret: "the meeting is tonight" and left.</div>',expect:true},
      {n:'R10: reálný inline klíč (apiKey bez mezer, s číslicí) blokuje',target:'student',fn:'student_test.html',c:'const cfg={apiKey:"AIzaSyFakeTestKey12345678901234"};',expect:false},
    ];
    var pass=0, fail=0;
    var results = cases.map(function(tc){
      var r = assertSafeExport({fileName:tc.fn, content:tc.c, target:tc.target, targetLabel:tc.target});
      var ok = (r.ok === tc.expect);
      if(ok) pass++; else fail++;
      var blockers = r.findings.filter(function(f){return f.severity==='BLOCK';}).map(function(f){return f.needle;});
      return {name:tc.n, passed:ok, expected:tc.expect, got:r.ok, blockers:blockers};
    });
    return {pass:pass, fail:fail, total:cases.length, results:results};
  }

  return { scanExportedFile, scanFiles, assertSafeExport, hasBlockers, formatFindingsForUser, runTests };
})();

// Wrapper pro spuštění z UI nebo konzole. Volej po každé změně pravidel skeneru.
function runScannerTests(){
  const r = SecretScanner.runTests();
  const lines = [
    'SecretScanner — ' + r.pass + '/' + r.total + ' testů prošlo' + (r.fail ? ' (' + r.fail + ' selhalo)' : ' ✅') + ':',
    ''
  ].concat(r.results.map(function(t){
    var base = (t.passed ? '✓ ' : '✗ ') + t.name;
    if (!t.passed) base += '\n   čekáno: ' + (t.expected ? 'pass' : 'block') + ', dostáno: ' + (t.got ? 'pass' : 'block') + (t.blockers.length ? ' — ' + t.blockers.slice(0,3).join(', ') : '');
    return base;
  }));
  uiAlert(lines.join('\n'), r.fail ? '⚠️ Scanner: ' + r.fail + ' test(y) selhaly' : '✅ Scanner: všechny testy prošly');
}

// Společná brzda pro export: zkontroluje obsah a při BLOKaci ukáže modal + vrátí false.
async function guardExport(fileName, content, target, targetLabel){
  const res = SecretScanner.assertSafeExport({ fileName, content, target, targetLabel });
  if (!res.ok) {
    await uiAlert(res.message, '⛔ Export zablokován — únik citlivých dat');
    return false;
  }
  return true;
}

